#include "trace.h"
#include <stdio.h>

/* ── helpers ─────────────────────────────────────────────────────────────── */

/* Return the algo string exactly as the contract specifies. */
static const char *algo_name(Algo a)
{
    switch (a) {
    case ALGO_FCFS:       return "fcfs";
    case ALGO_SJF:        return "sjf";
    case ALGO_SRTF:       return "srtf";
    case ALGO_PRIORITY:   return "priority";
    case ALGO_PRIORITY_P: return "priority-p";
    case ALGO_RR:         return "rr";
    default:              return "unknown";
    }
}

/* Return the segment type string. */
static const char *seg_type_name(SegType t)
{
    switch (t) {
    case SEG_RUN:  return "run";
    case SEG_IDLE: return "idle";
    case SEG_CS:   return "context_switch";
    default:       return "unknown";
    }
}

/* Return the event type string. */
static const char *ev_type_name(EvType t)
{
    switch (t) {
    case EV_ARRIVE:   return "arrive";
    case EV_DISPATCH: return "dispatch";
    case EV_PREEMPT:  return "preempt";
    case EV_COMPLETE: return "complete";
    default:          return "unknown";
    }
}

/* ── write_trace_json ─────────────────────────────────────────────────────
 *
 * Produces exactly:
 * {
 *   "version":"1.0",
 *   "algo":"...",
 *   "quantum": <null|int>,
 *   "context_switch_cost": <int>,
 *   "processes": [...],
 *   "timeline": [...],
 *   "events": [...],
 *   "metrics": {...}
 * }
 *
 * Key order matches the contract verbatim.
 * ─────────────────────────────────────────────────────────────────────────*/
void write_trace_json(FILE *f, const SimResult *r, const Metrics *m)
{
    const SimConfig *cfg = &r->cfg;

    fprintf(f, "{\n");

    /* version */
    fprintf(f, "  \"version\": \"1.0\",\n");

    /* algo */
    fprintf(f, "  \"algo\": \"%s\",\n", algo_name(cfg->algo));

    /* quantum: integer for rr, null otherwise */
    if (cfg->algo == ALGO_RR)
        fprintf(f, "  \"quantum\": %d,\n", cfg->quantum);
    else
        fprintf(f, "  \"quantum\": null,\n");

    /* context_switch_cost */
    fprintf(f, "  \"context_switch_cost\": %d,\n", cfg->cs_cost);

    /* ── processes ── */
    fprintf(f, "  \"processes\": [");
    for (int i = 0; i < r->nprocs; i++) {
        const Process *p = &r->procs[i];
        if (i > 0) fprintf(f, ",");
        fprintf(f, "\n    {\"pid\":%d,\"arrival\":%d,\"burst\":%d,"
                   "\"priority\":%d,\"start\":%d,\"completion\":%d,"
                   "\"waiting\":%d,\"turnaround\":%d,\"response\":%d}",
                p->pid, p->arrival, p->burst, p->priority,
                p->start, p->completion,
                p->waiting, p->turnaround, p->response);
    }
    fprintf(f, "\n  ],\n");

    /* ── timeline ── */
    fprintf(f, "  \"timeline\": [");
    for (int i = 0; i < r->nsegments; i++) {
        const Segment *s = &r->segments[i];
        if (i > 0) fprintf(f, ",");
        if (s->pid == -1) {
            /* idle: pid is null */
            fprintf(f, "\n    {\"t_start\":%d,\"t_end\":%d,\"pid\":null,\"type\":\"%s\"}",
                    s->t_start, s->t_end, seg_type_name(s->type));
        } else {
            fprintf(f, "\n    {\"t_start\":%d,\"t_end\":%d,\"pid\":%d,\"type\":\"%s\"}",
                    s->t_start, s->t_end, s->pid, seg_type_name(s->type));
        }
    }
    fprintf(f, "\n  ],\n");

    /* ── events ── */
    fprintf(f, "  \"events\": [");
    for (int i = 0; i < r->nevents; i++) {
        const Event *ev = &r->events[i];
        if (i > 0) fprintf(f, ",");
        fprintf(f, "\n    {\"t\":%d,\"type\":\"%s\",\"pid\":%d,\"ready_queue\":[",
                ev->t, ev_type_name(ev->type), ev->pid);
        for (int j = 0; j < ev->qlen; j++) {
            if (j > 0) fprintf(f, ",");
            fprintf(f, "%d", ev->queue[j]);
        }
        fprintf(f, "]}");
    }
    fprintf(f, "\n  ],\n");

    /* ── metrics ── */
    fprintf(f, "  \"metrics\": {"
               "\"avg_waiting\":%.2f,"
               "\"avg_turnaround\":%.2f,"
               "\"avg_response\":%.2f,"
               "\"cpu_utilization\":%.2f,"
               "\"throughput\":%.2f,"
               "\"context_switches\":%d"
               "}\n",
            m->avg_waiting,
            m->avg_turnaround,
            m->avg_response,
            m->cpu_utilization,
            m->throughput,
            m->context_switches);

    fprintf(f, "}");
}

/* ── write_table ─────────────────────────────────────────────────────────
 *
 * Human-readable table with columns:
 *   pid  arrival  burst  priority  start  completion  waiting  turnaround  response
 * followed by averages and summary stats.
 * ─────────────────────────────────────────────────────────────────────────*/
void write_table(FILE *f, const SimResult *r, const Metrics *m)
{
    /* Header */
    fprintf(f, "%-6s %-8s %-6s %-9s %-6s %-11s %-8s %-11s %-9s\n",
            "pid", "arrival", "burst", "priority",
            "start", "completion", "waiting", "turnaround", "response");

    fprintf(f, "%-6s %-8s %-6s %-9s %-6s %-11s %-8s %-11s %-9s\n",
            "---", "-------", "-----", "--------",
            "-----", "----------", "-------", "----------", "--------");

    /* One row per process (already sorted by pid in r->procs) */
    for (int i = 0; i < r->nprocs; i++) {
        const Process *p = &r->procs[i];
        fprintf(f, "%-6d %-8d %-6d %-9d %-6d %-11d %-8d %-11d %-9d\n",
                p->pid, p->arrival, p->burst, p->priority,
                p->start, p->completion,
                p->waiting, p->turnaround, p->response);
    }

    /* Averages */
    fprintf(f, "\navg_waiting: %.2f  avg_turnaround: %.2f  avg_response: %.2f\n",
            m->avg_waiting, m->avg_turnaround, m->avg_response);

    /* Summary stats */
    fprintf(f, "cpu_utilization: %.2f%%  throughput: %.2f  context_switches: %d\n",
            m->cpu_utilization, m->throughput, m->context_switches);
}

/* ── write_compare_json ───────────────────────────────────────────────────
 *
 * {"version":"1.0","compare":true,"runs":[ <6 full traces> ]}
 * ─────────────────────────────────────────────────────────────────────────*/
void write_compare_json(FILE *f, const SimResult *rs, const Metrics *ms, int count)
{
    fprintf(f, "{\"version\":\"1.0\",\"compare\":true,\"runs\":[\n");
    for (int i = 0; i < count; i++) {
        if (i > 0) fprintf(f, ",\n");
        write_trace_json(f, &rs[i], &ms[i]);
    }
    fprintf(f, "\n]}");
}
