#include "../../include/scheduler/simulation.hpp"
#include <stdexcept>
#include <algorithm>
#include <cstring>

namespace sched {

// ── Ready queue helpers ───────────────────────────────────────────────────────
// The ready queue holds INDICES into the processes vector, not PIDs.
// This matches the C engine's design exactly.

using Queue = std::vector<int>; // indices into SimResult::processes

// Append index to tail
static void q_push(Queue& q, int idx) {
    q.push_back(idx);
}

// Remove element at position pos, shifting the rest left
static void q_remove_at(Queue& q, int pos) {
    q.erase(q.begin() + pos);
}

// ── Segment helpers ──────────────────────────────────────────────────────────

// Extend the last segment if (type,pid) match and it is contiguous;
// otherwise append a new segment.
static void add_tick(SimResult& r, SegType type, int pid, int t) {
    if (!r.timeline.empty()) {
        auto& last = r.timeline.back();
        if (last.type == type && last.pid == pid && last.t_end == t) {
            last.t_end = t + 1;
            return;
        }
    }
    r.timeline.push_back({t, t + 1, pid, type});
}

// ── Event helpers ─────────────────────────────────────────────────────────────

// Snapshot the queue PIDs and emit an event.
static void push_event(SimResult& r,
                       int t, EvType type, int pid,
                       const Queue& q,
                       const std::vector<ProcessState>& procs) {
    Event ev;
    ev.t    = t;
    ev.type = type;
    ev.pid  = pid;
    ev.ready_queue.reserve(static_cast<size_t>(q.size()));
    for (int idx : q) {
        ev.ready_queue.push_back(procs[static_cast<size_t>(idx)].pid);
    }
    r.events.push_back(std::move(ev));
}

// ── Selection ─────────────────────────────────────────────────────────────────
// Returns the POSITION in the queue of the best candidate, or -1 if empty.

static int pick_best(const SimConfig& cfg,
                     const Queue& q,
                     const std::vector<ProcessState>& procs) {
    if (q.empty()) return -1;

    switch (cfg.algo) {
    case Algo::FCFS:
    case Algo::RR:
        // Queue front — FIFO order maintained by insertion
        return 0;

    case Algo::SJF: {
        // Smallest burst; tie → earlier arrival → lower pid
        int best = 0;
        for (int i = 1; i < static_cast<int>(q.size()); ++i) {
            const auto& b = procs[static_cast<size_t>(q[static_cast<size_t>(best)])];
            const auto& c = procs[static_cast<size_t>(q[static_cast<size_t>(i)])];
            if (c.burst < b.burst)                                              { best = i; continue; }
            if (c.burst == b.burst && c.arrival < b.arrival)                   { best = i; continue; }
            if (c.burst == b.burst && c.arrival == b.arrival && c.pid < b.pid) { best = i; }
        }
        return best;
    }

    case Algo::SRTF: {
        // Smallest remaining; tie → earlier arrival → lower pid
        int best = 0;
        for (int i = 1; i < static_cast<int>(q.size()); ++i) {
            const auto& b = procs[static_cast<size_t>(q[static_cast<size_t>(best)])];
            const auto& c = procs[static_cast<size_t>(q[static_cast<size_t>(i)])];
            if (c.remaining < b.remaining)                                              { best = i; continue; }
            if (c.remaining == b.remaining && c.arrival < b.arrival)                   { best = i; continue; }
            if (c.remaining == b.remaining && c.arrival == b.arrival && c.pid < b.pid) { best = i; }
        }
        return best;
    }

    case Algo::PRIORITY:
    case Algo::PRIORITY_P: {
        // Smallest priority number; tie → earlier arrival → lower pid
        int best = 0;
        for (int i = 1; i < static_cast<int>(q.size()); ++i) {
            const auto& b = procs[static_cast<size_t>(q[static_cast<size_t>(best)])];
            const auto& c = procs[static_cast<size_t>(q[static_cast<size_t>(i)])];
            if (c.priority < b.priority)                                              { best = i; continue; }
            if (c.priority == b.priority && c.arrival < b.arrival)                   { best = i; continue; }
            if (c.priority == b.priority && c.arrival == b.arrival && c.pid < b.pid) { best = i; }
        }
        return best;
    }
    }
    return -1; // unreachable
}

// ── Main simulation loop ──────────────────────────────────────────────────────

SimResult simulate(const SimConfig& cfg,
                   const std::vector<ProcessInput>& inputs) {
    SimResult r;
    r.cfg = cfg;

    // Build ProcessState array from inputs (already sorted by pid by parser)
    r.processes.reserve(inputs.size());
    for (const auto& in : inputs) {
        ProcessState ps{};
        ps.pid       = in.pid;
        ps.arrival   = in.arrival;
        ps.burst     = in.burst;
        ps.priority  = in.priority;
        ps.remaining = in.burst;
        ps.start      = -1;
        ps.completion = -1;
        ps.waiting    = 0;
        ps.turnaround = 0;
        ps.response   = 0;
        ps.os_pid     = -1;
        r.processes.push_back(ps);
    }

    const int n = static_cast<int>(r.processes.size());

    Queue ready;      // indices into r.processes
    int running  = -1; // index of running process, -1 = none
    int last_pid = -1; // pid of last dispatched process, -1 = never dispatched
    int quantum_left = 0;
    int cs_left   = 0;
    int cs_target = -1; // index of process being switched in

    r.context_switches = 0;
    int done = 0;

    for (int t = 0; done < n; ++t) {

        if (t > MAX_SIM_TICKS) {
            throw std::runtime_error("simulation exceeded " +
                std::to_string(MAX_SIM_TICKS) + " ticks");
        }

        // ── STEP 1: ARRIVALS ──────────────────────────────────────────────
        // Processes are sorted by pid. Contract says add in ascending pid order.
        for (int i = 0; i < n; ++i) {
            auto& p = r.processes[static_cast<size_t>(i)];
            if (p.arrival == t && p.completion == -1) {
                q_push(ready, i);
                push_event(r, t, EvType::ARRIVE, p.pid, ready, r.processes);
            }
        }

        // ── STEP 2: cs_left == 0 ─────────────────────────────────────────
        if (cs_left == 0) {

            // 2a. PREEMPT HOOK (srtf, priority-p only)
            if (running != -1) {
                if (cfg.algo == Algo::SRTF || cfg.algo == Algo::PRIORITY_P) {
                    int best_pos = pick_best(cfg, ready, r.processes);
                    if (best_pos >= 0) {
                        int cand = ready[static_cast<size_t>(best_pos)];
                        bool should_preempt = false;
                        if (cfg.algo == Algo::SRTF) {
                            should_preempt =
                                r.processes[static_cast<size_t>(cand)].remaining <
                                r.processes[static_cast<size_t>(running)].remaining;
                        } else { // PRIORITY_P
                            should_preempt =
                                r.processes[static_cast<size_t>(cand)].priority <
                                r.processes[static_cast<size_t>(running)].priority;
                        }
                        if (should_preempt) {
                            q_push(ready, running);
                            push_event(r, t, EvType::PREEMPT,
                                r.processes[static_cast<size_t>(running)].pid,
                                ready, r.processes);
                            running = -1;
                        }
                    }
                }
            }

            // 2b. RR EXPIRY
            if (cfg.algo == Algo::RR && running != -1 && quantum_left == 0) {
                if (ready.empty()) {
                    // No other process ready: reset quantum, keep running
                    quantum_left = cfg.quantum;
                } else {
                    q_push(ready, running);
                    push_event(r, t, EvType::PREEMPT,
                        r.processes[static_cast<size_t>(running)].pid,
                        ready, r.processes);
                    running = -1;
                }
            }

            // 2c. DISPATCH
            if (running == -1) {
                int best_pos = pick_best(cfg, ready, r.processes);

                if (best_pos == -1) {
                    // No ready process → idle (fall through to step 4)
                    goto step4;
                }

                int X = ready[static_cast<size_t>(best_pos)];
                q_remove_at(ready, best_pos);

                if (last_pid != -1 &&
                    last_pid != r.processes[static_cast<size_t>(X)].pid) {
                    // Context switch needed
                    ++r.context_switches;
                    if (cfg.cs_cost > 0) {
                        cs_left   = cfg.cs_cost;
                        cs_target = X;
                        last_pid  = r.processes[static_cast<size_t>(X)].pid;
                        // Step 3 handles this tick
                        goto step3;
                    }
                    // cs_cost == 0: free switch, dispatch immediately
                }

                // Dispatch now (no cs cost, or first dispatch ever)
                running      = X;
                last_pid     = r.processes[static_cast<size_t>(X)].pid;
                quantum_left = (cfg.algo == Algo::RR) ? cfg.quantum : (1 << 30);

                push_event(r, t, EvType::DISPATCH,
                    r.processes[static_cast<size_t>(X)].pid,
                    ready, r.processes);
            }
        }

        // ── STEP 3: CS tick ───────────────────────────────────────────────
        step3:
        if (cs_left > 0) {
            add_tick(r, SegType::CS,
                r.processes[static_cast<size_t>(cs_target)].pid, t);
            --cs_left;
            if (cs_left == 0) {
                // Switch complete: start the new process
                running      = cs_target;
                quantum_left = (cfg.algo == Algo::RR) ? cfg.quantum : (1 << 30);
                push_event(r, t + 1, EvType::DISPATCH,
                    r.processes[static_cast<size_t>(cs_target)].pid,
                    ready, r.processes);
            }
            goto next_t;
        }

        // ── STEP 4: IDLE ──────────────────────────────────────────────────
        step4:
        if (running == -1) {
            add_tick(r, SegType::IDLE, -1, t);
            goto next_t;
        }

        // ── STEP 5: RUN TICK ──────────────────────────────────────────────
        {
            auto& p = r.processes[static_cast<size_t>(running)];
            if (p.start == -1) p.start = t;
            --p.remaining;
            --quantum_left;
            add_tick(r, SegType::RUN, p.pid, t);

            if (p.remaining == 0) {
                p.completion = t + 1;
                push_event(r, t + 1, EvType::COMPLETE, p.pid,
                    ready, r.processes);
                running = -1;
                ++done;
            }
        }

        next_t:;
    } // for t

    // ── Post-loop metrics ─────────────────────────────────────────────────
    int total_time = 0;
    for (auto& p : r.processes) {
        p.turnaround = p.completion - p.arrival;
        p.waiting    = p.turnaround - p.burst;
        p.response   = p.start - p.arrival;
        if (p.completion > total_time) total_time = p.completion;
    }
    r.total_time = total_time;

    return r;
}

} // namespace sched
