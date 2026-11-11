# Plan 01-02 Summary: Real-Time Event Emission & Arrival Forking

## Accomplishments
- Refactored `execution_controller.cpp` to eliminate lazy forking; all processes now fork precisely at `t == arrival` with real `ARRIVE` events emitted immediately after `wait4(..., WUNTRACED)` returns state `T`.
- Wired synchronous `IEventSink` notifications across the simulation lifecycle:
  - `ARRIVE` on child creation and initial stop.
  - `DISPATCH` on CPU allocation with real-time ready queue snapshot `[P2, P3]`.
  - `RUN` on each execution tick showing current and total burst ticks.
  - `PREEMPT` when quantum expires or higher-priority tasks preempt, reporting the exact preemption reason and new ready queue.
  - `EXIT` upon child completion, capturing `rusage` CPU time in ms and max RSS in MB.
  - `CLEANUP` when all tasks finish, reporting process group ID, reaped counts, and zero zombies.
- Harmonized `SignalBackend` and `PipeBackend` to share process group handling and live/reaped metrics.
- Added `--ndjson` CLI option to `main.cpp` for streaming single-line JSON events.
- Validated differential consistency across 3,000 workloads: **0 mismatches** between C reference, simulate, live pipe, and live signal modes.

## Verification Evidence
- Unit tests: `bin/run_tests` (40/40 passed).
- Linux process tests: `bin/run_linux_tests` (19/19 passed).
- Differential tests: `tools/diff-test.js` (500 workloads x 6 algorithms x 4 engines = 0 mismatches).
- Real POSIX behavior: Live arrival forks, preemption signals, exit rusage, and cleanup verified on both `fcfs_textbook` and `rr_q2`.

## Phase 1 Complete
Phase 1 goals and requirements (PIPE-01, PIPE-02, PIPE-03, PIPE-04) are fully achieved. Ready for Phase 2: WSL terminal experience.
