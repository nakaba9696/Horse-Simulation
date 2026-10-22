// 名鑑の無い海外の馬の「主な勝鞍」の一覧（docs/review/main_wins.csv）を、元データ（data/main_wins_world.js と史実馬のデータ）から作り直す
// 使い方：node tools/build_main_wins_csv.js          （書き出す）
//         node tools/build_main_wins_csv.js --check  （書き出さずに、いまの CSV と同じかだけ確かめる。違えば終了コード 1）
// 列：名前・英語名・生年・国・性・G1の勝ち数・主な勝鞍（日本語）・主な勝鞍（英語）・出典
//  - 名前・英語名・生年・国・性は、ゲームに読み込んだ史実馬（tests/load.js。datafix のあと）から。同じ名前が2頭いれば先の1頭
//  - G1の勝ち数・勝鞍・出典は D.mainWinsWorld から。日本語は「・」、英語は「 / 」でつなぐ
//  - 並びは生年・名前（文字コード順）
//  - UTF-8（BOM つき）・改行は CRLF（表計算ソフトで開くため）
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs/review/main_wins.csv');
const HEAD = ['名前', '英語名', '生年', '国', '性', 'G1の勝ち数', '主な勝鞍（日本語）', '主な勝鞍（英語）', '出典'];
const { parseCsv } = require('./build_placings_csv.js');

const s = v => (v == null ? '' : String(v));
function cell(v) { v = s(v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

function rows(HS) {
  const D = HS.DATA;
  const by = new Map();
  for (const h of D.historic) if (!by.has(h.name)) by.set(h.name, h);
  const M = D.mainWinsWorld || {};
  const names = Object.keys(M);
  const born = n => (by.get(n) || {}).born || 9999;
  names.sort((a, b) => born(a) - born(b) || (a < b ? -1 : a > b ? 1 : 0));
  return names.map(n => {
    const h = by.get(n) || {}, w = M[n];
    return [n, s(h.nameEn), s(h.born), s(h.country), s(h.sex), w.g1, w.ja.join('・'), w.en.join(' / '), w.src];
  });
}
function build(HS) {
  return '﻿' + [HEAD, ...rows(HS)].map(r => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
module.exports = { build, rows, parseCsv, HEAD, OUT };

if (require.main === module) {
  const HS = require(path.join(ROOT, 'tests/load.js')).load();
  const text = build(HS);
  if (process.argv.includes('--check')) {
    const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (now !== text) { console.error('docs/review/main_wins.csv が元データと違う。node tools/build_main_wins_csv.js で作り直す'); process.exit(1); }
    console.log('main_wins.csv：元データと同じ（' + (text.split('\r\n').length - 2) + '行）');
  } else {
    fs.writeFileSync(OUT, text);
    console.log('docs/review/main_wins.csv を書き出した（' + (text.split('\r\n').length - 2) + '行）');
  }
}
