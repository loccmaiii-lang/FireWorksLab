"""用 Houdini 自带的 hython 执行。输入是相邻 shared/motion.npz。"""

import argparse
import json
from pathlib import Path, PureWindowsPath
import re
import shutil
from tempfile import TemporaryDirectory

import hou
import numpy as np


HERE = Path(__file__).resolve().parent



def clean_fbx(path):
    # FBX 用绝对路径写临时工程元数据。仅规范文本头，几何和 UV 不变。
    text = path.read_text(encoding="utf8")
    text = re.sub(r'"[A-Za-z]:[\\/][^"]*"', lambda m: '"' + PureWindowsPath(m[0][1:-1]).name + '"', text)
    path.write_text("\n".join(line.rstrip() for line in text.splitlines()) + "\n", encoding="utf8", newline="\n")


def cache_points(motion, cache, side_m):
    # Houdini 的 XY 立面在 Unreal 中成为 XZ 立面。位置用米，ROP 负责转换厘米。
    xy = motion["xy"]
    count = xy.shape[1]
    colors = motion["rgb"].astype(np.float32) / 255
    colors = np.where(colors <= 0.04045, colors / 12.92, ((colors + 0.055) / 1.055) ** 2.4)
    geometry = hou.Geometry()
    geometry.createPoints(np.zeros((count, 3)))
    geometry.addAttrib(hou.attribType.Point, "id", 0)
    geometry.addAttrib(hou.attribType.Point, "pscale", 1.0)
    geometry.addAttrib(hou.attribType.Point, "Alpha", 1.0)
    geometry.addAttrib(hou.attribType.Point, "Cd", (1.0, 1.0, 1.0))
    geometry.setPointIntAttribValues("id", list(range(count)))
    # 把亮度写入动态 Cd，沿用工程中已启用的 UseVATColor；Alpha 恒为 1。
    for frame, positions in enumerate(xy):
        xyz = np.zeros((count, 3), dtype=np.float32)
        xyz[:, 0] = (positions[:, 0] - 0.5) * side_m
        xyz[:, 1] = (0.5 - positions[:, 1]) * side_m
        geometry.setPointFloatAttribValuesFromString("P", xyz.tobytes())
        geometry.setPointFloatAttribValuesFromString("pscale", (motion["radius"][frame] * side_m).astype(np.float32).tobytes())
        color = colors * motion["intensity"][frame, :, None]
        geometry.setPointFloatAttribValuesFromString("Cd", color.astype(np.float32).tobytes())
        geometry.saveToFile(str(cache / f"points.{frame + 1:04}.bgeo.sc"))


def render(source_path, destination):
    motion = np.load(source_path, allow_pickle=False)
    frames, points = motion["xy"].shape[:2]
    spec = json.loads((source_path.parent / "metadata.json").read_text(encoding="utf8"))
    fps = float(motion["fps"])
    if fps != spec["fps"] or frames != spec["frame_count"]:
        raise ValueError("轨迹与 metadata.json 的采样率或帧数不一致")
    with TemporaryDirectory(prefix="rabbit_vat_") as tmp:
        work = Path(tmp)
        cache_points(motion, work, spec["canvas_metres"])
        hou.setFps(fps)
        hou.playbar.setFrameRange(1, frames)
        obj = hou.node("/obj").createNode("geo", "dot_source")
        source = obj.createNode("file", "frames")
        source.parm("file").set(f"{work.as_posix()}/points.$F4.bgeo.sc")
        node = hou.node("/out").createNode("labs::vertex_animation_textures::3.0", "DotRabbit")
        node.parm("mode").set(3)
        node.hm().switchMode(node)
        for key in ("f1", "f2"):
            node.parm(key).deleteAllKeyframes()
        node.setParms({
            "engine": "unreal", "soppath": source.path(), "f1": 1, "f2": frames,
            "exportpath": work.as_posix(), "assetname": "DotRabbit", "addsubdir": 0,
            "targettexsize": str(2 ** int(np.ceil(np.log2(points)))),
            "depth": "float16", "normalizedata": 0, "debugplane": 0,
            "supportparticleinterpolate": 1, "include_sprite": "gpc",
            "exportlegacydatafile": 1, "enable_datafile": 1,
        })
        node.allowEditingOfContents()
        node.node("render_mesh_fbx").parm("sdkversion").set("FBX | FBX201800")
        node.parm("renderall").pressButton()
        destination.mkdir(parents=True, exist_ok=True)
        for name in ["DotRabbit_mesh.fbx", "DotRabbit_pos.exr", "DotRabbit_col.exr"]:
            path = next(work.rglob(name), work / name)
            if not path.is_file():
                raise RuntimeError(f"VAT 导出缺少 {name}。{node.errors()}，输出目录 {list(work.glob('DotRabbit*'))}")
            shutil.copyfile(path, destination / name)
        clean_fbx(destination / "DotRabbit_mesh.fbx")
        bounds_file = next(work.rglob("DotRabbit_data.json"))
        shutil.copyfile(bounds_file, destination / bounds_file.name)
        print("导出帧数、点数、纹理长宽", frames, points,
              node.evalParm("finaltexsizex"), node.evalParm("finaltexsizey"))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--motion", type=Path, default=HERE.parent / "shared" / "motion.npz")
    parser.add_argument("--out", type=Path, default=HERE)
    args = parser.parse_args()
    render(args.motion, args.out)
