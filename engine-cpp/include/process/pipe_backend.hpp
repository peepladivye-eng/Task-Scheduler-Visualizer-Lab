#pragma once
#ifdef __linux__
#include "worker_backend.hpp"
#include "process_registry.hpp"
#include <unordered_map>

namespace sched {

// Pipe-based backend: wraps the existing ProcessManager logic via the
// IWorkerBackend interface. Children communicate with the parent through
// two anonymous pipes (one for instructions, one for acks).
// Each run_tick() sends EXECUTE_UNITS(1) and waits for UNITS_DONE.
class PipeBackend : public IWorkerBackend {
public:
    explicit PipeBackend(const LiveOptions& opt);
    ~PipeBackend() override;

    int  spawn(int pid, int burst) override;
    bool run_tick(int pid) override;
    WorkerStats stats(int pid) const override;
    void abort_all() noexcept override;

private:
    LiveOptions opt_;
    int session_seq_ = 0;

    struct PipeEntry {
        int os_pid       = -1;
        int instr_write  = -1;
        int ack_read     = -1;
        int remaining    = 0;
        WorkerStats stats;
        bool finished    = false;
    };
    std::unordered_map<int, PipeEntry> workers_;  // keyed by logical pid

    void reap_one(PipeEntry& e) noexcept;
};

} // namespace sched
#endif // __linux__
