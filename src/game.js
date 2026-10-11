// ゲームの進行（牧場・厩舎・週の進行）。画面には依存しない。お金の単位は万円。
(function (HS) {
  const SAVE_VERSION = 3;
  const START_MONEY = 5000;
  const STABLE_LIMIT = 8;
  const BROODMARE_LIMIT = 6;
  const BREEDING_WEEKS = [5, 16];
  const BIRTH_WEEK = 10;
  const COST_FARM = 2;     // 牧場の飼い葉代（週）
  const RETIRE_AGE = 8;

  function rngFor(game, tag) {
    return HS.createRng(HS.stableHash(`${game.seed}:${game.year}:${game.week}:${tag}`));
  }

  function newRecord() {
    return { starts: 0, wins: 0, places: 0, earnings: 0, gradedWins: 0, g1Wins: 0, titles: [] };
  }

  function nameFor(game, rng) {
    const used = new Set(game.horses.map((h) => h.name)
      .concat(game.hallOfFame.map((h) => h.name))
      .concat((game.rivals || []).map((h) => h.name))
      .concat(Object.keys(HS.FOUNDERS))
      .concat(Object.keys(HS.ANCESTOR_LINES))
      .concat(HS.allStallions(game).map((x) => x.name)));
    return HS.createHorse(rng, 'tmp', used).name;
  }

  // 最初の牧場：繁殖牝馬 2 頭（1 頭は受胎済み）・2 歳馬 1 頭・1 歳馬 1 頭
  function newGame(seed) {
    const s = seed >>> 0;
    const game = {
      version: SAVE_VERSION, seed: s, year: 1, week: 1, money: START_MONEY, nextId: 1,
      horses: [], ownStallions: [], hallOfFame: [], log: [], gameOver: false, auction: null,
      rivals: [], awards: [], jockeyStats: {},
    };
    const rng = HS.createRng(s);
    const m1 = makeMare(game, 'ハルノソング', 'ダイワメジャー', 'サクラバクシンオー', { speed: 72, stamina: 68, power: 66, guts: 70, wits: 70 }, 'senko', 1800, { turf: 'B', dirt: 'B' }, -6);
    const m2 = makeMare(game, 'ルリノワルツ', 'ハーツクライ', 'キングカメハメハ', { speed: 68, stamina: 74, power: 62, guts: 66, wits: 72 }, 'sashi', 2200, { turf: 'B', dirt: 'C' }, -8);
    game.horses.push(m1, m2);
    const s8 = HS.STALLIONS.find((x) => x.id === 'S8');
    m1.pregnant = { sire: JSON.parse(JSON.stringify(s8)), year: 0 };
    // 2 歳馬（すぐ入厩済み）と 1 歳馬
    const colt = HS.makeFoal(rng, HS.STALLIONS.find((x) => x.id === 'S5'), m2, 'p' + game.nextId++, nameFor(game, rng), -1);
    colt.status = 'stable';
    colt.trainer = HS.DEFAULT_TRAINER;
    colt.jockey = 'J7';
    grow(colt, 2, 0.88);
    const filly = HS.makeFoal(rng, HS.STALLIONS.find((x) => x.id === 'S9'), m1, 'p' + game.nextId++, nameFor(game, rng), 0);
    grow(filly, 1, 0.9);
    game.horses.push(colt, filly);
    HS.makeRivals(game);
    log(game, '牧場を引き継ぎました。まずは 2 歳馬をデビューさせましょう。');
    return game;
  }

  function makeMare(game, name, sireName, damSireName, pot, style, dist, apt, birthYear) {
    return {
      id: 'p' + game.nextId++, name, sex: 'filly', birthYear, sireName, damName: '—', damSireName,
      line: HS.lineOfName(sireName, game.ownStallions), damLine: HS.lineOfName(damSireName, game.ownStallions),
      ancestors: HS.ancestorsFromSire(sireName, damSireName, game.ownStallions),
      potential: pot, stats: Object.assign({}, pot), growth: 'normal', style, bestDistance: dist, aptitude: apt,
      status: 'broodmare', fatigue: 0, condition: 0, injuredWeeks: 0, record: newRecord(), pregnant: null,
    };
  }

  // ---- セリ（7 月）：1 歳馬を買える。値段は素質と完全には一致しない ----
  const AUCTION_WEEKS = [25, 28];
  function makeAuction(game) {
    const rng = rngFor(game, 'auction');
    const lots = [];
    const founders = Object.keys(HS.FOUNDERS);
    for (let i = 0; i < 6; i++) {
      const sire = rng.pick(HS.STALLIONS);
      // 母の父は、仔の父とは別の馬にする（近すぎる配合を避ける）
      const damSire = rng.pick(founders.concat(HS.STALLIONS.map((x) => x.name)).filter((n) => n !== sire.name && n !== sire.sire));
      const pot = {};
      HS.STAT_KEYS.forEach((k) => { pot[k] = Math.round(rng.range(58, 80)); });
      const dam = makeMare({ nextId: 0, ownStallions: game.ownStallions }, nameFor(game, rng), damSire, rng.pick(founders), pot,
        rng.pick(HS.STYLE_KEYS), Math.round(rng.range(14, 26)) * 100, { turf: rng.pick(['A', 'B', 'C']), dirt: rng.pick(['B', 'C', 'D']) }, game.year - 8);
      const foal = HS.makeFoal(rng, sire, dam, 'p' + game.nextId++, nameFor(game, rng), game.year - 1);
      const cap = HS.capOf(foal, 1);
      HS.STAT_KEYS.forEach((k) => { foal.stats[k] = Math.round(cap[k] * rng.range(0.8, 0.95) * 10) / 10; });
      // 値段：素質の合計から決まるが、ばらつきが大きい（掘り出し物も、はずれもある）
      const x = Math.max(0, (HS.sumStats(foal.potential) - 300) / 110);
      const price = Math.max(100, Math.round((x * x * 3000 + 150) * rng.range(0.6, 1.5) / 10) * 10);
      lots.push({ horse: foal, price });
    }
    return lots;
  }
  const auctionOpen = (game) => game.week >= AUCTION_WEEKS[0] && game.week <= AUCTION_WEEKS[1];

  function buyAtAuction(game, index) {
    if (!auctionOpen(game) || !game.auction) return 'セリは 7 月だけです';
    const lot = game.auction[index];
    if (!lot || lot.sold) return 'その馬はもういません';
    if (game.money < lot.price) return 'お金が足りません';
    game.money -= lot.price;
    lot.sold = true;
    const h = JSON.parse(JSON.stringify(lot.horse));
    game.horses.push(h);
    log(game, `セリで ${h.name}（父 ${h.sireName}）を ${lot.price}万円で落札しました。`);
    return null;
  }

  // 最初の馬を、その年齢なりに育った状態にする
  function grow(horse, age, frac) {
    const cap = HS.capOf(horse, age);
    HS.STAT_KEYS.forEach((k) => { horse.stats[k] = Math.round(cap[k] * frac * 10) / 10; });
  }

  function log(game, text) {
    game.log.unshift({ date: HS.dateLabel(game.year, game.week), text });
    game.log = game.log.slice(0, 80);
  }

  function migrate(save) {
    if (!save || typeof save !== 'object' || !Array.isArray(save.horses)) return null;
    if (save.version !== 2 && save.version !== SAVE_VERSION) return null;
    const g = Object.assign({ ownStallions: [], hallOfFame: [], log: [], gameOver: false, awards: [], jockeyStats: {} }, save);
    // 2 → 3：騎手・調教師・ライバル馬主を足した
    if (!Array.isArray(g.rivals)) HS.makeRivals(g);
    g.version = SAVE_VERSION;
    g.horses.forEach((h) => {
      h.record = Object.assign(newRecord(), h.record);
      if (h.fatigue === undefined) h.fatigue = 0;
      if (h.condition === undefined) h.condition = 0;
      if (h.injuredWeeks === undefined) h.injuredWeeks = 0;
      if (h.status === 'stable' && !h.trainer) h.trainer = HS.DEFAULT_TRAINER;
    });
    return g;
  }

  const find = (game, id) => game.horses.find((h) => h.id === id);
  const inSeason = (game) => game.week >= BREEDING_WEEKS[0] && game.week <= BREEDING_WEEKS[1];
  function allStallions(game) {
    return HS.STALLIONS.concat(game.ownStallions);
  }

  // ---- プレイヤーの操作 ----
  function breed(game, mareId, stallionId) {
    const mare = find(game, mareId);
    const st = allStallions(game).find((s) => s.id === stallionId);
    if (!mare || mare.status !== 'broodmare') return '繁殖牝馬ではありません';
    if (!st) return '種牡馬がいません';
    if (!inSeason(game)) return `種付けは ${BREEDING_WEEKS[0]}〜${BREEDING_WEEKS[1]} 週（2〜4 月）だけです`;
    if (mare.pregnant) return 'すでに受胎しています';
    const fee = HS.studFee(st);
    if (game.money < fee) return 'お金が足りません';
    game.money -= fee;
    mare.pregnant = { sire: JSON.parse(JSON.stringify(st)), year: game.year };
    log(game, `${mare.name} に ${st.name} を種付けしました（${fee}万円）。来年の春に生まれます。`);
    return null;
  }

  function enterStable(game, id, trainerId) {
    const h = find(game, id);
    if (!h || h.status !== 'farm') return '牧場にいません';
    if (HS.ageOf(h, game.year) < 2) return '入厩は 2 歳から';
    if (h.injuredWeeks > 0) return '故障が治るまで待ちましょう';
    if (game.horses.filter((x) => x.status === 'stable').length >= STABLE_LIMIT) return `厩舎は ${STABLE_LIMIT} 頭までです`;
    h.status = 'stable';
    h.trainer = HS.TRAINERS.some((t) => t.id === trainerId) ? trainerId : h.trainer || HS.DEFAULT_TRAINER;
    log(game, `${h.name} が ${trainerOf(h).name} に入厩しました。`);
    return null;
  }

  function sendToFarm(game, id) {
    const h = find(game, id);
    if (!h || h.status !== 'stable') return '厩舎にいません';
    h.status = 'farm';
    h.entry = null;
    log(game, `${h.name} を放牧に出しました。`);
    return null;
  }

  const trainerOf = (h) => HS.TRAINERS.find((t) => t.id === h.trainer) || HS.TRAINERS.find((t) => t.id === HS.DEFAULT_TRAINER);
  const jockeyOf = (h) => HS.JOCKEYS.find((j) => j.id === h.jockey) || HS.JOCKEYS.find((j) => j.id === HS.DEFAULT_JOCKEY);

  // 騎手がこの馬に乗ってくれるか（クラスが足りないと断られる）
  function jockeyAccepts(j, h) {
    return HS.CLASS_ORDER.indexOf(HS.classOf(h)) >= HS.CLASS_ORDER.indexOf(j.minClass) || h.record.gradedWins > 0;
  }

  function setJockey(game, id, jockeyId) {
    const h = find(game, id);
    const j = HS.JOCKEYS.find((x) => x.id === jockeyId);
    if (!h || !j) return '騎手がいません';
    if (!jockeyAccepts(j, h)) return `${j.name} は ${HS.CLASSES[j.minClass].label} 以上の馬にしか乗りません`;
    h.jockey = jockeyId;
    return null;
  }

  function setTrainer(game, id, trainerId) {
    const h = find(game, id);
    const t = HS.TRAINERS.find((x) => x.id === trainerId);
    if (!h || !t) return '調教師がいません';
    if (h.trainer !== trainerId) log(game, `${h.name} が ${t.name} に転厩しました。`);
    h.trainer = trainerId;
    return null;
  }

  function setTraining(game, id, key) {
    const h = find(game, id);
    if (h && HS.TRAININGS[key]) h.training = key;
  }

  function setEntry(game, id, raceId) {
    const h = find(game, id);
    if (!h) return '馬がいません';
    if (!raceId) { h.entry = null; return null; }
    const race = HS.weekRaces(game, game.year, game.week).find((r) => r.id === raceId);
    if (!race) return 'レースがありません';
    const why = HS.ineligibleReason(h, race);
    if (why) return why;
    h.entry = raceId;
    return null;
  }

  function rename(game, id, name) {
    const h = find(game, id);
    const n = String(name || '').trim();
    if (!h || !n || n.length > 9) return '名前は 1〜9 文字';
    if (game.horses.some((x) => x !== h && x.name === n)) return '同じ名前の馬がいます';
    if (h.record.starts > 0) return 'デビュー後は変えられません';
    h.name = n;
    return null;
  }

  function canStandAtStud(h) {
    return h.sex === 'colt' && (h.record.g1Wins >= 1 || h.record.gradedWins >= 2);
  }

  function retire(game, id) {
    const h = find(game, id);
    if (!h || (h.status !== 'stable' && h.status !== 'farm')) return '引退できません';
    if (HS.ageOf(h, game.year) < 2) return 'まだ若すぎます';
    game.hallOfFame.unshift({ name: h.name, sex: h.sex, birthYear: h.birthYear, sireName: h.sireName, damName: h.damName, record: h.record, retiredYear: game.year });
    if (h.sex === 'filly' && game.horses.filter((x) => x.status === 'broodmare').length < BROODMARE_LIMIT) {
      h.status = 'broodmare';
      h.pregnant = null;
      h.entry = null;
      log(game, `${h.name} が引退し、繁殖牝馬になりました。`);
    } else if (canStandAtStud(h)) {
      game.ownStallions.push({ id: 'own-' + h.id, name: h.name, sire: h.sireName, damSire: h.damSireName, line: h.line, damLine: h.damLine,
        ancestors: h.ancestors, potential: Object.assign({}, h.potential), style: h.style,
        bestDistance: h.bestDistance, aptitude: Object.assign({}, h.aptitude), growth: h.growth, own: true });
      game.horses = game.horses.filter((x) => x !== h);
      log(game, `${h.name} が引退し、種牡馬になりました。自分の牧場の馬には無料で種付けできます。`);
    } else {
      const price = Math.max(50, Math.round(h.record.earnings * 0.05));
      game.money += price;
      game.horses = game.horses.filter((x) => x !== h);
      log(game, `${h.name} が引退しました（${price}万円で引き取られました）。`);
    }
    return null;
  }

  // ---- 週を進める ----
  function advanceWeek(game) {
    if (game.gameOver) return { races: [], events: [] };
    const events = [];
    const races = HS.weekRaces(game, game.year, game.week);
    const raced = new Set();
    const outcomes = [];

    // 1. レース（自分の馬が出るレース）
    let jockeyFees = 0;
    races.forEach((race) => {
      const mine = game.horses.filter((h) => h.entry === race.id && !HS.ineligibleReason(h, race));
      if (!mine.length) return;
      if (race.overseas) {
        if (game.money < HS.TRAVEL_COST * mine.length) {
          events.push(`${race.name}：遠征費（${HS.TRAVEL_COST}万円）が足りず、出走を取りやめました。`);
          return;
        }
        game.money -= HS.TRAVEL_COST * mine.length;
      }
      // 騎手：同じレースで同じ騎手は 1 頭だけ。乗れないときは見習い騎手
      const usedJ = new Set();
      mine.forEach((h) => {
        let j = jockeyOf(h);
        if (usedJ.has(j.id) || !jockeyAccepts(j, h)) j = HS.JOCKEYS.find((x) => x.id === HS.DEFAULT_JOCKEY && !usedJ.has(x.id)) || { id: null, name: '代わりの騎手', skill: 45, style: h.style, fee: 5 };
        if (j.id) usedJ.add(j.id);
        HS.ride(h, j);
        jockeyFees += j.fee || 0;
      });
      const paddock = mine.map((h) => ({ name: h.name, text: HS.paddockComment ? HS.paddockComment(h) : '' }));
      const rrng = rngFor(game, 'rivals' + race.id);
      const rivals = HS.rivalsFor(game, race, rrng, Math.min(3, 11 - mine.length));
      const field = HS.buildField(race, mine, rivals);
      const sim = HS.simulateRace(race, field, race.seed, { record: true });
      const lines = [];
      sim.results.forEach((r) => {
        const h = field[r.index];
        HS.recordJockey(game, h.jockeyId, game.year, r.rank);
        const prize = HS.prizeFor(race, r.rank);
        if (rivals.includes(h)) {
          HS.recordRace(h, race, r.rank, prize);
          h.fatigue += 30;
          h.busy = true;
          return;
        }
        if (!mine.includes(h)) return;
        HS.recordRace(h, race, r.rank, prize);
        game.money += prize;
        const rng = rngFor(game, 'race' + h.id);
        h.fatigue = Math.min(100, h.fatigue + 25 + race.distance / 200 + rng.range(0, 8) + (race.overseas ? 20 : 0));
        h.condition = Math.max(-2, h.condition - (rng() < 0.5 ? 1 : 0));
        // レース中の故障（まれ）
        if (rng() < (0.01 + h.fatigue / 4000) * (h.frail ? 2 : 1)) {
          h.injuredWeeks = rng.int(6, 16);
          h.status = 'farm';
          events.push(`${h.name} がレース後に脚を痛めました。${h.injuredWeeks} 週ほど牧場で休ませます。`);
        }
        raced.add(h.id);
        lines.push({ name: h.name, rank: r.rank, prize });
        events.push(`${race.name}：${h.name}（${h.jockeyName}）は ${r.rank} 着（${prize}万円）`);
        if (r.rank === 1 && (race.cls === 'g1' || race.cls === 'intl')) events.push(`🏆 ${h.name} が ${race.name} を勝ちました！`);
      });
      const winner = field[sim.results[0].index];
      if (winner.ownerName) events.push(`ライバル：${winner.ownerName} の ${winner.name} が ${race.name} を勝ちました。`);
      const commentary = HS.buildCommentary ? HS.buildCommentary(race, field, sim, mine.map((h) => h.id)) : [];
      outcomes.push({ race, field, sim, mineIds: mine.map((h) => h.id), lines, commentary, paddock });
    });

    // 1b. 自分の馬が出ない重賞も、ライバルの馬は走る（年度の表彰に効く）
    races.filter((r) => ['g1', 'g2', 'g3', 'intl'].includes(r.cls) && !outcomes.some((o) => o.race.id === r.id)).forEach((race) => {
      const rivals = HS.rivalsFor(game, race, rngFor(game, 'rivals' + race.id), 3);
      if (!rivals.length) return;
      const field = HS.buildField(race, [], rivals);
      const sim = HS.simulateRace(race, field, race.seed);
      sim.results.forEach((r) => {
        const h = field[r.index];
        HS.recordJockey(game, h.jockeyId, game.year, r.rank);
        if (rivals.includes(h)) {
          HS.recordRace(h, race, r.rank, HS.prizeFor(race, r.rank));
          h.fatigue += 30;
          h.busy = true;
        }
      });
      const winner = field[sim.results[0].index];
      if (winner.ownerName && (race.cls === 'g1' || race.cls === 'intl')) events.push(`ライバル：${winner.ownerName} の ${winner.name} が ${race.name} を勝ちました。`);
    });
    HS.rivalWeek(game);

    // 2. 調教・成長・回復
    game.horses.forEach((h) => {
      h.entry = null;
      const age = HS.ageOf(h, game.year);
      const rng = rngFor(game, 'week' + h.id);
      if (h.status === 'stable' && !raced.has(h.id)) {
        const t = HS.TRAININGS[h.training || 'wood'];
        const tr = trainerOf(h);
        if (t.main) {
          const tired = h.fatigue > 70 ? 0.5 : 1;
          const sp = (k) => (k === tr.specialty ? 1.15 : 1);
          trainStat(h, age, t.main, 0.16 * tired * tr.skill * sp(t.main));
          if (t.sub) trainStat(h, age, t.sub, 0.07 * tired * tr.skill * sp(t.sub));
        }
        h.fatigue = Math.max(0, Math.min(100, h.fatigue + t.fatigue + rng.range(-2, 2)));
        if (t.main && h.fatigue > 80 && rng() < ((h.fatigue - 80) / 120) * (h.frail ? 2 : 1) * tr.care) {
          h.injuredWeeks = rng.int(4, 12);
          h.status = 'farm';
          events.push(`${h.name} が調教中に故障しました。${h.injuredWeeks} 週ほど牧場で休ませます。`);
        }
      }
      if (h.status === 'stable' || h.status === 'farm') {
        HS.STAT_KEYS.forEach((k) => trainStat(h, age, k, h.status === 'farm' && age < 2 ? 0.035 : h.status === 'stable' ? 0.02 : 0.01));
        if (h.status === 'farm') h.fatigue = Math.max(0, h.fatigue - 15);
        else h.fatigue = Math.max(0, h.fatigue - 4);
        if (h.injuredWeeks > 0) h.injuredWeeks--;
        // 調子：疲れが少ないと上がり、多いと下がる
        const r = rng();
        if (h.fatigue < 30 && r < 0.35) h.condition = Math.min(2, h.condition + 1);
        else if (h.fatigue > 60 && r < 0.4) h.condition = Math.max(-2, h.condition - 1);
        else if (r > 0.9) h.condition += h.condition > 0 ? -1 : h.condition < 0 ? 1 : 0;
      }
    });

    // 3. 費用
    const stable = game.horses.filter((h) => h.status === 'stable');
    const nFarm = game.horses.length - stable.length;
    game.money -= stable.reduce((a, h) => a + trainerOf(h).fee, 0) + nFarm * COST_FARM + jockeyFees;

    // 4. 次の週へ。出産・年明け
    game.week++;
    if (game.week > HS.WEEKS_PER_YEAR) {
      game.week = 1;
      game.year++;
      newYear(game, events);
    }
    if (game.week === BIRTH_WEEK) births(game, events);
    if (game.week === AUCTION_WEEKS[0]) {
      game.auction = makeAuction(game);
      events.push('1 歳馬のセリが開かれました（7 月いっぱい）。');
    }
    if (game.week === AUCTION_WEEKS[1] + 1) game.auction = null;
    if (game.week === BREEDING_WEEKS[0] && game.horses.some((h) => h.status === 'broodmare' && !h.pregnant)) {
      events.push('種付けの季節になりました（4 月まで）。牧場の画面から種牡馬を選べます。');
    }
    if (game.money < -5000) {
      game.gameOver = true;
      events.push('借金がふくらみ、牧場を手放すことになりました……。');
    }
    events.forEach((e) => log(game, e));
    return { races: outcomes, events };
  }

  // 力を上限に向けて差の rate 割だけ近づける。上限を超えていたら（年をとって上限が下がったら）少しずつ衰える
  function trainStat(h, age, k, rate) {
    const cap = HS.capOf(h, age)[k];
    const gap = cap - h.stats[k];
    const step = gap > 0 ? gap * rate : gap * 0.03;
    h.stats[k] = Math.round((h.stats[k] + step) * 10) / 10;
  }

  function births(game, events) {
    // 前の年に種付けした仔だけが生まれる
    game.horses.filter((h) => h.status === 'broodmare' && h.pregnant && h.pregnant.year < game.year).forEach((mare) => {
      const rng = rngFor(game, 'birth' + mare.id);
      const foal = HS.makeFoal(rng, mare.pregnant.sire, mare, 'p' + game.nextId++, nameFor(game, rng), game.year);
      game.horses.push(foal);
      mare.pregnant = null;
      events.push(`${mare.name} が ${foal.sex === 'colt' ? '牡' : '牝'}馬を産みました（父 ${foal.sireName}）。名前は「${foal.name}」。`);
    });
  }

  function newYear(game, events) {
    // 前の年の表彰
    const aw = HS.computeAwards(game, game.year - 1);
    game.awards.unshift(aw);
    game.awards = game.awards.slice(0, 30);
    aw.items.forEach((it) => {
      events.push(`【${game.year - 1}年 ${it.title}】${it.name}（${it.owner}）${it.mine ? ' 🎉' : ''}`);
      if (it.mine) game.money += HS.AWARD_BONUS;
    });
    if (aw.items.some((it) => it.mine)) events.push(`表彰の賞金として、1 部門ごとに ${HS.AWARD_BONUS}万円を受け取りました。`);
    HS.newCrop(game, events);
    events.push(`${game.year}年目が始まりました。`);
    game.horses.slice().forEach((h) => {
      const age = HS.ageOf(h, game.year);
      if ((h.status === 'stable' || h.status === 'farm') && age >= RETIRE_AGE) {
        events.push(`${h.name} は ${age} 歳になったので引退します。`);
        retire(game, h.id);
      } else if (h.status === 'broodmare' && age >= 20) {
        game.horses = game.horses.filter((x) => x !== h);
        events.push(`繁殖牝馬の ${h.name} が引退しました。`);
      }
    });
  }

  HS.newGame = newGame;
  HS.migrate = migrate;
  HS.breed = breed;
  HS.enterStable = enterStable;
  HS.sendToFarm = sendToFarm;
  HS.setTraining = setTraining;
  HS.setEntry = setEntry;
  HS.rename = rename;
  HS.retire = retire;
  HS.advanceWeek = advanceWeek;
  HS.setJockey = setJockey;
  HS.setTrainer = setTrainer;
  HS.jockeyAccepts = jockeyAccepts;
  HS.trainerOf = trainerOf;
  HS.jockeyOf = jockeyOf;
  HS.uniqueName = nameFor;
  HS.buyAtAuction = buyAtAuction;
  HS.auctionOpen = auctionOpen;
  HS.allStallions = allStallions;
  HS.inSeason = inSeason;
  HS.canStandAtStud = canStandAtStud;
  HS.STABLE_LIMIT = STABLE_LIMIT;
  HS.BREEDING_WEEKS = BREEDING_WEEKS;
  HS.COST_FARM = COST_FARM;
})(globalThis.HS = globalThis.HS || {});
