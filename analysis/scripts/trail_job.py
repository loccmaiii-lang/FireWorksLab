"""升空尾缀的本地任务（显卡跑）：校准 → 渐变图 → 导出 2K + 4K → 视频，全部写进 analysis/results/<id>/。

任务文件（analysis/jobs/<id>.json）：
  { "id": "TR1", "type": "trail", "name": "...",
    "sizes": { "S": {"start": 起点 json 路径或参数覆盖 dict, "rounds": 2}, "M": {...}, "L": {...} },
    "ramp": true,             # 按实拍拟合渐变图
    "export": true,           # 用校准结果导出（2K + 4K 母版 + 两个消散版本）
    "video": true,            # 每档预览 ×2、实拍对照、三档对比图（export 为 true 时才有）
    "previews": true,         # false：只出实拍对照和三档对比（快）
    "tex": "3.0A",            # 可选：质感对尾缀3.0_A（4K），造型仍对各档原实拍
    "scale": 1 }              # 校准时的烘焙倍率（质感对 4K 实拍时用 1）
结果分两处，省流量：
  analysis/results/<id>/（上传，几 MB）：
    尾缀_<档>_配方.json / _对照.jpg / _数值.json    校准结果（Claude 读完写回烘焙器配方）
    尾缀_<档>_小图.jpg                              对照视频 4 个时刻 + 2K 贴图原尺寸局部（Claude 用它判断清晰度）
    升空尾缀_三档对比.jpg、参数表 txt / json
  analysis/local/输出/<id>/（不上传，git 忽略）：
    RiseTrail_<档>/ 2K + 4K 贴图、各档预览视频、实拍对照视频 —— 你在本机直接看、直接导进引擎
"""
import os, sys, json, io, base64, zipfile, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def run(job, s, out, log=print):
    import trail_calib as TC, trail_ramp as TRm, trail_video as TV
    sizes = job['sizes']
    for k, cfg in sizes.items():
        st = cfg.get('start')
        if isinstance(st, str): st = json.load(open(os.path.join(ROOT, st), encoding='utf-8'))
        t = time.time()
        tex, sc = job.get('tex'), job.get('scale', 0.25)
        TC.main(k, cfg.get('rounds', 2), st or {}, log=log, s=s, out=out, cap=cfg.get('cap', True), tex=tex, scale=sc)
        log(f'{k} 校准用时 {(time.time() - t) / 60:.1f} 分钟')
        if job.get('ramp', True):
            TRm.main(k, log=log, s=s, out=out, tex=tex, scale=sc)
    if not job.get('export', True): return
    sd = os.path.join(ROOT, 'analysis', 'local', '输出', job['id']); os.makedirs(sd, exist_ok=True)   # 大文件留在本机
    for k in sizes:
        over = json.load(open(os.path.join(out, f'尾缀_{k}_配方.json'), encoding='utf-8'))
        over['trExport4K'] = job.get('export4K', 1)
        t = time.time()
        b64 = s.pg.evaluate(f"__fw.trailExport('trail{k}', {json.dumps(over)}, 'RiseTrail_{k}')")
        d = os.path.join(sd, f'RiseTrail_{k}'); os.makedirs(d, exist_ok=True)
        zipfile.ZipFile(io.BytesIO(base64.b64decode(b64))).extractall(d)
        log(f'{k} 导出 {(time.time() - t):.0f} 秒：' + '、'.join(sorted(os.listdir(d))))
    if job.get('video', True):
        TV.main(sd, ''.join(sizes), previews=job.get('previews', True), log=log)
        import shutil
        for k in sizes:
            TV.small_sheet(sd, k, os.path.join(out, f'尾缀_{k}_小图.jpg'))
            for f in (f'RiseTrail_{k}_Cascade参数.txt', f'RiseTrail_{k}.json'):
                shutil.copy(os.path.join(sd, f'RiseTrail_{k}', f), os.path.join(out, f))
        p3 = os.path.join(sd, '升空尾缀_三档对比.jpg')
        if os.path.exists(p3): shutil.copy(p3, out)
        log(f'大文件（贴图、视频）在 {sd}，不上传')
