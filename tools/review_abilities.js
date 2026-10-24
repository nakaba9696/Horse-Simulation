// 名馬の総合力の下の能力（根性・気性・坂・健康・切れ・脚質・距離・馬場の適性・成長型・癖）を、世間の認識と比べるための一覧に書き出す
// （持ち主の決定 2026-10-24「Codexとまたレビューしあいながら世間の認識と乖離がないようにしたい」。docs/review/PENDING.md の E2）
// 出力：docs/review/abilities.csv（名馬＝画面の総合力 65.0 以上・名鑑のある馬・G1 を3つ以上勝った馬。ゲームの中で使う値）
//   node tools/review_abilities.js
// 列の「出どころ」は、その値が手で決めたもの（手）か、実績の強さ・戦績・脚質から自動で出したもの（自動）か。
// 列の「名鑑の手がかり」は、名鑑・名馬の解説・メモの文から拾った言葉（気性・出遅れ・道悪・故障・晩成・逃げ・追込など）で、
// 「見どころ」はその言葉といまの値が食い違っていそうな所（機械で拾った目安。最後は人が文と出典で確かめる）。
const fs = require('fs'), path = require('path');
const { load, ROOT } = require('../tests/load.js');

// 文から拾う手がかり（名前・正規表現）。拾うのは目安で、否定（「掛かることもなく」など）も拾う
const CUES = [
  ['気性', /気性|癇|気難し|気の悪|激しい気|荒い/],
  ['掛かる', /掛か|かか(り|って|る)|折り合いを欠|折り合いに苦|行きたが|引っ掛/],
  ['出遅れ', /出遅れ|出負け|立ち遅|ゲートで|ゲートを嫌|発馬で/],
  ['ソラ', /ソラを使|気を抜/],
  ['道悪', /道悪|重馬場|不良馬場|不良の|重の|ぬかるみ|heavy|soft ground/i],
  ['坂', /坂/],
  ['故障', /骨折|屈腱炎|繋靭帯|脚部不安|故障|裂蹄|球節|靭帯/],
  ['丈夫', /鉄の|丈夫|頑健|頑丈|タフ/],
  ['晩成', /晩成|遅咲き/],
  ['早熟', /早熟/],
  ['逃げ', /逃げ(切|て|た|の|馬|る|に)|ハナを|先頭に立って逃|大逃げ|逃げ一/],
  ['追込', /追い込|追込|最後方|最後尾|しんがり/],
  ['切れ', /切れ|末脚|瞬発/],
  ['長く脚', /長く(良い|いい)?脚|ロングスパート|捲|まくり|早めに動|バテな/],
];

function build() {
  const HS = load();
  HS.U.ERA = HS.Eraless.ERA;
  const D = HS.DATA, H = HS.Horse, T = HS.Season, K = HS.Skills, SP = HS.Special, E = HS.Eraless;
  const trophyOf = new Map();
  for (const xs of Object.values(D.trophyHorses || {})) for (const x of xs) trophyOf.set(x.name, true);
  const special = new Set(SP.list().map(x => x.name));
  const dataOf = n => SP.data(n) || D.historic.find(d => d.name === n) || null;
  const names = [...new Set(D.historic.filter(E.isPool).map(d => d.name).concat([...special], [...trophyOf.keys()]))];
  const famous = new Map((D.famous || []).map(f => [f.name, f]));
  const profile = new Map((D.profiles || []).map(p => [p.name, p]));
  const fix = D.horseFix || {}, mud = D.mudFix || {}, styleFix = D.styleFix || {};
  const r1 = v => v == null ? '' : Math.round(v * 10) / 10;
  const raceAt = w => { const y = +w.slice(0, 4), n = w.slice(4); return (D.races || []).find(r => r.name === n && r.from <= y && y <= (r.to || 9999)); };
  // 暦に無い年の勝ち鞍は、史実の勝ち鞍の記録のためのレース（data/hist_races.js。読み込みの距離の広げもこちらを見る）
  const histAt = w => { const y = +w.slice(0, 4), n = w.slice(4); return (D.histRaces || []).find(r => r.name === n && r.from <= y && y <= (r.to || 9999)); };
  const g1 = d => (d.wins || []).map(raceAt).filter(r => r && r.grade === 'G1');
  const rows = [];
  for (const n of names) {
    const d = dataOf(n); if (!d) continue;
    const h = H.fromHistoric(d, 'review'), f = T.fhShowPeak(h), p = h.pot;
    const top = Math.max(f.turf, f.dirt);
    const ws = g1(d), main = (d.mainWins || []).filter(x => !/着/.test(x));
    if (!(top >= 65 || profile.has(n) || ws.length >= 3)) continue;
    // 自動の値（実績の強さから。根性・気性・坂の比べの物差し）：手で決めた馬との差を見る
    const fx = fix[n] || {}, own = /持ち主/.test(fx.why || '');
    const potHand = k => d.pot && d.pot[k] != null;
    const src = {
      guts: potHand('guts') ? '手' : '自動', mind: potHand('mind') ? '手' : (h.skills.includes('kakari') || h.skills.includes('deokure')) ? '自動・癖で下げ' : '自動', slope: potHand('slope') ? '手' : '自動',
      health: d.health != null ? '手' : '自動（戦数）', kire: d.kire != null ? '手' : '自動（脚質）',
      style: styleFix[n] || fx.style ? '手（見直し）' : d.auto ? '自動（引き）' : '手',
      heavy: mud[n] ? '手（道悪の表）' : d.heavy != null ? '手' : h.skills.includes('mud') ? '手（道悪○）' : '自動',
      growth: d.auto ? '自動' : '手',
    };
    const text = [(profile.get(n) || {}).text, (famous.get(n) || {}).text, d.note].filter(Boolean).join(' ');
    const cue = CUES.filter(([, re]) => re.test(text)).map(([k]) => k);
    const has = id => h.skills.includes(id);
    const look = [];
    if ((cue.includes('気性') || cue.includes('掛かる')) && !has('kakari') && !has('deokure') && !has('sora') && src.mind === '自動') look.push('気性の言葉があるのに癖が無い');
    if (cue.includes('出遅れ') && !has('deokure')) look.push('出遅れの言葉があるのに出遅れ癖が無い');
    if (cue.includes('道悪') && src.heavy === '自動') look.push('道悪の言葉があるのに道悪の向きがふつう');
    if (cue.includes('故障') && h.health >= 75 && src.health !== '手') look.push('故障の言葉があるのに健康がふつう以上');
    if (cue.includes('晩成') && /早/.test(h.growth)) look.push('晩成の言葉があるのに早い成長型');
    if (cue.includes('早熟') && /晩|持続|遅/.test(h.growth)) look.push('早熟の言葉があるのに遅い成長型');
    if (cue.includes('逃げ') && !cue.includes('追込') && h.style !== '逃げ' && h.style !== '先行') look.push('逃げの言葉があるのに' + h.style);
    if (cue.includes('追込') && !cue.includes('逃げ') && (h.style === '逃げ' || h.style === '先行')) look.push('追込の言葉があるのに' + h.style);
    if (src.style === '自動（引き）' && (ws.length >= 2 || profile.has(n))) look.push('脚質が引きのまま');
    // 距離：勝った重賞（2歳戦を除く。暦に無ければ data/hist_races.js）の距離が、得意な距離の幅から 400m 以上外れている（G1 は読み込みで幅に入るので、G2・G3 で外れる馬）
    const ds = (d.wins || []).map(w => raceAt(w) || histAt(w)).filter(r => r && r.dist && r.age !== '2' && /^G[123]$/.test(r.grade)).map(r => r.dist);
    if (ds.length && Math.max(...ds) - h.distMax >= 400) look.push(`勝った重賞（${Math.max(...ds)}m）が距離の幅より長い`);
    if (ds.length && h.distMin - Math.min(...ds) >= 400) look.push(`勝った重賞（${Math.min(...ds)}m）が距離の幅より短い`);
    const kind = trophyOf.has(n) ? (special.has(n) ? 'スペシャル＋隠し馬' : '隠し馬') : special.has(n) ? 'スペシャルホース' : '史実馬（毎年デビュー）';
    rows.push({ top, row: [kind, n, d.nameEn || '', d.born, d.country || '日', d.sex, f.turf, f.dirt,
      r1(p.guts), src.guts, r1(p.mind), src.mind, r1(p.slope), src.slope, r1(h.health), src.health, h.kire, src.kire,
      H.styleText(h), src.style, `${h.distMin}-${h.distMax}`, r1(h.apt.turf), r1(h.apt.dirt), r1(h.apt.heavy), src.heavy, h.growth, src.growth,
      H.shownSkills(h).map(K.label).join('・'), K.of(h).map(K.label).join('・'),
      d.record || '', ws.length, (main.length ? main : (((D.mainWinsWorld || {})[n] || {}).ja || [])).join('・'),
      own ? '○' : '', cue.join('・'), look.join('・')] });
  }
  rows.sort((a, b) => b.top - a.top || a.row[1].localeCompare(b.row[1], 'ja'));
  return rows.map(x => x.row);
}

const HEAD = ['区分', '名前', '英名', '生年', '国', '性', '芝の総合力', 'ダートの総合力',
  '根性', '根性の出どころ', '気性', '気性の出どころ', '坂', '坂の出どころ', '健康', '健康の出どころ', '切れ', '切れの出どころ',
  '脚質', '脚質の出どころ', '距離', '芝の適性', 'ダートの適性', '重馬場の適性', '重馬場の出どころ', '成長型', '成長型の出どころ',
  '特殊能力', '発動する特殊能力', '戦績', 'G1の勝ち数（番組にある分）', '主な勝鞍', '持ち主が決めた総合力', '名鑑の手がかり', '見どころ'];

if (require.main === module) {
  const body = build();
  const esc = s => /[",\n]/.test(String(s)) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s);
  const out = path.join(ROOT, 'docs', 'review', 'abilities.csv');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, '﻿' + [HEAD].concat(body).map(r => r.map(esc).join(',')).join('\n') + '\n');
  const flagged = body.filter(r => r[HEAD.length - 1]).length;
  console.log(`docs/review/abilities.csv：${body.length}頭（見どころのある馬 ${flagged}頭）`);
}
module.exports = { build, HEAD, CUES };
