# Architecture Decisions
**Project:** Task Scheduler Visualizer Lab  
**Date:** 2026-11-10  

---

## ADR-001 — Keep the existing JSON trace contract as the communication layer

**Status:** Accepted  
**Context:** The frontend, backend, test runner, validator, and preset generator all depend on the v1.0 JSON trace schema.  
**Decision:** The C++ engine will produce backward-compatible v1.0 output. New fields (`os_pid` per process, new event types) are added additively. No existing field is renamed or removed.  
**Consequences:** Frontend changes are additive (read new fields). All 7 fixtures remain valid test cases. The explain engine continues to work without changes.

---

## ADR-002 — C++ engine replaces C engine incrementally, not all at once

**Status:** Accepted  
**Context:** The C engine is the only working simulation engine. Replacing it in one step risks breaking the entire application.  
**Decision:**  
- Phase 1: Build C++ engine for algorithms only (no fork). Verify it matches all 7 fixture expected outputs.  
- Phase 2: Add Linux process manager (fork, pipes, waitpid).  
- Phase 3: Connect scheduler to workers.  
- Only after Gate 3 passes is the C engine deprecated.  
**Consequences:** Both engines coexist temporarily. The C engine remains the production engine until the C++ engine passes all fixture tests.

---

## ADR-003 — Separate algorithm logic from process management in C++

**Status:** Accepted  
**Context:** The C engine puts all algorithm logic in one `sim.c` file. This is hard to test and extend.  
**Decision:** Each algorithm gets its own translation unit. A common `Scheduler` abstract base class defines the interface. The `ExecutionController` connects the scheduler to the `ProcessManager`.  
**Consequences:** Each algorithm can be unit-tested in isolation. Adding a new algorithm does not require modifying the core execution loop.

---

## ADR-004 — Use POSIX pipes for IPC, not shared memory or sockets

**Status:** Accepted  
**Context:** Multiple IPC mechanisms exist (shared memory, semaphores, sockets, pipes).  
**Decision:** Use POSIX pipes (anonymous pipes via `pipe()`).  
**Rationale:**  
- Pipes are the simplest mechanism for parent-child communication.  
- They integrate naturally with `fork()`.  
- No external setup required.  
- Appropriate for the small, fixed-size messages this application needs.  
- Demonstrates a core OS concept clearly for the viva.  
**Consequences:** Message size is limited. We define fixed-size structs for instructions and acknowledgements to avoid framing complexity.

---

## ADR-005 — Child workers perform bounded work units, not sleep-based timing

**Status:** Accepted  
**Context:** A naive implementation would use `sleep()` to simulate execution time.  
**Decision:** Child workers perform a configurable number of deterministic CPU iterations per unit. The number of iterations is chosen to be large enough to be meaningful but bounded to prevent runaway processes.  
**Rationale:** Demonstrates real CPU consumption. Keeps simulated time and wall-clock time conceptually separate. Prevents the application from lying about process execution.  
**Consequences:** Actual execution will be faster than the simulated time. This is documented explicitly in the UI.

---

## ADR-006 — Node.js backend moves to WSL2 for process management phases

**Status:** Accepted  
**Context:** `fork()` is a Linux system call. The C++ engine cannot run on Windows natively.  
**Decision:** From Phase 2 onward, both the Node backend and C++ engine run inside WSL2 Ubuntu. The React frontend can remain served from Windows (or WSL2) and accessed via localhost forwarding.  
**Consequences:** Developers need WSL2 installed. `server.js` must be adapted to find the Linux binary path. Build scripts must target WSL2 gcc/cmake.

---

## ADR-007 — The frontend must never silently fall back to mock execution

**Status:** Accepted  
**Context:** The current `useStudio.ts` has an offline mode that loads pre-baked traces from `presets.generated.ts`.  
**Decision:** After Phase 5, when the C++ backend is live:  
- Offline presets remain available as form-fill templates only.  
- When the backend is unreachable, display a clear error: "Engine offline — connect to WSL2 backend."  
- Never present a cached trace as a fresh Linux execution result.  
**Consequences:** UI requires the backend for actual scheduling. Demo mode shows labelled sample data, not live execution.

---

## ADR-008 — Retain the React frontend; do not build a terminal interface

**Status:** Accepted  
**Context:** The plan explicitly requires the existing frontend to be preserved.  
**Decision:** All new features are added to the React application. The terminal-style event log is a React component, not an actual terminal. The command palette, tour, Gantt chart, and animations are preserved.  
**Consequences:** The UI becomes richer. No features are removed without documented justification.

---

## ADR-009 — Use nlohmann/json for C++ JSON output

**Status:** Proposed (pending Phase 1)  
**Context:** The C engine uses hand-written `fprintf` JSON output. C++ needs a proper JSON library for correctness and maintainability.  
**Decision:** Use `nlohmann/json` (header-only, MIT license, widely used) if it is not already present. It has no external dependencies and integrates cleanly with CMake via `FetchContent`.  
**Alternatives rejected:** RapidJSON (more complex API), hand-written (error-prone), Boost.JSON (heavyweight dependency).  
**Consequences:** One new header-only library. `FetchContent` downloads it at configure time. No system package required.

---

## ADR-010 — Sequential session execution for initial implementation

**Status:** Accepted  
**Context:** Concurrent sessions require complex resource management (separate process groups, session isolation, concurrent fork).  
**Decision:** For the initial implementation, the backend processes one scheduling session at a time. A new request waits if one is in progress (or returns a 503 with a clear message).  
**Consequences:** Simple resource management. No race conditions between sessions. Adequate for demonstration purposes. Concurrency can be added later if needed.

