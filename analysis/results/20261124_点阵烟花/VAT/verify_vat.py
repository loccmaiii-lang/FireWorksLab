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
    visible = tags == 0
    channels = []
    for layer in (0, 1):
        block = text.split(f"LayerElementUV: {layer} {{", 1)[1]
        uv = fbx_array(block, "UV", np.float32).reshape(-1, 2)
        indices = fbx_array(block, "UVIndex", np.int32).reshape(-1, 3)
        channels.append(uv[indices].reshape(-1, 2))
    uv_pairs = np.concatenate(channels, axis=1)
    render_vertices = uv_pairs[np.repeat(visible, 3)]
    basis = [fbx_array(text, n, np.float32).reshape(-1, 3)
             for n in ("Normals", "Tangents", "Binormals")]
    corner_attributes = np.column_stack((vertices[corners.flatten()], uv_pairs, *basis))
    geometry = dict(controlPoints=len(vertices), visibleControlPoints=int(np.unique(corners[visible]).size),
                    metadataControlPoints=int(np.unique(corners[~visible]).size),
                    triangles=len(tags), visibleTriangles=int(visible.sum()), metadataTriangles=int((~visible).sum()),
                    cornerIndices=corners.size, visibleCornerIndices=corners[visible].size,
                    uniquePositionUVTangentBasis=len(np.unique(corner_attributes, axis=0)),
                    webGLCardVertexInputs=len(render_vertices))
    return render_vertices, geometry


def read_assets():
    pos = read_exr(HERE / "DotRabbit_pos.exr")
    color = read_exr(HERE / "DotRabbit_col.exr")
    vertices, geometry = read_cards(HERE / "DotRabbit_mesh.fbx")
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
    source_meta = json.loads((HERE.parent / "shared" / "metadata.json").read_text(encoding="utf8"))
    side_m = source_meta["canvas_metres"]
    fps = bounds["Houdini FPS"]
    assert h == source_meta["frame_count"] and fps == source_meta["fps"]
    assert geometry["visibleControlPoints"] == w * 4 and geometry["webGLCardVertexInputs"] == w * 6
    meta = dict(width=w, height=h, sideCm=side_m * 100, radiusUV=max_radius_m / side_m,
                fps=fps, durationSeconds=h / fps, shapeCards=source_meta["shape_point_count"],
                flashID=source_meta["flash_point_id"], flashPeak=source_meta["flash"]["peak_multiplier"],
                **geometry)
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
    xy, radius, hue, brightness = decode()
    source = np.load(HERE.parent / "shared" / "motion.npz")
    srgb = source["rgb"].astype(np.float32) / 255
    linear_rgb = np.where(srgb <= 0.04045, srgb / 12.92, ((srgb + 0.055) / 1.055) ** 2.4)
    # 所有样点都比较实际发出的 RGB，完全熄灭时三通道必须精确为零。
    radiance = hue * brightness[:, :, None]
    expected = linear_rgb[None] * source["intensity"][:, :, None]
    np.testing.assert_array_equal(radiance[source["intensity"] == 0], 0)
    np.testing.assert_array_equal(radiance[-1], 0)
    errors = dict(maxCenterErrorIn512Px=float(np.max(np.linalg.norm(xy - source["xy"], axis=2)) * 512),
                  maxRadiusErrorIn512Px=float(np.max(np.abs(radius - source["radius"])) * 512),
                  maxBrightnessError=float(np.max(np.abs(brightness - source["intensity"]))),
                  maxPremultipliedLinearRGBError=float(np.max(np.abs(radiance - expected))))
    assert errors["maxCenterErrorIn512Px"] < 0.125
    assert errors["maxRadiusErrorIn512Px"] < 0.01
    assert errors["maxBrightnessError"] < 0.001 and errors["maxPremultipliedLinearRGBError"] < 0.001
    h, fps = meta["height"], meta["fps"]
    last = h - 1
    # 离线演算一次激活的每个 30Hz 采样，末个 tick 停在末帧，直到寿命到期。
    keys = [[0, 0], [last / h, last / fps], [1, last / fps]]
    relative_age = np.arange(h + 1) / h
    seconds = np.interp(relative_age, *np.array(keys).T)
    addressed = np.floor(seconds * fps + 1e-7).astype(int)
    np.testing.assert_array_equal(addressed, np.minimum(np.arange(h + 1), last))
    lit = np.flatnonzero(brightness.max(axis=1) > 0)
    assert np.array_equal(source["point_id"], np.arange(meta["width"]))
    flash = np.flatnonzero(brightness[:, meta["flashID"]] > 0)
    assert len(lit) and len(flash) and lit[-1] < last and flash[-1] < lit[-1]
    extent = np.abs(xy - 0.5) * meta["sideCm"] + 5 * radius[:, :, None] * meta["sideCm"]
    timing = dict(lastNonzeroFrame=int(lit[-1]), firstFullyDarkTailFrame=int(lit[-1] + 1),
                  finalPeakBrightness=float(brightness[-1].max()),
                  lastNonzeroPeak=float(brightness[lit[-1]].max()), flashLitFrames=flash.tolist(),
                  clockKeysRelativeAgeToSeconds=keys, verifiedSampledFrames=h,
                  recommendedSymmetricBoundsCm=int(np.ceil(np.linalg.norm(extent, axis=2).max() * 1.1 / 100) * 100))
    source_hash = hashlib.sha256((HERE.parent / "shared" / "motion.npz").read_bytes()).hexdigest()
    payload = dict(meta, sourceMotionSHA256=source_hash, mesh=pack(vertices, "<f4"),
                   position=pack(pos, "<f2"), color=pack(color, "<f2"))
    (HERE / "vat_data.js").write_text("window.rabbitVATAssets=" + json.dumps(payload, separators=(",", ":")) + ";\n", encoding="utf8")
    hashes = {name: hashlib.sha256((HERE / name).read_bytes()).hexdigest() for name in
              ["DotRabbit_mesh.fbx", "DotRabbit_pos.exr", "DotRabbit_col.exr", "DotRabbit_data.json"]}
    report = dict(meta, timing=timing, **errors, estimatedTextureBytes=pos.shape[0] * pos.shape[1] * 8 * 2,
                  sourceMotionSHA256=source_hash, sha256=hashes)
    print(json.dumps(report, indent=2))
    (HERE / "verify.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
