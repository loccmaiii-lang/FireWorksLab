# FireWorksLab：给 Claude 的项目说明

新会话开始时，先读 `交接.md`：那里写着当前进度、正在等什么、下一步做什么。

## 项目是什么

UE 4.24 MMO 的写实日式烟花特效素材。在 `tool/` 的网页烘焙器里模拟、烘焙成序列贴图，再按导出的参数表在 Cascade 里搭建。

硬性约束（不能违反）：
- 只能用 Cascade 和项目里已有的发射器、材质、贴图：**不新增材质，不写代码**。
- 帧号走 Dynamic Parameter 第 3 通道，不做帧间混合。
- RGBA 接力（R 填满再 G、B、A），灰度，BC7，只导出 2K。
- 颜色来自渐变贴图 + Color Over Life。
- 尽量降低 overdraw。

贴图分辨率规则（用户 2026-09-28 明确要求，必须遵守）：
- **分辨率最大化，以 2K 为准**：每张序列贴图都做满 2048（2048×2048，或至少 2048 宽），不为省显存降到 1024 或更小。需要时先出 4K 母版（4096），由用户自己压缩。
- **RGBA 四个通道都用满**：RGBA 接力就是用来换更大的格子或更多帧的，默认四个通道全部填满，不留空通道。
- **格子贴合内容**：按内容长宽比选列 × 行，让每帧内容尽量占满格子，细节清晰、丰富。
- **细节不能超过来源**：从视频直接截取的素材分辨率受视频限制，放大不会更清晰；要 2K / 4K 的真实细节，就用程序渲染，实拍只作对照标准。

## 目录

- `tool/src/`：烘焙器源码，`python3 tool/build.py` 合成 `tool/FireworkBaker.html`（单文件，改完源码必须重新 build 再提交）。
- `analysis/scripts/`：实拍对照管线：`refkit.py`（测量）、`compare.py`（实拍 vs 模拟对照图 + 数值）、`fit.py`（自动逼近）、`variants.py`（一次试几组改动）。
- `analysis/jobs/`：给用户本地显卡跑的任务；`analysis/results/`：用户跑完推上来的结果；`analysis/local/`：用户本地运行脚本和说明。
- `analysis/replica/`：已完成复刻的对照图、数值、参数；`analysis/replica/起点/`：任务起点参数。
- `vidio/`：参考视频（`vidio/2.0/` 是第二批）。

## 协作方式

- 用户在公司电脑上不登录 Claude，只通过 git 交换：Claude 写 `analysis/jobs/<id>.json` 并 push；用户双击 `analysis/local/跑任务.bat`，用本机显卡跑完后 push `analysis/results/<id>/`；Claude pull 后读 `对照.jpg`、`数值.json`、`best.json`。
- 三条线并行（用户 2026-09-28 定）：
  - **云端 Git 是主线**：Claude 写源码、任务、`交接.md`、`计划.md`。
  - **本地线**：用户在电脑前双击 `跑任务.bat`。
  - **WorkBuddy 线**：用户不在电脑前时远程让 WorkBuddy 跑。只跑任务、推 `analysis/results/`，可以附评审 `analysis/results/<id>/评审_WorkBuddy.md`（看对照图写的意见，供 Claude 参考，不代替用户确认）。
  - 两条执行线在同一台电脑上，靠 `analysis/local/输出/_运行中.json` 互斥，见 `analysis/local/使用说明.md`。
- 云端没有显卡。compare.py 在 Linux 上自动用软件渲染（慢，一次 1–2 分钟），可以用来抽查，但大批量拟合交给用户本地跑。
- 复刻是否「像」由用户看对照图确认。没有对照图和数值，不说「做完了」。

## 用户怎么看结果（2026-09-28 定：pull → 刷新烘焙器 → 左栏「迭代区」）

- 用户只做一件事：`git pull`，刷新 `tool/FireworkBaker.html`。所有等他看的东西都在左栏「迭代区」；有没看过的条目时，打开烘焙器会自动打开最新一条。
- 迭代区数据：`tool/data/review.js`，由 `analysis/scripts/review_to_baker.py` 生成（改里面的 REVIEW 列表再运行）。每条写清：做了什么（note）、看什么（look）、Claude 的看法（opinion）、实拍视频。
  - 花型参数类（best.json、尾缀配方）：kind = preset，点开就在烘焙器里实时模拟；
  - 贴图类（单元序列、母版导出）：kind = asset，结果目录里要有 `preview.js`（`prism_preview.py` 生成：清单 + 缩小贴图），点开按引擎方式播放。
  - 实拍并排：条目带 video（相对仓库根）和 vmeta（开花时刻、裁切，自动算，缓存在 `tool/data/video_meta.json`），左实拍右模拟、时间同步。
- 用户在右栏审阅卡点「通过」/「要改」+ 写意见，存在他的浏览器里；左栏「复制意见」贴给 Claude。
- 用户「通过」后：Claude 把条目搬进 `tool/src/js/15_replica.js` 的 REPLICAS（左栏「正式库」），并从 REVIEW 删掉。
- 视频不是交付物；不要让用户去翻文件夹或看视频。

## 每次收尾必须做

1. 新结果写进迭代区（`review_to_baker.py`），并在仓库根目录 `更新记录.md` 最上面加一条：做了什么、要用户看什么。烘焙器顶栏「更新记录」显示它，有新条目会自动弹出。
2. 更新 `交接.md`：当前状态、在等用户什么、下一步。
3. 更新 `PROGRESS.md` 的复刻进度表。
4. build、commit、push（提交说明写清楚改了什么），push 成功后再告诉用户。
