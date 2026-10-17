// 用法：node wb_cap.mjs begin <cfg.json> | status | cleanup
import fs from 'node:fs'; import { py } from './t19ue.mjs';
const mode = process.argv[2]; let expr;
if (mode === 'begin') { const cfg = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')); fs.mkdirSync(cfg.folder, { recursive: true }); expr = 'begin(json.loads(' + JSON.stringify(JSON.stringify(cfg)) + '))'; }
else if (mode === 'status') expr = 'status()';
else if (mode === 'cleanup') expr = 'cleanup()';
else throw Error('mode');
const code = fs.readFileSync(new URL('./t19_cap.py', import.meta.url), 'utf8');
const r = await py('import sys,types,json\nm=sys.modules.get("wb19_capmod")\nif m is None:\n m=types.ModuleType("wb19_capmod");sys.modules["wb19_capmod"]=m\nexec(compile(' + JSON.stringify(code) + ',"wb19_capmod","exec"),m.__dict__)\nprint("WB:"+json.dumps(eval(' + JSON.stringify(expr) + ',m.__dict__)))', 120000);
if (mode === 'status') console.log({ ...r, shots: r.shots?.map(s => s.file + '@' + s.age) });
else console.log(r);
