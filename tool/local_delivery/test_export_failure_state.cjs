const assert=require('node:assert/strict');const {fixture}=require('./test_baker_handoff.cjs');
(async()=>{
 const f=fixture();await f.api.publish(new Blob(['ZIP']),'Test',{});
 await f.api.beginExport('directory');f.api.exportFailed(Error('名称冲突'));f.api.finishExport();
 assert.match(f.node('deliveryStatus').textContent,/本次未导出.*旧修订/s);
 assert.equal(f.node('deliveryFrame').inert,true,'失败旧清单不能误确认或执行');
 f.state({busy:false,current:{deliveryId:'known',name:'Test',platform:'pc'}});
 assert.equal(f.node('deliveryFrame').inert,true,'回执刷新不能解除失败门禁');
 f.recover();assert.equal(f.node('deliveryFrame').hidden,true,'子页面重连不能显示失败后的旧清单');
 await f.api.publish(new Blob(['NEW']),'Test',{});
 assert.equal(f.node('deliveryFrame').inert,false,'本次新交付成功后恢复操作');
 const receipt=(id,sha)=>({deliveryId:id,name:'Same',revisionId:id,directory:'F:/fixture',files:[{path:'PC/T_Same.png',sha256:sha}],packages:[],thumbnail:{status:'missing'}});
 const latest=fixture({resourceReceipts:[receipt('old','old-sha'),receipt('new','new-sha')]});await latest.api.open();
 assert.equal(latest.api.knownTextures().get('T_Same.png').sha256,'new-sha','同名资源读取最新修订，不能读取最早快照');
 console.log('6 导出失败旧清单隔离、成功恢复与最新指纹检查通过。');
})().catch(e=>{console.error(e);process.exitCode=1;});
