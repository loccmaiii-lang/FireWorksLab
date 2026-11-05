"""合成单文件样板：python3 build.py [输出路径]（默认写到仓库外的临时目录 /tmp/E样板_build.html）。
源文件从 E样板_v2.3.html 拆出（对话框9，2026-11-05）。分工：*_main = 制作区（烘焙器），*_shell = 烟花工坊外壳。
css 按 manifest.json 的 css 顺序接成一个 <style>，然后按 order 接 html 和 <script>；{{ASSET:名字}} 换成 assets/ 里的图片 data URI。"""
import json, base64, re, sys, os
here=os.path.dirname(os.path.abspath(__file__))
m=json.load(open(os.path.join(here,'manifest.json'),encoding='utf-8'))
rd=lambda f: open(os.path.join(here,f),encoding='utf-8').read()
out=rd('head.html')+'<style>'+'\n'.join(rd(f) for f in m['css'])+'</style>'
for kind,fn in m['order']:
    out+=('<script>'+rd(fn)+'</script>') if kind=='js' else rd(fn)
def rep(mm):
    name=mm.group(1); mime=m['assets'][name]
    return f'data:{mime};base64,'+base64.b64encode(open(os.path.join(here,'assets',name),'rb').read()).decode()
out=re.sub(r'\{\{ASSET:([^}]+)\}\}',rep,out)
dst=sys.argv[1] if len(sys.argv)>1 else '/tmp/E样板_build.html'
open(dst,'w',encoding='utf-8').write(out); print('wrote',dst,len(out))
