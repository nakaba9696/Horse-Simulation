// 年末のドリームレース（グランドフィナーレ）の出られる条件と、出るかどうかの選択（騎手のゲーム）
// 選ばれ方（16頭。入厩している3歳以上で、故障していない馬）：
//   1. 確定：前の年のグランドフィナーレの勝ち馬（連覇に挑む）と、その年にG1を勝った自分の馬
//   2. 残り：ファンの票の多い順。票はその年の成績で集まる（大きいレースほど・上の着ほど多い。1番人気で走るとファンが増える）。
//      G1を1つ勝てば100票なので、G1の勝ち馬はたいてい入る。票が同じなら総合力の順
//   外国で調教された馬は4頭まで（多いと日本の年末の大一番に見えない）。
// 自分の馬が何頭選ばれても、出られるのは1頭だけ（プレイヤーが選ぶ）。出ないこともできる。空いた枠はほかの馬の次の順位から埋める。
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const T = HS.Season;
  if (!T) return;

  T.DC_PREV = ['ドリームクラシック']; // 前の名前（勝ち鞍の数え方で使う）
  T.DC_RESERVE = 6;                    // 招待のあとに故障した馬の代わり
  T.DC_FOREIGN = 4;                    // 外国で調教された馬の枠

  // ---------- ファンの票（仮の値。根拠は無く、G1を1つ勝てば重賞を3つ勝つよりも多い、を目安にした） ----------
  // 着順ごとの票（1〜5着）
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
  T.votesOf = function (h, year) {
    let v = 0;
    for (const r of h.results || []) {
      if (r.y !== year) continue;
      const tab = T.VOTES[r.grade || ''];
      if (tab) v += tab[r.pos - 1] || 0;
      if (r.pop === 1) v += T.VOTE_FAV;
    }
    return v;
  };
  const isDc = g => [T.DC_NAME].concat(T.DC_PREV).includes(g.short || g.race);
  T.dcChamp = (h, year) => (h.gradedWins || []).some(g => g.y === year - 1 && isDc(g));
  T.g1Wins = (h, year) => (h.gradedWins || []).filter(g => g.y === year && g.grade === 'G1' && !g.hist);

  // その年の順位（週ごとに使い回す）。tier：0 確定・2 票
  T.dcStanding = function (year) {
    const W = HS.World, G = W.get();
    year = year || G.year;
    const wc = W.wc();
    if (wc.dcStand && wc.dcStand.y === year) return wc.dcStand.list;
    const wIdx = W.wIdx();
    const list = [];
    for (const h of W.all()) {
      if (h.loc !== 'stable' || h.injury || year - h.born < 3 || h.legend) continue;
      const g1 = T.g1Wins(h, year), champ = T.dcChamp(h, year), votes = T.votesOf(h, year);
      if (!votes && !g1.length && !champ) continue;
      const mine = h.owner === 'P';
      const tier = champ || (mine && g1.length) ? 0 : 2;
      const why = champ ? '前の年の勝ち馬' : g1.length ? `${g1[g1.length - 1].short || g1[g1.length - 1].race}を勝った` : 'ファンの票';
      list.push({ h, tier, votes, champ, g1: g1.length, why, fh: Math.max(T.fh(h, wIdx, '芝'), T.fh(h, wIdx, 'ダ')) });
    }
    list.sort((a, b) => (a.tier - b.tier) || (b.votes - a.votes) || (b.fh - a.fh) || (a.h.id < b.h.id ? -1 : 1));
    // 外国で調教された馬は枠まで。あふれた馬は16頭のあとに回す
    const top = [], rest = [];
    let nf = 0;
    for (const x of list) {
      const f = !!x.h.foreignTrained && x.tier > 0;
      if (top.length < T.DC_FIELD && (!f || nf < T.DC_FOREIGN)) { top.push(x); if (f) nf++; } else rest.push(x);
    }
    const out = top.concat(rest);
    out.forEach((x, i) => { x.rank = i + 1; x.in = i < T.DC_FIELD; });
    wc.dcStand = { y: year, list: out };
    return out;
  };
  // 招待の境目（16位の票）
  T.dcCut = function (year) {
    const l = T.dcStanding(year);
    const x = l[T.DC_FIELD - 1];
    return x ? { votes: x.votes, tier: x.tier } : { votes: 0, tier: 2 };
  };

  // 自分の馬ひとつの資格。{ ok, state, text, need }
  //   state：'young'（2歳）・'off'（入厩していない・故障）・'sure'（確定）・'in'（圏内）・'out'（圏外）・'invited'・'notInvited'（招待のあと）
  T.dcStatus = function (h) {
    const G = HS.World.get(), year = G.year;
    if (!h || h.owner !== 'P' || h.loc === 'retired') return null;
    if (G.dc && G.dc.y === year && G.dc.ai) {
      const e = (G.dc.elig || []).find(x => x.id === h.id);
      if (e) return { ok: true, state: 'invited', text: G.dc.pick === h.id ? '招待：出る' : '招待された', why: e.why };
      return { ok: false, state: 'notInvited', text: '招待されなかった' };
    }
    if (year - h.born < 3) return { ok: false, state: 'young', text: '3歳から', need: '3歳の年から目指せる' };
    if (h.loc !== 'stable' || h.injury) return { ok: false, state: 'off', text: h.injury ? '故障中' : '牧場', need: '入厩して走ること' };
    const l = T.dcStanding(year);
    const x = l.find(y => y.h === h);
    if (x && x.tier === 0) return { ok: true, state: 'sure', text: '資格あり', why: x.champ ? '前の年の勝ち馬・連覇に挑む' : `G1（${x.why.replace('を勝った', '')}）を勝った`, votes: x.votes, rank: x.rank };
    const cut = T.dcCut(year);
    if (x && x.in) return { ok: true, state: 'in', text: '圏内', why: `ファンの票 ${x.rank}位`, votes: x.votes, rank: x.rank, need: '12月1週まで圏内に残ること' };
    const v = x ? x.votes : 0;
    const gap = cut.tier < 2 ? null : Math.max(1, cut.votes - v + 1);
    return { ok: false, state: 'out', text: '圏外', votes: v, rank: x ? x.rank : null, need: gap ? `G1を1勝、またはファンの票をあと${gap}票` : 'G1を1勝' };
  };

  // ---------- 12月1週：招待 ----------
  T.dcInvite = function () {
    const W = HS.World, G = W.get();
    if (G.mode !== 'jockey' || (G.dc && G.dc.y === G.year)) return;
    W.dirty();
    const l = T.dcStanding(G.year);
    const top = l.slice(0, T.DC_FIELD);
    const elig = top.filter(x => x.h.owner === 'P').map(x => ({ id: x.h.id, why: x.tier === 0 ? x.why : `ファンの票 ${x.rank}位（${x.votes}票）` }));
    // ほかの馬：16頭の中の順のあと、あふれた順（外国の枠を守ったまま、自分の馬が抜けた分を埋める）
    const ai = top.concat(l.slice(T.DC_FIELD).filter(x => !x.h.foreignTrained)).filter(x => x.h.owner !== 'P').slice(0, T.DC_FIELD + T.DC_RESERVE).map(x => x.h.id);
    G.dc = { y: G.year, ai, elig, pick: null, ans: null };
    W.news(`${T.DC_NAME}（12月4週・東京芝2400m）の招待馬が決まった。`, 'g1');
    if (elig.length) W.news(`${elig.map(x => W.horse(x.id).name).join('・')}に${T.DC_NAME}の招待が届いた！ 出るかどうかを決めてください。`, 'g1');
  };
  // 返事を待っている招待
  T.dcPending = function () {
    const G = HS.World.get();
    return !!(G.mode === 'jockey' && G.dc && G.dc.y === G.year && G.dc.ai && (G.dc.elig || []).length && !G.dc.ans && !(G.month === 12 && G.week > 4));
  };
  // 出られる自分の馬（いま走れるもの）
  T.dcEligible = function () {
    const W = HS.World, G = W.get();
    if (!G.dc || G.dc.y !== G.year) return [];
    return (G.dc.elig || []).map(x => ({ h: W.horse(x.id), why: x.why })).filter(x => x.h && x.h.owner === 'P' && x.h.loc === 'stable' && !x.h.injury);
  };
  // おすすめ（返事をしないまま当日になったときに出す馬）：芝の総合力（いま）が一番高い馬
  T.dcBest = function () {
    const W = HS.World, wIdx = W.wIdx();
    const l = T.dcEligible().sort((a, b) => T.fh(b.h, wIdx, '芝') - T.fh(a.h, wIdx, '芝'));
    return l.length ? l[0].h : null;
  };
  // 出る（1頭だけ）
  T.dcChoose = function (id) {
    const W = HS.World, G = W.get();
    if (!G.dc || G.dc.y !== G.year || !G.dc.ai) return '招待が来ていない';
    if (G.month === 12 && G.week > 4) return 'もう終わった';
    if (!T.dcEligible().some(x => x.h.id === id)) return 'この馬は出られない';
    G.dc.pick = id; G.dc.ans = 'yes';
    W._week = null;
    return null;
  };
  // 出ない（AI の馬だけで走る。結果は観戦できる）
  T.dcDecline = function () {
    const W = HS.World, G = W.get();
    if (!G.dc || G.dc.y !== G.year || !G.dc.ai) return '招待が来ていない';
    G.dc.pick = null; G.dc.ans = 'no';
    W._week = null;
    return null;
  };
  // 当日に走る自分の馬。返事が無いまま当日になったら、おすすめの1頭で出る
  // （招待は1年の成果なので、返事を忘れただけで取り逃さないようにする。出たくなければ「出ない」を選べる）
  T.dcRunner = function () {
    const W = HS.World, G = W.get();
    if (!G.dc || G.dc.y !== G.year || G.dc.ans === 'no') return null;
    if (G.dc.ans === 'yes') { const h = W.horse(G.dc.pick); return h && h.owner === 'P' && h.loc === 'stable' && !h.injury ? h : null; }
    return T.dcBest();
  };
  // 出走表：自分の1頭（出るなら）と、ほかの馬の上位で16頭
  T.dcField = function (race) {
    const W = HS.World, G = W.get();
    if (!G.dc || G.dc.y !== race.year) return [];
    if (!G.dc.ai) T.dcUpgrade(G);
    const me = T.dcRunner();
    const out = me ? [{ horse: me, jockeyName: W.bestFreeJockey(race.key, me.id), mine: true }] : [];
    for (const id of G.dc.ai) {
      if (out.length >= T.DC_FIELD) break;
      const h = W.horse(id);
      if (h && h.owner !== 'P' && h.loc === 'stable' && !h.injury) out.push({ horse: h });
    }
    return out;
  };
  // いまの出走の顔ぶれ（画面用）
  T.dcLineup = function () {
    const G = HS.World.get();
    if (!G.dc || G.dc.y !== G.year) return [];
    return T.dcField({ year: G.year, key: `${G.year}-12-4-GF` }).map(x => x.horse);
  };
  // 前の形（{ y, ids }：招待された自分の馬が全部出た）のセーブを今の形に。自分の馬は先頭の1頭が出る
  T.dcUpgrade = function (g) {
    if (!g.dc || g.dc.ai) return;
    const ids = g.dc.ids || [];
    const own = id => g.horses[id] && g.horses[id].owner === 'P';
    const elig = ids.filter(own).map(id => ({ id, why: '招待' }));
    g.dc = { y: g.dc.y, ai: ids.filter(id => !own(id)), elig, pick: elig.length ? elig[0].id : null, ans: elig.length ? 'yes' : null };
  };
})();
