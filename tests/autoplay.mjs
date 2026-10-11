// 自動で遊ぶ係（テストと調整用）。簡単な方針で週を進める
export function autoplayWeek(HS, game, rng) {
  const races = HS.weekRaces(game, game.year, game.week);
  // 種付け：買える範囲で一番良い配合
  if (HS.inSeason(game)) {
    game.horses.filter((h) => h.status === 'broodmare' && !h.pregnant).forEach((m) => {
      const options = HS.allStallions(game).filter((s) => HS.studFee(s) <= game.money * 0.3);
      if (!options.length) return;
      options.sort((a, b) => HS.sumStats(b.potential) * (1 + HS.breedingTheory(b, m).bonus) - HS.sumStats(a.potential) * (1 + HS.breedingTheory(a, m).bonus));
      HS.breed(game, m.id, options[0].id);
    });
  }
  if (HS.auctionOpen(game) && game.auction) {
    game.auction.forEach((lot, i) => { if (!lot.sold && lot.price < game.money * 0.15) HS.buyAtAuction(game, i); });
  }
  game.horses.forEach((h) => {
    const age = HS.ageOf(h, game.year);
    if (h.status === 'farm' && age >= 2 && h.injuredWeeks === 0 && (h.fatigue < 20)) HS.enterStable(game, h.id);
    if ((h.status === 'stable' || h.status === 'farm') && age >= 6) HS.retire(game, h.id);
  });
  game.horses.filter((h) => h.status === 'stable').forEach((h) => {
    const keys = ['wood', 'hill', 'pool', 'pair', 'gate'];
    HS.setTraining(game, h.id, h.fatigue > 60 ? 'rest' : keys[Math.floor(rng() * keys.length)]);
    if (h.fatigue < 40 && (game.week % 3 === 0)) {
      const ok = races.filter((r) => !HS.ineligibleReason(h, r));
      // 一番クラスの低い（勝てそうな）レースか、距離の近いレース
      ok.sort((a, b) => Math.abs(a.distance - h.bestDistance) - Math.abs(b.distance - h.bestDistance));
      if (ok.length) HS.setEntry(game, h.id, ok[0].id);
    }
  });
  return HS.advanceWeek(game);
}
