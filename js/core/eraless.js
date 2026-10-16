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
  // 値段は強さ（評価）で大きく開く：評価が4上がるごとに2倍（持ち主の指摘 2026-10-16「強い馬以外買う価値なくなるから値段差を」）。
  // 評価80で約2,900万円・90で約1.6億円・96で約4.6億円・100で約9.2億円。安い馬は300万円から。スペシャルホースはその1.6倍
  // （持ち主の指摘「もっと高くていい。賞金のほかトロフィーのボーナス賞金が入るので」）
  E.PRICE_BASE = 2000; E.PRICE_DOUBLE = 4;
  E.priceOf = (d, legend) => Math.round(Math.max(300, E.PRICE_BASE * Math.pow(2, ((d.rating || 80) - 80) / E.PRICE_DOUBLE)) * U.priceIndex() * 1.3 * (legend ? 1.6 : 1) / 10) * 10;
  const priceOf = E.priceOf;

  // ---------- 馬の店の解放（持ち主の指摘 2026-10-16「ショップに並ぶ馬は徐々に解放。G1勝ったらG1馬、地方レース勝ったら地方馬、ドイツのレース勝ったらドイツ馬」）----------
  // 馬ごとに要る鍵は1つ。日本の馬は史実の勝ち鞍のいちばん上の格（G3以下は初めから、G2馬は G2 以上を、G1馬は G1 を勝つと並ぶ）。
  // 地方の勝ちが中央より多い馬は地方馬（地方のレースを勝つと並ぶ）。外国の馬は調教された国（その国のレースを勝つと並ぶ）。
  // レースの無い国の馬は、近い国（ニュージーランド→豪、イタリア→仏）か、海外のどこかのレースを勝つと並ぶ
  E.COUNTRY_NEAR = { '新': '豪', '伊': '仏' };
  E.COUNTRY_NAME = { '英': 'イギリス', '仏': 'フランス', '米': 'アメリカ', '愛': 'アイルランド', '独': 'ドイツ', '豪': 'オーストラリア', '香港': '香港', 'UAE': 'UAE', 'サウジ': 'サウジアラビア', '加': 'カナダ', '星': 'シンガポール', '海外': 'そのほかの国' };
  const GRADE_RANK = { G1: 3, G2: 2, G3: 1 };
  let raceCountries = null;
  const countryOfRace = r => (HS.DATA.courses[r.course] || {}).country || r.country || '海外';
  const lockCache = new Map();
  E.lockOf = function (d) {
    if (lockCache.has(d.name)) return lockCache.get(d.name);
    let key = '';
    if (HS.DATA.isForeign(d)) {
      if (!raceCountries) { raceCountries = new Set(); for (const r of HS.DATA.races || []) if (r.region === '海外') raceCountries.add(countryOfRace(r)); }
      const c = E.COUNTRY_NEAR[d.country] || d.country;
      key = 'c:' + (raceCountries.has(c) ? c : '海外');
    } else {
      const ws = H.winRaces(d);
      const loc = ws.filter(r => r.region === '地方').length, jra = ws.filter(r => r.region === 'JRA').length;
      if (loc > 0 && loc >= jra) key = 'local';
      else { const b = ws.reduce((m, r) => Math.max(m, GRADE_RANK[r.grade] || 0), 0); key = b >= 3 ? 'g1' : b === 2 ? 'g2' : ''; }
    }
    lockCache.set(d.name, key);
    return key;
  };
  // 鍵の名前と開け方
  E.lockLabel = k => k === 'g1' ? 'G1馬' : k === 'g2' ? 'G2馬' : k === 'local' ? '地方馬' : k.startsWith('c:') ? `${E.COUNTRY_NAME[k.slice(2)] || k.slice(2)}の馬` : '';
  E.lockHint = k => k === 'g1' ? 'G1を勝つ' : k === 'g2' ? 'G2かG1を勝つ' : k === 'local' ? '地方のレースを勝つ' : k === 'c:海外' ? '海外のレースを勝つ' : k.startsWith('c:') ? `${E.COUNTRY_NAME[k.slice(2)] || k.slice(2)}のレースを勝つ` : '';
  // 勝ったレースで開く鍵
  E.keysOfWin = function (race) {
    const out = [], g = GRADE_RANK[race.grade] || 0;
    if (g >= 2) out.push('g2');
    if (g >= 3) out.push('g1');
    if (race.region === '地方') out.push('local');
    if (race.region === '海外') { out.push('c:' + countryOfRace(race)); out.push('c:海外'); }
    return out;
  };
  E.isOpen = d => { const k = E.lockOf(d); return !k || (W.get().shopKeys || []).includes(k); };
  // 自分の馬が勝ったとき（world.js から）。新しく開いた鍵を返す
  E.unlockWin = function (race) {
    const G = W.get();
    if (!G.eraless) return [];
    G.shopKeys = G.shopKeys || [];
    const fresh = E.keysOfWin(race).filter(k => !G.shopKeys.includes(k));
    if (!fresh.length) return [];
    G.shopKeys.push(...fresh);
    const shown = fresh.filter(k => k !== 'c:海外' || !fresh.some(x => x.startsWith('c:') && x !== 'c:海外'));
    const n = E.pool().filter(d => fresh.includes(E.lockOf(d))).length;
    if (n) W.news(`馬の店に${shown.map(E.lockLabel).join('・')}が並ぶようになった！（${n}頭）`, 'g1');
    return fresh;
  };
  // 店の上に出す表：まだ開いていない鍵と開け方・頭数（開いたものも）
  E.locks = function () {
    const G = W.get(), cnt = new Map();
    for (const d of E.pool()) { const k = E.lockOf(d); if (k) cnt.set(k, (cnt.get(k) || 0) + 1); }
    const order = k => k === 'g2' ? 0 : k === 'g1' ? 1 : k === 'local' ? 2 : k === 'c:海外' ? 99 : 3;
    return [...cnt.entries()].map(([k, n]) => ({ key: k, label: E.lockLabel(k), hint: E.lockHint(k), n, open: (G.shopKeys || []).includes(k) }))
      .sort((a, b) => order(a.key) - order(b.key) || b.n - a.n);
  };
  // 前のセーブ：自分の馬の勝ち鞍から開けておく
  E.migrateKeys = function (g) {
    const keys = new Set();
    for (const h of Object.values(g.horses || {})) {
      if (h.owner !== 'P') continue;
      for (const w of h.gradedWins || []) for (const k of E.keysOfWin({ grade: w.grade, region: w.region, course: '' })) if (k !== 'c:海外') keys.add(k);
      for (const r of h.results || []) if (r.pos === 1) { const c = (HS.DATA.courses[r.course] || {}); if (c.region === '地方') keys.add('local'); if (c.region === '海外') { keys.add('c:' + (c.country || '海外')); keys.add('c:海外'); } }
    }
    return [...keys];
  };
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
    for (const d of E.pool()) if (E.isOpen(d)) add(d, false);
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
