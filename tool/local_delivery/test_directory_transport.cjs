const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const channel='12345678-1234-4234-8234-123456789abc',origin='http://127.0.0.1:8034';
function fixture(ancestors=['null','null']){
  const messages=[],calls=[],listeners={};let rotate=false;
  const parent={postMessage:(data,target)=>messages.push({data,target})};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'directory-transport.js'),'utf8'),{
    window:{addEventListener:(t,f)=>listeners[t]=f},parent,location:{hash:'#'+channel,origin,ancestorOrigins:ancestors},document:{referrer:''},Blob,
    fetch:async(p,o)=>{calls.push({p,o});if(rotate&&o.method){rotate=false;return{status:403,ok:false,json:async()=>({})};}
      return{status:200,ok:true,json:async()=>p==='/api/session'?{token:'secret',outputRoot:'root'}:{resources:[],done:true}};}
  });
  const send=async(p,body,id='request-'+messages.length,who=parent,from='null',ch=channel)=>{
    await listeners.message({source:who,origin:from,data:{type:'directory-request',channel:ch,id,path:p,body,contentType:'application/json'}});
    return messages.findLast(m=>m.data.id===id)?.data;
  };
  return{send,calls,messages,rotate(){rotate=true}};
}
(async()=>{
  let f=fixture();let r=await f.send('/api/session');assert.equal(r.ok,true);assert.equal(r.value.token,undefined);assert(!JSON.stringify(f.messages).includes('secret'));
  await f.send('/api/output-root',{outputRoot:'root'});assert.equal(f.calls.at(-1).o.headers['X-Workspace-Token'],'secret');console.log('PASS credentials stay in same-origin directory transport');
  const n=f.calls.length;
  for(const p of ['/gpcli/object/call','/api/session/evil','https://evil.test','/api/deliveries/../../anything'])assert.equal(await f.send(p,{}),undefined);
  assert.equal(await f.send('/api/resources',undefined,'bad',{}),undefined);assert.equal(await f.send('/api/resources',undefined,'bad2',undefined,'https://evil.test'),undefined);assert.equal(f.calls.length,n);console.log('PASS no arbitrary paths, external sources or UE commands');
  f.rotate();r=await f.send('/api/output-root',{outputRoot:'root'});assert.equal(r.ok,true);assert.equal(f.calls.filter(x=>x.p==='/api/session').length,2);console.log('PASS service token rotation recovers without changing importer');
  f=fixture(['null','https://evil.test']);assert.equal(await f.send('/api/session'),undefined);assert.equal(f.calls.length,0);console.log('PASS sandboxed remote ancestors cannot use local directory channel');
  console.log('4 directory transport groups passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
