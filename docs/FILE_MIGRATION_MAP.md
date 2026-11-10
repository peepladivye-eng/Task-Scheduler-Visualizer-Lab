# File Migration Map
**Project:** Task Scheduler Visualizer Lab  
**Date:** 2026-11-10  

Classifications: **KEEP** | **MODIFY** | **DEPRECATE** | **REMOVE**

---

## Root Level

| File | Classification | Reason |
|------|---------------|--------|
| `server.js` | **MODIFY** | Adapt to call C++ WSL2 binary; add health endpoint, session management |
| `README.md` | **MODIFY** | Update for new architecture after Phase 8 |
| `structure.txt` | **REMOVE** | Untracked scratch file, no production use |
| `.gitignore` | **MODIFY** | Add `engine-cpp/build/` and WSL2 binary paths |

---

## Engine — C (`engine/`)

| File | Classification | Reason |
|------|---------------|--------|
| `engine/src/main.c` | **DEPRECATE** | Replaced by `engine-cpp/src/main.cpp` after Phase 3 Gate passes |
| `engine/src/sim.c` | **DEPRECATE** | Algorithms re-implemented in C++; kept until Gate 3 verified |
| `engine/src/sim.h` | **DEPRECATE** | Same |
| `engine/src/parser.c` | **DEPRECATE** | Re-implemented in C++; kept until Gate 1 verified |
| `engine/src/parser.h` | **DEPRECATE** | Same |
| `engine/src/process.h` | **DEPRECATE** | Replaced by `engine-cpp/include/common/types.hpp` |
| `engine/src/metrics.c` | **DEPRECATE** | Re-implemented in C++; kept until Gate 1 verified |
| `engine/src/metrics.h` | **DEPRECATE** | Same |
| `engine/src/trace.c` | **DEPRECATE** | Re-implemented in C++; kept until Gate 1 verified |
| `engine/src/trace.h` | **DEPRECATE** | Same |
| `engine/src/tests/parser_test.c` | **MODIFY** | Wire to test runner; migrate assertions to C++ test suite |
| `engine/Makefile` | **DEPRECATE** | Replaced by CMake; kept for Windows fallback until WSL2 verified |
| `engine/build.ps1` | **DEPRECATE** | Replaced by CMake; kept for Windows fallback until WSL2 verified |

**Removal trigger for entire `engine/` directory:** Gate 3 passes (all algorithms work with real workers and produce correct traces). Tests must confirm the C++ engine matches all 7 fixture expected outputs before the C engine is removed.

---

## C++ Engine — New (`engine-cpp/`) — TO BE CREATED

| Path | Classification | Contents |
|------|---------------|---------|
| `engine-cpp/CMakeLists.txt` | **CREATE** | C++17 build config |
| `engine-cpp/include/common/types.hpp` | **CREATE** | ProcessInfo, EventRecord, SegmentRecord, Metrics |
| `engine-cpp/include/common/constants.hpp` | **CREATE** | MAX_PROCS, limits |
| `engine-cpp/include/common/errors.hpp` | **CREATE** | Error types |
| `engine-cpp/include/parser/input_parser.hpp` | **CREATE** | Port of `parser.c` |
| `engine-cpp/include/scheduler/scheduler.hpp` | **CREATE** | Abstract scheduler interface |
| `engine-cpp/include/scheduler/fcfs.hpp` | **CREATE** | FCFS algorithm |
| `engine-cpp/include/scheduler/sjf.hpp` | **CREATE** | SJF algorithm |
| `engine-cpp/include/scheduler/srtf.hpp` | **CREATE** | SRTF algorithm |
| `engine-cpp/include/scheduler/priority.hpp` | **CREATE** | Priority (non-preemptive) |
| `engine-cpp/include/scheduler/round_robin.hpp` | **CREATE** | Round Robin |
| `engine-cpp/include/process/process_manager.hpp` | **CREATE** | fork() management |
| `engine-cpp/include/ipc/pipe_manager.hpp` | **CREATE** | RAII pipe FD management |
| `engine-cpp/include/ipc/ipc_protocol.hpp` | **CREATE** | Message structs |
| `engine-cpp/include/execution/execution_controller.hpp` | **CREATE** | Coordinates scheduler + workers |
| `engine-cpp/include/metrics/metrics.hpp` | **CREATE** | Port of `metrics.c` |
| `engine-cpp/include/trace/trace_writer.hpp` | **CREATE** | Port of `trace.c`; v2.0 JSON |
| `engine-cpp/src/main.cpp` | **CREATE** | CLI entry point |
| `engine-cpp/tests/` | **CREATE** | C++ unit + integration tests |

---

## Fixtures and Test Data

| File | Classification | Reason |
|------|---------------|--------|
| `fixtures/*/input.txt` (7) | **KEEP** | Input data for algorithm tests; reused in C++ test suite |
| `fixtures/*/expected.json` (7) | **KEEP** | Ground truth; C++ engine must match these exactly |
| `fixtures-invalid/*.txt` (8) | **KEEP** | Invalid input test cases; reused for C++ parser tests |

---

## Tools

| File | Classification | Reason |
|------|---------------|--------|
| `tools/run-tests.js` | **MODIFY** | Add WSL2 binary path detection; add new C++ event type tests |
| `tools/validate-trace.js` | **MODIFY** | Extend to validate new v2.0 fields (os_pid, new event types) |
| `tools/gen-presets.js` | **MODIFY** | Detect WSL2 vs Windows binary; label preset output as sample data |
| `tools/gen-samples.js` | **KEEP** | Still useful for generating fixture inputs |

---

## Viewer (Legacy)

| File | Classification | Reason |
|------|---------------|--------|
| `viewer/index.html` | **DEPRECATE** | Used as fallback by `server.js` when `web/dist` missing. Remove after Phase 5 Gate when React frontend is verified as sole UI. |
| `viewer/*.js` `viewer/*.css` | **DEPRECATE** | Same |

**Removal trigger:** React frontend consistently serves correctly from `web/dist`. `server.js` fallback code removed and verified.

---

## Frontend (`web/src/`)

### Components

| Component | Classification | Reason |
|-----------|---------------|--------|
| `Workbench.tsx` | **MODIFY** | Add OS PID display column; fix remaining resize bug |
| `CpuCard.tsx` | **KEEP** | Shows running process; will show real OS PID |
| `ReadyQueue.tsx` | **KEEP** | Shows ready queue; unchanged |
| `Narrator.tsx` | **KEEP** | Explains decisions; will use new event types |
| `ProcessTable.tsx` | **MODIFY** | Add OS PID column |
| `EventLog.tsx` | **MODIFY** | Display new event types (PROCESS_CREATED, WORKER_TERMINATED, etc.) |
| `MetricsCards.tsx` | **KEEP** | Metrics display; unchanged |
| `Transport.tsx` | **KEEP** | Playback controls; unchanged |
| `ScenarioBar.tsx` | **KEEP** | Algorithm selection; unchanged |
| `TaskEditor.tsx` | **MODIFY** | Add explicit "Create Processes" button; show creation status and OS PIDs |
| `Header.tsx` | **KEEP** | Nav; minor updates |
| `Appearance.tsx` | **KEEP** | Theme controls |
| `CommandPalette.tsx` | **KEEP** | Useful; unchanged |
| `CompareView.tsx` | **KEEP** | Fixed; unchanged |
| `RaceView.tsx` | **KEEP** | Useful; unchanged |
| `ResultsPanel.tsx` | **KEEP** | Useful; unchanged |
| `PredictPanel.tsx` | **KEEP** | Teaching feature |
| `Tour.tsx` | **KEEP** | Onboarding; update tour text for new features |
| `Gantt.tsx` | **DEPRECATE** | Legacy component superseded by `Workbench.tsx` |
| `TopBar.tsx` | **DEPRECATE** | Legacy; superseded by `Header.tsx` |
| `EngineBanner.tsx` | **DEPRECATE** | Legacy; check if imported anywhere before removing |

### Stores

| Store | Classification | Reason |
|-------|---------------|--------|
| `useStudio.ts` | **MODIFY** | Add session management, OS PID fields, new event types |
| `useFocus.ts` | **KEEP** | Linked highlighting; unchanged |
| `useTheme.ts` | **KEEP** | Theme; unchanged |

### Libraries

| File | Classification | Reason |
|------|---------------|--------|
| `lib/api.ts` | **MODIFY** | Add health check, cancellation, session endpoints |
| `lib/explain.ts` | **KEEP** | Still valid for the trace format |
| `lib/deriveState.ts` | **MODIFY** | Add OS PID derivation, new process states |
| `lib/timeScale.ts` | **KEEP** | Pixel math; unchanged |
| `lib/validate.ts` | **KEEP** | Client validation; unchanged |
| `lib/format.ts` | **KEEP** | Number formatting; unchanged |
| `lib/presets.generated.ts` | **MODIFY** | Label as sample data; keep as form-fill templates only |

### Types

| File | Classification | Reason |
|------|---------------|--------|
| `types/trace.ts` | **MODIFY** | Add `os_pid`, new event types, `ProcessState` enum |

---

## Documentation (`docs/`)

| File | Classification | Reason |
|------|---------------|--------|
| `docs/ALGORITHMS.md` | **KEEP** | Algorithm notes; accurate |
| `docs/DESIGN.md` | **MODIFY** | Update for new C++ architecture |
| `docs/VIVA_NOTES.md` | **MODIFY** | Extend with fork/IPC/Linux questions |
| `docs/REPOSITORY_AUDIT.md` | **CREATE** | ✅ This file |
| `docs/BUG_REGISTER.md` | **CREATE** | ✅ Created |
| `docs/FILE_MIGRATION_MAP.md` | **CREATE** | ✅ This file |
| `docs/ARCHITECTURE_DECISIONS.md` | **CREATE** | ✅ Next |
| `docs/CLEANUP_REPORT.md` | **CREATE** | Populated during each phase cleanup |
| `docs/ARCHITECTURE.md` | **CREATE** | Phase 8 |
| `docs/PROCESS_LIFECYCLE.md` | **CREATE** | Phase 8 |
| `docs/IPC_DESIGN.md` | **CREATE** | Phase 8 |
| `docs/API_CONTRACT.md` | **CREATE** | Phase 4 |
| `docs/VIVA_QUESTIONS.md` | **CREATE** | Phase 8 |
| `docs/WSL_SETUP.md` | **CREATE** | Phase 8 |
| `docs/KNOWN_LIMITATIONS.md` | **CREATE** | Phase 8 |

---

## npm Dependencies (`web/package.json`)

### Dependencies to KEEP (all are actively used)
`react`, `react-dom`, `zustand`, `framer-motion`, `lucide-react`, `@radix-ui/*`, `cmdk`, `clsx`, `tailwind-merge`, `class-variance-authority`, `@fontsource/*`, `sonner`, `canvas-confetti`, `@number-flow/react`

### Dependencies to audit after migration
| Package | Status |
|---------|--------|
| `@radix-ui/react-slider` | Check if actually used (not found in component scan) |
| `canvas-confetti` | Used in ResultsPanel star rating logic? Verify. |
| `@number-flow/react` | Check actual usage vs standard number display |

### DevDependencies — all KEEP (build/test toolchain)

---

## Removal Verification Requirements

Before removing any DEPRECATE item:
1. `grep -r "import.*<filename>" web/src/` returns no results
2. `node tools/run-tests.js` passes 40/40
3. `npm test` passes 42/42 in `web/`
4. `npm run build` succeeds
5. Git diff reviewed and committed

