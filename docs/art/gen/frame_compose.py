# 引いた構図の仕上げ：描き足した絵の切り抜き（外側）と、縮めた元の透過の絵（内側の keep）を、境目をぼかして重ねる
# 使い方：python frame_compose.py <描き足しの切り抜き.webp> <頭>_frame.json <頭>_keep.npy <出す.png> <元の透過の絵.png>...（元と同じ数だけ出す。出す名は <出す所>/<元の名>）
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage
cutf, framef, keepf, outdir = sys.argv[1:5]
fr = json.load(open(framef)); keep = np.load(keepf); n, ox, oy = fr["n"], fr["ox"], fr["oy"]
outer = np.array(Image.open(cutf).convert("RGBA")).astype(np.float32)
w = np.clip(ndimage.distance_transform_edt(keep) / 10.0, 0, 1)[..., None]   # keep の縁から 10px で内側へ
os.makedirs(outdir, exist_ok=True)
for f in sys.argv[5:]:
    b = Image.open(f).convert("RGBA").resize((n, n), Image.LANCZOS)
    inner = np.zeros((1024, 1024, 4), np.float32); c = Image.new("RGBA", (1024, 1024)); c.paste(b, (ox, oy)); inner = np.array(c).astype(np.float32)
    # 色は前乗せで混ぜる
    pa = outer[..., :3] * outer[..., 3:] / 255; pb = inner[..., :3] * inner[..., 3:] / 255
    al = outer[..., 3:] * (1 - w) + inner[..., 3:] * w
    col = (pa * (1 - w) + pb * w) / np.maximum(al / 255, 1e-3)
    o = np.dstack([np.clip(col, 0, 255), al]); o[o[..., 3] < 3] = 0
    Image.fromarray(o.round().astype(np.uint8)).save(os.path.join(outdir, os.path.basename(f)))
    print(os.path.basename(f))
