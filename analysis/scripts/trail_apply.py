"""把校准结果（analysis/replica/尾缀_<档>_配方.json）写回烘焙器的三档配方（tool/src/js/10_types.js 的 trailS / trailM / trailL）。
  python trail_apply.py
只改这三项的 p（参数）和 m（渐变图），其余不动；写完记得 python tool/build.py。
"""
import os, re, json
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
P_TYPES = os.path.join(ROOT, 'tool', 'src', 'js', '10_types.js')
KEEP_ORDER = ['form', 'riseH', 'vtShell', 'trV', 'trInh', 'trDrag', 'trGrav', 'trCool', 'trIgnite',
              'trFRate', 'trFLife', 'trFSpread', 'trFSize', 'trFBright', 'trMRate', 'trMLife', 'trMSpread', 'trMSize', 'trMBright',
              'trCRate', 'trCLife', 'trCSpread', 'trCSize', 'trCBright', 'trWRate', 'trWLife', 'trWSpread', 'trWSize', 'trWBright',
              'trHeadSize', 'trHeadBright', 'trHalo', 'trHaloBright', 'trTwist', 'trTwistN', 'trWiggle', 'trBright',
              'zoom', 'cols', 'rows', 'chans', 'texW', 'texH', 'shutter']


def js_val(v):
    if isinstance(v, str): return f"'{v}'"
    if isinstance(v, float): return f'{v:.5g}'
    return str(v)


def parse_obj(txt):
    """把 { a: 1, b: 'x', ... } 这种简单对象字面量读成 dict"""
    out = {}
    for k, v in re.findall(r"(\w+):\s*('[^']*'|\[\[.*?\]\]|[-\d.eE]+)", txt):
        out[k] = v.strip("'") if v.startswith("'") else (v if v.startswith('[') else float(v) if ('.' in v or 'e' in v.lower()) else int(v))
    return out


def main():
    s = open(P_TYPES, encoding='utf-8').read()
    for size in 'SML':
        fp = os.path.join(ROOT, 'analysis', 'replica', f'尾缀_{size}_配方.json')
        if not os.path.exists(fp): print('跳过', size); continue
        over = json.load(open(fp, encoding='utf-8')); ramp = over.pop('_ramp', {})
        m = re.search(r"  trail%s: \{ p: \{(.*?)\},\n    m: \{(.*?)\} \}," % size, s, re.S)
        assert m, size
        p = parse_obj(m.group(1)); mm = m.group(2)
        for k, v in over.items(): p[k] = round(v, 5) if isinstance(v, float) else v
        keys = [k for k in KEEP_ORDER if k in p] + [k for k in p if k not in KEEP_ORDER]
        lines, cur = [], []
        for k in keys:
            cur.append(f'{k}: {js_val(p[k])}')
            if len(cur) == 6: lines.append(', '.join(cur)); cur = []
        if cur: lines.append(', '.join(cur))
        mtxt = mm
        for k, v in ramp.items(): mtxt = re.sub(rf"{k}: '#[0-9a-fA-F]+'", f"{k}: '{v}'", mtxt)
        new = f"  trail{size}: {{ p: {{ " + ',\n    '.join(lines) + " },\n    m: {" + mtxt + "} },"
        s = s[:m.start()] + new + s[m.end():]
        print(size, '已写入', len(over), '项参数', ramp)
    open(P_TYPES, 'w', encoding='utf-8').write(s)


if __name__ == '__main__':
    main()
