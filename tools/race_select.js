// 番組（重賞）の取捨選択の一覧を docs/review/RACE_SELECT_CHECK.md に書き出す（外の AI に見てもらう依頼文。data/races*.js から作る。手で直さない）
// node tools/race_select.js
//  - 年代なしのゲームの番組（U.ERA＝2025年の形）を、時期の順に1行ずつ並べる。
//  - 選び：残す＝ゲームで出られる／外す＝番組にはあるが自分の馬は出られない（js/core/races.js の R.abroadWhy。豪州の2歳 G1）
//  - トロフィー（data/trophies.js。暦の short で照合）・オーナーの依頼（data/owners.js。名前か short）・スペシャルホースの条件（js/core/special.js の
//    GROUPS の finals。トロフィーのグループは除く）で使っているかを列に出す。外すとそれらが成り立たない。
//  - 末尾に、記録だけのレース（data/hist_races.js。番組に入れない）と、最近まで番組にあって2025年に無いレースを並べる。
const fs = require('fs'), path = require('path');
const { load, ROOT } = require('../tests/load.js');
const HS = load();
const E = HS.Eraless, R = HS.Races, ERA = E.ERA;
HS.U.ERA = ERA;
const OUT = path.join(ROOT, 'docs/review/RACE_SELECT_CHECK.md');

const live = r => r.from <= ERA && ERA <= (r.to || 9999);
const races = R.gradedYear(ERA);
const AGE = { '2': '2歳', '3': '3歳', '4': '4歳', '2+': '2歳以上', '3+': '3歳以上', '4+': '4歳以上' };
const countryOf = r => r.region === 'JRA' ? '日' : r.region === '地方' ? '日（地方）' : (r.country || (HS.DATA.courses[r.course] || {}).country || '?');
const gradeOf = r => R.gradeBadge(Object.assign({}, r, { year: ERA }));
const has = (list, r) => list.includes(r.name) || (r.short != null && list.includes(r.short));

// 使っている所
const trophyOf = r => HS.Trophy.LIST.filter(t => (t.races || []).includes(r.short)).map(t => t.label);
const ownerOf = r => {
  const out = [];
  for (const o of HS.DATA.owners || []) {
    const ms = o.missions || [];
    ms.forEach((m, i) => {
      const n = m.need || {};
      if ((m.race && has([m.race], r)) || has(n.set || [], r) || has(n.names || [], r)) out.push(`${o.name}（${m.race ? `段階${i + 1}` : 'お手馬'}）`);
    });
  }
  return [...new Set(out)];
};
const specialOf = r => HS.Special.GROUPS.filter(g => !g.trophy && Array.isArray(g.finals) && has(g.finals, r)).map(g => g.label);
const whyOut = r => {
  if (r.region !== '海外' || r.grade !== 'G1' || r.age !== '2') return null;
  return R.abroadWhy({ owner: 'P', born: ERA - 2 }, Object.assign({}, r, { year: ERA }), ERA) === R.AU2_WHY ? R.AU2_WHY : null;
};
const notes = r => [r.uncertain ? '前の年の形は未確認' : '', r.noGelding ? 'せん馬は出られない' : '', r.weight || ''].filter(Boolean).join('・');
const cell = s => String(s == null ? '' : s).replace(/\|/g, '／');

const rows = races.map(r => ({ r, out: whyOut(r) }));
const nKeep = rows.filter(x => !x.out).length, nOut = rows.length - nKeep;
const byRegion = {};
for (const { r } of rows) { const c = countryOf(r); byRegion[c] = (byRegion[c] || 0) + 1; }
const byGrade = {};
for (const { r } of rows) { const g = gradeOf(r); byGrade[g] = (byGrade[g] || 0) + 1; }

const L = [];
L.push('# 番組（重賞）の取捨選択のチェック依頼', '');
L.push('`node tools/race_select.js` で `data/races*.js` から作る（手で直さない。直すのは道具の中の文）。番組を変えたら作り直す。', '');
L.push('下の「---」から「依頼の文」の前までを、そのまま別の AI に貼る（短い依頼の文は末尾）。', '');
L.push('---', '');
L.push('あなたは競馬（日本・海外の平地競走）に詳しいレビュアーです。PC 向けの競馬ゲームに入れる重賞の一覧を、作者が「残す／外す」で選びました。この選び方と、各レースのデータが2025年の実際と合っているかを確かめてください。', '');
L.push('## ゲームの前提');
L.push('- 騎手が主役の競馬ゲーム。プレイヤーは自分で買った馬と、オーナー（架空の人物）に頼まれた馬に乗る。1年は1か月4週・週ごとに進む。');
L.push('- 実在の馬（1989〜2026年に走った馬）と実在のレース名を使う。番組（格・競馬場・距離・時期・賞金）は2025年の形で毎年同じ。');
L.push('- 出られるのはオープン以上。ここに載っているのは重賞だけ（オープン特別は競馬場ごとに自動で作るので、この一覧に無い）。障害競走は無い。');
L.push('- 時期は「月と週」（5週目は無い）。2025年の施行日から、1〜7日＝1週・8〜14日＝2週・15〜21日＝3週・22日〜＝4週で決める（全部のデータのファイルで同じ）。別の週末の G1 が同じ週に重なるときは、早いほうの週末を前の週へ寄せた（マイルCS・エリザベス女王杯）。2025年だけの例外（中京の京都金杯・4月のドバイワールドカップデー・サラトガのJCゴールドカップなど）は入れず、ふだんの形にしてある。');
L.push(`- 海外は日本の地方・米・加・英・愛・仏・独・豪・香港・UAE・サウジ。豪州の2歳 G1 には出られない（作者の決定）。番組には残り、ゲームの中の他の馬だけが走る。この一覧では「外す」。`);
L.push('- 日本の地方のダートの重賞は、ゲームの中では Jpn1〜3 と出す（国際 GI の東京大賞典だけ G1）。');
L.push('- 賞金は1着の賞金（万円・2025年の円換算の目安）。海外の賞金は概算。');
L.push('- 列「トロフィー」は、レースの組み合わせを制覇する目標（例：日本三冠）の条件に使っているもの。「オーナー」は依頼（段階1〜4の固定のレース・お手馬での最後の依頼）に使っているもの。「スペシャル」は、昔の名馬が出てくる条件（歴代の○○馬など）に使っているもの。どれも、外すと成り立たなくなる。');
L.push('- 「この形の始まり」は、その形（格・距離・競馬場）の行の始まりの年。海外の補い（`data/races_more.js`）の世界の有名な重賞は2015年からの形だけを持つ決まり（FAMOUS_FROM）なので、2015 は「それより前を持たない」の意味のことが多い。ただし2015〜2024年に格の変わったレースは、史実馬の勝ち鞍の格の数え方に響くので指摘してほしい。');
L.push('- 「前の年の形は未確認」は、2025年の形は確かめたが、それより前の年の距離・競馬場の移り変わりまでは確かめきれていないもの（このレビューでは2025年の形だけ見ればよい）。');
L.push('');
L.push('## 見てほしいこと');
L.push('1. **入れたほうがよいのに一覧に無い重賞**（世界的に格が高い・有名な名馬が勝っている・日本の競馬ファンが知っている、など）。国・格・距離・時期・理由を添えて。末尾の「記録だけのレース」「2025年に無いレース」も参考に。');
L.push('2. **外したほうがよい重賞**（格が低い・廃止された・ゲームで遊ぶ価値が薄い）。理由を添えて。トロフィー・オーナー・スペシャルの列にあるものは、外すと代わりが要る。');
L.push('3. **データの誤り**：格（G1/G2/G3）・競馬場・芝ダート・距離・時期（月と週）・年齢・性別の条件・賞金が2025年の実際と違うもの。同じレースが2行ある・名前の違う同じレースがある、なども。正しい値と出典の URL を添えて。');
L.push('4. 年間の番組として、時期や距離の偏り（ある月に重賞が無い、短距離ばかり、など）があれば。');
L.push('');
L.push('## 答え方');
L.push('次の表の形で、1行に1件。出典は URL（JRA・各国の主催者・英語版 Wikipedia など）。確かめられないものは「未確認」と書く。最後に全体の短い所見を3行ほど。');
L.push('');
L.push('| 種類（追加／削除／修正） | レース名 | 国 | 内容（直す項目と正しい値） | 理由 | 出典（URL） |');
L.push('|---|---|---|---|---|---|');
L.push('');
L.push(`## 一覧（作者の選び：残す ${nKeep}／外す ${nOut}、全 ${rows.length} 件）`, '');
L.push(`国ごと：${Object.entries(byRegion).map(([k, v]) => `${k} ${v}`).join('・')}。格ごと：${Object.entries(byGrade).sort().map(([k, v]) => `${k} ${v}`).join('・')}。`, '');
L.push('| # | 作者の選び | レース名 | 略称 | 格 | 国 | 競馬場 | 芝ダ | 距離 | 年齢 | 性 | 時期 | 賞金（万円） | この形の始まり | トロフィー | オーナー | スペシャル | 備考 |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
rows.forEach(({ r, out }, i) => {
  L.push('| ' + [i + 1, out ? `外す（${out}）` : '残す', r.name, r.short && r.short !== r.name ? r.short : '', gradeOf(r), countryOf(r), r.course || '?', r.surface, r.dist, AGE[r.age] || r.age,
    r.sex || '-', `${r.month}月${r.week}週`, R.prizeOf(r, ERA), r.from, trophyOf(r).join('・') || '-', ownerOf(r).join('・') || '-', specialOf(r).join('・') || '-', notes(r)].map(cell).join(' | ') + ' |');
});
L.push('');

// 記録だけのレース（番組に入れない）
const hist = HS.DATA.histRaces || [];
L.push(`## 記録だけのレース（番組に入れない・${hist.length} 件）`, '');
L.push('史実馬の勝ち鞍を記録するためだけに持っている、その年の形（`data/hist_races.js`）。遊ぶ番組には出ない。番組に足したほうがよいものがあれば「追加」で。', '');
L.push('| レース名 | 格 | 国 | 芝ダ | 距離 | 年 |', '|---|---|---|---|---|---|');
const histKey = r => `${r.name}|${r.grade}|${r.country}|${r.surface}|${r.dist}`;
const histGroups = new Map();
for (const r of hist) { const k = histKey(r); if (!histGroups.has(k)) histGroups.set(k, { r, ys: [] }); histGroups.get(k).ys.push(r.from); }
for (const { r, ys } of histGroups.values()) L.push('| ' + [r.name, r.grade, r.country, r.surface, r.dist, ys.sort().join('・')].map(cell).join(' | ') + ' |');
L.push('');

// 最近まで番組にあって2025年に無いもの（名前で見る）
const liveNames = new Set(races.flatMap(r => [r.name, r.short]));
const gone = new Map();
for (const r of HS.DATA.races) {
  if (live(r) || !r.to || r.to < 2015 || r.to >= ERA || liveNames.has(r.name) || liveNames.has(r.short)) continue;
  const g = gone.get(r.name);
  if (!g || g.to < r.to) gone.set(r.name, r);
}
L.push(`## 2015〜2024年まで番組にあって2025年に無いレース（${gone.size} 件）`, '');
L.push('名前が変わった・廃止された・格が外れたなどで、2025年の番組から消えたもの（同じ名前・略称が2025年にあるものは除く）。2025年にも重賞として行われているなら「追加」か「修正」で。', '');
L.push('| レース名 | 格 | 国 | 競馬場 | 芝ダ | 距離 | 最後の年 |', '|---|---|---|---|---|---|---|');
for (const r of [...gone.values()].sort((a, b) => (a.month - b.month) || (a.week - b.week)))
  L.push('| ' + [r.name, gradeOf(Object.assign({}, r, { year: r.to })), countryOf(r), r.course, r.surface, r.dist, r.to].map(cell).join(' | ') + ' |');
L.push('');

// 外の AI に貼る短い依頼の文
L.push('---', '');
L.push('## 依頼の文（Codex に貼る）', '');
L.push('```');
L.push('nakaba9696/horse-simulation の docs/review/RACE_SELECT_CHECK.md を読み、その「見てほしいこと」に答えてください。');
L.push('一覧はゲームの重賞の番組（2025年の形）です。入れたほうがよい重賞・外したほうがよい重賞・2025年の実際と違うデータ（格・競馬場・芝ダート・距離・時期・年齢・性・賞金）・時期や距離の偏りを見てください。');
L.push('作り手の洗い出し docs/review/RACE_SELECT_FINDINGS.md も読み、同意・不同意・足りない所を書いてください。');
L.push('事実には出典の URL（JRA・各国の主催者・英語版 Wikipedia など）を付け、確かめられないものは「未確認」と書いてください。');
L.push('結果は「答え方」の表の形で docs/review/codex/RACE_SELECT_REVIEW.md に書き、枝 codex/race-select-review に push してください。');
L.push('番組のデータ（data/*.js）は直さないでください（決めるのは作者）。');
L.push('```', '');

fs.writeFileSync(OUT, L.join('\n'));
console.log(`${path.relative(ROOT, OUT)}：残す ${nKeep}・外す ${nOut}・全 ${rows.length}／記録だけ ${histGroups.size}／2025年に無い ${gone.size}`);
