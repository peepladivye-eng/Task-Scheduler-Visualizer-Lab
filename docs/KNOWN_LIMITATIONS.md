# Known Limitations

## Platform
- Live mode (real fork/IPC/waitpid) requires Linux/WSL2.
  On Windows the engine runs in simulate mode — no actual child processes are created.
- The Windows binary is compiled with MinGW GCC 6.3 (C++14).
  The WSL2 binary uses GCC 15.2 (full C++17 available but we target C++14 for compatibility).

## Scheduling
- The scheduler runs in user space. It does NOT control the Linux kernel scheduler.
  The kernel continues to schedule all processes normally.
- Simulated time (ticks) != wall-clock time. One tick ≠ one millisecond of real CPU time.
  Work units are deterministic CPU iterations, not timed intervals.
- Context switch cost is modelled as idle ticks, not measured real overhead.

## Live Mode
- Live mode creates one real child process per scheduling process.
  For large workloads (many processes × large burst), execution time increases linearly.
- The engine terminates workers after their burst completes.
  Real OS scheduling of these workers is non-deterministic between execution units.
- Maximum safe burst × processes for live mode: ~64 processes × burst ≤ 100 completes in < 5 seconds.

## Frontend
- Minimum window width: 1100px.
- The Gantt chart uses CSS transitions for animations. Very long simulations (> 200 ticks)
  may render slowly on low-end hardware.
- The guided tour uses a radial-gradient spotlight approximation, not a true SVG mask.

## Testing
- Linux process tests (test_linux_process.cpp) must be run in WSL2.
  They are not part of the Windows CI fixture tests.
- fork() failure simulation is not automated (requires root to exhaust process limits).

## Future Work
- Streaming SSE events during live execution (currently batch response only).
- Concurrent session support (currently sequential).
- Priority inversion and aging demonstrations.
- Real-time clock measurement alongside simulated time.
