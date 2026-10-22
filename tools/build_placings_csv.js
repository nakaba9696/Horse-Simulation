// G1 の上位着順の一覧（docs/review/placings.csv）を、元データ（data/src/placings_jra.jsonl・placings_world.jsonl）から作り直す
// 使い方：node tools/build_placings_csv.js          （書き出す）
//         node tools/build_placings_csv.js --check  （書き出さずに、いまの CSV と同じかだけ確かめる。違えば終了コード 1）
// 列：区分・レース・年・着順・馬・元の綴り・ゲームにいる・着差・着差の基準・人気・走破タイム・注・出典
//  - JRA・地方：馬＝horse、元の綴り＝nameSrc（JBIS の英字）、着差＝margin（勝ち馬との差を積み上げたもの）、基準は「勝ち馬との差」、注＝note
//  - 海外：馬＝horse（ゲームにいる馬のカナ。いなければ空）、元の綴り＝horseEn、着差＝margin、
//          基準は marginTo＝prev→「前の馬との差」・winner→「勝ち馬との差」（着差が無い行は空）、注＝同着（dh）・note・着差の出典（marginSrc）
//  - 並びは区分（JRA・地方 → 海外）・レース名（文字コード順）・年・着順・元データの順
//  - UTF-8（BOM つき）・改行は CRLF（表計算ソフトで開くため）
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SRC_JRA = path.join(ROOT, 'data/src/placings_jra.jsonl');
const SRC_WORLD = path.join(ROOT, 'data/src/placings_world.jsonl');
const OUT = path.join(ROOT, 'docs/review/placings.csv');
const HEAD = ['区分', 'レース', '年', '着順', '馬', '元の綴り', 'ゲームにいる', '着差', '着差の基準', '人気', '走破タイム', '注', '出典'];

function readJsonl(f) { return fs.readFileSync(f, 'utf8').split('\n').filter(l => l.trim()).map((l, i) => { try { return JSON.parse(l); } catch (e) { throw new Error(`${path.basename(f)} ${i + 1}行目: ${e.message}`); } }); }
const s = v => (v == null ? '' : String(v));
function jraRow(x) {
  return ['JRA・地方', x.race, x.year, x.pos, s(x.horse), s(x.nameSrc), x.inData ? '○' : '', s(x.margin), '勝ち馬との差', s(x.pop), s(x.time), s(x.note), x.src];
}
const BASIS = { prev: '前の馬との差', winner: '勝ち馬との差' };
function worldNote(x) {
  const n = [];
  if (x.dh) n.push('同着');
  if (x.note) n.push(x.note);
  if (x.marginSrc) n.push('着差の出典 ' + x.marginSrc);
  return n.join('；');
}
function worldRow(x) {
  return ['海外', x.race, x.year, x.pos, s(x.horse), s(x.horseEn), x.inData ? '○' : '', s(x.margin), x.margin ? (BASIS[x.marginTo || 'prev'] || '') : '', '', '', worldNote(x), x.src];
}
function sortRows(list) {
  return list.map((x, i) => ({ x, i })).sort((a, b) => (a.x.race < b.x.race ? -1 : a.x.race > b.x.race ? 1 : 0) || a.x.year - b.x.year || a.x.pos - b.x.pos || a.i - b.i).map(o => o.x);
}
function cell(v) { v = s(v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function build(jra, world) {
  const rows = [HEAD, ...sortRows(jra).map(jraRow), ...sortRows(world).map(worldRow)];
  return '﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
// CSV を読む（テストで元データと突き合わせるため）
function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; continue; }
    if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur.replace(/\r$/, '')); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
module.exports = { build, readJsonl, parseCsv, HEAD, SRC_JRA, SRC_WORLD, OUT };

if (require.main === module) {
  const text = build(readJsonl(SRC_JRA), readJsonl(SRC_WORLD));
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (cur !== text) { console.error('placings.csv が元データと合っていません。node tools/build_placings_csv.js で作り直してください'); process.exit(1); }
    console.log('placings.csv は元データと同じ');
  } else {
    fs.writeFileSync(OUT, text);
    console.log(`書き出し：${path.relative(ROOT, OUT)}（${text.split('\r\n').length - 2}行）`);
  }
}
