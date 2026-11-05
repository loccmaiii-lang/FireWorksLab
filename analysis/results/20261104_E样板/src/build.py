"""把 src/ 重新合成单文件样板：python3 build.py [输出路径]（默认 ../E样板_build.html）。
源文件是从 E样板_v2.3.html 拆出来的（对话框9，2026-11-05，云端工作区被回收后恢复）。"""
import json, base64, re, sys, os
here=os.path.dirname(os.path.abspath(__file__))
m=json.load(open(os.path.join(here,'manifest.json'),encoding='utf-8'))
out=open(os.path.join(here,'head.html'),encoding='utf-8').read()
out+='<style>'+open(os.path.join(here,'style.css'),encoding='utf-8').read()+'</style>'
for kind,fn in m['order']:
    c=open(os.path.join(here,fn),encoding='utf-8').read()
    out+= ('<script>'+c+'</script>') if kind=='js' else c
def rep(mm):
    name=mm.group(1); mime=m['assets'][name]
    return f'data:{mime};base64,'+base64.b64encode(open(os.path.join(here,'assets',name),'rb').read()).decode()
out=re.sub(r'\{\{ASSET:([^}]+)\}\}',rep,out)
dst=sys.argv[1] if len(sys.argv)>1 else os.path.join(here,'..','E样板_build.html')
open(dst,'w',encoding='utf-8').write(out); print('wrote',dst,len(out))
