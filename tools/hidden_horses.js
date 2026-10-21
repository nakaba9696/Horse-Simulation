// トロフィーの隠し馬の強さ（データのまま）を docs/review/HIDDEN_HORSES.md に書き出す（手で直さない）
// node tools/hidden_horses.js
const fs = require('fs'), path = require('path');
const { load } = require('../tests/load.js');
const HS = load();
HS.U.ERA = HS.Eraless.ERA;
const SP = HS.Special, TR = HS.Trophy, T = HS.Season;
const th = HS.DATA.trophyHorses || {};
const ERA = HS.Eraless.ERA;
// 持ち主が決めて変えた組（前の値 → いまの値は下の表で）。決定ごとに足す
const CHANGES = [
  { date: '2026-10-20', note: '持ち主の決定「隠し馬とスペシャルホースの強さ・出方」', rows: [
    ['テツノカチドキ', 'ジャパンダート GS の隠し馬から外し、地方から来た名馬（地方の重賞を勝った馬で中央の G1 へ）へ', 'ダ 60 → 64'],
    ['オールアロング', 'ホールオブフェイムの隠し馬から外し、歴代の凱旋門賞馬へ（「ホール・オブ・フェイムにオールアロング出さないで」）', '芝 70 → 72'],
    ['ヴェイグリーノーブル', 'ホールオブフェイムの芝の側へ（オールアロングの替わり。前は歴代の凱旋門賞馬）', '芝 74（そのまま）'],
    ['スペクタキュラービッド', 'インモータルロードのダートのまま', 'ダ 76 → 78'],
    ['パーソナルエンスン', 'インモータルロードのダート・無敗のときから外し、米国牝馬三冠（ラフィアンと同じ組）へ。いつでも出る', 'ダ 78（そのまま）'],
    ['ロッキータイガー', 'ジャパンダート GS のまま', 'ダ 62 → 64'],
    ['タマモクロス', 'ジャパン GS のまま', '芝 73 → 74'],
    ['ミエスク', 'ワールドマイル GS のまま', '芝 71 → 76'],
    ['ドクターフェイガー', 'ワールドスプリント GS のまま（出るのは芝のレース）', 'ダ 77 → 78（得意な馬場）・芝 73 → 74'],
  ] },
];

const surfOfRace = s => { const r = (HS.DATA.races || []).find(x => (x.short || x.name) === s && x.from <= ERA && ERA <= (x.to || 9999)); return r ? r.surface : null; };
const rows = [];
for (const t of TR.LIST) {
  for (const x of th[t.id] || []) {
    const d = SP.data(x.name); if (!d) continue;
    let surf = x.surf || null;
    if (!surf && t.races) { const ss = [...new Set(t.races.map(surfOfRace).filter(Boolean))]; surf = ss.length === 1 ? ss[0] : null; }
    const h = SP.horse(d, { age: '3+', year: 2030 });
    const f = T.fhPeak(h);
    if (!surf) surf = f.dirt > f.turf ? 'ダ' : '芝';
    rows.push({ t, name: x.name, surf, fh: surf === 'ダ' ? f.dirt : f.turf, unb: x.when === 'unbeaten' });
  }
}
const med = xs => { const s = xs.slice().sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const byTier = {};
for (const r of rows) (byTier[r.t.tier] = byTier[r.t.tier] || []).push(r.fh);
const medT = Object.fromEntries(Object.entries(byTier).map(([k, v]) => [k, med(v)]));
const mark = r => { const m1 = medT[r.t.tier - 1], m2 = medT[r.t.tier - 2]; if (m2 != null && r.fh < m2) return '▼▼'; if (m1 != null && r.fh < m1) return '▼'; return ''; };
rows.sort((a, b) => a.t.tier - b.t.tier || a.t.label.localeCompare(b.t.label, 'ja') || b.fh - a.fh);
const S = s => s === 'ダ' ? 'ダ' : '芝';
const L = [];
L.push('# トロフィーの隠し馬の強さ（データのまま）', '');
L.push('`node tools/hidden_horses.js` で作る（手で直さない）。持ち主の願い「難しいトロフィーほど強い馬だしてほしい」を、隠し馬の選び方で満たすための材料（2026-10-20）。隠し馬はデータのままの能力で出てくる（出てくるときに能力を上げる仕組みは、持ち主の「これ言ってないんだけど　こんな仕様やめてね」でやめた）。', '');
L.push(`- 総合力：その隠し馬が出るレースの馬場（芝・ダ）の総合力。データ（史実馬・名鑑・\`data/legends.js\`・見直しの \`data/horse_fix.js\`）のまま、いちばん良いときの力。芝にもダートにもなるトロフィー（${TR.LIST.filter(t => SP.mixedTrophy(t)).map(t => t.label).join('・')}）は、その馬の受け持つ馬場（\`data/trophy_horses.js\` の \`surf\`）で数えた。`);
L.push('- 無敗：★は「無敗のとき」だけ出てくる馬。');
L.push(`- 印（弱く見える組）：▼＝ひとつ易しい難しさの隠し馬の総合力の中央値より低い。▼▼＝ふたつ易しい難しさの中央値よりも低い。難しさごとの中央値は ${Object.keys(medT).sort().map(k => `${k}：${medT[k]}`).join('・')}。`);
L.push('- 作り方：`js/core/special.js` の `SP.horse`（その場限りの馬）を `HS.Season.fhPeak` で数えた。データを直したら数は変わる。', '');
L.push('## 変えた組', '');
for (const c of CHANGES) {
  L.push(`${c.date}・${c.note}：`, '', '| 馬 | 出る組 | 総合力 |', '|---|---|---|');
  for (const [n, g, v] of c.rows) L.push(`| ${n} | ${g} | ${v} |`);
  L.push('');
}
const weak = rows.filter(r => mark(r));
const range = Object.keys(byTier).sort().map(k => `${k}：${Math.min(...byTier[k])}〜${Math.max(...byTier[k])}`).join('・');
L.push('## 要点', '');
L.push(`- 隠し馬 ${rows.length} 組（馬 × 出る馬場）のうち、弱く見える組は ${weak.length} 組${weak.filter(r => mark(r) === '▼▼').length ? `（▼▼ は ${weak.filter(r => mark(r) === '▼▼').map(r => `${r.t.label}（難しさ${r.t.tier}）の${r.name}［${S(r.surf)}］${r.fh}`).join('・')}）` : '（▼▼ は無い）'}。`);
L.push(`- 難しさごとの総合力の幅：${range}。`);
L.push(`- 隠し馬のいないトロフィー：${TR.LIST.filter(t => !(th[t.id] || []).length).map(t => t.label).join('・')}（GF の6つは伝説級の名馬のグループが受け持つ）。`, '');
L.push('## 表（難しさの順）', '', '| 難しさ | トロフィー | 隠し馬 | 芝/ダ | 総合力 | 無敗 | 印 |', '|---|---|---|---|---|---|---|');
for (const r of rows) L.push(`| ${r.t.tier} | ${r.t.label} | ${r.name} | ${S(r.surf)} | ${r.fh} | ${r.unb ? '★' : ''} | ${mark(r)} |`);
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'review', 'HIDDEN_HORSES.md'), L.join('\n') + '\n');
console.log(`docs/review/HIDDEN_HORSES.md：${rows.length}組・弱く見える組 ${weak.length}`);
