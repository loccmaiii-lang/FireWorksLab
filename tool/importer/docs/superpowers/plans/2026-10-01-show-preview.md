# 烟花编排网页预览 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.
>
> 本次用户已明确要求实装，采用本会话内联执行。当前技能目录未提供上述两个子技能；不另外请求执行方式确认，也不派遣子代理。

**Goal:** 将讨论稿的单簇/整发编排接进D盘现有单文件网页版，用户可以调规则并连续观察动画节奏。

**Architecture:** 原有五个工具及UE业务引擎保留。新增一个与UE无关的本地预览模块，规则生成、界面、动画各有明确边界；现有生成器将新源文件合并进原交付HTML。现有桌面快捷方式继续指向同一文件。

**Tech Stack:** Python单文件合成、原生JavaScript、CSS、SVG、localStorage；现有Node/jsdom用于隔离验证。

## Global Constraints

- 用户原话：“实装到网页版，我看看动画节奏如何”。
- 维护根目录是D:\FXTools\DFWorkbench；不得回到C盘WorkBuddy维护。
- 这是工作台动画预览与逻辑数值生成接入，不修改、保存BP，不调用UE烟花播放。
- 单发射点：所有簇/发保持同一个地面起点，高度变化不是修改出生位置。
- 保留制作子模板和编排完整子模板两种单位；整发内部升空至爆炸的时间关系保留。
- 保留相同随机码复现，大小/高度/角度独立通道；改顺序只改时间。
- 支持可变数量；网页预览数量1–256只是本模块的性能范围，不是UE结构上限。
- 页面保持深灰与薄荷绿风格、明确分组标题、响应式和键盘操作。
- 原工具不改；编辑前保存新版HTML及受影响维护文件的备份。
- 本机私有工具源码、资产映射及本计划不提交公共仓库；公共仓库只登记进展。
- 真实高度参数与方向/父子变换仍需UE校准，界面将动画标为轨迹示意。

---

## File Structure

- `show-plan.js`：纯数据、样本配比、输入清洗、固定随机数、事件计划；不操作DOM或UE。
- `show.html`：第六模块的表单、预览画布、时间条、状态和只读数值表。
- `show.css`：局部作用域的布局与样式，继承工作台配色；不改变其他模块控件。
- `show-ui.js`：本地状态、表单事件、渲染、动画和页面离开时暂停。
- `shell.html` / `shell.js`：第六入口、页面标题与模块初始化/可见性通知。
- `build.py`：合并新模块的HTML、CSS和脚本，保持原业务引擎。
- `check-show.cjs`：生成后的真实单文件隔离验证，UE连接被模拟为离线。
- `README.md`及上一层`使用说明.txt`：打开方式、功能、边界、检查与备份位置。

### Task 1: 确定性计划与生成HTML中的第六入口

**Files:**
- Create: `show-plan.js`, `show.html`, `show.css`, `check-show.cjs`
- Modify: `shell.html`, `shell.js`, `build.py`

**Interfaces:**
- Consumes: 原草稿的Silver/Comet配比与整发局部时间。
- Produces: `ShowPlan.defaults`, `ShowPlan.profiles`, `ShowPlan.valid(input, mode)`, `ShowPlan.make(settings, mode)`。
- `make`返回`{events, duration, profile}`，事件含`index, baseAngle, angle, fire, burst, size, height, jitterLimit`；`burst`在资源模式为null，整发模式为开始时间加局部升空时长。

- [x] Step 1: 保存编辑前备份，新增生成HTML的隔离检查，首先证明第六入口不存在。

```js
const html = fs.readFileSync('../df-fx-workbench_v2_locmai.html','utf8');
assert(html.includes('id="panel-show"'));
assert(html.includes('data-panel="show"'));
```

- [x] Step 2: `node check-show.cjs`应失败于缺少`panel-show`。
- [x] Step 3: 新增纯计划器。归一化位置按数组线性插值；均匀/中心密/边缘密是可选角度配比，种子通道0/1/2分别对应角度/大小/高度。

```js
const p = u * (values.length - 1), i = Math.floor(p);
return values[i] + (values[Math.min(i+1,values.length-1)] - values[i]) * (p-i);
```

```js
const rank = order==='lr' ? i : order==='rl' ? n-1-i
  : order==='out' ? Math.floor(Math.abs(i-(n-1)/2))
  : order==='in' ? Math.min(i,n-1-i) : 0;
const fire = start + rank * interval;
const jitterLimit = n===1 ? 0 : Math.min(angleJitter, .35 * Math.min(...neighborGaps));
```

- [x] Step 4: 插入`show.html`在主内容结束之前；CSS接在工作台CSS之后，脚本在`Workbench.init()`之前定义；添加`show`导航和标题。

```python
s = replace_once(s, '    </main>', (HERE/'show.html').read_text(encoding='utf-8')+'\n    </main>')
```

- [x] Step 5: 生成HTML后执行隔离检查；计划器需复现Silver13条样本，并支持1/9/10/64/256数量、左右/成对/齐发和密集随机仍有序。

### Task 2: 动画、保存与模块生命周期

**Files:**
- Create: `show-ui.js`
- Modify: `shell.js`, `check-show.cjs`

**Interfaces:**
- Consumes: `ShowPlan.make(settings, mode)`、`panel-show`内表单和SVG。
- Produces: `ShowComposer.init()`、`ShowComposer.setActive(boolean)`；localStorage键`df.workbench.show.v1`。
- 保存快照`{version:1, mode, configs:{resource,template}, view:{time,advanced,numbers,speed,loop}}`；不写入导入器或其他模块的键。

- [x] Step 1: 检查保存后的两层设置与时间恢复、离线仍能播放、改变输入不产生UE调用，以及离开模块不继续推进时间。

```js
w.eval("switchPanel('show')");
const callsBefore = calls.length;
set('count', 24);
click('play'); tick(0); tick(450);
assert.equal(calls.length, callsBefore);
w.eval("switchPanel('fwimp')");
tick(900);
assert.equal(timeValue(), pausedTime);
```

- [x] Step 2: 实现SVG预览，所有轨迹共用地面起点。端点按角度和高度比例计算；整发爆花中心就是升空端点，大小比例作用于示意标记，不声称真实粒子可独立解耦。

```js
const theta = event.angle * Math.PI / 180;
event.x = origin + Math.sin(theta) * length * event.height;
event.y = ground - Math.cos(theta) * length * event.height;
```

- [x] Step 3: 每次播放从当前时刻继续，末尾再次点击则重播；时间滑块暂停并定位。速度仅乘播放时钟，不修改计划秒数。循环只有明确勾选后开启。

```js
time = Math.min(duration, time + (clock-lastClock)/1000 * speed);
if(time>=duration && loop){time=0;lastClock=clock;}
```

- [x] Step 4: 设置、暂停、拖时间、结束、详情开合时保存；不逐帧写localStorage。存储失败保留可用预览，并显示无法记住设置；数值输入不合法时显示范围错误，保留最后合法计划。
- [x] Step 5: 模块隐藏或页面进入后台即暂停；再次进入先按真实容器宽度重画；减少动态偏好时显示静态完整布局及时间拖动。
- [x] Step 6: 检查动画在0.5倍、1倍、2倍速、暂停/重播/循环及窄屏时的状态、标记与编号范围。

### Task 3: 交付、回归与使用入口

**Files:**
- Modify: `README.md`, `../使用说明.txt`, this plan
- Generated: `../df-fx-workbench_v2_locmai.html`

**Interfaces:**
- Consumes: 任务1/2的真实生成HTML与检查。
- Produces: 原桌面快捷方式可打开的同路径新版单文件，独立本地预览模块。

- [x] Step 1: 运行`python build.py`；原工具SHA-256必须仍为`17bc3503c307a02200c5f48cf171d02ad582703f73078c8c673a29d8c7ae685b`。
- [x] Step 2: 运行`node check-show.cjs`、`node check.cjs`和`node check-multi-textures.cjs`。所有UE接口在检查中模拟，不使用真实写入完成网页预览。
- [x] Step 3: 文档记录第六入口、两个单位、动画时间的含义、单簇1.2秒仅示意、高度校准边界、预览数量范围和本地设置键；原桌面快捷方式目标不变。
- [x] Step 4: 用现有应用打开新版到烟花编排入口；如果本地网页预览被浏览器策略拒绝，不通过HTTP代理或其他浏览器规避；交付可直接双击的HTML及明确入口。
- [x] Step 5: 公共仓库记录用户原话、步骤、结果与尚未完成的UE校准，只推送登记信息，不推私有代码或资产映射。

## Self Review

要求均有覆盖：两层、可变数量、Silver/Comet配比、五种顺序、独立固定随机、同一地面起点、动画、慢放、拖动、刷新恢复、D盘、保留旧业务及UE无写入。三项任务共享的名字、数据字段和生命周期接口一致。网页预览交付与UE真实轨迹验证明确分开，不把后者列为本次已实现功能。


## 执行结果

网页版v2.1已生成；13组编排集成、29项既有工作台和9项多贴图检查通过，原工具哈希不变。应用已接受打开#show的请求并返回queued，不据此声称真实浏览器视觉验收。公共仓库只登记进展，不提交私有工具。

登记提交3cf0cc0已推送main，仅含本对话记录、交接日志和自身在线时间。最终HTML SHA-256：8614f88d5d7dd3f90489bdf0d5a91aca3a35fd5889cbd5fdbbb1ebddab1dc939。
