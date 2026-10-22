// 騎手のゲーム：プレイヤーは騎手。毎週の騎乗依頼を受け、レースに乗り、勝ち星と評判を積む
// 依頼主の調教師は架空の名前。騎手は実名（プレイヤーだけ架空）
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse, R = HS.Races, W = HS.World;
  const J = HS.Jockey = {};
  const G = () => W.get();

  J.REGIONS = ['美浦', '栗東'];
  // 架空の調教師の名（姓と名を組み合わせる）
  const SEI = ['高森', '有馬野', '北沢', '朝倉', '桐生', '春日井', '真壁', '宮園', '久我', '水城', '早瀬', '白樫', '若松', '杉浦', '笹岡', '葛西', '設楽', '大槻', '野々村', '鷹野', '日向', '瀬川', '三春', '倉田', '藤代', '鳴海', '芦川', '榊', '梶原', '浅葉'];
  const MEI = ['誠', '修', '剛', '亮', '浩之', '健司', '雅人', '和也', '敏', '康夫', '隆', '昭', '伸也', '英樹', '博', '茂', '徹', '聡', '克己', '直人'];
  J.trainerOf = function (h) {
    const r = U.hashRng('trainer:' + (h.hist ? h.name : h.id));
    return r.pick(SEI) + r.pick(MEI);
  };

  // 新しい騎手
  J.init = function (opts) {
    return {
      name: opts.jockeyName || opts.name || '新人騎手', region: J.REGIONS.includes(opts.region) ? opts.region : '美浦',
      debut: opts.year || 1995, skill: 58, rep: 8,
      total: { rides: 0, wins: 0, w2: 0, w3: 0, prize: 0 }, years: {}, big: [], history: [],
    };
  };
  J.me = () => G().jockey;
  J.isMode = () => !!(G() && G().mode === 'jockey' && G().jockey);
  J.playerJockey = () => { const j = J.me(); return { name: j.name, region: j.region, skill: Math.round(j.skill), player: true }; };

  // 見習いの減量は無い（斤量の仕組みは無し。持ち主の決定 2026-10-21）

  // 評判の言葉
  J.repLabel = rep => rep >= 85 ? 'トップジョッキー' : rep >= 65 ? '一流' : rep >= 45 ? '中堅' : rep >= 25 ? '若手の有望株' : '駆け出し';

  // 今週の騎乗依頼（決まった週の内容から、評判に合わせて選ぶ）
  // 騎乗依頼は使わない（持ち主の決定 2026-10-15：買った馬だけで走る）。前の版の名残として残す
  J.useOffers = false;
  J.offers = function () {
    if (!J.isMode() || !J.useOffers) return [];
    const wk = W.prepareWeek();
    const g = G();
    const key = `${wk.key}:offers`;
    if (J._offers && J._offers.key === key) return J._offers.list;
    const j = J.me(), rep = j.rep;
    const r = U.hashRng(key + ':' + j.name);
    const cards = W.cards();
    const cands = [];
    for (const c of cards) {
      const race = c.race;
      if (race.region === '海外' && rep < 70) continue; // 海外は一流になってから
      if (race.region === '地方' && rep < 40) continue;
      // 人気の見込み（強さの順）
      const ranked = c.runners.slice().sort((a, b) => H.overall(H.cur(b.horse, wk.wIdx)) - H.overall(H.cur(a.horse, wk.wIdx)));
      ranked.forEach((x, k) => {
        if (x.mine) return;
        const strength = 1 - k / Math.max(1, ranked.length - 1); // 1＝いちばん強い
        // 評判が高いほど強い馬・大きいレースの依頼が来る
        const want = rep / 100;
        let w = Math.exp(-Math.pow((strength - want) / 0.28, 2));
        const gradeNeed = { G1: 0.75, G2: 0.55, G3: 0.4 }[race.grade] || 0;
        if (race.graded && rep / 100 < gradeNeed - 0.2) w *= 0.05;
        // 史実馬は主戦騎手がいるので、評判が高くないと回ってこない
        if (x.horse.hist && W.histJockey(x.horse, g.year)) w *= rep >= 80 ? 0.5 : rep >= 60 ? 0.08 : 0.01;
        // お手馬（前に乗って結果を出した馬）は、また依頼が来る
        const mt = !x.horse.filler && j.mounts && j.mounts[x.horse.name];
        if (mt && mt.best <= 3) w = Math.max(w, 4); else if (mt && mt.rides >= 2) w = Math.max(w, 0.8);
        if (w > 0.02) cands.push({ c, x, w, strength, regular: !!(mt && mt.best <= 3) });
      });
    }
    const n = Math.min(cands.length, 3 + Math.floor(rep / 9));
    const list = [];
    const usedHorse = new Set();
    for (let i = 0; i < n && cands.length; i++) {
      const pick = r.weighted(cands, o => o.w);
      cands.splice(cands.indexOf(pick), 1);
      if (usedHorse.has(pick.x.horse.id)) { i--; continue; }
      usedHorse.add(pick.x.horse.id);
      list.push({ raceKey: pick.c.race.key, horseId: pick.x.horse.id, trainer: J.trainerOf(pick.x.horse), strength: pick.strength, regular: pick.regular });
    }
    list.sort((a, b) => (W.raceByKey(a.raceKey) || {}).key > (W.raceByKey(b.raceKey) || {}).key ? 1 : -1);
    J._offers = { key, list };
    return list;
  };
  J.runnerOf = (raceKey, horseId) => { const c = W.cardOf(raceKey); return c ? c.runners.find(x => x.horse.id === horseId) : null; };

  // 依頼を受ける（1レースに1頭）／断る
  J.accept = function (raceKey, horseId) {
    const g = G();
    if (!J.offers().some(o => o.raceKey === raceKey && o.horseId === horseId)) return '依頼が見つからない';
    g.rides = Object.assign({}, g.rides, { [raceKey]: horseId });
    return null;
  };
  J.cancel = function (raceKey) { const g = G(); const r = Object.assign({}, g.rides); delete r[raceKey]; g.rides = r; };
  J.myRides = () => W.cards().filter(c => c.ride).map(c => ({ card: c, runner: c.runners.find(x => x.rider === 'P') }));

  // 全レースの騎手の成績（リーディング）と、プレイヤーの成績・評判・腕前
  J.record = function (race, sim, runners) {
    const g = G();
    const y = g.year;
    const tab = (g.records.jockeys = g.records.jockeys || {})[y] = (g.records.jockeys[y] || {});
    const pr = R.prizeOf ? R.prizeOf(race, y) : 0; void pr;
    for (const res of sim.results) {
      const nm = res.jockey && res.jockey.name; if (!nm || nm === '騎手未定') continue;
      if (race.region === '海外') continue; // リーディングは国内だけ
      const t = tab[nm] = tab[nm] || [0, 0, 0, 0, 0]; // 騎乗・1着・2着・3着・騎手の取り分（万円）
      t[0]++; if (res.pos <= 3) t[res.pos]++;
      if (res.pos <= 5 && W.racePrize) t[4] = (t[4] || 0) + Math.round(W.racePrize(race, res.pos) * 0.05);
    }
    if (!J.isMode()) return;
    const me = sim.results.find(x => x.rider === 'P' || (x.jockey && x.jockey.player));
    if (!me) return;
    const j = J.me();
    const yr = j.years[y] = j.years[y] || { rides: 0, wins: 0, w2: 0, w3: 0, prize: 0 };
    for (const o of [j.total, yr]) { o.rides++; if (me.pos === 1) o.wins++; if (me.pos === 2) o.w2++; if (me.pos === 3) o.w3++; }
    // 騎手の取り分（賞金の5%）
    const prize = HS.World.racePrize ? HS.World.racePrize(race, me.pos) : 0;
    const cut = Math.round(prize * 0.05);
    j.total.prize += cut; yr.prize += cut; g.player.money += cut;
    // 評判と腕前
    const n = sim.results.length;
    const exp = runners.find(x => x.rider === 'P');
    const pop = exp ? exp.pop || Math.ceil(n / 2) : Math.ceil(n / 2);
    const gradeW = { G1: 3, G2: 2, G3: 1.5 }[race.grade] || 1;
    let d = 0.12 + (me.pos === 1 ? 3 : me.pos === 2 ? 1 : me.pos === 3 ? 0.5 : 0) * gradeW + (pop - me.pos) * 0.12;
    j.rep = U.clamp(j.rep + d * (1 - j.rep / 120), 0, 100);
    j.skill = U.clamp(j.skill + 0.05 + (me.pos === 1 ? 0.15 : 0), 0, 96);
    // お手馬の記録
    if (!me.horse.filler) { j.mounts = j.mounts || {}; const mt = j.mounts[me.horse.name] = j.mounts[me.horse.name] || { rides: 0, wins: 0, best: 99 }; mt.rides++; if (me.pos === 1) mt.wins++; mt.best = Math.min(mt.best, me.pos); mt.last = y; }
    j.history.unshift({ y, m: race.month, w: race.week, race: race.short || race.name, grade: R.gradeBadge(race), horse: me.horse.name, pos: me.pos, n, pop });
    if (j.history.length > 300) j.history.length = 300;
    if (me.pos === 1) {
      if (race.graded) j.big.push({ y, race: race.short || race.name, grade: race.grade, region: race.region, horse: me.horse.name });
      W.news(`${me.horse.name}に騎乗し${R.label(race)}${race.grade ? '（' + R.gradeBadge(race) + '）' : ''}を勝った。通算${j.total.wins}勝。`, race.grade === 'G1' ? 'g1' : 'win');
      if (j.total.wins === 1) W.news('初勝利。ここからが始まりだ。', 'win');
    }
  };
  // 週の頭：自分の馬を、2歳の4月から自動で入厩させる。調教とレース選びはおまかせ（自分でも決められる）
  J.weekStart = function () {
    if (!J.isMode()) return;
    const g = G();
    for (const h of W.mine('farm')) {
      const age = g.year - h.born;
      if (h.parked || age < 2 || (age === 2 && g.month < 4)) continue;
      if (!W.toStable(h.id)) { if (h.auto == null) h.auto = true; W.news(`${h.name}が入厩した。`, 'info'); }
    }
    if (HS.Season) HS.Season.applyReserves(); // グランドフェスティバルの招待は12月4週のあと（W.nextWeek → HS.Season.gfStage）
  };
  // 引退：自分の手を離れる（種牡馬・繁殖牝馬になっても持ち馬にはしない）
  // トロフィーを1つ以上手にした馬は、案内なしで殿堂入りする（HS.Hall.onRetire）。殿堂に入らない馬のレースの記録は消える
  J.retire = function (id) {
    if (HS.Original && HS.Original.on()) return HS.Original.retire(id); // 年代なしのゲームは、牧場に残してオリジナルホースの親にする
    const h = W.horse(id); if (!h) return { err: '持ち馬ではない' };
    if (HS.Hall && h.owner === 'P') HS.Hall.onRetire(h); // トロフィー1つ以上なら殿堂入り
    if (HS.RaceRec) HS.RaceRec.strip(h);
    const r = W.retire(id);
    if (!r.err && W.horse(id)) { W.horse(id).owner = 'AI'; W.dirty(); }
    return r;
  };
  // 毎週、評判は少しずつ落ち着く（乗らないと忘れられる）
  J.weekly = function () { if (!J.isMode()) return; const j = J.me(); j.rep = Math.max(0, j.rep - 0.08); };

  // その年のリーディング（勝ち数の順）
  J.leading = function (year) {
    const tab = (G().records.jockeys || {})[year] || {};
    return Object.entries(tab).map(([name, t]) => ({ name, rides: t[0], wins: t[1], w2: t[2], w3: t[3], me: J.isMode() && name === J.me().name }))
      .sort((a, b) => b.wins - a.wins || b.w2 - a.w2 || a.rides - b.rides);
  };
  J.myRank = year => { const l = J.leading(year); const i = l.findIndex(x => x.me); return i < 0 ? null : i + 1; };
  // 年の終わり：リーディングの順位をニュースに
  J.yearEnd = function (year) {
    const l = J.leading(year);
    if (l[0]) W.news(`${year}年のリーディングジョッキーは${l[0].name}（${l[0].wins}勝）。`, 'info');
    // 騎手の年度表彰：最多勝利・最高勝率（30騎乗以上）・最多賞金
    const tab = (G().records.jockeys || {})[year] || {};
    const rows = Object.entries(tab).map(([name, t]) => ({ name, rides: t[0], wins: t[1], prize: t[4] || 0 }));
    const best = (f, ok) => rows.filter(ok || (() => true)).sort((a, b) => f(b) - f(a))[0];
    const aw = {};
    const a1 = best(x => x.wins * 1000 - x.rides), a2 = best(x => x.wins / Math.max(1, x.rides), x => x.rides >= 30), a3 = best(x => x.prize);
    if (a1) aw['最多勝利騎手'] = a1.name; if (a2) aw['最高勝率騎手'] = a2.name; if (a3) aw['最多賞金獲得騎手'] = a3.name;
    const g = G(); g.records.jawards = g.records.jawards || {}; g.records.jawards[year] = aw;
    if (J.isMode()) for (const [k, v] of Object.entries(aw)) if (v === J.me().name) W.news(`${year}年の${k}に選ばれた。`, 'g1');
    if (J.isMode()) {
      const k = J.myRank(year), j = J.me();
      const yr = j.years[year];
      if (yr) W.news(`${year}年のあなた：${yr.rides}戦${yr.wins}勝${k ? `・リーディング${k}位` : ''}。`, k === 1 ? 'g1' : 'info');
    }
  };
})();
