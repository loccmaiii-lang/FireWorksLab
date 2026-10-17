// 用法：node wb_live.mjs begin <cfg.json> | status | cleanup | low | high | restore-camera
import fs from 'node:fs'; import { py } from './wbue.mjs';
const mode = process.argv[2]; let expr;
const before = JSON.parse(fs.readFileSync(new URL('./state-before.json', import.meta.url), 'utf8'));
if (mode === 'begin') { const cfg = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')); fs.mkdirSync(cfg.folder, { recursive: true }); expr = 'begin(json.loads(' + JSON.stringify(JSON.stringify(cfg)) + '))'; }
else if (mode === 'status') expr = 'status()';
else if (mode === 'cleanup') expr = 'cleanup()';
else if (mode === 'low') { const lines = Object.entries(before.low).filter(([k]) => typeof before.cvars[k] === 'string' && before.cvars[k] !== '').map(([k, v]) => k + ' ' + v); expr = 'apply_cmds(json.loads(' + JSON.stringify(JSON.stringify(lines)) + '))'; }
else if (mode === 'high') { const lines = Object.keys(before.low).filter(k => typeof before.cvars[k] === 'string' && before.cvars[k] !== '').map(k => k + ' ' + before.cvars[k]); expr = 'apply_cmds(json.loads(' + JSON.stringify(JSON.stringify(lines)) + '))'; }
else if (mode === 'high30') { const lines = Object.keys(before.low).filter(k => typeof before.cvars[k] === 'string' && before.cvars[k] !== '').map(k => k + ' ' + (k === 't.MaxFPS' ? '30' : before.cvars[k])); expr = 'apply_cmds(json.loads(' + JSON.stringify(JSON.stringify(lines)) + '))'; }
else if (mode === 'restore-camera') expr = 'set_camera(' + JSON.stringify(before.camera[0]) + ',' + JSON.stringify(before.camera[1]) + ') and set_selected(' + JSON.stringify(before.selected) + ')';
else throw Error('mode');
const code = fs.readFileSync(new URL('./wb_live.py', import.meta.url), 'utf8');
const r = await py('import sys,types,json\nm=sys.modules.get("wb17_live")\nif m is None:\n m=types.ModuleType("wb17_live");sys.modules["wb17_live"]=m\nexec(compile(' + JSON.stringify(code) + ',"wb17_live","exec"),m.__dict__)\nprint("WB:"+json.dumps(eval(' + JSON.stringify(expr) + ',m.__dict__)))', 120000);
if (mode === 'status') console.log({ running: r.running, done: r.done, error: r.error, elapsed: r.elapsed, actors: r.actors?.length, shots: r.shots?.length, frames: r.frames, h: r.h });
else console.log(r);
