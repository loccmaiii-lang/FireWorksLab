# Importer Life Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Support the current exported VelocityOverLife modules and verify the memo's SizeByLife, independent Pivot, TrailFar and metadata contracts in the existing D drive workbench.

**Architecture:** Keep the original copier immutable. Extend its module map during the private build, validate only the two life-vector contracts in the planner, and use the existing native distribution/module writer. Existing naming, UI, emitter staging/cache, backups and save/P4 behavior remain intact. This session executes inline; the named executing-plans subskill is unavailable, and the user already authorized implementation.

**Tech Stack:** Existing standalone HTML/JavaScript, Python build, Node VM mocks; deployed UE reflection and optional unsaved isolated module readback.

## Global Constraints
- `format` is `fwl.cascade/1`; native velocities are cm/s and OverLife curve times are relative age 0–1.
- `VelocityOverLife` maps to `ParticleModuleVelocityOverLifetime`, `VelOverLife` vector distribution and `Absolute` boolean.
- `SizeByLife` writes the source LifeMultiplier/MultiplyX/Y/Z values; CPU defaults to unbaked, explicit bake=false remains false.
- Each emitter owns its PivotOffset module; native value = exported internal value + 0.5.
- Unknown modules/native fields fail; note/_note and SizeByLife.preRoll stay metadata.
- Preserve v2.12 formal naming, historical records, all original controls and newest presentation code. No shared baker source edits or effect/GPU queue changes.
- Memo #5 GPU square-wave rendering remains an explicit visual test, not a mock/field-readback claim. No new material or existing user asset writes for diagnosis.

### Task 1: Behavioral reproduction and module support
**Files:** Create `check-import-life-modules.cjs`; modify `build.py`, `fireworks-plan.js`, `fireworks-import.js`; freeze six current RT5 exports in `research/module-support-20261005/`.
**Interfaces:** `loadBackend(api, log, {htmlFile})` returns `validate(spec)`, `importOne(item)` and `importEmitters(item, PS, materials, startIndex, attach)`; production API functions remain unchanged.
- [x] Back up and verify all 65 current maintenance/delivered files.
- [x] Write failing real-export test: `assert.deepEqual(JSON.parse(JSON.stringify(backend.validate(spec))), [])`; verify v2.12 reports unknown VelocityOverLife in RiseLoop/HeadGlow.
- [x] Run `node check-import-life-modules.cjs --reproduce` and keep the failure log.
- [x] Extend the exact build anchor: `InitialVelocity:'ParticleModuleVelocity', VelocityOverLife:'ParticleModuleVelocityOverLifetime',`.
- [x] Add `validateLifeVector(md, prop, emitter)` requiring finite 3D const/uniform/curve values, one distribution form, nonempty curves with ordered relative times in [0,1], boolean bake/axis/Absolute flags. Velocity requires VelOverLife; optional legacy SizeByLife distribution defaults stay supported.
- [x] Validate importOne's spec before any texture/native mutation: `const errors=validate(spec); if(errors.length) throw Error('素材配置检查失败：'+errors.join('；'));`.
- [x] Build v2.13 with `python build.py`; replay all six frozen PC/mobile S/M/L exports through the actual generated importer with native calls mocked. Assert module linkage, all keys/Linear interpolation/CPU bake, original durations/delays/size/Pivot/frame/LOD/cache and saved targets; source JSON remains identical.
- [x] Exercise Velocity const/uniform/curve, Absolute true/false/omitted, invalid vectors/times/flags, native write failure and unknown modules before execution.

### Task 2: Independent layers, GPU and native field evidence
**Files:** Extend `check-import-life-modules.cjs`; create `research/module-support-20261005/probe-native.cjs` and evidence JSON.
**Interfaces:** Existing `request(route, payload, timeout)` via `engine_api.cjs`; real writes confined to a freshly created unsaved probe ParticleSystem below the existing allowed PS directory.
- [x] Assert RiseLoop and RiseFade each have exactly one differently-valued Pivot and preserve InitialSize; assert an RT6-contract TrailFar row preserves its own frame keys/location/1cm/s direction and does not invent RiseFade or velocity-life.
- [x] Assert 101-point GPU ColorOverLife/SizeByLife keys remain Linear and bake defaults enabled; explicit CPU false remains disabled. This is contract verification only.
- [x] Save read-only native default-class evidence for VelocityOverLifetime and SizeMultiplyLife.
- [x] For safe native readback, create a unique unsaved test PS only after asserting no existing asset/path/file; build two CPU emitters using existing project material, inspect every velocity/size curve key, axis flag, Absolute and separate Pivot. Never spawn a component, open Cascade, save, add P4, modify user PS or run GPU playback. After field readback, relocate only the verified newly created unsaved probe to /Engine/Transient and assert its actual outer/path changed and no disk file was created. Do not force delete/reset user Undo; the current session registry can retain a stale test-name index. If API/class/readback is unavailable, retain evidence and mark native test unverified instead of substituting a user asset.

### Task 3: Preservation, release and cloud memo
**Files:** Modify `check-design-ui.cjs`, `README.md`, `CHANGELOG.md`; create exact accepted compatibility patch JSON. Public edits limited to `协作/备忘_导入器.md`, `spec/cascade_params_v1.md`, own state/record and handoff.
- [x] Record exact new map, planner and import-entry changes as before/after chunks in `research/module-support-20261005/reviewed-life-modules-patch.json`; append them to the existing accepted patch chain. Do not weaken full engine equality assertions.
- [x] Run existing explicit 17 isolated scripts and the new life-modules script; keep per-script exit status and pass counts. Run shared `标准检查.py --ui-state-only`; report its actual outcome without editing another owner's failures.
- [x] Verify original copier, user source files, UI/presentation/update/cache/save code and desktop shortcut target remain unchanged; bump production version to v2.13 at the same file.
- [x] Write private release notes and native/mocked/visual evidence boundaries. Update memo #1/#2/#3/#4/#7 by actual results; leave #5 GPU square-wave and visual/art acceptance unverified.
- [x] Fetch/rebase, commit/push only sanitized shared files, release claim and record registration commit 2497846.

## Self-review
All seven memo rows covered: #1 implement; #2/3/4/7 native/behavioral verification; #5 preserve GPU curves and explicitly leave true playback test; #6 verify ordinary export without SizeByLife remains valid. No speculative new baker formats, GPU queue work, native existing-resource restore or source publication.

## Execution evidence
- Registration pushed: 2497846. v2.12 reproduces both unknown modules in the real RT5 sample.
- 18 isolated scripts/413 check groups pass; 72 new module groups include six RT5 exports and the latest local 4.5.1 RT6 package. Initial recovery test correctly found its live RT4 source had been replaced by RT6; pinning the historical cloud RT4 export restored its original note/Pivot regression.
- Native field readback passes 11 groups. The first probe incorrectly read SoloTracking through the default property list; fixed to explicit field selection. Initial unsaved deletion failed, relocation succeeded; find_object can resolve the old alias to its new transient path, so cleanup checks actual outer/path. Attempts remain preserved; no saved file, existing user asset change or playback test.
- Shared UI standard remains 6/7 (existing store is not defined), not repaired or claimed passed. GPU square-wave playback remains outstanding as specified in memo #5.
