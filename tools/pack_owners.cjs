// 馬主の顔の絵を base64 にして assets/owners_<馬主の id>.js に書き出す。file:// でも <script> で読めるように
// 絵は持ち主が別のゲームのために作ったもの（nakaba9696/trpg-game の assets/portraits/。Stable Diffusion。持ち主の決定 2026-10-16）
// 使い方：node tools/pack_owners.cjs <trpg-game の assets/portraits のフォルダ>
// 書き出したファイルは HS.ASSETS['owner_<id>_<表情>'] に 'data:image/webp;base64,...' を載せる。表情は base（ふだん）・smile（ほほえみ）・joy（喜び）・sad（残念）
// Godot 版へは godot/assets/owners/<id>_<表情>.webp に同じ絵を写す（新しい絵は Godot で一度読み込むと .import ができる）
const fs = require('fs');
const path = require('path');

// 馬主 → 絵の id の候補（左から、基本の絵があるものを使う）。表情は、その絵の差分のうち上から順に有るものを使い、無ければ基本の絵
// 2026-10-20：持ち主の決定「TRPGの画像使いまわしじゃなくて新規で生成してほしい」。新しい9人の絵（hs_*。設計は docs/OWNER_DESIGN.md、
// 頼む行は docs/art/owner_portraits.json）を先に探し、まだ無ければ今の流用の絵（trpg-game の同じ名前の絵）のまま。
// 候補が全部無い人（ユニ・米国の人・イロナの新しい絵が来る前）は書き出さず、data/owners.js の face の SVG（js/ui/ownerface.js。Godot は tools/owner_faces.js）
// 新しい絵を入れた人は data/owners.js（イロナは data/gfhost.js）の portrait（顔の中心と札の幅）も書く
const PICK = {
  makino: ['hs_hinata', 'tiria'],
  sengoku: ['hs_sengoku', 'dil'],
  yuni: ['hs_yuni'],
  takarada: ['hs_marie', 'dorothea'],
  takenouchi: ['hs_genzaburo', 'gensai'],
  violaine: ['hs_violaine', 'violaine'],
  dakota: ['hs_lucy'],
  farina: ['hs_farina', 'farina'],
  gfhost: ['hs_ilona'],
};
const MOODS = { base: [''], smile: ['_faint_smile', '_joy'], joy: ['_fun', '_sparkle', '_joy'], sad: ['_sorrow', '_troubled', '_panic'] };
const ONLY = process.argv.slice(3);   // 名前を渡すと、その馬主だけ書き出す
const MAX = 80 * 1024;

function main() {
  const src = process.argv[2];
  if (!src) { console.error('使い方：node tools/pack_owners.cjs <portraits のフォルダ>'); process.exit(1); }
  const out = path.join(__dirname, '..', 'assets');
  const godotOut = path.join(__dirname, '..', 'godot', 'assets', 'owners');
  for (const [oid, ids] of Object.entries(PICK)) {
    if (ONLY.length && !ONLY.includes(oid)) continue;
    const pid = ids.find(id => fs.existsSync(path.join(src, id + '.webp')));
    if (!pid) { console.log(`${oid}：絵が無い（${ids.join('・')}）。書き出さない（今のファイルか SVG の顔のまま）`); continue; }
    const parts = [], used = [];
    for (const [mood, sufs] of Object.entries(MOODS)) {
      let file = null;
      for (const s of sufs) { const f = path.join(src, pid + s + '.webp'); if (fs.existsSync(f)) { file = f; break; } }
      if (!file) file = path.join(src, pid + '.webp');
      const buf = fs.readFileSync(file);
      if (buf.length > MAX) throw new Error(`${file} が ${MAX} バイトを超える`);
      parts.push(`owner_${oid}_${mood}: 'data:image/webp;base64,${buf.toString('base64')}'`);
      fs.writeFileSync(path.join(godotOut, `${oid}_${mood}.webp`), buf);   // Godot 版はそのままの webp（godot/ui/screen.gd の owner_face_path）
      used.push(`${mood}=${path.basename(file)}`);
    }
    const js = `// 馬主「${oid}」の顔（${used.join('・')}）。持ち主が作った絵（nakaba9696/trpg-game の assets/portraits/）。出典は assets/CREDITS.md。tools/pack_owners.cjs が書き出した。手で直さない\n` +
      `(globalThis.HS = globalThis.HS || {}).ASSETS = Object.assign(globalThis.HS.ASSETS || {}, { ${parts.join(', ')} });\n`;
    fs.writeFileSync(path.join(out, `owners_${oid}.js`), js);
    console.log(`owners_${oid}.js ${(js.length / 1024).toFixed(0)}KB  ${used.join(' ')}`);
  }
}
main();
