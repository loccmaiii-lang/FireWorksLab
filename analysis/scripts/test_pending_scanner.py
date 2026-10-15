"""N23-04 fixtures. Production input stays read-only; no browser/UE."""
import contextlib, copy, importlib.util, io, json, pathlib, tempfile, unittest

HERE = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("pending_scanner", HERE / "待处理.py")
scanner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scanner)

class Snapshot:
    def __init__(self, files, head="a" * 40):
        self.head = head
        self.files = {k: (v.encode("utf-8") if isinstance(v, str) else json.dumps(v, ensure_ascii=False).encode("utf-8")) for k, v in files.items()}
        self.paths = set(self.files)
    def read(self, path):
        return self.files.get(path)

def base():
    return {"协作/状态清单.json": {"effects": [{"key": "fx", "名": "效果", "负责": "对话框1", "阶段": "制作中", "主条目": "R1"}], "共享文件": {}},
            "协作/派活队列.json": {"任务": []}, "tool/data/review.js": 'var FW_REVIEW = [{"id":"R1","ver":"v1"}];'}

def export(files, jid="EX1", ver="v1", **extra):
    files[f"analysis/jobs/{jid}.json"] = {"id": jid, "type": "export", "effect": "fx", "entry": "R1", **extra}
    files[f"analysis/results/{jid}/done.json"] = {"ok": True}
    files[f"analysis/results/{jid}/导出清单.json"] = {"effect": "fx", "entry": "R1", "ver": ver, "time": "2026-10-16 03:00", "packages": []}

def scan(files, previous=None, head="a" * 40):
    if hasattr(scanner, "scan"):
        return scanner.scan(Snapshot(files, head), previous)
    # Only used for the pre-fix failing reproduction against the real old main().
    with tempfile.TemporaryDirectory(prefix="fwl_pending_fixture_") as tmp:
        root = pathlib.Path(tmp).resolve()
        assert root.is_relative_to(pathlib.Path(tempfile.gettempdir()).resolve())
        (root / "analysis/jobs").mkdir(parents=True)
        (root / "analysis/results").mkdir(parents=True)
        for path, value in Snapshot(files).files.items():
            dst = (root / path).resolve()
            assert dst.is_relative_to(root)
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_bytes(value)
        old = scanner.ROOT, scanner.RES
        scanner.ROOT, scanner.RES = str(root), str(root / "analysis/results")
        out = io.StringIO()
        try:
            with contextlib.redirect_stdout(out): scanner.main()
        finally: scanner.ROOT, scanner.RES = old
    return {"items": [], "delta": {"new": [], "closed": []}, "legacyText": out.getvalue()}

def item(report, prefix):
    return next(x for x in report["items"] if x["id"].startswith(prefix))

class PendingTests(unittest.TestCase):
    def test_incremental_export_and_repeat(self):
        files = base(); export(files, "EX0")
        first = scan(files)
        self.assertFalse([x for x in first["items"] if x.get("actionable")])
        export(files)
        new = scan(files, first)
        ids = [x["id"] for x in new["items"]]
        self.assertTrue(any(x.startswith("export:EX1:") for x in ids), new.get("legacyText", ids))
        self.assertEqual(item(new, "export:EX1:")["status"], "pending_review")
        again = scan(files, new)
        self.assertEqual(again["delta"]["new"], [])
        self.assertEqual(len({x["id"] for x in again["items"]}), len(again["items"]))

    def test_review_closes_without_user_acceptance(self):
        files = base(); old = scan(files); export(files); pending = scan(files, old)
        files["analysis/results/EX1/看法.md"] = "AI审看，用户未验收"
        done = scan(files, pending)
        self.assertEqual(item(done, "export:EX1:")["status"], "reviewed")
        self.assertIn(item(pending, "export:EX1:")["id"], done["delta"]["closed"])

    def test_superseded_version_is_not_new_debt(self):
        files = base(); first = scan(files)
        files["tool/data/review.js"] = 'var FW_REVIEW = [{"id":"R1","ver":"v2"}];'
        export(files, "EX1", "v1"); export(files, "EX2", "v2")
        result = scan(files, first)
        self.assertEqual(item(result, "export:EX1:")["status"], "superseded")
        self.assertFalse(item(result, "export:EX1:")["actionable"])
        self.assertEqual(item(result, "export:EX2:")["status"], "pending_review")

    def test_claimed_t11_is_occupied_not_redispatched(self):
        files = base(); first = scan(files); export(files)
        files["协作/派活队列.json"]["任务"] = [{"编号":"T11","状态":"在做","交给":"审看者","标题":"审看","关联任务":["EX1"]}]
        files["协作/状态清单.json"]["共享文件"] = {"审看占用":{"负责":"审看者","状态":"在做","范围":"EX1"}}
        result = scan(files, first); found = item(result, "export:EX1:")
        self.assertEqual(found["status"], "occupied"); self.assertFalse(found["actionable"])
        self.assertEqual(found["occupiedBy"], ["T11"]); self.assertTrue(result["occupancy"])

    def test_cancelled_and_completed_shared_are_closed(self):
        files = base(); first = scan(files); export(files, status="cancelled")
        files["协作/派活队列.json"]["任务"] = [{"编号":"T07","状态":"取消"},{"编号":"T12","状态":"完成"}]
        result = scan(files, first)
        for prefix in ["export:EX1:", "shared:T07", "shared:T12"]:
            self.assertFalse(item(result, prefix)["actionable"])

    def test_shared_waiting_dependencies_and_blocked(self):
        files = base(); first = scan(files)
        files["协作/派活队列.json"]["任务"] = [{"编号":"T10","状态":"卡住"},{"编号":"T08","状态":"等前置","前置":["T10"]},{"编号":"T17","状态":"待派","前置":[]}]
        result = scan(files, first)
        self.assertEqual(item(result, "shared:T08")["status"], "dependency_blocked")
        self.assertFalse(item(result, "shared:T08")["actionable"])
        self.assertEqual(item(result, "shared:T10")["status"], "blocked")
        self.assertTrue(item(result, "shared:T17")["actionable"])

    def test_missing_manifest_and_conflicting_receipt_need_verification(self):
        files = base(); first = scan(files); export(files)
        del files["analysis/results/EX1/导出清单.json"]
        result = scan(files, first); self.assertEqual(item(result, "export:EX1:")["status"], "verification")
        self.assertTrue(item(result, "export:EX1:")["actionable"])
        export(files); files["analysis/results/EX1/error.json"] = {"error":"failed"}
        result = scan(files, first); self.assertEqual(item(result, "export:EX1:")["status"], "verification")

    def test_lost_receipt_is_not_silently_closed(self):
        files = base(); first = scan(files); export(files); pending = scan(files, first)
        del files["analysis/results/EX1/done.json"]
        result = scan(files, pending)
        self.assertEqual(item(result, "export:EX1:")["status"], "verification")
        again = scan(files, result)
        self.assertEqual(item(again, "export:EX1:")["status"], "verification")
        self.assertEqual(again["delta"]["new"], [])

    def test_shared_conflict_and_completed_missing_evidence(self):
        files = base(); first = scan(files)
        files["协作/派活队列.json"]["任务"] = [{"编号":"T11","状态":"在做"},{"编号":"T11","状态":"完成"},{"编号":"T18","状态":"完成","结果文件":["analysis/results/missing/看法.md"]}]
        result = scan(files, first)
        self.assertEqual(item(result, "shared:T11")["status"], "verification")
        self.assertEqual(item(result, "shared:T18")["status"], "verification")

    def test_explicit_replacement_and_bad_schema(self):
        files = base(); first = scan(files); export(files, supersededBy="EX2")
        self.assertEqual(item(scan(files, first), "export:EX1:")["status"], "verification")
        export(files, "EX2")
        self.assertEqual(item(scan(files, first), "export:EX1:")["status"], "superseded")
        files["协作/派活队列.json"] = {"任务": "bad"}
        self.assertEqual(item(scan(files), "input:协作/派活队列.json")["status"], "verification")

    def test_historical_unknown_does_not_become_new_debt_on_repeat(self):
        files = base(); export(files, "OLD")
        del files["analysis/results/OLD/导出清单.json"]
        first = scan(files); again = scan(files, first)
        self.assertEqual(item(again, "export:OLD:")["status"], "verification")
        self.assertFalse(item(again, "export:OLD:")["actionable"])
        self.assertEqual(again["delta"]["new"], [])

    def test_unchanged_review_cannot_certify_changed_receipt(self):
        files = base(); export(files); files["analysis/results/EX1/看法.md"] = "旧版AI审看"
        first = scan(files)
        files["analysis/results/EX1/done.json"] = {"ok":True, "revision":"new"}
        result = scan(files, first)
        self.assertEqual(item(result, "export:EX1:")["status"], "verification")
        self.assertTrue(item(result, "export:EX1:")["actionable"])

    def test_seed_subdirectory_is_not_a_queue_job(self):
        files = base(); files["analysis/jobs/起点/seed.json"] = {"P":{"x":1}}
        result = scan(files)
        self.assertFalse([x for x in result["items"] if x["kind"] == "input"])

    def test_fixed_head_and_legacy_text_compatibility(self):
        files = base()
        files["analysis/jobs/FIT.json"] = {"id":"FIT","effect":"fx"}
        files["analysis/results/FIT/done.json"] = {"ok":True}
        result = scan(files, head="b"*40)
        self.assertEqual(result["sourceHead"], "b"*40)
        out = scanner.render(result)
        self.assertIn("## 对话框1", out); self.assertIn("👀 FIT 结果回来了", out)
        self.assertEqual(item(scan({**files, "协作/派活队列.json":"bad"}), "input:协作/派活队列.json")["status"],"verification")

if __name__ == "__main__": unittest.main()
