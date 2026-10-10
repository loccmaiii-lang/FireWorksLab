// 生成静态方案文档。无浏览器事件、数据写入、假执行或可点击参数原型。
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)), root=path.resolve(dir,'../../..');
const data=JSON.parse(fs.readFileSync(path.join(dir,'字段映射.json'),'utf8'));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx=vm.createContext({});
vm.runInContext(read('tool/src/js/10_types.js'),ctx);
const P=vm.runInContext('({...BASE,...TYPES.senrin.p,type:"senrin"})',ctx);
const ui=read('tool/src/js/70_ui.js');
vm.runInContext(ui.slice(ui.indexOf('const AUTO_DEF ='),ui.indexOf('const autoLinked =')),ctx);
const auto=vm.runInContext('AUTO_DEF',ctx);
const plot=vm.runInNewContext('('+ui.slice(ui.indexOf('function inspectorCurveHTML('),ui.indexOf('function inspectorNavSync(')).trim()+')');
const fields=data.rows.filter(r=>r.emitter==='子花'&&r.sourceSection==='千轮 / 分裂');
if(fields.length!==18)throw Error('样板源定义变化：需要重新选择/核对千轮子花');
const byKey=new Map(fields.map(r=>[r.key,r]));
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const displayValue=k=>auto[k]&&P[k]===auto[k][3]?auto[k][1](P):P[k];
const visible={...Object.fromEntries(fields.map(r=>[r.key,displayValue(r.key)])),subSize:1.2,subSizeCurve:'0:1, 0.7:1, 1:0'};
const value=r=>r.kind==='select'?'小球 / sphere':r.kind==='curve'?visible[r.key]||'空 = ×1':Number(visible[r.key]).toFixed(r.range?.[2]>=1?0:r.range?.[2]>=0.1?1:2);
const unit=r=>r.kind==='curve'?'':r.unit==='1（无量纲）'?'×':r.unit;
const group=r=>r.B.split('/')[3]?.trim()||r.module||'预览设置';
const origModule=r=>r.A.split('/')[3]?.trim()||r.module||'预览设置';
function row(k,{compact=false}={}){
 const r=byKey.get(k), curve=r.kind==='curve', linked=!!auto[k]&&k!=='subSize';
 const pct=r.range?Math.max(0,Math.min(100,(+visible[k]-r.range[0])/(r.range[1]-r.range[0])*100)):0;
 const numeric=`<span class="track" aria-hidden="true" style="--fill:${pct}%"><i></i></span><span class="num ${linked?'linked':''} ${k==='subSize'?'focus-sample':''}">${esc(value(r))}</span><span class="unit">${esc(unit(r))}</span><span class="reset">${k==='subSize'?'↺':''}</span>`;
 const controls=curve?`<span class="curve-text">${esc(value(r))}</span>`:r.kind==='select'?`<span class="select-text">小球 <span>sphere ▾</span></span>`:numeric;
 const chain=auto[k]?`<div class="linkline"><span class="action-shape">${linked?'跟着算':'接回'}</span><span>${linked?'来源：':'已断开 · 跟着算为'} ${esc(auto[k][2])}${linked?'':' 0.60 m'}</span></div>`:'';
 const chart=curve?`<div class="curve-box">${plot(k==='subSizeCurve'?[[0,1],[.7,1],[1,0]]:null)}<div class="keys">${k==='subSizeCurve'?'<span>寿命 0.00 → ×1</span><span>0.70 → ×1</span><span>1.00 → ×0</span>':'<span>空曲线 → 恒定 ×1</span>'}<span class="muted">图表只读</span></div></div>`:'';
 return `<div class="param ${curve?'is-curve':''} ${compact?'small-example':''}" data-key="${esc(k)}"><div class="paramline"><span class="label">${k==='subSize'?'<b class="changed-dot" aria-label="已改"></b>':''}${esc(r.label)}</span>${controls}</div>${chain}${chart}</div>`;
}
const identity=`<div class="identity"><div><span class="tool-id">烟花烘焙器</span><span class="muted"> / 效果制作</span></div><strong>千轮 <span>› 第 1 层 › 子花</span></strong><div class="context"><span>原始版本 · 静态演示</span><span>仅作用当前层的子花</span></div></div>`;
const statebar=`<div class="states"><span class="state warning">配方未保存</span><span class="state warning">贴图旧</span><span class="state">自动烘焙关</span></div>`;
const sampleContent=`${identity}${statebar}<div class="module-title">外观与颜色 <span>原：大小 / 亮度</span></div>${row('subSize')}${row('subSizeCurve')}${row('subBright')}${row('subBrightCurve')}<div class="module-title">空间与运动 <span>原：受力 · 联动示例</span></div>${row('subVt')}${row('subGrav')}<div class="sample-foot"><span class="action-shape">撤销</span><span class="action-shape">重做</span><span class="action-shape">恢复打开时</span><span class="muted">全资产 60 步 · 输入框先文本撤销</span></div><div class="info-sample"><strong>大小：子花单颗星的直径</strong><p>单位 m。直接输入断开主星联动；“接回”存 -1。曲线横轴是单粒寿命，纵轴是直径倍数。</p></div>`;
const variants=[['S','小圆角 · 紧凑形状','4 / 6 / 8 px','视觉更利落；密度与右侧相同。'],['C','当前共享形状','8 / 12 / 16 px','延续共享基础与导入草稿。']];
const shapeHTML=variants.map(([id,title,radii,note])=>`<article class="shape-card shape-${id}" data-variant="${id}"><div class="candidate"><span>${id}</span><div><h3>${title}</h3><p>控件 / 面板 / 说明框：${radii} · ${note}</p></div></div><div class="sample">${sampleContent}</div></article>`).join('');
function classify(which){
 const order=which==='A'?['生成','形状','初速','受力','寿命','大小','亮度','火花','闪光']:['时序与数量','空间与运动','外观与颜色','事件与特性'];
 return `<article class="class-card" data-class="${which}"><div class="class-head"><h3>${which==='A'?'A · 九模块优化':'B · 制作任务重组'}</h3><p>${which==='A'?'保持原模块顺序，特有模块在后。':'相同字段按制作意图接近放置；须批准分类差异。'}</p></div>${identity}<p class="reading-note">以下全部展开用于核对字段，<strong>不是默认展开策略</strong>。随机行标所属本体。</p>${order.map(g=>{let list=fields.filter(r=>(which==='A'?origModule(r):group(r))===g);const primary=list.filter(r=>r.kind!=='curve'&&(!r.randomParent||!byKey.has(r.randomParent)));let sorted=[];for(const r of primary){sorted.push(r);sorted.push(...list.filter(x=>x.randomParent===r.key));sorted.push(...list.filter(x=>x.kind==='curve'&&x.key===r.key+'Curve'));}for(const r of list)if(!sorted.includes(r))sorted.push(r);return `<section class="field-group"><h4>${esc(g)}<span>${list.length} 条${which==='B'?' · '+[...new Set(list.map(origModule))].join(' / '):''}</span></h4>${sorted.map(r=>`<div class="field-list" data-key="${r.key}"><div>${r.randomParent&&byKey.has(r.randomParent)?'<span class="muted">↳ '+esc(byKey.get(r.randomParent).label)+' · '+esc(r.label)+'</span>':esc(r.kind==='curve'?r.fullLabel:r.label)}<small>${esc(r.key)}</small></div><span>${esc(value(r))} ${esc(unit(r))}${auto[r.key]&&r.key!=='subSize'?'<small>跟着算</small>':''}</span></div>`).join('')}</section>`;}).join('')}<p class="inherit">${which==='A'?'颜色 / 闪烁':'外观 / 闪烁继承'}：随本层颜色与主星闪烁；本层颜色的原定位/返回入口保留。<br>当前无独立子花颜色或闪烁字段，不补假开关。</p><div class="class-foot">18 / 18 个相同出现ID · 数值与保存路径完全相同</div></article>`;
}
const stages=[
 ['01','找到正确对象','效果/版本 → 第1层 → 子花；搜索“大小”。搜索覆盖当前层各发射器。','已有：身份与搜索；拟改进：稳定对象范围常驻。'],
 ['02','理解参数','点字段名 / F1 固定说明；大小为单颗直径，单位 m。Esc 关闭。','已有：固定帮助；逐入口焦点恢复需核验。'],
 ['03','精确 / 随机','大小输入 1.20；开花随机 10→15%。滑杆拖动用常用范围，数值框可超范围。','已有：数字+滑杆、真实随机子项。无每字段抽样按钮。'],
 ['04','寿命曲线','subSizeCurve 输入 0:1, 0.7:1, 1:0；只读图显示逐段线性变化。','已有：文本+图+表；无拖点。坏文本会保存并标错。'],
 ['05','断接联动','大小手动后“接回”；接回 -1 再跟主星。终端速度、重力、初速随机分别标来源。','已有：8个子花默认联动；不添加粒径→火花寿命。'],
 ['06','检查预览反馈','实时模拟响应；配方未保存、贴图旧分开。自动烘关时按 B；失败保留上次成功结果。','已有：模拟/烘焙状态；静态图不伪造检查通过或UE实播。'],
 ['07','撤销恢复','曲线→大小依次撤销；资产栏撤销与输入框文本撤销区分；恢复打开时 ≠ 模板默认。','已有：P/M/L全资产60步；曲线未计行级“改过”。'],
 ['08','切对象继续','切星 / 另一层后回子花，P值保留；恢复任务位置与展开/焦点。','数据/历史已有；逐对象滚动/焦点记忆是拟改进，当前切层回顶部。']
];
const stageHTML=stages.map(([n,t,b,s])=>`<article class="stage"><div class="stage-number">${n}</div><h3>${t}</h3><p>${b}</p><small>${s}</small></article>`).join('');
const tasks=[['T1','晚开、更多、更持久','生成 → 寿命 → 火花','时序与数量'],['T2','飞散尺度与下坠','初速 → 受力','空间与运动'],['T3','大小、亮度与熄灭','大小 → 亮度','外观与颜色'],['T4','闪光 → 层颜色 → 返回','闪光 / 本层颜色','事件与特性 / 本层颜色'],['T5','错对象、撤销、继续','相同对象切换任务','相同对象切换任务']];
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>烘焙器参数体验 · 首轮设计册</title><link rel="stylesheet" href="../../../tool/design-system/tokens.css"><style>
*{box-sizing:border-box}html{scroll-behavior:auto}body{margin:0;background:var(--fw-color-surface);color:var(--fw-color-on-surface);font:var(--fw-type-body-size)/var(--fw-type-body-line) "Segoe UI","Microsoft YaHei UI",sans-serif;font-variant-numeric:tabular-nums}a{color:var(--fw-color-primary);text-underline-offset:4px}a:focus-visible{outline:2px solid var(--fw-color-focus);outline-offset:4px}main{max-width:1136px;margin:auto;padding:28px 36px 48px}h1{font-size:24px;line-height:32px;margin:4px 0 8px}h2{font-size:18px;line-height:26px;margin:0 0 8px}h3{font-size:15px;line-height:22px;margin:0}p{margin:4px 0 12px}.muted,small{color:var(--fw-color-on-surface-muted)}.eyebrow{color:var(--fw-color-primary);font-size:12px;letter-spacing:1px}.hero{display:flex;justify-content:space-between;gap:24px;align-items:start}.stamp{padding:8px 12px;border:1px solid var(--fw-color-divider);border-radius:8px;white-space:nowrap;font-size:12px}.intro{max-width:770px;color:var(--fw-color-on-surface-muted)}nav{display:flex;gap:20px;flex-wrap:wrap;padding:14px 0 22px;font-size:13px}.section{margin-top:34px;scroll-margin-top:16px}.section:first-of-type{margin-top:0}.section-kicker{font-size:12px;color:var(--fw-color-on-surface-muted);margin-bottom:12px}.shape-grid,.class-grid{display:grid;grid-template-columns:repeat(2,520px);gap:24px}.candidate{display:flex;gap:10px;min-height:68px;align-items:start}.candidate>span{color:var(--fw-color-primary);background:var(--fw-color-primary-container);padding:4px 10px;font-size:16px;font-weight:600;border-radius:6px}.candidate p{font-size:12px;line-height:18px;color:var(--fw-color-on-surface-muted);max-width:450px}.shape-S{--r-control:4px;--r-panel:6px;--r-dialog:8px}.shape-C{--r-control:var(--fw-radius-control);--r-panel:var(--fw-radius-panel);--r-dialog:var(--fw-radius-dialog)}.sample{border:1px solid var(--fw-color-divider);background:var(--fw-color-surface-low);border-radius:var(--r-panel);overflow:hidden}.identity{padding:12px 16px 8px;border-bottom:1px solid var(--fw-color-divider);font-size:12px}.tool-id{font-weight:600;color:var(--fw-color-primary)}.identity strong{display:block;font-size:15px;margin:4px 0}.identity strong span{font-size:13px;font-weight:400}.context{display:flex;gap:12px;justify-content:space-between;color:var(--fw-color-on-surface-muted);font-size:12px}.states{display:flex;gap:8px;padding:8px 16px}.state{font-size:12px;line-height:18px;border:1px solid var(--fw-color-divider);padding:1px 6px;border-radius:var(--r-control)}.warning{color:var(--fw-color-warning);background:var(--fw-color-warning-container);border-color:var(--fw-color-warning-container)}.module-title{font-size:13px;font-weight:600;padding:6px 16px;margin-top:2px;background:var(--fw-color-surface-container);display:flex;justify-content:space-between}.module-title>span{font-size:12px;font-weight:400;color:var(--fw-color-on-surface-muted)}.param{padding:0 16px;font-size:13px}.paramline{display:grid;grid-template-columns:126px minmax(0,1fr) 64px 42px 18px;gap:8px;align-items:center;min-height:30px}.label{overflow-wrap:anywhere}.changed-dot{display:inline-block;background:var(--fw-color-warning);width:5px;height:5px;border-radius:50%;margin-right:5px;vertical-align:middle}.track{height:4px;border-radius:var(--r-control);background:var(--fw-color-divider);position:relative}.track:before{content:"";position:absolute;width:var(--fill);height:4px;background:var(--fw-color-primary);border-radius:var(--r-control)}.track i{position:absolute;left:var(--fill);top:-4px;width:12px;height:12px;border-radius:50%;background:var(--fw-color-primary)}.num,.curve-text,.select-text{border:1px solid var(--fw-color-outline);border-radius:var(--r-control);background:var(--fw-color-surface);min-height:24px;line-height:22px;text-align:right;padding:0 6px;color:var(--fw-color-on-surface)}.linked{font-style:italic;color:var(--fw-color-on-surface-muted)}.focus-sample{outline:2px solid var(--fw-color-focus);outline-offset:1px}.unit{color:var(--fw-color-on-surface-muted);font-size:12px}.reset{color:var(--fw-color-warning);text-align:center}.curve-text,.select-text{grid-column:2/-1;text-align:left;font:12px/22px Consolas,monospace;overflow-wrap:anywhere}.select-text span{float:right;color:var(--fw-color-on-surface-muted)}.linkline{margin-left:134px;display:flex;align-items:center;gap:8px;font-size:12px;line-height:18px;padding:2px 0 6px;color:var(--fw-color-on-surface-muted)}.action-shape{display:inline-block;border:1px solid var(--fw-color-outline);border-radius:var(--r-control);padding:1px 7px;white-space:nowrap;color:var(--fw-color-primary);font-size:12px;line-height:20px}.curve-box{margin-left:134px;display:flex;align-items:center;gap:6px;padding-bottom:6px}.cv-plot{width:220px;height:88px;flex-shrink:0}.cv-grid{fill:none;stroke:var(--fw-color-divider);stroke-width:1}.cv-line{fill:none;stroke:var(--fw-color-primary);stroke-width:1.7}.cv-point{fill:var(--fw-color-primary)}.cv-plot text{fill:var(--fw-color-on-surface-muted);font:10px "Segoe UI","Microsoft YaHei UI",sans-serif}.keys{display:flex;flex-direction:column;font-size:12px;line-height:18px}.sample-foot{display:flex;flex-wrap:wrap;gap:8px;align-items:center;border-top:1px solid var(--fw-color-divider);padding:8px 16px}.sample-foot .muted{font-size:12px}.info-sample{margin:4px 12px 12px;border:1px solid var(--fw-color-divider);border-radius:var(--r-dialog);padding:8px 12px;background:var(--fw-color-surface-container);font-size:12px;line-height:18px}.info-sample p{margin:2px 0 0}.callout{padding:12px 16px;border-left:3px solid var(--fw-color-primary);background:var(--fw-color-surface-low);margin-top:16px;font-size:13px}.class-card{border:1px solid var(--fw-color-divider);border-radius:var(--fw-radius-panel);background:var(--fw-color-surface-low);overflow:hidden}.class-head{padding:16px;background:var(--fw-color-surface-container)}.class-head p{font-size:12px;margin:4px 0 0;color:var(--fw-color-on-surface-muted)}.reading-note{padding:10px 16px 0;font-size:12px}.field-group{margin:0 16px 12px;border-top:1px solid var(--fw-color-divider)}.field-group h4{margin:6px 0;font-size:13px;display:flex;justify-content:space-between;gap:10px}.field-group h4 span{font-size:12px;font-weight:400;color:var(--fw-color-on-surface-muted)}.field-list{display:flex;justify-content:space-between;gap:14px;padding:5px 0;border-top:1px solid var(--fw-color-divider);font-size:13px}.field-list small{display:block;font:12px/18px Consolas,monospace}.field-list>span{text-align:right;flex-shrink:0;max-width:48%}.inherit{margin:10px 16px;font-size:12px;line-height:18px;color:var(--fw-color-on-surface-muted)}.class-foot{border-top:1px solid var(--fw-color-divider);padding:10px 16px;font-size:12px;color:var(--fw-color-primary)}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;vertical-align:top;border-bottom:1px solid var(--fw-color-divider);padding:10px 12px;overflow-wrap:anywhere}th{color:var(--fw-color-on-surface-muted);font-weight:500;background:var(--fw-color-surface-low)}.stages{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.stage{padding:14px;background:var(--fw-color-surface-low);border:1px solid var(--fw-color-divider);border-radius:var(--fw-radius-panel)}.stage-number{color:var(--fw-color-primary);font:18px/24px Consolas,monospace;margin-bottom:8px}.stage h3{font-size:14px}.stage p{font-size:13px;line-height:20px;margin:6px 0 10px}.stage small{font-size:12px;line-height:18px;display:block}.decisions{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.decision{border:1px solid var(--fw-color-divider);border-radius:var(--fw-radius-panel);padding:16px;background:var(--fw-color-surface-low)}.decision p{font-size:13px}.decision strong{color:var(--fw-color-primary)}footer{border-top:1px solid var(--fw-color-divider);margin-top:36px;padding-top:16px;font-size:12px;color:var(--fw-color-on-surface-muted)}@media(max-width:1120px){main{padding:20px}.shape-grid,.class-grid{grid-template-columns:minmax(0,520px);justify-content:center;gap:24px}.stages{grid-template-columns:repeat(2,1fr)}.decisions{grid-template-columns:1fr}.hero{flex-direction:column;gap:8px}}@media(max-width:560px){main{padding:16px}.stages{grid-template-columns:1fr}.context{flex-wrap:wrap;gap:0 8px}.paramline{grid-template-columns:94px minmax(20px,1fr) 48px 28px 12px;gap:5px}.linkline,.curve-box{margin-left:99px}.curve-box{flex-direction:column;align-items:start}.cv-plot{width:100%;height:auto}.keys{font-size:12px}.identity,.param,.states,.module-title{padding-left:12px;padding-right:12px}.module-title{flex-wrap:wrap}.candidate{min-height:auto;margin-bottom:12px}.field-list>span{max-width:45%}.info-sample{padding:8px}table{font-size:12px}td,th{padding:8px 5px}}@media print{body{background:#fff;color:#111}.shape-grid,.class-grid{grid-template-columns:repeat(2,520px)}main{max-width:none}a{color:inherit}.section{break-inside:avoid}}
</style></head><body class="fw-scope"><main><header class="hero"><div><div class="eyebrow">FIREWORKSLAB / PARAMETER EXPERIENCE / 4.9.60</div><h1>先把一套参数调顺手</h1><p class="intro">首轮方案：全字段映射、A/B 分类、连续调参样板与同内容形状对照。<br>图中的参数控件是静态说明；确认方向后再做可点击原型。</p></div><div class="stamp">待确认 · 2026-10-10</div></header><nav aria-label="设计册导航"><a href="#shape">同内容视觉</a><a href="#classification">A/B 分类</a><a href="#journey">连续调参</a><a href="#expansion">展开与控件</a><a href="#decisions">待决事项</a><a href="方案.md">完整方案</a><a href="字段映射.csv">626条映射 CSV</a><a href="覆盖报告.md">源码覆盖</a></nav>
<section class="section" id="shape"><h2>01 / 同内容，只比较形状</h2><p class="section-kicker">两张均为 520px；同 6 项字段、值、联动与状态、字阶、间距。蓝绿焦点框是静态焦点示例。数值演示未写入配方。</p><div class="shape-grid">${shapeHTML}</div><div class="callout">S / C 都是项目候选数值，非官方强制。参数基础行 30px，联动、曲线和说明占真实高度；普通动作使用共享尺寸。圆角不增加首屏行数，也不能代替效率测试。曲线改动尚未计入现有行级“改过”；此处只给数值行显示改动点与还原。</div></section>
<section class="section" id="classification"><h2>02 / 同 18 个字段，比较组织方式</h2><p class="section-kicker">分类和视觉分开决策。千轮子花完整适用字段如下；地面末端另有条件定义，仍在全字段映射中。</p><div class="class-grid">${classify('A')}${classify('B')}</div><div class="callout"><strong>推荐把 B 放入下一轮可点击验证。</strong>A 保留引擎模块习惯，迁移成本小；B 将“什么时候开 / 飞多散 / 怎么暗下来”的相关参数靠近，但组更长、老用户需适应。B 需要批准现行九模块顺序的差异。</div><table><thead><tr><th>相同任务</th><th>A 经过的组</th><th>B 经过的组</th></tr></thead><tbody>${tasks.map(([id,t,a,b])=>`<tr><td>${id} · ${t}</td><td>${a}</td><td>${b}</td></tr>`).join('')}</tbody></table><p class="section-kicker">这些是结构分析，不是点击数或耗时实测。完整任务数值和所有条件映射见方案与 CSV。</p></section>
<section class="section" id="journey"><h2>03 / 一条能贯通的连续调参链</h2><p class="section-kicker">控件能力以源码为准；拟改进的定位与焦点能力单独标明。正式回放、UE导入和用户验收仍是独立门槛。</p><div class="stages">${stageHTML}</div></section>
<section class="section" id="expansion"><h2>04 / 按任务展开，个人选择优先</h2><table><thead><tr><th>场景</th><th>E0：原策略</th><th>E1：任务展开（建议验证）</th></tr></thead><tbody><tr><td>第一次打开</td><td>首个适用模块展开</td><td>A首个适用模块 / B时序与数量</td></tr><tr><td>T3 大小 + 亮度</td><td>按原开合，逐模块进入</td><td>主动进入任务时，A大小+亮度 / B外观与颜色</td></tr><tr><td>手动开合</td><td>按发射器模块记忆；跨层共用</td><td>手动优先，按稳定效果/层lid/发射器记忆</td></tr><tr><td>搜索 / 仅改动</td><td>临时展开匹配，退出恢复开合</td><td>同样临时展开；退出补齐滚动/焦点恢复</td></tr><tr><td>连续改值 / 播放</td><td colspan="2">不自动收起或反复重排。组内全部字段可达；真实随机子项保留独立展开，没有新增“更多”。</td></tr><tr><td>控件选择</td><td colspan="2">保留数值+滑杆、枚举select、颜色拾色器、开关、曲线文本+只读图。精确项省滑杆另列审批，此稿未删。</td></tr></tbody></table></section>
<section class="section" id="decisions"><h2>05 / 首轮只需确认这三项</h2><div class="decisions"><article class="decision"><h3>分类 · A / B</h3><p>A九模块优化，或B制作任务重组。</p><strong>建议：B进入可点击比较</strong><p class="muted">C1：涉及九模块固定顺序，当前未改宪章。</p></article><article class="decision"><h3>展开 · E0 / E1</h3><p>E0原策略，或E1任务需要的组+个人记忆。</p><strong>建议：E1</strong><p class="muted">C2：主动任务展开差异；保留手动选择优先。</p></article><article class="decision"><h3>形状 · S / C</h3><p>S 4/6/8，或C当前8/12/16。</p><strong>等待你选择</strong><p class="muted">C4：批准后同一负责人维护共享tokens；本稿仅局部覆盖。</p></article></div><div class="callout">确认 → 可点击参数样板 → 寻找/展开/滚动/跨模块/错对象/撤销任务对照 → 分区实装。首屏8行仅是布局约束。导入草稿仍在<a href="../../../tool/prototypes/workspace-delivery-v1/">原任务入口</a>继续；交付正确性、原生验收和旧入口移除门槛全部保留。</div></section>
<footer>来源：当前4.9.60 SCHEMA / 参数与发射器命名表 / 原UI和撤销实现。554条定义 + 72项补充入口；包含条件分支、信息容器、观察与文件操作，不是单效果626个粒子参数。源码指纹与抽取脚本保存在同目录。当前状态：方案执行结束；字段/布局限定自检；分类/展开/形状及实际效率待用户确认。</footer></main></body></html>`;
fs.writeFileSync(path.join(dir,'设计册.html'),html+'\n');
const summary=data.summary;
const legacy=data.rows.filter(r=>r.legacy).length;
const distribution=Object.entries(Object.groupBy(data.rows,r=>r.emitter)).map(([e,rs])=>({e,total:rs.length,A:Object.entries(Object.groupBy(rs,origModule)).map(([g,v])=>[g,v.length]),B:Object.entries(Object.groupBy(rs,group)).map(([g,v])=>[g,v.length])}));
const report=`# 字段覆盖与能力核对

基线：烘焙器 ${summary.bakerVersion}；提取时提交 ${summary.sourceCommit}。这是定义盘点与静态方案，不是新生产版本或可点击参数原型。

## 范围与结果

| 项目 | 数量 / 结果 |
| --- | --- |
| 当前SCHEMA节 / 定义行 | ${summary.schemaSections} / ${summary.schemaRows} |
| 直接编辑定义 / 信息及容器行 | ${summary.schemaEditable} / ${summary.schemaInfoRows} |
| 不同SCHEMA key | ${summary.uniqueSchemaKeys}（同key条件分支保留各自出现ID） |
| 补充真实入口 | ${summary.extraRows} |
| 未在SCHEMA中的登记ID | ${summary.registryOnly}，全部由原规格框呈现，JSON/CSV含registryId |
| BASE内部/兼容键 | ${summary.internalBaseKeys}，见JSON internal；不创建新控件 |
| 静态body input/select入口 | ${summary.bodyControls}，均有参数/观察/文件/对象导航归属 |
| A/B出现ID集合 | 626条完全相等，实际分组后排序核对，无遗漏、无重复出现ID |
| 缺字段ID / 必需属性 / 未归属静态入口 | 0 / 0 / 0 |
| SCHEMA被标旧/归档的定义行 | ${legacy}（含条件分支，不能与宪章唯一旧键数量直接比较） |
| 代表样板 | 千轮子花：18条适用定义；8项默认来源联动 |

入口：字段映射CSV面向查表；JSON保留完整条件函数、随机、哨兵、保存规则和内部键。字段ID沿用唯一命名/发射器表；SCHEMA-xxx是本次源码顺序出现ID，不作为未来跨版本永久ID。补充入口用SPEC/MAT/LAYER等ID，并保留已有登记ID和真实数据路径；重复入口不是新增参数。

信息行不全部是纯只读：endInfo加长制作时长、lowAtNow取当前时刻、outSummary使用试算页数有原快捷动作；specBox/specMore搬入原规格控件。JSON/CSV的infoActions分别写出，不将它们遗漏或假称新增功能。

## 子花完整新旧位置映射

| 字段ID / key | 旧 / A模块（实际） | B任务 | 显示基准 / 存储 | 说明 |
| --- | --- | --- | --- | --- |
${fields.map(r=>`| ${r.fieldId} / ${r.key} | ${origModule(r)}${r.randomParent&&byKey.has(r.randomParent)?' / '+byKey.get(r.randomParent).label+' / 随机':''} | ${group(r)} | ${displayValue(r.key)===''?'空':displayValue(r.key)??'空'} ${unit(r)} / ${P[r.key]===''?'空':P[r.key]??'空'} | ${auto[r.key]?'来源：'+auto[r.key][2]+'；编辑断开，接回哨兵'+auto[r.key][3]:r.kind==='curve'?'文本+只读图；空=×1；全资产撤销可回滚':'原数值或选择'} |`).join('\n')}

地面末端burstStars/subSpeed/subBurn保留另外三个条件定义，不在千轮子花样板。随机子项的原登记模块和真实重排位置分别保存，subScaleJit登记“形状”、运行时收在“初速/subSpeed/随机”。对应父项在全SCHEMA后出现同名条件定义，当前p43RandLinks按全表byKey匹配；需在后续可点击样板核验随机显示/筛选的真实父项，没有未经执行便宣布修好。

## 全源码分类影响范围

以下为全部条件分支的定义行数，不代表一个效果同时显示全部字段，也不作为首屏/速度证据。A细组较多，B合组会变长；特殊模块保留领域名，必须用具体配方测试。

| 作用范围/发射器 | 定义行 | A模块分布 | B任务分布 |
| --- | --- | --- | --- |
${distribution.map(({e,total,A,B})=>'| '+e+' | '+total+' | '+A.map(([g,n])=>g+' '+n).join('；')+' | '+B.map(([g,n])=>g+' '+n).join('；')+' |').join('\n')}

## 源码行为与文档差异

- duration命名说明残留“最后0.3s统一淡出”；当前空中自然熄灭。本轮只修方案说明，不改命名表或配方。
- 曲线文本change调用onParam/快照撤销；rowChanged只检测数值/select/text，现无曲线行级“改过”或独立还原按钮。错误文本可被保存并aria-invalid，不宣称阻止错误提交。
- subSize/subBright等联动显示的是计算值；保存-1哨兵，subVt用0。直接编辑固定值，“跟着算”固定当前值，“接回”恢复哨兵。
- 同批星LINK_KEYS、TIMING_KEYS时间联动、号数和tempo作用范围已分别写入CSV；联动分组links及观察设置不在wbSnap，不能统一承诺参数Ctrl+Z恢复。
- 现切层scrollTop=0；模块开合按发射器›模块键、发射器选择按花型家族存，不是按稳定层对象记忆。逐对象定位恢复属于拟改进。
- _trailTier选择实际调用openType打开另一模板，不是P字段修改；CSV明确撤销基线重建。名称、尺寸档、导出目录各有自己的持久化范围。
- 本轮补充入口以当前70_ui/79_workbench/90_events/77_assets/67_delivery的静态与动态字段核对；数组颜色段模板代表最多5段，不把索引展开成固定5个必须存在字段。导入器UE系统/GPU配置属于原导入任务，不混称制作粒子参数。

## 可复现与未验证

仓库根运行Node：

\`\`\`powershell
node '协作/设计稿/参数体验_4.9.60_2026-10-10/提取字段.mjs'
node '协作/设计稿/参数体验_4.9.60_2026-10-10/生成设计册.mjs'
\`\`\`

提取会读取源码，不调用烘焙、UE、导出或生产localStorage；任何缺ID/属性/静态入口/A-B集合不一致返回非零。生成器复用原inspectorCurveHTML只读图函数；所有参数控件为span静态内容，无脚本事件/生产API。

源码SHA256：

${Object.entries(summary.sourceHashes).map(([p,h])=>'- '+p+'：`'+h+'`').join('\n')}

本轮不能宣称所有条件分支逐个实页验证、完整无障碍或效率通过。定义完整性、代表对象的真实DOM和静态版式已核对；后续须用批准后的可点击样板测任务T1–T5，另有交付/原生验收清单。AI自检结果与用户通过分开记录。
`;
fs.writeFileSync(path.join(dir,'覆盖报告.md'),report);
console.log(JSON.stringify({generated:['设计册.html','覆盖报告.md'],representativeFields:fields.length,linkedFields:fields.filter(r=>auto[r.key]).length,htmlHasScripts:/<script\b/.test(html),shapeContentIdentical:true}));
