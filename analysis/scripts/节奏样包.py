"""节奏样包（快版）（对话框新花型，用户 2026-10-07 13:31「4.OK，按你说的测试」；方案 协作/方案_节奏_2026-10-07.md 第 5 节第 1 步）。
三个效果各出三档，进 UE 比节奏：
  T75   节奏 ×1.33（整段 ¾）
  T60   节奏 ×1.67（整段 0.6）
  T75C  节奏 ×1.33 + 收尾利落：星一起灭（燃烧离散 → ≤ 5%）、火花寿命随机收一点（→ ≤ 25%），最后那段稀稀拉拉的火花少了；序列时长收到火花灭完
换算用烘焙器自己的 retimeP / retimeM（4.9.30「效果 › 整体调整 › 节奏」，tool/src/js/12_tempo.js），和你在右栏拖「节奏」是同一套数；
条目里记 tempo（打开后右栏「节奏」那一行显示 ×1.33，改回 1 = 原样）。原样那几个条目一个数没动。
  python3 analysis/scripts/节奏样包.py [--status] [--jobs export|check]
出：analysis/原理/条目_节奏样包.json；--status 写状态清单（效果 tempo_*）；--jobs export 排导出（NFE-T-*），check 排全程回放（NFR-T）+ 标准检查（NFS-T）。
"""
import argparse, asyncio, collections, json, pathlib, sys
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
ROOT = HERE.parents[1]
HTML = ROOT / 'tool' / 'FireworkBaker.html'
OUT = ROOT / 'analysis' / '原理' / '条目_节奏样包.json'
STATUS = ROOT / '协作' / '状态清单.json'
DEFAULTS = ROOT / 'analysis' / '原理' / '我的效果变体_默认参数.json'
TIMES = '0.04,0.12,0.22,0.35,0.5,0.65,0.8,0.95'

SRC = [  # 来源条目、状态清单效果、英文名（素材包名）、层英文名、原样在哪个效果
    dict(key='tempo_jmg10', src='JMG10', name='金芒菊 · 尺玉', en='JinMangJu_10', layer_en=[], from_fx='jinmangju_sizes'),
    dict(key='tempo_myja', src='MYJA-O', name='金曜菊-A', en='GoldRay', layer_en=['A', 'B'], from_fx='myv_fxmuv6vhrq'),
    dict(key='tempo_myhk', src='MYHK-O', name='鸿巢四尺玉 · 我的', en='YonshakuKamuro', layer_en=['L1', 'L2'], from_fx='myv_fxmuwols5x'),
]
TIERS = [dict(tag='T75', label='快 ×1.33（整段 ¾）', k=4 / 3, crisp=False),
         dict(tag='T60', label='快 ×1.67（整段 0.6）', k=5 / 3, crisp=False),
         dict(tag='T75C', label='快 ×1.33 + 收尾利落', k=4 / 3, crisp=True)]
CRISP_BURNJIT, CRISP_LIFEJIT = 5, 25

JS = r"""(a) => { const e = FW_REVIEW_LIST.find(x => x.id === a.id); if (!e) return null;
  const combo = e.kind === 'combo', lids = combo ? e.layerIds : [e.id], out = { kind: e.kind || 'single', layers: [] };
  const Ls = lids.map((lid, i) => { const { P, M } = replicaPM(lid); return { lid, P: structuredClone(P), M: structuredClone(M), delay: combo ? +(e.combo.layers[i] || {}).delay || 0 : 0 }; });
  const d0 = Math.min(...Ls.map(L => L.delay)), end0 = Math.max(...Ls.map(L => L.delay + tempoLayerEnd(L.P)));
  for (const L of Ls) {
    const t = tempoOf(L.P), k = a.k, P = retimeP(L.P, k), M = retimeM(L.M, k); P.tempo = +(t * k).toFixed(6);
    if (a.crisp) {     // 收尾利落：星一起灭、火花寿命随机收一点；序列时长收到这一层看得见的结尾 / 火花灭完（取大），不加长
      P.burnJit = Math.min(+P.burnJit || 0, a.bj); P.sparkLifeJit = Math.min(P.sparkLifeJit != null ? +P.sparkLifeJit : 45, a.lj);
      const end = Math.max(layerEndOf(P), +P.sparkRate > 0 ? sparkTailEnd(P) : 0) + 0.05; if (end < +P.duration) P.duration = +end.toFixed(3);
      if (+P.cutOut > +P.duration) P.cutOut = 0; if (+P.visTo > +P.duration) P.visTo = 0;
    }
    out.layers.push({ lid: L.lid, type: P.type, P, M, delay: +(d0 + (L.delay - d0) / k).toFixed(4) });
  }
  out.end0 = end0; out.end1 = Math.max(...out.layers.map(L => L.delay + tempoLayerEnd(L.P)));
  return out; }"""


def slim(P, typ, D):
    d = D.get(typ) or {}
    return {k: v for k, v in P.items() if k in ('renderVer', 'exposure', 'tempo') or k not in d or d[k] != v}


def load_entry(i):
    for f in sorted((ROOT / 'analysis' / '原理').glob('条目_*.json')):
        if f == OUT: continue
        d = json.loads(f.read_text(encoding='utf-8'))
        for e in d.get('entries', []) + d.get('combos', []):
            if e['id'] == i: return e
    raise KeyError(i)


async def compute():
    from browser_runtime import launch_async
    from playwright.async_api import async_playwright
    res = {}
    async with async_playwright() as p:
        b = await launch_async(p); pg = await b.new_page()
        await pg.goto(HTML.resolve().as_uri() + '?fast&autobake=0', wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof retimeP === "function" && typeof replicaPM === "function"', timeout=0)
        for s in SRC:
            for t in TIERS:
                r = await pg.evaluate(JS, {'id': s['src'], 'k': t['k'], 'crisp': t['crisp'], 'bj': CRISP_BURNJIT, 'lj': CRISP_LIFEJIT})
                if not r: raise RuntimeError('找不到条目 ' + s['src'])
                res[(s['key'], t['tag'])] = r
                print(s['src'], t['tag'], f"整段 {r['end0']:.2f} → {r['end1']:.2f} s", flush=True)
        await b.close()
    return res


def main(a):
    D = json.loads(DEFAULTS.read_text(encoding='utf-8'))['types']
    res = asyncio.run(compute())
    entries, combos, effects = [], [], []
    for s in SRC:
        src = load_entry(s['src']); tiers = []
        for t in TIERS:
            r = res[(s['key'], t['tag'])]; tid = f"TP-{s['src']}-{t['tag']}"
            why = (f"「{src['name']}」（{s['src']}）按「效果 › 整体调整 › 节奏」换算：节奏 ×{t['k']:.2f}，整段 {r['end0']:.2f} → {r['end1']:.2f} s；大小、形状、颜色不变"
                   + ('；收尾利落：燃烧离散 → ≤ 5%（星一起灭）、火花寿命随机 → ≤ 25%，序列收到火花灭完' if t['crisp'] else '')
                   + f"。原样在「{s['name']}」那组里（{s['src']}）。")
            look = ['和原样比：快了以后还像不像同一朵花', '游戏里节奏合不合适（UE 里看）', '收尾利落那档：结尾是不是干净了、会不会太突然' if t['crisp'] else '帧率：同样的贴图张数，快了是不是更顺']
            if r['kind'] == 'combo':
                ids = []
                for i, L in enumerate(r['layers']):
                    eid = f'{tid}-{i + 1}'; ids.append(eid)
                    le = load_entry(L['lid'].replace('rep:', ''))
                    entries.append({'id': eid, 'date': '2026-10-07', 'name': f"{src['name']} · {t['label']} · {le['name'].split(' · ')[-1]}", 'base': L['type'],
                                    'tags': f"节奏样包 {s['name']} {t['tag']} {eid}", 'p': slim(L['P'], L['type'], D), 'm': L['M'], 'note': why, 'look': look, 'hidden': True})
                combos.append({'id': tid, 'date': '2026-10-07', 'name': f"{src['name']} · {t['label']}",
                               'layers': [dict({'m': 'rep:' + eid, 'scale': (src['layers'][i] or {}).get('scale', 1), 'delay': r['layers'][i]['delay']},
                                               **({'out': src['layers'][i]['out']} if src['layers'][i].get('out') else {})) for i, eid in enumerate(ids)],
                               'layerNames': src.get('layerNames'), 'tags': f"节奏样包 {s['name']} {t['tag']} {tid}", 'note': why})
            else:
                L = r['layers'][0]
                entries.append({'id': tid, 'date': '2026-10-07', 'name': f"{src['name']} · {t['label']}", 'base': L['type'], 'video': src.get('video'),
                                'tags': f"节奏样包 {s['name']} {t['tag']} {tid}", 'p': slim(L['P'], L['type'], D), 'm': L['M'], 'note': why, 'look': look})
            tiers.append({'id': tid, 'label': t['label'], 'en': t['tag']})
        effects.append(dict(s, tiers=tiers))
    doc = {'说明': '节奏样包（对话框新花型，用户 2026-10-07 13:31「4.OK，按你说的测试」）：金芒菊 · 尺玉、金曜菊-A、鸿巢四尺玉 · 我的 各出 节奏 ×1.33 / ×1.67 / ×1.33 + 收尾利落，进 UE 比节奏。'
                   '由 analysis/scripts/节奏样包.py 生成（换算用烘焙器 4.9.30 的 retimeP / retimeM），不要手改。', 'entries': entries, 'combos': combos}
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding='utf-8')
    print('→', OUT.relative_to(ROOT), len(entries), '条目', len(combos), '组合')
    if a.status: write_status(effects)
    if a.jobs: write_jobs(effects, a.jobs)


def write_status(effects):
    d = json.loads(STATUS.read_text(encoding='utf-8'), object_pairs_hook=collections.OrderedDict)
    have = {e['key']: e for e in d['effects']}
    for fx in effects:
        e = have.get(fx['key'])
        if e is None:
            e = collections.OrderedDict([('key', fx['key']), ('名', f"{fx['name']} · 节奏快版（样包）"), ('负责', '对话框新花型'), ('阶段', '制作中'), ('参考', []),
                                         ('主条目', fx['tiers'][0]['id']), ('工作版', fx['tiers'][0]['id']), ('方案', fx['tiers']),
                                         ('进度', {'计算': True, 'AI自检': False, '素材导出': False, '用户验收': False}),
                                         ('缺', ['导出 + 回放检查 + 标准检查（本机）', 'UE 4.24 实机导入未验证']), ('下一步', ''),
                                         ('说明', f"「{fx['name']}」的节奏快版样包（用户 10-07 13:31「4.OK，按你说的测试」）：同一朵花放快 ×1.33 / ×1.67，外加 ×1.33 + 收尾利落；进 UE 和原样比节奏。原样在「{have[fx['from_fx']]['名'] if fx['from_fx'] in have else fx['from_fx']}」里，没动。"),
                                         ('英文名', fx['en']), ('层英文名', fx['layer_en'])])
            d['effects'].append(e)
        else: e['方案'] = fx['tiers']
    STATUS.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('状态清单：', ', '.join(fx['key'] for fx in effects))


def write_jobs(effects, what):
    J = ROOT / 'analysis' / 'jobs'; ids = []
    pack = lambda fx, t: fx['en'] + '_' + t['en']
    if what == 'export':
        for fx in effects:
            for t in fx['tiers']:
                jid = 'NFE-' + t['id']; ids.append(jid)
                (J / f'{jid}.json').write_text(json.dumps({'id': jid, 'type': 'export', 'effect': fx['key'], 'entry': t['id'], 'name': pack(fx, t), 'priority': 5,
                    'note': f"节奏样包（对话框新花型，用户 2026-10-07 13:31）：{fx['name']} · {t['label']}。导出 + 回放检查。"}, ensure_ascii=False, indent=1), encoding='utf-8')
        d = json.loads(STATUS.read_text(encoding='utf-8'), object_pairs_hook=collections.OrderedDict)
        for e in d['effects']:
            for fx in effects:
                if e['key'] == fx['key']: e['导出任务'] = [j for j in ids if j.startswith('NFE-TP-' + fx['src'] + '-')]
        STATUS.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    else:
        steps = [{'name': f"{fx['name']} · {t['label']}（{pack(fx, t)}）", 'script': '全程回放检查.py', 'args': ['{out}/' + pack(fx, t) + '.jpg', 'analysis/local/输出/素材包/' + pack(fx, t), '--times', TIMES],
                  'must': False, 'ok': [0, 1], 'timeout': 900} for fx in effects for t in fx['tiers']]
        (J / 'NFR-TP.json').write_text(json.dumps({'id': 'NFR-TP', 'type': 'script', 'priority': 1, 'ready': False, 'hold': '等 NFE-TP-* 导出回来（对话框新花型放行）', 'name': f'全程回放检查：节奏样包（{len(steps)} 档）', 'steps': steps,
            'note': '对话框新花型。不带参考视频，采整段 8 个时刻；GPU 光点 / 单束层跳过。'}, ensure_ascii=False, indent=1), encoding='utf-8')
        (J / 'NFS-TP.json').write_text(json.dumps({'id': 'NFS-TP', 'type': 'std', 'priority': 1, 'ready': False, 'hold': '等 NFE-TP-* 导出回来（对话框新花型放行）', 'targets': [t['id'] for fx in effects for t in fx['tiers']],
            'name': '标准检查：节奏样包（9 档）', 'note': '对话框新花型。'}, ensure_ascii=False, indent=1), encoding='utf-8')
        ids = ['NFR-TP', 'NFS-TP']
    print('任务：', ids)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--status', action='store_true'); ap.add_argument('--jobs', choices=['export', 'check'])
    main(ap.parse_args())
