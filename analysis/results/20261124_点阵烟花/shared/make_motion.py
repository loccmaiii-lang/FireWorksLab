"""从参考图右半提取光点，或从随包点表重建 30 Hz 动作。"""
import argparse
import csv
import hashlib
import json
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


def kata_opening(targets, side_m):
    # 移植 00_util.js H_STEP 和 20_sim.js Sim.step 的无风星头核心。
    # 模拟坐标以米计，Y 向上。统一缩放 90 星心形的初速量级适配 200m 的兔形。
    h = 1 / 480
    gravity = 9.81
    drag = gravity / 18**2
    end_time = HOLD_START / FPS
    blend_time = 0.2
    sample_time = np.arange(HOLD_START + 1) / FPS
    blend_start = end_time - blend_time
    u = np.maximum(0, (sample_time - blend_start) / blend_time)
    # 最后 0.2s 用积分时间平滑衔接静止，切线速度从 1 连续降至 0。
    physical_time = np.minimum(sample_time, blend_start) + blend_time * (u - u**3 + 0.5*u**4)
    steps = round(physical_time[-1] / h)
    duration = steps * h
    desired_metres = (targets - LAUNCH) * np.array([side_m, -side_m])
    reach_m = np.log1p(drag * 110 * duration) / drag
    spatial_scale = np.max(np.linalg.norm(desired_metres, axis=1)) / reach_m
    desired = desired_metres / spatial_scale

    def integrate(initial, keep_path=False):
        velocity = initial.copy()
        position = np.zeros_like(initial)
        path = [position.copy()] if keep_path else []
        for _ in range(steps):
            speed = np.linalg.norm(velocity, axis=1, keepdims=True)
            velocity /= 1 + drag * h * speed
            velocity[:, 1] -= gravity * h
            position += velocity * h
            if keep_path:
                path.append(position.copy())
        return np.array(path) if keep_path else position

    # 求每个点的初速度，约束同一时刻到达各自的精确位置。运动途中直接用同一积分核。
    aim = desired + [0, 0.5 * gravity * duration**2]
    distance = np.linalg.norm(aim, axis=1, keepdims=True)
    velocity = aim * np.expm1(drag * distance) / (drag * duration * np.maximum(distance, 1e-12))
    for _ in range(7):
        end = integrate(velocity)
        error = desired - end
        if np.max(np.abs(error)) < 1e-8:
            break
        delta = 0.002
        jac = np.stack([(integrate(velocity + axis * delta) - end) / delta
                        for axis in np.eye(2)], axis=2)
        velocity += np.linalg.solve(jac, error[..., None])[..., 0]
    path = integrate(velocity, keep_path=True)
    np.testing.assert_allclose(path[-1], desired, atol=1e-6)
    index = np.minimum(physical_time / h, steps)
    left = np.floor(index).astype(int)
    right = np.minimum(left + 1, steps)
    interp = (index - left)[:, None, None]
    sampled = path[left] + (path[right] - path[left]) * interp
    return LAUNCH + sampled * [spatial_scale / side_m, -spatial_scale / side_m]


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


def sample(points, extraction, side_m):
    centers = points[:, 1:3]
    reference_center = (centers.min(axis=0) + centers.max(axis=0)) * 0.5
    targets = (centers - reference_center) / SOURCE_SPAN_PX + 0.5
    ids = np.arange(len(points) + 1, dtype=np.int32)
    groups = np.append(points[:, 3], 0).astype(np.uint8)
    median_radius = np.median(points[:, 4]) / SOURCE_SPAN_PX
    kept = original_hold_and_decay(targets, median_radius)
    tail = continue_decay(*kept)
    opening = kata_opening(targets, side_m)
    # 独立星头在 0.05s 内点亮，强度与中心爆闪分别存储。
    age = np.arange(HOLD_START) / FPS
    gain = np.minimum(age / 0.05, 1)
    first = (opening[:-1], np.full((HOLD_START, len(points)), median_radius),
             np.broadcast_to(gain[:, None], (HOLD_START, len(points))))
    xy, radius, intensity = [np.concatenate(parts, axis=0) for parts in zip(first, kept, tail)]
    time = np.arange(FRAMES) / FPS
    flash_on = time <= 0.25
    flash_radius = 4.95 * np.sqrt(2 * np.log(2)) / side_m
    xy = np.concatenate((xy, np.broadcast_to(LAUNCH, (FRAMES, 1, 2))), axis=1)
    radius = np.column_stack((radius, np.where(flash_on, flash_radius, 0)))
    intensity = np.column_stack((intensity, np.where(flash_on, np.exp(-time/0.035), 0)))
    palette = extraction["palette"]
    colors = {name: np.array([p[key] for p in palette], dtype=np.uint8)[groups]
              for name, key in [("rgb", "single_color_srgb"), ("core_rgb", "core_srgb"), ("halo_rgb", "halo_srgb")]}
    data = {"xy": np.array(xy, dtype=np.float32), "radius": np.array(radius, dtype=np.float32),
            "intensity": np.array(intensity, dtype=np.float32), "group": groups,
            "point_id": ids.astype(np.int32), "fps": np.int32(FPS), **colors}
    assert np.allclose(data["xy"][HOLD_START:HOLD_END + 1, :-1], targets, atol=1e-7)
    assert np.max(data["intensity"][-1]) == 0 and np.min(data["intensity"][-2, :-1]) > 0
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
    side_m = round(SOURCE_SPAN_PX * DEMO_HEIGHT_METRES / np.ptp(points[:, 2]), 2)
    data, center = sample(points, extraction, side_m)
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
        "flash": {"center_uv": LAUNCH.tolist(), "sigma_metres": 4.95, "peak_multiplier": 1.5,
                  "decay_seconds": 0.035, "cut_seconds": 0.25, "kernel": "1.5 * intensity * 2^(-d²/radius²)"},
        "opening_reference": "花型库 > 形状 > 型物（kata，heart）。同一爆心，星头在 0.05s 内点亮。按 110m/s 参考速度、18m/s 终端速度、9.81m/s² 重力、1/480s 步长求各点轨迹；统一空间缩放匹配兔形高度。最后 0.2s 平滑接入原停形。",
        "coordinates": "xy[frame,point_id] = [u 向右,v 向下]，原点左上。正面平面，无深度。",
        "radius": "每点亮度降至峰值一半处的半径，以方画布边长为 1。成形段采用参考图实测中位数。",
        "intensity": "线性相对强度 0–1。rgb 为只能单色的材质使用的折中色；core_rgb 与 halo_rgb 为实测近白灯芯与外围色相（sRGB）。",
        "timing_assumption": "第 48 帧到达兔形，第 48–89 帧保留首版的 20 帧停形和 22 帧散落。第 90–109 帧沿余火原出口速度继续并减速，强度相对第 89 帧乘 ((109-f)/20)²，第 109 帧全灭。",
        "extraction": extraction,
    }
    (out / "metadata.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
