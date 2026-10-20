// スペシャルホースの条件と出てくる馬の一覧を docs/SPECIAL_HORSES.md に書き出す（js/core/special.js から作る。手で直さない）
// node tools/special_list.js
const fs = require('fs'), path = require('path');
const { load } = require('../tests/load.js');
const HS = load();
const SP = HS.Special;
HS.U.ERA = HS.Eraless.ERA;
const lines = [];
lines.push('# スペシャルホースの一覧', '');
lines.push('`node tools/special_list.js` で `js/core/special.js` から作る（手で直さない）。', '');
lines.push('1989年より前に走り終えた名馬が、条件のグループに入る。自分の馬がグループの条件にリーチをかける（あと1勝でそろう）と、そのグループの名馬が最後のレースに出てくる（1レースに最大4頭。大レースのグループからは強い順に2頭まで）。勝つと、出てきた名馬が馬の店に並ぶ。1頭が出てくる条件は1つだけ。（）の中は生年・国・競走生活の年・通算の戦績。年代・戦績・主な勝鞍・解説は data/profiles.js。', '');
// ---- トロフィーと隠し馬の紐づけ（data/trophies.js・data/trophy_horses.js）。持ち主が見て直す表 ----
const TR = HS.Trophy, RULE = TR.RULE;
const th = HS.DATA.trophyHorses || {};
lines.push('## トロフィーと隠し馬', '');
lines.push('トロフィー（`data/trophies.js`）にリーチをかけて最後のレースに出ると、紐づけた隠し馬（`data/trophy_horses.js`）が出てくる。隠し馬は手持ちでない最低人気の馬と入れ替わる。勝つと店に並び、そのあとも、またそのトロフィーにリーチをかけたときだけ出てくる（自分のお手馬になっている間は出ない）。隠し馬は1989年より前に走り終えた馬だけ（持ち主の決定 2026-10-19）。ただし香港の三冠2つは1989年からの有名な馬もあてる（持ち主の決定 2026-10-20）。その馬がその年に世界で走っているときは出てこず、倒すと店にいつも並び、それからは毎年のデビューに選ばれない。直すときは `data/trophy_horses.js` の名前と理由を書き換える。', '');
lines.push('★の馬は「無敗のとき」だけ出てくる：自分の馬がそのリーチの時点でデビューから一度も負けていない（出走数と勝ち数が同じ。GF は数えない）とき。★の無い馬はいつでも出てくる（持ち主の決定 2026-10-20）。', '');
lines.push(`隠し馬の強さ：出てくるときの総合力（そのレースの馬場で）の下限は難しさ1〜6で ${RULE.HIDDEN_FH.slice(1).join('・')}。下回る馬は、そのレースだけその馬場のスピードとスタミナを上げて下限にそろえる（データは変えない）。最後のレースが芝にもダートにもなるトロフィー（${TR.LIST.filter(t => SP.mixedTrophy(t)).map(t => t.label).join('・')}）の隠し馬は［芝］［ダート］に分け、そのレースの馬場の馬だけが出てくる（持ち主の決定 2026-10-20）。`, '');
lines.push(`お金は難しさ（1〜6）で決まる（${RULE.TIER_MONEY.slice(1).map((m, i) => `${i + 1}：${HS.U.money(TR.money({ tier: i + 1 }))}`).join('・')}）。引退したときの能力の上がりは、トロフィーごとに「上がる能力」に ${RULE.TIER_PTS.slice(1).join('・')}（難しさ1〜6）、ほかの能力にその半分（1つの能力は ${RULE.CAP} まで）。`, '');
lines.push(`ワンダーホースの着差：勝ったレースで2着につけた着差（馬身）を足す。1レースは ${RULE.WONDER_PER_RACE} 馬身まで（大差は ${RULE.WONDER_PER_RACE} 馬身）。GF は数えない。インモータルロード：G1 に出たときだけ数え、${RULE.IMMORTAL_STREAK} 回続けて勝つ（G1 で負けると0から。GF は数えない）。`, '');
for (const c of TR.CATS) {
  const ts = TR.LIST.filter(t => t.cat === c.id);
  if (!ts.length) continue;
  lines.push(`### ${c.label}`, '', '| トロフィー | 条件 | 難しさ | お金 | 引退で大きく上がる能力 | 出てくる隠し馬（理由） |', '|---|---|---|---|---|---|');
  for (const t of ts) {
    const hs = c.id === 'gf' ? `GF の担当の伝説級（${HS.Season.gfLegends(t.gf).map(d => d.name).join('・') || 'なし'}）` : (th[t.id] || []).map(x => `${x.when === 'unbeaten' ? '★' : ''}${x.surf ? `［${x.surf === 'ダ' ? 'ダート' : '芝'}］` : ''}${x.name}（${x.why}）`).join('、') || '（いない）';
    lines.push(`| ${t.label} | ${t.note} | ${t.tier} | ${HS.U.money(TR.money(t))} | ${t.focus.map(k => HS.Horse.STAT_LABEL[k]).join('・')} | ${hs} |`);
  }
  lines.push('');
}
const combos = SP.GROUPS.filter(g => !g.race && !g.trophy && SP.members(g).length);
const races = SP.GROUPS.filter(g => g.race && SP.members(g).length).sort((a, b) => a.at - b.at);
lines.push(`スペシャルホース ${SP.list().length}頭・トロフィー ${TR.LIST.length}（隠し馬のいるもの ${SP.GROUPS.filter(g => g.trophy && SP.members(g).length).length}）・条件の組み合わせのグループ ${combos.length}・大レースのグループ ${races.length}`, '');
const yr = d => `${d.born}年生`;
const row = d => `${d.name}（${yr(d)}${d.country ? '・' + d.country : ''}${d.years ? '・' + d.years : ''}${d.record ? '・' + d.record : ''}）`;
lines.push('## 条件の組み合わせのグループ（トロフィーに当たらないもの）', '');
for (const g of combos) {
  const ms = SP.members(g);
  lines.push(`### ${g.label}（${ms.length}頭）`, '', `条件：${g.note}`, '', ms.map(row).join('、'), '');
  // 伝説級は GF ごとの担当（data/legends.js の gf・data/gf.js）
  if (g.id === 'gf') lines.push('担当：' + HS.Season.GF_CATS.map(c => `${c.label}（${c.course}${c.surface}${c.dist}m）${HS.Season.gfLegends(c.id).map(d => d.name).join('・') || 'なし'}`).join('・'), '');
}
lines.push('## 大レースのグループ（歴代の勝ち馬）', '', '条件：G1を勝った馬でそのレースに出る（2歳のG1は、重賞を勝った馬で）。出てくるのは、まだ倒していない勝ち馬のうち強い順に2頭。', '');
for (const g of races) {
  const ms = SP.members(g);
  lines.push(`### ${g.label}（${ms.length}頭）`, '', ms.map(row).join('、'), '');
}
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'SPECIAL_HORSES.md'), lines.join('\n'));
console.log(`docs/SPECIAL_HORSES.md：${SP.list().length}頭・${combos.length + races.length}グループ`);
