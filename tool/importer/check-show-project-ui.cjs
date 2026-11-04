// Isolated DOM/user-flow checks. No browser screenshots or real UE calls.
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM,VirtualConsole}=require('jsdom');
const source=fs.readFileSync(process.env.FX_SHOW_TEST_HTML||__dirname+'/../df-fx-workbench_v2_locmai.html','utf8');
assert(source.includes('id="sp-root"'),'Existing v2.13 has no unified project surface');
let passed=0;const errors=[],requests=[],copied=[];let clock=0;
function create(saved){
  const frames=new Map();let nextFrame=1;
  const channel=new VirtualConsole();channel.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(source,{url:'http://isolated-test.invalid/workbench#show',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:channel,beforeParse(w){
    if(saved)for(const [k,v] of Object.entries(saved))w.localStorage.setItem(k,v);
    w.requestAnimationFrame=fn=>{const id=nextFrame++;frames.set(id,fn);return id;};w.cancelAnimationFrame=id=>frames.delete(id);
    w.fetch=async(_,options)=>{const body=JSON.parse(options.body);requests.push(body.function);if(body.function!=='GetPlatformName')throw Error('No engine access permitted: '+body.function);return {ok:true,json:async()=>({success:true,data:{return_value:'Windows'}})};};
    Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>copied.push(text)},configurable:true});
    w.URL.createObjectURL=()=> 'blob:isolated-check';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
  }});
  return {dom,w:dom.window,d:dom.window.document,frames,advance(ms){clock+=ms;const callbacks=[...frames.values()];frames.clear();for(const callback of callbacks)callback(clock);}};
}
let ui=create();const by=id=>ui.d.getElementById('sp-'+id),tick=()=>new Promise(resolve=>setTimeout(resolve,10)),click=id=>{const e=by(id);assert(e,'missing '+id);assert(!e.disabled,'disabled '+id);e.click();},input=(id,value)=>{const e=by(id);assert(e,'missing '+id);e.value=String(value);e.dispatchEvent(new ui.w.Event('change',{bubbles:true}));},doc=()=>JSON.parse(ui.w.localStorage.getItem('df.workbench.show.project.v1')||'null')?.doc;
function check(name,fn){fn();passed++;console.log('PASS '+name);}
(async()=>{
 await tick();
 check('同一烟花编排入口可切工程、旧制作界面保留',()=>{assert.equal(ui.d.getElementById('panel-show').style.display,'block');assert(ui.d.getElementById('df-pattern-copy'));click('mode-project');assert.equal(by('root').hidden,false);assert.equal(ui.d.getElementById('df-pattern-study').style.display,'none');assert.equal(by('project-title').textContent,'空白编排工程');});
 const protectedKeys=['df.workbench.show.v1','fwimp.workbench.v2','fwimp.v1'];const before=Object.fromEntries(protectedKeys.map(k=>[k,ui.w.localStorage.getItem(k)]));
 check('导入小样先预览、当前工程不变，确认才带提案',()=>{click('sample');assert.equal(by('dialog').hidden,false);assert(by('import-summary').textContent.includes('6 个事件'));assert.equal(doc(),undefined);click('import-confirm');assert.equal(by('dialog').hidden,true);assert.equal(doc().cues.length,6);assert.equal(doc().shots.length,10);assert(by('rows').children.length===106);});
 check('初始缺ID可看计划目标，但原生复制被挡住',()=>{assert(by('checks').textContent.includes('ResourceId 为空'));assert(by('copy').disabled);assert(!by('scene').textContent.includes('空白工程'));click('range');input('range','wall');input('time',190.4);by('time').dispatchEvent(new ui.w.Event('input',{bubbles:true}));assert(by('scene').querySelector('[data-shot]'));assert.equal(by('time-label').textContent,'190.40 s');});
 check('资源ID预设只改ID，不改时间/花径/标定',()=>{click('tab-resources');const beforeDoc=doc(),r=beforeDoc.resources[0];input('resource-preset','P_EFX_FireWorks_NY_Trail_Medium');const afterDoc=doc();assert.equal(afterDoc.resources[0].resourceId,'P_EFX_FireWorks_NY_Trail_Medium');assert.deepEqual(afterDoc.shots,beforeDoc.shots);assert.equal(afterDoc.resources[0].baseRiseM,r.baseRiseM);assert.equal(afterDoc.resources[0].scaleVerified,false);});
 check('修改目标10秒起爆、飞行只倒算一次',()=>{click('tab-timeline');ui.d.querySelector('[data-item-id="open-gold"]').click();input('cue-time',12);const rows=[...by('rows').children].filter(r=>r.textContent.includes('OpenGold_'));assert.equal(rows.length,9);rows.forEach(r=>{assert.equal(r.children[2].textContent,'7.000');assert.equal(r.children[3].textContent,'12.000');});click('undo');assert.equal(doc().cues.find(c=>c.id==='open-gold').timeS,10);});
 check('完整单发飞行改8秒，白墙起爆仍190秒并显示版本过期',()=>{click('tab-shots');ui.d.querySelector('[data-item-id="wall"]').click();input('shot-flight',8);assert(by('checks').textContent.includes('版本'));click('rebind');const row=[...by('rows').children].find(r=>r.textContent.includes('白墙第1波'));assert(row.children[2].textContent.startsWith('182.000'));assert.equal(row.children[3].textContent,'190.000');assert.equal(doc().shots.find(s=>s.id==='wall').diameterM,230);input('shot-flight',5);click('rebind');});
 check('场地坝高与前台高度可编辑，世界炸高同步',()=>{click('tab-formations');by('list').querySelector('button').click();input('site-mainHeightM',170);const row=[...by('rows').children].find(r=>r.textContent.includes('白墙第1波'));assert.equal(row.children[5].textContent,'380.00');input('site-mainHeightM',150);});
 check('俯视箭头与原生Yaw的世界方向一致',()=>{input('view','top');const arrow=by('scene').querySelector('line');assert(Number(arrow.getAttribute('x2'))<Number(arrow.getAttribute('x1')));input('view','front');});
 check('合并重复小样预览冲突、取消不影响当前工程',()=>{const beforeDoc=doc();click('sample');assert(by('import-summary').textContent.includes('冲突'));click('dialog-close');assert.deepEqual(doc(),beforeDoc);});
 check('播放时钟、慢放、拖动和离开模块会暂停',()=>{input('range','opening');input('speed','0.5');click('play');ui.advance(0);ui.advance(1000);assert.equal(by('time-label').textContent,'0.50 s');ui.w.eval('switchPanel("fwimp")');assert.equal(by('play').textContent,'播放');assert.equal(ui.frames.size,0);ui.w.eval('switchPanel("show")');assert.equal(by('play').textContent,'播放');});
 check('填完ID后显式重绑，可复制同一份原生参数',()=>{click('tab-resources');const ids=doc().resources.map(r=>r.id);for(const id of ids){ui.d.querySelector('[data-item-id="'+id+'"]').click();if(!doc().resources.find(r=>r.id===id).resourceId)input('resource-id','Custom_'+id.replace(/-/g,'_'));}click('rebind');assert(!by('copy').disabled);assert(by('output-text').value.startsWith('(TemplateName='));assert(by('output-text').value.includes('LocalTimeOffset='));click('copy');});await tick();
 check('复制成功才提示已复制、输出文本与剪贴板一致',()=>{assert(copied.length>0);assert(by('output-status').textContent.includes('已复制'));assert.equal(copied.at(-1),by('output-text').value);});
 check('剪贴板失败时选中文本，不能冒称已复制',()=>{Object.defineProperty(ui.w.navigator,'clipboard',{value:{writeText:async()=>{throw Error('blocked');}},configurable:true});click('copy');});await tick();
 check('手动复制反馈与最新参数一致',()=>{assert(by('output-status').textContent.includes('自动复制未完成'));assert.equal(by('output-text').selectionStart,0);assert.equal(by('output-text').selectionEnd,by('output-text').value.length);});
 check('删除有效ID立即清掉旧输出，不能继续复制旧数据',()=>{input('resource-id','');assert(by('copy').disabled);assert.equal(by('output-text').value,'');click('undo');assert(!by('copy').disabled);});
 let rejectCopy;Object.defineProperty(ui.w.navigator,'clipboard',{value:{writeText:()=>new Promise((_,reject)=>rejectCopy=reject)},configurable:true});click('copy');input('resource-id','');rejectCopy(Error('delayed denial'));await tick();
 check('异步复制失败后不能把过期文本放回无效工程',()=>{assert.equal(by('output-text').value,'');assert(by('copy').disabled);assert(by('output-status').textContent.includes('工程已改变'));click('undo');});
 check('新建空白可撤销回完整工程，原其它存储未被改写',()=>{const n=doc().cues.length;click('new');assert.equal(doc().cues.length,0);assert.equal(doc().resources.length,0);click('undo');assert.equal(doc().cues.length,n);for(const k of protectedKeys)assert.equal(ui.w.localStorage.getItem(k),before[k]);});
 const saved={};for(let i=0;i<ui.w.localStorage.length;i++){const k=ui.w.localStorage.key(i);saved[k]=ui.w.localStorage.getItem(k);}const expected=doc();ui.dom.window.close();ui=create(saved);await tick();
 check('刷新恢复整场与引用版本、撤销历史保留',()=>{assert.deepEqual(doc(),expected);assert.equal(by('root').hidden,false);assert(!by('undo').disabled);assert(by('save-status').textContent.includes('恢复'));});
 check('每个新增控件有标签、焦点可见规则与窄屏布局声明',()=>{for(const e of by('root').querySelectorAll('input:not([type=file]),select,textarea'))assert(e.closest('label')||e.getAttribute('aria-label'),'unlabelled '+e.id);assert(source.includes('@media(max-width:640px)'));assert(source.includes(':focus-visible'));});
 check('全流程只模拟连接检测，零原生编排请求、无脚本异常',()=>{assert(requests.every(f=>f==='GetPlatformName'));assert.deepEqual(errors,[]);});
 ui.dom.window.close();console.log('All '+passed+' unified project UI checks passed');
})().catch(error=>{ui.dom.window.close();console.error(error.stack);process.exitCode=1;});
