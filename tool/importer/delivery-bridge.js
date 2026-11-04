// Independent delivery entry point. Existing engine functions and legacy entry remain unchanged.
window.FwDeliveryBridge=(()=>{
  const pending=new Map();let lastState='';
  async function accept(receipt){const result=await FwImporter.acceptDelivery(receipt);if(result.queued)pending.set(receipt.deliveryId,receipt);else pending.delete(receipt.deliveryId);return result;}
  async function tick(){
    if(pending.size&&!Workbench.busy){const r=pending.values().next().value;try{await accept(r);}catch(e){pending.delete(r.deliveryId);log('交付接收失败：'+e.message,'err');}}
    const receipts=FwImporter.deliveryState(),serialized=JSON.stringify(receipts);
    if(serialized!==lastState){lastState=serialized;if(parent!==window)parent.postMessage({type:'workspace-import-state',receipts},location.origin);}
  }
  switchPanel('fwimp');
  // This new workspace has one task; all original importer controls stay available.
  document.querySelectorAll('.sidebar,.workbench-brand,.tool-nav').forEach(n=>n.hidden=true);
  const style=document.createElement('style');style.textContent='.sidebar{display:none!important}.workbench-shell{grid-template-columns:minmax(0,1fr)!important}.wb-header{display:none}';document.head.append(style);
  setInterval(()=>tick().catch(e=>log('回执同步失败：'+e.message,'err')),1500);
  return{accept,state:()=>FwImporter.deliveryState()};
})();
