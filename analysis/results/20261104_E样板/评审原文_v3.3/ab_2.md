Receipt: ab-21fa97
Winner: B

Winning dimensions:
- Inspector structure: all six sections (触发 / 运动 / 大小与亮度 / 外形 / 气流 / 成簇) fit on one screen. Collapsed sections show a one-line summary, so the artist can see the whole emitter without scrolling. A shows four sections, cuts off at 收尖, and 气流 and 成簇 are off-screen with nothing to show they exist.
- Section hierarchy and rhythm: B's section headers are larger and bolder, have clear expand/collapse chevrons and more space above them, so the inspector reads as separate blocks. A's headers are almost the same size as the row labels, and its tiny "˅" chevron is barely visible, so the column reads as one long uniform list.
- Numeric columns: B lines up single values on the decimal point (20.0, -2.50, 0.07, 0.15, 0.033, 0.78) and puts units in their own column, which suits all-day scanning of numbers. A's values start at one left edge, and units trail at different widths.
- Frame state consistency: the B overlay "帧 27" matches the transport "帧 27 / 64". A shows "tick 26" in the overlay and "烘焙 27 / 64" in the transport, so it shows two numbers for one moment and mixes English jargon into Chinese labels.
- Viewport toolbar icons: B's five icons share one outline style. A mixes a heavy "#" text glyph and a pencil with thinner panel icons.
- Thumbnail strip: B's 18 small square frames, each with a hairline border, read as separate baked frames. A's 10 wide, soft tiles blend into one smear.
- Left column: B's root effect title is larger than the tree rows, so the root stands out. In A it is almost the same size as the rows.

Regressed dimensions:
- Range notation: B writes ranges as "0.012 –0.032" and "0.05 –0.65", with the dash attached to the upper value. That looks the same as the real negative "-2.50" two rows below. In a numeric tool this is a real misreading risk. A's symmetric "0.012 – 0.032" cannot be misread.
- Control placement: B puts the range dropdown chevrons in a separate column at the far right edge (about 30 px from the unit), so they float free of the value they belong to. A puts the chevron right after the unit ("s ˅").
- Hidden-item cue: B's header badges "+1" and "+3" don't say what they count. A's "1 项已隐藏 查看" is explicit, though wordier.
- Transport hierarchy: B shows the current time 0.89 at the same size as "/ 2.13 s". A makes 0.89 the largest number in the transport, the number the user checks most.
- Timeline framing: B scrolls from 01, so the selected 08 row sits on the bottom edge and its sibling 07 is off-screen. A puts the selected row in the middle with its neighbours visible, but it hides 01–03 above with no indicator.
- Collapsed summaries: forcing the last value onto the decimal column breaks the pairs. In "跟随气流 1.00   噪波 ……… 0.00 mm", "1.00" sits closer to "噪波" than to its own label. The 成簇 line has the same problem.
- Redundancy: the frame number appears twice (overlay "帧 27" and transport "帧 27 / 64").
- Lost context: B collapses 触发, which hides the parent emitter (06 一级分叉) and the trigger probability, the main context for a child emitter such as 08.

Key differences:
- The inspector is where the two differ most. B uses collapsible sections with summaries and fits all six; A expands four sections and keeps going below the fold. B wins on overview and rhythm, but its number typography (dash attached to the upper value, chevron column far from the values) adds new ways to misread.
- Frame and time readout: B labels the frame consistently but shows it twice, and gives the current time no extra size. A gives the current time a strong size but shows tick 26 against frame 27.
- Timeline track viewport: A centres the selected row with context above and below. B anchors at the top, gives an explicit "下面还有 6 行" count, but pushes the selected row to the bottom edge.
- Thumbnail strip: B's finer, framed frames beat A's wide, soft tiles. Neither strip lines up with the time ruler, and both stop at about 60% of the track width.
- Viewport toolbar: B's icons share one style; A's mix weights.
- Top bar (judged on execution only): the two are about equal. In both, status items (UE 已连接 / 导出 / 备份 未选) and navigation (资源交付 / 资源编排) sit in one run of the same weight. A's extra 设置 is spaced a little more deliberately. B's run is tighter, but status and actions still don't separate.
- Left column and effect library: the two are almost identical. B's root title is slightly stronger.

AI tells seen:
- A:
  - Every section is expanded by default, a "show all parameters" layout.
  - "N 项已隐藏 查看" helper rows are placed inside sections.
  - A raw engine term ("tick 26") sits inside Chinese labels and disagrees with the transport frame.
  - A text glyph ("#") is used as an icon.
  - Every row has the same height and every value the same brightness, so the inspector is flat.
  - "还有 3 行" at the bottom while 3 rows are silently hidden above.
- B:
  - "+1 / +3" badge shorthand.
  - Collapsed-section summaries that copy one or two fields in grey, with no clear pairing.
  - Decimal alignment applied by rule even where it breaks label/value pairs and turns range dashes into apparent minus signs.
  - A detached column of chevrons at the right edge.
  - The frame number shown twice.
  - 18 almost identical thumbnails that look like a repeated pattern rather than chosen key frames.
- Both:
  - A boxed "2" next to the version string with no meaning given.
  - Every library row's status in the same grey except 待验收.
  - Corner HUD text in the viewport at uniform low contrast.

Top 3 to delete / simplify:
1. Merge B's value, unit and chevron columns into one value cell per row: "0.012 – 0.032 s ▾", with spaces on both sides of the dash and the chevron right after the unit. Delete the separate chevron column at the right edge. This fixes the range-versus-negative misreading and puts each control next to its value.
2. Delete the duplicate "帧 27" from the viewport overlay; the transport already shows 帧 27 / 64. Give the current time 0.89 the larger size, as A does. Also scroll the track list so the selected row and its sibling (07) stay in view rather than on the bottom edge.
3. Simplify the collapsed-section headers. Keep at most one value per summary, tied to its own label (drop the second pair on 气流 and 成簇). Replace the bare "+1 / +3" with a short muted "1 隐藏" that still opens the hidden items. Keep 触发 expanded, or show the parent emitter in its summary, when a child emitter is selected.
