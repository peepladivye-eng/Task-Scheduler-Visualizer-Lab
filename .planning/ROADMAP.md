# Roadmap: CPU Scheduler Lab (Real Process Mode)

## Overview

Transform the CPU scheduler lab into a genuine OS process scheduler experience on WSL2/Linux. The project delivers a unified real-time event pipeline emitting events directly as real syscalls return, an authentic ANSI WSL terminal interface with live Gantt charts and exact signal/state logging, bulletproof process lifecycle management and cleanup, seamless NDJSON web streaming into existing UI panels, and comprehensive repo cleanup with verified benchmarks.

## Phases

- [x] **Phase 1: Real-time event pipeline** - Unified event sink interface (trace, NDJSON, terminal) emitting on real syscall return; eliminate post-trace log reconstruction.
- [ ] **Phase 2: WSL terminal experience** - Header, real-time syscall formatted logs, flicker-free live ANSI Gantt on TTY, process table, and final report.
- [ ] **Phase 3: Kill and cleanup visibility plus robustness tests** - Zero-leak process group cleanup, PR_SET_PDEATHSIG, deterministic CLEANUP logs, and extensive robustness test harness.
- [ ] **Phase 4: Web mirrors the same events** - server.js /api/live NDJSON streaming, client disconnect aborts, and web UI mirror without design changes.
- [ ] **Phase 5: Repo cleanup, honest README, push to GitHub** - File and script hygiene, verified numbers, fresh clone verification, merge and push.

## Phase Details

### Phase 1: Real-time event pipeline
**Goal**: Establish a single `IEventSink` architecture in `engine-cpp` where all observable events (ARRIVE, DISPATCH, RUN, PREEMPT, EXIT, CLEANUP) are emitted immediately as POSIX syscalls return.
**Depends on**: Nothing (first phase)
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04
**Success Criteria**:
  1. Audit document comparing current engine logs with `strace` output, identifying missing or synthetic events.
  2. `IEventSink` abstraction dispatching synchronously to `TraceCollectorSink`, `NdjsonSink`, and `TerminalSink`.
  3. No log lines generated retroactively from completed trace objects.
  4. All existing flags (`--mode`, `--ipc`, `--work-us`, `--tick-ms`, `--log`) and JSON trace v1.0 compatibility preserved.
**Plans**: 2 plans

Plans:
- [x] 01-01: Event sink architecture, LiveEvent model, Trace/Ndjson/Terminal sinks, and strace audit
- [x] 01-02: Wire real-time event emission into execution controller, backends, arrival forking, and CLI

---

### Phase 2: WSL terminal experience
**Goal**: Create an authentic OS terminal interface matching the target brief format with live ANSI Gantt chart and final execution report.
**Depends on**: Phase 1
**Requirements**: TERM-01, TERM-02, TERM-03, TERM-04, TERM-05, TERM-06
**Success Criteria**:
  1. Terminal output matches target lines (`ARRIVE P1 fork() -> os_pid...`, `DISPATCH kill(...,SIGCONT)...`, etc.).
  2. Live Gantt draws in-place using ANSI cursor controls on TTY without flicker; falls back gracefully on non-TTY.
  3. PID colors enabled on TTY and properly suppressed when `NO_COLOR` is present.
  4. Terminal auto-fits width by compressing columns when necessary and reporting the scale factor.
  5. Final report prints Gantt chart with CPU row, process metrics table, and summary averages.
**Plans**: 2 plans

Plans:
- [ ] 02-01: Header, formatting, color coding, and live in-place Gantt renderer
- [ ] 02-02: Terminal width auto-fitting, scale calculation, CPU row, and final report

---

### Phase 3: Kill and cleanup visibility plus robustness tests
**Goal**: Guarantee process isolation, zero leaked child processes or zombies across all exit paths, and prove stability with a rigorous test suite.
**Depends on**: Phase 2
**Requirements**: ROBUST-01, ROBUST-02, ROBUST-03, ROBUST-04
**Success Criteria**:
  1. `CLEANUP kill(-pgid,SIGKILL) live=0 reaped X/X zombies 0` emitted on normal exit, error exit, Ctrl+C (130), and SIGTERM (143).
  2. Children set `PR_SET_PDEATHSIG` and are grouped into a dedicated process group (`setpgid`).
  3. Stopped children are never sent `SIGTERM` directly; process group is SIGKILLed and wait4 reaps all.
  4. Robustness test suite in `tools/robustness-test.js` passes 100% of cases (SIGINT, SIGTERM, kill -9 parent, kill -9 child, watchdog, 64 procs, >5000 burst reject, 20 back-to-back runs).
**Plans**: 2 plans

Plans:
- [ ] 03-01: Signal handling, process group isolation, and CLEANUP emission on all exits
- [ ] 03-02: Robustness test harness expansion and stress verification

---

### Phase 4: Web mirrors the same events
**Goal**: Stream real-time engine events over HTTP NDJSON to the web interface without altering UI layout or design.
**Depends on**: Phase 3
**Requirements**: WEB-01, WEB-02, WEB-03, WEB-04, WEB-05
**Success Criteria**:
  1. `server.js` provides `/api/live` streaming engine NDJSON with immediate line flushing.
  2. Terminating web connection or pressing Stop aborts engine and SIGKILLs its process group.
  3. `ExecutionTerminal` displays identical text lines as the WSL terminal.
  4. Gantt and OS panels update dynamically from live event stream.
  5. Simulation mode toggle OFF retains original instant preview behavior.
**Plans**: 2 plans

Plans:
- [ ] 04-01: `server.js` `/api/live` streaming endpoint and client disconnect process reaper
- [ ] 04-02: Web client integration for NDJSON stream into `ExecutionTerminal`, `Gantt`, and `ProcessTable`

---

### Phase 5: Repo cleanup, honest README, push to GitHub
**Goal**: Purge legacy files, establish honest benchmarks and documentation, verify in a clean clone, and push to GitHub.
**Depends on**: Phase 4
**Requirements**: HYGIENE-01, HYGIENE-02, HYGIENE-03, HYGIENE-04
**Success Criteria**:
  1. `viewer/`, `build.ps1`, `bin/*.exe`, and obsolete docs removed; `.gitignore` updated.
  2. `README.md` updated with measured test results, 3-terminal demo instructions, and architecture diagrams.
  3. Clean clone into `/tmp` successfully builds and passes all test suites.
  4. Code merged cleanly into `main` and pushed to remote GitHub repository.
**Plans**: 2 plans

Plans:
- [ ] 05-01: File hygiene, artifact pruning, and `.gitignore` update
- [ ] 05-02: Documentation rewrite, fresh `/tmp` clone verification, branch merge, and GitHub push
