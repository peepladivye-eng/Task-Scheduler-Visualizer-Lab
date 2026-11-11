/**
 * main.cpp — CLI entry point for the C++ scheduler engine.
 *
 * --mode simulate   (default) pure tick simulation
 * --mode live       fork real child workers, populate os_pid in output
 * --ipc signal      (default) SIGSTOP/SIGCONT backend
 * --ipc pipe        pipe-based IPC backend
 * --work-us N       CPU microseconds burned per tick in child (default 200)
 * --tick-ms N       parent sleeps N ms per tick in live mode (default 0)
 * --log             print per-tick log lines to stderr
 */
#include "../include/parser/input_parser.hpp"
#include "../include/scheduler/simulation.hpp"
#include "../include/scheduler/execution_controller.hpp"
#include "../include/metrics/metrics.hpp"
#include "../include/trace/trace_writer.hpp"
#include "../include/common/types.hpp"

#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#include <vector>
#include <stdexcept>
#include <csignal>

#ifdef __linux__
#include "../include/process/worker_backend.hpp"
#endif

// Signal flags: set by handlers in signal_backend.cpp (Linux only).
// Declared here so main.cpp can check exit codes after interruption.
#ifdef __linux__
extern volatile sig_atomic_t g_stop_flag;
#endif

using namespace sched;

static void die(const char* msg) {
    std::fprintf(stderr, "error: %s\n", msg);
    std::exit(1);
}

static int parse_algo_str(const char* s, Algo& out) {
    if (std::strcmp(s, "fcfs")       == 0) { out = Algo::FCFS;       return 0; }
    if (std::strcmp(s, "sjf")        == 0) { out = Algo::SJF;        return 0; }
    if (std::strcmp(s, "srtf")       == 0) { out = Algo::SRTF;       return 0; }
    if (std::strcmp(s, "priority")   == 0) { out = Algo::PRIORITY;   return 0; }
    if (std::strcmp(s, "priority-p") == 0) { out = Algo::PRIORITY_P; return 0; }
    if (std::strcmp(s, "rr")         == 0) { out = Algo::RR;         return 0; }
    return -1;
}

// Strict integer parse (no atoi — rejects partial parses).
static int strict_int(const char* s, const char* flagname) {
    if (!s || !*s) {
        std::string msg = std::string(flagname) + " needs an integer value";
        die(msg.c_str());
    }
    char* end = nullptr;
    long val = std::strtol(s, &end, 10);
    if (*end != '\0' || end == s) {
        std::string msg = std::string(flagname) + " invalid integer: " + s;
        die(msg.c_str());
    }
    return (int)val;
}

int main(int argc, char* argv[]) {
    const char* algo_str   = nullptr;
    const char* input_file = nullptr;
    const char* out_file   = nullptr;
    const char* mode_str   = "simulate";
    const char* ipc_str    = "signal";
    int         quantum    = -1;
    int         cs_cost    = 0;
    int         work_us    = 200;
    int         tick_ms    = 0;
    bool        do_compare = false;
    bool        log_mode   = false;

    for (int i = 1; i < argc; ++i) {
        const char* arg = argv[i];
        if      (std::strcmp(arg, "--algo")           == 0) { if (++i >= argc) die("--algo needs value");           algo_str   = argv[i]; }
        else if (std::strcmp(arg, "--input")          == 0) { if (++i >= argc) die("--input needs value");          input_file = argv[i]; }
        else if (std::strcmp(arg, "--quantum")        == 0) { if (++i >= argc) die("--quantum needs value");        quantum    = strict_int(argv[i], "--quantum"); }
        else if (std::strcmp(arg, "--context-switch") == 0) { if (++i >= argc) die("--context-switch needs value"); cs_cost    = strict_int(argv[i], "--context-switch"); }
        else if (std::strcmp(arg, "--out")            == 0) { if (++i >= argc) die("--out needs value");            out_file   = argv[i]; }
        else if (std::strcmp(arg, "--mode")           == 0) { if (++i >= argc) die("--mode needs value");           mode_str   = argv[i]; }
        else if (std::strcmp(arg, "--ipc")            == 0) { if (++i >= argc) die("--ipc needs value");            ipc_str    = argv[i]; }
        else if (std::strcmp(arg, "--work-us")        == 0) { if (++i >= argc) die("--work-us needs value");         work_us    = strict_int(argv[i], "--work-us"); }
        else if (std::strcmp(arg, "--tick-ms")        == 0) { if (++i >= argc) die("--tick-ms needs value");         tick_ms    = strict_int(argv[i], "--tick-ms"); }
        else if (std::strcmp(arg, "--compare")        == 0) { do_compare = true; }
        else if (std::strcmp(arg, "--log")            == 0) { log_mode = true; }
        else if (std::strcmp(arg, "--help")           == 0) {
            std::fprintf(stderr,
                "Usage: scheduler_cpp --algo <fcfs|sjf|srtf|priority|priority-p|rr> "
                "--input FILE [--quantum N] [--context-switch N] "
                "[--mode simulate|live] [--ipc signal|pipe] "
                "[--work-us N] [--tick-ms N] [--log] [--out FILE] [--compare]\n");
            return 0;
        }
        else { std::string msg = "unknown flag: " + std::string(arg); die(msg.c_str()); }
    }

    // Validate --ipc (strict)
    if (std::strcmp(ipc_str, "signal") != 0 && std::strcmp(ipc_str, "pipe") != 0) {
        std::string msg = "invalid --ipc value: " + std::string(ipc_str) + " (must be signal or pipe)";
        die(msg.c_str());
    }

    // Validate --work-us (0..100000)
    if (work_us < 0 || work_us > 100000) {
        std::string msg = "--work-us must be 0..100000, got " + std::to_string(work_us);
        die(msg.c_str());
    }

    // Validate --tick-ms (0..1000)
    if (tick_ms < 0 || tick_ms > 1000) {
        std::string msg = "--tick-ms must be 0..1000, got " + std::to_string(tick_ms);
        die(msg.c_str());
    }

    // Validate --mode (strict)
    if (std::strcmp(mode_str, "simulate") != 0 && std::strcmp(mode_str, "live") != 0) {
        std::string msg = "invalid --mode value: " + std::string(mode_str) + " (must be simulate or live)";
        die(msg.c_str());
    }

    if (!input_file) die("--input is required");

    bool live_mode = (std::strcmp(mode_str, "live") == 0);
#ifndef __linux__
    if (live_mode) {
        std::fprintf(stderr,
            "warning: --mode live requires Linux/WSL2; falling back to simulate\n");
        live_mode = false;
    }
#endif

    Algo algo = Algo::FCFS;
    if (!do_compare) {
        if (!algo_str) die("--algo is required");
        if (parse_algo_str(algo_str, algo) != 0) {
            std::string msg = "unknown algorithm: " + std::string(algo_str);
            die(msg.c_str());
        }
        if (algo == Algo::RR && quantum < 1)
            die(quantum == -1 ? "--quantum is required for rr" : "--quantum must be >= 1");
    }
    if (quantum != -1 && quantum < 1) die("--quantum must be >= 1");
    if (cs_cost < 0 || cs_cost > MAX_CS_COST) die("--context-switch must be 0..100");

    std::vector<ProcessInput> procs;
    try { procs = parse_input(input_file); }
    catch (const std::exception& e) { die(e.what()); }

    // Live mode limit: total burst ticks <= 5000
    if (live_mode) {
        int total_burst = 0;
        for (const auto& p : procs) total_burst += p.burst;
        if (total_burst > 5000) {
            std::string msg = "live mode supports at most 5000 total burst ticks, got "
                + std::to_string(total_burst) + "; use --mode simulate";
            die(msg.c_str());
        }
    }

    if (do_compare) {
        int q = (quantum >= 1) ? quantum : 4;
        const Algo algos[] = {
            Algo::FCFS, Algo::SJF, Algo::SRTF,
            Algo::PRIORITY, Algo::PRIORITY_P, Algo::RR
        };
        std::vector<SimResult> results;
        std::vector<Metrics>   mets;
        for (int i = 0; i < 6; ++i) {
            SimConfig cfg; cfg.algo = algos[i];
            cfg.quantum = (algos[i] == Algo::RR) ? q : 0;
            cfg.cs_cost = cs_cost;
            try {
                results.push_back(simulate(cfg, procs));
                mets.push_back(compute_metrics(results.back()));
            } catch (const std::exception& e) { die(e.what()); }
        }
        write_compare_json(stdout, results, mets);
        std::printf("\n");

    } else {
        SimConfig cfg; cfg.algo = algo;
        cfg.quantum = (algo == Algo::RR) ? quantum : 0;
        cfg.cs_cost = cs_cost;

        SimResult result;
        try {
            if (live_mode) {
#ifdef __linux__
                LiveParams live;
                live.ipc     = (std::strcmp(ipc_str, "pipe") == 0) ? Ipc::Pipe : Ipc::Signal;
                live.work_us = work_us;
                live.tick_ms = tick_ms;
                live.log_mode = log_mode;
                result = simulate_with_workers(cfg, procs, live);
#else
                result = simulate(cfg, procs);
#endif
            } else {
                result = simulate(cfg, procs);
            }
        } catch (const std::exception& e) {
            std::fprintf(stderr, "error: %s\n", e.what());
            // Check if this was a signal-induced interruption
            if (g_stop_flag) {
                std::exit(130);  // SIGINT
            }
            std::exit(1);
        }

        Metrics met = compute_metrics(result);

        if (out_file) {
            std::FILE* f = std::fopen(out_file, "w");
            if (!f) { std::string msg = "cannot open output file: " + std::string(out_file); die(msg.c_str()); }
            write_trace_json(f, result, met);
            std::fprintf(f, "\n");
            std::fclose(f);
            if (live_mode && log_mode) {
                // Full WSL report on stderr; JSON was saved to file
                write_live_report(stderr, result, met);
            } else {
                write_table(stdout, result, met);
            }
        } else {
            if (live_mode && log_mode) {
                // Full WSL report on stderr; JSON on stdout
                write_live_report(stderr, result, met);
                write_trace_json(stdout, result, met);
                std::printf("\n");
            } else {
                write_trace_json(stdout, result, met);
                std::printf("\n");
            }
        }
    }
    return 0;
}
