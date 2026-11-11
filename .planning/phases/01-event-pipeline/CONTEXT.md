# Phase 1 Context: Real-Time Event Pipeline

## Core Intent
Every observable event (`fork`, `SIGCONT`, `stop`, `dispatch`, `preempt`, `exit`, `cleanup`, `tick`) must be emitted immediately after the real syscall returns, through one event sink interface.

## Sinks Required
1. `TraceCollectorSink`: Collects in-memory data for JSON trace (schema v1.0 unchanged).
2. `NdjsonSink`: Streams events as newline-delimited JSON for streaming to HTTP / stdout.
3. `TerminalSink`: Formats live event lines for terminal output.

## Key Directives & Boundaries
- Delete anything that builds log lines from the finished trace.
- Keep existing flags: `--mode`, `--ipc`, `--work-us`, `--tick-ms`, `--log`.
- First task of the phase: Compare the current log with `strace` output and write down what is fake, synthetic, or missing.
- Keep the pipe backend working.
- `simulate == live(pipe) == live(signal) == C reference`, except `os_pid` and `os` object.
- Virtual ticks only (1 tick = 1 ms); `--tick-ms` only slows the parent for viewing.
- No third scheduling implementation, no new dependencies.
