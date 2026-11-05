Receipt: c2-c773b1
Intended direction: A quiet, dense, dark "pro instrument" in the line of Unreal, DaVinci and Houdini. Blue-grey panels step down in brightness toward a near-black viewport (sampled at about #16232A top bar, #121D21 panels, #0C1618 viewport). There is one mint accent, near-square geometry, 1 px hairline module boundaries and a uniform 28 px row grid across the tree, timeline and inspector. The intent is for the chrome to disappear so the firework, the baked frames and the numbers can be read all day without fatigue. The restraint is real and the palette is coherent. The trouble is that the restraint is applied evenly to everything. Nothing is designed louder or quieter, so the screen reads as one uniform layer of 12–15 px text, hairlines and outlined boxes.

Contrast with Pentagram / Apple / Teenage Engineering: Pentagram would treat this as a typography and grid problem first. It would use one grotesk with tabular figures and three sizes at most. The inspector would get hard columns, with every value decimal-aligned and every unit on one column. Layer numbers 01–13 would be set as a deliberate index, and the firework would sit in its frame like a specimen plate with captions outside the image. Apple would do it the Final Cut / Reality Composer Pro way. The viewer would clearly dominate. The Simulate / Engine / Deliver mode would be a confident, centered workspace switch, not one of two identical segmented strips. Timeline lanes would be filled spans that show when each emitter is alive, and secondary controls would appear on hover. Status would collapse into one calm indicator that only speaks up when something is wrong, and every number would use SF tabular figures. Teenage Engineering would treat it as an instrument. A few big, proud readouts (0.89 s, 27/64, the current layer) would be set large and everything else tiny and gridded. The accent would mean "live" and nothing else. Emitter icons would be custom-drawn glyphs that encode layer type. The timeline would become a lit step grid where active spans glow and idle cells stay dark. All three would arrange the screen around the effect. This screen gives every panel the same visual weight.

Biggest gaps:
1. **Most of the screen goes to empty timeline lanes instead of the firework.** The viewport is about 1160×515 px (roughly 30% of the screen), and the effect itself fills only about 400 px of it. The timeline below gets almost the same area (about 1160×460 px) for 13 rows that each show the same full-width hairline. The only differences are that 06/07/08 start about 25 px later and the selected lane is white. The lane lines (sampled about #3E4F56, 2 px) are brighter than the module boundary lines (about #313F42), so content looks like structure, and the area reads as ruled paper. The bake strip above the ruler has about 10 filled thumbnails followed by empty dark cells, and its cells don't visibly line up with the ruler ticks, so it looks like a loading state rather than a filmstrip.
2. **The inspector has no consistent grid.**
   - Range sliders end about 60 px earlier than single sliders, so the track ends are ragged.
   - Values start at two x-positions (about 1755 and 1822). Figures are proportional, so 0.78 / 20.0 / -2.50 don't line up on the decimal point.
   - Units wander between x≈1853 and 1863. "亮度增益 5760" has no unit, and at 12 px the unit "个" renders as an up-arrow ("1 ↑").
   - Each curve editor is about 100 px tall, with the label stranded at the top of an empty label column. The "1.0" axis label collides with the top grid line, and the "寿命 0-100 %" caption sits inside the plot next to the last keyframe. The "关键点 2/5 · 寿命 15 % · 大小 0.90 倍" readout is spread across three loose columns with a hole in the middle.
   - Section headers (触发 / 运动 …) differ from rows only by weight, and their roughly 6 px chevrons hang into the gutter.
3. **The hierarchy is flat.**
   - Type runs from about 12 to 15 px in regular and bold only.
   - The workspace mode switch (实时模拟 / 引擎回放 / 贴图与交付) looks exactly like the framing presets next to it (适应 / 1:1 / 游戏内), even though one changes what the whole screen means and the other is a zoom preset.
   - Text buttons look the same as labels: 设置, 保存, 另存, 还原, 预览设置, 选项, 全部折叠, 查看, 复制意见.
   - Icon and text buttons are mixed inside the same clusters. In the viewport toolbar, view aids (grid, pencil) sit with layout toggles (panel left/right), then the text "预览设置". In the inspector bar, undo/redo icons sit next to a disabled "还原" that reads as a third undo.
4. **Mint does too many jobs.** It marks UE connected, the export folder, the current library tab, the tree edit outline, the playhead and the 导出 button. Because it appears so often, the 1 px edit outline in the tree (the one place mint has to mean "this") has to compete with five other mint marks. Amber has the opposite problem: the warning has no location. The tree root shows ⚠ and the inspector bar shows "⚠ 1 层", but no layer row in the tree or timeline carries the mark, so the eye cannot find the culprit.
5. **The top bar has no rhythm.**
   - Gaps between items vary from about 15 to 40 px with no grouping logic.
   - "设置" is stuck to the amber "备份 未选", so it reads as backup settings rather than global settings.
   - The page entries 资源交付 / 资源编排 use the same weight and color as status text, with no button or tab affordance.
   - The count badges (outlined squares with "2") read as keycaps or checkboxes.
   - The product lockup runs two names side by side ("烟花工坊" plus "FireWorksLab 5.0.3"), which weakens the version as the clickable part.
6. **The same list and the same control appear several times in different forms.**
   - The layer list appears three times: the tree, the timeline labels with the same indentation, and the breadcrumb.
   - "Filter" has three different looks: an outlined field with a funnel icon below the tree it filters, a "筛选 ⌄" text dropdown in the inspector, and outlined segmented chips in the library.
7. **Smaller details are rough.**
   - The viewport readouts sit on different baselines (the left one is about 9 px lower than the right) and inside the crop frame, so they overlay the effect. "tick" is English in an otherwise Chinese line.
   - Library status words (制作中 / 待验收 / 新 / 已通过) all use the same grey and weight, so the one that needs the user (待验收) is not easier to spot.
   - Two near-black thumbnails (千轮, 柳) look like broken images.
   - Ranges use an en dash (0.012–0.032), but the curve captions use a hyphen (0-100).
8. **Almost everything has a 1 px outline.** Segmented controls, three search or filter fields, badges, the "?" key and the tree selection are all 1 px outlined boxes. Outlines are the default container, so the mandated tree outline and the mandated module lines lose their distinctiveness.

AI tells:
- An off-the-shelf stroke icon set used as-is (Lucide/Feather style at default stroke): layers, magic wand, git-branch, eye, crosshair, ellipsis, hash, pencil, maximize, panel-left/right, undo/redo, copy, timer, scan, funnel. A "magic wand" as the emitter glyph is the giveaway, and the emitter icons barely tell layer types apart.
- Colored dot plus label status chips in the header (● UE 已连接 · ● 导出 · ● 备份), the default dashboard trope.
- Outlined square notification badges ("2").
- "⌄" chevrons on nearly everything: tabs row, speed, options, add layer, filter, range values, section headers and the export split. Several of them sit on things that don't open a menu.
- An accent-filled split CTA ("导出 | ⌄") parked top-right, the SaaS default (justified here, but executed generically).
- The same "N 项已隐藏 查看" disclosure line repeated in every section.
- A bilingual double name lockup in the header.
- A uniform 28 px row everywhere: consistent, but default rather than designed rhythm.
- Absent: purple gradients, card-within-card, pill tags, hero layout.

Top 3 to delete / simplify:
1. **Simplify the timeline lanes.** By default, show only the selected branch plus one summary lane, with the full 13 lanes expanding on demand. Draw each emitter's active span as a low-luminance filled bar, darker than the module lines, instead of a full-width hairline. Reduce lane height from 28 to about 18–20 px. Give the recovered ~250 px to the viewport, and line the bake strip up with the ruler (or label it plainly as bake progress).
2. **Give the inspector one rigid grid.**
   - Use one fixed slider-track length for every row.
   - Put values in one column of tabular figures aligned on the decimal point, and units in one fixed column.
   - Remove chevrons where nothing drops down.
   - Show curve editors at a compact height until they are focused, with the keyframe readout on one tight line beneath.
   - Use one filter pattern across the tree, the inspector and the library, placed above the list it filters.
3. **Reduce mint, outlines and the top-bar noise.**
   - Keep mint for "current" (the tree outline and the tab underline) and the primary action only. When things are fine, the UE and export status dots go neutral grey; they turn amber or red only when there is a problem. The playhead turns white.
   - Remove the outlines from badges, the "?" key and the tree filter field.
   - In the top bar, split the items into two clearly spaced groups (status | page entries + GPU), give "设置" an unambiguous position, and show one product name plus the version.

Score: 5.5/10 - The palette is coherent and calm and the 28 px rhythm is consistent, but the firework is under-sized while the timeline spends nearly as much space on identical hairlines, the inspector numbers don't sit on a grid, the hierarchy is flat from top bar to footer, and the icons, chevrons, status dots and outlines are template defaults rather than crafted.
