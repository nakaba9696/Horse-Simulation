# ひなた（3 回目）と竹之内（作り直し）の候補：style.json だけ・胸から上・1024 四方・緑の地
import base64, io, json, sys, urllib.request
from PIL import Image
S = json.load(open("H:/game/trpg-game2/docs/art/style.json", encoding="utf-8"))
POST = ", solo, upper body, portrait, (head size about one third of image width:1.2), looking at viewer, simple background, (green background:1.3), (chroma key:1.1), character focus"
HN = ", (child:1.6), (loli:1.6), (makeup:1.4), (cleavage:1.6), (revealing clothes:1.6), (old:1.4), (blush:1.3), (tan:1.5), (dark skin:1.5), (animal ears:1.7), (green hair:1.6), white background, (multiple girls:1.6), text, scenery"
H = [
 ("1", "1girl, (young woman:1.3), (tall and slender:1.3), (long face:1.2), (calm narrow eyes:1.3), (long black straight hair tied loosely at the nape:1.3), (yellow hair tie:1.2), (green quilted vest over white thermal shirt:1.4), (yellow work gloves:1.2), holding hay with a pitchfork over shoulder, gentle closed-mouth smile"),
 ("2", "1girl, (adult woman:1.5), 22 years old, (round cheeks:1.2), (big sparkling eyes:1.2), (large breasts:1.1), (short fluffy chestnut hair with ahoge:1.4), (oversized yellow raincoat:1.4), (green rubber boots:1.1), holding a basket of potatoes, wide open-mouth laugh"),
 ("3", "1girl, (young woman:1.3), (sturdy build:1.3), (strong shoulders:1.2), (sharp determined eyes:1.3), (dark brown hair in two short pigtails:1.4), (green coveralls with sleeves tied around waist:1.4), (yellow tank top:1.2), (dirt smudge on cheek:1.1), carrying a hay bale, confident grin"),
 ("4", "1girl, (young woman:1.3), (soft droopy eyes:1.4), (sleepy gentle face:1.3), (long wavy light brown hair in a loose side braid:1.3), (knitted yellow hat with pompom:1.4), (green duffle coat:1.4), (white scarf:1.2), holding a steaming mug of milk, shy small smile"),
 ("5", "1girl, (young woman:1.3), (freckles:1.4), (wide nose:1.1), (bright cheerful eyes:1.3), (orange-brown hair in a messy bun with a pencil stuck in it:1.4), (green apron dress:1.4), (yellow rolled-up sleeves blouse:1.3), holding a clipboard and a calf's milk bottle, big toothy smile"),
 ("6", "1girl, (young woman:1.3), (tomboyish:1.3), (short cropped black hair:1.4), (thick eyebrows:1.3), (green baseball cap worn backwards:1.4), (yellow hoodie under green work jacket:1.3), (towel around neck:1.2), holding a horse's lead rope, friendly lopsided smile"),
]
TN = ", (child:1.6), (young:1.4), (1girl:1.5), (female:1.4), (breasts:1.4), (red nose:1.6), (blush:1.4), (suit:1.5), (necktie:1.5), (sunglasses:1.4), (big head:1.5), (close-up:1.5), white background, text, scenery"
T = [
 ("1", "1boy, (old man:1.4), 68 years old, (slim:1.3), (white hair tied in a small topknot:1.4), (short white beard:1.2), (narrow smiling eyes:1.3), (dark green kimono:1.4), (white haori:1.3), holding a closed folding fan, gentle but sly smile"),
 ("2", "1boy, (old man:1.4), 68 years old, (bald head:1.4), (thick white eyebrows:1.3), (sharp eyes:1.3), (black kimono:1.3), (dark green haori with white family crest:1.4), (open folding fan:1.3), (prayer beads on wrist:1.1), knowing smirk"),
 ("3", "1boy, (old man:1.4), 68 years old, (grey hair slicked back:1.3), (scar across cheek:1.3), (eyes half-closed:1.2), (navy kimono:1.3), (white haori draped over shoulders:1.4), (smoking pipe kiseru:1.3), calm intimidating smile"),
 ("4", "1boy, (old man:1.4), 68 years old, (long white hair tied low:1.3), (long white mustache:1.3), (round glasses:1.3), (dark green yukata:1.3), (white obi:1.2), holding a teacup, warm grandfatherly smile"),
 ("5", "1boy, (old man:1.4), 68 years old, (short grey crew cut:1.3), (stubble:1.2), (strong jaw:1.3), (dark grey kimono:1.3), (green hakama:1.3), (folding fan tucked in belt:1.2), arms crossed, stern but amused look"),
 ("6", "1boy, (old man:1.4), 68 years old, (white hair with sideburns:1.3), (monocle:1.2), (deep green kimono with white pattern:1.4), (black haori:1.2), holding a sake cup, (fox-like smile:1.3), squinting eyes"),
]
who = sys.argv[1]; seeds = [int(s) for s in sys.argv[2].split(",")]
L, NG, pre = (H, HN, "hinata") if who == "h" else (T, TN, "take")
neg = S["negative"].replace(" breasts,", "") + NG
for k, body in L:
    if len(sys.argv) > 3 and k not in sys.argv[3]: continue
    for sd in seeds:
        b = {"prompt": S["prefix"] + ", " + body + POST, "negative_prompt": neg, "seed": sd, "steps": 24, "cfg_scale": 5.5, "sampler_name": "Euler a", "scheduler": "Automatic",
             "width": 1024, "height": 1024, "override_settings": S["override_settings"], "override_settings_restore_afterwards": True}
        r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/txt2img", json.dumps(b).encode(), {"Content-Type": "application/json"}), timeout=1200).read())
        Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").save(f"r19/{pre}{k}_{sd}.png")
        json.dump(b, open(f"r19/{pre}{k}_{sd}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(pre, k, sd, flush=True)
