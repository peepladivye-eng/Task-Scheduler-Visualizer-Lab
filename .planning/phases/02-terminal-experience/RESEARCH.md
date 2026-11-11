# Phase 2 Research: WSL Terminal Experience

## 1. Technical Architecture & Component Analysis

### Terminal Capabilities & Detection
1. **TTY Detection**:
   Using `::isatty(::fileno(out_))` on the output stream (typically `stderr`).
   - If `true`: enable ANSI cursor positioning (`\033[<N>A`), live in-place Gantt updates, and colored text.
   - If `false`: pure sequential text stream (vital for redirected logs or CI/test runners) with zero ANSI cursor jumps.
2. **NO_COLOR Standard**:
   Check `std::getenv("NO_COLOR") != nullptr`. If set, disable all color escapes even on a TTY.
3. **Terminal Dimensions**:
   Query terminal width via `ioctl(STDERR_FILENO, TIOCGWINSZ, &ws)`.
   - If `ioctl` fails or returns 0 (e.g. headless or piped), default width is 80 columns.
   - Reserved left column for labels: `P<pid> [<os_pid>] │` ~ 18 columns.
   - Available timeline width: `W = term_width - 20`.
   - Scale factor calculation:
     `scale = 1; while ((total_ticks + scale - 1) / scale > W) scale++;`
     If `scale > 1`, display: `GANTT CHART (1 column = %d ticks)`.

---

## 2. Live Gantt Rendering Mechanics (Flicker-Free)

### In-Place Redraw Algorithm (TTY Mode)
During the live loop:
- We display the live Gantt chart at the bottom of the terminal.
- Rows:
  1. Ruler / scale markings
  2. One row per process: `P%-2d [%-6d] │...`
  3. CPU status row: `CPU           │...`
  4. Legend: `█ = run  ░ = cs  (space) = idle`
- Height of Gantt block: `H = procs.size() + 3`.
- After emitting each event line (such as `ARRIVE`, `DISPATCH`, `RUN`, `PREEMPT`, `EXIT`), if on TTY:
  - If already drawn in previous tick: move cursor up `H` lines using `\033[<H>A`.
  - Redraw all `H` lines with updated progress up to current tick `t`.
- On non-TTY:
  - Skip live redraw cursor manipulation completely; emit only the plain sequential log lines as events happen.
  - At simulation completion, write the final complete report.

---

## 3. Formatting & Color Contracts

### Header Contract
```text
╔══════════════════════════════════════════════════════════╗
║   CPU SCHEDULER — REAL PROCESS EXECUTION (WSL2)         ║
╚══════════════════════════════════════════════════════════╝
  Parent PID : 253670 | PGID: 253674
  Algorithm  : rr (quantum=2, cs=0)
  Backend    : signal (SIGSTOP / SIGCONT)
  Processes  : 3
```

### Event Log Line Contract
- `ARRIVE`: ` t=%3d ARRIVE   P%-2d fork() -> os_pid %d, child stopped (T)`
- `DISPATCH`: ` t=%3d DISPATCH P%-2d kill(%d,SIGCONT) ready=%s`
- `RUN`: ` t=%3d RUN      P%-2d os_pid %d tick %d/%d`
- `PREEMPT`: ` t=%3d PREEMPT  P%-2d wait4 -> stopped by SIGSTOP%s`
- `EXIT`: ` t=%3d EXIT     P%-2d wait4 -> exited %d, cpu %.2f ms, max_rss %.1f MB`
- `CLEANUP`: ` t=%3d CLEANUP  kill(-%d,SIGKILL) live=%d reaped %d/%d zombies %d`

### Final Report Contract
- ASCII Gantt Chart including dedicated `CPU` row:
  ```text
    P1 [253674] │██   ██ █│
    P2 [253675] │  ██   █ │
    P3 [253676] │    █    │
    CPU         │1122331121│
  ```
- Process metrics table with OS PID and CPU time columns.
- Summary averages (waiting, turnaround, response, CPU utilization, throughput, context switches, total time).
