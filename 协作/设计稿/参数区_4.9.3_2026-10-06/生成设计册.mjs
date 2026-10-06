import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const model=JSON.parse(fs.readFileSync(path.join(dir,'参数逐项映射.json'),'utf8'));
const controls=JSON.parse(fs.readFileSync(path.join(dir,'非SCHEMA功能映射.json'),'utf8'));
const defs=[
['A_多图层总览','先管组合，再调某层','图层管理临时替换右栏详情。独看/静音只改变观察，增删复制排序集中在行菜单。','整体态没有可编辑的“整体发射器”；时长是计算值。三层为我的效果示例，不是修改后的HN2。'],
['B_层设置与轨迹联动','把作用范围说清楚','当前层的位置与时间、轨迹关联、规格、环境、玉体、场景。关联前说明同步方向。','无XYZ偏移能力。轨迹联动与参数行自动来源是不同机制；各图时间数据需在原型统一。'],
['C_发射器与条件参数','完整选择，按条件展开','更多发射器、自定义1/2、四种触发、普通九模块与共享颜色定位。','共用搜索/仅改动/EN仍须保留。最多2个自定义；颜色内删除遵守现行宪章。'],
['D_层颜色与材质','颜色有独立而稳定的位置','分段颜色、过渡、头尾强度、Ramp四档和焰色预设；显示曝光仍在画布。','第一段必须固定0秒且不可删除；图标状态以此规则为准。RT6温度着色保留专用模型。'],
['E_烘焙输出与平台','九项常调，计算结果可覆盖','已按09:40批准要求修订：PC、手机、入点、出点、宽、高、格子、曝光、留边。计算项灰字显示，解锁后覆盖；其余收进高级/旧项。','帧数/行列/尺寸从真实计划计算；“烘焙此层”需接入明确范围。图片画布的通道选择不是新增能力承诺。'],
['F_RT6尾缀特殊模块','专业类型使用真实结构','星头、细中粗及火花共用；近远交接、预算、随机/拖影。其余专用组从更多到达。','火花年龄不等于整朵秒数；细中粗不是效果的三个图层，不强套普通九模块。'],
['G_地面与条件分支','不用空滑杆填满侧栏','喷口形状与条件说明；导航到彗星发射参数；地面类型按真实能力变化。','已移除生成器误加的发射时机/随机偏移。转轮、瀑布、文字等字段在逐项表保留。'],
['H_审阅验收与异常','让通过建立在正确版本上','变更、检查、版本不一致、意见、通过/需要修改、历史。与参数页分工。','两层HN2候选示意。游戏内屏占比按真实相机计算，不能照图缩放；完整门槛按源码验证。'],
['I_工具与数据操作','多层编辑也能到达工具','JSON/配方、仓库、锁定随机、快捷键、测速、旧数据留底。','现有组合隐藏工具且切页影响选择；此处需要行为修改。快捷键从KEYMAP生成。'],
['J_素材只读查看','已有产物用只读语义','版本、发射器观察、Cutout/天空、参数来源。没有源效果时不能继续编辑。','已去掉审阅/工具标签。旧入口当前隐藏，本图覆盖兼容分支，不默认新增顶级功能。']
];
const pages=defs.map(([key,headline,body,note])=>({key,title:key.substring(2),file:key+'.png',headline,body,note}));
for(const p of pages)if(!fs.existsSync(path.join(dir,p.file)))throw new Error('Missing '+p.file);
if(model.rows.length!==499||model.summary.missingMapping.length)throw new Error('Unexpected schema coverage');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const serialized=JSON.stringify({model,controls,pages}).replaceAll('<','\\u003c');
const html=String.raw`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DF 烟花烘焙器 · 完整右栏设计册</title>
<style>
:root{color-scheme:dark;--bg:#191f21;--panel:#252b2e;--ink:#e0e6e8;--dim:#afbabe;--line:#414c50;--green:#00d49b;--amber:#e4bb7c}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 system-ui,"Microsoft YaHei",sans-serif}a{color:var(--green)}button,input,select{font:inherit;color:inherit;background:var(--panel);border:1px solid var(--line);border-radius:5px;padding:8px 12px}button{cursor:pointer}button:hover{border-color:var(--green)}:focus-visible{outline:2px solid var(--green);outline-offset:3px}header{padding:24px 32px;border-bottom:1px solid var(--line)}h1{font-size:25px;margin:0 0 8px}h2{font-size:21px;margin:0 0 8px}h3{font-size:17px;margin:0}p{margin:8px 0}.dim{color:var(--dim)}.tag{color:var(--green);font-size:12px;letter-spacing:.08em}.intro{max-width:1050px}nav.links{display:flex;gap:20px;flex-wrap:wrap;margin-top:14px}.gallery{display:grid;grid-template-columns:230px minmax(0,1fr);gap:24px;padding:24px 32px}.pages{display:grid;align-content:start;gap:6px}.pages button{text-align:left;background:transparent;border-color:transparent}.pages button[aria-pressed="true"]{border-color:var(--green);background:#16372f}.pages small{display:block;color:var(--dim);font-size:12px;margin-left:23px}.canvas{min-width:0}.frame{background:#0c1113;border:1px solid var(--line);margin:16px 0 0}.frame img{display:block;width:100%;height:auto;max-height:78vh;object-fit:contain}figcaption{padding:10px 14px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;color:var(--dim);font-size:13px}.notice{border-left:3px solid var(--amber);padding:9px 14px;color:#dbcbb0;background:#2a2924;margin-top:12px}.section{padding:28px 32px;border-top:1px solid var(--line)}.structure{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.structure>div{border:1px solid var(--line);padding:16px}.filters{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0}.filters input{min-width:280px;flex:1}.tablewrap{overflow:auto;max-height:650px;border:1px solid var(--line)}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;vertical-align:top;border-bottom:1px solid var(--line);padding:10px 12px}th{position:sticky;top:0;background:#30383b;z-index:1;white-space:nowrap}td code{overflow-wrap:anywhere;font-size:12px;color:#b6cec5}td small{display:block;color:var(--dim)}td:first-child{min-width:170px}td:last-child{min-width:300px}details{border-bottom:1px solid var(--line);padding:12px 0}summary{cursor:pointer}summary small{color:var(--dim);margin-left:8px}.empty{padding:30px;color:var(--dim)}footer{padding:20px 32px;color:var(--dim);font-size:13px}.status{color:var(--amber);font-size:12px}.controls{margin-top:18px}.legend{display:flex;gap:20px;flex-wrap:wrap}
@media(max-width:1000px){.gallery{grid-template-columns:1fr}.pages{grid-template-columns:repeat(2,minmax(0,1fr))}.structure{grid-template-columns:repeat(2,1fr)}header,.gallery,.section{padding:20px}.filters input{min-width:150px}}@media(max-width:600px){.structure{grid-template-columns:1fr}.pages button{font-size:13px}.pages small{display:none}}
@media print{body{background:white;color:black}.pages,.filters{display:none}.gallery{display:block}.frame img{max-height:none}th{position:static}.tablewrap{max-height:none}.notice{color:black}}
</style></head><body>
<header><div class="tag">DF VISUAL EFFECTS LAB · DESIGN REVIEW · 2026.10.06</div><h1>完整右栏 · 从多图层到交付检查</h1><p class="intro dim">延续「顺手调参」的十个状态。已盘点4.9.4源码的42组、499条界面定义（488个不同键），另列52组界面功能。图稿表达布局与层级；参数真值、条件和实施边界见下面的映射。</p><nav class="links" aria-label="文档导航"><a href="#gallery">看状态图</a><a href="#structure">看整体结构</a><a href="#inventory">查全部参数</a><a href="#controls">查图层与其他功能</a><a href="../../烟花烘焙器交互设计草稿.md">完整行为说明</a></nav></header>
<main><section id="gallery" class="gallery" aria-label="设计状态图"><nav id="pages" class="pages" aria-label="选择状态图"></nav><div class="canvas"><div class="tag" id="number"></div><h2 id="title"></h2><p id="desc" class="dim"></p><figure class="frame"><img id="art" alt="" width="1672" height="941"><figcaption><span>生成静态示意 · 烟花、数值与部分文案不是生产数据</span><a id="original" target="_blank" rel="noopener">打开原图 ↗</a></figcaption></figure><div id="note" class="notice"></div><p class="dim">图稿不是已运行的参数界面。各状态有意只展开相关模块，其余字段仍在下方清单中保留。</p></div></section>
<section id="structure" class="section"><h2>固定身份，按任务切换</h2><p class="dim">一级「参数 / 审阅 / 工具」。参数页固定当前图层；图层管理临时替换详情。进入具体层后，默认回到发射器。</p><div class="structure"><div><h3>发射器</h3><p>真实发射器 → 模块 → 参数。普通九模块与RT6、地面专用结构并存。</p></div><div><h3>层设置</h3><p>缩放、时间、镜像、轨迹联动，以及当前层的规格、环境、玉体、场景。</p></div><div><h3>层颜色</h3><p>颜色时间线、渐变图与显示强度。单一清楚的颜色归属。</p></div><div><h3>烘焙输出</h3><p>平台、取景、帧与贴图、曝光采样。整包导出与英文命名仍在原有交付入口。</p></div></div><p class="notice">编辑哪层、观察哪层、导出哪层是三个不同状态。切层不自动独看；独看/静音不改变导出；跨层轨迹联动不包括颜色。</p></section>
<section id="inventory" class="section"><h2>逐项参数清单</h2><p class="dim">保留全部定义及代码中的条件，不把499条定义当作同时显示的499个滑杆。条件函数按原文展示，供实现核对；这里不会执行模拟。</p><div class="legend"><a href="参数逐项映射.csv">下载CSV</a><a href="参数逐项映射.json">JSON（含范围/枚举）</a><a href="梳理参数.mjs">只读提取器</a></div><div class="filters"><input id="search" type="search" aria-label="搜索全部参数" placeholder="搜索中文、参数键、模块或条件…"><select id="emitter" aria-label="筛选归属"><option value="">全部归属</option></select><select id="destination" aria-label="筛选页面"><option value="">全部页面</option><option>发射器</option><option>层设置</option><option>烘焙输出</option><option>预览设置</option></select><button id="clear" type="button">清除筛选</button></div><p id="count" class="dim" role="status" aria-live="polite"></p><div class="tablewrap"><table><thead><tr><th>参数 / 原始定义</th><th>归属 / 模块</th><th>建议去向</th><th>类型 / 单位 / 枚举</th><th>显示条件</th></tr></thead><tbody id="rows"></tbody></table></div></section>
<section id="controls" class="section"><h2>参数表之外的52组功能</h2><p class="dim">包含SCHEMA外控件与跨模块行为。橙色标记表示需要新增或修正行为，不能仅移动DOM就宣称完成。</p><a href="非SCHEMA功能映射.json">下载功能映射JSON</a><div id="controlRows" class="controls"></div></section>
</main><footer>基线：4.9.4 / f07e220；目录名沿用上一轮4.9.3。保留旧设计。未修改生产代码、正式宪章或验收状态。完整行为规范与12组验收任务见既有交互设计草稿末节。</footer>
<script>
const DATA=__DATA__;
const byId=id=>document.getElementById(id);
const text=(el,value)=>{el.textContent=value;return el;};
const node=(tag,value)=>text(document.createElement(tag),value);
const pageButtons=[];
function showPage(i){const p=DATA.pages[i];byId('number').textContent=String(i+1).padStart(2,'0')+' / 10 · '+p.title;byId('title').textContent=p.headline;byId('desc').textContent=p.body;byId('note').textContent=p.note;byId('art').src=p.file;byId('art').alt=p.title+'，DF烟花烘焙器静态设计图';byId('original').href=p.file;pageButtons.forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));}
DATA.pages.forEach((p,i)=>{const b=node('button',p.key[0]+'  '+p.title);b.type='button';b.append(node('small',p.headline));b.addEventListener('click',()=>showPage(i));byId('pages').append(b);pageButtons.push(b);});
showPage(0);
[...new Set(DATA.model.rows.map(r=>r.emitter))].forEach(v=>{const o=node('option',v);o.value=v;byId('emitter').append(o);});
function renderRows(){
const q=byId('search').value.trim().toLowerCase(),e=byId('emitter').value,d=byId('destination').value;
const rows=DATA.model.rows.filter(r=>(!e||r.emitter===e)&&(!d||r.target.includes(d))&&(!q||JSON.stringify(r).toLowerCase().includes(q)));
byId('rows').replaceChildren();byId('count').textContent='显示 '+rows.length+' / '+DATA.model.rows.length+' 条定义 · 488 个不同键 · 归属缺失 0';
const frag=document.createDocumentFragment();
for(const r of rows){const tr=document.createElement('tr');
let td=node('td',r.short||r.label);td.append(node('small',r.label),node('code',r.key),node('small','源分组：'+r.sourceSection));tr.append(td);
td=node('td',r.emitter);td.append(node('small',r.module));tr.append(td);
tr.append(node('td',r.target));
td=node('td',r.kind+(r.unit?' · '+r.unit:''));if(r.options)td.append(node('small',JSON.stringify(r.options)));if(r.range)td.append(node('small','滑杆范围/步长 '+r.range.join(' / ')));tr.append(td);
td=document.createElement('td');td.append(node('small','分组'),node('code',r.sectionCondition||'无分组条件'),node('small','字段'),node('code',r.fieldCondition||'无独立字段条件'));tr.append(td);frag.append(tr);}
if(!rows.length){const tr=document.createElement('tr'),td=node('td','没有匹配项。清除筛选可查看全部定义。');td.colSpan=5;td.className='empty';tr.append(td);frag.append(tr);}
byId('rows').append(frag);
}
byId('search').addEventListener('input',renderRows);byId('emitter').addEventListener('change',renderRows);byId('destination').addEventListener('change',renderRows);byId('clear').addEventListener('click',()=>{for(const id of ['search','emitter','destination'])byId(id).value='';renderRows();byId('search').focus();});renderRows();
DATA.controls.forEach(c=>{const det=document.createElement('details'),sum=node('summary',c.id+' · '+c.name);const st=node('small',c.status);if(c.status.includes('新增'))st.className='status';sum.append(st);det.append(sum,node('p','去向：'+c.target),node('p',c.behavior));const src=node('p','源码：'+c.source);src.className='dim';det.append(src);byId('controlRows').append(det);});
</script></body></html>`;
fs.writeFileSync(path.join(dir,'完整右栏设计册.html'),html.replace('__DATA__',serialized));
console.log(JSON.stringify({pages:pages.length,schema:model.rows.length,controls:controls.length,bytes:fs.statSync(path.join(dir,'完整右栏设计册.html')).size}));
