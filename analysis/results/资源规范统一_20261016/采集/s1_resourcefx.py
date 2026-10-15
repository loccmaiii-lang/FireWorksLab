# 第 1 步 · 读 ResourceFX 两张表里「跨年烟花3.0_」的行（只读，分页 /datatable/rows；大响应会 10053，所以小页）。
import json, time, sys
import ue_ro

T = {'pc': '/Game/R13N/Common/PC/DataTables/Resource/ResourceFXTable',
     'mobile': '/Game/DataTables/Resource/ResourceFXTable'}
KEEP = ['_row_name', 'RowDescription', 'ResourceId', 'FxSP', 'FxSP_Low', 'FxSP_High', 'EffectScale', 'FXType',
        'MaxInstanceNum', 'bLimitByMaxInstanceNum']


def is30(r):
    return str(r.get('_row_name', '')).startswith('跨年烟花3.0_') or str(r.get('RowDescription', '')).startswith('跨年烟花3.0_')


out = {'format': 'df.resourcefx-30-rows/1', 'readAt': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'tables': T,
       'method': '/datatable/rows 分页（offset/limit），只读', 'pages': [], 'errors': []}
for side, table in T.items():
    first = ue_ro.request('/datatable/rows', {'table': table, 'limit': 1, 'offset': 0})
    total = first['total']
    rows = []
    off, lim = 0, 15
    while off < total:
        try:
            r = ue_ro.request('/datatable/rows', {'table': table, 'limit': lim, 'offset': off}, retry_abort=1)
            got = r.get('rows', [])
            rows.extend(got)
            out['pages'].append({'side': side, 'offset': off, 'limit': lim, 'n': len(got)})
            off += lim
            lim = 15
        except ue_ro.UEError as e:
            if lim > 1:
                lim = max(1, lim // 3)
                continue
            out['errors'].append({'side': side, 'offset': off, 'error': str(e)})
            off += 1
            lim = 15
    out[side + 'Total'] = total
    out[side + 'Read'] = len(rows)
    out[side] = [{k: r.get(k) for k in KEEP} for r in rows if is30(r)]
    print(side, 'total', total, 'read', len(rows), '3.0 rows', len(out[side]), 'errors', len([e for e in out['errors'] if e['side'] == side]), flush=True)

json.dump(out, open('resourcefx_30.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(ue_ro.LOG, open('log_s1.json', 'w', encoding='utf-8'), ensure_ascii=False)
