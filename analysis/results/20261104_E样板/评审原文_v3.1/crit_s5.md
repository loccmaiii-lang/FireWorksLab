Receipt: c5-cbb143
Intended direction: A quiet, dark, high-density workstation in the tradition of Nuke, Houdini and DaVinci. The black viewport is the hero. Blue-grey chrome stays in the background, and mint is reserved for "current" and "go". Corners are square, modules are separated by hairline rules, and labels are text rather than icons. Rows sit on a steady ~28 px rhythm across the tree, timeline and inspector. The goal is a calm instrument where the firework is the only warm thing on screen. The bones are right: the corner-bracket frame in the viewport, the bake-thumbnail strip above the ruler, and the collapsed inspector sections that show a summary on the right (第 3 层 / 序列时长 7.56 s / 1024 px 5 张) are all good instincts.

Contrast with Pentagram / Apple / Teenage Engineering: Pentagram would build a strict type system first: two sizes, two weights, tabular numerals, and every label in every panel on a shared baseline grid. The top bar would read as one typeset line, not a row of loose grey fragments. Apple, as in Final Cut and Logic, would separate materials. Toolbar, inspector header, viewer and popover would each have a distinct level. Popovers would be anchored to their trigger and never half-mask the content they relate to. Every control would have one design with exact on, off and disabled states. Teenage Engineering would treat the screen as an instrument: every control one size, fixed columns, monospaced numerals, and the numbers you watch all day (timecode, bake progress) set large. Colour would be used only as signal, and export would be one unmistakable button. This screen has the right ingredients but executes them at internal-tool level. The type ramp is flat (everything about 12–13 px, with hierarchy from bold and white only). Numerals are proportional. Each control type comes in two or three variants, and the open menu creates a layering fault.

Biggest gaps:
1. The export popover is anchored wrong and masks the inspector. It is pinned to the inspector column's left edge (x≈1462), about 75 px left of its own trigger, instead of hanging right-aligned under the split caret. It covers the inspector's header row and the first three parameter labels. Their values (0.20 s / 1.10 倍 / 1.50 倍), the reset icons, 筛选 and 全部折叠 still show to its right, so it looks like a rendering bug rather than a popover. Its fill is only one step lighter than the panel, and it has no edge or elevation to say "I am on top".
2. The inspector has no header of its own. The document command row (undo, redo, 还原, an unlabeled duplicate icon, 保存, 另存, ⚠ 1 层, 导出) sits on top of the inspector column in the same strip, weight and height as the viewport toolbar. File commands and panel controls look like one thing. Icon buttons and text buttons are mixed in one run, and the disabled 还原 is barely distinguishable from the enabled 保存/另存.
3. One fact is stated six times: the ⚠ in the tree, "⚠ 1 层" on the button, "1 层需重新导出" in the menu header, and a right-hand count column of 1 / 3 / 1 / 1. The counts beside 重新导出, 导出本层 and 导出勾选 add nothing because the label already says it. The column reads like keyboard shortcuts and adds noise to the one menu that needs to be decisive.
4. Control dialects in the inspector:
   - The switches (水平镜像, 爆后扰动, 发射器共用) show a grey square inside an outline. They read as checkboxes, and the on state is only a paler fill.
   - The disabled 湍流尺度 track is about 60 px shorter than its enabled neighbours.
   - A clipped "A." glyph hangs after 曝光 1.00 倍.
   - The disclosure chevrons are about 6 px and hang on the column rule.
   - The ↺ reset icons appear on only some rows, which leaves a ragged right edge.
   - The units column drifts (s, 倍, m/s, K, none).
5. The type ramp and numerals are flat. The 2.00 / 5.24 s timecode, the most-watched number in the app, is only marginally larger than the body text. 烘焙 50 / 75 is body size. Values do not sit on tabular figures, so 0.20 / 1.10 / 1.50 and 2400 / 0.85 do not align. In the viewport HUD, the left group (PC 30 fps tick 60) and the right group (距离 1000 m 预览曝光 1.00 倍) sit on different baselines, about 9 px apart.
6. The top bar is one undifferentiated grey line.
   - 设置 floats between the backup status and the page entries, so it is unclear whether it belongs to the backup or is global.
   - The same outlined-box treatment carries three meanings: the "2" after the version (unread update log), the "2" after 资源交付 (pending deliveries), and the "?" in the status bar (a key).
   - The page entries 资源交付 / 资源编排 are styled exactly like status text, so they don't read as navigation.
   - The gaps between status groups are uneven.
7. Mode hierarchy is missing. 实时模拟 / 引擎回放 / 贴图与交付 sets what you are judging, since 引擎回放 is the acceptance view, yet it has the same visual weight as the zoom switch 适应 / 1:1 / 游戏内 next to it. The two switches are also drawn slightly differently: one is an outlined group, the other a filled cell. Five segmented controls on one screen flatten everything into the same "choose one" pattern.
8. The effect library list does not scan.
   - The status column (制作中 / 已通过 / 新 / 待验收) is all one grey with tiny brightness differences.
   - Dark thumbnails (千轮 小花, 柳 金色长垂) are near-black tiles, and subjects are framed at inconsistent scales.
   - The filter row crams a segmented control, "10 个" and "+ 新建" into 280 px.
   - An orphan chevron sits at the right end of the 效果 / 模板 tab row with no evident target.
9. Timeline polish:
   - The playhead head covers the "2 s" ruler label.
   - The in/out bracket draws heavy white verticals that compete with the mint playhead.
   - The last row (3 / 星) is clipped against the panel edge with no scroll cue.
   - The transport row is evenly spaced with no grouping, and the loop icon is the only filled-background icon.
   - Mint carries five meanings (current tab, edited tree item, primary action, playhead, "connected" status dots), which dilutes "current / go". This is about how often mint is used, not about the colour set.

AI tells: none of the classic ones. There are no purple gradients, no card-within-card, no pill tags and no hero layout. Mild tells:
- A stock Lucide-style icon set at default stroke weight (eye, crosshair, more, undo/redo, maximize, panel toggles, scan-frame). It sits next to custom glyphs for 星 / 火花 / 余烬, so the icons have two drawing hands.
- The generic "● status label" dot row in the top bar.
- Segmented controls used as the default answer for every choice (five on screen).
- A right-aligned count column in a menu, borrowed from shortcut menus.
- Outlined-number badges that look like keycaps, reused for unrelated meanings.

Top 3 to delete / simplify:
1. Delete the count column and the redundant "1 层需重新导出" header from the export menu. Fold 详情 into the ⚠ 1 层 warning. Re-anchor the menu right-aligned under the split caret, with a one-step-brighter edge, so it no longer half-covers the inspector.
2. Separate document commands from panel controls:
   - Group undo, redo and 还原 into one icon cluster.
   - Merge 保存 / 另存 into a single "保存 ⌄" split.
   - Give the duplicate icon a label or move it into that split.
   - Give the inspector its own header row (search / 筛选 / 全部折叠) below a hairline.
3. Collapse every control to one dialect:
   - One switch design with an unmistakable on state.
   - One slider length, including the disabled state.
   - One fixed units column with tabular numerals.
   - The reset icon shown only on rows that changed, in a reserved slot.
   - Keycap boxes kept only for keys; counts get a different badge.
   Fix the clipped "A." and the HUD baseline mismatch at the same time.

Score: 5.5/10 - Good pro-tool bones and restraint, but the open menu looks like a layering bug, each control type has two or three variants, and a flat type ramp with proportional numerals keep it at competent-internal-tool level, below average agency work.
