"""按原PNG的线性颜色，仅收柔最暗8级；不修改配方或主序列。"""
from pathlib import Path
from io import BytesIO
import hashlib
import json
import zipfile
import numpy as np
from PIL import Image, PngImagePlugin

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
PACK = ROOT / 'outputs/金曜菊B闪烁试配_20261017/GlitterChry_S1.zip'
NAME = 'T_EFX_FireWorks_GlitterChry_S1_Lead_SoftToe_R.png'
END = 8


def linear(x):
    return np.where(x <= .04045, x / 12.92, ((x + .055) / 1.055) ** 2.4)


def srgb(x):
    return np.where(x <= .0031308, x * 12.92, 1.055 * x ** (1 / 2.4) - .055)


def sample_ramp(row):
    # 现有材质直接用灰度v查Ramp，纹素中心为(x+.5)/256。
    v = np.arange(256) / 255
    tx = np.clip(v * 256 - .5, 0, 255)
    lo = np.floor(tx).astype(int)
    hi = np.minimum(255, lo + 1)
    t = (tx - lo)[:, None]
    c = linear(row[:, :3] / 255)
    return ((1 - t) * c[lo] + t * c[hi]) * v[:, None]


with zipfile.ZipFile(PACK) as z:
    cascade = json.loads(z.read('cascade.json'))
    source_name = cascade['textures']['L1_ramp']['file']
    original_bytes = z.read(source_name)
    original = np.array(Image.open(BytesIO(original_bytes)).convert('RGBA'))
    atlas = np.array(Image.open(BytesIO(z.read(cascade['textures']['L1_seq']['file']))).convert('RGBA'))

assert original.shape == (8, 256, 4)
assert np.all(original[:, :, 3] == 255) and np.all(original[:, -1, :3] == 0)
result = original.copy()
t = np.arange(END) / END
gate = t ** 3 * (10 - 15 * t + 6 * t ** 2)
result[:, :END, :3] = np.rint(np.clip(srgb(linear(original[:, :END, :3] / 255) * gate[None, :, None]), 0, 1) * 255).astype('uint8')
assert np.array_equal(result[:, END:], original[:, END:])
assert np.all(result[:, 0, :3] == 0) and np.all(result[:, -1, :3] == 0)
assert np.all(result[:, :, 3] == 255)
pnginfo = PngImagePlugin.PngInfo()
pnginfo.add(b'sRGB', b'\x00')
Image.fromarray(result).save(OUT / NAME, pnginfo=pnginfo)
assert np.array_equal(np.array(Image.open(OUT / NAME)), result)

# 对照之前“只把四点曲线的暗色设黑”：用相同位置/线性插值构造，不作为另一个交付。
snapshot = json.loads((ROOT / 'analysis/results/GLITTER_TWINKLE_20261017/S1_烘焙参数.json').read_text(encoding='utf-8'))
mat = snapshot['layers'][0]['M']
keys = [np.zeros(3)] + [linear(np.array([int(mat['ramp' + str(i)][k:k + 2], 16) for k in (1, 3, 5)]) / 255) for i in (1, 2, 3)]
pos = [0, .3, .65, 1]
black = original[0].copy()
for x in range(255):
    v = x / 255
    i = next(k for k in range(1, 4) if v <= pos[k])
    q = (v - pos[i - 1]) / (pos[i] - pos[i - 1])
    black[x, :3] = np.rint(np.clip(srgb(keys[i - 1] * (1 - q) + keys[i] * q), 0, 1) * 255)
lum = np.array([.2126, .7152, .0722])
tables = [sample_ramp(x) @ lum for x in (original[0], result[0], black)]
frames = []
for f in range(cascade['textures']['L1_seq']['frames']):
    c, k = divmod(f, 16)
    y, x = divmod(k, 4)
    hist = np.bincount(atlas[y * 512:(y + 1) * 512, x * 512:(x + 1) * 512, c].ravel(), minlength=256)
    energy = [float(hist @ tb) for tb in tables]
    frames.append({'frame': f, 'original': energy[0], 'softToe': energy[1], 'blackEndpoint': energy[2]})
tail = [sum(f[k] for f in frames[3:]) for k in ('original', 'softToe', 'blackEndpoint')]
report = {
    'sourceZipSHA256': hashlib.sha256(PACK.read_bytes()).hexdigest(),
    'sourceRamp': source_name, 'sourceRampSHA256': hashlib.sha256(original_bytes).hexdigest(),
    'file': NAME, 'sha256': hashlib.sha256((OUT / NAME).read_bytes()).hexdigest(),
    'size': [256, 8], 'mode': 'RGBA8 / sRGB', 'alphaAll255': True,
    'lastColumnBlack': True, 'firstUnchangedColumn': END,
    'changedColumns': np.where(np.any(result != original, axis=(0, 2)))[0].tolist(),
    'curve': f'x<{END}: C_linear *= smootherstep(x/{END}); x>={END}与原PNG逐像素相同；第255列黑护栏保留',
    'materialSampleCodesUnchangedFrom': END + 1,
    'tailLinearEnergyRetained': {'softToe': tail[1] / tail[0], 'blackEndpoint': tail[2] / tail[0]},
    'measurementScope': '旧S1橙引线实际35帧，排除前3帧开花闪光，按现有灰度查色表和线性亮度积分；不是当前个人草稿、BC7或UE实测。',
    'frames': frames,
}
(OUT / '检查.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({k: v for k, v in report.items() if k != 'frames'}, ensure_ascii=False))
