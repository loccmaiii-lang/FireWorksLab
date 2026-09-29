# Video reconstruction Implementation Plan

**Goal:** Inspect both original videos continuously, correct measured timing and structure, and deliver synchronized H.264 comparisons using actual baked textures.

**Architecture:** Keep the original baker intact. Preserve the first experimental recipes and 4K results; measure source footage in source-frame coordinates; revise only the experimental simulation and study recipes. Render old and new actual atlases against identical reference times.

**Tech Stack:** Python, OpenCV, NumPy, Pillow, FFmpeg, existing WebGL2 baker, Node and Playwright.

## Global Constraints

- All writes stay under experiments/ultra-baker-3.6.
- Both V14 and V13; do not use generated imagery as reconstruction evidence.
- Report source pixels and timing uncertainty. Do not invent physical dimensions or similarity percentages.
- Preserve original tool hashes and distinguish optical sharpness from reconstruction fidelity.

### Task 1: Continuous video evidence

- [x] Save first-pass 4K manifests and referenced textures into studies/motion/before.
- [x] Create tests/motion_analysis.py: read all frames, extract dense phase sheets, record source-frame time, high-pass luminous area, color fractions and robust envelope radius in explicit ROIs. Exclude captions and ground.
- [x] Inspect dense sheets and detailed patches. Record onset, transition and fade intervals in studies/motion/analysis.json with uncertainty and known contaminants.

### Task 2: Experimental reconstruction

- [x] Correct 18_studies.js from observed phase evidence. Extend simulation only where a missing capability is needed for observed behavior; defaults preserve existing effects.
- [x] Bake 4K draft, inspect synchronous frames against reference and prior version, then bake 2K/4K/8K deliverables.
- [x] Run physics, atlas, browser and original-file regression checks.

### Task 3: Dynamic deliverables

- [x] Capture each atlas playback at 30 fps using absolute elapsed seconds and fixed framing.
- [x] Encode real/prior/revised H.264 MP4 comparisons plus annotated reference breakdown; label timing and alignment choices visibly.
- [x] Add downloadable/playable videos and phase findings to studies/motion/index.html and link from study gallery.
- [x] Decode every exported MP4, verify frame counts and browser seek/playback, and document achieved improvements and remaining deviations.


Validation completed: original 29 source-file hashes unchanged; 34 atlas files in 10 validated packages; 12 H.264 videos fully decoded; all 8 presentation modes seek and play in Chrome; simulation linkage and child physics tests pass. Video references and known reconstruction gaps are recorded in studies/motion/复刻拆解.md.
