# ColorScaleOverLife Implementation Plan

**Goal:** Support cloud Baker 4.9.24+ Scale Color/Life without changing existing UI, asset policies or source values.

**Architecture:** Add the native class to the existing module map and validate its vector/float distributions before any write. Reuse current distribution writer and GPU bake rules. Keep source module order except append ColorScaleOverLife after synthesized Pivot so it is the final LOD module.

**Tech Stack:** standalone HTML build, JavaScript importer, Node isolated API fixtures, UE native readback.

## Global Constraints

- No new folders; all snapshots and reports use existing backups/ and research/.
- No saved UE assets, no Cascade playback, no changes to shared tool/src or original standalone HTML.
- Retain existing selection, formal naming, mobile1024/HD2048, ASTC, single-sided/no-dissolve, staged replacement/cache/save behavior.
- Source const/curve values and metadata filtering are preserved; actual native errors stop the import.

### Task 1: Native module compatibility

Files: build.py (class mapping), fireworks-plan.js (distribution checks), fireworks-import.js (final module placement), check-import-color-scale.cjs (isolated fixture).

- [x] Write and run failing test: `assert.deepEqual(backend.validate(simple([{m:'ColorScaleOverLife',ColorScaleOverLife:{const:[1,1,1]},AlphaScaleOverLife:{const:1}}])),[])` must fail on old production with unknown module.
- [x] Map `ColorScaleOverLife:'ParticleModuleColorScaleOverLife'`; reuse vector validation and add scalar validation for const/uniform/curve finite values, bake boolean, time0–1 and sorted keys. Both fields required for this new contract; reject malformed payload before writes.
- [x] Append ColorScale module after synthesized Pivot, preserving all other module ordering. Use existing applyDist for both fields and metadata filter for note/_note.
- [x] Test CPU/GPU constants and curves, explicit bake, full AlphaOverLife preservation, Pivot+final order, malformed fields/no writes, unknown/native errors, actual exported CPU/mobile packages.

### Task 2: Verify and release

Files: exact reviewed patch guards, run-show-project-checks.py allowlist, README.md/CHANGELOG.md; public memo/spec/state/dialogue/handoff sanitized only.

- [x] Add exact before/after patch from v2.20 baseline; preserve unchanged source/engines/UI hashes.
- [x] Build v2.21 at existing production path and run all isolated checks.
- [x] Inspect existing native test harness, create only transient objects and read back new fields if editor reachable; never open or save particle systems. Mark native unavailable separately if blocked.
- [x] Read local material mapping and existing parent graph safely. Report current roles/parameters, distinguish unbound single-frame role and unverified threshold/channel from established facts; do not enable dissolve by default.
- [x] Update private plan/results and public contract/status; fetch/rebase preserving concurrent work, commit and push sanitized docs only.

## Execution findings

Cloud assumption corrected: original standalone and v2.20 already mapped ColorScaleOverLife. No mapping change required. Reproduced missing float validation before changing code; implemented vector/float checks and final placement after synthesized Pivot. Reviewed patch excludes unrelated algorithms and interface. 29 scripts /656 PASS lines (new81;8 real PC/mobile exports),13 native readback checks. Initial transient lookup/class-construction probes failed and remain recorded; actual production factory/importEmitters succeeded on an unsaved object in an existing approved directory, then moved to Transient with zero disk files. No Cascade/open/playback claims.

Current material mappings do not include a colored single-frame role. Both owned templates use scalar RGBA sequential decoding plus Ramp. Existing dissolve texture uses selectable channel (default R), dynamic index2, and soft formula described in private findings. No policy or default dissolve enablement change. A concrete existing colored material must be selected before wiring a new role; queued cloud reply distinguishes this fact from an assertion that no such material exists in the project.
