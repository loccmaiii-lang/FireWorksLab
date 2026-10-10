# Pattern Flower Scope Implementation Plan

> **For agentic workers:** Execute this already-authorized correction inline, task by task.

**Goal:** Whole-pattern flower selection actually replaces old bindings; single-call editing remains explicit and draft changes recoverable.
**Architecture:** Pure scoped replacement in `pattern-preview.mjs`; inspector scope beside flower selector; actual-composition summary. Preflight compatibility atomically. Immutable saved versions and programme instances remain pinned.
**Tech Stack:** React19, Canvas, Vite6, Node tests, existing offline packager.
**Constraints:** Keep timing, points, tier subsets, jitter, original programme and fixed versions. Same delivery path/database keys. No UE writes or other-owned files.

## Task 1 — Reproduction and model
- [ ] Capture mixed eight-call source before changes.
- [ ] Failing regression: whole replacement, current isolation, atomic cross-zone failure and save/place consistency.
- [ ] Implement scoped replacement using existing native-reset/compatibility rules; run tests.

## Task 2 — Explicit inspector operations
- [ ] `LaunchWorkspace.jsx`: current/all application scope, apply selected flower to whole, restore draft and actual-flower composition/call selection.
- [ ] Same-flower selection can repair mixed copy; no silent personal-data migration. Keep-current separately labeled.
- [ ] Compact DF styles in `df-theme.css`, no shared token edits.
- [ ] Actual8mixed→alllime→save→reload/oldversion, single/tier/error/1366 checks.

## Task 3 — Same-file delivery
- [ ] Tool version16, production build/tests and one generated HTML.
- [ ] Manual/ZIP content/hashes, same-path saved-personal compatibility/source-show hash.
- [ ] Publish pure model/tests/compiled artifacts/evidence/records, verify remote and release claim.
