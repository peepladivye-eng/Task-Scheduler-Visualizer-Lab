#pragma once
// Fixed-size IPC message structs for parent↔child communication.
// No pointers, no std::string — safe to send over a pipe with write().

#include <cstdint>

#ifdef __linux__
#include <unistd.h>
#include <cerrno>
#include <cstring>
#include <stdexcept>
#include <string>
#endif

namespace sched {
namespace ipc {

// ── Message types ────────────────────────────────────────────────────────────

enum class InstrType : int32_t {
    EXECUTE_UNITS = 1,  // run N work units then ack
    TERMINATE     = 2,  // clean shutdown
};

enum class AckType : int32_t {
    READY        = 1,   // child started, ready to receive instructions
    UNITS_DONE   = 2,   // finished executing assigned units
    TERMINATED   = 3,   // about to exit(0)
    WORKER_ERROR = 4,   // something went wrong
};

// Parent → child
struct Instruction {
    InstrType type;
    int32_t   session_id;
    int32_t   units;      // number of work units to execute
};

// Child → parent
struct Acknowledgement {
    AckType   type;
    int32_t   session_id;
    int32_t   os_pid;     // actual child PID (from getpid())
};

// ── Reliable read/write helpers ───────────────────────────────────────────────
// Loop until all bytes transferred; handle EINTR.

#ifdef __linux__

inline void write_exact(int fd, const void* buf, size_t n) {
    const char* p = static_cast<const char*>(buf);
    size_t remaining = n;
    while (remaining > 0) {
        ssize_t written = ::write(fd, p, remaining);
        if (written < 0) {
            if (errno == EINTR) continue;
            throw std::runtime_error(
                std::string("write_exact failed: ") + strerror(errno));
        }
        if (written == 0)
            throw std::runtime_error("write_exact: pipe closed");
        p         += written;
        remaining -= static_cast<size_t>(written);
    }
}

inline void read_exact(int fd, void* buf, size_t n) {
    char* p = static_cast<char*>(buf);
    size_t remaining = n;
    while (remaining > 0) {
        ssize_t got = ::read(fd, p, remaining);
        if (got < 0) {
            if (errno == EINTR) continue;
            throw std::runtime_error(
                std::string("read_exact failed: ") + strerror(errno));
        }
        if (got == 0)
            throw std::runtime_error("read_exact: pipe closed (EOF)");
        p         += got;
        remaining -= static_cast<size_t>(got);
    }
}

inline void send_instruction(int fd, const Instruction& msg) {
    write_exact(fd, &msg, sizeof(msg));
}

inline void recv_instruction(int fd, Instruction& msg) {
    read_exact(fd, &msg, sizeof(msg));
}

inline void send_ack(int fd, const Acknowledgement& msg) {
    write_exact(fd, &msg, sizeof(msg));
}

inline void recv_ack(int fd, Acknowledgement& msg) {
    read_exact(fd, &msg, sizeof(msg));
}

#endif // __linux__

} // namespace ipc
} // namespace sched
