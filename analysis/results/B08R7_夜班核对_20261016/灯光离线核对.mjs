// 派活 T12：只运行纯 CPU 模型，全部输出留在本报告目录，不接 UE。
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildLightDelivery} from '../../../tool/workbench/src/light-curve-model.mjs';
import {LIGHT_RIG} from '../../../tool/workbench/src/light-rig.mjs';
const out=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(out,'../../..');
const showPath='FXtools/节目/云端最新/16.0.43-B08修订7-中配扇不多于B05.dfshow';
const show=JSON.parse(fs.readFileSync(path.join(root,showPath),'utf8'));
const pack=buildLightDelivery(show.payload.doc,{programme:{version:'16.0.43',name:'B08修订7-中配扇不多于B05',source:showPath},generator:'T12-offline-audit',now:new Date()});
fs.writeFileSync(path.join(out,'灯光_JS.json'),JSON.stringify({rig:LIGHT_RIG,manifest:pack.manifest,files:pack.files})+'\n');
console.log(JSON.stringify({lights:pack.rows,errors:pack.errors,warnings:pack.warnings,events:pack.manifest.events,peakAtS:pack.manifest.peakAtS}));
