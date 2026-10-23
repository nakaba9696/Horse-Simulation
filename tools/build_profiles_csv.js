// 名馬の名鑑の一覧（docs/review/profiles.csv）を、名鑑のデータ（data/profiles*.js）から作り直す
// 使い方：node tools/build_profiles_csv.js          （書き出す）
//         node tools/build_profiles_csv.js --check  （書き出さずに、いまの CSV と同じかだけ確かめる。違えば終了コード 1）
// 列：名前・年代・戦績・主な勝鞍・解説
//  - 読み込む前の名鑑のデータそのまま（datafix・騎手の名前を架空にする前）。並びはファイルの順（index.html と同じ）・ファイルの中の順
//  - 主な勝鞍は「・」でつなぐ
//  - UTF-8（BOM つき）・改行は LF
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs/review/profiles.csv');
const FILES = ['profiles', 'profiles_old', 'profiles_1', 'profiles_2', 'profiles_world', 'profiles_world2'];
const HEAD = ['名前', '年代', '戦績', '主な勝鞍', '解説'];

function cell(v) { v = v == null ? '' : String(v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

function build() {
  const save = globalThis.HS;
  globalThis.HS = { DATA: {} };
  try {
    for (const f of FILES) new Function(fs.readFileSync(path.join(ROOT, 'data', f + '.js'), 'utf8'))();
    const list = globalThis.HS.DATA.profiles || [];
    const lines = [HEAD.join(',')].concat(list.map(p => [p.name, p.years, p.record, (p.mainWins || []).join('・'), p.text].map(cell).join(',')));
    return '﻿' + lines.join('\n') + '\n';
  } finally { globalThis.HS = save; }
}

const text = build();
if (process.argv.includes('--check')) {
  const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (now !== text) { console.error('docs/review/profiles.csv が名鑑と違う（node tools/build_profiles_csv.js で作り直す）'); process.exit(1); }
  console.log('docs/review/profiles.csv は名鑑と同じ');
} else {
  fs.writeFileSync(OUT, text);
  console.log('docs/review/profiles.csv を書いた（' + (text.split('\n').length - 2) + '頭）');
}
