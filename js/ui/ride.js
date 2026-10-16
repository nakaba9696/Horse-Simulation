// 騎乗の画面：自分の馬の映像（3D は js/ui/race3d.js、使えなければ js/ui/ridecam.js）に計器を重ね、
// タッチのボタン・ゲームパッド・キーボードで「しごく・引く・進路・左右のムチ・持ち替え」を操作する。
// 計器の置き方：左上に順位と残り、上の真ん中に地点のペース、右上にコースレコードと時計、右に縦長の馬群レーダーと照準の馬、
// 左下にスタミナ（8つ）・速さ・脚質の矢印・気性。特殊能力が発動したら、右上に札と集中線
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, S = HS.Sim;
  const RD = HS.Ride = {};
  RD.speed = 1; // 確かめ用に速く進める倍率
  const FC = () => HS.DATA.frameColors, FT = () => HS.DATA.frameText;
  const FONT = '"Noto Sans JP", sans-serif';

  // ゲームパッド（標準の並び）：十字の上＝しごく・下＝引く・左右＝進路、B＝右ムチ、X＝左ムチ、A＝持ち替え、Y＝ガッツポーズ、
  // LT・RT＝左右を向く、LB・RB＝レーダーの照準、Back＝視点
  const PAD = { up: [12], down: [13], left: [14], right: [15], whipR: [1], whipL: [2], swap: [0], pose: [3], lookL: [6], lookR: [7], tgtPrev: [4], tgtNext: [5], view: [8] };
  const STYLES = ['逃げ', '先行', '差し', '追込'];

  // card：W.cards() の1レース。戻り値：S.finish の結果（Promise）
  RD.ride = function (el, card, opts) {
    opts = opts || {};
    return new Promise(resolve => {
      const race = card.race;
      const sim = HS.World.startSim(card, { ride: true });
      RD.cur = sim; // 確かめ用（いま走っているレース）
      const me = sim.st[sim.me];
      const course = HS.DATA.courses[race.course] || HS.DATA.courses['東京'];
      el.innerHTML = `
        <div class="ride">
          <div class="ride-stage"><canvas class="ride-3d"></canvas><canvas class="ride-canvas"></canvas>
            <div class="ride-msg"></div><button class="cam-btn" aria-label="視点を変える">🎥 視点</button></div>
          <div class="ride-pad">
            <div class="pad-l">
              <button class="rb up" data-c="up">▲<small>しごく（連打）</small></button>
              <div class="pad-row"><button class="rb lane" data-c="left" aria-label="左へ">◀</button><button class="rb down" data-c="down">▼<small>引く</small></button><button class="rb lane" data-c="right" aria-label="右へ">▶</button></div>
            </div>
            <button class="rb swap" data-c="swap">持ち替え</button>
            <div class="pad-r">
              <button class="rb whip" data-c="whipL">左ムチ<small>${S.dirOf(sim) === '左' ? '外へ寄る' : '内へ寄る'}</small></button>
              <button class="rb whip" data-c="whipR">右ムチ<small>${S.dirOf(sim) === '左' ? '内へ寄る' : '外へ寄る'}</small></button>
            </div>
          </div>
          <div class="ride-help small muted">十字キー：↑しごく（連打が速いほど速く）・↓引く・←→進路　B 右ムチ・X 左ムチ（直線で打つともうひと伸び。続けて打つと風車ムチ。馬はムチと反対の側へ寄る）・A 持ち替え（持っていない手のムチを押すと、まず持ち替える）　LT/RT 左右を見る・LB/RB 照準・Back 視点・Y ガッツポーズ<br>キーボード：↑↓←→・X 右ムチ・Z 左ムチ・C 持ち替え・Q/E 左右を見る・A/S 照準・V 視点・G ガッツポーズ　画面をドラッグでカメラを回す（2回タップで戻す）</div>
        </div>`;
      const cv = el.querySelector('.ride-canvas');
      const narrow = (el.clientWidth || 960) < 600;
      const VW = narrow ? 640 : 960, VH = narrow ? 600 : 540;
      cv.style.aspectRatio = `${VW} / ${VH}`;
      const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
      cv.width = VW * dpr; cv.height = VH * dpr;
      const ctx = cv.getContext('2d');
      ctx.scale(dpr, dpr);
      const msgEl = el.querySelector('.ride-msg');
      const AU = HS.Audio;
      const meta = sim.st.map(s => ({ silks: HS.RaceView.silksOf(s.h), cap: FC()[(s.r.frame - 1) % 8], capText: FT()[(s.r.frame - 1) % 8] }));
      const record = HS.World.courseRecord ? HS.World.courseRecord(race) : null;
      // 3D（WebGL が使えるとき）。計器は上の 2D の canvas に重ねる
      let r3 = null;
      const cv3 = el.querySelector('.ride-3d');
      if (HS.Race3D && HS.Race3D.supported() && !RD.no3d) {
        try {
          cv3.style.aspectRatio = `${VW} / ${VH}`;
          r3 = HS.Race3D.create(cv3, {
            D: sim.D, surface: race.surface, ground: race.ground, track: sim.track,
            course: { name: race.course, dir: course.dir, lap: sim.geo.lap, straight: sim.geo.straight, slope: sim.geo.slope },
            horses: sim.st.map((s, j) => ({ num: s.r.num, frame: s.r.frame, cap: meta[j].cap, silks: meta[j].silks, coat: s.h.coat, name: s.h.name, mine: !!s.me })),
          });
          r3.resize(cv3.clientWidth || VW, cv3.clientHeight || VH, dpr);
        } catch (err) { console.warn('3D を使えないので 2D で描く', err); r3 = null; }
      }
      if (!r3) cv3.style.display = 'none';
      let flash = null; // 画面の真ん中に出す短い言葉
      let skillTag = null, pace = null, side = [], fxSeen = 0, paceShown = false;
      const say = (text, cls) => { flash = { text, cls, t: performance.now() }; };

      // ---------- 操作 ----------
      let whipAt = -9, poseAt = null, whipFx = null;
      const doUp = () => {
        const b = S.ctl.up(sim);
        if (b === 'good' && sim.ctl.pushes === 0) say('好スタート！', 'good');
        else if (b === 'late') say('出遅れ……', 'bad');
        if (AU) AU.se('click');
      };
      const doDown = () => { S.ctl.down(sim); if (AU) AU.se('click'); };
      const doWhip = side => {
        const b = S.ctl.whip(sim, side);
        if (b == null) return say(sim.ctl && !sim.ctl.started ? 'まだゲートの中' : '', '');
        if (b === 'swap') { say(`${sim.ctl.hand === 'R' ? '右' : '左'}手に持ち替え`, ''); return; }
        whipAt = sim.t; whipFx = { t: performance.now(), side, b, inward: sim.ctl.lastWhip && sim.ctl.lastWhip.away < 0, zone: sim.D - me.x < sim.straight + 200 };
        if (AU) AU.se('whip');
      };
      const doSwap = () => { if (S.ctl.swap(sim)) say(`${sim.ctl.hand === 'R' ? '右' : '左'}手に持ち替え`, ''); };
      const doLane = d => S.ctl.lane(sim, d);
      const doPose = () => { if (me.done && poseAt == null) { poseAt = sim.t; if (AU) AU.se('skill'); } };
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
      const VIEWS = [['騎手の後ろ', 'ride', 0, 0, 1], ['高い後ろ', 'ride', 0, 0.42, 1.7], ['中継', 'tv', 0, 0, 1]];
      let viewI = 0, look = 0, lookNow = 0; const lookKeys = { q: false, e: false }; let padLook = 0;
      const setView = i => { viewI = (i + VIEWS.length) % VIEWS.length; const v = VIEWS[viewI]; orbit.yaw = v[2]; orbit.pitch = v[3]; orbit.zoom = v[4]; say(v[0], ''); };
      el.querySelector('.cam-btn').onclick = ev => { ev.stopPropagation(); setView(viewI + 1); };
      const stage = el.querySelector('.ride-stage');
      let drag = null, lastTap = 0;
      stage.addEventListener('pointerdown', ev => {
        if (ev.target.closest('.cam-btn')) return;
        const now = performance.now();
        if (now - lastTap < 300) { if (me.done) doPose(); else setView(viewI); lastTap = 0; return; }
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
      const KEYS = { ArrowUp: doUp, ArrowDown: doDown, ArrowLeft: () => doLane(-1), ArrowRight: () => doLane(1), x: () => doWhip('R'), z: () => doWhip('L'), c: doSwap, ' ': doUp, v: () => setView(viewI + 1), r: () => setView(viewI), a: () => moveTarget(-1), s: () => moveTarget(1), g: doPose };
      const keyDown = ev => {
        const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
        if (k === 'q' || k === 'e') { lookKeys[k] = true; return; }
        if (ev.repeat) return;
        if (KEYS[k]) { KEYS[k](); ev.preventDefault(); }
      };
      const keyUp = ev => { const k = ev.key.toLowerCase(); if (k === 'q' || k === 'e') lookKeys[k] = false; };
      window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp);
      const padPrev = {};
      const pollPad = () => {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        const p = pads && Array.from(pads).find(x => x && x.connected);
        if (!p) { padLook = 0; return; }
        const pressed = list => list.some(i => p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > 0.5));
        const edge = (name, now) => { const was = padPrev[name]; padPrev[name] = now; return now && !was; };
        const ax = p.axes && p.axes[0] || 0, ay = p.axes && p.axes[1] || 0;
        if (edge('up', pressed(PAD.up) || ay < -0.6)) doUp();
        if (edge('down', pressed(PAD.down) || ay > 0.6)) doDown();
        if (edge('left', pressed(PAD.left) || ax < -0.6)) doLane(-1);
        if (edge('right', pressed(PAD.right) || ax > 0.6)) doLane(1);
        if (edge('whipR', pressed(PAD.whipR))) doWhip('R');
        if (edge('whipL', pressed(PAD.whipL))) doWhip('L');
        if (edge('swap', pressed(PAD.swap))) doSwap();
        if (edge('pose', pressed(PAD.pose))) doPose();
        if (edge('tgtPrev', pressed(PAD.tgtPrev))) moveTarget(-1);
        if (edge('tgtNext', pressed(PAD.tgtNext))) moveTarget(1);
        if (edge('view', pressed(PAD.view))) setView(viewI + 1);
        if (edge('camreset', pressed([11]))) setView(viewI);
        padLook = (pressed(PAD.lookR) ? 1 : 0) - (pressed(PAD.lookL) ? 1 : 0);
        const rx = p.axes && p.axes[2] || 0, ry = p.axes && p.axes[3] || 0;
        camRate.yaw = Math.abs(rx) > 0.15 ? rx : 0; camRate.pitch = Math.abs(ry) > 0.15 ? ry : 0;
      };

      // ---------- 進める ----------
      const COUNT = 3; // 発走前の秒
      let clock = -COUNT; // 発走からの秒（負はゲートの中）
      let acc = 0, last = null, done = false, result = null;
      let prev = sim.st.map(s => [s.x, s.lane, s.v]);
      let finishedAt = null, myPos = null;
      if (AU) { AU.bgm('race'); }
      const lerpView = k => sim.st.map((s, j) => ({
        x: prev[j][0] + (s.x - prev[j][0]) * k, lane: prev[j][1] + (s.lane - prev[j][1]) * k, v: s.v,
        num: s.r.num, frame: s.r.frame, cap: meta[j].cap, silks: meta[j].silks, coat: s.h.coat, name: s.h.name, mine: !!s.me,
        whip: s.me ? sim.t - whipAt : null, pose: s.me && poseAt != null ? sim.t + acc - poseAt : null,
      }));

      function frame(ts) {
        if (done) return;
        if (last == null) last = ts;
        const realDt = Math.min(0.1, (ts - last) / 1000);
        const dt = realDt * RD.speed; last = ts;
        pollPad();
        orbit.yaw -= (camRate.yaw || 0) * 2.2 * realDt;
        orbit.pitch = U.clamp(orbit.pitch + (camRate.pitch || 0) * 1.4 * realDt, -0.3, 1.2);
        look = padLook || ((lookKeys.e ? 1 : 0) - (lookKeys.q ? 1 : 0));
        lookNow += (look * Math.PI / 2 - lookNow) * Math.min(1, realDt * 8);
        if (clock < 0) {
          const before = clock; clock += dt;
          if (before < 0 && clock >= 0) { if (AU) { AU.se('gate'); AU.raceStart(); } say('スタート！', 'go'); }
        } else if (!sim.over) {
          acc += dt;
          let guard = 0;
          while (acc >= 0.1 && !sim.over && guard++ < 20) { prev = sim.st.map(s => [s.x, s.lane, s.v]); S.step(sim); acc -= 0.1; }
          clock = sim.t + acc;
          if (me.done && finishedAt == null) {
            finishedAt = sim.t;
            myPos = sim.st.filter(s => s.done && s.finishT <= me.finishT).length;
            if (myPos !== 1) say(`${myPos}着`, '');
          }
          if (AU) { const lead = Math.max(...sim.st.map(s => s.x)); AU.raceUpdate(sim.D - lead, sim.D - lead < sim.straight, sim.st.filter(s => !s.done).length, sim.st.filter(s => s.done).length); }
        }
        const k = clock < 0 ? 0 : U.clamp(acc / 0.1, 0, 1);
        const view = {
          t: clock, D: sim.D, surface: race.surface, ground: race.ground,
          course: { name: race.course, dir: course.dir, lap: sim.geo.lap, straight: sim.geo.straight, slope: sim.geo.slope },
          track: sim.track, me: sim.me, horses: lerpView(k), phase: clock < 0 ? 'gate' : me.done ? 'finish' : 'race',
        };
        ctx.clearRect(0, 0, VW, VH);
        const camMode = clock < 0 ? 'gate' : VIEWS[viewI][1];
        if (r3) {
          view.horses.forEach((h, j) => { if (sim.st[j].me && sim.ctl) h.push = U.clamp(sim.ctl.gear + (me.spurting ? 0.4 : 0), 0, 1); });
          r3.render(view, camMode, { yaw: orbit.yaw + lookNow, pitch: orbit.pitch, zoom: orbit.zoom });
        } else if (HS.RideCam) HS.RideCam.draw(ctx, VW, VH, view); else fallback(view);
        hud(view);
        if (sim.over && !result) {
          result = S.finish(sim);
          if (AU) { AU.raceEnd(); AU.stopBgm(); }
          const bar = el.querySelector('.ride-pad');
          bar.innerHTML = (myPos === 1 ? '<button class="btn ride-pose">ガッツポーズ</button>' : '') + '<button class="btn gold ride-close">結果を見る</button>';
          bar.querySelector('.ride-close').onclick = () => finish();
          const pb = bar.querySelector('.ride-pose'); if (pb) pb.onclick = () => { poseAt = null; doPose(); };
        }
        requestAnimationFrame(frame);
      }
      function finish() {
        done = true;
        if (r3) { r3.dispose(); r3 = null; }
        window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp);
        resolve(result);
      }

      // ---------- 計器 ----------
      function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
      function panel(x, y, w, h) { ctx.fillStyle = 'rgba(6,28,18,0.78)'; rr(x, y, w, h, 6); ctx.fill(); ctx.strokeStyle = 'rgba(214,178,74,0.85)'; ctx.lineWidth = 1.5; ctx.stroke(); }
      function txt(s, x, y, font, col, align, base) { ctx.font = font; ctx.fillStyle = col; ctx.textAlign = align || 'left'; ctx.textBaseline = base || 'alphabetic'; ctx.fillText(s, x, y); }
      function outlined(s, x, y, font, col, align) { ctx.font = font; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic'; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); }
      function hud(view) {
        const c = sim.ctl;
        const order = orderNow();
        const rank = order.indexOf(me) + 1;
        const rem = Math.max(0, Math.ceil((sim.D - me.x) / 10) * 10);
        // 左上：順位／頭数（大きく）と残り
        outlined(String(rank), 18, 58, `900 54px ${FONT}`, '#ffd34d');
        const rw = (ctx.measureText(String(rank)).width);
        outlined(`/ ${sim.st.length}`, 24 + rw, 58, `bold 24px ${FONT}`, '#fff');
        outlined(clock < 0 ? `発走まで ${Math.ceil(-clock)}` : me.done ? 'ゴール' : `残り ${rem}m`, 20, 88, `bold 20px ${FONT}`, '#fff');
        // 右上：コースレコードと時計
        const tw = 196, tx = VW - tw - 10;
        panel(tx, 10, tw, 50);
        txt('レコード', tx + 10, 30, `12px ${FONT}`, '#cfe3c9');
        txt(record ? U.time(record.t) : '－', tx + tw - 10, 30, `bold 14px monospace`, '#ffd34d', 'right');
        txt('タイム', tx + 10, 51, `12px ${FONT}`, '#cfe3c9');
        const now = clock > 0 ? Math.min(clock, me.done ? me.finishT : 999) : 0;
        txt(U.time(now), tx + tw - 10, 51, `bold 16px monospace`, record && me.done && me.finishT < record.t ? '#ff7a6a' : '#fff', 'right');
        // 右：縦長の馬群レーダーと照準の馬
        radar(view, order);
        // 左下：スタミナ・速さ・脚質・気性
        meters(c, order, rank);
        // 状態の言葉
        const notes = [];
        if (c.blockedNow) notes.push(['前が壁', 'bad']);
        if (c.kakariNow) notes.push(['掛かっている', 'bad']);
        else if (c.behind && c.tension < 50 && !me.spurting) notes.push(['折り合っている', 'good']);
        if (me.spurting && !me.done && sim.D - me.x < 1000) notes.push(['追い出した', 'good']);
        if (c.wide) notes.push(['外を回っている', '']);
        if (c.gear < -0.05 && !c.kakariNow) notes.push(['ためている', 'good']);
        if (me.E <= 0) notes.push(['バテた', 'bad']);
        if (me.boost && sim.t < me.boost.until && me.boost.id && HS.Skills) notes.push([`⚡${HS.Skills.label(me.boost.id)} 発動中`, 'skill']);
        msgEl.innerHTML = notes.map(([t, k]) => `<span class="${k}">${t}</span>`).join('');
        // 特殊能力の発動（自分の馬は右上に札と集中線、近くの馬は小さな字幕）
        while (fxSeen < sim.skillFx.length) {
          const f = sim.skillFx[fxSeen++];
          const label = HS.Skills ? HS.Skills.label(f.id) : f.id, bad = HS.Skills ? HS.Skills.isBad(f.id) : false;
          if (f.i === sim.me) { skillTag = { text: label, bad, t: performance.now() }; if (AU) AU.se('skill'); }
          else { const o = sim.st[f.i]; if (Math.abs(o.x - me.x) < 40) side.unshift({ text: `${o.r.num} ${o.h.name}「${label}」`, bad, t: performance.now() }); }
        }
        if (skillTag) drawSkill(skillTag);
        // 上の真ん中：ペース。決まった地点を通るまでは予想、通ったら判定を出し続ける（スローは前が楽で早めに、ハイは後ろでためて遅めに）
        if (sim.check && !paceShown) { paceShown = true; pace = { text: `${sim.check.at}m通過　${sim.check.t.toFixed(1)}`, verdict: sim.check.verdict, t: performance.now() }; if (AU) AU.se('click'); }
        drawPace();
        // ムチ：打った側から光の筋、画面が揺れ、寄った向きの矢印
        drawWhip();
        side = side.filter(x => performance.now() - x.t < 2500).slice(0, 3);
        side.forEach((x, k) => {
          ctx.fillStyle = x.bad ? 'rgba(110,40,30,0.85)' : 'rgba(30,110,150,0.85)'; ctx.fillRect(VW - 330, 128 + k * 22, 230, 20);
          txt(x.text, VW - 324, 138 + k * 22, `12px ${FONT}`, '#fff', 'left', 'middle');
        });
        // 1着でゴールしたら大きく
        if (myPos === 1 && finishedAt != null) {
          const a = U.clamp((sim.t - finishedAt) / 0.4, 0, 1);
          ctx.globalAlpha = a;
          outlined('1着', VW / 2, VH * 0.36, `900 ${Math.round(64 + 20 * (1 - a))}px "Noto Serif JP", serif`, '#ffd34d', 'center');
          txt(`${U.time(me.finishT)}　上がり ${me.t600 != null ? (me.finishT - me.t600).toFixed(1) : '－'}`, VW / 2, VH * 0.36 + 34, `bold 16px ${FONT}`, '#fff', 'center');
          if (poseAt == null) txt('Y／G／2回タップ：ガッツポーズ', VW / 2, VH * 0.36 + 58, `12px ${FONT}`, '#ffe9a6', 'center');
          ctx.globalAlpha = 1;
        }
        // 真ん中の言葉
        if (flash && flash.text && performance.now() - flash.t < 1400) {
          const a = 1 - (performance.now() - flash.t) / 1400;
          ctx.globalAlpha = Math.min(1, a * 2);
          outlined(flash.text, VW / 2, VH * 0.5, `bold 34px "Noto Serif JP", serif`, flash.cls === 'bad' ? '#ff8a6a' : flash.cls === 'good' || flash.cls === 'whip' ? '#ffe680' : '#fff', 'center');
          ctx.globalAlpha = 1;
        }
      }
      // ペースの札：予想（逃げ馬の数から）→ 判定（決まった地点を通ったとき）。判定のあとは小さくして出し続ける。目盛りでスロー〜ハイのどこか
      const nNige = sim.st.filter(s => s.h.style === '逃げ').length;
      const guess = nNige >= 2 ? 'ハイペース' : nNige === 0 ? 'スローペース' : '平均ペース';
      const paceCol = v => v === 'ハイペース' ? '#ff8a6a' : v === 'スローペース' ? '#7fc8ff' : '#ffe9a6';
      function drawPace() {
        if (clock < 0 || me.done) return;
        const bw = 300, bx = VW / 2 - bw / 2, by = 12;
        if (!pace) {
          panel(bx, by, bw, 40);
          txt(`予想 ${guess}`, VW / 2, by + 18, `bold 14px ${FONT}`, paceCol(guess), 'center', 'middle');
          txt(`逃げ馬${nNige}頭・${sim.checkAt}m地点で判定`, VW / 2, by + 32, `11px ${FONT}`, '#cfe3c9', 'center', 'middle');
          return;
        }
        const age = performance.now() - pace.t, big = age < 3200;
        const h = big ? 80 : 60;
        panel(bx, by, bw, h);
        txt(pace.verdict, VW / 2, by + (big ? 24 : 18), `900 ${big ? 22 : 16}px ${FONT}`, paceCol(pace.verdict), 'center', 'middle');
        txt(S.paceHint(pace.verdict), VW / 2, by + (big ? 44 : 33), `bold ${big ? 13 : 11}px ${FONT}`, '#fff', 'center', 'middle');
        // 目盛り：左がスロー、右がハイ
        const gx = bx + 34, gw = bw - 68, gy = by + h - 18;
        const grd = ctx.createLinearGradient(gx, 0, gx + gw, 0); grd.addColorStop(0, '#7fc8ff'); grd.addColorStop(0.5, '#ffe9a6'); grd.addColorStop(1, '#ff8a6a');
        ctx.fillStyle = grd; ctx.fillRect(gx, gy, gw, 4);
        const k = U.clamp((sim.paceF - 0.982) / 0.036, 0, 1);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(gx + gw * k, gy + 5); ctx.lineTo(gx + gw * k - 5, gy + 11); ctx.lineTo(gx + gw * k + 5, gy + 11); ctx.closePath(); ctx.fill();
        txt('スロー', gx - 4, gy + 4, `9px ${FONT}`, '#7fc8ff', 'right', 'middle'); txt('ハイ', gx + gw + 4, gy + 4, `9px ${FONT}`, '#ff8a6a', 'left', 'middle');
        if (big) txt(pace.text, bx + bw - 8, by + 14, `10px ${FONT}`, '#cfe3c9', 'right', 'middle');
      }
      // ムチ：打った側の端から光の筋と、少しの揺れ（文字は出さない。持ち主の指摘）
      function drawWhip() {
        const stg = el.querySelector('.ride-stage');
        if (!whipFx) { if (stg) stg.style.transform = ''; return; }
        const age = performance.now() - whipFx.t;
        if (age > 900) { whipFx = null; if (stg) stg.style.transform = ''; return; }
        if (stg) stg.style.transform = age < 160 ? `translate(${Math.round(Math.sin(age / 18) * 5)}px, ${Math.round(Math.cos(age / 23) * 3)}px)` : '';
        const right = whipFx.side === 'R', k = 1 - age / 900;
        ctx.save(); ctx.globalAlpha = 0.65 * k; ctx.strokeStyle = whipFx.zone ? '#fff3b0' : '#ffb199'; ctx.lineWidth = 3;
        for (let i = 0; i < 9; i++) {
          const y = VH * (0.3 + i * 0.05), x0 = right ? VW : 0, len = VW * (0.18 + (i % 3) * 0.05) * Math.min(1, age / 120);
          ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(right ? x0 - len : x0 + len, y - 10); ctx.stroke();
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      // 発動の札：得なものは水色、損なものは赤茶。小さな馬の印と、画面の集中線。はじめの1.2秒は真ん中に大きく「発動！」
      function drawSkill(tag) {
        const age = performance.now() - tag.t;
        if (age > 2200) return;
        if (age < 650) {
          const k = 1 - age / 650;
          ctx.save(); ctx.globalAlpha = 0.5 * k; ctx.strokeStyle = tag.bad ? '#ffb199' : '#e6fbff'; ctx.lineWidth = 2;
          const cx = VW / 2, cy = VH * 0.48;
          for (let i = 0; i < 36; i++) {
            const a = i / 36 * Math.PI * 2 + (i % 3) * 0.05, r0 = Math.min(VW, VH) * (0.32 + 0.08 * ((i * 7) % 5) / 5), r1 = Math.max(VW, VH);
            ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
          }
          ctx.restore();
        }
        const a = Math.min(1, (2200 - age) / 300), slide = Math.min(1, age / 160);
        ctx.globalAlpha = a;
        const w = 230, x = VW - 10 - w * slide, y = 70;
        const g = ctx.createLinearGradient(x, 0, x + w, 0);
        if (tag.bad) { g.addColorStop(0, '#6e2a1e'); g.addColorStop(1, '#a8452f'); } else { g.addColorStop(0, '#1b8fc4'); g.addColorStop(1, '#6fd6ff'); }
        ctx.fillStyle = g; rr(x, y, w, 40, 6); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
        horseIcon(x + 22, y + 21, tag.bad ? '#ffd9cf' : '#fff');
        outlined(tag.text, x + 44, y + 27, `900 18px ${FONT}`, '#fff');
        ctx.globalAlpha = 1;
        if (age < 1300) {
          const s0 = Math.min(1, age / 140), fade = age > 1000 ? (1300 - age) / 300 : 1;
          ctx.globalAlpha = fade;
          // 画面の縁を光らせる
          ctx.strokeStyle = tag.bad ? 'rgba(255,120,90,0.8)' : 'rgba(120,220,255,0.85)'; ctx.lineWidth = 10 * (1 - age / 1300) + 2; ctx.strokeRect(4, 4, VW - 8, VH - 8);
          outlined(`${tag.bad ? '▼' : '⚡'} ${tag.text}`, VW / 2, VH * 0.21, `900 ${Math.round(30 + 10 * (1 - s0))}px "Noto Serif JP", serif`, tag.bad ? '#ffb199' : '#bff0ff', 'center');
          outlined(tag.bad ? '発動してしまった' : '発動！', VW / 2, VH * 0.21 + 26, `bold 16px ${FONT}`, '#fff', 'center');
          ctx.globalAlpha = 1;
        }
      }
      function horseIcon(x, y, col) {
        ctx.save(); ctx.translate(x, y); ctx.fillStyle = col;
        ctx.beginPath(); ctx.ellipse(0, 0, 9, 4.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(13, -9); ctx.lineTo(15, -7); ctx.lineTo(9, 1); ctx.fill();
        ctx.lineWidth = 1.6; ctx.strokeStyle = col;
        [[-6, 1, -10, 9], [-3, 2, -1, 9], [5, 2, 8, 9], [7, 1, 12, 7]].forEach(([a, b, c, d]) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); });
        ctx.restore();
      }
      // 左下の計器
      function meters(c, order, rank) {
        const w = 250, h = 112, x = 10, y = VH - h - 10;
        panel(x, y, w, h);
        // スタミナ：8つのブロック。使うたびに1つずつ消える
        txt('スタミナ', x + 10, y + 20, `12px ${FONT}`, '#cfe3c9');
        const nB = me.E <= 0 ? 0 : Math.ceil(U.clamp(me.E, 0, 1) * 8);
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = i < nB ? (nB <= 2 ? '#ff6a4d' : nB <= 4 ? '#ffd34d' : '#57d17f') : 'rgba(255,255,255,0.12)';
          ctx.fillRect(x + 70 + i * 21, y + 9, 17, 14);
        }
        // 速さ：今の速さを青い棒で（巡航の速さが真ん中）
        txt('速さ', x + 10, y + 42, `12px ${FONT}`, '#cfe3c9');
        const nV = Math.round(U.clamp((me.v / me.vc - 0.9) / 0.2, 0, 1) * 16);
        for (let i = 0; i < 16; i++) { ctx.fillStyle = i < nV ? (i >= 12 ? '#7fe0ff' : '#3a8fe0') : 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 70 + i * 10.5, y + 32, 8, 12); }
        // 手綱の段（しごく▲・引く▼）とムチの手
        const gTxt = c.gear > 0.05 ? '▲'.repeat(Math.ceil(c.gear * 4)) : c.gear < -0.05 ? '▼'.repeat(Math.ceil(-c.gear * 4)) : '－';
        txt(`手綱 ${gTxt}`, x + 10, y + 64, `12px ${FONT}`, c.gear > 0.05 ? '#ffd34d' : c.gear < -0.05 ? '#7fc8ff' : '#cfe3c9');
        txt(`ムチ ${c.hand === 'R' ? '右' : '左'}手${c.whips ? '・' + c.whips : ''}`, x + 120, y + 64, `12px ${FONT}`, '#cfe3c9');
        // 脚質の矢印：光っているのがこの馬の得意な位置。白い枠が今の位置
        txt('脚質', x + 10, y + 92, `12px ${FONT}`, '#cfe3c9');
        const nowK = Math.min(3, Math.floor((rank - 1) / Math.max(1, sim.st.length) * 4));
        STYLES.forEach((st, i) => {
          const ax = x + 52 + i * 34, ay = y + 82, lit = me.h.style === st;
          ctx.fillStyle = lit ? '#ffd34d' : 'rgba(255,255,255,0.18)';
          ctx.beginPath(); ctx.moveTo(ax + 26, ay + 8); ctx.lineTo(ax + 4, ay); ctx.lineTo(ax + 4, ay + 16); ctx.closePath(); ctx.fill();
          if (i === nowK) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(ax + 1, ay - 2, 28, 20); }
          txt(st[0], ax + 11, ay + 12, `bold 10px ${FONT}`, lit ? '#3a2a00' : '#cfe3c9', 'center', 'middle');
        });
        // 気性：針と色（青＝落ち着き、緑、黄、赤＝掛かり）
        const cx = x + w - 30, cy = y + 96, r = 20;
        const seg = (a0, a1, col) => { ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI + a0 * Math.PI, Math.PI + a1 * Math.PI); ctx.stroke(); };
        seg(0, 0.35, '#3d8bfd'); seg(0.35, 0.55, '#4cc27a'); seg(0.55, 0.75, '#ffd34d'); seg(0.75, 1, '#ff5a4d');
        const v = U.clamp(c.tension / 100, 0, 1), ang = Math.PI + v * Math.PI;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * (r + 3), cy + Math.sin(ang) * (r + 3)); ctx.stroke();
        txt('気性', cx, cy - r - 6, `11px ${FONT}`, '#cfe3c9', 'center');
      }
      // 縦長の馬群レーダー：上が前。先頭から最後方までを1本に。紫が自分、白い輪が照準。内ラチは回る向きの側
      function radar(view, order) {
        const w = 74, h = Math.min(300, VH * 0.52), bx = VW - w - 10, by = 132;
        panel(bx, by, w, h + 30);
        const live = view.horses;
        let top = -1e9, bot = 1e9;
        live.forEach(hh => { top = Math.max(top, hh.x); bot = Math.min(bot, hh.x); });
        const span = Math.max(40, top - bot + 6);
        const LANES = 10;
        const inner = course.dir === '左' ? 'left' : 'right';
        const laneX = l => { const k = U.clamp(l, -0.4, LANES) / LANES * (w - 18); return inner === 'right' ? bx + w - 9 - k : bx + 9 + k; };
        const yOf = x => by + 10 + (top + 3 - x) / span * (h - 14);
        ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 2; ctx.beginPath(); const rx = laneX(-0.4); ctx.moveTo(rx, by + 6); ctx.lineTo(rx, by + h); ctx.stroke();
        live.forEach((hh, j) => {
          const x = laneX(hh.lane), y = yOf(hh.x), isMe = j === view.me;
          ctx.fillStyle = isMe ? '#b45cff' : hh.cap;
          ctx.fillRect(x - 3.5, y - 5, 7, 10);
          ctx.strokeStyle = isMe ? '#fff' : 'rgba(0,0,0,0.6)'; ctx.lineWidth = isMe ? 1.5 : 1; ctx.strokeRect(x - 3.5, y - 5, 7, 10);
          if (j === target && !isMe) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.stroke(); }
        });
        const tg = sim.st[target];
        const k = order.indexOf(tg) + 1;
        txt(`${tg.r.num}番 ${k}位`, bx + w / 2, by + h + 12, `bold 11px ${FONT}`, target === sim.me ? '#d9a8ff' : '#fff', 'center', 'middle');
        ctx.font = `10px ${FONT}`;
        txt(tg.h.name.length > 7 ? tg.h.name.slice(0, 7) + '…' : tg.h.name, bx + w / 2, by + h + 25, `10px ${FONT}`, '#cfe3c9', 'center', 'middle');
        txt('馬群レーダー', bx + w / 2, by - 6, `11px ${FONT}`, '#fff', 'center');
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
          ctx.fillStyle = h.cap; ctx.beginPath(); ctx.arc(x, y - 18, 6, 0, Math.PI * 2); ctx.fill();
        });
      }
      requestAnimationFrame(frame);
    });
  };
})();
