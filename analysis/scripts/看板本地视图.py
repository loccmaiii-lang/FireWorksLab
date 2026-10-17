#!/usr/bin/env python3
"""在线快照 + 尚未应用的清单 → 本地看板；可收集用户主动导出的反馈。"""
import argparse
import copy
import json
import re
import subprocess
import tempfile
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
COLLS = ('items', 'resources', 'dialogs', 'reports')
BOARD = 'https://claude.ai/artifact/BWDYBCixRrt5NgtcaigHkv'
SNAP_RE = re.compile(r'(<script type="application/json" id="snap">).*?(</script>)', re.S)
RUNTIME_RE = re.compile(r'<script id="local-feedback-runtime">.*?</script>\s*', re.S)
USER_FIELDS = {'feedback', 'feedbackAt', 'answer', 'status', 'statusBefore',
               'doneAt', 'syncedAt', 'syncedTo', 'next', 'nextDoneAt', 'updatedAt'}


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def write_atomic(path, text):
    """先完整落临时文件再替换，刷新或中断不会读到半截JSON/HTML。"""
    temporary = None
    try:
        with tempfile.NamedTemporaryFile('w', encoding='utf-8', newline='',
                                         dir=path.parent, prefix='.board-', delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(text)
        temporary.replace(path)
    finally:
        if temporary and temporary.exists():
            temporary.unlink()


def pending_row_id(entry):
    return (entry['字段'].get('id') or f"local-{entry['id']}") if entry['行'] == 'new' else entry['行']


def parsed_time(value):
    try:
        stamp = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        return stamp if stamp.tzinfo else None
    except ValueError:
        return None


def project(snapshot, pending, at, head):
    """追加清单按顺序投影；不回写在线基线、旧条目或应用回执。"""
    view = copy.deepcopy(snapshot)
    view['说明'] = '本地派生视图：在线快照叠加尚未应用的清单；在线基线保留在看板快照.json。'
    touched, added, closed, active, conflicts = set(), [], [], [], []
    imported_events = []
    # 云端回执兼容“items/n78”和旧裸行号；映射仍只在本集合内查找。
    row_map = {pending_row_id(e): e['线上行'].removeprefix(e['集合'] + '/') for e in pending.get('条目', [])
               if e['行'] == 'new' and e.get('线上行')}
    for entry in pending.get('条目', []):
        if entry.get('反馈事件'):
            imported_events.append(entry['反馈事件'])
        if entry.get('appliedAt'):
            continue
        if str(entry.get('应用结果', '')).startswith(('冲突', '拒绝')):
            conflicts.append(entry['id'])
            continue
        coll = entry['集合']
        if coll not in COLLS:
            raise ValueError(f"{entry['id']}：集合不认识 {coll}")
        row_id = row_map.get(pending_row_id(entry), pending_row_id(entry))
        table = view.setdefault(coll, {})
        fields = copy.deepcopy(entry['字段'])
        fields.pop('id', None)
        online_row = snapshot.get(coll, {}).get(row_id, {})
        online_time, based_on = parsed_time(online_row.get('updatedAt')), parsed_time(entry.get('基于'))
        conflict_fields = []
        if online_time and based_on and online_time > based_on:
            bases = entry.get('基于字段', {})
            for key, value in fields.items():
                current = online_row.get(key, '')
                if current != value and (key not in bases or current != bases[key]):
                    conflict_fields.append(key)
            for key in conflict_fields:
                del fields[key]
            if conflict_fields:
                conflicts.append(entry['id'])
        if row_id not in table:
            if entry['行'] != 'new':
                raise ValueError(f"{entry['id']}：找不到 {coll}/{row_id}，不生成假行")
            table[row_id] = {}
            added.append(row_id)
        old_status = table[row_id].get('status')
        table[row_id].update(fields)
        if old_status in ('没做', '在做') and fields.get('status') in ('已做', '不做了'):
            closed.append(row_id)
        table[row_id].setdefault('_localPending', []).append(entry['id'])
        table[row_id]['_localAt'] = entry['时间']
        if conflict_fields:
            table[row_id].setdefault('_localConflict', []).extend(conflict_fields)
        table[row_id]['updatedAt'] = fields.get('updatedAt', entry['时间'])
        touched.add((coll, row_id))
        active.append(entry['id'])
    view['本地视图'] = {
        '格式': 'df.board-local-view/1', '生成时间': at, '仓库HEAD': head,
        '在线快照时间': snapshot.get('导出时间', ''), '尚未应用': active,
        '冲突待看': conflicts, '新增行': added, '关闭行': sorted(set(closed)),
        '变动行数': len(touched), '反馈已入Git': imported_events,
        '行映射': row_map,
        '说明': '包含本机待同步变更；不是在线导出，不表示云端应用或负责人接单。',
    }
    return view


def feedback_files(root):
    """只找约定的主动导出文件，不读取浏览器私有存储。"""
    directories = [root / 'analysis/local/看板反馈', Path.home() / 'Downloads']
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER,
                            r'Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders') as key:
            import os
            value = winreg.QueryValueEx(key, '{374DE290-123F-4565-9164-39C4925E467B}')[0]
            directories.append(Path(os.path.expandvars(value)))
    except (ImportError, OSError):
        pass
    return sorted({p.resolve() for d in directories if d.is_dir()
                   for p in d.glob('FireWorksLab-看板反馈-*.json')})


def validated_feedback(path):
    if path.stat().st_size > 2 * 1024 * 1024:
        raise ValueError(f'{path.name}：反馈文件超过2MB')
    data = read_json(path)
    if data.get('format') != 'df.board-feedback/1' or data.get('board') != BOARD:
        raise ValueError(f'{path.name}：不是本看板的反馈文件')
    entries = data.get('entries')
    if not isinstance(entries, list) or len(entries) > 500:
        raise ValueError(f'{path.name}：反馈条目格式/数量不对')
    for item in entries:
        if not isinstance(item, dict):
            raise ValueError(f'{path.name}：反馈条目不是对象')
        coll, row, fields = item.get('collection'), item.get('row'), item.get('fields')
        if coll not in COLLS[:3] or not isinstance(row, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', row):
            raise ValueError(f'{path.name}：反馈集合或行号不对')
        if not isinstance(fields, dict) or not fields or set(fields) - USER_FIELDS:
            raise ValueError(f'{path.name}：反馈含非用户操作字段')
        if coll != 'items' and set(fields) - {'feedback', 'feedbackAt', 'updatedAt'}:
            raise ValueError(f'{path.name}：资源/对话框只接反馈')
        if any(not isinstance(value, str) or len(value) > 20000 for value in fields.values()):
            raise ValueError(f'{path.name}：反馈内容必须是有限长度文字')
        if fields.get('status') not in (None, '没做', '在做', '已做', '不做了'):
            raise ValueError(f'{path.name}：状态不认识')
        if any(fields.get(k) for k in ('syncedAt', 'syncedTo', 'next', 'nextDoneAt')):
            raise ValueError(f'{path.name}：用户操作不能伪写转交/应用完成')
        if not isinstance(item.get('eventId'), str) or not 1 <= len(item['eventId']) <= 220:
            raise ValueError(f'{path.name}：缺反馈事件ID')
        stamp = datetime.fromisoformat(item.get('at', '').replace('Z', '+00:00'))
        if stamp.tzinfo is None:
            raise ValueError(f'{path.name}：反馈时间缺时区')
        item['_stamp'] = stamp
        if not isinstance(item.get('baseValues'), dict) or set(item['baseValues']) - USER_FIELDS:
            raise ValueError(f'{path.name}：缺字段基线')
    return data


def import_feedback(root, files):
    pending_path = root / '协作/看板待同步.json'
    pending = read_json(pending_path)
    original = copy.deepcopy(pending)
    batches = [(path, validated_feedback(path)) for path in files]  # 全部通过才写
    snapshot = read_json(root / '协作/看板快照.json')
    known_rows = {coll: set(snapshot.get(coll, {})) for coll in COLLS}
    for item in pending.get('条目', []):
        known_rows[item['集合']].add(pending_row_id(item))
        if item.get('线上行'):
            known_rows[item['集合']].add(item['线上行'])
    by_event = {e['反馈事件']: e for e in pending['条目'] if e.get('反馈事件')}
    seen_payloads = {}
    changes = sorted([(item['_stamp'], path.name, data, item)
                      for path, data in batches for item in data['entries']], key=lambda x: (x[0], x[1]))
    count = 0
    for _, filename, data, item in changes:
        event = item['eventId']
        signature = json.dumps([item['collection'], item['row'], item['fields']], ensure_ascii=False, sort_keys=True)
        if event in seen_payloads and seen_payloads[event] != signature:
            raise ValueError(f'{filename}：同一反馈事件内容冲突，不写入')
        seen_payloads[event] = signature
        if event in by_event:
            old = by_event[event]
            if (old['集合'], old['行'], old['字段']) != (item['collection'], item['row'], item['fields']):
                raise ValueError(f'{filename}：已入Git反馈事件内容不同，不覆盖')
            continue
        if item['row'] not in known_rows[item['collection']]:
            raise ValueError(f'{filename}：找不到反馈目标 {item["row"]}，保留文件等待核对')
        number = max([int(e['id'][1:]) for e in pending['条目']] + [0]) + 1
        evidence = f'用户主动导出本机看板反馈 {filename}；事件 {event}；时间 {item["at"]}。'
        entry = {'id': f'P{number:03}', '时间': item['at'], '谁': '用户（本地HTML反馈）',
                 '集合': item['collection'], '行': item['row'], '字段': item['fields'],
                 '依据': evidence, '基于': data.get('baseSnapshotAt', snapshot['导出时间']),
                 '基于字段': item['baseValues'], '反馈事件': event,
                 'appliedAt': None, '应用结果': ''}
        pending['条目'].append(entry)
        by_event[event] = entry
        count += 1
    assert pending['条目'][:len(original['条目'])] == original['条目']
    if count:
        write_atomic(pending_path, json.dumps(pending, ensure_ascii=False, indent=2) + '\n')
    return count


def build(root, at, head):
    snapshot = read_json(root / '协作/看板快照.json')
    pending = read_json(root / '协作/看板待同步.json')
    view = project(snapshot, pending, at, head)
    page_path = root / '协作/全局看板.html'
    page = page_path.read_text(encoding='utf-8')
    if len(SNAP_RE.findall(page)) != 1:
        raise ValueError('HTML中缺唯一snap数据块，未写入')
    runtime = (root / '协作/看板本机反馈.js').read_text(encoding='utf-8').replace('</script', '<\\/script')
    page = RUNTIME_RE.sub('', page)
    blob = json.dumps(view, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    page = SNAP_RE.sub(lambda m: m.group(1) + blob + m.group(2), page)
    page = page.replace('<script type="application/json" id="snap">',
                        '<script id="local-feedback-runtime">\n' + runtime + '\n</script>\n<script type="application/json" id="snap">', 1)
    write_atomic(root / '协作/看板本地视图.json', json.dumps(view, ensure_ascii=False, indent=1) + '\n')
    write_atomic(page_path, page)
    return view


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--time', help='生成时间，ISO带时区；巡检取当前时间后传入')
    parser.add_argument('--head', help='巡检读到的来源HEAD；默认当前Git HEAD')
    parser.add_argument('--collect-feedback', action='store_true', help='收集约定目录/下载目录中的主动导出反馈')
    parser.add_argument('--feedback-from', nargs='*', type=Path, default=[], help='另给反馈JSON路径')
    args = parser.parse_args()
    at = args.time or datetime.now(timezone(timedelta(hours=8))).isoformat(timespec='seconds')
    if datetime.fromisoformat(at).tzinfo is None:
        raise ValueError('--time必须带时区')
    files = sorted(set(args.feedback_from + (feedback_files(ROOT) if args.collect_feedback else [])))
    imported = import_feedback(ROOT, files) if files else 0
    head = args.head or subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    view = build(ROOT, at, head)
    info = view['本地视图']
    print(f'本地视图已生成：待云端应用{len(info["尚未应用"])}条；本次导入反馈{imported}条；' +
          '、'.join(f'{coll} {len(view[coll])}' for coll in COLLS))


if __name__ == '__main__':
    main()
