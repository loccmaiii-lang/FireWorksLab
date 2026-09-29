# 金芒菊与两种四尺玉对照 Implementation Plan

> **For agentic workers:** Execute inline in the already authorized isolated experiment; do not overwrite the production baker or accepted recipes.

**Goal:** Deliver a controlled 金芒菊 resolution comparison and inspectable V14/V13 layered reconstructions using the experimental baker.

**Architecture:** Measure local reference videos, keep recipes in a separate experimental module, bake independent gray RGBA layers and segmented timelines, then replay those actual atlases through a WebGL viewer with reference synchronization. Preserve editable JSON and Cascade parameter exports.

**Tech Stack:** Existing WebGL2 baker, JavaScript, Python/OpenCV/Pillow, Playwright/Chrome.

## Global Constraints

- All changes remain under `experiments/ultra-baker-3.6`.
- 金芒菊 uses the accepted JM fixed-framing recipe; match seed, frame times, camera, exposure, and display size for baseline and upgraded variants.
- Source videos are reference evidence, never upscaled and described as new detail.
- V13/V14 are first reconstructions pending visual approval, not accepted production assets.
- Preserve 2K delivery variants and provide 4K/8K masters. Atlas resolution and per-frame resolution must both be shown.

## Tasks

- [x] Inspect accepted JM recipe, old V14 measurements, and both original reference videos. Extract reference frames and upper-half expansion measurements to `studies` with `tests/study_reference.py` and `tests/study_measure.py`.
- [x] Create `tool/src/js/18_studies.js`: separate layered V14/V13 recipes and fixed-frame study plans. Return complete P/M parameters so artifacts are reproducible.
- [x] Create `tests/study_bake.cjs`: use original frozen baker for JM baseline; bake matched 2K/4K/8K variants; export original metadata, gray atlases, Cascade instructions, and composite proof frames. Validate frame counts, dimensions, GL status, temporal segment continuity, and original-file hashes.
- [x] Create `studies/index.html` and `studies/player.js`: actual-atlas animation, synchronized source video, quality selection, pause/seek/speed, detail zoom, and package links. Use the same ramp, tint, exposure and integer frame selection as the baker.
- [x] Inspect composite/reference proof images, tune recipes, and record objective limits. Test gallery controls, both reference clips, atlas decode, and responsive layout.
- [x] Package final 2K/4K/8K exports and document measured resolution/time/storage tradeoffs in `studies/结果说明.md`. Add entry links in experimental baker and landing page only.

## Verification contract

```js
assert.equal(meta.L.F, 256);
assert.equal(atlas.width / meta.L.cols, expectedCellPixels);
assert.equal(gl.getError(), 0);
assert.deepEqual(jmBaseline.times, jmEnhanced.times);
assert.deepEqual(jmBaseline.view, jmEnhanced.view);
assert.deepEqual(jmBaseline.exposure, jmEnhanced.exposure);
assert.equal(segment0.t0 + segment0.duration, segment1.t0);
assert.deepEqual(changedProductionFiles, []);
```

No similarity percentage is invented. Expansion curves are a shape diagnostic and do not score color, camera motion, smoke, brightness, or individual-star correspondence.
