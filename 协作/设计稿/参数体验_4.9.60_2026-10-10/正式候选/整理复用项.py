"""仅整理设计样板的复用族；不合并生产字段、值、条件或撤销状态。"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
source = json.loads((ROOT.parent / 'full-sample/sample-data.json').read_text(encoding='utf-8'))
common = set('生成率|生成速率|每秒|数量|初速|初速随机|速度随机|起始半径|继承速度|阻力|阻力随机|重力倍率|寿命|寿命随机|大小|大小随机|亮度|亮度随机|随寿命|大小随寿命|亮度随寿命|闪烁|频率|幅度|延迟|延迟随机'.split('|'))
families = {}
for row in source['rows'] + source['extras']:
    label = row['label']
    emitter = row.get('emitter', row.get('object', '界面'))
    module = row.get('module', row.get('sourceSection', ''))
    # 模块参与签名，防止“随寿命”大小曲线和亮度曲线混为一个操作。
    # 同标签但不同单位、控件或旧分支仍分列。复用只指样板绘制，不代表值联动。
    reusable = emitter not in ('效果', '输出') and label in common and row.get('scope') == 'P'
    family_scope = '通用发射器' if reusable else emitter.replace('自定义 2', '自定义 1')
    key = (family_scope, module, label, row.get('unit', ''), row.get('kind', ''), bool(row.get('legacy')))
    if key not in families:
        families[key] = dict(设计族=f'D{len(families)+1:03}', 分区=family_scope, 模块=module,
                             名称=label, 单位=row.get('unit', ''), 控件=row.get('kind', ''),
                             代表字段=row['fieldId'], 引用=[])
    families[key]['引用'].append(dict(字段=row['fieldId'], 位置=row.get('oldPosition', ''),
                                      条件=[row.get('sectionCondition', ''), row.get('fieldCondition', '')]))
result = dict(用途='设计复用索引；四候选共用。非生产字段迁移表，非所有设计族均已展开画入图片。',
              来源版本=source['summary']['bakerVersion'], 原出现项=len(source['rows'])+len(source['extras']),
              设计族数=len(families), 共用族=[v for v in families.values() if len(v['引用']) > 1],
              全部设计族=list(families.values()))
flat = [r['字段'] for f in result['全部设计族'] for r in f['引用']]
original = [r['fieldId'] for r in source['rows'] + source['extras']]
assert sorted(flat) == sorted(original), '去重整理丢失源字段引用'
(ROOT / '复用索引.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(f'原出现项 {len(original)} → 设计族 {len(families)}；引用多重集合一致。')
