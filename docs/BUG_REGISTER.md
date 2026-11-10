# Bug Register
**Project:** Task Scheduler Visualizer Lab  
**Date:** 2026-11-10  
**Status at audit:** All 82 existing tests passing  

---

## Active Bugs (Pre-Migration)

### BUG-001 — Gantt chart segments invisible on first render
**Severity:** HIGH (visual, main feature broken)  
**Status:** Partially fixed — still intermittent  
**Component:** `web/src/components/Workbench.tsx`  
**Root cause:** `ResizeObserver` fires after the inner div has already expanded to fit its `totalWidth` content, causing a circular measurement loop. `containerWidth` ends up equal to `totalWidth` from the previous render instead of the available viewport width.  
**Current fix:** `offsetWidth` measurement + `overflow: hidden` constraint on the ref div. Segments now render, but the fix may still have edge cases on first mount before ResizeObserver fires.  
**Verification:** Manual browser test + visual inspection.

### BUG-002 — CompareView table blank cells for some algorithms
**Severity:** MEDIUM  
**Status:** Fixed in commit `895ab87`  
**Component:** `web/src/components/CompareView.tsx`  
**Root cause:** TypeScript `as const` on `TABLE_METRICS` made key types too narrow for the runtime `run.metrics[key]` lookup, returning `undefined` silently.  
**Fix:** Changed to explicit `keyof Metrics` typing.

### BUG-003 — engine/tests/parser_test.c not wired to test runner
**Severity:** LOW  
**Status:** Open  
**Component:** `engine/tests/parser_test.c`  
**Description:** The file exists but is not referenced by `tools/run-tests.js` or `engine/Makefile`. It may contain outdated assertions.  
**Action:** Inspect and wire up during Phase 1.

---

## Known Limitations (By Design)

### LIM-001 — No real Linux process creation
**Description:** The existing C engine is a pure tick-based simulator. No `fork()`, no real PIDs, no IPC.  
**Resolution:** This is the core migration target (Phases 2–3).

### LIM-002 — No health endpoint
**Description:** `pingEngine()` in `api.ts` does a full simulation as a health check. No dedicated `/api/health` route.  
**Resolution:** Add `/api/health` in Phase 4.

### LIM-003 — Presets baked in at build time
**Description:** `tools/gen-presets.js` runs the C engine at build time and bakes traces into `presets.generated.ts`. These are presented as sample data in offline mode but visually indistinguishable from live execution.  
**Resolution:** Label clearly as sample data in Phase 5. Keep presets as form-fill templates only.

### LIM-004 — No session management
**Description:** Every `/api/run` call is stateless. No session IDs, no cancellation, no concurrent isolation.  
**Resolution:** Add session management in Phase 4.

### LIM-005 — No streaming
**Description:** The backend waits for the entire engine execution before responding. For long simulations this could time out.  
**Resolution:** Add SSE streaming in Phase 4 (after request-response works).

### LIM-006 — Windows-only build currently
**Description:** `engine/build.ps1` and `engine/Makefile` produce a Windows `.exe`. The new C++ engine must target WSL2 Linux.  
**Resolution:** New CMake build in Phase 1; WSL2 integration in Phase 2.

---

## Bugs Introduced During V3 UI Enhancement (Pre-Audit)

### BUG-004 — Tour component spotlight uses radial-gradient approximation
**Severity:** LOW (cosmetic)  
**Status:** Open  
**Component:** `web/src/components/Tour.tsx`  
**Description:** The spotlight cutout uses `radial-gradient` which does not create a true cutout hole. It approximates the effect with a gradient blend.  
**Action:** Acceptable for initial release; can be improved with SVG mask.

### BUG-005 — PredictPanel only shows when CPU is idle
**Severity:** LOW  
**Status:** Open (by design but limiting)  
**Component:** `web/src/components/PredictPanel.tsx`  
**Description:** The predict panel requires `derived.running === null` to appear. If a trace has no idle CPU gaps (100% utilization), it never shows.  
**Action:** Consider triggering on dispatch events instead.

