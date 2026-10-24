# ひなた（26 回目）：美人な田舎のお姉さん・焦げ茶の髪・ヤンデレに見えない。style.json だけ・胸の下まで・1024 四方・緑の地
import base64, io, json, sys, urllib.request
from PIL import Image
S = json.load(open("H:/game/trpg-game2/docs/art/style.json", encoding="utf-8"))
POST = ", solo, upper body, (head size about one quarter of image width:1.2), looking at viewer, simple background, (green background:1.3), (chroma key:1.1), character focus"
PRE = "1girl, (beautiful adult woman:1.4), 25 years old, (mature beautiful face:1.3), (bright clear open eyes with highlights:1.3), (brown eyes:1.1), (gentle warm smile:1.3), (large breasts:1.1), countryside big sister, "
HN = (", (child:1.6), (loli:1.6), (cleavage:1.8), (unbuttoned:1.6), (open shirt:1.6), (revealing clothes:1.6), (collar:1.7), (choker:1.7), (necklace:1.5),"
      " (yandere:1.6), (half-closed eyes:1.5), (empty eyes:1.6), (shaded eyes:1.5), (heavy blush:1.4), (head tilt:1.3), (crazy smile:1.6),"
      " (blonde hair:1.6), (light brown hair:1.5), (orange hair:1.4), (red hair:1.4), (blue hair:1.5), (green hair:1.6), (glasses:1.5), (maid:1.6), (animal ears:1.7),"
      " (multiple views:1.8), (reference sheet:1.7), (chibi:1.7), (bird:1.7), (animal:1.6), (multiple girls:1.6), white background, text, scenery, (tan:1.4), (dark skin:1.4), (streaked hair:1.6), (multicolored hair:1.6), (two-tone hair:1.6), (from side:1.3), (shadow on face:1.5), (hat shadow:1.5)")
H = [
 ("1", "(dark brown long hair in a loose low ponytail over shoulder:1.4), (straw hat:1.4), (sunflower on hat:1.1), (green gingham shirt buttoned:1.4), (yellow neckerchief:1.1)"),
 ("2", "(very dark brown hair in a loose side braid over shoulder:1.4), (no hat:1.2), (green gingham shirt buttoned:1.3), (yellow cardigan:1.3)"),
 ("3", "(dark brown long straight hair down:1.4), (straw hat hanging on back:1.3), (white blouse buttoned:1.3), (green overall apron:1.3), (yellow ribbon on hat:1.1)"),
 ("4", "(nearly black dark brown hair in a low loose bun with loose strands:1.4), (yellow bandana headscarf:1.3), (green work jacket over white shirt buttoned:1.3), holding a bucket of milk"),
 ("5", "(dark brown wavy long hair with a yellow hair band:1.4), (green knit sweater:1.4), (white collared shirt under sweater:1.2), (straw hat in hand:1.2)"),
 ("6", "(dark brown hair, long, tied with a green ribbon at the nape:1.4), (green gingham shirt buttoned:1.3), (denim overalls:1.3), (straw hat:1.3), (work gloves in back pocket:0.8), (facing viewer:1.3)"),
]
OUTD = sys.argv[1]; seeds = [int(s) for s in sys.argv[2].split(",")]; only = sys.argv[3].split(",") if len(sys.argv) > 3 else None
neg = S["negative"].replace(" breasts,", "") + HN
for k, body in H:
    if only and k not in only: continue
    for sd in seeds:
        b = {"prompt": S["prefix"] + ", " + PRE + body + POST, "negative_prompt": neg, "seed": sd, "steps": 24, "cfg_scale": 5.5, "sampler_name": "Euler a", "scheduler": "Automatic",
             "width": 1024, "height": 1024, "override_settings": S["override_settings"], "override_settings_restore_afterwards": True}
        r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/txt2img", json.dumps(b).encode(), {"Content-Type": "application/json"}), timeout=1200).read())
        Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").save(f"{OUTD}/h{k}_{sd}.png")
        json.dump(b, open(f"{OUTD}/h{k}_{sd}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(k, sd, flush=True)
