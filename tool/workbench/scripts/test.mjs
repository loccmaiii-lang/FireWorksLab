import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const tests=(await fs.readdir(new URL('../tests/',import.meta.url))).filter(n=>n.endsWith('.test.mjs')).map(n=>'tests/'+n);
const result=spawnSync(process.execPath,['--test',...tests],{cwd:new URL('../',import.meta.url),stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
