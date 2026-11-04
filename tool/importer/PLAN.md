# DF Workbench Implementation Plan

**Goal:** Deliver a separate, usable single HTML file with the approved dark/mint design and real existing UE operations.

**Architecture:** Build from the original HTML without modifying it. Preserve all four existing tool engines and the fireworks importOne engine; add a shared shell and replace fireworks presentation/state management.

**Tech Stack:** Existing vanilla HTML/CSS/JavaScript, Python build script, Node/jsdom isolated tests.

## Constraints
- Source: ../df-fx-copier-suite_v1.0.1_locmai.html.
- Output: ../df-fx-workbench_v2_locmai.html.
- Keep original source hash unchanged; no real UE writes during verification.
- Parent navigation: 15px semibold; children: 14px regular with indentation.
- Keep the GPUECli endpoint, asset mappings, non-overwrite checks and GPU restart requirement.
- All output remains local in the private tool directory.

## Tasks
- [x] Build script: extract original tool body, wrap shared navigation and panels, embed workbench.css and shell.js, replace only fireworks UI functions with fireworks-ui.js. Refuse missing anchors.
- [x] Shared shell: preserve original element IDs and callbacks, make all five tools navigable, put settings beside previews, provide contextual heading/status/logs, serialize async operations and disable editing during execution.
- [x] Fireworks UI: persist batches and GPU queue in a separate key; migrate legacy state read-only; maintain checked values independently of inspected row; share canonical data between bulk and individual editors.
- [x] Fireworks preview: read actual cascade.json, validate files/types/names, check every target, detect collisions within a batch, and retain only verified plans in memory.
- [x] Execution: snapshot checked verified plans, recheck targets before writes, persist running/failed/complete outcomes, keep earlier successes, allow stopping only between packages, never resume partially created assets without a fresh non-overwrite preview.
- [x] GPU: preserve pending paths across batches; explicitly require restart confirmation; retain original dirty-package warning and Cascade/save procedure.
- [x] Tests: parse all scripts and verify original engines unchanged; mount full output in jsdom with all network mocked; assert navigation, startup offline handling, name/bulk sync, preserved exclusions, stale preview invalidation, partial failure, queue recovery, single-flight execution and path collision blocking.
- [x] Deliver output link and usage notes; explicitly distinguish mocked validation from real UE integration testing.
