/**
 * main.cpp — CLI entry point for the C++17 scheduler engine.
 * Compatible with GCC 6+ (no <optional>, no inline constexpr, no digit separators).
 */
#include "../include/parser/input_parser.hpp"
#include "../include/scheduler/simulation.hpp"
#include "../include/metrics/metrics.hpp"
#include "../include/trace/trace_writer.hpp"

#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#include <vector>
#include <stdexcept>

using namespace sched;

static void die(const char* msg) {
    std::fprintf(stderr, "error: %s\n", msg);
    std::exit(1);
}

// Returns ALGO_UNKNOWN (-1) if not recognized
static int parse_algo_str(const char* s, Algo& out) {
    if (std::strcmp(s, "fcfs")       == 0) { out = Algo::FCFS;       return 0; }
    if (std::strcmp(s, "sjf")        == 0) { out = Algo::SJF;        return 0; }
    if (std::strcmp(s, "srtf")       == 0) { out = Algo::SRTF;       return 0; }
    if (std::strcmp(s, "priority")   == 0) { out = Algo::PRIORITY;   return 0; }
    if (std::strcmp(s, "priority-p") == 0) { out = Algo::PRIORITY_P; return 0; }
    if (std::strcmp(s, "rr")         == 0) { out = Algo::RR;         return 0; }
    return -1;
}

int main(int argc, char* argv[]) {
    const char* algo_str   = nullptr;
    const char* input_file = nullptr;
    const char* out_file   = nullptr;
    int         quantum    = -1;
    int         cs_cost    = 0;
    bool        do_compare = false;

    for (int i = 1; i < argc; ++i) {
        const char* arg = argv[i];

        if (std::strcmp(arg, "--algo") == 0) {
            if (++i >= argc) die("--algo requires a value");
            algo_str = argv[i];
        } else if (std::strcmp(arg, "--input") == 0) {
            if (++i >= argc) die("--input requires a value");
            input_file = argv[i];
        } else if (std::strcmp(arg, "--quantum") == 0) {
            if (++i >= argc) die("--quantum requires a value");
            quantum = std::atoi(argv[i]);
        } else if (std::strcmp(arg, "--context-switch") == 0) {
            if (++i >= argc) die("--context-switch requires a value");
            cs_cost = std::atoi(argv[i]);
        } else if (std::strcmp(arg, "--out") == 0) {
            if (++i >= argc) die("--out requires a value");
            out_file = argv[i];
        } else if (std::strcmp(arg, "--compare") == 0) {
            do_compare = true;
        } else {
            std::string msg = "unknown flag: " + std::string(arg);
            die(msg.c_str());
        }
    }

    if (!input_file) die("--input is required");

    Algo algo = Algo::FCFS;
    if (!do_compare) {
        if (!algo_str) die("--algo is required");
        if (parse_algo_str(algo_str, algo) != 0) {
            std::string msg = "unknown algorithm: " + std::string(algo_str);
            die(msg.c_str());
        }
        if (algo == Algo::RR && quantum < 1) {
            die(quantum == -1 ? "--quantum is required for rr"
                              : "--quantum must be >= 1");
        }
    }

    if (quantum != -1 && quantum < 1) die("--quantum must be >= 1");
    if (cs_cost < 0 || cs_cost > MAX_CS_COST) die("--context-switch must be 0..100");

    std::vector<ProcessInput> procs;
    try {
        procs = parse_input(input_file);
    } catch (const std::exception& e) {
        die(e.what());
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
            SimConfig cfg;
            cfg.algo    = algos[i];
            cfg.quantum = (algos[i] == Algo::RR) ? q : 0;
            cfg.cs_cost = cs_cost;
            try {
                results.push_back(simulate(cfg, procs));
                mets.push_back(compute_metrics(results.back()));
            } catch (const std::exception& e) {
                die(e.what());
            }
        }

        write_compare_json(stdout, results, mets);
        std::printf("\n");

    } else {
        SimConfig cfg;
        cfg.algo    = algo;
        cfg.quantum = (algo == Algo::RR) ? quantum : 0;
        cfg.cs_cost = cs_cost;

        SimResult result;
        try {
            result = simulate(cfg, procs);
        } catch (const std::exception& e) {
            die(e.what());
        }
        Metrics met = compute_metrics(result);

        if (out_file) {
            std::FILE* f = std::fopen(out_file, "w");
            if (!f) {
                std::string msg = "cannot open output file: " + std::string(out_file);
                die(msg.c_str());
            }
            write_trace_json(f, result, met);
            std::fprintf(f, "\n");
            std::fclose(f);
            write_table(stdout, result, met);
        } else {
            write_trace_json(stdout, result, met);
            std::printf("\n");
        }
    }

    return 0;
}
