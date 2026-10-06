"""回放检查.py 的复现检查：多层组合包的 Ramp（对话框新花型，2026-10-07）。

组合包（comboPackFiles）每层一个材质，Ramp 叫 L1_ramp / L2_ramp（材质 textures.ramp 指过去），单层包才叫 ramp。
以前 Pack 只认 textures.ramp → 多层包每层都当没有 Ramp（回放检查图全白，过曝也按白色算）。
这里造一个两层的小合成包：L1 的 Ramp 全红、L2 的全蓝，序列全亮；检查两层读到的 Ramp 各是红 / 蓝，合成出来的颜色也是。
  python3 analysis/scripts/回放检查_多层Ramp检查.py      → 过了退出码 0
"""
import json, os, sys, tempfile
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def make_pack(d):
    os.makedirs(d, exist_ok=True)
    seq = np.zeros((64, 64, 4), np.uint8); seq[8:56, 8:56, :] = 200     # 2×2 格、4 通道接力，每格中间一块亮
    for i, n in enumerate(('L1', 'L2')):
        Image.fromarray(seq, 'RGBA').save(os.path.join(d, f'{n}_seq.png'))
        ramp = np.zeros((8, 256, 3), np.uint8); ramp[..., 0 if i == 0 else 2] = 255
        Image.fromarray(ramp, 'RGB').save(os.path.join(d, f'{n}_R.png'))
    tex, mats, ems = {}, {}, []
    for n in ('L1', 'L2'):
        tex[f'{n}_seq'] = {'file': f'{n}_seq.png', 'class': 'flipbook', 'cols': 2, 'rows': 2, 'channels': 4, 'frames': 16}
        tex[f'{n}_ramp'] = {'file': f'{n}_R.png', 'class': 'ramp'}
        mats[f'{n}_main'] = {'role': 'flipbook_rgba', 'textures': {'main': f'{n}_seq', 'ramp': f'{n}_ramp'}}
        ems.append({'name': f'{n}_Main', 'material': f'{n}_main', 'required': {'duration_s': 1, 'delay_s': 0},
                    'modules': [{'m': 'Lifetime', 'Lifetime': {'const': 1}}, {'m': 'InitialSize', 'StartSize': {'const': [100, 100, 1]}},
                                {'m': 'ColorOverLife', 'ColorOverLife': {'curve': [[0, [1, 1, 1]], [1, [1, 1, 1]]]}, 'AlphaOverLife': {'const': 1}}]})
    json.dump({'format': 'fwl.cascade/1', 'textures': tex, 'materials': mats, 'emitters': ems}, open(os.path.join(d, 'cascade.json'), 'w', encoding='utf-8'))


def main():
    import importlib; rc = importlib.import_module('回放检查')
    d = os.path.join(tempfile.mkdtemp(prefix='fw_ramp_'), 'pack'); make_pack(d)
    bad = []
    for i, want in ((0, 0), (1, 2)):
        p = rc.Pack(d, i)
        if p.ramp is None: bad.append(f'第 {i + 1} 层没读到 Ramp（多层包的 Ramp 叫 L{i + 1}_ramp）'); continue
        mid = p.ramp[len(p.ramp) // 2]
        if int(np.argmax(mid)) != want or mid[want] < 0.5: bad.append(f'第 {i + 1} 层 Ramp 颜色不对：{np.round(mid, 3).tolist()}')
    print('✅ 多层包每层读到自己的 Ramp' if not bad else '❌ ' + '；'.join(bad))
    return 1 if bad else 0


if __name__ == '__main__':
    raise SystemExit(main())
