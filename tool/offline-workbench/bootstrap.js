// Local resources are embedded, avoiding file:// fetch of neighboring JSON.
const embedded=JSON.parse(document.getElementById('df-offline-data').textContent);
globalThis.__DF_OFFLINE_PROJECT_TEXT__=document.getElementById('df-offline-project').textContent;
// Keep the payload out of the live DOM after loading. Besides releasing the
// duplicate text nodes, this keeps accessibility snapshots focused on controls.
for(const id of ['df-offline-data','df-offline-project','df-offline-runtime'])document.getElementById(id)?.remove?.();
const nativeFetch=globalThis.fetch.bind(globalThis);
globalThis.fetch=async function(input,options){
 const value=typeof input==='string'?input:input.url;
 const data=value.match(/(?:^|\/)data\/([A-Za-z0-9-]+)\.json(?:\?.*)?$/);
 if(data&&Object.hasOwn(embedded,data[1]))return new Response(JSON.stringify(embedded[data[1]]),{headers:{'Content-Type':'application/json'}});
 if(/(?:^|\/)music\.wav(?:\?.*)?$/.test(value)){const audio=globalThis.__DF_OFFLINE_AUDIO__;if(!audio)throw Error('原音乐未嵌入，请在节目栏重新导入');return nativeFetch(audio,options)}
 return nativeFetch(input,options);
};
