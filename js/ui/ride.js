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
          <div class="ride-stage"><canvas class="ride-canvas"></canvas>
            <div class="ride-msg"></div></div>
          <div class="ride-pad">
            <div class="ride-lanes"><button class="rb lane" data-c="left" aria-label="内へ">◀<small>内へ</small></button><button class="rb lane" data-c="right" aria-label="外へ">▶<small>外へ</small></button></div>
            <button class="rb hold" data-c="hold">抑える<small>押している間</small></button>
            <button class="rb whip" data-c="whip">ムチ</button>
            <button class="rb push" data-c="push">追う<small>拍子に合わせて</small></button>
          </div>
          <div class="ride-help small muted">ゲームパッド：A 追う・B ムチ・LB/RB 抑える・十字キー 進路　キーボード：Z 追う・X ムチ・Shift 抑える・←→ 進路</div>
        </div>`;
      const cv = el.querySelector('canvas');
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
      let flash = null; // 画面の真ん中に出す短い言葉
      const say = (text, cls) => { flash = { text, cls, t: performance.now() }; };

      // ---------- 操作 ----------
      let holdTouch = false, holdKey = false, holdPad = false;
      const setHold = () => S.ctl.hold(sim, holdTouch || holdKey || holdPad);
      const doPush = () => {
        const b = S.ctl.push(sim);
        if (b === 'good' && !sim.ctl.pushes) say('好スタート！', 'good');
        else if (b === 'late') say('出遅れ……', 'bad');
        else if (b === 'good') beatFx = { t: performance.now(), good: true };
        else if (b === 'fast') beatFx = { t: performance.now(), good: false };
        if (AU) AU.se('click');
      };
      const doWhip = () => { const b = S.ctl.whip(sim); if (b === 'yore') say('よれた！', 'bad'); else if (b === 'tired') say('ムチが効かない', 'bad'); if (AU) AU.se('tab'); };
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
      }));

      function frame(ts) {
        if (done) return;
        if (last == null) last = ts;
        const dt = Math.min(0.1, (ts - last) / 1000) * RD.speed; last = ts;
        pollPad();
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
        if (HS.RideCam) HS.RideCam.draw(ctx, VW, VH, view); else fallback(view);
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
        window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp);
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
        if (c.wide) notes.push(['外を回っている', '']);
        if (c.hold && !c.kakariNow) notes.push(['ためている', 'good']);
        if (me.E <= 0) notes.push(['バテた', 'bad']);
        msgEl.innerHTML = notes.map(([t, k]) => `<span class="${k}">${t}</span>`).join('');
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
