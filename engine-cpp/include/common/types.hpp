#pragma once
#include <string>
#include <vector>
#include <cstdint>

namespace sched {

// ── Limits ──────────────────────────────────────────────────────────────────
static constexpr int MAX_PROCS        = 64;
static constexpr int MAX_BURST        = 10000;
static constexpr int MAX_ARRIVAL      = 10000;
static constexpr int MAX_PRIORITY     = 1000;
static constexpr int MAX_QUANTUM      = 10000;
static constexpr int MAX_CS_COST      = 100;
static constexpr int MAX_SIM_TICKS    = 1000000;

// ── Algorithm identifiers ────────────────────────────────────────────────────
enum class Algo {
    FCFS,
    SJF,
    SRTF,
    PRIORITY,
    PRIORITY_P,
    RR,
};

inline const char* algo_name(Algo a) {
    switch (a) {
        case Algo::FCFS:       return "fcfs";
        case Algo::SJF:        return "sjf";
        case Algo::SRTF:       return "srtf";
        case Algo::PRIORITY:   return "priority";
        case Algo::PRIORITY_P: return "priority-p";
        case Algo::RR:         return "rr";
    }
    return "unknown";
}

// ── Segment types ────────────────────────────────────────────────────────────
enum class SegType { RUN, IDLE, CS };

inline const char* seg_type_name(SegType t) {
    switch (t) {
        case SegType::RUN:  return "run";
        case SegType::IDLE: return "idle";
        case SegType::CS:   return "context_switch";
    }
    return "unknown";
}

// ── Event types ──────────────────────────────────────────────────────────────
enum class EvType { ARRIVE, DISPATCH, PREEMPT, COMPLETE };

inline const char* ev_type_name(EvType t) {
    switch (t) {
        case EvType::ARRIVE:   return "arrive";
        case EvType::DISPATCH: return "dispatch";
        case EvType::PREEMPT:  return "preempt";
        case EvType::COMPLETE: return "complete";
    }
    return "unknown";
}

// ── Process data ─────────────────────────────────────────────────────────────
struct ProcessInput {
    int pid;
    int arrival;
    int burst;
    int priority;
};

struct ProcessState {
    int pid;
    int arrival;
    int burst;
    int priority;

    int remaining;
    int start;        // -1 until first run
    int completion;   // -1 until complete
    int waiting;
    int turnaround;
    int response;
    int os_pid;       // -1 until fork() (Phase 2)
};

// ── Timeline segment ─────────────────────────────────────────────────────────
struct Segment {
    int     t_start;
    int     t_end;
    int     pid;      // -1 for idle
    SegType type;
};

// ── Simulation event ─────────────────────────────────────────────────────────
struct Event {
    int    t;
    EvType type;
    int    pid;
    std::vector<int> ready_queue;
};

// ── Simulation configuration ─────────────────────────────────────────────────
struct SimConfig {
    Algo algo;
    int  quantum;
    int  cs_cost;

    SimConfig() : algo(Algo::FCFS), quantum(0), cs_cost(0) {}
};

// ── Simulation result ────────────────────────────────────────────────────────
struct SimResult {
    SimConfig               cfg;
    std::vector<ProcessState> processes;
    std::vector<Segment>    timeline;
    std::vector<Event>      events;
    int                     context_switches;
    int                     total_time;

    SimResult() : context_switches(0), total_time(0) {}
};

// ── Aggregate metrics ────────────────────────────────────────────────────────
struct Metrics {
    double avg_waiting;
    double avg_turnaround;
    double avg_response;
    double cpu_utilization;
    double throughput;
    int    context_switches;

    Metrics() : avg_waiting(0), avg_turnaround(0), avg_response(0),
                cpu_utilization(0), throughput(0), context_switches(0) {}
};

} // namespace sched
