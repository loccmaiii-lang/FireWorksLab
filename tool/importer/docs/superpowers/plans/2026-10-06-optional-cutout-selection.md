# Optional cutout selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. Inline execution follows user authorization; unavailable execution skill is not installed.

**Goal:** Unchecked optional cutouts stop importing and being referenced, with explicit reuse available.

**Architecture:** Keep complete source plans; separate selected write keys from optional reuse keys. A single pure predicate controls preview dependencies and RequiredModule references. Checkbox changes invalidate confirmation and persist scope; mandatory material/main dependencies remain enforced.

**Tech Stack:** Existing standalone HTML/JS, Python build, Node/JSDOM mocks.

## Global Constraints

- No new directories; backup flat files in existing backups.
- No user UE writes, deletions or Cascade playback.
- Preserve 2.18 native texture format, save/source-control, platform mapping and all other engines.
- No private IDs/paths/data on public git.

### Task 1: Reproduction and backend scope

Files: check-import-cutout-selection.cjs; fireworks-selection.js; fireworks-import.js.
Interfaces: optionalCutout(it,key), cutoutEnabled(it,key), optionalReuseAssetKeys array.
- [x] Create failing backend/UI tests: unchecked cutout cannot be imported or RequiredModule-referenced; missing cutout reuse blocks; mandatory material/main omission still blocks.
- [x] Run `node check-import-cutout-selection.cjs` against 2.18; record failing dependency.
- [x] Implement optionalCutout using cutout texture class and absence from material textures; cutoutEnabled = selected or explicit reuse. Replace `if(rq.cutout)` with `if(rq.cutout&&cutoutEnabled(it,'tex:'+rq.cutout))`; dependency generation uses same predicate; validate invalid reuse scope before writes.
- [x] Rerun tests for check/uncheck/reuse and preservation of SubImages/animation fields.

### Task 2: Visible persisted semantics

Files: fireworks-ui.js; build.py; isolation preservation checks; README.md; CHANGELOG.md.
Interfaces: setAssetReuse(id,key,value), row optionalReuseAssetKeys; plan fingerprint contains both scopes.
- [x] Add optional reuse fields to restore/signature/previousSuccess/checkSelectedPlan. Skipped optional cutout says no import/no use and provides explicit reuse checkbox.
- [x] Reuse changes follow busy lock, persistence, dependency revalidation, fingerprint and confirmation invalidation. Ordinary selected checkbox removes reuse for that key.
- [x] Test explicit reuse exists/missing/wrong type/disappearing before execution; refresh/finished/busy behavior and no source JSON mutation.
- [x] Generate v2.19 at same production filename; record exact accepted source/generated importer deltas; run explicit 27-script regressions.
- [x] Publish only sanitized docs/charter and release private ownership. State no UE/actual browser validation claim.

Result: 27/27 isolated scripts, 558 PASS lines. No real user asset writes or browser visual validation.
