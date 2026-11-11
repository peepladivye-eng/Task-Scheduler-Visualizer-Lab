#include "../../include/scheduler/execution_controller.hpp"
#include "../../include/scheduler/simulation.hpp"

#ifdef __linux__
#include "../../include/process/worker_backend.hpp"
#include <unistd.h>
#include <cerrno>
#include <cstring>
#include <stdexcept>
#include <unordered_map>
#include <cstdio>
#endif

namespace sched {

SimResult simulate_with_workers(const SimConfig& cfg,
                                const std::vector<ProcessInput>& inputs,
                                const LiveParams& live) {
#ifdef __linux__
    // 1. Run the tick-based scheduler to get the full deterministic trace.
    SimResult result = simulate(cfg, inputs);

    // 2. Build the backend (signal or pipe).
    LiveOptions opt;
    opt.work_us  = live.work_us;
    opt.tick_ms  = live.tick_ms;
    opt.log_mode = live.log_mode;
    auto backend = make_backend(live.ipc, opt);

    // 3. Map logical pid -> index into result.processes for os_pid lookup.
    std::unordered_map<int, int> pid_to_idx;
    for (size_t i = 0; i < result.processes.size(); ++i)
        pid_to_idx[result.processes[i].pid] = (int)i;

    // 4. Track which children have been forked and their remaining burst.
    //    Children are forked at their arrival tick (lazy fork).
    std::unordered_map<int, bool> forked;

    // 5. Walk the timeline. For each RUN segment, call run_tick() for each
    //    tick in that segment. Idle/CS segments send no signals.
    for (const auto& seg : result.timeline) {
        if (seg.type != SegType::RUN) {
            // Idle or context-switch ticks: optionally pace.
            if (live.tick_ms > 0 && seg.type == SegType::IDLE) {
                ::usleep((useconds_t)(live.tick_ms * 1000));
            }
            continue;
        }

        int pid = seg.pid;
        int it = pid_to_idx.count(pid) ? pid_to_idx[pid] : -1;
        if (it < 0) continue;

        // Lazy fork: fork the child the first time it's scheduled.
        if (!forked[pid]) {
            int burst = result.processes[it].burst;
            int os_pid = backend->spawn(pid, burst);
            result.processes[it].os_pid = os_pid;
            forked[pid] = true;

            if (live.log_mode) {
                std::fprintf(stderr, "[t=%4d] FORK: P%d (os_pid=%d, burst=%d)\n",
                    seg.t_start, pid, os_pid, burst);
            }
        }

        // Run each tick in this segment individually.
        int ticks = seg.t_end - seg.t_start;
        for (int t = 0; t < ticks; ++t) {
            if (live.log_mode) {
                std::fprintf(stderr, "[t=%4d] SIGCONT  P%d (os_pid=%d)\n",
                    seg.t_start + t, pid,
                    result.processes[it].os_pid);
            }

            bool done = backend->run_tick(pid);

            if (live.log_mode && !done) {
                std::fprintf(stderr, "[t=%4d] stopped   P%d\n",
                    seg.t_start + t, pid);
            }

            if (done) {
                // Collect stats
                WorkerStats ws = backend->stats(pid);
                if (live.log_mode) {
                    std::fprintf(stderr,
                        "[t=%4d] COMPLETE: P%d (os_pid=%d, cpu=%.1fms, rss=%ldkb)\n",
                        seg.t_start + t + 1, pid,
                        result.processes[it].os_pid,
                        ws.cpu_ms, ws.max_rss_kb);
                }
            }

            // Pace for visualization (optional).
            if (live.tick_ms > 0) {
                ::usleep((useconds_t)(live.tick_ms * 1000));
            }
        }
    }

    // 6. Any process that was forked but never ran its full burst
    //    (shouldn't happen in a correct sim, but clean up just in case).
    backend->abort_all();

    return result;

#else
    (void)live;
    return simulate(cfg, inputs);
#endif
}

} // namespace sched
