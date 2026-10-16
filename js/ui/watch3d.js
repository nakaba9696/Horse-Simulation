// 観戦（自分が乗らないレース）を 3D のテレビ中継のカメラで見せる。WebGL が使えなければ横から追う 2D（raceview.js）に戻す
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U;
  const WV = HS.Watch3D = {};
  const FC = () => HS.DATA.frameColors, FT = () => HS.DATA.frameText;

  // RaceView.play と同じ呼び方。data＝{race, sim, runners}
  WV.play = function (el, data, opts) {
    if (!(HS.Race3D && HS.Race3D.supported()) || WV.no3d) return HS.RaceView.play(el, data, opts);
    opts = opts || {};
    return new Promise(resolve => {
      const { race, sim, runners } = data;
      const results = sim.results, frames = sim.frames;
      const course = HS.DATA.courses[race.course] || HS.DATA.courses['東京'];
      const geo = HS.Track.forRace(race).geo;
      el.innerHTML = `<div class="rv"><div class="ride-stage"><canvas class="ride-3d"></canvas><canvas class="ride-canvas"></canvas></div>
        <div class="rv-bar"><div class="rv-speed">${(opts.speeds || [1, 2, 4]).map(s => `<button data-sp="${s}" class="${s === (opts.speed || 1) ? 'on' : ''}">×${s}</button>`).join('')}</div>
        <div class="rv-speed"><button data-cam="tv" class="on">中継</button><button data-cam="ride">騎手目線</button></div>${opts.seek ? '<button class="rv-seek">10秒先へ</button>' : ''}<button class="rv-skip">ゴールまで飛ばす</button></div></div>`;
      const narrow = (el.clientWidth || 960) < 600;
      const VW = narrow ? 640 : 960, VH = narrow ? 560 : 540;
      const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
      const cv = el.querySelector('.ride-canvas'), cv3 = el.querySelector('.ride-3d');
      cv.style.aspectRatio = cv3.style.aspectRatio = `${VW} / ${VH}`;
      cv.width = VW * dpr; cv.height = VH * dpr;
      const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
      const meta = runners.map(x => ({ x, silks: HS.RaceView.silksOf(x.horse), cap: FC()[(x.frame - 1) % 8] }));
      // 見どころの馬：自分の馬、いなければ1番人気
      const focus = Math.max(0, runners.findIndex(x => x.mine || x.rider === 'P') >= 0 ? runners.findIndex(x => x.mine || x.rider === 'P') : runners.findIndex(x => x.pop === 1));
      let r3;
      try {
        r3 = HS.Race3D.create(cv3, {
          D: sim.D, surface: race.surface, ground: race.ground, weather: race.weather, track: sim.track || HS.Track.forRace(race).track,
          course: { name: race.course, dir: course.dir, lap: geo.lap, straight: geo.straight, slope: geo.slope },
          horses: meta.map(m => ({ num: m.x.num, frame: m.x.frame, cap: m.cap, silks: m.silks, coat: m.x.horse.coat, name: m.x.horse.name, age: (HS.World.get() && !race.free && !data.replay ? HS.World.get().year : race.year) - m.x.horse.born, mine: !!(m.x.mine || m.x.rider === 'P') })),
        });
        r3.resize(cv3.clientWidth || VW, cv3.clientHeight || VH, dpr);
      } catch (err) { console.warn(err); el.innerHTML = ''; return HS.RaceView.play(el, data, opts).then(resolve); }
      let speed = opts.speed || 1.35, cam = 'tv';
      // 画面をドラッグでカメラを回す（2回タップで戻す）
      const orbit = { yaw: 0, pitch: 0, zoom: 1 };
      const stage = el.querySelector('.ride-stage');
      let drag = null, lastTap = 0;
      stage.addEventListener('pointerdown', ev => { const now = performance.now(); if (now - lastTap < 300) { orbit.yaw = 0; orbit.pitch = 0; lastTap = 0; return; } lastTap = now; drag = { x: ev.clientX, y: ev.clientY, id: ev.pointerId }; });
      stage.addEventListener('pointermove', ev => { if (!drag || ev.pointerId !== drag.id) return; orbit.yaw -= (ev.clientX - drag.x) * 0.009; orbit.pitch = U.clamp(orbit.pitch + (ev.clientY - drag.y) * 0.006, -0.3, 1.2); drag.x = ev.clientX; drag.y = ev.clientY; });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => stage.addEventListener(n, () => { drag = null; }));
      el.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => { speed = +b.dataset.sp; el.querySelectorAll('[data-sp]').forEach(x => x.classList.toggle('on', x === b)); if (opts.onSpeed) opts.onSpeed(speed); });
      el.querySelectorAll('[data-cam]').forEach(b => b.onclick = () => { cam = b.dataset.cam; el.querySelectorAll('[data-cam]').forEach(x => x.classList.toggle('on', x === b)); });
      const winT = results[0].time, tEnd = frames[frames.length - 1].t;
      const finT = runners.map(x => { const r = results.find(rr => rr.horse === x.horse); return r ? r.time : null; });
      el.querySelector('.rv-skip').onclick = () => { T = Math.max(T, winT + 0.01); };
      const sk = el.querySelector('.rv-seek'); if (sk) sk.onclick = () => { T = Math.min(Math.max(T, 0) + 10, winT + 0.01); }; // リプレイ：10秒送り
      const evs = sim.events.slice();
      let telop = { text: `${race.short || race.name}、まもなく発走です。`, t: -9 };
      let T = -3, last = null, done = false, shownEnd = false;
      const posAt = t => {
        if (t <= 0) return runners.map((x, j) => [0, (x.num - 1) * 0.5, 0]);
        let i = U.clamp(Math.floor(t / 0.2) - 1, 0, frames.length - 2);
        while (i < frames.length - 2 && frames[i + 1].t < t) i++;
        while (i > 0 && frames[i].t > t) i--;
        const a = frames[i], b = frames[i + 1], k = U.clamp((t - a.t) / Math.max(1e-6, b.t - a.t), 0, 1);
        return a.p.map((pa, j) => { const pb = b.p[j]; return [pa[0] + (pb[0] - pa[0]) * k, pa[1] + (pb[1] - pa[1]) * k, pa[2] + (pb[2] - pa[2]) * k]; });
      };
      function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
      function hud(P) {
        ctx.clearRect(0, 0, VW, VH);
        const order = P.map((p, j) => [p[0], j, finT[j] != null && finT[j] <= T ? finT[j] : null]).sort((a, b) => (a[2] != null && b[2] != null) ? a[2] - b[2] : a[2] != null ? -1 : b[2] != null ? 1 : b[0] - a[0]);
        const lead = order[0][0];
        const rem = Math.max(0, Math.ceil(sim.D - lead));
        // 左上：レース名・残り・時計
        ctx.fillStyle = 'rgba(8,18,32,0.82)'; rr(10, 10, 230, 62, 8); ctx.fill();
        ctx.fillStyle = '#ffd34d'; ctx.font = 'bold 15px "Noto Sans JP", sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`${race.short || race.name}`, 20, 16, 210);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Noto Sans JP", sans-serif';
        ctx.fillText(T <= 0 ? '発走前' : rem > 0 ? `残り ${rem}m` : 'ゴール', 20, 42);
        ctx.textAlign = 'right'; ctx.font = '14px monospace'; ctx.fillText(T > 0 ? U.time(Math.min(T, winT)) : '', 232, 44);
        // 右：順位（上位8頭）
        const rows = Math.min(8, order.length), bx = VW - 156, by = 10;
        ctx.fillStyle = 'rgba(8,18,32,0.78)'; rr(bx, by, 146, 12 + rows * 22, 8); ctx.fill();
        for (let k = 0; k < rows; k++) {
          const m = meta[order[k][1]], y = by + 7 + k * 22;
          ctx.fillStyle = '#ffd34d'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText(String(k + 1), bx + 18, y + 3);
          ctx.fillStyle = FC()[(m.x.frame - 1) % 8]; ctx.fillRect(bx + 24, y + 1, 18, 17);
          ctx.fillStyle = FT()[(m.x.frame - 1) % 8]; ctx.textAlign = 'center'; ctx.fillText(String(m.x.num), bx + 33, y + 3);
          const mine = m.x.mine || m.x.rider === 'P';
          ctx.fillStyle = mine ? '#ffd34d' : '#fff'; ctx.font = (mine ? 'bold ' : '') + '12px "Noto Sans JP", sans-serif'; ctx.textAlign = 'left';
          const nm = m.x.horse.name; ctx.fillText(nm.length > 7 ? nm.slice(0, 7) + '…' : nm, bx + 48, y + 3);
        }
        // 下：実況の字幕
        while (evs.length && evs[0].t <= T) { const ev = evs.shift(); telop = { text: ev.text, t: T, kind: ev.kind }; }
        if (telop && T - telop.t < 7) {
          const y = VH - 70;
          ctx.fillStyle = 'rgba(8,16,30,0.86)'; rr(40, y, VW - 80, 44, 8); ctx.fill();
          ctx.strokeStyle = telop.kind === 'finish' ? '#ffd34d' : '#c9a43a'; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = 'bold 18px "Noto Sans JP", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(telop.text, VW / 2, y + 22, VW - 110);
        }
        // 確定の掲示板
        if (T > winT + 0.4) {
          const k = Math.min(1, (T - winT - 0.4) / 0.5), bw = 280, bh = 186, bx2 = VW / 2 - bw / 2, by2 = 90;
          ctx.globalAlpha = k; ctx.fillStyle = '#0b0b0b'; rr(bx2, by2, bw, bh, 8); ctx.fill(); ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.stroke();
          ctx.fillStyle = '#ff9a1f'; ctx.font = 'bold 15px "Noto Sans JP", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(T > winT + 2.5 ? '確 定' : '審 議 中', bx2 + bw / 2, by2 + 18);
          for (let i = 0; i < Math.min(5, results.length); i++) {
            const r = results[i], y = by2 + 42 + i * 28;
            ctx.fillStyle = '#ff9a1f'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), bx2 + 30, y);
            ctx.fillStyle = '#ffb648'; ctx.font = 'bold 24px monospace'; ctx.fillText(String(r.num), bx2 + 76, y);
            ctx.fillStyle = r.mine ? '#ffe680' : '#ffcf8a'; ctx.font = 'bold 14px "Noto Sans JP", sans-serif'; ctx.textAlign = 'left'; ctx.fillText(r.horse.name, bx2 + 104, y - 5, 116);
            ctx.fillStyle = '#ff9a1f'; ctx.font = '12px "Noto Sans JP", sans-serif'; ctx.fillText(i === 0 ? U.time(r.time) : r.margin, bx2 + 104, y + 9);
          }
          ctx.globalAlpha = 1;
          // レコードを破ったら、掲示板の下に「RECORD」と前のレコードとの差（data.rec＝W.noteRecord の戻り値）
          if (data.rec && T > winT + 0.9) {
            const a2 = Math.min(1, (T - winT - 0.9) / 0.4), yy = by2 + bh + 34, pulse = 0.75 + 0.25 * Math.sin(T * 6);
            ctx.globalAlpha = a2; ctx.fillStyle = `rgba(190,28,20,${0.8 * pulse})`; rr(VW / 2 - 130, yy - 26, 260, 52, 8); ctx.fill();
            ctx.fillStyle = '#ffe08a'; ctx.font = '900 30px "Noto Serif JP", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('RECORD', VW / 2 - 34, yy);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 15px "Noto Sans JP", sans-serif'; ctx.fillText(`${data.rec.diff < 0 ? '−' : '+'}${Math.abs(data.rec.diff).toFixed(1)}`, VW / 2 + 82, yy);
            ctx.globalAlpha = 1;
          }
        }
      }
      function loop(ts) {
        if (done) return;
        if (last == null) last = ts;
        const dt = Math.min(0.1, (ts - last) / 1000); last = ts;
        const Tp = T; T += dt * speed;
        if (Tp < 0 && T >= 0 && opts.onStart) opts.onStart();
        const P = posAt(Math.max(0, T));
        const lead = Math.max(...P.map(p => p[0]));
        if (opts.onTick) opts.onTick(sim.D - lead, sim.D - lead < sim.straight, T > 0 && T < winT, T >= winT);
        r3.render({ t: T, me: focus, phase: T < 0 ? 'gate' : T > winT ? 'finish' : 'race', horses: P.map(p => ({ x: p[0], lane: p[1], v: p[2] })) }, T < 0 ? 'gate' : cam, orbit);
        hud(P);
        if (T > Math.min(tEnd, winT + 6) && !shownEnd) {
          shownEnd = true;
          const bar = el.querySelector('.rv-bar');
          bar.innerHTML = '<button class="btn gold rv-close">結果を見る</button>';
          bar.querySelector('.rv-close').onclick = () => { done = true; r3.dispose(); resolve(); };
        }
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    });
  };
})();
