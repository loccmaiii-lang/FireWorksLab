#!/usr/bin/env python3
"""看板对账：检查在线全局看板有没有漏项。总管每次更新看板前后都跑一次。

    python3 analysis/scripts/看板对账.py            # 只报问题，有问题退出码 1
    python3 analysis/scripts/看板对账.py --verbose  # 另列已打勾、指向已关闭行的条目

读两份文件（都在 协作/）：
  看板对账.json  对账表：每条来源（对话框打勾项、计划、规范……）对到看板哪一行，或为什么不用上看板
  看板快照.json  在线看板数据库的快照（总管每次改完看板重导）
--snapshot-from 同时把快照嵌进 协作/全局看板.html（在线看板同一页的离线副本，本机直接双击打开、只读）。
另列「用户勾了我做好了、还没同步给负责对话框」的行（等同步），总管同步后在看板写 syncedAt / syncedTo。

查四件事：
  1. 对话记录/*.md 里每个没打勾的「- [ ]」都在对账表里（按 文件 + 文字指纹 对）
  2. 对账表里「已在看板 / 已补进看板」的行号都在快照里
  3. 对账表里「已做完 / 被取代」都写了依据
  4. 快照里每条没关的行都有来源

文字指纹：去掉行首「- [ ]」、去掉所有空白、取前 120 个字，sha1 前 12 位。
文字改了指纹就变 —— 那条会作为「新的未打勾」报出来，复核一下再补进对账表。
"""
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LEDGER = ROOT / "协作" / "看板对账.json"
SNAPSHOT = ROOT / "协作" / "看板快照.json"
PAGE = ROOT / "协作" / "全局看板.html"
SNAP_RE = re.compile(r'(<script type="application/json" id="snap">)(.*?)(</script>)', re.S)
COLLS = ("items", "resources", "dialogs", "reports")
DIALOGS = ROOT / "对话记录"

BOX = re.compile(r"^\s*[-*]\s*\[ \]\s*")
ON_BOARD = {"已在看板", "已补进看板"}
CLOSED_OK = {"已做完", "被取代"}
RESULTS = ON_BOARD | CLOSED_OK
OPEN_STATUS = {"没做", "在做"}


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
    ap.add_argument("--time", help="配合 --snapshot-from：导出时间，如 2026-10-13T21:50:00+08:00")
    a = ap.parse_args()

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
        SNAPSHOT.write_text(json.dumps(snap, ensure_ascii=False, indent=1), encoding="utf-8")
        page = PAGE.read_text(encoding="utf-8")
        if len(SNAP_RE.findall(page)) != 1:
            sys.exit(f"{PAGE} 里找不到唯一的 snap 块，离线副本没写")
        blob = json.dumps(snap, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
        PAGE.write_text(SNAP_RE.sub(lambda m: m.group(1) + blob + m.group(3), page), encoding="utf-8")
        print("快照已重写（并嵌进 协作/全局看板.html）：" + "、".join(f"{c} {len(snap[c])}" for c in COLLS))

    ledger = json.loads(LEDGER.read_text(encoding="utf-8"))
    entries = ledger["条目"]
    snap = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
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
        by[(r.get("when"), r.get("kind"))] = by.get((r.get("when"), r.get("kind")), 0) + 1
    gone = [e for e in entries if e.get("checkbox") and (e["checkbox"]["file"], e["checkbox"]["hash"]) not in now]
    closed_refs = [e for e in entries if e.get("result") in ON_BOARD and e.get("board") in items
                   and items[e["board"]].get("status") not in OPEN_STATUS]

    print(f"对账表 {len(entries)} 条（快照 {snap.get('导出时间', '?')}）；对话记录里没打勾 {len(now)} 个")
    print(f"看板 items {len(items)} 行，没关 {len(open_items)} 行：")
    for w in ("周三前必须", "周四以后", "暂不建议"):
        parts = [f"{k} {by.get((w, k), 0)}" for k in ("你要做", "你要定", "AI 欠你")]
        print(f"  {w}：" + "，".join(parts))
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

    if problems:
        print(f"\n问题 {len(problems)} 个：")
        for p in problems:
            print(p)
        return 1
    print("\n没有问题：每个没打勾的都对过账，看板行号都在，关掉的都有依据。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
