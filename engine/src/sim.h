#ifndef SIM_H
#define SIM_H
#include <stddef.h>
#include "process.h"

typedef enum { ALGO_FCFS, ALGO_SJF, ALGO_SRTF, ALGO_PRIORITY, ALGO_PRIORITY_P, ALGO_RR } Algo;
typedef enum { SEG_RUN, SEG_IDLE, SEG_CS } SegType;
typedef enum { EV_ARRIVE, EV_DISPATCH, EV_PREEMPT, EV_COMPLETE } EvType;
typedef struct { int t_start, t_end, pid; SegType type; } Segment;   /* pid = -1 for idle */
typedef struct { int t; EvType type; int pid; int queue[MAX_PROCS]; int qlen; } Event;
typedef struct { Algo algo; int quantum; int cs_cost; } SimConfig;     /* quantum 0 when unused */
typedef struct {
    SimConfig cfg;
    Process procs[MAX_PROCS]; int nprocs;
    Segment *segments; int nsegments;     /* malloc'd, grown with realloc */
    Event *events; int nevents;           /* malloc'd, grown with realloc */
    int context_switches;
    int total_time;                       /* largest completion */
} SimResult;
/* Returns 0 on success, 1 on failure with message in err. Copies procs in; caller frees with sim_free. */
int simulate(const SimConfig *cfg, const Process *procs, int n, SimResult *out, char *err, size_t errlen);
void sim_free(SimResult *r);
#endif
