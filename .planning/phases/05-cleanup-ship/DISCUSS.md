# Phase 5 Discussion: Repo Cleanup, Honest README, Push to GitHub

## Scope & Directives

- **Legacy Removal**:
  - Remove `viewer/`.
  - Remove all `build.ps1` scripts.
  - Remove `bin/*.exe`.
  - Remove stale audit documents and references to Windows engine builds.
- **Documentation**:
  - `README.md` must state only numbers printed by real test commands today (drop unverified 40/40, 42/42, or 97% claims unless re-measured and proven).
  - Include WSL2 setup instructions.
  - Include instructions for running the live demo across 3 windows (Engine/Server/Browser).
  - Include clear architecture diagrams.
- **Git & Gitignore**:
  - Ignore `bin/`, `engine-cpp/build/`, `node_modules/`, `dist/`.
- **Release Verification**:
  - Final verification test from a fresh clone into `/tmp`.
  - Merge work into `main` and push cleanly to GitHub repository.
