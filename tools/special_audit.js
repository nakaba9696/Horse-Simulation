// スペシャルホースとトロフィーの隠し馬の総点検（持ち主 2026-10-20「全体的に評価点おかしい気がする　能力値、パラメータ、スキル有無のレビューが必要そう」）
// 1頭ごとに、いまの芝・ダートの総合力（いちばん良いとき）・能力・脚質・距離・特殊能力を出し、史実の実績と比べて筋の通らない所を挙げ、案を付ける。
// 出力：docs/SPECIAL_AUDIT.json（持ち主が採否を付ける。adopt: true/false）と docs/SPECIAL_AUDIT.md（人が読む）
// 案を当てる：node tools/special_audit_apply.js（adopt が true の案を data/horse_fix.js に書く）
// 手で書いた案と当てた直しは tools/special_audit_plan.js
//   node tools/special_audit.js
const fs = require('fs'), path = require('path');
const { load, ROOT } = require('../tests/load.js');
const PLAN = require('./special_audit_plan.js');
const HS = load();
HS.U.ERA = HS.Eraless.ERA;
const SP = HS.Special, H = HS.Horse, T = HS.Season, K = HS.Skills, U = HS.U;
const D = HS.DATA;

// ---------- 調べる馬：スペシャルホース全部と、トロフィーの隠し馬 ----------
const trophyOf = new Map();
for (const [id, xs] of Object.entries(D.trophyHorses || {})) for (const x of xs) { if (!trophyOf.has(x.name)) trophyOf.set(x.name, []); trophyOf.get(x.name).push(id); }
const trophyLabel = id => ((HS.Trophy.LIST.find(t => t.id === id)) || {}).label || id;
const names = [...new Set(SP.list().map(x => x.name).concat([...trophyOf.keys()]))];
const dataOf = n => SP.data(n) || D.historic.find(d => d.name === n) || null;

// どのファイルの馬か（直すときの手がかり）
const FILES = ['data/historic_1.js', 'data/historic_2.js', 'data/historic_old.js', 'data/historic_world.js', 'data/historic_auto.js', 'data/legends.js'];
const TXT = Object.fromEntries(FILES.map(f => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]));
const fileOf = n => FILES.find(f => TXT[f].includes(`name:'${n}'`) || TXT[f].includes(`"name":"${n}"`)) || '';

const EU = new Set(['英', '仏', '愛', '伊', '独', 'ハンガリー']);
const regionOf = d => { const c = d.country || '日'; return c === '日' ? (d.local ? '日本（地方）' : '日本') : (c === '米' || c === '加') ? '北米' : EU.has(c) ? '欧州' : c === '豪' ? '豪州' : c === '香港' ? '香港' : c; };
const BAD = ['deokure', 'kakari', 'sora'];
const label = id => K.label(id);

// 能力の乱れ（名前ごとの運）が無いときの総合力：rating から決まる素の値
const nominal = function (d, h) {
  const r = d.rating, longH = h.distMax >= 2400, sprint = h.distMax <= 1400;
  let spd = r + (sprint ? 3 : 0) + (h.style === '逃げ' ? 1 : 0), sta = r + (longH ? 3 : 0) - (sprint ? 6 : 0);
  spd = U.clamp(spd, 30, 106); sta = U.clamp(sta, 30, 106);
  if (d.tier === 'legend') { spd = U.clamp(spd * H.LEGEND_MUL, 30, 112); sta = U.clamp(sta * H.LEGEND_MUL, 30, 112); }
  return T.fhOf({ spd, sta }, '芝', h);
};
const build = (d, set) => { const x = Object.assign({}, d, set || {}); const h = H.fromHistoric(x, 'audit'); const f = T.fhPeak(h); return { h, f }; };
const mainSurf = f => f.dirt > f.turf ? 'dirt' : 'turf';
const SURF = { turf: '芝', dirt: 'ダ' };

// ---------- 1頭ずつ ----------
const planBy = new Map(PLAN.PLAN.map(p => [p.name, p]));
const fixedBy = new Map(PLAN.FIXED.map(p => [p.name, p]));
const rows = [];
for (const n of names) {
  const d = dataOf(n); if (!d) continue;
  const { h, f } = build(d);
  const main = mainSurf(f), fhMain = f[main];
  const nom = nominal(d, h);
  const big = SP.bigWins(d).length, unb = SP.unbeatenOf(d);
  const hand = Array.isArray(d.skills);
  const sp = SP.byName(n);
  const wr = H.winRaces(d);
  rows.push({
    d, h, f, main, fhMain, nom, noise: f[main] - nom, big, unb, hand, wr,
    out: {
      name: n, nameEn: d.nameEn || '', country: d.country || '日', region: regionOf(d), born: d.born, years: d.years || '', record: d.record || d.note || '',
      mainWins: (d.mainWins || (d.wins || []).map(w => w.slice(0, 4) + ' ' + w.slice(4))).slice(0, 8),
      file: fileOf(n), auto: !!d.auto, legend: d.tier === 'legend', local: d.local || '',
      groups: sp ? sp.groups : [], trophies: (trophyOf.get(n) || []).map(trophyLabel),
      data: { rating: d.rating, surface: d.surface || '芝', turf: d.turf != null ? d.turf : null, dirt: d.dirt != null ? d.dirt : null, distMin: h.distMin, distMax: h.distMax, style: h.style, growth: h.growth, kire: h.kire, pot: d.pot ? Object.assign({}, d.pot) : null },
      fh: { turf: f.turf, dirt: f.dirt }, fhNominal: nom, noise: f[main] - nom,
      pot: Object.fromEntries(H.STATS.map(k => [k, Math.round(h.pot[k])])),
      skills: { from: hand ? '手で決めた表' : '勝ち鞍からの見立てと運', list: H.shownSkills(h).map(label), ids: h.skills.slice() },
      triggers: K.of(h).map(label), unique: K.hasUnique(n) ? (K.UNIQUE_OF[n] || {}).label || '' : '',
      bigWins: big, unbeaten: unb,
      issues: [], fixed: null, proposal: null, adopt: null,
    },
  });
}

// ---------- 同格との比べ：大レースの勝ち数（いまの番組の G1 に当たる勝ち鞍）ごとのまん中 ----------
const bucket = b => b >= 5 ? '5+' : b >= 3 ? '3-4' : String(b);
const med = xs => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
const byBucket = {};
for (const r of rows) if (!r.out.legend) (byBucket[bucket(r.big)] = byBucket[bucket(r.big)] || []).push(r.fhMain);
const medBucket = Object.fromEntries(Object.entries(byBucket).map(([k, v]) => [k, med(v)]));

for (const r of rows) {
  const o = r.out, d = r.d, iss = (kind, text) => o.issues.push({ kind, text });
  // 走った馬場と総合力の向き
  const c = d.country || '日';
  if (d.local && (d.surface || '芝') === '芝' && d.dirt == null) iss('馬場', `地方（${d.local}）の馬なのに芝だけの馬になっていて、ダートが ${r.f.dirt}`);
  if ((c === '米' || c === '加') && d.born < 1990 && (d.surface || '芝') === '芝') iss('馬場', '米国の古い名馬なのに芝の馬になっている');
  if (EU.has(c) && d.surface === 'ダ') iss('馬場', '欧州の馬なのにダートの馬になっている');
  const tw = r.wr.filter(x => x.surface !== 'ダ').length, dw = r.wr.filter(x => x.surface === 'ダ').length;
  if (d.surface === '芝ダ' && d.turf == null && tw >= 2 && tw > dw * 2 && r.f.dirt > r.f.turf) iss('馬場', `勝ち鞍は芝 ${tw}・ダート ${dw} なのに、芝ダの決まり（芝85・ダート90）でダート（${r.f.dirt}）が芝（${r.f.turf}）より上`);
  // 能力の乱れ
  if (r.noise <= -3) iss('乱れ', `能力の乱れ（名前ごとの運）で、素の値（${r.nom}）より ${-r.noise} 低い`);
  if (r.noise >= 3) iss('乱れ', `能力の乱れ（名前ごとの運）で、素の値（${r.nom}）より ${r.noise} 高い`);
  // 帯
  if (o.legend && r.fhMain < 81) iss('帯', `伝説級なのに ${r.fhMain}（仕様書の神話の名馬級は 81〜85）`);
  if (!o.legend && r.fhMain > 80) iss('帯', `伝説級でないのに ${r.fhMain}（81 から上は伝説級）`);
  const m = medBucket[bucket(r.big)];
  if (!o.legend && r.big >= 2 && m != null && r.fhMain <= m - 4) iss('同格', `大レース ${r.big}勝の馬のまん中（${m}）より ${m - r.fhMain} 低い`);
  if (!o.legend && r.big <= 1 && m != null && r.fhMain >= m + 7) iss('同格', `大レース ${r.big}勝の馬のまん中（${m}）より ${r.fhMain - m} 高い`);
  if (!o.legend && r.fhMain < 66 && (r.unb >= 8 || o.trophies.length)) iss('帯', `${r.unb >= 8 ? '無敗の名馬' : 'トロフィーの隠し馬'}なのに ${r.fhMain}（G1 を何度も勝った名馬は 66〜80）`);
  // 特殊能力
  const great = r.big >= 3 || o.legend || r.unb >= 8;
  if (!r.hand && great && !r.h.skills.includes('big')) iss('能力', `大レースを${o.legend ? '勝ち続けた伝説級' : r.unb >= 8 ? `${r.unb}戦無敗で` : ` ${r.big}勝`}なのに「大舞台」が無い（暦で G1 になっていない昔のレースを数えないため）`);
  const bad = r.h.skills.filter(x => BAD.includes(x));
  if (!r.hand && bad.length && !PLAN.KEEP_BAD[o.name]) iss('能力', `運で付いた弱み（${bad.map(label).join('・')}）。史実の裏付けが無い`);
  if (!r.hand && bad.length && PLAN.KEEP_BAD[o.name]) iss('能力', `運で付いた弱み（${bad.map(label).join('・')}）は史実に合うので残す：${PLAN.KEEP_BAD[o.name]}`);
  if (o.auto) iss('脚質', '記録から自動で作った馬で、脚質は名前の運で決まっている（出典で確かめていない）');
  // 当てた直し
  if (fixedBy.has(o.name)) o.fixed = fixedBy.get(o.name);
}

// ---------- 案：手で書いた案（強さを目標の総合力に合わせる）と、特殊能力の決まった直し ----------
// 目標の総合力に届く値を探す。能力を手で決めた馬（データの pot にスピードとスタミナ）は、その2つを同じだけ上げ下げする。ほかは rating
const solveRating = (d, set, surf, target) => {
  let best = null;
  const tryOne = (s, key, cost) => {
    const { f } = build(d, Object.assign({}, set, s));
    const e = Math.abs(f[surf] - target);
    if (!best || e < best.e || (e === best.e && cost < best.cost)) best = { s, e, f, cost, key };
  };
  if (d.pot && d.pot.spd != null && d.pot.sta != null) {
    for (let x = -15; x <= 15; x++) tryOne({ pot: Object.assign({}, d.pot, { spd: U.clamp(d.pot.spd + x, 20, 106), sta: U.clamp(d.pot.sta + x, 20, 106) }) }, 'pot', Math.abs(x));
  } else {
    const cur = d.rating, lim = d.tier === 'legend' ? 106 : 100;
    for (let r = Math.max(60, cur - 20); r <= lim; r++) tryOne({ rating: r }, 'rating', Math.abs(r - cur));
  }
  return best;
};
for (const r of rows) {
  const o = r.out, d = r.d, p = planBy.get(o.name);
  const set = {}; const why = []; const src = [];
  let skills = null;
  if (!r.hand) {
    let sk = r.h.skills.slice();
    const great = r.big >= 3 || o.legend || r.unb >= 8;
    if (great && !sk.includes('big')) { sk.push('big'); why.push('大舞台を足す（大レースを何度も勝った名馬）'); }
    const bad = sk.filter(x => BAD.includes(x) && !PLAN.KEEP_BAD[o.name]);
    if (bad.length) { sk = sk.filter(x => !bad.includes(x)); why.push(`運で付いた${bad.map(label).join('・')}を外す`); }
    if (p && p.addSkills) for (const x of p.addSkills) if (!sk.includes(x)) { sk.push(x); }
    if (sk.join() !== r.h.skills.join()) skills = sk;
  } else if (p && p.addSkills) {
    const sk = r.h.skills.concat(p.addSkills.filter(x => !r.h.skills.includes(x)));
    if (sk.join() !== r.h.skills.join()) skills = sk;
  }
  if (skills) set.skills = skills;
  if (p && p.set) Object.assign(set, p.set);
  let target = null;
  if (p && p.target) {
    const surf = Object.keys(p.target)[0]; target = { surface: SURF[surf], value: p.target[surf] };
    const b = solveRating(d, set, surf, p.target[surf]);
    if (b.cost) Object.assign(set, b.s);
    if (b.e >= 2) why.push(`${b.key === 'rating' ? 'rating の上限（100）' : '能力の上限'}で目標に ${b.e} 届かない`);
    why.unshift(p.why); src.push(...(p.src || []));
  } else if (set.skills) {
    // 特殊能力を手で決めると、能力を作る運の並びが変わって総合力が少し動く。いまの総合力に戻る強さを探す
    const b = solveRating(d, set, r.main, r.fhMain);
    if (b.cost) { Object.assign(set, b.s); why.push(`特殊能力を決めると能力の運の並びが変わるので、いまの総合力（${r.fhMain}）に合わせて強さも直す`); }
  }
  if (!Object.keys(set).length) continue;
  const { f, h } = build(d, set);
  o.proposal = {
    set, target, fhAfter: { turf: f.turf, dirt: f.dirt },
    skillsAfter: set.skills ? H.shownSkills(h).map(label) : null,
    owner: !!(p && p.owner), why: why.join('。'), src,
  };
}

// ---------- 全体の片寄り ----------
const stat = xs => { const s = xs.slice().sort((a, b) => a - b); return s.length ? { n: s.length, min: s[0], med: s[Math.floor(s.length / 2)], max: s[s.length - 1] } : null; };
const regions = {};
for (const r of rows) if (!r.out.legend && r.big >= 3) (regions[r.out.region] = regions[r.out.region] || []).push(r.fhMain);
const noiseAll = rows.map(r => r.noise);
const sd = Math.sqrt(noiseAll.reduce((s, v) => s + v * v, 0) / noiseAll.length);
const surfMix = rows.filter(r => r.d.surface === '芝ダ');
const bias = {
  regionG1_3plus: Object.fromEntries(Object.entries(regions).map(([k, v]) => [k, stat(v)])),
  byBigWins: Object.fromEntries(Object.entries(byBucket).map(([k, v]) => [k, stat(v)])),
  noise: { sd: +sd.toFixed(2), low3: noiseAll.filter(v => v <= -3).length, high3: noiseAll.filter(v => v >= 3).length },
  surfMix: { n: surfMix.length, dirtAbove: surfMix.filter(r => r.f.dirt > r.f.turf).length },
};
const FORMULA = [
  { id: 'noise', title: '能力の乱れが総合力を ±3 ほど動かす', cause: `史実馬の能力は rating に名前ごとの運（スピード・スタミナに 標準偏差2、芝とダートを分けるときにさらに 1.5）を足して作る（js/core/horse.js の H.fromHistoric・H.splitSurface）。総合力はスピードとスタミナだけで決まるので、同じ rating でも総合力が上下する。この一覧の ${rows.length}頭で、素の値との差の標準偏差は ${bias.noise.sd}、3 以上低いのが ${bias.noise.low3}頭・3 以上高いのが ${bias.noise.high3}頭（プリティーポリー −5・バックパサー −3・トウショウボーイ −3 など）`, proposal: '案1（いまの案の作り方）：馬ごとの案で、目標の総合力に届く rating を探す（運はそのまま）。案2（式を直す）：スペシャルホース（と史実馬）のスピード・スタミナの運を小さく（標準偏差 2 → 0.7 など）。史実馬4771頭の総合力が動くので、目印の馬とテストを合わせ直す' },
  { id: 'surfmix', title: '芝ダの馬はいつもダートが上になる', cause: `芝ダの馬は芝 85・ダート 90 の向きで作る（H.fromHistoric の apt）ので、ダートの総合力が芝より 1〜2 高くなる。この一覧の芝ダ ${bias.surfMix.n}頭のうち ${bias.surfMix.dirtAbove}頭がダートが上。芝が本筋の馬（エクセラー・ハイセイコーなど）は向きが逆になる`, proposal: '案：芝ダの向きを勝ち鞍の馬場の数で決める（芝が多ければ芝 90・ダート 85）。いまは目立つ馬だけデータに turf/dirt を書いて直した' },
  { id: 'era', title: '昔の米国のダートの名馬と、地方・豪州の名馬の rating が低め', cause: `rating はデータのファイルごとに手で付けた値（自動で作った馬は勝ち鞍の格から）。いまの暦の G1 に当たる大レースを3勝以上した馬の総合力のまん中は ${Object.entries(bias.regionG1_3plus).map(([k, v]) => `${k} ${v.med}（${v.n}頭）`).join('・')} で、三冠馬のような馬は低くない。低いのは、勝った大競走（昔のハンデキャップの大競走・南関東の三冠など）がいまの暦の G1 に当たらない馬で、年度代表馬クラスでも rating が 83〜91 に置かれている（トムフール 86・ギャロレット 86・ネイティヴダンサー 90・コリン 91・ハツシバオー 83・サンオーイ 80）`, proposal: '案：馬ごとの案で上げる（式は変えない）' },
  { id: 'legend', title: '伝説級でも 81 に届かない馬がいる', cause: '伝説級は能力を 1.035 倍するだけなので、rating が 100 でないと 81 に届かない（グラディアトゥール 96 → 75・ザテトラーク 86 → 67）', proposal: '案1（いまの案）：その馬の rating を上げる。案2（式）：伝説級は総合力が 81 を下回らないように能力の下限を置く' },
  { id: 'big', title: '昔の名馬に「大舞台」が付かない', cause: '「大舞台」は暦で G1 になっているレースの勝ち数（3勝、または2勝で rating 95 以上）で付く（H.histSkills）。1984年より前の JRA の大レースや、昔の海外の大レースは暦で G1 になっていないので、三冠馬や無敗の名馬にも付かない', proposal: '案：名鑑のある名馬（手で決めた表の無い馬）で、大レースを3勝以上・伝説級・8戦以上無敗のどれかなら「大舞台」を足す（馬ごとの案に入れた）' },
  { id: 'bad', title: '無敗の名馬に運で弱みが付く', cause: '勝ち鞍から見えない癖は、名前ごとの運で 6% の馬に出遅れ・掛かり・ソラのどれかを付ける（H.histSkills）。ネアルコ（14戦無敗）に掛かり癖、オーモンド（16戦無敗）に出遅れ癖が付いている', proposal: '案：大レースを何度も勝った名馬・無敗の名馬からは、史実の裏付けのない弱みを外す（馬ごとの案に入れた）。史実に合うもの（クリフジの出遅れ）は残す' },
  { id: 'mid', title: 'マイル〜中距離の馬が少し損', cause: '能力を作るとき、短距離馬（距離の上限 1400m 以下）はスピード +3、長距離馬（上限 2400m 以上）はスタミナ +3 だが、その間の馬には何も無い。総合力にして 1 ほど低い', proposal: '小さいので式はそのまま（知らせだけ）' },
];

// ---------- 書き出し ----------
const horses = rows.map(r => r.out).sort((a, b) => (b.proposal ? 1 : 0) - (a.proposal ? 1 : 0) || (b.proposal && b.proposal.owner ? 1 : 0) - (a.proposal && a.proposal.owner ? 1 : 0) || Math.max(b.fh.turf, b.fh.dirt) - Math.max(a.fh.turf, a.fh.dirt));
// 前の採否を引き継ぐ（同じ案のままなら）
const OUT = path.join(ROOT, 'docs', 'SPECIAL_AUDIT.json');
try {
  const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const pb = new Map(prev.horses.map(x => [x.name, x]));
  for (const o of horses) { const x = pb.get(o.name); if (x && x.adopt != null && o.proposal && x.proposal && JSON.stringify(x.proposal.set) === JSON.stringify(o.proposal.set)) o.adopt = x.adopt; }
} catch (e) { /* はじめて */ }
const kinds = {};
for (const o of horses) for (const i of o.issues) kinds[i.kind] = (kinds[i.kind] || 0) + 1;
const json = {
  note: 'node tools/special_audit.js で作る。持ち主は proposal のある馬の adopt を true（採る）か false（採らない）にする。値を変えて採るときは adoptSet に {rating: 98} のように書く。node tools/special_audit_apply.js で data/horse_fix.js に書き込む',
  spec: '総合力の目安（docs/SPEC.md）：46〜50 OP・51〜55 G3・56〜60 G2・61〜65 G1・66〜80 G1 を何度も勝った名馬・81〜85 神話の名馬級（伝説級）・86〜99 オリジナルホースだけ。総合力（スピードとスタミナ）は実績の格に合わせ、個性と逆転の余地はほかの能力（根性・気性・切れ・坂など）と特殊能力で出す（持ち主 2026-10-20）。案は G1 を何度も勝った名馬を 66〜80、伝説級だけを 81〜85 に置いた',
  summary: { horses: horses.length, special: SP.list().length, trophyHorses: trophyOf.size, withIssues: horses.filter(o => o.issues.length).length, issues: kinds, proposals: horses.filter(o => o.proposal).length, ownerNamed: horses.filter(o => o.proposal && o.proposal.owner).length, fixed: horses.filter(o => o.fixed).length },
  bias, formula: FORMULA, horses,
};
fs.writeFileSync(OUT, JSON.stringify(json, null, 1) + '\n');

// 人が読む表
const L = [];
const fhs = o => `芝${o.fh.turf}・ダ${o.fh.dirt}`;
const fha = p => `芝${p.fhAfter.turf}・ダ${p.fhAfter.dirt}`;
const setText = (o, s) => Object.entries(s).map(([k, v]) => k === 'skills' ? `特殊能力 → ${(o.proposal.skillsAfter || []).join('・') || 'なし'}` : k === 'pot' ? `能力（手で決めた値）スピード ${o.data.pot.spd} → ${v.spd}・スタミナ ${o.data.pot.sta} → ${v.sta}` : `${k} ${o.data[k] != null ? o.data[k] : '—'} → ${v}`).join('、');
L.push('# スペシャルホースと隠し馬の総点検', '');
L.push('`node tools/special_audit.js` で作る（手で直さない）。持ち主が採否を付けるのは `docs/SPECIAL_AUDIT.json`（adopt）。採った案は `node tools/special_audit_apply.js` で `data/horse_fix.js` に入る。', '');
L.push(`調べた馬 ${json.summary.horses}頭（スペシャルホース ${json.summary.special}頭・トロフィーの隠し馬 ${json.summary.trophyHorses}頭。重なりあり）。問題のある馬 ${json.summary.withIssues}頭、問題 ${Object.entries(kinds).map(([k, v]) => `${k} ${v}`).join('・')}。案 ${json.summary.proposals}頭（持ち主の名指し ${json.summary.ownerNamed}頭）。当てた直し ${json.summary.fixed}頭。`, '');
L.push(json.spec, '');
L.push('総合力は「いちばん良いとき」の芝・ダート（`HS.Season.fhPeak`）。素の値＝能力の乱れ（名前ごとの運）が無いときの値。', '');
L.push('## 全体の片寄り（式・決まりの側の原因）', '');
for (const x of FORMULA) L.push(`### ${x.title}`, '', x.cause + '。', '', x.proposal + '。', '');
L.push('## 当てた直し（明らかな誤り）', '', '| 馬 | ファイル | 直したこと | 理由 | いまの総合力 |', '|---|---|---|---|---|');
for (const o of horses.filter(o => o.fixed)) L.push(`| ${o.name} | ${o.fixed.file} | ${o.fixed.change} | ${o.fixed.why} | ${fhs(o)} |`);
L.push('');
L.push('## 案（持ち主が選ぶ）', '', '★＝持ち主が名指しした馬。強さの案は、目標の総合力に届く rating を道具が探した値。', '', '| 馬 | 国・生年 | 主な勝鞍 | いま | 案のあと | 変える値 | 理由 |', '|---|---|---|---|---|---|---|');
for (const o of horses.filter(o => o.proposal)) {
  const p = o.proposal;
  L.push(`| ${p.owner ? '★' : ''}${o.name} | ${o.country}・${o.born} | ${o.mainWins.slice(0, 4).join('・')} | ${fhs(o)} | ${fha(p)}${p.target ? `（目標 ${p.target.surface}${p.target.value}）` : ''} | ${setText(o, p.set)} | ${p.why}${p.src.length ? ' ' + p.src.map((u, i) => `[出典${i + 1}](${u})`).join(' ') : ''} |`);
}
L.push('');
L.push('## 全部の馬', '', '| 馬 | 国・生年 | 戦績 | 芝/ダ | 素の値 | rating・馬場・距離・脚質 | 特殊能力（発動するもの） | 問題 |', '|---|---|---|---|---|---|---|---|');
for (const o of horses) {
  const sk = o.skills.list.join('・') + (o.triggers.length ? `（${o.triggers.join('・')}）` : '');
  L.push(`| ${o.name}${o.legend ? '（伝説級）' : ''} | ${o.country}・${o.born} | ${o.record} | ${fhs(o)} | ${o.fhNominal} | ${o.data.rating}・${o.data.surface}・${o.data.distMin}〜${o.data.distMax}・${o.data.style} | ${sk} | ${o.issues.map(i => `${i.kind}：${i.text}`).join('<br>')} |`);
}
fs.writeFileSync(path.join(ROOT, 'docs', 'SPECIAL_AUDIT.md'), L.join('\n') + '\n');
console.log(`docs/SPECIAL_AUDIT.json・.md：${horses.length}頭・問題 ${JSON.stringify(kinds)}・案 ${json.summary.proposals}頭`);
