"""汇总当前组件的参数血缘和真实产物指标，不把计划帧数当最终帧数。"""
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'analysis/results/PRISM3_20261016'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()

standard=json.loads((ROOT/'analysis/probe/标准检查/标准检查.json').read_text(encoding='utf-8'))
standard['items']={k:v for k,v in standard['items'].items() if k.startswith('PRISM3-')}
(OUT/'标准检查摘录.json').write_text(json.dumps(standard,ensure_ascii=False,indent=2),encoding='utf-8')
expanded=json.loads((OUT/'已展开配方.json').read_text(encoding='utf-8'))
rows=[]
for r in expanded:
    tag=r['id'][-1];folder=OUT/'组件'/r['id']
    spec=json.loads((folder/'cascade.json').read_text(encoding='utf-8'))
    report=json.loads((OUT/f'组件{tag}_回放.json').read_text(encoding='utf-8'))
    check=standard['items'][r['id']]
    assert check['ver']==r['entry_ver'],(r['id'],check['ver'],r['entry_ver'])
    assert report['pass'] and check['pass']
    # 源文件完整参数可用于还原；源码输出族master4.9.31不是应用版本号。
    rows.append({'id':r['id'],'entry_ver':r['entry_ver'],'application':spec['source']['tool'],
                 'resolved_recipe_sha256':hashlib.sha256(json.dumps({'P':r['P'],'M':r['M']},sort_keys=True).encode()).hexdigest(),
                 'recipe_window_s':r['P']['duration'],'export_lifetime_s':spec['emitters'][0]['modules'][0]['Lifetime']['const'],
                 'export_plan_sig':spec['source']['plan_sig'],'actual_frames':spec['textures']['seq']['frames'],
                 'actual_shown_fraction':report['layers'][0]['shown_frac'],
                 'cascade_sha256':sha(folder/'cascade.json'),'textures_sha256':{t['file']:sha(folder/t['file']) for t in spec['textures'].values()}})
result={'scope':'组件血缘和产物检查；不含整体事件条目验收','notes':[
    'entry_ver后缀master4.9.31是10_types.js的OUTPUT_VER输出族，应用实际4.9.110；不是旧应用导出。',
    '标准检查计算未裁空尾的计划，真实出口bakeFinal会裁掉空尾并重算帧表；实际帧率/裁切/空帧以回放检查为准。',
    '此前脚本用__fw.resolve而库用replicaPM会使窗口不同，已统一库解析并显式设窗口2.98s。',
    '标准检查自动将组件无video标成不适用，不代表本效果无需参考；整体验收的参考时序仍未通过。'], 'components':rows}
(OUT/'导出血缘.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print([(r['id'],r['export_lifetime_s'],r['actual_frames']) for r in rows])
