#include "sim.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

/* ── ready-queue helpers ─────────────────────────────────────────────────── */

/* Dynamic int array used as the ready queue. */
typedef struct {
    int *arr;
    int  len;
    int  cap;
} Queue;

/* Append pid to queue; grow with realloc if needed. Returns 0 on success. */
static int queue_push(Queue *q, int pid)
{
    if (q->len == q->cap) {
        int newcap = q->cap ? q->cap * 2 : 8;
        int *tmp = realloc(q->arr, (size_t)newcap * sizeof(int));
        if (!tmp) return 1;
        q->arr = tmp;
        q->cap = newcap;
    }
    q->arr[q->len++] = pid;
    return 0;
}

/* Remove element at index i, shift remainder left. */
static void queue_remove_at(Queue *q, int i)
{
    for (int j = i; j < q->len - 1; j++)
        q->arr[j] = q->arr[j + 1];
    q->len--;
}

/* ── segment helpers ─────────────────────────────────────────────────────── */

/* Extend the last segment if it matches (type, pid) and is contiguous,
   otherwise append a new segment. Returns 0 on success. */
static int add_tick(SimResult *r, int *seg_cap, SegType type, int pid, int t)
{
    /* Try to extend the last segment */
    if (r->nsegments > 0) {
        Segment *last = &r->segments[r->nsegments - 1];
        if (last->type == type && last->pid == pid && last->t_end == t) {
            last->t_end = t + 1;
            return 0;
        }
    }
    /* Need a new segment */
    if (r->nsegments == *seg_cap) {
        int newcap = *seg_cap * 2;
        Segment *tmp = realloc(r->segments, (size_t)newcap * sizeof(Segment));
        if (!tmp) return 1;
        r->segments = tmp;
        *seg_cap = newcap;
    }
    r->segments[r->nsegments++] = (Segment){ t, t + 1, pid, type };
    return 0;
}

/* ── event helpers ───────────────────────────────────────────────────────── */

/* Append an event. ready[] and rlen give the current ready-queue snapshot.
   Returns 0 on success. */
static int push_event(SimResult *r, int *ev_cap,
                      int t, EvType type, int pid,
                      const Queue *q)
{
    if (r->nevents == *ev_cap) {
        int newcap = *ev_cap * 2;
        Event *tmp = realloc(r->events, (size_t)newcap * sizeof(Event));
        if (!tmp) return 1;
        r->events = tmp;
        *ev_cap = newcap;
    }
    Event *ev = &r->events[r->nevents++];
    ev->t    = t;
    ev->type = type;
    ev->pid  = pid;
    ev->qlen = q->len;
    for (int i = 0; i < q->len; i++)
        ev->queue[i] = q->arr[i];
    return 0;
}

/* ── selection ───────────────────────────────────────────────────────────── */

/* Return the INDEX into q->arr of the best process to run.
   Returns -1 if the queue is empty, -2 for unimplemented algorithm. */
static int pick_best(const SimConfig *cfg, const Process *procs,
                     const Queue *q)
{
    if (q->len == 0) return -1;

    switch (cfg->algo) {
    case ALGO_FCFS:
    case ALGO_RR:
        /* front of queue */
        return 0;

    case ALGO_SJF: {
        /* smallest burst; tie -> earlier arrival -> lower pid */
        int best = 0;
        for (int i = 1; i < q->len; i++) {
            const Process *b = &procs[q->arr[best]];
            const Process *c = &procs[q->arr[i]];
            if (c->burst < b->burst) { best = i; continue; }
            if (c->burst == b->burst && c->arrival < b->arrival) { best = i; continue; }
            if (c->burst == b->burst && c->arrival == b->arrival && c->pid < b->pid) { best = i; }
        }
        return best;
    }

    case ALGO_SRTF: {
        /* smallest remaining; tie -> earlier arrival -> lower pid */
        int best = 0;
        for (int i = 1; i < q->len; i++) {
            const Process *b = &procs[q->arr[best]];
            const Process *c = &procs[q->arr[i]];
            if (c->remaining < b->remaining) { best = i; continue; }
            if (c->remaining == b->remaining && c->arrival < b->arrival) { best = i; continue; }
            if (c->remaining == b->remaining && c->arrival == b->arrival && c->pid < b->pid) { best = i; }
        }
        return best;
    }

    case ALGO_PRIORITY:
    case ALGO_PRIORITY_P: {
        /* smallest priority number; tie -> earlier arrival -> lower pid */
        int best = 0;
        for (int i = 1; i < q->len; i++) {
            const Process *b = &procs[q->arr[best]];
            const Process *c = &procs[q->arr[i]];
            if (c->priority < b->priority) { best = i; continue; }
            if (c->priority == b->priority && c->arrival < b->arrival) { best = i; continue; }
            if (c->priority == b->priority && c->arrival == b->arrival && c->pid < b->pid) { best = i; }
        }
        return best;
    }

    default:
        return -2; /* unimplemented */
    }
}

/* ── main simulation ─────────────────────────────────────────────────────── */

int simulate(const SimConfig *cfg, const Process *procs, int n,
             SimResult *out, char *err, size_t errlen)
{
    /* ── initialise output struct ── */
    memset(out, 0, sizeof(*out));
    out->cfg    = *cfg;
    out->nprocs = n;

    /* Copy procs and reset per-run fields */
    for (int i = 0; i < n; i++) {
        out->procs[i]           = procs[i];
        out->procs[i].remaining = procs[i].burst;
        out->procs[i].start     = -1;
        out->procs[i].completion = -1;
        out->procs[i].waiting   = 0;
        out->procs[i].turnaround = 0;
        out->procs[i].response  = 0;
    }

    /* Allocate initial segment / event buffers */
    int seg_cap = 64;
    out->segments = malloc((size_t)seg_cap * sizeof(Segment));
    if (!out->segments) { snprintf(err, errlen, "out of memory"); return 1; }

    int ev_cap = 256;
    out->events = malloc((size_t)ev_cap * sizeof(Event));
    if (!out->events) { free(out->segments); snprintf(err, errlen, "out of memory"); return 1; }

    /* ── simulation state ── */
    Queue ready = { NULL, 0, 0 };

    int running  = -1;  /* index into out->procs, -1 = none */
    int last_run = -1;  /* pid of last-dispatched process, -1 = none */
    int quantum_left = 0;
    int cs_left   = 0;
    int cs_target = -1; /* index into out->procs */

    out->context_switches = 0;

    /* Count done processes to know when to stop */
    int done = 0;

    /* ── main loop ── */
    for (int t = 0; done < n; t++) {

        /* Safety valve */
        if (t > 1000000) {
            snprintf(err, errlen, "simulation exceeded 1000000 ticks");
            free(ready.arr);
            return 1;
        }

        /* ── STEP 1: ARRIVALS ──
           For each process with arrival == t, in ascending pid order,
           append to ready queue and emit EV_ARRIVE. */
        for (int i = 0; i < n; i++) {
            if (out->procs[i].arrival == t && out->procs[i].completion == -1) {
                if (queue_push(&ready, i) != 0) {
                    snprintf(err, errlen, "out of memory");
                    free(ready.arr);
                    return 1;
                }
                /* Emit arrive event; snapshot is current ready queue state */
                if (push_event(out, &ev_cap, t, EV_ARRIVE, out->procs[i].pid, &ready) != 0) {
                    snprintf(err, errlen, "out of memory");
                    free(ready.arr);
                    return 1;
                }
            }
        }
        /* NOTE: procs[] is already sorted by pid from the parser (ascending pid order
           is guaranteed by the input validation in task 4). If not, arrivals at the
           same tick need to be added in pid order — the loop above iterates i=0..n-1,
           so the caller must pass procs sorted by pid. */

        /* ── STEP 2: if cs_left == 0 ── */
        if (cs_left == 0) {

            /* ── 2a. PREEMPT HOOK (srtf and priority-p) ── */
            if (running != -1) {
                if (cfg->algo == ALGO_SRTF || cfg->algo == ALGO_PRIORITY_P) {
                    int best_idx = pick_best(cfg, out->procs, &ready);
                    if (best_idx >= 0) {
                        int cand = ready.arr[best_idx];
                        int should_preempt = 0;
                        if (cfg->algo == ALGO_SRTF) {
                            /* Preempt only if strictly smaller remaining */
                            should_preempt = (out->procs[cand].remaining < out->procs[running].remaining);
                        } else {
                            /* ALGO_PRIORITY_P: preempt only if strictly smaller priority number */
                            should_preempt = (out->procs[cand].priority < out->procs[running].priority);
                        }
                        if (should_preempt) {
                            if (queue_push(&ready, running) != 0) {
                                snprintf(err, errlen, "out of memory");
                                free(ready.arr);
                                return 1;
                            }
                            if (push_event(out, &ev_cap, t, EV_PREEMPT, out->procs[running].pid, &ready) != 0) {
                                snprintf(err, errlen, "out of memory");
                                free(ready.arr);
                                return 1;
                            }
                            running = -1;
                        }
                    }
                }
            }

            /* ── 2b. RR EXPIRY (rr only) ── */
            if (cfg->algo == ALGO_RR && running != -1 && quantum_left == 0) {
                if (ready.len == 0) {
                    /* No other ready processes: reset quantum and keep running */
                    quantum_left = cfg->quantum;
                } else {
                    /* Preempt: push running to END of queue, emit preempt event.
                       New arrivals (step 1) are already in the queue before us,
                       so this process lands after them — correct per contract. */
                    if (queue_push(&ready, running) != 0) {
                        snprintf(err, errlen, "out of memory");
                        free(ready.arr);
                        return 1;
                    }
                    if (push_event(out, &ev_cap, t, EV_PREEMPT, out->procs[running].pid, &ready) != 0) {
                        snprintf(err, errlen, "out of memory");
                        free(ready.arr);
                        return 1;
                    }
                    running = -1;
                }
            }

            /* ── 2c. DISPATCH ── */
            if (running == -1) {
                int best_idx = pick_best(cfg, out->procs, &ready);

                if (best_idx == -2) {
                    snprintf(err, errlen, "algorithm not implemented yet");
                    free(ready.arr);
                    return 1;
                }

                if (best_idx == -1) {
                    /* No ready process — fall through to step 4 (idle) */
                    goto step4;
                }

                /* X = index in out->procs of chosen process */
                int X = ready.arr[best_idx];
                queue_remove_at(&ready, best_idx);

                if (last_run != -1 && last_run != out->procs[X].pid) {
                    /* Context switch needed */
                    out->context_switches++;
                    if (cfg->cs_cost > 0) {
                        /* Pay the switch cost before running X.
                           Do NOT set running yet; fall through to step 3 which
                           records the first CS tick at this same tick t. */
                        cs_left   = cfg->cs_cost;
                        cs_target = X;
                        last_run  = out->procs[X].pid; /* update last_run now */
                        /* Fall through — step 3 below will handle this tick. */
                    }
                    /* cs_cost == 0: free switch, fall through to dispatch immediately */
                }

                /* No switch cost (or free switch) — dispatch now.
                   If cs_left > 0 we just initiated a context switch; step 3
                   will handle this tick, so skip the immediate dispatch. */
                if (cs_left == 0) {
                    running      = X;
                    last_run     = out->procs[X].pid;
                    quantum_left = (cfg->algo == ALGO_RR) ? cfg->quantum : (1 << 30);

                    if (push_event(out, &ev_cap, t, EV_DISPATCH, out->procs[X].pid, &ready) != 0) {
                        snprintf(err, errlen, "out of memory");
                        free(ready.arr);
                        return 1;
                    }
                }
            }
        }

        /* ── STEP 3: context-switch in progress ── */
        if (cs_left > 0) {
            if (add_tick(out, &seg_cap, SEG_CS, out->procs[cs_target].pid, t) != 0) {
                snprintf(err, errlen, "out of memory");
                free(ready.arr);
                return 1;
            }
            cs_left--;
            if (cs_left == 0) {
                /* Switch complete — start the new process next tick */
                running      = cs_target;
                quantum_left = (cfg->algo == ALGO_RR) ? cfg->quantum : (1 << 30);
                if (push_event(out, &ev_cap, t + 1, EV_DISPATCH,
                               out->procs[cs_target].pid, &ready) != 0) {
                    snprintf(err, errlen, "out of memory");
                    free(ready.arr);
                    return 1;
                }
            }
            goto next_t;
        }

        /* ── STEP 4: idle ── */
        step4:
        if (running == -1) {
            if (add_tick(out, &seg_cap, SEG_IDLE, -1, t) != 0) {
                snprintf(err, errlen, "out of memory");
                free(ready.arr);
                return 1;
            }
            goto next_t;
        }

        /* ── STEP 5: RUN TICK ── */
        {
            Process *p = &out->procs[running];
            if (p->start == -1) p->start = t;  /* record first run tick */
            p->remaining--;
            quantum_left--;
            if (add_tick(out, &seg_cap, SEG_RUN, p->pid, t) != 0) {
                snprintf(err, errlen, "out of memory");
                free(ready.arr);
                return 1;
            }
            if (p->remaining == 0) {
                p->completion = t + 1;
                if (push_event(out, &ev_cap, t + 1, EV_COMPLETE, p->pid, &ready) != 0) {
                    snprintf(err, errlen, "out of memory");
                    free(ready.arr);
                    return 1;
                }
                running = -1;
                done++;
            }
        }

        next_t:;
    } /* end for t */

    /* ── post-loop: compute metrics ── */
    int total_time = 0;
    for (int i = 0; i < n; i++) {
        Process *p = &out->procs[i];
        p->turnaround = p->completion - p->arrival;
        p->waiting    = p->turnaround - p->burst;
        p->response   = p->start - p->arrival;
        if (p->completion > total_time) total_time = p->completion;
    }
    out->total_time = total_time;

    free(ready.arr);
    return 0;
}

/* ── cleanup ─────────────────────────────────────────────────────────────── */

void sim_free(SimResult *r)
{
    free(r->segments);
    free(r->events);
    r->segments  = NULL;
    r->events    = NULL;
    r->nsegments = 0;
    r->nevents   = 0;
}
