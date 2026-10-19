#!/usr/bin/env python3
"""看板对账：检查在线全局看板有没有漏项。总管每次更新看板前后都跑一次。

    python3 analysis/scripts/看板对账.py            # 只报问题，有问题退出码 1
    python3 analysis/scripts/看板对账.py --verbose  # 另列已打勾、指向已关闭行的条目
    python3 analysis/scripts/看板对账.py --daily    # 每日巡检另列：新反馈、待下一步、停了的 AI 欠你、问用户没上看板、名册外的对话记录

读两份文件（都在 协作/）：
  看板对账.json  对账表：每条来源（对话框打勾项、计划、规范……）对到看板哪一行，或为什么不用上看板
  看板快照.json  在线看板数据库的快照（总管每次改完看板重导）
--snapshot-from 同时生成本地视图并嵌进 协作/全局看板.html（本机双击可看最新整理、保存反馈并主动导出）。
--local 只读本地派生视图；在线基线看板快照.json不被离线巡检改写。
另列「用户勾了我做好了、还没同步给负责对话框」的行（等同步），总管同步后在看板写 syncedAt / syncedTo。

查四件事（对账表）+ 一组「分组规则」：
  1. 对话记录/*.md 里每个没打勾的「- [ ]」都在对账表里（按 文件 + 文字指纹 对）
  2. 对账表里「已在看板 / 已补进看板」的行号都在快照里
  3. 对账表里「已做完 / 被取代」都写了依据
  4. 快照里每条没关的行都有来源
  5. 分组规则（看板按 现在 / 下一步 / 之后 / 搁置 分组，meta/board 管上限和复核天数）：
     没关的行都有合法的 lane；紧急(pri 0)≤上限且写了 urgentWhy；先处理(pri 1)≤上限；现在≤上限；
     现在 / 下一步里没有过了复核日的行；标题、下一步、推荐、在等、卡着里不写「今晚 / 明天 / 周三前」这类相对时间词；
     里程碑没过期；meta.patrolAt 跟快照导出时间对得上（说明这次巡检盖过章）。
     之后 / 搁置里过了复核日的行只列「待复核」，不算问题——那是给用户逐条确认的。

文字指纹：去掉行首「- [ ]」、去掉所有空白、取前 120 个字，sha1 前 12 位。
文字改了指纹就变 —— 那条会作为「新的未打勾」报出来，复核一下再补进对账表。
"""
import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LEDGER = ROOT / "协作" / "看板对账.json"
SNAPSHOT = ROOT / "协作" / "看板快照.json"
PAGE = ROOT / "协作" / "全局看板.html"
BOARD_MD = ROOT / "协作" / "全局看板.md"
MD_START, MD_END = "<!-- BOARD-LANES:START", "<!-- BOARD-LANES:END -->"
SNAP_RE = re.compile(r'(<script type="application/json" id="snap">)(.*?)(</script>)', re.S)
COLLS = ("items", "resources", "dialogs", "reports")
DIALOGS = ROOT / "对话记录"

LANES = ("现在", "下一步", "之后", "搁置")
LEGACY_LANE = {"周三前必须": "下一步", "周四以后": "之后", "暂不建议": "搁置"}
DEF_META = {"caps": {"urgent": 1, "focus": 3, "now": 5},
            "reviewDays": {"现在": 1, "下一步": 3, "之后": 7, "搁置": 30},
            "stale": {"warnHours": 24, "badHours": 72}}
# 这些词写进标题 / 下一步 / 推荐 / 在等 / 卡着，过几天就读不懂了；要写绝对日期（10-19）。detail 和 source 是记录，不管。
RELATIVE = re.compile(r"今晚|今早|今天|明天|明晚|明早|昨晚|昨天|本周|这周|下周|周三前|周四以后|周四前")
RELATIVE_FIELDS = ("title", "next", "recommend", "waitsOn", "blocks")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}")
BOX = re.compile(r"^\s*[-*]\s*\[ \]\s*")
ON_BOARD = {"已在看板", "已补进看板"}
CLOSED_OK = {"已做完", "被取代"}
RESULTS = ON_BOARD | CLOSED_OK
OPEN_STATUS = {"没做", "在做"}


def lane_of(r):
    """lane 优先；没写 lane 的旧行 / 旧待同步条目按旧 when 兜底（周三前必须→下一步，周四以后→之后，暂不建议→搁置）。"""
    if r.get("lane") in LANES:
        return r["lane"]
    return LEGACY_LANE.get(r.get("when"), "之后")


def pri_of(r):
    p = str(r.get("pri", "")).strip()
    return int(p) if p.isdigit() else 9


def meta_of(snap):
    m = (snap.get("meta") or {}).get("board") or {}
    out = {k: {**DEF_META[k], **(m.get(k) or {})} for k in DEF_META}
    out["patrolAt"] = m.get("patrolAt", "")
    ms = m.get("milestone")
    out["milestone"] = ms if isinstance(ms, dict) and ms.get("date") else None
    return out


def review_date(r, meta, tz=None):
    """复核日（YYYY-MM-DD）：行上有 reviewBy 用它；没有就 核实时间（或更新时间）+ 该分组复核天数。从没核实过 = 0000-00-00（算过期）。"""
    from datetime import timedelta
    if DATE_RE.match(str(r.get("reviewBy") or "")):
        return str(r["reviewBy"])[:10]
    t = _t(r.get("confirmedAt") or r.get("updatedAt"))
    if not t:
        return "0000-00-00"
    return (t + timedelta(days=meta["reviewDays"].get(lane_of(r), 7))).date().isoformat()


def fingerprint(text: str) -> str:
    t = BOX.sub("", text)
    t = re.sub(r"\s+", "", t)[:120]
    return hashlib.sha1(t.encode("utf-8")).hexdigest()[:12]


def unchecked_boxes():
    for f in sorted(DIALOGS.glob("*.md")):
        rel = f.relative_to(ROOT).as_posix()
        for n, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
            if BOX.match(line):
                yield rel, n, line.strip(), fingerprint(line)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--verbose", action="store_true")
    ap.add_argument("--snapshot-from", metavar="DIR",
                    help="先用这个目录重写 看板快照.json：DIR/items、DIR/resources、DIR/dialogs 下每行一个 <id>.json"
                         "（总管用 ArtifactData list 加 out_dir 导出的）")
    ap.add_argument("--daily", action="store_true", help="每日巡检（夜班早班）：另列要跟进的，不算问题")
    ap.add_argument("--local", action="store_true", help="只读本地视图（在线基线叠加待同步），不伪改在线快照")
    ap.add_argument("--time", help="配合 --snapshot-from：导出时间，如 2026-10-13T21:50:00+08:00")
    a = ap.parse_args()
    if a.local and a.snapshot_from:
        ap.error("--local只读本地视图，不能同时导入在线快照")

    if a.snapshot_from:
        src = Path(a.snapshot_from)
        old = json.loads(SNAPSHOT.read_text(encoding="utf-8")) if SNAPSHOT.exists() else {}
        snap = {k: old.get(k) for k in ("说明", "看板") if old.get(k)}
        snap["导出时间"] = a.time or old.get("导出时间", "")
        for coll in COLLS:
            snap[coll] = {f.stem: json.loads(f.read_text(encoding="utf-8"))
                          for f in sorted((src / coll).glob("*.json"))}
            if not snap[coll] and coll != "reports":
                sys.exit(f"{src / coll} 是空的，快照没写")
        # meta/board：分组上限、复核天数、巡检时间、里程碑。导出目录没有 meta 时保留旧快照里的（不凭空造）。
        if (src / "meta").is_dir() and any((src / "meta").glob("*.json")):
            snap["meta"] = {f.stem: json.loads(f.read_text(encoding="utf-8")) for f in sorted((src / "meta").glob("*.json"))}
        elif old.get("meta"):
            snap["meta"] = old["meta"]
        SNAPSHOT.write_text(json.dumps(snap, ensure_ascii=False, indent=1), encoding="utf-8")
        page = PAGE.read_text(encoding="utf-8")
        if len(SNAP_RE.findall(page)) != 1:
            sys.exit(f"{PAGE} 里找不到唯一的 snap 块，离线副本没写")
        blob = json.dumps(snap, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
        PAGE.write_text(SNAP_RE.sub(lambda m: m.group(1) + blob + m.group(3), page), encoding="utf-8")
        print("快照已重写（并嵌进 协作/全局看板.html）：" + "、".join(f"{c} {len(snap[c])}" for c in COLLS)
              + ("、meta " + "/".join(snap["meta"]) if snap.get("meta") else "、meta 无"))
        print(refresh_markdown(snap))
        # 在线基线独立保存，HTML继续叠加尚未应用的本机修改，避免反馈恢复前看板退回旧版。
        from 看板本地视图 import build as build_local
        head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
        build_local(ROOT, snap['导出时间'], head)

    ledger = json.loads(LEDGER.read_text(encoding="utf-8"))
    entries = ledger["条目"]
    source = ROOT / '协作/看板本地视图.json' if a.local else SNAPSHOT
    snap = json.loads(source.read_text(encoding="utf-8"))
    if a.local:
        meta = snap.get('本地视图', {})
        print(f"本地视图 {meta.get('生成时间', '未核')}；待云端应用 {len(meta.get('尚未应用', []))} 条（非线上已同步）")
    board = {}
    for coll in ("items", "resources", "dialogs"):
        board.update(snap.get(coll, {}))

    problems = []

    # 1. 没打勾的都对过账
    known = {(e["checkbox"]["file"], e["checkbox"]["hash"]) for e in entries if e.get("checkbox")}
    now = {}
    for rel, n, line, h in unchecked_boxes():
        now[(rel, h)] = (n, line)
        if (rel, h) not in known:
            problems.append(f"[新的未打勾] {rel}:{n}  {line[:100]}\n"
                            f"    对账表模板：{{\"src\": \"{rel}:{n}\", \"quote\": \"…\", \"result\": \"已在看板|已补进看板|已做完|被取代\", "
                            f"\"board\": \"\", \"evidence\": \"\", \"checkbox\": {{\"file\": \"{rel}\", \"hash\": \"{h}\"}}}}")

    # 2–3. 对账表本身
    for e in entries:
        r = e.get("result")
        where = e.get("src", "?")
        if r not in RESULTS:
            problems.append(f"[结果不认识] {where}：{r!r}")
        if r in ON_BOARD:
            b = e.get("board", "")
            if not b:
                problems.append(f"[缺看板行号] {where}")
            elif b not in board:
                problems.append(f"[看板没有这一行] {where} → {b}")
        if r in CLOSED_OK and not (e.get("evidence") or "").strip():
            problems.append(f"[关了没依据] {where}")

    # 4. 看板上没关的行都有来源
    for k, row in sorted(snap.get("items", {}).items()):
        if row.get("status") in OPEN_STATUS and not (row.get("source") or "").strip():
            problems.append(f"[看板行没来源] {k} {row.get('title', '')[:60]}")

    # 统计
    items = snap.get("items", {})
    open_items = [r for r in items.values() if r.get("status") in OPEN_STATUS]
    by = {}
    for r in open_items:
        by[(lane_of(r), r.get("kind"))] = by.get((lane_of(r), r.get("kind")), 0) + 1
    gone = [e for e in entries if e.get("checkbox") and (e["checkbox"]["file"], e["checkbox"]["hash"]) not in now]
    closed_refs = [e for e in entries if e.get("result") in ON_BOARD and e.get("board") in items
                   and items[e["board"]].get("status") not in OPEN_STATUS]

    print(f"对账表 {len(entries)} 条（快照 {snap.get('导出时间', '?')}）；对话记录里没打勾 {len(now)} 个")
    print(f"看板 items {len(items)} 行，没关 {len(open_items)} 行：")
    for w in LANES:
        parts = [f"{k} {by.get((w, k), 0)}" for k in ("你要做", "你要定", "AI 欠你")]
        print(f"  {w}：" + "，".join(parts))
    lane_problems(snap, open_items, problems, daily=a.daily)
    waiting = [(k, r) for k, r in sorted(items.items())
               if r.get("kind") in ("你要做", "你要定") and r.get("status") == "已做" and r.get("doneAt") and not r.get("syncedAt")]
    print(f"用户勾了「我做好了」、还没同步给负责对话框：{len(waiting)} 条" + ("（总管要同步）" if waiting else ""))
    for k, r in waiting:
        print(f"  [等同步] {k} {r.get('title', '')[:60]} → {r.get('owner', '')}｜反馈：{(r.get('feedback') or r.get('answer') or '')[:60]}")
    # 派活队列（本机 dot 派给 Codex）：编号对得上看板；做完 / 卡住的要总管收口
    qfile = ROOT / "协作" / "派活队列.json"
    if qfile.exists():
        q = json.loads(qfile.read_text(encoding="utf-8"))
        tasks = q.get("任务", [])
        ok_status = set(q.get("状态说明", {}).keys())
        done_ids = {t.get("编号") for t in tasks if t.get("状态") == "完成"}
        for t in tasks:
            tid = t.get("编号", "?")
            if t.get("状态") not in ok_status:
                problems.append(f"[派活状态不认识] {tid}：{t.get('状态')!r}")
            if t.get("看板") and t["看板"] not in items:
                problems.append(f"[派活单指向不存在的看板行] {tid} → {t['看板']}")
            for k in ("提示词", "只许改", "做完的标准"):
                if not t.get(k):
                    problems.append(f"[派活单缺「{k}」] {tid}")
        back = [t for t in tasks if t.get("状态") in ("完成", "卡住") and items.get(t.get("看板"), {}).get("status") in OPEN_STATUS]
        ready = [t for t in tasks if t.get("状态") == "等前置" and all(p in done_ids for p in t.get("前置", []))]
        counts = {}
        for t in tasks:
            counts[t.get("状态")] = counts.get(t.get("状态"), 0) + 1
        print("派活队列：" + "，".join(f"{k} {v}" for k, v in counts.items()))
        for t in back:
            print(f"  [派活回来了] {t['编号']} {t.get('状态')} → 看板 {t.get('看板')}｜{(t.get('结果') or '')[:80]}（总管收口）")
        for t in ready:
            print(f"  [前置做完了] {t['编号']} 还在「等前置」，查「等什么」满足了没有，满足就改「待派」")
    print(f"对账表里的打勾项已打勾或文字已改：{len(gone)} 条（可复核结果，不算问题）")
    print(f"对账表指向已关闭看板行：{len(closed_refs)} 条（不算问题）")
    if a.verbose:
        for e in gone:
            print(f"  [已打勾/改动] {e['src']}  {e.get('quote', '')[:80]}")
        for e in closed_refs:
            print(f"  [行已关] {e['src']} → {e['board']} {items[e['board']].get('status')}")

    if a.daily:
        daily_report(snap, entries, now, items)

    if problems:
        print(f"\n问题 {len(problems)} 个：")
        for p in problems:
            print(p)
        return 1
    print("\n没有问题：每个没打勾的都对过账，看板行号都在，关掉的都有依据。")
    return 0


def lane_problems(snap, open_items, problems, daily=False):
    """分组规则检查。参考日期 = 快照导出时间（先重导快照再跑）。"""
    meta, ref = meta_of(snap), _t(snap.get("导出时间"))
    today = ref.date().isoformat() if ref else ""
    caps = meta["caps"]
    items = snap.get("items", {})
    key = {id(r): k for k, r in items.items()}
    for r in open_items:
        k = key.get(id(r), "?")
        t = (r.get("title") or "")[:50]
        if r.get("lane") not in LANES:
            problems.append(f"[没分组] {k} {t}：lane={r.get('lane')!r}（旧 when={r.get('when')!r}）；总管要给它定 现在 / 下一步 / 之后 / 搁置")
        for fld in RELATIVE_FIELDS:
            m = RELATIVE.search(str(r.get(fld) or ""))
            if m:
                problems.append(f"[相对时间词] {k}.{fld} 里有「{m.group(0)}」；改成绝对日期（如 10-19）")
        if r.get("due") and not DATE_RE.match(str(r["due"])):
            problems.append(f"[到期日格式] {k} due={r['due']!r}；要 YYYY-MM-DD")
        if pri_of(r) == 0 and not (r.get("urgentWhy") or "").strip():
            problems.append(f"[紧急没写原因] {k} {t}：pri 0 要写 urgentWhy")
        lane = lane_of(r)
        if today and lane in ("现在", "下一步") and review_date(r, meta) <= today:
            problems.append(f"[过了复核日] {k} {t}（{lane}，复核日 {review_date(r, meta)}）；总管核实后写 confirmedAt / reviewBy，或降级")
    n_urgent = sum(1 for r in open_items if pri_of(r) == 0)
    n_focus = sum(1 for r in open_items if pri_of(r) == 1 and lane_of(r) == "现在")
    n_now = sum(1 for r in open_items if lane_of(r) == "现在")
    for label, n, cap in (("紧急(pri 0)", n_urgent, caps["urgent"]), ("先处理(pri 1)", n_focus, caps["focus"]), ("现在", n_now, caps["now"])):
        if n > cap:
            problems.append(f"[{label}超上限] {n} 条，上限 {cap}；降级几条")
    print(f"  紧急 {n_urgent}/{caps['urgent']}，先处理 {n_focus}/{caps['focus']}，现在 {n_now}/{caps['now']}")
    ms = meta["milestone"]
    if ms:
        if today and str(ms["date"])[:10] < today:
            problems.append(f"[里程碑过期] {ms.get('name', '')} {ms['date']}；改成下一个节点，或从 meta/board 删掉 milestone")
        else:
            print(f"  里程碑：{ms.get('name', '')} {ms['date']}")
    else:
        print("  里程碑：无（meta/board 没写 milestone，页面顶部不显示倒计时）")
    pa, rt = _t(meta["patrolAt"]), ref
    if not pa:
        problems.append("[巡检时间没盖] meta/board.patrolAt 缺或读不懂；每次巡检收口时写成这次巡检时间")
    elif rt and abs((rt - pa).total_seconds()) > 3 * 3600:
        problems.append(f"[巡检时间没更新] meta/board.patrolAt={meta['patrolAt']} 跟快照导出 {snap.get('导出时间')} 差超过 3 小时；收口时更新 patrolAt 再重导")
    stale = [(k, r) for k, r in sorted(items.items()) if r.get("status") in OPEN_STATUS and today
             and lane_of(r) in ("之后", "搁置") and review_date(r, meta) <= today]
    print(f"  待复核（之后 / 搁置里过了复核日，不算问题，给用户逐条确认）：{len(stale)}")
    if daily:
        for k, r in sorted(stale, key=lambda x: review_date(x[1], meta))[:12]:
            print(f"    [待复核] {k} {(r.get('title') or '')[:46]}（{lane_of(r)}，复核日 {review_date(r, meta)}）")
        if len(stale) > 12:
            print(f"    …另有 {len(stale) - 12} 条")


def lanes_markdown(snap):
    """给读不到在线看板的对话框看的清单：没关的行按 紧急 / 现在 / 下一步 / 之后 / 搁置 排，每行带复核日。从快照生成，不手写。"""
    meta, ref = meta_of(snap), _t(snap.get("导出时间"))
    today = ref.date().isoformat() if ref else ""
    items = snap.get("items", {})
    opens = [(k, r) for k, r in items.items() if r.get("status") in OPEN_STATUS]
    def order(kr):
        r = kr[1]
        return (pri_of(r), str(r.get("due") or "9999"), r.get("order") or 0)
    def line(k, r):
        tags = []
        if pri_of(r) == 1 and lane_of(r) == "现在":
            tags.append("先处理")
        if DATE_RE.match(str(r.get("due") or "")):
            tags.append("到期 " + str(r["due"])[5:10])
        if r.get("waitsOn"):
            tags.append("在等：" + str(r["waitsOn"]))
        rd = review_date(r, meta)
        if today and rd <= today:
            tags.append("待复核" + ("" if rd < "1" else f"，复核日 {rd[5:]}"))
        owner = f"（{r['owner']}）" if r.get("owner") else ""
        return f"- `{k}` {r.get('title', '')}{owner}" + (f" · {'；'.join(tags)}" if tags else "")
    n = {w: sum(1 for _, r in opens if lane_of(r) == w) for w in LANES}
    n_stale = sum(1 for _, r in opens if today and review_date(r, meta) <= today)
    ms = meta["milestone"]
    out = [f"{MD_START}（脚本从快照生成，别手改；每次 --snapshot-from 重写）-->",
           f"快照 {snap.get('导出时间', '')} · 没关 {len(opens)} 行：" + " / ".join(f"{w} {n[w]}" for w in LANES)
           + f" · 紧急 {sum(1 for _, r in opens if pri_of(r) == 0)} · 待复核 {n_stale}（过了复核日没人确认的，别当成现在要做的）· 里程碑："
           + (f"{ms.get('name', '')} {ms['date']}" if ms else "无")]
    urgent = sorted((kr for kr in opens if pri_of(kr[1]) == 0), key=order)
    if urgent:
        out += ["", "## 紧急（pri 0）"] + [line(k, r) + f" — 原因：{r.get('urgentWhy', '')}" for k, r in urgent]
    for w in LANES:
        rows = [kr for kr in opens if lane_of(kr[1]) == w and pri_of(kr[1]) != 0]
        if not rows:
            continue
        out += ["", f"## {w}（{len(rows)}）"]
        for kind in ("你要做", "你要定", "AI 欠你"):
            sub = sorted((kr for kr in rows if kr[1].get("kind") == kind), key=order)
            if sub:
                out += ["", f"### {kind}（{len(sub)}）"] + [line(k, r) for k, r in sub]
    out += ["", MD_END]
    return "\n".join(out)


def refresh_markdown(snap):
    if not BOARD_MD.exists():
        return "全局看板.md 不存在，没刷新"
    md = BOARD_MD.read_text(encoding="utf-8")
    i, j = md.find(MD_START), md.find(MD_END)
    if i < 0 or j < i:
        return "全局看板.md 里没有 BOARD-LANES 标记，没刷新清单"
    BOARD_MD.write_text(md[:i] + lanes_markdown(snap) + md[j + len(MD_END):], encoding="utf-8")
    return "已刷新 全局看板.md 的分组清单"


ASK = re.compile(r"问用户|等用户|等你|要你定|请你|你定|批不批")


def _t(s):
    from datetime import datetime
    try:
        return datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except ValueError:
        return None


def daily_report(snap, entries, now, items):
    """每日巡检：只列要跟进的，不算问题。参考时间 = 快照导出时间（先重导快照再跑）。"""
    ref = _t(snap.get("导出时间"))
    age_h = lambda s: (ref - _t(s)).total_seconds() / 3600 if ref and _t(s) else None
    print("\n—— 每日巡检 ——")
    allrows = {}
    for coll in ("items", "resources", "dialogs"):
        for k, r in snap.get(coll, {}).items():
            allrows[k] = r
    fb = [(k, r) for k, r in sorted(allrows.items()) if (r.get("feedback") or "").strip() and r.get("feedback") != r.get("feedbackSeen")]
    print(f"新反馈（总管还没看）：{len(fb)}")
    for k, r in fb:
        print(f"  [新反馈] {k} {(r.get('title') or r.get('name') or '')[:40]}｜{r['feedback'].strip()[:60]}")
    nxt = [(k, r) for k, r in sorted(items.items()) if (r.get("next") or "").strip() and not r.get("nextDoneAt")
           and (r.get("syncedAt") or ((r.get("feedback") or "").strip() and r.get("feedback") == r.get("feedbackSeen")))]
    print(f"待下一步（转出了、下一步还没做完）：{len(nxt)}——查负责对话框有没有做，做完写 nextDoneAt")
    for k, r in nxt:
        h = age_h(r.get("syncedAt") or r.get("updatedAt"))
        print(f"  [待下一步{' · 超过 24 小时' if h and h > 24 else ''}] {k} {r.get('title', '')[:40]} → {r.get('syncedTo') or r.get('owner', '')}｜{r['next'][:60]}")
    stale = [(k, r) for k, r in sorted(items.items()) if r.get("kind") == "AI 欠你" and r.get("status") in OPEN_STATUS
             and lane_of(r) != "搁置" and (age_h(r.get("updatedAt")) or 0) > 48]
    print(f"AI 欠你、48 小时没动：{len(stale)}——查负责对话框记录；没人做就排队或派活")
    for k, r in stale[:20]:
        print(f"  [停了] {k} {r.get('title', '')[:50]} → {r.get('owner', '')}（{lane_of(r)}）")
    if len(stale) > 20:
        print(f"  …另有 {len(stale) - 20} 条")
    led = {(e["checkbox"]["file"], e["checkbox"]["hash"]): e for e in entries if e.get("checkbox")}
    ask, tick = [], []
    for (rel, h), (n, line) in sorted(now.items()):
        if not ASK.search(line):
            continue
        e = led.get((rel, h))
        b = e and e.get("board")
        if not e:
            ask.append((rel, n, line))            # 新问的、还没对过账：最要紧
        elif e.get("result") in ON_BOARD and items.get(b, {}).get("status") not in OPEN_STATUS:
            tick.append((rel, n, b))              # 看板那行已经关了（答过 / 不做了），记录里没打勾
    print(f"对话记录里新问你 / 等你、还没上看板：{len(ask)}——逐条判断：真没答就补一行「你要定」（带推荐），已经过时就在对账表写依据")
    for rel, n, line in ask:
        print(f"  [问用户没上看板] {rel}:{n} {line[:80]}")
    print(f"问你的、看板那行已关但记录没打勾：{len(tick)}——不急；排给那个对话框下次开工时打勾")
    for rel, n, b in tick:
        print(f"  [答过没打勾] {rel}:{n} → {b} {items.get(b, {}).get('status', '')}")
    roster = " ".join(str(r.get("code", "")) + " " + str(r.get("name", "")) for r in snap.get("dialogs", {}).values())
    extra = []
    for f in sorted(DIALOGS.glob("对话框*.md")):
        name = f.stem.replace("对话框", "")
        toks = [t for t in re.split(r"[\s/、，,（）()·]+", roster) if len(t) >= 2 or t.isdigit()]
        if not any(t == name or (not t.isdigit() and name.startswith(t)) for t in toks):
            extra.append(f.name)
    print(f"名册外的对话记录：{len(extra)}" + ("——新开的对话框，加进看板「对话框」页" if extra else ""))
    for x in extra:
        print(f"  [名册外] 对话记录/{x}")


if __name__ == "__main__":
    sys.exit(main())
