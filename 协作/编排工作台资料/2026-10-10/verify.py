"""Verify uploaded programme/music archive without local application dependencies."""
from pathlib import Path
import base64
import hashlib
import json

root = Path(__file__).resolve().parent
manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
for item in manifest["files"]:
    path = root / item["path"]
    raw = path.read_bytes()
    assert len(raw) == item["bytes"], item["path"]
    assert hashlib.sha256(raw).hexdigest() == item["sha256"], item["path"]
    if "embeddedMusic" in item:
        project = json.loads(raw.decode("utf-8-sig"))
        payload = project.get("payload", project)
        audio = payload["audioRef"]
        decoded = base64.b64decode(audio["dataUrl"].split(",", 1)[1], validate=True)
        assert hashlib.sha256(decoded).hexdigest() == audio["sha256"], item["path"]
current = json.loads((root / manifest["currentProgramme"]).read_text(encoding="utf-8"))
music = (root / manifest["music"]).read_bytes()
assert hashlib.sha256(music).hexdigest() == current["payload"]["audioRef"]["sha256"]
assert all(manifest["checks"].values())
print(f"PASS: {len(manifest['files'])} files; embedded music and programme baseline checks")
