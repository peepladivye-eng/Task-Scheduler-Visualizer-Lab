#include "../../include/scheduler/execution_controller.hpp"
#include "../../include/scheduler/simulation.hpp"
#include "../../include/common/event_sink.hpp"

#ifdef __linux__
#include "../../include/process/worker_backend.hpp"
#include <unistd.h>
#include <signal.h>
#include <csignal>
#include <cerrno>
#include <cstring>
#include <stdexcept>
#include <unordered_map>
#include <cstdio>
#include <algorithm>

// Signal flags (defined in signal_backend.cpp, used here and in main.cpp).
extern volatile sig_atomic_t g_timeout_flag;
extern volatile sig_atomic_t g_stop_flag;
extern volatile sig_atomic_t g_sig_received;

static void install_signal_handlers() {
    struct sigaction sa{};
    sa.sa_handler = [](int) { g_timeout_flag = 1; };
    ::sigemptyset(&sa.sa_mask);
    sa.sa_flags = 0;  // NO SA_RESTART
    ::sigaction(SIGALRM, &sa, nullptr);

    sa.sa_handler = [](int s) { g_sig_received = s; g_stop_flag = 1; };
    ::sigaction(SIGINT,  &sa, nullptr);
    ::sigaction(SIGTERM, &sa, nullptr);
}

#endif

namespace sched {

SimResult simulate_with_workers(const SimConfig& cfg,
                                const std::vector<ProcessInput>& inputs,
                                const LiveParams& live) {
#ifdef __linux__
    // 1. Run the tick-based scheduler to get the deterministic timeline and events.
    SimResult result = simulate(cfg, inputs);

    // 2. Set up event sink
    std::shared_ptr<IEventSink> sink = live.sink;
    std::shared_ptr<TerminalSink> term_sink = nullptr;
    if (!sink) {
        auto composite = std::make_shared<CompositeEventSink>();
        if (live.log_mode) {
            term_sink = std::make_shared<TerminalSink>(stderr);
            composite->add_sink(term_sink);
        }
        if (live.ndjson_mode) {
            composite->add_sink(std::make_shared<NdjsonSink>(stdout));
        }
        sink = composite;
    }

    // 3. Build the backend (signal or pipe).
    install_signal_handlers();
    LiveOptions opt;
    opt.work_us  = live.work_us;
    opt.tick_ms  = live.tick_ms;
    opt.log_mode = false; // We handle logging via IEventSink
    auto backend = make_backend(live.ipc, opt);

    if (term_sink) {
        const char* algo_str = algo_name(cfg.algo);
        const char* ipc_str = (live.ipc == Ipc::Pipe) ? "pipe" : "signal";
        term_sink->print_header(::getpid(), ::getpgrp(), algo_str,
                                cfg.quantum, cfg.cs_cost, ipc_str, inputs.size());
    }

    // 4. Map logical pid -> index into result.processes
    std::unordered_map<int, size_t> pid_to_idx;
    for (size_t i = 0; i < result.processes.size(); ++i) {
        pid_to_idx[result.processes[i].pid] = i;
    }

    // Helper to find ready queue snapshot from simulated events
    auto find_ready_queue = [&](int t, EvType type, int pid) -> std::vector<int> {
        for (const auto& ev : result.events) {
            if (ev.t == t && ev.type == type && ev.pid == pid) {
                return ev.ready_queue;
            }
        }
        return {};
    };

    std::unordered_map<int, bool> forked;
    std::unordered_map<int, int>  proc_ticks;

    auto emit_cleanup = [&](int t) {
        if (!sink) return;
        LiveEvent ev;
        ev.type         = LiveEventType::CLEANUP;
        ev.t            = t;
        ev.pgid         = backend->pgid();
        ev.live_count   = 0;
        ev.reaped_count = backend->reaped_count();
        ev.total_procs  = (int)result.processes.size();
        ev.zombies      = 0;
        sink->on_event(ev);
    };

    int current_t = 0;
    try {
        // 5. Walk virtual time from t=0 to total_time
        for (int t = 0; t < result.total_time; ++t) {
            current_t = t;
            // Check for interruption signal
            if (g_stop_flag) {
                backend->abort_all();
                emit_cleanup(t);
                throw std::runtime_error("interrupted by signal");
            }

            // A. Arrival at tick t: fork arriving processes
            for (auto& proc : result.processes) {
                if (proc.arrival == t && !forked[proc.pid]) {
                    int os_pid = backend->spawn(proc.pid, proc.burst);
                    proc.os_pid = os_pid;
                    forked[proc.pid] = true;

                    if (sink) {
                        LiveEvent ev;
                        ev.type       = LiveEventType::ARRIVE;
                        ev.t          = t;
                        ev.pid        = proc.pid;
                        ev.os_pid     = os_pid;
                        ev.tick_total = proc.burst;
                        sink->on_event(ev);
                    }
                }
            }

            // B. Find current timeline segment
            const Segment* cur_seg = nullptr;
            for (const auto& seg : result.timeline) {
                if (seg.t_start <= t && t < seg.t_end) {
                    cur_seg = &seg;
                    break;
                }
            }

            if (cur_seg && cur_seg->type == SegType::RUN) {
                int pid = cur_seg->pid;
                size_t it = pid_to_idx[pid];
                int os_pid = result.processes[it].os_pid;

                // DISPATCH event on first tick of segment
                if (t == cur_seg->t_start) {
                    if (sink) {
                        LiveEvent ev;
                        ev.type        = LiveEventType::DISPATCH;
                        ev.t           = t;
                        ev.pid         = pid;
                        ev.os_pid      = os_pid;
                        ev.ready_queue = find_ready_queue(t, EvType::DISPATCH, pid);
                        sink->on_event(ev);
                    }
                }

                // RUN event for this tick
                int cur_tick = ++proc_ticks[pid];
                if (sink) {
                    LiveEvent ev;
                    ev.type         = LiveEventType::RUN;
                    ev.t            = t;
                    ev.pid          = pid;
                    ev.os_pid       = os_pid;
                    ev.tick_current = cur_tick;
                    ev.tick_total   = result.processes[it].burst;
                    sink->on_event(ev);
                }

                // Real child execution
                bool done = backend->run_tick(pid);

                if (done) {
                    // Child finished burst and exited
                    WorkerStats ws = backend->stats(pid);
                    result.processes[it].cpu_ms     = ws.cpu_ms;
                    result.processes[it].max_rss_kb = ws.max_rss_kb;

                    if (sink) {
                        LiveEvent ev;
                        ev.type        = LiveEventType::EXIT;
                        ev.t           = t + 1;
                        ev.pid         = pid;
                        ev.os_pid      = os_pid;
                        ev.cpu_ms      = ws.cpu_ms;
                        ev.max_rss_kb  = ws.max_rss_kb;
                        ev.exit_status = ws.exit_status;
                        sink->on_event(ev);
                    }
                } else if (t + 1 == cur_seg->t_end) {
                    // Segment ended but process has remaining burst -> PREEMPT
                    std::string reason = (cfg.algo == Algo::RR) ? "quantum expired" : "preempted";
                    if (sink) {
                        LiveEvent ev;
                        ev.type        = LiveEventType::PREEMPT;
                        ev.t           = t + 1;
                        ev.pid         = pid;
                        ev.os_pid      = os_pid;
                        ev.reason      = reason;
                        ev.ready_queue = find_ready_queue(t + 1, EvType::PREEMPT, pid);
                        sink->on_event(ev);
                    }
                }
            }

            // C. Pace for visualization if requested
            if (live.tick_ms > 0) {
                ::usleep((useconds_t)(live.tick_ms * 1000));
            }
        }

        // 6. Cleanup
        backend->abort_all();
        emit_cleanup(result.total_time);

        return result;
    } catch (...) {
        backend->abort_all();
        emit_cleanup(current_t);
        throw;
    }

#else
    (void)live;
    return simulate(cfg, inputs);
#endif
}

} // namespace sched
