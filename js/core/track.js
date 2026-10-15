// コースの形：楕円（直線2本と半円2つ）として、ゴールからさかのぼった距離から位置・向き・曲がりを出す
// ミニマップ（上から見た図）と、騎乗画面（後ろから見た図）の両方で使う
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const T = HS.Track = {};

  // lap＝1周の長さ、straight＝最後の直線、dir＝'左'|'右'（回る向き）
  T.make = function (lap, straight, dir) {
    const L = lap || 2000;
    let a = Math.max(straight || 400, L * 0.22);
    let r = (L - 2 * a) / (2 * Math.PI);
    if (r < L * 0.06) { a = L * 0.28; r = (L - 2 * a) / (2 * Math.PI); }
    const st = Math.min(a, straight || a);
    const sign = dir === '左' ? -1 : 1; // 左回り＝曲がるときに左へ向く
    // ゴールは下の直線の上。ゴールから逆にたどって、下の直線の残り・コーナー・向こう正面・コーナー・下の直線
    const goalX = a / 2 - st + a / 2 * 0.2;
    const seg1 = a / 2 + goalX;
    // s：ゴールからさかのぼった距離（周回）。x,y は上から見た位置（右回りの向き）、curv は進む向きに対する曲がり（左へ曲がるなら負）
    const at = function (s) {
      s = ((s % L) + L) % L;
      let u = s, x, y, curv = 0, corner = 0;
      if (u <= seg1) { x = goalX - u; y = r; }
      else if ((u -= seg1) <= Math.PI * r) { const ang = Math.PI / 2 + u / r; x = -a / 2 + Math.cos(ang) * r; y = Math.sin(ang) * r; curv = 1 / r; corner = 3; }
      else if ((u -= Math.PI * r) <= a) { x = -a / 2 + u; y = -r; }
      else if ((u -= a) <= Math.PI * r) { const ang = -Math.PI / 2 + u / r; x = a / 2 + Math.cos(ang) * r; y = Math.sin(ang) * r; curv = 1 / r; corner = 1; }
      else { u -= Math.PI * r; x = a / 2 - u; y = r; }
      return { x: x * sign, y, curv: curv * sign, corner };
    };
    return { L, a, r, straight: st, sign, at };
  };

  // レースの中の位置（スタートからの距離 x、全体 D）から、ゴールまでの残りでコースの位置を引く
  T.atRace = (tr, D, x) => tr.at(Math.max(0, D - x));
  // 残り距離 R の地点で、コーナーの中か（3・4コーナー＝3、1・2コーナー＝1、直線＝0）
  T.cornerAt = (tr, R) => tr.at(Math.max(0, R)).corner;
})();
