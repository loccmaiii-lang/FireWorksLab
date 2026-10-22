"""只读贴图还原动画（并行）：左 PC 2K，右 手游 1K"""
import os, sys, subprocess
import numpy as np
from multiprocessing import Pool
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kiku_timemap import material, area_down, OUT
from kiku_render import encode, bloom_preview

FPS, N, LEAD, D = 30, 102, 6, 1024
TEX = {tag: np.array(Image.open(f"{OUT}/T_Kiku_Yaeshin_TimeMap_{tag}.png")) for tag in ("PC_2K", "Mobile_1K")}
yy = np.linspace(0, 1, D)[:, None, None]
SKY = np.broadcast_to(np.array([0.0015, 0.0018, 0.0045]) * (1 - yy) + np.array([0.004, 0.005, 0.012]) * yy, (D, D, 3))
FONT = ImageFont.truetype("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", 28)
TMP = f"{OUT}/_rv"

def job(f):
    t = (f - LEAD) / FPS
    halves = []
    for tag in ("PC_2K", "Mobile_1K"):
        hdr = np.zeros((D, D, 3)) if t < 0 else material(TEX[tag], t, f)
        if hdr.shape[0] != D: hdr = area_down(hdr, hdr.shape[0] // D)
        halves.append(encode(bloom_preview(hdr) + SKY, 1.0))
    im = Image.fromarray(np.concatenate(halves, 1))
    d = ImageDraw.Draw(im)
    d.text((24, 20), "PC 2K · 单张 RGBA", fill=(200, 196, 186), font=FONT)
    d.text((D + 24, 20), "手游 1K · 单张 RGBA", fill=(200, 196, 186), font=FONT)
    d.text((24, D - 56), f"t = {max(t,0):.2f}s", fill=(150, 146, 140), font=FONT)
    im.save(f"{TMP}/{f:04d}.png")
    return f

if __name__ == "__main__":
    os.makedirs(TMP, exist_ok=True)
    with Pool(2) as p:
        for f in p.imap_unordered(job, range(N)):
            if f % 20 == 0: print("recon", f, flush=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", f"{TMP}/%04d.png",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-movflags", "+faststart",
                    f"{OUT}/Kiku_TimeMap_Reconstruction_2K_vs_1K.mp4"], check=True)
    print("done")
