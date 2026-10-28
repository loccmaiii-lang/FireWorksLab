/* 只切视觉与审阅元信息；原 Demo 控制器完整保留。 */
(() => {
  'use strict';
  const directions = {
    graphite:{label:'A · 石墨工作室',lead:'精密、克制，让画面与数值成为主角。',principle:'低彩度石墨表面、薄荷指示、窄边框与精确字重。方正的控件、底线式分段和刻度感数字，适合长时间制作与高密度参数操作。',shape:'控件3px、树选择2px左线、分段底线、低阴影；形状、颜色与文字共同表达状态。'},
    porcelain:{label:'B · 瓷白编辑台',lead:'明亮、从容，把复杂参数变成清晰的编辑内容。',principle:'暖瓷白纸面、深橄榄绿操作、墨色正文。少量衬线对象标题配系统黑体字段，8px控件与柔和面差，适合白天工作及逐项核对。',shape:'控件8px、白色选中条目、纸面标签、圆形播放键；用留白和字重表达结构。'},
    indigo:{label:'C · 深靛控制室',lead:'沉浸、有表现力，建立完整的夜间创作语言。',principle:'墨靛色阶、熏衣草强调、强字重数字与圆润的选中容器。模块表面替代密集线框，适合预览、编排和对外演示。',shape:'控件10px、12px选择容器、胶囊状态、轻浮层阴影；通过表面层次表达分组。'},
    baseline:{label:'V5 原版',lead:'保留原版作为比较基线。',principle:'原组件候选库的蓝灰 / 青绿主题；布局、密度和全部交互与三个草稿相同。',shape:'原版角色圆角、选中框与颜色保持。'}
  };
  const params = new URLSearchParams(location.search);
  let visual = directions[params.get('direction')] ? params.get('direction') : 'graphite';
  let previousState = '';
  const original = new WeakMap();
  const nativeReplace = history.replaceState.bind(history);
  // 原控制器切页时只维护page/density；此包装仅保留草稿视觉参数，便于刷新和复制链接。
  history.replaceState = (state,title,url) => {
    if(url){const next=new URL(url,location.href);next.searchParams.set('direction',visual);url=next.pathname+next.search+next.hash;}
    nativeReplace(state,title,url);
  };
  function write(el,value){if(el && el.textContent!==value)el.textContent=value;}
  function remember(el){if(el&&!original.has(el))original.set(el,el.textContent);}
  function sync(){
    const d=directions[visual];
    if(visual==='baseline')delete document.body.dataset.visual;else document.body.dataset.visual=visual;
    const title=document.querySelector('.demo-toolbar>strong');remember(title);write(title,visual==='baseline'?original.get(title):d.label);
    const lead=document.querySelector('.spec-lead');
    if(lead){
      const h=lead.querySelector('h1'),p=lead.querySelector('p');remember(h);remember(p);
      write(h,visual==='baseline'?original.get(h):d.label+' · 视觉语言');
      write(p,visual==='baseline'?original.get(p):d.principle+' 原布局、密度、功能与交互逻辑保持，当前为独立视觉草稿。');
      lead.parentElement.querySelectorAll('.spec-section').forEach(section=>{
        const heading=section.querySelector('h2');
        if(!heading)return;
        remember(heading);
        if(original.get(heading)==='冻结角色与真实圆角'){
          const note=section.querySelector('.helper');remember(note);
          write(heading,visual==='baseline'?original.get(heading):'角色色彩与形状语言');
          write(note,visual==='baseline'?original.get(note):d.shape+' 烟花画布固定为原中性暗底，图像和曝光不受界面主题影响。');
        }
      });
      lead.parentElement.querySelectorAll('p').forEach(p=>{
        if(p===lead.querySelector('p'))return;
        remember(p);const source=original.get(p);
        let current=source;
        if(source.startsWith('采样基线'))current=d.shape+' 烟花画布固定为原中性暗底，图像和曝光不受界面主题影响。';
        if(source.includes('冻结角色颜色'))current='语义颜色、字阶、间距、形状、焦点与减少动态效果；颜色及形状由当前方案统一定义。';
        if(source.includes('outline:none'))current='原生按钮、复选、树导航与页签键盘逻辑沿用。三套视觉均保留可见焦点；数字框和参数搜索增加2px主色轮廓，鼠标与键盘操作具有清楚的状态反馈。';
        if(source.startsWith('本稿已在真实HTTP'))current='本轮截图与交互检查对应当前独立草稿，范围和结果见本目录 README.md 与 verification.json；未将旧稿的浏览器认证转移到新方案。';
        if(source.includes('保持124画风'))current=current.replaceAll('保持124画风','使用当前方案视觉语言');
        write(p,visual==='baseline'?source:current);
      });
    }
    const page=document.querySelector('#demo-page')?.value||new URLSearchParams(location.search).get('page')||'editor';
    const density=document.body.dataset.density||'regular';
    document.title='FireWorksLab · '+d.label+' · '+page;
    const state={type:'visual-state',direction:visual,page,density};
    const signature=JSON.stringify(state);
    if(signature!==previousState){previousState=signature;if(parent!==window)parent.postMessage(state,'*');}
  }
  window.addEventListener('message',event=>{
    if(event.source!==parent||event.data?.type!=='set-visual'||!directions[event.data.direction])return;
    visual=event.data.direction;
    const url=new URL(location.href);url.searchParams.set('direction',visual);nativeReplace(null,'',url.pathname+url.search);
    sync();
  });
  let queued=false;
  new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;sync();});}}).observe(document.querySelector('#app'),{childList:true,subtree:true});
  document.addEventListener('change',()=>requestAnimationFrame(sync));
  document.addEventListener('click',()=>requestAnimationFrame(sync));
  sync();
})();
