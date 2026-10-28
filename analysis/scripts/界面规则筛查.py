#!/usr/bin/env python3
"""三工具只读界面筛查。输出候选，不将启发式等同人工确认或用户通过。

python analysis/scripts/界面规则筛查.py --static --out analysis/local/ui-check
python analysis/scripts/界面规则筛查.py --url http://127.0.0.1:8034/baker --browser chrome --width 2560 --height 1440 --scale 1.5 --out analysis/local/ui-check
python analysis/scripts/界面规则筛查.py --input capture.json --freeze computed.json --out analysis/local/ui-check

云端使用 --browser chromium；私有源路径只能显式传入，不搜索个人目录。
所有浏览器运行使用独立非持久上下文；默认拒绝非GET及UE请求，不点击保存/导出/导入。
"""
import argparse
import collections
import csv
import hashlib
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VERSION = 'fwl.ui-audit/1'
PROPS = ['color','background-color','border-top-color','border-top-width','border-radius','font-size','font-family','font-variant-numeric','line-height','outline-color','outline-style','outline-width','box-shadow','opacity','display','overflow-x','overflow-y','gap','padding-left','padding-right','margin-left','margin-right','transition-duration','animation-duration']
DOM_JS = r"""() => {
 const props=PROPS;
 const selector=e=>e.id?'#'+CSS.escape(e.id):e.tagName.toLowerCase()+(typeof e.className==='string'?e.className.trim().split(/\s+/).filter(Boolean).slice(0,3).map(x=>'.'+CSS.escape(x)).join(''):'')+':nth-child('+([...e.parentElement.children].indexOf(e)+1)+')';
 return [...document.querySelectorAll('body *')].filter(e=>{let r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&e.tagName!=='SCRIPT'&&e.tagName!=='STYLE'}).map(e=>{
  const s=getComputedStyle(e),r=e.getBoundingClientRect(),interactive=e.matches('button,input,select,textarea,summary,[role=button],[role=tab],[tabindex]');
  let clips=[],p=e.parentElement,bg=[];
  for(let a=e;a;a=a.parentElement){let c=getComputedStyle(a);bg.push(c.backgroundColor)}
  while(p){const t=getComputedStyle(p),q=p.getBoundingClientRect();if(/hidden|auto|scroll|clip/.test(t.overflowX+' '+t.overflowY)) clips.push({selector:selector(p),x:q.x,y:q.y,width:q.width,height:q.height,overflowX:t.overflowX,overflowY:t.overflowY});p=p.parentElement}
  let lines=[];for(const n of e.childNodes)if(n.nodeType===3&&n.textContent.trim()){let range=document.createRange();range.selectNodeContents(n);lines.push(...[...range.getClientRects()].map(q=>({x:q.x,y:q.y,width:q.width,height:q.height})));}
  let row=e.closest('.row,.param-row,.fw-field-row'),unit=row?.querySelector('.unit,.u,.fw-unit')?.textContent||'';
  return {selector:selector(e),tag:e.tagName.toLowerCase(),id:e.id,cls:typeof e.className==='string'?e.className:'',text:(e.innerText||e.textContent||'').trim().slice(0,500),rect:{x:r.x,y:r.y,width:r.width,height:r.height},styles:Object.fromEntries(props.map(k=>[k,s.getPropertyValue(k)])),interactive,disabled:!!e.disabled,readonly:!!e.readOnly,title:e.title||'',ariaLabel:e.getAttribute('aria-label'),describedby:e.getAttribute('aria-describedby'),role:e.getAttribute('role'),tabindex:e.tabIndex,pressed:e.getAttribute('aria-pressed'),selected:e.getAttribute('aria-selected'),parent:selector(e.parentElement),clips,textRects:lines,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,backgrounds:bg,unit:unit.trim(),source_ids:[],source_mapping:'unresolved'};
 });
} """.replace('PROPS',json.dumps(PROPS))

def write_json(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def component(tag):
    return {'button':'Button','select':'Select','input':'Field','textarea':'Field','summary':'Disclosure','details':'Module','dialog':'Dialog','label':'Label','option':'SelectOption'}.get(tag,'DomainFrame')

def static_scan(root,private=None):
    """保守的便携词法扫描；JSX精确AST清单可用--catalog-dir导入，二者不混分母。"""
    points=[]
    paths=list((root/'tool/src').rglob('*'))+list((root/'tool/workbench/src').rglob('*'))
    if private:paths+=list(Path(private).rglob('*.html'))+list(Path(private).rglob('*.js'))+list(Path(private).rglob('*.css'))
    for path in paths:
        if not path.is_file() or path.suffix not in ['.js','.jsx','.html','.css']:continue
        is_private=bool(private and path.is_relative_to(Path(private)))
        tool='导入器' if is_private else ('编排工作台' if 'workbench' in path.parts else '烘焙器')
        file=path.name if is_private else path.relative_to(root).as_posix()
        source=path.read_text(encoding='utf-8',errors='replace')
        patterns=[('control',r'<(button|select|input|textarea|summary|details|dialog|label|option)\b'),('dom',r'createElement\(\s*[\x27\x22](button|select|input|textarea|details|dialog)[\x27\x22]'),('A4',r'\b(?:window\.)?(alert|confirm|prompt)\s*\('),('A5',r'\bstyle\s*=|\.style\b'),('CSS',r'[^{}]+\{[^{}]*\}')]
        for kind,pattern in patterns:
            if kind=='CSS' and path.suffix!='.css':continue
            for match in re.finditer(pattern,source,re.I):
                line=source.count('\n',0,match.start())+1
                tag=match.group(1).lower() if kind in ['control','dom','A4'] else kind
                points.append({'id':f'{tool}:{file}:{line}:{match.start()}:{kind}','tool':tool,'file':file,'line':line,'kind':kind,'component':component(tag),'ui_path':'待运行定位','runtime_status':'not_run','scan_method':'portable_lexical'})
    return points

def catalogs(directory):
    result=[]
    for tool,folder in [('烘焙器','baker'),('编排工作台','workbench'),('导入器','importer')]:
        data=json.loads((Path(directory)/(folder+'_catalog')/'catalog.json').read_text(encoding='utf-8'))
        for source in data['generation_points']:
            p={k:source.get(k,'') for k in ['id','file','line','column','kind','component','ui_path']}
            if tool=='导入器':p['file']=Path(p['file']).name
            p.update(tool=tool,runtime_status='not_run',scan_method='catalog:'+str(data.get('schema',data.get('schema_version',data.get('format','1')))))
            result.append(p)
    return result

def rgb(value):
    nums=re.findall(r'[\d.]+',str(value))
    if not str(value).startswith('rgb') or len(nums)<3:return None
    return [float(n) for n in nums[:3]]+[float(nums[3]) if len(nums)>3 else 1.0]

def contrast(fg,backgrounds):
    f=rgb(fg)
    if not f:return None
    bg=[0,0,0]
    for value in reversed(backgrounds):
        c=rgb(value)
        if c:bg=[c[i]*c[3]+bg[i]*(1-c[3]) for i in range(3)]
    fc=[f[i]*f[3]+bg[i]*(1-f[3]) for i in range(3)]
    def lum(c):
        c=[x/255 for x in c];c=[x/12.92 if x<=0.04045 else ((x+.055)/1.055)**2.4 for x in c]
        return sum(x*y for x,y in zip(c,[.2126,.7152,.0722]))
    a,b=sorted([lum(fc),lum(bg)])
    return (b+.05)/(a+.05)

def normalized_element(e):
    e=dict(e)
    e['styles']=e.get('styles',e.get('computed',e.get('style',{})))
    e['rect']=e.get('rect',{k:e.get(k,0) for k in ['x','y','width','height']})
    e['selector']=e.get('selector',('#'+e['id']) if e.get('id') else e.get('tag','?')+'.'+str(e.get('cls','')))
    e['interactive']=e.get('interactive',str(e.get('tag','')).lower() in ['button','input','select','summary','textarea'])
    return e

def freeze_values(data):
    values=collections.defaultdict(set)
    for state in data.get('states',[]):
        for el in state.get('elements',[]):
            for k,v in normalized_element(el)['styles'].items():values[k].add(v)
    return values

def audit(elements,freeze=None):
    """自动结果都是候选。复杂语义/字体栅格/颜色继承必须再看原截图。"""
    hits=[];variants=collections.defaultdict(list);heads=collections.defaultdict(list)
    def add(rule,e,reason,certainty='candidate'):
        hits.append({'rule':rule,'selector':e['selector'],'text':e.get('text','')[:160],'rect':e['rect'],'source_ids':e.get('source_ids',e.get('source_candidates',[])),'source_mapping':e.get('source_mapping','unresolved'),'component':component(str(e.get('tag','')).lower()),'reason':reason,'status':certainty})
    for raw in elements:
        e=normalized_element(raw);s=e['styles'];r=e['rect'];tag=str(e.get('tag','')).lower();text=e.get('text','');cl=e.get('cls',e.get('className',''))
        w,h=r.get('width',0),r.get('height',0)
        if not w or not h:continue
        if e['interactive']:
            if not re.search(r'(?:^|\s)fw-[\w-]+',cl):add('A1',e,'交互元素未使用共享fw组件类；旧btn等只作迁移候选，不能据此判业务错误')
            if s.get('background-color') in ['rgb(239, 239, 239)','rgb(240, 240, 240)','rgb(255, 255, 255)'] and s.get('color') in ['rgb(0, 0, 0)','rgb(16, 16, 16)']:add('A2',e,'深色工具中出现系统默认浅底/深字组合')
            signature=tuple(s.get(k) for k in ['border-radius','background-color','border-top-color','font-size'])+(round(h),)
            variants[tag].append((signature,e))
            if (w<24 or h<24) and tag!='input':add('B4',e,f'点击矩形{w:.1f}×{h:.1f}px，小于24px；需核验父label扩展点击区')
            if e.get('disabled') and not (e.get('title') or e.get('describedby') or re.search('原因|不支持|等待|先|未|需要',text)):add('F2',e,'禁用元素未有title/aria-describedby或可见原因')
            if not e.get('ariaLabel') and not text and tag not in ['select','input','textarea']:add('F3',e,'可交互元素缺可读名称候选')
        for clip in e.get('clips',[]):
            if r.get('x',0)<clip['x']-1 or r.get('x',0)+w>clip['x']+clip['width']+1:
                add('B1',e,'元素横向越过裁剪/滚动容器 '+clip['selector']);break
        if e.get('scrollWidth',0)>e.get('clientWidth',10**9)+1 and s.get('overflow-x') in ['hidden','clip'] and not(e.get('title') or e.get('describedby')):add('B2',e,'文字宽度超过可见框且无提示')
        line_tops={round(q['y']) for q in e.get('textRects',[]) if q.get('width',0)>1}
        if len(line_tops)>1 and (tag in ['button','summary'] or e.get('role') in ['tab','button']) and len(text)<40:add('B3',e,'短动作/标题折行，需看图判断是否应保持单行')
        if e.get('scrollWidth',0)>e.get('clientWidth',10**9)+1 and s.get('overflow-x') in ['auto','scroll']:add('B6',e,'容器横向溢出')
        if tag=='summary':heads[e.get('parent','')].append(e)
        for prop in ['gap','padding-left','padding-right','margin-left','margin-right']:
            value=s.get(prop,'0px')
            if re.fullmatch(r'\d+(?:\.\d+)?px',value):
                v=float(value[:-2])
                if v>2 and abs(v/4-round(v/4))>.02:add('C3',e,f'{prop}={value}不在4px刻度；边框/光学补偿需人工豁免');break
        if re.search('checkbox|radio',str(e.get('type',e.get('attributes',{}).get('type','')))) and len(line_tops)>1:add('C4',e,'勾选/单选组换行候选，核对续行是否与标签对齐')
        size=s.get('font-size','')
        if size and size not in ['10px','11px','12px','13px','14px','16px']:add('D1',e,'字号不在拟议6档；仅记录，设计稿确认前不改变现值')
        if re.search(r'[×%°]\s*$',text) and (str(e.get('unit','')).strip() in ['×','%','°']):add('D2',e,'名称末尾符号与独立单位列重复')
        if tag in ['button','summary','label'] and text in ['另存为…','渲染模式','回放模式','导出组合素材包']:add('D3',e,'入口词与宪章§4不一致')
        if tag in ['p','div','label'] and len(text)>90 and not e.get('readonly') and e.get('parent') and len(list(text.splitlines()))<5:add('D4',e,'控件区域长段说明，建议独立帮助/按需展开')
        if (tag in ['output'] or e.get('role')=='spinbutton') and not re.search('mono|consolas|courier',s.get('font-family',''),re.I) and s.get('font-variant-numeric')!='tabular-nums':add('D5',e,'数值未观察到等宽数字设置')
        if freeze:
            for prop,rule in [('color','E1'),('background-color','E1'),('border-top-color','E1'),('border-radius','E2')]:
                if prop in s and s[prop] not in freeze.get(prop,set()):add(rule,e,f'{prop}={s[prop]}未在已采样124冻结值出现；可能是未采样旧状态，须回溯源码')
        if text and tag in ['button','label','summary','span','small','output','p','a']:
            ratio=contrast(s.get('color'),e.get('backgrounds',[])) if e.get('backgrounds') else None
            if ratio is not None and ratio<4.5:add('E4',e,f'合成背景文本对比度约{ratio:.2f}:1；不含位图/渐变，需人工核验')
    for tag,items in variants.items():
        groups=len(set(i[0] for i in items))
        if groups>6:add('A3',items[0][1],f'{tag}观察到{groups}种样式组合；超过6种的候选阈值，需按语义变体复核')
    return hits

def capture(args,out):
    from playwright.sync_api import sync_playwright
    import urllib.parse
    parsed=urllib.parse.urlparse(args.url)
    if parsed.scheme not in ['http','https']:raise ValueError('仅允许HTTP(S)，不以file入口绕过预检')
    with sync_playwright() as p:
        paths={'chrome':'C:/Program Files/Google/Chrome/Application/chrome.exe','edge':'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}
        browser=p.chromium.launch(headless=True,**({'executable_path':paths[args.browser]} if args.browser in paths else {}))
        context=browser.new_context(viewport={'width':args.width,'height':args.height},device_scale_factor=args.scale,reduced_motion='reduce' if args.reduced_motion else 'no-preference')
        blocked=[]
        def guard(route):
            request=route.request;url=urllib.parse.urlparse(request.url)
            if request.method=='GET' and url.netloc==parsed.netloc and not re.search(r'execute|publish|import/run|gpcli',url.path,re.I):route.continue_()
            else:blocked.append({'method':request.method,'origin':url.netloc,'path':url.path});route.abort()
        context.route('**/*',guard)
        page=context.new_page();page.goto(args.url,wait_until='networkidle');page.wait_for_timeout(700)
        elements=page.evaluate(DOM_JS)
        path=out/'capture.png';page.screenshot(path=str(path))
        result={'schema':VERSION,'environment':{'browser':args.browser,'version':browser.version,'css_viewport':[args.width,args.height],'device_scale_factor':args.scale,'emulated_scaling':True,'reduced_motion':args.reduced_motion},'url':args.url,'screenshot':str(path.resolve()),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'elements':elements,'blocked_requests':blocked,'inspection_status':'pending_visual_review'}
        browser.close();return result

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--static',action='store_true');ap.add_argument('--catalog-dir',type=Path);ap.add_argument('--private-root',type=Path)
    ap.add_argument('--url');ap.add_argument('--input',type=Path);ap.add_argument('--freeze',type=Path);ap.add_argument('--browser',choices=['chrome','edge','chromium'],default='chromium')
    ap.add_argument('--width',type=int,default=1920);ap.add_argument('--height',type=int,default=1080);ap.add_argument('--scale',type=float,default=1);ap.add_argument('--reduced-motion',action='store_true');ap.add_argument('--out',type=Path,required=True)
    args=ap.parse_args();out=args.out;out.mkdir(parents=True,exist_ok=True)
    if args.static or args.catalog_dir:
        points=catalogs(args.catalog_dir) if args.catalog_dir else static_scan(ROOT,args.private_root)
        if len({p['id'] for p in points})!=len(points):raise ValueError('生成点ID重复')
        if any(not p.get('component') for p in points):raise ValueError('存在无组件归属生成点')
        with (out/'生成点.csv').open('w',encoding='utf-8-sig',newline='') as f:
            fields=['id','tool','file','line','column','kind','component','ui_path','runtime_status','scan_method'];w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows({k:p.get(k,'') for k in fields} for p in points)
        write_json(out/'static-summary.json',{'schema':VERSION,'counts':dict(collections.Counter(p['tool'] for p in points)),'component_ownership':len(points),'total':len(points),'screenshot_coverage':0,'method':'catalog' if args.catalog_dir else 'portable_lexical','points':points})
        print(f'生成点{len(points)}，组件归属{len(points)}/{len(points)}；这不是运行覆盖率')
    if args.url or args.input:
        data=capture(args,out) if args.url else json.loads(args.input.read_text(encoding='utf-8'))
        freeze=freeze_values(json.loads(args.freeze.read_text(encoding='utf-8'))) if args.freeze else None
        findings=audit(data.get('elements',[]),freeze)
        if args.url:write_json(out/'capture.json',data)
        write_json(out/'candidates.json',{'schema':VERSION,'source_capture':str(args.input) if args.input else 'capture.json','findings':findings,'counts':dict(collections.Counter(f['rule'] for f in findings)),'limits':['候选需人工截图确认','E1/E2只对已采样冻结集合，未采样旧值不能直接判新色','C1/C2/C5/B5需语义行组匹配后分析','E3/F3/F5需多状态序列，G1需配对截图，单张不声称通过']})
        print(f'候选{len(findings)}，尚未经人工确认')
    if not(args.static or args.catalog_dir or args.url or args.input):ap.error('至少指定--static/--catalog-dir/--url/--input之一')

if __name__=='__main__':main()
