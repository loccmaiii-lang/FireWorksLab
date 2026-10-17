import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const R='/home/claude/fireworkslab/';
const {buildLightDelivery} = await import(pathToFileURL(R+'tool/workbench/src/light-curve-model.mjs').href);
const D=R+'FXtools/节目/NewYearFireWorks_v01/';
const files={B08r7:'NewYearFireWorks_v01-B08修订7-中配扇不多于B05.dfshow',B10:'NewYearFireWorks_v01-B10-垂柳实测重排-去埋住下托.dfshow',B11:'NewYearFireWorks_v01-B11-垂柳回0.998-白墙错开-大号接2828与2829.dfshow',B11r1:'NewYearFireWorks_v01-B11修订1-白墙奇数点-金芒菊大用2827.dfshow'};
const out={};
for (const [k,f] of Object.entries(files)) {
  const doc=JSON.parse(fs.readFileSync(D+f,'utf8')).payload.doc;
  const d=buildLightDelivery(doc,{programme:{name:k},now:new Date('2026-10-18T00:00:00Z')});
  out[k]={events:d.manifest.events,peakAtS:d.manifest.peakAtS,sMax:d.manifest.sMax,errors:d.errors,warnings:d.warnings,
    lights:d.rows.map(r=>({light:r.light,peak:+r.peak.toFixed(3),iKeys:r.intensityKeys,cKeys:r.colorKeys})),
    sections:d.manifest.sections.map(s=>[s.name.slice(0,8),s.mean,s.peak])};
}
fs.writeFileSync('/tmp/claude-0/-home-claude/939512b4-3ecd-54c7-9b03-f37c4e606309/scratchpad/light_check_r1.json',JSON.stringify(out,null,1));
for (const [k,v] of Object.entries(out)) console.log(k,'events',v.events,'peakAt',v.peakAtS,'sMax',v.sMax,'errors',v.errors,'warn',v.warnings,v.lights.map(l=>l.light+':'+l.peak).join(' '));
