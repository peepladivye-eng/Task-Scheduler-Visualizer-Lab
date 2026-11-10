#include "../../include/parser/input_parser.hpp"
#include <fstream>
#include <sstream>
#include <stdexcept>
#include <algorithm>
#include <cctype>
#include <unordered_set>

namespace sched {

std::vector<ProcessInput> parse_input(const std::string& path) {
    std::ifstream f(path);
    if (!f.is_open()) {
        throw std::runtime_error("cannot open file " + path);
    }

    std::vector<ProcessInput> result;
    std::unordered_set<int> seen_pids;
    int line_num = 0;
    std::string line;

    while (std::getline(f, line)) {
        ++line_num;

        // Find first non-whitespace character
        const auto first = std::find_if(line.begin(), line.end(),
            [](unsigned char c){ return !std::isspace(c); });

        // Skip blank lines and comment lines
        if (first == line.end()) continue;
        if (*first == '#') continue;

        // Parse exactly 4 integers
        std::istringstream iss(line);
        long pid_l, arrival_l, burst_l, priority_l;
        std::string extra;

        if (!(iss >> pid_l >> arrival_l >> burst_l >> priority_l)) {
            throw std::runtime_error(
                "line " + std::to_string(line_num) + ": expected 4 integers");
        }
        // Extra tokens on the line?
        if (iss >> extra) {
            throw std::runtime_error(
                "line " + std::to_string(line_num) + ": expected 4 integers");
        }

        // Range checks (matching C engine contract)
        if (pid_l < 1) {
            throw std::runtime_error(
                "line " + std::to_string(line_num) + ": pid must be >= 1");
        }
        if (arrival_l < 0 || arrival_l > MAX_ARRIVAL) {
            throw std::runtime_error(
                "line " + std::to_string(line_num) +
                ": arrival must be between 0 and " + std::to_string(MAX_ARRIVAL));
        }
        if (burst_l < 1 || burst_l > MAX_BURST) {
            throw std::runtime_error(
                "line " + std::to_string(line_num) +
                ": burst must be between 1 and " + std::to_string(MAX_BURST));
        }
        if (priority_l < 0 || priority_l > MAX_PRIORITY) {
            throw std::runtime_error(
                "line " + std::to_string(line_num) +
                ": priority must be between 0 and " + std::to_string(MAX_PRIORITY));
        }
        if (result.size() >= static_cast<size_t>(MAX_PROCS)) {
            throw std::runtime_error("too many processes (max 64)");
        }

        int pid = static_cast<int>(pid_l);
        if (seen_pids.count(pid)) {
            throw std::runtime_error(
                "line " + std::to_string(line_num) +
                ": duplicate pid " + std::to_string(pid));
        }
        seen_pids.insert(pid);

        result.push_back({
            pid,
            static_cast<int>(arrival_l),
            static_cast<int>(burst_l),
            static_cast<int>(priority_l),
        });
    }

    if (result.empty()) {
        throw std::runtime_error("input file has no processes");
    }

    // Sort ascending by pid (matches C engine behaviour)
    std::sort(result.begin(), result.end(),
        [](const ProcessInput& a, const ProcessInput& b){ return a.pid < b.pid; });

    return result;
}

} // namespace sched
