// ライバル馬主の馬・成績の記録・年度の表彰（画面には依存しない）
(function (HS) {
  const RIVAL_RETIRE_AGE = 6;

  // 1 レースぶんの成績を記録する（自分の馬にもライバルの馬にも使う）
  function recordRace(h, race, rank, prize) {
    const r = h.record;
    r.starts++;
    r.earnings += prize;
    if (rank === 1) {
      r.wins++;
      if (['g1', 'g2', 'g3', 'intl'].includes(race.cls)) {
        r.gradedWins++;
        r.titles.push(`${race.year}年 ${race.name}`);
      }
      if (race.cls === 'g1' || race.cls === 'intl') r.g1Wins++;
    }
    if (rank <= 3) r.places++;
    r.byYear = r.byYear || {};
    const y = (r.byYear[race.year] = r.byYear[race.year] || { earn: 0, wins: 0, g1: 0, starts: 0 });
    y.earn += prize;
    y.starts++;
    if (rank === 1) y.wins++;
    if (rank === 1 && (race.cls === 'g1' || race.cls === 'intl')) y.g1++;
  }

  function recordJockey(game, jockeyId, year, rank) {
    if (!jockeyId) return;
    game.jockeyStats = game.jockeyStats || {};
    const s = (game.jockeyStats[year] = game.jockeyStats[year] || {});
    const j = (s[jockeyId] = s[jockeyId] || { rides: 0, wins: 0 });
    j.rides++;
    if (rank === 1) j.wins++;
  }

  function makeRivalHorse(game, rng, owner, birthYear) {
    const base = HS.createHorse(rng, 'r' + game.nextId++, new Set());
    base.name = HS.uniqueName(game, rng);
    const target = rng.range(owner.level[0], owner.level[1]);
    const sum = HS.sumStats(base.stats);
    base.potential = {};
    HS.STAT_KEYS.forEach((k) => { base.potential[k] = Math.min(100, Math.round(base.stats[k] * target / sum)); });
    base.growth = rng.pick(HS.GROWTH_KEYS);
    base.sex = rng() < 0.5 ? 'colt' : 'filly';
    base.birthYear = birthYear;
    base.owner = owner.id;
    base.ownerName = owner.name;
    base.sireName = rng.pick(HS.STALLIONS).name;
    base.damName = '—';
    base.fatigue = 0;
    base.condition = 0;
    base.injuredWeeks = 0;
    base.status = 'stable';
    base.record = { starts: 0, wins: 0, places: 0, earnings: 0, gradedWins: 0, g1Wins: 0, titles: [], byYear: {} };
    const cap = HS.capOf(base, Math.max(2, game.year - birthYear));
    HS.STAT_KEYS.forEach((k) => { base.stats[k] = Math.round(cap[k] * 0.9 * 10) / 10; });
    return base;
  }

  // ゲーム開始時：各馬主に 2〜4 歳の馬を 2 頭ずつ
  function makeRivals(game) {
    const rng = HS.createRng(HS.stableHash(game.seed + ':rivals'));
    game.rivals = [];
    HS.RIVAL_OWNERS.forEach((o) => {
      [2, 3, 4].forEach((age) => {
        for (let i = 0; i < 2; i++) {
          const h = makeRivalHorse(game, rng, o, game.year - age);
          // 年上の馬は、力に見合うだけ勝っていることにする
          if (age >= 3) {
            const sum = HS.sumStats(h.stats);
            h.record.wins = Math.max(0, Math.min(age === 3 ? 3 : 5, Math.floor((sum - 230) / 22)));
            h.record.starts = h.record.wins + Math.round(rng.range(2, 8));
            h.record.earnings = h.record.wins * 1500;
          }
          game.rivals.push(h);
        }
      });
    });
  }

  function newCrop(game, events) {
    const rng = HS.createRng(HS.stableHash(`${game.seed}:crop:${game.year}`));
    game.rivals = game.rivals.filter((h) => HS.ageOf(h, game.year) < RIVAL_RETIRE_AGE);
    HS.RIVAL_OWNERS.forEach((o) => {
      for (let i = 0; i < 2; i++) game.rivals.push(makeRivalHorse(game, rng, o, game.year - 2));
    });
  }

  // このレースに出てくるライバルの馬（最大 3 頭）
  function rivalsFor(game, race, rng, maxCount) {
    const graded = ['g1', 'g2', 'g3', 'intl'].includes(race.cls);
    const ok = (game.rivals || []).filter((h) => h.fatigue < 40 && !h.busy && !HS.ineligibleReason(h, race)
      && Math.abs(h.bestDistance - race.distance) <= 800 && rng() < (graded ? 0.75 : 0.35));
    ok.sort((a, b) => HS.sumStats(b.stats) - HS.sumStats(a.stats));
    return ok.slice(0, maxCount === undefined ? 3 : maxCount);
  }

  // ライバルの馬の 1 週間：成長・回復と、裏で走る条件戦（重賞は実際に走らせる）
  function rivalWeek(game) {
    const rng = HS.createRng(HS.stableHash(`${game.seed}:${game.year}:${game.week}:rivalweek`));
    (game.rivals || []).forEach((h) => {
      const age = HS.ageOf(h, game.year);
      HS.STAT_KEYS.forEach((k) => {
        const cap = HS.capOf(h, age)[k];
        h.stats[k] = Math.round((h.stats[k] + (cap - h.stats[k]) * 0.05) * 10) / 10;
      });
      h.fatigue = Math.max(0, h.fatigue - 10);
      h.condition = rng.int(-1, 1);
      if (h.busy) { h.busy = false; return; }
      const cls = HS.classOf(h);
      if (HS.CLASS_ORDER.indexOf(cls) >= HS.CLASS_ORDER.indexOf('open')) return; // オープン馬は重賞で走る
      if (age === 2 && game.week < 21) return;
      if (h.fatigue >= 30 || rng() > 0.25) return;
      const c = HS.CLASSES[cls];
      const scale = age === 2 ? 0.82 : 1;
      const mid = ((c.sum[0] + c.sum[1]) / 2) * scale;
      const p = Math.min(0.7, Math.max(0.02, 0.1 * Math.exp((HS.sumStats(h.stats) - mid) / 15)));
      const roll = rng();
      const rank = roll < p ? 1 : roll < p * 2.5 ? 2 + Math.floor(rng() * 2) : 4 + Math.floor(rng() * 6);
      const race = { cls, year: game.year, name: `${HS.CLASSES[cls].label}` };
      recordRace(h, race, rank, HS.prizeFor(race, rank));
      h.fatigue += 30;
    });
  }

  // ---- 年度の表彰 ----
  function yearStat(h, year) {
    return (h.record.byYear && h.record.byYear[year]) || { earn: 0, wins: 0, g1: 0, starts: 0 };
  }

  function computeAwards(game, year) {
    const mine = game.horses.filter((h) => h.record.starts > 0 && h.status !== 'broodmare').concat(
      game.hallOfFame.filter((h) => h.retiredYear >= year && h.birthYear !== undefined));
    const pool = mine.map((h) => ({ h, mine: true, owner: 'あなたの牧場' }))
      .concat((game.rivals || []).map((h) => ({ h, mine: false, owner: h.ownerName })))
      .filter((x) => yearStat(x.h, year).starts > 0);
    const score = (x) => yearStat(x.h, year).g1 * 100000 + yearStat(x.h, year).earn;
    const best = (list) => list.sort((a, b) => score(b) - score(a))[0];
    const items = [];
    const add = (title, x) => { if (x) items.push({ title, name: x.h.name, owner: x.owner, mine: x.mine }); };
    const ageIs = (x, f) => f(year - x.h.birthYear);
    add('年度代表馬', best(pool.slice()));
    add('最優秀2歳牡馬', best(pool.filter((x) => ageIs(x, (a) => a === 2) && x.h.sex === 'colt')));
    add('最優秀2歳牝馬', best(pool.filter((x) => ageIs(x, (a) => a === 2) && x.h.sex === 'filly')));
    add('最優秀3歳馬', best(pool.filter((x) => ageIs(x, (a) => a === 3))));
    add('最優秀古馬', best(pool.filter((x) => ageIs(x, (a) => a >= 4))));
    // 馬主：その年の獲得賞金
    const owners = {};
    pool.forEach((x) => { owners[x.owner] = (owners[x.owner] || 0) + yearStat(x.h, year).earn; });
    const topOwner = Object.entries(owners).sort((a, b) => b[1] - a[1])[0];
    if (topOwner) items.push({ title: 'リーディング馬主', name: topOwner[0], owner: `${topOwner[1].toLocaleString('ja-JP')}万円`, mine: topOwner[0] === 'あなたの牧場' });
    // 騎手：その年の勝ち数
    const js = (game.jockeyStats && game.jockeyStats[year]) || {};
    const topJ = Object.entries(js).sort((a, b) => b[1].wins - a[1].wins)[0];
    if (topJ) {
      const j = HS.JOCKEYS.find((x) => x.id === topJ[0]);
      items.push({ title: 'リーディング騎手', name: j ? j.name : topJ[0], owner: `${topJ[1].wins}勝`, mine: false });
    }
    return { year, items };
  }

  HS.recordRace = recordRace;
  HS.recordJockey = recordJockey;
  HS.makeRivals = makeRivals;
  HS.newCrop = newCrop;
  HS.rivalsFor = rivalsFor;
  HS.rivalWeek = rivalWeek;
  HS.computeAwards = computeAwards;
  HS.yearStat = yearStat;
})(globalThis.HS = globalThis.HS || {});
