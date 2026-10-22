# 抜いた絵を緑の地に置いて img2img（低い強さ）で描き直し、緑の差で抜き直す（白い服・白っぽい髪の縁を作り直す）
# 使い方：python greenify.py <抜いた.webp> <値.json> <出す頭> den seed
import base64, io, json, sys, subprocess, urllib.request
from PIL import Image
cutf, recf, outp, den, seed = sys.argv[1:6]
rec = json.load(open(recf, encoding="utf-8"))
c = Image.open(cutf).convert("RGBA"); g = Image.new("RGBA", c.size, (0, 200, 0, 255)); g.alpha_composite(c); g = g.convert("RGB")
enc = lambda im: (lambda bio: (im.save(bio, "PNG"), base64.b64encode(bio.getvalue()).decode())[1])(io.BytesIO())
pos = rec["prompt"].replace("white background", "(green background:1.3), (chroma key:1.1)")
neg = rec["negative_prompt"] + ", white background, white outline, white border, (green hair:1.4), green clothes, glow, shadow"
body = {"prompt": pos, "negative_prompt": neg, "seed": int(seed), "steps": 24, "cfg_scale": 5.5, "sampler_name": "Euler a", "scheduler": "Automatic",
        "width": c.width, "height": c.height, "init_images": [enc(g)], "denoising_strength": float(den), "resize_mode": 0,
        "override_settings": {"sd_model_checkpoint": "waiIllustriousSDXL_v140.safetensors [bdb59bac77]"}, "override_settings_restore_afterwards": True}
r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=1200).read())
Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").save(outp + ".png")
body.pop("init_images"); body["init_image"] = cutf + "（緑の地）"
json.dump(body, open(outp + ".json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
subprocess.run([sys.executable, "gkey.py", outp + ".png", outp + ".webp"], check=True)
subprocess.run([sys.executable, "rimfix.py", outp + ".webp", outp + ".webp", "40"], check=True)
