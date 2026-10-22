# 箱の中の、細く浮いた線（髪のほつれ・白いふち）を消す
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
x0, y0, x1, y1 = [int(v) for v in sys.argv[1].split(",")]
for f in sys.argv[2:]:
    a = np.array(Image.open(f).convert("RGBA"))
    al = a[..., 3] > 40
    core = ndimage.binary_dilation(ndimage.binary_opening(al, structure=np.ones((7, 7))), iterations=1)
    box = np.zeros(al.shape, bool); box[y0:y1, x0:x1] = True
    rm = al & ~core & box
    a[rm, 3] = 0; a[rm, :3] = 0
    Image.fromarray(a, "RGBA").save(f, "WEBP", quality=92, alpha_quality=100, method=6)
    print(f, int(rm.sum()))
