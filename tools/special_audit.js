// スペシャルホースとトロフィーの隠し馬の総点検（持ち主 2026-10-20「全体的に評価点おかしい気がする　能力値、パラメータ、スキル有無のレビューが必要そう」）
// 1頭ごとに、いまの芝・ダートの総合力（いちばん良いとき）・能力・脚質・距離・特殊能力と、その根拠（どのデータからそうなったか）を出し、
// 史実の実績と比べて筋の通らない所を挙げ、案を付ける。
// 出力：docs/SPECIAL_AUDIT.json（持ち主が採否を付ける。adopt: true/false、target: 総合力）と docs/SPECIAL_AUDIT.md（人が読む）
//   node tools/special_audit.js                # 一覧を作る
//   node tools/special_audit.js --apply-owner  # 持ち主が1回目の見直しで決めたこと（tools/special_audit_owner.js）を data/horse_fix.js に書いてから一覧を作る
// 2回目からの採否は node tools/special_audit_apply.js（adopt・target を読んで data/horse_fix.js に書く）。手で書いた案は tools/special_audit_plan.js
const fs = require('fs'), path = require('path');
const vm = require('vm');
const { load, ROOT } = require('../tests/load.js');
const PLAN = require('./special_audit_plan.js');
const OWNER = require('./special_audit_owner.js').OWNER;
const FIXFILE = path.join(ROOT, 'data', 'horse_fix.js');
const BAD = ['deokure', 'kakari', 'sora'];
const SURF = { turf: '芝', dirt: 'ダ' };

// ---------- 道具：data/horse_fix.js を読む・書く（tools/special_audit_apply.js も使う） ----------
function readFix() {
  const box = { HS: { DATA: {} } }; box.globalThis = box;
  vm.runInNewContext(fs.readFileSync(FIXFILE, 'utf8'), box);
  return Object.assign({}, box.HS.DATA.horseFix || {});
}
function writeFix(fix) {
  const src = fs.readFileSync(FIXFILE, 'utf8');
  const head = src.slice(0, src.indexOf('HS.DATA.horseFix = {') + 'HS.DATA.horseFix = {'.length);
  const lines = Object.keys(fix).sort().map(n => `    ${JSON.stringify(n)}: ${JSON.stringify(fix[n])},`);
  fs.writeFileSync(FIXFILE, head + '\n' + lines.join('\n') + (lines.length ? '\n' : '') + '  };\n})();\n');
}

// ---------- 道具：読み込んだゲームの中で、案の値を探す ----------
function makeKit(HS) {
  const SP = HS.Special, H = HS.Horse, T = HS.Season, K = HS.Skills, U = HS.U;
  const build = (d, set) => { const x = Object.assign({}, d, set || {}); if (set && set.pot && d.pot) x.pot = Object.assign({}, d.pot, set.pot); const h = H.fromHistoric(x, 'audit'); return { h, f: T.fhPeak(h) }; };
  const mainSurf = f => f.dirt > f.turf ? 'dirt' : 'turf';
  // 目標の総合力に届く値を探す。能力を手で決めた馬（データの pot にスピードとスタミナ）はその2つを同じだけ、ほかは強さの元（rating）を動かす
  const solve = (d, set, surf, target) => {
    let best = null;
    const tryOne = (s, cost) => {
      const { f } = build(d, Object.assign({}, set, s));
      const e = Math.abs(f[surf] - target);
      if (!best || e < best.e || (e === best.e && cost < best.cost)) best = { s, e, f, cost };
    };
    if (d.pot && d.pot.spd != null && d.pot.sta != null) {
      for (let x = -20; x <= 20; x += 0.5) tryOne({ pot: Object.assign({}, d.pot, { spd: U.clamp(d.pot.spd + x, 20, 112), sta: U.clamp(d.pot.sta + x, 20, 112) }) }, Math.abs(x));
    } else {
      // 強さの元は 100 まで（史実馬のデータの決まり）。data/legends.js の古い伝説級だけ 100 を超えてよい
      const extra = (HS.DATA.legendsExtra || []).includes(d);
      const lim = extra ? 108 : 100;
      for (let r = Math.max(60, d.rating - 20); r <= lim; r += 0.5) tryOne({ rating: r }, Math.abs(r - d.rating));
      // 100 で届かないときは、能力（スピードとスタミナ）を手で決めた値にして上げる
      if (best.e > 0 && !extra) {
        const h0 = build(d, Object.assign({}, set, { rating: lim })).h, sur = surf === 'dirt';
        const sp0 = sur ? h0.pot.dspd : h0.pot.spd, st0 = sur ? h0.pot.dsta : h0.pot.sta;
        const top = Math.max(h0.apt.turf, h0.apt.dirt), off = ((sur ? h0.apt.dirt : h0.apt.turf) - top) * 0.33;
        for (let x = 0.5; x <= 12; x += 0.5) tryOne({ rating: lim, pot: { spd: Math.round((sp0 - off + x) * 10) / 10, sta: Math.round((st0 - off + x) * 10) / 10 } }, 100 + x);
      }
    }
    return best;
  };
  // 大舞台を足す・史実の裏付けの無い弱みを外す（手で決めた表の無い馬だけ）
  const great = (d) => SP.bigWins(d).length >= 3 || d.tier === 'legend' || SP.unbeatenOf(d) >= 8;
  const skillFix = (d, h, keepBad) => {
    if (Array.isArray(d.skills)) return null;
    let sk = h.skills.slice();
    if (great(d) && !sk.includes('big')) sk.push('big');
    if (!keepBad) sk = sk.filter(x => !BAD.includes(x));
    return sk.join() !== h.skills.join() ? sk : null;
  };
  return { SP, H, T, K, U, build, mainSurf, solve, great, skillFix };
}

// 持ち主が1回目で決めたことを、値（data/horse_fix.js に書くもの）にする
function ownerSet(kit, d, o) {
  const { build, mainSurf, solve, K } = kit;
  const set = {}, why = [];
  const h0 = build(d).h;
  if (o.adopt === true) { const sk = kit.skillFix(d, h0, !!PLAN.KEEP_BAD[d.name]); if (sk) { set.skills = sk; why.push('大舞台を足す・史実の裏付けの無い弱みを外す（案を採った）'); } }
  const ex = o.extra || {};
  if (ex.addSkills) { const base = set.skills || h0.skills.slice(); set.skills = base.concat(ex.addSkills.filter(x => !base.includes(x))); why.push(`メモ「${o.note}」から ${ex.addSkills.map(K.label).join('・')} を足す`); }
  if (ex.health != null) { set.health = ex.health; why.push(`メモ「${o.note}」から健康 ${ex.health}`); }
  if (o.target != null) {
    const surf = mainSurf(build(d, set).f);
    const b = solve(d, set, surf, o.target);
    if (b.cost) Object.assign(set, b.s);
    why.unshift(`持ち主の見直しで総合力 ${o.target}（${SURF[surf]}）${o.from === 'adopt' ? '（案を採った）' : o.from === 'note' ? `（メモ「${o.note}」から）` : ''}`);
  }
  if (ex.trig) {
    const h = build(d, set).h;
    const auto = K.of(h).filter(x => !K.isUnique(x));
    const cap = Math.max(K.cap(K.stats(h)), ex.trig.length);
    set.trig = [...new Set(ex.trig.concat(auto))].slice(0, cap);
    why.push(`メモ「${o.note}」から発動する特殊能力に ${ex.trig.map(K.label).join('・')}`);
  }
  return { set, why: why.join('。') };
}

if (require.main === module) main();
function main() {
  // --apply-owner：持ち主の1回目の決定を data/horse_fix.js に書く（書いてから読み直す）
  if (process.argv.includes('--apply-owner')) {
    const HS0 = load(); HS0.U.ERA = HS0.Eraless.ERA;
    const kit0 = makeKit(HS0);
    const fix = readFix();
    for (const o of OWNER) {
      const d = kit0.SP.data(o.name) || HS0.DATA.historic.find(x => x.name === o.name); if (!d) { console.log('？', o.name); continue; }
      const { set, why } = ownerSet(kit0, d, o);
      if (!Object.keys(set).length) continue;
      fix[o.name] = Object.assign({}, fix[o.name] || {}, set, { why });
    }
    writeFix(fix);
    console.log(`data/horse_fix.js：${Object.keys(fix).length}頭（持ち主の1回目の決定を入れた）`);
  }
  report();
}

function report() {
  const HS = load();
  HS.U.ERA = HS.Eraless.ERA;
  const kit = makeKit(HS);
  const { SP, H, T, K, U, build, mainSurf, solve } = kit;
  const D = HS.DATA;
  const FIX = D.horseFix || {};
  const label = id => K.label(id);

  // 調べる馬：スペシャルホース全部と、トロフィーの隠し馬
  const trophyOf = new Map();
  for (const [id, xs] of Object.entries(D.trophyHorses || {})) for (const x of xs) { if (!trophyOf.has(x.name)) trophyOf.set(x.name, []); trophyOf.get(x.name).push(id); }
  const trophyLabel = id => ((HS.Trophy.LIST.find(t => t.id === id)) || {}).label || id;
  const names = [...new Set(SP.list().map(x => x.name).concat([...trophyOf.keys()]))];
  const dataOf = n => SP.data(n) || D.historic.find(d => d.name === n) || null;
  const FILES = ['data/historic_1.js', 'data/historic_2.js', 'data/historic_old.js', 'data/historic_world.js', 'data/historic_auto.js', 'data/legends.js'];
  const TXT = Object.fromEntries(FILES.map(f => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]));
  const fileOf = n => FILES.find(f => TXT[f].includes(`name:'${n}'`) || TXT[f].includes(`"name":"${n}"`)) || '';
  const EU = new Set(['英', '仏', '愛', '伊', '独', 'ハンガリー']);
  const regionOf = d => { const c = d.country || '日'; return c === '日' ? (d.local ? '日本（地方）' : '日本') : (c === '米' || c === '加') ? '北米' : EU.has(c) ? '欧州' : c === '豪' ? '豪州' : c === '香港' ? '香港' : c; };
  const ownerBy = new Map(OWNER.map(o => [o.name, o]));
  const planBy = new Map(PLAN.PLAN.map(p => [p.name, p]));
  const fixedBy = new Map(PLAN.FIXED.map(p => [p.name, p]));
  const GR = ['G1', 'G2', 'G3'];

  // 根拠：総合力（スピードとスタミナ）・芝とダートの向き・ほかの能力が、どのデータから決まったか
  const basisOf = (d, h) => {
    const rec = H.recordOf(d), ws = H.winRaces(d), sa = H.surfaceApt(d);
    const g = s => { const c = {}; for (const r of ws) if ((r.surface === 'ダ') === (s === 'ダ')) { const k = GR.includes(r.grade) ? r.grade : '重賞'; c[k] = (c[k] || 0) + 1; } return Object.entries(c).map(([k, v]) => `${k}×${v}`).join('・'); };
    const surfText = k => {
      const s = SURF[k], v = h.apt[k];
      if (d[k] != null) return `${s}：データで決めた向き ${d[k]}（${FIX[d.name] && FIX[d.name][k] != null ? '見直しで' : '手で'}）`;
      const won = g(s);
      const main = (k === 'turf' && d.surface !== 'ダ') || (k === 'dirt' && (d.surface === 'ダ' || d.surface === '芝ダ'));
      if (v >= 100) return `${s}：走った馬場${won ? `（勝ち鞍 ${won}）` : ''}`;
      if (v === H.SURF_APT.none) return `${s}：走って勝っていない → もう片方から −15`;
      return `${s}：${main ? '走った馬場' : '重賞を勝った馬場'}（勝ち鞍 ${won || 'の記録なし'}）→ 向き ${v}（能力で ${((v - 100) * 0.33).toFixed(1)}）`;
    };
    const fx = FIX[d.name];
    const sp = d.pot && d.pot.spd != null ? `手で決めた能力（スピード ${d.pot.spd}・スタミナ ${d.pot.sta}）` : `実績の格から決めた強さ ${d.rating}${d.distMax <= 1400 ? '（短距離：スピード +3・スタミナ −6）' : d.distMax >= 2400 ? '（長距離：スタミナ +3）' : ''}${d.tier === 'legend' ? '・伝説級 ×1.035' : ''}`;
    return {
      fh: `${sp}${fx && (fx.rating != null || fx.pot) ? '（見直しで決めた値）' : ''}。スタミナの重み ${T.fhStaW(h).toFixed(2)}（得意な距離 ${h.distMin}〜${h.distMax}m）`,
      turf: surfText('turf'), dirt: surfText('dirt'),
      sub: `根性：${rec ? `戦績 ${rec.starts}戦${rec.wins}勝` : '戦績の記録なし'}／気性：脚質 ${h.style}${h.skills.includes('kakari') || h.skills.includes('deokure') ? '・掛かり癖か出遅れ癖で −14' : ''}／坂：${d.surface === 'ダ' ? 'ダートの馬 +3・' : ''}急坂の競馬場の重賞 ${ws.filter(x => { const c = (D.courses || {})[x.course]; const gg = c && (x.surface === 'ダ' ? c.dirt || c.turf : c.turf || c.dirt); return gg && gg.slope === '急'; }).length}勝／健康：${d.health != null ? `データで ${d.health}` : rec ? `戦績 ${rec.starts}戦から` : '75'}`,
      skills: Array.isArray(d.skills) ? (fx && fx.skills ? '見直しで決めた表' : '名馬の手で決めた表') : '勝ち鞍から（大舞台・回り・直線・季節・海外）',
    };
  };

  const rows = [];
  for (const n of names) {
    const d = dataOf(n); if (!d) continue;
    const { h, f } = build(d);
    const main = mainSurf(f), fhMain = f[main];
    const big = SP.bigWins(d).length, unb = SP.unbeatenOf(d);
    const sp = SP.byName(n);
    const o = ownerBy.get(n);
    rows.push({
      d, h, f, main, fhMain, big, unb,
      out: {
        name: n, nameEn: d.nameEn || '', country: d.country || '日', region: regionOf(d), born: d.born, years: d.years || '', record: d.record || d.note || '',
        mainWins: (d.mainWins || (d.wins || []).map(w => w.slice(0, 4) + ' ' + w.slice(4))).slice(0, 8),
        file: fileOf(n), auto: !!d.auto, legend: d.tier === 'legend', local: d.local || '',
        groups: sp ? sp.groups : [], trophies: (trophyOf.get(n) || []).map(trophyLabel),
        data: { rating: d.rating, surface: d.surface || '芝', turf: d.turf != null ? d.turf : null, dirt: d.dirt != null ? d.dirt : null, distMin: h.distMin, distMax: h.distMax, style: h.style, growth: h.growth, kire: h.kire, pot: d.pot ? Object.assign({}, d.pot) : null },
        fh: { turf: f.turf, dirt: f.dirt },
        pot: Object.fromEntries(H.STATS.map(k => [k, Math.round(h.pot[k] * 10) / 10])), health: h.health, heavy: h.apt.heavy, apt: { turf: h.apt.turf, dirt: h.apt.dirt },
        skills: { list: H.shownSkills(h).map(label), ids: h.skills.slice() },
        triggers: K.of(h).map(label), unique: K.hasUnique(n) ? (K.UNIQUE_OF[n] || {}).label || '' : '',
        basis: basisOf(d, h),
        bigWins: big, unbeaten: unb,
        owner1: o ? { adopt: o.adopt, target: o.target, note: o.note || '', applied: !!FIX[n] } : null,
        fix: FIX[n] || null,
        issues: [], fixed: fixedBy.get(n) || null, proposal: null, adopt: null, target: null,
      },
    });
  }

  // 同格との比べ：大レースの勝ち数（いまの番組の G1 に当たる勝ち鞍）ごとのまん中
  const bucket = b => b >= 5 ? '5+' : b >= 3 ? '3-4' : String(b);
  const med = xs => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
  const byBucket = {};
  for (const r of rows) if (!r.out.legend) (byBucket[bucket(r.big)] = byBucket[bucket(r.big)] || []).push(r.fhMain);
  const medBucket = Object.fromEntries(Object.entries(byBucket).map(([k, v]) => [k, med(v)]));

  for (const r of rows) {
    const o = r.out, d = r.d, iss = (kind, text) => o.issues.push({ kind, text });
    const c = d.country || '日';
    if (d.local && (d.surface || '芝') === '芝' && d.dirt == null) iss('馬場', `地方（${d.local}）の馬なのに芝だけの馬になっていて、ダートが ${r.f.dirt}`);
    if ((c === '米' || c === '加') && d.born < 1990 && (d.surface || '芝') === '芝') iss('馬場', '米国の古い名馬なのに芝の馬になっている');
    if (EU.has(c) && d.surface === 'ダ') iss('馬場', '欧州の馬なのにダートの馬になっている');
    if (o.legend && (r.fhMain < 81 || r.fhMain > 85)) iss('帯', `伝説級なのに ${r.fhMain}（神話の名馬級は 81〜85）`);
    if (!o.legend && r.fhMain > 80) iss('帯', `伝説級でないのに ${r.fhMain}（81 から上は伝説級）`);
    const m = medBucket[bucket(r.big)];
    if (!o.owner1 && !o.legend && r.big >= 2 && m != null && r.fhMain <= m - 4) iss('同格', `大レース ${r.big}勝の馬のまん中（${m}）より ${m - r.fhMain} 低い`);
    if (!o.owner1 && !o.legend && r.big <= 1 && m != null && r.fhMain >= m + 7) iss('同格', `大レース ${r.big}勝の馬のまん中（${m}）より ${r.fhMain - m} 高い`);
    if (!o.owner1 && !o.legend && !d.local && r.fhMain < 66 && (r.unb >= 8 || o.trophies.length)) iss('帯', `${r.unb >= 8 ? '無敗の名馬' : 'トロフィーの隠し馬'}なのに ${r.fhMain}（G1 を何度も勝った名馬は 66〜80）`);
    if (!Array.isArray(d.skills) && kit.great(d) && !r.h.skills.includes('big')) iss('能力', `大レースを${o.legend ? '勝ち続けた伝説級' : r.unb >= 8 ? `${r.unb}戦無敗で` : ` ${r.big}勝`}なのに「大舞台」が無い（暦で G1 になっていない昔のレースを数えないため）`);
    if (o.auto) iss('脚質', '記録から自動で作った馬で、脚質は名前で決まった引き（出典で確かめていない）');
  }

  // 案（持ち主がまだ見ていない馬）：手で書いた案（目標の総合力）と、大舞台の決まった直し
  for (const r of rows) {
    const o = r.out, d = r.d;
    if (o.owner1) continue; // 1回目で決まった馬は入れた値を出すだけ
    const p = planBy.get(o.name);
    const set = {}, why = [], src = [];
    const sk = kit.skillFix(d, r.h, !!PLAN.KEEP_BAD[o.name]);
    let skills = sk;
    if (p && p.addSkills) { const base = skills || r.h.skills.slice(); skills = base.concat(p.addSkills.filter(x => !base.includes(x))); }
    if (skills) { set.skills = skills; if (sk) why.push('大舞台を足す（大レースを何度も勝った名馬）'); }
    if (p && p.set) Object.assign(set, p.set);
    let target = null;
    if (p && p.target) {
      const surf = Object.keys(p.target)[0]; target = { surface: SURF[surf], value: p.target[surf] };
      const b = solve(d, set, surf, p.target[surf]);
      if (b.cost) Object.assign(set, b.s);
      if (b.e >= 2) why.push(`能力の上限で目標に ${b.e} 届かない`);
      why.unshift(p.why); src.push(...(p.src || []));
    }
    if (!Object.keys(set).length) continue;
    const { f, h } = build(d, set);
    const potAfter = Object.fromEntries(H.STATS.map(k => [k, Math.round(h.pot[k] * 10) / 10]));
    o.proposal = { set, target, fhAfter: { turf: f.turf, dirt: f.dirt }, potAfter, skillsAfter: set.skills ? H.shownSkills(h).map(label) : null, why: why.join('。'), src };
  }

  // 全体
  const stat = xs => { const s = xs.slice().sort((a, b) => a - b); return s.length ? { n: s.length, min: s[0], med: s[Math.floor(s.length / 2)], max: s[s.length - 1] } : null; };
  const FORMULA = [
    { id: 'noise', title: '能力の運をやめた（決まった）', text: '持ち主の決定「運ってなに？　実績や逸話ベースで総合力やサブステ、スキルは決めて」。史実馬の能力は、名前ごとの運で揺らさず、データ（実績の格から決めた強さ・距離・脚質・勝ち鞍・戦績）から決まった値で作る（JS の H.fromHistoric・Godot の HSHorse.from_historic）。ほかの能力：根性＝戦績の勝ち切った割合（無敗なら上乗せ）、気性＝脚質（先行 +2・逃げ −3・追込 −2）、坂＝ダートの馬と急坂の競馬場の重賞2勝以上、健康＝戦績の数、切れ＝脚質と距離。運で付けていた特殊能力（鉄砲駆け・叩き良化などの見立て、出遅れ・掛かり・ソラ・砂かぶり・外枠○）は付けない。逸話のある馬は data/horse_fix.js と名馬の表に手で書く' },
    { id: 'surface', title: '芝とダートは、その馬場の実績で決める（決まった）', text: '持ち主の決定「ダート勝ってたらダートの評価が上がって芝勝ってたら芝の評価があがるだけ　走ってない場合は片方の能力に引っ張られて少し上げて　-15くらい？」。前の「芝ダは芝85・ダート90」をやめ、勝ち鞍の格がいちばん上の馬場を得意（100）、もう片方はその馬場の勝ち鞍の格（G1 100・G2 95・G3 90）。走って勝っていない馬場は能力で −15（総合力で 14〜17 下）' },
    { id: 'era', title: '昔の馬は逸話と伝説で（決まった）', text: '持ち主の決定「昔の馬はG1も少ないので逸話や伝説ベースで評価して」。G1 の数ではなく、当時の評価・逸話で総合力を決める（1回目の見直しで67頭を持ち主が決めた。残りは案）' },
    { id: 'legend', title: '伝説級は馬ごとに', text: '式の下限は作らず、馬ごとに総合力を決めた（グラディアトゥール 81 など）' },
    { id: 'mid', title: 'マイル〜中距離の馬の上乗せ', text: 'そのまま（持ち主の決定）' },
  ];
  const horses = rows.map(r => r.out).sort((a, b) => (b.proposal ? 1 : 0) - (a.proposal ? 1 : 0) || Math.max(b.fh.turf, b.fh.dirt) - Math.max(a.fh.turf, a.fh.dirt));
  const kinds = {};
  for (const o of horses) for (const i of o.issues) kinds[i.kind] = (kinds[i.kind] || 0) + 1;
  const all = rows.map(r => r.fhMain);
  const json = {
    note: '2回目の見直し。node tools/special_audit.js で作る。持ち主は馬ごとに adopt（案を採る true／採らない false）か target（得意な馬場の総合力をこの値に。adopt より先）を書く。node tools/special_audit_apply.js で data/horse_fix.js に書き込む。1回目で決めた67頭（owner1）は入れた値',
    spec: '総合力の目安（docs/SPEC.md）：46〜50 OP・51〜55 G3・56〜60 G2・61〜65 G1・66〜80 G1 を何度も勝った名馬・81〜85 神話の名馬級（伝説級）・86〜99 オリジナルホースだけ。総合力（スピードとスタミナ）は実績の格に合わせ、個性と逆転の余地はほかの能力（根性・気性・切れ・坂など）と特殊能力で出す（持ち主 2026-10-20）',
    summary: { horses: horses.length, special: SP.list().length, trophyHorses: trophyOf.size, owner1: horses.filter(o => o.owner1).length, owner1Applied: horses.filter(o => o.owner1 && o.owner1.applied).length, withIssues: horses.filter(o => o.issues.length).length, issues: kinds, proposals: horses.filter(o => o.proposal).length, fixed: horses.filter(o => o.fixed).length, fh: stat(all) },
    formula: FORMULA, horses,
  };
  fs.writeFileSync(path.join(ROOT, 'docs', 'SPECIAL_AUDIT.json'), JSON.stringify(json, null, 1) + '\n');

  // 人が読む表（画面の言葉に合わせ、強さは総合力と能力の値で書く）
  const L = [];
  const fhs = x => `芝${x.turf}・ダ${x.dirt}`;
  const potText = p => `芝SP${Math.round(p.spd)}・芝ST${Math.round(p.sta)}・ダSP${Math.round(p.dspd)}・ダST${Math.round(p.dsta)}・根性${Math.round(p.guts)}・気性${Math.round(p.mind)}・坂${Math.round(p.slope)}`;
  const changeText = (o) => {
    const p = o.proposal, out = [];
    if (p.set.rating != null || p.set.pot) out.push(`能力 ${H.STATS.filter(k => Math.round(o.pot[k]) !== Math.round(p.potAfter[k])).map(k => `${H.STAT_SHORT[k]} ${Math.round(o.pot[k])}→${Math.round(p.potAfter[k])}`).join('・')}`);
    if (p.set.skills) out.push(`特殊能力 → ${(p.skillsAfter || []).join('・') || 'なし'}`);
    for (const k of ['turf', 'dirt']) if (p.set[k] != null) out.push(`${SURF[k]}の向き → ${p.set[k]}`);
    return out.join('、');
  };
  L.push('# スペシャルホースと隠し馬の総点検（2回目の見直し）', '');
  L.push('`node tools/special_audit.js` で作る（手で直さない）。採否は `docs/SPECIAL_AUDIT.json` の adopt（案を採る）か target（総合力をこの値に）。`node tools/special_audit_apply.js` で `data/horse_fix.js` に入る。', '');
  L.push(`調べた馬 ${json.summary.horses}頭（スペシャルホース ${json.summary.special}頭・トロフィーの隠し馬 ${json.summary.trophyHorses}頭。重なりあり）。1回目で持ち主が決めた馬 ${json.summary.owner1}頭（入れた）。案 ${json.summary.proposals}頭。問題 ${Object.entries(kinds).map(([k, v]) => `${k} ${v}`).join('・') || 'なし'}。`, '');
  L.push(json.spec, '');
  L.push('総合力は「いちばん良いとき」の芝・ダート。根拠＝その値がどのデータから決まったか。', '');
  L.push('## 式の決まり（持ち主の決定 2026-10-20）', '');
  for (const x of FORMULA) L.push(`- **${x.title}**：${x.text}`);
  L.push('');
  L.push('## 案（2回目に持ち主が選ぶ）', '', '| 馬 | 国・生年 | 戦績・主な勝鞍 | いまの総合力 | 案のあと | 変える値 | 理由 |', '|---|---|---|---|---|---|---|');
  for (const o of horses.filter(o => o.proposal)) {
    const p = o.proposal;
    L.push(`| ${o.name}${o.legend ? '（伝説級）' : ''} | ${o.country}・${o.born} | ${o.record}。${o.mainWins.slice(0, 4).join('・')} | ${fhs(o.fh)} | ${fhs(p.fhAfter)}${p.target ? `（目標 ${p.target.surface}${p.target.value}）` : ''} | ${changeText(o)} | ${p.why}${p.src.length ? ' ' + p.src.map((u, i) => `[出典${i + 1}](${u})`).join(' ') : ''} |`);
  }
  L.push('', '## 1回目に持ち主が決めた馬（入れた値）', '', '| 馬 | 決めたこと | いまの総合力 | 能力 | 特殊能力（発動するもの） |', '|---|---|---|---|---|');
  for (const o of horses.filter(o => o.owner1)) L.push(`| ${o.name} | ${o.owner1.target != null ? `総合力 ${o.owner1.target}` : ''}${o.owner1.adopt === true ? '・案を採る' : o.owner1.adopt === false ? '・案は採らない' : ''}${o.owner1.note ? `（メモ：${o.owner1.note}）` : ''} | ${fhs(o.fh)} | ${potText(o.pot)}・健康${o.health} | ${o.skills.list.join('・')}${o.triggers.length ? `（${o.triggers.join('・')}）` : ''} |`);
  L.push('', '## 当てた直し（明らかな誤り）', '', '| 馬 | 直したこと | 理由 | いまの総合力 |', '|---|---|---|---|');
  for (const o of horses.filter(o => o.fixed)) L.push(`| ${o.name} | ${o.fixed.change} | ${o.fixed.why} | ${fhs(o.fh)} |`);
  L.push('', '## 全部の馬（いまの値と根拠）', '', '| 馬 | 国・生年・戦績 | 芝/ダ | 能力 | 根拠 | 距離・脚質 | 特殊能力（発動するもの） | 問題 |', '|---|---|---|---|---|---|---|---|');
  for (const o of horses) {
    const b = o.basis;
    L.push(`| ${o.name}${o.legend ? '（伝説級）' : ''} | ${o.country}・${o.born}・${o.record} | ${fhs(o.fh)} | ${potText(o.pot)}・健康${o.health} | ${b.fh}<br>${b.turf}<br>${b.dirt}<br>${b.sub}<br>特殊能力：${b.skills} | ${o.data.distMin}〜${o.data.distMax}・${o.data.style} | ${o.skills.list.join('・')}${o.triggers.length ? `（${o.triggers.join('・')}）` : ''} | ${o.issues.map(i => `${i.kind}：${i.text}`).join('<br>')} |`);
  }
  fs.writeFileSync(path.join(ROOT, 'docs', 'SPECIAL_AUDIT.md'), L.join('\n') + '\n');
  console.log(`docs/SPECIAL_AUDIT.json・.md：${horses.length}頭・1回目で決めた ${json.summary.owner1}頭・案 ${json.summary.proposals}頭・問題 ${JSON.stringify(kinds)}`);
}

module.exports = { readFix, writeFix, makeKit, ownerSet };
