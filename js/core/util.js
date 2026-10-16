// 共通の道具：乱数（種で固定できる）・書式・小物
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U = {};

  // 種で固定できる乱数（mulberry32）。状態は数値1つなのでセーブに入れられる。
  class RNG {
    constructor(seed) { this.s = (seed >>> 0) || 1; }
    next() {
      let t = (this.s = (this.s + 0x6D2B79F5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    float(a = 0, b = 1) { return a + (b - a) * this.next(); }
    int(a, b) { return Math.floor(this.float(a, b + 1)); } // a..b を含む
    chance(p) { return this.next() < p; }
    normal(m = 0, sd = 1) {
      let u = 0, v = 0;
      while (u === 0) u = this.next();
      while (v === 0) v = this.next();
      return m + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
    weighted(items, weightFn) {
      let total = 0;
      const ws = items.map(it => { const w = Math.max(0, weightFn(it)); total += w; return w; });
      if (total <= 0) return items[Math.floor(this.next() * items.length)];
      let r = this.next() * total;
      for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
      return items[items.length - 1];
    }
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      return arr;
    }
    fork() { return new RNG(Math.floor(this.next() * 4294967296)); }
  }
  U.RNG = RNG;

  // 文字列から決まった数（馬名ごとの個性を毎回同じにする）
  U.hash = function (str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  U.hashRng = str => new RNG(U.hash(str));

  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.smooth = t => { t = U.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  U.sum = arr => arr.reduce((s, v) => s + v, 0);
  U.avg = arr => arr.length ? U.sum(arr) / arr.length : 0;

  // 金額（万円単位の数）を「1億2,345万円」に
  U.money = function (man) {
    const neg = man < 0; let v = Math.round(Math.abs(man));
    const oku = Math.floor(v / 10000), rest = v % 10000;
    let s = '';
    if (oku > 0) s += oku.toLocaleString('ja-JP') + '億';
    if (rest > 0 || oku === 0) s += rest.toLocaleString('ja-JP') + '万';
    return (neg ? '-' : '') + s + '円';
  };
  // 走破タイム（秒）を「2:23.4」に
  U.time = function (sec) {
    const t = Math.round(sec * 10) / 10;
    const m = Math.floor(t / 60); const s = t - m * 60;
    const ss = s.toFixed(1).padStart(4, '0');
    return m > 0 ? `${m}:${ss}` : ss;
  };
  U.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // 物価の目安（1995年＝1）。年代ごとのお金（経費・値段・条件戦の賞金）に掛ける
  const lerpTable = (tbl, y) => {
    if (y <= tbl[0][0]) return tbl[0][1];
    for (let i = 0; i < tbl.length - 1; i++) { const [y1, v1] = tbl[i], [y2, v2] = tbl[i + 1]; if (y <= y2) return v1 + (v2 - v1) * (y - y1) / (y2 - y1); }
    return tbl[tbl.length - 1][1];
  };
  // 年代なしのゲーム（U.ERA に年が入る）では、物価・走りの速さ・番組はその年で固定する
  U.ERA = null;
  U.priceIndex = y => lerpTable([[1960, 0.12], [1965, 0.18], [1970, 0.28], [1975, 0.5], [1980, 0.7], [1985, 0.82], [1990, 0.93], [1995, 1], [2010, 1], [2020, 1.05], [2030, 1.15]], U.ERA || y || 1995);
  // 時代の走りの速さ（馬場と調教の進歩。2010年代＝1）
  U.eraSpeed = y => lerpTable([[1960, 0.972], [1970, 0.979], [1980, 0.986], [1990, 0.992], [2000, 0.997], [2010, 1]], U.ERA || y || 2010);

  // 能力値をアルファベットの評価に
  U.grade = function (v) {
    if (v == null) return '?';
    if (v >= 100) return 'SS';
    if (v >= 92) return 'S';
    if (v >= 84) return 'A';
    if (v >= 76) return 'B';
    if (v >= 68) return 'C';
    if (v >= 60) return 'D';
    if (v >= 50) return 'E';
    if (v >= 40) return 'F';
    return 'G';
  };

  // 着差（馬身）を表記に
  U.margin = function (lengths) {
    if (lengths <= 0.003) return '同着';
    if (lengths < 0.1) return 'ハナ';
    if (lengths < 0.25) return 'アタマ';
    if (lengths < 0.4) return 'クビ';
    const steps = [[0.6, '1/2'], [0.85, '3/4'], [1.1, '1'], [1.35, '1 1/4'], [1.6, '1 1/2'], [1.85, '1 3/4'], [2.25, '2'], [2.75, '2 1/2'], [3.25, '3'], [3.75, '3 1/2'], [4.5, '4'], [5.5, '5'], [6.5, '6'], [7.5, '7'], [8.5, '8'], [9.5, '9'], [10.5, '10']];
    for (const [lim, label] of steps) if (lengths < lim) return label;
    return '大差';
  };
})();
