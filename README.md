# CPU Scheduler Visualizer Lab

A Linux/WSL2-backed CPU Scheduling and Process Management Laboratory.

**Demonstrates:** real `fork()` process creation, `SIGSTOP`/`SIGCONT` signal-based scheduling, POSIX pipe IPC, `waitpid()`/`wait4()` cleanup, and 6 scheduling algorithms visualized through a React frontend.

## Quick Start (WSL2 — required for live mode)

```bash
# 1. Build the C++ engine
cd engine-cpp
cmake -S . -B build
cmake --build build --parallel

# 2. Build the C reference engine
make -C engine

# 3. Build the frontend
cd ../web && npm install && npm run build && cd ..

# 4. Start the server inside WSL2
node server.js
```
Open **http://localhost:3000** — toggle **Real Process Mode** in the UI to fork real child processes.

## Two Backends

| Backend | IPC | How it works |
|---------|-----|-------------|
| **Signal** (default) | `SIGSTOP`/`SIGCONT` | Child self-stops after each tick; parent sends SIGCONT to run one unit, then `wait4(WUNTRACED)` confirms the stop |
| **Pipe** | POSIX pipes | Parent sends `EXECUTE_UNITS(1)` per tick; child acks via pipe |

Both backends produce **identical** traces to pure simulation and the C reference engine.

## Architecture

```
Browser (React)
  ↓ POST /api/run  {processes, algo, live:true, ipc:"signal"}
Node.js (server.js)
  ↓ spawn(scheduler_cpp --mode live --ipc signal --log)
C++17 engine (engine-cpp/)
  ├─ Tick-based scheduler (simulation.cpp) — deterministic trace
  ├─ IWorkerBackend interface
  │   ├─ SignalBackend: fork(), raise(SIGSTOP), SIGCONT, wait4(WUNTRACED)
  │   └─ PipeBackend: fork(), pipe(), EXECUTE_UNITS, UNITS_DONE
  ├─ Process groups + PR_SET_PDEATHSIG for cleanup
  └─ wait4() with rusage for CPU time and memory stats
  → stdout: JSON trace with os_pid fields
  → stderr: --log output (fork, SIGCONT, stopped, complete)
Node.js → response → React → Gantt + metrics + terminal log
```

## Scheduling Algorithms

| Algorithm | Mode | Selection Rule |
|-----------|------|----------------|
| FCFS | Non-preemptive | Arrival order |
| SJF | Non-preemptive | Shortest burst |
| SRTF | Preemptive | Shortest remaining time |
| Priority | Non-preemptive | Lowest priority number |
| Priority-P | Preemptive | Lowest priority number |
| Round Robin | Preemptive | FIFO + configurable quantum |

## Test Results

| Suite | Count | Status |
|-------|-------|--------|
| C++ engine unit tests | 40 | PASS |
| Linux process tests | 19 | PASS |
| Differential tests (4 engines x 500 workloads x 6 algos) | 6000 | 0 mismatches |
| Robustness tests (signal + pipe) | 14/14 | PASS |

## CLI Usage

```bash
# Simulate mode (fast, no real processes)
./bin/scheduler_cpp --algo fcfs --input data.txt

# Live mode with signal backend (real fork, SIGSTOP/SIGCONT)
./bin/scheduler_cpp --algo fcfs --input data.txt --mode live --ipc signal

# Live mode with pipe backend
./bin/scheduler_cpp --algo rr --quantum 2 --input data.txt --mode live --ipc pipe

# With log output (shows fork, SIGCONT, stop, complete in terminal)
./bin/scheduler_cpp --algo fcfs --input data.txt --mode live --ipc signal --log --tick-ms 200

# Compare all 6 algorithms
./bin/scheduler_cpp --compare --input data.txt --quantum 4
```

### Flags

| Flag | Values | Description |
|------|--------|-------------|
| `--algo` | fcfs, sjf, srtf, priority, priority-p, rr | Scheduling algorithm |
| `--input` | path | Input file (pid arrival burst priority per line) |
| `--quantum` | N | Required for rr |
| `--context-switch` | 0-100 | Context switch cost in ticks |
| `--mode` | simulate, live | Live = real fork() |
| `--ipc` | signal, pipe | IPC mechanism for live mode |
| `--work-us` | 0-100000 | CPU microseconds per tick in child (default 200) |
| `--tick-ms` | 0-1000 | Parent sleeps N ms per tick for visualization (default 0) |
| `--log` | flag | Print per-tick log to stderr |
| `--out` | path | Write JSON to file instead of stdout |
| `--compare` | flag | Run all 6 algorithms |

## Demo (3-window live demo)

**Window 1 (WSL):** `node server.js` (shows [engine] log lines)
**Window 2 (WSL):** `watch -n 0.2 'ps -o pid,ppid,pgid,stat,etime,comm --ppid $(pgrep -o scheduler_cpp)'`
**Window 3:** Browser http://localhost:3000, Real Process Mode ON, Signals, tick 400ms, Run live

Watch `STAT T` (stopped) for waiting tasks flip to `R` (running) for the dispatched one.

## Project Structure

```
engine/          C11 reference engine (differential testing only)
engine-cpp/      C++17 engine with real process management
  include/
    common/       Types, constants
    parser/       Input parser
    scheduler/    Simulation loop, execution controller
    process/      IWorkerBackend, SignalBackend, PipeBackend
    ipc/          Pipe RAII, IPC protocol
    metrics/      Metrics computation
    trace/        JSON output
  src/            Implementations
  tests/          Unit tests + Linux integration tests
web/              React 18 + TypeScript + Vite frontend
server.js         Node.js HTTP bridge
tools/            Test runners, differential tests, robustness tests
fixtures/         7 test scenarios with expected output
docs/             Documentation
```

## Documentation
- [API Contract](docs/API_CONTRACT.md)
- [WSL2 Setup](docs/WSL_SETUP.md)
- [Viva Notes](docs/VIVA_NOTES.md)
- [Known Limitations](docs/KNOWN_LIMITATIONS.md)
- [Algorithm Notes](docs/ALGORITHMS.md)
