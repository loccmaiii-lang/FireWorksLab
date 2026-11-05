Receipt: c5-5ff1d5

Intended direction: A quiet, instrument-grade dark workstation in the Resolve / Unreal / Houdini line. The firework is meant to be the only light in the room. Around it sits a tight three-step blue-grey ladder: viewport darkest, panels in the middle, top bar and toolbar band lightest. Hairline module borders, square corners and 28 px rows keep it dense, and one mint accent marks "current" (tab underline, tree outline, playhead). The viewport is treated as a stage with print-style crop marks and a small silkscreen-like readout ("PC 30 fps tick 60"). The aim is calm, exact, all-day comfort for a technical artist, with nothing decorative. The restraint mostly lands: there is no ornament, and the photographic thumbnails and the firework carry the colour. What falls short is rigour, not taste.

Contrast with Pentagram / Apple / Teenage Engineering: Pentagram would start from a typographic system, not a component kit. They would use two or three sizes with fixed roles and a single label voice. The top bar, toolbar band and column headers would share one grid, so the right-hand status cluster would read as a typeset line with fixed slots instead of a run-on string of label/value pairs. Apple (Final Cut, Motion, Logic) would set clear primary, secondary and tertiary label colours in the inspector and give every segmented control the same height. Booleans would look like booleans. The workspace mode switch (实时模拟 / 引擎回放 / 贴图与交付) would be visibly a different class of control from a zoom toggle. Range handles, the playhead and its labels would never collide, and toolbar glyph groups would be spaced on a single rhythm. Teenage Engineering would push the one truly bespoke idea here, the viewport crop marks and fps silkscreen, across the whole instrument. Every readout ("2.00 / 5.24 s", "烘焙 50 / 75", "1.00 倍", "2400 K") would become a fixed-width tabular display. The bake strip would become a segment meter, and colour would carry exactly one meaning. All three would fix the same thing: here, sizes, insets and gaps drift by 2-4 px from region to region. That drift is the difference between "assembled from a kit" and "authored".

Biggest gaps:
1. Flat hierarchy, with bold doing two jobs. Nearly everything is one ~13 px size in two greys, so the inspector, timeline labels, top bar and library read as one even grey texture. Bold marks headings (规格 / 环境 / 颜色 / 输出, inspector title) and also marks the selected state (引擎回放, 适应, 全部, 单次, PC + 手机, the tree row). Section headers and selected segments therefore look the same. Only the firework and the solid 导出 button act as focal points. A real secondary type tier and a selected state carried by fill alone would fix most of this.
2. Top bar execution. The left ~60% of the bar is empty, and the right end is a crowded run-on: "● UE 已连接 | 导出 FWL_Export  备份 未选  设置 | 资源交付 2  资源编排 | RTX 4070".
   - Separators don't match the groups. 设置 sits in value-white directly after "未选", so it reads as part of the backup status.
   - Counts use two styles: a footnote-like superscript ² on the version and an inline "资源交付 2".
   - Status signalling is backwards. The healthy UE connection gets a mint dot, while the one state that needs attention ("备份 未选") is plain neutral grey.
   - The two page entries are typeset exactly like status text, with no hover or current-page treatment, so they don't read as navigation.
3. Toolbar band inconsistency. The two segmented controls are near-twins with different heights (27 px vs 23 px) and different fill logic. The primary workspace-mode switch therefore reads as a sloppy sibling of a zoom toggle instead of a clearly superior control.
   - Five unlabeled, semantically opaque glyphs (grid, document, brackets, two panel icons) are followed by the text button 预览设置, mixing icon and text conventions in one row.
   - On the right, the gaps between undo / redo / 还原 / duplicate / 保存 / 另存 / ⚠ 1 / 导出 have no common rhythm.
   - The band also breaks at the left column: centre and right get the lighter toolbar tone at y 40-80, but the left column starts straight into a tree row in the panel tone. The horizontal band steps down at the column line.
4. Export popover. Its header packs four facts into one line ("1 层需重新导出  PC + 手机  导出文件夹 FWL_Export  详情"). Two of them repeat what is directly below it (the platform segmented control) or already in the top bar (the folder).
   - The right-aligned count column mixes numbers with a layer name ("1 / 3 / 金锦层 / 1").
   - The popover's left edge sits about 48 px inside the inspector. It slices the labels underneath into truncated stubs (金锦层 cut to 金锦, 时间与…, 开始时, 缩放, 时间倍, 出生方), which looks broken rather than layered.
   - The split-button caret is a dark green (~#1E5B49) that is not in the stated palette.
5. Timeline polish.
   - The export-range label "0.35–2.85 s" floats over the ruler, and the mint playhead head covers the "2" of the "2 s" tick: a direct text collision at the most-watched spot on screen.
   - The bake strip uses ~18 px micro-thumbnails that are unreadable, followed by ten empty hairline boxes. That is a grid of noise standing in for a progress bar.
   - The emitter sub-rows (星 / 火花 / 余烬) are 1 px grey hairlines that look like grid lines, not data.
   - The tree shows emitter icons but the timeline's matching rows don't, so the same structure is drawn two ways.
   - The playhead line bleeds 1 px into the status bar.
6. Inspector controls.
   - Booleans are expressed three ways: toggle (水平镜像, 爆后扰动, 发射器共用), checkbox (联动的层, 同时放进编排) and two-option segmented control (单次 / 循环).
   - With near-square corners the toggle shrinks to a little box whose on and off states differ by one grey step, so at a glance it reads as a checkbox.
   - The right edge has four stops: values at ~1850, units at ~1870, the lone wand icon at ~1900, dividers at ~1905.
   - The wand icon next to 曝光 is the only icon in the parameter grid and is unexplained.
7. Left column micro-inconsistencies.
   - The tree selection (mint outline) is inset 8 px from the column edge, while the library selection (fill) is inset 4 px. Two selected rows in one column sit on different edges.
   - The root effect and its layers use the same stack icon, so the hierarchy depends on indentation alone.
   - The library statuses (制作中 / 待验收 / 新 / 已通过) differ by at most one grey step, so 待验收, the row that needs the user, does not stand out in a scan.
8. Accent semantics. Within the fixed palette, mint currently means three things: current item or time (tab, tree outline, playhead), healthy (UE dot), and primary action (solid 导出). Keeping mint for "current" and the one primary action, and expressing "healthy" in neutral, would make the accent read as a single signal.

AI tells:
- A generic outline-icon set (Lucide-style) used for unlabeled toolbar actions. It includes the "magic wand / sparkle = auto" glyph beside 曝光, the most recognisable AI-product tell on the screen.
- Segmented controls for everything: five groups (modes, zoom, library filters, platform, 单次 / 循环) in near-identical but not identical styling, the default-kit reflex rather than a chosen control vocabulary.
- Counts tacked onto every label: ², 资源交付 2, ⚠ 1, 6 个, 1 / 3 / 1 in the menu, 烘焙 50 / 75, 4 项已隐藏. Numbers are appended as loose metadata instead of being set in a deliberate readout system.
- Run-on "meta lines" of label/value pairs (top-bar status cluster, popover header), a dashboard-template habit.
- A text-glyph style ⚠ triangle used as the status icon in two places.
- Absent: purple gradients, card-within-card, pill tags and hero layouts. None of the big four appear.

Top 3 to delete / simplify:
1. The export popover header and count column.
   - Delete the restated "PC + 手机" and "导出文件夹 FWL_Export"; the title is just "1 层需重新导出", with 详情 as a quiet trailing link.
   - Keep the right column numeric-only by moving the layer name into the row label (导出本层 · 金锦层).
   - Anchor the popover flush to the inspector's left column line, or make it full column width, so it stops leaving truncated label stubs.
2. The bake-strip noise.
   - Delete the ten empty outlined boxes and stop rendering 18 px thumbnails by default.
   - Draw bake progress as one solid fill spanning the export range, and show frame thumbnails only on hover or scrub, or when 缩略图 is on.
   - Fold "烘焙 50 / 75" into that strip's label so bake progress is stated once, not twice.
3. The top-bar punctuation.
   - Delete the ad-hoc "|" separators and the superscript ².
   - Make three spaced groups: engine + folders | 资源交付 / 资源编排 | GPU.
   - Use one status-glyph language (same dot for every status: mint when OK, amber when unset, so "备份 未选" finally shows) and one count style.
   - Put 设置 at the end of the folder group as a clearly separate control, and give the two page entries a hover / current state so they read as navigation.

Score: 6/10 - The palette and value ladder are disciplined and the big template tells are absent, but hierarchy rests on bold alone and about a dozen 2-4 px mismatches (control heights, row insets, a label collision, run-on meta lines, a popover slicing labels) make it read as assembled from a kit rather than authored.
