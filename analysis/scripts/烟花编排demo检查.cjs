/* Browser checks for the generated design fragment, not UE playback. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');

(async () => {
  const preview = process.argv[2];
  const out = process.argv[3];
  assert(preview && out, 'usage: node 检查.cjs preview.html output-directory');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 768, height: 860 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(preview)).href);
  const frame = page.frameLocator('iframe');
  const root = frame.locator('#fw-rhythm-v1');
  await root.waitFor();
  assert.equal(await root.locator('[data-phase] option').count(), 10);
  async function seek(t) {
    await root.locator('[data-seek]').evaluate((el,t) => {
      el.value=t; el.dispatchEvent(new Event('input',{bubbles:true}));
    },t);
  }
  async function description() { return root.locator('canvas').getAttribute('aria-label'); }
  await page.screenshot({ path:path.join(out,'front-168.8.png'), fullPage:true });
  for(const w of [320,390,736,1024]) {
    await page.setViewportSize({width:w,height:850});
    await page.waitForTimeout(50);
    const size = await root.evaluate(el => ({scroll:el.scrollWidth,width:el.clientWidth}));
    assert(size.scroll<=size.width+1, `horizontal overflow at ${w}: ${JSON.stringify(size)}`);
  }
  await page.setViewportSize({width:768,height:860});
  await root.locator('[data-view]').selectOption('full');
  await seek(96.8);
  await page.screenshot({path:path.join(out,'full-96.8.png'),fullPage:true});
  await seek(118.8);
  assert.match(await description(),/坝顶0个/);
  await root.locator('[data-view]').selectOption('front');
  await page.screenshot({path:path.join(out,'interlude-118.8.png'),fullPage:true});
  await seek(197);
  assert.match(await description(),/前台0个播放实例，坝顶36个/);
  await root.locator('[data-view]').selectOption('full');
  await page.screenshot({path:path.join(out,'wall-197.png'),fullPage:true});
  // Walk every tenth of a second, including launches, fades and phase edges.
  await root.locator('[data-seek]').evaluate(el=>{
    for(let i=0;i<=2100;i++) {
      el.value=i/10;el.dispatchEvent(new Event('input',{bubbles:true}));
    }
  });
  assert.match(await description(),/前台0个播放实例，坝顶0个/);
  await root.locator('[data-phase]').selectOption('110');
  assert.match(await root.locator('[data-time]').textContent(),/^01:50.0/);
  await root.locator('[data-play]').click();
  await page.waitForTimeout(450);
  await root.locator('[data-play]').click();
  const paused=Number(await root.locator('[data-seek]').inputValue());
  assert(paused>110 && paused<112);
  await page.waitForTimeout(100);
  assert.equal(Number(await root.locator('[data-seek]').inputValue()),paused);
  await page.emulateMedia({colorScheme:'dark'});
  await root.locator('[data-view]').selectOption('front');
  await seek(168.8);
  await page.waitForTimeout(120);
  assert.match(await root.locator('[data-time]').textContent(),/^02:48.8/,'host state echo must not roll back a newer seek');
  await page.screenshot({path:path.join(out,'front-dark.png'),fullPage:true});
  await page.setViewportSize({width:320,height:850});
  await page.screenshot({path:path.join(out,'front-narrow.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  const report={pass:true,render:'Chrome headless, 2D schematic; not UE',
    viewports:[320,390,736,1024],timelineSamples:2101,checks:[
      'ten phases','front/full views','slider','phase jump','play/pause',
      'interlude dam empty','white wall 36 / front zero','all extinguished at 210',
      'no horizontal overflow','no page errors'],errors};
  fs.writeFileSync(path.join(out,'browser-check.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
