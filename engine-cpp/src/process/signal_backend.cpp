#ifdef __linux__
#include "../../include/process/signal_backend.hpp"

#include <sys/types.h>
#include <sys/wait.h>
#include <sys/resource.h>
#include <sys/prctl.h>
#include <signal.h>
#include <unistd.h>
#include <time.h>
#include <cerrno>
#include <cstring>
#include <cstdio>
#include <cstdlib>
#include <stdexcept>
#include <string>

// ── Volatile flags set by signal handlers (parent only) ──────────────────────
static volatile sig_atomic_t g_timeout_flag = 0;
static volatile sig_atomic_t g_stop_flag    = 0;

static void handle_alrm(int) { g_timeout_flag = 1; }
static void handle_int(int)  { g_stop_flag    = 1; }
static void handle_term(int) { g_stop_flag    = 1; }

// ── unit_of_work: burn exactly `us` microseconds of CPU time ─────────────────
static void unit_of_work(int us) {
    if (us <= 0) return;
    struct timespec start{}, now{};
    ::clock_gettime(CLOCK_PROCESS_CPUTIME_ID, &start);
    long target_ns = (long)us * 1000L;
    volatile long acc = 0;
    while (true) {
        // small busy-loop chunk
        for (int i = 0; i < 1000; ++i) acc += i;
        ::clock_gettime(CLOCK_PROCESS_CPUTIME_ID, &now);
        long elapsed = (now.tv_sec - start.tv_sec) * 1000000000L
                     + (now.tv_nsec - start.tv_nsec);
        if (elapsed >= target_ns) break;
    }
    (void)acc;
}

namespace sched {

// Install signal handlers in the parent (called once).
static void install_parent_handlers() {
    struct sigaction sa{};
    sa.sa_handler = handle_alrm;
    ::sigemptyset(&sa.sa_mask);
    sa.sa_flags = 0;  // NO SA_RESTART
    ::sigaction(SIGALRM, &sa, nullptr);

    sa.sa_handler = handle_int;
    ::sigaction(SIGINT, &sa, nullptr);

    sa.sa_handler = handle_term;
    ::sigaction(SIGTERM, &sa, nullptr);
}

SignalBackend::SignalBackend(const LiveOptions& opt)
    : opt_(opt), group_(0), parent_(::getpid()) {
    install_parent_handlers();
}

SignalBackend::~SignalBackend() { abort_all(); }

int SignalBackend::spawn(int pid, int burst) {
    if (g_stop_flag)
        throw std::runtime_error("interrupted before spawn");

    pid_t child_pid = ::fork();
    if (child_pid < 0)
        throw std::runtime_error(std::string("fork() failed: ") + strerror(errno));

    if (child_pid == 0) {
        // ── CHILD ────────────────────────────────────────────────────────
        // Rule 1: PR_SET_PDEATHSIG first, then check parent still alive.
        ::prctl(PR_SET_PDEATHSIG, SIGKILL);
        if (::getppid() != parent_) ::_exit(1);

        // Rule 1: reset all signal handlers to default, unblock everything.
        struct sigaction sa_dfl{};
        sa_dfl.sa_handler = SIG_DFL;
        ::sigemptyset(&sa_dfl.sa_mask);
        sa_dfl.sa_flags = 0;
        for (int sig = 1; sig < 32; ++sig)
            ::sigaction(sig, &sa_dfl, nullptr);
        sigset_t empty; ::sigemptyset(&empty);
        ::sigprocmask(SIG_SETMASK, &empty, nullptr);

        // Rule 1: initial stop — parent will SIGCONT us when we're scheduled.
        ::raise(SIGSTOP);

        // Rule 1: burst loop — one unit per tick.
        bool log = opt_.log_mode;
        for (int i = 1; i <= burst; ++i) {
            // Rule 2: burn CPU time
            unit_of_work(opt_.work_us);

            // Rule 7: log mode — one write() per tick to stderr
            if (log) {
                char buf[64];
                int n = ::snprintf(buf, sizeof(buf),
                    "[CHILD-%d] P%d tick %d/%d\n",
                    (int)::getpid(), pid, i, burst);
                ::write(STDERR_FILENO, buf, (size_t)n);
            }

            if (i == burst) ::_exit(0);
            ::raise(SIGSTOP);
        }
        ::_exit(0);  // should not reach
    }

    // ── PARENT ───────────────────────────────────────────────────────────
    // Rule 3: place in process group.
    if (group_ == 0) {
        ::setpgid(child_pid, 0);  // make child its own group leader
        group_ = child_pid;
    } else {
        ::setpgid(child_pid, group_);  // join existing group
    }
    // Also set from parent side to avoid TOCTOU race.
    ::setpgid(child_pid, group_);

    // Wait for child's initial raise(SIGSTOP).
    int st = 0;
    pid_t r;
    do { r = ::wait4(child_pid, &st, WUNTRACED, nullptr); }
    while (r < 0 && errno == EINTR && !g_stop_flag);

    if (g_stop_flag) {
        ::kill(child_pid, SIGKILL);
        ::waitpid(child_pid, nullptr, 0);
        throw std::runtime_error("interrupted during spawn");
    }
    if (r != child_pid || !WIFSTOPPED(st) || WSTOPSIG(st) != SIGSTOP) {
        ::kill(child_pid, SIGKILL);
        ::waitpid(child_pid, nullptr, 0);
        throw std::runtime_error(
            "spawn: child did not stop as expected (pid=" +
            std::to_string(child_pid) + ")");
    }

    SigEntry entry;
    entry.logical_pid = pid;
    entry.os_pid      = child_pid;
    entry.remaining   = burst;
    entry.finished    = false;
    workers_[pid]     = entry;
    return child_pid;
}

bool SignalBackend::run_tick(int pid) {
    auto it = workers_.find(pid);
    if (it == workers_.end())
        throw std::runtime_error("run_tick: unknown pid " + std::to_string(pid));
    SigEntry& rec = it->second;
    if (rec.finished) return true;

    if (g_stop_flag)
        throw std::runtime_error("interrupted before run_tick");

    // Rule 4: SIGCONT, arm 2s alarm, wait4 WUNTRACED.
    g_timeout_flag = 0;
    ::kill(rec.os_pid, SIGCONT);
    ::alarm(2);

    struct rusage ru{};
    int st = 0;
    pid_t r;
    do {
        r = ::wait4(rec.os_pid, &st, WUNTRACED, &ru);
    } while (r < 0 && errno == EINTR && !g_timeout_flag && !g_stop_flag);

    ::alarm(0);

    // Rule 5: check flags
    if (g_stop_flag) {
        abort_all();
        throw std::runtime_error("interrupted during run_tick");
    }
    if (g_timeout_flag) {
        abort_all();
        throw std::runtime_error(
            "run_tick: child P" + std::to_string(pid) +
            " (os_pid=" + std::to_string(rec.os_pid) +
            ") did not finish its tick within 2s");
    }

    --rec.remaining;

    // After tick: expect WIFSTOPPED (more ticks) or WIFEXITED 0 (done).
    if (rec.remaining > 0) {
        if (!(WIFSTOPPED(st) && WSTOPSIG(st) == SIGSTOP)) {
            std::string desc;
            if (WIFEXITED(st))
                desc = "exited with status " + std::to_string(WEXITSTATUS(st));
            else if (WIFSIGNALED(st))
                desc = "killed by signal " + std::to_string(WTERMSIG(st));
            else
                desc = "unexpected wait status";
            abort_all();
            throw std::runtime_error(
                "run_tick P" + std::to_string(pid) +
                " (os_pid=" + std::to_string(rec.os_pid) + "): " + desc +
                " but remaining=" + std::to_string(rec.remaining));
        }
        return false;
    }

    // remaining == 0: expect clean exit
    if (!(WIFEXITED(st) && WEXITSTATUS(st) == 0)) {
        std::string desc;
        if (WIFSIGNALED(st))
            desc = "killed by signal " + std::to_string(WTERMSIG(st));
        else if (WIFEXITED(st))
            desc = "exited with status " + std::to_string(WEXITSTATUS(st));
        else
            desc = "unexpected wait status";
        abort_all();
        throw std::runtime_error(
            "run_tick P" + std::to_string(pid) +
            " (os_pid=" + std::to_string(rec.os_pid) + "): last tick " + desc);
    }

    // Collect stats
    rec.stats.cpu_ms     = (ru.ru_utime.tv_sec + ru.ru_stime.tv_sec) * 1000.0
                         + (ru.ru_utime.tv_usec + ru.ru_stime.tv_usec) / 1000.0;
    rec.stats.max_rss_kb = ru.ru_maxrss;
    rec.stats.exit_status = 0;
    rec.finished         = true;
    return true;
}

WorkerStats SignalBackend::stats(int pid) const {
    auto it = workers_.find(pid);
    if (it == workers_.end())
        throw std::runtime_error("stats: unknown pid " + std::to_string(pid));
    return it->second.stats;
}

void SignalBackend::abort_all() noexcept {
    // Rule 6: SIGKILL the entire process group, then wait4 every child.
    if (group_ > 0) {
        ::kill(-group_, SIGKILL);
    }
    for (auto& kv : workers_) {
        SigEntry& e = kv.second;
        if (!e.finished && e.os_pid > 0) {
            ::kill(e.os_pid, SIGKILL);  // redundant but safe
            int st; pid_t r;
            do { r = ::waitpid(e.os_pid, &st, 0); } while (r < 0 && errno == EINTR);
            e.os_pid   = 0;
            e.finished = true;
        }
    }
}

void SignalBackend::reap_all_killed() noexcept {
    abort_all();
}

} // namespace sched
#endif // __linux__
