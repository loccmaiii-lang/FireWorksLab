# 工作区资源索引 v1

格式 `df.firework-resource/1`；生产者为烘焙器 4.9.60 + `tool/local_delivery`。旁路索引不改变原生 `fwl.cascade/1`。职责和状态含义只按 `协作/交互宪章.md`，此处描述实际接口。

## 身份与目录

`resourceId` 为英文交付包名（去 ZIP 后缀、不区分大小写）的 SHA256 前 16 位；改名产生另一个资源 ID。`revisionId` 为排序后的原生文件 `{path,bytes,sha256}` 清单序列化哈希前 20 位；同原生内容同修订。`deliveryId = resourceId + '-' + revisionId`。指纹不含后来生成的展示缩略图和元数据；相同内容重新发布返回原索引，不改历史配方快照。

修订存 `<name>/revisions/<revisionId>/`；原文件名、原配置内引用保持。`workspace-resources.json` 是完整修订目录；`resources[]` 保留历史，不是自动替换演出引用的最新版本指令。移动根目录应通过服务设置，服务重新提供本机实际绝对路径。

## 字段

| 字段 | 实际含义 |
| --- | --- |
| `format/status` | `df.firework-resource/1` / `complete`，只在完整发布后可见 |
| `resourceId/revisionId/deliveryId` | 稳定资源身份、原生内容修订、一次修订的交付身份 |
| `name/createdAt/relativeDirectory` | 英文包名、UTC 发布时间、修订相对目录 |
| `directory` | HTTP 回执补充当前根目录下实际绝对路径，不写入不可变文件 |
| `files[]` | `path/bytes/sha256`；包含原生文件和生成缩略图，索引本身不自哈希 |
| `packages[]` | `relativeDirectory/configFile/platform/name`；HTTP 回执补 `directory`。平台由 PC/手机/低配配置文件识别 |
| `metadata.bakerVersion/sourceKey/recipe` | 生产版本、制作对象来源、当次配方快照；不授权消费端回写制作参数 |
| `metadata.duration` | 当前候选完整时长；历史首批资源只有此字段 |
| `metadata.artifactDuration` | 新出口记录的完成烘焙范围；裁帧与原生发射器时长仍须区分，不能称 UE 实测寿命 |
| `metadata.sizePlan` | 原导出缩放/尺寸规格含目标、原测量、缩放；不是新 UE 实测 |
| `metadata.boundsM` | 新出口记录的完成贴图取景宽高（已乘导出缩放）；不等于花径或发射高度 |
| `thumbnail` | `missing + reason` 或 `ready + file + source + revisionId`；来源 `baker-final-product-replay`，同产物按现有引擎回放口径生成 |
| `metadata.thumbnailTime/thumbnailError` | 回放时刻或生成失败原因；缩略图不参与原生版本身份 |
| `importReceipt` | HTTP 回执关联本机原导入器报告，未执行时也可能有检查记录 |

导入记录存 `.workspace/receipts/<deliveryId>.json`：包含报告来源 `existing-importer-ui`、UTC `reportedAt`、逐项 `rows` 和 `enginePlaybackVerified:false`。行记录状态、原目标、操作/资产选择、已完成资产键、错误、检查时间和原执行进度。不能把 `ready` 称为“UE 已导入”；实际引擎保存、版本管理、实播和用户认可各有独立证据。

## 消费约定

- 服务 GET 列表/单修订时读回原文件并校验 SHA；缺文件/污染明确失败。仅列出根内已登记文件；拒绝逃逸、Windows 无效路径、重名、链接与配置引用缺失。
- 独立导入器自动接收 PC/手机配置为同一固定交付批次，检查调用原 `preview`；修改任何范围作废旧确认。刷新只重新检查未完成项，不自动执行或继承确认。
- 8025 资源面板读索引与缩略图，显式选择 ResourceFX 配表行名/区域/类型后加入花型库。绑定既有演出模型；新增花型、固定子模板和条目保存同一 `workspaceResource`，含原文件指纹、修订、缩略图及可用尺度/时长来源。缺配表映射不能编造原生资源 ID。
- 新索引不修改已有节目片段；固定交付资源不在编排花型编辑中修改制作参数，包括复制绕过。旧制作模板保留，等数据迁移验收后再收拢工具职责。
- 同版本新包、不同版本旧图、UE 未连接、导入失败、缺缩略图、缺映射和未实播分别表达。旧引用缺文件的全节目扫描/主动升级版本界面尚未接入；现阶段只在读取库时核对资源，不能把目标条款说成已完整上线。

## 当前接口

GET `/api/session`、`/api/output-root`、`/api/resources`、`/api/deliveries/<id>`、`/api/deliveries/<id>/<登记文件>`。
POST `/api/output-root`、`/api/output-root/pick`、`/api/deliveries?name=<ZIP名>`、`/api/import-receipts/<id>`。

交付 Content-Type `application/vnd.fireworkslab.delivery`：4 字节小端 JSON 长度 + UTF8 JSON 元数据 + 原最终 ZIP。会话写请求使用当前来源和 `X-Workspace-Token`；无远程命令执行接口。此格式是本项目契约，不是 Material 官方数据协议。
