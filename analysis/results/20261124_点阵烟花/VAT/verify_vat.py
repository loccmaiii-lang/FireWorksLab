"""从 SideFX Labs 的 FBX 和半浮点 EXR 读回采样，打包离线 WebGL 播放所用数据。"""

import base64
import hashlib
import json
import os
from pathlib import Path
import re

os.environ.setdefault("OPENCV_IO_ENABLE_OPENEXR", "1")
import cv2
import numpy as np


HERE = Path(__file__).resolve().parent


def read_exr(path):
    image = cv2.imdecode(np.fromfile(path, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
    if image is None or image.ndim != 3 or image.shape[2] != 4:
        raise ValueError(f"需要四通道 EXR，读取失败 {path}")
    return image[:, :, [2, 1, 0, 3]]


def fbx_array(text, name, dtype):
    match = re.search(r"\b" + name + r":\s*\*(\d+)\s*\{\s*a:\s*([^}]+)", text)
    if not match:
        raise ValueError(f"FBX 缺少 {name}")
    values = np.fromstring(match[2].replace("\n", ""), sep=",", dtype=dtype)
    if len(values) != int(match[1]):
        raise ValueError(f"{name} 数据长度不一致")
    return values


def read_cards(path):
    # FBX 顶点的纹理坐标按多边形角索引。剔除 Labs 写进 bounds 的两个数据三角。
    text = path.read_text(encoding="utf8")
    vertices = fbx_array(text, "Vertices", np.float32).reshape(-1, 3)
    corners = fbx_array(text, "PolygonVertexIndex", np.int32).reshape(-1, 3)
    assert (corners[:, :2] >= 0).all() and (corners[:, 2] < 0).all()
    corners[:, 2] = -1 - corners[:, 2]
    assert corners.max() < len(vertices) and np.isfinite(vertices).all()
    tags = fbx_array(text.split('UserDataName: "__data_geo"', 1)[1], "UserData", np.int32)
    channels = []
    for layer in (0, 1):
        block = text.split(f"LayerElementUV: {layer} {{", 1)[1]
        uv = fbx_array(block, "UV", np.float32).reshape(-1, 2)
        indices = fbx_array(block, "UVIndex", np.int32).reshape(-1, 3)
        channels.append(uv[indices[tags == 0]].reshape(-1, 2))
    render_vertices = np.concatenate(channels, axis=1)
    return render_vertices, len(vertices), len(tags), int((tags != 0).sum())


def read_assets():
    pos = read_exr(HERE / "DotRabbit_pos.exr")
    color = read_exr(HERE / "DotRabbit_col.exr")
    vertices, control_points, triangles, hidden = read_cards(HERE / "DotRabbit_mesh.fbx")
    h, w = pos.shape[:2]
    assert pos.shape == color.shape and np.isfinite(pos).all() and np.isfinite(color).all()
    # 当前输出每帧一行，FBX 中 uv2 的 V 向上，EXR 顶行为首帧。
    addresses = np.floor(vertices[:, 2] * w).astype(int)
    assert np.allclose((1.0 - vertices[:, 3]) * h, 0.5, atol=0.001)
    np.testing.assert_array_equal(np.bincount(addresses), np.full(w, 6))
    bounds = json.loads((HERE / "DotRabbit_data.json").read_text())[0]
    # Labs 把最大 pscale 元数据写入 Houdini 的上轴，即 UE Bound Max Z 的小数部分。
    bound_units = bounds["Bound Max Z"] / 10.0
    max_radius_m = 1.0 / (1.0 - (bound_units % 1.0))
    side_m = json.loads((HERE.parent / "shared" / "metadata.json").read_text(encoding="utf8"))["canvas_metres"]
    meta = dict(width=w, height=h, sideCm=side_m * 100, radiusUV=max_radius_m / side_m,
                controlPoints=control_points, triangles=triangles, metadataTriangles=hidden)
    return vertices, pos, color, meta


def decode():
    """读取成品纹理和网格，返回 [frame,point] 布局的 xy、radius、linear_rgb、intensity。"""
    vertices, pos, color, meta = read_assets()
    # 以 FBX 每张卡片的首个角取样，并按纹理列（稳定点 ID）排序。
    columns = (vertices[::6, 2] * meta["width"]).astype(int)
    np.testing.assert_array_equal(np.sort(columns), np.arange(meta["width"]))
    order = columns[np.argsort(columns)]
    pos, color = pos[:, order], color[:, order]
    xy = np.stack((0.5 + pos[:, :, 0] / meta["sideCm"],
                   0.5 - pos[:, :, 2] / meta["sideCm"]), axis=-1)
    # 三组基色至少一分量为 1，从预乘的 Cd 还原点心亮度与色相。
    brightness = color[:, :, :3].max(axis=-1)
    hue = color[:, :, :3] / np.maximum(brightness[:, :, None], 1e-8)
    return xy, pos[:, :, 3] * meta["radiusUV"], hue, brightness * color[:, :, 3]


def pack(values, dtype):
    return base64.b64encode(np.ascontiguousarray(values, dtype=dtype).tobytes()).decode("ascii")


def main():
    vertices, pos, color, meta = read_assets()
    payload = dict(meta, mesh=pack(vertices, "<f4"), position=pack(pos, "<f2"), color=pack(color, "<f2"))
    (HERE / "vat_data.js").write_text("window.rabbitVATAssets=" + json.dumps(payload, separators=(",", ":")) + ";\n", encoding="utf8")
    xy, radius, linear_rgb, brightness = decode()
    source = np.load(HERE.parent / "shared" / "motion.npz")
    rgb = np.clip(np.where(linear_rgb <= 0.0031308, linear_rgb * 12.92,
                           1.055 * linear_rgb ** (1 / 2.4) - 0.055) * 255, 0, 255).round()
    errors = dict(maxCenterErrorIn512Px=float(np.max(np.linalg.norm(xy - source["xy"], axis=2)) * 512),
                  maxRadiusErrorIn512Px=float(np.max(np.abs(radius - source["radius"])) * 512),
                  maxBrightnessError=float(np.max(np.abs(brightness - source["intensity"]))),
                  maxRGB8Error=int(np.max(np.abs(rgb - source["rgb"][None]))))
    assert errors["maxCenterErrorIn512Px"] < 0.125
    assert errors["maxRadiusErrorIn512Px"] < 0.01
    assert errors["maxBrightnessError"] < 0.001 and errors["maxRGB8Error"] <= 1
    hashes = {name: hashlib.sha256((HERE / name).read_bytes()).hexdigest() for name in
              ["DotRabbit_mesh.fbx", "DotRabbit_pos.exr", "DotRabbit_col.exr", "DotRabbit_data.json"]}
    report = dict(meta, **errors, estimatedTextureBytes=pos.shape[0] * pos.shape[1] * 8 * 2,
                  sha256=hashes)
    print(json.dumps(report, indent=2))
    (HERE / "verify.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
