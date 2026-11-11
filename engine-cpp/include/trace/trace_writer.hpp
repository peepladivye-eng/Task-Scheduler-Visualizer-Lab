#pragma once
#include "../common/types.hpp"
#include <cstdio>

namespace sched {

/**
 * Write a single trace JSON object to f (no trailing newline).
 * Key order exactly matches the v1.0 contract.
 */
void write_trace_json(std::FILE* f, const SimResult& r, const Metrics& m);

/**
 * Write the compare JSON wrapper:
 *   {"version":"1.0","compare":true,"runs":[...]}
 */
void write_compare_json(std::FILE* f,
                        const std::vector<SimResult>& runs,
                        const std::vector<Metrics>& metrics);

/**
 * Write a human-readable table to f.
 */
void write_table(std::FILE* f, const SimResult& r, const Metrics& m);

/**
 * Write the full live execution report to stderr:
 * ASCII Gantt chart with real OS PIDs, process table, summary metrics.
 * Called at the end of a live mode run (--mode live).
 */
void write_live_report(std::FILE* f, const SimResult& r, const Metrics& m);

} // namespace sched
