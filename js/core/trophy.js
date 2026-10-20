// トロフィー（騎手のゲーム・年代なし）。表は data/trophies.js（持ち主の仕様書 docs/SPEC.md の「トロフィー」・2026-10-19）。
// 手にした馬それぞれに付く（1頭が同じトロフィーを手にするのは1回）。手にするとお金（難しいほど高い）。
// 引退したときに、手にしたトロフィーの数と種類で能力が上がる（TR.points。js/core/original.js がオリジナルホースの親にするとき）。
// トロフィーのリーチ（あと1勝）で出てくる隠し馬は data/trophy_horses.js と js/core/special.js
// 記録の形（セーブ）：G.trophies[id] = { y, horse, hid, bonus, more: [{ y, horse, hid, bonus }] }（はじめの1頭と、2頭目から）
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const W = HS.World;
  const TR = HS.Trophy = {};
  const RULE = TR.RULE = HS.DATA.trophyRule;

  TR.CATS = [
    { id: 'classic', label: 'クラシック／三冠' }, { id: 'filly', label: '牝馬三冠' }, { id: 'gs', label: 'グランドスラム' },
    { id: 'title', label: '称号・連覇・単発偉業' }, { id: 'gf', label: 'GF' },
  ];
  TR.LIST = (HS.DATA.trophies || []).map(t => Object.assign({}, t, { races: t.races.slice(), focus: t.focus.slice() }));
  // GF（data/gf.js）ごとのトロフィー（持ち主の仕様書「レースごとにもらえるトロフィーは違うものにする」）。勝ったお手馬それぞれに付く
  const GFT = HS.DATA.trophyGF || { tier: 4, focus: {} };
  const gfList = (HS.DATA.gf || []).map(c => {
    const name = `${HS.Season.DC_NAME}（${c.label}）`;
    return { cat: 'gf', id: 'gf:' + c.id, label: c.trophy, kind: 'gf', races: [name], same: false, tier: GFT.tier, focus: (GFT.focus[c.id] || ['spd', 'sta']).slice(), note: `${name}を勝つ`, gf: c.id };
  });
  TR.LIST.push(...gfList);
  TR.BY = {}; TR.LIST.forEach(t => { TR.BY[t.id] = t; });

  // お金（RULE.MONEY_YEAR の物価で持つ額を、いまの物価に直す。ゲームの中は2025年で固定なので、表の額がそのまま出る）
  TR.money = t => Math.round((RULE.TIER_MONEY[t.tier] || 0) * HS.U.priceIndex() / HS.U.priceIndex(RULE.MONEY_YEAR || 1995) / 10) * 10;
  TR.bonusOf = TR.money; // 前の名前
  TR.noteOf = t => `${t.note}（ボーナス賞金 ${HS.U.money(TR.money(t))}）`;

  // ---------- 勝ち鞍で見る ----------
  const wins = h => (h.gradedWins || []).map(g => ({ y: g.y, r: g.short || g.race }));
  const won = (h, name, pred) => wins(h).some(w => w.r === name && (!pred || pred(w.y)));
  // その馬が手にしているか（前のセーブの、名前だけの記録も）
  TR.has = function (h, id) {
    const v = (W.get().trophies || {})[id];
    if (!v) return false;
    if (v.hid ? v.hid === h.id : v.horse === h.name) return true;
    return (v.more || []).some(m => m.hid === h.id);
  };
  // 手にした馬の一覧（はじめの1頭から）
  TR.holders = function (id) {
    const v = (W.get().trophies || {})[id];
    if (!v) return [];
    return [{ y: v.y, horse: v.horse, hid: v.hid, bonus: v.bonus || 0 }].concat((v.more || []).map(m => ({ y: m.y, horse: m.horse, hid: m.hid, bonus: m.bonus || 0 })));
  };
  // 手にした記録の指紋（週の結果の見せ場で、増えた分を出す）
  TR.sig = () => { const out = []; for (const t of TR.LIST) for (const x of TR.holders(t.id)) out.push(`${t.id}|${x.hid || x.horse}`); return out; };

  // 勝ったあとにそろったか（h の勝ち鞍に race の勝ちが入っているとき）
  TR.done = function (t, h, race) {
    if (!t.races.includes(race.short)) return false;
    if (t.kind === 'gf') return true;
    if (t.kind === 'set') return t.races.every(n => won(h, n, t.same ? (y => y === race.year) : null));
    if (t.kind === 'repeat') return won(h, race.short, y => y === race.year) && won(h, race.short, y => y === race.year - 1);
    return false;
  };
  // このレースを勝てばそろうか（リーチ。隠し馬が出てくる）
  TR.yearRec = function (h, y) {
    const rs = (h.results || []).filter(r => r.y === y && r.grade !== 'GF');
    return { starts: rs.length, wins: rs.filter(r => r.pos === 1).length, g1: (h.gradedWins || []).filter(g => g.y === y && g.grade === 'G1').length };
  };
  TR.reach = function (h, t, race) {
    if (!h || h.owner !== 'P' || TR.has(h, t.id)) return false;
    if (t.kind === 'set') {
      if (!t.races.includes(race.short)) return false;
      const pred = t.same ? (y => y === race.year) : null;
      return !won(h, race.short, pred) && t.races.every(n => n === race.short || won(h, n, pred));
    }
    if (t.kind === 'repeat') return t.races.includes(race.short) && won(h, race.short, y => y === race.year - 1) && !won(h, race.short, y => y === race.year);
    if (t.kind === 'wonder') return race.grade !== 'GF' && (h.winLen || 0) >= RULE.WONDER_LEN - RULE.WONDER_PER_RACE && (h.winLen || 0) < RULE.WONDER_LEN;
    if (t.kind === 'immortal') return race.grade === 'G1' && (h.g1Streak || 0) === RULE.IMMORTAL_STREAK - 1;
    return false;
  };

  // 手にする：記録・お金・知らせ
  TR.give = function (h, t, y) {
    const G = W.get();
    G.trophies = G.trophies || {};
    if (TR.has(h, t.id)) return false;
    const bonus = TR.money(t);
    const rec = { y, horse: h.name, hid: h.id, bonus };
    if (!G.trophies[t.id]) G.trophies[t.id] = rec;
    else (G.trophies[t.id].more = G.trophies[t.id].more || []).push(rec);
    G.player.money += bonus;
    W.news(`トロフィー「${t.label}」を手にした！（${h.name}）ボーナス賞金 ${HS.U.money(bonus)}`, 'g1');
    return true;
  };

  // 自分の馬が重賞を勝ったとき（season.js の onWin から。勝ち鞍はもう足してある）
  TR.onWin = function (h, race) {
    const G = W.get();
    if (!G.eraless) return [];
    G.trophies = G.trophies || {};
    const got = [];
    for (const t of TR.LIST) if (TR.done(t, h, race) && TR.give(h, t, race.year)) got.push(t);
    return got;
  };
  // レースのあと（world.js の finishWeek から）：着差の合計（ワンダーホース）・G1 の連勝（インモータルロード）。GF は数えない
  TR.afterRace = function (race, sim) {
    const G = W.get();
    if (!G.eraless || race.grade === 'GF') return [];
    const got = [];
    for (const res of sim.results) {
      const h = res.horse;
      if (!h || h.owner !== 'P' || h.legend) continue;
      if (res.pos === 1) {
        const sec = sim.results[1];
        const len = Math.min(RULE.WONDER_PER_RACE, sec ? sec.lengths : RULE.WONDER_PER_RACE);
        h.winLen = Math.round(((h.winLen || 0) + len) * 10) / 10;
        if (h.winLen >= RULE.WONDER_LEN && TR.give(h, TR.BY.wonder, race.year)) got.push(TR.BY.wonder);
      }
      if (race.grade === 'G1') {
        h.g1Streak = res.pos === 1 ? (h.g1Streak || 0) + 1 : 0;
        if (h.g1Streak >= RULE.IMMORTAL_STREAK && TR.give(h, TR.BY.immortal, race.year)) got.push(TR.BY.immortal);
      }
    }
    return got;
  };
  // 年末の表彰：前はここでホールオブフェイム（無敗の年に G1 6勝）を付けた。そのトロフィーは外した（持ち主の決定 2026-10-20）ので、年末には何もしない
  TR.yearEnd = function () { return []; };

  // ---------- 引退したときの能力の上がり（オリジナルホースの親） ----------
  // トロフィーごとに、focus の能力は TIER_PTS、ほかの能力はその半分。1つの能力の上がりは CAP まで
  TR.points = function (h) {
    const by = {};
    for (const k of HS.Horse.STATS) by[k] = 0;
    const ids = HS.Hall ? HS.Hall.trophiesOf(h).map(x => x.id) : TR.LIST.filter(t => TR.has(h, t.id)).map(t => t.id);
    for (const id of ids) {
      const t = TR.BY[id]; if (!t) continue;
      const p = RULE.TIER_PTS[t.tier] || 0;
      for (const k of HS.Horse.STATS) by[k] += t.focus.includes(k) ? p : p / 2;
    }
    let top = 0;
    for (const k of HS.Horse.STATS) { by[k] = Math.min(RULE.CAP, by[k]); top = Math.max(top, by[k]); }
    return { n: ids.length, by, top };
  };

  // 前のセーブ：外したトロフィー（RULE.REMOVED。仕様書に無い5つと豪州2歳三冠・持ち主の決定 2026-10-20）の記録を消す。
  // 殿堂の写し（G.hallOwn）からも外す。もらったお金はそのまま。殿堂入りの数（HS.Hall.trophiesOf）にも数えない
  TR.migrateRemoved = function (g) {
    const gone = RULE.REMOVED || [];
    for (const id of gone) if (g.trophies && id in g.trophies) delete g.trophies[id];
    for (const e of g.hallOwn || []) if (Array.isArray(e.trophies)) e.trophies = e.trophies.filter(t => !gone.includes(t.id));
  };
  // GF のトロフィーを、2頭目からの勝ち馬にも付ける（前の版の形。TR.give と同じ記録）
  TR.addHolder = function (rec, h, y) {
    if (rec.hid === h.id || (rec.more || []).some(m => m.hid === h.id)) return;
    (rec.more = rec.more || []).push({ y, horse: h.name, hid: h.id });
  };
  // 前のセーブ：自分の馬が勝った GF の区分のトロフィーを付ける（ボーナス賞金は無し。前の「中長距離」はクラシック）
  TR.migrateGF = function (g) {
    const T = HS.Season;
    if (!T || !T.gfWins) return;
    g.trophies = g.trophies || {};
    for (const h of Object.values(g.horses || {})) {
      if (h.owner !== 'P') continue;
      for (const w of T.gfWins(h)) {
        const id = 'gf:' + T.gfCatOfName(w.short || w.race);
        if (!TR.BY[id]) continue;
        if (g.trophies[id]) TR.addHolder(g.trophies[id], h, w.y);
        else g.trophies[id] = { y: w.y, horse: h.name, hid: h.id, bonus: 0 };
      }
    }
  };
})();
