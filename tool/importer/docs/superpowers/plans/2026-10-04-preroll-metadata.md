# preRoll Metadata Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. This session executes inline under the user's existing repair request; neither sub-skill is available here, and no agent delegation is authorized.

**Goal:** Accept the exporter's SizeByLife preRoll marker without sending it to UE, while preserving the shrink/grow curve, native timing, and strict failures for actual invalid properties.

**Architecture:** Keep the same single-file workbench and native staged import. Validate the two-field metadata contract before the UI can execute; skip only this SizeByLife metadata key when mapping real native properties. Test the actual generated HTML with a strict fake UE setter and the unchanged failing package.

**Tech Stack:** JavaScript, Node assert/VM, Python single-file build, read-only native GPCLI diagnostics.

## Global Constraints

- Production output remains D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html.
- Do not change the source cascade.json, existing UE assets, naming rules, pivot conversion, SoloTracking cache synchronization, staged emitter swapping, or per-stage save verification.
- Concurrent dialogue 16 owns the UI shell/layout; modify only importer, validation, version, tests, and maintenance notes.
- Native verification in this request is read-only. Tests fake all native writes; asset recovery and actual particle playback are separate from fixing the workbench.
- Private source packages, paths, logs, and workbench code stay outside the shared repository.

### Task 1: Reproduce and filter supported metadata

**Files:**
- Create: D:/FXTools/DFWorkbench/workbench/check-import-preroll.cjs
- Modify: D:/FXTools/DFWorkbench/workbench/fireworks-import.js
- Modify: D:/FXTools/DFWorkbench/workbench/fireworks-plan.js

**Interfaces:**
- Consumes: loadBackend(api, log, {htmlFile}) from import-backend.cjs, exposing validate(spec), makePlan(spec, asName, naming), importOne(item).
- Produces: validate errors for nonboolean or misplaced preRoll, and native modules whose real properties and distributions are unchanged.

- [x] Write a strict fake /object/set rejecting preRoll and UnexpectedNativeField; reproduce the old HTML failing on the actual unchanged package.

```js
await assert.rejects(old.run(), /preRoll/);
assert.equal(old.item.importProgress.saved.length, 7);
assert(!old.calls.some(c => c.body.function === 'SaveAsset' && c.body.args.AssetToSave === old.item.assets.ps));
```

- [x] Run `node check-import-preroll.cjs --reproduce`; record a passing reproduction of the old failure and no production changes.
- [x] Add metadata validation in the existing module loop:

```js
if ('preRoll' in md) {
  if (md.m !== 'SizeByLife') errs.push('发射器 '+em.name+'：preRoll 只支持 SizeByLife 模块');
  if (typeof md.preRoll !== 'boolean') errs.push('发射器 '+em.name+'：preRoll 必须为布尔值');
}
```

- [x] Extend the existing property exclusion by only this native-external metadata field:

```js
if (prop === 'm' || prop === 'note' || prop === '_note' || (md.m === 'SizeByLife' && prop === 'preRoll')) continue;
```

- [x] Assert all 10 original vector-curve keys, multiply axes, 3 emitter timings, both DynamicParameter frame curves, second-emitter pivot, GPU type/cache, saved dependencies, and exact source bytes. Confirm false/omitted markers work and genuine invalid fields still prevent saving a partial particle.

### Task 2: Build, regress, and record delivery

**Files:**
- Modify: D:/FXTools/DFWorkbench/workbench/build.py
- Modify: D:/FXTools/DFWorkbench/workbench/check-import-iteration.cjs
- Modify: D:/FXTools/DFWorkbench/workbench/README.md
- Create: D:/FXTools/DFWorkbench/workbench/research/preroll-20261004/verification.json
- Modify sanitized records in own repository worktree: 对话记录/对话框5.md, 协作/状态清单.json, 协作/交接.md.

**Interfaces:**
- Consumes: build() -> production HTML, explicit offline check scripts, unchanged backup and source SHA256, read-state.cjs native read-only asset snapshot.
- Produces: version 2.10 at the same file and desktop shortcut, passing offline checks, private backup/report and public sanitized handoff.

- [x] Read the latest build and UI files; dialogue 16 had already set VERSION to 2.10 during this fix. Preserve that value and its presentation injection, and update only the exact version expectation.

```python
VERSION = '2.10'
```

- [x] Run `python build.py`; verify title and visible version both read v2.10 and importer/validator match their reviewed source.
- [x] Run the explicit 13 existing offline scripts plus check-import-preroll.cjs; never run unrelated native approval scripts.
- [x] Rerun read-state.cjs into native-after.json; compare saved file hashes, partial particle properties and source-control flags to before. Confirm original copier hash and desktop shortcut target unchanged.
- [x] Append the private maintenance note explaining metadata compatibility, preserved curve, partial saved assets and verification limits.
- [x] Check off own work record, update sanitized schema/hand-off if needed, release only the preRoll ownership claim, run standard checker, then fetch/rebase and push main without force.

Self-review: all requirements map to Tasks 1/2; no source/exporter changes, UI redesign, automatic asset recovery or native playback are included. The exact methods and paths above match the current modular build.
