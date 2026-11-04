const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {JSDOM, VirtualConsole} = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '../df-fx-workbench_v2_locmai.html'), 'utf8');
const results = [], errors = [], requests = [];
const consoleChannel = new VirtualConsole();
consoleChannel.on('jsdomError', e => errors.push(e.message));
const dom = new JSDOM(source, {
  url: 'http://isolated-test.invalid/workbench', runScripts: 'dangerously',
  pretendToBeVisual: true, virtualConsole: consoleChannel,
  beforeParse(w) {
    w.fetch = async (_, options) => {
      const request = JSON.parse(options.body); requests.push(request.function);
      if (request.function !== 'GetPlatformName') throw new Error('Unmocked request: ' + request.function);
      return {ok: true, json: async () => ({success: true, data: {return_value: 'Windows'}})};
    };
    w.confirm = () => false;
  }
});
const w = dom.window, d = w.document;
const tick = () => new Promise(resolve => setTimeout(resolve, 15));
function check(name, fn) {
  try { fn(); results.push({name, passed: true}); console.log('PASS ' + name); }
  catch (error) { results.push({name, passed: false, error: error.message}); console.log('FAIL ' + name + ': ' + error.message); }
}
// Inspect the actual compiled stylesheet cascade. This is NOT a layout engine or a screenshot.
function declaration(selector, property, width) {
  let value = '';
  function visit(rules) {
    for (const rule of rules) {
      if (rule.media) {
        const query = rule.conditionText;
        if (/prefers-reduced-motion/.test(query)) continue;
        const min = query.match(/min-width\s*:\s*(\d+)px/), max = query.match(/max-width\s*:\s*(\d+)px/);
        if (min && width < Number(min[1]) || max && width > Number(max[1])) continue;
        visit(rule.cssRules);
      } else if (rule.selectorText?.split(',').map(s => s.trim()).includes(selector)) {
        if (rule.style.getPropertyValue(property)) value = rule.style.getPropertyValue(property);
      }
    }
  }
  for (const sheet of d.styleSheets) visit(sheet.cssRules);
  return value.trim();
}
function pixels(selector, property, width) {
  const value = declaration(selector, property, width);
  const variable = value.match(/^var\((--[\w-]+)\)$/);
  return parseFloat(variable ? declaration(':root', variable[1], width) : value);
}
(async () => {
  try {
    await tick();
    check('宽屏正文可读，主内容占用可用宽度，不再限宽居中', () => {
      for (const width of [1440, 1920, 2560, 3840]) {
        assert(pixels('body', 'font-size', width) >= 16, 'body font at ' + width);
        assert.equal(declaration('.content', 'max-width', width), 'none', 'content limit at ' + width);
        assert.equal(declaration('.content', 'margin', width), '0', 'auto margins at ' + width);
      }
    });
    check('桌面分栏按各页草稿流式分配，宽屏设置区不会固定450px', () => {
      for (const [selector, expected] of [['.tool-layout', .40], ['#panel-material .tool-layout', .36], ['#panel-weapon .tool-layout', .26], ['#panel-resfx .tool-layout', .31], ['#panel-show .df-layout', .32]]) {
      for (const width of [1440, 1920, 2560, 3840]) {
        const columns = declaration(selector, 'grid-template-columns', width);
        const ratios = [...columns.matchAll(/(\d+(?:\.\d+)?)fr/g)].map(m => Number(m[1]));
        assert.equal(ratios.length, 2, columns);
        const fraction = ratios[0] / (ratios[0] + ratios[1]);
        assert(Math.abs(fraction - expected) <= .01, selector + ': ' + columns);
      }
      }
    });
    check('窄屏为纵排，输入字体不会缩小，步骤仍可读', () => {
      for (const width of [390, 720, 900]) {
        assert.equal(declaration('.tool-layout', 'grid-template-columns', width), 'minmax(0,1fr)');
        assert(pixels('.wb-form input[type=text]', 'font-size', width) >= 16);
        assert(pixels('.wb-flow li', 'font-size', width) >= 14);
      }
    });
    check('资产四步、材质五步符合各自草稿，原刷新/优化入口可达', () => {
      for (const prefix of ['asset', 'mat']) {
        const name = prefix === 'mat' ? 'material' : 'asset';
        const panel = d.getElementById('panel-' + name);
        const steps = [...panel.querySelectorAll('.wb-flow li')];
        const labels = prefix === 'mat' ? ['方向', '源材质实例', '目标设置', '预览', '执行'] : ['源资产', '目标设置', '预览', '执行'];
        assert.equal(steps.length, labels.length);
        assert.deepEqual(steps.map(n => n.querySelector('.wb-flow-label').textContent), labels);
        const button = d.getElementById(prefix + '-btnPreview');
        assert(button.closest('.wb-preview-heading')?.querySelector('h2'), prefix + ' preview heading');
      }
      const preset = d.querySelector('[onclick="AssetCopier.onMobileOptimize()"]');
      assert(!preset.closest('details'), 'preset hidden behind details');
      assert(preset.closest('.tool-fieldset'), 'preset outside original execution lock');
      assert(d.getElementById('asset-ckDelGPU').closest('details.wb-options'), 'original optimizer fields missing');
    });
    check('两种配表的原预览按钮回到参数区，编排按场景/播放/时间条/数值/输出顺序', () => {
      assert(d.getElementById('weapon-btnDry').closest('.tool-input'));
      assert(d.getElementById('resfx-btnParse').closest('.tool-input'));
      const preview = d.querySelector('#panel-show .df-preview');
      const children = [...preview.children];
      assert(children.indexOf(d.getElementById('df-pattern-scene')) < children.indexOf(preview.querySelector('.df-playbar')));
      assert(children.indexOf(preview.querySelector('.df-playbar')) < children.indexOf(d.getElementById('df-pattern-timeline')));
      assert(children.indexOf(d.getElementById('df-pattern-timeline')) < children.indexOf(preview.querySelector('.df-numbers')));
      assert(children.indexOf(preview.querySelector('.df-numbers')) < children.indexOf(preview.querySelector('.df-export')));
      assert(d.getElementById('df-pattern-meta').closest('.df-preview-heading'));
    });
    const materialTable = d.getElementById('mat-previewTable');
    d.getElementById('mat-previewHead').innerHTML = ['#','源材质实例','后缀','目标材质实例','状态','源母材质','目标母材质','母材质状态'].map(label => '<th>' + label + '</th>').join('');
    d.getElementById('mat-previewBody').innerHTML = '<tr><td>1</td><td>MI_Fixture_HD</td><td>（无）</td><td>MI_Fixture_Auto</td><td>可复制</td><td>Parent_HD</td><td><input id="mat-parent_0" class="parent-input" value="/Game/Parent"></td><td>自动找到</td></tr>';
    materialTable.style.display = 'table'; await tick();
    check('材质卡片呈现保留原八列、母材质输入节点和编辑值', () => {
      const row = materialTable.querySelector('tbody tr'), input = d.getElementById('mat-parent_0');
      assert(row.classList.contains('wb-material-row'));
      assert.equal(row.cells.length, 8);
      assert.equal(row.cells[6].dataset.label, '目标母材质');
      input.value = '/Game/EditedParent';
      d.querySelector('.sidebar [data-panel="asset"]').click();
      d.querySelector('.sidebar [data-panel="material"]').click();
      assert.equal(d.getElementById('mat-parent_0'), input);
      assert.equal(input.value, '/Game/EditedParent');
      assert(input.closest('#mat-previewBody'));
    });
    const resourcePlan = d.getElementById('resfx-plan');
    resourcePlan.innerHTML = '<table><thead><tr>' + ['#','状态','平台','row_name','RowDescription','ResourceId','FXType','FxSP'].map(label => '<th>' + label + '</th>').join('') + '</tr></thead><tbody>' + ['PC','MB'].map((platform, index) => '<tr><td>' + index + '</td><td>NEW</td><td>' + platform + '</td><td><input class="resfx-edit" data-key="' + platform + '|Fixture" data-field="rowName" value="Fixture"></td><td>Fixture</td><td>Fixture</td><td>OTHER</td><td>/Game/' + platform + '_Fixture</td></tr>').join('') + '</tbody></table>'; await tick();
    check('双端主路径跟随当前行，全部可编辑字段保持原节点', () => {
      const input = resourcePlan.querySelector('[data-key="PC|Fixture"]');
      input.value = 'Edited'; input.focus();
      assert.equal(d.getElementById('wb-resource-path-value').textContent, '/Game/PC_Fixture');
      d.getElementById('wb-resfx-MB').click();
      assert.equal(d.getElementById('wb-resource-path-value').textContent, '/Game/MB_Fixture');
      assert.equal(resourcePlan.querySelector('[data-key="PC|Fixture"]'), input);
      assert.equal(input.value, 'Edited');
      assert.equal(resourcePlan.querySelectorAll('tbody td').length, 16);
      assert(d.getElementById('resfx-btnExec').disabled);
    });
    const flow = d.querySelector('#panel-asset .wb-flow');
    const sourceInput = d.getElementById('asset-src');
    const table = d.getElementById('asset-previewTable');
    check('空白数据保持空白，步骤只指示源资产', () => {
      assert.equal(sourceInput.value, '');
      assert.equal(flow.querySelector('[aria-current="step"]')?.textContent, '1源资产');
      assert.equal(table.querySelector('tbody').children.length, 0);
    });
    sourceInput.value = '/Game/IsolatedFixture';
    sourceInput.dispatchEvent(new w.Event('input', {bubbles: true})); await tick();
    check('填写源后进入设置阶段，不误报已有预览', () => {
      assert.equal(flow.querySelector('[aria-current="step"]')?.textContent, '2目标设置');
    });
    table.style.display = 'table'; table.querySelector('tbody').innerHTML = '<tr><td>isolated fixture only</td></tr>';
    d.getElementById('asset-btnExec').disabled = false; await tick();
    check('仅显示当前有效计划时指示预览', () => {
      assert.equal(flow.querySelector('[aria-current="step"]')?.textContent, '3预览');
    });
    let release;
    const inspect = w.eval('Workbench').run('检查与预览', () => new Promise(resolve => { release = resolve; })); await tick();
    check('检查或连接期间不会指示为执行复制', () => {
      assert.equal(flow.querySelector('[aria-current="step"]')?.textContent, '3预览');
    });
    release(); await inspect;
    const execution = w.eval('Workbench').run('执行任务', () => new Promise(resolve => { release = resolve; })); await tick();
    check('原执行锁生效时指示执行，所有控件仍在锁内', () => {
      assert.equal(flow.querySelector('[aria-current="step"]')?.textContent, '4执行');
      assert(d.querySelector('#panel-asset .tool-fieldset').disabled);
    });
    release(); await execution; await tick();
    check('执行结束不伪造成功，原样保留数据与门槛', () => {
      assert.equal(flow.querySelector('[aria-current="step"]')?.textContent, '3预览');
      assert.equal(sourceInput.value, '/Game/IsolatedFixture');
      assert.equal(table.querySelector('tbody').children.length, 1);
      assert(requests.every(name => name === 'GetPlatformName'));
      assert.deepEqual(errors, []);
    });
    d.getElementById('asset-ck_H').click(); await tick();
    check('目标修改使旧计划失效，步骤退回设置且不解锁执行', () => {
      assert.equal(flow.querySelector('[aria-current="step"]')?.textContent, '2目标设置');
      assert(d.getElementById('asset-btnExec').disabled);
    });
    const report = {
      date: new Date().toISOString(), passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length, results,
      network: 'All requests mocked. No browser or real UE access.',
      visualVerification: 'blocked; stylesheet and DOM checks do not verify rendered geometry'
    };
    const target = path.resolve(__dirname, process.argv[2] || 'research/design-20261005/layout-checks.json');
    assert(fs.statSync(path.dirname(target)).isDirectory()); fs.writeFileSync(target, JSON.stringify(report, null, 2));
    console.log(report.passed + ' layout checks passed; ' + report.failed + ' failed.');
    if (report.failed) process.exitCode = 1;
  } finally { dom.window.close(); }
})().catch(error => { console.error(error); dom.window.close(); process.exitCode = 1; });
