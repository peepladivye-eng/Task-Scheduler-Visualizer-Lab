#include "../../include/metrics/metrics.hpp"

namespace sched {

Metrics compute_metrics(const SimResult& r) {
    Metrics m{};
    int n = static_cast<int>(r.processes.size());
    if (n == 0) return m;

    int    total_time = 0;
    int    run_ticks  = 0;
    double sum_wait   = 0.0;
    double sum_tat    = 0.0;
    double sum_resp   = 0.0;

    for (const auto& p : r.processes) {
        sum_wait += p.waiting;
        sum_tat  += p.turnaround;
        sum_resp += p.response;
        run_ticks += p.burst;
        if (p.completion > total_time) total_time = p.completion;
    }

    m.avg_waiting    = sum_wait / n;
    m.avg_turnaround = sum_tat  / n;
    m.avg_response   = sum_resp / n;
    m.cpu_utilization = (total_time > 0)
        ? static_cast<double>(run_ticks) * 100.0 / static_cast<double>(total_time)
        : 0.0;
    m.throughput = (total_time > 0)
        ? static_cast<double>(n) / static_cast<double>(total_time)
        : 0.0;
    m.context_switches = r.context_switches;

    return m;
}

} // namespace sched
