// 复用当前生成的烘焙器外壳；改写仅存在于这个隔离 iframe 的 srcdoc。
import {isolateBaker} from './isolation.mjs';
const frame=document.getElementById('baker');
try {
  const response=await fetch('/tool/FireworkBaker.html',{cache:'no-cache'});
  if(!response.ok)throw Error('当前烘焙器页面读取失败：'+response.status);
  const query=new URL(location.href).searchParams;
  frame.srcdoc=isolateBaker(await response.text(),new URL('.',location.href).href,query.get('layout'),{reference:query.get('reference')==='1'});
} catch(error){frame.hidden=true;const message=document.getElementById('failure');message.hidden=false;message.textContent=error.message;}
window.addEventListener('message',event=>{
  if(event.source!==frame.contentWindow||event.data?.channel!=='baker-parameter-context')return;
  if(event.data.kind==='layout'){
    const url=new URL(location.href);url.searchParams.set('layout',event.data.layout);history.replaceState(null,'',url);
    document.title=event.data.title+' · 烟花烘焙器参数方案';
  }
});
