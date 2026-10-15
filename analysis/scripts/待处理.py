"""只读接续扫描：固定Git HEAD，保留原负责人分组，不写状态/看板/验收。

python analysis/scripts/待处理.py [负责人]                    # 首次登记历史基线
python analysis/scripts/待处理.py --json > 上次扫描.json       # 显式保存报告
python analysis/scripts/待处理.py --baseline 上次扫描.json     # 新回包增量
首次不把全部历史export变成新欠账；重复扫描沿用稳定ID，delta仅列变化。
"""
import argparse
import collections
import hashlib
import json
import os
import re
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RES = os.path.join(ROOT, 'analysis', 'results')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from review_to_baker import job_effect  # noqa: E402

LEGACY = {'JM0', 'JM1', 'JM2', 'TR1', 'TR2', 'WC1', 'QN1', 'QN2', 'QN3', 'QA1', 'QA2', 'QA3', 'QB1', 'QB2', 'QC1', 'QC2', 'QD1', 'QD2'}


class GitSnapshot:
    """Only tracked blobs at one resolved commit; never mix live working-tree files."""
    def __init__(self, root, ref='HEAD'):
        self.head = subprocess.check_output(['git', '-C', root, 'rev-parse', '--verify', ref + '^{commit}'], text=True).strip()
        raw = subprocess.check_output(['git', '-C', root, 'ls-tree', '-rz', self.head, '--',
                                       'analysis/jobs', 'analysis/results', '协作/状态清单.json',
                                       '协作/派活队列.json', 'tool/data/review.js'])
        self.blobs = {}
        for row in raw.split(b'\0'):
            if row:
                meta, path = row.split(b'\t', 1)
                self.blobs[path.decode('utf-8')] = meta.split()[2]
        self.paths = set(self.blobs)
        self.proc = subprocess.Popen(['git', '-C', root, 'cat-file', '--batch'], stdin=subprocess.PIPE,
                                     stdout=subprocess.PIPE, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        self.cache = {}

    def read(self, path):
        if path not in self.blobs: return None
        if path not in self.cache:
            self.proc.stdin.write(self.blobs[path] + b'\n'); self.proc.stdin.flush()
            header = self.proc.stdout.readline().split()
            if len(header) != 3 or header[1] != b'blob': raise ValueError('Git blob读取失败：' + path)
            size = int(header[2])
            if size > 8 * 1024 * 1024:
                left = size
                while left:
                    chunk = self.proc.stdout.read(min(left, 1024 * 1024))
                    if not chunk: raise ValueError('Git blob截断：' + path)
                    left -= len(chunk)
                self.proc.stdout.read(1)
                raise ValueError('元数据超过8MiB读取预算：' + path)
            self.cache[path] = self.proc.stdout.read(size)
            self.proc.stdout.read(1)
        return self.cache[path]

    def close(self):
        self.proc.stdin.close()
        self.proc.stdout.close()
        self.proc.wait(timeout=5)


def scan(snap, previous=None):
    issues = []
    def load(path, fallback=None, required=False):
        try:
            raw = snap.read(path)
            if raw is None:
                if required: raise ValueError('文件缺失')
                return fallback
            value = json.loads(raw.decode('utf-8-sig'))
            if not isinstance(value, dict): raise ValueError('JSON根对象应为object')
            return value
        except (ValueError, UnicodeError) as e:
            issues.append({'id': 'input:' + path, 'kind': 'input', 'status': 'verification', 'owner': '待核',
                           'actionable': True, 'reason': str(e), 'evidence': [path]})
            return fallback

    st = load('协作/状态清单.json', {}, True)
    queue = load('协作/派活队列.json', {}, True)
    for value, key, path in [(st, 'effects', '协作/状态清单.json'), (queue, '任务', '协作/派活队列.json')]:
        if not isinstance(value.get(key), list):
            issues.append({'id': 'input:' + path, 'kind': 'input', 'status': 'verification', 'owner': '待核',
                           'actionable': True, 'reason': key + '缺失或不是数组', 'evidence': [path]})
            value[key] = []
    effects = {e['key']: e for e in st['effects'] if isinstance(e, dict) and isinstance(e.get('key'), str)}
    versions = {}
    try:
        raw = snap.read('tool/data/review.js')
        if raw:
            text = raw.decode('utf-8-sig'); match = re.search(r'(?:FW_REVIEW_LIST|FW_REVIEW)\s*=\s*', text)
            if not match: raise ValueError('缺少FW_REVIEW版本数据')
            data, _ = json.JSONDecoder().raw_decode(text[match.end():])
            if not isinstance(data, list) or any(not isinstance(r, dict) for r in data): raise ValueError('review条目应为对象数组')
            versions = {r['id']: r.get('ver') for r in data if isinstance(r.get('id'), str)}
    except (ValueError, UnicodeError) as e:
        issues.append({'id': 'input:tool/data/review.js', 'kind': 'input', 'status': 'verification', 'owner': '待核',
                       'actionable': True, 'reason': str(e), 'evidence': ['tool/data/review.js']})

    jobs = {}
    for path in sorted(snap.paths):
        if not path.startswith('analysis/jobs/') or not path.endswith('.json') or '/' in path[len('analysis/jobs/'):]: continue
        j = load(path)
        if not isinstance(j, dict): continue
        jid = j.get('id')
        if not isinstance(jid, str) or not jid or '/' in jid or '\\' in jid or (jid in jobs and jobs[jid][1] != j):
            issues.append({'id': 'input:' + path, 'kind': 'input', 'status': 'verification', 'owner': '待核',
                           'actionable': True, 'reason': '任务缺ID或同ID内容冲突', 'evidence': [path]})
            continue
        jobs[jid] = (path, j)
    tasks = collections.defaultdict(list)
    for t in queue.get('任务', []):
        if isinstance(t, dict) and t.get('编号'): tasks[t['编号']].append(t)
    task_by = {k: ts[0] for k, ts in tasks.items()}
    def related(jid, state):
        found = []
        for tid, records in tasks.items():
            for task in records:
                if task.get('状态') != state: continue
                refs = task.get('关联任务', [])
                if isinstance(refs, str): refs = [refs]
                text = '\n'.join(str(task.get(k, '')) for k in ('标题', '提示词', '结果'))
                if isinstance(refs, list) and jid in refs or re.search(r'(?<![\w-])' + re.escape(jid) + r'(?![\w-])', text): found.append(tid)
        return sorted(set(found))

    items, observed, legacy = [], {}, []
    old = (previous or {}).get('observed', {})
    for jid, (path, j) in jobs.items():
        if j.get('type') != 'export': continue
        d = 'analysis/results/' + jid + '/'
        done, manifest = load(d + 'done.json'), load(d + '导出清单.json')
        review_raw = snap.read(d + '看法.md')
        token_raw = snap.read(d + 'done.json')
        token = hashlib.sha256(token_raw + (snap.read(d + '导出清单.json') or b'')).hexdigest()[:16] if token_raw else None
        prior = old.get(jid, {})
        historical = previous is None or (prior.get('token') == token and prior.get('historical', False))
        new_receipt = previous is not None and token is not None and token != prior.get('token')
        tracked = prior.get('status') in ('pending_review', 'verification', 'occupied') and not prior.get('historical', False)
        k = job_effect(j) or (manifest or {}).get('effect')
        if not isinstance(k, str): k = None
        e = effects.get(k, {})
        entry, ver = (manifest or {}).get('entry'), (manifest or {}).get('ver')
        review_hash = hashlib.sha256(review_raw).hexdigest()[:16] if review_raw else None
        status, reason = 'historical', '首次登记历史回包，不批量新增欠账'
        canceled = str(j.get('status', j.get('state', j.get('状态', '')))).lower() in ('cancelled', 'canceled', '取消')
        canceled = canceled or (j.get('ready') is False and '取消' in str(j.get('hold', '')))
        replacement = j.get('supersededBy') or j.get('替代为')
        if canceled: status, reason = 'cancelled', '任务明确取消'
        elif replacement:
            known = isinstance(replacement, str) and replacement in jobs and snap.read('analysis/results/' + replacement + '/done.json') is not None
            status, reason = ('superseded', '任务明确由' + replacement + '取代') if known else ('verification', '替代目标缺少有效回包证据')
        elif token is None:
            status, reason = ('verification', '此前已有回包，本次done.json缺失') if prior.get('token') else ('waiting_result', '尚无完成回包')
        elif snap.read(d + 'error.json') is not None or not isinstance(done, dict) or done.get('ok') is False:
            status, reason = 'verification', '完成/错误证据冲突或回包不是成功'
        elif not isinstance(manifest, dict) or not entry or not ver:
            status, reason = 'verification', '导出清单缺失或缺entry/ver，无法核对代次'
        elif j.get('entry') and entry != j['entry']:
            status, reason = 'verification', '任务entry与导出清单不一致'
        elif entry in versions and str(ver).split('·')[0] != str(versions[entry]):
            status, reason = 'superseded', '已被当前条目参数版本取代'
        elif entry not in versions and e.get('主条目') and str(e['主条目']).replace('rep:', '', 1) != entry:
            status, reason = 'superseded', '该条目已被效果的当前主条目取代'
        elif review_raw:
            if new_receipt and prior.get('reviewHash') == review_hash:
                status, reason = 'verification', '回包内容已变，但看法仍是原文件，需核对审看代次'
            else: status, reason = 'reviewed', '已有AI看法文件；不代表用户验收'
        elif entry not in versions:
            status, reason = 'verification', '当前条目版本证据缺失，不能判断同代'
        elif not e and not j.get('负责') and not j.get('owner'):
            status, reason = 'verification', '效果归属/负责人证据缺失'
        elif new_receipt or tracked:
            status, reason = 'pending_review', '新export回包缺审看，核对同版清单/回放并写看法'
        occupied = related(jid, '在做')
        if occupied and status in ('pending_review', 'historical', 'waiting_result'):
            status, reason = 'occupied', '在做共享任务存在此回包的关联证据；覆盖范围需读原任务，避免重复派发'
        owner = e.get('负责') or j.get('负责') or j.get('owner') or '未分配'
        ident = 'export:' + jid + ':' + (token or prior.get('token') or 'no-receipt')
        item = {'id': ident, 'kind': 'export', 'jobId': jid, 'effect': k, 'entry': entry, 'version': ver,
                'owner': owner, 'status': status, 'reason': reason, 'historical': historical,
                'actionable': status in ('pending_review', 'verification') and (new_receipt or tracked) and not occupied,
                'receiptPresent': token is not None,
                'occupiedBy': occupied, 'evidence': [path, d + 'done.json', d + '导出清单.json']}
        if review_raw: item['evidence'].append(d + '看法.md')
        if occupied: item['evidence'].append('协作/派活队列.json')
        items.append(item)
        observed[jid] = {'token': token or prior.get('token'), 'status': status, 'historical': historical, 'reviewHash': review_hash}

    for jid, prior in old.items():
        if jid not in jobs and prior.get('token'):
            items.append({'id': 'export:' + jid + ':' + prior['token'], 'kind': 'export', 'jobId': jid,
                          'owner': '待核', 'status': 'verification', 'actionable': True,
                          'reason': '此前登记的任务文件缺失，未静默关闭', 'evidence': ['analysis/jobs/' + jid + '.json']})
            observed[jid] = {**prior, 'status': 'verification'}
    for tid, ts in sorted(tasks.items()):
        t = ts[0]; state = t.get('状态'); status = {'待派': 'waiting', '等前置': 'dependency_blocked', '在做': 'occupied',
                                                   '完成': 'completed', '取消': 'cancelled', '卡住': 'blocked'}.get(state, 'verification')
        deps = t.get('前置', [])
        bad_deps = not isinstance(deps, list) or any(not isinstance(x, str) for x in deps)
        if bad_deps: deps = []
        waiting = [x for x in deps if task_by.get(x, {}).get('状态') != '完成']
        reason = str(t.get('结果') or t.get('标题') or state or '状态缺失')
        if state in ('待派', '等前置') and waiting: status, reason = 'dependency_blocked', '前置尚未完成：' + '、'.join(waiting)
        if len({json.dumps(x, sort_keys=True, ensure_ascii=False) for x in ts}) > 1:
            status, reason = 'verification', '同一共享任务ID的内容/状态冲突'
        if bad_deps: status, reason = 'verification', '前置应为任务ID数组'
        evidence = t.get('结果文件', [])
        if isinstance(evidence, str): evidence = [evidence]
        if not isinstance(evidence, list) or any(not isinstance(p, str) for p in evidence):
            evidence = []; status, reason = 'verification', '结果文件应为路径数组'
        missing = [p for p in evidence if p not in snap.paths]
        if state == '完成' and missing: status, reason = 'verification', '已完成但证据文件缺失：' + '、'.join(missing)
        items.append({'id': 'shared:' + tid, 'kind': 'shared', 'owner': t.get('交给') or '未分配', 'title': t.get('标题', tid),
                      'status': status, 'actionable': status in ('waiting', 'verification'), 'reason': reason,
                      'dependencies': deps, 'evidence': ['协作/派活队列.json'] + evidence})
    for k, e in effects.items():
        pending = []
        for jid, (_path, j) in jobs.items():
            if job_effect(j) != k: continue
            d = 'analysis/results/' + jid + '/'
            canceled = str(j.get('status', j.get('state', j.get('状态', '')))).lower() in ('cancelled', 'canceled', '取消')
            if canceled or (j.get('ready') is False and '取消' in str(j.get('hold', ''))): continue
            if j.get('type') == 'export' and (snap.read(d + 'done.json') is not None or old.get(jid, {}).get('token')): continue
            if snap.read(d + 'error.json') is not None: pending.append(f'❗ {jid} 出错：看 {d}error.json、log.txt，修好后用新编号或改输入重跑')
            elif snap.read(d + 'done.json') is not None:
                if snap.read(d + '看法.md') is None and jid not in LEGACY: pending.append(f'👀 {jid} 结果回来了，还没看：读 对照.jpg / 数值.json / best.json，写 看法.md，决定下一步')
            elif j.get('ready') is False: pending.append(f"⏸ {jid} 挂起：{j.get('hold', '')}")
            else: pending.append(f'⏳ {jid} 在算（本机 GPU，半小时内取走）')
        if e.get('阶段') in ('待验收', '已通过') and not (e.get('进度') or {}).get('素材导出'):
            pending.append('📦 还没有和当前版本一致的素材包：下导出任务（type: export）并做贴图回放检查')
        if e.get('下一步') and e.get('阶段') not in ('已通过', '未开始'): pending.append('➡ 下一步：' + e['下一步'])
        if pending: legacy.append({'owner': e.get('负责', ''), 'name': e.get('名', k), 'stage': e.get('阶段', ''), 'items': pending})

    items.extend(issues)
    items = list({x['id']: x for x in items}.values())
    current = {x['id'] for x in items if x.get('actionable')}
    prior_open = {x['id'] for x in (previous or {}).get('items', []) if x.get('actionable')}
    old_items = {x['id']: x for x in (previous or {}).get('items', [])}
    occupancy = [{'key': k, 'owner': v.get('负责', ''), 'state': str(v.get('状态', ''))[:240],
                  'scope': str(v.get('范围', ''))[:400], 'evidence': ['协作/状态清单.json']}
                 for k, v in (st.get('共享文件') if isinstance(st.get('共享文件'), dict) else {}).items() if isinstance(v, dict)
                 and any(s in str(v.get('状态', '')) for s in ('在做', '认领', '进行', '本地提交', '待门禁', '待推送'))]
    return {'format': 'df.pending-scan/1', 'sourceHead': snap.head, 'baselineHead': (previous or {}).get('sourceHead'),
            'initialized': previous is None, 'items': items, 'observed': observed, 'occupancy': occupancy, 'legacy': legacy,
            'counts': dict(collections.Counter(x['status'] for x in items)),
            'delta': {'new': sorted(current - prior_open), 'closed': sorted(prior_open - current),
                      'changed': sorted(x['id'] for x in items if x['id'] in old_items and x != old_items[x['id']])}}


def render(report, who=None):
    lines = ['固定源HEAD：' + report['sourceHead']]
    if report['initialized']: lines.append('首次扫描仅登记历史export基线；保存JSON后用 --baseline 识别新回包，不批量补旧债。')
    lines.append('分类计数：' + '、'.join(k + '=' + str(v) for k, v in sorted(report['counts'].items())))
    for owner in sorted({x['owner'] for x in report['legacy']}):
        if who and who not in owner: continue
        lines.append('\n## ' + (owner or '未分配'))
        for row in report['legacy']:
            if row['owner'] == owner:
                lines.append('\n### ' + row['name'] + '（' + row['stage'] + '）')
                lines.extend('- ' + text for text in row['items'])
    visible = [x for x in report['items'] if (not who or who in x.get('owner', ''))
               and (x.get('actionable') or x['kind'] == 'shared' and x['status'] not in ('completed', 'cancelled')
                    or x['status'] == 'occupied')]
    if visible:
        lines.append('\n## 增量导出与共享排队（不自动派发、不代表用户验收）')
        for x in visible:
            lines.append('- [' + x['id'] + '] ' + x.get('owner', '待核') + ' · ' + x['status'] + '：' + x['reason'])
    if not report['legacy'] and not visible: lines.append('没有待处理的事。')
    return '\n'.join(lines) + '\n'


def main(who=None, head='HEAD', baseline=None, as_json=False):
    snap = GitSnapshot(ROOT, head)
    try: report = scan(snap, baseline)
    finally: snap.close()
    print(json.dumps(report, ensure_ascii=False, indent=2) if as_json else render(report, who), end='\n' if as_json else '')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('owner', nargs='?')
    parser.add_argument('--head', default='HEAD', help='固定读取的Git提交，默认HEAD；不读未提交生产输入')
    parser.add_argument('--baseline', help='上次JSON报告；脚本从不自动改写它')
    parser.add_argument('--json', action='store_true', help='输出完整基线；负责人筛选仅作用于文本')
    args = parser.parse_args()
    baseline = None
    if args.baseline:
        with open(args.baseline, encoding='utf-8-sig') as f: baseline = json.load(f)
        if baseline.get('format') != 'df.pending-scan/1': parser.error('基线不是df.pending-scan/1')
    main(args.owner, args.head, baseline, args.json)
