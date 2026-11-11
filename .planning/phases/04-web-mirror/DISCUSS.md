# Phase 4 Discussion: Web Mirrors the Same Events

## Scope & Directives

- **UI Invariant**: Do not touch the UI design or layout.
- **Server Endpoint**:
  - `server.js` `/api/live` streams the engine's NDJSON unchanged (flush per line).
  - Validates `ipc`, `workUs`, and `tickMs`.
  - Rejects total burst > 5000 with HTTP 400.
  - Echoes each event to the server terminal with prefix `[engine] `.
  - SIGKILLs the engine process group when the client disconnects or aborts.
- **Web Client Panels**:
  - Reuse `ExecutionTerminal` and the OS panel.
  - The terminal panel prints the exact same text lines as the WSL terminal.
  - `Gantt` grows dynamically from incoming tick events.
  - OS panel displays real OS PIDs and active process states.
  - When the live switch is OFF, keep existing instant auto-run simulation behavior.
