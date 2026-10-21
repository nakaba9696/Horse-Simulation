# 表情の差分：生成した元の絵（不透明）の顔の楕円だけを inpaint で描き直し、顔だけを透過した基本の絵に重ねる（色は基本に合わせる）
# 髪の外形・透明・服・持ち物は基本のまま
# 使い方：python face4.py <元の絵.png> <基本.webp> <生成の値.json> <出す所の頭> cx,cy,rx,ry "<表情のタグ>" den seed[,seed] ["<外すタグ,...>"] ["<ネガティブに足す>"]
import base64, io, json, sys, urllib.request
import numpy as np
from PIL import Image
src, basef, recf, outp, ell, expr, den, seeds = sys.argv[1:9]
drop = [w.strip() for w in sys.argv[9].split(",")] if len(sys.argv) > 9 and sys.argv[9] else []
negx = sys.argv[10] if len(sys.argv) > 10 else ""
cx, cy, rx, ry = [float(v) for v in ell.split(",")]
rec = json.load(open(recf, encoding="utf-8"))
pos = rec["prompt"]
for w in drop: pos = pos.replace(w + ", ", "").replace(", " + w, "")
pos += ", " + expr
neg = rec["negative_prompt"] + (", " + negx if negx else "")
s = Image.open(src).convert("RGB"); W, H = s.size
b = np.array(Image.open(basef).convert("RGBA")).astype(np.float32)
yy, xx = np.mgrid[:H, :W]; e = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
mask = Image.fromarray(((e < 1) * 255).astype(np.uint8))
enc = lambda im: (lambda bio: (im.save(bio, "PNG"), base64.b64encode(bio.getvalue()).decode())[1])(io.BytesIO())
m = (np.clip((1 - e) * min(rx, ry) / 10, 0, 1) * (b[..., 3] > 250))[..., None]
ring = (e > 0.8) & (e < 1.0) & (b[..., 3] > 250)
for sd in [int(v) for v in seeds.split(",")]:
    body = {"prompt": pos, "negative_prompt": neg, "seed": sd, "steps": 24, "cfg_scale": 5.5, "sampler_name": "Euler a", "scheduler": "Automatic",
            "width": W, "height": H, "init_images": [enc(s)], "mask": enc(mask), "denoising_strength": float(den), "inpainting_fill": 1,
            "inpaint_full_res": True, "inpaint_full_res_padding": 96, "mask_blur": 8, "resize_mode": 0,
            "override_settings": {"sd_model_checkpoint": "waiIllustriousSDXL_v140.safetensors [bdb59bac77]"}, "override_settings_restore_afterwards": True}
    r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=1200).read())
    g = np.array(Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").resize((W, H), Image.LANCZOS)).astype(np.float32)
    d = g[ring] - b[ring, :3]; d = d[np.abs(d).max(-1) < 40]
    if len(d): g = np.clip(g - np.median(d, 0), 0, 255)
    o = b.copy(); o[..., :3] = b[..., :3] * (1 - m) + g * m
    Image.fromarray(o.round().astype(np.uint8), "RGBA").save(f"{outp}_{sd}.webp", "WEBP", quality=92, alpha_quality=100, method=6)
    body.pop("init_images"); body.pop("mask"); body["init_image"] = src; body["mask_ellipse"] = [cx, cy, rx, ry]
    json.dump(body, open(f"{outp}_{sd}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(outp, sd, flush=True)
