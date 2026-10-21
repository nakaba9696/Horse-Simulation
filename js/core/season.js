// シーズンの決まりごと（騎手のゲーム）：お手馬の上限・資金切れの終わり・総合力と国内の順位・
// 冠（勝ったレースの組み合わせで付く称号）と殿堂・天気
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse;
  const T = HS.Season = {};

  T.MAX_OWN = 10;          // お手馬は10頭まで（引退した馬は数えない）
  T.BROKE_MONTHS = 2;      // 月末に資金がマイナスのまま2か月続くと終わり

  // 調子は無い（持ち主の決定 2026-10-20「調子のパラメータは無し。疲労だけにする」）。馬の状態は疲労（js/core/fatigue.js）の段階で見せる

  // ---------- 総合力（芝・ダートそれぞれの強さを1〜99の数で）と国内の順位 ----------
  // 持ち主の指摘 2026-10-16：前の名は「フリーハンデ」（斤量 kg の数）。史実馬は伸びきったとき45〜85に入る。
  // 目安（持ち主の仕様書「総合力の目安」）：46〜50 OP 馬・51〜55 G3 馬・56〜60 G2 馬・61〜65 G1 馬・66〜80 G1 を何度も勝った名馬・81〜85 神話の名馬・86〜99 はオリジナルホースだけ。
  // 70でエアグルーヴ、80前後でセクレタリアト、85でキンチェム（伝説級）
  // 持ち主の決定 2026-10-20「健康が著しく低いのに超強い馬が評価点低くなるのもおかしいのでスピードスタミナから出す感じにしましょう」：
  //   総合力はその馬場のスピードとスタミナだけから出す（芝は芝の、ダートはダートの）。根性・気性・坂・健康・切れ・特殊能力では変わらない。
  //   スタミナの重みは、その馬の得意な距離（distMin と distMax の真ん中）で変わる：1200m 以下 0.25・2000m 0.35・2800m 以上 0.45（残りがスピード）。
  //   短距離馬はスタミナが低くても損をせず、長距離馬はスタミナがよく効く。距離の分からない値だけのとき（第3引数なし）は 2000m とみる
  T.FH_NAME = '総合力';
  // スピードとスタミナの重み付きの値 → 総合力 の折れ線
  // （G3 を勝った史実馬のまん中 76 で53・エアグルーヴ（94）で70・キンチェム（106.7）で85・能力の上限 118 で99）
  T.FH_KNOTS = [[76, 53], [94, 70], [106.7, 85], [118, 99]];
  // スタミナの重み（得意な距離の真ん中 m から。d は馬か {distMin, distMax} か距離の数）
  T.fhStaW = function (d) {
    const m = d == null ? 2000 : typeof d === 'number' ? d : ((d.distMin || 1600) + (d.distMax || 2400)) / 2;
    return U.clamp(0.35 + (m - 2000) / 8000, 0.25, 0.45);
  };
  // 総合力のもとの値（スピードとスタミナの重み付きの値）
  T.fhRaw = function (c0, surface, d) {
    const s = H.onSurface(c0, surface), w = T.fhStaW(d);
    return (s.spd || 0) * (1 - w) + (s.sta || 0) * w;
  };
  T.fh = (h, wIdx, surface) => T.fhOf(H.cur(h, wIdx), surface, h);
  // 能力の値（いまの値でも、伸びきった値でも）から総合力を出す。d は得意な距離を持つ馬（無ければ 2000m とみる）
  T.fhOf = function (c0, surface, d) {
    const a = T.fhRaw(c0, surface, d);
    const K = T.FH_KNOTS;
    let i = 0; while (i < K.length - 2 && a > K[i + 1][0]) i++;
    const [x0, y0] = K[i], [x1, y1] = K[i + 1];
    return U.clamp(Math.round(y0 + (a - x0) * (y1 - y0) / (x1 - x0)), 1, 99);
  };
  T.fhBoth = (h, wIdx) => ({ turf: T.fh(h, wIdx, '芝'), dirt: T.fh(h, wIdx, 'ダ') });
  // 伸びきったとき（完成）の総合力
  T.fhPeak = h => ({ turf: T.fhOf(h.pot, '芝', h), dirt: T.fhOf(h.pot, 'ダ', h) });
  // 画面に出す総合力（0.5 刻み。持ち主の決定 2026-10-21「名馬級は 65.0〜80.0・キンチェム 80.0」）。計算は上の fh のまま。godot/core/hs_season.gd の fh_show と同じ
  T.FH_SHOW_KNOTS = [[76, 53], [94, 69], [106.3, 80], [118, 99]];
  T.fhShowOf = function (c0, surface, d) {
    const a = T.fhRaw(c0, surface, d), K = T.FH_SHOW_KNOTS;
    let i = 0; while (i < K.length - 2 && a > K[i + 1][0]) i++;
    const [x0, y0] = K[i], [x1, y1] = K[i + 1];
    return U.clamp(Math.round((y0 + (a - x0) * (y1 - y0) / (x1 - x0)) * 2) / 2, 1, 99);
  };
  T.fhShowPeak = h => ({ turf: T.fhShowOf(h.pot, '芝', h), dirt: T.fhShowOf(h.pot, 'ダ', h) });
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
    { id: 'dc', label: 'グランドフェスティバル制覇', test: ws => ws.some(w => T.isGF(w.r)) }, // js/core/dream.js が GF ごとの冠（GF クラシック覇者など）に置き換える
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

  // ---------- 出走の予約（1年先＝52週先まで、重賞とオープンを先に押さえておく。入厩前の馬も） ----------
  T.RESERVE_WEEKS = 52;
  T.weeksLeft = () => T.RESERVE_WEEKS;
  T.reserves = id => (HS.World.get().reserve || []).filter(x => !id || x.id === id);
  T.reserve = function (id, race) {
    const W = HS.World, G = W.get();
    const h = W.horse(id);
    if (!h || h.owner !== 'P') return '持ち馬ではない';
    if (!race.graded && !(race.cls && race.region === 'JRA')) return '予約できるのは重賞とオープンだけ';
    // G1 は獲得賞金の条件もいまの賞金で見る（番組表 js/core/program.js と同じ）。連闘で別の国へは予約できない
    const why = T.staticIneligible(h, race, race.year) || HS.Fatigue.travelWhy(h, race) || (race.graded && race.grade !== 'G1' ? null : HS.Races.ineligible(h, race, race.year));
    if (why) return why;
    G.reserve = G.reserve || [];
    if (G.reserve.some(x => x.id === id && x.y === race.year && x.m === race.month && x.w === race.week)) return 'その週はもう予約している';
    if (W.oneRide() && G.reserve.some(x => x.key === race.key && x.id !== id)) return W.WHY_MINE; // 1つのレースに自分の馬は1頭まで（持ち主の決定 2026-10-20）
    G.reserve.push({ id, key: race.key, y: race.year, m: race.month, w: race.week, label: HS.Races.label(race) });
    G.reserve.sort((a, b) => (a.y - b.y) || (a.m - b.m) || (a.w - b.w));
    return null;
  };
  // 変わらない条件（年齢・性・せん馬）。G1 の獲得賞金の条件は、予約のときといまの賞金で見て、その週に出走登録するときにもう一度確かめる
  T.staticIneligible = function (h, race, year) {
    const age = year - h.born;
    if (race.age === '2' && age !== 2) return '年齢';
    if (race.age === '3' && age !== 3) return '年齢';
    if (race.age === '3+' && age < 3) return '年齢';
    if (race.age === '4+' && age < 4) return '年齢';
    if (race.age === '4' && age !== 4) return '年齢';
    if (age < 2) return '年齢';
    if (age === 2 && race.month < 6) return 'デビュー前'; // 2歳の競走は6月から
    if (race.sex === '牝' && h.sex !== '牝') return '牝馬限定';
    if (race.noGelding && h.gelding) return 'せん馬は出られない';
    return null;
  };
  // デビュー戦の予約（新馬戦は無いので、その週の2歳オープン）。馬場と距離の合うものを選んで登録する
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
    G.reserve.push({ id, key: `debut:${y}-${m}-${w}`, y, m, w, label: 'デビュー戦', debut: true });
    G.reserve.sort((a, b) => (a.y - b.y) || (a.m - b.m) || (a.w - b.w));
    return null;
  };
  T.debutRace = function (h) {
    const W = HS.World, G = W.get(), R = HS.Races;
    const list = W.weekRaces().filter(r => !r.graded && !r.invite && r.age === '2' && !R.ineligible(h, r, G.year) && !W.rideTaken(r.key, h.id)); // ほかのお手馬のデビュー戦とは別のレースに
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
      if (x.debut) { const r = T.debutRace(h); if (!r) { W.news(`${h.name}の予約していたデビュー戦（2歳オープン）が、この週にはない。`, 'warn'); continue; } key = r.key; }
      const err = W.enter(x.id, key);
      if (err) W.news(`${h.name}は予約していた${x.label}に出られない（${err}）。`, 'warn');
    }
    G.reserve = keep;
  };

  // ---------- グランドフェスティバル（GF）：年末のドリームレース。その年に活躍した馬だけが招待されて走る ----------
  // 距離ごとに5つ（芝1000・芝1600・芝2400・芝3200・ダート2000）と牝馬の1つ（芝2200）。12月1週に招待し、2〜4週に走る。
  // 出られる条件・自分の馬を1頭選ぶか出ないか・出走表は js/core/dream.js
  T.DC_NAME = 'グランドフェスティバル';
  T.DC_FIELD = 16;
  // 6つの GF（距離ごとと牝馬）・レースの形・招待・出走表は js/core/dream.js

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
