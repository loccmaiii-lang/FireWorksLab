"""把「跑完、等用户确认」的任务结果写进烘焙器的花型库（「实拍复刻」分类里带「待你确认 · 任务号」标签）。

用户打开 tool/FireworkBaker.html → 花型「更换」→「实拍复刻」就能直接预览、和实拍对照、导出，不用看视频。
生成 tool/src/js/14_pending.js；改完运行 python tool/build.py。

用法：python analysis/scripts/pending_to_baker.py
要加新结果：在下面 PENDING 里加一项。用户确认后把那一项搬进 15_replica.js 的 REPLICAS（状态改成「已确认」），再从这里删掉。
"""
import base64, io, json, os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RES = os.path.join(ROOT, 'analysis', 'results')

# 每项：结果目录、种类（花型：best.json；尾缀：尾缀_<档>_配方.json）
PENDING = [
    dict(id='QN1', task='QN1', name='青柠星', kind='best', video='vidio/2.0/青柠星.mp4', tags='青柠 牡丹 变色 2.0',
         note='青柠星第 1 轮：大小、张开速度、颜色接近；还缺星尾，球壳边缘不够亮（下一轮 QN2）'),
    dict(id='WC1', task='WC1', name='万彩千轮（整体模拟）', kind='best', video='vidio/2.0/万彩千轮B.mp4', tags='千轮 子花 2.0',
         note='万彩千轮第 1 轮整体模拟：开头对，之后散成一片、颜色一起变。引擎做法已改为「单元 × 粒子」，看「素材」页的 PW2'),
    dict(id='TR2S', task='TR2', name='升空尾缀 · 小（第五版）', kind='trail', size='S', base='trailS', video='vidio/2.0/尾缀C.mp4', tags='尾缀 上升 小 TR2',
         note='TR2 小档：长约 33 m（目标 20 m，偏长）；和实拍比颗粒太细、太淡，白热段不够连续'),
    dict(id='TR2M', task='TR2', name='升空尾缀 · 中（第五版）', kind='trail', size='M', base='trailM', video='vidio/2.0/尾缀B.mp4', tags='尾缀 上升 中 TR2',
         note='TR2 中档：长约 58 m（目标 40 m，偏长）；实拍是过曝的白热段 + 大颗金色火星，模拟是细碎的淡金色颗粒'),
    dict(id='TR2L', task='TR2', name='升空尾缀 · 大（第五版）', kind='trail', size='L', base='trailL', video='vidio/2.0/尾缀A.mp4', tags='尾缀 上升 大 四尺玉 TR2',
         note='TR2 大档：长约 129 m（目标 90 m，偏长）；螺旋摆动有了，火星颗粒同样偏细'),
]


def thumb(path, box):
    im = Image.open(path).convert('RGB').crop(box).resize((160, 160), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=72)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()


def js(v): return json.dumps(v, ensure_ascii=False)


def main():
    items = []
    for e in PENDING:
        d = os.path.join(RES, e['task'])
        if e['kind'] == 'best':
            j = json.load(open(os.path.join(d, 'best.json'), encoding='utf-8')); P, M = j['P'], j['M']; base = P.get('type', 'kiku')
            p = {k: v for k, v in P.items() if k != 'type'}
            sheet = os.path.join(d, '对照.jpg')   # compare.sheet：左 90 px 标签，每格 300，第 2 列 = 燃烧 30%
            tr, ts = thumb(sheet, (390, 30, 690, 330)), thumb(sheet, (390, 330, 690, 630))
        else:
            j = json.load(open(os.path.join(d, f"尾缀_{e['size']}_配方.json"), encoding='utf-8'))
            M = j.get('_ramp', {}); p = {k: v for k, v in j.items() if not k.startswith('_')}; base = e['base']
            sp = os.path.join(d, f"尾缀_{e['size']}_对照.jpg"); w, h = Image.open(sp).size   # 左半实拍、右半模拟，各取上部一块
            s0 = min(h, int(w * 0.36)); tr, ts = thumb(sp, (0, 0, s0, s0)), thumb(sp, (int(w * 0.52), 0, int(w * 0.52) + s0, s0))
        items.append('  { ' + ', '.join([f"id: {js(e['id'])}", f"name: {js(e['name'])}", f"base: {js(base)}", f"video: {js(e['video'])}",
                                         f"status: {js('待你确认 · ' + e['task'])}", f"task: {js(e['task'])}", f"note: {js(e['note'])}", f"tags: {js(e['tags'])}",
                                         f"p: {js(p)}", f"m: {js(M)}", f"thumbRef: '{tr}'", f"thumbSim: '{ts}'"]) + ' }')
    out = os.path.join(ROOT, 'tool', 'src', 'js', '14_pending.js')
    open(out, 'w', encoding='utf-8').write('// 由 analysis/scripts/pending_to_baker.py 生成：跑完、等你确认的任务结果（花型库 → 实拍复刻）。不要手改。\n'
                                          'const PENDING_REPLICAS = [\n' + ',\n'.join(items) + '\n];\n')
    print('写入', len(items), '项 →', out)


if __name__ == '__main__':
    main()
