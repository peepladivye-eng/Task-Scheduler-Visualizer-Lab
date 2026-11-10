# Repository Audit — Task Scheduler Visualizer Lab
**Date:** 2026-11-10  
**Branch:** main (`e0d34f4`)  
**Auditor:** Kiro  

---

## 1. Baseline Test Results

| Suite | Result |
|-------|--------|
| C engine (40 tests) | **40/40 PASS** |
| Web app (42 tests) | **42/42 PASS** |
| TypeScript check | **CLEAN** |
| Production build | **CLEAN** (469 kB JS, 66 kB CSS) |
| Explain consistency | **100%** (29/29 dispatch decisions) |

No existing failures. All baselines green before migration begins.

---

## 2. What the Repository Actually Contains

### Root level
| File / Dir | Description |
|------------|-------------|
| `server.js` | Node.js HTTP server: serves `web/dist` and exposes `POST /api/run` |
| `README.md` | Accurate description of current state |
| `structure.txt` | Untracked scratch file (no production use) |
| `bin/` | Compiled binary (`scheduler.exe` or `scheduler`) |
| `engine/` | **C11** scheduling engine (6 files) |
| `fixtures/` | 7 fixture directories with `input.txt` + `expected.json` |
| `fixtures-invalid/` | 8 invalid input files |
| `tools/` | Node.js test runner + validators + preset generators |
| `viewer/` | Legacy vanilla HTML/JS viewer (kept as fallback by `server.js`) |
| `web/` | React 18 + TypeScript + Vite frontend |
| `docs/` | 3 doc files: ALGORITHMS.md, DESIGN.md, VIVA_NOTES.md |
| `.kiro/` | Steering files (contract.md, rules) |

### C engine (`engine/src/`)
| File | Responsibility |
|------|---------------|
| `main.c` | CLI entry: flag parsing, orchestration |
| `parser.c/h` | Text file → `Process[]` with full validation |
| `process.h` | `Process` struct + `MAX_PROCS=64` |
| `sim.c/h` | Tick-based simulation loop, all 6 algorithms |
| `metrics.c/h` | Post-simulation metric computation |
| `trace.c/h` | JSON and table output writers |

**All scheduling logic is in `sim.c`.** There is no separate algo layer — FCFS, SJF, SRTF, Priority, Priority-P, RR are all `switch` cases inside `pick_best()`.

### Node backend (`server.js`)
- Single-file, no framework, ~180 lines
- One endpoint: `POST /api/run`
- Writes process data to a temp file, calls the binary via `cp.execFile()` (no shell)
- Returns raw stdout as JSON
- 5-second timeout
- No streaming, no session management, no health endpoint

### Frontend (`web/src/`)
| Path | Description |
|------|-------------|
| `App.tsx` | Root layout, renders all panels |
| `store/useStudio.ts` | Zustand store: processes, algo, playback, auto-run pipeline |
| `lib/api.ts` | `fetch` wrapper for `/api/run` |
| `lib/explain.ts` | Independent cross-check of scheduling decisions |
| `lib/deriveState.ts` | Derives UI state (running PID, ready queue, remaining) from trace + t |
| `lib/timeScale.ts` | Pixel math for Gantt |
| `lib/validate.ts` | Client-side input validation |
| `lib/format.ts` | Number formatters |
| `components/` | 17 React components (Workbench, CpuCard, ReadyQueue, Narrator, etc.) |
| `store/useFocus.ts` | PID hover-highlight store |
| `store/useTheme.ts` | Dark/light/accent theme store |
| `types/trace.ts` | TypeScript types for the JSON trace contract |

---

## 3. Current Architecture (Before Migration)

```
Browser (React) 
  ↓ POST /api/run  (JSON: {processes, algo, quantum, contextSwitch})
Node server.js
  ↓ cp.execFile(bin/scheduler.exe, args, {shell:false})
C11 engine (single binary)
  → stdout: JSON trace v1.0
Node server.js
  → response: raw JSON
Browser (React)
  → Zustand store → Workbench/Gantt/MetricsCards/etc.
```

**Key facts:**
- The C engine is a pure tick-based simulator. It does **not** use `fork()`, real PIDs, or any Linux process management.
- The frontend auto-runs on every edit (150ms debounce). Users never manually click "Run".
- The JSON trace v1.0 contract is the only API between all layers.

---

## 4. What the New Architecture Requires

```
Browser (React)
  ↓ POST /api/run  (same JSON contract, versioned)
Node bridge (server.js → adapted)
  ↓ spawn(cpp-engine, args, {shell:false})
C++17 engine (WSL2 Linux)
  → fork() real child processes
  → IPC via POSIX pipes
  → Scheduling coordination
  → stdout: JSON trace v2.0 (backward-compatible extension of v1.0)
Node bridge
  → response: JSON
Browser (React)
  → Same Zustand store + components (mostly unchanged)
  → NEW: display actual OS PIDs
  → NEW: show PROCESS_CREATED, WORKER_TERMINATED events
```

---

## 5. Identified Hardcoded Execution Paths

1. **`web/src/lib/presets.generated.ts`** — Generated at build time by `tools/gen-presets.js`. Contains full pre-computed trace JSON for 7 presets. Used as offline fallback when engine is unreachable.  
   **Status:** Must be labelled as sample data. Must NOT be presented as real Linux execution.

2. **`useStudio.ts` auto-run** — Triggers on every field edit. Acceptable pattern but must guard against presenting stale cached traces as fresh Linux execution after migration.

3. **`server.js` temp-file pattern** — Writes input to OS temp dir, runs binary. This pattern is reusable for the C++ engine with minor adaptations.

---

## 6. Existing API Contract (v1.0)

**Request** (`POST /api/run`):
```json
{
  "processes": [{"pid":1,"arrival":0,"burst":5,"priority":1}],
  "algo": "fcfs|sjf|srtf|priority|priority-p|rr|compare",
  "quantum": 4,
  "contextSwitch": 0
}
```

**Response** (trace v1.0):
```json
{
  "version": "1.0",
  "algo": "fcfs",
  "quantum": null,
  "context_switch_cost": 0,
  "processes": [{"pid":1,"arrival":0,"burst":5,"priority":1,"start":0,"completion":5,"waiting":0,"turnaround":5,"response":0}],
  "timeline": [{"t_start":0,"t_end":5,"pid":1,"type":"run"}],
  "events": [{"t":0,"type":"arrive","pid":1,"ready_queue":[1]}],
  "metrics": {"avg_waiting":0.00,"avg_turnaround":5.00,"avg_response":0.00,"cpu_utilization":100.00,"throughput":0.20,"context_switches":0}
}
```

The C++ engine must produce output backward-compatible with this contract, with additive new fields for `os_pid`, `events` new types, etc.

---

## 7. Risks and Issues

| # | Severity | Issue |
|---|----------|-------|
| R1 | HIGH | `fork()` only works on Linux/WSL2. The existing `bin/scheduler.exe` is a Windows binary. The C++ engine must be a separate WSL2 binary. |
| R2 | HIGH | `server.js` runs on Windows currently. It must be adapted to run inside WSL2 and call the Linux C++ binary. |
| R3 | MEDIUM | `presets.generated.ts` contains baked-in trace JSON from the Windows C engine. After migration, presets must clearly indicate they are sample data. |
| R4 | MEDIUM | `viewer/` directory is a legacy vanilla viewer. `server.js` falls back to it if `web/dist` doesn't exist. It must be retained for now but can be removed after the new frontend is verified. |
| R5 | LOW | `engine/tests/parser_test.c` exists but is not wired to `run-tests.js`. It may be outdated. |
| R6 | LOW | `tools/gen-presets.js` calls the Windows binary. After migration it must call the WSL2 binary or be adapted. |
| R7 | LOW | No health endpoint exists. `pingEngine()` in `api.ts` runs a full 1-process simulation as a health check — wasteful but functional. |

---

## 8. WSL2 Considerations

The existing development is entirely Windows (PowerShell, MinGW gcc, `scheduler.exe`).

The new C++ engine uses `fork()`, `pipe()`, `waitpid()` — Linux-only POSIX APIs.

**Migration strategy:**
- Keep the Windows C engine and `bin/scheduler.exe` operational during Phase 1 (porting algorithms to C++ without process management).
- Introduce WSL2 build system in Phase 2 (process manager).
- Do not attempt to run the Linux C++ binary from Windows PowerShell.
- Node.js backend must also move to WSL2 for Phases 2+.
- React frontend (Vite dev server or static build) can remain on Windows, accessed via `localhost` forwarding from WSL2.

