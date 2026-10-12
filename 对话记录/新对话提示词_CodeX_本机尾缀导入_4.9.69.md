# 给 Codex（本机）：今晚把尾缀导进 UE（烘焙器 4.9.69）

你在用户本机接手「手游编排」掉线后留下的本机工作。云端「导出（23）」负责烘焙器，已推 4.9.69；你只做本机那一半。

## 开工前读

- `CLAUDE.md`（第 5 节：小步提交、推前 fetch、不 force push；授权范围内直接提交推送）
- `spec/烟花特效资产规范.md` v1（现行依据）
- `spec/cascade_params_v1.md` §1.2（4.9.69 新字段）、§5 `OrientationAxisLock`
- `对话记录/对话框手游编排.md` 最后一条，以及复盘 `analysis/results/MOBILE_TEST_20261011/尾缀重导入_20261012/复盘_2026-10-12.md`
- `tool/CHANGELOG.md` 4.9.69 一节

## 用户原话（10-12 21:34，节选）

> 是开local space才跟组件转，我认为可以开；我的comet开了都没问题
>
> 手机尾缀不要cpu火花粒子了……不行就只用一个近段循环就可以了，星光头也不要了
>
> 今晚就把尾缀问题解决掉……可以让CodeX承担这份工作
>
> 手游表没有H吗？我的意思是_M/_L共用，只做一个_M就可以了

## 4.9.69 导出了什么（格式以 `spec/cascade_params_v1.md` §1.2 为准）

**PC（`cascade.json`）**
- 和 4.9.68 比只有远段 `TrailFar` 三处不同：
  - `required.screen_alignment: "Rectangle"`；
  - `required.local_space: true`；
  - 新模块 `{"m":"OrientationAxisLock","flags":"EPAL_ROTATE_Z"}`。
- 其余逐字段相同。

**手机（`cascade_mobile.json`）**
- `name` 是 `<系统名>_M`（例 `RiseTrail_S_M`），`tier` 是 `"M"`；
- 只有 1 个发射器：近段 `RiseLoop`，带 `max_alive: 1`；
- 贴图只有手机序列（≤1024，不带 `_HD`）、共用轮廓 `_C`、共用 Ramp `_R`；
- 没有远段、火花、星头光晕。

**每张贴图**：`textures[k].sha256` 是 PNG 文件内容的哈希。

**派生资源**：配置里带 `derived: {from, system, spec}`，贴图沿用原效果那一套。
- 主角尾缀：尺寸下拉选「坝顶·主角尾缀」，系统名 `RiseTrail_Hero`，贴图用 `RiseTrail_L_*`；
- 小平台尾缀：选「前台·小平台尾缀」，62 m，系统名 `RiseTrail_XS`，贴图用 `RiseTrail_S_*`。

**英文名**：升空尾缀的英文名已改成 `RiseTrail`（和 UE 里现有的 `RiseTrail_S/M/L_HD` 对上）。
- 你浏览器的交付页如果存过别的名字，导出前看一眼；
- 应该是 `RiseTrail_S`、`RiseTrail_M`、`RiseTrail_L`，不是 `RiseTrailPhys_*`。

## 你要做的（按顺序，小步提交）

0. **同步、快照、认领**
   - 先保留本机未提交的改动；安全同步到最新 main（含 4.9.69）。
   - 快照私有源码 `D:\FXTools\DFWorkbench\workbench` 和当前 UE 里尾缀的手调值。
   - 在 `协作/状态清单.json`「共享文件」里认领：本机私有写入层 + 导入。
   - 不改 `tool/src`；烘焙器有问题，写进 `对话记录/对话框23.md`，排给 23。
1. **私有写入层适配规范 v1**（最小改动，先写会失败的测试）：
   - 手机粒子：目录 `/Game/Effects/Props/FireWorks`，名字 `P_EFX_FireWorks_<cascade_mobile.json 的 name>`，不再加 `_Mobile`、`_HD`；
   - 手机材质实例：`/Game/Effects/Common/MaterialInstance/Fireworks`，名字是 PC 名去掉 `_HD`；手机序列图放 `/Game/Effects/Common/Texture/Fireworks`；
   - 模块映射：`OrientationAxisLock.flags` → `LockAxisFlags`；`required.local_space` → `bUseLocalSpace`（Required 模块）；
   - 手机 LOD 只有 1 个；
   - 读 `derived`：派生包不新建贴图，引用 `from` 那套已有贴图。
2. **导入前拦截**：交付包先跑 `python tool/local_delivery/fx_gate.py <修订目录> --root <交付根目录>`。
   - 退出码不是 0 就不交给导入器，把原因显示给用户。
   - 导入成功后再跑一次，加 `--register`，登记进 `.workspace/texture-fingerprints.json`（跨浏览器、跨会话去重靠它）。
   - 包级规则不要另写一套；要改规则写给 23。
3. **导入**（按钮由用户自己点，你不代点「确认名称」和「执行」）：
   - PC 尾缀 S / M / L：更新同名。会冲掉手调（S 亮度 ×20 / ×50、M 关掉的 4 个 GPU 火花），用户已同意，不要绕过导入器去补。
   - 手机 `RiseTrail_S/M/L_M`：新建。
   - 主角 `RiseTrail_Hero`、小平台 `RiseTrail_XS`：只有用户要时才导。
4. **导入后只读读回 UE**（脚本，不写 UE）。
   - 手游引用的每张贴图都不超过 1024，严格拦（用户 10-12 22:01）：源尺寸 > 1024 且 Maximum Texture Size 没设到 ≤ 1024 就算违规；
   - 修法二选一：新出一张 1024，或把 PC 那张复制到手游目录、最大尺寸设 1024（规范 §3 第 6 条）；
   - 再逐项查：
   - 远段 `TrailFar`：PSA_Rectangle + LockAxis Z + bUseLocalSpace 已保存（不只是内存）；
   - 手机：LOD = 1、发射器 1 个、没有 GPU、整条引用链上没有 `/Game/Effects_HD` 或 `*_HD`；
   - 写 `FXtools/节目/NewYearFireWorks_v01/资源发射器数.json`。
5. **UE 实测**（UE 空闲时串行做）：
   - 1 / 3 / 5 根尾缀，组件分别转 0、±15°，转镜头；
   - 看近段和远段接不接得上、抽不抽搐、星头和开花点衔接；截图存证据。
6. **手游表**：检查通过后才加行。
   - FxSP 和 FxSP_Low 填 `_M`；FxSP_High 先也填 `_M`（还没做 `_H`）。
   - 其他字段照抄 PC 行。

## 另一个要你本机查的问题（用户 10-12 22:01）

> 我做好了分裂星，但是我点导出跳转到导入，默认还是goldray

烘焙器这边的流程：导出发布 → 调 `FwDeliveryBridge.accept(新修订)`。
- 导入器回 `queued`（它在忙）时，交付页继续显示导入器正在处理的那份，等导入器接手新的才切换；这是 4.9.6x 的设计。
- 4.9.69 把排队写清楚了：状态行写「分裂星已保存，导入器还在处理 GoldRay……」，资源列表里分裂星标「排队中」。

推断：GoldRay 那一批一直没结束。依据：10-11 23:57 手游编排的 `delivery-switch.py` 把 GoldRay 切到「更新同名」并检查，回执两行都是 update / ready，写进了 `.workspace/receipts/9e6fe77e…json`（复盘 1D）。导入器可能把这一批一直当成「当前任务」，所以新的永远在排队。

请在本机查：
- 导入器私有代码里 `busy` / `queued` 的判定：「待确认」算不算忙？
- GoldRay 那批在浏览器存储里（`fwimp.delivery.v1`）是什么状态；
- 怎么安全地结束或清掉这一批。

改之前先备份；不改烘焙器（`tool/src`）。

## 验收

- `fx_gate.py` 对 4.9.69 的尾缀包是 0 退出码；对 10-12 那批错包（`_Mobile_HD`、10 个发射器、主角新贴图）是 1。
- UE 读回：PC 远段三处设置已保存；手机资产在手游目录、名字 `_M`、1 个发射器、无 HD 引用。
- 分裂星（或任意新导出）点导出后，导入区能接手它；GoldRay 不再卡着。
- 倾斜实测有截图。转 15° 时远段要是没跟着倾（local space 没生效），停下来报给用户和 23，不要自己改粒子。
- 私有源码改动有备份和测试；对话记录写在 `对话记录/对话框手游编排.md`（续写）。

## 不要做

- 不改 `tool/src`、`spec/烟花特效资产规范.md`。
- 不代用户点确认 / 执行导入；不绕过导入器直接写 UE（10-12 复盘的教训）。
- 每次导入别开全新的临时浏览器（会丢浏览器里的指纹登记）；跨会话去重以 `.workspace/texture-fingerprints.json` 为准。
- 旧的重复图不删，只列清单给用户。
