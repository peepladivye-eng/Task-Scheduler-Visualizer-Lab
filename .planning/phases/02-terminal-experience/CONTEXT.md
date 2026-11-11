# Phase 2 Context: WSL Terminal Experience

## Core Intent
Provide an authentic, professional OS terminal experience in WSL2:
1. Header displaying parent PID, process group ID (PGID), algorithm, quantum, context switch cost, and IPC backend.
2. Synchronous event lines with logical PID and OS PID, signal names, CPU time on exit, and ready queue snapshot.
3. Live Gantt chart:
   - On TTY (`isatty(STDERR_FILENO)`): in-place redraw each tick using ANSI cursor-up (`\033[...A`) without flicker.
   - On non-TTY / pipe: plain sequential event lines, followed by the final report.
4. Colors & formatting:
   - Unique ANSI color per PID on TTY.
   - Suppress all colors if `NO_COLOR` is present in the environment or if not a TTY.
   - Auto-fit terminal width (`ioctl(..., TIOCGWINSZ, ...)` or default 80): compress Gantt ticks into columns when workload exceeds width, and state the compression factor (`1 char = X ticks`).
5. Final execution report:
   - Full Gantt chart with an extra CPU row showing which task is on the CPU at each tick.
   - Process table with real OS PIDs, bursts, start, completion, turnaround, waiting, response, and CPU ms.
   - Summary averages table.
6. Do not rename existing CLI flags.
