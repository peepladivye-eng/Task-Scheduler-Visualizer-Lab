# Requirements: CPU Scheduler Lab (Real Process Mode)

**Defined:** 2026-11-12
**Core Value:** Show real POSIX process execution in real time as each syscall returns, through unified event sinks (terminal, NDJSON, trace collector).

## v1 Requirements

### Pipeline & Event Architecture (PIPE)

- [ ] **PIPE-01**: Unified `IEventSink` interface implemented in `engine-cpp` supporting multiple sinks (TraceCollector, TerminalSink, NdjsonSink).
- [ ] **PIPE-02**: Immediate event emission on syscall returns:
  - `ARRIVE`: child `fork()` returns + initial child `SIGSTOP` detected by `wait4(WUNTRACED)`.
  - `DISPATCH`: parent sends `SIGCONT` via `kill(pid, SIGCONT)`.
  - `RUN`: real tick executed (`unit_of_work`).
  - `PREEMPT`: child stops with `SIGSTOP`, parent `wait4(WUNTRACED)` returns.
  - `EXIT`: child completes burst, exits cleanly, parent reaps with `wait4` and collects `rusage` (`cpu_ms`, `max_rss_kb`).
  - `CLEANUP`: parent sends `kill(-pgid, SIGKILL)` and verifies reaped count and zero zombies.
- [ ] **PIPE-03**: Remove all legacy code that reconstructs logs or events retroactively from the completed trace.
- [ ] **PIPE-04**: Audit current log against `strace` output and document missing or synthetic events.

### WSL Terminal Experience (TERM)

- [ ] **TERM-01**: Header displays parent PID, PGID, algorithm name, quantum/CS parameters, and IPC backend.
- [ ] **TERM-02**: Live event formatting matching exact target output specification:
  - `t=  0 ARRIVE   P1 fork() -> os_pid 8571, child stopped (T)`
  - `t=  0 DISPATCH P1 kill(8571,SIGCONT) ready=[]`
  - `t=  0 RUN      P1 os_pid 8571 tick 1/5`
  - `t=  2 PREEMPT  P1 wait4 -> stopped by SIGSTOP, quantum expired`
  - `t=  9 EXIT     P1 wait4 -> exited 0, cpu 1.05 ms, max_rss 1.4 MB`
  - `t= 12 CLEANUP  kill(-pgid,SIGKILL) live=0 reaped 3/3 zombies 0`
- [ ] **TERM-03**: Live Gantt chart drawn in terminal:
  - TTY mode: In-place redraw each tick via ANSI cursor control (`\033[...`) without flicker.
  - Non-TTY / piped mode: Plain sequential lines + final static Gantt chart.
- [ ] **TERM-04**: ANSI color coding per PID on TTY, respecting `NO_COLOR` env var.
- [ ] **TERM-05**: Terminal width auto-fitting: scales/compresses horizontally if width is exceeded, reporting compression ratio.
- [ ] **TERM-06**: Comprehensive final report on stderr: Final Gantt chart with CPU row, process metrics table with OS PIDs and CPU time, and summary averages.

### Cleanup & Robustness (ROBUST)

- [ ] **ROBUST-01**: Guarantee that no child process remains under any termination condition (normal exit, error, SIGINT / Ctrl+C exit code 130, SIGTERM exit code 143).
- [ ] **ROBUST-02**: Process group isolation: children placed in separate process group (`setpgid`), killed with `kill(-pgid, SIGKILL)`.
- [ ] **ROBUST-03**: `PR_SET_PDEATHSIG` configured on child spawn to kill children if parent dies unexpectedly.
- [ ] **ROBUST-04**: Extend `tools/robustness-test.js` / test suite covering:
  - SIGINT and SIGTERM termination
  - `kill -9` of parent process
  - `kill -9` of an individual child
  - Watchdog timeout for hung children
  - 64 processes maximum workload
  - Total burst limit (>5000 rejected in live mode)
  - Invalid flag values
  - 20 back-to-back stress runs with zero lingering processes or zombies.

### Server & Web Live Streaming (WEB)

- [ ] **WEB-01**: `server.js` endpoint `/api/live` streaming live NDJSON from engine process with per-line flush.
- [ ] **WEB-02**: `server.js` client disconnect handling: kills the engine process group (`SIGKILL`) if HTTP client aborts.
- [ ] **WEB-03**: Validate request params in `server.js`: `ipc` ('signal' or 'pipe'), `workUs` (0..100000), `tickMs` (0..1000), total burst <= 5000.
- [ ] **WEB-04**: `server.js` console echo: prefixes each live engine event with `[engine] `.
- [ ] **WEB-05**: Web frontend integration (reusing existing UI components without redesign):
  - `ExecutionTerminal` streams the exact text matching WSL terminal events.
  - `Gantt` animates dynamically from incoming tick events.
  - `ProcessTable` / OS panel shows real OS PIDs, state transitions, and resource metrics.
  - Live mode toggle OFF preserves existing instantaneous simulation preview.

### Repo Hygiene & Verification (HYGIENE)

- [ ] **HYGIENE-01**: Remove deprecated `viewer/`, Windows `.ps1` build scripts, `bin/*.exe`, and stale audit documents.
- [ ] **HYGIENE-02**: Update `.gitignore` to exclude `bin/`, `engine-cpp/build/`, `node_modules/`, `dist/`.
- [ ] **HYGIENE-03**: Honest `README.md` reflecting only measured test results, WSL setup instructions, 3-terminal live demo walkthrough, and architecture diagrams.
- [ ] **HYGIENE-04**: Verification from a clean clone into `/tmp` before final merge into `main`.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PIPE-01, PIPE-02, PIPE-03, PIPE-04 | Phase 1 | Pending |
| TERM-01, TERM-02, TERM-03, TERM-04, TERM-05, TERM-06 | Phase 2 | Pending |
| ROBUST-01, ROBUST-02, ROBUST-03, ROBUST-04 | Phase 3 | Pending |
| WEB-01, WEB-02, WEB-03, WEB-04, WEB-05 | Phase 4 | Pending |
| HYGIENE-01, HYGIENE-02, HYGIENE-03, HYGIENE-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0
