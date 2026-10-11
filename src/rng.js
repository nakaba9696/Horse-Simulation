// 乱数（シードで固定できる）。mulberry32。
(function (HS) {
  function createRng(seed) {
    let a = seed >>> 0;
    const next = function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.range = (min, max) => min + (max - min) * next();
    next.int = (min, max) => Math.floor(min + (max - min + 1) * next());
    next.pick = (arr) => arr[Math.floor(next() * arr.length)];
    // 平均 0・標準偏差 1 の正規乱数
    next.normal = () => {
      const u = Math.max(next(), 1e-12);
      const v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    return next;
  }
  HS.createRng = createRng;
})(globalThis.HS = globalThis.HS || {});
