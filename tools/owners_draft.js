// オーナーの会話の下書きとミッション（依頼の馬とレース）を、持ち主が読んで直せる一覧（docs/OWNERS_DRAFT.md）に書き出す。中身は data/owners.js（生成物。手で直さない）
//   node tools/owners_draft.js          # 書き出す
//   node tools/owners_draft.js --check  # 書き出し済みのものが data/owners.js と同じか
// 直すときは data/owners.js を直してから、これを回す。tests/extra_owners.js が一致を確かめる
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'docs', 'OWNERS_DRAFT.md');

// ジャンルと人の対応（前の7人からどう変えたか）
const CAST = {
  makino: '前の7人から。人柄を仕様書に寄せた（元気な牧場の娘 → 面倒見のいい姐御肌の長女。26歳に）。ジャンルをダート → 地方・ダートに',
  sengoku: '前の7人から。そのまま（補いの「アメリカ好き」は米系の人に渡した）',
  yuni: '新しく入れた（秘書。持ち主の指定）。ふつうの優秀なナビゲーター兼クラシック系の依頼主。絵は別のセッションでメイドの絵を作っている途中なので、いまは絵が無いときの顔',
  takenouchi: '前の7人から。人柄を仕様書に寄せた（やさしいご隠居 → 穏やかに人を試す老獪なご隠居）',
  takarada: '前の7人から。そのまま',
  lucy: '新しく入れた（2026-10-20。ダコタ・ベルに代えた。持ち主のメモ「お姉さん系が多いので外して、金髪の少女にしたい」）。名前・年齢・人柄は案。台詞は仮。絵は無い',
  violaine: '新しく入れた（持ち主の指定）。絵は trpg-game の violaine',
  farina: '新しく入れた（持ち主の指定）。絵は trpg-game の farina（前は鷺ノ宮さんに当てていた絵）',
};
const GENRE = { local: '地方系', sprint: '短距離系', classic: 'クラシック系', long: '長距離系', filly: '牝馬系', usa: '米系', europe: '欧州系', aus: '豪州系' };
const STAGE = ['OP', 'G3', 'G2', 'G1', 'お手馬'];
const SCENE = { offer: '依頼（やり直しの依頼が来たとき）', paddock: 'パドック', win: '勝った', bigwin: 'G1 を勝った', good: '惜しい負け', lose: '負け', decline: '見送られた' };
const SCENES2 = { meet: '出会い', m1: 'OP のミッションをやり終えた', m2: 'G3 のミッションをやり終えた', m3: 'G2 のミッションをやり終えた（勝負服）', m4: 'G1 のミッションをやり終えた', m5: 'お手馬のミッションをやり終えた（最後・アイテム）', award: '名コンビ賞', ask: '店に馬を頼んだ' };
// ミッションのレースの説明（格・競馬場・距離・条件・時期）
const raceNote = (O, name) => {
  const d = O.raceData(name); if (!d) return name;
  const age = { 2: '2歳', 3: '3歳', '3+': '3歳以上', '4+': '4歳以上' }[d.age] || '';
  const where = d.region === '海外' ? `${d.course}（${d.country || '海外'}）` : d.region === '地方' ? `${d.course}（地方）` : d.course;
  return `${d.grade || (d.listed ? 'L' : 'OP')}・${where} ${d.surface === 'ダ' ? 'ダート' : '芝'}${d.dist}m・${age}${d.sex === '牝' ? '牝馬' : ''}・${d.month}月${d.week}週`;
};
// 史実か、たらればか（たらればなら史実はどうだったか）
const factNote = (O, o, k) => { const f = O.missionFact(o, k); return !f ? '' : f.ifs ? `たられば：${f.real}` : `史実：${f.year}年`; };
const horseNote = (D, m) => {
  const d = (D.historic || []).find(x => x.name === m.horse); if (!d) return m.horse;
  const won = (d.wins || []).filter(w => w.slice(4) === m.race || w.slice(4).startsWith(m.race)).map(w => w.slice(0, 4));
  const sp = HS_.Special && HS_.Special.data(m.horse) ? '。スペシャルホース' : '';
  return `${m.horse}（${d.born}年生・${d.sex}。${m.age}歳で走る${won.length ? `。史実では${won.join('・')}年に勝った` : ''}${sp}）`;
};

let HS_ = {};
function build(HS) {
  HS_ = HS;
  const D = HS.DATA, O = HS.Owners;
  const all = D.owners;
  const active = all.filter(o => !o.retired);
  const out = [];
  const p = s => out.push(s);
  const q = s => String(s).replace(/\|/g, '｜');
  p('# オーナー（騎乗依頼をくれる人）の下書き');
  p('');
  p('`data/owners.js` から `node tools/owners_draft.js` で書き出した一覧（手で直さない）。会話とミッション（依頼の馬とレース）はすべて下書きで、持ち主が読んで直す（仕様書 `docs/SPEC.md`「騎乗依頼」「持ち主の決定（2026-10-20・オーナーの依頼）」）。');
  p('直したい所は、この文書に書き込むか、そのまま伝えてくれれば `data/owners.js` に写す。`{me}` は騎手の名前、`{horse}` は馬名、`{race}` はレース名。台詞の頭の `[ダ]` などは「その場面のときだけ使う」印（ダ＝ダート・芝・短＝1400m まで・長＝2400m から・逃＝逃げ馬・差＝差し追込・牝＝牝馬・海＝海外）。');
  p('');
  p('## 仕組み（数は仮）');
  p('');
  p(`- 出会いの点：その人のジャンルのレースを自分が乗って勝つと、点がたまる（${O.POINT_TEXT}）。出会いの場面は次の週の頭に出る。友好度（画面では数は出さず帯で見せる）は出会いのあとの仲の良さで、ミッションをやり終えるたびに上がる。`);
  p('- 海外の人（米系・欧州系・豪州系）は「海外のレースに1度出た」印のあとで出会う（海外の解放の仕組みができたら差し替える）。');
  p(`- 依頼はミッション形式：段階は OP → G3 → G2 → G1 → お手馬。OP〜G1 は「依頼の馬」と「レース」が決まっている（下の表）。レースの${O.LEAD}週前に依頼が届き（場面）、依頼の馬がその人の馬として世界に出る。レースの週は依頼の馬に自分が乗る。勝てばクリアで、お礼のお金と友好度、会話の場面、次の段階のミッション（次のレースが近づいたら届く）。`);
  p('- 負けた・見送ったときは、次の年の同じレースでもう一度（同じ馬。年齢や引退で出られなければ、出られる年齢で出し直す）。自分の馬が同じレースに出る予定なら、依頼が先で自分の馬の出走は取り消す。自分の馬に乗るなら、その年の依頼は見送り。');
  p('- 依頼の馬は、まだやり終えていないミッションのあいだ、ふだんのデビューと馬の店には出てこない。');
  p(`- お礼（万円・1995年の物価）：${O.STAGES.map(s => `${s.label} ${s.money}`).join('・')}。G1 の段階になると、その人の勝負服を自分の馬に着せられる。`);
  p('- お手馬の段階のミッション（自分の馬で）までやり終えると友好度がいっぱいになり、繁殖の永続のボーナスのアイテムをもらって、その人からの依頼は来なくなる。');
  p('- G3 の段階から、頼めば来月の馬の店にその人の好みの馬が並びやすくなる（牡馬・牝馬それぞれ3頭まで入れ替える）。');
  p(`- 年末に、その年いちばん一緒に勝った人と「名コンビ賞」（${O.AWARD_MIN}勝から）。`);
  p('');
  p('## ジャンルと人');
  p('');
  p('| ジャンル | 人 | 人柄 | 好み | 出会いの条件 | 前の7人から | 最後のアイテム |');
  p('|---|---|---|---|---|---|---|');
  for (const o of active) p(`| ${GENRE[O.signOf(o)] || O.signLabel(o)} | ${o.name}（${o.age}歳・${q(o.title)}） | ${q(o.note)} | ${[O.signLabel(o)].concat(O.subLabels(o)).join('・')} | ${q(o.unlock.text)} | ${q(CAST[o.id] || '')} | ${o.item.name}（${o.item.text}。${q(o.item.from || '')}） |`);
  p('');
  p('外した人（前のセーブのために `data/owners.js` に残す。依頼は来ない）：' + all.filter(o => o.retired).map(o => `${o.name}（${O.LIKE_LABEL[o.likes[0]] || ''}）`).join('・') + '。前のセーブで縁があっても依頼は来なくなる。着せていた勝負服はそのまま。');
  p('');
  p('### 段階ごとのミッション（依頼の馬とレース）');
  p('');
  p(`| 人 | ${STAGE.join(' | ')} |`);
  p(`|---|${STAGE.map(() => '---').join('|')}|`);
  for (const o of active) p(`| ${o.name} | ${o.missions.map((m, k) => k < O.JOBS ? `${q(m.horse)}（${m.age}歳）で${q(O.raceLabel(m.race))}（${factNote(O, o, k)}）` : q(m.text)).join(' | ')} |`);
  p('');
  p('持ち主の決定（2026-10-20）「ミッションは史実に基づいて選びたい　たられば系もいれたい　ミホノブルボンの菊花賞とか」。史実＝その馬が史実で勝ったレース、たられば＝史実では勝てなかった（惜敗・出なかった）レース。依頼の場面とオーナーの画面（Godot 版）に「史実」「たられば」の印を出す。');
  p('ハイセイコー・メジロティターンはスペシャルホース（1989年より前に走り終えた名馬）。ミッションをやり終えるまでと、依頼で出た馬が走っているあいだは、スペシャルホースとしてレースに出てこない（同じ馬が2頭にならない）。');
  p('');
  p('レースの中身（格・競馬場・距離・条件・時期）は人ごとの節。OP の段階のレースは名前のあるオープン（`data/owner_races.js`。実在の JRA のオープン・リステッド）で、ミッションのために番組に足した。');
  p('');
  // GF を開いている一族の人（キンチェムモチーフ）
  const hd = D.gfHost;
  if (hd) {
    const HSC = { wait: '招待の前（GF の画面）', invite: '招待が届いた（招待状・GF の画面）', week: 'GF の週', win: '自分の馬が GF を勝った（出す所はまだ無い）', lose: '自分の馬が GF で負けた（出す所はまだ無い）', allclear: '全部の GF を勝ったとき（出す所はまだ無い）', kincsem: '全部勝ったあと、無敗の牝馬が出てくる GF（GF の画面）', wreath: 'GF を全制覇したとき（花輪とアイテム。場面）' };
    p('## GF を開いている一族の人（キンチェムモチーフ）');
    p('');
    p('持ち主の決定（2026-10-19・改め）「キンチェムモチーフのキャラは別キャラでお願いします。GF を開催してる一族の謎の人物にします。ナビゲータはナビゲータです」。データは `data/gfhost.js`。');
    p('');
    p('- 騎乗依頼のオーナーとは別で、依頼はしない。GF の場面（招待・GF の週・全部勝ったあと）にだけ現れる。');
    if (hd.item) p(`- アイテム：GF を全制覇したとき（6つの GF のトロフィーがそろったとき。年も馬も別でよい）、花輪をもう一つ渡す場面で「${hd.item.name}」（${hd.item.text}）を渡す（持ち主の決定 2026-10-20「生産可能数＋1はイロナのアイテム」「GF 全制覇でもらう」）。`);
    p('- キンチェム本人ではない。名前や設定で「キンチェムそのもの」「馬の化身」とは書かない。キンチェムを思わせるモチーフで描く：花輪（勝った馬にかける）・栗色の髪・ハンガリー・無敗の牝馬の言い伝え・汽車の旅・黒い猫・「わたしの宝もの」（キンチェムはハンガリーの言葉で「わたしの宝もの」）。');
    p('- 一族の名と、本人の年・正体は明かさない（謎の人物のまま）。');
    p('- いま画面に出る所：Godot 版の GF の画面の右上（顔とひと言。場面は招待の前・招待・GF の週・全部勝ったあと）、JS 版の招待状。勝った・負けた・全部勝ったときの場面は、GF の結果の場面ができたら使う（GF の係と相談）。');
    p('');
    p(`- 名前：${hd.name}（${hd.kana}）・${hd.title}・年：${hd.age}`);
    p(`- 人柄：${hd.note}`);
    p(`- 口調：一人称「${hd.voice.me}」・呼び方「${hd.voice.you}」・語尾 ${hd.voice.end}・言わないこと：${hd.voice.never.join('・')}`);
    p(`- 見た目（絵を描く手がかり）：髪 ${hd.look.hair}・目 ${hd.look.eyes}・服 ${hd.look.clothes}・小物 ${hd.look.items}。表情：ふだん ${hd.look.moods.base}・ほほえみ ${hd.look.moods.smile}・喜び ${hd.look.moods.joy}・残念 ${hd.look.moods.sad}`);
    p(`- 初めのあいさつ：「${hd.intro}」`);
    p('');
    p('場面のひと言：');
    p('');
    for (const k of Object.keys(HSC)) {
      const ls = (hd.lines || {})[k] || [];
      if (!ls.length) continue;
      p(`- ${HSC[k]}`);
      for (const t of ls) p(`  - 「${t}」`);
    }
    p('- ときどき混ぜる一言（モチーフ）');
    for (const t of hd.hints || []) p(`  - 「${t}」`);
    p('');
  }
  // 顔の絵
  p('## 顔の絵');
  p('');
  p('持ち主の決定（2026-10-19）「顔の絵は新規作成でいいよ」。絵が無い人は、絵ができるまで顔を出さない（名前とその人の色の帯だけ。コードで描いた顔は作らない。持ち主の指示 2026-10-20）。下の「見た目」は、持ち主が絵を描く・作るときの手がかり（表情は ふだん・ほほえみ・喜び・残念 の4つ）。');
  p('');
  p('| 人 | 絵 | 髪 | 目 | 服 | 小物 | ふだん | ほほえみ | 喜び | 残念 |');
  p('|---|---|---|---|---|---|---|---|---|---|');
  for (const o of active) { const l = o.look; p(`| ${o.name} | ${o.portrait ? '持ち主の絵あり' : '絵が無いときの顔'} | ${q(l.hair)} | ${q(l.eyes)} | ${q(l.clothes)} | ${q(l.items)} | ${q(l.moods.base)} | ${q(l.moods.smile)} | ${q(l.moods.joy)} | ${q(l.moods.sad)} |`); }
  p('');
  p('米系は金髪の少女（ルーシー・ハーランド。案）に代えた。絵はまだ無い。');
  p('（前の版のメモ）trpg-game（`assets/portraits/`）の絵で、米系（ダコタ・ベル）に合いそうなもの（決めるのは持ち主）：`bride`（マリエッタ。波打つ金髪・豪快に笑う・白い花の髪飾り。ただし鎧と大槌と眼帯）、`angelica`（アンジェリカ。蜂蜜色の髪・自信のある笑み・軍服）、`natalia`（ナタリア。酒好きでほろ酔いの笑い。表情の差分が無い）、`zerina`（ゼリナ。物怖じしない商人の娘。関西言葉の人）。どれも服が競馬場の人に見えないので、新しく作るほうがよさそう。GF の一族の人（花輪）に合う絵も trpg-game には無い（花輪をのせた人がいない。bride の白い花の髪飾りが近いだけ）。見た目は下の「GF を開いている一族の人」の節。');
  p('');
  // 人ごと
  for (const o of active) {
    p(`## ${o.name}（${GENRE[O.signOf(o)] || ''}）`);
    p('');
    p(`- 読み：${o.kana}・${o.age}歳・${o.title}`);
    p(`- 人柄：${o.note}`);
    if (o.attr) p(`- 属性（絵の目安。文には出さない）：${o.attr}`);
    if (o.core) p(`- ストーリーの芯：${o.core}`);
    p(`- 口調：一人称「${o.voice.me}」・呼び方「${o.voice.you}」・語尾 ${o.voice.end}・言わないこと：${o.voice.never.join('・')}`);
    p(`- 好み：${[O.signLabel(o)].concat(O.subLabels(o)).join('・')}${o.only ? `（${O.LIKE_LABEL[o.only]}の馬しか持たない）` : ''}`);
    p(`- 出会いの条件：${o.unlock.text}${o.gate ? `（${O.GATE_LABEL[o.gate] || o.gate}）` : ''}。まだ会っていないときのヒント「${o.unlock.hint}」`);
    p(`- 最後のアイテム：${o.item.name}（${o.item.text}）。由来：${o.item.from || ''}`);
    p(`- 初めのあいさつ：「${o.intro}」`);
    p('');
    p('| 段階 | 依頼の馬 | レース | 史実／たられば | 頼むときのひと言（仮） |');
    p('|---|---|---|---|---|');
    o.missions.forEach((m, i) => i < O.JOBS
      ? p(`| ${STAGE[i]} | ${q(horseNote(D, m))} | ${q(O.raceLabel(m.race))}（${q(raceNote(O, m.race))}） | ${q(factNote(O, o, i))} | 「${q(m.say)}」 |`)
      : p(`| ${STAGE[i]} | 自分の馬 | ${q(m.text)} | — | 「${q(m.say)}」 |`));
    p('');
    p('場面の会話：');
    p('');
    for (const k of Object.keys(SCENES2)) {
      const ls = (o.scenes || {})[k] || [];
      if (!ls.length) continue;
      p(`- ${SCENES2[k]}`);
      for (const t of ls) p(`  - 「${t}」`);
    }
    p('');
    p('ひと言（OP・G3 の段階／G2 の段階から）：');
    p('');
    for (const k of Object.keys(SCENE)) {
      const sc = o.lines[k] || {};
      p(`- ${SCENE[k]}`);
      for (const t of sc.near || []) p(`  - 「${t}」`);
      for (const t of sc.close || []) p(`  - （G2 から）「${t}」`);
    }
    p('');
  }
  return out.join('\n') + '\n';
}

if (require.main === module) {
  const { load } = require('../tests/load.js');
  const HS = load();
  const s = build(HS);
  if (process.argv.includes('--check')) {
    const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (now !== s) { console.error('docs/OWNERS_DRAFT.md が古い（node tools/owners_draft.js で書き直す）'); process.exit(1); }
    console.log('docs/OWNERS_DRAFT.md は最新');
  } else {
    fs.writeFileSync(OUT, s);
    console.log(`docs/OWNERS_DRAFT.md（${s.split('\n').length}行）`);
  }
}
module.exports = { build };
