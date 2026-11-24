"""将两个最终 Cascade 包转成离线浏览器可读取的数据，保留 RGBA 四个独立通道。"""
import base64
import json
import zlib
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent / "Baker" / "DotRabbitDemo"


def encode(raw):
    return base64.b64encode(zlib.compress(raw, 9)).decode("ascii")


def read_package(filename):
    config = json.loads((ASSETS / filename).read_text(encoding="utf8"))
    layers = []
    for emitter in config["emitters"]:
        ids = config["materials"][emitter["material"]]["textures"]
        seq, ramp = (config["textures"][ids[k]] for k in ("main", "ramp"))
        with Image.open(ASSETS / seq["file"]) as atlas:
            assert atlas.mode == "RGBA" and seq["channels"] == 4
            pixels = encode(atlas.tobytes())
            side = atlas.width
        with Image.open(ASSETS / ramp["file"]) as image:
            lut = encode(image.convert("RGB").crop((0, image.height//2, 256, image.height//2 + 1)).tobytes())
        modules = {m["m"]: m for m in emitter["modules"]}
        duration = modules["Lifetime"]["Lifetime"]["const"]
        curve = modules["DynamicParameter"]["params"]["frame"]["curve"]
        # 按真实曲线与 30Hz tick 取帧，末帧在粒子寿命内。
        frame_table = np.floor(np.interp(np.arange(seq["frames"])/30/duration, *zip(*curve))).astype(int)
        if not np.array_equal(frame_table, np.arange(64)):
            raise ValueError(f"{filename} 的取帧与这份同步对照不一致")
        colors = modules["ColorOverLife"]["ColorOverLife"]["curve"]
        assert all(v == [1, 1, 1] for _, v in colors)
        assert modules["ColorOverLife"]["AlphaOverLife"]["const"] == 1
        assert seq["cols"] == seq["rows"] == 4
        layers.append({"side": side, "atlas": pixels, "ramp": lut})
    return layers


if __name__ == "__main__":
    data = {k: read_package(f) for k, f in (("pc", "cascade.json"), ("mobile", "cascade_mobile.json"))}
    metadata = json.loads((HERE.parent / "shared" / "metadata.json").read_text(encoding="utf8"))
    side = metadata["canvas_metres"]
    (HERE / "baker_data.js").write_text(
        f"window.rabbitCanvasMetres={side};\nwindow.rabbitBakerData="
        + json.dumps(data, separators=(",", ":")) + ";\n", encoding="ascii")
