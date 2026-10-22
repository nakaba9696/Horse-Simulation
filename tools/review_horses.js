// 馬の能力値の一覧を、外のレビュー（別の AI）に渡す形で書き出す（持ち主 2026-10-20「馬の能力値　隠し馬もcodexにチェックしてもらいたいのでだしてほしい」）
// 出力：docs/review/horses.csv（毎年デビューする史実馬・スペシャルホース・トロフィーの隠し馬。ゲームの中で使う値）
//   node tools/review_horses.js
const fs = require('fs'), path = require('path');
const { load, ROOT } = require('../tests/load.js');
const HS = load();
HS.U.ERA = HS.Eraless.ERA;
const D = HS.DATA, H = HS.Horse, T = HS.Season, K = HS.Skills, SP = HS.Special, E = HS.Eraless;

const trophyOf = new Map();
for (const [id, xs] of Object.entries(D.trophyHorses || {})) for (const x of xs) {
  const t = (HS.Trophy.LIST.find(t => t.id === id) || {}).label || id;
  if (!trophyOf.has(x.name)) trophyOf.set(x.name, []);
  trophyOf.get(x.name).push(t + (x.when === 'unbeaten' ? '（無敗のとき）' : ''));
}
const special = new Set(SP.list().map(x => x.name));
const dataOf = n => SP.data(n) || D.historic.find(d => d.name === n) || null;
const names = [...new Set(D.historic.filter(E.isPool).map(d => d.name).concat([...special], [...trophyOf.keys()]))];

const r1 = v => v == null ? '' : Math.round(v * 10) / 10;
const g1 = d => (d.wins || []).filter(w => { const n = String(w).replace(/^\d{4}/, ''); return (D.races || []).some(r => r.name === n && r.grade === 'G1'); });
const esc = s => /[",\n]/.test(String(s)) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s);
const head = ['区分', '名前', '生年', '国', '性', '芝の総合力', 'ダートの総合力', 'スピード（芝）', 'スタミナ（芝）', 'スピード（ダ）', 'スタミナ（ダ）', '根性', '気性', '坂', '健康', '切れ', '芝の適性', 'ダートの適性', '重馬場の適性', '脚質', '距離', '成長型', '特殊能力', '発動する特殊能力', 'G1の勝ち数', 'G1の勝ち鞍', 'トロフィーの隠し馬', '持ち主が決めた値', '史実の主な勝鞍'];
const rows = [head];
for (const n of names) {
  const d = dataOf(n); if (!d) continue;
  const h = H.fromHistoric(d, 'review'), f = T.fhShowPeak(h), p = h.pot; // 総合力は画面の数（0.5 刻み）
  const kind = trophyOf.has(n) ? (special.has(n) ? 'スペシャル＋隠し馬' : '隠し馬') : special.has(n) ? 'スペシャルホース' : '史実馬（毎年デビュー）';
  const w = g1(d);
  rows.push([kind, n, d.born, d.country || '日', d.sex, f.turf, f.dirt, r1(p.spd), r1(p.sta), r1(p.dspd), r1(p.dsta), r1(p.guts), r1(p.mind), r1(p.slope), r1(h.health), h.kire,
    r1(h.apt.turf), r1(h.apt.dirt), r1(h.apt.heavy), h.style, `${h.distMin}-${h.distMax}`, h.growth,
    (h.skills || []).map(K.label).join('・'), K.of(h).map(K.label).join('・'), w.length, w.join('・'), (trophyOf.get(n) || []).join('・'),
    /クイズ|入力|持ち主の見直し|比較|持ち主が値を入力/.test(((D.horseFix || {})[n] || {}).why || '') ? '○' : '', (((D.mainWinsWorld || {})[n] || {}).ja || []).join('・')]);
}
const order = ['隠し馬', 'スペシャル＋隠し馬', 'スペシャルホース', '史実馬（毎年デビュー）'];
const body = rows.slice(1).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]) || Math.max(b[5], b[6]) - Math.max(a[5], a[6]));
const out = path.join(ROOT, 'docs', 'review', 'horses.csv');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, '﻿' + [head].concat(body).map(r => r.map(esc).join(',')).join('\n') + '\n');
const cnt = {}; for (const r of body) cnt[r[0]] = (cnt[r[0]] || 0) + 1;
console.log(`docs/review/horses.csv：${body.length}頭`, cnt);
