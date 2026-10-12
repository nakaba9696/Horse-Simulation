// 配合・成長・表示用の評価（画面には依存しない）
(function (HS) {
  const sumStats = (s) => HS.STAT_KEYS.reduce((a, k) => a + s[k], 0);

  // 種付け料（万円）：素質の合計が高いほど高い
  function studFee(stallion) {
    if (stallion.own) return 0;
    const x = Math.max(0, (sumStats(stallion.potential) - 340) / 90);
    return Math.max(50, Math.round((x * x * 3000) / 50) * 50);
  }

  // 年齢と成長の型から、素質の何割まで力が出せるか
  function maturity(growth, age) {
    const c = HS.GROWTH[growth].curve;
    if (age < 0) return 0.2;
    if (age > 7) return Math.max(0.5, c[7] - (age - 7) * 0.08);
    return c[age];
  }

  function capOf(horse, age) {
    const m = maturity(horse.growth, age);
    const cap = {};
    HS.STAT_KEYS.forEach((k) => { cap[k] = horse.potential[k] * m; });
    return cap;
  }

  function inheritAptitude(rng, a, b) {
    const order = ['A', 'B', 'C', 'D'];
    const mid = (order.indexOf(a) + order.indexOf(b)) / 2 + rng.normal() * 0.7;
    return order[Math.min(3, Math.max(0, Math.round(mid)))];
  }

  // ---- 血統 ----
  const MAX_GEN = 4;

  function findStallion(name, extra) {
    return HS.STALLIONS.find((x) => x.name === name) || (extra || []).find((x) => x.name === name) || null;
  }

  // 父と母から、祖先の一覧（名前と世代）を作る。父方・母方を分けて返す
  function sides(sire, dam) {
    const up = (p) => {
      if (!p) return [];
      const list = [{ name: p.name, gen: 1 }];
      (p.ancestors || []).forEach((a) => { if (a.gen + 1 <= MAX_GEN) list.push({ name: a.name, gen: a.gen + 1 }); });
      return list;
    };
    return { s: up(sire), d: up(dam) };
  }

  function mergeAncestors(sire, dam) {
    const { s, d } = sides(sire, dam);
    return s.concat(d);
  }

  // 系統：父の系統を受け継ぐ。祖となる馬なら、その系統
  function lineOfName(name, extra) {
    if (HS.FOUNDERS[name]) return HS.FOUNDERS[name];
    if (HS.ANCESTOR_LINES[name]) return HS.ANCESTOR_LINES[name];
    const st = findStallion(name, extra);
    return st ? st.line : '—';
  }

  // 名前から、分かっている範囲の父系の祖先をたどる（種牡馬一覧か、祖先の父の表から）
  function pedigreeOf(name, extra) {
    const st = findStallion(name, extra);
    if (st && st.ancestors) return { name, ancestors: st.ancestors };
    const sire = HS.ANCESTOR_SIRES[name];
    if (!sire) return { name, ancestors: [] };
    const up = pedigreeOf(sire, extra);
    return { name, ancestors: [{ name: sire, gen: 1 }].concat(up.ancestors.map((a) => ({ name: a.name, gen: a.gen + 1 }))) };
  }

  // 父と母の父から、祖先の一覧を作る（母の父は 2 代前）
  function ancestorsFromSire(sireName, damSireName, extra) {
    const list = mergeAncestors(pedigreeOf(sireName, extra), null);
    if (damSireName) {
      const ds = pedigreeOf(damSireName, extra);
      list.push({ name: damSireName, gen: 2 });
      ds.ancestors.forEach((a) => { if (a.gen + 2 <= MAX_GEN) list.push({ name: a.name, gen: a.gen + 2 }); });
    }
    return list;
  }

  // 種牡馬の系統と祖先を、父と母の父から組み立てる（読み込み時に一度だけ）
  function initStallions() {
    HS.STALLIONS.forEach((st) => {
      st.line = lineOfName(st.sire);
      st.damLine = lineOfName(st.damSire);
      st.ancestors = ancestorsFromSire(st.sire, st.damSire);
    });
  }

  // 配合の評価（ダビスタ・ウイポ風）：ニックス・インブリード・アウトブリード
  function breedingTheory(sire, dam) {
    const { s, d } = sides(sire, dam);
    const minGen = (list) => {
      const m = new Map();
      list.forEach((a) => { if (a.name && (!m.has(a.name) || m.get(a.name) > a.gen)) m.set(a.name, a.gen); });
      return m;
    };
    const ms = minGen(s);
    const md = minGen(d);
    const inbreeds = [];
    ms.forEach((g, name) => { if (md.has(name)) inbreeds.push({ name, cross: `${g}×${md.get(name)}`, sum: g + md.get(name) }); });
    inbreeds.sort((a, b) => a.sum - b.sum);
    const nick = HS.NICKS.some(([a, b]) => a === sire.line && b === dam.line);
    const outcross = inbreeds.length === 0 && sire.line !== dam.line;
    let bonus = 0;
    let frail = false;
    let explosive = 0;
    const notes = [];
    if (nick) { bonus += 0.03; notes.push(`ニックス（${sire.line}×母父${dam.line}）`); }
    if (inbreeds.length) {
      const best = inbreeds[0];
      if (best.sum <= 4) { bonus += 0.03; explosive = 0.06; frail = true; notes.push(`${best.name} ${best.cross} の濃いインブリード（爆発力あり・体質が弱くなりやすい）`); }
      else if (best.sum <= 6) { bonus += 0.03; explosive = 0.04; notes.push(`${best.name} ${best.cross} のインブリード（爆発力）`); }
      else { bonus += 0.015; explosive = 0.02; notes.push(`${best.name} ${best.cross} のインブリード`); }
    }
    if (outcross) { bonus += 0.01; notes.push('アウトブリード（血が新しく、丈夫）'); }
    if (Math.abs(sire.bestDistance - dam.bestDistance) <= 400) { bonus += 0.01; notes.push('距離の適性が近い'); }
    if (!notes.length) notes.push('特徴の少ない配合');
    const score = bonus >= 0.06 ? '◎' : bonus >= 0.04 ? '○' : bonus >= 0.02 ? '▲' : '△';
    return { nick, inbreeds, outcross, bonus, frail, explosive, notes, score };
  }

  function makeFoal(rng, sire, dam, id, name, birthYear) {
    const th = breedingTheory(sire, dam);
    const potential = {};
    // インブリードの爆発力：どれか 1 つの能力が大きく伸びることがある
    const burst = th.explosive && rng() < 0.5 ? rng.pick(HS.STAT_KEYS) : null;
    HS.STAT_KEYS.forEach((k) => {
      const mid = (sire.potential[k] * 0.55 + dam.potential[k] * 0.45);
      const spread = 0.08 + th.explosive;
      let v = mid * (1 + th.bonus) * rng.range(1 - spread, 1 + spread * 0.9) + rng.normal() * 4;
      if (k === burst) v += rng.range(4, 10);
      potential[k] = Math.round(Math.min(100, Math.max(20, v)));
    });
    const growth = rng() < 0.6 ? rng.pick([sire.growth, dam.growth]) : rng.pick(HS.GROWTH_KEYS);
    const horse = {
      id, name,
      sex: rng() < 0.5 ? 'colt' : 'filly',
      birthYear,
      sireName: sire.name,
      damName: dam.name,
      damSireName: dam.sireName,
      line: sire.line,
      damLine: dam.line,
      ancestors: mergeAncestors(sire, dam),
      frail: th.frail,
      theory: th.notes,
      potential,
      stats: {},
      growth,
      style: rng() < 0.75 ? rng.pick([sire.style, dam.style]) : rng.pick(HS.STYLE_KEYS),
      bestDistance: Math.round(((sire.bestDistance + dam.bestDistance) / 2 + rng.normal() * 250) / 100) * 100,
      aptitude: { turf: inheritAptitude(rng, sire.aptitude.turf, dam.aptitude.turf), dirt: inheritAptitude(rng, sire.aptitude.dirt, dam.aptitude.dirt) },
      status: 'farm',
      fatigue: 0,
      condition: 0,
      injuredWeeks: 0,
      record: { starts: 0, wins: 0, places: 0, earnings: 0, gradedWins: 0, g1Wins: 0, titles: [] },
    };
    horse.bestDistance = Math.min(3400, Math.max(1000, horse.bestDistance));
    const cap = capOf(horse, 0);
    HS.STAT_KEYS.forEach((k) => { horse.stats[k] = Math.round(cap[k] * rng.range(0.7, 0.9)); });
    return horse;
  }

  // 能力の評価（数値は見せず、記号で見せる）
  function grade(v) {
    if (v >= 90) return 'S';
    if (v >= 80) return 'A';
    if (v >= 70) return 'B';
    if (v >= 60) return 'C';
    if (v >= 50) return 'D';
    if (v >= 40) return 'E';
    if (v >= 30) return 'F';
    return 'G';
  }

  // 素質についての牧場長・調教師の見立て（はっきりした数値は出さない）
  function potentialComment(horse) {
    const s = sumStats(horse.potential);
    if (s >= 430) return 'とんでもない馬かもしれません。大きいところを狙えます。';
    if (s >= 405) return 'かなりの素質です。重賞でも戦えそうです。';
    if (s >= 380) return '良い馬です。オープンまでは行けるでしょう。';
    if (s >= 350) return 'まずまずの素質です。条件戦なら勝負になります。';
    if (s >= 320) return '地道に走ってくれそうです。';
    return '正直、厳しい戦いになりそうです。';
  }

  // セリで見た印象（素質に、見る目のぶれが混ざる）
  function impressionComment(horse) {
    const rng = HS.createRng(HS.stableHash('look:' + horse.id + horse.name));
    const noisy = { potential: {} };
    HS.STAT_KEYS.forEach((k) => { noisy.potential[k] = horse.potential[k] + rng.normal() * 5; });
    return potentialComment(noisy);
  }

  HS.sumStats = sumStats;
  HS.impressionComment = impressionComment;
  HS.studFee = studFee;
  HS.maturity = maturity;
  HS.capOf = capOf;
  HS.makeFoal = makeFoal;
  HS.breedingTheory = breedingTheory;
  HS.ancestorsFromSire = ancestorsFromSire;
  HS.lineOfName = lineOfName;
  HS.findStallion = findStallion;
  initStallions();
  HS.grade = grade;
  HS.potentialComment = potentialComment;
})(globalThis.HS = globalThis.HS || {});
