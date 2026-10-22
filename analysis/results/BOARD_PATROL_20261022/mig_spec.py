#!/usr/bin/env python3
"""看板巡检 2026-10-22：按用户 10-22 14:49「性能没问题 / 上线还有一周 / 迭代贴图颜色随机性 / 性能与编排任务可清除」重排。
用法：mig_spec.py <导出目录(含 items/ dialogs/ meta/)> <输出目录> <现在ISO>
输出：<输出目录>/{items,dialogs,meta,reports}/<id>.json（update 的补丁 / 新文档全文）、batches.json（三批写入清单）、回滚补丁.json、迁移明细.json
"""
import json, sys, os, glob, re
from datetime import datetime, timedelta, timezone
exp, out, NOW = sys.argv[1], sys.argv[2], sys.argv[3]
now = datetime.fromisoformat(NOW)
TODAY = now.date()
D = lambda n: (TODAY + timedelta(days=n)).isoformat()
WINDOW = {"现在": 1, "下一步": 3, "之后": 7, "搁置": 30}
STAMP = f"{now.month:02d}-{now.day:02d} {now.hour:02d}:{now.minute:02d}"

def load(coll):
    return {os.path.basename(f)[:-5]: json.load(open(f, encoding="utf-8")) for f in glob.glob(f"{exp}/{coll}/*.json")}
I, G, M = load("items"), load("dialogs"), load("meta")

# ArtifactData list 输出里的版本号（写入时 if_version 用；写错整批会被拒并报出现版本）
VER = {"items": {"n90": 2, "n79": 3, "n85": 2, "n24": 5, "n98": 2, "n26": 4, "n77": 4, "n38": 4, "i09": 5, "i17": 4,
                 "i43": 3, "i44": 5, "i46": 4, "n27": 3, "n67": 2, "n72": 2, "n97": 3, "n100": 3, "n93": 3, "n92": 6,
                 "i24": 9, "n91": 2, "n80": 3, "n89": 2, "n96": 3, "n99": 3, "n88": 2, "n95": 2, "n69": 2, "i31": 3, "i37": 4},
       "dialogs": {"g01": 5, "g02": 7, "g03": 8, "g04": 6, "g11": 6, "g16": 5, "g17": 4, "g18": 3, "g19": 3, "g20": 3, "g23": 2},
       "meta": {"board": 2}}

RELATIVE = re.compile(r"今晚|今早|今天|明天|明晚|明早|昨晚|昨天|本周|这周|下周|周三前|周四以后|周四前")
RELATIVE_FIELDS = ("title", "next", "recommend", "waitsOn", "blocks")

patch = {"items": {}, "dialogs": {}, "meta": {}, "reports": {}}   # 要写的数据
roll = {"items": {}, "dialogs": {}, "meta": {}, "reports": {}}    # 回滚：update 的补丁 / 新文档用 "__new__"
detail = []

def put(coll, doc, data, base):
    """记录补丁并生成回滚（base 是写之前的文档，None 表示新文档）"""
    patch[coll][doc] = data
    if base is None:
        roll[coll][doc] = "__new__"
    else:
        r = {}
        for k in data:
            r[k] = base[k] if k in base else {"__delete__": True}
        roll[coll][doc] = r

def confirm(row, lane, note):
    return {"confirmedAt": NOW, "confirmNote": note, "reviewBy": D(WINDOW[lane]), "lane": lane, "updatedAt": NOW}

# ───────────────────────── A. 清除：性能 / 编排验收类（用户 10-22 14:49 的话）─────────────────────────
USER_SAYS = "用户 10-22 14:49：「性能目前都没有什么问题，版本上线还有一周的时间，剩下的时间可以迭代下贴图，颜色，随机性等，所以之前跟性能与编排相关的任务可以清除掉了」"
CLEAR = {
    "n90": "10-19 最终轮全量（性能 / QA 收口）",
    "n79": "B11r1 同版候选全量与实际手机 / 灯光 / NoMip 成本测试",
    "n85": "NoMip 落地后的低档与显存测试（NoMip 本身 70+3 张已写，规则仍在 CLAUDE.md §2④，不受影响）",
    "n24": "GPU 截断与现行配置核对",
    "n98": "overdraw 证据（B11修订3）：Shader Complexity 截图、中 / 低配实测",
    "n26": "真手游核 12 个在用 ID",
    "n77": "10-19 全量范围（只收必需版本）",
    "n38": "大型 B/C/D 真实尺寸与倍率核对（全量前置）",
    "i09": "重做的成本上限（性能预算）",
    "i17": "B03 的编排遗留",
    "i43": "小花束尾束长实测 / 模板库 CSV / 计划书总纲（编排）",
    "i44": "离线页 music.wav 提示 / 远程 UE 预览按钮（编排工作台）",
    "i46": "GPU Max Draw Count 实测覆盖（性能）",
    "n27": "节奏 D 挪动的组重音复核（编排）",
    "n67": "编排「点圈换花型」是否开工",
    "n72": "手游要不要放扇子（新增内容，与冻结规则不符）",
}
for k, why in CLEAR.items():
    r = I[k]
    assert r.get("status") in ("没做", "在做"), k
    note = (f"\n【总管（21）{STAMP} 清除】{USER_SAYS}。属于「{why}」，按这句话关成「不做了」；"
            "不代表这件事做完了，也没有核实它的结果。要找回：把状态改回「没做」。")
    put("items", k, {"status": "不做了", "statusBefore": r["status"], "updatedAt": NOW,
                      "detail": (r.get("detail") or "") + note}, r)

# ───────────────────────── B. 用户在线上做的操作：转出 / 回复 ─────────────────────────
SYNC = {
    "n97": "无需转交：你已处理（UE 崩溃后的未保存改动检查）",
    "n100": "无需转交：你回「已经删掉了」，中型点灭星层已删；读回核对随编排任务清除，不再单独排",
    "n93": "无需转交：你按推荐定了封版清单；封版已过，不再单独排",
}
for k, to in SYNC.items():
    r = I[k]
    put("items", k, {"syncedAt": NOW, "syncedTo": to, "updatedAt": NOW}, r)

# ───────────────────────── C. 重写：新优先级 ─────────────────────────
def rewrite(k, lane, pri, fields, note, **extra):
    r = I[k]
    d = dict(fields)
    d.update(confirm(r, lane, note))
    d["pri"] = pri
    d.update(extra)
    put("items", k, d, r)

# 现在 · 先处理（pri 1，≤3）
def rewrite2(k, lane, pri, fields, note):
    rewrite(k, lane, pri, fields, note)

rewrite2("i24", "现在", 1, {
    "kind": "你要定",
    "title": "定上线前的迭代清单：7 个重做 + 3 个重导，逐项选「换新版 / 留旧版 / 舍弃」（只许改贴图、颜色、随机性，不加层）",
    "owner": "你（定）；总管（21）（出推荐，见 10-22 巡检回复）",
    "next": "你对这 10 项各回一个字：换 / 留 / 舍。定了之后只对选「换」的项派活（i37）。建议 10-24 前定完（推断：留 3 天出新版，再留约 2 天复看）。",
    "recommend": "推荐（推断，依据各行进展记录）：只在已有进展、且只改贴图 / 颜色 / 随机性的几项上继续——金垂柳（新 mesh 已做，A/B 第 2 版等你选，n102）、金芒菊（新金芒菊已有 62979f1f，你已删中型点灭星层 n100）、金曜菊（B 的 S1 疏点游闪已出，n101）、银彩菊（你已决定换 GoldSpark，n96）、多重菊（只加颜色随机，i31）。小银菊、绿牡丹、金锦菊、橙辉星、小青柠没有进展记录，默认留旧版；你点名要换的再排。",
    "waitsOn": "",
    "blocks": "i37 逐项出新版；上线前贴图 / 颜色 / 随机性迭代的范围",
    "source": "你 10-22 14:49 原话；协作/重做指派建议_2026-10-14.md（C02）；各行进展记录",
}, "按你 10-22 14:49 的话重写（原文还停在 10-18 的封版逐项选）；进展依据见 recommend")

rewrite2("n91", "现在", 1, {
    "kind": "你要做",
    "title": "窜天猴 PC / 手游终版入库（主体 + 柔光暗底 + 粒子序列 + GPU 扰动）：进这一版，还是留到下一版",
    "next": "回我一句：终版进 UE 了吗？你 10-19 23:31（粒子版）和 10-20 01:21（主体）还在存窜天猴配方，之后没有入库回执。导入报错 Error 87 已修（4.9.119–120），重导可用。没做完就定一个最后进库日期（建议 10-26，留 QA 复看；推断），过了就不进这一版。",
    "recommend": "核心只有一个选择：进这一版（PC / 手游终版导入 + 读回），或不进（保留已有 SGRS1 柔光暗底的 PC / 手机包，窜天猴更新排到下一版）。不进不用做任何事。",
    "waitsOn": "你的终版；真实 UE 重导未验（对话框5.md:10,34）",
    "blocks": "n80（AI 侧核对）；上线前窜天猴是否齐全",
}, "对着 Git 10-22：没有终版入库回执；你 10-20 01:21 仍在存配方（推断：在做）")

rewrite2("n92", "现在", 1, {
    "kind": "你要做",
    "title": "Night 灯光：你只配 1 个点，内部细节由灯光同事同步",
    "owner": "你（配 1 个点）；灯光同事（同步内部细节）；本机同步（8）（配好后只读确认）",
    "next": "你在 UE 里配好那 1 个灯光点后告诉本机同步（8）；它只读确认 DirectorId / Slot 与 Night 导演对得上。偏移等细节灯光同事同步，不用你查。",
    "recommend": "配一个点即可，不用机械补 3 点。灯光不再单独做性能测量。",
    "waitsOn": "你配点；灯光同事同步细节",
    "blocks": "上线前 Night 灯光到位",
    "feedbackReply": "收到：灯光同事已答复——你只需要配 1 个点，内部细节他同步，不用你处理。我把这行改成「你配 1 个点 → 8 只读确认」，不再要你查偏移，也不再要求带灯光做性能全量。",
    "feedbackSeen": I["n92"].get("feedback", ""),
}, "你 10-19 12:03 的反馈（灯光同事答复）+ 22-本机 10-19 02:0x 读回（light1 仍绑 NewYear / Slot0）；之后没有灯光回执（未核你是否已配）")

# 现在（pri 2）新行：n101、n102 在后面 new 里写

# 下一步
rewrite2("n89", "下一步", 2, {
    "next": "原先写的「新随机 / 更多造型本轮暂不建议」是 10-19 全量前的范围，已过期。随机性现在正是剩余时间的迭代项：随机角和 A/B 第 2 版的「每束随机」合并看（n102）；方向选定后再排 UE 验证。",
    "recommend": "先看 n102 选出方向，再定出生 Z 随机角要不要做；金曜菊 B 的新 mesh / 三闪烁方案见 n101。不加层。",
    "waitsOn": "n102 你选方向",
    "blocks": "金垂柳 / 金曜菊 的随机轮廓与 UE 验证",
}, "原文的「本轮暂不建议」是 10-19 全量前的范围；按你 10-22 14:49 的话改成迭代项")

r96 = I["n96"]
rewrite2("n96", "下一步", 2, {
    "title": "大型_E_银彩菊 换 GoldSpark_HD（三层，中型_D_金曜菊 的粒子）——你定晚点放；放完看一眼 61–163 s 的帧率",
    "next": "放之前：复制 GoldSpark_HD 新建一个粒子给 大型_E_银彩菊 再改色（别直接指，会连带中型_D_金曜菊）。放完让 22-本机 读回，并在 61 / 121 / 163 s 附近看一眼帧率（三层比现在的一张主面片重；推断，约 10 分钟）。提醒：这一条加了层，和你 10-18 18:51 的「只改颜色和节奏」规则不一致；你 10-19 01:0x 已决定放，所以保留。",
    "recommend": (r96.get("recommend") or "").replace("放了就要单独测。", "放完看一眼帧率。"),
}, "你 10-19 01:0x 已决定放；之后没有改判。去掉了「封板后要补测」的全量前置口径")

r99 = I["n99"]
old99 = "改完属于封板后改资源，需受影响项复测。"
assert (r99.get("next") or "").count(old99) == 1
rewrite2("n99", "下一步", 2, {
    "next": r99["next"].replace(old99, "改完属于上线前改资源：受影响的银彩菊 / 银白菊几行看一眼画面和帧率即可。"),
}, "T20 读回（COLOR_BASELINE_20261019/规范体检.md）之后没有新回执；你 10-19 08:0x 说的「资源规范两点我重新导出」未见读回")

r88 = I["n88"]
old88 = "如本轮换，10-18 晚定并在 10-19 最终轮前导入、Bounds/材质/事件与实际性能验证；否则明确沿现有2821，不在冻结后补换新结构。"
assert (r88.get("recommend") or "").count(old88) == 1
rewrite2("n88", "下一步", 2, {
    "recommend": r88["recommend"].replace(old88, "要换就挑一个造型（四选一）导入 UE，看 Bounds / 材质 / 事件；不换就沿用现有2821。不加层、不新增结构。"),
}, "f2f40e53 / a52fea06 之后没有新回执；去掉了 10-19 全量前置口径")

rewrite2("n80", "下一步", 2, {
    "kind": "AI 欠你",
    "title": "窜天猴 PC / 手游终版入库后的 AI 侧核对（旧 G106 检查沿用）",
    "next": "等 n91 终版入库后，导出（23）/ 22-本机 读回 UE 引用、三层是否都在；不再单独做性能验收。",
    "recommend": "与 n91 统一收口；旧 T11 / G106 契约不重做。终版不进这一版就关掉本行。",
    "waitsOn": "n91",
    "blocks": "",
}, "随 n91 改写；对着 Git 10-22 没有新回执")

rewrite2("n95", "下一步", 2, {}, "你 10-18 23:3x 的原话仍是最新规则：重导银彩菊系 / 金芒菊只要不比 10-18 封板的大小小；之后没有改规则的记录")

# 之后 → 下一步（颜色 / 随机性）
rewrite2("n69", "下一步", 2, {}, "最新来源（对话框相机渲染.md 10-14）之后没有回执；金曜菊-B 颜色正是剩余时间的迭代项，从「之后」升上来")
rewrite2("i31", "下一步", 2, {}, "你 10-13 反馈之后没有回执；颜色随机正是剩余时间的迭代项，从「之后」升上来")
rewrite2("i37", "下一步", 2, {
    "next": "等 i24 你逐项选完；只对选「换」的项指派，一项一个对话框，只许改贴图 / 颜色 / 随机性，不加层。",
    "recommend": "不一次全派；先派 i24 里推荐的几项。",
    "waitsOn": "i24",
    "blocks": "",
}, "i24 / i37 原文停在 10-18 的封版逐项选；按 10-22 的话改成「i24 选完再派」")

# ───────────────────────── D. 新行 ─────────────────────────
def new_item(k, lane, pri, f, note, src):
    row = {"answer": "", "status": "没做", "order": f.pop("order"), "updatedAt": NOW, "source": src,
           "confirmedAt": NOW, "confirmNote": note, "reviewBy": D(WINDOW[lane]), "lane": lane, "pri": pri}
    row.update(f)
    put("items", k, row, None)

new_item("n101", "现在", 2, {
    "order": 1401, "kind": "你要做", "area": "跨年秀资源",
    "owner": "你；金曜菊闪烁（Codex）",
    "title": "金曜菊-B S1 疏点游闪：审看柔边 Ramp，并选近看 30 m 的方案",
    "next": "① 把 analysis/results/GLITTER_RAMP_20261020/T_EFX_FireWorks_GlitterChry_S1_Lead_SoftToe_R.png 换进橙引线层的 Ramp，看开花闪光外圈的硬边圆环是否变软（只改最暗 8 列，暗尾亮度保留约 89.5%）。② 近看 30 m 的方案：点灭用 GPU 光点、引线用单束，要不要做（不建议连续放大补偿）。",
    "recommend": "先做 ①（约 5 分钟，可逆）；② 等 ① 看完再定。以上都没经过 UE / BC7 验证，也不是你的验收。",
    "waitsOn": "你审看并回一句",
    "blocks": "金曜菊 S1 进不进这一版；与 n69（点灭星光晕太大太橙）同属金曜菊-B 的颜色",
    "detail": "硬边来源：S1 实际 PNG 的低灰度量化形成圆环，单格四边全 0；橙引线层渐变图暗端 #FF5423→#000000 可变柔，但同层暗尾也会变暗（对话框金曜菊闪烁.md 10-20）。近看 30 m：面片约 1090 px 高，引线 16 帧每帧跳 63→11 px；点灭 16 帧停 5–15 tick 表示不了 2 Hz 点灭（对话框23.md 用户 10-20 00:32 一节，23 的回复 00:47，试算 analysis/probe/近看引菊点灭_帧与取景_2026-10-20.md）。",
}, "对话框金曜菊闪烁.md 与 对话框23.md 的 10-20 记录之后没有新回执（未核你是否已看）",
   "对话记录/对话框金曜菊闪烁.md（10-20 两节）；对话记录/对话框23.md 用户 10-20 00:32；协作/状态清单.json 共享文件「金曜菊闪烁（Codex）· 橙引线柔边Ramp」")

new_item("n102", "现在", 2, {
    "order": 1402, "kind": "你要定", "area": "跨年秀资源",
    "owner": "你；研究总览（云端）",
    "title": "网格垂柳 / 金垂柳：A/B 第 2 版（泪滴头 + 亮肩、每束随机、颗粒闪烁）看完选一个预设",
    "next": "看云端 Artifact「网格垂柳 A/B」第 2 版：每一项改动都能单独开关，看各自作用；选一个预设或中间值。选定后研究总览出条带 + 参数单，再到本机 UE 沙盒试。另外请量一张 1080p 实机截图（花盘约 340 m 占多少像素），用来定颗粒尺寸。",
    "recommend": "只做零开销的几项（条带、噪声、闪烁曲线）；PC 可加一层 GPU 亮点（你 10-19 说多加点都够）。不改正式资产，选定前不进已测试的版本。",
    "waitsOn": "你看预览并选；一张实机截图",
    "blocks": "金垂柳随机性的 UE 沙盒（n89）",
    "detail": "A 是复刻正式资产，B 是方案；第 2 版已根据你 10-19 15:34 的话重做：泪滴头 + 亮肩、每束头大小 / 亮肩 / 尾亮度 / 长度 / 宽细随机、尾巴带颗粒 + 闪烁、PC 加 GPU 亮点；每项可开关，全关时 B = A（像素差平均 0.1 / 255）。本机 UE 沙盒包在 analysis/results/WILLOW_SPARK_AB_20261019/UE测试包_v2/。",
}, "对话框研究总览.md 最后一条是 10-19 16:08；之后没有新记录（未核你是否已看）",
   "对话记录/对话框研究总览.md:42–59；协作/研究_网格垂柳火花颗粒与闪烁_2026-10-19.md；analysis/results/WILLOW_SPARK_AB_20261019/看法.md")

# ───────────────────────── E. 对话框卡片 ─────────────────────────
def gup(k, f):
    put("dialogs", k, dict(f, updatedAt=NOW), G[k])

gup("g01", {"lastRecordAt": NOW, "state": "等你",
            "now": "在线看板单写者；10-22 按你「性能与编排任务清除、剩下时间迭代贴图 / 颜色 / 随机性」重排了优先级；夜班仍停（你没通知恢复）",
            "open": "下次云端运行先按接续 1.5 应用待同步、核冲突，再补导出副本；上线日期（按 10-29 推算）等你确认"})
gup("g02", {"lastRecordAt": "2026-10-20T00:47:23+08:00", "state": "等你",
            "now": "10-20 00:47 回了金曜菊近看 30 m：点灭首选 GPU 光点、引线首选单束，不建议连续放大补偿；10-19 认领导入界面新旧版本核对，T23 因 5 已查清而取消",
            "open": "n101 等你审看 Ramp、选近看方案；公共导入 / 26 第 3 步规则仍留 Claude"})
gup("g03", {"state": "歇着",
            "now": "最新编排是 B11修订3（工作台 16.0.49，10-19 00:3x）：PC 收尾 P4 的大型金芒菊换成大型金垂柳，节目 214.4→219.5 s；10-19 起没有新编排记录",
            "open": "编排类任务已按你 10-22 清除；要调颜色 / 节奏再叫它"})
gup("g04", {"state": "歇着",
            "now": "B11r1 已部署；T19 完成；Night 灯光按 22 的排队说明核",
            "open": "灯光：你配 1 个点，内部细节灯光同事同步；你配好后它只读确认（n92）"})
gup("g11", {"lastRecordAt": "2026-10-19T22:34:14+08:00", "state": "等你",
            "now": "4.9.119–120（10-19）：导入 Error 87 查清是启动命令超过 32767 字符，改标准输入传证明；文件入口的导入器副本旧了，现在带来源戳、自动换新；导入失败面板常驻、可恢复",
            "open": "真实 UE 重导仙女棒 / 窜天猴 PC + 手机包确认尚未验（对话框5.md:10,34）"})
gup("g16", {"state": "等你",
            "now": "4.9.118（10-19）输出取景四边可调；柔光暗底 SGRS1（4.9.115）已有 PC / 手机包；窜天猴 PC / 手游终版由你制作，你 10-19 23:31、10-20 01:21 仍在存配方",
            "open": "见 n91：终版入库没有回执；进这一版还是留到下一版，等你一句话"})
gup("g17", {"state": "歇着",
            "now": "10-18 排好 10-19 全量与窜天猴收口；10-19 起没有新记录（看板由总管云端接手）",
            "open": "只追加待同步并生成 HTML 推 Git；不改云端 / 编排 / 资产 / UE / P4"})
gup("g18", {"state": "歇着",
            "now": "T09 / T19 完成，旧 T10 已取消；T20 精简版（10-19 02:0x 只读）已出，T20 剩余项卡住",
            "open": "性能体检按你 10-22 的话不再需要（派活队列里 T20 / T21 的状态我没改，要取消请你说）"})
gup("g19", {"open": "新导入的资产按四项 / 新贴图规范读回；第三步不恢复"})
gup("g20", {"lastRecordAt": "2026-10-19T12:51:09+08:00", "state": "等你",
            "now": "10-19 起由研究总览接手网格垂柳的方头 / 颗粒问题，A/B 第 2 版已发布；出生 Z 随机角仍未做",
            "open": "见 n102 / n89：你选定方向后再排 UE 沙盒"})
gup("g23", {"state": "歇着",
            "now": "你 10-18 定的 PC / 手游非共享主序列 NoMip 已执行 73 张；NeverStream 禁勾，局部全分辨率默认关",
            "open": "低档外观与目标机显存测试按你 10-22 的话清除；NoMip 规则（CLAUDE.md §2④）不变"})

def new_g(k, f):
    row = dict(f, updatedAt=NOW)
    put("dialogs", k, row, None)

new_g("g24", {"code": "22-本机", "name": "烟花编排（22）-本机", "where": "本机", "state": "在做", "order": 31,
              "lastRecordAt": "2026-10-22T14:24:54+08:00",
              "scope": "跨年秀编排的本机落地；UE 只读读回；10-22 起做协作提效整理",
              "now": "10-22：协作提效第 1 阶段（你已批方案第 1–5 项）——改 CLAUDE.md 的开工 / 记录 / 副本规则，交接滚动，开工包脚本；已删 F:/ 下 5 个旧独立克隆和 ultra-baker（共约 43 GB，独有内容已备份到 analysis/local/归档_旧独立克隆_20261022）",
              "open": "第 6 项（要不要请工作台负责人改发布流程）是否已定未核（对话框22-本机.md:198）；10-19 的 PC 中 / 低 overdraw 没跑，你说性能没问题，不用补"})
new_g("g25", {"code": "金曜菊闪烁（Codex）", "name": "金曜菊闪烁", "where": "本机（Codex）", "state": "等你", "order": 56,
              "lastRecordAt": "2026-10-20T20:03:06+08:00",
              "scope": "金曜菊-B 疏密闪烁三方案（S1 / S2 / S3）、Ramp、导出规范拦截",
              "now": "10-20：S1 开花闪光的圆环硬边已诊断；已出一张只改最暗 8 列的柔边 Ramp（暗尾亮度保留约 89.5%）；未改配方、主序列、默认值、源码或 UE",
              "open": "见 n101：换 Ramp 审看；这些都没经过 UE / BC7 验证"})
new_g("g26", {"code": "研究总览", "name": "研究总览", "where": "云端", "state": "等你", "order": 57,
              "lastRecordAt": "2026-10-19T16:08:26+08:00",
              "scope": "项目问答 + 课题研究；只研究 / 写文档 / 云端预览，改资产要你授权",
              "now": "10-19：网格垂柳 A/B 第 2 版已发布（泪滴头 + 亮肩、每束随机、颗粒闪烁，逐项开关）+ 本机 UE 沙盒测试包；你说本项目所有内容都在这里问",
              "open": "见 n102：你看 A/B 选预设；量一张 1080p 实机截图定颗粒尺寸"})
new_g("g27", {"code": "执行规范研究（Codex）", "name": "执行规范研究", "where": "本机（Codex）", "state": "歇着", "order": 210,
              "lastRecordAt": "2026-10-21T10:24:20+08:00",
              "scope": "AI 执行规范的审计与精简候选",
              "now": "10-21：对照 Anthropic 官方指南审计现行执行规范，出了精简候选和可复制提示词；只研究，候选没有采用，没改规范 / 标准 / 源码 / 定时任务",
              "open": "要不要采用候选由你定（不排在看板上）"})
new_g("g28", {"code": "Claude接入方式（Codex）", "name": "Claude 接入方式", "where": "本机（Codex）", "state": "歇着", "order": 211,
              "lastRecordAt": "2026-10-22T11:24:46+08:00",
              "scope": "Claude 接入与联网方式的梳理（ClaudeGate / Magpie / SSH / Clash / 官方直用）",
              "now": "10-22：梳理并保存了对比文档（协作/Claude接入与联网方式对比.md）；只存资料，没有选择或部署方案、安装工具、登录账号或配置代理",
              "open": "—"})

# ───────────────────────── F. meta / 里程碑 ─────────────────────────
mb = M["board"]
put("meta", "board", {"patrolAt": NOW, "patrolBy": "总管（21）云端", "updatedAt": NOW, "rev": 2,
                      "milestone": {"name": "版本上线（日期待确认）", "date": "2026-10-29",
                                    "note": "你 10-22 14:49 说上线还有一周；日期按 +7 天推算，不是你给的日期。推断：最后改资源日约 10-27，留 2 天复看。请确认或改日期。"}}, mb)

# ───────────────────────── G. 巡检报告 ─────────────────────────
RID = f"rep-{now.year}{now.month:02d}{now.day:02d}-{now.hour:02d}{now.minute:02d}"
put("reports", RID, {
    "kind": "patrol", "at": NOW, "by": "总管（21）云端",
    "title": "10-22 巡检：性能与编排任务清除，剩下的时间排贴图 / 颜色 / 随机性",
    "summary": "你 14:49 说性能没问题、上线还有一周、性能与编排任务可以清除。我关了 16 条验收类的行（按你这句话清除，不代表我核实过结果），其余按「上线前迭代贴图 / 颜色 / 随机性」重排：现在 5 条（先处理 3 条），紧急 0 条，没关的行 83 → 69。你 10-19 11:47–12:03 在线上动过的 4 行（n92 / n93 / n97 / n100）三天没转出，现已转出或回复。顶部放了一个「版本上线（日期待确认）」，日期按 10-29 推算。",
    "added": ["n101", "n102", "g24", "g25", "g26", "g27", "g28"],
    "changed": sorted(list(patch["items"]) + list(patch["dialogs"]) + ["meta/board"]),
    "closed": sorted(CLEAR),
    "routed": ["n97 / n100 / n93：写 syncedAt / syncedTo（你 10-19 已做，三天没转出）", "n92：回复你的灯光反馈，改成「你配 1 个点，8 只读确认」"],
    "findings": [
        "10-19 11:42 之后 Git 里没有任何一条跨年秀（22）、本机同步（8）、实测（25）的新记录：编排和性能这几条线没有新进展可核，所以「全量已测、性能没问题」只来自你这句话，我没有从 Git 证实",
        "清除的 16 行没有逐条核实结果；每行 detail 末尾写了清除依据和找回方法",
        "n96 银彩菊换 GoldSpark_HD 是三层，和你 10-18 18:51「只改颜色和节奏、不加层」不一致；你 10-19 01:0x 已决定放，所以保留，提示已写进行里",
        "窜天猴 PC / 手游终版入库没有回执（你 10-19 23:31、10-20 01:21 还在存配方）；导入 Error 87 已修，真实 UE 重导未验",
        "派活队列里 T20 / T21 的状态我没改（它们是性能体检）；要取消请你说",
        "烟花编排（22）-本机 正在改 CLAUDE.md 和交接.md（协作提效第 1 阶段，你已批 1–5 项）；改完后巡检提示词里「交接.md 第 5 节最近 5 条」等读法可能要跟着改，等它做完我再对一次",
    ],
    "needYou": [
        "确认上线日期（我放了 10-29）和最后改资源日（我推断 10-27）",
        "i24：10 项各回一个字：换 / 留 / 舍",
        "n91：窜天猴终版进这一版吗；n92：灯光那 1 个点配了吗",
        "n101：换柔边 Ramp 看一眼；n102：看网格垂柳 A/B 选预设",
        "沾边没清的 4 条（n25 中途进场补放、n18 GPU 预算表、i29 帧号排查、n95 尺寸规则）：要不要也清",
    ],
    "today": ["i24 逐项选换 / 留 / 舍", "n91 窜天猴终版进不进", "n92 灯光那 1 个点"],
    "openDialogs": ["金曜菊闪烁（Codex）（n101）", "研究总览（n102）", "烟花编排（22）-本机（协作提效）", "特效工作台（导入器）（真实 UE 重导确认）"],
}, None)

# ───────────────────────── 校验 ─────────────────────────
problems = []
merged = {k: dict(I[k]) for k in I}
for k, d in patch["items"].items():
    merged.setdefault(k, {}).update(d)
for k, r in merged.items():
    if r.get("status") not in ("没做", "在做"):
        continue
    for f in RELATIVE_FIELDS:
        m = RELATIVE.search(str(r.get(f) or ""))
        if m:
            problems.append(f"相对时间词 {k}.{f}: {m.group(0)}")
openr = {k: r for k, r in merged.items() if r.get("status") in ("没做", "在做")}
cnt = {}
for r in openr.values():
    cnt[r.get("lane")] = cnt.get(r.get("lane"), 0) + 1
now_rows = [k for k, r in openr.items() if r.get("lane") == "现在"]
focus = [k for k in now_rows if openr[k].get("pri") == 1]
urgent = [k for k, r in openr.items() if r.get("pri") == 0]
if len(now_rows) > 5: problems.append(f"现在 {len(now_rows)} > 5")
if len(focus) > 3: problems.append(f"先处理 {len(focus)} > 3")
if len(urgent) > 1: problems.append(f"紧急 {len(urgent)} > 1")
for k in list(patch["items"]):
    if k not in VER["items"] and k not in ("n101", "n102"):
        problems.append(f"缺版本 items/{k}")
print("问题:", problems or "无")
print("没关:", len(openr), cnt, "现在:", sorted(now_rows), "先处理:", sorted(focus), "紧急:", urgent)

# ───────────────────────── 输出 ─────────────────────────
os.makedirs(out, exist_ok=True)
batches = {"1_items": [], "2_dialogs": [], "3_meta_report": []}
def dump(coll, k, data):
    p = f"{out}/{coll}/{k}.json"
    os.makedirs(os.path.dirname(p), exist_ok=True)
    json.dump(data, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return p
for coll, bname in (("items", "1_items"), ("dialogs", "2_dialogs"), ("meta", "3_meta_report"), ("reports", "3_meta_report")):
    for k, d in patch[coll].items():
        p = dump(coll, k, d)
        e = {"op": "update" if roll[coll][k] != "__new__" else "set", "collection": coll, "doc_id": k, "file_path": p}
        if e["op"] == "update":
            e["if_version"] = VER[coll][k]
        batches[bname].append(e)
json.dump(batches, open(f"{out}/batches.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(roll, open(f"{out}/回滚补丁.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
detail = {"清除": list(CLEAR), "转出": list(SYNC), "分组": cnt, "现在": sorted(now_rows), "先处理": sorted(focus),
          "改动行数": {c: len(v) for c, v in patch.items()}}
json.dump(detail, open(f"{out}/迁移明细.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("写出", {c: len(v) for c, v in patch.items()})
