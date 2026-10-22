# 箱の中の、透明に接する白く色みの無い縁を n 回はがす（線や髪の暗い所で止まる）。囲まれた白い塊（>=8px）も消す
# 使い方：python peelw.py x0,y0,x1,y1 n file...
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
x0, y0, x1, y1 = [int(v) for v in sys.argv[1].split(",")]; n = int(sys.argv[2])
for f in sys.argv[3:]:
    a = np.array(Image.open(f).convert("RGBA")); c = a[..., :3].astype(int)
    box = np.zeros(a.shape[:2], bool); box[y0:y1, x0:x1] = True
    wh = (c.min(-1) > int(__import__("os").environ.get("WT", 190))) & (c.max(-1) - c.min(-1) < 20) & box
    tot = 0
    for _ in range(n):
        tr = a[..., 3] < 128
        fr = ndimage.binary_dilation(tr, iterations=1) & ~tr & wh
        a[fr, 3] = 0; tot += int(fr.sum())
    a[a[..., 3] == 0, :3] = 0
    Image.fromarray(a, "RGBA").save(f, "WEBP", quality=92, alpha_quality=100, method=6)
    print(f, tot)
