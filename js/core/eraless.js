// 年代なしのゲーム（騎手のゲーム。持ち主の決定 2026-10-16）
// - 番組・物価・走りの速さは U.ERA の年で固定する。年は「n年目」で見せる
// - 1989〜2026年に走った史実馬（＝馬の店に並ぶ馬）から、毎年ランダムにデビューさせる。生年をずらして世界に出す（G.lineup にずらした年数）
// - デビューした馬は、引退するまで馬の店に並ばない。1989年より前に走り終えた馬（スペシャルホース）は js/core/special.js が扱う
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse, W = HS.World;
  const E = HS.Eraless = {};

  E.ERA = 2025;    // 番組・物価・騎手の基準の年
  E.START = 2025;  // 内部の暦の始まり（見せるのは「1年目」）
  E.CROP = 110;    // 毎年デビューする史実馬の数
  E.AGES = [2, 3, 4, 5, 6]; // 始めたときにいる世代

  const lastYear = d => d.retire || d.born + 5;
  E.isPool = d => lastYear(d) >= 1989 && d.born <= 2023;
  E.isLegend = d => lastYear(d) < 1989;
  let poolCache = null;
  E.pool = () => poolCache || (poolCache = (HS.DATA.historic || []).filter(E.isPool));

  // いま世界で走っている（入厩・牧場の）馬の名前
  E.activeNames = function () {
    const set = new Set();
    for (const h of W.all()) if (h.loc === 'stable' || h.loc === 'farm') set.add(h.name);
    return set;
  };

  // 生年を off 年ずらしたデータ（勝ち鞍・出たレース・引退の年も同じだけずらす）
  E.shift = function (d, off) {
    const mv = s => String(parseInt(s.slice(0, 4), 10) + off) + s.slice(4);
    return Object.assign({}, d, { born: d.born + off, retire: d.retire != null ? d.retire + off : d.retire, wins: (d.wins || []).map(mv), ran: (d.ran || []).map(mv) });
  };
  // 史実馬を、いま age 歳として世界に出す
  E.spawn = function (d, age, atStart) {
    const G = W.get();
    const off = (G.year - age) - d.born;
    G.bornHist = (G.bornHist || []).filter(n => n !== d.name); // 引退した馬は、また出られる
    const h = W.spawnHistoric(E.shift(d, off), atStart);
    if (h) G.lineup[d.name] = off;
    return h;
  };
  // ランダムに n 頭（走っていない馬から）
  E.pick = function (n, rng) {
    const act = E.activeNames();
    const free = E.pool().filter(d => !act.has(d.name));
    const out = [];
    for (let i = 0; i < n && free.length; i++) out.push(free.splice(rng.int(0, free.length - 1), 1)[0]);
    return out;
  };
  // 始めたとき：2〜6歳の世代をそろえる（それまでの実績も、本当の勝ち鞍をずらして持たせる）
  E.populate = function () {
    const G = W.get();
    const rng = new U.RNG(G.seed + 7);
    for (const age of E.AGES) for (const d of E.pick(E.CROP, rng)) E.spawn(d, age, true);
  };
  // 毎年の初め：今年デビューする2歳
  E.crop = function () {
    const G = W.get();
    const rng = new U.RNG(G.seed * 31 + G.year);
    const list = E.pick(E.CROP, rng);
    for (const d of list) { const h = E.spawn(d, 2, false); if (h) h.loc = 'farm'; }
    W.news(`今年は${list.length}頭の史実馬がデビューに向けて動き出した。`, 'info');
  };

  // ---------- 馬の店：走っていない馬（と、倒したスペシャルホース）を、デビュー前の2歳として売る ----------
  const priceOf = (d, legend) => Math.round((1000 + Math.max(0, (d.rating || 80) - 78) * 110) * U.priceIndex() * 1.3 * (legend ? 1.6 : 1) / 10) * 10;
  let mk = null;
  E.market = function () {
    const G = W.get();
    const act = E.activeNames();
    if (!mk || mk.year !== G.year) mk = { year: G.year, horses: new Map() };
    const items = [];
    const add = (d, legend) => {
      if (act.has(d.name)) return;
      let h = mk.horses.get(d.name);
      if (!h) {
        h = H.fromHistoric(E.shift(d, (G.year - 2) - d.born), 'pool:' + d.name);
        if (HS.DATA.isForeign(d)) h.country = d.country || '外';
        h.owner = 'AI'; h.loc = 'shop'; if (legend) h.legendBought = true;
        mk.horses.set(d.name, h);
      }
      items.push({ kind: 'pool', horse: h, data: d, price: priceOf(d, legend), legend: !!legend });
    };
    for (const d of E.pool()) add(d, false);
    for (const name of G.unlocked || []) { const d = HS.Special && HS.Special.data(name); if (d) add(d, true); }
    return items;
  };
  // 店の馬（id が pool:馬名）を引く。馬の画面を開くため
  E.shopHorse = id => mk && typeof id === 'string' && id.startsWith('pool:') ? mk.horses.get(id.slice(5)) || null : null;
  // 買う（W.buy から）。店で見せていた馬をそのまま自分の馬にする
  E.buy = function (item) {
    const G = W.get();
    const h = item.horse, d = item.data;
    if (E.activeNames().has(h.name)) return '売り切れ';
    h.id = W.newId();
    h.owner = 'P'; h.loc = 'farm'; if (HS.DATA.isForeign(d)) h.imported = true;
    G.lineup[h.name] = h.born - d.born;
    G.bornHist = (G.bornHist || []).filter(n => n !== h.name).concat([h.name]);
    G.horses[h.id] = h;
    G.player.money -= item.price;
    if (mk) mk.horses.delete(h.name);
    W.dirty();
    W.news(`「${h.name}」を${U.money(item.price)}で買った！`, 'g1');
    return null;
  };
})();
