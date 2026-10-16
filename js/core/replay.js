// リプレイ：レースの描画用のコマ（sim.frames）と実況を縮めて残し、あとで 3D の中継（js/ui/watch3d.js）で見直す
// 模擬はこれからも変わるので、種と入力からやり直すのではなく、コマそのものを残す（模擬の形が変わっても壊れない）
// 縮め方：コマを 0.4 秒ごとに間引き、位置は 0.1m・内外は 0.01 に丸め、前のコマからの予測との差だけを 1〜2 字で書く。速さは位置から出し直す
// 保存先は、セーブとは別の localStorage の鍵（一覧＝IDX_KEY、中身＝DATA_KEY + id）。読めない端末でも動くように try/catch
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U;
  const RP = HS.Replay = {};
  RP.V = 1;
  RP.MAX = 20;       // お気に入りでないものは20本まで（古いものから消す）
  RP.MAX_FAV = 20;   // お気に入りは消さない。20本まで
  RP.THIN = 2;       // コマの間引き（もとは 0.2 秒ごと → 0.4 秒ごと）
  RP.IDX_KEY = 'hs-replays';
  RP.DATA_KEY = 'hs-replay:';

  // ---------- 数の列を字にする（前の値からの予測との差を、ジグザグにして 5 ビットずつ 64 字で） ----------
  const AL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const AI = {}; for (let i = 0; i < AL.length; i++) AI[AL[i]] = i;
  const pred = (q, k, order) => k === 0 ? 0 : order === 1 || k === 1 ? q[k - 1] : 2 * q[k - 1] - q[k - 2];
  RP.pack = function (q, order) {
    const out = [];
    for (let k = 0; k < q.length; k++) {
      const d = q[k] - pred(q, k, order);
      let z = d >= 0 ? d * 2 : -d * 2 - 1;
      do { let c = z % 32; z = Math.floor(z / 32); if (z) c += 32; out.push(AL[c]); } while (z);
    }
    return out.join('');
  };
  RP.unpack = function (s, order) {
    const q = [];
    let z = 0, mul = 1;
    for (let i = 0; i < s.length; i++) {
      const c = AI[s[i]];
      z += (c % 32) * mul;
      if (c >= 32) { mul *= 32; continue; }
      const d = z % 2 ? -(z + 1) / 2 : z / 2;
      q.push(d + pred(q, q.length, order));
      z = 0; mul = 1;
    }
    return q;
  };

  // ---------- 縮める・戻す ----------
  // r：{ race, sim, runners, rec }（週の report のレース、または騎乗の結果）。o：{ yearLabel, free, title }
  RP.make = function (r, o) {
    o = o || {};
    const { race, sim, runners } = r;
    if (!sim || !sim.frames || sim.frames.length < 2 || !sim.results || !sim.results.length) return null;
    const fr = sim.frames.filter((f, k) => k % RP.THIN === 0 || k >= sim.frames.length - 2); // 終わりの2コマ（S.finish が足す止まったコマ）は残す
    const n = runners.length;
    const ts = RP.pack(fr.map(f => Math.round(f.t * 100)), 2);
    const xs = [], ls = [];
    for (let j = 0; j < n; j++) {
      xs.push(RP.pack(fr.map(f => Math.round(f.p[j][0] * 10)), 2));
      ls.push(RP.pack(fr.map(f => Math.round(f.p[j][1] * 100)), 1));
    }
    const idx = new Map(runners.map((x, j) => [x.horse, j]));
    const me = runners.findIndex(x => x.rider === 'P');
    const mineI = me >= 0 ? me : runners.findIndex(x => x.mine);
    const myRes = mineI >= 0 ? sim.results.find(x => x.horse === runners[mineI].horse) : null;
    const yr = race.year || 0;
    const silksOf = h => (HS.RaceView && HS.RaceView.silksOf ? (() => { try { return HS.RaceView.silksOf(h); } catch (err) { return null; } })() : null);
    return {
      v: RP.V,
      race: { key: race.key || '', name: race.name, short: race.short || '', grade: race.grade || '', region: race.region || 'JRA', course: race.course, surface: race.surface, dist: race.dist, ground: race.ground || '良', month: race.month || 0, week: race.week || 0, year: yr, cls: race.cls || '' },
      title: o.title || (HS.Races ? HS.Races.label(race) : race.short || race.name),
      yearLabel: o.yearLabel || '', free: !!o.free,
      horse: mineI >= 0 ? runners[mineI].horse.name : '', pos: myRes ? myRes.pos : 0, rode: me >= 0, n,
      runners: runners.map(x => ({ num: x.num, frame: x.frame, name: x.horse.name, coat: x.horse.coat || '鹿毛', sex: x.horse.sex || '牡', age: yr && x.horse.born ? yr - x.horse.born : 0, hist: !!x.horse.hist, legend: !!x.horse.legend, sire: x.horse.sire || '', jockey: x.jockey ? x.jockey.name : '', weight: x.weight || 0, pop: x.pop || 0, odds: x.odds || 0, mine: !!x.mine, rider: x.rider || null, silks: silksOf(x.horse) })),
      results: sim.results.map(x => [idx.get(x.horse), x.pos, Math.round(x.time * 100) / 100, x.margin || '', x.last3f ? Math.round(x.last3f * 10) / 10 : null]),
      events: (sim.events || []).map(ev => [Math.round(ev.t * 10) / 10, ev.text, ev.kind || '']),
      D: sim.D || race.dist, straight: sim.straight || 0,
      f: { ts, xs, ls },
      rec: r.rec || null,
    };
  };
  // 戻す：Watch3D.play に渡せる { race, sim, runners, rec }
  RP.expand = function (rp) {
    const yr = rp.race.year || 0;
    const runners = rp.runners.map(x => ({
      num: x.num, frame: x.frame, weight: x.weight, pop: x.pop, odds: x.odds, mine: x.mine, rider: x.rider,
      jockey: { name: x.jockey },
      horse: { name: x.name, coat: x.coat, sex: x.sex, born: yr - x.age, hist: x.hist, legend: x.legend, sire: x.sire, _silks: x.silks || null, results: [] },
    }));
    const ts = RP.unpack(rp.f.ts, 2).map(v => v / 100);
    const xs = rp.f.xs.map(s => RP.unpack(s, 2).map(v => v / 10)), ls = rp.f.ls.map(s => RP.unpack(s, 1).map(v => v / 100));
    const frames = ts.map((t, k) => ({
      t, p: runners.map((x, j) => {
        const a = Math.max(0, k - 1), b = Math.min(ts.length - 1, k + 1);
        const v = b > a ? (xs[j][b] - xs[j][a]) / Math.max(1e-6, ts[b] - ts[a]) : 0;
        return [xs[j][k], ls[j][k], Math.round(v * 100) / 100];
      }),
    }));
    const results = rp.results.map(([j, pos, time, margin, last3f]) => {
      const x = runners[j];
      return { pos, num: x.num, frame: x.frame, horse: x.horse, jockey: x.jockey, weight: x.weight, time, margin, last3f, pop: x.pop, odds: x.odds, mine: !!(x.mine || x.rider === 'P'), rider: x.rider };
    });
    const events = rp.events.map(([t, text, kind]) => ({ t, text, kind }));
    const race = Object.assign({}, rp.race);
    return { race, runners, rec: rp.rec, replay: true, sim: { results, events, frames, D: rp.D, straight: rp.straight, winnerTime: results[0].time } };
  };
  // 結果の表（UI.resultTable）に渡す形
  RP.slim = function (rp) {
    const d = RP.expand(rp);
    return Object.assign({}, rp.race, { mine: !!rp.horse, rec: rp.rec, rows: d.sim.results.map(x => ({ pos: x.pos, num: x.num, frame: x.frame, name: x.horse.name, mine: x.mine, hist: x.horse.hist, sex: x.horse.sex, age: (rp.race.year || 0) - x.horse.born, jockey: x.jockey.name, weight: x.weight, time: Math.round(x.time * 10) / 10, margin: x.margin, last3f: x.last3f, pop: x.pop, odds: x.odds, sire: x.horse.sire })) });
  };

  // ---------- 保存（セーブとは別の鍵） ----------
  RP.store = null; // テストでは差し替える（getItem・setItem・removeItem を持つもの）
  const ST = () => RP.store || (typeof localStorage !== 'undefined' ? localStorage : null);
  RP.list = function () {
    try { const s = ST() && ST().getItem(RP.IDX_KEY); const a = s ? JSON.parse(s) : []; return Array.isArray(a) ? a : []; } catch (err) { return []; }
  };
  const writeIdx = idx => { ST().setItem(RP.IDX_KEY, JSON.stringify(idx)); };
  RP.get = function (id) {
    try { const s = ST() && ST().getItem(RP.DATA_KEY + id); return s ? JSON.parse(s) : null; } catch (err) { return null; }
  };
  let seq = 0;
  // 保存する。戻り値：{ id } か { err }
  RP.save = function (rp) {
    if (!rp) return { err: 'このレースは映像の記録がありません' };
    const st = ST(); if (!st) return { err: 'この端末には保存できません' };
    const id = Date.now().toString(36) + (seq++).toString(36);
    const data = JSON.stringify(rp);
    const meta = { id, at: Date.now(), fav: false, title: rp.title, grade: rp.race.grade, region: rp.race.region, year: rp.race.year, yearLabel: rp.yearLabel, course: rp.race.course, surface: rp.race.surface, dist: rp.race.dist, horse: rp.horse, pos: rp.pos, n: rp.n, rode: rp.rode, free: rp.free, size: data.length };
    let idx = RP.list();
    for (let tries = 0; tries < RP.MAX + 2; tries++) {
      try {
        st.setItem(RP.DATA_KEY + id, data);
        idx.unshift(meta);
        RP.trim(idx);
        writeIdx(idx);
        return { id };
      } catch (err) {
        // 入りきらない：お気に入りでない古いものを消してやり直す
        idx = idx.filter(m => m.id !== id);
        const old = idx.filter(m => !m.fav).pop();
        try { st.removeItem(RP.DATA_KEY + id); } catch (e2) { /* 何もしない */ }
        if (!old) return { err: '保存する場所が足りません' };
        RP.drop(idx, old.id);
        try { writeIdx(idx); } catch (e3) { /* 何もしない */ }
      }
    }
    return { err: '保存する場所が足りません' };
  };
  // 上限を超えたお気に入りでないものを、古いものから消す
  RP.trim = function (idx) {
    let n = idx.filter(m => !m.fav).length;
    for (let i = idx.length - 1; i >= 0 && n > RP.MAX; i--) if (!idx[i].fav) { RP.drop(idx, idx[i].id); n--; }
    return idx;
  };
  RP.drop = function (idx, id) {
    const k = idx.findIndex(m => m.id === id); if (k >= 0) idx.splice(k, 1);
    try { ST().removeItem(RP.DATA_KEY + id); } catch (err) { /* 何もしない */ }
  };
  RP.remove = function (id) { try { const idx = RP.list(); RP.drop(idx, id); writeIdx(idx); return true; } catch (err) { return false; } };
  // お気に入りの切り替え。戻り値：エラーの文か null
  RP.toggleFav = function (id) {
    try {
      const idx = RP.list(), m = idx.find(x => x.id === id); if (!m) return '見つかりません';
      if (!m.fav && idx.filter(x => x.fav).length >= RP.MAX_FAV) return `お気に入りは${RP.MAX_FAV}本までです`;
      m.fav = !m.fav;
      RP.trim(idx); writeIdx(idx); return null;
    } catch (err) { return '保存できませんでした'; }
  };

  // ---------- いま見られるレース（保存の候補） ----------
  // 週の結果（W.lastReport）と、フリーレースの結果を key で探す
  RP.recent = {};
  RP.remember = (key, r, o) => { RP.recent[key] = { r, o }; };
  RP.find = function (key) {
    if (RP.recent[key]) return RP.recent[key];
    const W = HS.World, rep = W && W.lastReport;
    const r = rep && rep.races.find(x => x.race.key === key && x.sim && x.sim.frames);
    return r ? { r, o: { yearLabel: W.yLabel ? W.yLabel(r.race.year) : '' } } : null;
  };
  RP.saved = {}; // key → id（同じレースを二度保存しない）
})();
