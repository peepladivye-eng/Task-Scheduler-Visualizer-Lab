# CPU Scheduler Visualizer Lab

A Linux/WSL2-backed CPU Scheduling and Process Management Laboratory.

**Demonstrates:** real POSIX `fork()` child process creation, `SIGSTOP`/`SIGCONT` signal-based scheduling, POSIX pipe IPC, `waitpid()`/`wait4()` resource usage and cleanup, live terminal Gantt rendering, and 6 scheduling algorithms visualized through a React frontend.

## Quick Start (WSL2 — required for live mode)

```bash
# 1. Build the C++ engine
cd engine-cpp
cmake -S . -B build
cmake --build build --parallel
cd ..

# 2. Build the C reference engine
make -C engine

# 3. Build the frontend
cd web && npm install && npm run build && cd ..

# 4. Start the server inside WSL2
node server.js
```
Open **http://localhost:3000** — toggle **Real Process Mode** in the UI to fork real child processes on Linux.

## Two Backends

| Backend | IPC | How it works |
|---------|-----|-------------|
| **Signal** (default) | `SIGSTOP`/`SIGCONT` | Child self-stops after each tick; parent sends `SIGCONT` to run one unit, then `wait4(WUNTRACED)` confirms the stop and collects CPU time |
| **Pipe** | POSIX pipes | Parent sends `EXECUTE_UNITS(1)` per tick; child executes unit of work and acks via pipe |

Both backends produce **identical** traces to pure simulation and the C reference engine.

## Architecture

```
Browser (React + TypeScript)
  ├── POST /api/run   {processes, algo, live:false} -> precomputed trace (simulate)
  └── POST /api/live  {processes, algo, live:true, ipc:"signal"} -> NDJSON stream
         │
Node.js (server.js, WSL2)
  └── cp.spawn(scheduler_cpp --mode live --ipc signal --ndjson)
         │
C++17 engine (engine-cpp/, WSL2)
  ├─ Event Pipeline: CompositeEventSink (TerminalSink + NdjsonSink + TraceSink)
  ├─ IWorkerBackend interface
  │   ├─ SignalBackend: fork(), raise(SIGSTOP), SIGCONT, wait4(WUNTRACED)
  │   └─ PipeBackend: fork(), pipe(), EXECUTE_UNITS, UNITS_DONE
  ├─ Process isolation: setpgid(), PR_SET_PDEATHSIG, alarm(2) watchdog
  └─ Resource accounting: wait4() rusage for exact user/sys CPU time and RSS
         │
Real-time NDJSON stream:
  t=  0 ARRIVE   P1 fork() -> os_pid 468193, child stopped (T)
  t=  0 DISPATCH P1 kill(468193,SIGCONT) ready=[]
  t=  0 RUN      P1 os_pid 468193 tick 1/3
  t=  2 PREEMPT  P1 wait4 -> stopped by SIGSTOP, quantum expired
  t=  5 EXIT     P1 wait4 -> exited 0, cpu 0.22 ms, max_rss 2.3 MB
  t=  5 CLEANUP  kill(-pgid,SIGKILL) live=0 reaped 2/2 zombies 0
```

## Scheduling Algorithms

| Algorithm | Mode | Selection Rule |
|-----------|------|----------------|
| **FCFS** | Non-preemptive | Arrival order |
| **SJF** | Non-preemptive | Shortest burst |
| **SRTF** | Preemptive | Shortest remaining time |
| **Priority** | Non-preemptive | Lowest priority number |
| **Priority-P** | Preemptive | Lowest priority number |
| **Round Robin** | Preemptive | FIFO + configurable quantum |

## Test Results

Measured with current test suites in WSL2:

| Suite | Count | Status |
|-------|-------|--------|
| C++ Engine Unit Tests (`bin/run_tests`) | 40 | PASS |
| Linux Process Tests (`bin/run_linux_tests`) | 19 | PASS |
| Fixture Validation Tests (`tools/run-tests.js`) | 40 | PASS |
| Robustness Tests (`tools/robustness-test.sh`) | 17/17 | PASS |
| Differential Tests (`tools/diff-test.js`, 4 engines) | 300+ runs | 0 mismatches |

Robustness coverage includes:
- `SIGINT` (exit 130) and `SIGTERM` (exit 143) with verified zero leaked processes
- `SIGKILL` of parent and `SIGKILL` of child process
- Hung child watchdog (`alarm(2)`)
- 64 processes concurrent execution
- Total burst limit > 5000 rejection
- 20 back-to-back live runs with clean process group reaping

## CLI Usage

```bash
# Simulate mode (fast, deterministic virtual ticks)
./bin/scheduler_cpp --algo fcfs --input fixtures/fcfs_textbook/input.txt

# Live mode with signal backend (real fork, SIGSTOP/SIGCONT)
./bin/scheduler_cpp --algo fcfs --input fixtures/fcfs_textbook/input.txt --mode live --ipc signal

# Live mode with pipe backend
./bin/scheduler_cpp --algo rr --quantum 2 --input fixtures/rr_q2/input.txt --mode live --ipc pipe

# Terminal visual experience (header, live Gantt, process table, metrics)
./bin/scheduler_cpp --algo rr --quantum 2 --input fixtures/rr_q2/input.txt --mode live --ipc signal --tick-ms 200

# Stream NDJSON events for consumers
./bin/scheduler_cpp --algo fcfs --input fixtures/fcfs_textbook/input.txt --mode live --ndjson

# Compare all 6 algorithms
./bin/scheduler_cpp --compare --input fixtures/sjf_basic/input.txt --quantum 4
```

### Flags

| Flag | Values | Description |
|------|--------|-------------|
| `--algo` | fcfs, sjf, srtf, priority, priority-p, rr | Scheduling algorithm |
| `--input` | path | Input file (`pid arrival burst priority` per line) |
| `--quantum` | N | Quantum (required for rr) |
| `--context-switch` | 0-100 | Context switch cost in ticks |
| `--mode` | simulate, live | Live = fork real child worker processes |
| `--ipc` | signal, pipe | IPC mechanism for live mode |
| `--work-us` | 0-100000 | Busywork microseconds per tick in child (default 200) |
| `--tick-ms` | 0-1000 | Parent sleeps N ms per tick for visual demo (default 0) |
| `--log` | flag | Print human-readable live output to stderr |
| `--ndjson` | flag | Stream NDJSON events to stdout |
| `--out` | path | Write trace JSON to file instead of stdout |
| `--compare` | flag | Run all 6 algorithms |

## 3-Window Live Demo

To observe POSIX process transitions in real-time:

1. **Terminal 1 (WSL2):** Start the server
   ```bash
   node server.js
   ```
2. **Terminal 2 (WSL2):** Monitor child worker processes
   ```bash
   watch -n 0.1 'ps -o pid,ppid,pgid,stat,etime,comm --ppid $(pgrep -o scheduler_cpp 2>/dev/null) 2>/dev/null'
   ```
3. **Browser / Terminal 3:**
   - In Browser: Open **http://localhost:3000**, enable **Real Process Mode**, set IPC to **Signals**, Tick Length to **200ms**, and click **Run live**.
   - Or in CLI: Run `./bin/scheduler_cpp --algo rr --quantum 2 --input fixtures/rr_q2/input.txt --mode live --tick-ms 200`.

Watch `STAT T` (stopped by `SIGSTOP`) for ready processes flip to `R` (running via `SIGCONT`) during their dispatch quantum.

## Project Structure

```
engine/          C11 reference engine (differential testing baseline)
engine-cpp/      C++17 engine with live POSIX process management
  include/
    common/       Event types, IEventSink interface
    parser/       Input file parser
    scheduler/    Simulation loop, ExecutionController
    process/      IWorkerBackend, SignalBackend, PipeBackend, ProcessManager
    ipc/          Pipe RAII, IPC protocol
    metrics/      Metrics computation
    trace/        TerminalSink, NdjsonSink, TraceWriter
  src/            Engine implementations
  tests/          40 unit tests + 19 Linux process tests
web/              React 18 + TypeScript + Vite frontend
server.js         Node.js HTTP & NDJSON streaming bridge
tools/            Test runners, differential tests, robustness test harness
fixtures/         Scenario fixtures with expected traces
docs/             Documentation
```

## Documentation
- [API Contract](docs/API_CONTRACT.md)
- [WSL2 Setup](docs/WSL_SETUP.md)
- [Viva Notes](docs/VIVA_NOTES.md)
- [Known Limitations](docs/KNOWN_LIMITATIONS.md)
- [Algorithm Notes](docs/ALGORITHMS.md)
