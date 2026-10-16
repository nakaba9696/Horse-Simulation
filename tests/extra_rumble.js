// 検証：コントローラーの振動（js/ui/rumble.js）。偽のコントローラーで、一完歩に4回（蹄の数）震え、速いほど強く、0 で切れる
module.exports = function (check, assert, HS) {
  check('rumble: 騎乗中、蹄が地面に着くたびに震える（一完歩に4回・速いほど強い・0 で切れる）', () => {
    const vm = require('vm'), fs = require('fs'), path = require('path');
    const fx = [];
    const pad = { connected: true, vibrationActuator: { playEffect: (t, o) => { fx.push(o); return Promise.resolve(); }, reset() {} } };
    const nav0 = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => [pad] }, configurable: true, writable: true });
    try {
      vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js/ui/rumble.js'), 'utf8'), { filename: 'js/ui/rumble.js' });
      const RB = HS.Rumble; RB.level = 0.7;
      const run = (v, push) => { fx.length = 0; RB.reset(); for (let x = 100; x <= 100 + 7.2 * 5; x += Math.max(v, 1) * 0.016) RB.gallop(x, 3, v, push); return fx.slice(); };
      const slow = run(10, 0), fast = run(17, 1);
      assert(fast.length >= 19 && fast.length <= 21, `5完歩で ${fast.length} 回（20回のはず）`);
      const avg = a => a.reduce((s, o) => s + o.strongMagnitude, 0) / a.length;
      assert(avg(fast) > avg(slow) * 1.5 && fast.every(o => o.strongMagnitude <= 1), `速さで強さが変わらない（${avg(slow).toFixed(2)}→${avg(fast).toFixed(2)}）`);
      assert(run(0, 0).length === 0, '止まっているのに震える');
      RB.level = 0; assert(run(17, 1).length === 0, '0 にしても震える');
      RB.level = 0.7; fx.length = 0; RB.fx('gate'); assert(fx.length === 1, 'ゲートで震えない');
      return `5完歩 ${fast.length}回・強さ ${avg(slow).toFixed(2)}（10m/s）→${avg(fast).toFixed(2)}（17m/s・追う）`;
    } finally {
      if (nav0) Object.defineProperty(globalThis, 'navigator', nav0); else delete globalThis.navigator;
    }
  });
};
