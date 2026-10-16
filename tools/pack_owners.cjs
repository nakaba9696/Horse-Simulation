// 馬主の顔の絵を base64 にして assets/owners_<馬主の id>.js に書き出す。file:// でも <script> で読めるように
// 絵は持ち主が別のゲームのために作ったもの（nakaba9696/trpg-game の assets/portraits/。Stable Diffusion。持ち主の決定 2026-10-16）
// 使い方：node tools/pack_owners.cjs <trpg-game の assets/portraits のフォルダ>
// 書き出したファイルは HS.ASSETS['owner_<id>_<表情>'] に 'data:image/webp;base64,...' を載せる。表情は base（ふだん）・smile（ほほえみ）・joy（喜び）・sad（残念）
const fs = require('fs');
const path = require('path');

// 馬主 → 絵の id。表情は、その絵の差分のうち上から順に有るものを使い、無ければ基本の絵
const PICK = {
  takenouchi: 'gensai',
  saginomiya: 'farina',
  makino: 'tiria',
  kirishima: 'constance',
  sengoku: 'dil',
  hanabusa: 'shione',
  takarada: 'dorothea',
};
const MOODS = { base: [''], smile: ['_faint_smile', '_joy'], joy: ['_fun', '_sparkle', '_joy'], sad: ['_sorrow', '_troubled'] };
const MAX = 80 * 1024;

function main() {
  const src = process.argv[2];
  if (!src) { console.error('使い方：node tools/pack_owners.cjs <portraits のフォルダ>'); process.exit(1); }
  const out = path.join(__dirname, '..', 'assets');
  for (const [oid, pid] of Object.entries(PICK)) {
    const parts = [], used = [];
    for (const [mood, sufs] of Object.entries(MOODS)) {
      let file = null;
      for (const s of sufs) { const f = path.join(src, pid + s + '.webp'); if (fs.existsSync(f)) { file = f; break; } }
      if (!file) file = path.join(src, pid + '.webp');
      const buf = fs.readFileSync(file);
      if (buf.length > MAX) throw new Error(`${file} が ${MAX} バイトを超える`);
      parts.push(`owner_${oid}_${mood}: 'data:image/webp;base64,${buf.toString('base64')}'`);
      used.push(`${mood}=${path.basename(file)}`);
    }
    const js = `// 馬主「${oid}」の顔（${used.join('・')}）。持ち主が作った絵（nakaba9696/trpg-game の assets/portraits/）。出典は assets/CREDITS.md。tools/pack_owners.cjs が書き出した。手で直さない\n` +
      `(globalThis.HS = globalThis.HS || {}).ASSETS = Object.assign(globalThis.HS.ASSETS || {}, { ${parts.join(', ')} });\n`;
    fs.writeFileSync(path.join(out, `owners_${oid}.js`), js);
    console.log(`owners_${oid}.js ${(js.length / 1024).toFixed(0)}KB  ${used.join(' ')}`);
  }
}
main();
