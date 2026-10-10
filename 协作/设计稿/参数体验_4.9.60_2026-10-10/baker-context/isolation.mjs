export function isolateBaker(html,base,layout='continuous',{reference=false}={}) {
  const modes=['continuous','modules','tasks'];if(!modes.includes(layout))layout='continuous';
  const guard=`<base href="${new URL('/tool/',base).href}"><script>
  window.FW_PARAMETER_CONTEXT=true;window.FW_PARAMETER_CONTEXT_BASE=${JSON.stringify(base)};window.FW_PARAMETER_LAYOUT=${JSON.stringify(layout)};
  // 不读写生产浏览器存档、目录句柄、交付服务或 UE。只有本页内存。
  const memory=new Map([['fwb.autoBake','false'],['fwb.refOn','false']]);
  const storage={getItem:k=>memory.get(String(k))??null,setItem:(k,v)=>memory.set(String(k),String(v)),removeItem:k=>memory.delete(String(k)),clear:()=>memory.clear(),key:i=>[...memory.keys()][i]??null,get length(){return memory.size;}};
  Object.defineProperty(window,'localStorage',{value:storage});Object.defineProperty(window,'sessionStorage',{value:storage});Object.defineProperty(window,'indexedDB',{value:undefined});
  window.showDirectoryPicker=undefined;window.showSaveFilePicker=undefined;window.showOpenFilePicker=undefined;window.open=()=>null;
  // 原下载助手可能激活尚未挂到文档的链接；也禁止此类程序化导出。
  if(window.HTMLAnchorElement){const click=window.HTMLAnchorElement.prototype.click;window.HTMLAnchorElement.prototype.click=function(){if(this.download||String(this.href).startsWith('blob:'))return;return click.call(this);};}
  const read=window.fetch.bind(window);window.fetch=(input,options)=>{const url=new URL(input instanceof Request?input.url:input,document.baseURI),method=String(options?.method||(input instanceof Request?input.method:'GET')).toUpperCase();if(url.origin!==new URL(document.baseURI).origin||!['GET','HEAD'].includes(method))return Promise.reject(Error('隔离参数样板不执行交付或原生写入'));return read(input,options);};
  </script>${reference?'':`<link rel="stylesheet" href="${base}shell.css">`}`;
  if(!html.includes('initLibrary();')||!html.includes('window.__fw ='))throw Error('烘焙器接口已变化，需更新样板适配');
  // 阻止首启自动打开待验条目、烘焙和业务快捷键；保留真实实时模拟、库、预览及时间轴。
  html=html.replace('if (/[?&]fast/.test(location.search)) return;','if (window.FW_PARAMETER_CONTEXT || /[?&]fast/.test(location.search)) return;');
  html=html.replace("if (!/[?&]fast/.test(location.search)) runPreviewBake(); else state.dirty = false;","if (!window.FW_PARAMETER_CONTEXT && !/[?&]fast/.test(location.search)) runPreviewBake(); else state.dirty = false;");
  html=html.replace('async function runPreviewBake() {','async function runPreviewBake() { if (window.FW_PARAMETER_CONTEXT) { state.dirty = false; return; }');
  return html.replace('<head>','<head>'+guard).replace('</body>',`${reference?'':`<script src="${base}bridge.js"></script>`}</body>`);
}
