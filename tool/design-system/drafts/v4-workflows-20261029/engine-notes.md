# 真实渲染桥接说明

本轮已验证：**GLB-S1 金锦选中层的真实实时模拟**可以在独立草稿中显示，并能响应选层参数、Ramp颜色和时间拖动。它不是整朵组合回放，也不是UE实播或导出结果。

## 用法

从已通过本机预检的入口打开草稿：`http://127.0.0.1:8034/design-system/drafts/v4-workflows-20261029/` 下的页面。桥接仅允许父页origin为`http://127.0.0.1:8034`，其他来源返回unavailable。测试前已运行`python -X utf8 tool/local_http/preflight.py --tool baker --start`，结果复用8034，根目录为本次F盘副本的`tool`。

```js
// host需实际可见且有宽高，并设position:relative；不要display:none或放到视口外。
await EngineBridge.start(host, (pngDataURL, meta) => {}, status => {});
EngineBridge.setParameters({P: context.rawDefaults, M: context.materialDefaults,
  name: context.name, contextId: context.id});
EngineBridge.seek(2.3); // 本层秒数；原组合rate不在此自动换算。
EngineBridge.pause();
EngineBridge.inspect();
await EngineBridge.dispose();
// 出错后由用户明确点击重试，不自动无限重建。
await EngineBridge.retry();
```

也兼容`setParameters(P,M)`及`setParameters({params,material})`。状态包含`state`与同值`phase`，取值为loading/ready/frame/error/unavailable/audit。`onFrame`回传原`thumbNow()`产生的PNG；iframe本身直接可见地显示原画布，PNG截取最多每秒4次，后来的请求合并。连续seek先更新原state.t，再按需唤起原循环；暂停时不持续重画同一帧。桥接没有自己的烟花模型或粒子绘制器。

## 复用原核的范围

父页只读GET`/baker?fast&autobake=0`，在内存中去掉四份外部生成索引脚本并注入隔离层；不改`tool/src`或`FireworkBaker.html`。当前真实源码版本为4.9.125，原配方保存版本为4.9.112。使用原`__fw.resolve`、`importParams`、`thumbNow`，实际绘制仍是`renderLive40`及其原模拟/渲染核。

内存中的差异只有能力隔离与草稿呈现：禁用自动烘焙/烘焙调用、将画面固定在实时模拟、指定540×540的内部目标与DPR1、将原循环改为按参数/时间请求绘制。父级ResizeObserver只调整iframe的CSS等比缩放，不改变WebGL内部视口、原配方或观看距离。540×540是实时参考的内部解析度，不是导出单格或烘焙像素。原实时自适应子采样明确启用，不依赖srcdoc中不会继承的查询串。原P/M按配方完整传入，不为显得有效偷偷改参数，不更换粒子核、不调低原配方画质字段。SCHEMA及derive原有规则仍由原程序处理。

只开放选层P/M和seek/pause/审计消息。未接通：三层组合时间/轨迹同步、引擎回放、贴图流转、烘焙、输出检查、目录交付、素材ZIP、UE导入。输出项是待烘焙配置，编辑成功不表示产物已更新。其他层在草稿为只读参考；不能把金锦预览称为整朵GLB-S1。

## 隔离措施与实际结果

- iframe使用`sandbox="allow-scripts"`，没有allow-same-origin、downloads、forms、popups或top-navigation。实测`location.origin="null"`，无法访问父文档。
- 在原脚本前建立每个iframe独立的内存localStorage/sessionStorage；不读生产浏览器profile。测试在临时Playwright上下文的父页写入哨兵，子页读到null，结束父值不变；子页产生的3项偏好只在内存。
- indexedDB、caches、目录/打开/保存picker和navigator.storage/serviceWorker不暴露。fetch/XHR/WebSocket/EventSource/Worker/SharedWorker等替换为拒绝函数，sendBeacon返回false。
- CSP的connect/media/worker/frame/font/object/form/base均禁用，图片只允许data/blob。原交付iframe初始化试图定位本机页，被frame-src阻断；控制台有这一条预期拒绝，没有实际发出请求。
- 父/子两侧消息均检查nonce与event.source；父还要求消息origin为null，子要求父origin为8034。实测使用同nonce但错误source伪造frame消息未被采纳。
- 真实`__fw`在子页初始化后缩为state/importParams/thumbNow/resolve四个入口。父页不能直接访问这些对象；消息不执行字符串代码。
- 原自动烘焙入口在启动前替换，bake/bakeFinal/导出入口被拒绝。测试全过程bakeCalls=0、state.baking=false。没有执行烘焙、导出或UE操作。
- 测试路由只允许GET测试壳和GET/baker；除此之外全部拒绝。实测只有这两次GET，外部/API请求0。主动调用子页fetch得到SecurityError，尚未进入网络层。
- dispose在子页取消RAF、取帧定时器与排队任务，并显式释放隔离WebGL context；父页最多等250ms的disposed回执后移除iframe。pagehide/beforeunload也执行尽力清理。实测回执contextReleased=true，iframe数量为0。

## 实际验证证据

过程文件仅在`analysis/local/20261029_三套工作流Demo/engine/`，未提交生产项目：

- `bridge-test.json`：请求清单、消息状态、存储哨兵、opaque origin、画布尺寸、baking审计与dispose。
- `frame-0.png`：金锦原P/M，1.2s，540×540。
- `seek-2.3.png`：原P/M，2.3s；与1.2s有87,671个不同像素。
- `sparkSize-1.5.png`：同2.3s，把原sparkSize从0.75改为1.5m；与原2.3s有121,206个不同像素，亲眼确认颗粒变粗。
- `ramp2-blue.png`：同2.3s，只改原Ramp中亮节点；与原2.3s有10,393个不同像素，亲眼确认颜色改变。
- `pixel-difference.json`：PNG指纹与差分数据；变化用于证明真实参数路径接通，不作为画质合格判据。
- `test-page.png`：隔离测试壳截图。`test_bridge.py`为可重复测试，所有浏览器均由临时隔离上下文启动，未使用个人profile。

验证使用Playwright Chromium的D3D11硬件路径（Intel Graphics，ANGLE）。完整检查约10秒结束。默认软件渲染尝试曾取帧超时/严重卡顿，因此不宣称所有浏览器/GPU环境性能可靠；实际草稿仍须在用户常用硬件浏览器核对。桥接锚点或源版本结构变化会返回unavailable，不能绕过隔离改用生产页profile。

这些证据只证明选层真实实时预览和已列明隔离条件；没有做完整安全审计、生产功能验收或UE实播验收。

## 连续操作可靠性修复与压力简测

整页QA曾出现换页/刷新/尺寸变化后坏帧，下一页`no webgl2`。源码诊断确认两类放大因素：原`ensureTargets`按DOM尺寸×DPR建目标，且原loop即使暂停也每RAF绘制。最初只固定iframe CSS仍不充分：刷新后DOM测量曾读到264×264。因此本次隔离适配明确给原ensureTargets固定540目标尺寸，而不是再次依赖DOM测量。没有修改正式函数文件、模拟模型、P/M数值、粒子世界尺度或dist观看距离。

可靠性变化：相同P/M按签名去重；单独seek不重复导入；暂停无请求时不重画；子页early error、未处理拒绝和contextlost立即回报父级。错误后忽略晚到的frame并隐藏坏画面；手动retry保留最后P/M/时刻，无自动无限重启。

对应`engine-bridge.js` SHA256：`9688f41e8e734ca881b76b1904c423173f93518b2af3eaa779c258e8805f3807`。证据：`analysis/local/20261029_三套工作流Demo/engine/bridge-stress.json`及`bridge-stress-a-1920.png`、`bridge-stress-b-1920.png`、`bridge-stress-c-1920.png`。

在同一个隔离Playwright Chromium / D3D11浏览器中，以父页DPR2连续完成A→B→C：改金锦颗粒、保存、reload、切橙引线/金锦观察、1920×1080→1366×768→2560×1440→1920×1080。30个检查点均保持子viewport/canvas为540×540、内部DPR1、dist=1000、无非预期渲染错误/上下文丢失/外部或API请求，bakeCalls=0。静止1秒renderFrames计数不变。刻意lose_context后约14ms父级显示真实错误，无自动重启；一次手动retry恢复，dispose回执确认contextReleased。测试约31秒，结束后浏览器与上下文均已关闭。

这个压力简测验证资源与桥接生命周期，不代替三页完整交互QA。压力涉及金锦与橙引线；点灭星不在本次压力检查覆盖内。此前的软件渲染卡顿限制仍保留，不能据此声称所有浏览器/GPU性能可靠。最初定位失败的过程报告已另留，未作为通过证据。

交付包装：仅将本新目录文本换行为LF，语义不变。上文压力验证时本地SHA为9688f41e8e734ca881b76b1904c423173f93518b2af3eaa779c258e8805f3807；交付LF版engine-bridge.js的SHA为8d3af5bb392faef6e70974ead1910ce15e4d8c2f7ca51738f5458b2ec7dcee22。目录.gitattributes固定LF，原核/参数/观看距离没有变化。
