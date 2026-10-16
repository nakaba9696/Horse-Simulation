// 年末のドリームレース（グランドフィナーレ・GF）：距離ごとに5つ。出られる条件と、出るかどうかの選択（騎手のゲーム）
// 持ち主の声 2026-10-16「GFはそれぞれの距離で開かれます」
// 選ばれ方（GF ごとに16頭。入厩している3歳以上で、故障していない馬）：
//   1. 確定：前の年のその GF の勝ち馬（連覇に挑む）と、その年にその区分の距離の G1 を勝った自分の馬
//   2. 残り：その区分のレース（距離・馬場）で集めたファンの票の多い順。票はその年の成績で集まる（大きいレースほど・上の着ほど多い。1番人気で走るとファンが増える）。
//      G1を1つ勝てば100票なので、その区分の G1 の勝ち馬はたいてい入る。票が同じなら総合力の順
//   3. 票のある馬が16頭に足りなければ、その距離に向くほかの馬（総合力の順）で埋める（自分の馬は票が要る）
//   外国で調教された馬は1つの GF に4頭まで（多いと日本の年末の大一番に見えない）。
// 招待は12月1週。12月は4週しかないので、2・3週に2つずつ、4週に1つ開く。同じ馬が2つの GF に出るのは、間が2週あるときだけ（2週と4週）。
// 自分の馬が何頭招待されても、1つの GF に出られるのは1頭だけ（プレイヤーが選ぶ）。出ないこともできる。空いた枠はほかの馬の次の順位から埋める。
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const T = HS.Season;
  if (!T) return;

  // ---------- 5つの GF ----------
  const turf = (lo, hi) => r => r.surface !== 'ダ' && r.dist >= lo && r.dist <= hi;
  // 持ち主の決定 2026-10-16：芝1000・芝1600・芝2400・芝3200・ダート2000 の5つ。区分の境目（票・GF の馬の鍵）は数を見て決めた
  T.GF_CATS = [
    { id: 'sprint', label: '短距離', course: '新潟', surface: '芝', dist: 1000, week: 2, fit: turf(0, 1400) },       // 新潟の直線1000m（data/layouts.js の line）
    { id: 'dirt', label: 'ダート', course: '大井', surface: 'ダ', dist: 2000, week: 2, fit: r => r.surface === 'ダ' },
    { id: 'mile', label: 'マイル', course: '東京', surface: '芝', dist: 1600, week: 3, fit: turf(1401, 2000) },
    { id: 'long', label: '長距離', course: '京都', surface: '芝', dist: 3200, week: 3, fit: turf(2801, 9999) },
    { id: 'classic', label: '中長距離', course: '東京', surface: '芝', dist: 2400, week: 4, fit: turf(2001, 2800) }, // 前からの GF（東京芝2400）
  ];
  T.GF_BY = {}; for (const c of T.GF_CATS) T.GF_BY[c.id] = c;
  // AI の馬を割り振る順（1頭が2つに招待されるときは、この順で先の GF に出る）
  T.GF_ORDER = ['classic', 'mile', 'sprint', 'long', 'dirt'];
  T.DC_PREV = ['ドリームクラシック']; // 前の名前
  T.DC_RESERVE = 6;                    // 招待のあとに故障した馬の代わり
  T.DC_FOREIGN = 4;                    // 外国で調教された馬の枠
  T.GF_GAP = 2;                        // 2つの GF に出るときの間（週）
  T.gfName = id => `${T.DC_NAME}（${T.GF_BY[id].label}）`;
  // 勝ち鞍の名前が GF か（前の名前・距離ごとになる前の「グランドフィナーレ」も）
  T.isGF = n => !!n && (n.startsWith(T.DC_NAME) || T.DC_PREV.includes(n));
  // 勝ち鞍の名前 → 区分（距離ごとになる前の GF は中長距離）
  T.gfCatOfName = function (n) {
    if (!T.isGF(n)) return null;
    const c = T.GF_CATS.find(x => n === T.gfName(x.id));
    return c ? c.id : 'classic';
  };
  T.gfWins = h => (h.gradedWins || []).filter(g => T.isGF(g.short || g.race));
  // 馬のデータ（史実馬）の得意な区分。馬の店の「GF の馬」の鍵に使う
  T.gfCatOfData = function (d, peak) {
    if (d.surface === 'ダ' || (d.surface === '芝ダ' && peak && peak.dirt > peak.turf)) return 'dirt';
    if ((d.distMin || 0) >= 2000 && (d.distMax || 0) >= 3000) return 'long';
    const m = ((d.distMin || 1600) + (d.distMax || 2400)) / 2;
    return m <= 1400 ? 'sprint' : m <= 2000 ? 'mile' : 'classic';
  };
  // スペシャルホース（伝説級）がこの GF の距離に合うか
  T.gfFits = function (d, race) {
    if (race.surface === 'ダ' ? d.surface === '芝' : d.surface === 'ダ') return false;
    return race.dist >= (d.distMin || 1600) - 200 && race.dist <= (d.distMax || 2400) + 200;
  };
  // 自分の馬が、前の年のこの GF を勝っているか（スペシャルホースの「伝説級」のリーチ）
  T.gfWonPrev = (h, race) => T.gfWins(h).some(g => g.y === race.year - 1 && T.gfCatOfName(g.short || g.race) === race.gf);

  // ---------- ファンの票（仮の値。根拠は無く、G1を1つ勝てば重賞を3つ勝つよりも多い、を目安にした） ----------
  T.VOTES = {
    G1: [100, 40, 25, 15, 10],
    G2: [50, 20, 12, 6, 4],
    G3: [30, 12, 8, 4, 2],
    Jpn1: [50, 20, 12, 6, 4], // 地方の大レースは G2 と同じ扱い
    Jpn2: [30, 12, 8, 4, 2],
    Jpn3: [30, 12, 8, 4, 2],
    OP: [8, 3, 2],
    '': [4, 1],
  };
  T.VOTE_FAV = 5; // 1番人気で走るたびに増える票
  // その年の票。cat を渡すと、その区分のレースの票だけ
  T.votesOf = function (h, year, cat) {
    const fit = cat ? T.GF_BY[cat].fit : null;
    let v = 0;
    for (const r of h.results || []) {
      if (r.y !== year || (fit && !fit(r))) continue;
      const tab = T.VOTES[r.grade || ''];
      if (tab) v += tab[r.pos - 1] || 0;
      if (r.pop === 1) v += T.VOTE_FAV;
    }
    return v;
  };
  T.dcChamp = (h, year, cat) => T.gfWins(h).some(g => g.y === year - 1 && T.gfCatOfName(g.short || g.race) === (cat || 'classic'));
  // その年の G1 の勝ち（cat を渡すと、その区分の距離・馬場のものだけ）。勝ち鞍に距離が無いので、成績の1着から見る
  T.g1Wins = function (h, year, cat) {
    const fit = cat ? T.GF_BY[cat].fit : null;
    return (h.results || []).filter(r => r.y === year && r.pos === 1 && r.grade === 'G1' && (!fit || fit(r)));
  };

  // その年・その区分の順位（週ごとに使い回す）。tier：0 確定・2 票・3 埋め（AI の馬だけ）
  T.dcStanding = function (cat, year) {
    const W = HS.World, G = W.get();
    cat = cat || 'classic'; year = year || G.year;
    const wc = W.wc(); wc.dcStand = wc.dcStand || {};
    const ck = `${cat}:${year}`;
    if (wc.dcStand[ck]) return wc.dcStand[ck];
    const C = T.GF_BY[cat], wIdx = W.wIdx(), sf = C.surface === 'ダ' ? 'ダ' : '芝';
    const list = [], fill = [];
    for (const h of W.all()) {
      if (h.loc !== 'stable' || h.injury || year - h.born < 3 || h.legend) continue;
      const g1 = T.g1Wins(h, year, cat), champ = T.dcChamp(h, year, cat), votes = T.votesOf(h, year, cat);
      const mine = h.owner === 'P';
      const fh = T.fh(h, wIdx, sf);
      if (!votes && !champ) {
        // 埋め：その距離に向く AI の馬
        if (!mine && C.dist >= (h.distMin || 0) - 200 && C.dist <= (h.distMax || 9999) + 200 && ((C.surface === 'ダ' ? h.apt.dirt : h.apt.turf) || 0) >= 70) fill.push({ h, tier: 3, votes: 0, champ: false, g1: 0, why: 'その距離の実力', fh });
        continue;
      }
      const tier = champ || (mine && g1.length) ? 0 : 2;
      const why = champ ? '前の年の勝ち馬' : g1.length ? `${g1[g1.length - 1].race}を勝った` : 'ファンの票';
      list.push({ h, tier, votes, champ, g1: g1.length, why, fh });
    }
    const by = (a, b) => (a.tier - b.tier) || (b.votes - a.votes) || (b.fh - a.fh) || (a.h.id < b.h.id ? -1 : 1);
    list.sort(by); fill.sort(by);
    // 外国で調教された馬は枠まで。あふれた馬は16頭のあとに回す
    const top = [], rest = [];
    let nf = 0;
    for (const x of list.concat(fill)) {
      const f = !!x.h.foreignTrained && x.tier > 0;
      if (top.length < T.DC_FIELD && (!f || nf < T.DC_FOREIGN)) { top.push(x); if (f) nf++; } else rest.push(x);
    }
    const out = top.concat(rest);
    out.forEach((x, i) => { x.rank = i + 1; x.in = i < T.DC_FIELD; });
    wc.dcStand[ck] = out;
    return out;
  };
  // 招待の境目（その区分の票で16位の馬の票。16位が埋めの馬なら1票）
  T.dcCut = function (cat, year) {
    const l = T.dcStanding(cat, year);
    const x = l[T.DC_FIELD - 1];
    return x ? { votes: x.tier === 3 ? 1 : x.votes, tier: x.tier } : { votes: 1, tier: 3 };
  };

  // 自分の馬ひとつの、ひとつの GF の資格。{ ok, state, text, why, need, votes, rank }
  //   state：'young'（2歳）・'off'（入厩していない・故障）・'sure'（確定）・'in'（圏内）・'out'（圏外）・'invited'・'notInvited'（招待のあと）
  T.dcStatus = function (h, cat) {
    const G = HS.World.get(), year = G.year;
    cat = cat || 'classic';
    if (!h || h.owner !== 'P' || h.loc === 'retired') return null;
    const inv = G.dc && G.dc.y === year && G.dc.gf ? G.dc.gf[cat] : null;
    if (inv) {
      const e = (inv.elig || []).find(x => x.id === h.id);
      if (e) return { ok: true, state: 'invited', text: inv.pick === h.id ? '出る' : '招待', why: e.why };
      return { ok: false, state: 'notInvited', text: '招待なし' };
    }
    if (year - h.born < 3) return { ok: false, state: 'young', text: '3歳から', need: '3歳の年から目指せる' };
    if (h.loc !== 'stable' || h.injury) return { ok: false, state: 'off', text: h.injury ? '故障中' : '牧場', need: '入厩して走ること' };
    const l = T.dcStanding(cat, year);
    const x = l.find(y => y.h === h);
    if (x && x.tier === 0) return { ok: true, state: 'sure', text: '資格あり', why: x.champ ? '前の年の勝ち馬・連覇に挑む' : `G1（${x.why.replace('を勝った', '')}）を勝った`, votes: x.votes, rank: x.rank };
    const cut = T.dcCut(cat, year);
    if (x && x.in) return { ok: true, state: 'in', text: '圏内', why: `ファンの票 ${x.rank}位`, votes: x.votes, rank: x.rank, need: '12月1週まで圏内に残ること' };
    const v = x ? x.votes : 0;
    const gap = cut.tier < 2 ? null : Math.max(1, cut.votes - v + (cut.tier === 3 ? 0 : 1));
    const where = T.GF_BY[cat].label;
    return { ok: false, state: 'out', text: '圏外', votes: v, rank: x ? x.rank : null, need: gap ? `${where}のG1を1勝、または${where}のレースでファンの票をあと${gap}票` : `${where}のG1を1勝` };
  };

  // ---------- 12月1週：招待 ----------
  T.dcInvite = function () {
    const W = HS.World, G = W.get();
    if (G.mode !== 'jockey' || (G.dc && G.dc.y === G.year)) return;
    W.dirty();
    const gf = {};
    const aiWeeks = new Map(); // AI の馬が出る GF の週（同じ馬は間が2週あるときだけ2つ目に出る）
    for (const id of T.GF_ORDER) {
      const C = T.GF_BY[id];
      const l = T.dcStanding(id, G.year);
      const top = l.slice(0, T.DC_FIELD);
      const elig = top.filter(x => x.h.owner === 'P').map(x => ({ id: x.h.id, why: x.tier === 0 ? x.why : `ファンの票 ${x.rank}位（${x.votes}票）` }));
      // ほかの馬：16頭の中の順のあと、あふれた順（外国の枠を守ったまま、自分の馬が抜けた分を埋める）
      const ai = [];
      for (const x of top.concat(l.slice(T.DC_FIELD).filter(y => !y.h.foreignTrained))) {
        if (x.h.owner === 'P' || ai.length >= T.DC_FIELD + T.DC_RESERVE) continue;
        const ws = aiWeeks.get(x.h.id) || [];
        if (ws.some(w => Math.abs(w - C.week) < T.GF_GAP)) continue;
        ai.push(x.h.id);
        if (ai.length <= T.DC_FIELD) aiWeeks.set(x.h.id, ws.concat([C.week]));
      }
      gf[id] = { ai, elig, pick: null, ans: null };
    }
    G.dc = { y: G.year, gf };
    W.news(`${T.DC_NAME}（12月2〜4週・距離ごとに5つ）の招待馬が決まった。`, 'g1');
    const mine = new Set(); for (const id in gf) for (const x of gf[id].elig) mine.add(x.id);
    if (mine.size) W.news(`${[...mine].map(id => W.horse(id).name).join('・')}に${T.DC_NAME}の招待が届いた！ 出るかどうかを決めてください。`, 'g1');
  };
  const inv = cat => { const G = HS.World.get(); return G.dc && G.dc.y === G.year && G.dc.gf ? G.dc.gf[cat] || null : null; };
  const over = cat => { const G = HS.World.get(); return G.month === 12 && G.week > T.GF_BY[cat].week; };
  // 返事を待っている GF（区分の id の並び）
  T.dcPendingList = function () {
    const G = HS.World.get();
    if (G.mode !== 'jockey') return [];
    return T.GF_CATS.map(c => c.id).filter(id => { const x = inv(id); return x && x.elig.length && !x.ans && !over(id) && T.dcEligible(id).length; });
  };
  T.dcPending = () => T.dcPendingList().length > 0;
  // その GF に出られる自分の馬（いま走れるもの）
  T.dcEligible = function (cat) {
    const W = HS.World, x = inv(cat || 'classic');
    if (!x) return [];
    return (x.elig || []).map(e => ({ h: W.horse(e.id), why: e.why })).filter(e => e.h && e.h.owner === 'P' && e.h.loc === 'stable' && !e.h.injury);
  };
  // 自分の馬 id が、cat のほかに出る GF（決めたもの）で、間が2週ない所
  T.dcClash = function (id, cat, runners) {
    runners = runners || T.dcRunners();
    const w = T.GF_BY[cat].week;
    return T.GF_CATS.filter(c => c.id !== cat && runners[c.id] && runners[c.id].id === id && Math.abs(c.week - w) < T.GF_GAP).map(c => c.id);
  };
  // 出る（1頭だけ）
  T.dcChoose = function (cat, id) {
    const W = HS.World, x = inv(cat);
    if (!x) return '招待が来ていない';
    if (over(cat)) return 'もう終わった';
    if (!T.dcEligible(cat).some(e => e.h.id === id)) return 'この馬は出られない';
    const clash = T.dcClash(id, cat, T.dcRunners({ explicitOnly: true }));
    if (clash.length) return `${T.gfName(clash[0])}と間が${T.GF_GAP}週ない`;
    x.pick = id; x.ans = 'yes';
    W._week = null;
    return null;
  };
  // 出ない（AI の馬だけで走る。結果は観戦できる）
  T.dcDecline = function (cat) {
    const W = HS.World, x = inv(cat);
    if (!x) return '招待が来ていない';
    x.pick = null; x.ans = 'no';
    W._week = null;
    return null;
  };
  // GF ごとに走る自分の馬 { cat: 馬 | null }。
  // 返事が無いまま当日になった GF は、その GF の馬場の総合力（いま）が一番高い馬で出る
  // （招待は1年の成果なので、返事を忘れただけで取り逃さないようにする。出たくなければ「出ない」を選べる）。
  // 決めた GF を先に、決めていない GF は開く順に、間が2週ない馬を避けて選ぶ
  T.dcRunners = function (opts) {
    const W = HS.World, wIdx = W.wIdx(), out = {};
    const ok = h => h && h.owner === 'P' && h.loc === 'stable' && !h.injury;
    for (const c of T.GF_CATS) { const x = inv(c.id); if (x && x.ans === 'yes' && ok(W.horse(x.pick))) out[c.id] = W.horse(x.pick); }
    if (opts && opts.explicitOnly) return out;
    for (const c of T.GF_CATS) {
      const x = inv(c.id);
      if (!x || x.ans) continue;
      const sf = c.surface === 'ダ' ? 'ダ' : '芝';
      const free = T.dcEligible(c.id).map(e => e.h).filter(h => !T.dcClash(h.id, c.id, out).length)
        .sort((a, b) => T.fh(b, wIdx, sf) - T.fh(a, wIdx, sf));
      if (free.length) out[c.id] = free[0];
    }
    return out;
  };
  T.dcBest = cat => { const r = T.dcRunners(); return inv(cat) && !inv(cat).ans ? r[cat] || null : null; };
  T.dcRunner = cat => T.dcRunners()[cat || 'classic'] || null;

  // ---------- レース ----------
  T.dcRace = function (year, cat) {
    const G = HS.World.get(), R = HS.Races, C = T.GF_BY[cat || 'classic'];
    const arima = R.gradedOf(year, 12, 4).find(r => r.name === '有馬記念');
    // 大井の GF も、番組の上は JRA のレースとして扱う（地方の格付け Jpn にしない）
    return {
      name: T.gfName(C.id), short: T.gfName(C.id), gf: C.id, grade: 'GF', region: 'JRA', course: C.course, surface: C.surface, dist: C.dist, month: 12, week: C.week, age: '3+', weight: '定量',
      key: `${year}-12-${C.week}-GF-${C.id}`, graded: true, invite: true, year, prize: arima ? arima.prize : 20000,
      ground: R.ground(G.seed, year, 12, C.week, C.course),
    };
  };
  // その週の GF を足す（W.weekRaces から呼ぶ）。招待の決まった GF だけ
  T.addSpecial = function (list, year, month, week) {
    const G = HS.World.get();
    if (G.mode !== 'jockey' || month !== 12 || !G.dc || G.dc.y !== year) return;
    if (!G.dc.gf) T.dcUpgrade(G);
    for (const c of T.GF_CATS) if (c.week === week && G.dc.gf[c.id]) list.push(T.dcRace(year, c.id));
  };
  // 出走表：自分の1頭（出るなら）と、ほかの馬の上位で16頭
  T.dcField = function (race) {
    const W = HS.World, G = W.get();
    if (!G.dc || G.dc.y !== race.year) return [];
    if (!G.dc.gf) T.dcUpgrade(G);
    const cat = race.gf || 'classic', x = G.dc.gf[cat];
    if (!x) return [];
    const me = T.dcRunners()[cat];
    const out = me ? [{ horse: me, jockeyName: W.bestFreeJockey(race.key, me.id), mine: true }] : [];
    for (const id of x.ai) {
      if (out.length >= T.DC_FIELD) break;
      const h = W.horse(id);
      if (h && h.owner !== 'P' && h.loc === 'stable' && !h.injury) out.push({ horse: h });
    }
    return out;
  };
  // いまの出走の顔ぶれ（画面用）
  T.dcLineup = function (cat) {
    const G = HS.World.get(), C = T.GF_BY[cat || 'classic'];
    if (!G.dc || G.dc.y !== G.year) return [];
    return T.dcField({ year: G.year, gf: C.id, key: `${G.year}-12-${C.week}-GF-${C.id}` }).map(x => x.horse);
  };
  // 前の形のセーブを今の形に：
  //  { y, ids }（GF が1つで、招待された自分の馬が全部出た）・{ y, ai, elig, pick, ans }（GF が1つで、自分の馬は1頭）→ 中長距離の GF だけ開く年
  T.dcUpgrade = function (g) {
    if (!g.dc || g.dc.gf) return;
    const d = g.dc;
    let x;
    if (d.ai) x = { ai: d.ai, elig: d.elig || [], pick: d.pick || null, ans: d.ans || null };
    else {
      const ids = d.ids || [];
      const own = id => g.horses[id] && g.horses[id].owner === 'P';
      const elig = ids.filter(own).map(id => ({ id, why: '招待' }));
      x = { ai: ids.filter(id => !own(id)), elig, pick: elig.length ? elig[0].id : null, ans: elig.length ? 'yes' : null };
    }
    g.dc = { y: d.y, gf: { classic: x } };
  };
})();
