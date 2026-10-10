import {spawnSync} from 'node:child_process';
// Windows和云端Linux使用同一入口，不依赖私有D盘脚本。
const choices=process.platform==='win32'?['python','python3']:['python3','python'];
const python=choices.find(name=>spawnSync(name,['--version'],{stdio:'ignore'}).status===0);
if(!python)throw Error('需要 Python 3.10 或以上版本来生成离线ZIP。');
const result=spawnSync(python,['-X','utf8','release.py',...process.argv.slice(2)],{cwd:new URL('../',import.meta.url),stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
