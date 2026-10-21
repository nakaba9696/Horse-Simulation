# ユニの元の絵（kind_host_f）の首の左右に残った白い地を、色みの無い白（顔の肌は赤み・黄みがある）で塗りつぶして探し、透明にする
import numpy as np
from PIL import Image
from scipy import ndimage
a = np.array(Image.open("H:/game/trpg-game2/assets/portraits/kind_host_f.webp").convert("RGBA"))
c = a[..., :3].astype(int)
white = (c.min(-1) >= 240) & (c.max(-1) - c.min(-1) <= 6) & (a[..., 3] > 0)
lab, n = ndimage.label(white)
box = np.zeros(white.shape, bool); box[170:270, 150:340] = True
ids = [j for j in np.unique(lab[box]) if j and (lab == j).sum() >= 15 and ((lab == j) & box).sum() == (lab == j).sum()]
m = np.isin(lab, ids)
m = ndimage.binary_dilation(m, iterations=1) & (c.min(-1) >= 225) & (c.max(-1) - c.min(-1) <= 14)
o = a.copy(); o[m, 3] = 0
Image.fromarray(o, "RGBA").save("yuni/kind_host_f_fixed.webp", "WEBP", lossless=True)
print("removed", int(m.sum()), "regions", len(ids))
