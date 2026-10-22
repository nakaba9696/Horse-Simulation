# 目はそのまま（基本の目の帯を残す）、眉と口だけを描き直す：楕円の中から目の帯（横長の楕円）を除いて inpaint し、目の帯は基本の画素に戻す
# 使い方：python mouthbrow.py <元.png> <基本.webp> <値.json> <出す頭> cx,cy,rx,ry eyecx,eyecy,eyerx,eyery "<タグ>" den seeds ["外す"] ["ネガ"]
import sys, subprocess
import numpy as np
from PIL import Image
args = sys.argv[1:]
src, basef, recf, outp, ell, eye, expr, den, seeds = args[:9]
rest = args[9:]
subprocess.run([sys.executable, "face4.py", src, basef, recf, outp, ell, expr, den, seeds] + rest, check=True)
b = np.array(Image.open(basef).convert("RGBA")).astype(np.float32)
H, W = b.shape[:2]; yy, xx = np.mgrid[:H, :W]
ex, ey, erx, ery = [float(v) for v in eye.split(",")]
e = np.sqrt(((xx - ex) / erx) ** 2 + ((yy - ey) / ery) ** 2)
m = np.clip((1 - e) * min(erx, ery) / 6, 0, 1)[..., None]
for sd in seeds.split(","):
    f = f"{outp}_{sd}.webp"
    o = np.array(Image.open(f).convert("RGBA")).astype(np.float32)
    o = o * (1 - m) + b * m
    Image.fromarray(o.round().astype(np.uint8), "RGBA").save(f, "WEBP", quality=92, alpha_quality=100, method=6)
