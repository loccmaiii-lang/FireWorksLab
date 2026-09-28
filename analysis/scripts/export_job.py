"""本地导出任务（显卡）：按复刻配方 + 参数改动导出一套完整素材。
任务文件：
  { "id": "JM1", "type": "export", "name": "...",
    "replica": "JM",                 # tool/src/js/15_replica.js 里的复刻 id（或者用 "params": 参数 JSON 路径）
    "exports": { "导出名": {参数改动}, ... } }   # 每一项导出一套（贴图、帧号测试图、渐变图、参数表、曲线、JSON）
大文件留在本机 analysis/local/输出/<id>/<导出名>/；上传到 analysis/results/<id>/ 的只有参数表、JSON 和贴图的缩略预览。
"""
import os, sys, json, io, base64, zipfile, time
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cvcompat  # noqa: F401
import cv2
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def preview(png_path, out_path, max_side=1024):
    """RGBA 接力贴图的缩略预览：四个通道横排，每个缩到 max_side/2"""
    im = np.array(Image.open(png_path))
    if im.ndim == 2: im = im[..., None]
    ch = [im[..., c] for c in range(min(4, im.shape[2]))]
    h = max_side // 2; tiles = [cv2.resize(c, (h, h), interpolation=cv2.INTER_AREA) for c in ch]
    cv2.imwrite(out_path, np.hstack(tiles), [cv2.IMWRITE_JPEG_QUALITY, 85])


def run(job, s, out, log=print):
    big = os.path.join(ROOT, 'analysis', 'local', '输出', job['id'])
    for name, over in job['exports'].items():
        t = time.time()
        if job.get('replica'):
            src = f"replicaPM({json.dumps(job['replica'])})"
        else:
            src = f"__fw.resolve({json.dumps(json.load(open(os.path.join(ROOT, job['params']), encoding='utf-8')))}, 'x')"
        b64 = s.pg.evaluate(f"""(async () => {{ const r = {src}; const P = r.P, M = r.M; Object.assign(P, {json.dumps(over)});
            const u8 = await __fw.exportFiles(P, M, {json.dumps(name)}); let t = '';
            for (let i = 0; i < u8.length; i += 0x8000) t += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(t); }})()""")
        d = os.path.join(big, name); os.makedirs(d, exist_ok=True)
        zipfile.ZipFile(io.BytesIO(base64.b64decode(b64))).extractall(d)
        files = sorted(os.listdir(d)); log(f'{name} 导出 {time.time() - t:.0f} 秒：' + '、'.join(files))
        for f in files:
            p = os.path.join(d, f)
            if f.endswith(('.txt', '.json', '.csv')):
                import shutil; shutil.copy(p, os.path.join(out, f))
            elif f.endswith('.png') and not any(k in f for k in ('_Ramp', '_Cutout', '_FrameTest')):
                preview(p, os.path.join(out, f[:-4] + '_预览.jpg'))
    # 烘焙器迭代区的预览（真实导出贴图缩小一半，按引擎方式播放）
    try:
        import export_preview
        kb = export_preview.build(out, big, list(job['exports']), title=job.get('name'), note=job.get('note', '')) / 1024
        log(f'烘焙器预览 preview.js：{kb:.0f} KB')
    except Exception as e:
        log(f'烘焙器预览没做成（不影响导出）：{e}')
    log(f'大文件（贴图）在 {big}，不上传')
