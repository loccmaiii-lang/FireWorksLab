# 工作台 16.0.42 · 导演表和灯光一起交付（本机同步 8，2026-10-16）

编排：16.0.42 带 B08 修订6（跨年秀 22 01:05 只出编排文件，请本机完整构建带上）。

用户 10-16 00:29：「交付页面可以和导演文件一样一起交付吗？云端编排还在做新的修订，你先把这个功能做好，等云端更新新的编排文件后，我再点交付，这样一起更新导演文件与灯光文件」。

## 做法

- 「交付 → 导演表 → 自动导入 UE」加勾选「同时写入灯光」（默认开，存浏览器）；同一个确认、同一次点击：先导导演表（照旧），成功后写 `Seq_NewYear_TestShowTemplate_2` 四盏灯。
- 通道同导演表：本机 GPUECli（127.0.0.1:17780）。灯光用 UE 自带 `PythonScriptLibrary.ExecutePythonCommandEx` 跑 `tool/workbench/src/light-engine.mjs` 生成的脚本（写法照同事 `ue_apply_keys.py`：一个 Undo 事务、按 tick 写、逐键读回），保存用和导演表同一个 `EditorAssetLibrary.SaveAsset`，保存后再读一次核对。引擎白名单只多放行带 `fwlight-workbench/1` 标记的脚本。
- 写前把 UE 里原来的四盏灯曲线读出来，浏览器下载成 `fwlight-before-<时间>.zip`（`fwlight.pack/1`，`tool/fwlight/fwlight.py apply-pack` 能写回）。

## 验证（UE 里只做了只读）

| 项 | 结果 |
|---|---|
| UE 内只读检查（`probe.mjs check`，结果 `check.json`） | 9 ms；30 fps、tick 24000、四盏灯轨道齐全、序列未改动、文件只读 |
| UE 内只读预演（`probe.mjs dry`，`dry.json`） | 0.38 s；读出的 SpotLight2 原曲线 1502 键与 `tool/fwlight/baseline/keys_SpotLight2_written_20261015.json` 时间逐键相同、值差 ≤ 6e-5（float32） |
| 三种脚本在 UE 自带 Python 2.7.14 + 模拟 unreal 模块下跑通 | check / dry / write 都 ok（write 0.64 s） |
| `tests/light-engine.test.mjs` 6 项 | 白名单、ASCII、分块输出解析、检查拦截、写入顺序（write → save → check）、读回失败不保存 / 保存失败如实写 / 超时不重试 |
| 核心 181 / 打包 39 / Python 10 | 全过 |
| 8025 开发页（修订5）、8025/release/ 成品与 file:// 离线页（修订6）连真 UE 走查（`*-walk.json`、截图） | 都「灯光检查通过」（修订6：强度 1613 / 颜色 1029 键），按钮「自动导入 UE（导演表 + 灯光）」、确认文字带「4 盏灯的灯光曲线」；取消勾选回到只导导演表；未勾确认、未点导入 |
| 修订6 灯光包（成品页下载原件，`tool/fwlight/deliveries/fwlight-16.0.42-20261016-0111/`） | 与 Python 工具逐键相同；SkyLight 峰值 6.9228，最亮一帧 181.17 s |

## 发现

- **UE 里查 P4 状态会卡死约 2 分钟**（`SourceControl.query_file_state`，P4 不通时）：第一次检查超时就是这个，已去掉，只看文件只读。
- GPUECli 同一时间只接一个请求：00:43 用户 / 导入器在跑 UE Python 时，我的只读请求被重置一次。只读请求自动重试一次，写入绝不重试。
- 修订5 / 6 加扇（180 → 373 发）：天光峰值仍 6.92，但整场平均比 UE 现状亮约 28 %（1.99 → 2.55，修订5 时 2.42）。

## 没做 / 未验

- 没在 UE 里真正写入或保存（由用户点）。第一次真写入的耗时（未测）、只读序列能否保存上，都要看那一次的状态行和回执。
