# OS Scheduler — CPU Scheduling Simulator

A single-core CPU scheduling simulator built for an OS course lab project.

## Features
- **6 algorithms**: FCFS, SJF, SRTF, Priority, Priority-Preemptive, Round Robin
- **Context-switch cost** modeling
- **Compare mode**: run all 6 algorithms side-by-side
- **Interactive viewer**: Gantt chart, CPU panel, ready queue, process table, metrics
- **Live editor**: type tasks, click Run — see results instantly

## Quick Start

### Build the engine
```powershell
# Windows (PowerShell)
powershell -File engine/build.ps1
```
```bash
# Linux
make -C engine
```

### Run a simulation
```bash
bin/scheduler --algo fcfs --input fixtures/fcfs_textbook/input.txt
bin/scheduler --algo rr --quantum 2 --input fixtures/rr_q2/input.txt
bin/scheduler --compare --input fixtures/sjf_basic/input.txt
```

### Open the viewer (static)
Open `viewer/index.html` by double-click in your browser.

### Run with live editor (recommended for demo)
```bash
node server.js
# then open http://localhost:3000
```

## Project Structure
```
engine/src/      C source files (parser, sim, metrics, trace, main)
engine/tests/    Parser unit test
viewer/          HTML/CSS/JS frontend
tools/           Test runner and sample generator
fixtures/        7 hand-computed test cases
fixtures-invalid/ 8 invalid input files
docs/            Design and algorithm notes
```

## CLI Reference
```
scheduler --algo <fcfs|sjf|srtf|priority|priority-p|rr>
          --input <file>
          [--quantum N]          # required for rr
          [--context-switch N]   # default 0, range 0..100
          [--out file.json]      # write JSON to file, table to stdout
          [--compare]            # run all 6 algorithms
```

## Running Tests
```bash
node tools/run-tests.js            # all fixtures + invalid inputs + compare
node tools/run-tests.js --only rr_q2   # single fixture
```

## Web UI (Scheduler Studio)

A React + TypeScript frontend with live editing, animated Gantt chart, and real-time simulation panels.

### Prerequisites
- Node.js 18+
- The C engine built and available as `bin/scheduler` or `bin/scheduler.exe`

### Build and run

```bash
# 1. Build the engine
powershell -File engine/build.ps1      # Windows
make -C engine                          # Linux/macOS

# 2. Build the web UI
cd web && npm install && npm run build && cd ..

# 3. Start the server (serves both the API and web/dist)
node server.js
# Open http://localhost:3000
```

### Development mode

Start the server in one terminal, then in another:

```bash
cd web && npm run dev
# Open http://localhost:5173 (Vite proxies /api to localhost:3000)
```

### What `viewer/` is

The original `viewer/` folder is a zero-dependency fallback that works by double-clicking `viewer/index.html`. It does not require Node.js or a build step. The new `web/` UI is recommended for the live demo.
