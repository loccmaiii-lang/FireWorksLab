# 烟花编排工作台：唯一开发源码

日常使用离线 HTML；这里供本机和云端修改、构建、走查。唯一维护源码为 `F:/FireWorksLab/tool/workbench`，用户统一入口为 `F:/FireWorksLab/FXtools`。原 D 盘源码与临时独立克隆只保留历史备份，不继续迭代。

## 本机与云端用同一组命令

需要 Node.js 20.19+、npm、Python 3.10+。安装依赖需要联网；安装后构建和使用均不依赖公开网站。

```sh
cd tool/workbench
npm ci
npm run dev
```

- `http://127.0.0.1:8025/`：当前仓库源码，Vite自动刷新。
- `http://127.0.0.1:8025/release/`：仓库中真正的离线HTML原字节，不注入开发脚本，不缓存。
- `npm test`：核心逻辑与本机产物预览服务检查。
- `npm run release`（或 `npm run build`）：Python覆盖保护检查 → 核心检查 → Vite构建 → 一次HTML打包 → 包装检查 → 固定ZIP → 覆盖固定产物。
- `npm run release -- --no-deploy`：云端只更新仓库产物，不处理本机交付目录。
- `npm run build:app`：仅编译开发源码，不发布；不能把这一步称为完整离线交付。
- `npm run publish-show -- --programme <节目.dfshow> --name <编排名> [--note 说明] [--version 16.0.x]`（16.0.9 起）：把一版编排发布成「云端最新编排」。版本号末位 +1；去掉内嵌音乐、只留 sha256；写 `public/data/cloud-latest.json` 和 `FXtools/节目/云端最新/<版本>-<编排名>.dfshow`，并在 `版本记录.md` 追加一行。之后照常 release。工作台启动时，这份编排在当前浏览器没载入过就自动载入：载入前把原节目放进「恢复切换前节目」，同一份只载入一次。逻辑在 `src/cloud-latest.mjs`，检查在 `tests/cloud-latest.test.mjs`。同一版本要附对比版（如密度 D1 / D3）时加 `--also <节目.dfshow>::<编排名>`（可重复），对比版只存进 `FXtools/节目/云端最新/` 和版本记录，刷新不自动载入，要在「节目 → 打开节目」里选。
- 只换编排（16.0.19 起，云端装不了 npm 依赖时用）：`node scripts/publish-show.mjs --data-only --programme <节目.dfshow> --name <编排名>`，再 `python3 release.py --data-only --no-deploy`。不重编界面：先用 Git 确认界面源码（`src/`、`package*.json`、`public/data/`、`fixtures/`、离线壳 `bootstrap.js` 等）自上一次成品提交后没改，再把成品 HTML 内嵌数据块里的 `cloud-latest` 换掉（`../offline-workbench/patch-data.mjs`，数据块以外字节不动），更新构建清单（`dataPatches` 记一笔）、跑打包检查、重打 ZIP。工具版本号 `WORKBENCH_VERSION` 不变，编排版本号接着最大的号末位 +1，顶栏写「云端编排 16.0.19」、底栏写「导演编排 16.0.18 · 云端 16.0.19」。界面源码改过就会拒绝，要本机 `npm run release`；之后完整构建时工具版本必须比只换编排用过的号新（release.py 会拦）。

不需要 Sites、公开服务器、UE在线或私有D盘目录。没有UE时连接状态显示未连接，网页编排仍可用。旧8017 Actor只读代理是历史辅助接口，主要导演读写使用已有17780/gpcli；本次不新增或自动执行UE写操作。

## 固定产物

每次更新同名文件，不建版本目录：

```text
tool/烟花编排工作台.html
tool/烟花编排工作台.html.build.json
tool/烟花编排工作台_使用说明.html
tool/烟花编排工作台-离线包.zip
```

默认更新工作区 `FXtools/烟花编排工作台`。本机可在 `~/.fireworkslab/workbench-release.json` 配置 `deliveryDir`，例如用户目前使用的历史目录：

```json
{"deliveryDir":"D:/FXTools/DFWorkbench/deliveries/烟花编排工作台/2026-10-10-v12"}
```

该配置只作为旧路径兼容镜像，不进Git。没配置的机器更新仓库产物和FXtools入口；接收者直接双击同名HTML即可，无需安装Node/Python。

Git拉取已经构建好的成品后，双击 `FXtools/更新离线工作台.cmd`；等价命令：

```sh
python tool/workbench/release.py --deploy-only
```

先核对HTML、源码指纹和ZIP，再复制工具文件到配置目录。若云端只提交了源码而没有同步产物，会明确停止，需运行完整构建。不自动执行Git拉取或覆盖本机未提交代码。8025源码变更由Vite读取；依赖变化需 `npm ci`，服务配置变化需重启开发服务。

## 程序与个人节目分开

程序更新保持离线数据库 `df-offline-director-workbench` 和草稿键 `df-offline-workbench-v1-draft`；已有个人草稿优先于内置示例。更新脚本只覆盖上面四个工具文件，不删除其他文件。

`file://`、8025开发版、8025/release/使用各自草稿空间。Git同步文件，不同步浏览器数据库。离线版里做的新节目，要用「下载节目版本文件」导出 `.dfshow`，云端才能读取和修改；云端交回的新节目通过「打开节目」导入。保持同一浏览器配置、同一离线路径，并定期下载版本备份；不能承诺浏览器被清理后仍保有历史。

`fixtures/demo.dfshow` 是原测试节目的无音乐副本；完整原节目/音乐在仓库协作归档中，均不被构建修改。开发入口复用归档 `music/music.wav`，缺失时可自行导入；离线HTML不附音频。

## 源码边界

- `src/`：唯一的界面、模型、渲染、存储、交付业务实现。交付页「灯光」（16.0.40）：`LightDeliveryPanel.jsx` + `light-curve-model.mjs`（逐行移植 `tool/fwlight/lib/light_model.py`，`tests/light-curve.test.mjs` 守逐键一致）+ `light-rig.mjs`（关卡实测坐标、四盏灯、参数）+ `zip-store.mjs`。16.0.42 起「导演表 → 自动导入 UE」可勾「同时写入灯光」一起写进 UE：`light-engine.mjs`（生成 UE Python 脚本，经 GPUECli 的 ExecutePythonCommandEx 执行；check / dry 只读、write 写入）+ `light-settings.mjs`（天光峰值、开关，存浏览器），测试 `tests/light-engine.test.mjs`。
- `public/data/`：六份实际目录数据。
- `tests/fixtures/legacy/`：历史对照快照，只用于兼容性检查。
- `server/`：只读开发辅助接口和原字节产物预览。
- `../offline-workbench/`：单文件打包、校验；原业务导出路径转发到这里的 `src/`，不用再改两套代码。其 `model/` 是旧检查快照，正式构建不使用。

源码统一LF换行，构建指纹不依赖盘符。16.0.19 起指纹也不依赖换行：构建清单写 `fingerprint: sha256-lf`，按 LF 归一后算，Windows 工作区里是 CRLF 或混合换行也和云端 LF 检出对得上（以前的清单按原字节算，Windows 上有 11 个文件是 CRLF / 混合换行，云端核对必失败）。云端有桌面可以打开HTML；没有桌面则运行本地HTTP检查。云端网页测试不等于本机UE实播或真实file协议验证。
