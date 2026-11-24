"""从参考图右半提取光点，或从随包点表重建 30 Hz 动作。"""
import argparse
import csv
import hashlib
import json
from pathlib import Path

import numpy as np


HERE = Path(__file__).resolve().parent
FRAMES = 64
FPS = 30
DEMO_HEIGHT_METRES = 200
SOURCE_SPAN_PX = 650
GROUPS = ["白", "金", "青"]


def extract(reference):
    from PIL import Image
    from scipy import ndimage
    from scipy.spatial import cKDTree

    source = np.array(Image.open(reference).convert("RGB"), dtype=float)
    # 左边是连续描线，同一角色右边才是需要采样的发光点。
    split_x = source.shape[1] // 2
    crop = source[:, split_x:]
    brightness = crop.mean(axis=2)

    def find_peaks(sigma, window):
        light = ndimage.gaussian_filter(brightness, sigma)
        maxima = (light == ndimage.maximum_filter(light, size=window)) & (light > 150)
        labels, count = ndimage.label(maxima)
        return np.array(ndimage.center_of_mass(light, labels, np.arange(1, count + 1)))

    peaks = find_peaks(0.8, 5)
    tree = cKDTree(peaks)
    offsets_y, offsets_x = np.mgrid[-6:7, -6:7]
    rows, cores, halos = [], [], []
    for idx, peak in enumerate(peaks):
        iy, ix = np.rint(peak).astype(int)
        yy, xx = offsets_y + iy, offsets_x + ix
        # 交叉的棒/耳朵、衣领/手臂各有两种颜色。只看最近属于自己的像素。
        owns = tree.query(np.stack((yy, xx), axis=-1))[1] == idx
        weights = np.maximum(brightness[yy, xx] - 150, 0) * owns
        x = float(np.average(xx, weights=weights))
        y = float(np.average(yy, weights=weights))
        radii = np.hypot(xx - x, yy - y)
        ring = crop[yy, xx][owns & (radii >= 3.2) & (radii < 5)]
        red_minus_blue = np.median(ring[:, 0] - ring[:, 2])
        group = 1 if red_minus_blue >= 15 else 2 if red_minus_blue <= -15 else 0
        core = crop[yy, xx][owns & (radii < 1.5)].max(axis=0)
        half_area = np.sum(owns & (radii <= 4.5) & (brightness[yy, xx] >= core.mean() * 0.5))
        rows.append((idx, round(x + split_x, 4), round(y, 4), group,
                     round(float(np.sqrt(half_area / np.pi)), 4)))
        cores.append(core)
        halos.append(np.median(ring, axis=0))

    values = np.array(rows)
    groups = values[:, 3].astype(int)
    palette = []
    for group in range(len(GROUPS)):
        selected = groups == group
        core = np.median(np.array(cores)[selected], axis=0)
        halo = np.median(np.array(halos)[selected], axis=0)
        hue = np.rint(255 * halo / max(halo))
        palette.append({"name": GROUPS[group], "core_srgb": core.astype(int).tolist(),
                        "halo_srgb": hue.astype(int).tolist(),
                        "single_color_srgb": np.rint((hue + core) / 2).astype(int).tolist()})

    reference_tree = cKDTree(values[:, 1:3])
    bright_y, bright_x = np.where(np.min(crop, axis=2) > 200)
    nearest = reference_tree.query(np.column_stack((bright_x + split_x, bright_y)))[0]
    other = find_peaks(1.15, 3)
    check = {
        "source_sha256": hashlib.sha256(reference.read_bytes()).hexdigest(),
        "source_size_px": [source.shape[1], source.shape[0]],
        "right_crop_starts_x_px": split_x,
        "visible_peaks": len(peaks),
        "independent_scale_peaks": len(other),
        "other_scale_largest_nearest_distance_px": round(float(tree.query(other)[0].max()), 3),
        "connected_components_min_rgb_over_200": ndimage.label(crop.min(2) > 200)[1],
        "max_distance_from_bright_pixel_to_center_px": round(float(nearest.max()), 3),
        "group_counts": np.bincount(groups, minlength=3).tolist(),
        "nearest_spacing_median_px": round(float(np.median(reference_tree.query(values[:, 1:3], k=2)[0][:, 1])), 3),
        "measured_half_height_radius_median_px": round(float(np.median(values[:, 4])), 3),
        "palette": palette,
    }
    return rows, check


def sample(points, extraction):
    centers = points[:, 1:3]
    reference_center = (centers.min(axis=0) + centers.max(axis=0)) * 0.5
    targets = (centers - reference_center) / SOURCE_SPAN_PX + 0.5
    ids = points[:, 0].astype(int)
    groups = points[:, 3].astype(np.uint8)
    median_radius = np.median(points[:, 4]) / SOURCE_SPAN_PX
    rng = np.random.default_rng(241124)
    drift = rng.uniform(-1, 1, (len(ids), 2))
    fade_speed = rng.uniform(0.72, 1.50, len(ids))
    phase = rng.uniform(0, 2 * np.pi, len(ids))
    launch = np.array([0.5, 0.55])
    xy, radius, intensity = [], [], []
    for frame in range(FRAMES):
        expansion = min(frame / 22, 1)
        scale = 1 - 0.92 * (1 - expansion) ** 2.6
        free = max((frame - 41) / (FRAMES - 1 - 41), 0)
        pos = launch + (targets - launch) * scale
        pos += 0.011 * np.sin(np.pi * expansion) * drift
        pos += free * (0.04 * (targets - launch) + 0.022 * drift)
        pos[:, 1] += 0.032 * free ** 2
        # 亮度/尺寸分开存；成形停留段每一帧都能和输入点位精确配准。
        strength = (0.33 + 0.67 * np.sin(0.5 * np.pi * expansion)) * (1 - 0.93 * free) ** fade_speed
        tail_spark = 1 - 0.1 * np.sin(phase + free * 4.2) ** 2 * free
        radii = median_radius * (0.53 + 0.47 * np.sin(0.5 * np.pi * expansion)) * (1 - free * 0.28)
        xy.append(pos)
        radius.append(np.full(len(ids), radii))
        intensity.append(strength * tail_spark)
    palette = extraction["palette"]
    colors = {name: np.array([p[key] for p in palette], dtype=np.uint8)[groups]
              for name, key in [("rgb", "single_color_srgb"), ("core_rgb", "core_srgb"), ("halo_rgb", "halo_srgb")]}
    data = {"xy": np.array(xy, dtype=np.float32), "radius": np.array(radius, dtype=np.float32),
            "intensity": np.array(intensity, dtype=np.float32), "group": groups,
            "point_id": ids.astype(np.int32), "fps": np.int32(FPS), **colors}
    assert np.allclose(data["xy"][22:42], targets, atol=1e-7)
    assert data["xy"].min() > 0 and data["xy"].max() < 1
    return data, reference_center.tolist()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reference", type=Path, help="传入原始左右对照 PNG 重新提取，否则使用随包 points.csv")
    parser.add_argument("--out", type=Path, default=HERE)
    args = parser.parse_args()
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    if args.reference:
        rows, extraction = extract(args.reference)
        with (out / "points.csv").open("w", newline="", encoding="utf8") as handle:
            writer = csv.writer(handle, lineterminator="\n")
            writer.writerow(["point_id", "source_x_px", "source_y_px", "group", "measured_half_height_radius_px"])
            writer.writerows(rows)
        points = np.array(rows)
    else:
        points = np.loadtxt(HERE / "points.csv", delimiter=",", skiprows=1)
        extraction = json.loads((HERE / "metadata.json").read_text(encoding="utf8"))["extraction"]
    data, center = sample(points, extraction)
    np.savez_compressed(out / "motion.npz", **data)
    report = {
        "fps": FPS, "frame_count": FRAMES, "duration_seconds": FRAMES / FPS,
        "canvas_metres": round(SOURCE_SPAN_PX * DEMO_HEIGHT_METRES / np.ptp(points[:, 2]), 2),
        "demo_shape_height_metres": DEMO_HEIGHT_METRES,
        "size_basis": "沿用 2026-11-12 本机 ArkRabbit2 原型的 200m 图案高度。是本次比较用的尺度。",
        "source_pixels_per_uv_unit": SOURCE_SPAN_PX,
        "reference_center_px": center, "hold_frames_inclusive": [22, 41],
        "coordinates": "xy[frame,point_id] = [u 向右,v 向下]，原点左上。正面平面，无深度。",
        "radius": "每点亮度降至峰值一半处的半径，以方画布边长为 1。成形段采用参考图实测中位数。",
        "intensity": "线性相对强度 0–1。rgb 为只能单色的材质使用的折中色；core_rgb 与 halo_rgb 为实测近白灯芯与外围色相（sRGB）。",
        "timing_assumption": "示范动作从中心散开，在第 22–41 帧保持参照图，再轻散下落、渐灭。最后一帧保留弱余光，播放寿命到时退出。",
        "extraction": extraction,
    }
    (out / "metadata.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
