#pragma once
#include "../common/types.hpp"

namespace sched {
/**
 * Compute aggregate metrics from a completed SimResult.
 * The per-process waiting/turnaround/response fields in r must already
 * be populated by the simulation loop (or this function fills them).
 */
Metrics compute_metrics(const SimResult& r);
} // namespace sched
