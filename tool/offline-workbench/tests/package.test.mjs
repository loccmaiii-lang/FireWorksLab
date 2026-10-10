import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import vm from 'node:vm';import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..'),file=process.env.DF_HTML_TEST_PATH||path.join(root,'tool','烟花编排工作台.html');
const sourceRoot=process.env.DF_SOURCE_TEST_PATH||path.join(root,'tool','workbench');
const html=await fs.readFile(file,'utf8'),report=JSON.parse(await fs.readFile(file+'.build.json','utf8'));
function script(id){const marker=`<script id="${id}" type="application/json">`,start=html.indexOf(marker);assert(start>=0);const from=start+marker.length;return html.slice(from,html.indexOf('</script>',from));}
const programme=JSON.parse(script('df-offline-project')),data=JSON.parse(script('df-offline-data'));
test('live audio uses a short Blob URL without changing the embedded bytes',async()=>{
 const {audioBlobUrl}=await import('../audio-blob.mjs');const bytes=Buffer.from([0,1,23,255]);const url=audioBlobUrl('data:audio/wav;base64,'+bytes.toString('base64'));
 try{assert(url.startsWith('blob:'));assert(url.length<200);assert.deepEqual(Buffer.from(await (await fetch(url)).arrayBuffer()),bytes)}finally{URL.revokeObjectURL(url)}
 assert.throws(()=>audioBlobUrl('https://external.invalid/audio'),/格式/);
});
test('single HTML includes all scripts and styles, no module/CSS/CDN links',()=>{assert(!/<script[^>]+\bsrc=/i.test(html));assert(!/<link[^>]+rel=["']stylesheet/i.test(html));assert(!/<script[^>]+type=["']module/i.test(html));assert(!/@import\s+["']https?:/i.test(html));assert(html.includes('自动导入 UE'));});
test('light show keeps native data/versions and musical references, excludes audio bytes',async()=>{
 const original=JSON.parse(await fs.readFile(process.env.DF_PROGRAMME_TEST_PATH||path.join(root,'协作','编排工作台资料','2026-10-10','programme','current-v1.dfshow'),'utf8'));assert.deepEqual(programme.payload.doc,original.payload.doc);assert.deepEqual(programme.payload.profiles,original.payload.profiles);assert.deepEqual(programme.payload.musicMarkers,original.payload.musicMarkers);assert.equal(programme.payload.audioRef,null);assert(!html.includes('data:audio/'));assert.equal(report.musicIncluded,false);assert(Buffer.byteLength(html)<6*1024*1024);assert.equal(programme.payload.doc.cues.length,252);assert.equal(programme.payload.doc.events.length,1689);assert.equal(programme.payload.doc.subTemplateLibrary.length,18);

});
test('all six real data files embedded; independent offline IndexedDB/key names',()=>{assert.equal(Object.keys(data).length,6);assert(data['resource-catalogue'].rows.length>=61);assert(html.includes('df-offline-director-workbench'));assert(html.includes('df-offline-workbench-v1-draft'));});

test('updates preserve v1 local storage identity and prefer saved programmes over bundled defaults',async()=>{
 assert(html.includes('df-offline-director-workbench'));assert(html.includes('df-offline-workbench-v1-draft'));assert(!html.includes('indexedDB.deleteDatabase'));
 const source=path.join(sourceRoot,'src'),app=await fs.readFile(path.join(source,'App.jsx'),'utf8');
 assert(app.indexOf('if(raw)')<app.indexOf('return seed;'));assert(app.includes('return parsed'));assert(app.includes("DRAFT_KEY+'-unrestored'"));
 const {createProgrammeSaver}=await import(pathToFileURL(path.join(source,'programme-save.mjs'))),old='local-personal-history',records=new Map([['df-offline-workbench-v1-draft-program-OLD',old]]);
 const save=createProgrammeSaver(async entries=>{for(const [k,v]of entries)records.set(k,v)},'df-offline-workbench-v1-draft',programme.payload);
 const personal=structuredClone(programme.payload);personal.doc.meta.programId='PERSONAL';personal.doc.meta.programName='接收者自己的节目';await save(personal);
 assert.equal(records.get('df-offline-workbench-v1-draft-program-OLD'),old);assert.equal(JSON.parse(records.get('df-offline-workbench-v1-draft')).doc.meta.programName,'接收者自己的节目');
});
test('built HTML checksum and original source fingerprints match',async()=>{
 assert.equal(crypto.createHash('sha256').update(html).digest('hex'),report.sha256);for(const [f,hash] of Object.entries(report.sourceFiles))assert.equal(crypto.createHash('sha256').update(await fs.readFile(path.join(sourceRoot,f),'utf8')).digest('hex'),hash,f);
});
test('inline JavaScript parses without browser module loading',()=>{const marker='<script id="df-offline-runtime">',from=html.indexOf(marker)+marker.length,js=html.slice(from,html.lastIndexOf('</script>'));new vm.Script(js);assert(js.includes('text/plain'));});
test('bootstrap retrieves local JSON and embedded audio without file:// network calls',async()=>{
 const requested=[];const boot=await fs.readFile(path.join(path.dirname(fileURLToPath(import.meta.url)),'../bootstrap.js'),'utf8');const scope={document:{getElementById:()=>({textContent:JSON.stringify({test:{ok:true}})})},Response,fetch:async(url)=>{requested.push(url);return new Response('audio')},__DF_OFFLINE_AUDIO__:'data:audio/wav;base64,AA=='};vm.createContext(scope);vm.runInContext(boot,scope);
 assert.deepEqual(await (await scope.fetch('./data/test.json')).json(),{ok:true});assert.deepEqual(requested,[]);assert.equal(await (await scope.fetch('./music.wav')).text(),'audio');assert.deepEqual(requested,['data:audio/wav;base64,AA==']);
});
test('embedded programme survives real version-file round trip; new programme is truly blank',async()=>{
 const source=path.join(sourceRoot,'src');
 const {migrateNumbering}=await import(pathToFileURL(path.join(source,'point-numbering.mjs')));
 const {preflightProject,packProject,newProgram,validateMedia}=await import(pathToFileURL(path.join(source,'program-project.mjs')));
 const seed=migrateNumbering(data['score24-v05']),initial=preflightProject(JSON.stringify(programme),seed);
 validateMedia(initial);
 const next=preflightProject(JSON.stringify(packProject(initial,seed)),seed);
 assert.deepEqual(next.doc.cues,initial.doc.cues);assert.deepEqual(next.doc.events,initial.doc.events);assert.deepEqual(next.doc.subTemplateLibrary,initial.doc.subTemplateLibrary);assert.deepEqual(next.doc.choreographyLibrary,initial.doc.choreographyLibrary);assert.deepEqual(next.profiles,initial.profiles);assert.deepEqual(next.audioRef,initial.audioRef);
 const blank=newProgram(initial,{name:'空白核对'});validateMedia(blank);assert.equal(blank.doc.cues.length,0);assert.equal(blank.doc.events.length,0);assert.equal(blank.doc.sections.length,0);assert.equal(blank.audioRef,null);assert.deepEqual(blank.musicMarkers,[]);assert.equal(blank.doc.subTemplateLibrary.length,18);
});
