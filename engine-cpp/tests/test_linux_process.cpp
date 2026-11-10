// Linux-only integration tests for the process manager.
// Build and run only on Linux/WSL2.
#ifdef __linux__

#include "../include/process/process_manager.hpp"
#include "../include/ipc/ipc_protocol.hpp"
#include <cstdio>
#include <unistd.h>
#include <sys/stat.h>
#include <string>
#include <cstring>

using namespace sched;

static int g_passed = 0;
static int g_failed = 0;

#define CHECK(cond, msg) do { \
    if (cond) { ++g_passed; std::fprintf(stdout, "  PASS: %s\n", msg); } \
    else { std::fprintf(stderr, "  FAIL: %s (%s:%d)\n", msg, __FILE__, __LINE__); ++g_failed; } \
} while(0)

// Returns true if /proc/<pid> exists (process is still alive / zombie).
static bool proc_exists(int pid) {
    std::string path = "/proc/" + std::to_string(pid);
    struct stat st;
    return ::stat(path.c_str(), &st) == 0;
}

// ── Test 1: single worker, real PID ─────────────────────────────────────────
static void test_single_worker() {
    std::fprintf(stdout, "--- Test 1: single worker ---\n");
    ProcessManager pm;
    int os_pid = pm.create_worker(1);
    CHECK(os_pid > 0,            "os_pid > 0");
    CHECK(os_pid != ::getpid(),  "os_pid != parent pid");
    pm.terminate_worker(1);
    // After reap, /proc/<pid> should not exist
    CHECK(!proc_exists(os_pid),  "no zombie after terminate");
}

// ── Test 2: multiple workers, distinct PIDs ──────────────────────────────────
static void test_multiple_workers() {
    std::fprintf(stdout, "--- Test 2: multiple workers ---\n");
    ProcessManager pm;
    int pid1 = pm.create_worker(1);
    int pid2 = pm.create_worker(2);
    int pid3 = pm.create_worker(3);
    CHECK(pid1 > 0,         "worker1 pid > 0");
    CHECK(pid2 > 0,         "worker2 pid > 0");
    CHECK(pid3 > 0,         "worker3 pid > 0");
    CHECK(pid1 != pid2,     "worker1 and worker2 have different PIDs");
    CHECK(pid2 != pid3,     "worker2 and worker3 have different PIDs");
    CHECK(pid1 != pid3,     "worker1 and worker3 have different PIDs");
    pm.shutdown_all();
    CHECK(!proc_exists(pid1), "worker1 reaped");
    CHECK(!proc_exists(pid2), "worker2 reaped");
    CHECK(!proc_exists(pid3), "worker3 reaped");
}

// ── Test 3: execute units ─────────────────────────────────────────────────────
static void test_execute_units() {
    std::fprintf(stdout, "--- Test 3: execute units ---\n");
    ProcessManager pm;
    pm.create_worker(1);
    bool threw = false;
    try {
        pm.send_execute(1, 1);  // 1 unit = 100k iterations
    } catch (...) { threw = true; }
    CHECK(!threw, "send_execute(1 unit) completes without error");
    pm.terminate_worker(1);
}

// ── Test 4: terminate + no zombie ────────────────────────────────────────────
static void test_terminate_no_zombie() {
    std::fprintf(stdout, "--- Test 4: terminate + waitpid ---\n");
    ProcessManager pm;
    int os_pid = pm.create_worker(1);
    pm.terminate_worker(1);
    // Give the kernel a moment to clean up.
    ::usleep(10000);
    CHECK(!proc_exists(os_pid), "process reaped, no zombie");
}

// ── Test 5: shutdown_all ─────────────────────────────────────────────────────
static void test_shutdown_all() {
    std::fprintf(stdout, "--- Test 5: shutdown_all ---\n");
    int pids[4];
    {
        ProcessManager pm;
        for (int i = 0; i < 4; ++i)
            pids[i] = pm.create_worker(i + 1);
        // Send some work
        pm.send_execute(1, 1);
        pm.send_execute(2, 2);
        // Let destructor call shutdown_all()
    }
    ::usleep(20000);
    for (int i = 0; i < 4; ++i) {
        char msg[64];
        std::snprintf(msg, sizeof(msg), "worker%d reaped by shutdown_all", i+1);
        CHECK(!proc_exists(pids[i]), msg);
    }
}

// ── Test 6: get_os_pid ───────────────────────────────────────────────────────
static void test_get_os_pid() {
    std::fprintf(stdout, "--- Test 6: get_os_pid ---\n");
    ProcessManager pm;
    int created = pm.create_worker(42);
    int looked_up = pm.get_os_pid(42);
    CHECK(created == looked_up, "get_os_pid returns same PID as create_worker");
    pm.terminate_worker(42);
}

int main() {
    test_single_worker();
    test_multiple_workers();
    test_execute_units();
    test_terminate_no_zombie();
    test_shutdown_all();
    test_get_os_pid();

    std::fprintf(stdout, "\n%d passed, %d failed\n", g_passed, g_failed);
    return g_failed > 0 ? 1 : 0;
}

#else
#include <cstdio>
int main() {
    std::fprintf(stdout, "Linux process tests: skipped (not Linux)\n");
    return 0;
}
#endif
