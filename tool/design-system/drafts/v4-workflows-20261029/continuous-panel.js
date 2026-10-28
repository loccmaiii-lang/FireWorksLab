/* A：连续阅读，锚点只定位，不引入互斥页签。 */
(() => {
  'use strict';
  function render(c) {
    const e=c.escape;
    function field(p) {
      const changed=c.values[p.id]!==c.initialValues[p.id];
      return `<article class="continuous-field" data-continuous-param="${e(p.id)}"><div class="field-heading"><div class="field-label">${e(p.label)}${c.english?`<small lang="en">${e(p.en)}</small>`:''}</div><div class="field-actions">${changed?'<span class="modified-dot" title="相对原配方已改"></span>':''}<button class="quiet icon-button" data-reset-param="${e(p.id)}" aria-label="还原${e(p.label)}到原配方" ${changed?'':'disabled'}>${c.icon('undo')}</button></div></div>${c.renderField(p,{hideLabel:true,instance:'continuous',hideMeta:true})}<details class="field-help" data-help="${e(p.id)}"><summary>说明</summary><p>${e(p.help)}</p></details></article>`;
    }
    const nav=`<nav class="continuous-nav" aria-label="参数组定位">${c.groups.map(g=>`<button data-anchor="${e(g.id)}">${e(g.label)}</button>`).join('')}</nav>`;
    const sections=c.groups.filter(g=>c.params.some(p=>p.group===g.id)).map(g=>{
      const params=c.params.filter(p=>p.group===g.id);
      return `<details class="continuous-section" data-section="${e(g.id)}" open><summary><h3>${e(g.label)}</h3><span>${params.length} 项</span></summary><div class="continuous-fields">${params.map(field).join('')}</div></details>`;
    }).join('');
    return nav+(c.params.length?sections:`<div class="empty-state"><strong>${c.search?'没有匹配参数':'当前没有改动参数'}</strong><p>搜索范围：当前层的四组参数。清空搜索或关闭仅改动可返回。</p></div>`);
  }
  window.PanelDesigns=window.PanelDesigns||{};
  window.PanelDesigns.continuous={render};
})();
