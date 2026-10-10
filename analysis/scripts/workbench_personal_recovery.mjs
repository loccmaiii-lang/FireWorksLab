// 文件和模型层的隔离恢复检查；不替代真实 file 浏览器或 IndexedDB 验收。
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {migrateNumbering} from '../../tool/workbench/src/point-numbering.mjs';
import {saveSubTemplate} from '../../tool/workbench/src/subtemplate-model.mjs';
import {compatiblePoints, saveChoreography, placeChoreography} from '../../tool/workbench/src/choreography-model.mjs';
import {newProgram, packProject, preflightProject, validateMedia} from '../../tool/workbench/src/program-project.mjs';
import {parseBackup} from '../../tool/workbench/src/workbench-data.mjs';
import {createProgrammeSaver} from '../../tool/workbench/src/programme-save.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output=path.resolve(process.argv[2]||path.join(root,'analysis/local/WORKBENCH_ROUNDTRIP/personal-recovery'));
const seed=migrateNumbering(JSON.parse(await fs.readFile(path.join(root,'tool/workbench/public/data/score24-v05.json'),'utf8')));
const original=await fs.readFile(path.join(root,'tool/workbench/fixtures/demo.dfshow'),'utf8');
const initial=preflightProject(original,seed), sourceBefore=JSON.stringify(initial);
let personal=newProgram(initial,{name:'离线覆盖恢复核对 · 个人测试',id:'QA_PERSONAL_RECOVERY',duration:120});
const template=structuredClone(personal.doc.templateLibrary.find(t=>t.id==='P_LIME'));
template.id='QA_PERSONAL_FLOWER';
const recipe=structuredClone(personal.doc.subTemplateLibrary.find(r=>r.key===template.subTemplateRef));
Object.assign(recipe,{id:'ST_QA_PERSONAL_FLOWER',engineId:'ST_QA_PERSONAL_FLOWER',name:'自建青柠 · 恢复核对'});
delete recipe.key;delete recipe.version;
recipe.entries[0].native.RandomScaleRatio=.12;
personal.doc.templateLibrary.push(template);
personal.doc=saveSubTemplate(personal.doc,template.id,recipe);
const savedTemplate=personal.doc.templateLibrary.find(t=>t.id===template.id);
const points=compatiblePoints(personal.doc,savedTemplate).slice(0,3);
assert.equal(points.length,3);
const pattern={id:'QA_PERSONAL_PATTERN',name:'自建扩散 · 恢复核对',calls:[{id:'QA_CALL',label:'自建花型',templateId:template.id,recipeRef:savedTemplate.subTemplateRef,pointIds:points,offsetS:0,order:'center-out',gap:.1,profiles:{medium:points.slice(0,2),low:points.slice(0,1)}}]};
personal.doc=saveChoreography(personal.doc,pattern);
personal=placeChoreography(personal,personal.doc.choreographyLibrary.at(-1),{anchorShowS:20});

// 一秒有效 PCM WAV，只用于恢复核对，不使用或改写用户音乐。
const samples=22050,wav=Buffer.alloc(44+samples*2);
wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
wav.writeUInt32LE(samples,24);wav.writeUInt32LE(samples*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);
wav.write('data',36);wav.writeUInt32LE(samples*2,40);
for(let i=0;i<samples;i++)wav.writeInt16LE(Math.round(Math.sin(i/samples*2*Math.PI*220)*1000),44+i*2);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
personal.audioRef={kind:'embedded',name:'恢复核对.wav',duration:1,sha256:sha(wav),dataUrl:'data:audio/wav;base64,'+wav.toString('base64')};
personal.musicData={title:'恢复核对.wav',duration:1,waveform:[.1,.2,.1]};
personal.structureData={energy:[.5,1,.5],energyStep:1/3};
personal.musicMarkers=[{id:'QA_MUSIC',time:.2}];
Object.assign(personal.doc.meta,{musicStatus:'loaded',musicDuration:1,musicTitle:'恢复核对.wav',musicSourceSha256:sha(wav)});
validateMedia(personal);
await fs.mkdir(output,{recursive:true});
const file=path.join(output,'个人恢复核对.dfshow');
await fs.writeFile(file,JSON.stringify(packProject(personal,seed,{version:1})), 'utf8');
const restored=preflightProject(await fs.readFile(file,'utf8'),seed);
const second=path.join(output,'个人恢复核对_再次保存.dfshow');
await fs.writeFile(second,JSON.stringify(packProject(restored,seed,{version:2})), 'utf8');
const again=preflightProject(await fs.readFile(second,'utf8'),seed);
for(const state of [restored,again]){
  validateMedia(state);
  for(const key of ['cues','events','templateLibrary','subTemplateLibrary','choreographyLibrary'])assert.deepEqual(state.doc[key],personal.doc[key]);
  for(const key of ['profiles','audioRef','musicData','structureData','musicMarkers'])assert.deepEqual(state[key],personal[key]);
  assert.equal(sha(Buffer.from(state.audioRef.dataUrl.split(',')[1],'base64')),state.audioRef.sha256);
}
// 这里只验证保存器批次和身份隔离，明确不是浏览器 IndexedDB。
const key='df-offline-workbench-v1-draft',records=new Map([[key+'-program-OLD','保留的旧节目']]);
const saver=createProgrammeSaver(async entries=>{for(const [k,v]of entries)records.set(k,v)},key,seed);
await saver(personal);
const oldSnapshot=records.get(key+'-program-QA_PERSONAL_RECOVERY');
await saver(newProgram(personal,{name:'另一节目',id:'QA_SECOND',duration:120}));
assert.equal(records.get(key+'-program-QA_PERSONAL_RECOVERY'),oldSnapshot);
assert.equal(records.get(key+'-program-OLD'),'保留的旧节目');
assert.deepEqual(parseBackup(oldSnapshot,seed).audioRef,personal.audioRef);
assert.equal(JSON.stringify(initial),sourceBefore);
await fs.writeFile(path.join(output,'恢复核对.wav'),wav);
const receipt={format:'df.personal-recovery-check/1',time:new Date().toISOString(),checks:{programmeFileRoundtrip:true,customFlower:true,customChoreography:true,fixedVersionReferences:true,threeTiers:true,audioBytes:true,musicMarkers:true,saverIdentityIsolation:true,originalUnchanged:true},cues:personal.doc.cues.length,events:personal.doc.events.length,audioSha256:sha(wav),programmeSha256:sha(await fs.readFile(file)),browserIndexedDBTested:false,fileBrowserTested:false};
await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
