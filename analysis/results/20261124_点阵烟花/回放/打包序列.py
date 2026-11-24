"""将两个最终 Cascade 包转成离线浏览器可读取的数据，保留 RGBA 四个独立通道。"""
import base64
import hashlib
import json
import re
import zlib
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent / "Baker" / "DotRabbitDemo"


def encode(raw):
    return base64.b64encode(zlib.compress(raw, 9)).decode("ascii")


def read_package(filename, config, metadata):
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
    shared = HERE.parent / 'shared'
    metadata = json.loads((shared / 'metadata.json').read_text(encoding='utf8'))
    files = {'pc': 'cascade.json', 'mobile': 'cascade_mobile.json'}
    configs = {k: json.loads((ASSETS / filename).read_text(encoding='utf8')) for k, filename in files.items()}
    motion_hash = configs['pc']['source']['motion_sha256']
    if motion_hash != configs['mobile']['source']['motion_sha256']:
        raise ValueError('PC 与手游配置引用了不同的运动数据')
    if motion_hash != hashlib.sha256((shared / 'motion.npz').read_bytes()).hexdigest():
        raise ValueError('序列包与当前共享轨迹的 SHA256 不一致，请重新烘焙')
    data = {k: read_package(filename, configs[k], metadata) for k, filename in files.items()}
    hold = metadata['hold_frames_inclusive']
    timeline = dict(frames=metadata['frame_count'], fps=metadata['fps'], holdFrame=sum(hold)//2,
                    hold=hold, durationSeconds=metadata['duration_seconds'], terminalFrame=metadata['frame_count']-1,
                    sourceMotionSHA256=motion_hash)
    side = metadata["canvas_metres"]
    (HERE / "baker_data.js").write_text(
        f"window.rabbitCanvasMetres={side};\nwindow.rabbitTimeline={json.dumps(timeline)};\nwindow.rabbitBakerData="
        + json.dumps(data, separators=(",", ":")) + ";\n", encoding="ascii")
    # HTML 地址固定，两个数据文件随共用轨迹换缓存版本，刷新旧标签即可看到这一轮。
    page = HERE.parent / "双方案对照.html"
    previous = page.read_text(encoding="utf8")
    updated, count = re.subn(r'(src="(?:回放/baker_data|VAT/vat_data)\.js)(?:\?v=[0-9a-f]+)?"',
                             lambda m: f'{m[1]}?v={motion_hash[:8]}"', previous)
    if count != 2:
        raise ValueError("固定对照页缺少序列或 VAT 数据入口")
    if updated != previous:
        page.write_text(updated, encoding="utf8")
