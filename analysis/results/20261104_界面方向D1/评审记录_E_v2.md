# 评审记录 · E 第 2 版

> 对话框9，2026-11-04。单张评审用 `评审提示词_v2.md`；盲比用 taste-driven-designer 模式一模板（固定约束：颜色、接近直角、三栏骨架），全文见云端临时目录。

## 单张评审（E v2）

```text
Receipt: c3-52ffc9 (matches)
E v2 — Score 5/10 (v1 was 6/10 in a separate run)
Gaps: stage doesn't own the screen (same blue-grey as panels, five strips box it in, burst ~25%); flat type hierarchy, timecode under-scaled, "1000 m" brightest number; left column two modes, template grid second-loudest, inline variant rows third rhythm; controls scattered (view controls split, file actions icon/word mix, metadata split, no unified status bar, title bar spends space on version/GPU/links); inspector lacks finish (225 px sliders, single reset icon juts, square toggles look like empty boxes, summary mix values/sentences, orphan 建议曝光, duplicate 金锦层 header + second search); timeline cramped (filmstrip dark dots low info, thin bars, overloaded header); accent diluted (selection and primary action share mint); sentence labels as chrome.
AI tells: generic dark-slate IDE; three meanings of small dots; middle-dot name pattern; same hairline icon family mixed with text; chatty microcopy; ambient readouts; repeated … menus. No gradients/glow/pills/card-in-card.
Top 3: collapse chrome around stage (merge toolbars, delete title bar, one full-width status bar); take template library out of left column (tab/drawer), variants as count; strip inspector (one header/search, scrubbable numeric fields, one switch style, real control or delete 建议曝光, 2-4 char noun labels).
```

## 盲比（E v1 vs v2）

```text
Receipt: ab-e2f5e9 (matches). A=v1 B=v2
Winner: v2
Winning: action hierarchy & state coherence (export primary matches 需重新导出); viewport composition (crop marks, no card-on-card); domain state coverage (filmstrip, 生成缩略图, 输出 node, + 加发射器); progressive disclosure (扰动 rows hidden); consistent control vocabulary (one switch); library IA (grouped by workflow, tiers nested under parent).
Regressed: library scanability (tier micro-thumbs, size ladder, uneven rows; template grid smaller; two "31" groups look duplicate); search copy too bare ("搜索"); GPU name in title bar beside links [user's explicit request 19:46 -> accepted]; five unlabeled icons in viewport toolbar; timeline vertical stack (5 layers, centre loses shared bottom bar); stray 建议曝光 line off grid.
Top 3: tiers as one text line, variants only on selected/expanded item, relabel template groups; fold icon cluster into 预览设置 (keep grid toggle); merge timeline action row into transport row, fix 建议曝光 row.
```

## 解读

- 盲比：v2 胜 v1，退步 6 项（其中「显卡在顶栏」为用户 19:46 明确要求，视为已接受）。
- 单张分数 v1 6 → v2 5：两次是不同评委实例，绝对分数波动大（与 critic-loop-protocol V1.1 的反证一致）；按三信号门禁以盲比为准。
- 新问题：v2 补齐功能后，评委倾向「删」（标题栏、模板库移出左栏、标签改 2–4 字名词）。评委不知道哪些功能必须保留，下一轮需把「功能清单」写进评委提示词的固定约束，避免建议删掉必要功能。
