# 本机尾缀交付准备 Implementation Plan

> 按用户已授权范围逐项执行；这是本机私有实施记录，不增加导入/写表权限。

**Goal:** 在烘焙器现有交付页准备 PC S/M/L 更新与手游 _M 新建，保留用户最终确认与执行。

**Architecture:** 只给私有独立交付入口注入契约适配，原特效工作台与源 HTML 不变。已有导入核负责写入；包级规则只消费仓库 fx_gate.py。共享指纹保留 PNG 与已保存 UE 文件两种证明。

**Tech Stack:** 私有 JavaScript、Python 3 包级检查、原生 UE 4.24.2 只读桥、Node 隔离回归。

## Global Constraints

- 私有源码和备份仅在 D:/FXTools/DFWorkbench；不上传仓库。
- 不改 23 认领的 tool/src、tool/build.py、尺寸表、界面检查和 tool/local_delivery 包级预检。
- 当前 main 包含 4.9.69 契约及 4.9.70 严格贴图补丁；手游引用图最大尺寸一律 ≤1024。
- PC S/M/L 同名更新，手游只建 RiseTrail_S_M、RiseTrail_M_M、RiseTrail_L_M；Hero/XS 不入队。
- 手机 RiseLoop 单发射器、单 LOD、无 GPU、max_alive=1；Low/High 表映射等待实际导入通过后进行。
- 只做交付准备；不调用 confirmNames、execute、保存或播放 UE。
- 原生 Required 属性用实读 bUseInLocalSpace；OrientationAxisLock.flags 对应 LockAxisFlags。

---

### Task 1: 私有交付契约适配

**Files:** Create `delivery-contract.js`, `check-delivery-contract.cjs`; Modify `delivery-material-names.js`, `build-delivery.py`。原fireworks-import.js不改，模块字段通过独立交付包装映射。

**Interfaces:** Consumes `makePlan(spec, asName, naming)`, `validate(spec, configFile)`, `importEmitters(item, PS, materials)`；Produces 正确资产计划和原生轴锁枚举写入。

- [x] 写失败测试并运行 `node check-delivery-contract.cjs`。核心断言：
```js
assert.equal(backend.makePlan(mobile,'RiseTrail_S_M_01').ps,
 '/Game/Effects/Props/FireWorks/P_EFX_FireWorks_RiseTrail_S_M');
assert.equal(backend.MOD.OrientationAxisLock,'ParticleModuleOrientationAxisLock');
assert(backend.validate(pc).length===0);
```
- [x] 注入 mobile_ps/mobile_mi 私有路径，包装 makePlan/formalMaterialName；手机名称只接受配置的 name。
- [x] 原生模块 flags 映射 LockAxisFlags 后继续，避免把 flags 当未知属性。Required 保留已验证的 bUseInLocalSpace 写入。
- [x] 构建独立交付页；运行新契约测试与原 PC 命名/校准/更新/依赖复用回归。原工作台与源 HTML SHA256 必须等于快照。

### Task 2: 预检与共享指纹

**Files:** Create `delivery-preflight.py`, `check-delivery-preflight.py`; Modify `delivery-contract.js` 与独立 builder。

**Interfaces:** Consumes `fx_gate.py <revision> --root <root> --json`；Produces 带退出码、问题、根目录与共享登记的只读预检结果。导入成功后才允许 register。

- [x] 用真实旧违规包断言预检失败，并断言无 UE 写入请求。
- [x] readPack 前调用上游 fx_gate；非零退出码让原交付页显示原问题，不能进入 ready。
- [x] 共享登记中的 ueProofs 与浏览器旧指纹合并；复用前仍检查 UE 已保存文件 diskHash、目录和平台策略。派生贴图缺失或证明不足时拦截，不补建。
- [x] 用临时目录测试成功/错误与跨会话登记，测试材料使用合成 PNG，不写正式共享登记。

### Task 3: 实际尾缀包与交付准备

**Files:** 本机新修订目录；续写仓库 `对话记录/对话框手游编排.md`、状态清单、交接。

**Interfaces:** Consumes 实际 S/M/L 原生导出包；Produces 三份 gate=0 的固定修订、六条未确认的导入计划。

- [x] 通过既有烘焙器实际导出，命名 RiseTrail_S/M/L、尺寸150/210/330m；不改用户效果参数。
- [x] 对实际包运行 fx_gate 和贴图回放检查，核对手机只有 RiseLoop、PC 远段锁轴及 Local Space。
- [x] 准备 PC mode=update / 手机 mode=create；重新检查目标及共用贴图计划，保持确认和执行按钮由用户操作。
- [x] 用户同一浏览器实页验证六条计划和新建/更新范围；保存证据，记录未导入/未 UE 实播。
- [x] 公共记录仅提交本任务已核对内容；私有实现与素材文件不进入提交。
