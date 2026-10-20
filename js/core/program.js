// 番組表：1頭の馬について、今週から1年先までの週ごとのレース（重賞とオープン。レースは OP 以上だけ）と、出られるか・適性・出走登録と予約の状態をまとめる
// 画面（js/ui/program.js）はこの行を読んで描くだけ。今週は出走登録、来週から先は出走の予約（js/core/season.js の T.reserve）
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const R = HS.Races;
  const P = HS.Program = {};
  const W = () => HS.World, T = () => HS.Season;

  // 適性の段（3＝◎ 2＝○ 1＝△ 0＝×）
  P.MARK = ['×', '△', '○', '◎'];
  P.fitDist = (h, d) => { const gap = d < h.distMin ? h.distMin - d : d > h.distMax ? d - h.distMax : 0; return gap === 0 ? 3 : gap <= 200 ? 2 : gap <= 400 ? 1 : 0; };
  P.fitSurf = (h, s) => { const v = (s === 'ダ' ? h.apt.dirt : h.apt.turf) || 0; return v >= 90 ? 3 : v >= 75 ? 2 : v >= 60 ? 1 : 0; };

  // 今週から n 週の暦（i＝何週後）
  P.weeks = function (n) {
    const G = W().get(), out = [];
    let y = G.year, m = G.month, w = G.week;
    for (let i = 0; i < n; i++) {
      out.push({ y, m, w, i });
      w++; if (w > 4) { w = 1; m++; if (m > 12) { m = 1; y++; } }
    }
    return out;
  };
  // その週のレース。今週は世界の一覧（グランドフェスティバルなども入る）、先の週は重賞とオープン（種と日付で決まるので、その週になっても同じもの）
  P.racesOf = function (wk) {
    if (wk.i === 0) return W().weekRaces();
    return R.ofWeek(W().get().seed, wk.y, wk.m, wk.w);
  };
  // 出られない理由（出られるなら null）。今週は入厩まで、先の週は年齢・性と、いまの獲得賞金（G1）・移動（連闘で別の国へは行けない）で見る
  P.why = function (h, race, wk) {
    const G = W().get();
    if (wk.i === 0) {
      if (race.invite) return '招待馬だけ';
      if (h.loc !== 'stable') return h.loc === 'farm' ? '入厩前' : '出られない';
      return R.ineligible(h, race, G.year) || W().rideTaken(race.key, h.id);
    }
    const st = T().staticIneligible(h, race, race.year);
    if (st) return st;
    return R.ineligible(h, race, race.year) || P.mineReserved(h, race);
  };
  // 1つのレースに自分の馬は1頭まで（持ち主の決定 2026-10-20）：ほかのお手馬がそのレースを予約していれば、その理由
  P.mineReserved = (h, race) => W().oneRide() && T().reserves().some(x => x.key === race.key && x.id !== h.id) ? W().WHY_MINE : null;
  // 理由を見せて並べる「出られない」（移動が間に合わない・自分の騎乗とぶつかる）。ほかの理由のレースは表から外す
  P.shownWhy = why => why === HS.Fatigue.WHY || why === W().WHY_MINE || why === W().WHY_OFFER;

  // o：{ weeks（既定は予約できる52週）, show: 'ok'（出られるものだけ）|'all', kind: 'all'|'graded', surf: ''|'芝'|'ダ' }
  // 行：{ wk, race, why, dist, surf, fit（0〜6）, state: 'entered'|'reserved'|null, can: 'enter'|'reserve'|null, busy（その週はほかのレースを予約済み）, others（同じレースを予約したほかの自分の馬） }
  P.rows = function (h, o) {
    o = o || {};
    const G = W().get();
    const n = o.weeks || T().RESERVE_WEEKS;
    const ent = W().entryOf(h.id);
    const mineRsv = T().reserves(h.id), allRsv = T().reserves();
    const out = [];
    for (const wk of P.weeks(n)) {
      const busyKey = (mineRsv.find(x => x.y === wk.y && x.m === wk.m && x.w === wk.w) || {}).key || null;
      for (const race of P.racesOf(wk)) {
        const why = P.why(h, race, wk);
        const state = wk.i === 0 && ent && ent.raceKey === race.key ? 'entered' : mineRsv.some(x => x.key === race.key) ? 'reserved' : null;
        if (!state) {
          if (o.kind === 'graded' && !race.graded) continue;
          if (o.surf && race.surface !== o.surf) continue;
          if (why && !P.shownWhy(why) && (o.show !== 'all' || !race.graded)) continue; // オープンは「すべて」でも出られないものは出さない（年齢違いで埋まる）。移動が間に合わない・ほかのお手馬や受けた依頼とぶつかるものは理由を見せる
        }
        const dist = P.fitDist(h, race.dist), surf = P.fitSurf(h, race.surface);
        const can = why || state ? null : wk.i === 0 ? 'enter' : busyKey ? null : 'reserve';
        const others = allRsv.filter(x => x.key === race.key && x.id !== h.id).map(x => (W().horse(x.id) || {}).name).filter(Boolean);
        out.push({ wk, race, why, dist, surf, fit: dist + surf, state, can, busy: !state && !!busyKey && wk.i > 0, others });
      }
    }
    // 週の中は、予約・登録したもの → 重賞（格の高い順）→ 適性の合う順
    const gr = r => r.race.graded ? (R.GRADE_RANK[r.race.grade] || 0) + 1 : 0;
    return out.sort((a, b) => a.wk.i - b.wk.i || (b.state ? 1 : 0) - (a.state ? 1 : 0) || gr(b) - gr(a) || b.fit - a.fit || a.race.dist - b.race.dist);
  };
  // 予約するレースを、鍵（年-月-週-…）から探す
  P.find = function (key) {
    const m = /^(\d+)-(\d+)-(\d+)-/.exec(key || '');
    if (!m) return null;
    const wk = P.weeks(T().RESERVE_WEEKS + 1).find(x => x.y === +m[1] && x.m === +m[2] && x.w === +m[3]);
    return wk ? (P.racesOf(wk).find(r => r.key === key) || null) : null;
  };
  P.reserve = function (id, key) {
    const race = P.find(key);
    if (!race) return 'レースが見つからない';
    return T().reserve(id, race);
  };
  // いちばん近い予定（今週の登録か、いちばん近い予約）
  P.next = function (h) {
    const ent = W().entryOf(h.id);
    if (ent) { const r = W().raceByKey(ent.raceKey); if (r) return { race: r, label: '今週', entered: true }; }
    const x = T().reserves(h.id)[0];
    return x ? { label: `${x.m}月${x.w}週`, name: x.label, key: x.key, reserved: true } : null;
  };
})();
