# CPU Scheduler Lab: Real Process Execution Engine

## What This Is

An educational CPU scheduler simulator and real process execution lab for OS coursework on WSL2/Linux. It features a modern C++17 scheduler engine (`engine-cpp`) that demonstrates textbook scheduling algorithms both deterministically and with real POSIX OS processes (fork, SIGSTOP, SIGCONT, wait4, rusage), mirrored to a high-fidelity web visualization and live terminal interface.

## Core Value

Show in real time, as each real syscall returns, true OS process execution with real OS PIDs, live signals, child process lifecycle, and ANSI terminal Gantt visualization without synthetic delays or fake traces.

## Requirements

### Validated

- [x] Deterministic simulation across 6 algorithms (FCFS, SJF, SRTF, Priority, Priority-Preemptive, Round Robin) with context switch costs
- [x] Web frontend dashboard (Gantt, Process Table, Metrics, Ready Queue, Compare View)
- [x] Basic worker backends (pipe and signal) in WSL2

### Active

- [ ] **Real-time Event Pipeline**: Unified event stream emitted immediately as real syscalls return, feeding terminal, NDJSON, and trace collector without building logs from finished traces.
- [ ] **WSL Terminal Experience**: Live-drawing ANSI Gantt chart, formatted event log lines matching real syscall returns (fork, SIGCONT, stopped, exit/reap, cleanup), process table with OS PIDs, and summary averages.
- [ ] **Process Lifecycle & Cleanup Robustness**: PR_SET_PDEATHSIG, dedicated process group, deterministic CLEANUP line on all exit paths (normal, error, Ctrl+C exit 130, SIGTERM exit 143), zero zombie/orphan guarantees, and comprehensive robustness test suite.
- [ ] **Web Live Synchronization**: `server.js` `/api/live` NDJSON streaming, ExecutionTerminal and OS panel mirroring real-time events and OS PIDs without redesigning UI.
- [ ] **Repository Hygiene & Documentation**: Removal of stale artifacts/Windows build scripts, honest test counts and benchmarks in README, architecture documentation, verified from fresh clone.

### Out of Scope

- Redesigning the finished web UI (reuse existing components: ExecutionTerminal, OS panel, Gantt).
- WebSockets (NDJSON over HTTP stream is required instead).
- Third scheduling engine implementation (engine/ C is reference only; engine-cpp C++17 is the sole live engine).
- Wall-clock scheduling sleeps (virtual ticks only; `--tick-ms` only slows parent for observation).
- User-initiated "kill task" UI controls (unless explicitly requested).

## Context

- Operating System: WSL2 / Ubuntu Linux.
- Scheduler Engine: `engine-cpp` (C++17). Reference engine: `engine/` (C).
- Server: Node.js `server.js` (Linux/WSL2).
- Client: React + TypeScript + Vite + Tailwind CSS.

## Constraints

- **Platform**: WSL2 / Linux only.
- **Engine**: C++17 only for `engine-cpp`; no new external dependencies.
- **Process Management**: One child process per task; child self-stops with `raise(SIGSTOP)`, parent coordinates with `SIGCONT` and `wait4(WUNTRACED)`. Pipe backend retained.
- **Trace Format**: JSON format remains 1.0 compatible (`simulate == live(pipe) == live(signal) == C reference`, except `os_pid` and `os` object).
- **Process Safety**: Zero orphan/zombie processes after termination on any exit path.
- **Test Integrity**: Never edit fixtures or tests to make them pass artificially.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Event sink pipeline | Single event stream for terminal, NDJSON, and trace collector | ✓ Planned |
| Real-time syscall emission | Log lines emitted immediately after real syscall returns | ✓ Planned |
| ANSI Gantt live redraw | In-place cursor movement on TTY, plain output on non-TTY | ✓ Planned |
| Process Group SIGKILL cleanup | Guarantees all children reaped even on SIGINT/SIGTERM | ✓ Planned |
| NDJSON over HTTP for live web | Avoids WebSocket dependencies, native HTTP stream | ✓ Planned |

---
*Last updated: 2026-11-12 after GSD initialization*
