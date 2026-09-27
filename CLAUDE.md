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

## 目录

- `tool/src/`：烘焙器源码，`python3 tool/build.py` 合成 `tool/FireworkBaker.html`（单文件，改完源码必须重新 build 再提交）。
- `analysis/scripts/`：实拍对照管线：`refkit.py`（测量）、`compare.py`（实拍 vs 模拟对照图 + 数值）、`fit.py`（自动逼近）、`variants.py`（一次试几组改动）。
- `analysis/jobs/`：给用户本地显卡跑的任务；`analysis/results/`：用户跑完推上来的结果；`analysis/local/`：用户本地运行脚本和说明。
- `analysis/replica/`：已完成复刻的对照图、数值、参数；`analysis/replica/起点/`：任务起点参数。
- `vidio/`：参考视频（`vidio/2.0/` 是第二批）。

## 协作方式

- 用户在公司电脑上不登录 Claude，只通过 git 交换：Claude 写 `analysis/jobs/<id>.json` 并 push；用户双击 `analysis/local/跑任务.bat`，用本机显卡跑完后 push `analysis/results/<id>/`；Claude pull 后读 `对照.jpg`、`数值.json`、`best.json`。
- 云端没有显卡。compare.py 在 Linux 上自动用软件渲染（慢，一次 1–2 分钟），可以用来抽查，但大批量拟合交给用户本地跑。
- 复刻是否「像」由用户看对照图确认。没有对照图和数值，不说「做完了」。

## 每次收尾必须做

1. 更新 `交接.md`：当前状态、在等用户什么、下一步。
2. 更新 `PROGRESS.md` 的复刻进度表。
3. build、commit、push（提交说明写清楚改了什么）。
