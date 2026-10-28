/* 只读取随稿的候选规范，不读取用户文件或外部服务。 */
(() => {
  'use strict';
  const target=document.querySelector('#standard-table');
  const summary=document.querySelector('#map-summary');
  const filter=document.querySelector('#map-filter');
  if(!target)return;
  const escape=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  fetch('standards-map.json').then(response=>{if(!response.ok)throw Error();return response.json();}).then(data=>{
    const sources=Array.isArray(data.sources)?data.sources:Object.entries(data.sources).map(([id,value])=>({id,...value}));
    function draw(){
      const rows=data.components.filter(component=>filter.value==='all'||component.classification===filter.value);
      summary.textContent=`显示${rows.length}/29类 · 8类Material参考，14类桌面适配，7类领域自定义。分类表示参考方式，非实现或验收进度。`;
      target.innerHTML=rows.map(component=>{
        const decisions=component.decisions||{};
        const entries=Object.entries(decisions).map(([type,values])=>`<li><strong>${({keep:'保留',merge:'合并',specialize:'专用'})[type]||escape(type)}：</strong>${escape(Array.isArray(values)?values.join('；'):values)}</li>`).join('');
        const refs=(component.reference_ids||[]).map(id=>sources.find(source=>source.id===id)).filter(Boolean).map(source=>`<a href="${escape(source.url)}" target="_blank" rel="noreferrer">${escape(source.title||source.name||source.id)}</a>`).join('');
        return `<article class="map-row"><h3><span class="map-id">${escape(component.id)}</span>${escape(component.name)}</h3><span class="classification">${escape(component.classification)}</span><div class="map-detail"><p>${escape(component.rationale)}</p><details><summary>查看保留、合并与验收点</summary><ul>${entries}</ul><p>${escape(Array.isArray(component.acceptance)?component.acceptance.join('；'):component.acceptance)}</p><div class="source-links">${refs}</div></details></div></article>`;
      }).join('');
    }
    filter.addEventListener('change',draw);draw();
  }).catch(()=>{summary.textContent='规范映射尚未载入。请使用HTTP预览入口，或直接阅读同目录standards-map.json。';});
})();
