Receipt: ab-c4e3df
Winner: B

Winning dimensions:
- Composition and space: B gives more of the screen to the viewport, which is the main thing on this screen. The timeline starts about 88 px lower and the framing guides grow from about 594x593 to about 678x675, so the shell reads noticeably larger.
- Hierarchy and focus: B collapses the layers you aren't editing (1 橙引线层, 3 点灭星) in the tree and in the timeline at the same time. Only the edited 金锦层 shows its emitters, so the screen is organised around the task. A expands all 9 rows in both places.
- Top-bar rhythm: B groups items with 1 px dividers ([UE] | [导出 / 备份 / 设置] | [资源交付 / 资源编排] | GPU). A spreads items with uneven gaps: 设置 sits tight against 备份, then there is a large gap before 资源交付.
- Timeline labelling: B names the range row "导出范围" and puts "0.35–2.85 s" on the band itself. The baked and unbaked parts of the bake strip are clearly told apart.
- Selection clarity in the library: B's selected row fill (#2B4149) clearly separates from the list. A's (#1B2A2F) is barely visible.
- Small polish: B replaces A's stray "A." after 曝光 with a proper auto icon. B's linked layers are explicit checkboxes, so you can see which layers are linked without opening a section.

Regressed dimensions:
- Inspector state clarity:
  - A disabled 湍流尺度 tells you why ("强度为 0 时无效"). B only dims "60 m".
  - B's toggle-on track (#2B4149) is too close to off. A's light track (#8DA3AC) reads at a glance.
  - "⚠ 1" is vaguer than A's "⚠ 1 层".
  - "备份 未选" loses its amber warning colour in B's top bar.
- Information and function completeness: three things visible in A don't appear anywhere in B. These are the range set-in, set-out and reset buttons, the viewport readout "距离 1000 m · 预览曝光 1.00 倍", and the parent breadcrumb "金曜菊-B ›". If they were removed rather than moved, B breaks the rule that every visible function is required.
- Input affordance: both search fields (the library and 参数名) lose their 1 px box in B. They now read as grey caption text instead of fields.
- Inspector rhythm: B's slider tracks stop about 70 px before the value column. The numbers float in an empty gutter, and you also get less track to drag along.
- Icon semantics: in the viewport toolbar, B's boxed icon set is more uniform, but the "<>" and note glyphs are ambiguous. A's #, pencil and expand icons say what they do.
- Lower-left balance: below B's 6-item library there are about 350 px of empty column with nothing anchoring the bottom.

Key differences:
- Space and focus: B collapses the non-edited layers in both tree and timeline (6 rows instead of 9) and gives the space to a larger viewport. This is the change with the most leverage, and the main reason B wins.
- Inspector micro-states, A ahead: A explains disabled parameters, has a toggle-on state with clear contrast, a "⚠ 1 层" chip with a noun, and a breadcrumb. On these B looks newer but tells you less.
- Top bar: B is calmer and grouped. A's three status dots and uneven gaps read like a list rather than a structure. But B drops the amber on "备份 未选", so a warning state goes quiet.
- Export range: B labels it and centres the value on the band. A keeps the in, out and reset tools in reach. B's handling is cleaner, but the tools are not visible in B.
- Inspector layout: A's slider tracks run up to the values. B's shorter tracks leave a dead gutter that repeats on every row.
- Linked layers: B shows explicit checkboxes, which make the state obvious but take more height. A has a collapsed "轨迹联动 · 第 3 层" summary, which is compact but hidden behind a click.
- Bake strip: B marks unbaked frames as outlined empty slots, which reads well but adds a checkerboard of 10 outlines. A's unbaked cells are quieter but ambiguous.
- Library tabs: A's tabs are full-width, half each, with a long mint underline, the literal "large tab". B's are compact, left-aligned and bold, with a short underline. Both meet the brief; A's reads more like a large tab.
- Version and badge handling: A boxes the counts "[2]" so they look like keycaps. B's superscript "5.0.3²" reads as an exponent or a typo.

AI tells seen:
- A:
  - The stray "A." glyph after 曝光 looks like a placeholder or a truncated label that shipped.
  - Every node is expanded in both tree and timeline: the data is dumped with no editorial choice about focus.
  - Boxed digit badges look like keyboard keys.
  - A coloured dot goes in front of every top-bar status, whether or not it carries a state.
  - The tabs are the default even 50/50 split.
- B:
  - A generic boxed icon pack is used for the viewport toolbar, including a "<>" code glyph for a viewport action. The icons were picked to look uniform, not to carry meaning.
  - The same layer-stack icon is stamped on every layer row even though the number already identifies it.
  - A hollow "modified" dot and a reset arrow mark the same state twice on 缩放.
  - The superscript "²" badge.
  - Borderless "ghost" search fields.
  - A default-form checkbox list for linked layers.
  - A placeholder grid of empty outlined bake slots.

Top 3 to delete / simplify (in B):
1. Remove the 10 empty outlined bake-slot boxes. End the strip in a flat dim track, because "烘焙 50/75" already states progress. The outlines are the noisiest object in the timeline header and compete with the ruler and the range band.
2. Remove the repeated markers:
   - the layer-stack icon on layer rows 1–3 (keep it on the effect root only);
   - the hollow modified-dot beside 缩放, since the reset arrow already marks an override.
   Keep one marker per state.
3. Remove the dead gutter in every inspector row: run the slider tracks up to the value column as A does. While doing this, restore the amber on "备份 未选" and replace the dimmed "60 m" with the reason text. That fixes B's biggest state-clarity losses without adding anything.
