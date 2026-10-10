# 本机资源交付服务（烘焙器 4.9.60）

直接发布烘焙器整理后的完整资源包：设置一次本机根目录，后续导出写入展开目录并自动接给既有导入器检查。目录发布不需要浏览器下载、手动解压或复制路径。原生 `fwl.cascade/1` 和文件命名保持；另外生成不可变修订、索引及回放缩略图。

## 启动与使用

需要 Python 3.10+；选择目录按钮需要 Python 的 tkinter。服务只监听 `127.0.0.1:8034`，没有额外 Python 包依赖。

```powershell
cd F:\FireWorksLab
python tool/local_delivery/service.py --importer D:/FXTools/DFWorkbench/df-fireworks-delivery_locmai.html
```

也可运行 `start.cmd --importer <本机独立交付HTML的绝对路径>`。没有导入器参数时仍能制作/导出，页面明确显示导入尚未配置。通过 `http://127.0.0.1:8034/baker` 使用本机交付；直接双击旧 HTML 时，指定目录动作会说明服务启动方式。ZIP 便携交付仍可显式选择。

1. 打开“资源交付”，点击“选择目录…”或填写绝对路径并保存。首次配置为空，不替用户选择正式资源位置。默认配置文件为 `%USERPROFILE%/.fireworkslab/delivery-settings.json`，可用 `--config <路径>` 独立设置。
2. 回“效果制作”，调用现有“导出素材包”。单层、组合、单层其他导出方案及种子变体均走共同交付出口；执行开始时固定所选目的地。
3. 完成文件核验后显示固定修订及导入检查。选择既有修订不会重新生成资源；重复接入不增加同修订批次。
4. 沿用导入器队列、设置、资产预览和逐包名称确认。**检查/确认不执行导入；用户点击原导入按钮才触发 UE 写入。** 刷新后未完成批次重新检查并要求确认；实际保存、版本管理和实播分别判断。
5. 本机编排 8025 的“交付资源”点击“读取烘焙器资源”，查看同修订缩略图/平台/时长。选择已登记的 ResourceFX 行名、区域和类型，再加入花型库并设置发射。导入 UE 资产不等于已经建立 ResourceFX 配表；不能按贴图名自动猜映射。

2026-10-10 联调使用独立 `analysis/local/WORKSPACE_DELIVERY` 配置与测试目录，**不是用户的正式导出位置**。当前打开的审看页使用该配置；使用前可保存自己的资源根目录。8025 QA 使用独立 `?qa=WORKSPACE_DELIVERY` 草稿，正式节目不受其测试操作影响。

## 私有导入入口

本机 `D:/FXTools/DFWorkbench/workbench/build-delivery.py` 基于现有工作台构建独立 `df-fireworks-delivery_locmai.html`。新增交付接收、状态回传和双平台材质命名适配；原生导入/更新/规划/策略、模板及原工作台 HTML 保留。独立存储键 `fwimp.delivery.v1` 不自动迁移旧 `file:` 来源或旧批次。

PC/手机保持原配置与主贴图；手机材质目标单独命名，避免两平台不同贴图绑定同一 MI；Ramp/轮廓图继续按原指纹复用。当前接收器接受 `cascade.json`、`cascade_mobile.json`；索引可记录 `cascade_low.json`，但不会假装已接入原导入器低配执行。

私有完整实现和连接配置留在本机，不随公共服务上传。备份与校验在私有 `workbench/backups/20261010-workspace-delivery/`。源码变化后重新构建独立入口；不要用旧工作台文件冒充新的接收页。

## 发布、恢复与边界

```text
<资源根>/workspace-resources.json
<资源根>/<效果英文名>/revisions/<修订指纹>/
  cascade.json / cascade_mobile.json / 原始贴图及辅助文件
  workspace-resource.json
  workspace-thumbnail.png（可缺，缺时明确占位）
<资源根>/.workspace/receipts/<deliveryId>.json
```

最终 ZIP 在内存中交给服务，CRC/引用/原文件 SHA256 核对后原子发布；不是下载到磁盘后解压。指纹只由原生文件清单生成，旁路元数据/缩略图不改原文件字节。重复相同内容返回原修订；新内容保留全部旧修订，演出不会自动换版本。

失败不发布完整索引，旧修订保留；索引写入失败回滚本次自建目录。已有文件被删改会明确报错，不能继续显示完整。只提供索引内文件读取，不提供任意路径读取或执行命令接口。写请求限定同源会话，8025 默认仅能读取资源；更改端口/编排来源可用 `--port` / `--read-origin`。

导入回执由原导入器 UI 报告，带来源和时间，`enginePlaybackVerified` 始终为 false；有记录可能只表示检查，不等于写入完成。目录服务不是任意文件夹监听器，第三方直接复制的文件不会自动登记。

## 验证

```powershell
cd tool/local_delivery
python -m unittest -v test_store test_service
```

10 项测试覆盖完整发布、CRC/引用/路径、UTF8、多层、不可变/重复修订、持久化、污染核对、索引失败恢复、会话与只读来源、元数据封装及目录选择取消。实际页证据、原有回归失败与未完成验收见 `analysis/results/WORKSPACE_DELIVERY/README.md`；协议见 `spec/workspace_resource_v1.md`。原生 UE 实导/实播、旧批次迁移、全分辨率及严格像素基准仍需对应证据，不能由单元测试推定通过。


## 4.9.61 交付页呈现接入

烘焙器右上角进入资源交付，同位置返回制作；目录/历史按需展开，原导入三栏与主动作占满余下工作区。独立导入入口的私有 builder 加载 `delivery-workspace-state.js`、`delivery-presentation.js/css`，从同一 `tool/design-system` 注入基础。可通过 `python build-delivery.py --design-system <仓库>/tool/design-system` 指定来源；旧调用默认读本机当前仓库。更新后须重构独立入口；不要把原型 draft.js 的模拟状态放入生产。

平台分段仅选择真实包，原检查/确认/执行不变；真实执行才自动打开CLI日志，进度按实际完成包数，不显示附加进度文字。新7组控制器检查用mock UE完成/失败/停止，原生实际写入与实播仍单独验收。
