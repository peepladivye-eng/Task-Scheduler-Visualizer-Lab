# CONTRACT v2 (read-only)
Platform: Linux/WSL2 only. Engine = engine-cpp (C++17, g++, CMake, no external libs). Reference engine = engine/ (C11) used ONLY for differential tests.
Binary: bin/scheduler_cpp. Reference: bin/scheduler. Never commit binaries.
Input: one process per line `pid arrival burst priority`, '#' comments, integers only, lower priority number = higher priority.
Limits: 1..64 processes; pid 1..1e6 unique; arrival 0..10000; burst 1..10000; priority 0..1000; quantum 1..10000; context-switch 0..100.
Model (tick-based, 1 tick = 1 ms): for each t from 0: (1) arrivals with arrival==t join the ready queue in ascending pid order; (2) if no context switch is in progress: preempt hook (srtf: strictly smaller remaining; priority-p: strictly smaller priority number), RR quantum expiry (new arrivals are enqueued before the preempted process), dispatch the best candidate (tie: earlier arrival, then lower pid); a dispatch of a different pid than the last one counts as a context switch and costs cs ticks of type "context_switch"; (3) run one tick or idle.
CLI: scheduler_cpp --algo <fcfs|sjf|srtf|priority|priority-p|rr> --input FILE [--quantum N] [--context-switch N] [--mode simulate|live] [--out FILE] [--json] [--log] [--stream] [--tick-ms N] [--compare] [--help]
Strict parsing: invalid or unknown flag values print "error: ..." to stderr and exit non-zero. No atoi.
Trace JSON (stdout or --out), version "1.0": {version, algo, quantum|null, context_switch_cost, processes:[{pid,arrival,burst,priority,os_pid|null,start,completion,waiting,turnaround,response}], timeline:[{t_start,t_end,pid|null,type:run|idle|context_switch}], events:[{t,type:arrive|dispatch|preempt|complete,pid,ready_queue:[pids]}], metrics:{avg_waiting,avg_turnaround,avg_response,cpu_utilization,throughput,context_switches}}. ready_queue holds PIDS (never indexes).
Optional in live mode: "os":{"parent_pid":int,"cpu_pinned":int|null,"children":[{"pid","os_pid","forked_at","exited_at","cpu_ms","max_rss_kb","ticks_run"}]}.
Compare: {"version":"1.0","compare":true,"runs":[6 traces in order fcfs,sjf,srtf,priority,priority-p,rr]}; always simulate mode; must honour --out.
Stream protocol (--stream, NDJSON on stderr, one object per line, flushed): {"k":"fork","t":2,"pid":3,"os_pid":4123} {"k":"tick","t":2,"pid":3,"type":"run"|"idle"|"context_switch"} {"k":"dispatch"|"preempt"|"arrive"|"complete","t":..,"pid":..,"ready_queue":[..]} {"k":"exit","t":..,"pid":..,"os_pid":..,"cpu_ms":..,"max_rss_kb":..} {"k":"done"}
INVARIANT: simulate and live produce identical JSON except os_pid and the "os" object.
INVARIANT: after any run (including SIGINT/SIGTERM) no child process remains.
