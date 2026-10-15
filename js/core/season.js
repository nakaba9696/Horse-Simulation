// シーズンの決まりごと（騎手のゲーム）：お手馬の上限・資金切れの終わり・調子の8段階・フリーハンデと国内の順位・
// 冠（勝ったレースの組み合わせで付く称号）と殿堂・天気
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse;
  const T = HS.Season = {};

  T.MAX_OWN = 10;          // お手馬は10頭まで（引退した馬は数えない）
  T.BROKE_MONTHS = 2;      // 月末に資金がマイナスのまま2か月続くと終わり

  // ---------- 調子の8段階（休みすぎ ← 最高 → 使いすぎ） ----------
  T.COND = [
    { label: '休みすぎ', color: '#e0443a' },
    { label: '休み明け', color: '#9a5ad6' },
    { label: '絶好調', color: '#2f7ff0' },
    { label: '好調', color: '#3fb56a' },
    { label: '普通', color: '#e5c443' },
    { label: '疲れ', color: '#e8892e' },
    { label: '疲れが濃い', color: '#8a5a32' },
    { label: '使いすぎ', color: '#8c8c8c' },
  ];
  T.gap = (h, wIdx) => h.lastRaceW != null && wIdx != null ? wIdx - h.lastRaceW : null;
  T.condLevel = function (h, wIdx) {
    const f = h.fatigue || 0, c = h.cond || 0, gap = T.gap(h, wIdx);
    if (f >= 60) return 7;
    if (f >= 45) return 6;
    if (f >= 32) return 5;
    if (f >= 20) return 4;
    if (gap != null && gap >= 24) return 0;
    if (gap != null && gap >= 12) return 1;
    if (c >= 15) return 2;
    if (c >= -20) return 3;
    return 4;
  };
  T.cond = (h, wIdx) => T.COND[T.condLevel(h, wIdx)];

  // ---------- フリーハンデ（芝・ダートの総合の強さを斤量 kg で）と国内の順位 ----------
  T.fh = function (h, wIdx, surface) {
    const c0 = H.cur(h, wIdx);
    const c = Object.assign({}, c0, H.onSurface(c0, surface));
    const w = surface === 'ダ' ? { spd: 0.42, sta: 0.20, guts: 0.15, mind: 0.11, slope: 0.12 } : { spd: 0.45, sta: 0.22, guts: 0.16, mind: 0.12, slope: 0.05 };
    let a = 0; for (const k in w) a += (c[k] || 0) * w[k];
    return U.clamp(Math.round((40 + (a - 55) * 0.55) * 2) / 2, 30, 70);
  };
  T.fhBoth = (h, wIdx) => ({ turf: T.fh(h, wIdx, '芝'), dirt: T.fh(h, wIdx, 'ダ') });
  // 入厩している現役の馬の中での順位（芝・ダートの高いほう）
  T.rank = function (h, wIdx) {
    const W = HS.World;
    const wc = W.wc();
    if (!wc.fhRank) {
      const list = W.all().filter(x => x.loc === 'stable').map(x => ({ id: x.id, v: Math.max(T.fh(x, wIdx, '芝'), T.fh(x, wIdx, 'ダ')) }));
      list.sort((a, b) => b.v - a.v);
      wc.fhRank = { n: list.length, pos: new Map(list.map((x, i) => [x.id, i + 1])) };
    }
    return { pos: wc.fhRank.pos.get(h.id) || null, n: wc.fhRank.n };
  };

  // ---------- 冠：勝ったレースの組み合わせで付く称号 ----------
  const won = h => (h.gradedWins || []).map(g => ({ y: g.y, r: g.short || g.race, grade: g.grade, region: g.region }));
  const sameYear = (ws, names) => { const ys = {}; for (const w of ws) if (names.includes(w.r)) (ys[w.y] = ys[w.y] || new Set()).add(w.r); return Object.values(ys).map(s => s.size); };
  const has = (ws, n) => ws.some(w => w.r === n);
  T.TITLES = [
    { id: 'triple', label: '三冠', test: ws => sameYear(ws, ['皐月賞', '日本ダービー', '菊花賞']).some(n => n >= 3) },
    { id: 'ftriple', label: '牝馬三冠', test: ws => sameYear(ws, ['桜花賞', 'オークス', '秋華賞']).some(n => n >= 3) || ws.some(w => w.r === 'エリザベス女王杯' && w.y < 1996 && has(ws.filter(x => x.y === w.y), '桜花賞') && has(ws.filter(x => x.y === w.y), 'オークス')) },
    { id: 'double', label: '二冠', test: (ws, t) => !t.triple && sameYear(ws, ['皐月賞', '日本ダービー', '菊花賞']).some(n => n >= 2) },
    { id: 'fdouble', label: '牝馬二冠', test: (ws, t) => !t.ftriple && sameYear(ws, ['桜花賞', 'オークス', '秋華賞']).some(n => n >= 2) },
    { id: 'henso', label: '変則二冠', test: ws => sameYear(ws, ['NHKマイルC', '日本ダービー']).some(n => n >= 2) },
    { id: 'autumn', label: '秋の古馬三冠', test: ws => sameYear(ws, ['天皇賞・秋', 'ジャパンC', '有馬記念']).some(n => n >= 3) },
    { id: 'spring', label: '春の古馬三冠', test: ws => sameYear(ws, ['大阪杯', '天皇賞・春', '宝塚記念']).some(n => n >= 3) },
    { id: 'grandprix', label: 'グランプリ制覇', test: ws => has(ws, '宝塚記念') && has(ws, '有馬記念') },
    { id: 'tenno', label: '天皇賞の春秋制覇', test: ws => has(ws, '天皇賞・春') && has(ws, '天皇賞・秋') },
    { id: 'world', label: '海外G1制覇', test: ws => ws.some(w => w.region === '海外' && w.grade === 'G1') },
    { id: 'g1five', label: 'G1五勝', test: ws => ws.filter(w => w.grade === 'G1').length >= 5 },
  ];
  T.titles = function (h) {
    const ws = won(h), got = {};
    for (const t of T.TITLES) if (t.test(ws, got)) got[t.id] = true;
    return T.TITLES.filter(t => got[t.id]);
  };

  // 自分の馬が重賞を勝ったとき：新しい冠を知らせ、冠のある馬は殿堂へ
  T.onWin = function (h, race, year) {
    const G = HS.World.get();
    const now = T.titles(h).map(t => t.label);
    const before = h.titles || [];
    const fresh = now.filter(l => !before.includes(l));
    h.titles = now;
    for (const l of fresh) HS.World.news(`${h.name}が「${l}」の冠を手にした！`, 'g1');
    if (!now.length) return fresh;
    G.records.hall = G.records.hall || [];
    let e = G.records.hall.find(x => x.id === h.id);
    if (!e) { e = { id: h.id, name: h.name, born: h.born, sex: h.sex, since: year }; G.records.hall.push(e); if (fresh.length) HS.World.news(`${h.name}が殿堂入りした。`, 'g1'); }
    Object.assign(e, { titles: now, starts: h.starts || 0, wins: h.wins || 0, g1: (h.gradedWins || []).filter(g => g.grade === 'G1').length, prize: h.prize || 0, last: year });
    return fresh;
  };

  // ---------- お手馬の上限と、資金切れ ----------
  T.ownCount = () => HS.World.mine().filter(h => h.loc === 'stable' || h.loc === 'farm').length;
  T.canBuy = () => T.ownCount() < T.MAX_OWN;
  // 月末に呼ぶ。資金がマイナスのまま続くとシーズンが終わる
  T.monthEnd = function () {
    const G = HS.World.get();
    if (G.mode !== 'jockey' || G.gameOver) return;
    if (G.player.money >= 0) { G.broke = 0; return; }
    G.broke = (G.broke || 0) + 1;
    if (G.broke >= T.BROKE_MONTHS) {
      G.gameOver = { y: G.year, m: G.month, money: G.player.money };
      HS.World.news('資金が尽きた。ここでシーズンは終わり。', 'warn');
    } else HS.World.news(`資金がマイナスです。来月の末までに立て直さないと、シーズンが終わります。`, 'warn');
  };

  // ---------- 出走の予約（その年の12月4週まで、重賞を先に押さえておく） ----------
  T.weeksLeft = G => (12 - G.month) * 4 + (4 - G.week) + 1;
  T.reserves = id => (HS.World.get().reserve || []).filter(x => !id || x.id === id);
  T.reserve = function (id, race) {
    const W = HS.World, G = W.get();
    const h = W.horse(id);
    if (!h || h.owner !== 'P') return '持ち馬ではない';
    if (!race.graded || race.year !== G.year) return 'その年の重賞だけ予約できる';
    const why = HS.Races.ineligible(Object.assign({}, h, { injury: null }), race, race.year);
    if (why) return why;
    G.reserve = G.reserve || [];
    if (G.reserve.some(x => x.id === id && x.y === race.year && x.m === race.month && x.w === race.week)) return 'その週はもう予約している';
    G.reserve.push({ id, key: race.key, y: race.year, m: race.month, w: race.week, label: HS.Races.label(race) });
    G.reserve.sort((a, b) => (a.y - b.y) || (a.m - b.m) || (a.w - b.w));
    return null;
  };
  T.unreserve = function (id, key) { const G = HS.World.get(); G.reserve = (G.reserve || []).filter(x => !(x.id === id && x.key === key)); };
  // 週の初めに、今週の予約を出走登録に変える。過ぎた予約・手を離れた馬の予約は消す
  T.applyReserves = function () {
    const W = HS.World, G = W.get();
    if (!G.reserve || !G.reserve.length) return;
    const now = (G.year * 12 + G.month) * 5 + G.week;
    const keep = [];
    for (const x of G.reserve) {
      const h = W.horse(x.id);
      if (!h || h.owner !== 'P') continue;
      const t = (x.y * 12 + x.m) * 5 + x.w;
      if (t > now) { keep.push(x); continue; }
      if (t < now) continue;
      const err = W.enter(x.id, x.key);
      if (err) W.news(`${h.name}は予約していた${x.label}に出られない（${err}）。`, 'warn');
    }
    G.reserve = keep;
  };

  // ---------- 天気（馬場から決まる。週と競馬場ごと） ----------
  T.weather = function (seed, year, month, week, course, ground) {
    const rng = U.hashRng(`w:${seed}:${year}:${month}:${week}:${course}`);
    const winter = month === 12 || month <= 2;
    if (ground === '不良' || ground === '重') return winter && rng.chance(0.3) ? '雪' : '雨';
    if (ground === '稍重') return rng.chance(0.5) ? '雨' : '曇';
    return rng.chance(0.7) ? '晴' : '曇';
  };
  T.weatherIcon = w => ({ '晴': '☀', '曇': '☁', '雨': '☂', '雪': '❄' })[w] || '';
})();
