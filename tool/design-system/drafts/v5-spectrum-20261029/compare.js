/* 只控制嵌入样板的呈现；值和交互仍由各自原kit/catalog管理。 */
(() => {
  'use strict';
  const component = document.querySelector('#compare-component');
  const density = document.querySelector('#compare-density');
  const frames = [...document.querySelectorAll('iframe')];
  const allowed = [...component.options].map(option => option.value);
  function apply(frame) {
    const doc = frame.contentDocument;
    if (!doc?.body) return;
    let style = doc.querySelector('#comparison-presentation');
    if (!style) { style = doc.createElement('style'); style.id = 'comparison-presentation'; doc.head.append(style); }
    const id = component.value;
    style.textContent = `.catalog{grid-template-rows:minmax(0,1fr) auto}.catalog-header,.catalog-index,.catalog-lead{display:none!important}.catalog-layout{display:block;grid-row:1;min-height:0}.catalog-main,.catalog[data-density="compact"] .catalog-main{height:100%;padding:16px 20px;scroll-padding-top:0}.catalog-section{display:none!important}.catalog-section#${id}{display:block!important;border-top:0;padding-top:0;max-width:none}.catalog-feedback{grid-row:2}.catalog-row{grid-template-columns:104px minmax(0,1fr);gap:12px 20px}.catalog-row>.u-help{grid-column:2;padding-top:0}@media(max-width:520px){.catalog-row{grid-template-columns:minmax(0,1fr)}.catalog-row>.u-help{grid-column:1}}`;
    doc.body.dataset.density = density.value;
    doc.querySelectorAll('[data-catalog-density]').forEach(button => button.setAttribute('aria-pressed', button.dataset.catalogDensity === density.value));
  }
  function update() { frames.forEach(apply); }
  frames.forEach(frame => frame.addEventListener('load', () => {
    apply(frame);
    frame.contentWindow.addEventListener('hashchange', () => {
      const id = frame.contentWindow.location.hash.slice(1);
      if (allowed.includes(id)) { component.value = id; update(); }
    });
  }));
  component.addEventListener('change', update);
  density.addEventListener('change', update);
  update();
})();
