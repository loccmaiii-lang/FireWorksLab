"""金蕊柠（金蕊青柠星）：逐帧拆解后用现有花型分层调（对话框新花型，用户 2026-10-07 23:02）。
  「之前有个金蕊青柠星的参考，可以重新拆解帧数，用现有的模板进行分层调试，给我出一个模板，起名尽量用3字，每个名字能看到结构与颜色造型」
原理（逐时刻、层、颜色、半径比）：analysis/原理/金蕊青柠星.md。参考：vidio/2.0/金蕊青柠星_B.mp4（A 同一种玉，作对照）。
四层 = 两个模拟各拆两层（一个发射器只有一条颜色曲线，头尾异色就拆成同一模拟的两层）：
  外层（亲星）：橙引尾（只画火花）+ 柠点星（只画星头，延迟起势）
  芯（金蕊）：  金菊蕊（金色木炭尾，开头过亮发白 → 金 → 橙）+ 红点蕊（芯星的星头，+1 s 起转粉红）
每层参数在多层模板 mt:kinzuiLime（tool/src/js/18_multitypes.js，4.9.37）里改，改完 python3 tool/build.py，再跑这个脚本生成条目：
  python3 analysis/scripts/金蕊柠.py [--expo 曝光.json ...] [--status] [--jobs export|look --tag N]
出：analysis/原理/条目_金蕊柠.json（组合 JQ<n>，层条目 -1 … -4，参数 = 模板 + 曝光）。不要手改条目。
"""
import argparse, collections, copy, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'analysis' / '原理' / '条目_金蕊柠.json'
STATUS = ROOT / '协作' / '状态清单.json'
DATE = '2026-10-08'
KEY = 'jinrui_ning'
VER = 'JQ6'
NAME = '金蕊柠 · 金菊芯 + 橙引转柠点星'
EN = 'GoldCoreLime'
LAYER_EN = ['LeadTail', 'LimeStar', 'GoldCore', 'RedCore']
VIDEO = 'vidio/2.0/金蕊青柠星_B.mp4'
OLD_EXPO = {}
VMETA = {'v': 7, 't0': 0.167, 'cx': 0.641, 'cy': 0.343, 'half': 0.215, 'aspect': 1.7778}     # 开花 = 视频 0.167 s（第 5 帧）；花心按 +2.2 / +2.7 s 亮部重心；half 按 JQ3E1 烘焙回放花径对齐（0.25 时模拟各时刻都大 15–18%）
LOOK = ['开花后同一秒和实拍比（左栏条目点开有实拍对照）：橙引什么时候收、柠绿星头什么时候亮起来、金芯什么时候转橙、几时熄灭', '放大看质感：星头白芯 + 柠绿小晕、各自轻微闪、前段略拉长；橙引是细而连续的橙红丝；芯丝细密、边上一颗颗淡紫白小点；星后面很淡的青绿细线（要不要留你定）', '引擎回放 + 游戏内大小：四层叠起来顺不顺、芯和外层大小比例；哪一段还差，直接说哪一秒']
TID = 'kinzuiLime'     # 多层模板（tool/src/js/18_multitypes.js）：每层参数从模板取（4.9.37 起模板是唯一来源；JQ1 / JQ2 是从青柠星 QN12-1 起调的，记录在 git 历史）
NOTE = ('用户 10-08 08:34：JQ5 只是模板级（橙引尾照抄、星头沉闷）；08:58 方法：逐帧打点 → 匹配库 → 分层节点 → 初填 → 合层质感 → 比对。'
        '按 analysis/原理/金蕊青柠星/拆解卡.md（实拍 A / B 同一把尺子逐帧量）+ 候选对比 NFJV1–5 重做。逐帧（开花 = 视频 B 0.167 s）：'
        '外层是分层星——开花到 +0.9 s 一团橙红放射尾（橙引，线带 0.48–0.92 R、细而连续），+0.4 s 起尾巴尖上的星头从暗亮起来（起势）、+1.0 s 全亮，之后转柠绿、越烧越小越暗（FWHM 5.5 → 2.9 px），'
        '+3.85–4.0 s 一起熄灭；+1.0–2.7 s 星后面一条很淡、越拉越长的青绿细线（受光烟迹）。'
        '芯是金色木炭尾的小菊（金蕊）：+1.2 s 前过亮发白，+1.55 s 金、+1.85 s 琥珀橙，金丝从芯心连到星头，+2.7 s 前收完；芯星的星头 +1.3–2.4 s 在芯外缘一颗颗淡紫白小点。'
        '芯 +1.3 s 以后不再张大（约外层最终的 0.38）。')


def template_layers():
    """烘焙器里 mtLayers(TID)：每层完整参数（P）、颜色（M）、显示强度。改了 18_multitypes.js 要先 python3 tool/build.py"""
    import asyncio, sys
    sys.path.insert(0, str(ROOT / 'analysis' / 'scripts'))
    from browser_runtime import launch_async
    from playwright.async_api import async_playwright
    async def run():
        async with async_playwright() as pw:
            b = await launch_async(pw); pg = await b.new_page()
            await pg.goto((ROOT / 'tool' / 'FireworkBaker.html').resolve().as_uri() + '?fast&autobake=0', wait_until='domcontentloaded', timeout=0)
            await pg.wait_for_function('window.__fw && typeof mtLayers === "function"', timeout=0)
            r = await pg.evaluate("(id) => ({ ver: VERSION, layers: mtLayers(id).map(x => ({ title: x.title, en: x.en, type: x.type, P: x.P, M: x.M, headInt: x.headInt, tailInt: x.tailInt })) })", TID)
            await b.close(); return r
    return asyncio.run(run())


def build(expo):
    T = template_layers(); L = T['layers']
    global LAYER_EN; LAYER_EN = [x['en'] for x in L]
    entries, ids = [], []
    for i, x in enumerate(L):
        eid = f'{VER}-{i + 1}'; ids.append(eid)
        p = copy.deepcopy(x['P']); p.pop('type', None)
        if eid in expo: p['exposure'] = expo[eid]                    # --expo 明确给的
        elif 'exposure' not in p and eid in OLD_EXPO: p['exposure'] = OLD_EXPO[eid]     # 模板没写曝光才沿用上一次条目里的（模板 MT_EXPOSURE 优先；2026-10-08 JQ6E2 前踩过：旧条目曝光盖掉了模板新值）
        m = copy.deepcopy(x['M']); m['headInt'] = x['headInt']; m['tailInt'] = x['tailInt']
        entries.append({'id': eid, 'date': DATE, 'name': f"{NAME} · {x['title']}", 'base': x['type'], 'tags': f'{NAME} {eid} 金蕊青柠星 mt:{TID}', 'p': p, 'm': m,
                        'note': NOTE + f'（参数 = 多层模板 mt:{TID}，烘焙器 {T["ver"]}）', 'video': VIDEO})
    combos = [{'id': VER, 'date': DATE, 'name': NAME, 'layers': [{'m': 'rep:' + eid, 'scale': 1, 'delay': 0} for eid in ids],
               'layerNames': [x['title'] for x in L], 'note': NOTE, 'look': LOOK, 'tags': NAME + ' ' + VER + ' 金蕊青柠星', 'video': VIDEO, 'vmeta': VMETA}]
    doc = {'说明': f'金蕊柠（金蕊青柠星，对话框新花型，用户 2026-10-07 23:02）。由 analysis/scripts/金蕊柠.py 从多层模板 mt:{TID} 生成，不要手改。', 'entries': entries, 'combos': combos}
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding='utf-8')
    print('→', OUT.relative_to(ROOT), len(entries), '层（模板', TID, T['ver'] + '）')


def write_status(jobs=None):
    d = json.loads(STATUS.read_text(encoding='utf-8'), object_pairs_hook=collections.OrderedDict)
    e = next((x for x in d['effects'] if x['key'] == KEY), None)
    if e is None:
        e = collections.OrderedDict([('key', KEY), ('名', '金蕊柠（金蕊青柠星）'), ('负责', '对话框新花型（用户 10-07 23:02）'), ('阶段', '制作中'), ('参考', ['vidio/2.0/金蕊青柠星_B.mp4', 'vidio/2.0/金蕊青柠星.mp4']),
                                     ('主条目', VER), ('工作版', VER), ('进度', {'计算': False, 'AI自检': False, '素材导出': False, '用户验收': False}),
                                     ('说明', '芯入り：金色木炭尾的芯（金蕊）+ 外层分层星（橙引 → 柠绿光点）。原理 analysis/原理/金蕊青柠星.md；生成 analysis/scripts/金蕊柠.py。'),
                                     ('下一步', '对话框新花型：逐帧拆好了，四层（橙引尾 / 柠点星 / 金菊蕊 / 红点蕊）对着实拍调，调好写成多层花型模板。'),
                                     ('导出任务', []), ('英文名', EN), ('层英文名', LAYER_EN)])
        d['effects'].append(e)
    e['主条目'] = VER; e['工作版'] = VER
    if jobs: e['导出任务'] = (e.get('导出任务') or []) + [j for j in jobs if j not in (e.get('导出任务') or [])]
    STATUS.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


def write_jobs(what, tag):
    J = ROOT / 'analysis' / 'jobs'
    if what == 'export':
        jid = f'{VER}E{tag}'
        (J / f'{jid}.json').write_text(json.dumps({'id': jid, 'type': 'export', 'effect': KEY, 'entry': VER, 'name': EN, 'priority': 6,
            'note': f'对话框新花型（用户 10-07 23:02）：{NAME}。导出 + 回放检查 + 烘焙回放。'}, ensure_ascii=False, indent=1), encoding='utf-8')
        print('任务：', jid); return [jid]
    if what == 'look':     # 曝光 + 和实拍同一秒（实时模拟口径）
        jid = f'NFJL{tag}'
        steps = [{'name': '自动曝光：四层', 'script': '条目曝光.py', 'args': ['{out}/曝光.json'] + [f'{VER}-{i + 1}' for i in range(4)], 'must': False, 'ok': [0], 'timeout': 1200},
                 {'name': f'{VER} 和实拍同一秒', 'script': '时刻对照.py', 'args': [VER, f'{{out}}/{VER}.jpg', '--times', '0.2,0.33,0.47,0.6,0.8,1.0,1.27,1.53,1.8,2.07,2.33,2.6,3.0,3.4,3.7', '--px', '300'],
                  'must': False, 'ok': [0], 'timeout': 900}]
        (J / f'{jid}.json').write_text(json.dumps({'id': jid, 'type': 'script', 'priority': 6, 'name': f'金蕊柠 {VER}：四层自动曝光 + 和实拍同一秒对照', 'steps': steps}, ensure_ascii=False, indent=1), encoding='utf-8')
        print('任务：', jid); return []


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--expo', nargs='*'); ap.add_argument('--status', action='store_true'); ap.add_argument('--jobs'); ap.add_argument('--tag', default='1')
    a = ap.parse_args(); expo = {}
    for f in a.expo or []: expo.update({k: v for k, v in json.loads(pathlib.Path(f).read_text(encoding='utf-8')).items() if not k.startswith('_')})
    if OUT.exists():     # 上一次写进条目的曝光（层号相同的）：只在模板没写曝光时沿用
        for e in json.loads(OUT.read_text(encoding='utf-8'))['entries']:
            if 'exposure' in e['p']: OLD_EXPO[e['id']] = e['p']['exposure']
    build(expo)
    ids = write_jobs(a.jobs, a.tag) if a.jobs else None
    if a.status or ids: write_status(ids)
