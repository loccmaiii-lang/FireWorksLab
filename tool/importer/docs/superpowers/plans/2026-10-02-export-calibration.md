# 烟花导出与子模板标定 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 本次由当前会话按用户已授权的目标连续执行。

**Goal:** 将当前球形 A/B/C/D、青柠星、万彩千轮、十字裂星的完整 PC/移动素材包导出到 D:\ProjectTextures\FireWorksLab，并建立小、中、大三档升空加爆炸 BP 子模板。

**Architecture:** 读取协作状态主条目，复用现有显卡导出器，在独立新目录导出并校验组合层后复制到 D 盘。复用工作台的格式验证、命名规划和导入实现，通过本机 GPUECli 创建新资产；标定副本和 BP 备份保留在 D 盘，随后追加新子模板并保存读回。

**Tech Stack:** Python 3.12、现有 Playwright GPU 导出器、Node.js 工作台导入实现、UE4.24 Cascade、GPUECli HTTP 接口。

## Global Constraints

- 小：升空总时长3.5s，高度180~200m（烟花爆炸size100~120m）。
- 中：升空总时长5S，高度250~280m（烟花爆炸size180~200m）。
- 大：升空总时长8s，高度400~420m（烟花爆炸size280~300m）。
- 参考 TR2L_____V5 实际600m；金芒菊 Initial Size 2200/2400、SizeScale*15 实际约300m。
- 每个效果保持全部组合层及原延迟，不修改艺术配方，不新建母材质，不改引擎代码。
- 只新增独立命名资产与子模板；原包、原 BP 数值、用户现有模板均须备份且保留。
- 项目 ID、引擎路径、原始素材和完整报告只存本机 D 盘，不进入公共 Git。
- 采用共享 GPU 进程锁；检查真实进程和句柄，不凭文件名判定任务仍在运行。

---

### Task 1: 完整导出七类效果

**Files:**
- Create: `D:/FXTools/DFWorkbench/workbench/export_calibration.py`
- Read: `F:/FireWorksLab/analysis/scripts/export_job.py`
- Read: `F:/FireWorksLab/analysis/scripts/compare.py`
- Read: `F:/FireWorksLab/analysis/local/job_lock.py`
- Create: `D:/FXTools/DFWorkbench/workbench/research/calibration-20261002/exports.json`

**Interfaces:**
- Consumes: `SimSession()`、`ProcessLock(gpu_lock_path(repo))`、`export_job.run(job, session, report_directory)`。
- Produces: `exports.json`，每项含 entry、ver、source、destination、files.sha256、cascade_pc、cascade_mobile、replay_pass、replay_fails。

- [x] 创建独立导出目录；使用 QA19、ZB5、QC11、QD13、QN11、ZW5，以及 `defaultsFor('crossette', 40)`。
- [x] 调用 `export_job.run({entry, name, type:'export'}, session, out)` 导出组合；十字裂星采用 `__fw.exportFiles(P,M,name)`。
- [x] 比较 native cascade 层数、各层类型和 delay_s；存在缺图、错层、错版本时停止该项导入。
- [x] 使用 `回放检查.Pack(directory, emitter_index)` 合成真实导出回放；记录失败原因和关键帧，未通过不标记为艺术验收。
- [x] 校验 PC 与移动贴图都存在并复制到 D 盘，生成逐文件 SHA256 清单。

### Task 2: 三档尾缀运动与爆炸尺度标定

**Files:**
- Create: `D:/FXTools/DFWorkbench/workbench/calibration.py`
- Create: `D:/FXTools/DFWorkbench/workbench/check_calibration.py`
- Create: `D:/FXTools/DFWorkbench/workbench/research/calibration-20261002/calibration.json`
- Read: `D:/ProjectTextures/FireWorksLab/TR2L_____V5/cascade.json`

**Interfaces:**
- Consumes: 参考包与 GPUECli 读取的实际资产属性、七个已验证完整素材包。
- Produces: `calibrate_trail(spec:dict, duration:float, height_m:float)->dict`、`burst_scale(native_diameter_m:float,target_diameter_m:float)->float`、每档计算报告和可导入副本。

- [x] 用断言固定 3.5/5/8s 和 190/265/410m 三档中心值，检查副本不能修改输入，消散起点与升空终点一致。
- [x] 缩放时间轴、初速度、阻力、加速度和空间尺寸，使归一化轨迹与参考一致；动态帧曲线保持循环速度的设计含义并记录改变后的播放速度。
- [x] 使用导出贴图可见范围和原生尺寸量出七类爆炸直径；结合用户金芒菊参考计算 110/190/290m 中心值及上下界比例。
- [x] 对比例、单位、曲线端点、对应高度、时间及有界随机进行数值回归，保存报告。

### Task 3: 导入与 BP 子模板追加

**Files:**
- Create: `D:/FXTools/DFWorkbench/workbench/import_calibrated.cjs`
- Read: `D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html`
- Read: `D:/FXTools/DFWorkbench/workbench/fireworks-plan.js`
- Read: `D:/FXTools/DFWorkbench/workbench/show-text.js`
- Create: `D:/FXTools/DFWorkbench/workbench/backups/calibration-20261002/`
- Create: `D:/FXTools/DFWorkbench/workbench/research/calibration-20261002/native-verification.json`

**Interfaces:**
- Consumes: 经校验的 `{dir,as,spec,assets}` 导入规划、实际资源表和 BP 读取结果。
- Produces: 新 PS/MI/贴图、PC/移动 ResourceFX 对应记录、新 EffectSubTemplates，以及保存后读回证据。

- [x] 用 `/object/get` 读取 BP CDO，备份整个子模板数组及相关原资产属性；原项目文件另备份到 D 盘。
- [x] 为新包生成完整名称预览，验证所有目标不存在、全部 ResourceId 无重复，工作台 `validate()` 全通过。
- [ ] 复用导入器 `importOne({dir,as,spec,assets})` 顺序导入并逐项验证保存；创建资源表记录前读取表结构和现有行。
- [x] 用原生结构生成七类效果各三档子模板。尾缀在 0s 发射，爆炸在 3.5/5/8s 触发；所有内部延迟保留在组合 PS 中。
- [x] 禁止不可配对的独立高度随机造成尾缀与爆点错位；首版采用中心值和零独立随机，范围配对函数已检查但没有运行时写入。
- [ ] `/object/set` 或 `/object/container` 追加模板，保存 BP，读取新数组并与计划逐字段比较；确认保存到磁盘且资源表两平台均能找到对应 PS。

### Task 4: 最终审计与使用说明

**Files:**
- Create: `D:/FXTools/DFWorkbench/workbench/research/calibration-20261002/使用说明.md`
- Modify: 公共工作树 `对话记录/对话框5.md`、`交接.md`、`协作/状态清单.json`（仅脱敏进度）。

- [ ] 核对七个素材包、三档尾缀、21个子模板、资源表、保存读回和随机范围，逐项列出实际完成和未通过的艺术检查。
- [x] 报告使用位置、模板名称和三档中心/范围，指出参考近似标定与实测范围，避免宣称未经 UE 实播的画质已验收。
- [ ] 脱敏记录提交并同步；目标全部完成才设置 complete。

当前续接点（2026-10-02 06:50）：用户已确认按既有导入工具标准继续，规范差异已同步main。真实导入开始，首组PC小档尾缀8项资产落盘；资源表首行在内存中新增，但只读文件保存失败。其余19组及21模板未写入。三项目标文件已备份后标为本地可写。UE“迁出资源”弹窗阻塞接口，Windows工具无法激活，已请求用户取消；不要把等待时间当成弹窗已关闭。

先补存并核对首行表文件，再从native-imports.json继续。保存校验已补成文件内容变化+原生ID存在，隔离检查通过；计划哈希已更新，名称和参数不变。完成后运行verify_native_calibration.cjs逐字段/曲线/文件验证，再接入本轮新增ID。艺术QA失败、真实实播和重启验收边界继续保留。
