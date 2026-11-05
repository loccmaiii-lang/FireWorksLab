# 烟花工坊 5.0：导入模块接口 `window.FWLImporter`

> 本机「烟花工坊（5.0）」，2026-11-05 21:4x。给对话框9 接「资源交付」页用。接口以本文为准；改接口先改本文、升 `version` 次号，并在状态清单「对话框9 · V5 布局合入 main」那行留一句。
>
> 依据：`协作/提示词/烟花工坊5.0_本机开工_明天离线单文件_2026-11-05.md`、`协作/方案/烟花工坊5.0_合并方案_2026-11-04.md` 第 4、5、7 节（阶段 0 结论在 7.1）。

## 文件

| 文件 | 用途 |
| --- | --- |
| `tool/importer/dist/fwl-importer.mock.js` | **替身**：接口相同，返回假数据，不连 UE、不写文件夹。今晚就能接页面 |
| `tool/importer/dist/fwl-importer.js` | **真模块**（约 570 KB）：一个 JS 文件，不依赖 8034 / local_http / Python，能直接内联进单文件。由 `python -X utf8 -B tool/importer/build-5.0.py` 生成，源码是 `tool/importer/fwl50/host.js` + 原导入器源码 |

两份都只做一件事：在 `window` 上挂 `FWLImporter`，不碰页面 DOM、不加样式、不占别的全局名。合成时内联进 `<script>` 即可；放在主文档或 iframe srcdoc 里都行（阶段 0 实测两种都能直连 UE、共用存储）。

真模块内部：
- 原导入器引擎（v2.29 页头，代码含 v2.30 / v2.31 贴图规范）**原样**放在模块自建的一个隐藏 iframe srcdoc 里运行，和烘焙器的全局变量完全隔开。贴图规范一条不改。
- 导出文件夹的读写（原 8034 `store.py` 的发布、索引、回执）和导入前拦截（原 `fx_gate.py`）搬进网页，用浏览器文件夹句柄直接做。
- 导入时把这一包的文件按 1 MB 一块传进 UE 的系统临时目录（`%TEMP%/fwl50/<deliveryId>/`），原引擎从那里读；导完删掉。

## 约定

- **文件夹句柄由外壳传进来**：外壳负责 `showDirectoryPicker`、记住句柄（IndexedDB）、重开浏览器后 `requestPermission`。模块不自己弹选择框，只在拿到的句柄上读写。导出和导入用同一个导出文件夹句柄。
- 所有方法都是 `async`，失败抛 `Error`，`error.code` 见文末。
- **只有 `importPkg` 写 UE。** `scan` 只读文件夹；`precheck` 会往 UE 系统临时目录传文件、读 UE 里同名资产是否存在，但不建、不改、不存任何资产。
- 同一时间只允许一处写 UE：`importPkg` 进行中 `status().busy === true`，外壳据此把编排里写 UE 的按钮变灰。
- 状态文字用中文，可以直接显示。

## 方法

```js
window.FWLImporter = {
  version: '5.0.0',                // 接口版本；真模块另有 engineVersion（导入器内部号）

  status(),                        // 同步返回，不发请求
  // → { ue: 'connected' | 'disconnected' | 'unavailable' | 'checking',
  //     detail: '已连接 UE（Windows）' | 'UE 未连接：…' ,
  //     retryInSec: 12 | null,      // 自动重试倒计时（断开时）
  //     busy: false,                // 正在写 UE
  //     lastConnectedAt: ISO | null,
  //     endpoint: '127.0.0.1:17780' }

  reconnect(),                     // 「重新连接」→ 立刻试一次，返回新的 status()

  publish(dirHandle, blob, name, metadata),
  // 烘焙器「交付」：把最终 ZIP 写进导出文件夹（原 8034 POST /api/deliveries）。
  // blob/name/metadata 就是 67_delivery.js 里 DeliveryWorkspace.publish(blob,name,metadata) 收到的三样，原样转过来。
  // → receipt（df.firework-resource/1 完整回执，和原 8034 返回的同形，另加 pkgId = deliveryId）
  // 同内容重复导出：不建新修订，只在 ZIP/ 下多一个 _v00N.zip，返回同一 deliveryId。

  scan(dirHandle),                 // 读导出文件夹 → 包列表（只读，不连 UE）；precheck / importPkg 用最近一次 scan 的文件夹
  // → [Package]，按导出时间新→旧；每个资源只列最新修订，旧修订在 revisions 里
  // 文件夹里还没有 workspace-resources.json（新文件夹、还没导出过）→ 返回 []，不报错

  precheck(pkgId, { platforms, onProgress }),  // 导入前检查（要 UE 连着）；不传 platforms 就按导出时选的导入范围（默认包里有的全部）
  // 导出文件夹要有读写权限（检查会更新贴图登记缓存）
  // → Precheck

  importPkg(pkgId, { planToken, onProgress, backupDir }),   // 平台在 precheck 时就定了
  // 用户点「导入」才调。planToken 必须是最近一次 precheck 给的；期间文件夹或 UE 有变化就拒绝（code PLAN_STALE），外壳重新 precheck。
  // 点「导入」即视为用户已核对资产表里的名称和写入方式（原导入器的「确认名称无误」）。
  // backupDir：备份文件夹句柄；有「覆盖」的资产时必须给，没给就拒绝（code NEED_BACKUP_DIR），外壳弹窗选（写明不要选 UE 工程里的目录）。
  // → ImportResult

  thumbnailURL(pkgId),             // → Promise<'blob:…' | null>（回放缩略图；要 await；外壳用完不必释放，模块换文件夹时统一释放）

  on(event, cb),                   // 'status' | 'progress' | 'packages' | 'log'；返回取消订阅函数

  configure({ sandbox }),          // 只给开发和沙盒验收：第一次用之前设，写入目录整体挪到 sandbox 下（例 '/Game/FWL50_Sandbox'）
};
```

### Package（`scan` 的每一项）

```js
{
  id: 'a1b2c3d4e5f60718-0123456789abcdef0123',   // = deliveryId（resourceId-revisionId）
  resourceId, revisionId,
  name: 'GoldRayChry_L',                          // 英文包名
  category: '烟花' | '尾缀', size: '小' | '中' | '大' | '未分类',
  platforms: ['pc', 'mobile'],                    // 包里实际有的配置
  exportedAt: '2026-11-05T13:20:11Z',
  bakerVersion: '4.9.126',
  durationSec: 3.2 | null,                        // metadata.artifactDuration ?? duration
  thumbTime: 0.8 | null,                          // 缩略图回放时刻（「引擎回放 0.80 s」）
  hasThumb: true,
  state: '待导入' | '有新版本' | '已导入' | '部分导入' | '导入失败',
  stateDetail: '上次导入 11-05 21:40（PC、手机）',
  revisions: [{ revisionId, exportedAt, imported: true }],   // 同一资源的全部修订，新→旧
  files: { ok: true, missing: [], changed: [] },             // 文件夹里的文件和索引哈希是否一致；不一致时 state 不变但 precheck 必失败
  assets: [Asset],                                           // 来自配置，不连 UE 也有；action 要 precheck 后才有
}
```

### Asset

```js
{
  key: 'ps' | 'tex:main' | 'mat:M0' | …,   // 原导入器的资产键
  platform: 'pc' | 'mobile',
  kind: '粒子系统' | '序列贴图' | 'Ramp' | '轮廓图' | '材质实例',
  name: 'P_EFX_FireWorks_GoldRayChry_L_HD',
  uePath: '/Game/Effects_HD/Props_HD/FireWorks_HD/P_EFX_FireWorks_GoldRayChry_L_HD',
  action: '新建' | '覆盖' | '不变' | '复用' | null,   // null = 还没 precheck；「复用」= Ramp/轮廓图内容相同直接用已有那张
  note: '' ,                                         // 例：'内容和已登记的 T_xxx_Ramp 相同，复用那张'
}
```

### Precheck

```js
{
  ok: true,                       // false 时「导入」变灰，悬停写 issues 里第一条 error
  planToken: 'p-…',               // importPkg 要带回来
  newCount: 5, overwriteCount: 2, reuseCount: 1, unchangedCount: 0,
  needBackup: true,               // 有覆盖 → 导入时要 backupDir
  assets: [Asset],                // action 已填
  issues: [{ level: 'error' | 'warn' | 'info', platform: 'pc' | 'mobile' | null, text }],
  checkedAt: ISO,
  uploadedBytes: 6815744,         // 这次传进 UE 临时目录的字节数（同一修订第二次检查不再传）
}
```

`issues` 来源：导入前拦截（规范 §2/§3/§6、sha256、撞名、内容重复）、原导入器检查（命名、目录、GPU 数、模块支持、已有资产冲突、同名更新判断）、UE 未连接。

### ImportResult

```js
{
  ok: true,                       // 全部所选资产写完、保存、读回通过
  written: [{ key, platform, name, uePath, action }],
  failed: [{ key, platform, name, reason }],
  backup: { dir: '<备份文件夹名>/<时间>_<包名>/', files: 3 } | null,
  receiptPath: '.workspace/receipts/<deliveryId>.json',   // 写在导出文件夹里
  gpuRestartNeeded: false,        // 有 GPU 发射器时原导入器要求重启编辑器后「收尾」一次
  finishedAt: ISO,
}
```

「导入完成」只表示 UE 报告资产写完并保存；不等于 ResourceFX 已配表、不等于 UE 里播过、不等于用户通过（回执里 `enginePlaybackVerified:false`）。

### 事件

| 事件 | 参数 | 什么时候 |
| --- | --- | --- |
| `status` | `status()` 的返回值 | UE 连接状态或 busy 变化 |
| `progress` | `{ pkgId, phase, done, total, text }`；phase = `upload` / `check` / `backup` / `import` / `register` | precheck 和 importPkg 期间，按块 / 按资产 |
| `packages` | `[Package]` | scan、publish 或 importPkg 后，列表有变化 |
| `log` | `{ at, text, kind }`；kind = `ok` / `warn` / `err` / `` | 导入引擎的操作记录（原导入器日志），资源交付页想放「操作记录」时用 |

### error.code

| code | 意思 | 外壳怎么显示 |
| --- | --- | --- |
| `UE_DISCONNECTED` | UE 没开或 GPUECli 没响应 | 「导入」变灰，悬停「UE 未连接」，顶栏原地「重新连接」 |
| `NO_PERMISSION` | 文件夹句柄没有读写权限 | 左下「导出 … 需允许访问」 |
| `NOT_EXPORT_ROOT` | `workspace-resources.json` 读得到但格式不对 | 提示「这不是烟花工坊的导出文件夹」 |
| `FILES_CHANGED` | 文件夹里的文件和索引对不上 | 「文件已缺失或被改过：…」 |
| `PLAN_STALE` | 检查后有变化 | 自动重新 precheck |
| `NEED_BACKUP_DIR` | 有覆盖但没选备份文件夹 | 弹窗选备份文件夹 |
| `BUSY` | 已有一处在写 UE | 「正在导入另一个包」 |
| `GATE_BLOCKED` | 导入前拦截没过 | 列 issues |

## 替身怎么用

```js
// 默认场景：UE 已连接，3 个包（待导入 / 有新版本 / 已导入），precheck 通过，导入 2 秒完成。
FWLImporter.__mock.scenario('ue-down');      // UE 未连接，12 秒倒计时自动重试（替身里永远连不上）
FWLImporter.__mock.scenario('blocked');      // precheck 返回 GATE_BLOCKED 类问题，ok:false
FWLImporter.__mock.scenario('fail');         // importPkg 有 1 项失败
FWLImporter.__mock.scenario('empty');        // 空文件夹
FWLImporter.__mock.scenario('default');
// scenario() 返回 Promise，连接状态落定后 resolve。
```

替身的 `scan(dirHandle)` 不读句柄，传 `null` 也行；`publish` 会把传入的包名加进假列表（state 待导入）并发 `packages` 事件。

## 真模块怎么生成、怎么检查（本机或云端都能跑）

```bash
python -X utf8 -B tool/importer/build-5.0.py                 # 生成 dist/fwl-importer.js（先按原流程重建交付版，核对和 reference/ 一致，再做 5.0 改动）
node tool/importer/check-api-5.0.cjs                          # 替身接口 10 项
node tool/importer/check-api-5.0.cjs dist/fwl-importer.js     # 真模块离线 3 项
NODE_PATH=<装了 jsdom 的 node_modules> node tool/importer/check-fwl-importer.cjs   # 真模块 21 项：内存文件夹 + 模拟 UE + 真引擎
```

`build-5.0.py` 对原交付版只做这些改动（构建时逐行核对：贴图规范和导入逻辑的源码行一行不少）：

| 改动 | 内容 |
| --- | --- |
| 导入前拦截 | 原来经 UE 起本机 `python.exe` 跑 `delivery-preflight.py`（写死 C:/、D:/）；改为宿主在网页里跑 `fx_gate.py` 的同一套规则（`fwl50/host.js` 的 `gateCheck`，和 `fx_gate.py` 逐条对照检查过） |
| 覆盖前备份 | 原来写 `D:/FXTools/…/asset-backups`；改为 UE 先写系统临时目录，网页读回（4 MB 一块）写进用户选的备份文件夹（`.uasset.bak` + `manifest.json`，哈希核对），再删临时副本；写不成就停，资产不改 |
| 存储键 | `fwl50.importer.v1`（第一次从旧交付页 `fwimp.delivery.v1` 只读带过来） |
| 去掉 | 特效资产复制、材质实例复制、整枪配表、母材质映射、ResourceFX 配表、旧烟花编排、8034 交付桥（共约 317 KB） |
| 沙盒 | `configure({sandbox})` 时所有写入目录挪到沙盒根下 |

原导入器的交付检查（`check-delivery-*.cjs` 等 11 项）在 5.0 引擎上和原交付版结果逐项相同（8 过；3 项原来就超时 / 失败，见 README）。
