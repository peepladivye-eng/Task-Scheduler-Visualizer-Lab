#include "../../include/process/process_manager.hpp"
#include "../../include/ipc/pipe_manager.hpp"
#include "../../include/ipc/ipc_protocol.hpp"
#include "../../include/process/child_worker.hpp"

#ifdef __linux__
#include <sys/wait.h>
#include <unistd.h>
#include <cerrno>
#include <cstring>
#endif

#include <stdexcept>
#include <string>

namespace sched {

ProcessManager::ProcessManager()  = default;
ProcessManager::~ProcessManager() { shutdown_all(); }

int ProcessManager::create_worker(int logical_pid) {
#ifdef __linux__
    // Create two pipe pairs before forking.
    // parent→child: instructions
    // child→parent: acknowledgements
    Pipe instr_pipe = Pipe::create();
    Pipe ack_pipe   = Pipe::create();

    pid_t child_pid = ::fork();

    if (child_pid < 0) {
        // fork() failed — pipes destroyed automatically via RAII
        throw std::runtime_error(
            std::string("fork() failed: ") + strerror(errno));
    }

    if (child_pid == 0) {
        // ── CHILD ──────────────────────────────────────────────────────────
        // Keep only the ends we need; close the others.
        int instr_read  = instr_pipe.read_end.release();
        int ack_write   = ack_pipe.write_end.release();

        // Close unused ends (write end of instr, read end of ack).
        instr_pipe.write_end.close_fd();
        ack_pipe.read_end.close_fd();

        // Run the worker — does not return.
        child_worker_main(instr_read, ack_write, logical_pid);
        // child_worker_main calls exit(), so we never reach here.
        ::_exit(1);
    }

    // ── PARENT ───────────────────────────────────────────────────────────
    // Keep only the ends we need.
    int instr_write = instr_pipe.write_end.release();
    int ack_read    = ack_pipe.read_end.release();

    // Close unused ends.
    instr_pipe.read_end.close_fd();
    ack_pipe.write_end.close_fd();

    // Wait for READY acknowledgement.
    ipc::Acknowledgement ack{};
    try {
        ipc::recv_ack(ack_read, ack);
    } catch (const std::exception& e) {
        ::close(instr_write);
        ::close(ack_read);
        ::waitpid(child_pid, nullptr, 0);
        throw std::runtime_error(
            std::string("worker READY wait failed: ") + e.what());
    }

    if (ack.type != ipc::AckType::READY) {
        ::close(instr_write);
        ::close(ack_read);
        ::waitpid(child_pid, nullptr, 0);
        throw std::runtime_error("unexpected ack instead of READY");
    }

    // Register the worker.
    WorkerEntry entry{};
    entry.logical_pid    = logical_pid;
    entry.os_pid         = static_cast<int>(child_pid);
    entry.instr_write_fd = instr_write;
    entry.ack_read_fd    = ack_read;
    entry.state          = WorkerState::READY;
    registry_.register_worker(entry);

    return static_cast<int>(child_pid);

#else
    (void)logical_pid;
    throw std::runtime_error("process management requires Linux");
#endif
}

void ProcessManager::send_execute(int logical_pid, int units) {
#ifdef __linux__
    WorkerEntry& entry = registry_.get(logical_pid);
    if (entry.state == WorkerState::COMPLETED ||
        entry.state == WorkerState::REAPED)
        throw std::runtime_error("worker already completed/reaped");

    int sid = ++session_seq_;
    ipc::Instruction instr{};
    instr.type       = ipc::InstrType::EXECUTE_UNITS;
    instr.session_id = sid;
    instr.units      = units;

    entry.state = WorkerState::RUNNING;
    ipc::send_instruction(entry.instr_write_fd, instr);

    ipc::Acknowledgement ack{};
    ipc::recv_ack(entry.ack_read_fd, ack);

    if (ack.type != ipc::AckType::UNITS_DONE)
        throw std::runtime_error("unexpected ack waiting for UNITS_DONE");

    entry.state = WorkerState::READY;
#else
    (void)logical_pid; (void)units;
    throw std::runtime_error("requires Linux");
#endif
}

void ProcessManager::terminate_worker(int logical_pid) {
#ifdef __linux__
    WorkerEntry& entry = registry_.get(logical_pid);
    if (entry.state == WorkerState::REAPED) return;

    int sid = ++session_seq_;
    ipc::Instruction instr{};
    instr.type       = ipc::InstrType::TERMINATE;
    instr.session_id = sid;
    instr.units      = 0;

    try {
        ipc::send_instruction(entry.instr_write_fd, instr);
        ipc::Acknowledgement ack{};
        ipc::recv_ack(entry.ack_read_fd, ack);
        // Accept TERMINATED or WORKER_ERROR — either way we reap.
    } catch (...) {
        // Pipe may already be closed if child died — still reap.
    }

    reap_worker(entry);
#else
    (void)logical_pid;
    throw std::runtime_error("requires Linux");
#endif
}

void ProcessManager::shutdown_all() {
#ifdef __linux__
    for (auto& entry : registry_.entries()) {
        if (entry.state != WorkerState::REAPED &&
            entry.state != WorkerState::FAILED) {
            try { terminate_worker(entry.logical_pid); }
            catch (...) { /* best-effort — close fds and reap anyway */ }
        }
    }
#endif
}

int ProcessManager::get_os_pid(int logical_pid) {
    return registry_.get(logical_pid).os_pid;
}

void ProcessManager::reap_worker(WorkerEntry& entry) {
#ifdef __linux__
    // Close our pipe ends first so child isn't blocked on write.
    if (entry.instr_write_fd >= 0) {
        ::close(entry.instr_write_fd);
        entry.instr_write_fd = -1;
    }
    if (entry.ack_read_fd >= 0) {
        ::close(entry.ack_read_fd);
        entry.ack_read_fd = -1;
    }

    if (entry.os_pid > 0) {
        int status;
        while (true) {
            pid_t ret = ::waitpid(static_cast<pid_t>(entry.os_pid), &status, 0);
            if (ret > 0) break;
            if (errno == EINTR) continue;    // retry on signal
            if (errno == ECHILD) break;      // already reaped
            break;
        }
        entry.os_pid = -1;
    }
    entry.state = WorkerState::REAPED;
#else
    (void)entry;
#endif
}

} // namespace sched
