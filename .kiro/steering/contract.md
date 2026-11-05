# CONTRACT (read-only)

## Stack

Engine: C11, gcc, standard library only. No fork, no POSIX-only headers, no Windows-only APIs. Must build on Windows (MinGW gcc, PowerShell) and Linux.

Viewer: vanilla HTML/CSS/JS. Plain <script> tags, NO ES modules, NO CDN, NO build step. index.html must work when opened by double-click (file://).

Tooling: Node built-ins only.

## Input file

One process per line: `pid arrival burst priority`, separated by spaces or tabs. Lines that are blank or start with '#' are ignored. Everything is an integer.

Limits: 1 to 64 processes; pid >= 1 and unique; arrival 0..10000; burst 1..10000; priority 0..1000. Lower priority number = higher priority.

## Time model

Tick-based. 1 tick = 1 ms. Time starts at 0.

## Selection rules (key order, "best" first)

- fcfs: ready-queue front (queue is in arrival order).

- sjf (non-preemptive): smallest burst; tie -> earlier arrival -> lower pid.

- srtf (preemptive): smallest remaining; tie -> earlier arrival -> lower pid. A newcomer preempts only if its remaining is STRICTLY smaller than the running process's remaining.

- priority (non-preemptive): smallest priority number; tie -> earlier arrival -> lower pid.

- priority-p (preemptive): same key; a newcomer preempts only if its priority number is STRICTLY smaller than the running one.

- rr: queue front; quantum Q ticks.

## Simulation loop (the engine MUST follow this order exactly)

State: ready queue (ordered array of pids), running (pid or none), last_run (pid or none, starts none), quantum_left, cs_left (0), cs_target (none).

For t = 0, 1, 2, ... until every process is complete:

 1. ARRIVALS: for each process with arrival == t, in ascending pid order: append to ready queue; emit event arrive.

 2. If cs_left == 0:

    a. PREEMPT HOOK (srtf, priority-p only): if running exists, pick the best ready process; if it is strictly better than running: append running to ready queue, emit event preempt for running, running = none.

    b. RR EXPIRY (rr only): if running exists and quantum_left == 0: if the ready queue is empty, quantum_left = Q and keep running (no event). Otherwise append running to ready queue, emit event preempt, running = none. (Because step 1 already ran, a process arriving this tick is queued BEFORE the preempted one.)

    c. DISPATCH: if running is none: pick the best ready process (by the selection rules). If none: continue to step 4 (idle). Otherwise remove it from the ready queue, call it X.

       - If last_run exists and last_run != X: context_switches++ ; if cs_cost > 0: set cs_left = cs_cost, cs_target = X, last_run = X (do NOT start running yet).

       - Otherwise (no switch, or cost 0): running = X, last_run = X, quantum_left = Q (Q = infinity for non-rr), emit event dispatch for X at time t.

 3. If cs_left > 0: record a context_switch tick for pid cs_target; cs_left--. If cs_left reached 0: running = cs_target, quantum_left = Q, emit event dispatch at time t+1. Go to the next t.

 4. If running is none: record an idle tick; next t.

 5. RUN TICK: if the process has not started, start = t. remaining--, quantum_left--. Record a run tick. If remaining == 0: completion = t+1, emit event complete at time t+1, running = none.

Notes: a context switch cannot be interrupted. The process that is switching in is not in the ready queue during the switch. The first dispatch ever (last_run none) costs nothing. Idle time does not reset last_run.

Safety: if t exceeds 1000000 the engine aborts with an error.

## Segments (timeline)

Consecutive ticks with the same (type, pid) merge into one segment {t_start, t_end (exclusive), pid, type}. type is "run", "idle" or "context_switch". Idle pid is null. A context_switch segment's pid is the process being switched IN.

## Events

{t, type, pid, ready_queue}. type: arrive, dispatch, preempt, complete. ready_queue = pids in the ready queue in stored order, snapshot taken right after the event (for dispatch, after the dispatched process was removed). Events are written in emission order (t never decreases).

## Metrics

turnaround = completion - arrival. waiting = turnaround - burst. response = start - arrival (start = first RUN tick, context-switch ticks do not count).

total_time = largest completion. run_ticks = sum of all burst. cpu_utilization = run_ticks  *100 / total_time. throughput = n / total_time. avg_* = mean over processes. context_switches = the counter from the loop.

All floats are printed with exactly 2 decimals (printf "%.2f"). Integers print plainly.

## Trace JSON (version "1.0"), key order exactly as shown

{

 "version": "1.0",

 "algo": "fcfs",

 "quantum": null,

 "context_switch_cost": 0,

 "processes": [ {"pid":1,"arrival":0,"burst":24,"priority":3,"start":0,"completion":24,"waiting":0,"turnaround":24,"response":0} ],

 "timeline": [ {"t_start":0,"t_end":24,"pid":1,"type":"run"} ],

 "events": [ {"t":0,"type":"arrive","pid":1,"ready_queue":[1]} ],

 "metrics": {"avg_waiting":0.00,"avg_turnaround":0.00,"avg_response":0.00,"cpu_utilization":0.00,"throughput":0.00,"context_switches":0}

}

algo is one of: fcfs, sjf, srtf, priority, priority-p, rr. quantum is an integer for rr, otherwise null. processes are sorted by pid.

## Compare JSON

{"version":"1.0","compare":true,"runs":[ <trace for fcfs>, sjf, srtf, priority, priority-p, rr ]}  (that exact order, each a full trace; quantum default 4)

## CLI

scheduler --algo <fcfs|sjf|srtf|priority|priority-p|rr> --input <file> [--quantum N] [--context-switch N] [--out FILE] [--compare]

- --quantum is required for rr (integer >= 1). For --compare it defaults to 4.

- --context-switch defaults to 0, integer 0..100.

- --compare ignores --algo (not required) and prints the compare JSON.

- Without --out: JSON to stdout, nothing else on stdout.

- With --out FILE: JSON to FILE, and a human-readable table (pid, arrival, burst, priority, start, completion, waiting, turnaround, response, then the averages) to stdout.

- Any error: message on stderr starting with "error:", nothing on stdout, exit code 1. Success exit code 0.

## Viewer rules

Global namespace: window.SCHED. Script load order in index.html: samples.js, gantt.js, panels.js, compare.js, editor.js, app.js (files that do not exist yet are added when their task is done).

Pid color = PID_COLORS[(pid - 1) % 10].

Design tokens: --bg #0b0f17; --surface #121826; --surface-2 #1a2234; --border #263149; --text #e6ebf5; --muted #8b97b1; --accent #6ea8fe; --good #3ddc97; --warn #ffb454; --bad #ff6b6b.

PID_COLORS: #6ea8fe #3ddc97 #ffb454 #ff6b9d #b794f6 #4fd1c5 #f6e05e #fc8181 #90cdf4 #a3e635.

Fonts: Inter, system-ui, sans-serif for text; "JetBrains Mono", Consolas, monospace for numbers and labels.

Idle segments: diagonal hatch in --border. Context-switch segments: --warn with diagonal stripes.

Dark theme only. It must look like a polished developer tool, not a classroom demo: spacing, alignment, subtle borders and radius 10px, no default browser styling on buttons/inputs/selects.
