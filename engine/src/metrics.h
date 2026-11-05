#ifndef METRICS_H
#define METRICS_H
#include "sim.h"
typedef struct {
    double avg_waiting, avg_turnaround, avg_response;
    double cpu_utilization, throughput;
    int context_switches;
} Metrics;
/* Fills waiting/turnaround/response inside r->procs (using start/completion/arrival/burst),
   sets r->total_time, and computes m. */
void compute_metrics(SimResult *r, Metrics *m);
#endif
