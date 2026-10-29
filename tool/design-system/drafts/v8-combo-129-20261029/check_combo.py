"""129组合的静态回归契约；不冒充浏览器视觉或业务验收。

从最终自包含HTML读实际payload，避免仅检查源文件中的ready标记。
浏览器仍须逐14族核有效计算样式、状态、键盘和绿色定制。
"""
from __future__ import annotations

import argparse
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
LOCAL = ROOT / "analysis/local/20261029_129组合"
IDS = ("C01", "C02", "C03", "C04", "C05", "C06", "C07", "C08", "C09", "C11", "C12", "C16", "TREE", "COLOR")
SOURCE_RECORD = ROOT / "analysis/results/20261029_组件风格选择/FWL-组件选择-128.json"
SOURCE_SHA = "6b8ea15e5819e859e50e7000c5dea9d48dbd7ee4813f1aadbe0b886f3a017f1d"
GIT_BASE = "6d543791cc3df63dcba1437554e115d00a99af0b"
PROTECTED_PATHS = (
    "tool/src", "tool/design-system",
    ":(exclude)tool/design-system/drafts/v8-combo-129-20261029",
    "tool/FireworkBaker.html", "tool/FireworkBaker_MaterialB.html",
    "analysis/results/20261029_组件风格选择/FWL-组件选择-128.json",
)
NOTES = {
    "C03": "采用adobe，保留material绿色滑杆",
    "C04": "采用adobe，但选中要绿色",
    "C11": "采用adobe，但选中要绿色",
}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
CONTROLS = {"button", "input", "select", "textarea", "summary", "progress"}


class Page(HTMLParser):
    def __init__(self, text: str):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.ids = set()
        self.resources = []
        self.styles = []
        self.scripts = []
        self.script_data = None
        self.script_attrs = None
        self.style_data = None
        self.payload = None
        self.family_nodes = {name: {"sections": 0, "controls": 0, "ids": []} for name in IDS}
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attr = dict(attrs)
        if attr.get("id"):
            self.ids.add(attr["id"])
        family = attr.get("data-combo-family") or (self.stack[-1][1] if self.stack else None)
        if attr.get("data-combo-family") in self.family_nodes:
            state = self.family_nodes[attr["data-combo-family"]]
            state["sections"] += 1
            if attr.get("id"):
                state["ids"].append(attr["id"])
        if family in self.family_nodes and tag in CONTROLS:
            self.family_nodes[family]["controls"] += 1
        if tag not in VOID:
            self.stack.append((tag, family))
        for key in ("src", "poster", "data"):
            if key in attr and tag in {"script", "img", "audio", "video", "source", "embed", "object", "iframe"}:
                self.resources.append((tag, key, attr[key]))
        if tag == "link" and "href" in attr:
            self.resources.append((tag, "href", attr["href"]))
        if attr.get("style"):
            self.styles.append(attr["style"])
        if tag == "script":
            self.script_data = []
            self.script_attrs = attr
        if tag == "style":
            self.style_data = []

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_data(self, text):
        if self.script_data is not None:
            self.script_data.append(text)
        if self.style_data is not None:
            self.style_data.append(text)

    def handle_endtag(self, tag):
        if tag == "script" and self.script_data is not None:
            text = "".join(self.script_data)
            if self.script_attrs.get("id") == "picker-data":
                self.payload = json.loads(text)
            if self.script_attrs.get("type", "").lower() not in {"application/json", "application/ld+json"}:
                self.scripts.append(text)
            self.script_data = self.script_attrs = None
        if tag == "style" and self.style_data is not None:
            self.styles.append("".join(self.style_data))
            self.style_data = None
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def external_resources(self):
        refs = list(self.resources)
        for css in self.styles:
            for match in re.finditer(r"url\(\s*(['\"]?)(.*?)\1\s*\)", css, re.S):
                refs.append(("css", "url", match.group(2)))
            for match in re.finditer(r"@import\s+['\"]([^'\"]+)['\"]", css, re.I):
                refs.append(("css", "import", match.group(1)))
        return [(tag, key, ref[:160]) for tag, key, ref in refs if ref and not ref.startswith(("data:", "blob:", "#", "about:"))]


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def old_sources_check(root: Path, freeze_path: Path, git_base: str = GIT_BASE):
    """本机按原始字节检查；云端没有私有过程表时按公开Git基线检查。"""
    if freeze_path.is_file():
        evidence = {"mode": "本机原始SHA256", "matrix": str(freeze_path), "count": 0, "differences": []}
        try:
            freeze = json.loads(freeze_path.read_text(encoding="utf-8"))
            if not isinstance(freeze, dict) or not freeze:
                raise ValueError("保护起点必须是非空路径到SHA256的对象")
            evidence["count"] = len(freeze)
            for name, digest in freeze.items():
                if not isinstance(name, str) or not isinstance(digest, str):
                    evidence["differences"].append({"file": str(name), "reason": "invalid-matrix-entry"})
                    continue
                path = (root / name).resolve()
                if not path.is_relative_to(root.resolve()):
                    evidence["differences"].append({"file": name, "reason": "outside-root"})
                elif not path.is_file() or sha(path) != digest:
                    evidence["differences"].append({"file": name, "reason": "missing-or-changed"})
        except (OSError, UnicodeError, ValueError, TypeError) as error:
            evidence["error"] = "本机保护矩阵无法完成检查：" + str(error)
        return "旧源与旧稿冻结指纹未变", not evidence.get("error") and not evidence["differences"], evidence

    evidence = {
        "mode": "Git基线", "baseline": git_base, "scope": list(PROTECTED_PATHS),
        "differences": [],
        "note": "未提供本机原始SHA256矩阵；检查指定Git基线到当前tracked工作树的差异，不冒称364份raw指纹核验。",
    }
    git = shutil.which("git")
    if not git:
        evidence["error"] = "找不到Git，无法执行旧源保护检查。"
        return "旧源与旧稿保护（Git基线）", False, evidence
    try:
        baseline = subprocess.run([git, "-C", str(root), "cat-file", "-e", git_base + "^{commit}"], capture_output=True)
        if baseline.returncode:
            evidence["error"] = "Git仓库或基线提交不可用；请先取得包含该提交的评审分支。"
            evidence["diagnostic"] = baseline.stderr.decode("utf-8", errors="replace")[:800]
            return "旧源与旧稿保护（Git基线）", False, evidence
        diff = subprocess.run([git, "-C", str(root), "diff", "--name-only", "-z", git_base, "--", *PROTECTED_PATHS], capture_output=True)
        if diff.returncode:
            evidence["error"] = "Git基线差异检查执行失败。"
            evidence["diagnostic"] = diff.stderr.decode("utf-8", errors="replace")[:800]
            return "旧源与旧稿保护（Git基线）", False, evidence
        evidence["differences"] = [name for name in diff.stdout.decode("utf-8", errors="replace").split("\0") if name]
    except OSError as error:
        evidence["error"] = "Git基线差异检查无法运行：" + str(error)
        return "旧源与旧稿保护（Git基线）", False, evidence
    return "旧源与旧稿保护（Git基线）", not evidence["differences"], evidence


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", type=Path, default=HERE / "index.html")
    parser.add_argument("--download", type=Path)
    parser.add_argument("--output", type=Path, default=LOCAL / "最终静态核验.json")
    args = parser.parse_args()
    checks = []

    def check(name, passed, evidence=None):
        checks.append({"name": name, "pass": bool(passed), "evidence": evidence})

    root_page = Page(args.html.read_text(encoding="utf-8"))
    data = root_page.payload
    if not isinstance(data, dict):
        raise ValueError("最终HTML缺少有效picker-data")
    source_bytes = SOURCE_RECORD.read_bytes()
    original = json.loads(source_bytes)
    rows = original["components"]
    expected = {row["id"]: row for row in rows}
    check("用户原始选择JSON未改字节", hashlib.sha256(source_bytes).hexdigest() == SOURCE_SHA, {"sha256": hashlib.sha256(source_bytes).hexdigest(), "bytes": len(source_bytes)})
    profile = json.loads((HERE / "appearance-profile.json").read_text(encoding="utf-8"))
    check("固定profile保留原选择且版本为129", profile.get("record") == original and profile.get("version") == "129")
    check("三条绿色定制结构化声明", profile.get("accentOverrides") == {"C03": "theme", "C04": "theme", "C11": "theme"}, profile.get("accentOverrides"))
    check("主题绿沿用已确认颜色", profile.get("theme", {}).get("accent", "").lower() == "#00d49b")
    embedded_profile = data.get("profile") or data.get("appearanceProfile")
    check("最终HTML内嵌129profile", isinstance(embedded_profile, dict) and embedded_profile.get("accentOverrides") == profile["accentOverrides"] and embedded_profile.get("version") == "129")
    current = data.get("initialRecord")
    current_rows = current.get("components", []) if isinstance(current, dict) else []
    current_map = {row.get("id"): row for row in current_rows if isinstance(row, dict)}
    check("最终HTML默认载入14项用户选择", len(current_rows) == 14 and set(current_map) == set(IDS) and all(current_map[k].get("selected") == expected[k]["selected"] and current_map[k].get("reviewed") is True and current_map[k].get("note") == expected[k]["note"] for k in IDS))
    check("三条备注原文完整保留", all(current_map.get(k, {}).get("note") == note for k, note in NOTES.items()))
    samples = data.get("samples", {})
    check("14族目录和构建样本一致", set(samples) == set(IDS) and {item.get("id") for item in data.get("catalog", {}).get("items", [])} == set(IDS))
    mapping = {k: {"applicable": bool(samples.get(k, {}).get("sceneApplicable")), "cssBytes": len(samples.get(k, {}).get("overrideCSS", {}).get(expected[k]["selected"], "").encode())} for k in IDS}
    check("14族均有实际场景CSS声明", all(row["applicable"] and row["cssBytes"] > 40 for row in mapping.values()), mapping)

    documents = [("root", root_page)]
    for name, html in data.get("workspaces", {}).items():
        if isinstance(html, str) and re.search(r"<(?:html|!doctype)\b", html, re.I):
            documents.append(("workspace-" + name, Page(html)))
    for name in IDS:
        sample = samples.get(name, {})
        for side in ("material", "adobe"):
            html = sample.get(side + "Html")
            if isinstance(html, str):
                documents.append((name + "-" + side, Page(html)))
    if args.download:
        downloaded = Page(args.download.read_text(encoding="utf-8"))
        documents.append(("download", downloaded))
        downloaded_data = downloaded.payload or {}
        downloaded_rows = downloaded_data.get("initialRecord", {}).get("components", [])
        downloaded_map = {row.get("id"): row for row in downloaded_rows if isinstance(row, dict)}
        downloaded_profile = downloaded_data.get("profile") or downloaded_data.get("appearanceProfile", {})
        download_matches = len(downloaded_rows) == 14 and set(downloaded_map) == set(IDS) and all(downloaded_map[k].get("selected") == expected[k]["selected"] and downloaded_map[k].get("reviewed") is True and downloaded_map[k].get("note") == expected[k]["note"] for k in IDS)
        check("下载副本含相同14项选择与129profile", download_matches and downloaded_profile.get("version") == "129" and downloaded_profile.get("accentOverrides") == profile["accentOverrides"], {"path": str(args.download), "sha256": sha(args.download)})
    check("主HTML与两场景28候选文档完整", len(documents) >= 31, {"documents": len(documents)})
    current_scene = next((page for name, page in documents if name == "workspace-mb128"), None)
    check("实际128场景包含组合检查入口", current_scene is not None and "combo-lab" in current_scene.ids)
    presence = current_scene.family_nodes if current_scene is not None else {}
    check("14族有真实DOM实例与原生控件", len(presence) == 14 and all(row["sections"] > 0 and row["controls"] > 0 for row in presence.values()), presence)
    externals = [{"document": name, "resources": page.external_resources()} for name, page in documents if page.external_resources()]
    check("所有内嵌文档零外部资源依赖", not externals, externals)

    node = shutil.which("node")
    syntax_dir = LOCAL / "syntax"
    syntax_dir.mkdir(parents=True, exist_ok=True)
    failures = []
    script_count = 0
    if node:
        env = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
        for name, page in documents:
            for index, text in enumerate(page.scripts):
                if not text.strip():
                    continue
                script_count += 1
                path = syntax_dir / f"{name}-{index}.js"
                path.write_text(text, encoding="utf-8", newline="\n")
                result = subprocess.run([node, "--check", str(path)], capture_output=True, text=True, encoding="utf-8", errors="replace", env=env)
                if result.returncode:
                    failures.append({"document": name, "script": index, "error": (result.stderr or result.stdout)[:1800]})
    check("内联JS语法检查", bool(node) and not failures, {"scripts": script_count, "failures": failures, "node": node})

    check(*old_sources_check(ROOT, LOCAL / "保护起点.json"))
    source_errors = []
    manifest = data.get("manifest", {})
    sources = manifest.get("workspaces", {}).get("files", [])
    for row in sources:
        path = (ROOT / row.get("path", "")).resolve()
        if not path.is_relative_to(ROOT.resolve()) or not path.is_file() or sha(path) != row.get("sha256"):
            source_errors.append(row.get("path"))
    check("打包来源哈希对应当前文件", bool(sources) and not source_errors, {"count": len(sources), "errors": source_errors})
    result = {
        "pass": all(row["pass"] for row in checks),
        "boundary": "静态产物与回归契约检查；CSS存在/DOM存在不表示有效计算样式、视觉或业务通过。root须另行浏览器逐14族实测。",
        "html": {"path": str(args.html), "sha256": sha(args.html), "bytes": args.html.stat().st_size},
        "checks": checks,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"pass": result["pass"], "checks": len(checks), "passed": sum(row["pass"] for row in checks), "failed": [row["name"] for row in checks if not row["pass"]], "output": str(args.output), "htmlSha256": result["html"]["sha256"]}, ensure_ascii=False))
    return 0 if result["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
