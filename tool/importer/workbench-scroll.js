// Presentation-only scroll ownership. Original controls and engine closures stay intact.
const WorkbenchScroll=(()=>{
  const KEY='df.workbench.scroll.v1';
  const pages=new Set(['asset','material','weapon','resfx','fwimp','show']);
  let root=null,active='',positions=Object.create(null);
  const current=()=>document.querySelector('.sidebar .tab.active')?.dataset.panel||'fwimp';
  function read(){
    try{
      const value=JSON.parse(sessionStorage.getItem(KEY)||'{}');
      for(const name of pages)if(Number.isFinite(value?.[name])&&value[name]>=0)positions[name]=value[name];
    }catch(_){/* Display preferences must never prevent opening the workbench. */}
  }
  function save(){
    if(!root||!pages.has(active))return;
    positions[active]=root.scrollTop;
    try{sessionStorage.setItem(KEY,JSON.stringify(positions));}catch(_){}
  }
  function init(){
    if(root)return;
    const content=document.querySelector('.content');
    if(!content)return;
    read();
    root=document.createElement('div');root.className='wb-page-scroll';
    root.tabIndex=0;root.setAttribute('role','region');root.setAttribute('aria-labelledby','wb-title');
    for(const panel of [...content.children])if(panel.matches('section[id^="panel-"]'))root.append(panel);
    content.append(root);active=current();root.scrollTop=positions[active]||0;
    root.addEventListener('scroll',save,{passive:true});
    window.addEventListener('pagehide',save);
    const original=switchPanel;
    switchPanel=function(...args){
      save();
      const before=active,result=original.apply(this,args),after=current();
      if(after!==before){active=after;root.scrollTop=positions[after]||0;}
      return result;
    };
  }
  return{init};
})();
