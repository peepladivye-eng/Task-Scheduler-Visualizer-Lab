# Plan 01-01 Summary: Event Sink Architecture & Strace Audit

## Accomplishments
- Conducted full `strace -f` audit under WSL2 documenting the exact POSIX syscalls (`clone`, `setpgid`, `SIGSTOP`, `wait4`, `kill(..., SIGCONT)`, `rusage`) and mapped each to a discrete `LiveEvent`.
- Documented findings in `.planning/phases/01-event-pipeline/STRACE_AUDIT.md`.
- Implemented `LiveEventType` and `LiveEvent` struct in `engine-cpp/include/common/events.hpp`.
- Defined `IEventSink` abstract interface and `CompositeEventSink` in `engine-cpp/include/common/event_sink.hpp`.
- Implemented `TerminalSink` and `NdjsonSink` in `engine-cpp/src/trace/event_sink.cpp` conforming to target brief line formats.
- Upgraded C++ standard to C++17 in `engine-cpp/CMakeLists.txt` and integrated `event_sink.cpp`.
- Verified compilation and test pass (40/40 unit tests, 19/19 Linux process tests).

## Verification Evidence
- Build: `scheduler_cpp`, `run_tests`, `run_linux_tests` built with 0 errors.
- Tests: `bin/run_tests` (40 passed, 0 failed), `bin/run_linux_tests` (19 passed, 0 failed).

## Next Plan
Proceed to Plan 01-02: Wire real-time event emission into execution controller, backends, arrival-time forking, and `--ndjson` CLI flag.
