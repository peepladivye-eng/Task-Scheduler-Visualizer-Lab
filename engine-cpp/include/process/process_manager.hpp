#pragma once
#include "process_registry.hpp"
#include <string>

namespace sched {

// Manages the lifecycle of all child worker processes for one scheduling
// session. Linux-only: fork(), pipe(), waitpid().
class ProcessManager {
public:
    ProcessManager();
    ~ProcessManager();   // calls shutdown_all()

    // Fork a child worker for logical_pid. Returns actual OS PID.
    // Throws on fork()/pipe() failure.
    int create_worker(int logical_pid);

    // Send EXECUTE_UNITS(units) and wait for UNITS_DONE ack.
    void send_execute(int logical_pid, int units);

    // Send TERMINATE, wait for TERMINATED ack, then waitpid().
    void terminate_worker(int logical_pid);

    // Terminate and reap every worker that hasn't been reaped yet.
    void shutdown_all();

    // Look up actual OS PID for a logical PID.
    int get_os_pid(int logical_pid);

    // Access registry (read-only from outside, for trace enrichment).
    const ProcessRegistry& registry() const { return registry_; }

private:
    ProcessRegistry registry_;

    // Session counter used as session_id in IPC messages.
    int session_seq_ = 0;

    // Internal helper: reap a single worker via waitpid().
    void reap_worker(WorkerEntry& entry);
};

} // namespace sched
