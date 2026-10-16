// オリジナルホース（騎手のゲーム・年代なし。持ち主の決定 2026-10-16）
// 自分の馬を引退させると、牧場に残る（牡・牝それぞれ5頭まで）。引退した牡馬と牝馬を組み合わせて、オリジナルホース（仔）を作る。
// 能力は両親の値をもとにばらつき、特殊能力は両親のもの（それぞれ最大4つ、合わせて最大8つ）から4つまで受け継ぐ。
// トロフィーを手にした馬・グランドフィナーレを勝った馬を親にすると、仔の能力にボーナスが付く
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse, W = HS.World;
  const O = HS.Original = {};
  O.MAX_EACH = 5;       // 引退馬は牡・牝それぞれ5頭まで
  O.MAX_SKILLS = 4;     // 特殊能力の枠
  O.BONUS_PER = 3;      // トロフィー・DC の勝ち1つあたりのボーナス（能力に足す）
  O.BONUS_MAX = 12;

  O.on = () => { const G = W.get(); return !!(G && G.eraless); };
  O.retired = sex => W.mine().filter(h => h.loc === 'retired' && (sex === '牝' ? h.sex === '牝' : h.sex !== '牝'));

  // 親としてのボーナス：その馬で手にしたトロフィーと、グランドフィナーレの勝ち（前の名前ドリームクラシックも）
  O.bonusOf = function (h) {
    const G = W.get();
    const tr = Object.values(G.trophies || {}).filter(t => t.horse === h.name).length;
    const dc = (h.gradedWins || []).filter(g => [HS.Season.DC_NAME, 'ドリームクラシック'].includes(g.short || g.race)).length;
    return { trophies: tr, dc, pts: Math.min(O.BONUS_MAX, (tr + dc) * O.BONUS_PER) };
  };

  // 引退：牡馬・牝馬は牧場に残る（せん馬は乗馬になる）
  O.retire = function (id) {
    const G = W.get(), h = W.horse(id);
    if (!h || h.owner !== 'P' || h.loc === 'retired') return { err: '持ち馬ではない' };
    W.unenter(id);
    G.reserve = (G.reserve || []).filter(x => x.id !== id);
    if (h.gelding) { delete G.horses[id]; W.dirty(); W.news(`${h.name}は引退して乗馬になった。おつかれさま。`, 'info'); return { to: 'gone' }; }
    if (O.retired(h.sex).length >= O.MAX_EACH) return { err: `引退した${h.sex === '牝' ? '牝馬' : '牡馬'}は${O.MAX_EACH}頭まで。生産の画面で1頭放してから` };
    const b = O.bonusOf(h);
    h.loc = 'retired'; h.retiredY = G.year; h.auto = false; h.parentBonus = b.pts;
    W.dirty();
    W.news(`${h.name}は引退し、牧場に残った。オリジナルホースの${h.sex === '牝' ? '母' : '父'}にできる${b.pts ? `（仔へのボーナス +${b.pts}）` : ''}。`, 'info');
    return { to: 'retired' };
  };
  // 放す（牧場の枠を空ける）。放した馬は、また馬の店に並ぶことがある
  O.release = function (id) {
    const G = W.get(), h = W.horse(id);
    if (!h || h.owner !== 'P' || h.loc !== 'retired') return '引退馬ではない';
    delete G.horses[id]; W.dirty();
    W.news(`${h.name}を牧場から放した。`, 'info');
    return null;
  };

  // その馬の特殊能力（手書きのものと、発動するもの）。最大4つ
  O.skillsOf = function (h) {
    const hand = (h.skills || []).filter(id => H.SKILLS[id]);
    const trig = HS.Skills ? HS.Skills.of(h, W.wIdx()) : [];
    return hand.concat(trig.filter(id => !hand.includes(id))).slice(0, O.MAX_SKILLS);
  };
  // 受け継ぐ候補（両親のものを合わせて最大8つ）
  O.candidates = (s, m) => { const out = []; for (const id of O.skillsOf(s).concat(O.skillsOf(m))) if (!out.includes(id)) out.push(id); return out; };

  // 作る
  O.make = function (sireId, damId, name) {
    const G = W.get();
    const s = W.horse(sireId), m = W.horse(damId);
    if (!s || !m || s.loc !== 'retired' || m.loc !== 'retired' || s.owner !== 'P' || m.owner !== 'P') return { err: '引退馬を選んでください' };
    if (s.sex === '牝' || m.sex !== '牝') return { err: '父は牡馬、母は牝馬' };
    if (m.foalY === G.year) return { err: `${m.name}は今年もう仔を産んだ（来年また作れる）` };
    if (HS.Season && !HS.Season.canBuy()) return { err: `お手馬は${HS.Season.MAX_OWN}頭まで` };
    const rng = new U.RNG(U.hash(`orig:${G.seed}:${G.year}:${s.id}:${m.id}`));
    const bonus = Math.min(O.BONUS_MAX, (s.parentBonus || 0) + (m.parentBonus || 0));
    const pot = {};
    for (const k of H.STATS) {
      const a = (s.pot[k] || 70), b = (m.pot[k] != null ? m.pot[k] : a);
      pot[k] = Math.round(U.clamp((a + b) / 2 + rng.normal(0, 6) + bonus, 40, 118) * 10) / 10;
    }
    const avg = (a, b) => (a + b) / 2;
    let dMin = Math.round(U.clamp(avg(s.distMin, m.distMin) + rng.normal(0, 150), 1000, 3600) / 100) * 100;
    let dMax = Math.round(U.clamp(avg(s.distMax, m.distMax) + rng.normal(0, 150), 1200, 4000) / 100) * 100;
    if (dMax < dMin + 400) dMax = Math.min(4000, dMin + 400);
    // 特殊能力：候補が4つより多ければ、その中から4つ
    const cand = O.candidates(s, m);
    let pick = cand.slice();
    while (pick.length > O.MAX_SKILLS) pick.splice(rng.int(0, pick.length - 1), 1);
    const f = {
      sex: rng.chance(0.5) ? '牡' : '牝', pot, distMin: dMin, distMax: dMax,
      apt: { heavy: Math.round(U.clamp(avg((s.apt || {}).heavy || 50, (m.apt || {}).heavy || 50) + rng.normal(0, 8), 20, 100)) },
      growth: rng.pick([s.growth || '普通', m.growth || '普通']), peakShift: 0, style: rng.pick([s.style, m.style].filter(Boolean)) || '先行',
      kire: U.clamp(Math.round(avg(s.kire || 4, m.kire || 4) + rng.normal(0, 1)), 1, 8),
      skills: pick.filter(id => H.SKILLS[id]), health: Math.round(U.clamp(avg(s.health || 70, m.health || 70) + rng.normal(0, 8), 40, 100)),
      coat: rng.pick([s.coat || '鹿毛', m.coat || '鹿毛']),
    };
    const born = G.year - (G.month >= 10 ? 1 : 2); // 秋に作った仔は、年が明けて2歳
    const nm = (name || '').trim() || H.makeName(rng, W.usedNames());
    if (W.usedNames().has(nm) && W.all().some(h => h.name === nm)) return { err: 'その名前の馬がもういる' };
    const h = W.horseFromFoal(f, s.name, m.name, born, nm);
    h.trigFixed = pick.filter(id => !H.SKILLS[id]); // 発動する特殊能力は、受け継いだものに決める
    h.owner = 'P'; h.loc = 'farm'; h.original = true; h.auto = true; h.bonusFromParents = bonus;
    H.syncApt(h);
    G.horses[h.id] = h;
    W.usedNames().add(nm);
    if (HS.Ped && HS.Ped.register) HS.Ped.register(nm, s.name, m.name);
    m.foalY = G.year;
    W.dirty();
    W.news(`オリジナルホース「${nm}」が生まれた！（父 ${s.name}・母 ${m.name}${bonus ? `・ボーナス +${bonus}` : ''}）`, 'g1');
    return { horse: h, bonus, skills: pick };
  };
})();
