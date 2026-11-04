# Import Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Prevent mixed platform destinations, inherited double-sided/dissolve settings, missing ASTC formats and accidental directory creation.

**Architecture:** A private policy module owns destination selection and native texture/material scripts. Preview and execution both check existing directories; native readback precedes saving. Existing emitter construction and shared reference materials remain unchanged.

**Tech Stack:** Single-file HTML, JavaScript, Unreal Python 2.7, Node isolated fixtures, Python build.

## Global Constraints

- User authorizes code changes and will clean/reimport existing assets themselves; no native writes in this task.
- No new directories, including local backups and UE test directories.
- User confirmed HD texture directory and non-_HD textures are mobile: limits 2048 / 1024 respectively.
- Android/OpenHarmony/IOS all PF_ASTC_6x6; owned instances single-sided, neutral dissolve mask; preserve brightness and frame curves.
- Execute inline as already requested; extra execution skills unavailable. No subagents.

### Task 1: Policy and regression

Files: create `fireworks-policy.js`, `check-import-policy.cjs`; modify `build.py`, `fireworks-plan.js`, `fireworks-import.js`, `import-backend.cjs`.
Interfaces: `texturePolicy(pkg)` returns `{platform,directory,maxSize}`; `assertImportDirectories(it)` stops before writes; `applyTexturePolicy(dst)` and `materialPolicyCode()` produce verifiable native settings.

- [x] Write/run failing check: `assert.equal(b.makePlan(spec,'Test')['tex:hd'],HD+'/T_Test_HD')`.
- [x] Implement `texturePolicy` using `/_HD$/`, HD directory and existing mobile Fireworks/Ramp directories. Strict direct-child guard accepts subobjects but rejects nested directories/traversal.
- [x] Before preview/execute, assert each destination's actual content directory exists using `os.path.isdir`; never create it.
- [x] Set `max_texture_size` to limit; write three `PlatformCustomSettings.pixel_format` entries with `PixelFormat.PF_ASTC_6X6`. Read back all three plus size; missing/wrong settings stop save.
- [x] Filter Dissolve texture override; preserve other parameters, explicitly override TwoSided false and use TexDissolveSpeed=0, Offset=1, Power=1, DissolveProgress=0, UseParticleAlphaDissolve=0. Read back before save.
- [x] Build and run isolated native mocks for failure, rejected writes, preservation and new/update paths.

### Task 2: Directory-safe backup and release

Files: modify `fireworks-update.js`, `fireworks-ui.js`, `fireworks.html`, `README.md`, `CHANGELOG.md`; create reviewed exact patch manifest in existing backups folder.
Interfaces: update backup returns `{directory,manifest,assets}` with original/before_update flat file names.

- [x] Replace `os.makedirs` and nested backup trees with UUID-prefixed files in already-existing asset-backups; assert root exists; errors display unique manifest file.
- [x] Preview includes per-texture platform, directory, size limit and ASTC/material policy; prior confirmations are not persisted across refresh.
- [x] Update isolated mocks to simulate policy scripts, never suppress production readback. Keep exact-source regression guards via reviewed before/after patch manifest.
- [x] Build v2.15 in the same production path; run explicit isolated regression list plus new policy tests; no real imports. Verify original SHA unchanged.
- [x] Record release, user mobile cap override, sanitized handoff and release claim; push with safe rebase.
