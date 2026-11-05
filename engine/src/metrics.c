#include "metrics.h"
#include <string.h>

/*
 * compute_metrics
 *
 * Recomputes per-process stats from first principles, then derives
 * the aggregate metrics required by the contract.
 */
void compute_metrics(SimResult *r, Metrics *m)
{
    int n = r->nprocs;

    /* ── per-process fields ── */
    int total_time  = 0;   /* largest completion */
    int run_ticks   = 0;   /* sum of burst values (total CPU work done) */

    double sum_waiting    = 0.0;
    double sum_turnaround = 0.0;
    double sum_response   = 0.0;

    for (int i = 0; i < n; i++) {
        Process *p = &r->procs[i];

        p->turnaround = p->completion - p->arrival;
        p->waiting    = p->turnaround - p->burst;
        p->response   = p->start - p->arrival;

        if (p->completion > total_time)
            total_time = p->completion;

        run_ticks += p->burst;

        sum_waiting    += p->waiting;
        sum_turnaround += p->turnaround;
        sum_response   += p->response;
    }

    r->total_time = total_time;

    /* ── aggregate metrics ── */
    m->avg_waiting    = (n > 0) ? sum_waiting    / n : 0.0;
    m->avg_turnaround = (n > 0) ? sum_turnaround / n : 0.0;
    m->avg_response   = (n > 0) ? sum_response   / n : 0.0;

    /* cpu_utilization = run_ticks * 100 / total_time  (integer arithmetic then cast) */
    m->cpu_utilization = (total_time > 0)
                         ? (double)run_ticks * 100.0 / (double)total_time
                         : 0.0;

    m->throughput = (total_time > 0)
                    ? (double)n / (double)total_time
                    : 0.0;

    m->context_switches = r->context_switches;
}
