# Import Naming Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. This session executes inline under the user's continuing implementation authorization; no new delegation or execution-choice question is needed.

**Goal:** Accept a base name without `_01`, number textures and material instances separately, and leave new particle-system names unnumbered.

**Architecture:** A shared naming resolver supplies validated base/index/particle-numbering values to the planner. The UI stores those values independently while retaining canonical `as=base_index` metadata for the existing importer. Old records explicitly retain numbered particle targets; new records default to unnumbered targets. Exact source-key references, existing target checks, name confirmation, backups, and native import code remain in use.

**Tech Stack:** Single-file HTML generated with Python; plain JavaScript; Node.js isolated VM and jsdom regression fixtures; no live UE writes.

## Global Constraints

- Main HTML stays at `D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html`; desktop shortcut remains valid.
- Texture and material index is two digits, default `01`; `_HD` and class/grid/material naming conventions remain.
- Historical numbered particle paths never silently become unnumbered during restore or update.
- All naming changes revoke checked plans and confirmation immediately; explicit empty or invalid values survive storage and block execution.
- Source keys continue to bind dependencies; naming controls must not rewrite source JSON.
- Same base + different index still conflicts on an unnumbered particle name; report that changing the texture/material index cannot resolve this collision.
- Keep all actual import, save, version-management and SoloTracking mechanisms unchanged. No original asset renames, imports, saves or deletion in this task.
- Workbench version becomes `2.9`; original copier bytes remain unchanged. Shared `tool/src` and art recipes are outside scope.
- Browser file-protocol access was denied by policy. Do not bypass or claim browser visual acceptance; use isolated DOM fixtures.

---

### Task 1: Naming resolver and stored-record migration

**Files:** Modify `fireworks-plan.js`, `fireworks-ui.js`; create `check-import-naming.cjs`.

**Interfaces:**
- `splitImportName(text, fallbackIndex='01') -> {baseName,assetIndex}` interprets an old two-column `Name_05` input once.
- `resolveImportNaming(asName, options) -> {baseName,assetIndex,particleNumbered}` validates ASCII asset base and two-digit index. Plain base defaults to unnumbered PS; direct historical `Name_05` calls keep numbered PS. Explicit options always win.
- `makePlan(spec,asName,options)` generates all targets. Texture/MI templates still use index; PS template removes only its `_{idx}` placeholder when numbering is off.
- `fresh(dir,naming)` stores raw `baseName`, `assetIndex`, boolean `particleNumbered` and canonical `as`; new defaults false. Restore migrates records lacking fields with `particleNumbered:true` and migrates `previousSuccess` identically.

- [x] Write a failing isolated check against the generated HTML backend:

```js
const p=backend.makePlan(spec,'GoldSpark');
assert.equal(p.ps.split('/').pop(),'P_EFX_FireWorks_GoldSpark_HD');
assert.equal(p['mat:m'].split('/').pop(),'MI_EFX_FireWorks_GoldSpark_01_HD');
```

- [x] Run `node check-import-naming.cjs` and retain the expected old mandatory-suffix failure in `research/naming-20261004/repro.txt`.
- [x] Implement resolver and PS template selection:

```js
const n=resolveImportNaming(asName,options);
const particlePattern=n.particleNumbered?MAP.naming.ps:MAP.naming.ps.replace('_{idx}','');
assets.ps=MAP.dirs.ps+'/'+fmt(particlePattern,n.baseName,{cols:1,rows:1});
```

- [x] Test plain/new/legacy direct naming, arbitrary texture classes and multi-texture source-key preservation; old restore, prepare/cancel update, and partial empty input restoration.
- [x] Back up changed sources and main HTML in `backups/2026-10-04-naming-split/` before production edits; record step evidence in this plan and public dialogue record.

### Task 2: Separate fields, bulk compatibility and confirmation

**Files:** Modify `fireworks-ui.js`, `fireworks.html`, `workbench.css`, `fireworks-update.js` (only update-name validation); test `check-import-naming.cjs` and existing UI fixtures.

**Interfaces:**
- New single-add and detail fields use IDs `editAs`/`name` for base, `editIndex`/`index` for texture/MI index, `editParticleNumbered`/`particleNumbered` for optional legacy PS numbering.
- Bulk accepts `path | base` (default01), old `path | base_05`, and explicit `path | base | 05 | 带编号`/`不带编号`. Serialized existing records include explicit options to prevent migration drift.
- Signature includes directory, mode, base, raw index and particle-numbering flag. Preview passes the stored fields explicitly to `makePlan`; execution consumes the exact reviewed `assets` map.
- `validateUpdateTargets(it)` accepts prior-index source tags only for an explicitly unnumbered PS with the same base. Different bases, numbered PS and texture/MI targets retain exact tag matching.

- [x] Add failing jsdom checks for single-add base-only input, immediate invalidation without losing focus, index-only changes leaving PS stable, legacy update keeping original PS, bulk serialization and explicit naming options, empty index refresh preservation.
- [x] Render separate accessible inputs and a checkbox with clear compatibility wording. Keep index raw while editing (no hidden reset on refresh); require two digits when previewing. Single-add takes the literal base entered; legacy pasted two-column bulk is split once. Describe this distinction beside the bulk editor.
- [x] Save old success naming fields so cancel-update restores the original naming plan as well as state/assets.
- [x] Show preview base, “贴图/材质编号”, and “粒子不带数字编号” or “粒子带编号（保留原名）”; retain the full target table and explicit confirmation.
- [x] For duplicate PS with unnumbered records, use this actionable message:

```js
'粒子系统目标重名，修改贴图/材质编号不能区分粒子。请改基础名称、只勾选一项，或明确启用粒子编号后重新检查：'+path
```

- [x] Test per-type collisions, source/target changes, mixed checked/unconfirmed selection, refresh loss of confirmation, and no native request outside mock fixtures.

### Task 3: Generate, verify and hand off

**Files:** Modify `build.py`, `README.md`, relevant changed expectations in `check.cjs`, `check-import-name-confirmation.cjs`, `check-import-iteration.cjs`; public sanitized dialogue/state/handoff only.

**Interfaces:** Generated HTML is the sole deliverable; native code and desktop link target remain unchanged.

- [x] Set `VERSION='2.9'`, then run `python build.py`.
- [x] Run the 12 existing core scripts listed in README/previous verification plus new naming checks. Adjust only expectations intentionally changed for new records; retain legacy-numbering and collision coverage.
- [x] Inspect generated source contains the resolver/controls and unchanged native-import module; confirm title/header `v2.9`, original SHA256 and desktop shortcut target. Save pass counts and evidence under `research/naming-20261004/`.
- [x] Run the repository's `python analysis/scripts/标准检查.py --ui-state-only`, keeping its seven offline checks separate from private-workbench tests.
- [x] Update private maintenance instructions with examples and history compatibility. Check off public dialogue steps, append sanitized handoff, update own online timestamp. Fetch/rebase safely and push shared documentation to main without private files.
- [x] Deliver the same-path v2.9 update with concise base/PS/MI/texture examples. State that existing UE resources were not renamed and actual native import is not part of this verification.

## Self-review

Coverage: new base-only names, texture/MI default index, PS optional numbering, historical update/cancel, bulk compatibility, empty input restoration, plan invalidation, PS collisions, original code preservation and version/path delivery all have explicit tasks. All names/interfaces above are defined here. No new engine capability, external communication or shared source change is required.

## Execution evidence — 2026-10-04

Completed inline. Old `GoldSpark` failure is retained in `research/naming-20261004/repro.txt`. New naming checks: 34; existing core: 211; total: 245. Repository offline UI checks: seven passes. Generated v2.9 HTML SHA256: `75c0af34906a4fa5ce82658498a35ddf9a6297be5c3506d86a2e25f24d6f1ab8`; original copier SHA256 unchanged. Actual native import module matches the backed-up v2.8 module. Desktop shortcut still points to the same HTML. No real UE calls or browser visual acceptance. Public sanitized registration `6bb40a2` and completion `6a21971` are on main; concurrent 4.3.8 handoff and state changes were preserved during rebase. Detailed verification and successful log mapping are in `research/naming-20261004/verification.json`.
