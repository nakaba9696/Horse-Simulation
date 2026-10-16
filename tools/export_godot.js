// Godot 版のデータを書き出す：JS のデータ（data/*.js）を index.html の並びで読み、fictional.js（騎手の名前を架空に）と
// datafix.js（史実馬をまとめる）を通したあとの HS.DATA を、godot/data/<名前>.json に 1 つずつ書く（生成物。手で直さない）。
//   node tools/export_godot.js          # 書き出す
//   node tools/export_godot.js --check  # 書き出し済みのものが最新か（作り直して同じか）を確かめる。違えば 1 で終わる
// Godot は長い桁の小数を読み違えるので、整数でない数は有効数字 13 桁までに限る（それより長い数があれば止める）。
// manifest.json に、各ファイルの中身の指紋（数はビット、文字は UTF-8 で並べた SHA-256）を入れる。Godot のテストが読んだ値と比べる。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { scriptList, ROOT } = require('../tests/load.js');
const OUT = path.join(ROOT, 'godot', 'data');

function loadData() {
  globalThis.HS = undefined;
  const files = scriptList();
  const end = files.indexOf('js/core/datafix.js');
  for (const f of files.slice(0, end + 1)) vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
  return globalThis.HS.DATA;
}

// 中身の指紋に使う並べ方（Godot の godot/core/hs_data.gd の _canon と同じ）
const b8 = Buffer.alloc(8);
function canon(v, out) {
  if (v === null || v === undefined) out.push('n;');
  else if (typeof v === 'boolean') out.push(v ? 't;' : 'f;');
  else if (typeof v === 'number') { b8.writeDoubleBE(v); out.push('d' + b8.toString('hex') + ';'); }
  else if (typeof v === 'string') out.push('s' + Buffer.byteLength(v, 'utf8') + ':' + v);
  else if (Array.isArray(v)) { out.push('['); for (const x of v) canon(x, out); out.push(']'); }
  else { out.push('{'); for (const k of Object.keys(v)) { if (v[k] === undefined || typeof v[k] === 'function') continue; out.push('k' + Buffer.byteLength(k, 'utf8') + ':' + k); canon(v[k], out); } out.push('}'); }
  return out;
}
const digest = v => crypto.createHash('sha256').update(canon(v, []).join(''), 'utf8').digest('hex');

// 数の桁を確かめる（Godot が正しく読める桁か）
function checkNums(v, where) {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error(`数でない値 ${where}`);
    if (!Number.isInteger(v)) {
      const d = String(v).replace('-', '').replace('.', '').split('e')[0].replace(/^0+/, '').length;
      if (d > 13) throw new Error(`桁の長い小数 ${where} = ${v}（Godot が読み違える。13 桁までにする）`);
    } else if (Math.abs(v) > 2 ** 53) throw new Error(`大きすぎる整数 ${where} = ${v}`);
  } else if (Array.isArray(v)) v.forEach((x, i) => checkNums(x, where + '[' + i + ']'));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) checkNums(v[k], where + '.' + k);
}

// 1 件 1 行の JSON（差分が読みやすいように）
function render(v) {
  if (Array.isArray(v)) return '[\n' + v.map(x => JSON.stringify(x)).join(',\n') + '\n]\n';
  if (v && typeof v === 'object') return '{\n' + Object.keys(v).map(k => JSON.stringify(k) + ': ' + JSON.stringify(v[k])).join(',\n') + '\n}\n';
  return JSON.stringify(v) + '\n';
}

function build() {
  const D = loadData();
  const files = {};
  const manifest = { note: 'tools/export_godot.js が作る。手で直さない', files: {} };
  for (const k of Object.keys(D)) {
    const v = D[k];
    if (typeof v === 'function') continue;
    const clean = JSON.parse(JSON.stringify(v)); // undefined を落とす（JSON と同じ形）
    checkNums(clean, k);
    files[k + '.json'] = render(clean);
    manifest.files[k] = digest(clean);
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 1) + '\n';
  return files;
}

if (require.main === module) {
  const files = build();
  if (process.argv.includes('--check')) {
    const bad = Object.keys(files).filter(f => !fs.existsSync(path.join(OUT, f)) || fs.readFileSync(path.join(OUT, f), 'utf8') !== files[f]);
    if (bad.length) { console.error('godot/data が古い：' + bad.join(' ') + '（node tools/export_godot.js で作り直す）'); process.exit(1); }
    console.log('godot/data は最新（' + Object.keys(files).length + ' ファイル）');
  } else {
    fs.mkdirSync(OUT, { recursive: true });
    let bytes = 0;
    for (const [f, s] of Object.entries(files)) { fs.writeFileSync(path.join(OUT, f), s); bytes += Buffer.byteLength(s); }
    console.log(`godot/data に ${Object.keys(files).length} ファイル（${(bytes / 1e6).toFixed(1)}MB）`);
  }
}
module.exports = { build, canon, digest, loadData };
