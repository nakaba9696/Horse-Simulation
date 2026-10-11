// 馬の生成
(function (HS) {
  function makeName(rng, used) {
    for (let i = 0; i < 200; i++) {
      const name = rng.pick(HS.NAME_HEAD) + rng.pick(HS.NAME_TAIL);
      if (name.length <= 9 && !used.has(name)) { used.add(name); return name; }
    }
    const name = rng.pick(HS.NAME_HEAD) + rng.pick(HS.NAME_TAIL) + used.size;
    used.add(name);
    return name;
  }

  function aptitudeGrade(rng, bias) {
    const r = rng() + bias;
    if (r > 0.95) return 'A';
    if (r > 0.6) return 'B';
    if (r > 0.3) return 'C';
    return 'D';
  }

  function createHorse(rng, id, used) {
    // 能力の総量にばらつきを持たせ、得意不得意で振り分ける
    const talent = rng.range(200, 380);
    const weights = HS.STAT_KEYS.map(() => rng.range(0.6, 1.4));
    const sum = weights.reduce((a, b) => a + b, 0);
    const stats = {};
    HS.STAT_KEYS.forEach((k, i) => {
      stats[k] = Math.round(Math.min(100, Math.max(15, talent * weights[i] / sum + rng.normal() * 4)));
    });
    // 得意な距離はスタミナとスピードの比で寄せる
    const ratio = stats.stamina / (stats.speed + stats.stamina);
    const bestDistance = Math.round((900 + ratio * 2000 + rng.normal() * 250) / 100) * 100;
    const turfBias = rng.range(-0.3, 0.3);
    return {
      id,
      name: makeName(rng, used),
      stats,
      style: rng.pick(HS.STYLE_KEYS),
      bestDistance: Math.min(3400, Math.max(1000, bestDistance)),
      aptitude: { turf: aptitudeGrade(rng, 0.25 + turfBias), dirt: aptitudeGrade(rng, 0.25 - turfBias) },
      record: { starts: 0, wins: 0, places: 0 },
    };
  }

  function createStable(seed, count) {
    const rng = HS.createRng(seed);
    const used = new Set();
    const horses = [];
    for (let i = 0; i < count; i++) horses.push(createHorse(rng, i + 1, used));
    return horses;
  }

  function overall(h) {
    return Math.round(HS.STAT_KEYS.reduce((a, k) => a + h.stats[k], 0) / HS.STAT_KEYS.length);
  }

  HS.createHorse = createHorse;
  HS.createStable = createStable;
  HS.overall = overall;
})(globalThis.HS = globalThis.HS || {});
