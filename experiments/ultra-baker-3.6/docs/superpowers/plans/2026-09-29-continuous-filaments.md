# Continuous filament reconstruction implementation plan

> Execution: implement sequentially in this experiment. Preserve both previous reconstructions and the production tool.

**Goal:** Correct the white-segment / warm-tail length relationship in both four-shaku video studies, with source crops and actual atlas playback for review.

**Architecture:** Use the existing measured star trajectories, but replace independent Gaussian sparks with a connected ribbon evaluated from emission history. Two age responses control the hot front and faint persistent body. Per-star lifetime variation is stable over time; curve joins share the same tangent. Keep this opt-in so existing recipes remain reproducible.

**Tech stack:** WebGL2 / GLSL, JavaScript, Python OpenCV, actual RGBA atlas exports.

## Constraints

- All changes inside `experiments/ultra-baker-3.6`; no production edits.
- No inferred fidelity percentage. Source smoke and lens response are not reconstructed by this change.
- Fixed camera and synchronized elapsed time in comparisons. Preserve old videos.
- Do not confuse a 8192 px atlas with its 1024 px frame.

## Tasks

- [x] Preserve revision 2 code, manifests and 4K textures under `studies/filaments/before`.
- [x] Extract native source tail crops at +3.2 / +7 s; distinguish hot length, dim body and curvature. Save coordinates, thresholds and caveats with evidence.
- [x] Add `41_filaments.js`: shared Hermite trajectory interpolation, analytic motion after emission, connected triangle ribbons, integrated transverse Gaussian, age taper and stable per-star variation. Route enabled aerial GPU tails through it in `40_gl.js`.
- [x] Add opt-in parameters to `10_types.js`, expose controls and revise both study recipes in `18_studies.js`. Keep V14 shell and ember initial trajectories identical.
- [x] Validate an isolated tail at several resolutions: no gaps, no segment-count brightness dependence, deterministic seeking, smooth extinction. Compare native crops before whole-flower export.
- [x] Bake revised 4K and 8K atlases into the new revision directory, capture actual playback and compose source / revision 2 / revision 3 videos. Include downloadable material packs and editor entry points.
- [x] Check browser playback, atlas PNG dimensions/channels, legacy regression, and production hashes. Record visual limitations.
