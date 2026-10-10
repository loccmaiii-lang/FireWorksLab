import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {renderTheme} from './theme.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,s)=>i%2?a:[...a,[v.slice(2),s[i+1]]],[]));
const css=renderTheme(JSON.parse(await fs.readFile(path.join(here,'../design-system/tokens.json'),'utf8')));
await fs.writeFile(path.join(here,'df-theme.css'),css);
if(args.source)await fs.writeFile(path.join(args.source,'src/df-theme.css'),css);
if(args.importer){let s=await fs.readFile(args.importer,'utf8');const style='<style id="df-fixed-theme">'+css+'</style>';
 s=s.includes('id="df-fixed-theme"')?s.replace(/<style id="df-fixed-theme">[\s\S]*?<\/style>/,style):s.replace('</head>',style+'</head>');await fs.writeFile(args.importer,s);}
