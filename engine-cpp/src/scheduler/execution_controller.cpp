#include "../../include/scheduler/execution_controller.hpp"
#include "../../include/scheduler/simulation.hpp"

#ifdef __linux__
#include "../../include/process/process_manager.hpp"
#endif

namespace sched {

SimResult simulate_with_workers(const SimConfig& cfg,
                                const std::vector<ProcessInput>& inputs) {
#ifdef __linux__
    // 1. Run the tick-based scheduler to get the full trace.
    //    This is deterministic and fast (pure simulation, no real processes yet).
    SimResult result = simulate(cfg, inputs);

    // 2. For each process in the trace, fork a real child worker.
    //    The worker does one EXECUTE_UNITS call per burst unit so we
    //    demonstrate real process creation and IPC for every scheduling tick.
    ProcessManager pm;

    for (auto& ps : result.processes) {
        // fork() a child worker for this logical process
        int os_pid = pm.create_worker(ps.pid);
        ps.os_pid  = os_pid;

        // Drive the worker through its burst: one EXECUTE_UNITS per tick segment
        // that belongs to this process in the timeline.
        for (const auto& seg : result.timeline) {
            if (seg.type != SegType::RUN || seg.pid != ps.pid) continue;
            int units = seg.t_end - seg.t_start;   // ticks = work units
            pm.send_execute(ps.pid, units);
        }

        // Worker is done with its burst — terminate cleanly.
        pm.terminate_worker(ps.pid);
    }

    // All workers reaped by terminate_worker calls above.
    // pm destructor is a safe no-op since all entries are REAPED.
    return result;

#else
    // Non-Linux: pure simulation, os_pid stays -1.
    return simulate(cfg, inputs);
#endif
}

} // namespace sched
