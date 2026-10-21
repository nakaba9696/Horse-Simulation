# 髪の縁の描き直し（白い髪で、透過前の絵が無い人）：基本の絵を緑の地に置いて 2 倍にし、img2img で縁を描き直す。
# 緑との色の差から柔らかい透明度を出し（緑を引いて縁の色を戻す・にじみを抑える）、透明度をかけたまま縮める。
# 使うのは、箱の中の、基本の縁から band px 以内だけ（内側の絵・顔は基本のまま）
# 使い方：python keyedge.py <id> <基本.webp> <出す所の頭> x0,y0,x1,y1[;...] den seed[,seed...] [band=10]
import base64, io, json, sys, urllib.request
import numpy as np
from PIL import Image
from scipy import ndimage
i, basef, outp, boxes, den, seeds = sys.argv[1:7]
band = float(sys.argv[7]) if len(sys.argv) > 7 else 10
K = np.array([0, 200, 0], np.float32)
import os
rec = json.load(open(i if i.endswith(".json") else f"H:/game/trpg-gen/docs/art/gen/{i}.json", encoding="utf-8"))
SC = int(os.environ.get("SCALE", 2))
pos = rec["prompt"].replace("white background", "(green background:1.3), (chroma key:1.1)")
neg = rec["negative_prompt"] + ", white background, white outline, white border, (green hair:1.3), green clothes, glow"
b = Image.open(basef).convert("RGBA"); W, H = b.size
ba = np.array(b).astype(np.float32)
big = b.resize((W * SC, H * SC), Image.LANCZOS)
flat = Image.new("RGBA", big.size, tuple(int(v) for v in K) + (255,)); flat.alpha_composite(big)
enc = lambda im: (lambda bio: (im.save(bio, "PNG"), base64.b64encode(bio.getvalue()).decode())[1])(io.BytesIO())
hb = np.zeros((H, W), bool)
for bx in boxes.split(";"):
    x0, y0, x1, y1 = [int(v) for v in bx.split(",")]; hb[y0:y1, x0:x1] = True
ga2 = np.array(big.getchannel("A")).astype(np.float32) / 255
for sd in [int(s) for s in seeds.split(",")]:
    body = {"prompt": pos, "negative_prompt": neg, "seed": sd, "steps": 24, "cfg_scale": 5.5, "sampler_name": "Euler a", "scheduler": "Automatic",
            "width": W * SC, "height": H * SC, "init_images": [enc(flat.convert("RGB"))], "denoising_strength": float(den), "resize_mode": 0,
            "override_settings": {"sd_model_checkpoint": "waiIllustriousSDXL_v140.safetensors [bdb59bac77]"}, "override_settings_restore_afterwards": True}
    import os
    if os.environ.get("REUSE") and os.path.exists(f"{outp}_{sd}_gen.png"):
        g = np.array(Image.open(f"{outp}_{sd}_gen.png").convert("RGB")).astype(np.float32)
    else:
        r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=7200).read())
        g = np.array(Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB")).astype(np.float32)
        Image.fromarray(g.astype(np.uint8)).save(f"{outp}_{sd}_gen.png")
    # 緑らしさ：緑が赤・青より強い分
    s = np.clip(g[..., 1] - np.maximum(g[..., 0], g[..., 2]), 0, None)
    bgS = float(np.median(s[ndimage.binary_erosion(ga2 < 0.1, iterations=12 * SC)]))
    a = np.clip(1 - (s - 0.15 * bgS) / (0.75 * bgS), 0, 1)
    a[ndimage.binary_erosion(ga2 > 0.9, iterations=6 * SC) & (s < 0.3 * bgS)] = 1           # 体の奥は不透明（緑のすき間は除く）
    a[ndimage.binary_erosion(ga2 < 0.1, iterations=14 * SC)] = 0           # 背景の奥は透明
    lab, n = ndimage.label(a > 0.5)
    if n > 1:
        sz = ndimage.sum(np.ones_like(a), lab, range(1, n + 1)); a[(lab > 0) & (lab != int(np.argmax(sz)) + 1) & (a > 0)] = 0
    am = np.maximum(a, 1e-3)[..., None]
    col = np.clip((g - (1 - a[..., None]) * K) / am, 0, 255)
    sp = np.clip(col[..., 1] - np.maximum(col[..., 0], col[..., 2]), 0, None); col[..., 1] -= sp
    solid = (a > 0.95) & (np.clip(g[..., 1] - np.maximum(g[..., 0], g[..., 2]), 0, None) < 6); _, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
    w = np.clip((a - 0.35) / 0.6, 0, 1)[..., None]
    col = np.where(solid[..., None], col, g[iy, ix] * (1 - w) + col * w)
    near_k = (a < 0.999) | ~solid
    gl = (col[..., 0] + col[..., 2]) / 2; col[..., 1] = np.where(near_k, np.minimum(col[..., 1], gl), col[..., 1])
    pm = np.concatenate([col * a[..., None], a[..., None] * 255], -1)
    ch = [np.array(Image.fromarray(pm[..., k].astype(np.float32), "F").resize((W, H), Image.LANCZOS)) for k in range(4)]
    pm1 = np.stack(ch, -1); al = np.clip(pm1[..., 3], 0, 255)
    rgb = np.where(al[..., None] > 0.5, pm1[..., :3] / np.maximum(al[..., None] / 255, 1e-3), 0)
    new = np.dstack([np.clip(rgb, 0, 255), al])
    # 使う所：箱の中の、基本の縁から band px 以内
    edge = ndimage.distance_transform_edt(ba[..., 3] >= 128) <= band
    edge &= ndimage.distance_transform_edt(ba[..., 3] < 128) <= band
    # 基本で白い地のまま残っていたすき間（白く色みが無い所）で、新しい絵では背景になった所も置き換える
    bw = (ba[..., :3].min(-1) > 232) & (ba[..., :3].max(-1) - ba[..., :3].min(-1) < 16) & (new[..., 3] < 80)
    bw = ndimage.binary_dilation(bw, iterations=2) & (new[..., 3] < 200)
    edge |= bw
    m = ndimage.gaussian_filter((edge & hb).astype(np.float32), 1.5)[..., None]
    o = ba * (1 - m) + new * m
    o[..., 3] = np.where(bw & (o[..., 3] < 150), 0, o[..., 3])   # すき間の薄い残り（緑を引いた灰色）は消す
    o[..., 3] = np.where(o[..., 3] < 3, 0, o[..., 3]); o[o[..., 3] == 0, :3] = 0
    Image.fromarray(o.round().clip(0, 255).astype(np.uint8), "RGBA").save(f"{outp}_{sd}.webp", "WEBP", quality=92, alpha_quality=100, method=6)
    np.save(f"{outp}_{sd}_mask.npy", m[..., 0])
    body.pop("init_images"); body["init_image"] = basef + f"（緑の地・{SC} 倍）"
    json.dump(body, open(f"{outp}_{sd}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(outp, sd, flush=True)
