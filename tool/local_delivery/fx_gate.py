"""导入前拦截（4.9.69，导出（23）写；用户 10-12 19:44「有一个导出和导入拦截，不符合规范就不要导入」）。

只读交付包和交付根目录里的共享贴图登记，不连 UE、不改导入器。规则按 spec/烟花特效资产规范.md v1，
和烘焙器导出拦截（tool/src/js/63_gate.js）同一套：

  手机配置（cascade_mobile*.json）
    1. 名字不带 _HD / _Mobile；tier 是 H / M；名字以 _<tier> 结尾（规范 §2，不做 _L）
    2. 发射器 ≤ 3（_M）/ ≤ 6（_H，用户待定）；没有 GPU；每个发射器写 max_alive 且 ≤ 50；同一时刻最多 1 张大序列（§6）
    3. 引用的贴图名不带 _HD；所有贴图 ≤ 1024（§3，用户 10-12 22:01：严格拦，不留「警告沿用」）
  所有配置
    4. 派生资源（derived）贴图名沿用原效果（§2）
    5. 贴图内容和配置里记的 sha256 一致（包没被改过）
  共享贴图登记（交付根目录 .workspace/texture-fingerprints.json，换浏览器 / 换会话都在）
    6. 同名贴图已登记、内容不同、来自别的效果 → 拦（撞名）
    7. 内容相同的序列图已用别的名字登记 → 拦，写出该改用哪张（§3「同一内容只留一份」）
       Ramp / 轮廓图内容相同 → 不拦，写「导入器会复用 X」（导入器自己按指纹复用这两类）

用法：
  python tool/local_delivery/fx_gate.py <交付修订目录或 zip> [--root <交付根目录>] [--json]
  python tool/local_delivery/fx_gate.py <交付修订目录> --root <根> --register     # 导入成功后登记贴图
退出码：0 通过，1 拦下，2 用法 / 读包错误。

没做（要连 UE，在本机写）：导入后读回 LOD、发射器数、GPU、引用越界、Mesh / Ribbon、两表一致、资源发射器数.json。
"""
import argparse
import hashlib
import json
import re
import struct
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import PurePosixPath

CFG_RE = re.compile(r'(^|/)cascade(_mobile(_h)?|_low)?\.json$')
TIER = {'M': 3, 'H': 6}
MAX_ALIVE = 50
MOBILE_TEX = 1024
TEX_PREFIX = 'T_EFX_FireWorks_'
REGISTRY = '.workspace/texture-fingerprints.json'
REUSE_CLASSES = ('ramp', 'cutout')


def png_size(data):
    if len(data) < 24 or data[:8] != b'\x89PNG\r\n\x1a\n':
        return None
    return list(struct.unpack('>II', data[16:24]))


def read_package(path):
    """→ {包内路径: bytes}。目录或 zip。"""
    from pathlib import Path
    p = Path(path)
    files = {}
    if p.is_dir():
        for f in p.rglob('*'):
            if f.is_file() and '.workspace' not in f.parts:
                files[f.relative_to(p).as_posix()] = f.read_bytes()
    elif p.is_file() and p.suffix.lower() == '.zip':
        with zipfile.ZipFile(p) as z:
            for info in z.infolist():
                if not info.is_dir():
                    files[info.filename] = z.read(info)
    else:
        raise FileNotFoundError(f'不是交付目录或 zip：{path}')
    return files


def asset_of(t):
    return t.get('asset') or PurePosixPath(str(t.get('file', ''))).stem


def check_config(name, j, png):
    """一份配置的问题（和 63_gate.js packGateConfig 同一套规则）。png：包内路径 → {sha256, size}。"""
    bad = []
    d = str(PurePosixPath(name).parent)
    d = '' if d == '.' else d + '/'
    tag = PurePosixPath(name).name
    mobile = '_mobile' in tag or j.get('platform') == 'mobile'
    texs = [(k, t) for k, t in (j.get('textures') or {}).items() if isinstance(t, dict) and t.get('file')]
    ems = [e for e in j.get('emitters') or [] if e.get('enabled', True) is not False]
    for k, t in texs:
        got = png.get(d + t['file'])
        if got is None:
            bad.append(f'{tag}：配置引用的贴图不在包里：{t["file"]}')
        elif t.get('sha256') and t['sha256'] != got['sha256']:
            bad.append(f'{tag}：{t["file"]} 的内容和配置里记的 sha256 不一致（包被改过）')
    der = j.get('derived') or {}
    if der.get('from'):
        stem = TEX_PREFIX + der['from']
        wrong = [asset_of(t) for _, t in texs if not asset_of(t).startswith(stem)]
        if wrong:
            bad.append(f'{tag}：派生资源开了新贴图名 {"、".join(wrong)}（应沿用 {stem}_…，规范 §2）')
    if not mobile:
        return bad
    nm, tier = str(j.get('name') or ''), j.get('tier')
    if re.search(r'_HD(_|$)', nm, re.I) or re.search(r'_Mobile(_|$)', nm, re.I):
        bad.append(f'{tag}：手机包名字「{nm}」带 _HD / _Mobile（规范 §2：<名>_H / _M）')
    if tier not in TIER:
        bad.append(f'{tag}：档位「{tier if tier is not None else "没写"}」不是 H / M（规范 §2，不做 _L）')
    elif not nm.endswith('_' + tier):
        bad.append(f'{tag}：手机包名字「{nm}」不是以 _{tier} 结尾')
    lim = TIER.get(tier, TIER['M'])
    if len(ems) > lim:
        bad.append(f'{tag}：发射器 {len(ems)} 个，超过 _{tier if tier in TIER else "M"} 上限 {lim}（规范 §6）')
    gpu = [e.get('name') for e in ems if e.get('gpu')]
    if gpu:
        bad.append(f'{tag}：有 GPU 发射器 {"、".join(gpu)}（手游不能有 GPU）')
    no_alive = [e.get('name') for e in ems if e.get('max_alive') is None]
    over = [f'{e.get("name")} {e.get("max_alive")}' for e in ems if e.get('max_alive') is not None and float(e['max_alive']) > MAX_ALIVE]
    if no_alive:
        bad.append(f'{tag}：发射器没写 max_alive：{"、".join(no_alive)}')
    if over:
        bad.append(f'{tag}：同时活着的粒子超过 {MAX_ALIVE}：{"、".join(over)}')
    textures, mats = j.get('textures') or {}, j.get('materials') or {}
    flip = lambda k: isinstance(textures.get(k), dict) and textures[k].get('class') == 'flipbook'
    seq = []
    for e in ems:
        m = (mats.get(e.get('material')) or {}).get('textures') or {}
        if any(flip(v) for v in m.values()):
            r = e.get('required') or {}
            d0 = float(r.get('delay_s') or 0)
            seq.append((e.get('name'), d0, d0 + float(r.get('duration_s') or 0)))
    most, who = 0, []
    for _, a, _ in seq:
        live = [s for s in seq if s[1] <= a + 1e-6 and s[2] > a + 1e-6]
        if len(live) > most:
            most, who = len(live), [s[0] for s in live]
    if most > 1:
        bad.append(f'{tag}：同一时刻有 {most} 张大序列（{" + ".join(who)}）；手游中低配只能 1 张（规范 §6）')
    hd = [asset_of(t) for _, t in texs if re.search(r'_HD(_|$)', asset_of(t), re.I)]
    if hd:
        bad.append(f'{tag}：手机材质引用了 _HD 贴图 {"、".join(hd)}（规范 §3）')
    big = []
    for _, t in texs:
        s = (png.get(d + t['file']) or {}).get('size')
        if s and max(s) > MOBILE_TEX:     # 用户 10-12 22:01：手游所有贴图都不超 1024，严格拦
            big.append(f'{asset_of(t)}（{s[0]}×{s[1]}）')
    if big:
        bad.append(f'{tag}：手机贴图超过 {MOBILE_TEX}：{"、".join(big)}（新出一张 1024，或复制 PC 那张到手游目录、最大尺寸设 1024）')
    return bad


def load_registry(root):
    from pathlib import Path
    p = Path(root) / REGISTRY if root else None
    if p and p.is_file():
        return json.loads(p.read_text(encoding='utf-8-sig'))
    return {'format': 'df.texture-fingerprints/1', 'textures': {}}


def check_registry(classes, png_by_asset, registry, source):
    """撞名 / 内容重复。classes：资产名 → 类别；png_by_asset：资产名 → {sha256, size}。"""
    bad, info = [], []
    known = registry.get('textures') or {}
    by_sha = {}
    for a, v in known.items():
        by_sha.setdefault(v.get('sha256'), []).append(a)
    for a, v in png_by_asset.items():
        k = known.get(a)
        if k and k.get('sha256') != v['sha256'] and k.get('source') and source and k['source'] != source:
            bad.append(f'{a}：和已登记的贴图撞名但内容不同（那份来自 {k.get("resource") or k["source"]}）')
        same = [x for x in by_sha.get(v['sha256'], []) if x != a]
        if same and not k:
            if classes.get(a) in REUSE_CLASSES:
                info.append(f'{a}：内容和已登记的 {same[0]} 相同，导入器会复用那张')
            else:
                bad.append(f'{a}：内容和已登记的 {same[0]} 相同（规范 §3 同一内容只留一份）：改用 {same[0]}')
    return bad, info


def check(path, root=None, source=None):
    files = read_package(path)
    png = {f: {'sha256': hashlib.sha256(d).hexdigest(), 'size': png_size(d)} for f, d in files.items() if f.lower().endswith('.png')}
    bad, cfgs = [], []
    for f, d in sorted(files.items()):
        if CFG_RE.search(f):
            try:
                j = json.loads(d.decode('utf-8-sig'))
            except ValueError as e:
                bad.append(f'{f}：不是 JSON（{e}）')
                continue
            cfgs.append((f, j))
            bad += check_config(f, j, png)
    if not cfgs:
        bad.append('包里没有 cascade*.json')
    classes, by_asset = {}, {}
    for f, j in cfgs:
        d = str(PurePosixPath(f).parent)
        d = '' if d == '.' else d + '/'
        for t in (j.get('textures') or {}).values():
            if isinstance(t, dict) and t.get('file') and d + t['file'] in png:
                a = asset_of(t)
                classes[a] = t.get('class')
                by_asset[a] = png[d + t['file']]
    if source is None:
        meta = files.get('workspace-resource.json')
        source = (json.loads(meta.decode('utf-8-sig')).get('metadata') or {}).get('sourceKey', '') if meta else ''
    reg_bad, info = check_registry(classes, by_asset, load_registry(root), source)
    return {'ok': not (bad or reg_bad), 'problems': bad + reg_bad, 'info': info, 'configs': [f for f, _ in cfgs],
            'textures': {a: {**v, 'class': classes.get(a)} for a, v in by_asset.items()}, 'source': source}


def register(result, root, resource=''):
    """导入成功后把这一包的贴图登记进共享表（先读后写，已有同名同内容不动）。"""
    from pathlib import Path
    reg = load_registry(root)
    now = datetime.now(timezone.utc).isoformat()
    for a, v in result['textures'].items():
        if a not in reg['textures']:
            reg['textures'][a] = {'sha256': v['sha256'], 'size': v['size'], 'class': v.get('class'), 'source': result.get('source', ''), 'resource': resource, 'first_seen': now}
    p = Path(root) / REGISTRY
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix('.tmp')
    tmp.write_text(json.dumps(reg, ensure_ascii=False, indent=1), encoding='utf-8')
    tmp.replace(p)
    return reg


def main(argv=None):
    ap = argparse.ArgumentParser(description='导入前拦截：按 spec/烟花特效资产规范.md v1 查交付包')
    ap.add_argument('package')
    ap.add_argument('--root', help='交付根目录（共享贴图登记在 .workspace/texture-fingerprints.json）')
    ap.add_argument('--source', help='这一包来自哪个效果（默认读 workspace-resource.json）')
    ap.add_argument('--register', action='store_true', help='通过后把贴图登记进共享表（导入成功后再用）')
    ap.add_argument('--json', action='store_true')
    a = ap.parse_args(argv)
    try:
        r = check(a.package, a.root, a.source)
    except (OSError, ValueError, zipfile.BadZipFile) as e:
        print(f'读包失败：{e}', file=sys.stderr)
        return 2
    if a.register and r['ok'] and a.root:
        register(r, a.root, PurePosixPath(a.package).name)
    if a.json:
        print(json.dumps(r, ensure_ascii=False, indent=1))
    else:
        print('✅ 通过' if r['ok'] else '❌ 拦下（不要导入）')
        for x in r['problems']:
            print('  · ' + x)
        for x in r['info']:
            print('  ℹ ' + x)
    return 0 if r['ok'] else 1


if __name__ == '__main__':
    sys.exit(main())
