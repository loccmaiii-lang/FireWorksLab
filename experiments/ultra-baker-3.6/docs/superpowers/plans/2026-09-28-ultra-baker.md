# Ultra Baker 3.6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Deliver a separate, runnable high precision baker with visual evidence, without modifying the original tool.

**Architecture:** Copy the current 3.6 source into this experiment. Add quality parameters to the existing render/bake path, native resolution asset decoding, and an explicit comparison workflow. Preserve the original simulation, RGBA relay, frame selection and Cascade export contract.

**Tech Stack:** Standalone HTML, WebGL2 / GLSL, Python build, Playwright browser tests.

## Global Constraints
- All writes stay in `experiments/ultra-baker-3.6/`.
- Original source is verified using SHA256 before delivery; no commit or push of unrelated work.
- 2K engine output remains available; 4K/8K are explicitly labeled experimental source masters.
- No temporal interpolation of relay frames; no simulation density reductions.
- Runtime quality and visual gains must be reported separately. No invented percentage score.

## Task 1: Isolated runnable copy and controls
Files: `tool/build.py`, `tool/src/js/05_quality.js`, `tool/src/js/88_quality_ui.js`, `tool/src/body.html`, `tool/src/style.css`.
- [x] Snapshot baseline HTML and source hashes; isolate browser storage with `fwb.ultra36.`.
- [x] Preserve relative reference media links using `../../../` from copied tool directory; start on a procedural effect rather than auto-loading review media.
- [x] Add preview scale, bloom/raw inspection, loupe, quality presets, frame budget reporting, original-style restore and source-master controls.

## Task 2: Sampling and particle kernel
Files: `40_gl.js`, `42_trail.js`, `50_bake.js`, `80_render.js`, `85_stills.js`.
Interfaces: `qualityOf(P)` returns `{ss,hz,maxSub,kernel,core}`; `setParticleProfile(P)` selects the current draw profile; `setParticleUniforms(pr,chan)` binds the selected profile.
- [x] Replace fixed `cw*2` with `cw*qualityOf(P).ss`; integrate all `ss*ss` samples in the atlas packing shader, before nonlinear encoding.
- [x] Integrate Gaussian coverage over each pixel using an erf approximation, with normalized narrow-core mixture. Keep legacy kernel selectable.
- [x] Sample shutter using selected temporal frequency/cap; never change shutter duration implicitly.
- [x] Pause live drawing while baking owns GPU targets; always restore flags and dispose targets on failure/cancellation.
- [x] Render higher resolution live targets and add controllable bloom / raw intensity mode. Report actual buffer and cell dimensions.

## Task 3: Full resolution asset decoding
File: `77_assets.js`.
Interfaces: `assetFrames(tex)` returns `{length,get(frame),dispose()}`; `readDataBitmap(bitmap)` returns RGBA bytes without premultiplied-alpha conversion.
- [x] Upload unpremultiplied ImageBitmap to a dedicated WebGL2 context and read exact RGBA bytes; test RGB preservation when A=0.
- [x] Lazily decode native rectangular cells, cache at most 16 frames or 64 MiB per emitter, release caches on source/variant replacement.
- [x] Retain existing Canvas2D composition, explicitly document that it does not reproduce UE HDR postprocessing.

## Task 4: Verification and delivery
Files: `tests/verify.cjs`, `results/*`, `README.md`.
- [x] Browser test: page initialization, all shader compilation, no GL error, 2K/4K atlas dimensions, four relay channels, exported PNGs, native asset frame and alpha-data regression.
- [x] Compare identical seed / view / times / exposure for legacy, sampling-only and core enhancement, with bloom held fixed. Save 1:1 crops, timing, full-size captures and JSON metadata.
- [x] Exercise a burst, dense sub-bursts, long tail and ground loop; exercise high-resolution preview and 8K source master.
- [x] Open final UI and inspect screenshots; verify original hashes; write limitations and usage instructions alongside results.

## Completion notes
- Implemented and validated inline in the authorized test directory. Original source is unchanged.
- No direct UE run was available; engine validation remains documented separately.
- Windows native Playwright used the installed Chrome and RTX 5080; all output evidence is local.
