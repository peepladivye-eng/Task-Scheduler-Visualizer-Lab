# Phase 2 Discussion: WSL Terminal Experience

## Scope & Directives

- **Target Output Format**:
  - Header with parent PID, PGID, algorithm name, quantum/CS parameters, and IPC backend.
  - One line per event with logical ID AND OS PID, signal names, CPU time on exit, and ready queue snapshot on dispatch/preempt.
- **Live Gantt Display**:
  - Redraws each tick on a TTY using ANSI cursor-up (`\033[...`) without flicker.
  - Non-TTY / piped output prints plain sequential event lines followed by the final Gantt.
- **Visual & Formatting Rules**:
  - Color per PID enabled only on TTY.
  - Respect `NO_COLOR` environment variable.
  - Auto-fit terminal width (compress columns if necessary and print the compression factor).
  - Final execution report: Gantt chart with CPU row, process table with real OS PIDs, and summary averages.
  - Do not rename existing CLI flags.
