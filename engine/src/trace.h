#ifndef TRACE_H
#define TRACE_H
#include <stdio.h>
#include "sim.h"
#include "metrics.h"
/* Writes one trace object (no trailing newline) in exactly the contract format. */
void write_trace_json(FILE *f, const SimResult *r, const Metrics *m);
/* Writes a human-readable table to f. */
void write_table(FILE *f, const SimResult *r, const Metrics *m);
/* Writes {"version":"1.0","compare":true,"runs":[ ... ]} given arrays of results/metrics. */
void write_compare_json(FILE *f, const SimResult *rs, const Metrics *ms, int count);
#endif
