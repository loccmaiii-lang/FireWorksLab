Receipt: ab-e0821b
Winner: B

Winning dimensions:
- Clarity of state. The top bar uses status dots, and only the problem state (备份 未选) is in amber. The warning reads "⚠ 1 层" instead of a bare "⚠ 1". The breadcrumb starts at the root (仙女棒 › …). Counts are shown as chips ("资源交付 [2]") instead of a loose digit.
- Timeline composition. The range readout "0.00–2.13 s" and its in/out/reset controls sit in the left gutter, so they no longer collide with the "1 s" tick label (A overlaps them). The bake strip and ruler share one aligned gutter. Unbaked slots are quiet dark cells instead of A's 1 px wireframe boxes.
- Structure consistency. All 13 tracks are listed and match the structure tree one to one. A cuts off at 09 with "还有 4 行", so four layers in the tree have no visible lane.
- Input affordance. The library search and the parameter search are drawn as real fields. In A they are bare placeholder text that reads like a label.
- Effect library tabs. They are equal-width and large, with a full-width mint underline, which matches the "large tabs" brief more fully than A's small, left-aligned tabs with a short underline.

Regressed dimensions:
- Viewport size. The viewport is about 15% shorter (≈513 px tall vs ≈605 px). The firework scales down with the frame, and engine playback is the surface used for acceptance.
- Inspector alignment rhythm. In A every slider track ends on one column (x≈1751). In B single-value tracks run to ≈1805 and range tracks stop at ≈1745, so the right edge is ragged. The same value (阻力 20.0) shows its handle in a different place.
- Toolbar spacing. The viewport icon gaps are uneven (20/28/19/19 px vs A's even 19–20). The icon group also floats about 36 px away from "预览设置" (A: 20 px).
- Top-bar grouping. A groups items with dividers. B relies on gaps alone, and they are uneven (35/25/15/43/29/36 px), so status items, the settings action and the resource entries blur together.
- Local consistency. The tree footer boxes "筛选" like an input, while "加层" and "加发射器" next to it are borderless, and the inspector's "筛选 ⌄" is borderless too.
- Noise. A second HUD readout (距离 1000 m / 预览曝光 1.00 倍) now sits inside the viewport frame.

Key differences:
- Timeline header: A has a label collision ("0.00–2.13 s" printed over the "1 s" tick) and shows its range with no controls. B moves the range to the gutter and adds set-in, set-out and reset next to it. This is the most visible craft defect in A.
- Track list vs tree: B shows all 13 lanes and mirrors the tree. A shows 9 lanes plus "还有 4 行", so tree and timeline disagree about what exists.
- Viewport vs timeline split: A gives the playback viewport more height. B trades about 90 px of viewport for the full track list and adds an extra readout in the frame. This is the main cost of B.
- Top bar: A puts a superscript "²" after "5.0.3", which reads as "squared". B replaces it with a boxed chip (still unclear what it counts), adds green/green/amber status dots and colors only the exception. A's divider grouping is cleaner, but A gives no visual signal for the backup-not-set problem.
- Inspector: B has longer slider tracks, so finer drag resolution, but loses A's single track-end column. B's curve readout labels (大小 / 亮度) sit next to their values, while A's float mid-row away from the number.
- Affordances: B boxes the search inputs, which helps. It also boxes 筛选 in the tree footer, which does not.
- Bake strip: A's empty outlined cells look like a wireframe placeholder. B's subdued empty cells keep attention on the baked thumbnails.

AI tells seen:
- A:
  - The superscript "²" version badge reads like an exponent, a placeholder-looking artifact.
  - A text overlay collides with the ruler labels; the overlap was never checked.
  - Empty 1 px outlined boxes fill the unbaked strip and look like a wireframe.
  - The timeline is cut off with a generic "还有 N 行" footer instead of fitting the content.
  - Search fields are just icon plus grey placeholder text, with no field.
  - There is a dead gap of about 70 px between slider ends and values.
  - Library status words (制作中 / 待验收 / 已通过 / 新) all share one grey treatment, so state is unreadable at a glance (shared with B).
- B:
  - The status-dot-plus-label triplet in the top bar is a generic SaaS status pattern.
  - Boxed number chips are used without saying what they count, including one stuck to the version string.
  - A HUD readout sits in a second corner of the viewport frame.
  - One boxed "筛选" pseudo-button sits among borderless actions.
  - Icon spacing in the viewport toolbar is uneven.
  - Shared with A: "寿命 0–100 %" axis captions are repeated under each curve, crowding the last keyframe and the next chart's "1.0". The "关键点 2 / 5" lines are repeated too, and "1 项已隐藏 查看" lines appear in every section.

Top 3 to delete / simplify:
1. Remove the in-frame "距离 1000 m / 预览曝光 1.00 倍" HUD, or show it only when the value is not the default, through 预览设置. Give the reclaimed height back to the viewport, the acceptance surface. Keep the full 13-track list by tightening lane height rather than taking space from the viewport.
2. Simplify the top bar:
   - Drop the green dots on healthy states and keep color only for exceptions (amber 未选).
   - Delete the unexplained "[2]" chip after "5.0.3".
   - Replace the uneven gaps with one grouping system (status | actions | resources | GPU) using the existing 1 px dividers.
   - Even out the viewport icon spacing and tuck the icons against "预览设置".
3. Clean up the inspector and footer chrome:
   - Give every slider track one shared right edge for both single and range rows.
   - Remove the box from the tree-footer "筛选" so it matches 加层 / 加发射器.
   - Collapse each curve's repeated "寿命 0–100 %" caption and the "关键点 2 / 5" row into a single readout line under the chart.
