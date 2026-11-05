# Design Document

## Architecture

```
CLI args
   │
   ▼
parser.c ──► Process[]
   │
   ▼
sim.c ──► SimResult (timeline, events)
   │
   ▼
metrics.c ──► Metrics
   │
   ▼
trace.c ──► JSON (stdout or file)
```

## Modules

| File | Responsibility |
|------|---------------|
| process.h | Process struct definition |
| parser.c | File parsing, validation, sorting |
| sim.c | Tick-by-tick simulation loop |
| metrics.c | Per-process and aggregate metrics |
| trace.c | JSON and table output |
| main.c | CLI parsing, orchestration |

## Simulation Loop

The engine follows a strict per-tick order:
1. **ARRIVALS** — enqueue processes arriving at tick t (ascending pid)
2. **PREEMPT HOOK** (SRTF, Priority-P) — check if a better process arrived
3. **RR EXPIRY** — expire quantum, rotate queue
4. **DISPATCH** — pick best process, handle context-switch cost
5. **CS TICK** — consume one context-switch tick if active
6. **IDLE** — record idle tick if no process running
7. **RUN TICK** — decrement remaining, record completion

## Context Switch

When `cs_cost > 0` and the CPU switches to a different process:
- A `context_switch` segment is inserted into the timeline
- The incoming process is NOT in the ready queue during the switch
- `last_run` is updated immediately; `running` is set only after the switch completes

## Data Structures

- **Ready queue**: dynamic int array (process indices), grown with realloc
- **Segments**: dynamic array of `{t_start, t_end, pid, type}`, merged on-the-fly
- **Events**: dynamic array of `{t, type, pid, ready_queue[]}`, in emission order
