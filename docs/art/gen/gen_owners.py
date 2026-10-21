# オーナー 7 人のキャラデザの候補：trpg-game の style.json（男は style_male.json）と同じ前置き・ネガティブ・設定で、胸から上・1024×1024
# 使い方：python gen_owners.py <id[,id...]> <seed,seed,...> [出す所]
import base64, io, json, os, sys, urllib.request
from PIL import Image
TRPG = "H:/game/trpg-game2/docs/art/"
SF = json.load(open(TRPG + "style.json", encoding="utf-8"))
SM = json.load(open(TRPG + "style_male.json", encoding="utf-8"))
POST = "solo, upper body, portrait, looking at viewer, facing viewer, simple background, white background, character focus, fully clothed"
P = {
 "hinata": ("f", "1girl, adult, young woman, 26 years old, fair skin, chestnut hair, long hair, (single braid over shoulder:1.3), (wheat ear hair ornament:1.3), hazel eyes, gentle eyes, (green apron:1.3), white collared dress, farm work clothes, holding a wicker basket, yellow ribbon, kind smile, closed eyes smile",
            ", (child:1.5), (loli:1.5), (animal ears:1.5)"),
 "sengoku": ("m", "(mature male:1.3), (adult man:1.3), 30 years old, tall, handsome, defined jaw, tan skin, black hair, short hair, messy spiky hair, sharp eyes, amber eyes, white shirt, (rolled-up sleeves:1.3), open collar, no necktie, (brown vest:1.3), holding a smartphone, (gold stopwatch:1.2), hand in pocket, sky blue wristband, confident smirk",
             ", (child:1.6), (boy:1.4), (shota:1.6), (young:1.3), (glasses:1.3), (beard:1.3)"),
 "yuni": ("f", "1girl, adult, young woman, 21 years old, fair skin, (light ash brown hair:1.3), (beige hair:1.1), (inward curled bob:1.3), chin-length hair, blunt bangs, green eyes, round eyes, (maid:1.3), dark navy long dress, (white apron:1.2), white frilled headdress, (long skirt:1.2), holding a navy notebook and a pen to chest, gentle smile",
          ", (child:1.5), (loli:1.5), (short skirt:1.5), (thighhighs:1.3), (cleavage:1.5), (animal ears:1.5)"),
 "takenouchi": ("m", "elderly man, old man, 68 years old, deep wrinkles, (grey hair tied in a small topknot:1.3), stubble, (squinting:1.3), (closed eyes:1.3), dark navy kimono, (black haori with white family crest:1.3), holding a folding fan, (pocket watch chain:1.1), dark green obi, gentle smile",
                ", (child:1.5), (young:1.4), (open eyes:1.2), (glasses:1.3)"),
 "marie": ("f", "1girl, mature female, adult, 33 years old, fair skin, black hair, (elegant updo:1.3), purple eyes, sharp eyes, (red lipstick:1.2), (crimson high-collared dress:1.3), gold buttons, (small hat with a feather:1.1), gold earrings, (purple gemstone brooch:1.3), holding a folding fan, hand on hip, confident smile",
           ", (child:1.5), (loli:1.5), (cleavage:1.5), (large breasts:1.4)"),
 "lucy": ("f", "1girl, (child:1.3), (12 years old:1.3), young girl, cheerful, blonde hair, (high ponytail:1.3), blue eyes, big eyes, (plaid shirt:1.2), (denim overalls:1.3), (kids cowboy hat:1.3), holding red ribbon reins, grin, showing teeth, freckles",
          ", (mature female:1.5), (adult:1.4), (makeup:1.4), (lipstick:1.4)"),
 "ilona": ("f", "1girl, adult, young woman, 25 years old, fair skin, (auburn hair:1.3), reddish chestnut hair, (very long wavy hair:1.3), (flower wreath on head:1.3), white pink and yellow flowers, deep green eyes, soft eyes, (black hooded traveling cloak:1.3), open cloak, (cream stand-up collar blouse:1.2), thin gold necklace, holding an old envelope, crimson and pale pink accents, mysterious, gentle smile",
           ", (child:1.5), (loli:1.5), (cleavage:1.5), (hood up:1.3)"),
}
P2 = {
 # 2026-10-21 持ち主の選び（1 回目）を受けて作り直す。男も style.json だけで作る（g = "f2"＝女の設定、1boy を明記）
 "hinata": ("f", "1girl, adult, mature female, 26 years old, (large breasts:1.3), curvy, fair skin, (chestnut brown hair:1.4), (brown hair:1.3), long hair, (single braid over shoulder:1.3), (wheat ear hair ornament:1.3), hazel eyes, gentle eyes, (green apron:1.3), white collared long-sleeved dress, buttoned up, modest farm work clothes, holding a wicker basket, yellow ribbon, warm big-sister smile, countryside",
            ", (child:1.5), (loli:1.5), (animal ears:1.5), (cleavage:1.6), (bare shoulders:1.4), (open clothes:1.4), (unbuttoned:1.4), (revealing clothes:1.5), (black hair:1.5), (dark hair:1.4), (animal ears:1.6), (horse ears:1.6), (cow ears:1.6), (wheat field:1.5), outdoors, landscape"),
 "sengoku": ("f2", "1boy, male focus, (mature male:1.4), (adult man:1.3), 30 years old, (sharp jawline:1.3), adam's apple, short sideburns, handsome, slim, tall, black hair, short messy hair, sharp eyes, amber eyes, (smug:1.2), (businessman:1.2), white shirt, rolled-up sleeves, open collar, no necktie, (dark grey vest:1.3), holding a smartphone, sky blue accents, (confident smirk:1.3), slightly arrogant",
             ", (child:1.6), (shota:1.6), (1girl:1.5), (female:1.4), (breasts:1.4), (glasses:1.3), (beard:1.3), (muscular:1.3), (androgynous:1.5), (feminine:1.4), (boy:1.4), (young:1.3), (long eyelashes:1.3)"),
 "takenouchi": ("f2", "1boy, male focus, (old man:1.4), (elderly:1.3), 68 years old, (wrinkles:1.3), grey hair, neatly combed back hair, (grey mustache:1.2), (narrowed eyes:1.2), gentle eyes, dignified old gentleman, (dark green three-piece suit:1.3), white shirt, dark tie, (pocket watch chain:1.2), holding a walking cane, quiet, calm determined smile",
                ", (child:1.6), (young:1.4), (1girl:1.5), (female:1.4), (breasts:1.4), (kimono:1.3), (glasses:1.2)"),
 "marie": ("f", "1girl, (mature female:1.6), (beautiful older woman:1.4), 33 years old, (mature face:1.4), (eyeshadow:1.2), (mole under eye:1.1), tall, (long face:1.1), (cheerful:1.3), energetic, glamorous, fair skin, (wavy golden blonde hair:1.2), medium hair, purple eyes, (sunglasses on head:1.3), (red lipstick:1.3), (white jacket over purple blouse:1.3), (gold necklace:1.2), gold bracelets, (amethyst ring:1.2), driving gloves, scarf, big laugh, wink",
           ", (child:1.5), (loli:1.5), (cleavage:1.5), (large breasts:1.4), car, vehicle, (young:1.4), (teenage:1.4), (petite:1.3)"),
 "ilona_a": ("f", "1girl, adult, young woman, 25 years old, (chestnut hair:1.3), long straight hair, (flower wreath on head:1.3), white pink and yellow flowers, amber eyes, (hungarian folk embroidery dress:1.3), red and green embroidery, white puffy sleeves, red vest, (horseshoe pendant:1.2), gentle smile",
             ", (child:1.5), (loli:1.5), (cleavage:1.5)"),
 "ilona_b": ("f", "1girl, adult, young woman, 25 years old, (reddish chestnut hair:1.5), (long ponytail:1.3), (flower wreath on head:1.3), white pink and yellow flowers, brown eyes, (equestrian outfit:1.3), (plain brown tailcoat riding jacket:1.4), (no logo:1.3), white cravat, white breeches, riding gloves, holding a riding crop, proud smile",
             ", (child:1.5), (loli:1.5), (cleavage:1.5), (animal ears:1.7), (horse ears:1.7), (tail:1.6), (horse tail:1.6), (cap:1.4), (helmet:1.4), track jacket, (jockey silks:1.4), (logo:1.5), (text:1.6), pink, (green hair:1.6), (black hair:1.4)"),
 "ilona_c": ("f", "1girl, adult, young woman, 25 years old, (reddish chestnut hair:1.3), very long wavy hair, (flower wreath on head:1.3), white pink and yellow flowers, deep green eyes, (19th century victorian dress:1.3), dark crimson dress, high collar, lace, (cameo brooch with a horse:1.2), (gold laurel ornament:1.1), elegant, mysterious gentle smile",
             ", (child:1.5), (loli:1.5), (cleavage:1.5)"),
}
P.update(P2)
who_list, seeds = sys.argv[1].split(","), [int(s) for s in sys.argv[2].split(",")]
out = sys.argv[3] if len(sys.argv) > 3 else "."
os.makedirs(out, exist_ok=True)
for who in who_list:
    g, body, negx = P[who]
    S = SM if g == "m" else SF
    neg = S["negative"] + negx + ", (text:1.5), (japanese text:1.5), (calligraphy:1.4), (sign:1.3), (multiple people:1.5), (2girls:1.4), (bubble tea:1.5), (drink:1.3), building, scenery"
    if who == "hinata" or g == "f2": neg = neg.replace(", breasts,", ",")
    if who == "lucy": neg = neg.replace("child,", "").replace("loli,", "")
    pos = ", ".join([S["prefix"], body, POST])
    for sd in seeds:
        b = {"prompt": pos, "negative_prompt": neg, "seed": sd, "steps": S.get("steps", 20), "cfg_scale": S.get("cfg_scale", 5.5),
             "sampler_name": S.get("sampler_name", "Euler a"), "scheduler": S.get("scheduler", "Automatic"), "width": 1024, "height": 1024,
             "override_settings": SF["override_settings"], "override_settings_restore_afterwards": True}
        r = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:7860/sdapi/v1/txt2img", json.dumps(b).encode(), {"Content-Type": "application/json"}), timeout=1200).read())
        Image.open(io.BytesIO(base64.b64decode(r["images"][0]))).convert("RGB").save(os.path.join(out, f"{who}_{sd}.png"))
        json.dump(b, open(os.path.join(out, f"{who}_{sd}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(who, sd, flush=True)
