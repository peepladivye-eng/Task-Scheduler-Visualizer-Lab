#pragma once
#include <vector>
#include <stdexcept>
#include <string>

namespace sched {

enum class WorkerState {
    CREATED,    // fork() succeeded, waiting for READY ack
    READY,      // READY ack received, idle
    RUNNING,    // EXECUTE_UNITS sent, waiting for UNITS_DONE
    COMPLETED,  // all burst units done
    FAILED,     // worker died or pipe error
    REAPED,     // waitpid() collected
};

struct WorkerEntry {
    int         logical_pid     = -1;
    int         os_pid          = -1;   // actual Linux PID from fork()
    int         instr_write_fd  = -1;   // parent writes instructions here
    int         ack_read_fd     = -1;   // parent reads acks here
    WorkerState state           = WorkerState::CREATED;
};

// Owns the metadata for all forked workers in one session.
class ProcessRegistry {
public:
    // Add a new entry (logical_pid must be unique).
    void register_worker(WorkerEntry entry) {
        for (const auto& e : entries_)
            if (e.logical_pid == entry.logical_pid)
                throw std::runtime_error("duplicate logical_pid in registry");
        entries_.push_back(entry);
    }

    // Find by logical PID. Throws if not found.
    WorkerEntry& get(int logical_pid) {
        for (auto& e : entries_)
            if (e.logical_pid == logical_pid) return e;
        throw std::runtime_error(
            "worker not found: logical_pid=" + std::to_string(logical_pid));
    }

    void update_state(int logical_pid, WorkerState s) {
        get(logical_pid).state = s;
    }

    // True when every worker has been reaped.
    bool all_reaped() const {
        for (const auto& e : entries_)
            if (e.state != WorkerState::REAPED &&
                e.state != WorkerState::FAILED) return false;
        return true;
    }

    std::vector<WorkerEntry>& entries() { return entries_; }

private:
    std::vector<WorkerEntry> entries_;
};

} // namespace sched
