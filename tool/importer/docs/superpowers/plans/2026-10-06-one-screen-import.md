# One-screen import Implementation Plan

> **For agentic workers:** Inline execution in the existing private HTML tool; no new project or folders.

**Goal:** First selected three-column design at the existing production HTML path.
**Architecture:** Preserve engine, naming, selection validation and stored schema. A workspace controller projects current package assets and single primary action; current confirmation binds existing signature/fingerprint before inspecting next selected unconfirmed package.
**Tech Stack:** Plain JavaScript/CSS, Python builder, JSDOM with mocked UE.

## Global Constraints
- No new folders or actual UE writes/Cascade opening.
- Preserve formal naming, optional cutout/reuse, platform/size/ASTC/material/update/recovery protection.
- No browser-policy workaround; actual visual comparison required for QA passed.

### Task 1: Baseline and failing regression
Files: existing backups; check-import-workspace.cjs.
- [x] Synchronize, claim and snapshot existing production/source.
- [x] Reproduce missing `.fw-workspace` via `assert(document.querySelector('.fw-workspace'))`.
- [x] Cover package viewing/selection independence, per-package confirm/advance, no autoexecute, input/selection invalidation, cancellation, busy lock and restored records.

### Task 2: Workspace
Files: fireworks.html, fireworks-ui.js, fireworks-workspace.js/css, build.py, presentation.js, shell.js.
Interfaces: workspacePrimary() dispatches edit/saveEdit/preview/confirmCurrent/execute; confirmCurrent() binds the checked current fingerprint and advances without writing; renderWorkspacePrimary() derives labels/disabled state without UE reads.
- [x] Editor in middle pane; current package only in right preview; queue always mounted.
- [x] One visible primary with explicit check/confirm/import stages, selected/validated current package guard and all-package execution gate.
- [x] Compact settings/rows, advanced details and full paths available, fixed action/log with local scroll; no font scaling.
- [x] First-run log folded; preserve explicit preference and error expansion.

### Task 3: Verification and release
Files: reviewed UI delta in existing backups, exact preservation tests, runner, README/CHANGELOG/design-qa.md.
- [x] Build same-path v2.20; all allowlisted isolated regressions, original source SHA and unrelated engines exact.
- [x] Recorded `final result: blocked` with explicit browser blocker; actual rendered visual comparison remains pending.
- [x] Private reports and sanitized public handoff, release claim, safe main push.
