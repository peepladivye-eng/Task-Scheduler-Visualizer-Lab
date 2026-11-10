/**
 * test_main.cpp — Unit tests for the C++17 scheduler engine.
 * GCC 6 compatible: no structured bindings, no <optional>.
 */
#include "../include/parser/input_parser.hpp"
#include "../include/scheduler/simulation.hpp"
#include "../include/metrics/metrics.hpp"

#include <cstdio>
#include <cstdlib>
#include <cmath>
#include <string>
#include <stdexcept>
#include <fstream>
#include <vector>

using namespace sched;

// -- Minimal test framework ---------------------------------------------------
static int g_passed = 0;
static int g_failed = 0;

#define CHECK(cond, msg) do { \
    if (cond) { ++g_passed; std::fprintf(stdout, "  PASS: %s\n", msg); } \
    else { std::fprintf(stderr, "  FAIL: %s (%s:%d)\n", msg, __FILE__, __LINE__); ++g_failed; } \
} while(0)

#define CHECK_THROW(expr, msg) do { \
    bool threw = false; \
    try { (void)(expr); } catch (...) { threw = true; } \
    if (threw) { ++g_passed; std::fprintf(stdout, "  PASS: %s\n", msg); } \
    else { std::fprintf(stderr, "  FAIL (no throw): %s (%s:%d)\n", msg, __FILE__, __LINE__); ++g_failed; } \
} while(0)

static bool approx(double a, double b, double eps = 0.011) {
    return std::fabs(a - b) <= eps;
}

static std::string fixture_path(const std::string& name) {
    return "fixtures/" + name + "/input.txt";
}

static std::vector<ProcessInput> make_procs_4(
        int p1, int a1, int b1, int pr1,
        int p2, int a2, int b2, int pr2) {
    std::vector<ProcessInput> v;
    ProcessInput x; x.pid=p1; x.arrival=a1; x.burst=b1; x.priority=pr1; v.push_back(x);
    x.pid=p2; x.arrival=a2; x.burst=b2; x.priority=pr2; v.push_back(x);
    return v;
}

static std::vector<ProcessInput> make_procs_6(
        int p1, int a1, int b1, int pr1,
        int p2, int a2, int b2, int pr2,
        int p3, int a3, int b3, int pr3) {
    std::vector<ProcessInput> v;
    ProcessInput x;
    x.pid=p1; x.arrival=a1; x.burst=b1; x.priority=pr1; v.push_back(x);
    x.pid=p2; x.arrival=a2; x.burst=b2; x.priority=pr2; v.push_back(x);
    x.pid=p3; x.arrival=a3; x.burst=b3; x.priority=pr3; v.push_back(x);
    return v;
}

static std::vector<ProcessInput> make_single(int pid, int arr, int burst, int pri) {
    std::vector<ProcessInput> v;
    ProcessInput x; x.pid=pid; x.arrival=arr; x.burst=burst; x.priority=pri;
    v.push_back(x);
    return v;
}

// -- Parser tests -------------------------------------------------------------
static void test_parser() {
    std::fprintf(stdout, "--- Parser tests ---\n");

    try {
        auto procs = parse_input(fixture_path("fcfs_textbook"));
        CHECK(procs.size() == 3, "fcfs_textbook: 3 processes");
        CHECK(procs[0].pid == 1, "fcfs_textbook: first pid is 1");
    } catch (...) {
        CHECK(false, "fcfs_textbook: parse should not throw");
    }

    CHECK_THROW(parse_input("__no_such_file__.txt"), "nonexistent file throws");

    {
        const std::string tmp = "sched_test_empty_tmp.txt";
        { std::ofstream f(tmp); }
        CHECK_THROW(parse_input(tmp), "empty file throws");
        std::remove(tmp.c_str());
    }
}

// -- FCFS tests ---------------------------------------------------------------
static void test_fcfs() {
    std::fprintf(stdout, "--- FCFS tests ---\n");

    {
        auto procs = make_single(1, 0, 5, 0);
        SimConfig cfg; cfg.algo = Algo::FCFS;
        auto r = simulate(cfg, procs);
        CHECK(r.processes[0].start      == 0, "fcfs single: start=0");
        CHECK(r.processes[0].completion == 5, "fcfs single: completion=5");
        CHECK(r.processes[0].waiting    == 0, "fcfs single: waiting=0");
        CHECK((int)r.timeline.size()    == 1, "fcfs single: 1 segment");
        CHECK(r.context_switches        == 0, "fcfs single: 0 cs");
    }

    {
        auto procs = make_procs_4(1,0,3,0, 2,2,4,0);
        SimConfig cfg; cfg.algo = Algo::FCFS;
        auto r = simulate(cfg, procs);
        CHECK(r.processes[0].completion == 3, "fcfs 2proc: P1 completes at 3");
        CHECK(r.processes[1].start      == 3, "fcfs 2proc: P2 starts at 3");
        CHECK(r.processes[1].completion == 7, "fcfs 2proc: P2 completes at 7");
    }

    {
        auto procs = make_procs_4(1,0,3,0, 2,10,4,0);
        SimConfig cfg; cfg.algo = Algo::FCFS;
        auto r = simulate(cfg, procs);
        bool has_idle = false;
        for (size_t i = 0; i < r.timeline.size(); ++i)
            if (r.timeline[i].type == SegType::IDLE) has_idle = true;
        CHECK(has_idle, "fcfs idle gap: idle segment present");
    }
}

// -- SJF tests ----------------------------------------------------------------
static void test_sjf() {
    std::fprintf(stdout, "--- SJF tests ---\n");

    {
        auto procs = make_procs_6(1,0,8,0, 2,0,3,0, 3,0,5,0);
        SimConfig cfg; cfg.algo = Algo::SJF;
        auto r = simulate(cfg, procs);
        // P2 has shortest burst (3) so runs first
        CHECK(r.processes[1].start      == 0, "sjf: P2 runs first (burst=3)");
        CHECK(r.processes[1].completion == 3, "sjf: P2 completes at 3");
    }

    {
        auto procs = make_procs_4(1,0,10,0, 2,1,1,0);
        SimConfig cfg; cfg.algo = Algo::SJF;
        auto r = simulate(cfg, procs);
        CHECK(r.processes[0].start      == 0,  "sjf non-preempt: P1 starts at 0");
        CHECK(r.processes[0].completion == 10, "sjf non-preempt: P1 runs to 10");
        CHECK(r.processes[1].start      == 10, "sjf non-preempt: P2 starts after P1");
    }
}

// -- SRTF tests ---------------------------------------------------------------
static void test_srtf() {
    std::fprintf(stdout, "--- SRTF tests ---\n");

    {
        auto procs = make_procs_4(1,0,10,0, 2,2,2,0);
        SimConfig cfg; cfg.algo = Algo::SRTF;
        auto r = simulate(cfg, procs);
        CHECK(r.processes[1].start      == 2, "srtf: P2 preempts P1 at t=2");
        CHECK(r.processes[1].completion == 4, "srtf: P2 completes at 4");
    }

    {
        auto procs = make_procs_4(1,0,5,0, 2,1,5,0);
        SimConfig cfg; cfg.algo = Algo::SRTF;
        auto r = simulate(cfg, procs);
        // At t=1, P1 remaining=4, P2 remaining=5; P2 is NOT strictly less ? no preempt
        CHECK(r.processes[0].start == 0, "srtf equal remaining: P1 not preempted");
    }
}

// -- Priority tests -----------------------------------------------------------
static void test_priority() {
    std::fprintf(stdout, "--- Priority tests ---\n");

    {
        auto procs = make_procs_6(1,0,5,3, 2,0,4,1, 3,0,3,2);
        SimConfig cfg; cfg.algo = Algo::PRIORITY;
        auto r = simulate(cfg, procs);
        // P2 has lowest priority number (1) ? runs first
        CHECK(r.processes[1].start == 0, "priority: P2 (pri=1) runs first");
    }

    {
        auto procs = make_procs_4(1,0,10,5, 2,1,2,1);
        SimConfig cfg; cfg.algo = Algo::PRIORITY;
        auto r = simulate(cfg, procs);
        CHECK(r.processes[0].start      == 0,  "priority non-preempt: P1 starts first");
        CHECK(r.processes[0].completion == 10, "priority non-preempt: P1 runs to 10");
    }
}

// -- Priority-P tests ---------------------------------------------------------
static void test_priority_p() {
    std::fprintf(stdout, "--- Priority-P tests ---\n");

    {
        auto procs = make_procs_4(1,0,10,5, 2,2,2,1);
        SimConfig cfg; cfg.algo = Algo::PRIORITY_P;
        auto r = simulate(cfg, procs);
        CHECK(r.processes[1].start      == 2, "priority-p: P2 preempts P1 at t=2");
        CHECK(r.processes[1].completion == 4, "priority-p: P2 completes at 4");
    }

    {
        auto procs = make_procs_4(1,0,5,2, 2,1,5,2);
        SimConfig cfg; cfg.algo = Algo::PRIORITY_P;
        auto r = simulate(cfg, procs);
        CHECK(r.processes[0].start == 0, "priority-p equal: P1 not preempted");
    }
}

// -- RR tests -----------------------------------------------------------------
static void test_rr() {
    std::fprintf(stdout, "--- Round Robin tests ---\n");

    {
        auto procs = make_single(1, 0, 3, 0);
        SimConfig cfg; cfg.algo = Algo::RR; cfg.quantum = 5;
        auto r = simulate(cfg, procs);
        CHECK(r.processes[0].completion == 3, "rr single: completes at 3");
        CHECK(r.context_switches        == 0, "rr single: 0 context switches");
    }

    {
        auto procs = make_procs_4(1,0,4,0, 2,0,4,0);
        SimConfig cfg; cfg.algo = Algo::RR; cfg.quantum = 2;
        auto r = simulate(cfg, procs);
        CHECK(r.processes[0].completion == 6, "rr q2 two: P1 completes at 6");
        CHECK(r.processes[1].completion == 8, "rr q2 two: P2 completes at 8");
    }

    {
        // P2 arrives at t=2 when P1's quantum expires at t=2
        // P2 must run before P1's remaining slice
        auto procs = make_procs_4(1,0,4,0, 2,2,2,0);
        SimConfig cfg; cfg.algo = Algo::RR; cfg.quantum = 2;
        auto r = simulate(cfg, procs);
        CHECK(r.processes[1].start == 2, "rr arrival during quantum: P2 runs at t=2");
    }
}

// -- Metrics tests ------------------------------------------------------------
static void test_metrics() {
    std::fprintf(stdout, "--- Metrics tests ---\n");

    {
        auto procs = make_single(1, 0, 5, 0);
        SimConfig cfg; cfg.algo = Algo::FCFS;
        auto r = simulate(cfg, procs);
        auto m = compute_metrics(r);
        CHECK(approx(m.avg_waiting,    0.0),   "metrics single: avg_waiting=0");
        CHECK(approx(m.avg_turnaround, 5.0),   "metrics single: avg_turnaround=5");
        CHECK(approx(m.avg_response,   0.0),   "metrics single: avg_response=0");
        CHECK(approx(m.cpu_utilization, 100.0),"metrics single: cpu_util=100");
        CHECK(approx(m.throughput,     0.2),   "metrics single: throughput=0.2");
        CHECK(m.context_switches == 0,          "metrics single: 0 cs");
    }
}

// -- CS cost tests ------------------------------------------------------------
static void test_cs_cost() {
    std::fprintf(stdout, "--- Context switch cost tests ---\n");

    {
        auto procs = make_procs_4(1,0,3,0, 2,0,3,0);
        SimConfig cfg; cfg.algo = Algo::FCFS; cfg.cs_cost = 1;
        auto r = simulate(cfg, procs);
        bool has_cs = false;
        for (size_t i = 0; i < r.timeline.size(); ++i)
            if (r.timeline[i].type == SegType::CS) has_cs = true;
        CHECK(has_cs,               "cs_cost=1: context_switch segment present");
        CHECK(r.context_switches == 1, "cs_cost=1: 1 context switch");
    }
}

// -- Main ---------------------------------------------------------------------
int main() {
    test_parser();
    test_fcfs();
    test_sjf();
    test_srtf();
    test_priority();
    test_priority_p();
    test_rr();
    test_metrics();
    test_cs_cost();

    std::fprintf(stdout, "\n%d passed, %d failed\n", g_passed, g_failed);
    return (g_failed > 0) ? 1 : 0;
}


