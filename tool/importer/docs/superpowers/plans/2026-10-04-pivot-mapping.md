# Pivot Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the private HTML importer's conversion from fwl.cascade/1 internal sprite offset to the native Pivot Offset module, without changing existing user assets.

**Architecture:** Keep the package schema unchanged. Convert at the native module boundary using `native = internal + 0.5`, established from the actual UE 4.24 binary's CompileModule and CPU/GPU shader equations. Rebuild the same standalone HTML from its maintenance source.

**Tech Stack:** Vanilla JavaScript, Python build script, Node assertion fixtures, existing UE GPCLI reflection API.

## Global Constraints

- Main deliverable remains `D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html` and its existing desktop shortcut.
- Preserve current particle emitter modules, manual settings, textures, materials and source JSON; this task does not execute a real import or update.
- No engine C++ changes, new materials, native project asset saves or source-control submissions.
- Private asset names and native binary evidence remain under the local workbench research folder, outside public Git.
- Version header/title both become v2.8; original copier SHA256 remains `17bc3503c307a02200c5f48cf171d02ad582703f73078c8c673a29d8c7ae685b`.

---

### Task 1: Correct and test the conversion

**Files:**
- Modify: `D:/FXTools/DFWorkbench/workbench/fireworks-import.js` around the Pivot creation block.
- Modify: `D:/FXTools/DFWorkbench/workbench/check-import-calibration.cjs`.
- Modify: `D:/FXTools/DFWorkbench/workbench/check-import-recovery.cjs`.
- Modify: `D:/FXTools/DFWorkbench/workbench/build.py` (`VERSION`).

**Interfaces:**
- Consumes: `es.required.pivot_offset: [number, number]`, representing the sprite shader's internal offset.
- Produces: `ParticleModulePivotOffset.PivotOffset` as a six-decimal native Vector2D string, linked once into LOD.Modules.

- [x] **Step 1: Write a failing assertion for native meaning.**

```js
assert.equal(pivot.PivotOffset, '(X=0.000000,Y=0.488700)');
```

Use the existing source fixture `[-0.5,-0.0113]`. In the real package fixture assert both native pivots equal `(X=0.000000,Y=0.484600)` and each is linked to its LOD's Modules. Also retain a center-source case `[-0.5,-0.5] -> (0,0)` and an omitted-pivot case creating no Pivot module.

- [x] **Step 2: Reproduce with the old generated HTML.**

Run `node check-import-calibration.cjs`; expect the existing negative pair to fail against the required zero/positive pair. Save stdout in `research/pivot-20261004/reproduction.txt`.

- [x] **Step 3: Backup and make the minimal conversion.**

Backup the main HTML plus changed maintenance files under `backups/2026-10-04-pivot-mapping/`. Replace only the native serialization calculation:

```js
PivotOffset: '(X=' + f6(rq.pivot_offset[0] + 0.5) +
             ',Y=' + f6(rq.pivot_offset[1] + 0.5) + ')'
```

Keep LODValidity and the existing module link. Set `build.py` VERSION to `2.8`, then run `python build.py`.

- [x] **Step 4: Verify.**

Run `node check-import-calibration.cjs`, `node check-import-recovery.cjs`, then the existing top-level `check*.cjs` suite used for v2.7 (exclude destructive native execution helpers). Recheck title/header v2.8 and the copier hash. All UE calls in these tests remain simulated.

### Task 2: Verify native storage and deliver the explanation

**Files:**
- Create: `D:/FXTools/DFWorkbench/workbench/research/pivot-20261004/native-field.cjs`.
- Modify: `D:/FXTools/DFWorkbench/workbench/README.md`.
- Modify sanitized public records: `spec/UE实测.md`, `spec/cascade_params_v1.md`, `对话记录/对话框5.md`, `交接.md`, own online timestamp only.

**Interfaces:**
- Consumes: corrected serialized Vector2D, actual native compiled mapping `shaderPivot = modulePivot - 0.5`, existing read-only particle snapshot.
- Produces: private field read-back evidence and a public explanation separating missing historical nodes from incorrect coordinate conversion.

- [x] **Step 1: Probe a transient native module only.**

Use existing GPCLI `SpawnObject` with `ObjectClass=/Script/Engine.ParticleModulePivotOffset`, `Outer=/Engine/Transient`; hold it only for the probe, write `(X=0.000000,Y=0.484600)` and read `PivotOffset`. Assert both components within `1e-6`, then release the probe reference. Do not save, register an asset or open Cascade. If transient creation is unsupported, preserve binary/shader proof and explicitly state that field read-back was not verified rather than testing the user's system.

- [x] **Step 2: Update private/public documentation.**

Document `internal + 0.5`, center mapping, exact user pair `(0,0.4846)`, the v2.5 omission, v2.6/v2.7 direct-write defect, and protection of historical manual emitters. State that current RiseLoop is missing Pivot, current RiseFade has manual `(0,-0.5)` and neither has been changed by this task. Cite the actual native binary/shader evidence; official property comments about defaults do not override the actual implementation.

- [x] **Step 3: Publish sanitized records and deliver.**

Run offline standard checks, fetch/rebase while preserving other conversations, push the sanitized records to main. Deliver same HTML path, v2.8, corrected native values and the scope of tests. Do not claim visual playback or current user assets repaired.

## Self-review

- The schema, source files and user's manual asset parameters stay intact.
- The tests distinguish center offset, head offset, absence, and the old incorrect direct-write behavior.
- A native transient field probe creates no project resource and cannot save or submit user changes.
- This session executes inline within existing authorization; no new user-owned thread or subagent is created.

## Completion evidence

- Main HTML rebuilt as v2.8; original copier unchanged.
- 211 core mocked checks and 7 offline repository UI checks passed.
- The historical approval fixture stopped at its existing-authorization guard; its authorization was preserved and no engine call was executed.
- Transient module spawn returned None and the native class is not exported to Python; the optional read-back probe was not completed. Own transient references released; no user resource written, saved or opened. Native equation comes from the actual module compile implementation and shader source.
- Correct format, user confirmation of (0,0) center and producer/consumer formula pushed to shared main in 7de2bc0, with a note in the trail owner's next step for Claude.
