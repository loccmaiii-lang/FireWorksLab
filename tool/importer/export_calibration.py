"""Export current recipes through the existing baker, without editing shared recipes."""
from __future__ import annotations

import hashlib
import importlib
import json
import os
from pathlib import Path
import shutil
import sys
import time

REPO = Path(r"F:\FireWorksLab")
PRIVATE = Path(__file__).resolve().parent
REPORTS = PRIVATE / "research" / "calibration-20261002"
DEST = Path(r"D:\ProjectTextures\FireWorksLab")
STAGING = PRIVATE / "research" / "calibration-20261002" / "staging"
ENTRIES = [
    ("QA19", "qiuxing_a", "QiuXingA_40_20261002"),
    ("ZB5", "qiuxing_b", "QiuXingB_40_20261002"),
    ("QC11", "qiuxing_c", "QiuXingC_40_20261002"),
    ("QD13", "qiuxing_d", "QiuXingD_40_20261002"),
    ("QN11", "qingning", "QingNing_40_20261002"),
    ("ZW5", "wancai", "QianLun_40_20261002"),
]


def jsave(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def log(message: object) -> None:
    print(time.strftime("%H:%M:%S ") + str(message), flush=True)


def validate_pack(directory: Path, expected: dict | None) -> dict:
    results = {}
    for filename in ("cascade.json", "cascade_mobile.json"):
        spec = json.loads((directory / filename).read_text("utf-8-sig"))
        assert spec["format"] == "fwl.cascade/1"
        assert "4.0" in spec["source"]["tool"]
        for key, texture in spec["textures"].items():
            assert (directory / texture["file"]).is_file(), (filename, key)
        if expected:
            assert len(spec["source"]["layers"]) == len(expected["layers"])
            assert [l["type"] for l in spec["source"]["layers"]] == expected["types"], "Wrong layer types"
            for i, delay in enumerate(expected["delays"], 1):
                emitters = [e for e in spec["emitters"] if e["name"].startswith(f"L{i}_")]
                assert emitters, f"Missing layer {i}"
                # Invisible lead-in is trimmed and added to EmitterDelay by the baker.
                assert min(e["required"].get("delay_s", 0) for e in emitters) >= delay - 0.001
        results[filename] = {
            "source": spec["source"],
            "emitters": [
                {"name": e["name"], "delay_s": e["required"].get("delay_s", 0),
                 "duration_s": e["required"]["duration_s"]}
                for e in spec["emitters"]
            ],
        }
    return results


def finish_pack(name: str, out: Path, expected: dict | None) -> dict:
    source = STAGING / "analysis" / "local" / "输出" / "素材包" / name
    checked = validate_pack(source, expected)
    dest = DEST / name
    if dest.exists():
        assert {f.name: sha(f) for f in source.iterdir() if f.is_file()} == {
            f.name: sha(f) for f in dest.iterdir() if f.is_file()
        }, "Destination already exists with different contents; refuse to overwrite"
    else:
        shutil.copytree(source, dest)
    replay = json.loads((out / "回放检查.json").read_text("utf-8-sig"))
    return {
        "entry": (expected or {}).get("id", "crossette-default40"),
        "ver": (expected or {}).get("ver"),
        "destination": str(dest),
        "files": {f.name: sha(f) for f in dest.iterdir() if f.is_file()},
        "checks": checked,
        "replay_pass": replay["pass"],
        "replay_fails": [{"emitter": e["pack"], "fails": e["fails"]}
                         for e in replay["layers"] if not e["pass"]],
    }


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.path[:0] = [str(REPO / "analysis" / "scripts"), str(REPO / "analysis" / "local")]
    from job_lock import ProcessLock, gpu_lock_path
    from compare import SimSession
    import export_job

    # Only private staging paths are mutated by the reused exporter.
    export_job.ROOT = str(STAGING)
    original_combo = export_job.run_combo_pack
    def private_combo(job, *args, **kwargs):
        if job.get("_ref"):
            rel = session.pg.evaluate("id=>FW_REVIEW_LIST.find(x=>x.id===id).video", job["entry"])
            job["_ref"]["video"] = str((REPO / "tool" / rel).resolve())
        return original_combo(job, *args, **kwargs)
    export_job.run_combo_pack = private_combo
    REPORTS.mkdir(parents=True, exist_ok=True)
    STAGING.mkdir(parents=True, exist_ok=True)
    os.environ["FW_RENDER"] = "gpu"
    manifest = {"started": time.strftime("%Y-%m-%d %H:%M:%S"), "items": []}
    with ProcessLock(gpu_lock_path(REPO)):
        session = SimSession()
        try:
            assert not session.soft, "A hardware GPU is required"
            manifest["renderer"] = session.renderer
            manifest["baker_version"] = session.pg.evaluate("VERSION")
            log({"renderer": session.renderer, "version": manifest["baker_version"]})
            for entry, effect, name in ENTRIES:
                out = REPORTS / name
                out.mkdir(parents=True, exist_ok=True)
                expected = session.pg.evaluate("""id => {
                    const e = FW_REVIEW_LIST.find(e => e.id === id);
                    return {id: e.id, ver: e.ver, layers: e.layerIds,
                        types: e.layerIds.map(id => FW_REVIEW_LIST.find(x=>x.id===id).base),
                        delays: e.combo.layers.map(x=>x.delay||0),
                        parameters: e.layerIds.map(id => {
                            const P=replicaPM(id).P;
                            return Object.fromEntries(['type','duration','seed','v0','burn','stars','headDimUntil','subDelay','exposure'].map(k=>[k,P[k]]));
                        })};
                }""", entry)
                jsave(out / "expected.json", expected)
                log(f"EXPORT {entry} -> {name}")
                export_job.run({"id": name, "type": "export", "entry": entry,
                                "effect": effect, "name": name}, session, str(out), log)
                actual = session.pg.evaluate("""() => state.layers.map(L=>{
                    const P=state.lib.find(x=>x.name===L.lib).P;
                    return Object.fromEntries(['type','duration','seed','v0','burn','stars','headDimUntil','subDelay','exposure'].map(k=>[k,P[k]]));
                })""")
                assert actual == expected["parameters"], "Loaded combination differs from requested recipe"
                item = finish_pack(name, out, expected)
                manifest["items"].append(item)
                jsave(REPORTS / "exports.json", manifest)
                log(f"COPIED {name}; replay={item['replay_pass']}")

            name = "Crossette_40_20261002"
            out = REPORTS / name
            out.mkdir(parents=True, exist_ok=True)
            defaults = session.pg.evaluate("defaultsFor('crossette', 40)")
            params = out / "source.json"
            jsave(params, {"params": defaults["P"], "materialDefaults": defaults["M"]})
            export_job.run({"id": name, "type": "export", "name": name,
                            "params": str(params), "exports": {name: {}}}, session, str(out), log)
            manifest["items"].append(finish_pack(name, out, None))
            manifest["finished"] = time.strftime("%Y-%m-%d %H:%M:%S")
            jsave(REPORTS / "exports.json", manifest)
            log("Seven complete PC/mobile packs copied and checks recorded")
        finally:
            session.close()


if __name__ == "__main__":
    main()
