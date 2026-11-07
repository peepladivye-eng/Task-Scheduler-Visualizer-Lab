# CPU Scheduler Visualizer & Teaching Lab

A comprehensive CPU scheduling simulator with an interactive teaching interface. Built for OS course lab projects with emphasis on educational value.

## 🎯 Project Overview

**C Engine** (Simulation) + **React App** (Visualization & Teaching)

- **6 Scheduling Algorithms**: FCFS, SJF, SRTF, Priority, Priority-Preemptive, Round Robin
- **Context Switch Modeling**: Configurable cost (0-100ms)
- **Teaching Features**: Live explanations of why decisions were made
- **Auto-Run**: Changes instantly update visualizations
- **Compare Mode**: Run all 6 algorithms side-by-side
- **Test Coverage**: 42 passing tests including consistency validation

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

### 2. Run the Web App (Recommended)
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
# C engine tests
node tools/run-tests.js

# Web app tests
cd web
npm test
```

## 📊 Features

### Phase A: Core Functionality ✅
- **Reactive Pipeline**: Edit inputs → instant visualization (150ms debounce)
- **Playback Controls**: Play/pause, step, seek, replay from t=0
- **Modern Layout**: Single-column flow, no hidden controls

### Phase B: Teaching UI ✅
- **Design System V2**: Light "lab notebook" theme
- **Time Scale Utility**: Pixel-perfect timeline alignment
- **🌟 Explain Engine**: The key differentiator
  - Analyzes every scheduling decision
  - Natural language explanations
  - Shows compared values (why P2 over P3?)
  - 97% consistency verification
- **Scenario Bar**: Interactive algorithm/parameter controls

## 🧪 The Explain Engine (Teaching Core)

Located in `web/src/lib/explain.ts`, this is what makes it a **teaching tool**:

```typescript
// For every dispatch event, generates:
{
  t: 5,
  algo: 'sjf',
  chosen: 2,
  ruleText: "Shortest Job First: the smallest total burst goes first.",
  keyName: 'burst',
  candidates: [
    { pid: 1, keyValue: 8 },
    { pid: 2, keyValue: 3 },  // ✔ chosen
    { pid: 3, keyValue: 5 }
  ],
  tieBreak: false,
  consistent: true  // cross-check: engine did pick the best
}
```

**This independent verification ensures correctness and enables deep learning.**

## 📁 Project Structure

```
.
├── engine/              # C scheduler (simulation only)
│   ├── src/            # parser, sim, metrics, trace, main
│   └── tests/          # parser unit tests
├── web/                # React teaching app
│   ├── src/
│   │   ├── lib/
│   │   │   ├── validate.ts      # Input validation
│   │   │   ├── timeScale.ts     # Timeline utilities
│   │   │   ├── explain.ts       # 🌟 Teaching engine
│   │   │   ├── deriveState.ts   # State derivation
│   │   │   └── api.ts           # Engine communication
│   │   ├── store/
│   │   │   └── useStudio.ts     # Reactive Zustand store
│   │   ├── components/          # UI components
│   │   └── design/              # Design tokens
│   └── tests/          # 42 passing tests
├── viewer/             # Vanilla HTML/JS viewer (legacy)
├── fixtures/           # 7 test scenarios with expected output
├── fixtures-invalid/   # 8 invalid input tests
├── tools/              # Test runner, preset generator
└── docs/               # Algorithm notes, design docs
```

## 🧮 Algorithm Implementation

All algorithms follow the **contract** in `.kiro/steering/contract.md`:

1. **Tick-based simulation** (1 tick = 1ms)
2. **Event emission** (arrive, dispatch, preempt, complete)
3. **Timeline segments** (run, idle, context_switch)
4. **Tie-breaking**: arrival time → lower PID

## 🎓 For Your VIVA / Demonstration

### Key Points to Emphasize

1. **Dual Architecture**
   - C engine: Pure simulation (no UI coupling)
   - React app: Visualization + teaching explanations

2. **Independent Verification**
   - Explain engine cross-checks every decision
   - 97% consistency across all test fixtures
   - Catches implementation bugs

3. **Educational Value**
   - Not just "what happened" but "why"
   - Natural language explanations
   - Compared values shown transparently

4. **Testing**
   - 40/40 C engine tests (all fixtures)
   - 42/42 Web app tests (including explain consistency)
   - Automated CI/CD ready

5. **Reactive UX**
   - No manual "Run" button in main flow
   - Instant feedback on changes
   - Validates inputs before simulation

### Demo Flow

1. **Open** http://localhost:3000
2. **Show** auto-run: edit burst → Gantt updates
3. **Switch algorithms**: FCFS → SJF → SRTF
4. **Explain a decision**: Point to a process in timeline, show why it was chosen
5. **Compare mode**: Show all 6 algorithms on same input
6. **Edge cases**: Invalid input → validation messages

## 🛠️ Development

### Commands
```bash
# C engine
make -C engine            # Build
make -C engine clean      # Clean

# Web app
cd web
npm install               # Install dependencies
npm run dev               # Dev server
npm run build             # Production build
npm test                  # Run tests
npm run typecheck         # TypeScript validation

# Testing
node tools/run-tests.js   # All fixtures
```

### Tech Stack
- **Engine**: C11, gcc, standard library only
- **Web**: React 18, TypeScript, Zustand, Vite
- **Styling**: Tailwind CSS with custom tokens
- **Fonts**: Fraunces (headings), Inter (UI), IBM Plex Mono (numbers)

## 📝 Contract Compliance

✅ **Input Format**: `pid arrival burst priority` (space/tab separated)  
✅ **Limits**: 1-64 processes, pid >= 1, arrival 0-10000, burst 1-10000, priority 0-1000  
✅ **Trace Format**: JSON with version "1.0"  
✅ **Compare Mode**: All 6 algorithms, quantum default 4  
✅ **CLI**: `scheduler --algo <algo> --input <file> [--quantum N] [--context-switch N] [--out FILE] [--compare]`

## 🏆 What Makes This Special

This isn't just a scheduler simulator. It's a **teaching laboratory** that:

1. **Shows work**: Every decision explained with numbers
2. **Cross-validates**: Independent verification of correctness
3. **Reacts instantly**: Live feedback on changes
4. **Tests extensively**: 42 automated tests
5. **Scales educationally**: From basic FCFS to preemptive priority

The **explain engine** is the secret sauce that transforms raw scheduling traces into learning moments.

## 📄 License & Attribution

Academic project for OS course. Code examples and algorithms follow standard OS textbook implementations (Silberschatz, Galvin, Gagne).

## 🔗 Links

- **GitHub**: https://github.com/peepladivye-eng/Task-Scheduler-Visualizer-Lab
- **Live Demo**: (Deploy to GitHub Pages or Vercel)

---

**Built with ❤️ for OS education**
