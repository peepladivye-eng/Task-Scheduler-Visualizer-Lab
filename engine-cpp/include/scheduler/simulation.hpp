#pragma once
#include "../common/types.hpp"
#include <vector>
#include <string>

namespace sched {

/**
 * Run a complete tick-based simulation.
 *
 * Implements the contract simulation loop exactly as specified:
 *   1. ARRIVALS
 *   2a. PREEMPT HOOK (srtf, priority-p)
 *   2b. RR EXPIRY
 *   2c. DISPATCH (with cs_cost handling)
 *   3. CS tick drain
 *   4. IDLE tick
 *   5. RUN TICK
 *
 * Throws std::runtime_error on simulation overflow (> MAX_SIM_TICKS).
 */
SimResult simulate(const SimConfig& cfg,
                   const std::vector<ProcessInput>& inputs);

} // namespace sched
