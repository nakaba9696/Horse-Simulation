// 絵の無い馬主の「絵が無いときの顔」を、Godot 版へ SVG で書き出す（godot/assets/owners/<id>_<表情>.svg。生成物。手で直さない）
// 顔は JS 版と同じ js/ui/ownerface.js（data/owners.js の face）で描く。持ち主の絵（assets/owners_<id>.js）がある人は書き出さない
//   node tools/owner_faces.js          # 書き出す（絵ができた人の SVG は消す）
//   node tools/owner_faces.js --check  # 書き出し済みのものが最新か
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'godot', 'assets', 'owners');
const MOODS = { base: 'normal', smile: 'smile', joy: 'happy', sad: 'sad' };

function build() {
  // ゲームの HS を汚さないよう、別の箱で読む
  const ctx = vm.createContext({});
  for (const f of ['data/owners.js', 'data/gfhost.js', 'js/ui/ownerface.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  const HS = ctx.HS;
  const files = {};
  // 騎乗依頼の馬主と、GF を開いている一族の人（data/gfhost.js）
  for (const o of HS.DATA.owners.concat(HS.DATA.gfHost ? [HS.DATA.gfHost] : [])) {
    if (o.retired || o.portrait) continue;
    for (const [m, mood] of Object.entries(MOODS)) {
      // gradient の id が呼ぶたびに変わらないよう、毎回同じ数から描く
      const svg = HS.OwnerFace.svg(o, mood, 256).replace(/id="of\d+/g, 'id="f').replace(/url\(#of\d+/g, 'url(#f').replace(/ role="img" aria-label="[^"]*"/, '');
      files[`${o.id}_${m}.svg`] = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ') + '\n';
    }
  }
  return files;
}

if (require.main === module) {
  const files = build();
  const stale = fs.readdirSync(OUT).filter(f => f.endsWith('.svg') && !files[f]);
  if (process.argv.includes('--check')) {
    const bad = Object.keys(files).filter(f => !fs.existsSync(path.join(OUT, f)) || fs.readFileSync(path.join(OUT, f), 'utf8') !== files[f]).concat(stale);
    if (bad.length) { console.error('godot/assets/owners の SVG が古い：' + bad.join(' ') + '（node tools/owner_faces.js で作り直す）'); process.exit(1); }
    console.log('godot/assets/owners の SVG は最新');
  } else {
    for (const [f, s] of Object.entries(files)) fs.writeFileSync(path.join(OUT, f), s);
    for (const f of stale) { fs.unlinkSync(path.join(OUT, f)); if (fs.existsSync(path.join(OUT, f + '.import'))) fs.unlinkSync(path.join(OUT, f + '.import')); }
    console.log(`godot/assets/owners：SVG ${Object.keys(files).length} 枚${stale.length ? `・消した ${stale.length} 枚` : ''}`);
  }
}
module.exports = { build };
