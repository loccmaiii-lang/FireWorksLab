// Only this dedicated key is written; legacy composer and importer keys remain.
const ShowProjectStore=(()=>{
  const KEY='df.workbench.show.project.v1';
  function create(storage){
    let doc=ShowProject.blank(),undo=[],redo=[],status='空白工程',disk=null,locked=false;
    const read=()=>storage.getItem(KEY),valid=d=>{const errors=ShowProject.validate(d);if(errors.length)throw Error(errors.join('\n'));return d;};
    function reload(){
      try{const raw=read();if(!raw){disk=null;doc=ShowProject.blank();undo=[];redo=[];locked=false;status='空白工程';return true;}
        const value=ShowProjectImport.parse(raw);if(value.version!==1)throw Error('版本不支持');valid(value.doc);const clean=stack=>Array.isArray(stack)?stack.slice(-40).map(x=>({label:String(x.label).slice(0,256),doc:valid(x.doc)})):[];
        doc=ShowProject.clone(value.doc);undo=clean(value.undo);redo=clean(value.redo);disk=raw;locked=false;status='已恢复本机工程';return true;
      }catch(e){locked=true;status='存档损坏或版本不支持，原文已保留；请下载当前备份或导入有效工程。';return false;}
    }
    function save(){
      if(locked){status='存档损坏，原记录保留；当前修改未保存。';return false;}
      try{if(read()!==disk){status='另一标签页已保存新版本；当前修改未保存，请先备份再读取本机版本。';return false;}
        const text=JSON.stringify({version:1,doc,undo,redo});storage.setItem(KEY,text);disk=text;status='已保存到本机 · 第'+doc.revision+'版';return true;
      }catch(e){status='当前修改未保存（浏览器存储失败），请下载工程JSON备份。';return false;}
    }
    function change(label,fn){const previous=ShowProject.clone(doc),draft=ShowProject.clone(doc),next=fn(draft)||draft;valid(next);if(ShowProject.fingerprint(previous)===ShowProject.fingerprint(next))return false;next.revision=Math.max(previous.revision||0,next.revision||0)+1;undo.push({label,doc:previous});undo=undo.slice(-40);redo=[];doc=next;save();return true;}
    function travel(from,to){if(!from.length)return false;const old=from.pop();to.push({label:old.label,doc:ShowProject.clone(doc)});doc=old.doc;save();return true;}
    function replaceDamaged(next){valid(next);if(!locked)return change('导入恢复',()=>next);const raw=read();const backupKey=KEY+'.damaged.'+Date.now();try{storage.setItem(backupKey,raw||'');}catch{status='损坏存档无法备份；请先导出原文后重试，未覆盖。';return false;}disk=raw;locked=false;return change('恢复损坏存档',()=>next);}
    reload();
    return {get doc(){return ShowProject.clone(doc);},get status(){return status;},get canUndo(){return undo.length>0;},get canRedo(){return redo.length>0;},get locked(){return locked;},change,save,reload,undo:()=>travel(undo,redo),redo:()=>travel(redo,undo),replaceDamaged};
  }
  return {KEY,create};
})();
