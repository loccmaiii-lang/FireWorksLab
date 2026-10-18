// 工作台 16.0.48 成品计数（Node，用工作台自己的代码）：读 public/data/cloud-latest.json 的节目 → preflightProject（同打开节目）→ 各档 qualityEvents → 平台预览过滤。
// 本机 8025 已被一个身份未验证的旧 Vite 占用（preflight 拒绝），HTTP 实页走查没做；这一份只能证明数据和计数，不证明页面呈现。
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const W = p => pathToFileURL(path.join(R, 'tool/workbench/src', p)).href;
const {preflightProject} = await import(W('program-project.mjs'));
const {qualityEvents} = await import(W('editing-model.mjs'));
const {platformEvents} = await import(W('platform-preview.mjs'));
const {validateCloudLatest} = await import(W('cloud-latest.mjs'));
const cloud = validateCloudLatest(JSON.parse(fs.readFileSync(path.join(R, 'tool/workbench/public/data/cloud-latest.json'), 'utf8')));
const html = fs.readFileSync(path.join(R, 'tool/烟花编排工作台.html'), 'utf8');
const state = preflightProject(JSON.stringify(cloud.project), {sourceSha: cloud.project.payload.sourceSha, musicMarkers: []});   // 同编译器的 seed 写法
const out = {version: cloud.version, name: cloud.name, programmeSha256: cloud.programmeSha256, htmlHasVersion: html.includes(cloud.version), htmlHasSha: html.includes(cloud.programmeSha256), cues: state.doc.cues.length, events: state.doc.events.length, counts: {}};
for (const tier of ['high', 'medium', 'low']) for (const pf of ['pc', 'mobile']) out.counts[`${pf}-${tier}`] = platformEvents(state.doc, qualityEvents(state.doc, state.profiles, tier), pf).length;
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'result.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
