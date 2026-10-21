// 重賞の勝ち馬の記録（data/src/*.jsonl）から、まだデータに無い史実馬を作る。
// 出力：data/historic_auto.js（史実馬・既存の馬に足す勝ち鞍・主戦騎手）
// 使い方：node tools/build_auto.js
const fs = require('fs');
const path = require('path');
const { load, ROOT } = require('../tests/load.js');
const GR = require('./growth_rule.js');

const OUT = 'data/historic_auto.js';
const HS = load({ skip: [OUT], allowMissing: true });
const D = HS.DATA, U = HS.U;

// ---- 記録を読む ----
const rows = [];
for (const f of fs.readdirSync(path.join(ROOT, 'data/src')).filter(f => f.endsWith('.jsonl')).sort()) {
  for (const line of fs.readFileSync(path.join(ROOT, 'data/src', f), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line); r.src = f;
      // 1995年までの「金杯」は東西が同じ名前なので、暦の名前（金杯（東）・金杯（西））に合わせる
      if (r.race === '金杯' && r.lineage) r.race = r.year <= 1994 ? (r.lineage.includes('中山') ? '金杯（東）' : '金杯（西）') : r.lineage;
      rows.push(r);
    } catch (e) { console.warn('bad line', f, line.slice(0, 80)); }
  }
}
console.log('rows', rows.length);
// 手で確かめた史実馬と英語の名前・生まれ年が同じ馬は、カナの書き方が違っても同じ馬（エラマナムー＝エラマナモウ、シュターアピール＝スターアピールなど）
{
  const enKey = s => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
  const byEn = new Map();
  for (const h of D.historic) if (h.nameEn) { const k = enKey(h.nameEn); if (!byEn.has(k)) byEn.set(k, []); byEn.get(k).push(h); }
  let n = 0;
  for (const r of rows) {
    if (!r.horseEn || !r.age) continue;
    const h = (byEn.get(enKey(r.horseEn)) || []).find(x => Math.abs(x.born - (r.year - r.age)) <= 1);
    if (h && h.name !== r.horse) { r.horse = h.name; n++; }
  }
  console.log('英語の名前で手のデータにそろえた記録', n);
}

// 暦から格付けを引く（記録に無いとき）
const gradeOf = (race, year) => {
  const r = D.races.find(x => x.name === race && x.from <= year && year <= (x.to || 9999));
  return r ? r.grade : null;
};
const SCORE = { G1: 10, G2: 4, G3: 2 };
const BEST = { G1: 87, G2: 80, G3: 76 };

// ---- 馬ごとにまとめる ----
const known0 = new Map(D.historic.map(h => [HS.normName(h.name), h]));
const known = { get: n => known0.get(HS.normName(n)) };
const byKey = new Map();
for (const r of rows) {
  if (!r.horse || !r.year || !r.race) continue;
  const name = String(r.horse).replace(/\s+/g, '').replace(/[［\[].*?[］\]]/g, '');
  if (!byKey.has(name)) byKey.set(name, { name, rows: [] });
  byKey.get(name).rows.push(Object.assign({}, r, { horse: name }));
}
// 同じ名前でも生まれ年が離れていれば別の馬（名前は後の世代で使い直されることがある）
for (const [name, g] of [...byKey]) {
  const borns = [...new Set(g.rows.filter(r => r.age).map(r => r.year - r.age))].sort((a, b) => a - b);
  if (borns.length < 2 || borns[borns.length - 1] - borns[0] <= 2) continue;
  byKey.delete(name);
  const groups = [];
  for (const b of borns) { const last = groups[groups.length - 1]; if (last && b - last[last.length - 1] <= 2) last.push(b); else groups.push([b]); }
  for (const grp of groups) {
    const rs = g.rows.filter(r => r.age && grp.includes(r.year - r.age));
    const k = known.get(name);
    const nm = k && Math.abs(k.born - grp[0]) <= 2 ? name : `${name}（${grp[0]}）`;
    byKey.set(nm, { name: nm, rows: rs.map(r => Object.assign({}, r, { horse: nm })) });
  }
}
// 既にデータがある同名の馬と生まれ年が離れていれば別の馬
for (const [name, g] of [...byKey]) {
  const k = known.get(name);
  if (!k) continue;
  const b = g.rows.filter(r => r.age).map(r => r.year - r.age)[0];
  if (b != null && Math.abs(b - k.born) > 2) { byKey.delete(name); const nm = `${name}（${b}）`; byKey.set(nm, { name: nm, rows: g.rows.map(r => Object.assign({}, r, { horse: nm })) }); }
}

const histNew = [];
const extraWins = {};
const jockeysAuto = {};
const mode = arr => { const m = new Map(); let best = null, bc = 0; for (const v of arr) { if (v == null) continue; const c = (m.get(v) || 0) + 1; m.set(v, c); if (c > bc) { bc = c; best = v; } } return best; };

for (const { name, rows: rs } of byKey.values()) {
  rs.sort((a, b) => a.year - b.year);
  const wins = [...new Set(rs.map(r => `${r.year}${r.race}`))];
  const k = known.get(name);
  if (k) {
    // 既にデータがある馬：勝ち鞍だけ足す
    const have = new Set([...(k.wins || []), ...(k.ran || [])]);
    const add = wins.filter(w => !have.has(w));
    if (add.length) extraWins[k.name] = add;
    continue;
  }
  const bornCand = rs.filter(r => r.age).map(r => r.year - r.age);
  if (!bornCand.length) continue;
  const born = mode(bornCand);
  if (born < 1950 || born > 2024) continue;
  const lastYear = rs[rs.length - 1].year;
  if (lastYear < 1960) continue;
  // 強さ：一番いい勝ち鞍と、そのほかの勝ち鞍から
  const grades = rs.map(r => r.grade || gradeOf(r.race, r.year) || (r.src.includes('world') ? 'G1' : 'G3'));
  const scores = grades.map(g => SCORE[g] || 2);
  const bestG = grades.includes('G1') ? 'G1' : grades.includes('G2') ? 'G2' : 'G3';
  const total = scores.reduce((s, v) => s + v, 0);
  const rating = Math.round(Math.min(96, BEST[bestG] + 2.6 * Math.log2(1 + (total - SCORE[bestG]) / 6)));
  // 馬場と距離
  const surfs = new Set(rs.map(r => r.surface).filter(Boolean));
  const surface = surfs.size > 1 ? '芝ダ' : surfs.has('ダ') ? 'ダ' : '芝';
  const dists = rs.map(r => r.dist).filter(Boolean);
  let dMin = dists.length ? Math.min(...dists) - 200 : 1400, dMax = dists.length ? Math.max(...dists) + 200 : 2400;
  if (dMax - dMin < 600) { const mid = (dMin + dMax) / 2; dMin = mid - 300; dMax = mid + 300; }
  dMin = Math.max(1000, Math.round(dMin / 100) * 100); dMax = Math.min(4000, Math.round(dMax / 100) * 100);
  // 成長型：勝った年齢から
  const ages = rs.map(r => r.age).filter(Boolean);
  const maxA = Math.max(...ages);
  // 超早熟・早熟・早め・普通・遅め・晩成・超晩成・持続の8つ（tools/growth_rule.js）
  const growth = GR.growthOf(rs.filter(r => r.age).map(r => ({ age: r.age, year: r.year, at: GR.atOf(r.age, GR.monthOf(D, r.race, r.year)) })));
  // 脚質：名前ごとに決まった引き（短距離は前へ）
  const r0 = U.hashRng('style:' + name);
  const sprint = dMax <= 1600;
  const style = r0.weighted(['逃げ', '先行', '差し', '追込'], s => ({ '逃げ': sprint ? 2 : 1, '先行': sprint ? 5 : 3.5, '差し': sprint ? 2.5 : 3.5, '追込': 1 })[s]);
  const sexes = rs.map(r => r.sex).filter(Boolean);
  const sex = sexes.includes('セ') ? 'セ' : mode(sexes) || '牡';
  // 国：海外の記録にある調教国（日本の馬は付けない）
  const country = mode(rs.filter(r => r.src.includes('world')).map(r => r.country).filter(Boolean));
  const e = {
    name, born, sex, rating, surface, distMin: dMin, distMax: dMax, style, growth,
    retire: Math.min(born + 9, lastYear + (maxA <= 3 ? 1 : 0)), wins, auto: true,
  };
  // 英語の名前：記録の英語名 → 出典で確かめた表（data/names_en.js）→ カナのヘボン式（js/core/datafix.js の HS.romaji。決まりは docs/I18N_DATA.md）
  const en = rs.map(r => r.horseEn).find(Boolean) || (D.namesEn || {})[name] || (D.namesEn || {})[name.replace(/（\d{4}）$/, '')];
  if (en) e.nameEn = en; else { e.nameEn = HS.romaji(name); e.nameEnRule = true; }
  if (country && country !== '日') e.country = country;
  // 主戦騎手：一番多く勝たせた騎手。年ごとに違えばその年だけ
  const jm = mode(rs.map(r => r.jockey));
  if (jm) {
    const per = {};
    const years = [...new Set(rs.map(r => r.year))];
    for (const y of years) { const jy = mode(rs.filter(r => r.year === y).map(r => r.jockey)); if (jy && jy !== jm) per[y] = jy; }
    jockeysAuto[name] = Object.keys(per).length ? Object.assign({ default: jm }, per) : jm;
  }
  histNew.push(e);
}
histNew.sort((a, b) => a.born - b.born || b.rating - a.rating);
console.log('new horses', histNew.length, 'extra wins for', Object.keys(extraWins).length);

const lines = [];
lines.push('// 自動生成：tools/build_auto.js（data/src の重賞の勝ち馬の記録から）。手で直さず、元の記録か生成の手順を直す');
lines.push('(function(){');
lines.push('const HS = globalThis.HS = globalThis.HS || {}; HS.DATA = HS.DATA || {};');
lines.push('HS.DATA.historic = (HS.DATA.historic || []).concat([');
for (const h of histNew) lines.push(' ' + JSON.stringify(h) + ',');
lines.push(']);');
lines.push('HS.DATA.historicExtraWins = Object.assign(HS.DATA.historicExtraWins || {}, ' + JSON.stringify(extraWins) + ');');
lines.push('HS.DATA.historicJockeysAuto = Object.assign(HS.DATA.historicJockeysAuto || {}, ' + JSON.stringify(jockeysAuto) + ');');
lines.push('})();');
fs.writeFileSync(path.join(ROOT, OUT), lines.join('\n') + '\n');
console.log('wrote', OUT, (fs.statSync(path.join(ROOT, OUT)).size / 1024).toFixed(0) + 'KB');
