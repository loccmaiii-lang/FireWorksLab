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
import gzip
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
  let row=e.closest('.sl,.row,.param-row,.fw-field-row'),unit=row?.querySelector('.punit,.unit,.u,.fw-unit')?.textContent||'';
  const column=q=>{let c=row?.querySelector(q);if(!c)return null;let t=c.getBoundingClientRect();return {selector:selector(c),text:c.textContent,rect:{x:t.x,y:t.y,width:t.width,height:t.height}}};
  let owner=e.parentElement.closest('section,[role=group],.module,.sec');
  return {selector:selector(e),tag:e.tagName.toLowerCase(),type:e.type,id:e.id,cls:typeof e.className==='string'?e.className:'',text:(e.innerText||e.textContent||'').trim().slice(0,500),rect:{x:r.x,y:r.y,width:r.width,height:r.height},styles:Object.fromEntries(props.map(k=>[k,s.getPropertyValue(k)])),interactive,disabled:!!e.disabled,readonly:!!e.readOnly,title:e.title||'',ariaLabel:e.getAttribute('aria-label'),describedby:e.getAttribute('aria-describedby'),role:e.getAttribute('role'),indent_depth:e.getAttribute('aria-level')?Number(e.getAttribute('aria-level')):null,tabindex:e.tabIndex,pressed:e.getAttribute('aria-pressed'),selected:e.getAttribute('aria-selected'),parent:selector(e.parentElement),semantic_owner:owner?selector(owner):'',row:row?selector(row):'',columns:row?{label:column('.k,label'),control:column('input[type=range]'),number:column('.num,input[type=number]'),unit:column('.punit,.unit')}:null,clips,textRects:lines,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,backgrounds:bg,label:row?.querySelector('label')?.childNodes[0]?.textContent?.trim()||'',unit:unit.trim(),source_ids:[],source_mapping:'unresolved'};
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
                scope=hashlib.sha256(path.relative_to(Path(private)).as_posix().encode()).hexdigest()[:10] if is_private else ''
                points.append({'id':f'{tool}:{scope}:{file}:{line}:{match.start()}:{kind}','tool':tool,'file':file,'line':line,'kind':kind,'component':component(tag),'ui_path':'待运行定位','runtime_status':'not_run','scan_method':'portable_lexical'})
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
    attrs=e.get('attributes',{}) or {}
    for target,source in [('type','type'),('title','title'),('role','role'),('ariaLabel','aria-label'),('describedby','aria-describedby')]:
        if target not in e:e[target]=attrs.get(source)
    e['tag']=str(e.get('tag','')).lower();e['text']=str(e.get('text') or '')
    raw=e.get('styles',e.get('computed',e.get('style',{}))) or {}
    e['styles']={re.sub(r'[A-Z]',lambda m:'-'+m[0].lower(),k):v for k,v in raw.items()}
    for suffix in ['color','width']:
        value=e['styles'].get('border-'+suffix)
        if value:e['styles'].setdefault('border-top-'+suffix,value)
    e['cls']=e.get('cls',e.get('classes',e.get('className','')))
    if isinstance(e['cls'],list):e['cls']=' '.join(e['cls'])
    if isinstance(e['cls'],dict):e['cls']=e['cls'].get('baseVal','')
    if not e['cls']:e['cls']=attrs.get('class','')
    if isinstance(e.get('parent'),dict):e['parent']=e['parent'].get('selector','')
    e['rect']=e.get('rect',{k:e.get(k,0) for k in ['x','y','width','height']})
    e['selector']=e.get('selector',('#'+e['id']) if e.get('id') else e.get('tag','?')+'.'+str(e.get('cls','')))
    e['interactive']=e.get('interactive',e['tag'] in ['button','input','select','summary','textarea'] or e.get('role') in ['button','tab','menuitem','checkbox','radio','switch','slider'])
    clips=e.get('clips',e.get('ancestors',[]))
    e['clips']=[dict(c.get('rect',c),selector=c.get('selector',c.get('id','?')),overflowX=c.get('overflowX',c.get('styles',{}).get('overflowX','visible')),overflowY=c.get('overflowY',c.get('styles',{}).get('overflowY','visible'))) for c in clips if c.get('rect',c).get('width') is not None]
    e['source_ids']=e.get('source_ids',e.get('generation_points',e.get('source_candidates',[])))
    if not e.get('source_mapping') and e['source_ids']:e['source_mapping']='source_candidate'
    return e

def freeze_values(data):
    values=collections.defaultdict(set)
    for state in data.get('states',[]):
        for el in state.get('elements',[]):
            for k,v in normalized_element(el)['styles'].items():values[k].add(v)
    samples=data.get('samples',[])+data.get('state_samples',[])
    for state in data.get('states',[]):samples+=state.get('samples',[])+state.get('state_samples',[])
    for sample in samples:
        for state in sample.get('states',{}).values():
            for k,v in normalized_element({'style':state.get('style',state)})['styles'].items():
                if isinstance(v,str):values[k].add(v)
                if k=='border-color' and isinstance(v,str) and v.startswith('rgb'):
                    for side in ['top','right','bottom','left']:values[f'border-{side}-color'].add(v)
    return values

def audit(elements,freeze=None):
    """自动结果都是候选。复杂语义/字体栅格/颜色继承必须再看原截图。"""
    hits=[];variants=collections.defaultdict(list);heads=collections.defaultdict(list);commands=collections.defaultdict(list);rows=collections.defaultdict(list);column_rows={};indents=collections.defaultdict(list)
    def add(rule,e,reason,certainty='candidate'):
        hits.append({'rule':rule,'selector':e['selector'],'text':e.get('text','')[:160],'rect':e['rect'],'source_ids':e.get('source_ids',e.get('source_candidates',[])),'source_mapping':e.get('source_mapping','unresolved'),'component':component(str(e.get('tag','')).lower()),'reason':reason,'status':certainty})
    by_selector={normalized_element(e)['selector']:normalized_element(e) for e in elements}
    labels_by_parent=collections.defaultdict(list)
    for key,value in by_selector.items():
        if value.get('tag')=='label' and ' > ' in key:labels_by_parent[key.rsplit(' > ',1)[0]].append(value)
    for raw in elements:
        e=normalized_element(raw);s=e['styles'];r=e['rect'];tag=str(e.get('tag','')).lower();text=e.get('text','');cl=e.get('cls',e.get('className',''))
        w,h=r.get('width',0),r.get('height',0)
        if not w or not h:continue
        if e.get('visible') is False or s.get('opacity')=='0':continue
        # 滚动区尚未滚入的内容不是“被裁坏”；不把可滚到的离屏实例计入本截图。
        if any((c.get('overflowY') in ['auto','scroll'] and (r.get('y',0)+h<=c['y'] or r.get('y',0)>=c['y']+c['height'])) or (c.get('overflowX') in ['auto','scroll'] and (r.get('x',0)+w<=c['x'] or r.get('x',0)>=c['x']+c['width'])) for c in e.get('clips',[])):continue
        if e['interactive']:
            if not re.search(r'(?:^|\s)fw-[\w-]+',cl):add('A1',e,'交互元素未使用共享fw组件类；旧btn等只作迁移候选，不能据此判业务错误')
            if s.get('background-color') in ['rgb(239, 239, 239)','rgb(240, 240, 240)','rgb(255, 255, 255)'] and s.get('color') in ['rgb(0, 0, 0)','rgb(16, 16, 16)']:add('A2',e,'深色工具中出现系统默认浅底/深字组合')
            if s.get('background-color') in ['rgb(107, 107, 107)','rgb(59, 59, 59)'] and s.get('border-top-width')=='2px':add('A2',e,'深色系统默认控件候选：灰底与2px原生边框；校准实际computed值，需截图确认')
            signature=tuple(s.get(k) for k in ['border-radius','background-color','border-top-color','font-size'])+(round(h),)
            variants[tag].append((signature,e))
            if w<24 or h<24:add('B4',e,f'点击矩形{w:.1f}×{h:.1f}px，小于24px；需核验父label扩展点击区')
            if e.get('disabled') and not (e.get('title') or e.get('describedby') or re.search('原因|不支持|等待|先|未|需要',text)):add('F2',e,'禁用元素未有title/aria-describedby或可见原因')
            if not e.get('ariaLabel') and not text and tag not in ['select','input','textarea']:add('F3',e,'可交互元素缺可读名称候选')
            if tag=='button' and text and len(text)<25:commands[text].append(e)
            if e.get('row'):rows[e['row']].append(e)
        for clip in e.get('clips',[]):
            glyphs=e.get('textRects',[])+[q for run in e.get('directTextRuns',[]) for q in run.get('rects',[])]
            xs=[r.get('x',0)]+[q['x'] for q in glyphs];rs=[r.get('x',0)+w]+[q['x']+q['width'] for q in glyphs]
            ys=[r.get('y',0)]+[q['y'] for q in glyphs];bs=[r.get('y',0)+h]+[q['y']+q['height'] for q in glyphs]
            outline=float(re.search(r'[\d.]+',s.get('outline-width','0'))[0]) if s.get('outline-style','none')!='none' and re.search(r'[\d.]+',s.get('outline-width','0')) else 0
            bad_x=clip.get('overflowX') in ['hidden','clip','auto','scroll'] and (min(xs)-outline<clip['x']-1 or max(rs)+outline>clip['x']+clip['width']+1)
            bad_y=clip.get('overflowY') in ['hidden','clip'] and (min(ys)-outline<clip['y']-1 or max(bs)+outline>clip['y']+clip['height']+1)
            if bad_x or bad_y:
                add('B1',e,'元素'+('横向' if bad_x else '纵向')+'越过裁剪容器 '+clip['selector']);break
        if e.get('scrollWidth',0)>e.get('clientWidth',10**9)+1 and s.get('overflow-x') in ['hidden','clip'] and not(e.get('title') or e.get('describedby')):add('B2',e,'文字宽度超过可见框且无提示')
        text_rects=e.get('textRects',[])+[r for run in e.get('directTextRuns',[]) for r in run.get('rects',[])]
        line_tops={round(q['y']) for q in text_rects if q.get('width',0)>1}
        if len(line_tops)>1 and (tag in ['button','summary'] or e.get('role') in ['tab','button']) and len(text)<40:add('B3',e,'短动作/标题折行，需看图判断是否应保持单行')
        if len(line_tops)>1 and tag in ['div','span','label'] and len(text)<120 and re.search(r'\d+\s*(张|帧|fps|s|m|×)',text):add('B3',e,'短数字/单位摘要跨行，需核验单位孤行和阅读分组')
        numeric_wrapped=[run for run in e.get('descendantTextRuns',[]) if re.search(r'\d+\s*(张|帧|fps|s|m|×)',run.get('text','')) and len({round(q['y']) for q in run.get('rects',[]) if q.get('width',0)>1})>1]
        if numeric_wrapped:add('B3',e,'数字/单位摘要的同一文本片段跨行：'+numeric_wrapped[0]['text'][:90])
        if e.get('scrollWidth',0)>e.get('clientWidth',10**9)+1 and s.get('overflow-x') in ['auto','scroll']:add('B6',e,'容器横向溢出')
        if tag=='summary':
            parent_selector=e.get('parent') or re.sub(r'\s*>\s*summary.*$','',e['selector'])
            parent=by_selector.get(parent_selector,{})
            owner='component:.sec' if 'sec' in parent.get('cls','').split() else e.get('semantic_owner',parent_selector)
            heads[owner].append(e)
        child_labels=labels_by_parent.get(e['selector'],[])
        if tag in ['div','p'] and e.get('directTextRuns') and child_labels and len(text)>30 and s.get('display') not in ['grid','flex']:
            add('C4',e,'说明直接文本后拼接行内勾选标签，续行起点可能不一致；需看图核验')
            if sum(len(run.get('text','')) for run in e['directTextRuns'])>=48:add('D4',e,'48字以上说明直接接入控件组；建议短摘要与按需帮助分开')
        if e.get('columns'):
            columns=e['columns'].values() if isinstance(e['columns'],dict) else e['columns']
            for column in columns:
                if not column:continue
                if column.get('clipped'):add('C2',e,'参数四列中有控件越过所属网格列')
            if isinstance(e['columns'],dict) and e['columns'].get('label') and e['columns'].get('number') and e['columns'].get('control'):
                key=e['columns']['label'].get('selector',e['selector'])
                column_rows[key]=e
        if e.get('indent_depth') is not None and e.get('indent_step'):
            expected=e.get('indent_base',0)+e['indent_depth']*e['indent_step']
            if abs(r.get('x',0)-expected)>1:add('C5',e,'同树深度偏离统一缩进刻度')
        if e.get('indent_depth') is not None:indents[(e.get('parent',''),e['indent_depth'])].append(e)
        for prop in ['gap','padding-left','padding-right','margin-left','margin-right']:
            value=s.get(prop,'0px')
            if re.fullmatch(r'\d+(?:\.\d+)?px',value):
                v=float(value[:-2])
                if v>2 and abs(v/4-round(v/4))>.02:add('C3',e,f'{prop}={value}不在4px刻度；边框/光学补偿需人工豁免');break
        if re.search('checkbox|radio',str(e.get('type',e.get('attributes',{}).get('type','')))) and len(line_tops)>1:add('C4',e,'勾选/单选组换行候选，核对续行是否与标签对齐')
        size=s.get('font-size','')
        if size and size not in ['10px','11px','12px','13px','14px','16px']:add('D1',e,'字号不在拟议6档；仅记录，设计稿确认前不改变现值')
        cols=e.get('columns') or {}
        label=e.get('label',text);unit=str(e.get('unit','')).strip()
        if isinstance(cols,dict):
            label=(cols.get('label') or {}).get('text',label)
            unit=str((cols.get('unit') or {}).get('text') or unit).strip()
        if re.search(r'[×%°](?:\s*[（(].*)?$',label) and unit in ['×','%','°']:add('D2',e,'名称末尾符号与独立单位列重复')
        if tag in ['button','summary','label'] and text in ['另存为…','渲染模式','回放模式','导出组合素材包']:add('D3',e,'入口词与宪章§4不一致')
        if tag in ['p','div','label'] and len(text)>90 and not e.get('readonly') and e.get('parent') and len(list(text.splitlines()))<5:add('D4',e,'控件区域长段说明，建议独立帮助/按需展开')
        if (tag=='output' or (tag=='input' and e.get('type')=='number') or e.get('role')=='spinbutton') and not re.search('mono|consolas|courier',s.get('font-family',''),re.I) and 'tabular-nums' not in s.get('font-variant-numeric',''):add('D5',e,'数值未观察到等宽数字设置')
        visual_data=bool(re.search(r'ramp|swatch|color-chip|gradient|thumbnail|texture',cl,re.I) or (tag=='input' and e.get('type')=='color'))
        if freeze and not visual_data:
            for prop,rule in [('color','E1'),('background-color','E1'),('border-top-color','E1'),('border-radius','E2')]:
                if prop in s and s[prop] not in freeze.get(prop,set()):add(rule,e,f'{prop}={s[prop]}未在已采样124冻结值出现；可能是未采样旧状态，须回溯源码')
        if text and (tag in ['button','label','summary','span','small','output','p','a'] or e.get('role') in ['button','tab','menuitem'] or e.get('directTextRuns')):
            ratio=contrast(s.get('color'),e.get('backgrounds',[])) if e.get('backgrounds') else None
            if ratio is not None and ratio<4.5:add('E4',e,f'合成背景文本对比度约{ratio:.2f}:1；不含位图/渐变，需人工核验')
    for tag,items in variants.items():
        groups=len(set(i[0] for i in items))
        if groups>6:add('A3',items[0][1],f'{tag}观察到{groups}种样式组合；超过6种的候选阈值，需按语义变体复核')
    # 只有语义owner相同才比较，避免把子模块与父模块误判为未对齐。
    for owner,items in heads.items():
        if owner and len(items)>1:
            xs=sorted(e['rect']['x'] for e in items);median=xs[len(xs)//2]
            for e in items:
                if abs(e['rect']['x']-median)>1:add('C1',e,f'同组件模块标题偏离左边中位线{median:.1f}px；实际{e["rect"]["x"]:.1f}px')
    for owner,items in rows.items():
        heights=[e['rect']['height'] for e in items if e.get('tag') in ['button','select'] or e.get('type')=='number']
        if len(heights)>1 and max(heights)-min(heights)>2:add('B5',items[0],'同语义行字段高度差超过2px')
    if len(column_rows)>2:
        # 只比较同一可见参数网格的range/number行，选择框和跨栏说明不混入。
        groups=collections.defaultdict(list)
        for e in column_rows.values():
            src=e.get('source') or {};groups[(src.get('emitter',''),round(e['columns']['label']['rect']['x']))].append(e)
        for items in groups.values():
            if len(items)<3:continue
            for key in ['control','number','unit']:
                pairs=[(e,e['columns'].get(key)) for e in items if e['columns'].get(key)]
                xs=sorted(c['rect']['x'] for _,c in pairs)
                if not xs:continue
                median=xs[len(xs)//2]
                for e,c in pairs:
                    if abs(c['rect']['x']-median)>1:add('C2',e,f'参数{key}列偏离同网格中位线超过1px')
    for items in indents.values():
        if len(items)>1 and max(e['rect']['x'] for e in items)-min(e['rect']['x'] for e in items)>1:add('C5',items[0],'同父级同aria-level树行缩进不一致')
    for text,items in commands.items():
        if len(items)>1:add('F1',items[0],f'同屏有{len(items)}个“{text}”按钮；需人工区分不同作用域，不直接删入口')
    return hits

def sequence_audit(states):
    """消费实测多状态日志；没有记录的项目保持not_tested，不能自动给通过。"""
    findings=[]
    for state in states:
        for sample in state.get('state_samples',[]):
            styles=sample.get('states',{})
            if styles.get('focus') and styles.get('normal'):
                f=styles['focus'];n=styles['normal']
                if f==n:findings.append({'rule':'E3','selector':sample['selector'],'reason':'实测focus与normal相同，焦点可见性需核验','status':'candidate'})
        keyboard=state.get('keyboard',{})
        if keyboard.get('esc_closed') is False or keyboard.get('focus_restored') is False:findings.append({'rule':'F3','selector':keyboard.get('trigger',''),'reason':'实测Esc关闭或焦点恢复失败','status':'candidate'})
        before,after=state.get('context_before'),state.get('context_after')
        if before is not None and after is not None and before!=after:findings.append({'rule':'F5','selector':state.get('selector',''),'reason':'返回后选择/滚动上下文与离开前不一致','before':before,'after':after,'status':'candidate'})
        layout=state.get('layout',{})
        if layout.get('horizontal_overflow') or layout.get('primary_visible') is False:findings.append({'rule':'G2','selector':'viewport','reason':'主动作不可见或页面横向溢出','status':'candidate'})
    return findings

def load_capture(path):
    raw=gzip.decompress(path.read_bytes()) if path.suffix=='.gz' else path.read_bytes()
    return json.loads(raw.decode('utf-8-sig'))

def compare_images(a,b,out):
    from PIL import Image,ImageChops,ImageStat
    left,right=Image.open(a).convert('RGB'),Image.open(b).convert('RGB')
    if left.size!=right.size:return {'rule':'G1','status':'not_comparable','reason':'图尺寸不一致，不缩放伪造比较'}
    diff=ImageChops.difference(left,right);diff.save(out/'browser-diff.png')
    count=sum(1 for p in diff.getdata() if max(p)>12)
    return {'rule':'G1','status':'candidate' if count else 'no_pixel_difference','changed_pixels':count,'total_pixels':left.width*left.height,'ratio':count/(left.width*left.height),'reason':'原始像素差异含动态画布、滚动位置、字体及状态，不能单凭差异归因浏览器'}

def crops(data,findings,out):
    """原图不改；候选局部用红框派生，复用相同矩形，保留像素与CSS缩放关系。"""
    from PIL import Image,ImageDraw
    path=Path(data.get('screenshot',''))
    if not path.is_file():return
    raw=Image.open(path).convert('RGB')
    vp=data.get('viewport',data.get('environment',{}).get('css_viewport',[]))
    width=vp.get('width') if isinstance(vp,dict) else (vp[0] if vp else None)
    if not width:return
    scale=raw.width/width;folder=out/'crops';folder.mkdir(exist_ok=True);seen={}
    for hit in findings:
        r=hit.get('rect')
        if not r:continue
        x,y,w,h=[float(r.get(k,0)) for k in ['x','y','width','height']]
        target_box=(max(0,x*scale),max(0,y*scale),min(raw.width,(x+w)*scale),min(raw.height,(y+h)*scale))
        if target_box[2]<=target_box[0] or target_box[3]<=target_box[1]:
            hit['crop_status']='target_outside_screenshot';hit['whole_screenshot']=str(path.resolve());continue
        box=(max(0,int((x-8)*scale)),max(0,int((y-8)*scale)),min(raw.width,int((x+w+8)*scale)),min(raw.height,int((y+h+8)*scale)))
        if box[2]<=box[0] or box[3]<=box[1]:continue
        if box not in seen:
            crop=raw.crop(box);draw=ImageDraw.Draw(crop)
            local_box=(max(0,min(crop.width-1,target_box[0]-box[0])),max(0,min(crop.height-1,target_box[1]-box[1])),max(0,min(crop.width-1,target_box[2]-box[0])),max(0,min(crop.height-1,target_box[3]-box[1])))
            draw.rectangle(local_box,outline='#ff0000',width=2)
            target=folder/f'{len(seen)+1:05d}.png';crop.save(target);seen[box]=str(target.resolve())
        hit['crop']=seen[box];hit['crop_status']='generated';hit['whole_screenshot']=str(path.resolve());hit['pixel_scale']=scale

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
        state_samples=[];seen=set()
        get_style="e=>Object.fromEntries(['color','background-color','border-color','border-radius','outline','box-shadow','opacity'].map(k=>[k,getComputedStyle(e).getPropertyValue(k)]))"
        for e in elements:
            sig=(e['tag'],e['cls'],e['styles'].get('background-color'))
            if not e['interactive'] or e['disabled'] or sig in seen or len(seen)>=32:continue
            seen.add(sig);loc=page.locator(e['selector']).first
            try:
                if not loc.is_visible():continue
                styles={'normal':loc.evaluate(get_style)}
                loc.hover(timeout=500);styles['hover']=loc.evaluate(get_style)
                page.keyboard.press('Tab');loc.focus(timeout=500);styles['focus']=loc.evaluate(get_style)
                # 未审查的生产控件可能在pointerdown执行业务，不能靠POST阻断冒充安全。
                if parsed.path.startswith('/design-system/') and args.active_selector and loc.evaluate('(e,s)=>e.matches(s)',args.active_selector):
                    page.mouse.down();styles['active']=loc.evaluate(get_style)
                    page.mouse.move(0,0);page.mouse.up()
                state_samples.append({'selector':e['selector'],'rect':e['rect'],'clips':e['clips'],'states':styles,'status':'sampled_not_visual_reviewed'})
            except Exception:
                page.mouse.move(0,0);page.mouse.up()
        tabs=[]
        for _ in range(20):
            page.keyboard.press('Tab');tabs.append(page.evaluate("()=>document.activeElement?.id||document.activeElement?.tagName"))
        result={'schema':VERSION,'environment':{'browser':args.browser,'version':browser.version,'css_viewport':[args.width,args.height],'device_scale_factor':args.scale,'emulated_scaling':True,'reduced_motion':args.reduced_motion},'url':args.url,'screenshot':str(path.resolve()),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'elements':elements,'state_samples':state_samples,'keyboard':{'tab_targets':tabs,'esc_closed':None,'focus_restored':None},'layout':{'horizontal_overflow':page.evaluate('document.documentElement.scrollWidth>innerWidth')},'blocked_requests':blocked,'inspection_status':'pending_visual_review'}
        browser.close();return result

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--static',action='store_true');ap.add_argument('--catalog-dir',type=Path);ap.add_argument('--private-root',type=Path)
    ap.add_argument('--url');ap.add_argument('--input',type=Path);ap.add_argument('--freeze',type=Path);ap.add_argument('--browser',choices=['chrome','edge','chromium'],default='chromium')
    ap.add_argument('--compare-images',type=Path,nargs=2);ap.add_argument('--sequence',type=Path)
    ap.add_argument('--crops',action='store_true',help='由已有原截图派生红框局部，不修改原图')
    ap.add_argument('--active-selector',help='仅在已审查的/design-system/样板允许按下采样；生产页不会发pointerdown')
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
        data=capture(args,out) if args.url else load_capture(args.input)
        freeze=freeze_values(json.loads(args.freeze.read_text(encoding='utf-8'))) if args.freeze else None
        findings=audit(data.get('elements',[]),freeze)+sequence_audit([data])
        if args.crops:crops(data,findings,out)
        if args.url:write_json(out/'capture.json',data)
        write_json(out/'candidates.json',{'schema':VERSION,'source_capture':str(args.input) if args.input else 'capture.json','findings':findings,'counts':dict(collections.Counter(f['rule'] for f in findings)),'limits':['候选需人工截图确认','E1/E2只对已采样冻结集合，未采样旧值不能直接判新色','C1/C2/C5/B5需语义行组匹配后分析','E3/F3/F5需多状态序列，G1需配对截图，单张不声称通过']})
        print(f'候选{len(findings)}，尚未经人工确认')
    if args.sequence:write_json(out/'sequence-candidates.json',{'schema':VERSION,'findings':sequence_audit(load_capture(args.sequence).get('states',[]))})
    if args.compare_images:write_json(out/'browser-comparison.json',{'schema':VERSION,**compare_images(*args.compare_images,out)})
    if not(args.static or args.catalog_dir or args.url or args.input or args.sequence or args.compare_images):ap.error('至少指定一种检查方式')

if __name__=='__main__':main()
