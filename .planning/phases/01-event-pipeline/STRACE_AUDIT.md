# Strace Audit: Scheduler Engine Live Mode

**Date:** 2026-11-12
**Target Command:** `bin/scheduler_cpp --algo fcfs --input fixtures/fcfs_textbook/input.txt --mode live --ipc signal --log`
**Environment:** WSL2 / Ubuntu Linux (kernel 6.6.x)

---

## 1. Raw Syscall Sequence Observed via `strace -f`

```text
clone(child_stack=NULL, flags=CLONE_CHILD_CLEARTID|CLONE_CHILD_SETTID|SIGCHLD, ...) = 212078
[pid 212071] setpgid(212078, 0)         = 0
[pid 212071] setpgid(212078, 212078)    = 0
[pid 212071] wait4(212078, ... WSTOPPED) = 212078  <-- child self-stops with SIGSTOP
[pid 212071] write(2, "[t=   0] FORK: P1 (os_pid=212078, burst=24)\n", ...)
[pid 212071] write(2, "[t=   0] SIGCONT  P1 (os_pid=212078)\n", ...)
[pid 212071] kill(212078, SIGCONT)      = 0
[pid 212078] write(2, "[CHILD-212078] P1 tick 1/24\n", ...)
[pid 212078] --- SIGSTOP ---
[pid 212071] wait4(212078, [{WIFSTOPPED && WSTOPSIG==SIGSTOP}], WSTOPPED, {ru_utime=...}) = 212078
[pid 212071] write(2, "[t=   0] stopped   P1\n", ...)
...
[pid 212078] _exit(0)
[pid 212071] wait4(212078, [{WIFEXITED && WEXITSTATUS==0}], WSTOPPED, {ru_utime=..., ru_maxrss=...}) = 212078
[pid 212071] write(2, "[t=  24] COMPLETE: P1 (os_pid=212078, cpu=6.9ms, rss=996kb)\n", ...)
[pid 212071] clone(...) = 212079 (P2)
```

---

## 2. Identified Deficiencies in Legacy Engine Logging

1. **Lazy Forking instead of Arrival-Time Forking**:
   - In `execution_controller.cpp`: P2 and P3 (both arriving at `t=0`) were not forked until `t=24` and `t=27`.
   - In real OS scheduling, task arrival corresponds to process admission/creation (`clone`/`fork`).
2. **Missing Real-Time Ready Queue Snapshot**:
   - Target requires `ready=[P2, P3]` on `DISPATCH` and `PREEMPT`.
3. **Missing Preemption Explanations**:
   - Quantum expiry (RR) and shorter-job preemptions (SRTF) were logged simply as `stopped P1`.
4. **Missing CLEANUP Reporting**:
   - Neither normal exit nor signal termination emitted the process group teardown metrics.
5. **Lack of Unified Event Abstraction**:
   - Logs were hardcoded strings sent to stderr rather than typed event objects that can be directed to terminal, HTTP NDJSON, or JSON trace collectors.

---

## 3. Syscall Return to `LiveEvent` Mapping

| Syscall Return | `LiveEventType` | Fields Extracted | Target Formatted String |
|---|---|---|---|
| `wait4(child_pid, ..., WUNTRACED)` returns `WIFSTOPPED` right after `fork()` | `ARRIVE` | `pid`, `os_pid`, `burst`, `t` | `t=  0 ARRIVE   P1 fork() -> os_pid 8571, child stopped (T)` |
| `kill(os_pid, SIGCONT)` invoked | `DISPATCH` | `pid`, `os_pid`, `ready_queue`, `t` | `t=  0 DISPATCH P1 kill(8571,SIGCONT) ready=[]` |
| `wait4` tick step & child work unit | `RUN` | `pid`, `os_pid`, `tick_current`, `tick_total`, `t` | `t=  0 RUN      P1 os_pid 8571 tick 1/5` |
| `wait4` returns `WIFSTOPPED` with burst remaining | `PREEMPT` | `pid`, `os_pid`, `reason`, `ready_queue`, `t` | `t=  2 PREEMPT  P1 wait4 -> stopped by SIGSTOP, quantum expired` |
| `wait4` returns `WIFEXITED(0)` | `EXIT` | `pid`, `os_pid`, `cpu_ms`, `max_rss_kb`, `t` | `t=  9 EXIT     P1 wait4 -> exited 0, cpu 1.05 ms, max_rss 1.4 MB` |
| Parent teardown / `kill(-pgid, SIGKILL)` | `CLEANUP` | `pgid`, `live_count`, `reaped_count`, `zombies`, `t` | `t= 12 CLEANUP  kill(-pgid,SIGKILL) live=0 reaped 3/3 zombies 0` |
