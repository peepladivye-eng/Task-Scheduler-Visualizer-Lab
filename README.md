# CPU Scheduler Visualizer Lab

A Linux-backed CPU Scheduling and Process Management Laboratory.

**Demonstrates:** real `fork()` process creation, POSIX pipe IPC, `waitpid()` cleanup, and 6 scheduling algorithms visualized through a React frontend.

## Quick Start (Windows — simulate mode)

```powershell
# 1. Build the C++ engine (Windows)
cd engine-cpp
.\build.ps1

# 2. Build the frontend
cd ..\web
npm install
npm run build

# 3. Start the server
cd ..
node server.js
```
Open **http://localhost:3000**

## Quick Start (WSL2 — live mode with real PIDs)

```bash
# 1. Build the C++ engine (Linux)
cd engine-cpp
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel

# 2. Build the frontend
cd ../web && npm install && npm run build && cd ..

# 3. Start the server inside WSL2
node server.js
```
Open **http://localhost:3000** — toggle **Live mode** in the UI to see actual OS PIDs.

## Architecture

```
Browser (React)
  ↓ POST /api/run  {processes, algo, live:true}
Node.js (server.js)
  ↓ spawn(scheduler_cpp, --mode live, ...)
C++17 engine (engine-cpp/)
  ├─ Tick-based scheduler (simulation.cpp)
  ├─ ProcessManager: fork() one child per process
  ├─ IPC: POSIX pipes (Instruction ↔ Acknowledgement)
  └─ waitpid() to reap all workers
  → stdout: JSON trace with os_pid fields
Node.js → response → React → Gantt + metrics + OS PID table
```

## Scheduling Algorithms
| Algorithm | Mode | Selection Rule |
|-----------|------|---------------|
| FCFS | Non-preemptive | Arrival order |
| SJF | Non-preemptive | Shortest burst |
| SRTF | Preemptive | Shortest remaining time |
| Priority | Non-preemptive | Lowest priority number |
| Priority-P | Preemptive | Lowest priority number |
| Round Robin | Preemptive | FIFO + configurable quantum |

## Test Results

| Suite | Count | Status |
|-------|-------|--------|
| C++ engine unit tests | 40 | ✅ PASS |
| Fixture tests (C++ engine) | 40 | ✅ PASS |
| Linux process tests (WSL2) | 13 | ✅ PASS |
| Web app tests | 42 | ✅ PASS |

## Project Structure

```
engine/          Legacy C11 engine (kept for reference)
engine-cpp/      C++14/17 engine with Linux process management
  include/
    common/      Types, constants
    parser/      Input parser
    scheduler/   Simulation loop, execution controller
    process/     ProcessManager, ProcessRegistry, ChildWorker
    ipc/         Pipe RAII, IPC protocol
    metrics/     Metrics computation
    trace/       JSON output
  src/           Implementations
  tests/         Unit tests + Linux integration tests
web/             React 18 + TypeScript + Vite frontend
server.js        Node.js HTTP bridge
fixtures/        7 test scenarios with expected output
docs/            Architecture, API contract, viva Q&A, WSL setup
```

## Documentation
- [Architecture Decisions](docs/ARCHITECTURE_DECISIONS.md)
- [API Contract](docs/API_CONTRACT.md)
- [WSL2 Setup](docs/WSL_SETUP.md)
- [Viva Questions](docs/VIVA_QUESTIONS.md)
- [Known Limitations](docs/KNOWN_LIMITATIONS.md)
