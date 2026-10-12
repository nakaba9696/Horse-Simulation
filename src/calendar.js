// レース番組表と出走できるかの判定、相手の馬の生成（画面には依存しない）
(function (HS) {
  const W = () => HS.WEEKS_PER_YEAR;

  function dateLabel(year, week) {
    const month = Math.ceil(week / 4);
    const nth = ((week - 1) % 4) + 1;
    return `${year}年目 ${month}月 第${nth}週`;
  }

  function raceConditionFor(rng) {
    const r = rng();
    return r < 0.6 ? 'good' : r < 0.8 ? 'yielding' : r < 0.93 ? 'soft' : 'heavy';
  }

  function regular(rng, cls, age, extra) {
    const surface = rng() < 0.35 ? 'dirt' : 'turf';
    const dists = surface === 'dirt' ? [1200, 1400, 1600, 1800, 2100]
      : age === 2 ? [1200, 1400, 1600, 1800, 2000]
        : [1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600];
    const ageLabel = age === 2 ? '2歳' : age === 3 ? '3歳' : '3歳以上';
    return Object.assign({
      cls, age, surface,
      distance: rng.pick(dists),
      name: `${ageLabel}${HS.CLASSES[cls].label}`,
    }, extra || {});
  }

  // その週のレース一覧（シードとその年・週で決まる）
  function weekRaces(game, year, week) {
    const seed = HS.stableHash(`${game.seed}:${year}:${week}`);
    const rng = HS.createRng(seed);
    const list = [];
    HS.GRADED_RACES.filter((g) => g.week === week).forEach((g) => {
      list.push({ cls: g.grade, age: g.age, filly: !!g.filly, surface: g.surface, distance: g.distance,
        name: `${g.name}（${HS.CLASSES[g.grade].label}）`, graded: true });
    });
    HS.OVERSEAS_RACES.filter((o) => o.week === week).forEach((o) => {
      list.push({ cls: 'intl', age: 'older', surface: o.surface, distance: o.distance, overseas: true, heavy: !!o.heavy,
        name: `${o.name}（${o.region}・海外G1）` });
    });
    if (week >= 21) list.push(regular(rng, 'debut', 2));
    if (week >= 25) list.push(regular(rng, 'maiden', 2));
    if (week >= 30 && week % 2 === 0) list.push(regular(rng, 'win1', 2));
    if (week <= 24) {
      list.push(regular(rng, 'maiden', 3));
      list.push(regular(rng, 'win1', 3));
      if (week % 4 === 2) list.push(regular(rng, 'open', 3));
    } else if (week <= 36) {
      list.push(regular(rng, 'maiden', 3));
    }
    list.push(regular(rng, 'win1', 'older'));
    list.push(regular(rng, 'win2', 'older'));
    list.push(regular(rng, 'win3', 'older'));
    if (week % 2 === 1) list.push(regular(rng, 'open', 'older'));
    return list.map((r, i) => Object.assign(r, {
      id: `${year}-${week}-${i}`,
      year, week,
      condition: r.heavy && rng() < 0.6 ? 'soft' : raceConditionFor(rng),
      seed: HS.stableHash(`${seed}:${i}`),
    }));
  }

  function ageOf(horse, year) {
    return year - horse.birthYear;
  }

  // 勝ち数でクラスが決まる
  function classOf(horse) {
    const w = horse.record.wins;
    if (w === 0) return horse.record.starts === 0 ? 'debut' : 'maiden';
    return ['maiden', 'win1', 'win2', 'win3'][w] || 'open';
  }

  // 出走できないときは理由を返す。できるなら null
  function ineligibleReason(horse, race) {
    if (horse.status !== 'stable') return '厩舎にいない';
    if (horse.injuredWeeks > 0) return '故障中';
    if (horse.fatigue >= 90) return '疲れすぎ';
    const age = ageOf(horse, race.year);
    if (race.age === 2 && age !== 2) return '2歳限定';
    if (race.age === 3 && age !== 3) return '3歳限定';
    if (race.age === 'older' && age < 3) return '3歳以上';
    if (race.filly && horse.sex !== 'filly') return '牝馬限定';
    const w = horse.record.wins;
    switch (race.cls) {
      case 'debut': return horse.record.starts === 0 ? null : '新馬は初出走のみ';
      case 'maiden': return w === 0 ? null : '未勝利馬のみ';
      case 'win1': return w === 1 ? null : '1勝馬のみ';
      case 'win2': return w === 2 ? null : '2勝馬のみ';
      case 'win3': return w === 3 ? null : '3勝馬のみ';
      case 'intl': return horse.record.gradedWins >= 1 ? null : '重賞1勝以上が必要';
      default: return w >= 1 ? null : '1勝以上が必要';
    }
  }

  // 相手の馬を作る。能力の合計をクラスの幅に合わせる
  function makeOpponent(rng, race, idx, usedNames) {
    const base = HS.createHorse(rng, `o${idx}`, usedNames);
    let [lo, hi] = HS.CLASSES[race.cls].sum;
    const scale = race.age === 2 ? 0.82 : race.age === 3 && race.week <= 24 ? 0.93 : 1;
    const target = rng.range(lo, hi) * scale;
    const sum = HS.sumStats(base.stats);
    HS.STAT_KEYS.forEach((k) => { base.stats[k] = Math.min(100, Math.max(10, Math.round(base.stats[k] * target / sum))); });
    base.bestDistance = Math.round((race.distance + rng.normal() * 300) / 100) * 100;
    if (HS.APTITUDE[base.aptitude[race.surface]] < HS.APTITUDE.B && rng() < 0.7) base.aptitude[race.surface] = 'B';
    base.condition = rng.int(-1, 1);
    base.fatigue = rng.range(0, 30);
    base.sex = race.filly ? 'filly' : rng() < 0.5 ? 'colt' : 'filly';
    return base;
  }

  // 騎手を割り当てる。使われていない騎手から、クラスが高いほど上手い騎手が乗りやすい
  function pickJockey(rng, race, usedJockeys, preferBest) {
    const rank = HS.CLASS_ORDER.indexOf(race.cls);
    const ok = HS.JOCKEYS.filter((j) => !usedJockeys.has(j.id) && HS.CLASS_ORDER.indexOf(j.minClass) <= rank);
    if (!ok.length) return { id: null, name: rng.pick(['地方 騎手', '短期免許 騎手', '若手 騎手']), skill: Math.round(rng.range(48, 66)), style: rng.pick(HS.STYLE_KEYS) };
    ok.sort((a, b) => b.skill - a.skill);
    const j = preferBest || rng() < rank / 12 ? ok[0] : rng.pick(ok);
    usedJockeys.add(j.id);
    return j;
  }
  function ride(horse, j) {
    horse.jockeyId = j.id;
    horse.jockeyName = j.name;
    horse.jockeySkill = j.skill;
    horse.jockeyStyle = j.style;
  }

  // myHorses には騎手がもう決まっている。rivals はライバル馬主の馬
  function buildField(race, myHorses, rivals) {
    const rng = HS.createRng(race.seed ^ 0x5bd1e995);
    const others = rivals || [];
    const size = Math.max(myHorses.length + others.length + (myHorses.length ? 1 : 2), Math.min(12, rng.int(9, 12)));
    const used = new Set(myHorses.concat(others).map((h) => h.name));
    const usedJockeys = new Set(myHorses.map((h) => h.jockeyId).filter(Boolean));
    others.forEach((h) => ride(h, pickJockey(rng, race, usedJockeys, true)));
    const field = myHorses.concat(others);
    for (let i = field.length; i < size; i++) {
      const o = makeOpponent(rng, race, i, used);
      ride(o, pickJockey(rng, race, usedJockeys, false));
      field.push(o);
    }
    // 馬番はランダム
    for (let i = field.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [field[i], field[j]] = [field[j], field[i]];
    }
    return field;
  }

  function prizeFor(race, rank) {
    const share = HS.PRIZE_SHARE[rank - 1] || 0;
    return Math.round(HS.CLASSES[race.cls].prize * share) + HS.APPEARANCE_FEE;
  }

  HS.dateLabel = dateLabel;
  HS.weekRaces = weekRaces;
  HS.ageOf = ageOf;
  HS.classOf = classOf;
  HS.ineligibleReason = ineligibleReason;
  HS.buildField = buildField;
  HS.prizeFor = prizeFor;
  HS.makeOpponent = makeOpponent;
  HS.ride = ride;
})(globalThis.HS = globalThis.HS || {});
