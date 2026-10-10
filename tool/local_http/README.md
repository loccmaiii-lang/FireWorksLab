# 三工具本机HTTP入口

双击仓库 `tool/启动全部工具.cmd`，或运行 `python -X utf8 tool/local_http/launcher.py`。Python 3.10+；编排开发版另需本机已有 Node 和 Vite 依赖。服务后台隐藏运行，不添加开机自启，不下载/安装依赖，不触发UE导入。`--no-browser`只启动/检查。

| 用途 | 固定地址 |
| --- | --- |
| 三工具入口 | http://127.0.0.1:8036/ |
| 烟花烘焙器 | http://127.0.0.1:8034/baker |
| 原特效工作台 | http://127.0.0.1:8036/workbench/ |
| 烟花编排工作台（开发） | http://127.0.0.1:8025/ |
| 当前离线产物原字节检查 | http://127.0.0.1:8025/release/ |
| 烘焙器独立资源交付页 | http://127.0.0.1:8034/importer |

8034复用既有目录交付服务和本机配置；原特效工作台完整内联HTML从磁盘即时读取，HTTP响应字节与原文件相同。8025复用现有Vite，未运行时启动现有源码，不构建产物。固定8036只服务入口、原工作台和共用颜色tokens；不列目录，不开放任意路径、POST或UE代理。端口被别的应用占用则报错，不关闭现有进程。不新增页面自动导入；原有只读连接探测、UE接口和用户确认规则保持。

8034的烘焙器也只有一份源码：`tool/src → tool/build.py → tool/FireworkBaker.html`。服务读取其所在仓库`tool`下的产物，不维护HTTP专用副本。2026-10-10核对当前进程为`F:/FireWorksLab/tool/local_delivery/service.py`，`8034/baker`响应SHA256与F盘`tool/FireworkBaker.html`相同。修改烘焙器源码后按原流程构建，刷新8034即可。原特效工作台和独立导入器仍按本机D盘配置读取；这两项没有因入口统一自动迁入Git源码。

本机可选配置：`%USERPROFILE%/.fireworkslab/local-http-tools.json`，不提交到仓库：

```json
{
  "workbenchPath": "D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html",
  "devPath": "F:/FireWorksLab/tool/workbench",
  "nodePath": "C:/Program Files/nodejs/node.exe"
}
```

未配置时原特效工作台使用上述D盘路径，编排开发版始终从当前仓库的 tool/workbench 启动，Node从PATH获取。建议省略 devPath，避免换仓库后仍指向旧目录。8034的配置沿用`delivery-launcher.json`；不替换原资源根或重新生成私有导入组件。重启电脑后再双击启动；关闭入口网页不停止服务。日志在`~/.fireworkslab/local-http-tools.log`、`choreography-dev.log`及原交付服务配置旁。替换原工作台HTML后刷新固定HTTP地址即可，无需另建版本文件夹。

## HTTP与file

file直接读取磁盘；HTTP通过本机服务送出同一HTML。127.0.0.1只指当前电脑，无需联网，也不是公开部署；把这个链接发给别人不会打开你的工具。发给别人仍用现有离线HTML/ZIP。

浏览器数据按来源区分：file、8034、8036、8025，以及localhost与127.0.0.1各自有自己的存储。第一次转用HTTP：先在旧file页面用工具已有的导出节目/备份动作保存文件，再在HTTP页用对应导入动作打开。不能把首次HTTP空草稿解释成原数据被删。此启动器不读、清空或迁移浏览器个人数据。之后保持同一地址/浏览器，覆盖HTML文件与代码不会更换这些固定地址；会话撤销不等于永久修改历史，重要版本仍需文件备份。

编排只维护 tool/workbench 源码，npm run release 自动核验、生成HTML/ZIP并覆盖配置的固定离线目录。Git拉取成品后运行 tool/更新离线工作台.cmd，无需二次手改页面。8025/release/即时读取该成品，不经过Vite转换。HTTP实页通过不能证明file实页通过，两种入口分别验证。HTTP更便于截图、控件、时序与只读UE连接检查，但浏览器扩展的文件上传权限仍独立；HTTP不能让自动文件选择无条件成功。原file页的浏览器自动审批/权限限制没有被修改。读取HTML源码与操作浏览器呈现页是两个不同能力。

## 验证

`python -X utf8 -m unittest discover -s tool/local_http -p "test_*.py" -v`

服务检查覆盖原字节、固定地址即时覆盖、缺文件、目录遍历/Host拒绝、POST拒绝、服务复用/冲突和隐藏启动；实际UI/UE只读验证和未验边界见`analysis/results/LOCAL_HTTP_TOOLS/看法.md`。
