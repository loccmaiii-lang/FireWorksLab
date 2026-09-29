"""导出任务的烘焙器预览：把导出的 2K 母版（大面片序列）打成 preview.js，放进结果目录，
烘焙器迭代区点开就按引擎方式播放导出的真实贴图（帧号曲线取整、不混合、Size By Life、Color Over Life、渐变图）。

一个导出任务里的几套导出（比如 JinMangJu_Zoom / JinMangJu_Fixed）做成右栏「贴图」里可以切换的几个版本。
用法：export_job.py 导出完自动调用；也可以手动：python export_preview.py <任务结果目录> <大文件目录> <导出名1> [导出名2 ...]
"""
import base64, glob, io, json, os, re, sys
from PIL import Image


def _enc(im, fmt='PNG'):
    b = io.BytesIO(); im.save(b, fmt, optimize=True)
    return f'data:image/{fmt.lower()};base64,' + base64.b64encode(b.getvalue()).decode()


def _find(d, name, part):
    """素材包命名（spec 示例，2026-09-29 晚起）T_<名>[_<部件>].png；也认 2026-09-28 的 T_EFX_FireWorks_<名>[_<部件>]_<列>x<行>_01.png"""
    sfx = "_" + part if part else ""
    new = f'T_{name}{sfx}.png'
    if os.path.exists(os.path.join(d, new)): return new
    pat = re.compile(rf'T_EFX_FireWorks_{re.escape(name)}{sfx}(_\d+x\d+)?_01\.png$')
    return next((f for f in sorted(os.listdir(d)) if pat.fullmatch(f)), None)


def build(out, big, names, title=None, note=''):
    variants, texes, images = {}, {}, {}
    wh_max = 0
    for name in names:
        d = os.path.join(big, name)
        meta = json.load(open(os.path.join(d, f'{name}.json'), encoding='utf-8'))
        tex = meta['texture']; L = (tex['cols'], tex['rows']); M = meta.get('materialDefaults', {})
        if meta.get('segments'): continue            # 两段（A/B）的母版先不做预览
        heads = [('Head', _find(d, name, 'Head')), ('Tail', _find(d, name, 'Tail'))] if tex.get('output') == 'split' else [('', _find(d, name, ''))]
        ramp = _find(d, name, 'Ramp'); cut = _find(d, name, 'Cutout')
        W, H = meta['spriteSizeCm'][0] / 100, meta['spriteSizeCm'][1] / 100; wh_max = max(wh_max, W, H)
        gain = M.get('headInt', 1)
        col = [[u, [round(c * gain, 4) for c in rgb]] for u, rgb in meta['colorOverLife']]
        variants[name] = name.split('_')[-1] if '_' in name else name
        for part, f in heads:
            if not f: continue
            im = Image.open(os.path.join(d, f)).convert('RGBA'); S = im.width   # 原尺寸：缩小会让迭代区里看起来比真实贴图糊（2026-09-29 用户指出 JM2E 特别糊）
            for c, band in zip('RGBA', im.split()):      # 每个通道单独一张灰度图（避免浏览器按透明度预乘）
                images[name + '/' + f + '#' + c] = _enc(band.resize((S, S * im.height // im.width), Image.BOX))
            texes.setdefault(part or '主体', {})[name] = {
                'file': name + '/' + f, 'mode': 'gray', 'ramp': name + '/' + ramp if ramp else None, 'cols': L[0], 'rows': L[1], 'chans': tex['channels'],
                'frames': tex['frames'], 'keys': meta['frameCurve']['keys'], 'col': col, 'tone': 'baker', 'gamma': 1 if '线性' in tex.get('encoding', '') else 2.2,
                'cutout': name + '/' + cut if cut else None, 'wh': [W, H], 'sizeKeys': meta.get('sizeByLife'), 'offset': [0, meta.get('burstOffsetZcm', 0) / 100] if not meta.get('sizeByLife') else [0, 0]}
        if ramp: images[name + '/' + ramp] = _enc(Image.open(os.path.join(d, ramp)))
        if cut: images[name + '/' + cut] = _enc(Image.open(os.path.join(d, cut)).resize((256, 256), Image.BOX))
        dur = meta['duration']
    ems = [{'name': part, 'index': str(i + 1).zfill(2), 'tex': tx, 'cutout': None, 'life': [dur, dur], 'bursts': [[0, 1]],
            'sphere': {'r': 0, 'vel': 0}, 'drag': 0, 'accel': [0, 0, 0], 'size': [1, 1], 'rot': False, 'seed': 1} for i, (part, tx) in enumerate(texes.items())]
    man = {'title': title or ' / '.join(names), 'duration': round(dur + 0.3, 2), 'view': round(wh_max * 1.08, 1), 'variants': variants, 'emitters': ems, 'note': note}
    jid = os.path.basename(os.path.normpath(out))
    open(os.path.join(out, 'preview.js'), 'w', encoding='utf-8').write('FW_ASSET_LOADED(' + json.dumps(jid) + ', ' + json.dumps({'manifest': man, 'images': images}, ensure_ascii=False) + ');\n')
    return os.path.getsize(os.path.join(out, 'preview.js'))


if __name__ == '__main__':
    print(build(sys.argv[1], sys.argv[2], sys.argv[3:]))
