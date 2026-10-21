// Godot 版の画面の文（godot/ui・godot/view の日本語の文字列）を集め、英語の表（godot/i18n/text_en.gd）に抜けが無いかを見る（docs/I18N.md）
//   node tools/i18n_keys.js           … 抜けたキーを書き出す（無ければ何も出さず 0 で終わる）
//   node tools/i18n_keys.js --list    … 集めたキーを全部書き出す
//   node tools/i18n_keys.js --json    … { keys: [...], table: {...}, missing: [...], unused: [...] } を書き出す（テストが読む）
// 「# i18n:skip」と書いた行（撮影の見本・記録の鍵など）は数えない
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const JP = /[぀-ヿ一-鿿！-～]/;

// GDScript の文字列（"…"）を取り出して、エスケープを戻す
function strings(line) {
  const out = [];
  let i = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === '#') break;
    if (c === '"') {
      let j = i + 1, s = '';
      while (j < line.length && line[j] !== '"') {
        if (line[j] === '\\' && j + 1 < line.length) {
          const n = line[j + 1];
          s += n === 'n' ? '\n' : n === 't' ? '\t' : n;
          j += 2;
        } else { s += line[j]; j++; }
      }
      out.push(s);
      i = j + 1;
      continue;
    }
    i++;
  }
  return out;
}

function collect() {
  const keys = new Map();   // キー → 最初に出た場所
  for (const dir of ['godot/ui', 'godot/view']) {
    for (const f of fs.readdirSync(path.join(ROOT, dir)).filter(f => f.endsWith('.gd')).sort()) {
      const lines = fs.readFileSync(path.join(ROOT, dir, f), 'utf8').split('\n');
      lines.forEach((ln, k) => {
        if (ln.trim().startsWith('#') || ln.includes('i18n:skip')) return;
        for (const s of strings(ln)) if (JP.test(s) && !keys.has(s)) keys.set(s, `${dir}/${f}:${k + 1}`);
      });
    }
  }
  return keys;
}

// 英語の表（const T := { "日本語": "English", … }）を読む
function table() {
  const src = fs.readFileSync(path.join(ROOT, 'godot/i18n/text_en.gd'), 'utf8');
  const t = {};
  let inT = false;
  for (const ln of src.split('\n')) {
    const st = ln.trim();
    if (st.startsWith('const T :=')) { inT = true; continue; }
    if (inT && st === '}') break;
    if (!inT || !st.startsWith('"')) continue;
    const ss = strings(st.replace(/,\s*$/, ''));
    if (ss.length >= 2) {
      if (Object.prototype.hasOwnProperty.call(t, ss[0])) throw new Error('キーが2つある: ' + ss[0]);
      t[ss[0]] = ss[1];
    }
  }
  return t;
}

if (require.main === module) {
  const keys = collect();
  const t = table();
  const missing = [...keys.keys()].filter(k => !(k in t));
  if (process.argv.includes('--list')) {
    for (const [k, w] of keys) console.log(JSON.stringify(k) + '\t' + w);
  } else if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ keys: [...keys.keys()], table: t, missing }, null, 1));
  } else {
    for (const k of missing) console.log(JSON.stringify(k) + '\t' + keys.get(k));
    process.exit(missing.length ? 1 : 0);
  }
}
module.exports = { collect, table, strings };
