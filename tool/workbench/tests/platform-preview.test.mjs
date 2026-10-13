import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PLATFORMS,normalizePlatform,offMobileCueIds,mobileOnlyCueIds,platformEvents,platformSummary} from '../src/platform-preview.mjs';

const doc={cues:[{id:'a'},{id:'b',mobile:false},{id:'c',mobile:true}]};
const events=[{cueId:'a',t:1},{cueId:'b',t:2},{cueId:'b',t:3},{cueId:'c',t:4}];

test('platform ids: only pc / mobile, anything else falls back to pc',()=>{
 assert.deepEqual(Object.keys(PLATFORMS),['pc','mobile']);
 assert.equal(normalizePlatform('mobile'),'mobile');
 for(const v of ['pc',null,undefined,'','PC','phone'])assert.equal(normalizePlatform(v),'pc');
 assert.equal(PLATFORMS.pc.icon,'computer');
 assert.equal(PLATFORMS.mobile.icon,'smartphone');
});

test('PC preview keeps every event of the current tier (same array, no copy)',()=>{
 assert.equal(platformEvents(doc,events,'pc'),events);
 assert.equal(platformSummary(doc,events,'pc').hidden,0);
});

test('mobile preview hides only cues marked mobile:false, same rule as PlatformFlags 12',()=>{
 assert.deepEqual([...offMobileCueIds(doc)],['b']);
 const shown=platformEvents(doc,events,'mobile');
 assert.deepEqual(shown.map(e=>e.t),[1,4]);
 const s=platformSummary(doc,events,'mobile');
 assert.equal(s.shown,2);assert.equal(s.hidden,2);assert.equal(s.offCues,1);
 assert.match(s.message,/手游预览：2 次播放，1 个不上手机的片段已隐藏（2 次）/);
});

test('mobile preview with no off-mobile cue says it equals PC',()=>{
 const plain={cues:[{id:'a'}]};
 assert.equal(platformEvents(plain,events,'mobile'),events);
 assert.match(platformSummary(plain,events,'mobile').message,/还没有片段标为不上手机，和 PC 相同/);
});

test('App wires the switch into the context bar with Material icons and keeps delivery on full events',()=>{
 const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
 assert.match(app,/className="segmented platform-switch"/);
 assert.match(app,/MaterialSymbol name=\{platform===id\?'check':p\.icon\}/);
 assert.ok(app.indexOf('platform-switch')<app.indexOf('quality-switch'),'platform switch sits before the tier switch');
 assert.match(app,/previewEvents=useMemo\(\(\)=>platformEvents\(doc,activeEvents,platform\)/);
 assert.doesNotMatch(app,/<DeliveryPanel[^>]*previewEvents/);
});

test('mobile-only cues (手游替身, PlatformFlags 2): PC preview hides them, mobile preview shows them',()=>{
 const d={cues:[{id:'a'},{id:'b',mobile:false},{id:'m',mobile:'only'}]},ev=[{cueId:'a',t:1},{cueId:'b',t:2},{cueId:'m',t:3},{cueId:'m',t:4}];
 assert.deepEqual([...mobileOnlyCueIds(d)],['m']);
 assert.deepEqual(platformEvents(d,ev,'pc').map(e=>e.t),[1,2]);
 assert.deepEqual(platformEvents(d,ev,'mobile').map(e=>e.t),[1,3,4]);
 assert.match(platformSummary(d,ev,'pc').message,/PC 预览：2 次播放，1 个只上手游的片段已隐藏（2 次）/);
 assert.match(platformSummary(d,ev,'mobile').message,/手游预览：3 次播放，1 个不上手机的片段已隐藏（1 次），含 1 个只上手游的片段/);
 assert.match(platformSummary({cues:[{id:'a'},{id:'m',mobile:'only'}]},ev.filter(e=>e.cueId!=='b'),'mobile').message,/手游预览：3 次播放，含 1 个只上手游的片段/);
});

test('footer PC count ignores mobile-only cues',()=>{
 const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
 assert.match(app,/pcEventCount=useMemo\(\(\)=>platformEvents\(doc,activeEvents,'pc'\)\.length/);
 assert.match(app,/platform==='mobile'&&previewEvents\.length!==pcEventCount\?`（PC \$\{pcEventCount\}）`/);
});
