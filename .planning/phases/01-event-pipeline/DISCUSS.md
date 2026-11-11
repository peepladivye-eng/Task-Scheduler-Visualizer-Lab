# Phase 1 Discussion: Real-Time Event Pipeline

## Scope & Directives

- **Primary Goal**: Every observable event (fork, SIGCONT, stop, dispatch, preempt, exit, cleanup, tick) must be emitted immediately after the real syscall returns, through one unified event sink interface.
- **Sinks**:
  - `TraceCollectorSink`: Collects in-memory `SimResult` / `trace` (JSON format v1.0 unchanged).
  - `NdjsonSink`: Streams events as newline-delimited JSON for HTTP streaming.
  - `TerminalSink`: Formats live event lines for terminal output.
- **Elimination**: Delete anything that builds log lines retroactively from the finished trace.
- **Flag Compatibility**: Retain all existing flags (`--mode`, `--ipc`, `--work-us`, `--tick-ms`, `--log`).
- **First Task**: Compare the current log with `strace` output and document what is fake, synthetic, or missing.
