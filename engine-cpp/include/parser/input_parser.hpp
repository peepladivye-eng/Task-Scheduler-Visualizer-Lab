#pragma once
#include "../common/types.hpp"
#include <string>
#include <vector>

namespace sched {

/**
 * Parse a process-list text file into a vector of ProcessInput.
 *
 * File format: one process per non-blank, non-comment line.
 *   pid  arrival  burst  priority
 * Fields are space/tab separated integers.
 * Lines starting with '#' (after optional whitespace) are ignored.
 *
 * Returns the processes sorted ascending by pid.
 * Throws std::runtime_error on any validation failure.
 */
std::vector<ProcessInput> parse_input(const std::string& path);

} // namespace sched
