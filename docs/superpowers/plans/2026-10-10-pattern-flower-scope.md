# Pattern Flower Scope Implementation Plan

> **For agentic workers:** Execute this already-authorized correction inline, task by task.

**Goal:** Whole-pattern flower selection actually replaces old bindings; single-call editing remains explicit and draft changes recoverable.
**Architecture:** Pure scoped replacement in `pattern-preview.mjs`; inspector scope beside flower selector; actual-composition summary. Preflight compatibility atomically. Immutable saved versions and programme instances remain pinned.
**Tech Stack:** React19, Canvas, Vite6, Node tests, existing offline packager.
**Constraints:** Keep timing, points, tier subsets, jitter, original programme and fixed versions. Same delivery path/database keys. No UE writes or other-owned files.

## Task 1 — Reproduction and model
- [x] Capture mixed eight-call source before changes.
- [x] Failing regression: whole replacement, current isolation, atomic cross-zone failure and save/place consistency.
- [x] Implement scoped replacement using existing native-reset/compatibility rules; run tests.

## Task 2 — Explicit inspector operations
- [x] `LaunchWorkspace.jsx`: current/all application scope, apply selected flower to whole, restore draft and actual-flower composition/call selection.
- [x] Same-flower selection can repair mixed copy; no silent personal-data migration. Keep-current separately labeled.
- [x] Compact DF styles in `df-theme.css`, no shared token edits.
- [x] Actual8mixed→alllime→save→reload/oldversion, single/error/1366 UI checks; tier model checks.

## Task 3 — Same-file delivery
- [x] Tool version16, production build/tests and one generated HTML.
- [x] Manual/ZIP content/hashes, same-path storage invariant checks/final saved-personal reload/source-show hash.
- [x] Publish pure model/tests/compiled artifacts/evidence/records, verify remote and release claim.

Browser file reimport blocked by extension permissions; direct file-protocol rejection not bypassed. Existing v15→v16 overlay not repeated; no UE writes. New user evidence: from-zero template is clean; copying retains all calls and label deletion does not unbind. Copy count and reversible call deletion moved next to name.
