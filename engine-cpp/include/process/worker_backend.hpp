#pragma once
#include <memory>

namespace sched {

// Stats collected from a child after it finishes its burst.
struct WorkerStats {
    double cpu_ms      = 0.0;
    long   max_rss_kb  = 0;
    int    exit_status = 0;
};

// Options passed to every backend at construction.
struct LiveOptions {
    int  work_us  = 200;   // CPU microseconds burned per tick in child
    int  tick_ms  = 0;     // parent sleeps N ms per tick (0 = no sleep)
    bool log_mode = false; // children print one line per tick to stderr
};

// Abstract backend: manages real child processes, one tick at a time.
// All implementations must be safe to destroy even if abort_all() was
// already called.
class IWorkerBackend {
public:
    virtual ~IWorkerBackend() = default;

    // Fork a child for logical_pid with the given burst length.
    // Returns the OS PID. The child exists but is NOT yet running
    // any work unit when this returns.
    virtual int spawn(int pid, int burst) = 0;

    // Run exactly one work unit for the given logical_pid.
    // Returns true when the task has finished its last unit
    // (child exited and was reaped, stats are now valid).
    // Returns false when one unit was done but more remain
    // (child is stopped / waiting for the next tick).
    virtual bool run_tick(int pid) = 0;

    // Valid only after run_tick returned true for this pid.
    virtual WorkerStats stats(int pid) const = 0;

    // Kill and reap every child. Safe to call multiple times.
    virtual void abort_all() noexcept = 0;

    // Process group ID of spawned children (0 if none)
    virtual int pgid() const noexcept { return 0; }

    // Count of children successfully reaped so far
    virtual int reaped_count() const noexcept { return 0; }

    // Count of children currently alive / not yet reaped
    virtual int live_count() const noexcept { return 0; }
};

// Forward declarations for the two concrete backends.
// Defined in pipe_backend.hpp and signal_backend.hpp.
enum class Ipc { Pipe, Signal };

// Factory: returns the appropriate backend.
std::unique_ptr<IWorkerBackend> make_backend(Ipc ipc, const LiveOptions& opt);

} // namespace sched
