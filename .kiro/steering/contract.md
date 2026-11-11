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

# CONTRACT v3 additions
CLI: --ipc signal|pipe (default signal, strict), --work-us N (0..100000, default 200: CPU microseconds burned per tick inside each child), --tick-ms N (0..1000, default 0: parent sleeps N ms per tick in live mode only).
Live mode limits: total burst ticks <= 5000 ("error: live mode supports at most 5000 total burst ticks, got N; use --mode simulate"). Simulate has no such limit.
Signal backend rules (all mandatory):
 1. Child: first action prctl(PR_SET_PDEATHSIG, SIGKILL) then check getppid()==parent pid (else _exit(1)); reset all signal handlers to default and unblock all signals; then raise(SIGSTOP). Loop for i in 1..burst: unit_of_work(work_us); (in --log mode print one line); if i==burst _exit(0); else raise(SIGSTOP).
 2. unit_of_work burns exactly work_us microseconds of CPU time (clock_gettime CLOCK_PROCESS_CPUTIME_ID busy wait). No sleeping, no I/O.
 3. Parent: every child is placed in ONE process group (first child setpgid(0,0), others join it; parent also calls setpgid(child, group) to avoid the race).
 4. Parent per tick: kill(child, SIGCONT); alarm(2); wait4(child, &st, WUNTRACED, &ru) retrying EINTR unless the alarm flag is set; alarm(0). Accept ONLY (WIFSTOPPED && WSTOPSIG==SIGSTOP) while remaining>0 after the tick, or (WIFEXITED && WEXITSTATUS==0) exactly when remaining==0. Anything else is a fatal error with a clear message after full cleanup.
 5. SIGINT/SIGTERM/SIGALRM handlers only set volatile sig_atomic_t flags (sigaction without SA_RESTART). The main loop checks the flags after every tick and every EINTR.
 6. Cleanup (normal end, error, signal): kill(-group, SIGKILL) then wait4 every remaining child. Never use SIGTERM on stopped children. Exit codes: 0 ok, 1 error, 130 SIGINT, 143 SIGTERM.
 7. Children never write to stdout. In --log mode children write ONE line per tick to stderr with a single write(2,...) call; in --stream mode children write nothing.
Stream additions: {"k":"signal","t":..,"pid":..,"os_pid":..,"sig":"SIGCONT"|"SIGSTOP"} emitted when the parent sends SIGCONT and when it observes the stop; {"k":"error","message":".."} on fatal errors.
INVARIANT: simulate == live(pipe) == live(signal) == reference engine (C) for trace JSON except os_pid and "os".
INVARIANT: after the engine process ends in ANY way (normal, error, Ctrl+C, kill -TERM, kill -9) no child of it is alive (pgrep finds none within 1 s).
