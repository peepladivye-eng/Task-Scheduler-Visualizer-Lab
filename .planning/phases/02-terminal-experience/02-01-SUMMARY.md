# Summary: Plan 02-01 — Header, Formatting, Color & Live Gantt Renderer

## Deliverables
1. **TTY and NO_COLOR Detection**:
   - `TerminalSink` dynamically queries `::isatty(::fileno(out_))` on Linux.
   - Respects `NO_COLOR` standard environment variable.
   - ANSI 8-color palette cycling per PID (`\033[36m`, `\033[32m`, etc.).
2. **Terminal Header**:
   - Boxed header: `CPU SCHEDULER — REAL PROCESS EXECUTION (WSL2)`.
   - Displays parent PID, PGID, algorithm, quantum, context switch cost, IPC backend, and process count.
3. **In-Place Live Gantt Drawing on TTY**:
   - Maintains live progress state and renders an in-place Gantt chart with process rows and CPU row.
   - Erases previous Gantt block using ANSI cursor-up (`\033[<H>A\033[J`) to prevent flicker and duplicate lines.
   - Plain sequential stream without cursor escape sequences when piped or redirected.

## Verification
- Clean build in WSL2.
- 40/40 unit tests pass in `run_tests`.
- 19/19 Linux backend tests pass in `run_linux_tests`.
- Live runs verified on `fcfs_textbook` and `rr_q2`.
