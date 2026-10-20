// 年末のドリームレース（グランドフェスティバル・GF）：海外の競馬場で6つ（区分は data/gf.js）。出られる条件と、出るかどうかの選択（騎手のゲーム）
// 持ち主の仕様書（docs/SPEC.md の「GF」・2026-10-19）：
//   ・GF への誘いは12月4週が終わってから。12月4週のあとに「GF の週」（G.week＝5。T.GF_WEEK）を置き、6つの GF をその週に走る
//   ・GF は特別枠：疲れ・調子・休みは動かず（移動の疲れも無い）、出走数・勝ち数・リーディングにも数えない（賞金・勝ち鞍・トロフィーは残る）
//   ・複数の GF に招待されて、続けて出られる（連戦。同じ週なので間の決まりは無い）
//   ・前の年の同じ GF を勝った自分の馬が出ると、担当の伝説級（data/legends.js の gf）が出てくる。GF を全部勝つと、どの GF にもキンチェム（gf:'all'）
//   ・GF を勝つと、担当の伝説級が店に並ぶ。その区分を初めて勝ったときは、担当の伝説級を1頭、牧場（引退馬）にもらえる（オリジナルホースの親にできる）
//   ・GF ごとに違うトロフィー（data/gf.js の trophy。js/core/trophy.js）
// 選ばれ方（GF ごとに16頭。入厩している3歳以上の馬）：招待の条件は持ち主が検討中なので、前からの票の仕組みのまま
//   1. 確定：前の年のその GF の勝ち馬（連覇に挑む）と、その年にその区分の距離の G1 を勝った自分の馬
//   2. 残り：その区分のレース（data/gf.js の votes）で集めたファンの票の多い順。票はその年の成績で集まる（大きいレースほど・上の着ほど多い。1番人気で走るとファンが増える）。
//      G1を1つ勝てば100票なので、その区分の G1 の勝ち馬はたいてい入る。票が同じなら総合力の順
//   3. 票のある馬が16頭に足りなければ、その距離に向くほかの馬（総合力の順）で埋める（自分の馬は票が要る）
//   外国で調教された馬は1つの GF に4頭まで。
// 自分の馬が何頭招待されても、1つの GF に出られるのは1頭だけ（プレイヤーが選ぶ）。出ないこともできる。空いた枠はほかの馬の次の順位から埋める。
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const T = HS.Season;
  if (!T) return;

  // ---------- 6つの GF（data/gf.js） ----------
  const fitOf = v => r => (!v.surface || (v.surface === 'ダ' ? r.surface === 'ダ' : r.surface !== 'ダ')) && (v.min == null || r.dist >= v.min) && (v.max == null || r.dist <= v.max);
  T.GF_WEEK = 5; // 12月4週のあとの「GF の週」
  T.GF_CATS = (HS.DATA.gf || []).map(c => Object.assign({}, c, { week: T.GF_WEEK, fit: fitOf(c.votes || {}) }));
  T.GF_BY = {}; for (const c of T.GF_CATS) T.GF_BY[c.id] = c;
  T.GF_ORDER = T.GF_CATS.map(c => c.id); // 画面のタブ・招待の順
  // 馬の冠：前の「グランドフェスティバル制覇」の代わりに、GF ごとのトロフィーの名前（GF クラシック覇者など）
  T.TITLES = T.TITLES.filter(t => t.id !== 'dc').concat(T.GF_CATS.map(c => ({ id: 'gf:' + c.id, label: c.trophy, test: ws => ws.some(w => T.gfCatOfName(w.r) === c.id) })));
  T.DC_PREV = ['ドリームクラシック', 'グランドフィナーレ']; // 前の名前（前のセーブの勝ち鞍も GF として数える。「グランドフィナーレ（短距離）」のように区分の付いた名前も）
  T.DC_RESERVE = 6;                    // 招待のあとに出られなくなった馬（引退など）の代わり
  T.DC_FOREIGN = 4;                    // 外国で調教された馬の枠
  T.gfName = id => `${T.DC_NAME}（${T.GF_BY[id].label}）`;
  // 勝ち鞍の名前が GF か（前の名前「グランドフィナーレ」「ドリームクラシック」も）
  T.isGF = n => !!n && [T.DC_NAME].concat(T.DC_PREV).some(p => n.startsWith(p));
  // 勝ち鞍の名前 → 区分（前の名前でも、括弧の中の区分の名前で見る）。いまの区分に無い名前（前の「中長距離」・距離ごとになる前の GF・ドリームクラシック）はクラシック（芝2400）
  T.gfCatOfName = function (n) {
    if (!T.isGF(n)) return null;
    const c = T.GF_CATS.find(x => n.endsWith(`（${x.label}）`));
    return c ? c.id : 'classic';
  };
  T.gfWins = h => (h.gradedWins || []).filter(g => T.isGF(g.short || g.race));
  // 馬のデータ（史実馬）の得意な区分。馬の店の「GF の馬」の鍵に使う
  T.gfCatOfData = function (d, peak) {
    if (d.surface === 'ダ' || (d.surface === '芝ダ' && peak && peak.dirt > peak.turf)) return 'dirt';
    if ((d.distMin || 0) >= 2000 && (d.distMax || 0) >= 3000) return 'long';
    const m = ((d.distMin || 1600) + (d.distMax || 2400)) / 2;
    return m <= 1400 ? 'sprint' : m <= 1800 ? 'mile' : m <= 2200 ? 'distance' : 'classic';
  };
  // 自分の馬が、前の年のこの GF を勝っているか（スペシャルホースの「伝説級」のリーチ）
  T.gfWonPrev = (h, race) => T.gfWins(h).some(g => g.y === race.year - 1 && T.gfCatOfName(g.short || g.race) === race.gf);
  // 担当の伝説級（data/legends.js の gf）
  T.gfLegends = cat => (HS.Special ? HS.Special.pool().filter(d => d.tier === 'legend' && d.gf === cat) : []);
  // 自分の馬で GF を全部勝ったか（トロフィーで見る。キンチェムが出てくる条件）
  T.gfAllWon = () => { const G = HS.World.get(), tr = (G && G.trophies) || {}; return T.GF_CATS.length > 0 && T.GF_CATS.every(c => tr['gf:' + c.id]); };

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
      if (h.loc !== 'stable' || year - h.born < 3 || h.legend) continue;
      const g1 = T.g1Wins(h, year, cat), champ = T.dcChamp(h, year, cat), votes = T.votesOf(h, year, cat);
      const mine = h.owner === 'P';
      const fh = T.fh(h, wIdx, sf);
      if (!votes && !champ) {
        // 埋め：その距離に向く AI の馬
        // 距離がぴったり合う馬を先に、足りなければ少し外れる馬（長距離は向く馬が少ないため）
        const apt = (C.surface === 'ダ' ? h.apt.dirt : h.apt.turf) || 0;
        const near = C.dist >= (h.distMin || 0) - 200 && C.dist <= (h.distMax || 9999) + 200 && apt >= 70;
        const loose = C.dist >= (h.distMin || 0) - 600 && C.dist <= (h.distMax || 9999) + 800 && apt >= 60;
        if (!mine && (near || loose)) fill.push({ h, tier: near ? 3 : 4, votes: 0, champ: false, g1: 0, why: 'その距離の実力', fh });
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
  //   state：'young'（2歳）・'off'（入厩していない）・'sure'（確定）・'in'（圏内）・'out'（圏外）・'invited'・'notInvited'（招待のあと）
  T.dcStatus = function (h, cat) {
    const G = HS.World.get(), year = G.year;
    cat = cat || 'classic';
    if (!h || h.owner !== 'P' || h.loc === 'retired') return null;
    const thisYear = G.dc && G.dc.y === year && G.dc.gf;
    const inv = thisYear ? G.dc.gf[cat] : null;
    // 招待が済んだ年に、その GF が無い（GF の週を開かない前の版のセーブの年）
    if (thisYear && !inv) return { ok: false, state: 'notInvited', text: '今年はなし' };
    if (inv) {
      const e = (inv.elig || []).find(x => x.id === h.id);
      if (e) return { ok: true, state: 'invited', text: inv.pick === h.id ? '出る' : '招待', why: e.why };
      return { ok: false, state: 'notInvited', text: '招待なし' };
    }
    if (year - h.born < 3) return { ok: false, state: 'young', text: '3歳から', need: '3歳の年から目指せる' };
    if (h.loc !== 'stable') return { ok: false, state: 'off', text: '牧場', need: '入厩して走ること' };
    const l = T.dcStanding(cat, year);
    const x = l.find(y => y.h === h);
    if (x && x.tier === 0) return { ok: true, state: 'sure', text: '資格あり', why: x.champ ? '前の年の勝ち馬・連覇に挑む' : `G1（${x.why.replace('を勝った', '')}）を勝った`, votes: x.votes, rank: x.rank };
    const cut = T.dcCut(cat, year);
    if (x && x.in) return { ok: true, state: 'in', text: '圏内', why: `ファンの票 ${x.rank}位`, votes: x.votes, rank: x.rank, need: '12月4週まで圏内に残ること' };
    const v = x ? x.votes : 0;
    const gap = cut.tier < 2 ? null : Math.max(1, cut.votes - v + (cut.tier === 3 ? 0 : 1));
    const where = T.GF_BY[cat].label;
    return { ok: false, state: 'out', text: '圏外', votes: v, rank: x ? x.rank : null, need: gap ? `${where}のG1を1勝、または${where}のレースでファンの票をあと${gap}票` : `${where}のG1を1勝` };
  };

  // ---------- 12月4週が終わったら：招待（W.nextWeek から。GF が1つでもあれば GF の週に入る） ----------
  T.gfStage = function () {
    const G = HS.World.get();
    if (G.mode !== 'jockey' || G.month !== 12 || G.week !== 4) return false;
    HS.World.wc().dcStand = {}; // 12月4週のレースの前に数えた順位は使わない
    T.dcInvite();
    return !!(G.dc && G.dc.y === G.year && G.dc.gf && Object.keys(G.dc.gf).length);
  };
  T.dcInvite = function () {
    const W = HS.World, G = W.get();
    if (G.mode !== 'jockey' || (G.dc && G.dc.y === G.year)) return;
    W.dirty();
    const gf = {};
    for (const id of T.GF_ORDER) {
      const l = T.dcStanding(id, G.year);
      const top = l.slice(0, T.DC_FIELD);
      const elig = top.filter(x => x.h.owner === 'P').map(x => ({ id: x.h.id, why: x.tier === 0 ? x.why : `ファンの票 ${x.rank}位（${x.votes}票）` }));
      // ほかの馬：16頭の中の順のあと、あふれた順（外国の枠を守ったまま、自分の馬が抜けた分を埋める）。ほかの GF にも出る馬がいてよい（連戦）
      const ai = [];
      for (const x of top.concat(l.slice(T.DC_FIELD).filter(y => !y.h.foreignTrained))) {
        if (x.h.owner === 'P' || ai.length >= T.DC_FIELD + T.DC_RESERVE) continue;
        ai.push(x.h.id);
      }
      gf[id] = { ai, elig, pick: null, ans: null };
    }
    G.dc = { y: G.year, v: 2, gf };
    W.news(`${T.DC_NAME}（${T.GF_CATS.length}つ）の招待馬が決まった。`, 'g1');
    const mine = new Set(); for (const id in gf) for (const x of gf[id].elig) mine.add(x.id);
    if (mine.size) W.news(`${[...mine].map(id => W.horse(id).name).join('・')}に${T.DC_NAME}の招待が届いた！ 出るかどうかを決めてください。`, 'g1');
  };
  const inv = cat => { const G = HS.World.get(); return G.dc && G.dc.y === G.year && G.dc.gf ? G.dc.gf[cat] || null : null; };
  // 返事を待っている GF（区分の id の並び）
  T.dcPendingList = function () {
    const G = HS.World.get();
    if (G.mode !== 'jockey') return [];
    return T.GF_CATS.map(c => c.id).filter(id => { const x = inv(id); return x && x.elig.length && !x.ans && T.dcEligible(id).length; });
  };
  T.dcPending = () => T.dcPendingList().length > 0;
  // その GF に出られる自分の馬（いま走れるもの）
  T.dcEligible = function (cat) {
    const W = HS.World, x = inv(cat || 'classic');
    if (!x) return [];
    return (x.elig || []).map(e => ({ h: W.horse(e.id), why: e.why })).filter(e => e.h && e.h.owner === 'P' && e.h.loc === 'stable');
  };
  // 出る（1頭だけ）。同じ馬がいくつの GF に出てもよい
  T.dcChoose = function (cat, id) {
    const W = HS.World, x = inv(cat);
    if (!x) return '招待が来ていない';
    if (!T.dcEligible(cat).some(e => e.h.id === id)) return 'この馬は出られない';
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
  // （招待は1年の成果なので、返事を忘れただけで取り逃さないようにする。出たくなければ「出ない」を選べる）
  T.dcRunners = function (opts) {
    const W = HS.World, wIdx = W.wIdx(), out = {};
    const ok = h => h && h.owner === 'P' && h.loc === 'stable';
    for (const c of T.GF_CATS) { const x = inv(c.id); if (x && x.ans === 'yes' && ok(W.horse(x.pick))) out[c.id] = W.horse(x.pick); }
    if (opts && opts.explicitOnly) return out;
    for (const c of T.GF_CATS) {
      const x = inv(c.id);
      if (!x || x.ans) continue;
      const sf = c.surface === 'ダ' ? 'ダ' : '芝';
      const free = T.dcEligible(c.id).map(e => e.h).sort((a, b) => T.fh(b, wIdx, sf) - T.fh(a, wIdx, sf));
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
    // 海外の競馬場で行うが、番組の上は特別枠（遠征費・国の鍵は無い。region は前からの JRA のまま）
    const race = {
      name: T.gfName(C.id), short: T.gfName(C.id), gf: C.id, grade: 'GF', region: 'JRA', course: C.course, surface: C.surface, dist: C.dist, month: 12, week: T.GF_WEEK, age: '3+', weight: '定量',
      key: `${year}-12-${T.GF_WEEK}-GF-${C.id}`, graded: true, invite: true, year, prize: arima ? arima.prize : 20000,
      ground: R.ground(G.seed, year, 12, T.GF_WEEK, C.course),
    };
    return race;
  };
  // GF の週のレース（W.weekRaces から呼ぶ）。招待の決まった GF だけ
  T.addSpecial = function (list, year, month, week) {
    const G = HS.World.get();
    if (G.mode !== 'jockey' || month !== 12 || week !== T.GF_WEEK || !G.dc || G.dc.y !== year || !G.dc.gf) return;
    for (const c of T.GF_CATS) if (G.dc.gf[c.id]) list.push(T.dcRace(year, c.id));
  };
  // 出走表：自分の1頭（出るなら）と、ほかの馬の上位で16頭
  T.dcField = function (race) {
    const W = HS.World, G = W.get();
    if (!G.dc || G.dc.y !== race.year || !G.dc.gf) return [];
    const cat = race.gf || 'classic', x = G.dc.gf[cat];
    if (!x) return [];
    const me = T.dcRunners()[cat];
    const out = me ? [{ horse: me, jockeyName: W.bestFreeJockey(race.key, me.id), mine: true }] : [];
    let nf = out.filter(e => e.horse.foreignTrained).length;
    for (const id of x.ai) {
      if (out.length >= T.DC_FIELD) break;
      const h = W.horse(id);
      if (!h || h.owner === 'P' || h.loc !== 'stable') continue;
      if (h.foreignTrained && nf >= T.DC_FOREIGN) continue; // 抜けた馬の代わりを補欠から埋めるときも、外国の馬の枠を守る
      if (h.foreignTrained) nf++;
      out.push({ horse: h });
    }
    return out;
  };
  // いまの出走の顔ぶれ（画面用）
  T.dcLineup = function (cat) {
    const G = HS.World.get(), C = T.GF_BY[cat || 'classic'];
    if (!G.dc || G.dc.y !== G.year) return [];
    return T.dcField({ year: G.year, gf: C.id, key: `${G.year}-12-${T.GF_WEEK}-GF-${C.id}` }).map(x => x.horse);
  };

  // ---------- 自分の馬が GF を勝ったとき（W.applyResults から）：担当の伝説級が店に並び、初めての区分なら1頭を牧場に ----------
  T.onGFWin = function (h, race) {
    const W = HS.World, G = W.get();
    if (!G.eraless || h.owner !== 'P' || !race.gf) return;
    const legends = T.gfLegends(race.gf);
    if (!legends.length) return;
    G.unlocked = G.unlocked || [];
    const fresh = legends.filter(d => !G.unlocked.includes(d.name));
    for (const d of fresh) G.unlocked.push(d.name);
    if (fresh.length) W.news(`${T.gfName(race.gf)}を勝った。伝説の名馬 ${fresh.map(d => d.name).join('・')}が馬の店に並ぶようになった。`, 'g1');
    G.gfGift = G.gfGift || {};
    if (G.gfGift[race.gf]) return;
    const d = legends[0];
    const E = HS.Eraless, H = HS.Horse;
    const g = H.fromHistoric(E.shift(d, (G.year - T.GF_GIFT_AGE) - d.born), 'gift:' + d.name);
    g.id = W.newId(); g.owner = 'P'; g.loc = 'retired'; g.retiredY = G.year; g.auto = false; g.parentBonus = 0; g.legendBought = true; g.gfGift = race.gf;
    if (HS.DATA.isForeign(d)) { g.imported = true; g.country = d.country || '外'; }
    G.lineup[g.name] = g.born - d.born;
    G.horses[g.id] = g;
    G.gfGift[race.gf] = d.name;
    W.dirty();
    W.news(`初めての${T.gfName(race.gf)}の勝利の記念に、${d.name}を牧場に迎えた。オリジナルホースの${d.sex === '牝' ? '母' : '父'}にできる。`, 'g1');
  };
  T.GF_GIFT_AGE = 6; // 牧場にもらう伝説級の年（引退した馬と同じ扱い）

  // 前の形のセーブを今の形に（World.migrate から）。12月2〜4週に GF を走っていた版（v が無い）：
  //  前の年までの招待は要らない。その年の招待で、まだ GF を1つも走っていない（12月2週まで）なら、12月4週のあとに招待し直す。
  //  もう走った GF があるなら、その年は GF の週を開かない（同じ年に2回走らない）
  T.dcUpgrade = function (g) {
    if (!g.dc || g.dc.v === 2) return;
    if (g.dc.y !== g.year) { g.dc = null; return; }
    g.dc = g.month === 12 && g.week >= 3 ? { y: g.dc.y, v: 2, gf: {} } : null;
  };
})();
