// Studies remain separate from the accepted library and from production storage.
{
  const a=document.createElement('a');a.href='../studies/filaments/index.html';a.textContent='四尺玉 · 连续尾丝第三版对照 ↗';a.className='btn';a.style.cssText='display:block;text-align:center;margin:8px 0;color:#e8be80';
  const host=document.getElementById('qualityPanel');if(host)host.prepend(a);
  const q=new URLSearchParams(location.search),id=q.get('study'),i=Number(q.get('layer')||0);
  if(STUDY_RECIPES[id]?.layers[i]){
    const d=studyLayerParams(id,i,4096);state.P=d.P;state.M=d.M;state.name=id+'_'+STUDY_RECIPES[id].layers[i].id;
    state.activeStage=0;state.repId=null;state.ref.mode=0;state.t=0;state.playing=true;
    buildMasterPanel();syncQualityUI();syncExport();onParam();flash(STUDY_RECIPES[id].name+' / '+STUDY_RECIPES[id].layers[i].name+'：实验配方，可调参重新烘焙。');
  }
}
