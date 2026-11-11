# Phase 3 Discussion: Kill and Cleanup Visibility plus Robustness Tests

## Scope & Directives

- **CLEANUP Output**: Print a `CLEANUP` line on every exit path (normal exit, error, Ctrl+C exit 130, SIGTERM exit 143) showing:
  `kill(-pgid,SIGKILL) live=0 reaped X/X zombies 0`
- **Signal & Process Management Rules**:
  - Never send `SIGTERM` to stopped children (stopped processes do not handle SIGTERM until continued).
  - Use `PR_SET_PDEATHSIG` so child processes terminate if parent dies unexpectedly.
  - Dedicate one process group via `setpgid`.
  - Issue `wait4` on every child to reap cleanly and avoid zombies.
- **Robustness Test Suite**:
  - Add or extend `tools/robustness-test.js`.
  - Test matrix:
    - SIGINT (Ctrl+C) handling
    - SIGTERM handling
    - `kill -9` of parent process
    - `kill -9` of an individual child
    - Hung child watchdog timeout
    - 64 processes maximum workload
    - Rejection of total burst > 5000 in live mode
    - Bad flag values validation
    - 20 back-to-back runs with zero leftover child processes or zombies.
- **Out of Scope**: Optional user-initiated "kill task" is out of scope unless explicitly requested.
