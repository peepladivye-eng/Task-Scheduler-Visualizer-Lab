#pragma once
// ExecutionController ties the tick-based scheduler to real Linux child workers.
// On non-Linux it falls back to the pure simulation path (Phase 1 behaviour).
#include "../common/types.hpp"
#include <vector>
#include <string>

#ifdef __linux__
#include "../process/process_manager.hpp"
#endif

namespace sched {

// Result of a fully integrated simulation:
// same SimResult as before but os_pid fields are populated from fork().
SimResult simulate_with_workers(const SimConfig& cfg,
                                const std::vector<ProcessInput>& inputs);

} // namespace sched
