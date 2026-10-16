// シーズンの決まりごと（騎手のゲーム）：お手馬の上限・資金切れの終わり・調子の8段階・総合力と国内の順位・
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

  // ---------- 総合力（芝・ダートそれぞれの強さを1〜99の数で）と国内の順位 ----------
  // 持ち主の指摘 2026-10-16：前の名は「フリーハンデ」（斤量 kg の数）。史実馬は伸びきったとき45〜85に入る。
  // 目安：70でエアグルーヴのような歴史的名馬、80前後で史上屈指の名馬（セクレタリアトなど）、85でキンチェム（伝説級）。オリジナルホースは能力を伸ばせば99まで届く
  T.FH_NAME = '総合力';
  // 能力の重み付きの値 → 総合力 の折れ線（史実馬の下から1%で45・エアグルーヴ70・伝説級85。その先は同じ傾きで99まで。セクレタリアトは能力どおり（いま80））
  T.FH_KNOTS = [[72, 45], [93.6, 70], [104.3, 85]];
  T.fh = (h, wIdx, surface) => T.fhOf(H.cur(h, wIdx), surface);
  // 能力の値（いまの値でも、伸びきった値でも）から総合力を出す
  T.fhOf = function (c0, surface) {
    const c = Object.assign({}, c0, H.onSurface(c0, surface));
    const w = surface === 'ダ' ? { spd: 0.42, sta: 0.20, guts: 0.15, mind: 0.11, slope: 0.12 } : { spd: 0.45, sta: 0.22, guts: 0.16, mind: 0.12, slope: 0.05 };
    let a = 0; for (const k in w) a += (c[k] || 0) * w[k];
    const K = T.FH_KNOTS;
    let i = 0; while (i < K.length - 2 && a > K[i + 1][0]) i++;
    const [x0, y0] = K[i], [x1, y1] = K[i + 1];
    return U.clamp(Math.round(y0 + (a - x0) * (y1 - y0) / (x1 - x0)), 1, 99);
  };
  T.fhBoth = (h, wIdx) => ({ turf: T.fh(h, wIdx, '芝'), dirt: T.fh(h, wIdx, 'ダ') });
  // 伸びきったとき（完成）の総合力
  T.fhPeak = h => ({ turf: T.fhOf(h.pot, '芝'), dirt: T.fhOf(h.pot, 'ダ') });
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
    { id: 'dc', label: 'グランドフィナーレ制覇', test: ws => ws.some(w => T.isGF(w.r)) }, // どの距離の GF でも、前の名前の勝ちも数える（T.isGF は dream.js）
  ];
  T.titles = function (h) {
    const ws = won(h), got = {};
    for (const t of T.TITLES) if (t.test(ws, got)) got[t.id] = true;
    return T.TITLES.filter(t => got[t.id]);
  };

  // 自分の馬が重賞を勝ったとき：新しい冠を知らせ、冠のある馬は殿堂へ
  T.onWin = function (h, race, year) {
    const G = HS.World.get();
    if (HS.Trophy) HS.Trophy.onWin(h, race);
    const now = T.titles(h).map(t => t.label);
    const before = h.titles || [];
    const fresh = now.filter(l => !before.includes(l));
    h.titles = now;
    for (const l of fresh) HS.World.news(`${h.name}が「${l}」の冠を手にした！`, 'g1');
    if (!now.length) return fresh;
    G.records.hall = G.records.hall || [];
    let e = G.records.hall.find(x => x.id === h.id);
    if (!e) { e = { id: h.id, name: h.name, born: h.born, sex: h.sex, since: year }; G.records.hall.push(e); }
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

  // ---------- 出走の予約（1年先＝52週先まで、重賞を先に押さえておく。入厩前の馬も） ----------
  T.RESERVE_WEEKS = 52;
  T.weeksLeft = () => T.RESERVE_WEEKS;
  T.reserves = id => (HS.World.get().reserve || []).filter(x => !id || x.id === id);
  T.reserve = function (id, race) {
    const W = HS.World, G = W.get();
    const h = W.horse(id);
    if (!h || h.owner !== 'P') return '持ち馬ではない';
    if (!race.graded) return '予約できるのは重賞だけ';
    const why = T.staticIneligible(h, race, race.year);
    if (why) return why;
    G.reserve = G.reserve || [];
    if (G.reserve.some(x => x.id === id && x.y === race.year && x.m === race.month && x.w === race.week)) return 'その週はもう予約している';
    G.reserve.push({ id, key: race.key, y: race.year, m: race.month, w: race.week, label: HS.Races.label(race) });
    G.reserve.sort((a, b) => (a.y - b.y) || (a.m - b.m) || (a.w - b.w));
    return null;
  };
  // 予約のときは、変わらない条件（年齢・性・せん馬）だけを見る。勝ち星などの条件は、その週に出走登録するときに確かめる
  T.staticIneligible = function (h, race, year) {
    const age = year - h.born;
    if (race.age === '2' && age !== 2) return '年齢';
    if (race.age === '3' && age !== 3) return '年齢';
    if (race.age === '3+' && age < 3) return '年齢';
    if (race.age === '4+' && age < 4) return '年齢';
    if (age < 2) return '年齢';
    if (age === 2 && race.month < 6) return 'デビュー前'; // 2歳の競走は6月から
    if (race.sex === '牝' && h.sex !== '牝') return '牝馬限定';
    if (race.noGelding && h.gelding) return 'せん馬は出られない';
    return null;
  };
  // デビュー戦（新馬戦）の予約。その週の新馬戦から、馬場と距離の合うものを選んで登録する
  T.debutWeeks = function (h) {
    const G = HS.World.get(), out = [];
    let y = G.year, m = G.month, w = G.week;
    for (let i = 0; i < T.RESERVE_WEEKS; i++) {
      w++; if (w > 4) { w = 1; m++; if (m > 12) { m = 1; y++; } }
      if (y - h.born === 2 && m >= 6) out.push({ y, m, w });
    }
    return out;
  };
  T.reserveDebut = function (id, y, m, w) {
    const W = HS.World, G = W.get(), h = W.horse(id);
    if (!h || h.owner !== 'P') return '持ち馬ではない';
    if ((h.starts || 0) > 0) return 'もうデビューしている';
    if (!T.debutWeeks(h).some(x => x.y === y && x.m === m && x.w === w)) return 'その週は予約できない';
    G.reserve = (G.reserve || []).filter(x => !(x.id === id && x.debut));
    if (G.reserve.some(x => x.id === id && x.y === y && x.m === m && x.w === w)) return 'その週はもう予約している';
    G.reserve.push({ id, key: `debut:${y}-${m}-${w}`, y, m, w, label: '新馬戦', debut: true });
    G.reserve.sort((a, b) => (a.y - b.y) || (a.m - b.m) || (a.w - b.w));
    return null;
  };
  T.debutRace = function (h) {
    const W = HS.World, G = W.get(), R = HS.Races;
    const list = W.weekRaces().filter(r => r.cls === 'newcomer' && !R.ineligible(h, r, G.year));
    const mid = (h.distMin + h.distMax) / 2;
    const score = r => ((r.surface === 'ダ' ? h.apt.dirt : h.apt.turf) || 50) * 3 - Math.abs(r.dist - Math.min(mid, 1800)) / 20;
    list.sort((a, b) => score(b) - score(a));
    return list[0] || null;
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
      let key = x.key;
      if (x.debut) { const r = T.debutRace(h); if (!r) { W.news(`${h.name}の予約していた新馬戦が、この週にはない。`, 'warn'); continue; } key = r.key; }
      const err = W.enter(x.id, key);
      if (err) W.news(`${h.name}は予約していた${x.label}に出られない（${err}）。`, 'warn');
    }
    G.reserve = keep;
  };

  // ---------- グランドフィナーレ（GF）：年末のドリームレース。その年に活躍した馬だけが招待されて走る ----------
  // 距離ごとに6つ（スプリント・マイル・中距離・クラシック・長距離・ダート）。12月1週に招待し、2〜4週に走る。
  // 出られる条件・自分の馬を1頭選ぶか出ないか・出走表は js/core/dream.js
  T.DC_NAME = 'グランドフィナーレ';
  T.DC_FIELD = 16;
  // 6つの GF（距離ごと）・レースの形・招待・出走表は js/core/dream.js

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
