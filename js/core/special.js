// スペシャルホース（騎手のゲーム・年代なし。持ち主の決定 2026-10-16）
// 1989年より前に走った名馬は、世界の暦には出ない。馬ごとに、その戦績に合わせた条件（勝つレースの組み合わせ・無敗の連勝）を持つ。
// 自分の馬がその条件にリーチをかける（あと1勝で達成）と、最後のレースにその名馬が特別に出てくる。勝てば、その名馬が馬の店に並ぶ。
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse, W = HS.World;
  const SP = HS.Special = {};
  SP.MAX_IN_RACE = 4;   // 1レースに出てくる数の上限
  SP.MAX_RACES = 7;     // 条件のレースの数の上限（戦績の大きいレースから）
  SP.MAX_STREAK = 12;   // 無敗の連勝の条件の上限
  // 史実馬のデータに戦績の数が無い、無敗の名馬
  SP.UNBEATEN = { 'マルゼンスキー': 8 };

  // データの勝ち鞍の名前 → いまの番組の G1（短い名）。名前が変わったレースは読み替える
  const ALIAS = { '朝日杯3歳ステークス': '朝日杯フューチュリティステークス', '阪神3歳牝馬ステークス': '阪神ジュベナイルフィリーズ', '中山グランプリ': '有馬記念', '産経大阪杯': '大阪杯' };
  let g1 = null;
  const g1Map = () => {
    if (g1) return g1;
    g1 = new Map();
    const ey = HS.Eraless ? HS.Eraless.ERA : 2025;
    for (const r of HS.DATA.races || []) if (r.grade === 'G1' && r.from <= ey && ey <= (r.to || 9999)) g1.set(r.name, { short: r.short || r.name, prize: r.prize || 0, at: r.month * 10 + r.week });
    return g1;
  };
  SP.mapWin = function (s) {
    const y = parseInt(s.slice(0, 4), 10);
    let name = s.slice(4);
    if (name === 'エリザベス女王杯' && y < 1996) name = '秋華賞'; // 1995年までは3歳牝馬のレース
    name = ALIAS[name] || name;
    return g1Map().get(name) || null;
  };
  // 戦績から条件を作る：いまの番組の G1 に当たる勝ち鞍（同じレースを何度も勝っていれば、その回数）と、無敗の連勝
  SP.condOf = function (d) {
    const cnt = new Map();
    for (const s of d.wins || []) { const m = SP.mapWin(s); if (m) { const c = cnt.get(m.short) || { n: 0, prize: m.prize, at: m.at }; c.n++; cnt.set(m.short, c); } }
    let races = [...cnt.entries()].sort((a, b) => b[1].prize - a[1].prize);
    let total = 0; const keep = [];
    for (const [k, v] of races) { const n = Math.min(v.n, SP.MAX_RACES - total); if (n <= 0) break; keep.push([k, n, v.at]); total += n; }
    keep.sort((a, b) => a[2] - b[2]); // 見せるときは暦の順
    const req = {}; for (const [k, n] of keep) req[k] = n;
    const unb = d.unbeaten || (SP.UNBEATEN[d.name] || 0);
    const streak = unb ? Math.min(unb, SP.MAX_STREAK) : 0;
    if (total + (streak ? 2 : 0) < 2) return null; // 大きいレースを1つ勝っただけの馬はスペシャルホースにしない
    return { req, total, streak };
  };
  SP.condText = c => {
    const rs = Object.entries(c.req).map(([k, n]) => n > 1 ? `${k}×${n}` : k);
    const a = rs.length ? `${rs.join('・')}を勝つ` : '';
    const b = c.streak ? `デビューから無敗で${c.streak}連勝${rs.length ? 'し、' : ''}` : '';
    return b + a || '';
  };

  // スペシャルホースの一覧（1989年より前に走った史実馬と、data/legends.js）
  let list = null;
  SP.list = function () {
    if (list) return list;
    const src = (HS.DATA.historic || []).filter(d => HS.Eraless.isLegend(d)).concat(HS.DATA.legendsExtra || []);
    list = [];
    for (const d of src) { const c = SP.condOf(d); if (c) list.push({ name: d.name, d, cond: c, text: SP.condText(c) }); }
    list.sort((a, b) => (b.d.rating || 0) - (a.d.rating || 0) || b.cond.total - a.cond.total);
    return list;
  };
  SP.byName = name => SP.list().find(x => x.name === name) || null;
  SP.data = name => { const x = SP.byName(name); return x ? x.d : null; };

  // 自分の馬 h が、このレース race でスペシャルホース sp の条件にリーチをかけているか
  const winsOf = h => { const m = {}; for (const g of h.gradedWins || []) { const k = g.short || g.race; m[k] = (m[k] || 0) + 1; } return m; };
  SP.reach = function (h, sp, race, wm) {
    const c = sp.cond;
    wm = wm || winsOf(h);
    let miss = 0, last = null;
    for (const [k, n] of Object.entries(c.req)) { const m = Math.max(0, n - (wm[k] || 0)); miss += m; if (m) last = k; }
    const unbeaten = (h.starts || 0) === (h.wins || 0);
    if (c.streak && !unbeaten) return false;
    const missW = c.streak ? Math.max(0, c.streak - (h.wins || 0)) : 0;
    if (miss > 1 || missW > 1 || miss + missW === 0) return false;
    if (miss === 1) return race.short === last;
    return true; // あと1勝で無敗の連勝がそろう：次に出るレースに出てくる
  };
  // 自分の馬のリーチ（あと1勝で条件がそろうもの）：{ name, need（勝てばよいレース。無敗の連勝だけなら「次のレース」） }
  SP.reachInfo = function (h) {
    const G = W.get();
    if (h.owner !== 'P') return [];
    const wm = winsOf(h), out = [];
    for (const sp of SP.list()) {
      if ((G.unlocked || []).includes(sp.name)) continue;
      const any = { short: null };
      let need = null;
      for (const [k, n] of Object.entries(sp.cond.req)) if ((wm[k] || 0) < n) { need = k; break; }
      if (need ? SP.reach(h, sp, { short: need }, wm) : SP.reach(h, sp, any, wm)) out.push({ name: sp.name, need: need || '次のレース' });
    }
    return out;
  };
  // このレースに出てくるスペシャルホース（自分の馬がリーチをかけているもの。まだ店に並んでいない馬）
  SP.pending = function (h, race) {
    const G = W.get();
    if (h.owner !== 'P') return [];
    const wm = winsOf(h);
    return SP.list().filter(sp => !(G.unlocked || []).includes(sp.name) && SP.reach(h, sp, race, wm));
  };
  // その場限りの馬にする（いちばん良いときの力で）
  SP.horse = function (d, race) {
    const age = race.age === '2' ? 2 : race.age === '3' ? 3 : 4;
    const h = H.fromHistoric(HS.Eraless.shift(d, (race.year - age) - d.born), `special:${d.name}`);
    h.legend = true; h.owner = 'AI'; h.loc = 'legend'; h.starts = 8; h.wins = 8; h.earn = 50000;
    if (HS.DATA.isForeign(d)) { h.foreignTrained = true; h.country = d.country || '外'; }
    return h;
  };
  // prepareWeek から：自分の馬がリーチをかけて出るレースに、スペシャルホースを足す
  SP.forRace = function (race, entries) {
    const names = new Set(), out = [];
    for (const e of entries) {
      if (!e.mine || !e.horse) continue;
      for (const sp of SP.pending(e.horse, race)) {
        if (names.has(sp.name) || out.length >= SP.MAX_IN_RACE) continue;
        if (race.sex === '牝' && sp.d.sex !== '牝') continue; // 牝馬限定のレースには牝馬だけ
        names.add(sp.name); out.push({ horse: SP.horse(sp.d, race), legend: true });
      }
    }
    return out;
  };
  // レースのあと（applyResults から）：自分の馬が勝てば、出てきたスペシャルホースが馬の店に並ぶ
  SP.afterRace = function (race, sim) {
    const G = W.get();
    const sps = sim.results.filter(r => r.horse.legend).map(r => r.horse.name);
    if (!sps.length) return [];
    const win = sim.results[0];
    if (!win || win.horse.owner !== 'P') { W.news(`スペシャルホース ${sps.join('・')}に敗れた……。`, 'warn'); return []; }
    G.unlocked = G.unlocked || [];
    const got = sps.filter(n => !G.unlocked.includes(n));
    G.unlocked.push(...got);
    if (got.length) W.news(`${win.horse.name}がスペシャルホース ${got.join('・')}を破った！ ${got.join('・')}が馬の店に並ぶようになった。`, 'g1');
    return got;
  };
})();
