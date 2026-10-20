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

  // ---------- 馬の店：走っていない馬（と、倒したスペシャルホース）を売る ----------
  // 店の馬の年齢は月で変える（持ち主の仕様書 2026-10-19「店」：6〜12月は2歳、1〜5月は3歳）。
  // 2歳の新馬戦が始まる6月から翌年の5月までは、同じ生まれ年の馬を売る（1〜5月はその世代が3歳になっている）
  E.shopAge = month => month >= 6 ? 2 : 3;
  E.shopBorn = () => { const G = W.get(); return G.year - E.shopAge(G.month); };
  // 店で見える評価値は、その馬のいまの総合力（持ち主の仕様書「店」。早熟は高く、晩成は低く見える）
  E.shopFh = (h, wIdx) => HS.Season.fhBoth(h, wIdx);
  // 値段は、いまの評価点（いまの総合力。芝・ダの良いほう）だけで決める（持ち主の決定 2026-10-20「値段を今の評価点にすれば良い気がする
  // 早熟なら2-3歳で能力高いので高くなるし晩成でも強い馬なら高くなる むしろ晩成型になるほど評価点が同じでもちょっと値段あげたほうがいいかも」）。
  //   値段 ＝ 2,000万円 × 2^((評価点 − 52) ÷ 6) × 物価 × 1.3 × 成長型の掛け（300万円から）。スペシャルホースはその1.6倍
  // 成長型の掛け（E.GROWTH_PRICE）：評価点が同じなら、晩成ほど少し高い（このあと伸びる分）。早熟 0.9・早め 0.95・普通 1・遅め 1.07・晩成 1.15
  // 前は「時期の補い」（普通の馬がこの年齢でまだ伸びていない分）を足していた。いまはいまの評価点だけ
  E.PRICE_BASE = 2000; E.PRICE_DOUBLE = 6; E.PRICE_FH = 52;
  E.GROWTH_PRICE = { '早熟': 0.9, '早め': 0.95, '普通': 1, '遅め': 1.07, '晩成': 1.15 };
  E.growthPrice = h => E.GROWTH_PRICE[h.growth] || 1;
  E.shopValue = function (h, wIdx) { const f = E.shopFh(h, wIdx); return Math.max(f.turf, f.dirt); };
  E.priceOf = function (h, legend, wIdx) {
    if (wIdx == null) wIdx = W.wIdx();
    const v = E.shopValue(h, wIdx);
    return Math.round(Math.max(300, E.PRICE_BASE * Math.pow(2, (v - E.PRICE_FH) / E.PRICE_DOUBLE)) * U.priceIndex() * 1.3 * E.growthPrice(h) * (legend ? 1.6 : 1) / 10) * 10;
  };
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
  // いちばん上の段「GF の馬」（持ち主の声 2026-10-16「GFを勝ったら開放される馬も欲しいです」）：
  // とびきり強い馬（完成の総合力が E.GF_FH 以上＝店の馬の上位3%ほど、か評価 E.GF_RATING 以上。約150頭）は、
  // 国や格の鍵の代わりに、その馬の得意な距離の GF を勝つと並ぶ（区分は HS.Season.gfCatOfData）
  E.GF_FH = 70; E.GF_RATING = 98;
  E.eliteCat = function (d) {
    const T = HS.Season;
    if (!T || !T.gfCatOfData) return null;
    const pk = T.fhPeak(H.fromHistoric(d, 'lock:' + d.name));
    if (Math.max(pk.turf, pk.dirt) < E.GF_FH && (d.rating || 0) < E.GF_RATING) return null;
    return T.gfCatOfData(d, pk);
  };
  E.lockOf = function (d) {
    if (lockCache.has(d.name)) return lockCache.get(d.name);
    let key = '';
    const gf = E.eliteCat(d);
    if (gf) key = 'gf:' + gf;
    else if (HS.DATA.isForeign(d)) {
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
  const gfLabel = k => (HS.Season.GF_BY[k.slice(3)] || {}).label || k.slice(3);
  E.lockLabel = k => k.startsWith('gf:') ? `GFの馬（${gfLabel(k)}）` : k === 'g1' ? 'G1馬' : k === 'g2' ? 'G2馬' : k === 'local' ? '地方馬' : k.startsWith('c:') ? `${E.COUNTRY_NAME[k.slice(2)] || k.slice(2)}の馬` : '';
  E.lockHint = k => k.startsWith('gf:') ? `${gfLabel(k)}のGFを勝つ` : k === 'g1' ? 'G1を勝つ' : k === 'g2' ? 'G2かG1を勝つ' : k === 'local' ? '地方のレースを勝つ' : k === 'c:海外' ? '海外のレースを勝つ' : k.startsWith('c:') ? `${E.COUNTRY_NAME[k.slice(2)] || k.slice(2)}のレースを勝つ` : '';
  // 勝ったレースで開く鍵
  E.keysOfWin = function (race) {
    const out = [], g = race.grade === 'GF' ? 3 : GRADE_RANK[race.grade] || 0; // GF は G1 と同じに数える
    if (race.grade === 'GF' && race.gf) out.push('gf:' + race.gf);
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
    if (n) W.news(`来月から、馬の店に${shown.map(E.lockLabel).join('・')}も並ぶようになる！（${n}頭）`, 'g1'); // 品ぞろえは来月の入れ替えから（持ち主の指摘 2026-10-16「来月からでいい」）
    return fresh;
  };
  // 店の上に出す表：まだ開いていない鍵と開け方・頭数（開いたものも）
  E.locks = function () {
    const G = W.get(), cnt = new Map();
    for (const d of E.pool()) { const k = E.lockOf(d); if (k) cnt.set(k, (cnt.get(k) || 0) + 1); }
    const gfo = k => HS.Season.GF_CATS.findIndex(c => 'gf:' + c.id === k);
    const order = k => k === 'g2' ? 0 : k === 'g1' ? 1 : k.startsWith('gf:') ? 1.1 + gfo(k) / 100 : k === 'local' ? 2 : k === 'c:海外' ? 99 : 3;
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
  // 前のセーブ：自分の馬が勝った GF の区分の鍵（World.migrate から。区分の無い前の GF は中長距離）
  E.gfKeys = function (g) {
    const keys = new Set();
    for (const h of Object.values(g.horses || {})) if (h.owner === 'P') for (const w of h.gradedWins || []) { const c = HS.Season.gfCatOfName(w.short || w.race); if (c) keys.add('gf:' + c); }
    return [...keys];
  };
  let mk = null;
  // 店で見せる馬（データ d から）。同じ生まれ年を売っている間は同じ馬を使う（馬の画面を開いても同じ値）。値段はその週のいまの値で
  const itemOf = function (d, legend) {
    const G = W.get();
    const born = E.shopBorn();
    if (!mk || mk.born !== born) mk = { born, horses: new Map() };
    let h = mk.horses.get(d.name);
    if (!h) {
      h = H.fromHistoric(E.shift(d, born - d.born), 'pool:' + d.name);
      if (HS.DATA.isForeign(d)) h.country = d.country || '外';
      h.owner = 'AI'; h.loc = 'shop'; if (legend) h.legendBought = true;
      mk.horses.set(d.name, h);
    }
    return { kind: 'pool', horse: h, data: d, price: priceOf(h, legend, W.wIdx()), legend: !!legend };
  };
  // 開いている馬の全部（走っていない馬と、倒したスペシャルホース）。品ぞろえの元
  E.market = function () {
    const G = W.get();
    const act = E.activeNames();
    const items = [];
    for (const d of E.pool()) if (E.isOpen(d) && !act.has(d.name)) items.push(itemOf(d, false));
    for (const name of G.unlocked || []) { const d = HS.Special && HS.Special.data(name); if (d && !act.has(d.name)) items.push(itemOf(d, true)); }
    return items;
  };

  // ---------- 品ぞろえ（持ち主の指摘 2026-10-16「全部の馬を売るんじゃなくて、現役じゃない馬からランダムで選出して」）----------
  // 開いている走っていない馬から、牡馬・牝馬それぞれ E.STOCK 頭を種付きの乱数で選ぶ。毎月の初めに入れ替える
  // （新しい鍵が開いても、並ぶのは来月の入れ替えから）。選んだ馬の名前は G.shopStock に持つ（セーブに入る。無ければその場で選ぶ）。
  // 買った馬・デビューした馬は品ぞろえから消える。倒したスペシャルホースは品ぞろえと別に、いつも並ぶ
  E.STOCK = 10;
  const isMare = d => d.sex === '牝';
  E.restock = function (reroll) {
    const G = W.get();
    const n = (G.shopStock && G.shopStock.y === G.year && G.shopStock.m === G.month ? G.shopStock.n || 0 : 0) + (reroll ? 1 : 0);
    const rng = new U.RNG(((G.seed * 131 + G.year * 12 + G.month) * 7 + n * 7919) >>> 0);
    const act = E.activeNames();
    const free = E.pool().filter(d => E.isOpen(d) && !act.has(d.name));
    const names = [];
    for (const side of [false, true]) {
      const list = free.filter(d => isMare(d) === side);
      for (let i = 0; i < E.STOCK && list.length; i++) names.push(list.splice(rng.int(0, list.length - 1), 1)[0].name);
    }
    G.shopStock = { y: G.year, m: G.month, n, names };
    return names;
  };
  // いま店に並んでいる馬（品ぞろえ＋倒したスペシャルホース）
  E.shop = function () {
    const G = W.get();
    const s = G.shopStock;
    if (!s || s.y !== G.year || s.m !== G.month) E.restock(false);
    const act = E.activeNames();
    const byName = new Map(E.pool().map(d => [d.name, d]));
    const items = [];
    for (const name of G.shopStock.names) { const d = byName.get(name); if (d && !act.has(name)) items.push(itemOf(d, false)); }
    for (const name of G.unlocked || []) { const d = HS.Special && HS.Special.data(name); if (d && !act.has(d.name)) items.push(itemOf(d, true)); }
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
