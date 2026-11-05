Receipt: c3-f73d11

Intended direction: A quiet, "instrument-grade" dark workstation in the line of Unreal, Houdini, DaVinci and Linear. Blue-grey neutrals carry everything. Mint is reserved for "live / current / commit" (UE status dot, edit outline, playhead, tab underline, Export). Corners are near-square, 1 px module rules separate the panels, and rows sit on a strict 28 px rhythm that runs through the tree, inspector and timeline. The only real imagery is the fireworks themselves (library thumbnails, the sprite sheet, the bake strip). The aim is a calm, numerically legible surface that a technical artist can stare at for ten hours while the content supplies the colour. The intent is right, and the palette, row rhythm and tabular numerals already deliver about 70% of it.

Contrast with Pentagram / Apple / Teenage Engineering: Pentagram would start from one typographic grid. The value column of the inspector, the PC/手机 table and the timeline readouts would share column edges and baselines, the table would be set as a real typographic table, and the sprite sheet would sit in a deliberate, centred field rather than being pushed into a corner. Apple (Final Cut, Motion, Logic) would make the viewer the undisputed hero: centred and filling its pane, with the top-level mode switch given visibly higher rank than sub-filters. Sliders would run the full inspector width with a tight value field. Each selection state would get exactly one visual meaning, and row controls (eye, target, more) would appear on hover. Teenage Engineering would treat it like a sequencer. Mint would mean "on / live" and nothing else, so toggles, playhead and active mode would all say "on" the same way. Numerals would use one fixed-width face at one size, and the bake strip would become a crisp step display instead of a run of hollow boxes. Every count, badge and status would follow one grammar. This screen has their restraint but not yet their rigour. Each part is tidy, but the parts don't share a system.

Biggest gaps:
1. The centre column has no composition. The hero (the sprite sheet) is pushed into the top-left corner as a hard black square on the blue-grey slab. The delivery table floats unframed to its upper right. Below the table is a dead void of roughly 480 × 450 px, the largest single area on the screen. The table's left edge (x≈1053) lines up with nothing, and the pager "‹ 金锦层 2 / 5 ›" hangs left-aligned under the sheet. The screen reads as two widgets dropped on a canvas, not as a viewer with a docked data panel.
2. Control hierarchy is flat. The top-level view mode (实时模拟 / 引擎回放 / 贴图与交付) changes the whole centre, yet it uses the same segmented control at the same weight as two minor sub-switches (PC / 手机, 贴图 / 逐帧). Three horizontal bars (top bar, view toolbar, transport bar) also carry near-identical visual weight. In the top bar, the page entries 资源交付 / 资源编排 are styled exactly like the status text around them and show no "you are here" state. The eye cannot find "where am I" in under a second.
3. One fill means four things. The same mid blue-grey fill marks a selected segment, the current library item, a row checked for export (金锦层 in the table) and the current timeline row. "Checked for export" and "currently editing" are different concepts, but here they look identical. The edited layer ends up marked in six places at once: mint outline, table fill with checkbox, timeline band, white timeline bar, pager label and inspector title. Emphasis turns into noise.
4. The inspector's proportions and edges are loose.
   - Each slider track is only about 165 px in a 440 px panel, followed by an unexplained gap of about 70 px before the value.
   - Collapsed-section summaries are ragged and don't sit on the value column: "号数 手动 序列时长 7.56 s" starts at x≈1703, while "1024 px 5 张" starts at x≈1771.
   - Section chevrons and the "modified" dot hang outside the label column, jammed about 6 px from the divider.
   - Reset icons appear in two different positions: on the section header and on the row.
   - A toggle's on state (发射器共用) is just a slightly lighter grey track than its off state (水平镜像, 爆后扰动). In an all-day tool, on/off must be readable at a glance.
5. The timeline lacks polish.
   - The playhead pin sits on top of the "2 s" ruler label.
   - The range label "0.35–2.85 s" is wedged into the ruler band.
   - The un-baked part of the bake strip is a checkerboard of about 25 hollow 1 px boxes, the busiest texture on the screen.
   - The current layer's bar is pure white, the brightest object after the Export button, so it reads as a scrollbar or selection.
   - The keyframe diamonds are tiny.
   - The band of dead space below the last track has no purpose.
6. The top bar has no grammar for counts and status.
   - The version carries a superscript "²" that reads as a footnote or a typo.
   - Counts are written four different ways: "资源交付 2" (inline digit), "⚠ 1" (icon plus digit) and "6 个" (word count) elsewhere on screen, plus that superscript.
   - Separators are inconsistent: a pipe after UE status, none between 导出 and 备份, and 设置 grouped with folder status.
   - "备份 未选" is a real risk state shown in neutral grey, while a lesser warning elsewhere gets amber.
7. Emphasis is ad hoc. In the library, 待验收 and 新 are brighter than 制作中 / 已通过, with no visible rule behind it. Bold is used for section headers, selected tree items, the current tab and the selected segment, so weight never means one thing. The time readout "2.00" is the only display-size number on screen, and that size appears nowhere else.
8. The icons are stock and partly decorative.
   - Every tree row repeats the same Lucide-style layer-stack glyph next to a number that already identifies the layer.
   - The glyphs for 星 / 火花 / 余烬 (sparkle, brush, dots) are approximations.
   - Each icon carries the same generic stroke and none was drawn for this product.
9. The status bar is stranded. "复制意见" sits alone in the bottom-left corner, far from anything it relates to, and help appears twice ("快捷键" and "?") at the opposite end.

AI tells:
- A stock Lucide-style icon set at uniform stroke, including the boilerplate eye / crosshair / "…" trio on the selected row.
- The same layer-stack icon repeated on every tree row as decoration rather than information.
- A "magic wand" auto-adjust glyph next to 曝光, the classic AI-era "✨auto" signifier.
- A segmented control used as the default answer to every binary or ternary choice, regardless of rank.
- "+ 加层 ∨ / + 加发射器 / + 新建" ghost-plus actions in the default scaffold style.
- No purple gradients, no card-in-card, no pill tags, no hero layout. The classic tells are absent, which is to the screen's credit.

Top 3 to delete / simplify:
1. Delete the floating-table-plus-void layout in the centre. Dock the delivery table as a framed, fixed-width rail inside the centre column, full height with its own 1 px rule, or as a strip under the sheet. Then centre and enlarge the sprite sheet in the remaining field. This one move fixes the biggest compositional failure on the screen.
2. Simplify selection to one meaning per signal. The mint outline means "editing" (tree only), the checkbox alone means "checked for export" with no row fill, and the fill means "current item" only. Drop the timeline row band and tone the current-layer bar down from pure white to the brightest neutral. Show the eye / target / … controls on hover rather than permanently on the selected row. Remove the repeated layer-stack icon from tree rows.
3. Simplify the top-bar grammar. Use one badge form for every count, remove the superscript, and split the bar into three groups with consistent separators: identity (name + version), status (UE · export folder · backup folder · GPU) and navigation (two page entries with a clear active state). Move 设置 out of the folder group. Give "备份 未选" the existing amber.

Score: 6/10 - The palette discipline, 28 px rhythm and tabular numerals are genuinely good, but an uncomposed centre, an overloaded selection fill and inconsistent micro-grammar (badges, separators, summaries, toggles) keep it at polished-internal-tool level, short of average agency craft.
