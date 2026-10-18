// 只读诊断：InvestigateTexture 把贴图流送状态打进日志，再从日志读回。用法：node investigate.mjs <label> name1 name2 ...
import fs from 'node:fs'; import { py } from './fue.mjs';
const LOGF = 'E:/loc_ma5/DFMEditor/DFM/Saved/Logs/DeltaForce.log';
const [label, ...names] = process.argv.slice(2);
const size0 = fs.statSync(LOGF).size;
await py(`import unreal,json
w=unreal.EditorLevelLibrary.get_editor_world()
for n in json.loads(${JSON.stringify(JSON.stringify(names))}):
 unreal.SystemLibrary.execute_console_command(w,'InvestigateTexture '+n)
print('FWL18:'+json.dumps(True))`);
await new Promise(r => setTimeout(r, 1500));
const fd = fs.openSync(LOGF, 'r'), n = fs.statSync(LOGF).size - size0, buf = Buffer.alloc(n); fs.readSync(fd, buf, 0, n, size0); fs.closeSync(fd);
const lines = buf.toString('utf8').split(/\r?\n/).filter(l => /LogContentStreaming|InvestigateTexture|Texture streaming/i.test(l)).map(l => l.replace(/^\[[^\]]*\]\[[^\]]*\]/, ''));
fs.appendFileSync(new URL('./investigate.log', import.meta.url), `\n## ${new Date().toISOString()} ${label}\n` + lines.join('\n') + '\n');
console.log(lines.join('\n'));
