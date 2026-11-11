#ifdef __linux__
#include "../../include/process/pipe_backend.hpp"
#include "../../include/ipc/ipc_protocol.hpp"
#include "../../include/ipc/pipe_manager.hpp"
#include "../../include/process/child_worker.hpp"

#include <sys/wait.h>
#include <sys/resource.h>
#include <unistd.h>
#include <signal.h>
#include <cerrno>
#include <cstring>
#include <stdexcept>
#include <string>

namespace sched {

PipeBackend::PipeBackend(const LiveOptions& opt) : opt_(opt) {}

PipeBackend::~PipeBackend() { abort_all(); }

int PipeBackend::spawn(int pid, int burst) {
    Pipe instr_pipe = Pipe::create();
    Pipe ack_pipe   = Pipe::create();

    pid_t child_pid = ::fork();
    if (child_pid < 0)
        throw std::runtime_error(std::string("fork() failed: ") + strerror(errno));

    if (child_pid == 0) {
        // CHILD
        int instr_read = instr_pipe.read_end.release();
        int ack_write  = ack_pipe.write_end.release();
        instr_pipe.write_end.close_fd();
        ack_pipe.read_end.close_fd();
        child_worker_main(instr_read, ack_write, pid);
        ::_exit(1);
    }

    // PARENT
    int instr_write = instr_pipe.write_end.release();
    int ack_read    = ack_pipe.read_end.release();
    instr_pipe.read_end.close_fd();
    ack_pipe.write_end.close_fd();

    // Wait for READY ack
    ipc::Acknowledgement ack{};
    try {
        ipc::recv_ack(ack_read, ack);
    } catch (const std::exception& e) {
        ::close(instr_write);
        ::close(ack_read);
        ::waitpid(child_pid, nullptr, 0);
        throw std::runtime_error(std::string("worker READY wait failed: ") + e.what());
    }
    if (ack.type != ipc::AckType::READY) {
        ::close(instr_write);
        ::close(ack_read);
        ::waitpid(child_pid, nullptr, 0);
        throw std::runtime_error("unexpected ack instead of READY");
    }

    PipeEntry entry;
    entry.os_pid     = child_pid;
    entry.instr_write = instr_write;
    entry.ack_read   = ack_read;
    entry.remaining  = burst;
    entry.finished   = false;
    workers_[pid]    = std::move(entry);
    return child_pid;
}

bool PipeBackend::run_tick(int pid) {
    auto it = workers_.find(pid);
    if (it == workers_.end())
        throw std::runtime_error("run_tick: unknown pid " + std::to_string(pid));
    PipeEntry& e = it->second;
    if (e.finished)
        return true;

    int sid = ++session_seq_;
    ipc::Instruction instr{};
    instr.type       = ipc::InstrType::EXECUTE_UNITS;
    instr.session_id = sid;
    instr.units      = 1;   // exactly one unit per tick

    ipc::send_instruction(e.instr_write, instr);

    ipc::Acknowledgement ack{};
    ipc::recv_ack(e.ack_read, ack);

    if (ack.type != ipc::AckType::UNITS_DONE)
        throw std::runtime_error("pipe_backend: unexpected ack type");

    --e.remaining;

    if (e.remaining == 0) {
        // Send TERMINATE and reap
        ipc::Instruction term{};
        term.type       = ipc::InstrType::TERMINATE;
        term.session_id = ++session_seq_;
        term.units      = 0;
        try {
            ipc::send_instruction(e.instr_write, term);
            ipc::Acknowledgement tack{};
            ipc::recv_ack(e.ack_read, tack);
        } catch (...) {}

        // Collect rusage via wait4
        struct rusage ru{};
        int status = 0;
        pid_t ret;
        do { ret = ::wait4(e.os_pid, &status, 0, &ru); } while (ret < 0 && errno == EINTR);

        e.stats.cpu_ms     = (ru.ru_utime.tv_sec + ru.ru_stime.tv_sec) * 1000.0
                            + (ru.ru_utime.tv_usec + ru.ru_stime.tv_usec) / 1000.0;
        e.stats.max_rss_kb = ru.ru_maxrss;
        e.stats.exit_status = WIFEXITED(status) ? WEXITSTATUS(status) : -1;

        ::close(e.instr_write); e.instr_write = -1;
        ::close(e.ack_read);    e.ack_read    = -1;
        e.os_pid   = -1;
        e.finished = true;
        return true;
    }
    return false;
}

WorkerStats PipeBackend::stats(int pid) const {
    auto it = workers_.find(pid);
    if (it == workers_.end())
        throw std::runtime_error("stats: unknown pid " + std::to_string(pid));
    return it->second.stats;
}

void PipeBackend::abort_all() noexcept {
    for (auto& kv : workers_) {
        PipeEntry& e = kv.second;
        if (!e.finished && e.os_pid > 0) {
            ::kill(e.os_pid, SIGKILL);
            if (e.instr_write >= 0) { ::close(e.instr_write); e.instr_write = -1; }
            if (e.ack_read >= 0)   { ::close(e.ack_read);    e.ack_read    = -1; }
            int st; pid_t r;
            do { r = ::waitpid(e.os_pid, &st, 0); } while (r < 0 && errno == EINTR);
            e.os_pid   = -1;
            e.finished = true;
        }
    }
}

void PipeBackend::reap_one(PipeEntry& e) noexcept {
    if (e.os_pid > 0) {
        ::kill(e.os_pid, SIGKILL);
        int st; pid_t r;
        do { r = ::waitpid(e.os_pid, &st, 0); } while (r < 0 && errno == EINTR);
        e.os_pid = -1;
    }
    if (e.instr_write >= 0) { ::close(e.instr_write); e.instr_write = -1; }
    if (e.ack_read    >= 0) { ::close(e.ack_read);    e.ack_read    = -1; }
    e.finished = true;
}

} // namespace sched
#endif // __linux__
