/*
 * main.c – CLI entry point for the CPU scheduler engine.
 *
 * Parses flags, runs simulation(s), and outputs JSON or a human table.
 * Contract section "CLI" specifies all behaviour.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "parser.h"
#include "sim.h"
#include "metrics.h"
#include "trace.h"

/* ── algo name helpers ──────────────────────────────────────────────────── */

/* Map an algorithm name string to the Algo enum.
   Returns -1 if the name is not recognized. */
static int parse_algo(const char *name, Algo *out)
{
    if (strcmp(name, "fcfs")       == 0) { *out = ALGO_FCFS;       return 0; }
    if (strcmp(name, "sjf")        == 0) { *out = ALGO_SJF;        return 0; }
    if (strcmp(name, "srtf")       == 0) { *out = ALGO_SRTF;       return 0; }
    if (strcmp(name, "priority")   == 0) { *out = ALGO_PRIORITY;   return 0; }
    if (strcmp(name, "priority-p") == 0) { *out = ALGO_PRIORITY_P; return 0; }
    if (strcmp(name, "rr")         == 0) { *out = ALGO_RR;         return 0; }
    return -1;
}

/* Map Algo enum back to its canonical name string (for error messages). */
static const char *algo_name(Algo a)
{
    switch (a) {
    case ALGO_FCFS:       return "fcfs";
    case ALGO_SJF:        return "sjf";
    case ALGO_SRTF:       return "srtf";
    case ALGO_PRIORITY:   return "priority";
    case ALGO_PRIORITY_P: return "priority-p";
    case ALGO_RR:         return "rr";
    default:              return "unknown";
    }
}

/* ── main ───────────────────────────────────────────────────────────────── */

int main(int argc, char *argv[])
{
    /* ── parse flags ── */
    const char *algo_str    = NULL;  /* --algo value */
    const char *input_file  = NULL;  /* --input value */
    const char *out_file    = NULL;  /* --out value (optional) */
    int         quantum     = -1;    /* --quantum value, -1 = not set */
    int         cs_cost     = 0;     /* --context-switch, default 0 */
    int         do_compare  = 0;     /* --compare flag */

    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--algo") == 0) {
            if (i + 1 >= argc) {
                fprintf(stderr, "error: --algo requires a value\n");
                return 1;
            }
            algo_str = argv[++i];

        } else if (strcmp(argv[i], "--input") == 0) {
            if (i + 1 >= argc) {
                fprintf(stderr, "error: --input requires a value\n");
                return 1;
            }
            input_file = argv[++i];

        } else if (strcmp(argv[i], "--quantum") == 0) {
            if (i + 1 >= argc) {
                fprintf(stderr, "error: --quantum requires a value\n");
                return 1;
            }
            quantum = atoi(argv[++i]);

        } else if (strcmp(argv[i], "--context-switch") == 0) {
            if (i + 1 >= argc) {
                fprintf(stderr, "error: --context-switch requires a value\n");
                return 1;
            }
            cs_cost = atoi(argv[++i]);

        } else if (strcmp(argv[i], "--out") == 0) {
            if (i + 1 >= argc) {
                fprintf(stderr, "error: --out requires a value\n");
                return 1;
            }
            out_file = argv[++i];

        } else if (strcmp(argv[i], "--compare") == 0) {
            do_compare = 1;

        } else {
            fprintf(stderr, "error: unknown flag: %s\n", argv[i]);
            return 1;
        }
    }

    /* ── validate flags ── */

    /* --input is always required */
    if (!input_file) {
        fprintf(stderr, "error: --input is required\n");
        return 1;
    }

    /* --algo is required unless --compare is set */
    Algo algo = ALGO_FCFS; /* default; overwritten below */
    if (!do_compare) {
        if (!algo_str) {
            fprintf(stderr, "error: --algo is required\n");
            return 1;
        }
        if (parse_algo(algo_str, &algo) != 0) {
            fprintf(stderr, "error: unknown algorithm: %s\n", algo_str);
            return 1;
        }
        /* rr requires --quantum */
        if (algo == ALGO_RR && quantum < 1) {
            if (quantum == -1) {
                fprintf(stderr, "error: --quantum is required for rr\n");
            } else {
                fprintf(stderr, "error: --quantum must be >= 1\n");
            }
            return 1;
        }
    }

    /* quantum range check (if explicitly given) */
    if (quantum != -1 && quantum < 1) {
        fprintf(stderr, "error: --quantum must be >= 1\n");
        return 1;
    }

    /* context-switch range check */
    if (cs_cost < 0 || cs_cost > 100) {
        fprintf(stderr, "error: --context-switch must be 0..100\n");
        return 1;
    }

    /* ── parse input file ── */
    Process procs[MAX_PROCS];
    int nprocs = 0;
    char errbuf[256];

    if (parse_input(input_file, procs, &nprocs, errbuf, sizeof(errbuf)) != 0) {
        fprintf(stderr, "error: %s\n", errbuf);
        return 1;
    }

    /* ── run simulation(s) ── */

    if (do_compare) {
        /*
         * Compare mode: run all six algorithms in fixed order.
         * quantum defaults to 4 when not supplied.
         */
        int q = (quantum >= 1) ? quantum : 4;

        /* The six algorithms in contract order */
        static const Algo compare_algos[] = {
            ALGO_FCFS, ALGO_SJF, ALGO_SRTF,
            ALGO_PRIORITY, ALGO_PRIORITY_P, ALGO_RR
        };
        const int nalgo = 6;

        SimResult results[6];
        Metrics   metrics[6];
        int ok = 1; /* stays 1 if all succeed */

        for (int i = 0; i < nalgo; i++) {
            SimConfig cfg;
            cfg.algo    = compare_algos[i];
            cfg.quantum = (compare_algos[i] == ALGO_RR) ? q : 0;
            cfg.cs_cost = cs_cost;

            if (simulate(&cfg, procs, nprocs, &results[i], errbuf, sizeof(errbuf)) != 0) {
                fprintf(stderr, "error: %s (%s)\n", errbuf, algo_name(compare_algos[i]));
                /* free any already-allocated results */
                for (int j = 0; j < i; j++) sim_free(&results[j]);
                return 1;
            }
            compute_metrics(&results[i], &metrics[i]);
        }

        /* Write compare JSON to stdout */
        write_compare_json(stdout, results, metrics, nalgo);

        /* Free all results */
        for (int i = 0; i < nalgo; i++) sim_free(&results[i]);

        if (!ok) return 1; /* unreachable but keeps the compiler happy */

    } else {
        /*
         * Single-algorithm mode.
         */
        SimConfig cfg;
        cfg.algo    = algo;
        cfg.quantum = (algo == ALGO_RR) ? quantum : 0;
        cfg.cs_cost = cs_cost;

        SimResult result;
        Metrics   met;

        if (simulate(&cfg, procs, nprocs, &result, errbuf, sizeof(errbuf)) != 0) {
            fprintf(stderr, "error: %s\n", errbuf);
            return 1;
        }
        compute_metrics(&result, &met);

        if (out_file) {
            /* Write JSON to the specified file */
            FILE *f = fopen(out_file, "w");
            if (!f) {
                fprintf(stderr, "error: cannot open output file: %s\n", out_file);
                sim_free(&result);
                return 1;
            }
            write_trace_json(f, &result, &met);
            fclose(f);

            /* Write human-readable table to stdout */
            write_table(stdout, &result, &met);

        } else {
            /* Write JSON to stdout, then a trailing newline */
            write_trace_json(stdout, &result, &met);
            printf("\n");
        }

        sim_free(&result);
    }

    return 0;
}
