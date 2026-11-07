# CPU Scheduler Simulator

A CPU scheduling simulator with teaching features. Built for OS course lab projects.

## 🎯 Project Overview

**C Engine** (tick-based simulation) + **React App** (interactive visualization)

- **6 Scheduling Algorithms**: FCFS, SJF, SRTF, Priority (non-preemptive), Priority-Preemptive, Round Robin
- **Context Switch Modeling**: Configurable cost (0-100ms)
- **Explain Engine**: Independent verification that cross-checks every scheduling decision
- **Auto-Run**: Changes instantly update visualizations (150ms debounce)
- **Test Coverage**: 40 C engine tests + 42 web app tests, all passing

## 🚀 Quick Start

### 1. Build the C Engine
```powershell
# Windows (PowerShell)
cd engine
.\build.ps1
```
```bash
# Linux/Mac
make -C engine
```

### 2. Run the Web App
```bash
# Install dependencies (first time only)
cd web
npm install

# Build
npm run build

# Start server (from project root)
node server.js
```

Then open **http://localhost:3000**

### 3. Test Everything
```bash
# C engine tests (40 tests)
node tools/run-tests.js

# Web app tests (42 tests)
cd web
npm test
```

## 📊 Features

### Core Functionality
- **Reactive Pipeline**: Edit inputs → instant visualization with 150ms debounce
- **Playback Controls**: Play/pause, step forward/back, seek, auto-replay from t=0 when finished
- **Timeline Visualization**: Gantt chart showing run/idle/context-switch segments
- **Process Metrics**: Waiting time, turnaround time, response time, completion time
- **System Metrics**: CPU utilization, throughput, context switch count

### The Explain Engine
Located in `web/src/lib/explain.ts`, this module provides independent verification:

- Reads the C engine's output trace
- Applies scheduling rules independently
- Cross-checks every dispatch decision
- Shows which process was chosen and why
- Displays compared values (burst times, priorities, etc.)
- **100% consistency** verified across all 7 test fixtures

This independent cross-check ensures correctness and provides educational value by explaining *why* each scheduling decision was made.

## 📁 Project Structure

```
.
├── engine/              # C scheduler (simulation engine)
│   ├── src/            # parser, sim, metrics, trace, main
│   └── tests/          # parser unit tests
├── web/                # React visualization app
│   ├── src/
│   │   ├── lib/
│   │   │   ├── validate.ts      # Input validation
│   │   │   ├── timeScale.ts     # Timeline pixel calculations
│   │   │   ├── explain.ts       # Independent verification engine
│   │   │   ├── deriveState.ts   # Playback state derivation
│   │   │   └── api.ts           # Engine communication
│   │   ├── store/
│   │   │   └── useStudio.ts     # Reactive Zustand store with auto-run
│   │   ├── components/          # React UI components
│   │   └── design/              # Design tokens
│   └── tests/          # 42 tests including explain consistency
├── viewer/             # Legacy vanilla HTML/JS viewer
├── fixtures/           # 7 test scenarios with expected JSON output
├── fixtures-invalid/   # 8 invalid input test cases
├── tools/              # Test runner, preset generator, validators
└── docs/               # Algorithm notes, design documents
```

## 🧮 Algorithm Implementation

All algorithms follow the contract specification in `.kiro/steering/contract.md`:

1. **Tick-based simulation** (1 tick = 1ms)
2. **Event emission** (arrive, dispatch, preempt, complete) with ready queue snapshots
3. **Timeline segments** (run, idle, context_switch)
4. **Tie-breaking rules**: If key values tie → earliest arrival → lowest PID

### Selection Rules
- **FCFS**: Queue front (arrival order)
- **SJF**: Smallest burst time (non-preemptive)
- **SRTF**: Smallest remaining time (preemptive on arrival)
- **Priority**: Lowest priority number (non-preemptive)
- **Priority-P**: Lowest priority number (preemptive on arrival)
- **RR**: Queue front with quantum time slicing

## 🎓 For VIVA / Demonstration

### Key Technical Points

1. **Dual Architecture**
   - C engine: Pure simulation, no UI dependencies
   - React app: Visualization and explanation layer
   - Communication via JSON trace format (version "1.0")

2. **Independent Verification**
   - Explain engine independently applies scheduling rules
   - 100% consistency across all test fixtures
   - Catches implementation bugs through cross-validation

3. **Educational Value**
   - Shows not just *what* happened but *why*
   - Natural language rule descriptions
   - Compared candidate values displayed clearly

4. **Testing Strategy**
   - 40 C engine tests covering all algorithms and edge cases
   - 42 web app tests including consistency validation
   - Automated fixture comparison
   - Invalid input handling tests

5. **Reactive UX**
   - No manual "Run" button in main workflow
   - 150ms debounced auto-run on any change
   - Input validation before simulation

### Demo Flow

1. **Open** http://localhost:3000
2. **Edit inputs**: Change burst time → Gantt updates automatically
3. **Switch algorithms**: FCFS → SJF → SRTF → Priority → RR
4. **Observe metrics**: Watch waiting/turnaround/response times update
5. **Check explain consistency**: All dispatch decisions verified
6. **Test edge cases**: Try invalid inputs → see validation messages

## 🛠️ Development Commands

```bash
# C engine
cd engine
make                     # Build (Linux/Mac)
.\build.ps1              # Build (Windows)
make clean               # Clean build artifacts

# Web app
cd web
npm install              # Install dependencies
npm run dev              # Development server (Vite)
npm run build            # Production build
npm test                 # Run 42 tests
npm run typecheck        # TypeScript validation

# Full project testing
node tools/run-tests.js  # All 40 C engine tests
```

## 📝 Tech Stack

- **Engine**: C11, gcc, standard library only
- **Web**: React 18, TypeScript 5, Zustand (state), Vite (build)
- **Styling**: Tailwind CSS with custom design tokens
- **Fonts**: Fraunces (headings), Inter (UI), IBM Plex Mono (code/numbers)
- **Testing**: Vitest (web), custom validator (C)

## 📋 Contract Compliance

✅ **Input Format**: `pid arrival burst priority` (space/tab separated)  
✅ **Limits**: 1-64 processes, pid ≥ 1 (unique), arrival 0-10000, burst 1-10000, priority 0-1000  
✅ **Trace Format**: JSON with version "1.0", exact key order per contract  
✅ **CLI**: `scheduler --algo <algo> --input <file> [--quantum N] [--context-switch N] [--out FILE] [--compare]`  
✅ **Tie-breaking**: Earliest arrival → lowest PID  
✅ **Metrics**: Exactly 2 decimal places for floating-point values

## 🏆 What Makes This Project Valuable

1. **Correctness through verification**: The explain engine independently validates every decision
2. **Educational focus**: Shows the *reasoning* behind scheduling choices
3. **Comprehensive testing**: 82 automated tests ensure reliability
4. **Clean architecture**: Separation of simulation (C) and visualization (React)
5. **Contract adherence**: Strict compliance with specification

## 📄 License & Attribution

Academic project for Operating Systems course. Algorithm implementations follow standard OS textbook approaches (Silberschatz, Galvin, Gagne).

## 🔗 Repository

- **GitHub**: https://github.com/peepladivye-eng/Task-Scheduler-Visualizer-Lab

---

**Test Results (as of last run):**
- C engine: 40/40 passing
- Web app: 42/42 passing  
- Explain consistency: 100% (29/29 dispatch decisions verified)
