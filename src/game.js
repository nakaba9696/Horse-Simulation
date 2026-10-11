// ゲームの進行（所持金・出馬表・馬券の払い戻し）。画面には依存しない。
(function (HS) {
  const SAVE_VERSION = 1;
  const START_MONEY = 10000;
  const STABLE_SIZE = 40;

  function newGame(seed) {
    const s = seed >>> 0;
    return {
      version: SAVE_VERSION,
      seed: s,
      day: 1,
      money: START_MONEY,
      horses: HS.createStable(s, STABLE_SIZE),
      history: [],
    };
  }

  // 古いセーブでも動くように、足りない項目を補う
  function migrate(save) {
    if (!save || typeof save !== 'object' || !Array.isArray(save.horses)) return null;
    const g = Object.assign({ day: 1, money: START_MONEY, history: [] }, save);
    g.horses.forEach((h) => { h.record = Object.assign({ starts: 0, wins: 0, places: 0 }, h.record); });
    g.version = SAVE_VERSION;
    return g;
  }

  function createRaceCard(game) {
    const raceSeed = (HS.stableHash(game.seed + ':' + game.day)) >>> 0;
    const rng = HS.createRng(raceSeed);
    const surface = rng() < 0.65 ? 'turf' : 'dirt';
    const condRoll = rng();
    const condition = condRoll < 0.6 ? 'good' : condRoll < 0.8 ? 'yielding' : condRoll < 0.93 ? 'soft' : 'heavy';
    const distance = surface === 'dirt'
      ? rng.pick([1200, 1400, 1600, 1800, 2100])
      : rng.pick(HS.DISTANCES);
    const field = rng.int(8, 12);
    // 力の近い馬どうしで走るように、総合力で並べた一部の範囲から選ぶ
    const sorted = game.horses.slice().sort((a, b) => HS.overall(a) - HS.overall(b));
    const windowSize = Math.min(sorted.length, field + 8);
    const start = rng.int(0, sorted.length - windowSize);
    const pool = sorted.slice(start, start + windowSize);
    const entries = [];
    for (let i = 0; i < field; i++) {
      const j = Math.floor(rng() * pool.length);
      entries.push(pool.splice(j, 1)[0]);
    }
    const race = {
      day: game.day,
      name: rng.pick(HS.RACE_PREFIX) + rng.pick(HS.RACE_SUFFIX),
      surface, distance, condition,
      seed: raceSeed,
    };
    const odds = HS.estimateOdds(race, entries, raceSeed, 160);
    return { race, entries, odds, popularity: HS.popularity(odds) };
  }

  // bets: [{ type: 'win' | 'place', index, amount }]
  function settle(card, results, bets) {
    const placeCount = HS.placeSlots(card.entries.length);
    const rankOf = new Array(card.entries.length);
    results.forEach((r) => { rankOf[r.index] = r.rank; });
    let stake = 0;
    let payout = 0;
    const lines = bets.map((b) => {
      stake += b.amount;
      const rank = rankOf[b.index];
      const hit = b.type === 'win' ? rank === 1 : rank <= placeCount;
      const o = b.type === 'win' ? card.odds[b.index].win : card.odds[b.index].place;
      const back = hit ? Math.floor((b.amount * o) / 10) * 10 : 0;
      payout += back;
      return Object.assign({}, b, { hit, odds: o, payout: back });
    });
    return { stake, payout, lines };
  }

  // レース後：所持金・戦績・日付を進める
  function applyResult(game, card, results, settlement) {
    const placeCount = HS.placeSlots(card.entries.length);
    results.forEach((r) => {
      const h = game.horses.find((x) => x.id === r.horseId);
      h.record.starts++;
      if (r.rank === 1) h.record.wins++;
      if (r.rank <= placeCount) h.record.places++;
    });
    game.money += settlement.payout - settlement.stake;
    game.history.unshift({
      day: game.day,
      name: card.race.name,
      winner: results[0].name,
      stake: settlement.stake,
      payout: settlement.payout,
    });
    game.history = game.history.slice(0, 30);
    game.day++;
    // 所持金が尽きたら、少しだけ援助して続けられるようにする
    if (game.money < 100) {
      game.money += 3000;
      return { bailout: true };
    }
    return { bailout: false };
  }

  HS.newGame = newGame;
  HS.migrate = migrate;
  HS.createRaceCard = createRaceCard;
  HS.settle = settle;
  HS.applyResult = applyResult;
  HS.START_MONEY = START_MONEY;
})(globalThis.HS = globalThis.HS || {});
