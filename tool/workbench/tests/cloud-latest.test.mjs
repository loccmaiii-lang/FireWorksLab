import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {migrateNumbering} from '../src/point-numbering.mjs';
import {packProject,preflightProject} from '../src/program-project.mjs';
import {makeBackup} from '../src/workbench-data.mjs';
import {CLOUD_FORMAT,CLOUD_MARK,nextVersion,validateCloudLatest,shouldLoadCloud,loadCloudLatest} from '../src/cloud-latest.mjs';
const seed=migrateNumbering(JSON.parse(fs.readFileSync(new URL('../public/data/score24-v05.json',import.meta.url))));
const MUSIC='a'.repeat(64),OTHER='b'.repeat(64);
function cloudOf(version='16.0.9',name='B01长冈式'){
 const state=structuredClone(seed);state.doc.meta={...state.doc.meta,programName:'云端节目',programId:'CLOUD_TEST'};
 const project=packProject(state,seed,{version:7});project.payload.audioRef={kind:'bundled'};
 const text=JSON.stringify(project);
 return {format:CLOUD_FORMAT,version,name,note:'',programmeSha256:crypto.createHash('sha256').update(text).digest('hex'),musicSha256:MUSIC,musicTitle:'汪洋与浩渺',project};
}
function store(initial={}){
 const data=new Map(Object.entries(initial)),batches=[];
 return {data,batches,read:async key=>data.get(key),writeBatch:async entries=>{batches.push(entries);for(const [k,v] of entries)data.set(k,v)}};
}
const fetchOf=cloud=>async()=>cloud?{ok:true,json:async()=>cloud}:{ok:false,json:async()=>{throw Error('404')}};
const userState=(audioSha)=>{const s=structuredClone(seed);s.doc.meta={...s.doc.meta,programName:'我的节目'};if(audioSha)s.audioRef={kind:'embedded',name:'汪洋与浩渺.wav',duration:210,sha256:audioSha,dataUrl:'data:audio/wav;base64,AAAA'};return s};

test('version numbers only move forward one patch step',()=>{
 assert.equal(nextVersion('16.0.8'),'16.0.9');assert.equal(nextVersion('16.0.9'),'16.0.10');
 assert.throws(()=>nextVersion('16.0'),/版本号/);assert.throws(()=>nextVersion(''),/版本号/);
});
test('missing cloud data keeps the current programme untouched',async()=>{
 const s=store(),state=userState();
 const result=await loadCloudLatest({seed,state,raw:'x',draftKey:'d',read:s.read,writeBatch:s.writeBatch,fetcher:fetchOf(null)});
 assert.equal(result,state);assert.equal(s.batches.length,0);
});
test('first refresh without a draft loads the cloud programme, stores it and remembers the version',async()=>{
 const s=store(),cloud=cloudOf();
 const result=await loadCloudLatest({seed,state:seed,raw:null,draftKey:'d',read:s.read,writeBatch:s.writeBatch,fetcher:fetchOf(cloud),now:()=>'T'});
 assert.equal(result.doc.meta.programName,'云端节目');assert.equal(result.doc.meta.cloudVersion,'16.0.9');assert.equal(result.doc.meta.cloudName,'B01长冈式');
 assert.equal(result.cloudNotice.kind,'info');assert.equal(result.cloudNotice.persist,true);assert.match(result.cloudNotice.message,/16\.0\.9 · B01长冈式/);assert.doesNotMatch(result.cloudNotice.message,/备份/);
 assert.deepEqual(s.batches[0].map(([k])=>k),['d','d-program-CLOUD_TEST','d'+CLOUD_MARK]);
 assert.deepEqual(JSON.parse(s.data.get('d'+CLOUD_MARK)),{version:'16.0.9',name:'B01长冈式',programmeSha256:cloud.programmeSha256,loadedAt:'T'});
 // 存进浏览器的就是刷新后会再读到的节目
 assert.equal(JSON.parse(s.data.get('d')).doc.meta.cloudVersion,'16.0.9');
});
test('an existing draft is backed up to the recovery slot and a per-version slot before loading',async()=>{
 const mine=userState(),raw=JSON.stringify(makeBackup(mine,seed)),s=store({d:raw}),cloud=cloudOf();
 const result=await loadCloudLatest({seed,state:mine,raw,draftKey:'d',read:s.read,writeBatch:s.writeBatch,fetcher:fetchOf(cloud)});
 assert.equal(s.data.get('d-recovery'),raw);assert.equal(s.data.get('d-before-cloud-16.0.9'),raw);
 assert.match(result.cloudNotice.message,/恢复切换前节目/);assert.equal(result.doc.meta.programName,'云端节目');
});
test('the same cloud programme loads only once, so later own edits survive refresh',async()=>{
 const cloud=cloudOf(),s=store({['d'+CLOUD_MARK]:JSON.stringify({version:'16.0.9',programmeSha256:cloud.programmeSha256})}),mine=userState();
 const result=await loadCloudLatest({seed,state:mine,raw:'raw',draftKey:'d',read:s.read,writeBatch:s.writeBatch,fetcher:fetchOf(cloud)});
 assert.equal(result,mine);assert.equal(s.batches.length,0);
 assert.equal(shouldLoadCloud(cloudOf('16.0.10'),{programmeSha256:'old'}),true);
});
test('music already imported with the same sha256 is reused; a different song is not',async()=>{
 const cloud=cloudOf();
 const same=await loadCloudLatest({seed,state:userState(MUSIC),raw:'r',draftKey:'d',read:store().read,writeBatch:store().writeBatch,fetcher:fetchOf(cloud)});
 assert.equal(same.audioRef.kind,'embedded');assert.equal(same.audioRef.sha256,MUSIC);
 const other=await loadCloudLatest({seed,state:userState(OTHER),raw:'r',draftKey:'d',read:store().read,writeBatch:store().writeBatch,fetcher:fetchOf(cloud),offline:true});
 assert.deepEqual(other.audioRef,{kind:'bundled'});assert.match(other.cloudNotice.message,/导入《汪洋与浩渺》/);
});
test('a cloud programme with its own embedded audio (--keep-music) plays that audio by default, offset and waveform included',async()=>{
 // 22 10-13：B03 的节目音频是 VO 合并音频（不是仓库原曲），随编排一起发；刷新后不该退回 music.wav
 const state=structuredClone(seed),bytes=Buffer.from('ID3 merged vo mix'),sha=crypto.createHash('sha256').update(bytes).digest('hex');
 state.doc.meta={...state.doc.meta,programName:'云端节目',programId:'CLOUD_TEST',musicOffset:0,musicSourceSha256:sha,musicTitle:'VO倒计时+汪洋与浩渺',musicStatus:'embedded'};
 Object.assign(state,{audioRef:{kind:'embedded',name:'VO倒计时+汪洋与浩渺.mp3',duration:211.644,sha256:sha,dataUrl:'data:audio/mpeg;base64,'+bytes.toString('base64')},
  musicData:{title:'VO倒计时+汪洋与浩渺',duration:211.644,waveform:[0.1,1]},structureData:{energy:[0.2,1],energyStep:0.25}});
 const project=packProject(state,seed,{version:7}),text=JSON.stringify(project);
 const cloud={format:CLOUD_FORMAT,version:'16.0.25',name:'B03',note:'',programmeSha256:crypto.createHash('sha256').update(text).digest('hex'),musicSha256:sha,musicTitle:'VO倒计时+汪洋与浩渺',musicEmbedded:true,project};
 for(const previous of [userState(MUSIC),userState()]){
  const result=await loadCloudLatest({seed,state:previous,raw:'r',draftKey:'d',read:store().read,writeBatch:store().writeBatch,fetcher:fetchOf(cloud)});
  assert.equal(result.audioRef.kind,'embedded');assert.equal(result.audioRef.sha256,sha);assert.equal(result.audioRef.dataUrl,state.audioRef.dataUrl);
  assert.equal(result.doc.meta.musicOffset,0);assert.deepEqual(result.musicData.waveform,[0.1,1]);assert.deepEqual(result.structureData.energy,[0.2,1]);
 }
});
test('invalid cloud data or a failed save never silently drops the current programme',async()=>{
 const mine=userState(),bad={...cloudOf(),programmeSha256:'x'};
 const rejected=await loadCloudLatest({seed,state:mine,raw:'r',draftKey:'d',read:store().read,writeBatch:store().writeBatch,fetcher:fetchOf(bad)});
 assert.equal(rejected.doc.meta.programName,'我的节目');assert.equal(rejected.cloudNotice.kind,'error');
 const wrongSource=cloudOf();wrongSource.project.payload.sourceSha='other';
 const invalid=await loadCloudLatest({seed,state:mine,raw:'r',draftKey:'d',read:store().read,writeBatch:store().writeBatch,fetcher:fetchOf(wrongSource)});
 assert.equal(invalid.doc.meta.programName,'我的节目');assert.match(invalid.cloudNotice.message,/未通过校验/);
 const failed=await loadCloudLatest({seed,state:mine,raw:'r',draftKey:'d',read:async()=>undefined,writeBatch:async()=>{throw Error('quota')},fetcher:fetchOf(cloudOf())});
 assert.equal(failed.cloudNotice.kind,'error');assert.match(failed.cloudNotice.message,/再载入一次/);
});
test('the published cloud-latest data, when present, is valid and opens like a programme file',()=>{
 const file=new URL('../public/data/cloud-latest.json',import.meta.url);if(!fs.existsSync(file))return;
 const cloud=validateCloudLatest(JSON.parse(fs.readFileSync(file,'utf8')));
 const text=JSON.stringify(cloud.project);assert.equal(crypto.createHash('sha256').update(text).digest('hex'),cloud.programmeSha256);
 // 云端编排默认不内嵌音乐；只有节目音频不是仓库原曲时（publish-show --keep-music，22 10-13 起）才带，且字节、指纹、声明三者一致
 const audio=cloud.project.payload.audioRef;
 if(audio?.dataUrl===undefined)assert.notEqual(cloud.musicEmbedded,true);
 else{
  const bundled=JSON.parse(fs.readFileSync(new URL('../public/data/music-data.json',import.meta.url),'utf8')).sourceSha256;
  assert.equal(cloud.musicEmbedded,true,'内嵌音乐要用 --keep-music 发布');assert.equal(audio.kind,'embedded');assert.equal(audio.sha256,cloud.musicSha256);
  assert.notEqual(audio.sha256,bundled,'仓库原曲不内嵌');assert.equal(cloud.project.payload.doc.meta.musicSourceSha256,audio.sha256);
  assert.equal(crypto.createHash('sha256').update(Buffer.from(audio.dataUrl.split(',')[1],'base64')).digest('hex'),audio.sha256);
 }
 const state=preflightProject(text,seed);assert.equal(state.doc.cues.length,cloud.cues);assert.equal(state.doc.events.length,cloud.events);
 const version=fs.readFileSync(new URL('../src/connection.mjs',import.meta.url),'utf8').match(/WORKBENCH_VERSION='([^']+)'/)[1];
 const n=v=>v.split('.').map(Number),[a,b]=[n(cloud.version),n(version)];
 // 16.0.19 起云端可以「只换编排」（release.py --data-only）：编排号比工具号新，但必须记明它挂在哪个工具版本上，而且就是现在这个
 if(cloud.publishMode==='data-only'){assert.equal(cloud.appVersion,version,'只换编排的云端编排要挂在当前工具版本上');return}
 assert(a[0]<b[0]||a[0]===b[0]&&(a[1]<b[1]||a[1]===b[1]&&a[2]<=b[2]),'云端编排版本号不能比工作台新（只改工具时工作台先 +1，编排沿用上一版）');
});
