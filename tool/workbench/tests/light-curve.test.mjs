import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {buildLightDelivery,lightPackFiles,lightEvents,pyRound,_pyRandomForTest} from '../src/light-curve-model.mjs';
import {LIGHT_RIG} from '../src/light-rig.mjs';
import {zipStore} from '../src/zip-store.mjs';

// 16.0.40 交付页「灯光」：JS 模型必须和同事交接的 Python（tool/fwlight/lib/light_model.py）逐键一致。
// 夹具 = 交接包 v13 编排（精简字段）；期望 = 10-15 写进 UE 的 SpotLight2（tool/fwlight/baseline）。
const v13=JSON.parse(fs.readFileSync(new URL('./fixtures/light-v13-slim.json',import.meta.url)));
const written=JSON.parse(fs.readFileSync(new URL('../../fwlight/baseline/keys_SpotLight2_written_20261015.json',import.meta.url)));
const pack=buildLightDelivery(v13,{programme:{name:'v13'}});

test('随机相位与 Python random.Random(20261231) 相同、取整按五成双',()=>{
 const r=_pyRandomForTest(20261231);
 assert.deepEqual([r(),r(),r()],[0.7993999292585939,0.2699543961963634,0.9488176925801705]);
 assert.deepEqual([pyRound(2.675,2),pyRound(0.0625,3),pyRound(1.0625,3),pyRound(-1.0625,3),pyRound(16.0785,3)],[2.67,0.062,1.062,-1.062,16.078]);
});

test('v13 编排 → SpotLight2 与 10-15 写进 UE 的曲线逐键相同',()=>{
 const got=pack.files['keys_SpotLight2.json'];
 assert.equal(lightEvents(v13).length,936,'PC 去掉只上手游的替身');
 assert.deepEqual(got.intensity,written.intensity);
 for(const c of 'RGBA')assert.deepEqual(got.color[c],written.color[c],c);
 assert.equal(got.interp,'linear');assert.equal(got.fps,30);
});

test('四盏灯：SpotLight / SpotLight3 复用 SpotLight2，SkyLight = ×0.003846，峰值 6.92 ≤ 10',()=>{
 assert.deepEqual(pack.rows.map(r=>[r.light,r.binding,r.component]),[['SpotLight2','SpotLight2','LightComponent0'],['SpotLight','SpotLight','LightComponent0'],['SpotLight3','SpotLight3','LightComponent0'],['SkyLight','SkyLight','SkyLightComponent0']]);
 const sky=pack.files['keys_SkyLight.json'],main=pack.files['keys_SpotLight2.json'];
 assert.deepEqual(sky.intensity.keys.slice(0,50),main.intensity.keys.slice(0,50).map(([f,v])=>[f,pyRound(v*0.003846,6)]));
 assert.equal(pack.rows[3].peak,6.9228);assert.deepEqual(pack.errors,[]);
 assert.deepEqual(sky.color,main.color,'颜色同 SpotLight2');
});

test('天光峰值按输入缩放；超过 10 拦下',()=>{
 const ten=buildLightDelivery(v13,{skyPeak:10});
 assert.equal(ten.rows[3].peak,10);assert.deepEqual(ten.errors,[]);
 const over=buildLightDelivery(v13,{skyPeak:12});
 assert.match(over.errors.join(),/SkyLight 峰值 12\.00 超过上限 10/);
 assert.equal(over.rows[0].peak,1800,'只动天光');
});

test('编排用了关卡里没有的发射点：直接报错，不静默跳过',()=>{
 const bad=structuredClone(v13);bad.events[0].pointId='P99';
 assert.throws(()=>buildLightDelivery(bad,{}),/关卡中缺少发射点：P99/);
});

test('交付包：manifest + 四个 keys + 说明，ZIP 结构完整',()=>{
 const files=lightPackFiles(pack),names=Object.keys(files);
 assert.deepEqual(names,['manifest.json','keys_SpotLight2.json','keys_SpotLight.json','keys_SpotLight3.json','keys_SkyLight.json','使用说明.txt']);
 const man=JSON.parse(files['manifest.json']);
 assert.equal(man.format,'fwlight.pack/1');assert.equal(man.sequence.asset,LIGHT_RIG.sequence.asset);assert.equal(man.lights.length,4);
 const zip=zipStore(files,{folder:'light',now:new Date(2026,9,15,23,0,0)}),dv=new DataView(zip.buffer);
 const end=zip.length-22;assert.equal(dv.getUint32(end,true),0x06054b50);assert.equal(dv.getUint16(end+10,true),6);
 assert.equal(dv.getUint32(0,true),0x04034b50);
});
