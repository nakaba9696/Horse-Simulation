// 馬主の会話の下書きを、持ち主が読んで直せる一覧（docs/OWNERS_DRAFT.md）に書き出す。中身は data/owners.js（生成物。手で直さない）
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
  dakota: '新しく入れた。絵は無い（候補は下の「顔の絵」）',
  violaine: '新しく入れた（持ち主の指定）。絵は trpg-game の violaine',
  farina: '新しく入れた（持ち主の指定）。絵は trpg-game の farina（前は鷺ノ宮さんに当てていた絵）',
};
const GENRE = { local: '地方系', sprint: '短距離系', classic: 'クラシック系', long: '長距離系', filly: '牝馬系', usa: '米系', europe: '欧州系', aus: '豪州系' };
const STAGE = ['OP', 'G3', 'G2', 'G1', 'お手馬'];
const SCENE = { offer: '依頼', paddock: 'パドック', win: '勝った', bigwin: 'G1 を勝った', good: '惜しい負け', lose: '負け', decline: '断られた' };
const SCENES2 = { meet: '出会い', m1: 'OP の課題をやり終えた', m2: 'G3 の課題をやり終えた', m3: 'G2 の課題をやり終えた（勝負服）', m4: 'G1 の課題をやり終えた', m5: 'お手馬の課題をやり終えた（最後・アイテム）', award: '名コンビ賞', ask: '店に馬を頼んだ' };

function build(HS) {
  const D = HS.DATA, O = HS.Owners;
  const all = D.owners;
  const active = all.filter(o => !o.retired);
  const out = [];
  const p = s => out.push(s);
  const q = s => String(s).replace(/\|/g, '｜');
  p('# 馬主（騎乗依頼をくれる人）の下書き');
  p('');
  p('`data/owners.js` から `node tools/owners_draft.js` で書き出した一覧（手で直さない）。会話はすべて下書きで、持ち主が読んで直す（仕様書 `docs/SPEC.md`「騎乗依頼」）。');
  p('直したい所は、この文書に書き込むか、そのまま伝えてくれれば `data/owners.js` に写す。`{me}` は騎手の名前、`{horse}` は馬名、`{race}` はレース名。台詞の頭の `[ダ]` などは「その場面のときだけ使う」印（ダ＝ダート・芝・短＝1400m まで・長＝2400m から・逃＝逃げ馬・差＝差し追込・牝＝牝馬・海＝海外）。');
  p('');
  p('## 仕組み（数は仮）');
  p('');
  p(`- 好感度（0〜100。画面では数は出さず帯で見せる）は、その人のジャンルのレースで勝つと上がる（自分の馬でも依頼の馬でも）。まだ会っていない人は2着・3着でも少し上がる。${O.MEET} たまると出会いの場面になり、次の週から依頼が来る。`);
  p('- 海外の人（米系・欧州系・豪州系）は「海外のレースに1度出た」印のあとで出会う（海外の解放の仕組みができたら差し替える）。');
  p('- 段階は OP → G3 → G2 → G1 → お手馬。段階ごとの課題をやり終えると、お礼のお金と好感度、会話の場面、次の段階へ。課題をやらずに次の段階へは上がらない。段階が上がるほど格の高いレース・強い馬の依頼が来る（G1 の段階から海外の G1 と、その人のいちばん強い馬）。');
  p(`- お礼（万円・1995年の物価）：${O.STAGES.map(s => `${s.label} ${s.money}`).join('・')}。G1 の段階になると、その人の勝負服を自分の馬に着せられる。`);
  p('- お手馬の段階の課題までやり終えると好感度がいっぱいになり、繁殖の永続のボーナスのアイテムをもらって、その人からの依頼は来なくなる。');
  p('- G3 の段階から、頼めば来月の馬の店にその人の好みの馬が並びやすくなる（牡馬・牝馬それぞれ3頭まで入れ替える）。');
  p('- 年末に、その年いちばん一緒に勝った人と「名コンビ賞」（3勝から）。');
  p('');
  p('## ジャンルと人');
  p('');
  p('| ジャンル | 人 | 人柄 | 好み | 出会いの条件 | 前の7人から | 最後のアイテム |');
  p('|---|---|---|---|---|---|---|');
  for (const o of active) p(`| ${GENRE[O.signOf(o)] || O.signLabel(o)} | ${o.name}（${o.age}歳・${q(o.title)}） | ${q(o.note)} | ${[O.signLabel(o)].concat(O.subLabels(o)).join('・')} | ${q(o.unlock.text)} | ${q(CAST[o.id] || '')} | ${o.item.name}（${o.item.text}） |`);
  p('');
  p('外した人（前のセーブのために `data/owners.js` に残す。依頼は来ない）：' + all.filter(o => o.retired).map(o => `${o.name}（${O.LIKE_LABEL[o.likes[0]] || ''}）`).join('・') + '。前のセーブで縁があっても依頼は来なくなる。着せていた勝負服はそのまま。');
  p('');
  p('### 段階ごとの課題');
  p('');
  p(`| 人 | ${STAGE.join(' | ')} |`);
  p(`|---|${STAGE.map(() => '---').join('|')}|`);
  for (const o of active) p(`| ${o.name} | ${o.missions.map(m => q(m.text)).join(' | ')} |`);
  p('');
  // GF を開いている一族の人（キンチェムモチーフ）
  const hd = D.gfHost;
  if (hd) {
    const HSC = { wait: '招待の前（GF の画面）', invite: '招待が届いた（招待状・GF の画面）', week: 'GF の週', win: '自分の馬が GF を勝った（出す所はまだ無い）', lose: '自分の馬が GF で負けた（出す所はまだ無い）', allclear: '全部の GF を勝ったとき（出す所はまだ無い）', kincsem: '全部勝ったあと、無敗の牝馬が出てくる GF（GF の画面）' };
    p('## GF を開いている一族の人（キンチェムモチーフ）');
    p('');
    p('持ち主の決定（2026-10-19・改め）「キンチェムモチーフのキャラは別キャラでお願いします。GF を開催してる一族の謎の人物にします。ナビゲータはナビゲータです」。データは `data/gfhost.js`。');
    p('');
    p('- 騎乗依頼の馬主とは別で、依頼はしない。GF の場面（招待・GF の週・全部勝ったあと）にだけ現れる。');
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
  p('持ち主の決定（2026-10-19）「顔の絵は新規作成でいいよ」。絵が無い人は、いまは「絵が無いときの顔」（`js/ui/ownerface.js` の SVG。Godot 版は `tools/owner_faces.js` が書き出した `godot/assets/owners/<id>_<表情>.svg`）。下の「見た目」は、持ち主が絵を描く・作るときの手がかり（表情は ふだん・ほほえみ・喜び・残念 の4つ）。');
  p('');
  p('| 人 | 絵 | 髪 | 目 | 服 | 小物 | ふだん | ほほえみ | 喜び | 残念 |');
  p('|---|---|---|---|---|---|---|---|---|---|');
  for (const o of active) { const l = o.look; p(`| ${o.name} | ${o.portrait ? '持ち主の絵あり' : '絵が無いときの顔'} | ${q(l.hair)} | ${q(l.eyes)} | ${q(l.clothes)} | ${q(l.items)} | ${q(l.moods.base)} | ${q(l.moods.smile)} | ${q(l.moods.joy)} | ${q(l.moods.sad)} |`); }
  p('');
  p('trpg-game（`assets/portraits/`）の絵で、米系（ダコタ・ベル）に合いそうなもの（決めるのは持ち主）：`bride`（マリエッタ。波打つ金髪・豪快に笑う・白い花の髪飾り。ただし鎧と大槌と眼帯）、`angelica`（アンジェリカ。蜂蜜色の髪・自信のある笑み・軍服）、`natalia`（ナタリア。酒好きでほろ酔いの笑い。表情の差分が無い）、`zerina`（ゼリナ。物怖じしない商人の娘。関西言葉の人）。どれも服が競馬場の人に見えないので、新しく作るほうがよさそう。GF の一族の人（花輪）に合う絵も trpg-game には無い（花輪をのせた人がいない。bride の白い花の髪飾りが近いだけ）。見た目は下の「GF を開いている一族の人」の節。');
  p('');
  // 人ごと
  for (const o of active) {
    p(`## ${o.name}（${GENRE[O.signOf(o)] || ''}）`);
    p('');
    p(`- 読み：${o.kana}・${o.age}歳・${o.title}`);
    p(`- 人柄：${o.note}`);
    p(`- 口調：一人称「${o.voice.me}」・呼び方「${o.voice.you}」・語尾 ${o.voice.end}・言わないこと：${o.voice.never.join('・')}`);
    p(`- 好み：${[O.signLabel(o)].concat(O.subLabels(o)).join('・')}${o.only ? `（${O.LIKE_LABEL[o.only]}の馬しか持たない）` : ''}`);
    p(`- 出会いの条件：${o.unlock.text}${o.gate ? `（${O.GATE_LABEL[o.gate] || o.gate}）` : ''}。まだ会っていないときのヒント「${o.unlock.hint}」`);
    p(`- 最後のアイテム：${o.item.name}（${o.item.text}）`);
    p(`- 初めのあいさつ：「${o.intro}」`);
    p('');
    p('| 段階 | 課題 | 頼むときのひと言 |');
    p('|---|---|---|');
    o.missions.forEach((m, i) => p(`| ${STAGE[i]} | ${q(m.text)} | 「${q(m.say)}」 |`));
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
