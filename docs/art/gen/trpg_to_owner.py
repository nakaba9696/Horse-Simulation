# trpg-game の立ち絵（512×640・透過）の胸から上を切り出し、緑の地で 1024 四方に広げて img2img で描き直す（顔・髪・服はそのまま）→ 緑の差で抜く
# 使い方：python fv/up.py <id> <立ち絵.webp> x0,y0,size den seed 出す所
import base64, io, json, sys, subprocess, urllib.request
from PIL import Image
who, src, box, den, seed, dst = sys.argv[1:7]
x0, y0, s = [int(v) for v in box.split(",")]
rec = json.load(open(f"H:/game/trpg-gen/docs/art/gen/{who}.json", encoding="utf-8"))
b = Image.open(src).convert("RGBA")
c = b.crop((x0, y0, x0 + s, y0 + s)); w = Image.new("RGBA", c.size, (0, 200, 0, 255)); w.alpha_composite(c)
w = w.convert("RGB").resize((1024, 1024), Image.LANCZOS)
enc = lambda im: (lambda bio: (im.save(bio, "PNG"), base64.b64encode(bio.getvalue()).decode())[1])(io.BytesIO())
pos = rec["prompt"].replace("cowboy shot", "upper body, portrait").replace("standing,", "").replace("white background", "(green background:1.3), (chroma key:1.1)")
neg = rec["negative_prompt"] + ", white background, white outline, white border, (green hair:1.4), green clothes, glow"
body = {"prompt": pos, "negative_prompt": neg, "seed": int(seed), "steps": 24, "cfg_scale": 5.5, "sampler_name": "Euler a", "scheduler": "Automatic",
        "width": 1024, "height": 1024, "init_images": [enc(w)], "denoising_strength": float(den), "resize_mode": 0,
        "override_settings": {"sd_model_checkpoint": "waiIllustriousSDXL_v140.safetensors [bdb59bac77]"}, "override_settings_restore_afterwards": True}
r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=1200).read())
Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").save(dst + ".png")
body.pop("init_images"); body["init_image"] = f"{src} の ({x0},{y0}) から {s} 四方を 1024 に広げた物（緑の地）"
json.dump(body, open(dst + ".json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
subprocess.run([sys.executable, "gkey.py", dst + ".png", dst + ".webp"], check=True)
subprocess.run([sys.executable, "rimfix.py", dst + ".webp", dst + ".webp", "40"], check=True)
