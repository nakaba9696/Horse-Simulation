// 騎乗の画面：自分の馬の映像（3D は js/ui/race3d.js、使えなければ js/ui/ridecam.js）に計器を重ね、
// ゲームパッド・キーボード（タッチのボタンは前のために残す）で「しごく・引く・進路・左右のムチ・持ち替え」を操作する。
// 手ざわりの決まりは docs/FEEL.md。騎乗中は操作の結果を文字で出さず、計器・光・揺れ・音・振動で返す（合図だけ短い英語）。
// 計器の置き方：左上に順位と残りの帯、上の真ん中にペースの目盛り、右上に時計、右に縦長の馬群レーダーと照準の馬、
// 左下に丸い計器（速さ・気性の輪・手綱の段）とスタミナ・気合・ムチの手。特殊能力が発動したら、真ん中に札が出て右上へ退く
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, S = HS.Sim;
  const RD = HS.Ride = {};
  RD.speed = 1.35; // 進む速さの倍率（持ち主の指摘「ゲームスピード遅い」で実時間の1.35倍。走破タイムの表示は本当の秒のまま）
  RD.COOL = 2.4;   // ゴール板を過ぎてから着順を出すまでの秒（実時間。持ち主の指摘「ゴールしたら少し走ってから順位表示して」）。決めるボタンで飛ばせる
  const FC = () => HS.DATA.frameColors, FT = () => HS.DATA.frameText;
  const FONT = '"Noto Sans JP", sans-serif', NUM = '"Noto Sans JP", "Arial Narrow", sans-serif';
  const TAU = Math.PI * 2;
  // 計器の色：暗いガラスの板・金の細い線。数の色は「良い＝緑・注意＝金・悪い＝赤・抑え＝青」
  const HUD = { glass: 'rgba(6,14,11,0.72)', glass2: 'rgba(14,30,23,0.82)', line: 'rgba(242,217,142,0.6)', label: 'rgba(214,230,220,0.78)', gold: '#f2d98e', off: 'rgba(255,255,255,0.10)', good: '#57d17f', warn: '#ffd34d', bad: '#ff5a4d', calm: '#5fb4ff', cyan: '#7fe6ff' };

  // ゲームパッド（標準の並び）：十字の上＝しごく・下＝引く・左右＝進路（左スティックも）、B＝右ムチ、X＝左ムチ、A＝持ち替え（ゴールのあとは「決める」）、
  // Start＝一時停止（ゴールのあとは「決める」）、Y＝ガッツポーズ、LT・RT＝左右を向く、LB・RB＝レーダーの照準、Back＝視点、右スティック＝カメラ、右スティック押し込み＝カメラを戻す
  const PAD = { up: [12], down: [13], left: [14], right: [15], whipR: [1], whipL: [2], swap: [0], ok: [0], start: [9], pose: [3], lookL: [6], lookR: [7], tgtPrev: [4], tgtNext: [5], view: [8], camreset: [11] };
  const STYLES = ['逃げ', '先行', '差し', '追込'];
  const PACE_EN = { スローペース: 'SLOW', 平均ペース: 'EVEN', ハイペース: 'HIGH' };
  const UI_DIFF = d => d == null ? '' : `${d < 0 ? '−' : '+'}${Math.abs(d).toFixed(1)}`;
  const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
  const ease = u => u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.pow(1 - u, 3);

  // コントローラーの向き（上下左右）。標準の並びの十字（12〜15）・左スティック・標準でない並びの十字（hat の軸 axes[9]、または axes[6]・[7]）
  const hatSeen = {};
  RD.padDirs = function (p) {
    const d = { up: false, down: false, left: false, right: false };
    if (!p) return d;
    const b = i => { const x = p.buttons && p.buttons[i]; return !!x && (x.pressed || x.value > 0.5); };
    const ax = i => (p.axes && typeof p.axes[i] === 'number') ? p.axes[i] : 0;
    d.up = b(12) || ax(1) < -0.5; d.down = b(13) || ax(1) > 0.5; d.left = b(14) || ax(0) < -0.5; d.right = b(15) || ax(0) > 0.5;
    if (p.mapping !== 'standard') {
      // hat：上 -1 から時計回りに 2/7 ずつ（上・右上・右・右下・下・左下・左・左上）。離すと 1.28 ほど。
      // ふつうの軸が 9 番にある機器を十字と取り違えないよう、離した値（1.1 より上）を一度見てから読む
      if (p.axes && p.axes.length > 9) {
        const v = ax(9), key = p.index + ':' + p.id;
        if (v > 1.1) hatSeen[key] = true;
        if (hatSeen[key] && v >= -1.05 && v <= 1.05) {
          const k = Math.round((v + 1) / (2 / 7)) % 8;
          if (k === 7 || k === 0 || k === 1) d.up = true;
          if (k >= 1 && k <= 3) d.right = true;
          if (k >= 3 && k <= 5) d.down = true;
          if (k >= 5 && k <= 7) d.left = true;
        }
      }
      if (p.axes && p.axes.length >= 8 && p.axes.length <= 9) {
        if (ax(6) < -0.5) d.left = true; if (ax(6) > 0.5) d.right = true;
        if (ax(7) < -0.5) d.up = true; if (ax(7) > 0.5) d.down = true;
      }
    }
    return d;
  };

  // 飛ばす操作を待つ（ファンファーレなど）：Enter・Space・Esc か、コントローラーの A・B・Start。戻り値は待つのをやめる関数
  RD.onSkip = function (cb) {
    let off = false, armed = false;
    const fire = () => { if (off) return; stop(); cb(); };
    const key = ev => { if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Escape') { ev.preventDefault(); fire(); } };
    const poll = () => {
      if (off) return;
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(x => x && x.connected) : [];
      const down = pads.some(p => [0, 1, 9].some(i => p.buttons[i] && p.buttons[i].pressed));
      if (down && armed) return fire();
      if (!down) armed = true; // 前の画面から押しっぱなしのボタンでは飛ばない
      requestAnimationFrame(poll);
    };
    const stop = () => { off = true; window.removeEventListener('keydown', key); };
    window.addEventListener('keydown', key);
    requestAnimationFrame(poll);
    return stop;
  };

  // card：W.cards() の1レース。戻り値：S.finish の結果（Promise）
  RD.ride = function (el, card, opts) {
    opts = opts || {};
    return new Promise(resolve => {
      const race = card.race;
      const sim = opts.makeSim ? opts.makeSim() : HS.World.startSim(card, { ride: true }); // フリーレースは自分の種で作る（opts.makeSim）
      RD.cur = sim; // 確かめ用（いま走っているレース）
      const me = sim.st[sim.me];
      const course = HS.DATA.courses[race.course] || HS.DATA.courses['東京'];
      const inward = S.dirOf(sim) === '左' ? 'L' : 'R'; // 内ラチの側
      el.innerHTML = `
        <div class="ride">
          <div class="ride-stage"><canvas class="ride-3d"></canvas><canvas class="ride-canvas"></canvas>
            <button class="cam-btn" aria-label="視点を変える">🎥 視点</button></div>
          <div class="ride-pad">
            <div class="pad-l">
              <button class="rb up" data-c="up">▲<small>しごく（連打）</small></button>
              <div class="pad-row"><button class="rb lane" data-c="left" aria-label="左へ">◀</button><button class="rb down" data-c="down">▼<small>引く</small></button><button class="rb lane" data-c="right" aria-label="右へ">▶</button></div>
            </div>
            <button class="rb swap" data-c="swap">持ち替え</button>
            <div class="pad-r">
              <button class="rb whip" data-c="whipL">左ムチ<small>${inward === 'L' ? '外へ寄る' : '内へ寄る'}</small></button>
              <button class="rb whip" data-c="whipR">右ムチ<small>${inward === 'L' ? '内へ寄る' : '外へ寄る'}</small></button>
            </div>
          </div>
          <div class="ride-help small muted"><b>パッド</b> 十字・左スティック：↑しごく（連打）↓引く ←→進路　B 右ムチ・X 左ムチ（続けて打つと風車。馬はムチと反対へ寄る）・A 持ち替え　LT/RT 横を見る・LB/RB 照準・Back 視点・Start 一時停止<br><b>キー</b> ↑↓←→・X 右ムチ・Z 左ムチ・C 持ち替え・Q/E 横を見る・A/S 照準・V 視点・Esc 一時停止　ゴールのあと：A／Enter 次へ・Y／G ガッツポーズ</div>
        </div>`;
      // PC では騎乗の画面を画面いっぱいに（小窓の幅を広げる）
      const modal = el.closest && el.closest('.modal');
      if (modal) modal.classList.add('ride-modal');
      const cv = el.querySelector('.ride-canvas');
      const narrow = (el.clientWidth || 960) < 600;
      const VW = narrow ? 640 : 960, VH = narrow ? 600 : 540;
      cv.style.aspectRatio = `${VW} / ${VH}`;
      const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
      const ctx = cv.getContext('2d');
      // 計器は 960×540 の座標で描き、映す大きさに合わせて細かく描く（大きな画面でもぼやけない）
      const fit = () => {
        const w = cv.clientWidth || VW, sc = Math.min(3, w / VW * dpr);
        const pw = Math.round(VW * sc), ph = Math.round(VH * sc);
        if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
        ctx.setTransform(sc, 0, 0, sc, 0, 0);
      };
      fit();
      const AU = HS.Audio, RB = HS.Rumble;
      const meta = sim.st.map(s => ({ silks: HS.RaceView.silksOf(s.h), cap: FC()[(s.r.frame - 1) % 8], capText: FT()[(s.r.frame - 1) % 8] }));
      const record = 'record' in opts ? opts.record : HS.World.courseRecord ? HS.World.courseRecord(race) : null;
      let recFx = null; // 勝ち馬がレコードを破ったら、着順の表示のときに「RECORD」と前のレコードとの差
      // 3D（WebGL が使えるとき）。計器は上の 2D の canvas に重ねる
      let r3 = null;
      const cv3 = el.querySelector('.ride-3d');
      if (HS.Race3D && HS.Race3D.supported() && !RD.no3d) {
        try {
          cv3.style.aspectRatio = `${VW} / ${VH}`;
          r3 = HS.Race3D.create(cv3, {
            D: sim.D, surface: race.surface, ground: race.ground, weather: race.weather, track: sim.track,
            course: { name: race.course, dir: course.dir, lap: sim.geo.lap, straight: sim.geo.straight, slope: sim.geo.slope },
            horses: sim.st.map((s, j) => ({ num: s.r.num, frame: s.r.frame, cap: meta[j].cap, silks: meta[j].silks, coat: s.h.coat, name: s.h.name, age: (HS.World.get() && !race.free ? HS.World.get().year : race.year) - s.h.born, mine: !!s.me })),
          });
          r3.resize(cv3.clientWidth || VW, cv3.clientHeight || VH, dpr);
        } catch (err) { console.warn('3D を使えないので 2D で描く', err); r3 = null; }
      }
      if (!r3) cv3.style.display = 'none';
      const onResize = () => { fit(); if (r3) r3.resize(cv3.clientWidth || VW, cv3.clientHeight || VH, dpr); };
      window.addEventListener('resize', onResize);
      let flash = null; // 短い英語の合図（視点の名前・START など）
      let skillTag = null, pace = null, fxSeen = 0, paceShown = false;
      const pings = []; // レーダーの印（近くの馬の特殊能力・ぶつかり）
      const say = (text, cls) => { flash = { text, cls, t: performance.now() }; };

      // ---------- 揺れ：小さく、なめらかに減る（整数に丸めない・画面ごと揺らさない）。3D のカメラだけを動かす ----------
      const kicks = [];
      const kick = o => { kicks.push(Object.assign({ t0: performance.now(), dur: 300, hz: 8, ax: 0, ay: 0, fov: 0, roll: 0 }, o)); if (kicks.length > 6) kicks.shift(); };
      function shakeNow(now) {
        const o = { x: 0, y: 0, fov: 0, roll: 0 };
        for (let i = kicks.length - 1; i >= 0; i--) {
          const k = kicks[i], u = (now - k.t0) / k.dur;
          if (u >= 1) { kicks.splice(i, 1); continue; }
          const env = (1 - u) * (1 - u), ph = (now - k.t0) / 1000 * k.hz * TAU;
          o.x += k.ax * env * Math.sin(ph); o.y += k.ay * env * Math.sin(ph * 1.31 + 0.7);
          o.fov += k.fov * env * Math.min(1, u * 8); o.roll += k.roll * env * Math.sin(ph * 0.9);
        }
        return o;
      }

      // ---------- 操作 ----------
      let whipAt = -9, poseAt = null, whipFx = null, upFx = 0, downFx = 0, laneFx = null;
      let buffered = false; // ゲートが開く直前（0.15 秒前から）に押した ↑ は、開いた瞬間に受け付ける（先に押しても取りこぼさない）
      const doUp = () => {
        if (fin) return;
        if (clock < 0) { if (clock > -0.15) buffered = true; return; }
        const b = S.ctl.up(sim);
        if (b === 'good' && sim.ctl.pushes === 0) { say('GOOD START', 'good'); kick({ dur: 420, hz: 6, ay: 0.05, fov: 3 }); }
        else if (b === 'late') say('LATE START', 'bad');
        upFx = performance.now();
        if (AU) AU.se('click');
      };
      const doDown = () => { if (fin || clock < 0) return; S.ctl.down(sim); downFx = performance.now(); if (AU) AU.se('click'); };
      const doWhip = side => {
        if (fin) return;
        const b = S.ctl.whip(sim, side);
        if (b == null) return;
        if (b === 'swap') return; // 持ち替えは左下の計器（ムチの手）で分かる
        if (RB) RB.fx('whip');
        whipAt = sim.t; whipFx = { t: performance.now(), side, b, zone: sim.D - me.x < sim.straight + 200 };
        // 手ごたえは揺れより騎手の腕・音・振動で。カメラはごく小さく、打った側へ半周期だけ押されて、すぐ収まる
        kick({ dur: 260, hz: 7, ax: (side === 'R' ? 1 : -1) * 0.03, ay: 0.012, fov: whipFx.zone ? 1.4 : 0.6 });
        if (AU) AU.se('whip');
      };
      const doSwap = () => { if (fin) return; S.ctl.swap(sim); };
      const doLane = d => {
        if (fin || !sim.ctl) return;
        const l0 = sim.ctl.lane; S.ctl.lane(sim, d);
        if (sim.ctl.lane !== l0) { laneFx = { t: performance.now(), d }; if (RB && clock >= 0) RB.fx('lane'); if (AU && clock >= 0) AU.se('lane'); }
      };
      const doPose = () => { if (me.done && poseAt == null) { poseAt = performance.now(); if (AU) AU.se('skill'); } }; // 実時間で数える（模擬が止まったあとも動くように）
      // ゴールのあとの「決める」：流している間に押すと着順の表示へ、着順の表示で押すと結果へ
      const doOk = () => {
        if (!fin || performance.now() - fin.at < 350) return; // ゴールの直前から連打していても、すぐには飛ばない
        if (!fin.shown) reveal(); else if (performance.now() - fin.shown > 300) finish();
      };
      // 照準（レーダーで見る馬）
      let target = sim.me;
      const orderNow = () => sim.st.slice().sort((a, b) => (a.done && b.done) ? a.finishT - b.finishT : a.done ? -1 : b.done ? 1 : b.x - a.x);
      const moveTarget = d => { const o = orderNow(); const k = o.findIndex(s => s.i === target); target = o[(k + d + o.length) % o.length].i; };
      const ACT = { up: doUp, down: doDown, left: () => doLane(-1), right: () => doLane(1), whipL: () => doWhip('L'), whipR: () => doWhip('R'), swap: doSwap };
      el.querySelectorAll('.rb').forEach(b => {
        const c = b.dataset.c;
        const down = ev => { ev.preventDefault(); b.classList.add('on'); if (ACT[c]) ACT[c](); };
        const up = ev => { ev.preventDefault(); b.classList.remove('on'); };
        b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
      });
      // ---------- カメラ：視点は3つ（騎手の後ろ・高い後ろ・中継）。ドラッグで回し、左右を見るボタンで横を向く ----------
      const orbit = { yaw: 0, pitch: 0, zoom: 1 };
      const VIEWS = [['JOCKEY CAM', 'ride', 0, 0, 1], ['HIGH CAM', 'ride', 0, 0.42, 1.7], ['TV CAM', 'tv', 0, 0, 1]];
      let viewI = 0, look = 0, lookNow = 0; const lookKeys = { q: false, e: false }; let padLook = 0;
      const setView = i => { viewI = (i + VIEWS.length) % VIEWS.length; const v = VIEWS[viewI]; orbit.yaw = v[2]; orbit.pitch = v[3]; orbit.zoom = v[4]; say(v[0], ''); };
      el.querySelector('.cam-btn').onclick = ev => { ev.stopPropagation(); setView(viewI + 1); };
      const stage = el.querySelector('.ride-stage');
      let drag = null, lastTap = 0;
      stage.addEventListener('pointerdown', ev => {
        if (ev.target.closest('.cam-btn')) return;
        if (fin) { doOk(); return; } // ゴールのあとは画面を押すと先へ
        const now = performance.now();
        if (now - lastTap < 300) { setView(viewI); lastTap = 0; return; }
        lastTap = now; drag = { x: ev.clientX, y: ev.clientY, id: ev.pointerId };
      });
      stage.addEventListener('pointermove', ev => {
        if (!drag || ev.pointerId !== drag.id) return;
        orbit.yaw -= (ev.clientX - drag.x) * 0.009; orbit.pitch = U.clamp(orbit.pitch + (ev.clientY - drag.y) * 0.006, -0.3, 1.2);
        drag.x = ev.clientX; drag.y = ev.clientY;
      });
      const endDrag = () => { drag = null; };
      stage.addEventListener('pointerup', endDrag); stage.addEventListener('pointercancel', endDrag); stage.addEventListener('pointerleave', endDrag);
      let camRate = { yaw: 0, pitch: 0 };
      // 進路は押し続けると続けて動く（はじめの1回はすぐ、0.28 秒からは 0.2 秒ごと）。しごく・引くは連打の速さが意味を持つので押しっぱなしでは続けない
      const hold = { left: { on: false, next: 0 }, right: { on: false, next: 0 } };
      const keyHeld = { left: false, right: false };
      const KEYS = { ArrowUp: doUp, ArrowDown: doDown, x: () => doWhip('R'), z: () => doWhip('L'), c: doSwap, ' ': doUp, v: () => setView(viewI + 1), r: () => setView(viewI), a: () => moveTarget(-1), s: () => moveTarget(1), g: doPose, Enter: doOk };
      const keyDown = ev => {
        const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
        if (k === 'Escape' || k === 'p') { if (!ev.repeat && !fin) togglePause(); ev.preventDefault(); return; }
        if (paused) { if (k === 'Enter' || k === ' ') { togglePause(); ev.preventDefault(); } return; }
        if (k === 'q' || k === 'e') { lookKeys[k] = true; return; }
        if (k === 'ArrowLeft' || k === 'ArrowRight') { keyHeld[k === 'ArrowLeft' ? 'left' : 'right'] = true; ev.preventDefault(); return; }
        if (ev.repeat) { if (KEYS[k]) ev.preventDefault(); return; }
        if (KEYS[k]) { KEYS[k](); ev.preventDefault(); }
      };
      const keyUp = ev => {
        const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
        if (k === 'q' || k === 'e') lookKeys[k] = false;
        if (k === 'ArrowLeft' || k === 'ArrowRight') keyHeld[k === 'ArrowLeft' ? 'left' : 'right'] = false;
      };
      window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp);
      const padPrev = {};
      let padDir = { up: false, down: false, left: false, right: false };
      // つながっているコントローラーを全部見る（中身の無い機器が先に並ぶ端末がある）
      const pollPad = () => {
        const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(x => x && x.connected) : [];
        const dir = { up: false, down: false, left: false, right: false };
        const btn = {}; let look = 0, rx = 0, ry = 0;
        for (const p of pads) {
          const d = RD.padDirs(p);
          for (const k in dir) dir[k] = dir[k] || d[k];
          const pressed = list => list.some(i => p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > 0.5));
          for (const name of ['whipR', 'whipL', 'swap', 'ok', 'start', 'pose', 'tgtPrev', 'tgtNext', 'view', 'camreset']) btn[name] = btn[name] || pressed(PAD[name]);
          look += (pressed(PAD.lookR) ? 1 : 0) - (pressed(PAD.lookL) ? 1 : 0);
          if (p.mapping === 'standard' || p.axes.length <= 4) { const a2 = p.axes[2] || 0, a3 = p.axes[3] || 0; if (Math.abs(a2) > Math.abs(rx)) rx = a2; if (Math.abs(a3) > Math.abs(ry)) ry = a3; }
        }
        padDir = dir; padLook = U.clamp(look, -1, 1);
        const edge = (name, now) => { const was = padPrev[name]; padPrev[name] = now; return now && !was; };
        if (edge('start', btn.start)) { if (fin) doOk(); else togglePause(); }
        if (paused) { for (const n of ['up', 'down', 'whipR', 'whipL', 'swap', 'ok', 'pose', 'tgtPrev', 'tgtNext', 'view', 'camreset']) padPrev[n] = n === 'up' || n === 'down' ? dir[n] : btn[n]; return; } // 止めている間は、ほかの操作を受け付けない
        if (edge('up', dir.up)) doUp();
        if (edge('down', dir.down)) doDown();
        if (edge('whipR', btn.whipR)) doWhip('R');
        if (edge('whipL', btn.whipL)) doWhip('L');
        if (edge('swap', btn.swap) && !fin) doSwap();
        if (edge('ok', btn.ok) && fin) doOk();
        if (edge('pose', btn.pose)) doPose();
        if (edge('tgtPrev', btn.tgtPrev)) moveTarget(-1);
        if (edge('tgtNext', btn.tgtNext)) moveTarget(1);
        if (edge('view', btn.view)) setView(viewI + 1);
        if (edge('camreset', btn.camreset)) setView(viewI);
        camRate.yaw = Math.abs(rx) > 0.15 ? rx : 0; camRate.pitch = Math.abs(ry) > 0.15 ? ry : 0;
      };
      const laneHold = now => {
        for (const [k, d] of [['left', -1], ['right', 1]]) {
          const on = keyHeld[k] || padDir[k], h = hold[k];
          if (on && !h.on) { h.on = true; h.next = now + 280; doLane(d); }
          else if (on && now >= h.next) { h.next = now + 200; doLane(d); }
          else if (!on) h.on = false;
        }
      };

      // ---------- 一時停止：Esc・P・Start。ほかの窓へ移ったら自動で止める ----------
      let paused = false, pausedAt = 0;
      const togglePause = () => {
        if (fin || done) return;
        paused = !paused; pausedAt = performance.now();
        if (AU) AU.se('click');
        if (RB) RB.stop();
        keyHeld.left = keyHeld.right = false;
      };
      const onBlur = () => { if (!paused && !fin && !done && clock > -COUNT) togglePause(); };
      window.addEventListener('blur', onBlur);

      // ---------- 進める ----------
      const COUNT = 3; // 発走前の秒
      let clock = -COUNT; // 発走からの秒（負はゲートの中）
      let acc = 0, last = null, done = false, result = null;
      let prev = sim.st.map(s => [s.x, s.lane, s.v]);
      let fin = null; // ゴール板を過ぎた：{ at（実時間）, pos, shown（着順を出した実時間） }
      let slowUntil = 0; // ゴール板の瞬間だけ、時の進みを落とす（見せ場の一瞬を止める）
      let lastBump = null, countShown = 0;
      // ゴールした馬（と、模擬が止まったあとの全部の馬）は、映像の側で流して減速させる
      const coast = sim.st.map(() => null);
      if (AU) { AU.bgm('race'); }
      const lerpView = k => sim.st.map((s, j) => {
        const x = coast[j] ? coast[j].x : prev[j][0] + (s.x - prev[j][0]) * k;
        return {
          x, lane: prev[j][1] + (s.lane - prev[j][1]) * k, v: coast[j] ? coast[j].v : s.v,
          num: s.r.num, frame: s.r.frame, cap: meta[j].cap, silks: meta[j].silks, coat: s.h.coat, name: s.h.name, mine: !!s.me,
          whip: s.me ? sim.t - whipAt : null, pose: s.me && poseAt != null ? (performance.now() - poseAt) / 1000 : null,
        };
      });
      const viewX = (j, k) => coast[j] ? coast[j].x : prev[j][0] + (sim.st[j].x - prev[j][0]) * k;
      // 着順を出す：模擬を最後まで進め（自分のゴールから数秒で止まる）、結果を作る
      function reveal() {
        if (!fin || fin.shown) return;
        let guard = 0;
        while (!sim.over && guard++ < 600) S.step(sim);
        fin.shown = performance.now();
        if (AU) AU.se(fin.pos === 1 ? 'rank1' : 'rank');
        if (RB) RB.fx(fin.pos === 1 ? 'win' : 'finish');
        kick({ dur: 360, hz: 5, ay: fin.pos === 1 ? 0.05 : 0.02, fov: fin.pos === 1 ? -2.5 : -1 });
        if (record && !recFx) {
          const first = sim.st.filter(s => s.done).sort((a, b) => a.finishT - b.finishT)[0];
          if (first) { const chk = HS.World.recordCheck(race, first.finishT, record); recFx = chk.beat ? Object.assign(chk, { at: performance.now() + 500, mine: !!first.me }) : { none: true }; if (recFx.beat && AU) setTimeout(() => AU.se('skill'), 500); }
        }
      }

      function frame(ts) {
        if (done) return;
        if (last == null) last = ts;
        const realDt = Math.min(0.1, (ts - last) / 1000);
        const now = performance.now();
        const dt = realDt * RD.speed * (now < slowUntil ? 0.15 : 1); last = ts;
        pollPad();
        laneHold(now);
        orbit.yaw -= (camRate.yaw || 0) * 2.2 * realDt;
        orbit.pitch = U.clamp(orbit.pitch + (camRate.pitch || 0) * 1.4 * realDt, -0.3, 1.2);
        look = padLook || ((lookKeys.e ? 1 : 0) - (lookKeys.q ? 1 : 0));
        lookNow += (look * Math.PI / 2 - lookNow) * Math.min(1, realDt * 8);
        if (paused) {
          // 止めている：時を進めず、絵と計器だけ描き直す（蹄の音も止める）
          if (AU && clock >= 0 && !sim.over) AU.raceUpdate(999, false, 0, 0);
        } else if (clock < 0) {
          const before = clock; clock += dt;
          // 数え（3・2・1）。音で拍子を刻み、開く瞬間に合わせられるように
          const n = Math.ceil(-clock);
          if (clock < 0 && n !== countShown && n <= 3) { countShown = n; if (AU) AU.se('count'); }
          if (before < 0 && clock >= 0) {
            if (AU) { AU.se('gate'); AU.raceStart(); } if (RB) RB.fx('gate'); say('START', 'go');
            kick({ dur: 450, hz: 6, ay: 0.04, fov: 2 });
            if (buffered) { buffered = false; doUp(); }
          }
        } else if (!sim.over) {
          acc += dt;
          let guard = 0;
          while (acc >= 0.1 && !sim.over && guard++ < 20) { prev = sim.st.map(s => [s.x, s.lane, s.v]); S.step(sim); acc -= 0.1; }
          clock = sim.t + acc;
          if (me.done && !fin) {
            // ゴール板：着順はまだ出さない。白い光・音・振動と、ほんの一瞬の溜め
            fin = { at: now, pos: sim.st.filter(s => s.done && s.finishT <= me.finishT).length, shown: null };
            slowUntil = now + 160;
            if (AU) AU.se('goal');
            if (RB) RB.fx('cross');
          }
          if (AU) { const lead = Math.max(...sim.st.map(s => s.x)); AU.raceUpdate(sim.D - lead, sim.D - lead < sim.straight, sim.st.filter(s => !s.done).length, sim.st.filter(s => s.done).length); }
        }
        const k = clock < 0 ? 0 : U.clamp(acc / 0.1, 0, 1);
        // 流す：ゴールした馬・止まったあとの馬は、映像の側で少しずつ速さを落とす（駈歩から常歩へ）
        for (let j = 0; j < sim.st.length && !paused; j++) {
          const s = sim.st[j];
          if (!coast[j] && (s.done || sim.over)) coast[j] = { x: viewX(j, k), v: s.v };
          if (coast[j]) { const c = coast[j]; c.v = Math.max(3.2, c.v - (c.v > 9 ? 2.4 : 1.1) * dt); c.x += c.v * dt; }
        }
        if (fin && !fin.shown && now - fin.at > RD.COOL * 1000) reveal();
        if (sim.over && !result) {
          result = S.finish(sim);
          if (AU) { AU.raceEnd(); AU.stopBgm(); }
        }
        if (fin && fin.shown && !fin.bar && result) {
          fin.bar = true;
          const bar = el.querySelector('.ride-pad');
          bar.classList.add('done');
          bar.innerHTML = (fin.pos === 1 ? '<button class="btn ride-pose">ガッツポーズ</button>' : '') + '<button class="btn gold ride-close">結果を見る</button>';
          bar.querySelector('.ride-close').onclick = () => finish();
          const pb = bar.querySelector('.ride-pose'); if (pb) pb.onclick = () => { poseAt = null; doPose(); };
        }
        // ぶつかった（js/core/racesim.js が付ける印。ctl.bumpT か me.bumpT＝ぶつかった時刻、bumpSide＝相手のいる向き -1・1）
        const bt = sim.ctl && sim.ctl.bumpT != null ? sim.ctl.bumpT : me.bumpT;
        if (bt != null && bt !== lastBump) {
          if (lastBump !== null || sim.t - bt < 0.5) {
            const sd = (sim.ctl && sim.ctl.bumpSide) || me.bumpSide || 1;
            kick({ dur: 380, hz: 10, ax: -sd * 0.09, ay: 0.03, roll: 0.012 });
            if (RB) RB.fx('bump'); if (AU) AU.se('bump');
            pings.push({ i: sim.me, t: now, col: '#ff5a4d' });
          }
          lastBump = bt;
        }
        // コントローラーの振動：自分の馬の蹄の拍子（js/ui/rumble.js）
        const meX = viewX(sim.me, k), meV = coast[sim.me] ? coast[sim.me].v : me.v;
        if (RB && clock >= 0 && !paused) RB.gallop(meX, me.r.num, meV, sim.ctl && !fin ? U.clamp(sim.ctl.gear + (me.spurting ? 0.4 : 0) + Math.max(0, me.fight || 0) / 200, 0, 1) : 0); // 気合が乗ると蹄の震えも強く
        const view = {
          t: clock, D: sim.D, surface: race.surface, ground: race.ground,
          course: { name: race.course, dir: course.dir, lap: sim.geo.lap, straight: sim.geo.straight, slope: sim.geo.slope },
          track: sim.track, me: sim.me, horses: lerpView(k), phase: clock < 0 ? 'gate' : me.done ? 'finish' : 'race',
        };
        ctx.clearRect(0, 0, VW, VH);
        const camMode = clock < 0 ? 'gate' : VIEWS[viewI][1];
        if (r3) {
          view.horses.forEach((h, j) => { if (sim.st[j].me && sim.ctl) h.push = fin ? 0 : U.clamp(sim.ctl.gear + (me.spurting ? 0.4 : 0), 0, 1); });
          // ゴールのあと：騎乗のカメラは少しずつ引いて、斜め横から馬を見る
          let o = { yaw: orbit.yaw + lookNow, pitch: orbit.pitch, zoom: orbit.zoom };
          if (fin && camMode === 'ride') {
            const u = ease((now - fin.at) / 1800);
            o = { yaw: o.yaw + u * (inward === 'L' ? -1.05 : 1.05), pitch: o.pitch + u * 0.04, zoom: o.zoom * (1 + 0.4 * u) };
          }
          o.shake = shakeNow(now);
          r3.render(view, camMode, o);
        } else if (HS.RideCam) HS.RideCam.draw(ctx, VW, VH, view); else fallback(view);
        hud(view, now);
        if (paused) pauseFx(now);
        requestAnimationFrame(frame);
      }
      function finish() {
        if (done) return;
        if (!result) { reveal(); while (!sim.over) S.step(sim); result = S.finish(sim); if (AU) { AU.raceEnd(); AU.stopBgm(); } }
        done = true;
        if (RB) RB.reset();
        if (r3) { r3.dispose(); r3 = null; }
        window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('resize', onResize); window.removeEventListener('blur', onBlur);
        if (modal) modal.classList.remove('ride-modal');
        resolve(result);
      }

      // ---------- 計器 ----------
      function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
      // 板：暗いガラスに金の細い線。角を1つ斜めに落とす（cut＝落とす角の大きさ）
      function glass(x, y, w, h, cut) {
        cut = cut == null ? 10 : cut;
        const path = () => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w - cut, y); ctx.lineTo(x + w, y + cut); ctx.lineTo(x + w, y + h); ctx.lineTo(x + cut, y + h); ctx.lineTo(x, y + h - cut); ctx.closePath(); };
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 3;
        const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, HUD.glass2); g.addColorStop(1, HUD.glass);
        ctx.fillStyle = g; path(); ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = HUD.line; ctx.lineWidth = 1; path(); ctx.stroke();
        // 上の縁のつや
        const sh = ctx.createLinearGradient(x, 0, x + w, 0); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.3, 'rgba(255,240,200,0.35)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = sh; ctx.beginPath(); ctx.moveTo(x + 2, y + 1.5); ctx.lineTo(x + w - cut, y + 1.5); ctx.stroke();
        ctx.restore();
      }
      function txt(s, x, y, font, col, align, base) { ctx.font = font; ctx.fillStyle = col; ctx.textAlign = align || 'left'; ctx.textBaseline = base || 'alphabetic'; ctx.fillText(s, x, y); }
      function outlined(s, x, y, font, col, align, lw) { ctx.font = font; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic'; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = lw || 5; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); }
      // 小さな英字の見出し（字間を空ける）
      function tag(s, x, y, col, align) {
        ctx.save(); ctx.font = `700 9px ${FONT}`; ctx.fillStyle = col || HUD.label; ctx.textBaseline = 'alphabetic';
        if ('letterSpacing' in ctx) { ctx.letterSpacing = '1.5px'; ctx.textAlign = align || 'left'; ctx.fillText(s, x, y); }
        else { ctx.textAlign = align || 'left'; ctx.fillText(s.split('').join(' '), x, y); }
        ctx.restore();
      }
      // 斜めの升（計器の目盛り）。lit＝光る色、glow＝光の強さ
      function cell(x, y, w, h, col, glow) {
        const sk = h * 0.35;
        ctx.beginPath(); ctx.moveTo(x + sk, y); ctx.lineTo(x + w + sk, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath();
        if (glow) { ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = glow; ctx.fillStyle = col; ctx.fill(); ctx.restore(); }
        else { ctx.fillStyle = col; ctx.fill(); }
        if (col !== HUD.off) { ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x + sk * 0.7, y + 1, w - 1, Math.max(1, h * 0.28)); }
      }

      function hud(view, now) {
        const c = sim.ctl;
        const order = orderNow();
        const rank = order.indexOf(me) + 1;
        const k = U.clamp(acc / 0.1, 0, 1);
        const meX = prev[sim.me][0] + (me.x - prev[sim.me][0]) * k;
        // 特殊能力の発動（自分の馬は真ん中に札、近くの馬はレーダーに印）
        while (fxSeen < sim.skillFx.length) {
          const f = sim.skillFx[fxSeen++];
          const label = HS.Skills ? HS.Skills.label(f.id) : f.id, bad = HS.Skills ? HS.Skills.isBad(f.id) : false;
          if (f.i === sim.me) { skillTag = { text: label, bad, t: now }; if (AU) AU.se('skill'); if (RB) RB.fx(bad ? 'bad' : 'skill'); }
          else if (Math.abs(sim.st[f.i].x - me.x) < 60) pings.push({ i: f.i, t: now, col: bad ? '#ff9a7a' : HUD.cyan });
        }
        if (sim.check && !paceShown) { paceShown = true; pace = { verdict: sim.check.verdict, t: now }; if (AU) AU.se('click'); }
        // 画面の効果（下から）：追い出した速さの筋・掛かりの赤い縁・競り合いの縁・ムチの光
        if (!fin && clock > 0) { speedLines(now); kakariEdge(now); }
        drawFight(now);
        drawWhip(now);
        if (clock < 0) countdown(now);
        else if (!fin) topLeft(rank, meX); // ゴールのあとは着順の表示まで順位を伏せる
        if (!fin || !fin.shown) { drawPace(now); timer(); radar(view, order, now); meters(c, now); }
        if (skillTag) drawSkill(skillTag, now);
        if (fin) finishFx(now);
        // 短い英語の合図（視点の名前・START など）
        if (flash && flash.text && now - flash.t < 1100) {
          const u = (now - flash.t) / 1100, a = Math.min(1, (1 - u) * 3), pop = 1 + 0.18 * Math.max(0, 1 - u * 8);
          ctx.save(); ctx.globalAlpha = a; ctx.translate(VW / 2, VH * (flash.cls === 'go' || flash.cls === 'good' || flash.cls === 'bad' ? 0.3 : 0.7)); ctx.scale(pop, pop);
          const big = flash.cls === 'go' || flash.cls === 'good' || flash.cls === 'bad';
          outlined(flash.text, 0, 0, `900 italic ${big ? 46 : 18}px ${FONT}`, flash.cls === 'bad' ? '#ffa48a' : big ? '#ffe9a6' : '#fff', 'center', big ? 7 : 4);
          ctx.restore();
        }
      }
      // ゲートの中：3・2・1 を真ん中に（毎秒ふくらんで縮む）
      function countdown(now) {
        const n = Math.ceil(-clock), u = n + clock; // u：その数字の残り（1→0）
        if (n > 3) return;
        const pop = 1 + 0.35 * Math.max(0, (u - 0.8) / 0.2);
        ctx.save(); ctx.globalAlpha = Math.min(1, u * 3); ctx.translate(VW / 2, VH * 0.36); ctx.scale(pop, pop);
        outlined(String(n), 0, 0, `900 italic 64px ${NUM}`, '#fff', 'center', 8);
        ctx.restore();
      }
      // 左上：順位と頭数、残りの帯（ハロンごとの目盛り）
      function topLeft(rank, meX) {
        const x = 16, y = 14, w = 232;
        glass(x, y, w, 70, 12);
        outlined(String(rank), x + 14, y + 52, `900 italic 50px ${NUM}`, rank === 1 ? '#ffd34d' : '#fff', 'left', 5);
        ctx.font = `900 italic 50px ${NUM}`;
        const rw = ctx.measureText(String(rank)).width;
        txt(ordinal(rank).replace(/^\d+/, ''), x + 18 + rw, y + 30, `800 italic 15px ${NUM}`, rank === 1 ? '#ffd34d' : '#fff');
        txt(`/${sim.st.length}`, x + 18 + rw, y + 52, `700 13px ${NUM}`, HUD.label);
        // 残り：数（m）と、スタートからゴールまでの帯
        const rem = Math.max(0, Math.ceil(sim.D - meX));
        const bx = x + 96, bw = w - 110, by = y + 46;
        txt(`${rem}`, x + w - 30, y + 30, `800 22px ${NUM}`, rem <= sim.straight ? '#ffe9a6' : '#fff', 'right');
        txt('m', x + w - 14, y + 30, `700 12px ${NUM}`, HUD.label, 'right');
        tag('TO GO', bx, y + 18, HUD.label);
        ctx.fillStyle = HUD.off; ctx.fillRect(bx, by, bw, 5);
        const st = U.clamp(1 - sim.straight / sim.D, 0, 1);
        ctx.fillStyle = 'rgba(242,217,142,0.28)'; ctx.fillRect(bx + bw * st, by, bw * (1 - st), 5); // 最後の直線
        const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#2f7f5a'); g.addColorStop(1, '#8ff0b4');
        const pr = U.clamp(meX / sim.D, 0, 1);
        ctx.fillStyle = g; ctx.fillRect(bx, by, bw * pr, 5);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        for (let m = 200; m < sim.D; m += 200) { const tx = bx + bw * (1 - m / sim.D); ctx.fillRect(tx, by, 1, 5); }
        ctx.save(); ctx.shadowColor = '#bfffd6'; ctx.shadowBlur = 8; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx + bw * pr, by + 2.5, 4, 0, TAU); ctx.fill(); ctx.restore();
      }
      // 右上：時計とレコード
      function timer() {
        const tw = 168, tx = VW - tw - 16, ty = 14;
        glass(tx, ty, tw, 46, 10);
        tag('TIME', tx + 12, ty + 19);
        const t = clock > 0 ? Math.min(clock, me.done ? me.finishT : 999) : 0;
        txt(U.time(t), tx + tw - 12, ty + 24, `800 20px ${NUM}`, record && me.done && me.finishT < record.t ? '#ff7a6a' : '#fff', 'right');
        tag('RECORD', tx + 12, ty + 38);
        txt(record ? U.time(record.t) : '－', tx + tw - 12, ty + 39, `700 12px ${NUM}`, HUD.gold, 'right');
      }
      // 上の真ん中：ペースの目盛り。判定の前は白抜きの印（逃げ馬の数からの見込み）、判定のあとは光る印と短い英語
      const nNige = sim.st.filter(s => s.h.style === '逃げ').length;
      const guess = nNige >= 2 ? 'ハイペース' : nNige === 0 ? 'スローペース' : '平均ペース';
      const paceCol = v => v === 'ハイペース' ? '#ff8a6a' : v === 'スローペース' ? '#7fc8ff' : '#ffe9a6';
      function drawPace(now) {
        if (clock < 0 || me.done) return;
        const bw = narrow ? 200 : 240, bx = VW / 2 - bw / 2, by = 14, h = 40;
        const fresh = pace ? Math.max(0, 1 - (now - pace.t) / 900) : 0;
        glass(bx, by, bw, h, 8);
        tag('PACE', bx + 12, by + 17);
        const v = pace ? pace.verdict : guess;
        ctx.save(); if (fresh > 0) { ctx.shadowColor = paceCol(v); ctx.shadowBlur = 16 * fresh; }
        txt(pace ? PACE_EN[v] || v : `${PACE_EN[v] || v}?`, bx + bw - 12, by + 18, `900 italic ${14 + 6 * fresh}px ${NUM}`, pace ? paceCol(v) : 'rgba(255,255,255,0.55)', 'right');
        ctx.restore();
        const gx = bx + 14, gw = bw - 28, gy = by + 27;
        const grd = ctx.createLinearGradient(gx, 0, gx + gw, 0); grd.addColorStop(0, '#7fc8ff'); grd.addColorStop(0.5, '#ffe9a6'); grd.addColorStop(1, '#ff8a6a');
        ctx.globalAlpha = pace ? 1 : 0.45; ctx.fillStyle = grd; ctx.fillRect(gx, gy, gw, 4); ctx.globalAlpha = 1;
        const kx = gx + gw * (pace ? U.clamp((sim.paceF - 0.982) / 0.036, 0, 1) : v === 'ハイペース' ? 0.8 : v === 'スローペース' ? 0.2 : 0.5);
        ctx.beginPath(); ctx.moveTo(kx, gy - 1); ctx.lineTo(kx - 5, gy - 8); ctx.lineTo(kx + 5, gy - 8); ctx.closePath();
        if (pace) { ctx.fillStyle = '#fff'; ctx.fill(); } else { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke(); }
      }
      // 追い出したら、画面の端に速さの筋（速いほど濃く）
      function speedLines(now) {
        if (!me.spurting) return;
        const sp = U.clamp((me.v / me.vc - 0.98) / 0.1, 0, 1);
        if (sp <= 0.05) return;
        ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
        const cx = VW / 2, cy = VH * 0.46;
        for (let i = 0; i < 26; i++) {
          const a = i / 26 * TAU + 0.11, ph = ((now / 260) + (i * 0.618) % 1) % 1;
          const r0 = Math.max(VW, VH) * (0.42 + ph * 0.5), r1 = r0 + 40 + 50 * sp;
          ctx.globalAlpha = 0.16 * sp * (1 - ph);
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.62); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.62); ctx.stroke();
        }
        ctx.restore();
      }
      // 掛かっている間：画面の縁がゆっくり赤く脈打つ
      function kakariEdge(now) {
        const c = sim.ctl; if (!c || !c.kakariNow) return;
        const a = 0.18 + 0.12 * Math.sin(now / 240);
        const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.45, VW / 2, VH / 2, VW * 0.65);
        g.addColorStop(0, 'rgba(255,60,40,0)'); g.addColorStop(1, `rgba(255,60,40,${a})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      }
      // 競り合いの気合（js/core/racesim.js の S.FIGHT）。画面の縁の光と、気合が上がりきった瞬間の FIGHT
      let fightFx = null, fightArmed = true, fightPrev = 0;
      function drawFight(now) {
        const f = me.fight || 0;
        if (!me.done && f >= 50 && fightArmed && f > fightPrev) {
          fightArmed = false; fightFx = { t: now };
          if (AU) AU.se('fight'); if (RB) RB.fx('fight');
          kick({ dur: 420, hz: 9, ax: 0.03, ay: 0.03, fov: 1.5 });
        }
        if (f < 25) fightArmed = true;
        fightPrev = f;
        // 縁の光：競り合っていて気合が上がっているほど強く、拍子をつけて脈打つ
        if (!me.done && f > 15 && me.duel) {
          const k = U.clamp((f - 10) / 60, 0, 1), pulse = 0.6 + 0.4 * Math.sin(now / 110);
          ctx.save();
          const side = me.duel.lane > me.lane === (course.dir !== '左') ? 0 : 1; // 相手のいる側を強く（内ラチが右の回りなら、外は左）
          for (const [x0, strong] of [[0, side === 0], [VW, side === 1]]) {
            const gw = VW * (strong ? 0.2 : 0.1);
            const g = ctx.createLinearGradient(x0, 0, x0 === 0 ? gw : VW - gw, 0);
            g.addColorStop(0, `rgba(255,${Math.round(120 + 80 * k)},40,${(strong ? 0.5 : 0.25) * k * pulse})`); g.addColorStop(1, 'rgba(255,140,40,0)');
            ctx.fillStyle = g; ctx.fillRect(x0 === 0 ? 0 : VW - gw, 0, gw, VH);
          }
          ctx.restore();
        }
        if (fightFx) {
          const age = now - fightFx.t;
          if (age > 1100) { fightFx = null; return; }
          const a = age < 120 ? age / 120 : age > 800 ? (1100 - age) / 300 : 1, sc = 1 + 0.25 * Math.max(0, 1 - age / 180);
          ctx.save(); ctx.globalAlpha = a;
          ctx.translate(VW / 2, VH * 0.25); ctx.scale(sc, sc);
          outlined('FIGHT', 0, 0, `900 italic 40px ${NUM}`, '#ffb347', 'center', 7);
          ctx.restore();
        }
      }
      // ムチ：打った側の端から短い光の筋（画面は揺らさない。カメラがほんの少し押されるだけ）
      function drawWhip(now) {
        if (!whipFx) return;
        const age = now - whipFx.t;
        if (age > 380) { whipFx = null; return; }
        const right = whipFx.side === 'R', u = age / 380, k = (1 - u) * (1 - u);
        ctx.save(); ctx.globalAlpha = 0.55 * k; ctx.strokeStyle = whipFx.zone ? '#fff3b0' : '#ffd0bf'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
          const y = VH * (0.34 + i * 0.06), x0 = right ? VW : 0, len = VW * (0.07 + (i % 3) * 0.025) * ease(Math.min(1, age / 90));
          ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(right ? x0 - len : x0 + len, y - 6); ctx.stroke();
        }
        ctx.restore();
      }
      // 発動の札：真ん中に大きく出て（集中線・縁の光）、0.8 秒で右上へ退いて残る。得なものは水色、損なものは赤茶
      function drawSkill(tag, now) {
        const age = now - tag.t;
        if (age > 2600) { skillTag = null; return; }
        if (age < 600) {
          const k = 1 - age / 600;
          ctx.save(); ctx.globalAlpha = 0.45 * k; ctx.strokeStyle = tag.bad ? '#ffb199' : '#e6fbff'; ctx.lineWidth = 2;
          const cx = VW / 2, cy = VH * 0.48;
          for (let i = 0; i < 36; i++) {
            const a = i / 36 * TAU + (i % 3) * 0.05, r0 = Math.min(VW, VH) * (0.34 + 0.08 * ((i * 7) % 5) / 5), r1 = Math.max(VW, VH);
            ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
          }
          ctx.strokeStyle = tag.bad ? 'rgba(255,120,90,0.8)' : 'rgba(120,220,255,0.85)'; ctx.globalAlpha = k; ctx.lineWidth = 8 * k + 2; ctx.strokeRect(4, 4, VW - 8, VH - 8);
          ctx.restore();
        }
        // 位置：はじめは真ん中の上（大きく）、0.8〜1.1 秒で右上の時計の下へ
        const m = ease((age - 800) / 300), pop = 1 + 0.3 * Math.max(0, 1 - age / 140);
        const w = 250, cx0 = VW / 2, cy0 = VH * 0.2, cx1 = VW - 16 - w / 2 * 0.8, cy1 = 84;
        const sc = (1.15 - 0.35 * m) * pop, cx = cx0 + (cx1 - cx0) * m, cy = cy0 + (cy1 - cy0) * m;
        const a = Math.min(1, age / 80, (2600 - age) / 300);
        ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, cy); ctx.scale(sc, sc);
        const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
        if (tag.bad) { g.addColorStop(0, '#6e2a1e'); g.addColorStop(1, '#a8452f'); } else { g.addColorStop(0, '#16759f'); g.addColorStop(1, '#4fc8f5'); }
        ctx.shadowColor = tag.bad ? '#ff7a5a' : '#7fe6ff'; ctx.shadowBlur = 18;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(-w / 2 + 12, -18); ctx.lineTo(w / 2, -18); ctx.lineTo(w / 2 - 12, 18); ctx.lineTo(-w / 2, 18); ctx.closePath(); ctx.fill();
        ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.2; ctx.stroke();
        horseIcon(-w / 2 + 26, 1, tag.bad ? '#ffd9cf' : '#fff');
        outlined(tag.text, 8, 7, `900 19px ${FONT}`, '#fff', 'center', 4);
        ctx.restore();
      }
      function horseIcon(x, y, col) {
        ctx.save(); ctx.translate(x, y); ctx.fillStyle = col;
        ctx.beginPath(); ctx.ellipse(0, 0, 9, 4.5, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(13, -9); ctx.lineTo(15, -7); ctx.lineTo(9, 1); ctx.fill();
        ctx.lineWidth = 1.6; ctx.strokeStyle = col;
        [[-6, 1, -10, 9], [-3, 2, -1, 9], [5, 2, 8, 9], [7, 1, 12, 7]].forEach(([a, b, c, d]) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); });
        ctx.restore();
      }
      // ゴールのあと：ゴール板で白く光り、流している間は何も出さない。着順は大きく叩きつけるように出し、時計と上がりを添える
      function finishFx(now) {
        const age = now - fin.at;
        if (age < 260) { ctx.fillStyle = `rgba(255,255,255,${0.35 * (1 - age / 260)})`; ctx.fillRect(0, 0, VW, VH); }
        if (!fin.shown) {
          // 流している間：下に細い帯で「次へ」の手がかりだけ
          const a = U.clamp((age - 600) / 400, 0, 0.8);
          if (a > 0) { ctx.globalAlpha = a; txt('[A] SKIP  ▶', VW / 2, VH - 16, `800 12px ${NUM}`, '#fff', 'center'); ctx.globalAlpha = 1; }
          return;
        }
        const t = now - fin.shown, u = ease(t / 220), win = fin.pos === 1;
        // 帯
        const by = VH * 0.36;
        // 帯：横に走る暗いガラスと金の細い線（左右から伸びる）
        ctx.save();
        const bw = VW * u, b0 = by - 66, bh = 130;
        const band = ctx.createLinearGradient(0, b0, 0, b0 + bh);
        band.addColorStop(0, win ? 'rgba(70,46,0,0.55)' : 'rgba(4,14,10,0.55)'); band.addColorStop(0.5, win ? 'rgba(90,60,0,0.82)' : 'rgba(5,16,11,0.82)'); band.addColorStop(1, win ? 'rgba(70,46,0,0.55)' : 'rgba(4,14,10,0.55)');
        ctx.fillStyle = band; ctx.fillRect(VW / 2 - bw / 2, b0, bw, bh);
        ctx.fillStyle = win ? '#ffd34d' : HUD.line; ctx.fillRect(VW / 2 - bw / 2, b0, bw, 1.5); ctx.fillRect(VW / 2 - bw / 2, b0 + bh - 1.5, bw, 1.5);
        ctx.restore();
        if (t < 140) { ctx.fillStyle = `rgba(255,255,255,${0.4 * (1 - t / 140)})`; ctx.fillRect(0, 0, VW, VH); }
        const sc = 1 + 0.8 * (1 - u);
        ctx.save(); ctx.globalAlpha = Math.min(1, t / 90); ctx.translate(VW / 2, by + 12); ctx.scale(sc, sc);
        if (win) { ctx.shadowColor = '#ffcf4d'; ctx.shadowBlur = 24; }
        outlined(ordinal(fin.pos), 0, 0, `900 italic ${win ? 86 : 70}px ${NUM}`, win ? '#ffd34d' : '#fff', 'center', 9);
        ctx.restore();
        const a2 = U.clamp((t - 200) / 250, 0, 1);
        ctx.globalAlpha = a2;
        txt(`TIME ${U.time(me.finishT)}　LAST 3F ${me.t600 != null ? (me.finishT - me.t600).toFixed(1) : '－'}`, VW / 2, by + 38, `800 16px ${NUM}`, '#fff', 'center');
        txt(win && poseAt == null ? '[A] NEXT    [Y] POSE' : '[A] NEXT', VW / 2, by + 58, `800 12px ${NUM}`, '#ffe9a6', 'center');
        ctx.globalAlpha = 1;
        if (recFx && recFx.beat && now > recFx.at) drawRecord(recFx, now);
      }
      // 一時停止の幕
      function pauseFx(now) {
        const a = Math.min(1, (now - pausedAt) / 150);
        ctx.fillStyle = `rgba(2,8,6,${0.55 * a})`; ctx.fillRect(0, 0, VW, VH);
        ctx.globalAlpha = a;
        outlined('PAUSE', VW / 2, VH * 0.44, `900 italic 52px ${NUM}`, '#fff', 'center', 7);
        txt('[START] / [ESC]  RESUME', VW / 2, VH * 0.44 + 34, `800 13px ${NUM}`, '#ffe9a6', 'center');
        ctx.globalAlpha = 1;
      }
      // RECORD の札（着順の表示のあと。合図なので英語）：上寄りに、光の帯と差
      function drawRecord(f, now) {
        const a = U.clamp((now - f.at) / 350, 0, 1), y = VH * 0.16;
        const pulse = 0.75 + 0.25 * Math.sin(now / 160);
        ctx.save(); ctx.globalAlpha = a;
        const g = ctx.createLinearGradient(0, y - 34, 0, y + 30); g.addColorStop(0, 'rgba(255,90,60,0)'); g.addColorStop(0.5, `rgba(200,30,20,${0.55 * pulse})`); g.addColorStop(1, 'rgba(255,90,60,0)');
        ctx.fillStyle = g; ctx.fillRect(0, y - 34, VW, 64);
        outlined('RECORD', VW / 2, y + 8, `900 italic ${Math.round(40 + 14 * (1 - a))}px ${NUM}`, '#ffe08a', 'center', 7);
        txt(`${U.time(f.t)}　${UI_DIFF(f.diff)}`, VW / 2, y + 30, `bold 15px ${FONT}`, '#fff', 'center');
        ctx.restore();
      }
      // 左下の計器：丸い計器（外の輪＝速さ・内の輪＝気性・真ん中＝時速）と、その右に手綱の段・スタミナ・気合・ムチの手
      function meters(c, now) {
        const R = 56, cx = 18 + R, cy = VH - 18 - R;
        // 右の板
        const px = cx + 20, pw = 318, ph = 92, py = cy - ph / 2 + 8;
        glass(px, py, pw, ph, 12);
        dial(c, cx, cy, R, now);
        const x0 = cx + R + 10;
        rein(c, x0, py + 12, ph - 24, now);
        const bx = x0 + 30;
        stamina(bx, py + 10, now);
        fightMeter(bx, py + 50, now);
        whipHand(c, bx + 190, py + 50, now);
      }
      // 丸い計器
      function dial(c, cx, cy, R, now) {
        const kakari = c.kakariNow, spurt = me.spurting && !me.done;
        ctx.save();
        // 盤
        ctx.shadowColor = kakari ? `rgba(255,70,50,${0.6 + 0.4 * Math.sin(now / 120)})` : spurt ? 'rgba(255,214,90,0.7)' : 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = kakari || spurt ? 22 : 14;
        const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.4, R * 0.1, cx, cy, R);
        g.addColorStop(0, 'rgba(34,58,46,0.96)'); g.addColorStop(1, 'rgba(5,13,10,0.94)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = kakari ? '#ff6a4d' : HUD.line; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R - 0.5, 0, TAU); ctx.stroke();
        // 外の輪：速さ（巡航の速さが金の目盛り。下が空いた 270°）
        const a0 = Math.PI * 0.75, sweep = Math.PI * 1.5, N = 30;
        const f = U.clamp((me.v / me.vc - 0.85) / 0.27, 0, 1), cruise = (1 - 0.85) / 0.27;
        const lit = Math.round(f * N);
        for (let i = 0; i < N; i++) {
          const a = a0 + sweep * (i + 0.5) / N, r0 = R - 11, r1 = R - 4;
          const over = i / N >= cruise;
          ctx.strokeStyle = i < lit ? (over ? (spurt ? '#ffe9a6' : HUD.cyan) : '#3a9cf0') : HUD.off;
          ctx.lineWidth = 3.4;
          if (i < lit && over) { ctx.shadowColor = spurt ? '#ffd34d' : HUD.cyan; ctx.shadowBlur = 8; } else ctx.shadowBlur = 0;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
        }
        ctx.shadowBlur = 0;
        const ac = a0 + sweep * cruise; // 巡航の印
        ctx.strokeStyle = HUD.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(ac) * (R - 13), cy + Math.sin(ac) * (R - 13)); ctx.lineTo(cx + Math.cos(ac) * (R - 1), cy + Math.sin(ac) * (R - 1)); ctx.stroke();
        // 内の輪：気性（青＝落ち着き → 緑 → 金 → 赤＝掛かり）。いまの所に光る玉
        const ri = R - 19, segs = [[0, 0.35, HUD.calm], [0.35, 0.55, HUD.good], [0.55, 0.75, HUD.warn], [0.75, 1, HUD.bad]];
        const tv = U.clamp(c.tension / 100, 0, 1);
        ctx.lineCap = 'butt'; ctx.lineWidth = 4;
        for (const [s0, s1, col] of segs) {
          ctx.strokeStyle = col; ctx.globalAlpha = kakari && s0 >= 0.75 ? 0.7 + 0.3 * Math.sin(now / 90) : 0.3;
          ctx.beginPath(); ctx.arc(cx, cy, ri, a0 + sweep * s0 + 0.02, a0 + sweep * s1 - 0.02); ctx.stroke();
          if (tv > s0) { ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(cx, cy, ri, a0 + sweep * s0 + 0.02, a0 + sweep * Math.min(tv, s1) - 0.02 + (tv < s1 ? 0.02 : 0)); ctx.stroke(); }
        }
        ctx.globalAlpha = 1;
        const at = a0 + sweep * tv, tcol = tv < 0.35 ? HUD.calm : tv < 0.55 ? HUD.good : tv < 0.75 ? HUD.warn : HUD.bad;
        ctx.shadowColor = tcol; ctx.shadowBlur = 10; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(cx + Math.cos(at) * ri, cy + Math.sin(at) * ri, 3.6, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0;
        // 真ん中：時速
        const kmh = Math.round((coast[sim.me] ? coast[sim.me].v : me.v) * 3.6);
        txt(String(kmh), cx, cy + 8, `900 italic 26px ${NUM}`, spurt ? '#ffe9a6' : '#fff', 'center');
        tag('km/h', cx, cy + 22, HUD.label, 'center');
        // 下の空き：ムチの効き（打つほど薄く）を小さな点で
        ctx.restore();
      }
      // 手綱の段：上に ▲ 4つ（しごく）、下に ▼ 4つ（引く）。押した瞬間に光る
      function rein(c, x, y, h, now) {
        const mid = y + h / 2, g = c.gear, n = g > 0.05 ? Math.ceil(g * 4) : g < -0.05 ? Math.ceil(-g * 4) : 0;
        const upF = Math.max(0, 1 - (now - upFx) / 220), dnF = Math.max(0, 1 - (now - downFx) / 220);
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x, mid - 0.5, 16, 1);
        for (let i = 0; i < 4; i++) {
          for (const up of [true, false]) {
            const on = up ? g > 0.05 && i < n : g < -0.05 && i < n;
            const yy = up ? mid - 6 - i * 9 : mid + 6 + i * 9;
            const col = on ? (up ? '#ffd34d' : '#7fc8ff') : 'rgba(255,255,255,0.13)';
            const fl = up ? upF : dnF;
            ctx.save();
            if (on || fl > 0) { ctx.shadowColor = up ? '#ffd34d' : '#7fc8ff'; ctx.shadowBlur = 6 + 10 * fl; }
            ctx.fillStyle = on ? col : fl > 0 && i === 0 ? `rgba(255,255,255,${0.2 + 0.6 * fl})` : col;
            ctx.beginPath();
            if (up) { ctx.moveTo(x + 8, yy - 5); ctx.lineTo(x + 16, yy + 2); ctx.lineTo(x + 12, yy + 2); ctx.lineTo(x + 8, yy - 1.5); ctx.lineTo(x + 4, yy + 2); ctx.lineTo(x, yy + 2); }
            else { ctx.moveTo(x + 8, yy + 5); ctx.lineTo(x + 16, yy - 2); ctx.lineTo(x + 12, yy - 2); ctx.lineTo(x + 8, yy + 1.5); ctx.lineTo(x + 4, yy - 2); ctx.lineTo(x, yy - 2); }
            ctx.closePath(); ctx.fill(); ctx.restore();
          }
        }
      }
      // スタミナ：8つの斜めの升。減るほど緑→金→赤、残り2つで点滅、空なら赤い枠だけ
      let staPrev = 8, staLost = null;
      function stamina(x, y, now) {
        tag('STAMINA', x, y + 8);
        const nB = me.E <= 0 ? 0 : Math.ceil(U.clamp(me.E, 0, 1) * 8);
        if (nB < staPrev) staLost = { i: nB, t: now };
        staPrev = nB;
        const col = nB <= 2 ? HUD.bad : nB <= 4 ? HUD.warn : HUD.good;
        const blink = nB <= 2 && !me.done ? 0.55 + 0.45 * Math.sin(now / 110) : 1;
        for (let i = 0; i < 8; i++) {
          const cx = x + i * 27, cy = y + 13;
          if (i < nB) { ctx.globalAlpha = blink; cell(cx, cy, 23, 17, col, 6); ctx.globalAlpha = 1; }
          else cell(cx, cy, 23, 17, HUD.off);
        }
        // 1つ減った瞬間：その升が白く光って消える
        if (staLost && now - staLost.t < 380) {
          const u = (now - staLost.t) / 380;
          ctx.globalAlpha = 1 - u; cell(x + staLost.i * 27, y + 13 - u * 4, 23, 17, '#fff', 12); ctx.globalAlpha = 1;
        }
        if (nB === 0 && !me.done) { ctx.strokeStyle = `rgba(255,90,77,${0.5 + 0.5 * Math.sin(now / 90)})`; ctx.lineWidth = 1.5; ctx.strokeRect(x - 2, y + 11, 8 * 27 + 4, 21); }
      }
      // 気合（12の目盛り）。上がっている間は橙から金に燃え、火の粉が立つ。ひるむと青く沈む
      function fightMeter(x, y, now) {
        const f = me.fight || 0, rising = !!me.duel && f > 0;
        tag('FIGHT', x, y + 8, f >= 50 ? '#ffb347' : HUD.label);
        const n = 12, bw = 11, gap = 3, y0 = y + 13;
        const lit = f > 0 ? Math.ceil(f / 100 * n) : 0;
        for (let i = 0; i < n; i++) {
          const bx = x + i * (bw + gap);
          if (i < lit) {
            const k = i / (n - 1);
            ctx.globalAlpha = rising ? 0.75 + 0.25 * Math.sin(now / 60 + i * 1.7) : 1;
            cell(bx, y0, bw, 10, k < 0.5 ? '#ff7a2e' : k < 0.85 ? '#ffb347' : '#ffe9a6', 6);
            ctx.globalAlpha = 1;
          } else cell(bx, y0, bw, 10, HUD.off);
        }
        if (rising && lit) {
          for (let j = 0; j < 7; j++) {
            const ph = ((now / 700) + j * 0.37) % 1, px = x + ((j * 47) % (lit * (bw + gap))) + Math.sin(now / 200 + j) * 2;
            ctx.globalAlpha = (1 - ph) * 0.9; ctx.fillStyle = j % 2 ? '#ffd34d' : '#ff8a3d';
            ctx.beginPath(); ctx.arc(px, y0 - 2 - ph * 14, 1.6 + (1 - ph) * 1.2, 0, TAU); ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
        if (f < 0) { ctx.fillStyle = 'rgba(110,160,230,0.85)'; ctx.fillRect(x, y0, n * (bw + gap) * (-f / 100), 10); }
      }
      // ムチの手：L・R の札（持っている手が光る。持ち替えの間は点滅）と、打った数の点（効きが落ちるほど暗く）
      function whipHand(c, x, y, now) {
        tag('WHIP', x, y + 8);
        const swapping = sim.t < c.swapUntil;
        for (const [hand, dx] of [['L', 0], ['R', 22]]) {
          const on = c.hand === hand;
          const a = swapping ? 0.4 + 0.6 * Math.abs(Math.sin(now / 60)) : 1;
          ctx.globalAlpha = on ? a : 1;
          ctx.fillStyle = on ? '#ffd34d' : HUD.off; rr(x + dx, y + 12, 19, 18, 4); ctx.fill();
          txt(hand, x + dx + 9.5, y + 25, `900 12px ${NUM}`, on ? '#2a2000' : 'rgba(255,255,255,0.4)', 'center');
          ctx.globalAlpha = 1;
        }
        const eff = S.whipEff ? S.whipEff(c) : 1;
        for (let i = 0; i < Math.min(12, c.whips); i++) { ctx.fillStyle = `rgba(255,${Math.round(150 + 100 * eff)},${Math.round(100 * eff)},${0.35 + 0.65 * eff})`; ctx.fillRect(x + (i % 6) * 7, y + 34 + Math.floor(i / 6) * 5, 5, 3); }
      }
      // 縦長の馬群レーダー：上が前。紫が自分、白い輪が照準。内ラチは回る向きの側。
      // 脇の金の括弧＝この馬の得意な位置（脚質）。前の馬に塞がれていると自分の印の前に赤い線。近くの馬の特殊能力は輪が広がる
      function radar(view, order, now) {
        const w = 70, h = Math.min(290, VH * 0.5), bx = VW - w - 16, by = 72 + 40;
        glass(bx, by, w, h + 30, 10);
        const live = view.horses;
        let top = -1e9, bot = 1e9;
        live.forEach(hh => { top = Math.max(top, hh.x); bot = Math.min(bot, hh.x); });
        const span = Math.max(40, top - bot + 6);
        const LANES = 10;
        const inner = course.dir === '左' ? 'left' : 'right';
        const laneX = l => { const k = U.clamp(l, -0.4, LANES) / LANES * (w - 20); return inner === 'right' ? bx + w - 10 - k : bx + 10 + k; };
        const yOf = x => by + 10 + (top + 3 - x) / span * (h - 14);
        ctx.strokeStyle = 'rgba(232,232,232,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); const rx = laneX(-0.4); ctx.moveTo(rx, by + 6); ctx.lineTo(rx, by + h); ctx.stroke();
        // 得意な位置の括弧（自由自在は出さない）
        if (!HS.Horse.has(me.h, 'jiyu')) {
          const si = STYLES.indexOf(me.h.style);
          if (si >= 0 && order.length > 1) {
            const n = order.length, a = order[Math.min(n - 1, Math.floor(n * si / 4))], b = order[Math.min(n - 1, Math.ceil(n * (si + 1) / 4) - 1)];
            const ya = yOf(live[a.i].x) - 4, yb = yOf(live[b.i].x) + 4, ex = inner === 'right' ? bx + 4 : bx + w - 4;
            const inZone = order.indexOf(me) >= order.indexOf(a) && order.indexOf(me) <= order.indexOf(b);
            const d = inner === 'right' ? 4 : -4;
            ctx.fillStyle = inZone ? 'rgba(255,211,77,0.16)' : 'rgba(242,217,142,0.07)'; ctx.fillRect(bx + 2, ya, w - 4, yb - ya);
            ctx.save(); if (inZone) { ctx.shadowColor = '#ffd34d'; ctx.shadowBlur = 8; }
            ctx.strokeStyle = inZone ? '#ffd34d' : 'rgba(242,217,142,0.5)'; ctx.lineWidth = inZone ? 2.5 : 1.5;
            ctx.beginPath(); ctx.moveTo(ex + d, ya); ctx.lineTo(ex, ya); ctx.lineTo(ex, yb); ctx.lineTo(ex + d, yb); ctx.stroke(); ctx.restore();
          }
        }
        live.forEach((hh, j) => {
          const x = laneX(hh.lane), y = yOf(hh.x), isMe = j === view.me;
          ctx.fillStyle = isMe ? '#b45cff' : hh.cap;
          if (isMe) { ctx.save(); ctx.shadowColor = '#d9a8ff'; ctx.shadowBlur = 8; }
          ctx.fillRect(x - 3.5, y - 5, 7, 10);
          if (isMe) ctx.restore();
          ctx.strokeStyle = isMe ? '#fff' : 'rgba(0,0,0,0.6)'; ctx.lineWidth = isMe ? 1.5 : 1; ctx.strokeRect(x - 3.5, y - 5, 7, 10);
          if (me.duel && j === me.duel.i && (me.fight || 0) > 15) { ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.stroke(); }
          if (j === target && !isMe) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.stroke(); }
          if (isMe && sim.ctl && sim.ctl.blockedNow && !me.done) { ctx.fillStyle = `rgba(255,90,77,${0.6 + 0.4 * Math.sin(now / 100)})`; ctx.fillRect(x - 6, y - 9, 12, 2.5); }
        });
        // 印の輪
        for (let i = pings.length - 1; i >= 0; i--) {
          const p = pings[i], u = (now - p.t) / 900;
          if (u >= 1) { pings.splice(i, 1); continue; }
          const hh = live[p.i];
          ctx.strokeStyle = p.col; ctx.globalAlpha = 1 - u; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(laneX(hh.lane), yOf(hh.x), 4 + 12 * u, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
        }
        const tg = sim.st[target];
        const kk = order.indexOf(tg) + 1;
        txt(fin ? `#${tg.r.num}` : `#${tg.r.num}  ${ordinal(kk)}`, bx + w / 2, by + h + 12, `800 11px ${NUM}`, target === sim.me ? '#d9a8ff' : '#fff', 'center', 'middle');
        txt(tg.h.name.length > 5 ? tg.h.name.slice(0, 5) + '…' : tg.h.name, bx + w / 2, by + h + 24, `10px ${FONT}`, HUD.label, 'center', 'middle');
      }
      // 映像が使えないときの簡単な絵（上から見た図を大きく）
      function fallback(view) {
        ctx.fillStyle = view.surface === 'ダ' ? '#8a6a45' : '#2f6b2a'; ctx.fillRect(0, 0, VW, VH);
        const meH = view.horses[view.me];
        view.horses.forEach(h => {
          const dx = (h.x - meH.x) * 6, dy = (h.lane - meH.lane) * 26;
          const x = VW / 2 + dy, y = VH * 0.7 - dx;
          if (y < -20 || y > VH + 20) return;
          ctx.fillStyle = h.silks.base; ctx.fillRect(x - 10, y - 14, 20, 28);
          ctx.fillStyle = h.cap; ctx.beginPath(); ctx.arc(x, y - 18, 6, 0, TAU); ctx.fill();
        });
      }
      requestAnimationFrame(frame);
    });
  };
})();
