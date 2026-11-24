"""从参考图右半提取光点，或从随包点表重建 30 Hz 动作。"""
import argparse
import csv
import hashlib
import json
import subprocess
from pathlib import Path

import numpy as np


HERE = Path(__file__).resolve().parent
FPS = 30
FRAMES = 110
HOLD_START = 48
HOLD_END = 67
TAIL_START = 90
LAUNCH = np.array([0.5, 0.55])
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


def original_hold_and_decay(targets, median_radius):
    """保留初版的随机数顺序和运算，第 22–63 帧对应新第 48–89 帧。"""
    rng = np.random.default_rng(241124)
    drift = rng.uniform(-1, 1, (len(targets), 2))
    fade_speed = rng.uniform(0.72, 1.50, len(targets))
    phase = rng.uniform(0, 2 * np.pi, len(targets))
    xy, radius, intensity = [], [], []
    for frame in range(22, 64):
        free = max((frame - 41) / 22, 0)
        pos = LAUNCH + (targets - LAUNCH)
        pos += 0.011 * np.sin(np.pi) * drift
        pos += free * (0.04 * (targets - LAUNCH) + 0.022 * drift)
        pos[:, 1] += 0.032 * free ** 2
        strength = (1 - 0.93 * free) ** fade_speed
        tail_spark = 1 - 0.1 * np.sin(phase + free * 4.2) ** 2 * free
        xy.append(pos)
        radius.append(np.full(len(targets), median_radius * (1 - free * 0.28)))
        intensity.append(strength * tail_spark)
    return np.array(xy), np.array(radius), np.array(intensity)


def kata_opening(targets):
    request = dict(targetUV=targets.tolist(), origin=LAUNCH.tolist(), fps=FPS, lastFrame=HOLD_START)
    result = subprocess.run(["node", str(HERE / "sample_kata.cjs")], input=json.dumps(request),
                            encoding="utf8", stdout=subprocess.PIPE, check=True)
    sample = json.loads(result.stdout)
    positions = LAUNCH + np.asarray(sample.pop("frames")) * [1, -1] * sample["uvPerMetre"]
    # 成形帧是最后一个模拟样本，也是旧消散的起点。接合前逐点核验。
    np.testing.assert_allclose(positions[-1], targets, atol=1e-9, rtol=0)
    return positions, np.array(sample.pop("launch")), sample


def continue_decay(xy, radius, intensity):
    # 延续原尾段出口的切线速度，随阻力渐慢；靠近边缘的点按到边界的剩余路程提前减速。
    velocity = xy[-1] - xy[-2]
    margin = 2.2 * radius[-1, :, None]
    room = np.where(velocity >= 0, 1 - margin - xy[-1], xy[-1] - margin)
    ticks = np.minimum(20.0, np.min(room / np.maximum(1e-12, np.abs(velocity)), axis=1))
    if np.min(ticks) <= 0:
        raise ValueError("原尾段已触及延伸段留边")
    step = np.arange(1, FRAMES - TAIL_START + 1)[:, None]
    progress = step / (FRAMES - TAIL_START)
    elapsed = -np.expm1(-step / ticks) * ticks
    return (xy[-1] + elapsed[:, :, None] * velocity,
            radius[-1] * (1 - 0.3 * progress), intensity[-1] * (1 - progress)**2)


def sample(points, extraction):
    centers = points[:, 1:3]
    reference_center = (centers.min(axis=0) + centers.max(axis=0)) * 0.5
    targets = (centers - reference_center) / SOURCE_SPAN_PX + 0.5
    ids = np.arange(len(points) + 1, dtype=np.int32)
    groups = np.append(points[:, 3], 0).astype(np.uint8)
    median_radius = np.median(points[:, 4]) / SOURCE_SPAN_PX
    kept = original_hold_and_decay(targets, median_radius)
    tail = continue_decay(*kept)
    flight, launch, native = kata_opening(targets)
    opening_size = (HOLD_START, len(targets))
    # 沿用原模拟 headI 的 0.05 秒点火段，点径、三色分组和随后的寿命由点阵美术决定。
    ignition = np.minimum(np.arange(HOLD_START) / (FPS * 0.05), 1.0)[:, None]
    first = flight[:-1], np.full(opening_size, median_radius), np.broadcast_to(ignition, opening_size)
    xy, radius, intensity = [np.concatenate(parts, axis=0) for parts in zip(first, kept, tail)]
    time = np.arange(FRAMES) / FPS
    flash = native["flash"]
    flash_on = time <= flash["cut"]
    flash_radius = flash["sig"] * native["uvPerMetre"] * np.sqrt(2 * np.log(2))
    flash_xy = np.broadcast_to(LAUNCH, (FRAMES, 1, 2))
    xy = np.concatenate((xy, flash_xy), axis=1)
    radius = np.column_stack((radius, np.where(flash_on, flash_radius, 0)))
    intensity = np.column_stack((intensity, np.where(flash_on, flash["I"]*np.exp(-time/flash["dec"]), 0)))
    palette = extraction["palette"]
    colors = {name: np.array([p[key] for p in palette], dtype=np.uint8)[groups]
              for name, key in [("rgb", "single_color_srgb"), ("core_rgb", "core_srgb"), ("halo_rgb", "halo_srgb")]}
    data = {"xy": np.array(xy, dtype=np.float32), "radius": np.array(radius, dtype=np.float32),
            "intensity": np.array(intensity, dtype=np.float32), "group": groups,
            "point_id": ids.astype(np.int32), "fps": np.int32(FPS), "launch_shape_xy": launch, **colors}
    assert np.allclose(data["xy"][HOLD_START:HOLD_END + 1, :-1], targets, atol=1e-7)
    assert np.max(data["intensity"][-1]) == 0 and np.min(data["intensity"][-2, :-1]) > 0
    assert data["xy"].min() > 0 and data["xy"].max() < 1
    return data, reference_center.tolist(), native


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
    side_m = round(SOURCE_SPAN_PX * DEMO_HEIGHT_METRES / np.ptp(points[:, 2]), 2)
    data, center, native = sample(points, extraction)
    np.savez_compressed(out / "motion.npz", **data)
    report = {
        "fps": FPS, "frame_count": FRAMES, "duration_seconds": FRAMES / FPS,
        "canvas_metres": side_m,
        "demo_shape_height_metres": DEMO_HEIGHT_METRES,
        "size_basis": "沿用 2026-11-12 本机 ArkRabbit2 原型的 200m 图案高度。是本次比较用的尺度。",
        "source_pixels_per_uv_unit": SOURCE_SPAN_PX,
        "reference_center_px": center, "hold_frames_inclusive": [HOLD_START, HOLD_END],
        "shape_point_count": len(points), "flash_point_id": len(points), "total_point_count": len(points) + 1,
        "opening_start_frame": 0, "formation_frame": HOLD_START, "decay_start_frame": HOLD_END + 1,
        "added_tail_start_frame": TAIL_START, "last_lit_source_frame": FRAMES - 2, "zero_frame": FRAMES - 1,
        "flash": {"center_uv": LAUNCH.tolist(), "sigma_metres": native["flash"]["sig"]*native["uvPerMetre"]*side_m,
                  "initial_intensity": native["flash"]["I"], "peak_multiplier": 1.5,
                  "decay_seconds": native["flash"]["dec"], "cut_seconds": native["flash"]["cut"],
                  "kernel": "1.5 * intensity * 2^(-d²/radius²)"},
        "opening_reference": "从零时刻起直接采样烘焙器型物心形的原生模拟。点火前一次性校准兔形发射点表，使第 48 帧落在附件的 476 个点心。每个物理步都由原版 Sim.step 计算。灯芯、分色、停形和余火使用点阵样例的美术。",
        "native_simulation": native,
        "coordinates": "xy[frame,point_id] = [u 向右,v 向下]，原点左上。正面平面，无深度。",
        "radius": "每点亮度降至峰值一半处的半径，以方画布边长为 1。成形段采用参考图实测中位数。",
        "intensity": "线性相对强度 0–1。rgb 为只能单色的材质使用的折中色；core_rgb 与 halo_rgb 为实测近白灯芯与外围色相（sRGB）。",
        "timing_assumption": "第 48 帧到达兔形，第 48–89 帧保留首版的 20 帧停形和 22 帧散落。第 90–109 帧沿余火原出口速度继续并减速，强度相对第 89 帧乘 ((109-f)/20)²，第 109 帧全灭。",
        "extraction": extraction,
    }
    (out / "metadata.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
