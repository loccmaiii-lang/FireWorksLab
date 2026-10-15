# tool/fwlight —— 编排 → UE 灯光曲线（同事交接工具入库版）

来源：同事 2026-10-15 交接包 `FireworkLight_Handover.zip`（完整原理、命令、回滚见同目录 `交接文档_烟花灯光曲线.md`）。入库时去掉了序列原件 `.uasset`（UE 资产实体不上传）和 8 MB 的旧编排 `NewYearFireWorks_v01-v13.dfshow`（它是 B07 时期的本机版本，仓库里没有同内容文件）。

## 和交接包的差别（FireWorksLab 加的，只有这些）

| 改动 | 原因 |
|---|---|
| `config.json` 指向本机 `E:/loc_ma5` 工程、编排指向仓库 `FXtools/节目/云端最新/16.0.42-B08修订6…dfshow`；同事原配置留在 `config.handover.json` | 换机器 |
| `lights.SkyLight.max_intensity = 10`：`apply` 前检查，任一关键帧超过就拒绝写入 | 用户 10-15「skylight 的峰值要控制在 10 以内」 |
| `apply --keys` 的文件路径含中文时先复制到 `out/` | UE 内 Python 2.7 读不了非 ASCII 路径 |
| 新命令 `apply-pack <目录>`：写入编排工作台「交付 → 灯光」导出的四盏灯（manifest `fwlight.pack/1` + `keys_<灯>.json`），逐盏 apply → verify | 工作台交付包一条命令进 UE |

光照模型（`lib/light_model.py`）没改。编排工作台里的同一模型是 `tool/workbench/src/light-curve-model.mjs`，两边逐键一致由 `tool/workbench/tests/light-curve.test.mjs` 守着（交接基准 `baseline/keys_SpotLight2_written_20261015.json` + B08）。**改模型要两边一起改**，否则测试会挂。

## 常用

```bat
cd /d F:\FireWorksLab\tool\fwlight
:: 只读：确认本机序列现在是哪一版（10-15 写入版 = B07 编排）
python fwlight.py verify --light ALL --keys <某个 keys 文件>
:: 写入工作台导出的交付包（先在 P4 迁出 Seq_NewYear_TestShowTemplate_2，打开 UE 编辑器）
python fwlight.py apply-pack deliveries\<交付包目录> --no-save   :: 先只写内存，在 Sequencer 里看
python fwlight.py save                                           :: 满意再保存
python fwlight.py apply-pack deliveries\<交付包目录>             :: 或一步：备份 → 写入 → 保存 → 逐键核对
```

UE 写入遵守仓库「UE 单写」规则：写之前在状态清单登记，做完删。

**16.0.42 起一般不用这里的命令**：编排工作台「交付 → 导演表 → 自动导入 UE」勾「同时写入灯光」，一次点击写导演表和四盏灯（同一套写法，写前自动下载可还原的备份包）。这里留作手动写、还原备份（`apply-pack fwlight-before-<时间>`）和同事机器上用。
