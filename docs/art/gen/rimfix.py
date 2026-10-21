# 抜いたあとの仕上げ：外から rim px 以内の緑かぶりを消す（G を max(R,B) まで下げる）。箱の中の、白く色みの無い囲まれた地を抜く
# 使い方：python rimfix.py in.webp out.webp [rim=5] [x0,y0,x1,y1;...]
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
a = np.array(Image.open(sys.argv[1]).convert("RGBA")).astype(np.float32)
rim = float(sys.argv[3]) if len(sys.argv) > 3 else 5
out = a[..., 3] < 128
near = ndimage.distance_transform_edt(~out) <= rim
mx = np.maximum(a[..., 0], a[..., 2])
a[..., 1] = np.where(near & (a[..., 1] > mx), mx, a[..., 1])
if len(sys.argv) > 4:
    c = a[..., :3]
    hb = np.zeros(out.shape, bool)
    for b in sys.argv[4].split(";"):
        x0, y0, x1, y1 = [int(v) for v in b.split(",")]; hb[y0:y1, x0:x1] = True
    w = (c.min(-1) >= 232) & (c.max(-1) - c.min(-1) < 14) & (a[..., 3] > 0) & hb
    lab, n = ndimage.label(w); sz = ndimage.sum(w, lab, range(1, n + 1))
    rm = np.isin(lab, [j + 1 for j in range(n) if sz[j] >= 20])
    e = ndimage.binary_dilation(rm, iterations=1) & ~rm & hb & (c.min(-1) > 200)
    a[rm, 3] = 0; a[e, 3] *= 0.5
    print("white removed", int(rm.sum()))
a[a[..., 3] < 3] = 0
Image.fromarray(a.round().clip(0, 255).astype(np.uint8), "RGBA").save(sys.argv[2], "WEBP", quality=92, alpha_quality=100, method=6)
