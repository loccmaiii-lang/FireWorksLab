Receipt: ab-478e95
Winner: A

Winning dimensions:
- Hierarchy and focus. A expands only the layer being edited (金锦层) and collapses layers 1 and 3. The mint-outlined row is the clear centre of the tree, and the timeline below it follows the same structure.
- Composition. The firework preview is the main object in this tool, and A gives it more room: the framing brackets are about 678x675 px in A and 592x591 px in B, so the preview area is roughly 30% larger. B gives that space to a 10-row timeline instead.
- Clarity of state. 待验收 (awaiting acceptance, the one item that needs the user) is amber in A. B makes it white like the other labels, and its 新 is the same bright white, so the status that matters no longer stands out.
- Top bar. A only flags what is wrong (the amber dot on 备份 未选) and separates groups with 1 px dividers before 资源交付 and before the GPU name. B puts a mint dot on every healthy status, removes the dividers, and spaces items unevenly: 设置 sits about 15 px from 未选 but about 50 px from 资源交付.
- Polish. A's auto-exposure icon is a clean circled A. In B the same icon renders as "A.", which looks like a missing glyph. B also has text overflow and an inconsistent slider track (see below), which A does not.
- Restraint. A's status bar is just 已保存 20:31 and 快捷键. B adds a boxed "?" next to 快捷键, which says the same thing twice.

Regressed dimensions (where A is clearly worse than B):
- Numbers in the right panel. A left-aligns values with the unit attached ("0.20 s", "2400 K"). B right-aligns values with units in their own column, which scans better, and its slider tracks are about 45 px longer, so they are finer to drag.
- Alignment of collapsed-section summaries. In A, "号数 手动 序列时长 7.56 s" starts about 40 px left of the value column that 第 3 层 and 1024 px 5 张 use, so it looks broken. B right-aligns all three summaries to one edge.
- Bake progress. B shows the 25 unbaked frames as empty cells after the 50 baked thumbnails, so 50 / 75 can be read directly. In A the thumbnail strip simply stops, with no sign of what is left.
- Tree and timeline visibility. With layers 1 and 3 collapsed, A hides the emitter timing for those layers, and the collapsed timeline rows have no chevron to show they hold more.
- Dead space. A's effect library ends at about y=905 and leaves roughly 150 px empty at the bottom of the left column. B's taller tree fills that space.

Key differences:
- Expansion policy. A shows only what is being edited. B expands every layer, which costs about 85 px in the tree, about 110 px in the timeline, and a noticeably smaller preview. For someone tuning one layer all day, A's choice is the right one.
- Parameter column. B has the better tabular layout for numbers but introduces new defects. "强度为 0 时无效" runs past the unit column to the panel edge. The disabled 湍流尺度 track ends about 60 px short of the tracks above and below it. The auto-exposure icon renders as "A.". A's layout is less precise but has none of these defects.
- Top bar. A shows status only by exception and uses dividers to group items. B has three status dots, two of them mint for "all fine", which spends the single accent colour on calm states. Mint already marks the edited row, the tab underline, the playhead and the export button, so this weakens it.
- Status labels in the effect list. A: amber 待验收, grey 新. B: white 待验收 and white 新. B ends up stressing "new" as much as "needs action".
- Bake strip. B's empty cells for unbaked frames are a real improvement that A should adopt.
- Thumbnails. B's thumbnail for the selected effect is noticeably darker than A's (mean luminance about 23 vs 49), and its 千轮 and 柳 thumbnails nearly disappear into the background. A's thumbnails read better.
- Spacing of units. B widens the gap before units everywhere, including the preview overlay ("距离  1000  m"), which looks mechanically spread out rather than deliberately set.

AI tells seen:
- A:
  - Every row is the same "label + value + unit" pattern at one size and weight, so nothing carries more emphasis than anything else.
  - Collapsed section headers carry metadata strings ("号数 手动 序列时长 7.56 s") with no clear purpose.
  - Helper text ("强度为 0 时无效") sits in the value column as if it were a value.
  - Boxed number badges are used twice, and the "2" beside the version number has no visible meaning.
  - Two clusters of overlay readouts sit in opposite corners of the preview.
  - The search placeholder lists three search keys (名称、任务号、花型), a stock pattern.
  - A status word appears on every list row, including the default 制作中.
- B:
  - A status dot on every system item, including healthy ones (a classic generated-dashboard pattern).
  - The tree and timeline default to fully expanded.
  - A boxed "?" duplicates the 快捷键 label.
  - The auto-exposure icon renders as "A.", which looks like a placeholder or missing glyph.
  - Units are spread into their own columns even in the preview overlay.
  - Overflow is inconsistent: the helper text breaks out of its column and the disabled slider track is shorter.
  - Status emphasis is inverted: 新 is shown as brightly as 待验收.

Top 3 to delete / simplify (in A):
1. Make the default status in the effect list silent. Drop the repeated 制作中 (4 of the 10 rows) and keep labels only for exceptions: amber 待验收, plus 新 and 已通过. Adding B's bake-progress empty cells would cost nothing and make bake state readable.
2. Cut the right-panel summaries down to one value per collapsed header, aligned to the value column, or remove them. Move "强度为 0 时无效" off the value column, for example into a tooltip on the disabled row. While doing this, take B's right-aligned number and separate unit column, without B's overflow.
3. Merge the two preview overlay readouts ("PC 30 fps tick 60" and "距离 1000 m 预览曝光 1.00 倍") into one quiet line in a single corner, so the firework is not boxed in by text. Also remove or explain the unexplained boxed "2" after the version number in the title bar.
