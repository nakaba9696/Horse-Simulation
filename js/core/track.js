// コースの形：楕円（直線2本と半円2つ）として、ゴールからさかのぼった距離から位置・向き・曲がりを出す
// ミニマップ（上から見た図）と、騎乗画面（後ろから見た図）の両方で使う
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const T = HS.Track = {};

  // lap＝1周の長さ、straight＝最後の直線、dir＝'左'|'右'（回る向き）
  T.make = function (lap, straight, dir) {
    const L = lap || 2000;
    // 実際のコースのように、ゴールの先にも直線を残す（ゴール板はスタンドの前、直線の途中）
    const minR = L * 0.06;
    const runout = Math.min(170, Math.max(90, L * 0.07));
    let a = Math.max((straight || 400) + runout, L * 0.22);
    let r = (L - 2 * a) / (2 * Math.PI);
    if (r < minR) { r = minR; a = (L - 2 * Math.PI * r) / 2; } // 回りが小さすぎるときは、ゴールの先の直線を短くする
    const st = Math.min(a, straight || a);
    const sign = dir === '左' ? -1 : 1; // 左回り＝曲がるときに左へ向く
    // ゴールは下の直線の上。ゴールから逆にたどって、下の直線の残り・コーナー・向こう正面・コーナー・下の直線
    const goalX = st - a / 2; // ゴールから直線の入り口まで（seg1）がちょうど st になる
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
    return { L, a, r, straight: st, sign, at, hAt: () => 0, gAt: () => 0, flat: true };
  };

  // ---------- 実際のコースの形（data/layouts.js）----------
  // o.segs：ゴールから走る向きと逆にたどった順の区切り。['S', 長さ] 直線、['C', 入口の半径, 出口の半径, 角度(度), 番号] コーナー（入口・出口は走る向きで）
  // o.elev：[[ゴールまでの残り, 高さ(m)], …]。o.line：直線だけのコース
  // 戻り値は T.make と同じ形（L・a・r・straight・sign・at）に、高さ（hAt）と走る向きの勾配（gAt、上りが正、‰ではなく比）を足したもの
  T.STEP = 0.5;
  T.fromLayout = function (lay, dir) {
    const sign = dir === '左' ? -1 : 1;
    const segs = lay.segs || [['S', lay.lap || 2000]];
    const line = !!(lay.line || lay.open); // 直線だけ・周回しないコースは閉じない
    // 曲がりの合計を周回なら 360 度にそろえる
    const turn = segs.reduce((t, g) => t + (g[0] === 'C' ? g[3] : 0), 0);
    const kTurn = !line && turn ? 360 / turn : 1;
    // 区切りを一続きの「長さ・曲がりの始め・曲がりの終わり・番号」に
    const parts = segs.map(g => {
      if (g[0] !== 'C') return { len: g[1], th: 0, c: 0 };
      // 半径は角度に沿って入口から出口へ直線的に変わる（長さ＝角度×(入口＋出口)/2）。さかのぼる向きでは、出口から入口へ
      const th = g[3] * kTurn * Math.PI / 180;
      return { len: Math.abs(th) * (g[1] + g[2]) / 2, th, r0: g[2], r1: g[1], c: g[4] || 3 };
    });
    // コーナーの中の u m の地点の曲がり（1/半径。負の角度は逆向き）
    const kAt = (q, u) => {
      if (!q.th) return 0;
      const T = Math.abs(q.th), a = (q.r1 - q.r0) / (2 * T), b = q.r0;
      const phi = Math.abs(a) < 1e-9 ? u / b : (-b + Math.sqrt(Math.max(0, b * b + 4 * a * u))) / (2 * a);
      return Math.sign(q.th) / (q.r0 + (q.r1 - q.r0) * U01(phi / T));
    };
    const L = parts.reduce((t, q) => t + q.len, 0);
    const n = Math.ceil(L / T.STEP) + 1, dl = L / (n - 1);
    const X = new Float64Array(n), Y = new Float64Array(n), K = new Float64Array(n), C = new Uint8Array(n);
    let x = 0, y = 0, th = Math.PI, pi = 0, u0 = 0;
    for (let i = 0; i < n; i++) {
      const s = i * dl;
      while (pi < parts.length - 1 && s > u0 + parts[pi].len) { u0 += parts[pi].len; pi++; }
      const q = parts[pi], k = kAt(q, Math.max(0, Math.min(q.len, s - u0)));
      X[i] = x; Y[i] = y; K[i] = k; C[i] = q.c;
      if (i < n - 1) { th += k * dl / 2; x += Math.cos(th) * dl; y += Math.sin(th) * dl; th += k * dl / 2; }
    }
    // 周回は終わりが始まりに戻るように、ずれを少しずつ割り振る
    if (!line) { const ex = X[n - 1], ey = Y[n - 1]; for (let i = 0; i < n; i++) { X[i] -= ex * i / (n - 1); Y[i] -= ey * i / (n - 1); } }
    // 真ん中を原点に（上から見た図で、横 a+2r・縦 2r に収まる）
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < n; i++) { x0 = Math.min(x0, X[i]); x1 = Math.max(x1, X[i]); y0 = Math.min(y0, Y[i]); y1 = Math.max(y1, Y[i]); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    for (let i = 0; i < n; i++) { X[i] -= cx; Y[i] -= cy; }
    const r = Math.max(1, (y1 - y0) / 2), a = Math.max(0, (x1 - x0) - 2 * r);
    // 高さ
    const E = (lay.elev && lay.elev.length ? lay.elev : [[0, 0]]).slice().sort((p, q) => p[0] - q[0]);
    const hRaw = s => {
      if (E.length === 1) return E[0][1];
      if (s <= E[0][0]) return E[0][1];
      for (let i = 1; i < E.length; i++) if (s <= E[i][0]) { const [s0, h0] = E[i - 1], [s1, h1] = E[i]; return h0 + (h1 - h0) * (s - s0) / Math.max(1e-6, s1 - s0); }
      return E[E.length - 1][1];
    };
    const H = new Float64Array(n); for (let i = 0; i < n; i++) H[i] = hRaw(i * dl);
    // 角を丸める（数 m の幅でならす）
    const Hs = new Float64Array(n), w = Math.max(1, Math.round(8 / dl));
    for (let i = 0; i < n; i++) { let t = 0, c = 0; for (let j = -w; j <= w; j++) { let k = i + j; if (line) k = Math.max(0, Math.min(n - 1, k)); else k = ((k % (n - 1)) + (n - 1)) % (n - 1); t += H[k]; c++; } Hs[i] = t / c; }
    const idx = s => {
      if (line) { const sc = Math.max(0, Math.min(L, s)); return { i: Math.min(n - 2, Math.floor(sc / dl)), f: U01(sc / dl - Math.floor(sc / dl)), over: s - sc }; }
      s = ((s % L) + L) % L; const i = Math.min(n - 2, Math.floor(s / dl)); return { i, f: s / dl - i, over: 0 };
    };
    const lerp = (A, i, f) => A[i] + (A[i + 1] - A[i]) * f;
    const at = function (s) {
      const { i, f, over } = idx(s);
      let px = lerp(X, i, f), py = lerp(Y, i, f);
      if (over) { const hx = X[n - 1] - X[n - 2], hy = Y[n - 1] - Y[n - 2], l = Math.hypot(hx, hy) || 1; if (over > 0) { px += hx / l * over; py += hy / l * over; } }
      if (line && s < 0) { const hx = X[1] - X[0], hy = Y[1] - Y[0], l = Math.hypot(hx, hy) || 1; px = X[0] + hx / l * s; py = Y[0] + hy / l * s; }
      return { x: px * sign, y: py, curv: K[f < 0.5 ? i : i + 1] * sign, corner: C[f < 0.5 ? i : i + 1] };
    };
    const hAt = s => { const { i, f } = idx(s); return lerp(Hs, i, f); };
    // 走る向き（残りが減る向き）の勾配：上りが正
    const gAt = s => (hAt(s - 5) - hAt(s + 5)) / 10;
    // 最後の直線（コース図で使う）
    const st = Math.min(lay.straight || L, L);
    return { L, a, r, straight: st, sign, at, hAt, gAt, line, id: lay.id || '', layout: lay };
  };
  const U01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

  // レースの競馬場・芝ダート・距離から、使う回りを選ぶ（data/layouts.js が無い場は、courses.js の数で楕円）
  T.layoutOf = function (race) {
    const LY = HS.DATA && HS.DATA.layouts && HS.DATA.layouts[race.course];
    const list = LY && (race.surface === 'ダ' ? LY.dirt : LY.turf);
    if (!list || !list.length) return null;
    if (race.loop) { const m = list.find(l => l.id === race.loop); if (m) return m; }
    return list.find(l => (l.use || []).includes(race.dist)) || list.find(l => !l.line) || list[0];
  };
  // レースのコース：geo（lap・straight・slope・speed）と track
  T.forRace = function (race) {
    const C = HS.DATA.courses || {};
    const course = C[race.course] || C['東京'] || {};
    const base = (race.surface === 'ダ' ? course.dirt : course.turf) || course.turf || course.dirt || { lap: 2000, straight: 400, slope: '平' };
    const lay = T.layoutOf(race);
    if (!lay) return { geo: base, track: T.make(base.lap, base.straight, course.dir), dir: course.dir, layout: null };
    const track = T.fromLayout(lay, course.dir);
    const geo = Object.assign({}, base, { lap: Math.round(track.L), straight: lay.straight || base.straight, loop: lay.id || '' });
    return { geo, track, dir: course.dir, layout: lay };
  };

  // レースの中の位置（スタートからの距離 x、全体 D）から、ゴールまでの残りでコースの位置を引く
  T.atRace = (tr, D, x) => tr.at(Math.max(0, D - x));
  // 残り距離 R の地点で、コーナーの中か（3・4コーナー＝3、1・2コーナー＝1、直線＝0）
  T.cornerAt = (tr, R) => tr.at(Math.max(0, R)).corner;
})();
