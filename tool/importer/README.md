# 导入器原件上传与云端接续说明

本次只上传源码、检查及输入快照，交给云端「烟花工坊（5.0）」继续修改；244 个来源文件逐字节保留，没有改导入器逻辑。**上传后 D 盘这份不再改，以后只改仓库里的**。

## 来源、范围与大小

- 采集/复核完成时间：2026-11-04T23:04:42+08:00（Asia/Hong_Kong）；来源主机 LOCMAI-PC1。
- 主来源：`D:/FXTools/DFWorkbench/workbench`；当前交付成品：`D:/FXTools/DFWorkbench/df-fireworks-delivery_locmai.html`。
- 依据：`协作/方案/烟花工坊5.0_合并方案_2026-11-04.md` 第 5、8、11 节；记录：`对话记录/对话框导入器上传.md`。
- 上传文件共 **246 个、22,709,692 字节（22.710 MB，21.658 MiB）**，包含本 README 和 `.gitattributes`。其中 244 个来源文件共 22,616,790 字节。
- docs/ 共 31 个文件、159,833 字节，低于 2 MB；fixtures/ 原有 2 个文件、64,555 字节。
- 用户先允许 26 个静态测试输入及约 21.6 MB 的例外，再明确允许补入另外两份间接输入，最终约 22.7 MB；例外限定为下列 28 份 HTML/JSON，不扩大到其它备份或研究内容。
- 原工作台 README 原字节保存在 `external/source-workbench/README.md`，本文件为新增交接说明。`.gitattributes` 仅设置 `* -text`，避免 Git 的 core.autocrlf 改写来源混合换行，不改变源码内容。
- 来源文件清单指纹（按相对路径排序，以“路径 + NUL + SHA-256 + LF”连接后计算）：`d811833d0da98e2e2bc54dfb5bcf125dd03fee82d7bf865201420ca5d70c9d35`。每个来源文件的 SHA-256 见完整文件表。

## 输入梳理与目录映射

已读取 build.py、build-delivery.py、package.json 和全部 62 个顶层有效 check*.cjs/check*.py，并追踪它们的本地模块、模板、共享样式、固定样例和清单。没有把 backups/research 中的旧版检查当成当前检查；npm/标准库/解释器按依赖处理，不上传安装目录。测试临时生成的文件和模拟资产不属于源输入。

| 作用 | 仓库位置 | 原位置/说明 |
| --- | --- | --- |
| 源码、检查、构建器、CSS/HTML 模板、图标 JSON 和许可 | 本目录顶层 | workbench 原相对文件名；补齐构建器实际读取的 CSS/HTML/JSON/TXT |
| 原有测试样例与小文档 | fixtures/、docs/ | 保持原相对目录 |
| 原始 HTML 构建底稿 | external/D/FXTools/DFWorkbench/df-fx-copier-suite_v1.0.1_locmai.html | D:/FXTools/DFWorkbench/ 同名文件 |
| 原特效工作台对照输入 | external/D/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html | D:/FXTools/DFWorkbench/ 同名文件；原件没有重建或改动 |
| 当前交付成品 | reference/df-fireworks-delivery_locmai.html | D:/FXTools/DFWorkbench/ 同名文件，只供核对 |
| 固定配置/贴图样例 | external/D/ProjectTextures/FireWorksLab/ | 原 D:/ProjectTextures/FireWorksLab/，只取检查需要的文件 |
| 共享主题、交付门/副本准备代码、回放检查及固定配置 | external/F/FireWorksLab/ | 原 F:/FireWorksLab/ 的逐文件快照 |
| 本机路径配置快照 | external/C/Users/locmai/.fireworkslab/ | 原 C:/Users/locmai/.fireworkslab/；不是授权文件，不自动使用它部署 |
| 已特批的历史测试输入 | backups/、research/ 中的 28 份静态文件 | 保持原相对路径，以供旧回归读取；除此之外未复制这两个目录 |

默认原检查常把 HTML 写成 `__dirname/../df-*.html` 或 `../df-*.html`。这次按要求把外部输入放进 external/、reference/，没有向 tool/ 父目录加文件，也没有改读取路径。直接在本目录执行产生的这些 ENOENT 是布局路径问题，所需 HTML 本身已在上传集内。

## 如何构建

原构建命令是 `python -B build.py` 和 `python -B build-delivery.py --design-system <共享设计系统目录>`。它们原本会写父目录成品，build.py 还写死 F 盘主题脚本；build-delivery.py 最后尝试同步本机副本。云端先按后文清单适配路径与部署步骤，不直接照旧配置部署。

本次在受临时检查防护约束的目录复原原布局构建，没有修改上传的任何源码。可用下面的 Python 准备同样的输入布局（从仓库根目录运行；所有复制和输出都位于临时目录）：

```python
from pathlib import Path
import shutil, tempfile
src = Path("tool/importer").resolve()
case = Path(tempfile.mkdtemp(prefix="fwl-importer-check-"))
work = case / "workbench"
shutil.copytree(src, work, ignore=shutil.ignore_patterns("external", "reference", "node_modules", "__pycache__"))
for name in ["df-fx-copier-suite_v1.0.1_locmai.html", "df-fx-workbench_v2_locmai.html"]:
    shutil.copyfile(src / "external/D/FXTools/DFWorkbench" / name, case / name)
shutil.copyfile(src / "reference/df-fireworks-delivery_locmai.html", case / "df-fireworks-delivery_locmai.html")
(work / "research/design-20261005").mkdir(parents=True, exist_ok=True)
print(work)
```

在 LOCMAI-PC1 的临时 workbench/ 执行原命令，本次得到：

- build.py：退出 0，通过；原始底稿 SHA-256 `17bc3503c307a02200c5f48cf171d02ad582703f73078c8c673a29d8c7ae685b`。
- build-delivery.py：HTML 已完整生成，末尾因配置 importerPath 指向 D 盘原件、输出位于临时目录而拒绝同步，退出 1；未改用户配置、D 盘、runtime 副本或正式成品。
- **重建交付 HTML 与 reference/ 当前成品逐字节一致**：均为 842,082 字节，SHA-256 `13f92198e66df593f8cd7d33c29242cfb8a4e93dab81693fd66fd63535d2bc2d`。这是构建内容核对通过，不等同于本机部署通过。

## 如何运行检查与本次结果

Node 依赖只有 package.json 声明的 jsdom（以 package-lock.json 锁定）。把 package.json 和 package-lock.json 复制到一个临时依赖目录，在那里运行 `npm ci --ignore-scripts --no-audit --no-fund`；本次安装 39 个包。设 `NODE_PATH=<临时依赖目录>/node_modules` 后，在本目录运行 `node <check文件>.cjs`；Python 检查用 `python -B <check文件>.py`。Python 相关依赖为 numpy、Pillow；HTTP 检查另需 Playwright/Chrome，部分兼容性检查写死现有独立 Python 2.7/3.12 的位置。

可直接复跑的离线例子：`node check-delivery-derived-first.cjs`、`node check-delivery-derived.cjs`、`node check-delivery-material-names.cjs`、`python -B check-delivery-preflight.py`、`python -B check-delivery-runtime.py`。本机依赖/固定路径可用不代表云端可用；没有在本次上传中改路径。

- 原样从 tool/importer/ 执行：**通过 13、失败 46、边界跳过 3**（共 62 项；补齐两份间接输入后，相关项已重跑）。
- 在临时目录复原原布局再核查：**通过 45、失败 13、超时 1、边界跳过 3**（共 62 项；源码字节与上传集相同）。此轮使用外部快照中的原特效工作台 HTML；重建结果单独核对。
- 两轮均阻止真实网络和 D 盘/授权临时范围外写入；UI 检查中的 UE API 使用原脚本内的模拟。三份调用 E 盘独立 Python 2.7 的检查已逐段核实为模拟 UE/磁盘后运行，不是连接或启动 UE。
- check-delivery-migration.cjs 使用当前 reference 交付入口，原有聚合夹具 6/22 子套件通过；其余失败包括旧夹具不认识交付预检、Windows 跨盘假路径、历史 HTML 缺少新导出接口等。没有为通过检查改源码或旧夹具。
- 真实 UE 检查两项和固定 8034 浏览器检查一项未运行，具体见表；未连接 UE、未导入资产、未改个人浏览器存档。
- **这是上传与既有基线记录，不是所有回归通过或用户验收通过**。复制校验、凭据核查和交付 HTML 内容核对已通过；旧检查失败留给云端接续诊断。

| 检查脚本 | 本目录原样 | 临时原布局 | 结果说明 |
| --- | --- | --- | --- |
| `check-delivery-contract.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-delivery-derived-first.cjs` | 通过 | 通过 | 原脚本完成，退出 0。 |
| `check-delivery-derived-ui.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-delivery-derived.cjs` | 通过 | 通过 | 原脚本完成，退出 0。 |
| `check-delivery-guards.cjs` | 失败 | 超时 | 旧交付 UI 夹具断言 error != ready，失败后遗留定时器；50 秒终止。 |
| `check-delivery-http.py` | 边界跳过 | 边界跳过 | 需真实 8034 服务和 Chrome，固定写 F 盘输出；本次未访问或启动服务。 |
| `check-delivery-material-names.cjs` | 通过 | 通过 | 原脚本完成，退出 0。 |
| `check-delivery-migration.cjs` | 失败 | 失败 | 交付入口聚合回归 6/22 子套件通过；其余含旧夹具不支持交付预检、跨盘路径、旧 HTML 接口缺失，失败后定时器用 12 秒上限终止。 |
| `check-delivery-native.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-delivery-preflight.py` | 通过 | 通过 | 原脚本完成，退出 0。 |
| `check-delivery-presentation.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-delivery-receiver.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-delivery-registration.cjs` | 通过 | 通过 | 原脚本完成，退出 0。 |
| `check-delivery-runtime.py` | 通过 | 通过 | 原脚本完成，退出 0。 |
| `check-delivery-sc-offline.py` | 失败 | 通过 | 原脚本完成，退出 0。 |
| `check-delivery-transport.cjs` | 通过 | 通过 | 原脚本完成，退出 0。 |
| `check-design-layout.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-design-ui.cjs` | 失败 | 失败 | 旧保护清单断言 fireworks-compat.js 哈希不符；保留来源原件，不改检查。 |
| `check-import-calibration.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-import-color-scale.cjs` | 失败 | 失败 | 历史 color-scale HTML 缺少 collectPlannedTextures，loadBackend 导出新接口时 ReferenceError。 |
| `check-import-compat-ui.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-import-compat.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-import-cutout-selection.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-import-events.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-import-interrupted.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-import-iteration.cjs` | 失败 | 失败 | 原特效工作台 HTML 的标题版本与 build.py VERSION 不一致。 |
| `check-import-life-modules.cjs` | 失败 | 失败 | 历史 module-support HTML 缺少 collectPlannedTextures。 |
| `check-import-name-confirmation.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-import-naming.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-import-pack-compat.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-import-policy.cjs` | 失败 | 失败 | 原特效工作台 HTML 页头版本与 build.py VERSION 不一致。 |
| `check-import-preroll.cjs` | 失败 | 失败 | 历史 preroll HTML 缺少 collectPlannedTextures。 |
| `check-import-public-names.cjs` | 失败 | 失败 | 历史 public-asset-naming HTML 缺少 collectPlannedTextures。 |
| `check-import-recovery.cjs` | 失败 | 失败 | 历史 import-failure HTML 缺少 collectPlannedTextures。 |
| `check-import-resource-rules.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-import-reuse-compat.cjs` | 通过 | 通过 | 原脚本完成，退出 0。 |
| `check-import-selection.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-import-shared-recheck.cjs` | 失败 | 失败 | 旧只读夹具拒绝 ExecutePythonCommandEx，另有名称校验错误；未发真实 UE 请求。 |
| `check-import-source-control.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-import-system-policy.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-import-system-ui.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-import-update-backend.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-import-workspace.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-material-ui.cjs` | 失败 | 失败 | 旧保护清单断言 fireworks-compat.js 哈希不符。 |
| `check-multi-textures.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-native-approval.cjs` | 通过 | 通过 | 原脚本完成，退出 0。 |
| `check-native-persistence.cjs` | 通过 | 通过 | 原脚本完成，退出 0。 |
| `check-policy-native-syntax.cjs` | 边界跳过 | 边界跳过 | 会通过 engine_api 连接真实 UE，即使仅 compile 也违反本次边界，未运行。 |
| `check-show-blank.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-show-export.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-show-fan.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-show-project-boundaries.cjs` | 通过 | 通过 | 原脚本完成，退出 0。 |
| `check-show-project-ui.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-show-project.cjs` | 通过 | 通过 | 原脚本完成，退出 0。 |
| `check-show-resource-ids.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-show.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-workbench-log.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check-workbench-scroll.cjs` | 失败 | 通过 | 本目录固定父目录 HTML 路径失败；复原布局后通过。 |
| `check.cjs` | 失败 | 失败 | 原特效工作台 HTML 未包含当前 fireworks-import.js 原文。 |
| `check_calibration.py` | 通过 | 通过 | 原脚本完成，退出 0。 |
| `check_material_channel_candidates.cjs` | 边界跳过 | 边界跳过 | 会连接真实 UE 读取材质图，未运行。 |
| `check_mobile_exports.py` | 失败 | 失败 | 旧 exports.json 所列 7 个源目录、160 个文件已不存在，最先缺 QiuXingA_40_20261002/cascade.json。 |

## 凭据扫描

对全部 244 个来源文件扫描 password/passwd/pwd/token/secret/client_secret/access_token/auth_token/passphrase/apikey/api_key、私钥头、常见 GitHub/OpenAI/AWS 密钥前缀及 URL 内嵌密码。强凭据模式无命中；关键词共 129 行命中，全部为 token（变量/解析函数/样式术语/代码补丁文本或运行时会话字段），没有静态凭据值。用户已明确允许保留非凭据命中。

主要命中为 fireworks-plan.js 的命名变量、show-text.js 的解析函数、两份检查/设计文档的术语、HTML/补丁中的同段代码，以及 delivery-host.js 的运行时 session.token 读取与对外剔除。原用户许可 native-authorization.json 没有上传。

## 写死的本机路径清单（只列，不改）

以下为全部来源文件中直接出现的盘符字面量/拼接片段及位置，包含测试虚拟路径，不代表都发生真实磁盘 I/O；也包含 E 盘。重复位置合并到同一行。用户名/目录用户段包括 `locmai`、`loc_ma5`；主机为 `LOCMAI-PC1`。

另有动态主目录依赖：build-delivery.py / prepare_local.py 使用 `Path.home()/.fireworkslab/delivery-launcher.json`，delivery-preflight.py 使用 `Path.home()/.fireworkslab/delivery-settings.json`；本机对应 C:/Users/locmai/.fireworkslab/，配置原件已放 external/C/。固定服务端点为 127.0.0.1:17780（UE）和 127.0.0.1:8034（交付），本次不探测这两个端点。

| 路径字面量/片段 | 文件与行号（相对本目录） |
| --- | --- |
| `C:/Users/locmai/AppData/Local/Programs/Python/Python312/python.exe` | `check-delivery-transport.cjs:36`；`delivery-contract.js:49`；`reference/df-fireworks-delivery_locmai.html:7551` |
| `C:/Windows/Fonts/msyh.ttc` | `external/F/FireWorksLab/analysis/scripts/回放检查.py:305` |
| `C:/outside.png` | `check-import-pack-compat.cjs:37` |
| `C:\\Users\\locmai\\.fireworkslab\\delivery-settings.json` | `external/C/Users/locmai/.fireworkslab/delivery-launcher.json:2` |
| `D:/FXTools/DFWorkbench` | `docs/superpowers/plans/2026-10-04-iteration-update.md:13`；`docs/superpowers/plans/2026-10-12-local-trail-delivery.md:13` |
| `D:/FXTools/DFWorkbench/df-fireworks-delivery_locmai.html` | `external/C/Users/locmai/.fireworkslab/delivery-launcher.json:3` |
| `D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html` | `CHANGELOG.md:155`；`CHANGELOG.md:167`；`CHANGELOG.md:179`；`docs/superpowers/plans/2026-10-02-export-calibration.md:64`；`docs/superpowers/plans/2026-10-04-naming-split.md:13`；`docs/superpowers/plans/2026-10-04-pivot-mapping.md:13`；`docs/superpowers/plans/2026-10-06-show-link-v1.md:13`；`external/source-workbench/README.md:104`；`external/source-workbench/README.md:116`；`external/source-workbench/README.md:129`；`external/source-workbench/README.md:154`；`external/source-workbench/README.md:171`；`external/source-workbench/README.md:189`；`external/source-workbench/README.md:207`；`external/source-workbench/README.md:226`；`external/source-workbench/README.md:238`；`external/source-workbench/README.md:272`；`external/source-workbench/README.md:284`；`external/source-workbench/README.md:94` |
| `D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html.` | `docs/superpowers/plans/2026-10-04-preroll-metadata.md:13` |
| `D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html; release v2.16.` | `docs/superpowers/plans/2026-10-06-selection-log.md:12` |
| `D:/FXTools/DFWorkbench/workbench` | `docs/superpowers/plans/2026-10-05-public-asset-naming.md:13` |
| `D:/FXTools/DFWorkbench/workbench/README.md` | `docs/superpowers/plans/2026-10-04-pivot-mapping.md:64`；`docs/superpowers/plans/2026-10-04-preroll-metadata.md:61` |
| `D:/FXTools/DFWorkbench/workbench/asset-backups` | `backups/2026-10-04-design-implementation/delivered/df-fx-workbench_v2_locmai.html:4739`；`backups/2026-10-04-preroll/df-fx-workbench_v2_locmai.html:4739`；`backups/2026-10-05-module-support/df-fx-workbench_v2_locmai.html:5516`；`backups/2026-10-05-public-asset-naming/df-fx-workbench_v2_locmai.html:5476`；`backups/20261007-color-scale-production.html:5942`；`backups/20261009-material-before.html:6188`；`backups/20261009-source-control-before.html:6188`；`backups/20261010-import-audit-4967/df-fx-workbench_v2_locmai.html:6381`；`backups/prism3-events-before/df-fx-workbench_v2_locmai.html:6373`；`external/D/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html:6592`；`fireworks-update.js:98`；`reference/df-fireworks-delivery_locmai.html:6956` |
| `D:/FXTools/DFWorkbench/workbench/asset-backups/Fixture_01_test` | `check-import-update-backend.cjs:68` |
| `D:/FXTools/DFWorkbench/workbench/backups/calibration-20261002/` | `docs/superpowers/plans/2026-10-02-export-calibration.md:67` |
| `D:/FXTools/DFWorkbench/workbench/build.py` | `docs/superpowers/plans/2026-10-04-pivot-mapping.md:27`；`docs/superpowers/plans/2026-10-04-preroll-metadata.md:59` |
| `D:/FXTools/DFWorkbench/workbench/calibration.py` | `docs/superpowers/plans/2026-10-02-export-calibration.md:46` |
| `D:/FXTools/DFWorkbench/workbench/check-import-calibration.cjs` | `docs/superpowers/plans/2026-10-04-pivot-mapping.md:25` |
| `D:/FXTools/DFWorkbench/workbench/check-import-iteration.cjs` | `docs/superpowers/plans/2026-10-04-preroll-metadata.md:60` |
| `D:/FXTools/DFWorkbench/workbench/check-import-preroll.cjs` | `docs/superpowers/plans/2026-10-04-preroll-metadata.md:22` |
| `D:/FXTools/DFWorkbench/workbench/check-import-recovery.cjs` | `docs/superpowers/plans/2026-10-04-pivot-mapping.md:26` |
| `D:/FXTools/DFWorkbench/workbench/check_calibration.py` | `docs/superpowers/plans/2026-10-02-export-calibration.md:47` |
| `D:/FXTools/DFWorkbench/workbench/delivery-preflight.py` | `delivery-contract.js:49`；`reference/df-fireworks-delivery_locmai.html:7551` |
| `D:/FXTools/DFWorkbench/workbench/export_calibration.py` | `docs/superpowers/plans/2026-10-02-export-calibration.md:27` |
| `D:/FXTools/DFWorkbench/workbench/fireworks-import.js` | `docs/superpowers/plans/2026-10-04-pivot-mapping.md:24`；`docs/superpowers/plans/2026-10-04-preroll-metadata.md:23` |
| `D:/FXTools/DFWorkbench/workbench/fireworks-plan.js` | `docs/superpowers/plans/2026-10-02-export-calibration.md:65`；`docs/superpowers/plans/2026-10-04-preroll-metadata.md:24` |
| `D:/FXTools/DFWorkbench/workbench/import_calibrated.cjs` | `docs/superpowers/plans/2026-10-02-export-calibration.md:63` |
| `D:/FXTools/DFWorkbench/workbench/research/calibration-20261002/calibration.json` | `docs/superpowers/plans/2026-10-02-export-calibration.md:48` |
| `D:/FXTools/DFWorkbench/workbench/research/calibration-20261002/exports.json` | `docs/superpowers/plans/2026-10-02-export-calibration.md:31` |
| `D:/FXTools/DFWorkbench/workbench/research/calibration-20261002/native-verification.json` | `docs/superpowers/plans/2026-10-02-export-calibration.md:68` |
| `D:/FXTools/DFWorkbench/workbench/research/calibration-20261002/使用说明.md` | `docs/superpowers/plans/2026-10-02-export-calibration.md:84` |
| `D:/FXTools/DFWorkbench/workbench/research/pivot-20261004/native-field.cjs` | `docs/superpowers/plans/2026-10-04-pivot-mapping.md:63` |
| `D:/FXTools/DFWorkbench/workbench/research/preroll-20261004/verification.json` | `docs/superpowers/plans/2026-10-04-preroll-metadata.md:62` |
| `D:/FXTools/DFWorkbench/workbench/show-text.js` | `docs/superpowers/plans/2026-10-02-export-calibration.md:66` |
| `D:/Fixture` | `check-delivery-preflight.py:34`；`check-delivery-preflight.py:38`；`check-delivery-preflight.py:43`；`check-delivery-preflight.py:47`；`check-delivery-preflight.py:51`；`check-delivery-registration.cjs:9`；`check-delivery-transport.cjs:64` |
| `D:/Fixture/Mobile` | `check-delivery-http.py:8` |
| `D:/Fixture/PC` | `check-delivery-http.py:8` |
| `D:/Fixture/importer.html` | `check-delivery-runtime.py:11` |
| `D:/Fixture/settings.json` | `check-delivery-runtime.py:11` |
| `D:/Fixture/中文 目录` | `check-delivery-transport.cjs:43`；`check-delivery-transport.cjs:51`；`check-delivery-transport.cjs:59` |
| `D:/Other/importer.html` | `check-delivery-runtime.py:13` |
| `D:/ProjectTextures/FireWorksLab` | `prepare-trail-packages.cjs:3`；`verify-live-packages.py:9` |
| `D:/ProjectTextures/FireWorksLab/RiseTrail_L/cascade.json` | `check-import-cutout-selection.cjs:4`；`check-import-selection.cjs:4`；`check-import-update-backend.cjs:4` |
| `D:/ProjectTextures/FireWorksLab/RiseTrail_M` | `external/source-workbench/README.md:294` |
| `D:/ProjectTextures/FireWorksLab/TR2L_____V5` | `check-multi-textures.cjs:8`；`check.cjs:102`；`check.cjs:99` |
| `D:/ProjectTextures/FireWorksLab/TR2L_____V5/cascade.json` | `check-delivery-presentation.cjs:6`；`check-import-name-confirmation.cjs:6`；`check-import-workspace.cjs:6`；`check.cjs:98`；`docs/superpowers/plans/2026-10-02-export-calibration.md:49` |
| `D:/ProjectTextures/FireWorksLab/TR2L_____V5/cascade.json.` | `MULTI_TEXTURE_PLAN.md:12` |
| `D:/ProjectTextures/FireWorksLab/烟花/中/GlitterChry_D150/revisions/b3238a7d06029a36a3ae` | `verify-derived-first-native.cjs:4` |
| `D:/fixture` | `check-import-public-names.cjs:128`；`check-import-public-names.cjs:157`；`check-import-public-names.cjs:201`；`check-import-public-names.cjs:240`；`check-import-update-backend.cjs:87` |
| `D:/fixture-backup` | `check-import-iteration.cjs:66` |
| `D:/fixture/a` | `check-import-public-names.cjs:244` |
| `D:/fixture/original.uasset` | `check-import-update-backend.cjs:68` |
| `D:/fixture/partial` | `check-import-interrupted.cjs:40` |
| `D:/fixtures` | `check-delivery-native.cjs:47`；`check-import-calibration.cjs:47`；`check-import-events.cjs:74`；`check-import-life-modules.cjs:68`；`check-import-preroll.cjs:68`；`check-import-recovery.cjs:64` |
| `D:/packs` | `check-import-iteration.cjs:27`；`check-import-iteration.cjs:29`；`check-import-iteration.cjs:44` |
| `D:/packs/GoldSpark` | `external/source-workbench/README.md:257` |
| `D:/packs/OldParticle` | `external/source-workbench/README.md:259` |
| `D:/packs/RiseTrail_L` | `check-import-iteration.cjs:27`；`check-import-iteration.cjs:29` |
| `D:/packs/RiseTrail_M` | `check-import-iteration.cjs:27`；`check-import-iteration.cjs:29`；`check-import-iteration.cjs:57` |
| `D:/packs/Silver` | `external/source-workbench/README.md:258` |
| `D:/packs/a` | `check-import-naming.cjs:120`；`check-import-naming.cjs:94`；`check-import-naming.cjs:96`；`check-import-naming.cjs:98` |
| `D:/packs/old` | `check-import-naming.cjs:111`；`check-import-naming.cjs:54` |
| `D:/packs/one` | `check-import-naming.cjs:47` |
| `D:/packs/select` | `check-import-cutout-selection.cjs:32`；`check-import-cutout-selection.cjs:42`；`check-import-selection.cjs:32`；`check-import-selection.cjs:50`；`check-import-selection.cjs:55` |
| `D:/packs/tail` | `check-import-name-confirmation.cjs:51` |
| `D:/test/中文目录` | `check-delivery-derived.cjs:27` |
| `D:\FXTools\DFWorkbench` | `docs/superpowers/plans/2026-10-01-fan-contour.md:13`；`docs/superpowers/plans/2026-10-01-import-name-confirmation.md:13`；`docs/superpowers/plans/2026-10-01-resource-ids.md:13`；`docs/superpowers/plans/2026-10-01-show-preview.md:16`；`docs/superpowers/plans/2026-10-01-template-copy.md:15` |
| `D:\FXTools\DFWorkbench\df-fx-workbench_v2_locmai.html` | `external/source-workbench/README.md:316` |
| `D:\ProjectTextures\FireWorksLab` | `calibration.py:13`；`docs/superpowers/plans/2026-10-02-export-calibration.md:5`；`export_calibration.py:16` |
| `D:\ProjectTextures\FireWorksLab\TR2L_____V5` | `check_calibration.py:8` |
| `D:\\ProjectTextures\\FireWorksLab` | `external/C/Users/locmai/.fireworkslab/delivery-settings.json:2` |
| `D:\\ProjectTextures\\FireWorksLab\\Crossette_40_20261002` | `research/calibration-20261002/calibration.json:313`；`research/calibration-20261002/exports.json:725`；`research/calibration-20261002/native-plan.json:10787`；`research/calibration-20261002/native-plan.json:5237` |
| `D:\\ProjectTextures\\FireWorksLab\\QianLun_40_20261002` | `research/calibration-20261002/calibration.json:281`；`research/calibration-20261002/exports.json:580`；`research/calibration-20261002/native-plan.json:4293`；`research/calibration-20261002/native-plan.json:9836` |
| `D:\\ProjectTextures\\FireWorksLab\\QingNing_40_20261002` | `research/calibration-20261002/calibration.json:257`；`research/calibration-20261002/exports.json:491`；`research/calibration-20261002/native-plan.json:3871`；`research/calibration-20261002/native-plan.json:9399` |
| `D:\\ProjectTextures\\FireWorksLab\\QiuXingA_40_20261002` | `research/calibration-20261002/calibration.json:93`；`research/calibration-20261002/exports.json:7`；`research/calibration-20261002/native-plan.json:1593`；`research/calibration-20261002/native-plan.json:7072` |
| `D:\\ProjectTextures\\FireWorksLab\\QiuXingB_40_20261002` | `research/calibration-20261002/calibration.json:117`；`research/calibration-20261002/exports.json:96`；`research/calibration-20261002/native-plan.json:2047`；`research/calibration-20261002/native-plan.json:7540` |
| `D:\\ProjectTextures\\FireWorksLab\\QiuXingC_40_20261002` | `research/calibration-20261002/calibration.json:194`；`research/calibration-20261002/exports.json:262`；`research/calibration-20261002/native-plan.json:2657`；`research/calibration-20261002/native-plan.json:8157` |
| `D:\\ProjectTextures\\FireWorksLab\\QiuXingD_40_20261002` | `research/calibration-20261002/calibration.json:225`；`research/calibration-20261002/exports.json:358`；`research/calibration-20261002/native-plan.json:3142`；`research/calibration-20261002/native-plan.json:8650` |
| `D:\\ProjectTextures\\FireWorksLab\\TrailCal_Large_20261002` | `research/calibration-20261002/calibration.json:75`；`research/calibration-20261002/native-plan.json:1065`；`research/calibration-20261002/native-plan.json:6543` |
| `D:\\ProjectTextures\\FireWorksLab\\TrailCal_Medium_20261002` | `research/calibration-20261002/calibration.json:60`；`research/calibration-20261002/native-plan.json:538`；`research/calibration-20261002/native-plan.json:6015` |
| `D:\\ProjectTextures\\FireWorksLab\\TrailCal_Small_20261002` | `research/calibration-20261002/calibration.json:45`；`research/calibration-20261002/native-plan.json:11`；`research/calibration-20261002/native-plan.json:5487` |
| `E:/fixture/` | `check-import-update-backend.cjs:68` |
| `E:/loc_ma5/DFMEditor/DFM/Content/` | `native-persistence.cjs:6`；`verify_native_calibration.cjs:13` |
| `E:/loc_ma5/DFMEditor/DFM/Content/DataTables/Resource/ResourceFXTable.uasset` | `import_calibrated.cjs:87` |
| `E:/loc_ma5/DFMEditor/DFM/Content/R13N/Common/PC/DataTables/Resource/ResourceFXTable.uasset` | `import_calibrated.cjs:85` |
| `E:/loc_ma5/DFMEditor/Engine/Binaries/ThirdParty/Python/Win64/python.exe` | `check-delivery-registration.cjs:32`；`check-delivery-transport.cjs:5`；`check-import-source-control.cjs:4` |
| `F:/Fake/Content` | `check-import-source-control.cjs:39` |
| `F:/FireWorksLab/analysis/local/IMPORT5_20261019_HTTP_fixture.png` | `check-delivery-http.py:63` |
| `F:/FireWorksLab/analysis/local/IMPORT5_20261019_http.json` | `check-delivery-http.py:7` |
| `F:/FireWorksLab/analysis/local/MOBILE_TEST_20261011/ue.mjs` | `verify-trail-preparation.cjs:12` |
| `F:/FireWorksLab/analysis/local/job_lock.py` | `docs/superpowers/plans/2026-10-02-export-calibration.md:30` |
| `F:/FireWorksLab/analysis/results` | `check-import-color-scale.cjs:48` |
| `F:/FireWorksLab/analysis/results/` | `check-import-system-policy.cjs:56` |
| `F:/FireWorksLab/analysis/results/MOBILE_TEST_20261011/尾缀重导入_20261012/复盘_2026-10-12.md` | `CHANGELOG.md:63` |
| `F:/FireWorksLab/analysis/scripts/compare.py` | `docs/superpowers/plans/2026-10-02-export-calibration.md:29` |
| `F:/FireWorksLab/analysis/scripts/export_job.py` | `docs/superpowers/plans/2026-10-02-export-calibration.md:28` |
| `F:/FireWorksLab/analysis/scripts/回放检查.py` | `verify-live-packages.py:14` |
| `F:/FireWorksLab/spec/UE实测包/1_帧号` | `docs/UE实测_四包批量清单.txt:1`；`docs/UE实测_本机步骤.md:17` |
| `F:/FireWorksLab/spec/UE实测包/2_串扰` | `docs/UE实测_四包批量清单.txt:3`；`docs/UE实测_本机步骤.md:19` |
| `F:/FireWorksLab/spec/UE实测包/3_曝光` | `docs/UE实测_四包批量清单.txt:4`；`docs/UE实测_本机步骤.md:20` |
| `F:/FireWorksLab/spec/UE实测包/4_Ramp` | `docs/UE实测_四包批量清单.txt:2`；`docs/UE实测_本机步骤.md:18` |
| `F:/FireWorksLab/spec/UE实测包/怎么测_一步一步.md` | `docs/UE实测_本机步骤.md:33` |
| `F:/FireWorksLab/tool/design-system` | `build-delivery.py:39` |
| `F:/FireWorksLab/tool/design-system/sync_importer_colors.py` | `build.py:75`；`external/source-workbench/README.md:3` |
| `F:/FireWorksLab/tool/design-system/tokens.json` | `external/source-workbench/README.md:3` |
| `F:/FireWorksLab/tool/local_delivery/fx_gate.py` | `delivery-preflight.py:10`；`verify-live-packages.py:13` |
| `F:/FireWorksLab/tool/local_delivery/runtime/importer.html` | `CHANGELOG.md:52` |
| `F:/FireWorksLab/tool/src/js/47_risetail.js` | `prepare-trail-packages.cjs:4` |
| `F:/FireWorksLab/tool/src/js/66_fwlcascade.js` | `prepare-trail-packages.cjs:8` |
| `F:/FireWorksLab/tool/workbench/node_modules/@babel/parser` | `prepare-trail-packages.cjs:2` |
| `F:/Fixture/tool` | `check-delivery-runtime.py:11` |
| `F:/a` | `check-import-compat-ui.cjs:15`；`check-import-compat-ui.cjs:20`；`check-import-compat-ui.cjs:7` |
| `F:/fixture` | `check-delivery-derived-first.cjs:16`；`check-delivery-derived-ui.cjs:6`；`check-import-shared-recheck.cjs:5` |
| `F:/pack` | `check-material-ui.cjs:43` |
| `F:/packs/a` | `check-import-name-confirmation.cjs:38`；`check-import-name-confirmation.cjs:64`；`check-import-name-confirmation.cjs:73`；`check-import-name-confirmation.cjs:75`；`check-import-name-confirmation.cjs:77`；`check-import-name-confirmation.cjs:79`；`check-import-name-confirmation.cjs:81`；`check-import-system-ui.cjs:10`；`check-import-workspace.cjs:40`；`check-import-workspace.cjs:54`；`check-import-workspace.cjs:56`；`check-import-workspace.cjs:61`；`check-material-ui.cjs:30`；`check.cjs:74`；`check.cjs:76`；`check.cjs:83`；`check.cjs:85`；`check.cjs:87`；`check.cjs:89`；`check.cjs:90`；`check.cjs:91`；`check.cjs:92`；`check.cjs:93`；`check.cjs:94`；`check.cjs:95`；`docs/superpowers/plans/2026-10-01-import-name-confirmation.md:35` |
| `F:/packs/cpu` | `check.cjs:62` |
| `F:/packs/gpu-pack` | `check.cjs:96`；`check.cjs:97` |
| `F:/packs/new` | `check-import-name-confirmation.cjs:61`；`check-import-name-confirmation.cjs:62` |
| `F:/packs/old` | `check-import-name-confirmation.cjs:60` |
| `F:/test/cli` | `check-delivery-presentation.cjs:43` |
| `F:/test/revisions/rev1` | `check-delivery-receiver.cjs:19` |
| `F:/unused` | `check-import-workspace.cjs:54` |
| `F:\FireWorksLab` | `export_calibration.py:13` |
| `F:\FireWorksLab\analysis\local\输出\fxpack\JinMangJu_Zoom` | `external/D/FXTools/DFWorkbench/df-fx-copier-suite_v1.0.1_locmai.html:530`；`external/D/FXTools/DFWorkbench/df-fx-copier-suite_v1.0.1_locmai.html:541` |
| `F:\FireWorksLab\analysis\scripts` | `calibration.py:77`；`check_mobile_exports.py:17` |

## 未上传内容与现存缺失

| 项目 | 原因 |
| --- | --- |
| node_modules/ | 按 lock 在临时目录 npm ci，本次未提交依赖 |
| asset-backups/ | 覆盖 UE 资产前的备份，原封不动留在 D 盘；没有删除或清理 |
| backups/、research/ 的其余内容 | 仅特批的 28 个静态检查输入入库，不整目录复制 |
| __pycache__/、runtime/ | 缓存/本机生成副本，不属于源码；检查使用 -B/PYTHONDONTWRITEBYTECODE |
| .uasset、.bak、日志、浏览器存档 | 按用户要求全部排除；临时模拟文件和检查输出也不入库 |
| research/calibration-20261002/native-authorization.json | 历史 UE 授权不传递；缺授权保护检查要求它不存在；native-plan.json 只是静态输入，不代表授权 |
| 独立解释器和系统/第三方库 | 运行依赖，不是源码输入；不复制 E 盘 Python、当前 Python 或浏览器 |
| 旧手游导出清单中的 160 文件 | 原路径已经不存在，在 D:/ProjectTextures/FireWorksLab 搜索旧导出命名亦未找到；不能伪造或拿新版替换冻结旧样例 |

旧 exports.json 引用的缺失输入逐文件列在下面；缺失按原样记录，check_mobile_exports.py 仍失败。

- `D:/ProjectTextures/FireWorksLab/QiuXingA_40_20261002/cascade.json`
- `D:/ProjectTextures/FireWorksLab/QiuXingA_40_20261002/cascade_mobile.json`
- `D:/ProjectTextures/FireWorksLab/QiuXingA_40_20261002/T_QiuXingA_40_20261002_L1.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingA_40_20261002/T_QiuXingA_40_20261002_L1_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingA_40_20261002/T_QiuXingA_40_20261002_L1_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingA_40_20261002/T_QiuXingA_40_20261002_L1_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingA_40_20261002/T_QiuXingA_40_20261002_L2.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingA_40_20261002/T_QiuXingA_40_20261002_L2_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingA_40_20261002/T_QiuXingA_40_20261002_L2_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingA_40_20261002/T_QiuXingA_40_20261002_L2_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingA_40_20261002/T_QiuXingA_40_20261002_Mobile_L1.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingA_40_20261002/T_QiuXingA_40_20261002_Mobile_L1_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingA_40_20261002/T_QiuXingA_40_20261002_Mobile_L1_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingA_40_20261002/T_QiuXingA_40_20261002_Mobile_L1_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingA_40_20261002/T_QiuXingA_40_20261002_Mobile_L2.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingA_40_20261002/T_QiuXingA_40_20261002_Mobile_L2_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingA_40_20261002/T_QiuXingA_40_20261002_Mobile_L2_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingA_40_20261002/T_QiuXingA_40_20261002_Mobile_L2_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/cascade.json`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/cascade_mobile.json`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_L1.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_L1_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_L1_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_L1_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_L2.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_L2_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_L2_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_L2_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_L3.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_L3_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_L3_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_L3_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_Mobile_L1.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_Mobile_L1_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_Mobile_L1_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_Mobile_L1_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_Mobile_L2.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_Mobile_L2_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_Mobile_L2_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_Mobile_L2_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_Mobile_L3.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_Mobile_L3_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_Mobile_L3_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingB_40_20261002/T_QiuXingB_40_20261002_Mobile_L3_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingC_40_20261002/cascade.json`
- `D:/ProjectTextures/FireWorksLab/QiuXingC_40_20261002/cascade_mobile.json`
- `D:/ProjectTextures/FireWorksLab/QiuXingC_40_20261002/T_QiuXingC_40_20261002_L1.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingC_40_20261002/T_QiuXingC_40_20261002_L1_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingC_40_20261002/T_QiuXingC_40_20261002_L1_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingC_40_20261002/T_QiuXingC_40_20261002_L1_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingC_40_20261002/T_QiuXingC_40_20261002_L2.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingC_40_20261002/T_QiuXingC_40_20261002_L2_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingC_40_20261002/T_QiuXingC_40_20261002_L2_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingC_40_20261002/T_QiuXingC_40_20261002_L2_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingC_40_20261002/T_QiuXingC_40_20261002_Mobile_L1.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingC_40_20261002/T_QiuXingC_40_20261002_Mobile_L1_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingC_40_20261002/T_QiuXingC_40_20261002_Mobile_L1_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingC_40_20261002/T_QiuXingC_40_20261002_Mobile_L1_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingC_40_20261002/T_QiuXingC_40_20261002_Mobile_L2.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingC_40_20261002/T_QiuXingC_40_20261002_Mobile_L2_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingC_40_20261002/T_QiuXingC_40_20261002_Mobile_L2_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingC_40_20261002/T_QiuXingC_40_20261002_Mobile_L2_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/cascade.json`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/cascade_mobile.json`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_L1.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_L1_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_L1_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_L1_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_L2_A.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_L2_A_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_L2_A_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_L2_B.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_L2_B_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_L2_B_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_L2_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_L3.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_L3_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_L3_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_L3_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_Mobile_L1.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_Mobile_L1_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_Mobile_L1_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_Mobile_L1_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_Mobile_L2_A.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_Mobile_L2_A_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_Mobile_L2_A_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_Mobile_L2_B.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_Mobile_L2_B_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_Mobile_L2_B_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_Mobile_L2_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_Mobile_L3.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_Mobile_L3_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_Mobile_L3_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QiuXingD_40_20261002/T_QiuXingD_40_20261002_Mobile_L3_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QingNing_40_20261002/cascade.json`
- `D:/ProjectTextures/FireWorksLab/QingNing_40_20261002/cascade_mobile.json`
- `D:/ProjectTextures/FireWorksLab/QingNing_40_20261002/T_QingNing_40_20261002_L1.png`
- `D:/ProjectTextures/FireWorksLab/QingNing_40_20261002/T_QingNing_40_20261002_L1_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QingNing_40_20261002/T_QingNing_40_20261002_L1_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QingNing_40_20261002/T_QingNing_40_20261002_L1_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QingNing_40_20261002/T_QingNing_40_20261002_L2.png`
- `D:/ProjectTextures/FireWorksLab/QingNing_40_20261002/T_QingNing_40_20261002_L2_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QingNing_40_20261002/T_QingNing_40_20261002_L2_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QingNing_40_20261002/T_QingNing_40_20261002_L2_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QingNing_40_20261002/T_QingNing_40_20261002_Mobile_L1.png`
- `D:/ProjectTextures/FireWorksLab/QingNing_40_20261002/T_QingNing_40_20261002_Mobile_L1_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QingNing_40_20261002/T_QingNing_40_20261002_Mobile_L1_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QingNing_40_20261002/T_QingNing_40_20261002_Mobile_L1_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QingNing_40_20261002/T_QingNing_40_20261002_Mobile_L2.png`
- `D:/ProjectTextures/FireWorksLab/QingNing_40_20261002/T_QingNing_40_20261002_Mobile_L2_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QingNing_40_20261002/T_QingNing_40_20261002_Mobile_L2_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QingNing_40_20261002/T_QingNing_40_20261002_Mobile_L2_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/cascade.json`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/cascade_mobile.json`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_L1.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_L1_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_L1_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_L1_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_L2.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_L2_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_L2_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_L2_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_L3.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_L3_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_L3_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_L3_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_L4.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_L4_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_L4_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_L4_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_Mobile_L1.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_Mobile_L1_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_Mobile_L1_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_Mobile_L1_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_Mobile_L2.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_Mobile_L2_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_Mobile_L2_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_Mobile_L2_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_Mobile_L3.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_Mobile_L3_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_Mobile_L3_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_Mobile_L3_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_Mobile_L4.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_Mobile_L4_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_Mobile_L4_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/QianLun_40_20261002/T_QianLun_40_20261002_Mobile_L4_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/Crossette_40_20261002/cascade.json`
- `D:/ProjectTextures/FireWorksLab/Crossette_40_20261002/cascade_mobile.json`
- `D:/ProjectTextures/FireWorksLab/Crossette_40_20261002/Crossette_40_20261002.json`
- `D:/ProjectTextures/FireWorksLab/Crossette_40_20261002/Crossette_40_20261002_Cascade参数.txt`
- `D:/ProjectTextures/FireWorksLab/Crossette_40_20261002/Crossette_40_20261002_Mobile.json`
- `D:/ProjectTextures/FireWorksLab/Crossette_40_20261002/Crossette_40_20261002_曲线.csv`
- `D:/ProjectTextures/FireWorksLab/Crossette_40_20261002/T_Crossette_40_20261002.png`
- `D:/ProjectTextures/FireWorksLab/Crossette_40_20261002/T_Crossette_40_20261002_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/Crossette_40_20261002/T_Crossette_40_20261002_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/Crossette_40_20261002/T_Crossette_40_20261002_Mobile.png`
- `D:/ProjectTextures/FireWorksLab/Crossette_40_20261002/T_Crossette_40_20261002_Mobile_Cutout.png`
- `D:/ProjectTextures/FireWorksLab/Crossette_40_20261002/T_Crossette_40_20261002_Mobile_FrameTest.png`
- `D:/ProjectTextures/FireWorksLab/Crossette_40_20261002/T_Crossette_40_20261002_Mobile_Ramp.png`
- `D:/ProjectTextures/FireWorksLab/Crossette_40_20261002/T_Crossette_40_20261002_Ramp.png`

## 特批的 28 个静态测试输入

- `backups/2026-10-04-design-implementation/delivered/df-fx-workbench_v2_locmai.html`（460,576 字节）
- `backups/2026-10-04-import-failure/df-fx-workbench_v2_locmai.html`（421,762 字节）
- `backups/2026-10-04-preroll/df-fx-workbench_v2_locmai.html`（460,576 字节）
- `backups/2026-10-05-module-support/df-fx-workbench_v2_locmai.html`（522,093 字节）
- `backups/2026-10-05-public-asset-naming/df-fx-workbench_v2_locmai.html`（516,742 字节）
- `backups/20261007-color-scale-production.html`（666,392 字节）
- `backups/20261009-material-before.html`（694,030 字节）
- `backups/20261009-material-protected.json`（2,422 字节）
- `backups/20261009-source-control-before.html`（693,771 字节）
- `backups/20261010-import-audit-4967/df-fx-workbench_v2_locmai.html`（731,362 字节）
- `backups/prism3-events-before/df-fx-workbench_v2_locmai.html`（731,366 字节）
- `research/calibration-20261002/calibration.json`（11,537 字节）
- `research/calibration-20261002/exports.json`（37,010 字节）
- `research/calibration-20261002/material-channel-scan.json`（220,799 字节）
- `research/calibration-20261002/native-plan.json`（442,277 字节）
- `research/design-20261004/upstream-importer-patch.json`（1,206 字节）
- `research/module-support-20261005/RT4L-regression-cascade.json`（451,722 字节）
- `research/module-support-20261005/RT6L-current-cascade.json`（325,183 字节）
- `research/module-support-20261005/RiseTailL_cascade.json`（222,509 字节）
- `research/module-support-20261005/RiseTailL_cascade_mobile.json`（222,104 字节）
- `research/module-support-20261005/RiseTailM_cascade.json`（126,464 字节）
- `research/module-support-20261005/RiseTailM_cascade_mobile.json`（126,283 字节）
- `research/module-support-20261005/RiseTailS_cascade.json`（88,612 字节）
- `research/module-support-20261005/RiseTailS_cascade_mobile.json`（88,486 字节）
- `research/module-support-20261005/reviewed-life-modules-patch.json`（23,418 字节）
- `research/naming-20261005/cascade-before.json`（13,298 字节）
- `research/naming-20261005/reviewed-naming-patch.json`（101,865 字节）
- `research/preroll-20261004/cascade-before.json`（13,221 字节）

## 完整上传文件清单与原路径

下表中 `W/` 代表 `D:/FXTools/DFWorkbench/workbench/`；所有外部输入均列完整原路径。SHA-256 对应来源原字节，已逐项核对复制件；本 README 不对自身计算哈希。

| 上传路径（相对本目录） | 字节 | 原路径 | SHA-256 |
| --- | ---: | --- | --- |
| `CHANGELOG.md` | 47436 | `W/CHANGELOG.md` | `18e4006351256a01fdd0040e0212e69b3b7a72f1cd2d987b8100da2f7fdd3f5e` |
| `MULTI_TEXTURE_PLAN.md` | 2228 | `W/MULTI_TEXTURE_PLAN.md` | `8a1d67830caa22a265a1e28aae8cba61cac7bd2e4460ad9ce60105357987020a` |
| `PLAN.md` | 2586 | `W/PLAN.md` | `b043f0c51169b0c4fc6059fd5eaae58caa9f55afa1f37c34feb9700000f60802` |
| `apply-import-policy-20261006.py` | 2989 | `W/apply-import-policy-20261006.py` | `bf239562554eca798d75a122876c729e0f5533eddc0b6b1ba3690245e0870fa0` |
| `backups/2026-10-04-design-implementation/delivered/df-fx-workbench_v2_locmai.html` | 460576 | `W/backups/2026-10-04-design-implementation/delivered/df-fx-workbench_v2_locmai.html` | `75c0af34906a4fa5ce82658498a35ddf9a6297be5c3506d86a2e25f24d6f1ab8` |
| `backups/2026-10-04-import-failure/df-fx-workbench_v2_locmai.html` | 421762 | `W/backups/2026-10-04-import-failure/df-fx-workbench_v2_locmai.html` | `15a2eda59f3c223534621551f4a229ca87c6837d32dbfebb53639cc5af9974c3` |
| `backups/2026-10-04-preroll/df-fx-workbench_v2_locmai.html` | 460576 | `W/backups/2026-10-04-preroll/df-fx-workbench_v2_locmai.html` | `75c0af34906a4fa5ce82658498a35ddf9a6297be5c3506d86a2e25f24d6f1ab8` |
| `backups/2026-10-05-module-support/df-fx-workbench_v2_locmai.html` | 522093 | `W/backups/2026-10-05-module-support/df-fx-workbench_v2_locmai.html` | `8e1c58f18e9124de85413cc6d22f5146c13115956effb65b4b79a837c5c8222f` |
| `backups/2026-10-05-public-asset-naming/df-fx-workbench_v2_locmai.html` | 516742 | `W/backups/2026-10-05-public-asset-naming/df-fx-workbench_v2_locmai.html` | `70582c462ff8617632ceb490ec51dba4df71cdb948f64d3c284f8ecb4a1c8f90` |
| `backups/20261007-color-scale-production.html` | 666392 | `W/backups/20261007-color-scale-production.html` | `9e39e6fe5b9049fe271d3e9c9ba0db951616bce16280c84f85c8f39909a62baa` |
| `backups/20261009-material-before.html` | 694030 | `W/backups/20261009-material-before.html` | `3f8755fe3998b284cd03772117c28ddc54a6ed889f4f28bfc3ec88bacdf53218` |
| `backups/20261009-material-protected.json` | 2422 | `W/backups/20261009-material-protected.json` | `434d9853da53f4b4c77e2defe1f6208ba4616baab7ef463d0965c33a1680b008` |
| `backups/20261009-source-control-before.html` | 693771 | `W/backups/20261009-source-control-before.html` | `962457f6009283519efa1b0d4f0ccae5df4495e6b44cd2d13c59402c285e82f7` |
| `backups/20261010-import-audit-4967/df-fx-workbench_v2_locmai.html` | 731362 | `W/backups/20261010-import-audit-4967/df-fx-workbench_v2_locmai.html` | `b445f4c866f1822d0a314938b125cc695d63a0b9aebe0572ac3a4d3b4c968520` |
| `backups/prism3-events-before/df-fx-workbench_v2_locmai.html` | 731366 | `W/backups/prism3-events-before/df-fx-workbench_v2_locmai.html` | `2ec46d537eab8c9fa423c014bf697cb59daf12c534e667f5f75386e6f3ed0cd2` |
| `build-delivery.py` | 9588 | `W/build-delivery.py` | `b82f7f08b447c941a44a7dd65b4b7abe0d9d9b3b39cada859d973826e214aef3` |
| `build-show-project-evidence.cjs` | 2198 | `W/build-show-project-evidence.cjs` | `df105faf2022ade0e48d7db4cf4bbb3089afc79118e708a39d3643efda659ad7` |
| `build.py` | 8551 | `W/build.py` | `f07f04ba829c2f8b82798d380dad70967d9b6cde667c710c8d952245d4ecb939` |
| `build_calibration_preview.cjs` | 7819 | `W/build_calibration_preview.cjs` | `a06c01dbb035bb0c6f925d87bd1c56a9f84486aeb60fc2ed8a6d5ccdd55e4c40` |
| `calibration.py` | 7864 | `W/calibration.py` | `6f39a48e3032e38af80b7cfeca819e5f7c1ed66c492c36cd497850f37aa6cb85` |
| `cascade-events.js` | 3245 | `W/cascade-events.js` | `6211577e672d456ee831a6d5f5e5ca2fcf661005e4606f284e8a12b31f51ec84` |
| `check-delivery-contract.cjs` | 4406 | `W/check-delivery-contract.cjs` | `f82d851db9f5c608984fe0f05b3988d538b26641c2243446fc4a8e52ee9b71e0` |
| `check-delivery-derived-first.cjs` | 8459 | `W/check-delivery-derived-first.cjs` | `e7fd8f6a4c135ac9a543d7c36e2d819d1dedf98ccb68c3df5935366a50feffed` |
| `check-delivery-derived-ui.cjs` | 5800 | `W/check-delivery-derived-ui.cjs` | `c48e9e7e3698db120a042a9173cef7efe72e28dd1082867476509cc79a8b18d7` |
| `check-delivery-derived.cjs` | 3458 | `W/check-delivery-derived.cjs` | `0eee3110badca2c58c5a8656ad3f90c5c0651af8196872f3f8c362f1256c10b2` |
| `check-delivery-guards.cjs` | 831 | `W/check-delivery-guards.cjs` | `80d84d1bf14c8ea93e8c26622acf34efe18a352f8327e848ce50174e21b75409` |
| `check-delivery-http.py` | 7784 | `W/check-delivery-http.py` | `12cf0f0bb359d2f5aecbebf307468ce90ed7101d85be9facda45e426a4fc868a` |
| `check-delivery-material-names.cjs` | 792 | `W/check-delivery-material-names.cjs` | `a2a3ebbb5851c3c38138bf4206b5bc1cea2d1d20d7492596a5e943019a7151aa` |
| `check-delivery-migration.cjs` | 2992 | `W/check-delivery-migration.cjs` | `c252f3c57c5c15fb01d67f80a05d0a4e7c230de4e91818563953ec87e716ed6f` |
| `check-delivery-native.cjs` | 4927 | `W/check-delivery-native.cjs` | `8f0ef44224de5a4c5d477ff42ac9fe7aefc222d7c4022ae2b97f3e2df07219ca` |
| `check-delivery-preflight.py` | 4341 | `W/check-delivery-preflight.py` | `2899560480f5f8aa3ca99f09648ef03a0edafd496cebab25cdb37ba9175b1dec` |
| `check-delivery-presentation.cjs` | 12221 | `W/check-delivery-presentation.cjs` | `2401957341206e9aef816fe5bdfc96ee31bccec2607700eda92d213564167c71` |
| `check-delivery-receiver.cjs` | 5182 | `W/check-delivery-receiver.cjs` | `a6f421b90d8e77532f16478d3f9807c32dedff260d2d87e71609f8303583179b` |
| `check-delivery-registration.cjs` | 7025 | `W/check-delivery-registration.cjs` | `38bb0c15f7d95b11432561c1ecc4c4d19bcfb24297723b800f5e31655df7e8b6` |
| `check-delivery-runtime.py` | 2391 | `W/check-delivery-runtime.py` | `6f61ab2ddd782c5e0cd412994315c3f37eede30923f75e38230ef4670f6bc179` |
| `check-delivery-sc-offline.py` | 8779 | `W/check-delivery-sc-offline.py` | `cf02d28db362026c20b6760823393105ddd3ddae1392a85bac504ec7a0156a77` |
| `check-delivery-transport.cjs` | 6476 | `W/check-delivery-transport.cjs` | `ee9a028e39226776e22fe538b50b6415541628d646d310c5c8ebfc337a4ea006` |
| `check-design-layout.cjs` | 12475 | `W/check-design-layout.cjs` | `34c93bdbe5945a70a5c362d7955a5f94027a1668ea6c9870886c83df3764a972` |
| `check-design-ui.cjs` | 10722 | `W/check-design-ui.cjs` | `17c79c9cfe017571da38474d66b6d60ee22c83dc4c4714bd43a91e0d0b6e9ffb` |
| `check-import-calibration.cjs` | 4210 | `W/check-import-calibration.cjs` | `9c62826441ce982fbccf917d9776fafdd3ea28546b75725462732b226fb05bf2` |
| `check-import-color-scale.cjs` | 7609 | `W/check-import-color-scale.cjs` | `25155565535c2d44af9bc9c090a874adf34be8418c29557fdfc5749195f961e6` |
| `check-import-compat-ui.cjs` | 3804 | `W/check-import-compat-ui.cjs` | `4e596b3930d1361f5541f38a22db143b37f26d774665a48c4a58afcdb910e0a7` |
| `check-import-compat.cjs` | 4033 | `W/check-import-compat.cjs` | `1c278462517bdf493f3a1e34591bfaa16fa6d3884f6e8d73ead049aa8976f9fa` |
| `check-import-cutout-selection.cjs` | 10179 | `W/check-import-cutout-selection.cjs` | `f1a892d47f8044871da9356f3b267f101d6bd1532b2b08d544388fbcfc93bb4a` |
| `check-import-events.cjs` | 12006 | `W/check-import-events.cjs` | `5eb4c2336ef43795d0df2c3e688007f0d028a945d416d7a612560a34177310c8` |
| `check-import-interrupted.cjs` | 6366 | `W/check-import-interrupted.cjs` | `b3f7260ee6b56dae501b8ce4f19874ff00eb3d2a04fc2fdd0222370b977e43a0` |
| `check-import-iteration.cjs` | 9061 | `W/check-import-iteration.cjs` | `7eb6d8e427c905a506050f229e48229bbaa5f25372d02ab4840201833e510d6c` |
| `check-import-life-modules.cjs` | 21129 | `W/check-import-life-modules.cjs` | `e0b76d460cbca5edb7e5a5a8955fcf7392a8978caa58e66a22f2a9c22a0ff4d3` |
| `check-import-name-confirmation.cjs` | 11030 | `W/check-import-name-confirmation.cjs` | `ebbb3b128f7bbd47f55dceade7e4a2988e16909a662defa957b014ca6f25b5a5` |
| `check-import-naming.cjs` | 19329 | `W/check-import-naming.cjs` | `f6c076d83406d4c22327fc92ac6e123c090578fba3789579391e77c74bbd7f86` |
| `check-import-pack-compat.cjs` | 4797 | `W/check-import-pack-compat.cjs` | `911ab400b511425d1012b5ef8c4d7b8e1770b8a6004b3da0fe48b7f803f7fee6` |
| `check-import-policy.cjs` | 11051 | `W/check-import-policy.cjs` | `af6f105b686332652f5f0b8c556d1b4d73c3a68f4d72dfedb9166b08ab3665bc` |
| `check-import-preroll.cjs` | 11743 | `W/check-import-preroll.cjs` | `e9f510c0818876d5093db8f91ad902c12b6643a54bb9954e300300f19f15ccd1` |
| `check-import-public-names.cjs` | 32129 | `W/check-import-public-names.cjs` | `9ef7eec684ced467cf5b6c3d42535e1e0a641cccb26e0f1bb5df9f9d8726ba63` |
| `check-import-recovery.cjs` | 8932 | `W/check-import-recovery.cjs` | `901497deaa489765d488acf3e0c065e7fd7f495d687a885e379159eb8af5d647` |
| `check-import-resource-rules.cjs` | 17743 | `W/check-import-resource-rules.cjs` | `003f023f4b8ab26013fdd937ac192bd4a1c8fb67df7cfbbef9c52523261121bf` |
| `check-import-reuse-compat.cjs` | 4884 | `W/check-import-reuse-compat.cjs` | `ec1c2caf82b9008c27b0bd8c922809b576aa7d1c08d778926a713d2a0b8a7574` |
| `check-import-selection.cjs` | 10784 | `W/check-import-selection.cjs` | `be950001b264f73d46d3995042887f38bfa33392de0edf4baa92107e1cd0198e` |
| `check-import-shared-recheck.cjs` | 5174 | `W/check-import-shared-recheck.cjs` | `0a4f06e10380aad1ba25b907e035cecedb90c81e8fcc7916759e106c126921d4` |
| `check-import-source-control.cjs` | 5604 | `W/check-import-source-control.cjs` | `796be2c1d1da2c5c3d0fd8f37c20616ad6c01b31d2168771fa696e67b48f3d32` |
| `check-import-system-policy.cjs` | 9406 | `W/check-import-system-policy.cjs` | `0d5c75e3aa31e77823b671a5fb6b21c9d9ffcf305584560db3cb6decb7d1c7b7` |
| `check-import-system-ui.cjs` | 4852 | `W/check-import-system-ui.cjs` | `cde03f6ecb11fd2c9bf26242f248c79a7569216eb84e462dc10d7106119baa06` |
| `check-import-update-backend.cjs` | 14996 | `W/check-import-update-backend.cjs` | `61c9d8ffa4fccebd8eb3e0d1ed051b330a4fb064f7a9c0d3f427454b1fdda3c1` |
| `check-import-workspace.cjs` | 8725 | `W/check-import-workspace.cjs` | `62afe0f444a2890d3877f5d97aa1858b16a8b06dcb7234d0ba64aa74eff926b1` |
| `check-material-ui.cjs` | 10811 | `W/check-material-ui.cjs` | `c2775f1b80591216809abefa35c191c5a7a85e1ee9faaae9353e09078626cbf1` |
| `check-multi-textures.cjs` | 7126 | `W/check-multi-textures.cjs` | `0b4e9b01814abcfab9e5e04bc57a6aa2bf42886dd07cea3209f7de8147eb83ee` |
| `check-native-approval.cjs` | 682 | `W/check-native-approval.cjs` | `afdba9f3e4b3c8308bf3c8f4d0d1d125fba6db9303c8a6f2ecca509c981fde6d` |
| `check-native-persistence.cjs` | 1360 | `W/check-native-persistence.cjs` | `a0ecbb0a157e0163c68c357adf5d2f14e2125783be5132850fa6400ee7ae9b15` |
| `check-policy-native-syntax.cjs` | 955 | `W/check-policy-native-syntax.cjs` | `b30c8bd9c36de68b7464e1c8516f46bcfd00089a7c2091834ea567ed47411dbc` |
| `check-show-blank.cjs` | 10273 | `W/check-show-blank.cjs` | `e4a1f3f8bea4e4fc67eb154f8788ea22ecbb9d28637ca1ae26f6006efcd1e842` |
| `check-show-export.cjs` | 20660 | `W/check-show-export.cjs` | `e87a898b6b4a844376615c111a598215260e3fcb41055d7297a92b3add1955d8` |
| `check-show-fan.cjs` | 9073 | `W/check-show-fan.cjs` | `07bbbb4c871724d8d6f23528be1eef10db22b1fc5e7698da4b0af4dc43fefead` |
| `check-show-project-boundaries.cjs` | 5037 | `W/check-show-project-boundaries.cjs` | `8544d50218105b3bd63a29794c33ed2df92665fc5f8bf9e9353946822ecf6334` |
| `check-show-project-ui.cjs` | 9688 | `W/check-show-project-ui.cjs` | `0927787fa486911736ca1cd51690d6c97c4b9de7a49c720e9e97b51a988ddf07` |
| `check-show-project.cjs` | 11643 | `W/check-show-project.cjs` | `d75b7a4a9385ca45205ca104ee271a84d2a0600113a9812774a4750ad74f15b6` |
| `check-show-resource-ids.cjs` | 20155 | `W/check-show-resource-ids.cjs` | `05a7f1345650d73b4cc11bb1bd2ff6c8173c5ca25e0cd51e080a1524db128b3a` |
| `check-show.cjs` | 12182 | `W/check-show.cjs` | `ac3d4fcf1ca5bbee944f75568e6f5680bbd032b0a908afc6fd1dce21236621b0` |
| `check-workbench-log.cjs` | 4381 | `W/check-workbench-log.cjs` | `4996cef1c57c7b691708f1cd1ce14644230deed796386f4ef66458a4a4938907` |
| `check-workbench-scroll.cjs` | 6682 | `W/check-workbench-scroll.cjs` | `5065c6f883c5f643ae098d04508cb2543e75c8b2b7440752acee70aefd18fc58` |
| `check.cjs` | 16072 | `W/check.cjs` | `cb6286a2a29a348cb209565998e13eadf4ced19d35d764d28c5bb1e81dc4280e` |
| `check_calibration.py` | 2770 | `W/check_calibration.py` | `303d71c347b597ef3dd2b70d94bbf7a3cd0d12664b1b95a2ca058413c0bb81b6` |
| `check_material_channel_candidates.cjs` | 1546 | `W/check_material_channel_candidates.cjs` | `705d1b942612d3457336a400edad0a6744b49177d1411657f792d93fd2699b74` |
| `check_mobile_exports.py` | 3858 | `W/check_mobile_exports.py` | `31170455d51c743323ab29b56e1ec42ccb5b8bcb6df1b48f4eab5f08c735c7be` |
| `delivery-bridge.js` | 1384 | `W/delivery-bridge.js` | `25f89b3bfea2a43be3b7eb8f230878235c3aa8431bac4c3913807eaee099b08d` |
| `delivery-contract.js` | 16228 | `W/delivery-contract.js` | `31b3f0a84f9d60c71439595965c6d9d7691737da759ad917d041b3778e2fde75` |
| `delivery-material-names.js` | 445 | `W/delivery-material-names.js` | `436c296b2835c608f08787b7a19d672553f11f8a4b3eec4f1bfc28783548a4a7` |
| `delivery-preflight.py` | 2815 | `W/delivery-preflight.py` | `2c2d5411fea2ab695f11f70dc2ddfba452480ec0deae3ece55ac3f711af0fa93` |
| `delivery-presentation.css` | 26728 | `W/delivery-presentation.css` | `080f39c23ade42d86d016d5d85f3eb641ead878b17f86ecf7394dc971c6608d7` |
| `delivery-presentation.js` | 19816 | `W/delivery-presentation.js` | `5a1f2024281a09ab913bd47e19a541c4c04df44ac9bfa4ea9768b9d6eb6c87ee` |
| `delivery-receiver.js` | 2962 | `W/delivery-receiver.js` | `7dc416b64528c8932d2dbedaeae90e0f537bfa9e8ea3186461b0af1f0d9a7fc4` |
| `delivery-workspace-state.js` | 2540 | `W/delivery-workspace-state.js` | `ba34f617dc47e4f774e1304278b9cf3a1cd81e08cba42c400077b70a22fef231` |
| `delivery_sc_offline.py` | 9180 | `W/delivery_sc_offline.py` | `2becc9360bd23e0e0db4f9e65f60cadb2a95d43de92d285b2df01998ecfddfdb` |
| `design-qa.md` | 11496 | `W/design-qa.md` | `20f62745400a327032ddc4dc487edfaff91c83530cec5a0651168998412c9701` |
| `docs/UE实测_四包批量清单.txt` | 317 | `W/docs/UE实测_四包批量清单.txt` | `9deba2dd9871a2ed027c672fbe55e63e4dd4694082014a120ebc4c550e0b74be` |
| `docs/UE实测_本机步骤.md` | 3865 | `W/docs/UE实测_本机步骤.md` | `4aa24db453b58db3ed04505894c2bc943eea391899889fd0f36e28cef5167be9` |
| `docs/superpowers/plans/2026-10-01-fan-contour.md` | 5657 | `W/docs/superpowers/plans/2026-10-01-fan-contour.md` | `6a080946005f3002477df0841f7273d970d2438ef7bc3f59ed5ed5b69c0604ab` |
| `docs/superpowers/plans/2026-10-01-import-name-confirmation.md` | 5759 | `W/docs/superpowers/plans/2026-10-01-import-name-confirmation.md` | `1e7775a4c032e52bd8c7d22c5bd714ed07b00fe6181341b38955e8fe5cb18572` |
| `docs/superpowers/plans/2026-10-01-resource-ids.md` | 5549 | `W/docs/superpowers/plans/2026-10-01-resource-ids.md` | `e5d1a0f5d38588fa02ccb47cc96f45578414197b649b18bfd8cf7129bc9a4b2e` |
| `docs/superpowers/plans/2026-10-01-show-preview.md` | 9077 | `W/docs/superpowers/plans/2026-10-01-show-preview.md` | `1f14f37fc77120ea5a6c9b95a3e6ae470e014d7e0fc79f69a7bfe08b44ac61e2` |
| `docs/superpowers/plans/2026-10-01-template-copy.md` | 9304 | `W/docs/superpowers/plans/2026-10-01-template-copy.md` | `78e0e156e618fc09ee0f597e51893f1e651dda707cc9916d1b3dc81ec471da54` |
| `docs/superpowers/plans/2026-10-02-export-calibration.md` | 7528 | `W/docs/superpowers/plans/2026-10-02-export-calibration.md` | `a494c18eff55d4424e6a13de9957b434ce774c384c66ad34236c93abc7fcb6ac` |
| `docs/superpowers/plans/2026-10-04-import-recovery.md` | 4551 | `W/docs/superpowers/plans/2026-10-04-import-recovery.md` | `94a97636d7c62b578cbe9552f6c06242eca74c62ede4fa2e133d9222f1934c6e` |
| `docs/superpowers/plans/2026-10-04-iteration-update.md` | 6812 | `W/docs/superpowers/plans/2026-10-04-iteration-update.md` | `cf3d2260aa150b2b89215d68413d1f6271125ab1885d1216583a41a63a4790bd` |
| `docs/superpowers/plans/2026-10-04-naming-split.md` | 9404 | `W/docs/superpowers/plans/2026-10-04-naming-split.md` | `97c41c77a8186daef8143012262f97c6564eef5dab865c9deafdbe776b940b3c` |
| `docs/superpowers/plans/2026-10-04-pivot-mapping.md` | 6801 | `W/docs/superpowers/plans/2026-10-04-pivot-mapping.md` | `f6452754f71b5a55c02048878188358b3d6fb2ac12f8be6c31137a2a223db6fb` |
| `docs/superpowers/plans/2026-10-04-preroll-metadata.md` | 5688 | `W/docs/superpowers/plans/2026-10-04-preroll-metadata.md` | `5c1005ae22f26018f97767b601fffa2778b0746fc39c16a3f2ab25f1cd27d334` |
| `docs/superpowers/plans/2026-10-04-six-page-ui.md` | 6502 | `W/docs/superpowers/plans/2026-10-04-six-page-ui.md` | `7c2205b7e08651ba0bfe7e3ff999f5c1bb55f3450daad6dd4d2a780e9b3662ee` |
| `docs/superpowers/plans/2026-10-05-importer-life-modules.md` | 8078 | `W/docs/superpowers/plans/2026-10-05-importer-life-modules.md` | `fc1bcc2a93badced33407e0699da5e2723382341b54b2a0bb404070b2539d8dc` |
| `docs/superpowers/plans/2026-10-05-public-asset-naming.md` | 7387 | `W/docs/superpowers/plans/2026-10-05-public-asset-naming.md` | `200f59446843019b5edfe1973c550f95d1f267da5a741ad814411a0fd1f74438` |
| `docs/superpowers/plans/2026-10-05-workbench-visual-fidelity.md` | 5709 | `W/docs/superpowers/plans/2026-10-05-workbench-visual-fidelity.md` | `6bba4b8e25468f4cc3e90f734d9518e4aa3af15f147e98071c825d167acdcf8a` |
| `docs/superpowers/plans/2026-10-06-import-policy.md` | 3778 | `W/docs/superpowers/plans/2026-10-06-import-policy.md` | `6ea11ef6feb67cfe1eba3118164ab00971b118ed0616953030463b8154469a89` |
| `docs/superpowers/plans/2026-10-06-interrupted-import.md` | 2752 | `W/docs/superpowers/plans/2026-10-06-interrupted-import.md` | `2ee89ae5cec2cca6c85d0f2356ca29a2adefaee23278c9aabd0fd21c04e3c320` |
| `docs/superpowers/plans/2026-10-06-one-screen-import.md` | 2588 | `W/docs/superpowers/plans/2026-10-06-one-screen-import.md` | `711ff6f513b49e7f528f725ee9c653968d0aae92b4a98dc6a2566467dda48dae` |
| `docs/superpowers/plans/2026-10-06-optional-cutout-selection.md` | 3093 | `W/docs/superpowers/plans/2026-10-06-optional-cutout-selection.md` | `433e15eb90d0343e99f5f4b732b46a09dab904ec74b3fe5c000f0dd2b67034b9` |
| `docs/superpowers/plans/2026-10-06-selection-log.md` | 3619 | `W/docs/superpowers/plans/2026-10-06-selection-log.md` | `0a69f2146dd14cc493e022be3e66785f2901626c4aca9936fca75a7a8451d41e` |
| `docs/superpowers/plans/2026-10-06-show-link-v1.md` | 8310 | `W/docs/superpowers/plans/2026-10-06-show-link-v1.md` | `0382cef22fcd72c84dc24979f52d45f754912f675fc36a7cce92a562f4de9428` |
| `docs/superpowers/plans/2026-10-06-workbench-scroll.md` | 2812 | `W/docs/superpowers/plans/2026-10-06-workbench-scroll.md` | `54852d7c8a703aeec10fcd7f98ff056fdc2e49dfb28fd60dd2a7973682917fbd` |
| `docs/superpowers/plans/2026-10-07-color-scale.md` | 4263 | `W/docs/superpowers/plans/2026-10-07-color-scale.md` | `6b00561a05efa512afe2dd9fa009e406195898d154b45f97872d7e2973b29cb8` |
| `docs/superpowers/plans/2026-10-07-system-policy.md` | 1525 | `W/docs/superpowers/plans/2026-10-07-system-policy.md` | `2076d9d92d6916757323e8432cccb6d205116926cd4bac8737eb813af00fb0c4` |
| `docs/superpowers/plans/2026-10-08-import-compat.md` | 3913 | `W/docs/superpowers/plans/2026-10-08-import-compat.md` | `27a3d018a91503f76bf2a0108f26ec3c47b74166a7fb1e0ded80c1edc3d4fba6` |
| `docs/superpowers/plans/2026-10-09-material-workbench.md` | 3936 | `W/docs/superpowers/plans/2026-10-09-material-workbench.md` | `16c1a811abe184d5d76e3934493f0b444bd7407898814a0e63e51e41af73cf83` |
| `docs/superpowers/plans/2026-10-09-source-control-json.md` | 2389 | `W/docs/superpowers/plans/2026-10-09-source-control-json.md` | `e30bc36cb57161272da7156a989cce84d59aa0c12b0f0fe88f6301731a207bed` |
| `docs/superpowers/plans/2026-10-12-local-trail-delivery.md` | 4386 | `W/docs/superpowers/plans/2026-10-12-local-trail-delivery.md` | `cf2d999b282516cf9028f84fdb0fd7d703e123662978a0f03632cf392a1e9565` |
| `docs/导入目录与材质修复方案_2026-10-06.md` | 4481 | `W/docs/导入目录与材质修复方案_2026-10-06.md` | `8484735a8439d710108635f7a12fdecb08497346cf40832e1564967ca24096f5` |
| `engine_api.cjs` | 2430 | `W/engine_api.cjs` | `b5c5c42c9a5e2f7c8863720102db7c68bdc8654c27131467a232afdb2f996e3e` |
| `export_calibration.py` | 7515 | `W/export_calibration.py` | `d448599c182dd361679a45af42d06e3716505e55920453bf476a7af645ea52e8` |
| `external/C/Users/locmai/.fireworkslab/delivery-launcher.json` | 159 | `C:/Users/locmai/.fireworkslab/delivery-launcher.json` | `c5fda8b22e1255d17ce2e780025a5a005d7f86d263853f5222bee5bfabc92a66` |
| `external/C/Users/locmai/.fireworkslab/delivery-settings.json` | 57 | `C:/Users/locmai/.fireworkslab/delivery-settings.json` | `acc66c50f82baa1d3be12801f1167a701ec2c55742f80f3c975db774a53efd99` |
| `external/D/FXTools/DFWorkbench/df-fx-copier-suite_v1.0.1_locmai.html` | 250897 | `D:/FXTools/DFWorkbench/df-fx-copier-suite_v1.0.1_locmai.html` | `17bc3503c307a02200c5f48cf171d02ad582703f73078c8c673a29d8c7ae685b` |
| `external/D/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html` | 749082 | `D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html` | `d0962cb8831cb615a3b5e72f1aacc402e9fd4d2fbb6262367810bfd558773264` |
| `external/D/ProjectTextures/FireWorksLab/RiseTrail_L/cascade.json` | 325183 | `D:/ProjectTextures/FireWorksLab/RiseTrail_L/cascade.json` | `5baf136c0802e8e16eb3c95acad531367820c4810096e5ba2c52e1ed7ad33766` |
| `external/D/ProjectTextures/FireWorksLab/TR2L_____V5/T_TR2L_____V5_Fade30.png` | 4320812 | `D:/ProjectTextures/FireWorksLab/TR2L_____V5/T_TR2L_____V5_Fade30.png` | `53c67b4730c6d321c9406c4c9370344e7f3eacff547546ce65dfbfb2bf088737` |
| `external/D/ProjectTextures/FireWorksLab/TR2L_____V5/T_TR2L_____V5_Fade30_Cutout.png` | 5730 | `D:/ProjectTextures/FireWorksLab/TR2L_____V5/T_TR2L_____V5_Fade30_Cutout.png` | `6a7fd4694e1b04f82aeb90c4f864138f3fbc2725728883416649a5c77b766303` |
| `external/D/ProjectTextures/FireWorksLab/TR2L_____V5/T_TR2L_____V5_Loop.png` | 5429261 | `D:/ProjectTextures/FireWorksLab/TR2L_____V5/T_TR2L_____V5_Loop.png` | `fd42df41b1171f172169ebd90af5f1ac0dc922122b52225de0db4693147d4768` |
| `external/D/ProjectTextures/FireWorksLab/TR2L_____V5/T_TR2L_____V5_Loop_Cutout.png` | 3496 | `D:/ProjectTextures/FireWorksLab/TR2L_____V5/T_TR2L_____V5_Loop_Cutout.png` | `96381d8031e5761e876d39944a6516424c6b8c60d900a4d2bd40515ebbbe1e1c` |
| `external/D/ProjectTextures/FireWorksLab/TR2L_____V5/T_TR2L_____V5_Ramp.png` | 247 | `D:/ProjectTextures/FireWorksLab/TR2L_____V5/T_TR2L_____V5_Ramp.png` | `36928553ab6ee5c4bcedf69bba8c4dca5b69d5b0c01e5ae14020973b7f413ad3` |
| `external/D/ProjectTextures/FireWorksLab/TR2L_____V5/cascade.json` | 6024 | `D:/ProjectTextures/FireWorksLab/TR2L_____V5/cascade.json` | `2c86c40d72076156caa6a9ae6647e39d3db6555534c9103fb4ee28c1bdb7ce87` |
| `external/D/ProjectTextures/FireWorksLab/TR2L_____V5/cascade_mobile.json` | 6028 | `D:/ProjectTextures/FireWorksLab/TR2L_____V5/cascade_mobile.json` | `42ed1657bfe0778c8e2a3c9135cf0fff34f4353062d1df862ddf22ac0d1f43d8` |
| `external/F/FireWorksLab/analysis/results/RT6LE4/RiseTailL_cascade.json` | 69669 | `F:/FireWorksLab/analysis/results/RT6LE4/RiseTailL_cascade.json` | `1b131780ce70bea963212635aa22cf21c07ccf920912fef930fe91208a38d747` |
| `external/F/FireWorksLab/analysis/results/RT6LE4/RiseTailL_cascade_mobile.json` | 69669 | `F:/FireWorksLab/analysis/results/RT6LE4/RiseTailL_cascade_mobile.json` | `5dd12994783bf126bde890fdf7b4a5461aab3e488a29cb2e83ca664b0386b3e6` |
| `external/F/FireWorksLab/analysis/results/RT6ME4/RiseTailM_cascade.json` | 69213 | `F:/FireWorksLab/analysis/results/RT6ME4/RiseTailM_cascade.json` | `467f0a080a6a03ff094c1264b31bab07ed30d0eae6ac0147098dbffbf2c88534` |
| `external/F/FireWorksLab/analysis/results/RT6ME4/RiseTailM_cascade_mobile.json` | 69217 | `F:/FireWorksLab/analysis/results/RT6ME4/RiseTailM_cascade_mobile.json` | `6ff75c0c7d3a76727343a6d33dc2ce61df911b46b494a8b4b6e28ffec1da7732` |
| `external/F/FireWorksLab/analysis/results/RT6SE4/RiseTailS_cascade.json` | 66405 | `F:/FireWorksLab/analysis/results/RT6SE4/RiseTailS_cascade.json` | `8833699b550a8bc6250a5175a7f448fdfc7eae0e8a75f55af3316816108b5284` |
| `external/F/FireWorksLab/analysis/results/RT6SE4/RiseTailS_cascade_mobile.json` | 66414 | `F:/FireWorksLab/analysis/results/RT6SE4/RiseTailS_cascade_mobile.json` | `b9c07a01e21d2f263ad90fa837a06c15e6f048d4cc90491459cc0e71e35ded27` |
| `external/F/FireWorksLab/analysis/results/RT6SE5/RiseTailS_cascade.json` | 66516 | `F:/FireWorksLab/analysis/results/RT6SE5/RiseTailS_cascade.json` | `7c064d944730714b9661973b0a087920613224e775d8bb3465c14bd2b0b46a90` |
| `external/F/FireWorksLab/analysis/results/RT6SE5/RiseTailS_cascade_mobile.json` | 66525 | `F:/FireWorksLab/analysis/results/RT6SE5/RiseTailS_cascade_mobile.json` | `a6701c0f0a179bb11f31f0ef26f3978d1d19137490cbd68f00aca555dbef49fb` |
| `external/F/FireWorksLab/analysis/scripts/回放检查.py` | 27503 | `F:/FireWorksLab/analysis/scripts/回放检查.py` | `09a959e984ca7a38a71de3638dd2cea50e6c6963bbe7663b75cb365a411d55c9` |
| `external/F/FireWorksLab/tool/design-system/components.css` | 7768 | `F:/FireWorksLab/tool/design-system/components.css` | `621593cec4f7edaf0fc06142e57e07401efde82ac39de9cf20f15655a2fb4e06` |
| `external/F/FireWorksLab/tool/design-system/icons.js` | 7095 | `F:/FireWorksLab/tool/design-system/icons.js` | `391365ced2a13425083554c9a7f1800e7bbb4eac9f08291da591b11e3ccdef72` |
| `external/F/FireWorksLab/tool/design-system/importer-colors.css` | 5911 | `F:/FireWorksLab/tool/design-system/importer-colors.css` | `f0f1ca99ef4cd73042b03e95ec0fcfe0d7caa1b64fdb2749422a03dea86ea517` |
| `external/F/FireWorksLab/tool/design-system/sync_importer_colors.py` | 2812 | `F:/FireWorksLab/tool/design-system/sync_importer_colors.py` | `7051ac028c6b4aa2115be753ee0bcd0d758cb0bbf17ddde9844b069fc0516b95` |
| `external/F/FireWorksLab/tool/design-system/tokens.css` | 1598 | `F:/FireWorksLab/tool/design-system/tokens.css` | `0be3df4ae8f44610e047b1de5b4baac4c7de01ddba1d5e7b1e60eb04f4c39528` |
| `external/F/FireWorksLab/tool/design-system/tokens.json` | 1310 | `F:/FireWorksLab/tool/design-system/tokens.json` | `4d115d7295b4ab63651331bdae3202d483523f347c89318549a6de6615c4d01e` |
| `external/F/FireWorksLab/tool/local_delivery/delivery-host.js` | 7680 | `F:/FireWorksLab/tool/local_delivery/delivery-host.js` | `ccc471c5c4df2f3d8c0cd7475393304b0bcf1c3cba07e288560d9c3ffed8262a` |
| `external/F/FireWorksLab/tool/local_delivery/directory-client.js` | 2291 | `F:/FireWorksLab/tool/local_delivery/directory-client.js` | `78a481478d2074ee2b33873db1ec538d450e24efa9f171a82db9d01c7e702827` |
| `external/F/FireWorksLab/tool/local_delivery/fx_gate.py` | 14796 | `F:/FireWorksLab/tool/local_delivery/fx_gate.py` | `564107a886eeb5606b6ff01829939df0f2995e941bd6c98fc6f4d858ec35babd` |
| `external/F/FireWorksLab/tool/local_delivery/prepare_local.py` | 4384 | `F:/FireWorksLab/tool/local_delivery/prepare_local.py` | `1bc78a224c80cbdd3ee9caf4e6ec9847dcf042861d338cf729269076137375bb` |
| `external/source-workbench/README.md` | 69594 | `W/README.md` | `cc4bdcde36f14ef5d3a6db8c870a868038483a3e1dd2b99747036dfcf5ac5dd8` |
| `finish-policy-fixtures-20261006.py` | 3002 | `W/finish-policy-fixtures-20261006.py` | `86f9f61b9fcce81a92e42360316dc107ae7729caf1dcefb6c343e771461df545` |
| `finish-policy-tests-20261006.py` | 3436 | `W/finish-policy-tests-20261006.py` | `ec66a586d2e226abfed0322581062ce5772d39d6fd0383dedf45eec6c12d7032` |
| `fireworks-compat.js` | 10035 | `W/fireworks-compat.js` | `68b18c4f91a7fdbd3302e4a097ef7fce6c112383f854fa0e819ff026bc5c7515` |
| `fireworks-import.js` | 23754 | `W/fireworks-import.js` | `21d356d8c6863933bf8deda713b3c0ac97ccb216839d5958fb5a30e17e5ef74b` |
| `fireworks-pack.js` | 3154 | `W/fireworks-pack.js` | `45457edd5e001ebe1b9beab054c10efddc4057af61377e2778854e7091a2cc5c` |
| `fireworks-plan.js` | 14922 | `W/fireworks-plan.js` | `c6c3c22e3d99022cfbfb317807352a1f736cf20b99ce69ed3c45d09189ee90ea` |
| `fireworks-policy.js` | 6691 | `W/fireworks-policy.js` | `5d2631f67494d941bdafdd6db45121b4eea8d6d57de622ee9ff666a22f93081c` |
| `fireworks-resource-rules.js` | 5612 | `W/fireworks-resource-rules.js` | `950ccd46cee00cd99444aebe9271c1b106ff1f82c825db6ccc6acf182447acf0` |
| `fireworks-selection.js` | 4078 | `W/fireworks-selection.js` | `8f7702fa067fc1a49ec12f2e33fd2e8955771fd928201db65988d892debb38db` |
| `fireworks-system-policy.js` | 5817 | `W/fireworks-system-policy.js` | `2c20820ff8ebac4d20ef06cbe0b600550e0ab21af4d9c755352316a00a598348` |
| `fireworks-ui.js` | 55439 | `W/fireworks-ui.js` | `12ca22c55307b75aa23683392b5d3c1af1f3850c20d337fce559e61ce90ac83c` |
| `fireworks-update.js` | 14718 | `W/fireworks-update.js` | `2600cf886f1fe0091fbfac1dfd820751d17c2d71fd4a7c13f7efac35d8dc5617` |
| `fireworks-workspace.css` | 12427 | `W/fireworks-workspace.css` | `e4ff72123192f9c7c6ff0adb69f59b70f62c0eeecd456b19185c74f5bbfa352f` |
| `fireworks-workspace.js` | 12405 | `W/fireworks-workspace.js` | `ae10dde351703efd09f54b618f3f2376d5229b98c4a71bc29028613741c68ab7` |
| `fireworks.html` | 6987 | `W/fireworks.html` | `dfbae2d6d64c7c9237c8f5afed45d82b193d97ee14994758a3b5b50e76c44919` |
| `fixtures/show-fixture.cjs` | 1677 | `W/fixtures/show-fixture.cjs` | `ea9a779950a5511dff821e2044968a376eccbc93383819ee4a1fbabfca0639c0` |
| `fixtures/show-template-samples.json` | 62878 | `W/fixtures/show-template-samples.json` | `d3d747eb701f84bb8c50fbed99772852578659b31fdb0e5d50da235ca27dcef3` |
| `import-backend.cjs` | 3616 | `W/import-backend.cjs` | `5aa24b8d80d05b4240fa098e432ef10d44e22f447d0b356d4e28c57e7429565c` |
| `import_calibrated.cjs` | 14200 | `W/import_calibrated.cjs` | `3fe099a67e1f791a62793abdc5a54d0d43e5a2b89773505d1eca7e7b67ac8122` |
| `material-icons-LICENSE.txt` | 11357 | `W/material-icons-LICENSE.txt` | `58d1e17ffe5109a7ae296caafcadfdbe6a7d176f0bc4ab01e12a689b0499d8bd` |
| `material-icons.json` | 11311 | `W/material-icons.json` | `d50a13568a8588efaf1308d16e0f6280ec98b45712efe03fed68f46c6cf24a30` |
| `material.css` | 12033 | `W/material.css` | `42923a2a2f5bab715c7230ba9ec1bc459a4bebd44dd4bffbe5e38731493ede03` |
| `material.js` | 9458 | `W/material.js` | `14639f07040f1c0e976a5304f81f3eadf8bb0be705b0756b8ef4341aafba55c9` |
| `mock-import-policy.cjs` | 3396 | `W/mock-import-policy.cjs` | `0fd6d779c5998799e6a9f74476f425f785f7fabb9474201816919ca32db9d085` |
| `native-persistence.cjs` | 932 | `W/native-persistence.cjs` | `4be952c40725c492b884a0949677bd394ccaa3d958c9dd8e5c16be0f450522ee` |
| `package-lock.json` | 17771 | `W/package-lock.json` | `1d5057fdf7a2614116e1a86365222d617612063863dcde4cb6f54ee0c161239b` |
| `package.json` | 51 | `W/package.json` | `f7f1b2db56466792239fd1a245dccca219dbeca3838bb470e5a6d6e923388a7e` |
| `patch-policy-backups-20261006.py` | 4814 | `W/patch-policy-backups-20261006.py` | `3ab5944568a86a57278e033066f3b3dbc14f70dc7f64ceb92adfecd66e6f3bc0` |
| `patch-policy-tests-20261006.py` | 5825 | `W/patch-policy-tests-20261006.py` | `cc6d5722d7db096e6f2323757d09a4e296bf526c938a9caa06491b57d8be4f25` |
| `prepare-trail-packages.cjs` | 4887 | `W/prepare-trail-packages.cjs` | `6400ba591d21605c8675b17b2a1ca6fedd49527fc77995325cc1886b692ca29b` |
| `presentation.css` | 30463 | `W/presentation.css` | `0520d8cfe84d965df730b67cdba64b00b97c078d12653131fc6424c8b9072d7c` |
| `presentation.js` | 24394 | `W/presentation.js` | `a71fcc49ddd366cd721e580f0bc4343b58df67239ed15293f59cc8cef364d036` |
| `reference/df-fireworks-delivery_locmai.html` | 842082 | `D:/FXTools/DFWorkbench/df-fireworks-delivery_locmai.html` | `13f92198e66df593f8cd7d33c29242cfb8a4e93dab81693fd66fd63535d2bc2d` |
| `research/calibration-20261002/calibration.json` | 11537 | `W/research/calibration-20261002/calibration.json` | `bb80aa3ce59360c41948c9432ddb1744ff53f5742d8d7734f779437d781d812d` |
| `research/calibration-20261002/exports.json` | 37010 | `W/research/calibration-20261002/exports.json` | `192deb1811b323a2ae4909a8ba9523eb67df96c219c22f9ceab96601af490e29` |
| `research/calibration-20261002/material-channel-scan.json` | 220799 | `W/research/calibration-20261002/material-channel-scan.json` | `363e2e1f7f1e8aebbfb234b4e1229bcbe64b3c22906803c2a0acbc6d884ea23b` |
| `research/calibration-20261002/native-plan.json` | 442277 | `W/research/calibration-20261002/native-plan.json` | `b89ea66558b491edf11159f3da5e8f408c16a895217d7aa809fc76373e31bfa8` |
| `research/design-20261004/upstream-importer-patch.json` | 1206 | `W/research/design-20261004/upstream-importer-patch.json` | `5703e929e174e5acc74b0fd3f2de015b46dd85f51fe3ec1117b4ceb70dbc4f9b` |
| `research/module-support-20261005/RT4L-regression-cascade.json` | 451722 | `W/research/module-support-20261005/RT4L-regression-cascade.json` | `6437319b3aab4a19f226ee3f8dde9350fadccf5bd9027243995148c6b1824f26` |
| `research/module-support-20261005/RT6L-current-cascade.json` | 325183 | `W/research/module-support-20261005/RT6L-current-cascade.json` | `5baf136c0802e8e16eb3c95acad531367820c4810096e5ba2c52e1ed7ad33766` |
| `research/module-support-20261005/RiseTailL_cascade.json` | 222509 | `W/research/module-support-20261005/RiseTailL_cascade.json` | `30f7cf00f4f4daf04be558d97e1d01007bbb4b30fcefe495805da1a79a14fd13` |
| `research/module-support-20261005/RiseTailL_cascade_mobile.json` | 222104 | `W/research/module-support-20261005/RiseTailL_cascade_mobile.json` | `c66f1b1b3ff6f13bb8788e7f8deff566fc598eee5ac0f17c941f9e824f74a97b` |
| `research/module-support-20261005/RiseTailM_cascade.json` | 126464 | `W/research/module-support-20261005/RiseTailM_cascade.json` | `c69fcc5c38dde2270b1b48fee148e9c53f26ea7b0cc395038c955a474e38bd98` |
| `research/module-support-20261005/RiseTailM_cascade_mobile.json` | 126283 | `W/research/module-support-20261005/RiseTailM_cascade_mobile.json` | `48df2e537aa76a9dd4bbf4d22920d499ce759e223ec2d05257c83b129a68627a` |
| `research/module-support-20261005/RiseTailS_cascade.json` | 88612 | `W/research/module-support-20261005/RiseTailS_cascade.json` | `0ca640a49c973fe897dc61d416f41cf1ab499cc6f89bb24dc3156c56ce0eb174` |
| `research/module-support-20261005/RiseTailS_cascade_mobile.json` | 88486 | `W/research/module-support-20261005/RiseTailS_cascade_mobile.json` | `e13062fedc5c4d88a533bedd4a5b79243efd1d087afaa908a9c1723ac521defe` |
| `research/module-support-20261005/reviewed-life-modules-patch.json` | 23418 | `W/research/module-support-20261005/reviewed-life-modules-patch.json` | `cc5787b927014ddb38101e8069e5dac97f0589221da5f023bbb78e3ae2aa94f7` |
| `research/naming-20261005/cascade-before.json` | 13298 | `W/research/naming-20261005/cascade-before.json` | `1fb8370c447e2c5621b4c9205ba692e52be373c8b061fa4d86bb3eb09e02b4ce` |
| `research/naming-20261005/reviewed-naming-patch.json` | 101865 | `W/research/naming-20261005/reviewed-naming-patch.json` | `adbe84ca6c119c33af9923d729cc453682ebcfc97746ec74d315284ba0385650` |
| `research/preroll-20261004/cascade-before.json` | 13221 | `W/research/preroll-20261004/cascade-before.json` | `1b838e0110877e99b64aea3bd3667aaab96a39df11e9769fefb763ba9632d849` |
| `run-design-checks.cjs` | 2663 | `W/run-design-checks.cjs` | `53dfed7fe1ab7f3fb8e17eb22e6b75a3f478f4640d2f9a8cdcf0ddf00252fe43` |
| `run-show-project-checks.py` | 2834 | `W/run-show-project-checks.py` | `d24f8f4a980b33ce969614b6a2ca92045e5f17574da510df3804d6aee0847ee9` |
| `scan_material_channels.cjs` | 2113 | `W/scan_material_channels.cjs` | `518188393198ddcd23ad8871569b2574fff438914c4bfb440075ce73d24aa4c7` |
| `shell.html` | 2171 | `W/shell.html` | `9560edb2e963094319be588dc2a4e57cac4666ba2179d7db17a97dd14e5f0274` |
| `shell.js` | 4927 | `W/shell.js` | `061a122d6009a7415fe160839b876cd3cc5eafd5f21964b1648827aa3f1cfd73` |
| `show-bp-data.js` | 309 | `W/show-bp-data.js` | `b81ec3708433a166a0846aa726ae913da6aeff6fb84b115469e885f46bcb8f15` |
| `show-catalog.js` | 4827 | `W/show-catalog.js` | `bd64dd32c86ad801f53b364b5e7a013dabf1be2fdd89a289e0a2274916a27b34` |
| `show-fan.js` | 4437 | `W/show-fan.js` | `11f92a89fa8d39f46fd9389b10c8827daac14e22883465e44b71242b46294dbf` |
| `show-plan.js` | 4635 | `W/show-plan.js` | `f421819082debd21c58de85ea63ac3398f30f8f185b764a425a961c43e1a1fc4` |
| `show-project-export.js` | 6972 | `W/show-project-export.js` | `496a774aa8e87dc89163a81ce869edb3fde4c2f0d321092151c2cc9bcf890907` |
| `show-project-import.js` | 5826 | `W/show-project-import.js` | `efba1d352437586847516e30d6676b4a49a4cbb16b4888f8a36de6101e547bdd` |
| `show-project-sample.js` | 4074 | `W/show-project-sample.js` | `46b26f4c18d7cbfdae50592c35481d795f5b71c6c5e654ea2e265df1e6774152` |
| `show-project-scene.js` | 7167 | `W/show-project-scene.js` | `8242de445d34c264d9c21473a608aed0aeda1f98ff61429f2bf307c63df6e36c` |
| `show-project-store.js` | 2913 | `W/show-project-store.js` | `b628813c41de872b4b266445a0d077b3be95b09dc0508cf202f38631a7c5556d` |
| `show-project-ui.js` | 35592 | `W/show-project-ui.js` | `11facf2fd02d923f37e0a685fdf79eca256aae55343eb7dfcb9b212adc375ae1` |
| `show-project.css` | 9280 | `W/show-project.css` | `64d70909c7d384eaabc82cb2fde2a7c737da0e075d6fa67e7d5f1615181884a1` |
| `show-project.html` | 6584 | `W/show-project.html` | `f4f59dd65efa9851c856816be1071004d62df78fc5fbcb6093623e5246db969d` |
| `show-project.js` | 20351 | `W/show-project.js` | `b9c8ae8011fef9df4ab3a11a723bc5c616446c572d7007ee71b03d238b284e89` |
| `show-project.release.json` | 176 | `W/show-project.release.json` | `2ebce614beb869dca3f77c1aa70fb1b1be5f199353d5d03de9704f0182995049` |
| `show-resource-data.js` | 4400 | `W/show-resource-data.js` | `df74af3451705f2742b875dc227fa2cfcbdb118eb23f2d3789255109f7bd0e31` |
| `show-resources.js` | 4582 | `W/show-resources.js` | `d695e98b270169c3c690eb58d8f298e7cb139b003e58165adb824415bc3b6d50` |
| `show-sequence-scene.js` | 4717 | `W/show-sequence-scene.js` | `7af26416d73ec357989c2bbb44539c4e6e5f0e14e138567174adbce5d23f6885` |
| `show-sequence.js` | 6494 | `W/show-sequence.js` | `0603cdba3d5b94c633d1aef87468f2f8d2f179ec8ea03633dcad2cb3615c10cf` |
| `show-text.js` | 8625 | `W/show-text.js` | `5c791f8b19103182a2d714dcb511187d4671e6b5a7724c4ce5e0eb973d346b4b` |
| `show-ui.js` | 50898 | `W/show-ui.js` | `b513706085b77f916b6ac784309ff3f8de01da6e2f235703e5046da54a3b63c4` |
| `show.css` | 11983 | `W/show.css` | `6134341cf6cc3ab5018a8d56fb4ebdc7f76fb144cf573af59ed7a05f472abace` |
| `show.html` | 18603 | `W/show.html` | `6400646af4481667117cf4656bcac922ef630eaa80db31d841a050f260f7de8c` |
| `verify-derived-first-native.cjs` | 3062 | `W/verify-derived-first-native.cjs` | `391a13f75215a0462f9ea9b4d1a47a9b56d84731ce4489abd05c1f290328a88d` |
| `verify-live-packages.py` | 3496 | `W/verify-live-packages.py` | `56731299346e913e67a9b3f98d77a925d3f6eb5b4895c65688b15e8113479304` |
| `verify-trail-preparation.cjs` | 3165 | `W/verify-trail-preparation.cjs` | `3251792e3a44226cac6db6b76dd7c3e9de6cee94f1fe6b7fee4e119d79508d9a` |
| `verify_native_calibration.cjs` | 9972 | `W/verify_native_calibration.cjs` | `2fb326b658d523c4846f4162e174712796386109503d2699c14469a5fdb18a53` |
| `workbench-log.css` | 1560 | `W/workbench-log.css` | `833280eac7d2711f149289a2b5a0f3da8ab64cd9fa4ab7c3ee4f95d51819b295` |
| `workbench-log.js` | 2797 | `W/workbench-log.js` | `36a81bec6159bca0d4c612945ed9af067bef29f0fb89337bb196abc94514c033` |
| `workbench-scroll.css` | 2333 | `W/workbench-scroll.css` | `abd27c1cb41915984744c585391d2e6842226d9db4c3e5b06d4610131c53cbdf` |
| `workbench-scroll.js` | 1728 | `W/workbench-scroll.js` | `b32cb0ce003582734eb8d1c0e93e158289acadfdd2bfc15ea426895eb19e4120` |
| `workbench.css` | 15003 | `W/workbench.css` | `ca291fec913029dfbc339a547a0ed33063d05ef0b5831ea2b36249e7caf23052` |
| `.gitattributes` | 89 | 本次新增，仅固定原件换行保存方式 | `541a985cd81bfd22139d7562903e834dad4e3e560b14f40c84bcdd15eb2da18a` |
| `README.md` | 计入上方总大小 | 本次新增交接说明 | 自身不纳入来源哈希 |

后续云端从此目录修改并补回归/接门禁；本次不改变贴图规则、版本、导出格式、tool/src、tool/workbench，也不部署或操作 UE。
