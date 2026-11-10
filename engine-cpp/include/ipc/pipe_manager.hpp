#pragma once
// Linux-only IPC pipe management with RAII file descriptor ownership.
// On non-Linux platforms the types compile but create()/close() are no-ops.

#ifdef __linux__
#include <unistd.h>
#include <stdexcept>
#include <string>
#endif

namespace sched {

// RAII wrapper for a single file descriptor.
struct Fd {
    int fd = -1;

    Fd() = default;
    explicit Fd(int f) : fd(f) {}
    Fd(const Fd&) = delete;
    Fd& operator=(const Fd&) = delete;
    Fd(Fd&& o) noexcept : fd(o.fd) { o.fd = -1; }
    Fd& operator=(Fd&& o) noexcept {
        close_fd();
        fd = o.fd;
        o.fd = -1;
        return *this;
    }
    ~Fd() { close_fd(); }

    bool valid() const { return fd >= 0; }

    // Release ownership (caller must close the raw fd).
    int release() {
        int tmp = fd;
        fd = -1;
        return tmp;
    }

    void close_fd() {
#ifdef __linux__
        if (fd >= 0) { ::close(fd); fd = -1; }
#endif
    }
};

// A pair of pipe ends.
struct Pipe {
    Fd read_end;
    Fd write_end;

    // Factory — throws std::runtime_error on failure.
    static Pipe create() {
#ifdef __linux__
        int fds[2];
        if (::pipe(fds) != 0)
            throw std::runtime_error("pipe() failed");
        Pipe p;
        p.read_end  = Fd(fds[0]);
        p.write_end = Fd(fds[1]);
        return p;
#else
        throw std::runtime_error("pipe() not supported on this platform");
#endif
    }
};

} // namespace sched
