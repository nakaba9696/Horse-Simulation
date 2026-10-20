// オリジナルホース（騎手のゲーム・年代なし。持ち主の決定 2026-10-16）
// 自分の馬を引退させると、牧場に残る（牡・牝それぞれ5頭まで）。引退した牡馬と牝馬を組み合わせて、オリジナルホース（仔）を作る。
// 能力は両親の値をもとにばらつき、特殊能力は両親のもの（それぞれ最大4つ、合わせて最大8つ）から4つまで受け継ぐ（名馬の固有の能力も）。
// 引退したときに、手にしたトロフィーの数と種類で能力が上がる（持ち主の仕様書 2026-10-19。js/core/trophy.js の TR.points）。仔は両親の能力をもとに作るので、トロフィーを集めた親ほど良い仔になる
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse, W = HS.World;
  const O = HS.Original = {};
  O.MAX_EACH = 5;       // 引退馬は牡・牝それぞれ5頭まで
  O.MAX_SKILLS = 4;     // 特殊能力の枠
  O.BONUS_PER = 3;      // 前の版：トロフィー・GF の勝ち1つあたりの、仔へのボーナス（前のセーブの引退馬だけ。potUp の無い馬）
  O.BONUS_MAX = 12;
  O.POT_MAX = 118;      // 能力の上限（仔を作るときと同じ）
  // 1頭の馬から作れる仔の数（仕様書「合わせる馬は何回かするといなくなる」。数は docs/BALANCE.md「10. オリジナルホース」）。
  // その数の仔を作った親は、牧場を去る（枠が空く）。GF の一族の人（イロナ）の花輪を持っていれば＋1（持ち主の決定 2026-10-20。js/core/gfhost.js）
  O.FOALS = 2;
  O.foalsMax = () => O.FOALS + (HS.GFHost && HS.GFHost.hasItem && HS.GFHost.hasItem() ? 1 : 0);
  O.foalsLeft = h => Math.max(0, O.foalsMax() - ((h && h.origN) || 0));
  // 仔の能力の元：両親の平均のうち SOFT（92）を超えた分は HERIT（0.4）の割合だけ受け継ぐ（強い両親の仔ほど親に届きにくい）。
  // 選んで重ねるだけでは史実の名馬の上（総合力80前後）で止まり、そこから上はトロフィーを集めた親から（持ち主の決定 2026-10-20
  // 「上げすぎなくていいよ すぐ総合力99ができてもつまらないし」。総合力90台は何世代も重ねて、99はやりこみの果てに）
  O.SOFT = 92;   // 総合力をスピードとスタミナから出す式（2026-10-20）に合わせて 94・0.5 から締めた（docs/BALANCE.md「12-4」）
  O.HERIT = 0.4;
  O.inherit = avg => avg > O.SOFT ? O.SOFT + (avg - O.SOFT) * O.HERIT : avg;

  O.on = () => { const G = W.get(); return !!(G && G.eraless); };
  O.retired = sex => W.mine().filter(h => h.loc === 'retired' && (sex === '牝' ? h.sex === '牝' : h.sex !== '牝'));

  // 引退したときの能力の上がり：手にしたトロフィー（GF のトロフィーも）。by＝能力ごとの上がり、pts＝いちばん大きい上がり
  O.bonusOf = function (h) {
    const p = HS.Trophy.points(h);
    return { trophies: p.n, by: p.by, pts: p.top };
  };
  // 仔へのボーナス：前の版の引退馬（引退で能力が上がっていない馬）だけ。いまの引退馬は、上がった能力がそのまま仔の元になる
  O.legacyBonus = h => (h && !h.potUp ? (h.parentBonus || 0) : 0);
  O.childBonus = (s, m) => Math.min(O.BONUS_MAX, O.legacyBonus(s) + O.legacyBonus(m));

  // 引退：牡馬・牝馬は牧場に残る（せん馬は乗馬になる）
  // トロフィーを1つ以上手にした馬は、案内なしで殿堂入りする（持ち主の決定 2026-10-20「殿堂入りは自動」）。殿堂に入らない馬のレースの記録（js/core/racerec.js）は消える
  O.retire = function (id) {
    const G = W.get(), h = W.horse(id);
    if (!h || h.owner !== 'P' || h.loc === 'retired') return { err: '持ち馬ではない' };
    if (O.retired(h.sex).length >= O.MAX_EACH && !h.gelding) return { err: `引退した${h.sex === '牝' ? '牝馬' : '牡馬'}は${O.MAX_EACH}頭まで。生産の画面で1頭放してから` };
    W.unenter(id);
    G.reserve = (G.reserve || []).filter(x => x.id !== id);
    const hall = HS.Hall ? HS.Hall.onRetire(h) : null; // トロフィー1つ以上なら殿堂入り
    if (HS.RaceRec) HS.RaceRec.strip(h); // レースの記録は消す（殿堂入りなら殿堂の写しに残る）
    if (h.gelding) { delete G.horses[id]; W.dirty(); W.news(`${h.name}は引退して乗馬になった。おつかれさま。`, 'info'); return { to: 'gone', hall }; }
    const b = O.bonusOf(h);
    h.loc = 'retired'; h.retiredY = G.year; h.auto = false; h.parentBonus = b.pts;
    // トロフィーで能力が上がる（上がった分は potUp に残す）
    h.potUp = {};
    for (const k of H.STATS) { if (h.pot[k] == null) continue; const v = h.pot[k], up = Math.min(b.by[k] || 0, Math.max(0, O.POT_MAX - v)); h.potUp[k] = Math.round(up * 10) / 10; if (up > 0) h.pot[k] = Math.round((v + up) * 10) / 10; }
    if (HS.Inbreed) HS.Inbreed.remember(h); // オリジナルホースのインブリードの因子をセーブに残す（牧場を去っても、子孫の血統表で効く）
    W.dirty();
    W.news(`${h.name}は引退し、牧場に残った。オリジナルホースの${h.sex === '牝' ? '母' : '父'}にできる${b.pts ? `（トロフィー${b.trophies}つで能力が上がった。最大 +${b.pts}）` : ''}。`, 'info');
    return { to: 'retired', hall };
  };
  // 放す（牧場の枠を空ける）。放した馬は、また馬の店に並ぶことがある
  O.release = function (id) {
    const G = W.get(), h = W.horse(id);
    if (!h || h.owner !== 'P' || h.loc !== 'retired') return '引退馬ではない';
    delete G.horses[id]; W.dirty();
    W.news(`${h.name}を牧場から放した。`, 'info');
    return null;
  };

  // その馬の特殊能力（手書きのものと、発動するもの）。最大4つ。
  // 名馬の固有の能力（data/uniques.js に名前がある名馬。K.isUnique）は先頭に置き、必ず候補に入る（持ち主の決定 2026-10-17「親にすればオリジナルホースに引き継ぎ可能です」）
  O.skillsOf = function (h) {
    const K = HS.Skills;
    const hand = (h.skills || []).filter(id => H.SKILLS[id]);
    const trig = K ? K.of(h, W.wIdx()) : [];
    const uniq = K ? trig.filter(id => K.isUnique(id)) : [];
    return uniq.concat(hand, trig.filter(id => !hand.includes(id) && !uniq.includes(id))).slice(0, O.MAX_SKILLS);
  };
  // 受け継ぐ候補（両親のものを合わせて最大8つ）
  // 成長型：父から 0.4・母から 0.4・8つの型からでたらめに 0.2（仕様書「成長型・脚質は両親から引き継ぐ：それ以外を 4:4:2」）
  O.childGrowth = function (rng, s, m) {
    const r = rng.next();
    const g = r < 0.4 ? (s.growth || '普通') : r < 0.8 ? (m.growth || '普通') : rng.pick(H.GROWTHS);
    return H.GROWTHS.includes(g) ? g : '普通';
  };
  O.candidates = (s, m) => { const out = []; for (const id of O.skillsOf(s).concat(O.skillsOf(m))) if (!out.includes(id)) out.push(id); return out; };

  // 作る
  O.make = function (sireId, damId, name) {
    const G = W.get();
    const s = W.horse(sireId), m = W.horse(damId);
    if (!s || !m || s.loc !== 'retired' || m.loc !== 'retired' || s.owner !== 'P' || m.owner !== 'P') return { err: '引退馬を選んでください' };
    if (s.sex === '牝' || m.sex !== '牝') return { err: '父は牡馬、母は牝馬' };
    if (m.foalY === G.year) return { err: `${m.name}は今年もう仔を産んだ（来年また作れる）` };
    // インブリード（js/core/inbreed.js）：近すぎる組み合わせは作れない。クロスで因子の能力が上がり、濃いと健康が下がりやすい
    const an = HS.Inbreed.analyze(s.name, m.name);
    if (an.block) return { err: an.block };
    for (const p of [s, m]) if (!O.foalsLeft(p)) return { err: `${p.name}はもう仔を作れない（1頭から${O.foalsMax()}頭まで）` };
    if (HS.Season && !HS.Season.canBuy()) return { err: `お手馬は${HS.Season.MAX_OWN}頭まで` };
    const rng = new U.RNG(U.hash(`orig:${G.seed}:${G.year}:${s.id}:${m.id}`));
    const bonus = O.childBonus(s, m); // 前の版の引退馬だけ（いまは引退で親の能力が上がっている）
    const pot = {};
    for (const k of H.STATS) {
      const a = (s.pot[k] || 70), b = (m.pot[k] != null ? m.pot[k] : a);
      // インブリードの上がりは両親の平均に足してから受け継ぐ（トロフィーで上がった親と同じ。強い両親ほど上がりにくく、重ねても上がりの分より積み上がらない）
      pot[k] = Math.round(U.clamp(O.inherit((a + b) / 2 + an.up[k]) + rng.normal(0, 6) + bonus, 40, 118) * 10) / 10;
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
      growth: O.childGrowth(rng, s, m), peakShift: 0, style: rng.pick([s.style, m.style].filter(Boolean)) || '先行',
      kire: U.clamp(Math.round(avg(s.kire || 4, m.kire || 4) + rng.normal(0, 1)), 1, 8),
      skills: pick.filter(id => H.SKILLS[id]), health: Math.round(U.clamp(avg(s.health || 70, m.health || 70) + rng.normal(0, 8), 40, 100)),
      coat: rng.pick([s.coat || '鹿毛', m.coat || '鹿毛']),
    };
    // 健康の下がり（濃いクロスほど下がりやすい）。仔の能力と同じ乱数の列を変えないよう、別の種で
    const drop = HS.Inbreed.healthDrop(new U.RNG(U.hash(`inbr:${G.seed}:${G.year}:${s.id}:${m.id}`)), an);
    if (drop) f.health = Math.max(HS.Inbreed.HEALTH_MIN, f.health - drop);
    const born = G.year - (G.month >= 10 ? 1 : 2); // 秋に作った仔は、年が明けて2歳
    const nm = (name || '').trim() || H.makeName(rng, W.usedNames());
    if (W.usedNames().has(nm) && W.all().some(h => h.name === nm)) return { err: 'その名前の馬がもういる' };
    const h = W.horseFromFoal(f, s.name, m.name, born, nm);
    h.trigFixed = pick.filter(id => !H.SKILLS[id]); // 発動する特殊能力は、受け継いだものに決める
    h.owner = 'P'; h.loc = 'farm'; h.original = true; h.auto = true; h.bonusFromParents = bonus;
    if (HS.Owners && HS.Owners.applyItems) HS.Owners.applyItems(h); // 馬主の依頼をやり終えてもらったアイテム（繁殖の永続のボーナス）
    H.syncApt(h);
    G.horses[h.id] = h;
    W.usedNames().add(nm);
    if (HS.Ped && HS.Ped.register) HS.Ped.register(nm, s.name, m.name);
    m.foalY = G.year;
    W.dirty();
    const upT = HS.Inbreed.upText(an.up);
    W.news(`オリジナルホース「${nm}」が生まれた！（父 ${s.name}・母 ${m.name}${bonus ? `・ボーナス +${bonus}` : ''}${upT ? `・インブリードで${upT}` : ''}）`, 'g1');
    // 作った数を数え、決まった数の仔を残した親は牧場を去る
    for (const p of [s, m]) {
      p.origN = (p.origN || 0) + 1;
      HS.Inbreed.remember(p); // 牧場を去っても、因子は子孫の血統表で効く
      if (!O.foalsLeft(p)) { delete G.horses[p.id]; W.news(`${p.name}は仔を${p.origN}頭残して、牧場を去った。`, 'info'); }
    }
    return { horse: h, bonus, skills: pick, inbreed: an, drop };
  };
})();
