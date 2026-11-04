# Asset Selection and Fixed Log Implementation Plan

> **For agentic workers:** Implement task-by-task in this session. No delegation or new directories; requested execution is already authorized.

**Goal:** Select individual assets in a package and keep execution feedback visible during long batches.

**Architecture:** A small selection module projects write targets and validates omitted dependencies without changing source specs or complete reference mappings. The existing confirmation state binds selection. A dedicated log controller and last-injected CSS provide a fixed dock and reserve its height for content and sticky action bars.

**Tech Stack:** Existing vanilla JavaScript, Python builder, jsdom and mocked UE interfaces.

## Global Constraints
- Production remains D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html; release v2.16.
- No new directories, real UE mutations, deletion, shared material modification or cloud upload of private sources.
- Preserve v2.15 directory, ASTC, dimension, single-sided, dissolve, naming, backup and emitter safety rules.

### Task 1: Import scope
Files: create fireworks-selection.js and check-import-selection.cjs; modify build.py, fireworks-ui.js, fireworks-import.js, fireworks-update.js, fireworks-policy.js.
Interfaces: selectedAssetEntries(it) returns key/path tuples; selectionDependencies(it) returns omitted direct dependencies; validateAssetSelection(it) verifies dependency classes with read-only Python; setAssetSelected(id,key,value) updates persisted exclusions and invalidates confirmation.
- [x] Write and fail test: `assert.equal(review.querySelectorAll('input[data-asset-key]').length, Object.keys(plan).length)`.
- [x] Add checkbox per preview row; save excludedAssetKeys per batch item. Never silently reselect during check/reload.
- [x] Validate PS -> materials/cutouts and selected MI -> textures; reuse existing omitted dependencies, block missing/wrong class. Empty scope disables confirmation.
- [x] Only selected assets participate in existence collision checks, writes, backup, checkout, save and emitter rebuild. Recheck dependency types immediately before writing.
- [x] Verify texture-only and material-only imports, partial update, missing dependency, confirmation invalidation, reload and busy locking with mocked interfaces.

### Task 2: Fixed feedback
Files: create workbench-log.js/css and check-workbench-log.cjs; modify shell.js, shell.html and build.py.
Interfaces: WorkbenchLog.init(open), setOpen(open), beforeAppend(), afterAppend(message,kind,snapshot), clear(), latest(). Existing Workbench.toggleLog delegates and preserves preference key.
- [x] Fail `assert.equal(computedStyle(logcard).position,'fixed')` before implementation.
- [x] Keep header visible, fold logs, reserve measured dock height via --wb-log-height, offset action bars; adapt below 720px.
- [x] Capture pre-append scroll position; new logs follow only when at tail; offer 回到最新, clear latest status when history cleared, error auto-expand.
- [x] Verify collapse/reload, read-history scroll, busy operation, error expansion, CSS at 1366/1920/mobile. No claim of screenshot/UE verification.

### Task 3: Release
- [x] Generate exact reviewed patch allowances from backed-up v2.15 to v2.16, retaining previous historical allowances.
- [x] Build, run both new scripts and the explicit 22 existing isolated checks; inspect failures and fix genuine regressions.
- [x] Check original SHA, document result/limits, publish sanitized claim release and handoff. All detailed evidence stays in existing local folders.
