// 手で書いた史実馬（data/historic_1.js・historic_2.js・historic_old.js・historic_world.js）の成長型を、勝ち鞍の年齢から見直す
//   手で書いた成長型が正。新しい型（超早熟・超晩成・持続）は、勝ち鞍の年齢がその型に当てはまり、手で書いた型がその隣の型のときだけ書き換える
//   （早熟→超早熟、晩成→超晩成、普通・遅め・晩成→持続）。持ち主の決定 2026-10-20「早熟普通晩成持続に少し種類増やして良い」
// 使い方：node tools/growth_hand.js（候補を出すだけ） ／ node tools/growth_hand.js --write（データに書く）
const fs = require('fs');
const path = require('path');
const { load, ROOT } = require('../tests/load.js');
const GR = require('./growth_rule.js');

const HS = load({});
const D = HS.DATA;
const FILES = ['data/historic_1.js', 'data/historic_2.js', 'data/historic_old.js', 'data/historic_world.js'];
const NEXT = { '超早熟': ['早熟'], '超晩成': ['晩成'], '持続': ['普通', '遅め', '晩成'] };

const parse = w => { const m = /^(\d{4})(.*)$/.exec(w); return m ? { year: +m[1], race: m[2] } : null; };
const winsAges = h => (h.wins || []).map(parse).filter(Boolean).map(w => {
  const age = w.year - h.born;
  return { age, year: w.year, at: GR.atOf(age, GR.monthOf(D, w.race, w.year)) };
});

const change = new Map(); // name|born → 新しい型
const byType = {};
for (const h of D.historic) {
  if (h.auto || !h.born) continue;
  const ws = winsAges(h);
  if (!ws.length) continue;
  const g = GR.growthOf(ws);
  if (!NEXT[g] || !NEXT[g].includes(h.growth)) continue;
  change.set(HS.normName(h.name) + '|' + h.born, { from: h.growth, to: g });
  (byType[g] = byType[g] || []).push(`${h.name}（${h.born}・${h.growth}）`);
}
for (const [g, list] of Object.entries(byType)) console.log(`${g} ${list.length}頭：${list.join(' ')}`);

if (process.argv.includes('--write')) {
  let n = 0;
  for (const f of FILES) {
    const file = path.join(ROOT, f);
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = /name:'([^']+)'.*?born:(\d{4})/.exec(lines[i]);
      if (!m) continue;
      const c = change.get(HS.normName(m[1]) + '|' + m[2]);
      if (!c) continue;
      // 1頭が数行にわたる書き方もある：次の馬の行までで成長型を探す
      for (let j = i; j < lines.length && (j === i || !/name:'/.test(lines[j])); j++) {
        const before = lines[j];
        lines[j] = lines[j].replace(`growth:'${c.from}'`, `growth:'${c.to}'`);
        if (lines[j] !== before) { n++; break; }
      }
    }
    fs.writeFileSync(file, lines.join('\n'));
  }
  console.log('書き換えた', n);
}
