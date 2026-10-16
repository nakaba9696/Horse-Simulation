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
const combos = SP.GROUPS.filter(g => !g.race && SP.members(g).length);
const races = SP.GROUPS.filter(g => g.race && SP.members(g).length).sort((a, b) => a.at - b.at);
lines.push(`スペシャルホース ${SP.list().length}頭・条件の組み合わせのグループ ${combos.length}・大レースのグループ ${races.length}`, '');
const yr = d => `${d.born}年生`;
const row = d => `${d.name}（${yr(d)}${d.country ? '・' + d.country : ''}${d.years ? '・' + d.years : ''}${d.record ? '・' + d.record : ''}）`;
lines.push('## 条件の組み合わせのグループ', '');
for (const g of combos) {
  const ms = SP.members(g);
  lines.push(`### ${g.label}（${ms.length}頭）`, '', `条件：${g.note}`, '', ms.map(row).join('、'), '');
}
lines.push('## 大レースのグループ（歴代の勝ち馬）', '', '条件：G1を勝った馬でそのレースに出る（2歳のG1は、重賞を勝った馬で）。出てくるのは、まだ倒していない勝ち馬のうち強い順に2頭。', '');
for (const g of races) {
  const ms = SP.members(g);
  lines.push(`### ${g.label}（${ms.length}頭）`, '', ms.map(row).join('、'), '');
}
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'SPECIAL_HORSES.md'), lines.join('\n'));
console.log(`docs/SPECIAL_HORSES.md：${SP.list().length}頭・${combos.length + races.length}グループ`);
