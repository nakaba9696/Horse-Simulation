// コントローラーの振動（持ち主の指摘 2026-10-16「馬の走りにあわせてコントローラー振動して欲しい」）
// - 騎乗中、自分の馬の4つの蹄が地面に着くたびに短く震える（後脚2つは強く、前脚2つは弱く）。
//   拍子は 3D の脚の動き（js/ui/race3d.js の一完歩 7.2m・着地の位相）と同じ。速く走るほど、追うほど強い
// - ゲートが開く・ムチ・特殊能力・ゴールでも震える
// - 振動の強さはメニューで変えられる（0 で切る）。この端末に保存（localStorage 'hs_rumble'）
// - Gamepad の vibrationActuator（Chrome・Edge）か hapticActuators（Firefox）。無ければ何もしない
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const RB = HS.Rumble = {};
  const STRIDE = 7.2;                  // race3d.js の一完歩と同じ
  const STEPS = [[0.0, 1], [0.12, 0.85], [0.34, 0.55], [0.46, 0.5]]; // 着地の位相と強さ（後・後・前・前）

  const KEY = 'hs_rumble';
  RB.level = 0.7;
  try { const v = localStorage.getItem(KEY); if (v != null && !isNaN(+v)) RB.level = Math.max(0, Math.min(1, +v)); } catch (e) { /* 保存できない端末 */ }
  RB.setLevel = function (v) {
    RB.level = Math.max(0, Math.min(1, v));
    try { localStorage.setItem(KEY, String(RB.level)); } catch (e) { /* 保存できない端末 */ }
  };

  const pad = function () {
    const list = globalThis.navigator && navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
    return list.find(p => p && p.connected && (p.vibrationActuator || (p.hapticActuators && p.hapticActuators.length))) || null;
  };
  RB.available = () => !!pad();

  // 震わせる（ms・強いモーター・弱いモーター。0〜1）
  RB.play = function (ms, strong, weak) {
    if (RB.level <= 0) return;
    const p = pad(); if (!p) return;
    const s = Math.max(0, Math.min(1, strong * RB.level)), w = Math.max(0, Math.min(1, weak * RB.level));
    if (s < 0.02 && w < 0.02) return;
    try {
      if (p.vibrationActuator && p.vibrationActuator.playEffect) p.vibrationActuator.playEffect('dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: s, weakMagnitude: w }).catch(() => {});
      else if (p.hapticActuators && p.hapticActuators[0] && p.hapticActuators[0].pulse) p.hapticActuators[0].pulse(Math.max(s, w), ms);
    } catch (e) { /* 振動を使えないコントローラー */ }
  };
  RB.stop = function () {
    const p = pad(); if (!p) return;
    try { if (p.vibrationActuator && p.vibrationActuator.reset) p.vibrationActuator.reset(); } catch (e) { /* 何もしない */ }
  };

  // 場面ごとの震え
  const FX = {
    gate: () => RB.play(260, 1, 0.8),
    whip: () => RB.play(70, 0.15, 0.9),
    skill: () => { RB.play(120, 0.5, 1); setTimeout(() => RB.play(160, 0.8, 1), 170); },
    bad: () => RB.play(220, 0.7, 0.2),
    finish: () => RB.play(350, 0.6, 0.6),
    win: () => { RB.play(300, 1, 1); setTimeout(() => RB.play(500, 0.7, 1), 420); },
  };
  RB.fx = name => { if (FX[name]) FX[name](); };

  // 蹄の拍子。毎コマ、自分の馬の位置 x（m）・速さ v（m/s）・追い（0〜1）を渡す。
  // 前のコマから今のコマまでに着地の位相をまたいだら、その蹄の分だけ震わせる
  let lastPh = null;
  RB.reset = () => { lastPh = null; RB.stop(); };
  RB.gallop = function (x, num, v, push) {
    if (RB.level <= 0 || !(v > 1.5)) { lastPh = null; return; }
    const pos = x / STRIDE + (num || 0) * 0.137; // race3d.js と同じ位相
    if (lastPh == null || pos < lastPh || pos - lastPh > 1) { lastPh = pos; return; }
    const sp = Math.max(0, Math.min(1, (v - 8) / 9)); // 8m/s で 0、17m/s で 1
    const amp = 0.25 + 0.45 * sp + 0.3 * Math.max(0, Math.min(1, push || 0));
    for (const [at, k] of STEPS) {
      const n0 = Math.floor(lastPh - at), n1 = Math.floor(pos - at);
      if (n1 > n0) { RB.play(k > 0.7 ? 55 : 40, k * amp, k * amp * 0.6); break; } // 1コマに1回まで
    }
    lastPh = pos;
  };
})();
