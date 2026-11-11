#pragma once
#ifdef __linux__
#include "worker_backend.hpp"
#include <unordered_map>
#include <sys/resource.h>

namespace sched {

// Signal-based backend: each child self-stops with raise(SIGSTOP) after
// every unit of work. The parent sends SIGCONT and waits with
// wait4(..., WUNTRACED) so it sees each stop/exit precisely.
// This is completely deterministic: no timing, no sleeps for scheduling.
class SignalBackend : public IWorkerBackend {
public:
    explicit SignalBackend(const LiveOptions& opt);
    ~SignalBackend() override;

    int  spawn(int pid, int burst) override;
    bool run_tick(int pid) override;
    WorkerStats stats(int pid) const override;
    void abort_all() noexcept override;

private:
    LiveOptions opt_;
    pid_t       group_  = 0;    // process group for all children
    pid_t       parent_ = 0;    // parent PID (checked by child)

    struct SigEntry {
        int         logical_pid = 0;
        pid_t       os_pid      = 0;
        int         remaining   = 0;
        WorkerStats stats;
        bool        finished    = false;
    };
    std::unordered_map<int, SigEntry> workers_;  // keyed by logical pid

    void reap_all_killed() noexcept;
};

} // namespace sched
#endif // __linux__
