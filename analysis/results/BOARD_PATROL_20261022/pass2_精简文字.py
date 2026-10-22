#!/usr/bin/env python3
"""10-22 15:55 用户反馈「文字信息密度太多、太碎」后的第二步：把现在 / 下一步里最长的标题和推荐压短。
原标题、原推荐整段挪进 detail 开头（不丢），只动 title / recommend / blocks / detail 四个字段。
用法：pass2_精简文字.py <快照json> <输出目录>   → 每行一个 <id>.json（给 ArtifactData update 用）+ pass2回滚补丁.json
"""
import json, os, sys, re
snap, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
I = json.load(open(snap, encoding="utf-8"))["items"]
NEW = {
 "i24": {"title": "上线前迭代清单：10 项各选 换新版 / 留旧版 / 舍弃",
         "recommend": "只在已有进展的 5 项上继续：金垂柳、金芒菊、金曜菊、银彩菊、多重菊颜色随机；其余 5 项先留旧版（推断）。只改贴图 / 颜色 / 随机性，不加层。",
         "blocks": "i37 逐项出新版"},
 "i37": {"title": "7 个重做 + 3 个重导：等 i24 选完再派"},
 "n102": {"title": "网格垂柳 / 金垂柳 A/B 第 2 版：看完选一个预设"},
 "n91": {"title": "窜天猴 PC / 手游终版：进这一版，还是留到下一版",
         "recommend": "进这一版（终版导入 + 读回），或不进（沿用已有 SGRS1 柔光暗底的 PC / 手机包，更新排下一版）。不进不用做任何事。",
         "blocks": "n80 AI 侧核对"},
 "n95": {"title": "大 / 中号菊尺寸数据比编排大约三成：按 10-18 晚的大小封板",
         "recommend": "不改大小：10-18 晚性能测的就是现在的大小；以后重导这几行按那时的大小对齐。"},
 "n96": {"title": "大型_E_银彩菊 换 GoldSpark_HD（三层）：由你定什么时候放",
         "recommend": "复制 GoldSpark_HD 新建一个粒子给大型_E_银彩菊，别直接指它；三层比现在重，放完看一眼 61–163 s 帧率。编排不用改。"},
 "n99": {"title": "银彩菊老 GoldSpark：共享 Ramp 是 NeverStream，要不要换",
         "recommend": "共享贴图只列出来问：换一张烟花自己的 Ramp（Clamp + NoMip），或确认别的项目也在用就不动；EmissiveDissolve 要不要改 0.98 你定。"},
 "n80": {"title": "窜天猴终版入库后的 AI 侧核对（随 n91）"},
 "n88": {"title": "彩千轮 3.0：四个造型选一个，再导入 UE 看",
         "recommend": "要换就挑一个造型导入 UE，看 Bounds / 材质 / 事件；不换就沿用现有 2821。不加层、不新增结构。"},
}
REL = re.compile(r"今晚|今早|今天|明天|明晚|明早|昨晚|昨天|本周|这周|下周|周三前|周四以后|周四前")
rb = {}
for k, patch in NEW.items():
    r = I[k]; p = dict(patch)
    head = []
    if "title" in patch and patch["title"] != r["title"]: head.append("原标题：" + r["title"])
    if "recommend" in patch and patch["recommend"] != r.get("recommend", ""): head.append("完整推荐（原文）：" + r.get("recommend", ""))
    p["detail"] = ("【10-22 15:55 精简前的原文】" + "\n".join(head) + "\n" if head else "") + r.get("detail", "")
    for f in ("title", "recommend", "blocks", "next", "waitsOn"):
        if f in p: assert not REL.search(p[f]), (k, f)
    json.dump(p, open(f"{out}/{k}.json", "w", encoding="utf-8"), ensure_ascii=False)
    rb[k] = {f: r.get(f, "") for f in p}
json.dump({"说明": "第二步（精简文字）之前的值；要回到巡检前，先用上一级的 回滚补丁.json", "items": rb}, open(f"{out}/pass2回滚补丁.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(NEW), "rows ->", out)
