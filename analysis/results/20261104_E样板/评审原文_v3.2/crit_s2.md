Receipt: c2-f62d63

Intended direction: A dark, low-chroma professional DCC workspace in the Houdini / Resolve / Unreal-editor family. The blue-grey chrome is meant to fall back so the emissive firework is the brightest thing on screen. Mint is kept for "live / current / primary" (the playhead, the selected tree node, the 导出 button) and amber for anything that needs attention. The layout has four zones (structure tree over library, viewport, timeline, inspector), bounded by 1 px hairlines. It is text-first and dense, set on a steady 28 px row grid, and aims for quiet efficiency over decoration. The bake-frame corner marks and the HUD readouts in the frame corners (PC / 30 fps / tick, 距离 / 预览曝光) are the most deliberate, bespoke-feeling moves on the screen.

Contrast with Pentagram / Apple / Teenage Engineering: Pentagram would start from a strict typographic system: two or three sizes, tabular figures aligned on the decimal point, and hierarchy carried by type alone. It would also force every time-based element (bake strip, ruler, lanes) onto one shared horizontal axis, so that the bottom third reads as a single diagram. Apple (Final Cut / Motion / Logic) would ship one contextual toolbar instead of two stacked bands, use a single control height and button style across the app, and make the timeline lanes meaningful objects (lifetime/emission clips with real start and end) instead of decoration. Teenage Engineering would push reduction and character further. It would draw custom glyphs instead of a stock outline icon set, use monospaced numerals, and show the data itself: emission density as a waveform in each lane, and bake progress as a physical-looking meter. Mint would be a single, rare "this is live" signal. All three would keep this palette and these square corners. What separates them from this screen is the rigor of the type scale, the control vocabulary, and the time axis, not the styling.

Biggest gaps:
1. The timeline is the weakest region and takes about a third of the screen. Seven near-identical full-width 1 px hairlines carry almost no information. Start offsets differ by only a few pixels, and only the selected 08 lane is brighter. "还有 3 行" truncates the list while it sits jammed against the status-bar line. The bake thumbnail strip stops at about 1.3 s on a 2.13 s ruler, leaving a dead stub that cannot be told apart from the background. If that gap is bake progress (烘焙 27/64), it needs a progress treatment. If it isn't, the strip does not map to the ruler directly beneath it. The "0 s" label is crammed against the left boundary.
2. Hierarchy is flat. Nearly every string is 12–13 px regular grey, with bold as the only lever. The viewport mode switch (实时模拟 / 引擎回放 / 贴图与交付) changes what the entire viewport means, yet it gets the same weight and size as the zoom selector next to it (适应 / 1:1 / 游戏内). The two styles even differ slightly for no reason: one is outlined, the other filled. In the top bar, the page entries 资源交付 / 资源编排 look identical to status text and to 设置, and nothing says which page you are on. Status encoding is inconsistent: only 备份 gets a dot, while "UE 已连接" and "导出 FWL_Export" have none, so they read as labels, not states. The boxed "2" badge appears twice with two different meanings (update log vs. pending deliveries).
3. Chrome stacking and scope ambiguity. The top bar and the viewport/inspector toolbar band share the same lighter fill, which makes an 80 px header slab over the middle and right columns. The left column starts its tree root at panel fill right under the top bar, which leaves an L-shaped notch in the top edge. 保存 / 另存 / ⚠1 层 / 导出 sit in the inspector column header directly above a breadcrumb ending in "08 二级碎火星". Whole-effect actions therefore read as if they were scoped to the selected emitter.
4. The control vocabulary drifts. At least six button treatments coexist:
   - outlined segmented (mode)
   - filled segmented (zoom, 球面/锥形, 线条/点/碎片, library filters)
   - bare text (加层, 加发射器, 新建, 保存, 选项, 全部折叠, 查看, 缩略图)
   - a bordered pseudo-input (筛选 in the tree footer)
   - bare icons (the viewport cluster)
   - a filled CTA

   The single tree-footer row alone mixes three of these. The viewport icon cluster has uneven pitch (pencil-to-expand gap is wider) and then switches to the text label 预览设置. "复制意见" in the status bar is an action styled as a caption.
5. Inspector micro-rhythm breaks the otherwise good 28 px grid:
   - Values are left-aligned, not decimal-aligned (0.78 / 20.0 / -2.50 stagger).
   - Unit chevrons (⌄) appear on only four rows.
   - The "1 项已隐藏 查看" and "3 项已隐藏 查看" meta rows break the parameter rhythm. In 外形 the hidden-items row even sits between 形状 and 线宽.
   - The 大小曲线 readout ("关键点 2/5 …") nearly touches the next chart's "1.0", so the two charts merge into one block.
   - The section-collapse chevrons are about 6 px and hang outside the content edge, where they look like stray marks.
   - The pure-white slider thumbs form a bright vertical column of ticks that competes with the firework for second-brightest element.
6. The library list reads ragged. Thumbnails use inconsistent framing scales (full-bleed chrysanthemums vs. tiny vertical streaks). "柳 金色长垂" shows a purple-dot thumbnail almost the same as "千轮 小花", which reads as a wrong or placeholder image. Mixed Latin/CJK naming (Comet 3.0, Silver 3.0) breaks the column texture. There is also an orphan ⌄ at the right end of the 效果/模板 tab bar with no obvious purpose.

AI tells:
- The stock outline icon set is used at default stroke, apparently unmodified (grid, pencil, maximize, panel-left/right, copy, timer, scan). It is the most visible "generated" signal.
- Decorative dropdown chevrons are everywhere: after units, after 1×, 加层, 选项, 筛选, and alone on the tab bar.
- Boxed numeric badges ("2") are reused for unrelated meanings.
- There is a generic mint split-button CTA (导出 | ⌄) and a stock amber ⚠ triangle used twice (tree root and toolbar) for the same warning.
- The "N 项已隐藏 查看" progressive-disclosure line is generic.
- Overall it is the default "dark dashboard" texture: uniform 13 px grey-on-blue-grey with weight as the only hierarchy.

None of the classic tells appear: no purple gradients (the purple is firework content), no card-within-card, no pill tags, no hero layout.

Top 3 to delete / simplify:
1. Simplify the timeline lanes. Stop drawing seven identical hairlines. By default, show only the selected emitter's lineage (05 › 06 › 08) as real lifetime/emission bars, with the rest folded into one summary lane that expands on demand. Put the bake strip on the ruler's time scale and give bake progress an explicit fill. This removes the "还有 3 行" truncation and gives roughly 120–150 px back to the viewport.
2. Remove the inspector's chevron and meta-row noise. Drop the per-value unit ⌄ and make the unit text itself the click target, with an affordance only on hover. Fold "N 项已隐藏 查看" into the section header as a quiet count. Decimal-align the value column. That restores an unbroken 28 px rhythm.
3. Collapse the chrome and cut the button styles to two:
   - Give the toolbar band the panel fill instead of the top-bar fill, so the top bar stands alone and the left-column notch disappears.
   - Group the five viewport icons and 预览设置 into one evenly pitched cluster.
   - Give the mode switch a clearly primary treatment and drop the zoom selector to a quieter one.
   - Keep only bare text and filled segmented as button styles, plus the single mint CTA. Retire the bordered pseudo-input 筛选 and the outlined segmented variant.

Score: 6.5/10 - The palette discipline, row grid and viewport framing are solid. The execution is still stock-generic (stock icon set, flat 13 px type, six button dialects), and the timeline spends a third of the screen on hairlines that carry no information.
