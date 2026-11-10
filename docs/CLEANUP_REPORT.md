# Cleanup Report

## Status: Phase 0 (Documentation only — no files deleted yet)
Removals will be performed after the cpp-migration branch is merged to main
and all acceptance criteria are verified.

## Files Identified for Removal (AFTER merge verification)

### Legacy C engine — DEPRECATE → REMOVE after Gate 3 verified
| File | Replacement | Why |
|------|------------|-----|
| engine/src/main.c | engine-cpp/src/main.cpp | C++ entry point |
| engine/src/sim.c | engine-cpp/src/scheduler/simulation.cpp | C++ tick loop |
| engine/src/sim.h | engine-cpp/include/scheduler/simulation.hpp | |
| engine/src/parser.c | engine-cpp/src/parser/input_parser.cpp | |
| engine/src/parser.h | engine-cpp/include/parser/input_parser.hpp | |
| engine/src/process.h | engine-cpp/include/common/types.hpp | |
| engine/src/metrics.c | engine-cpp/src/metrics/metrics.cpp | |
| engine/src/metrics.h | engine-cpp/include/metrics/metrics.hpp | |
| engine/src/trace.c | engine-cpp/src/trace/trace_writer.cpp | |
| engine/src/trace.h | engine-cpp/include/trace/trace_writer.hpp | |
| engine/Makefile | engine-cpp/CMakeLists.txt | |
| engine/build.ps1 | engine-cpp/build.ps1 | |

**Removal condition:** `node tools/run-tests.js --binary bin/scheduler_cpp` returns 40/40

### Legacy viewer — DEPRECATE → REMOVE after frontend verified
| File | Why |
|------|-----|
| viewer/ (entire directory) | Superseded by web/dist (React app). server.js falls back to it only when web/dist missing. |

**Removal condition:** `web/dist/index.html` exists and app serves correctly from it.

### Legacy components (already superseded in web/src)
| File | Status |
|------|--------|
| web/src/components/Gantt.tsx | Superseded by Workbench.tsx — verify no imports before delete |
| web/src/components/TopBar.tsx | Superseded by Header.tsx — verify no imports |
| web/src/components/EngineBanner.tsx | Legacy — verify no imports |
| web/src/App.css | Replaced by Tailwind — verify empty/unused |

### Bin directory artifacts
| File | Why |
|------|-----|
| bin/metrics.o, bin/sim.o, bin/trace.o | Stale object files from old build — not needed |
| bin/parser_test.exe | Old standalone test binary |

## Dependencies to audit
| Package | Status |
|---------|--------|
| @radix-ui/react-slider | Not found in component scan — likely unused |
| @number-flow/react | Verify usage or remove |

## Retained Legacy Components (intentionally kept)
| File | Reason |
|------|--------|
| fixtures/ (all) | Test data for all algorithms — permanent |
| fixtures-invalid/ (all) | Negative test cases — permanent |
| docs/ALGORITHMS.md | Still accurate algorithm reference |
| web/src/lib/explain.ts | Explain engine still provides educational value |
| All React UI components | Polished visualization layer — keep |

## Verification Results (Phase 7)
| Suite | Result |
|-------|--------|
| C engine (original) | 40/40 PASS |
| C++ engine fixture tests | 40/40 PASS |
| C++ unit tests | 40/40 PASS |
| Linux process tests (WSL2) | 13/13 PASS |
| Web app tests | 42/42 PASS |
| TypeScript check | CLEAN |
| Production build | CLEAN (478 kB JS) |
