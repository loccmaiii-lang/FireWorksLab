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


def read_package(filename, metadata):
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
        # 共享播放头使用全局 tick；每层的延迟、寿命、局部帧号、亮度取自该包。
        tick_times = np.arange(metadata['frame_count'])/metadata['fps']
        age = tick_times-emitter['required']['delay_s']
        u = np.clip(age/duration, 0, 1)
        frame_table = np.floor(np.interp(u, *zip(*curve))).astype(int)
        if np.any((frame_table < 0) | (frame_table >= seq['frames'])):
            raise ValueError(f'{filename} 帧号越出配置范围')
        colors = modules["ColorOverLife"]["ColorOverLife"]["curve"]
        assert all(v[0] == v[1] == v[2] for _, v in colors)
        gain = np.interp(u, [t for t,_ in colors], [v[0] for _,v in colors])
        gain[(age < -1e-7) | (age >= duration-1e-7)] = 0
        assert modules["ColorOverLife"]["AlphaOverLife"]["const"] == 1
        assert seq["cols"] == seq["rows"] == 4
        width_cm, height_cm = modules['InitialSize']['StartSize']['const'][:2]
        assert width_cm == height_cm
        layers.append({"side": side, "atlas": pixels, "ramp": lut, "viewScale": width_cm/(metadata['canvas_metres']*100),
                       "frames": frame_table.tolist(), "gain": gain.round(9).tolist()})
    return layers


if __name__ == "__main__":
    metadata = json.loads((HERE.parent / "shared" / "metadata.json").read_text(encoding="utf8"))
    data = {k: read_package(f, metadata) for k, f in (("pc", "cascade.json"), ("mobile", "cascade_mobile.json"))}
    hold = metadata['hold_frames_inclusive']
    timeline = dict(frames=metadata['frame_count'], fps=metadata['fps'], holdFrame=sum(hold)//2,
                    hold=hold, durationSeconds=metadata['duration_seconds'], terminalFrame=metadata['frame_count']-1)
    side = metadata["canvas_metres"]
    (HERE / "baker_data.js").write_text(
        f"window.rabbitCanvasMetres={side};\nwindow.rabbitTimeline={json.dumps(timeline)};\nwindow.rabbitBakerData="
        + json.dumps(data, separators=(",", ":")) + ";\n", encoding="ascii")
