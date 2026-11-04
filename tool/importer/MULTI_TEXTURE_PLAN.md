# Multiple Textures Implementation Plan

**Goal:** Make TR2L_____V5 importable with five distinct texture destinations and correctly linked materials/cutouts.

**Architecture:** Inject a separate validation/naming unit into the existing fireworks closure. Keep the original importOne engine, mappings, other four engines, endpoint and non-overwrite preflight. Retain legacy names when a class has one texture, and add a stable key token only for repeated classes.

**Tech Stack:** Existing vanilla JavaScript/HTML, Python builder, Node VM/jsdom tests.

## Constraints
- Modify only the new workbench and its maintenance files in the private tool directory.
- Preserve the original HTML and the source cascade.json/images.
- Test against D:/ProjectTextures/FireWorksLab/TR2L_____V5/cascade.json.
- No real UE writes during verification.
- Preserve current HTML path and local storage key so existing batches stay available.

## Steps
- [x] Back up output, builder, UI, tests and README before changes.
- [x] Add regression tests extracting actual validation/naming functions from the HTML. Assert the real pack has 8 unique targets, legacy single-class names are identical, per-texture grids are used, key normalization collisions remain unique, and malformed references are blocked.
- [x] Run regression tests and reproduce the current failure.
- [x] Add fireworks-plan.js: validate known classes/files/grids and material/cutout references; derive stable safe tokens; generate distinct class/key target names; reject residual package-internal target collisions.
- [x] Update build.py to replace only validate/makePlan before the existing readPack function.
- [x] Update fireworks-ui.js to distinguish within-package/cross-package collision messages; generated paths now visibly include texture identifiers.
- [x] Rebuild the same output path, run 9 targeted and 29 existing/integration checks with all UE traffic mocked, and check the original source hash.
- [x] Document the change and tell the user to refresh/recheck the existing entry; do not require a new sequence solely for the former internal collision.

The user has authorized continuing implementation in this chat. No handoff, deployment or public commit is needed.
