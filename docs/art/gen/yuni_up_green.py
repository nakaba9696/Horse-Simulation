# ユニ（緑の地で描き直し、色の差で抜く版）：trpg-game の kind_host_f（512×640・透過）の胸から上を切り出し、白い地で 1024 四方に広げて img2img で描き直す（顔立ち・服はそのまま）
import base64, io, json, sys, urllib.request
from PIL import Image
rec = json.load(open("H:/game/trpg-gen/docs/art/gen/kind_host_f.json", encoding="utf-8"))
b = Image.open("yuni/kind_host_f_fixed.webp").convert("RGBA")
x0, y0, s = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
c = b.crop((x0, y0, x0 + s, y0 + s)); w = Image.new("RGBA", c.size, (0, 200, 0, 255)); w.alpha_composite(c)
w = w.convert("RGB").resize((1024, 1024), Image.LANCZOS); w.save("yuni/init.png")
enc = lambda im: (lambda bio: (im.save(bio, "PNG"), base64.b64encode(bio.getvalue()).decode())[1])(io.BytesIO())
pos = rec["prompt"].replace("cowboy shot", "upper body, portrait").replace("standing,", "").replace("white background", "(green background:1.3), (chroma key:1.1)")
for sd in [int(v) for v in sys.argv[5].split(",")]:
    body = {"prompt": pos, "negative_prompt": rec["negative_prompt"] + ", white background, white outline, white border, (green hair:1.4), green clothes, glow", "seed": sd, "steps": 24, "cfg_scale": 5.5, "sampler_name": "Euler a", "scheduler": "Automatic",
            "width": 1024, "height": 1024, "init_images": [enc(w)], "denoising_strength": float(sys.argv[4]), "resize_mode": 0,
            "override_settings": {"sd_model_checkpoint": "waiIllustriousSDXL_v140.safetensors [bdb59bac77]"}, "override_settings_restore_afterwards": True}
    r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/img2img", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=1200).read())
    Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").save(f"yuni/yuni_{sd}.png")
    body.pop("init_images"); body["init_image"] = f"kind_host_f.webp の ({x0},{y0}) から {s} 四方を 1024 に広げた物（緑の地）"
    json.dump(body, open(f"yuni/yuni_{sd}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(sd, flush=True)
