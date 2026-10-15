// 騎乗の画面：後ろから追う映像（js/ui/ridecam.js）に、残り距離・順位・スタミナ・追いの拍子を重ね、
// タッチのボタン・ゲームパッド・キーボードで「抑える・追う・ムチ・進路」を操作する
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, S = HS.Sim, R = HS.Races;
  const RD = HS.Ride = {};
  RD.speed = 1; // 確かめ用に速く進める倍率
  const FC = () => HS.DATA.frameColors, FT = () => HS.DATA.frameText;

  // ゲームパッドのボタン（標準の並び）：A＝追う、B＝ムチ、LB/LT/RB/RT＝抑える、十字キー・左スティック＝進路
  const PAD = { push: [0], whip: [1, 2], hold: [4, 5, 6, 7], left: [14], right: [15] };

  // card：W.cards() の1レース。戻り値：S.finish の結果（Promise）
  RD.ride = function (el, card, opts) {
    opts = opts || {};
    return new Promise(resolve => {
      const race = card.race;
      const sim = HS.World.startSim(card, { ride: true });
      const me = sim.st[sim.me];
      const course = HS.DATA.courses[race.course] || HS.DATA.courses['東京'];
      el.innerHTML = `
        <div class="ride">
          <div class="ride-stage"><canvas class="ride-3d"></canvas><canvas class="ride-canvas"></canvas>
            <div class="ride-msg"></div><button class="cam-btn" aria-label="視点を変える">🎥 視点</button></div>
          <div class="ride-pad">
            <div class="ride-lanes"><button class="rb lane" data-c="left" aria-label="内へ">◀<small>内へ</small></button><button class="rb lane" data-c="right" aria-label="外へ">▶<small>外へ</small></button></div>
            <button class="rb hold" data-c="hold">抑える<small>押している間</small></button>
            <button class="rb whip" data-c="whip">ムチ</button>
            <button class="rb push" data-c="push">追う<small>拍子に合わせて</small></button>
          </div>
          <div class="ride-help small muted">ゲームパッド：A 追う・B ムチ・LB/RB 抑える・十字キー 進路・右スティック カメラ・Y 視点　キーボード：Z 追う・X ムチ・Shift 抑える・←→ 進路・Q/E カメラ・V 視点　画面をドラッグでカメラを回す（2回タップで戻す）</div>
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
      // 3D（WebGL が使えるとき）。HUD は上の 2D の canvas に重ねる
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
      let banner = null, side = [], fxSeen = 0, paceShown = false;
      const say = (text, cls) => { flash = { text, cls, t: performance.now() }; };

      // ---------- 操作 ----------
      let holdTouch = false, holdKey = false, holdPad = false;
      const setHold = () => S.ctl.hold(sim, holdTouch || holdKey || holdPad);
      const doPush = () => {
        const b = S.ctl.push(sim);
        if (b === 'good' && !sim.ctl.pushes) say('好スタート！', 'good');
        else if (b === 'late') say('出遅れ……', 'bad');
        else if (b === 'dash') { beatFx = { t: performance.now(), good: true }; if (sim.ctl.streak === 3) say('伸びる！', 'good'); }
        else if (b === 'good') beatFx = { t: performance.now(), good: true };
        else if (b === 'fast') beatFx = { t: performance.now(), good: false };
        if (AU) AU.se('click');
      };
      const doWhip = () => {
        const b = S.ctl.whip(sim);
        if (b == null) return say(sim.ctl && !sim.ctl.started ? 'まだゲートの中' : '', '');
        whipAt = sim.t;
        if (b === 'yore') say('よれた！', 'bad'); else if (b === 'tired') say('ムチが効かない', 'bad'); else say(`ムチ ${sim.ctl.whips}発目`, 'whip');
        if (AU) AU.se('whip');
      };
      let whipAt = -9;
      const doLane = d => S.ctl.lane(sim, d);
      let beatFx = null;
      el.querySelectorAll('.rb').forEach(b => {
        const c = b.dataset.c;
        const down = ev => { ev.preventDefault(); b.classList.add('on'); if (c === 'hold') { holdTouch = true; setHold(); } else if (c === 'push') doPush(); else if (c === 'whip') doWhip(); else if (c === 'left') doLane(-1); else if (c === 'right') doLane(1); };
        const up = ev => { ev.preventDefault(); b.classList.remove('on'); if (c === 'hold') { holdTouch = false; setHold(); } };
        b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
      });
      const keyDown = ev => {
        if (ev.repeat) return;
        const k = ev.key;
        if (k === 'z' || k === 'Z' || k === ' ') { doPush(); ev.preventDefault(); }
        else if (k === 'x' || k === 'X') { doWhip(); ev.preventDefault(); }
        else if (k === 'Shift' || k === 'c' || k === 'C') { holdKey = true; setHold(); }
        else if (k === 'ArrowLeft') { doLane(-1); ev.preventDefault(); }
        else if (k === 'ArrowRight') { doLane(1); ev.preventDefault(); }
      };
      // ---------- カメラの回転（3D のとき） ----------
      const orbit = { yaw: 0, pitch: 0, zoom: 1 };
      const VIEWS = [['後ろから', 0, 0, 1], ['横から', Math.PI / 2, 0.05, 1.1], ['前から', Math.PI, 0.1, 1.2], ['反対の横から', -Math.PI / 2, 0.05, 1.1], ['上から', 0, 0.95, 1.5]];
      let viewI = 0;
      const setView = i => { viewI = (i + VIEWS.length) % VIEWS.length; const v = VIEWS[viewI]; orbit.yaw = v[1]; orbit.pitch = v[2]; orbit.zoom = v[3]; say(v[0], ''); };
      el.querySelector('.cam-btn').onclick = ev => { ev.stopPropagation(); setView(viewI + 1); };
      const stage = el.querySelector('.ride-stage');
      let drag = null, lastTap = 0;
      stage.addEventListener('pointerdown', ev => {
        if (ev.target.closest('.cam-btn')) return;
        const now = performance.now();
        if (now - lastTap < 300) { setView(0); lastTap = 0; return; }
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
      const camKeys = { q: -1, Q: -1, e: 1, E: 1 };
      window.addEventListener('keydown', RD._camKeyDown = ev => { if (camKeys[ev.key]) camRate.key = camKeys[ev.key]; else if (ev.key === 'v' || ev.key === 'V') setView(viewI + 1); else if (ev.key === 'r' || ev.key === 'R') setView(0); });
      window.addEventListener('keyup', RD._camKeyUp = ev => { if (camKeys[ev.key]) camRate.key = 0; });
      const keyUp = ev => { if (ev.key === 'Shift' || ev.key === 'c' || ev.key === 'C') { holdKey = false; setHold(); } };
      window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp);
      const padPrev = {};
      const pollPad = () => {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        const p = pads && Array.from(pads).find(x => x && x.connected);
        if (!p) return;
        const pressed = list => list.some(i => p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > 0.5));
        const edge = (name, now) => { const was = padPrev[name]; padPrev[name] = now; return now && !was; };
        if (edge('push', pressed(PAD.push))) doPush();
        if (edge('whip', pressed(PAD.whip))) doWhip();
        const ax = p.axes && p.axes[0] || 0;
        if (edge('left', pressed(PAD.left) || ax < -0.6)) doLane(-1);
        if (edge('right', pressed(PAD.right) || ax > 0.6)) doLane(1);
        const h = pressed(PAD.hold);
        if (h !== holdPad) { holdPad = h; setHold(); }
        // 右スティックでカメラ、Y で視点の切り替え、右スティックを押し込むと元に戻す
        const rx = p.axes && p.axes[2] || 0, ry = p.axes && p.axes[3] || 0;
        camRate.yaw = Math.abs(rx) > 0.15 ? rx : 0; camRate.pitch = Math.abs(ry) > 0.15 ? ry : 0;
        if (edge('view', pressed([3]))) setView(viewI + 1);
        if (edge('camreset', pressed([11]))) setView(0);
      };

      // ---------- 進める ----------
      const COUNT = 3; // 発走前の秒
      let clock = -COUNT; // 発走からの秒（負はゲートの中）
      let acc = 0, last = null, done = false, result = null;
      let prev = sim.st.map(s => [s.x, s.lane, s.v]);
      let finishedAt = null;
      if (AU) { AU.bgm('race'); }
      const lerpView = k => sim.st.map((s, j) => ({
        x: prev[j][0] + (s.x - prev[j][0]) * k, lane: prev[j][1] + (s.lane - prev[j][1]) * k, v: s.v,
        num: s.r.num, frame: s.r.frame, cap: meta[j].cap, silks: meta[j].silks, coat: s.h.coat, name: s.h.name, mine: !!s.me,
        whip: s.me ? sim.t - whipAt : null,
      }));

      function frame(ts) {
        if (done) return;
        if (last == null) last = ts;
        const realDt = Math.min(0.1, (ts - last) / 1000);
        const dt = realDt * RD.speed; last = ts;
        pollPad();
        orbit.yaw -= ((camRate.yaw || 0) + (camRate.key || 0)) * 2.2 * realDt;
        orbit.pitch = U.clamp(orbit.pitch + (camRate.pitch || 0) * 1.4 * realDt, -0.3, 1.2);
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
            const pos = sim.st.filter(s => s.done && s.finishT <= me.finishT).length;
            say(pos === 1 ? '1着！' : `${pos}着`, pos === 1 ? 'good' : '');
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
        if (r3) { view.horses.forEach((h, j) => { if (sim.st[j].me && sim.ctl) h.push = sim.ctl.push; }); r3.render(view, clock < 0 ? 'gate' : 'ride', orbit); }
        else if (HS.RideCam) HS.RideCam.draw(ctx, VW, VH, view); else fallback(view);
        hud(view);
        if (sim.over && !result) {
          result = S.finish(sim);
          if (AU) { AU.raceEnd(); AU.stopBgm(); }
          const bar = el.querySelector('.ride-pad');
          bar.innerHTML = '<button class="btn gold ride-close">結果を見る</button>';
          bar.querySelector('.ride-close').onclick = () => finish();
        }
        requestAnimationFrame(frame);
      }
      function finish() {
        done = true;
        if (r3) { r3.dispose(); r3 = null; }
        window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp);
        window.removeEventListener('keydown', RD._camKeyDown); window.removeEventListener('keyup', RD._camKeyUp);
        resolve(result);
      }

      // ---------- 画面の上の表示 ----------
      function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
      function hud(view) {
        const c = sim.ctl;
        const order = sim.st.slice().sort((a, b) => (a.done && b.done) ? a.finishT - b.finishT : a.done ? -1 : b.done ? 1 : b.x - a.x);
        const rank = order.indexOf(me) + 1;
        const rem = Math.max(0, Math.ceil((sim.D - me.x) / 10) * 10);
        // 左上：残り・順位・時計
        ctx.fillStyle = 'rgba(8,18,32,0.8)'; rr(10, 10, 160, 74, 8); ctx.fill();
        ctx.fillStyle = '#ffd34d'; ctx.font = 'bold 22px "Noto Sans JP", sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(clock < 0 ? `発走まで ${Math.ceil(-clock)}` : me.done ? 'ゴール' : `残り ${rem}m`, 20, 16);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Noto Sans JP", sans-serif';
        ctx.fillText(`${rank}番手 / ${sim.st.length}頭`, 20, 46);
        ctx.font = '13px monospace'; ctx.textAlign = 'right'; ctx.fillText(clock > 0 ? U.time(Math.min(clock, me.done ? me.finishT : 999)) : '', 162, 64);
        // 右上：ミニマップ
        miniMap(view);
        radar(view);
        // 左下：スタミナ・追いの強さ・ムチ
        const bx = 12, by = VH - 92;
        ctx.fillStyle = 'rgba(8,18,32,0.82)'; rr(bx, by, 230, 80, 8); ctx.fill();
        const E = U.clamp(me.E, 0, 1);
        ctx.fillStyle = '#c8d3e2'; ctx.font = '12px "Noto Sans JP", sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('スタミナ', bx + 10, by + 16);
        ctx.fillStyle = '#25384f'; ctx.fillRect(bx + 72, by + 9, 146, 14);
        ctx.fillStyle = E > 0.45 ? '#4cc27a' : E > 0.2 ? '#ffd34d' : '#ff6a4d'; ctx.fillRect(bx + 72, by + 9, 146 * E, 14);
        ctx.fillStyle = '#c8d3e2'; ctx.fillText('追い', bx + 10, by + 40);
        ctx.fillStyle = '#25384f'; ctx.fillRect(bx + 72, by + 33, 146, 14);
        ctx.fillStyle = '#5bc2e7'; ctx.fillRect(bx + 72, by + 33, 146 * c.push, 14);
        ctx.fillStyle = '#c8d3e2'; ctx.fillText(`ムチ ${c.whips}`, bx + 10, by + 64);
        // 拍子：歩幅に合わせて光る輪。合わせて「追う」を押すとよく伸びる
        const P = S.strideOf(me.v), ph = clock > 0 ? ((sim.t + acc) % P) / P : 0;
        const cx = bx + 196, cy = by + 62, rad = 9 + 6 * (1 - ph);
        ctx.strokeStyle = ph < 0.18 ? '#ffd34d' : 'rgba(255,211,77,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
        if (beatFx && performance.now() - beatFx.t < 300) { ctx.fillStyle = beatFx.good ? 'rgba(76,194,122,0.85)' : 'rgba(255,106,77,0.85)'; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#c8d3e2'; ctx.textAlign = 'right'; ctx.fillText('拍子', cx - 20, cy);
        // 状態の言葉
        const notes = [];
        if (c.blockedNow) notes.push(['前が壁', 'bad']);
        if (c.kakariNow && !c.hold) notes.push(['掛かっている', 'bad']);
        else if (c.kakariNow) notes.push(['なだめている', '']);
        if (me.spurting && !me.done && sim.D - me.x < 1000) notes.push(['追い出した', 'good']);
        if (c.wide) notes.push(['外を回っている', '']);
        if (c.hold && !c.kakariNow) notes.push(['ためている', 'good']);
        if (me.E <= 0) notes.push(['バテた', 'bad']);
        msgEl.innerHTML = notes.map(([t, k]) => `<span class="${k}">${t}</span>`).join('');
        tensionGauge(c);
        // スキルの発動・ペースの目安（新しく起きたものを出す）
        while (fxSeen < sim.skillFx.length) {
          const f = sim.skillFx[fxSeen++];
          const sk = HS.Horse.SKILLS[f.id]; if (!sk) continue;
          if (f.i === sim.me) { banner = { text: `スキル発動！ ${sk.label}`, bad: !!sk.bad, t: performance.now() }; if (AU) AU.se('skill'); }
          else { const o = sim.st[f.i]; if (Math.abs(o.x - me.x) < 40) side.unshift({ text: `${o.r.num} ${o.h.name}の${sk.label}`, t: performance.now() }); }
        }
        if (sim.check && !paceShown) { paceShown = true; banner = { text: `${sim.check.at}m通過 ${sim.check.t.toFixed(1)}　${sim.check.verdict}`, pace: true, t: performance.now() }; }
        if (banner && performance.now() - banner.t < 2200) {
          const a = Math.min(1, (2200 - (performance.now() - banner.t)) / 400);
          ctx.globalAlpha = a;
          const bw = Math.min(VW - 40, 420), bx = VW / 2 - bw / 2, by = VH * 0.17;
          const grd = ctx.createLinearGradient(bx, 0, bx + bw, 0);
          const col = banner.pace ? ['#1d4fb8', '#3d8bfd'] : banner.bad ? ['#7a1f1f', '#c0392b'] : ['#9a6a00', '#ffd34d'];
          grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(0.15, col[0]); grd.addColorStop(0.5, col[1]); grd.addColorStop(0.85, col[0]); grd.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grd; ctx.fillRect(bx, by, bw, 40);
          ctx.fillStyle = '#fff'; ctx.font = 'bold 20px "Noto Sans JP", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 4; ctx.strokeText(banner.text, VW / 2, by + 20); ctx.fillText(banner.text, VW / 2, by + 20);
          ctx.globalAlpha = 1;
        }
        // ほかの馬のスキル（近くの馬だけ、右の小さな字幕）
        side = side.filter(x => performance.now() - x.t < 2500).slice(0, 3);
        side.forEach((x, k) => { ctx.fillStyle = 'rgba(8,18,32,0.75)'; ctx.fillRect(VW - 250, 150 + k * 22, 240, 20); ctx.fillStyle = '#ffe9a6'; ctx.font = '12px "Noto Sans JP", sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(x.text, VW - 244, 160 + k * 22, 230); });
        // 真ん中の言葉
        if (flash && performance.now() - flash.t < 1400) {
          const a = 1 - (performance.now() - flash.t) / 1400;
          ctx.globalAlpha = Math.min(1, a * 2);
          ctx.fillStyle = flash.cls === 'bad' ? '#ff8a6a' : flash.cls === 'good' ? '#ffe680' : '#fff';
          ctx.font = 'bold 40px "Noto Serif JP", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 6; ctx.strokeText(flash.text, VW / 2, VH * 0.38); ctx.fillText(flash.text, VW / 2, VH * 0.38);
          ctx.globalAlpha = 1;
        }
      }
      // 気性レーダー：テンションの針。抑えると下がり、放っておくと上がる。赤に入ると掛かる
      function tensionGauge(c) {
        const cx = 216, cy = VH - 104, r = 34;
        ctx.fillStyle = 'rgba(8,18,32,0.82)'; rr(cx - 46, cy - 46, 92, 56, 8); ctx.fill();
        const seg = (a0, a1, col) => { ctx.strokeStyle = col; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI + a0 * Math.PI, Math.PI + a1 * Math.PI); ctx.stroke(); };
        seg(0, 0.35, '#4cc27a'); seg(0.35, 0.75, '#ffd34d'); seg(0.75, 1, '#ff5a4d');
        const v = U.clamp(c.tension / 100, 0, 1), ang = Math.PI + v * Math.PI;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * (r + 4), cy + Math.sin(ang) * (r + 4)); ctx.stroke();
        ctx.fillStyle = '#c8d3e2'; ctx.font = '11px "Noto Sans JP", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(c.tension >= 75 ? '気性：掛かり' : c.tension < 35 ? '気性：落ち着き' : '気性', cx, cy + 1);
      }
      // 馬群レーダー：自分のまわり（前 30m・後ろ 15m）の馬の位置を上から。内ラチは回る向きの側
      function radar(view) {
        const w = 112, h = 150, bx = VW - w - 10, by = VH - h - 12;
        const AHEAD = 30, BEHIND = 15, LANES = 9;
        ctx.fillStyle = 'rgba(8,18,32,0.82)'; rr(bx, by, w, h, 8); ctx.fill();
        ctx.strokeStyle = 'rgba(201,164,58,0.8)'; ctx.lineWidth = 1; ctx.stroke();
        const inner = course.dir === '左' ? 'left' : 'right';
        const laneX = l => inner === 'right' ? bx + w - 10 - l / LANES * (w - 20) : bx + 10 + l / LANES * (w - 20);
        const relY = d => by + 14 + (AHEAD - d) / (AHEAD + BEHIND) * (h - 28);
        // 内ラチと、自分の前後の目安の線
        ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 2; ctx.beginPath(); const rx = laneX(-0.4); ctx.moveTo(rx, by + 8); ctx.lineTo(rx, by + h - 8); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
        for (const d of [20, 10, -10]) { const y = relY(d); ctx.beginPath(); ctx.moveTo(bx + 6, y); ctx.lineTo(bx + w - 6, y); ctx.stroke(); }
        const meH = view.horses[view.me];
        const c = sim.ctl;
        view.horses.forEach((hh, j) => {
          const d = hh.x - meH.x;
          if (d > AHEAD || d < -BEHIND) return;
          const x = laneX(hh.lane), y = relY(d);
          const isMe = j === view.me;
          const block = !isMe && d > 0 && d < 2.6 && Math.abs(hh.lane - meH.lane) < 0.85;
          ctx.fillStyle = isMe ? '#ffd34d' : hh.cap;
          ctx.fillRect(x - 4, y - 6, 8, 12);
          ctx.strokeStyle = isMe ? '#000' : block ? '#ff4d4d' : 'rgba(0,0,0,0.6)'; ctx.lineWidth = isMe || block ? 2 : 1; ctx.strokeRect(x - 4, y - 6, 8, 12);
        });
        // 進もうとしている進路
        if (c) { const tx = laneX(c.lane); ctx.strokeStyle = 'rgba(255,211,77,0.7)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(tx, relY(0) - 10); ctx.lineTo(tx, relY(AHEAD)); ctx.stroke(); ctx.setLineDash([]); }
        ctx.fillStyle = '#c8d3e2'; ctx.font = '11px "Noto Sans JP", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('馬群レーダー', bx + w / 2, by + 2);
      }
      function miniMap(view) {
        const tr = sim.track; if (!tr) return;
        const bw = 200, bh = 104, bx = VW - bw - 10, by = 10;
        ctx.fillStyle = 'rgba(8,18,32,0.8)'; rr(bx, by, bw, bh, 8); ctx.fill();
        const sc = Math.min((bw - 24) / (tr.a + 2 * tr.r), (bh - 20) / (2 * tr.r));
        const cx = bx + bw / 2, cy = by + bh / 2;
        const pt = s => { const p = tr.at(s); return [cx + p.x * sc, cy + p.y * sc]; };
        ctx.strokeStyle = race.surface === 'ダ' ? '#b88a57' : '#59a84f'; ctx.lineWidth = 6; ctx.beginPath();
        for (let s = 0; s <= tr.L; s += tr.L / 72) { const [x, y] = pt(s); s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.closePath(); ctx.stroke();
        const [gx, gy] = pt(0); ctx.fillStyle = '#fff'; ctx.fillRect(gx - 1, gy - 6, 2, 12);
        view.horses.forEach(h => {
          const [x, y] = pt(Math.max(0, sim.D - h.x));
          ctx.fillStyle = h.mine ? '#ffd34d' : h.cap; ctx.beginPath(); ctx.arc(x, y, h.mine ? 4.5 : 2.6, 0, Math.PI * 2); ctx.fill();
          if (h.mine) { ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke(); }
        });
      }
      // 映像のファイルが無いときの簡単な絵（上から見た図を大きく）
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
