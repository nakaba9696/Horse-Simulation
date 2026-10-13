// 騎手の表に無い騎手（重賞の勝ち馬の記録に出てくる人）を、出てくる年から見積もって足す
// 出力：data/jockeys_extra.js。使い方：node tools/build_jockeys_extra.js（build_auto.js のあと）
const fs = require('fs');
const path = require('path');
const { load, ROOT } = require('../tests/load.js');
const OUT = 'data/jockeys_extra.js';
const HS = load({ skip: [OUT], allowMissing: true });
const D = HS.DATA;
const have = new Set((D.jockeys || []).map(j => j.name));
const seen = new Map();
for (const f of fs.readdirSync(path.join(ROOT, 'data/src')).filter(f => f.endsWith('.jsonl'))) {
  for (const line of fs.readFileSync(path.join(ROOT, 'data/src', f), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    if (!r.jockey || have.has(r.jockey)) continue;
    const s = seen.get(r.jockey) || { years: [], courses: [], local: 0, world: f.includes('world') };
    s.years.push(r.year); s.courses.push(r.course); if (r.mark && r.mark.includes('地')) s.local++;
    seen.set(r.jockey, s);
  }
}
const KANTO = ['東京', '中山', '新潟', '福島'];
const out = [];
for (const [name, s] of seen) {
  const from = Math.min(...s.years) - 5, to = Math.max(...s.years) + 3;
  const kanto = s.courses.filter(c => KANTO.includes(c)).length >= s.courses.length / 2;
  const region = s.world ? '外国' : s.local ? '地方' : kanto ? '美浦' : '栗東';
  out.push({ name, region, from, to, skill: { [from]: 72 + Math.min(10, s.years.length * 2) }, uncertain: true });
}
const txt = '// 自動生成：tools/build_jockeys_extra.js（記録に出てくる年から見積もった騎手。所属は推定）\n(function(){\nconst HS = globalThis.HS = globalThis.HS || {}; HS.DATA = HS.DATA || {};\nHS.DATA.jockeys = (HS.DATA.jockeys || []).concat([\n' + out.map(j => ' ' + JSON.stringify(j) + ',').join('\n') + '\n]);\n})();\n';
fs.writeFileSync(path.join(ROOT, OUT), txt);
console.log('added jockeys', out.length);
