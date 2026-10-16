// レースの画面：横から追うカメラ・柵・ハロン棒・ゴール板・ミニマップ・順位・実況・確定の掲示板
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, A = HS.Art;
  const RV = HS.RaceView = {};
  const FC = () => HS.DATA.frameColors, FT = () => HS.DATA.frameText;

  // 馬ごとの勝負服（プレイヤーは自分の服、ほかは名前から決める）
  RV.silksOf = function (horse) {
    if (horse.owner === 'P') return HS.World.get().player.silks;
    const r = U.hashRng('silks:' + (horse.name || horse.id));
    const cols = ['#c8102e', '#003da5', '#ffd100', '#00843d', '#ffffff', '#111111', '#ff6a13', '#7a2182', '#e04e9a', '#8a5a2b', '#5bc2e7', '#a4d65e'];
    const base = r.pick(cols); let sub = r.pick(cols); if (sub === base) sub = base === '#ffffff' ? '#111111' : '#ffffff';
    return { base, sub, pattern: r.pick(Object.keys(A.SILK_PATTERNS)) };
  };

  // 再生。el＝入れ物、data＝{race, sim, runners}。閉じたら resolve
  RV.play = function (el, data, opts) {
    opts = opts || {};
    return new Promise(resolve => {
      const { race, sim, runners } = data;
      const results = sim.results;
      el.innerHTML = `
        <div class="rv">
          <div class="rv-stage"><canvas class="rv-canvas"></canvas></div>
          <div class="rv-bar">
            <div class="rv-speed">${[1, 2, 4].map(s => `<button data-sp="${s}" class="${s === (opts.speed || 1) ? 'on' : ''}">×${s}</button>`).join('')}</div>
            <button class="rv-skip">ゴールまで飛ばす</button>
          </div>
        </div>`;
      const cv = el.querySelector('canvas');
      // スマホの縦向きでは正方形に近い画面にして、文字を読みやすくする
      const narrow = (el.clientWidth || 960) < 600;
      const VW = narrow ? 640 : 960, VH = narrow ? 560 : 540;
      cv.style.aspectRatio = `${VW} / ${VH}`;
      const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
      cv.width = VW * dpr; cv.height = VH * dpr;
      const ctx = cv.getContext('2d');
      ctx.scale(dpr, dpr);
      let speed = opts.speed || 1.35;
      el.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => { speed = +b.dataset.sp; el.querySelectorAll('[data-sp]').forEach(x => x.classList.toggle('on', x === b)); if (opts.onSpeed) opts.onSpeed(speed); });
      const frames = sim.frames;
      const tEnd = frames[frames.length - 1].t;
      const winT = results[0].time;
      let T = -2.5; // 発走前の間
      let last = null, done = false, finishShown = 0;
      const n = runners.length;
      const meta = runners.map((x, i) => ({
        x, i, silks: RV.silksOf(x.horse), marks: A.marks(x.horse.name || x.horse.id), coat: x.horse.coat,
        cap: FC()[(x.frame - 1) % 8], phOff: (i * 0.137) % 1,
      }));
      const cam = { x: 0, pxm: 14 };
      const finT = runners.map(x => { const r = results.find(rr => rr.horse === x.horse); return r ? r.time : null; });
      const evs = sim.events.slice();
      let telop = { text: `${race.short || race.name}、まもなく発走です。`, t: -9 };
      const course = HS.DATA.courses[race.course] || HS.DATA.courses['東京'];
      el.querySelector('.rv-skip').onclick = () => { T = Math.max(T, winT + 0.01); };

      function posAt(t) {
        if (t <= 0) return meta.map(() => [0, 0, 0]);
        let i = Math.floor(t / 0.2) - 1;
        i = U.clamp(i, 0, frames.length - 2);
        while (i < frames.length - 2 && frames[i + 1].t < t) i++;
        while (i > 0 && frames[i].t > t) i--;
        const a = frames[i], b = frames[i + 1];
        const k = U.clamp((t - a.t) / Math.max(1e-6, b.t - a.t), 0, 1);
        return a.p.map((pa, j) => { const pb = b.p[j]; return [pa[0] + (pb[0] - pa[0]) * k, pa[1] + (pb[1] - pa[1]) * k, pa[2] + (pb[2] - pa[2]) * k]; });
      }

      function draw() {
        const P = posAt(Math.max(0, T));
        const D = sim.D;
        // カメラ：先頭から6番手までが入るように
        // 順位：ゴールした馬は着順、それ以外は位置
        const order = P.map((p, j) => [p[0], j, finT[j] != null && finT[j] <= T ? finT[j] : null]).sort((a, b) => (a[2] != null && b[2] != null) ? a[2] - b[2] : a[2] != null ? -1 : b[2] != null ? 1 : b[0] - a[0]);
        const lead = order[0][0], sixth = order[Math.min(5, order.length - 1)][0];
        const spread = Math.max(10, lead - sixth);
        let tgtPxm = U.clamp(760 / (spread + 14), 9, 18);
        let tgtX = (lead + sixth) / 2 + 4;
        if (T < 1) { tgtX = 8; tgtPxm = 13; }
        if (lead > D - 10) { tgtX = Math.min(tgtX, D - 6); }
        cam.pxm += (tgtPxm - cam.pxm) * 0.06;
        cam.x += (tgtX - cam.x) * 0.12;
        const X = wx => (wx - cam.x) * cam.pxm + VW / 2;
        // 空
        const sky = ctx.createLinearGradient(0, 0, 0, 170);
        sky.addColorStop(0, '#5f9fdc'); sky.addColorStop(1, '#cfe5f3');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, 175);
        // 雲
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        for (let i = 0; i < 6; i++) { const cx = ((i * 211 - cam.x * cam.pxm * 0.03) % (VW + 200) + VW + 200) % (VW + 200) - 100; ctx.beginPath(); ctx.ellipse(cx, 40 + (i % 3) * 22, 60, 14, 0, 0, Math.PI * 2); ctx.ellipse(cx + 30, 34 + (i % 3) * 22, 36, 14, 0, 0, Math.PI * 2); ctx.fill(); }
        // 遠くの山
        ctx.fillStyle = '#7d9fb8';
        ctx.beginPath(); ctx.moveTo(0, 150);
        for (let i = 0; i <= 24; i++) { const x = i * 45 - ((cam.x * cam.pxm * 0.05) % 45); ctx.lineTo(x, 118 + Math.sin(i * 1.7 + Math.floor(cam.x * cam.pxm * 0.05 / 45)) * 14); }
        ctx.lineTo(VW, 150); ctx.closePath(); ctx.fill();
        // 林
        const par = 0.3;
        ctx.fillStyle = '#2f5d32';
        for (let i = -2; i < 30; i++) {
          const base = Math.floor(cam.x * cam.pxm * par / 40);
          const k = base + i; const x = k * 40 - cam.x * cam.pxm * par + VW / 2;
          if (x < -40 || x > VW + 40) continue;
          const h = 22 + (U.hash('t' + k) % 18);
          ctx.beginPath(); ctx.ellipse(x, 160 - h / 2, 22, h / 2 + 6, 0, 0, Math.PI * 2); ctx.fill();
        }
        // 内馬場
        ctx.fillStyle = '#5c9a43'; ctx.fillRect(0, 160, VW, 50);
        // 大きな画面（ゴール前）
        const sx = (D - 120 - cam.x) * cam.pxm * 0.55 + VW / 2;
        if (sx > -260 && sx < VW + 260) {
          ctx.fillStyle = '#1b1f27'; ctx.fillRect(sx - 120, 112, 240, 72);
          ctx.fillStyle = '#26344a'; ctx.fillRect(sx - 112, 118, 224, 56);
          ctx.fillStyle = '#9fd0ff'; ctx.font = 'bold 18px "Noto Sans JP", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(race.short || race.name, sx, 140);
          ctx.fillStyle = '#ffd34d'; ctx.font = 'bold 14px "Noto Sans JP", sans-serif';
          ctx.fillText(T > 0 ? U.time(Math.min(T, winT)) : '0.0', sx, 162);
          ctx.fillStyle = '#555'; ctx.fillRect(sx - 4, 184, 8, 26);
        }
        // 走路
        const grassA = race.surface === 'ダ' ? '#a77a4c' : '#3f8f3a', grassB = race.surface === 'ダ' ? '#9a6f43' : '#4a9c43';
        ctx.fillStyle = grassA; ctx.fillRect(0, 206, VW, 290);
        // 刈り目（10mごと）
        ctx.fillStyle = grassB;
        const s0 = Math.floor((cam.x - VW / 2 / cam.pxm) / 10) - 1;
        for (let k = s0; k < s0 + VW / cam.pxm / 10 + 3; k++) {
          if (k % 2) continue;
          const x1 = X(k * 10), x2 = X(k * 10 + 10);
          ctx.beginPath(); ctx.moveTo(x1, 206); ctx.lineTo(x2, 206); ctx.lineTo(x2 - 40, 496); ctx.lineTo(x1 - 40, 496); ctx.closePath(); ctx.fill();
        }
        if (race.surface === 'ダ') { ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < 40; i++) ctx.fillRect((i * 97 - cam.x * cam.pxm) % VW + (i * 97 - cam.x * cam.pxm < 0 ? VW : 0), 210 + (i * 53) % 280, 3, 2); }
        // 内ラチ
        ctx.fillStyle = '#e9edf0'; ctx.fillRect(0, 196, VW, 5);
        ctx.fillStyle = '#c8cdd2';
        const p0 = Math.floor((cam.x - VW / 2 / cam.pxm) / 4);
        for (let k = p0; k < p0 + VW / cam.pxm / 4 + 2; k++) ctx.fillRect(X(k * 4), 196, 2, 12);
        // ハロン棒（残り200mごと）
        for (let r = 200; r < D; r += 200) {
          const x = X(D - r);
          if (x < -30 || x > VW + 30) continue;
          ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, 150, 5, 52);
          for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? '#fff' : '#d22'; ctx.fillRect(x - 3, 150 + k * 9, 7, 9); }
          ctx.fillStyle = '#222'; ctx.font = 'bold 13px "Noto Sans JP", sans-serif'; ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(x - 18, 132, 36, 16);
          ctx.fillStyle = '#c11'; ctx.fillText(String(r), x, 141);
        }
        // ゲート
        const gx = X(-1.5);
        if (gx > -120 && gx < VW + 120) {
          for (let l = 0; l < n; l++) {
            const yy = 214 + l * (270 / Math.max(8, n));
            ctx.fillStyle = '#2e7d4f'; ctx.fillRect(gx - 6, yy - 30, 12, 34);
            ctx.fillStyle = '#e8e8e8'; ctx.fillRect(gx - 6, yy - 32, 12, 4);
          }
        }
        // ゴール
        const fx = X(D);
        if (fx > -60 && fx < VW + 60) {
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx, 206); ctx.lineTo(fx - 40, 496); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.fillRect(fx - 3, 108, 6, 96);
          ctx.fillStyle = '#d4202a'; ctx.beginPath(); ctx.arc(fx, 104, 20, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('GOAL', fx, 104);
        }
        // 馬（奥の進路から）
        const items = P.map((p, j) => ({ p, j })).sort((a, b) => a.p[1] - b.p[1]);
        for (const { p, j } of items) {
          const m = meta[j];
          const lane = U.clamp(p[1], 0, 12);
          const y = 240 + lane * 17;
          const ls = 0.8 + lane * 0.028;
          const s = Math.max(0.42, cam.pxm * 0.043 * ls);
          const x = X(p[0]) - lane * 3.2;
          if (x < -120 || x > VW + 160) continue;
          const ph = (p[0] / 6.5 + m.phOff) % 1;
          A.horse(ctx, x, y, s, T <= 0 ? 0.1 : ph, { coat: m.coat, marks: m.marks, silks: m.silks, cap: m.cap, num: m.x.num });
          if (m.x.mine || order[0][1] === j) {
            const ty = y - 80 * s;
            const label = m.x.horse.name;
            ctx.font = 'bold 13px "Noto Sans JP", sans-serif';
            const tw = ctx.measureText(label).width + 26;
            ctx.fillStyle = m.x.mine ? 'rgba(212,160,23,0.95)' : 'rgba(12,26,43,0.85)';
            roundRect(ctx, x - tw / 2, ty - 22, tw, 20, 5); ctx.fill();
            ctx.fillStyle = FC()[(m.x.frame - 1) % 8]; ctx.fillRect(x - tw / 2 + 4, ty - 19, 14, 14);
            ctx.fillStyle = FT()[(m.x.frame - 1) % 8]; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(m.x.num), x - tw / 2 + 11, ty - 12);
            ctx.fillStyle = m.x.mine ? '#1a1206' : '#fff'; ctx.font = 'bold 13px "Noto Sans JP", sans-serif'; ctx.textAlign = 'left'; ctx.fillText(label, x - tw / 2 + 21, ty - 11.5);
            if (m.x.mine) { ctx.fillStyle = '#d4a017'; ctx.beginPath(); ctx.moveTo(x - 6, ty - 2); ctx.lineTo(x + 6, ty - 2); ctx.lineTo(x, ty + 6); ctx.closePath(); ctx.fill(); }
          }
        }
        // 外ラチと手前の芝
        ctx.fillStyle = '#e9edf0'; ctx.fillRect(0, 496, VW, 6);
        ctx.fillStyle = '#356f2f'; ctx.fillRect(0, 502, VW, VH - 502);
        for (let k = p0; k < p0 + VW / cam.pxm / 4 + 2; k++) { ctx.fillStyle = '#c8cdd2'; ctx.fillRect(X(k * 4) - 40, 496, 3, 16); }
        // ---- 画面の飾り ----
        if (opts.onTick) opts.onTick(Math.max(0, sim.D - lead), sim.straight, T > 0 && T < winT, T >= winT);
        hudTitle();
        hudMap(P);
        hudOrder(order);
        hudClock(lead);
        hudTelop();
        if (T > winT + 0.3) hudBoard();
      }

      function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
      function gradeColor(g, region) { if (region === '地方') return '#6a3fb5'; return g === 'G1' ? '#1d4fb8' : g === 'G2' ? '#c0262d' : g === 'G3' ? '#1f8a3a' : '#5a6270'; }
      function hudTitle() {
        const badge = HS.Races.gradeBadge(race);
        ctx.fillStyle = 'rgba(10,22,38,0.82)'; roundRect(ctx, 12, 12, 330, 54, 8); ctx.fill();
        ctx.strokeStyle = '#c9a43a'; ctx.lineWidth = 1.5; ctx.stroke();
        let x = 22;
        if (badge) { ctx.fillStyle = badge === '重賞' ? '#8a6a1c' : gradeColor(race.grade, race.region); roundRect(ctx, x, 22, 44, 22, 4); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(badge, x + 22, 33.5); x += 52; }
        ctx.fillStyle = '#fff'; ctx.font = '900 20px "Noto Serif JP", serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(race.short || race.name, x, 33);
        ctx.fillStyle = '#c8d3e2'; ctx.font = '12px "Noto Sans JP", sans-serif';
        ctx.fillText(`${race.course} ${race.surface}${race.dist}m（${course.dir || ''}）  馬場：${race.ground || '良'}  ${n}頭`, 22, 56);
      }
      function hudMap(P) {
        const bx = VW - 232, by = 12, bw = 220, bh = 112;
        ctx.fillStyle = 'rgba(10,22,38,0.82)'; roundRect(ctx, bx, by, bw, bh, 8); ctx.fill();
        ctx.strokeStyle = '#c9a43a'; ctx.lineWidth = 1.5; ctx.stroke();
        const L = sim.lap || 2000; let a = Math.max(sim.straight, L * 0.22); let r = (L - 2 * a) / (2 * Math.PI);
        if (r < L * 0.06) { a = L * 0.28; r = (L - 2 * a) / (2 * Math.PI); }
        const sc = Math.min((bw - 30) / (2 * a + 2 * r), (bh - 26) / (2 * r));
        const cx = bx + bw / 2, cy = by + bh / 2 + 4;
        const pt = s => { // s：ゴールからさかのぼった距離（周回の上）
          s = ((s % L) + L) % L;
          const dirSign = course.dir === '左' ? -1 : 1;
          // 直線（下）のゴール位置から、進行方向と逆にたどる
          const goalX = Math.min(a, sim.straight) - a / 2;
          let u = s; let x, y;
          const seg1 = a / 2 + goalX; // ゴールから下の直線の端まで
          if (u <= seg1) { x = goalX - u; y = r; }
          else if ((u -= seg1) <= Math.PI * r) { const ang = Math.PI / 2 + u / r; x = -a / 2 + Math.cos(ang) * r; y = Math.sin(ang) * r; }
          else if ((u -= Math.PI * r) <= a) { x = -a / 2 + u; y = -r; }
          else if ((u -= a) <= Math.PI * r) { const ang = -Math.PI / 2 + u / r; x = a / 2 + Math.cos(ang) * r; y = Math.sin(ang) * r; }
          else { u -= Math.PI * r; x = a / 2 - u; y = r; }
          return [cx + x * sc * dirSign, cy + y * sc];
        };
        ctx.strokeStyle = race.surface === 'ダ' ? '#b88a57' : '#59a84f'; ctx.lineWidth = 7; ctx.beginPath();
        for (let s = 0; s <= L; s += L / 80) { const [x, y] = pt(s); s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.closePath(); ctx.stroke();
        const [gx, gy] = pt(0); ctx.fillStyle = '#fff'; ctx.fillRect(gx - 1, gy - 7, 2, 14);
        const items = P.map((p, j) => ({ p, j })).sort((A1, B1) => A1.p[0] - B1.p[0]);
        for (const { p, j } of items) {
          const m = meta[j];
          const [x, y] = pt(Math.max(0, sim.D - p[0]));
          ctx.fillStyle = FC()[(m.x.frame - 1) % 8]; ctx.beginPath(); ctx.arc(x, y, m.x.mine ? 4.5 : 3.2, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = m.x.mine ? '#ffd34d' : 'rgba(0,0,0,0.6)'; ctx.lineWidth = m.x.mine ? 2 : 0.8; ctx.stroke();
        }
        ctx.fillStyle = '#c8d3e2'; ctx.font = '11px "Noto Sans JP", sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(race.course, bx + 8, by + 16);
      }
      function hudOrder(order) {
        const bx = VW - 152, by = 132, rows = Math.min(n, 10);
        ctx.fillStyle = 'rgba(10,22,38,0.78)'; roundRect(ctx, bx, by, 140, 14 + rows * 21, 8); ctx.fill();
        for (let k = 0; k < rows; k++) {
          const m = meta[order[k][1]];
          const y = by + 8 + k * 21;
          ctx.fillStyle = '#ffd34d'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText(String(k + 1), bx + 18, y + 3);
          ctx.fillStyle = FC()[(m.x.frame - 1) % 8]; ctx.fillRect(bx + 24, y + 1, 18, 17);
          ctx.fillStyle = FT()[(m.x.frame - 1) % 8]; ctx.textAlign = 'center'; ctx.fillText(String(m.x.num), bx + 33, y + 3);
          ctx.fillStyle = m.x.mine ? '#ffd34d' : '#fff'; ctx.font = (m.x.mine ? 'bold ' : '') + '12px "Noto Sans JP", sans-serif'; ctx.textAlign = 'left';
          const nm = m.x.horse.name; ctx.fillText(nm.length > 7 ? nm.slice(0, 7) + '…' : nm, bx + 48, y + 3);
        }
      }
      function hudClock(lead) {
        const rem = Math.max(0, Math.ceil(sim.D - lead));
        ctx.fillStyle = 'rgba(10,22,38,0.82)'; roundRect(ctx, 12, 74, 150, 30, 6); ctx.fill();
        ctx.fillStyle = '#ffd34d'; ctx.font = 'bold 16px "Noto Sans JP", sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(T <= 0 ? '発走前' : rem > 0 ? `残り ${rem}m` : 'ゴール', 22, 89);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText(T > 0 ? U.time(Math.min(T, winT)) : '', 154, 89);
      }
      function hudTelop() {
        while (evs.length && evs[0].t <= T) { const e = evs.shift(); telop = { text: e.text, t: T, kind: e.kind }; }
        if (!telop || T - telop.t > 7) return;
        const y = VH - 84;
        ctx.fillStyle = 'rgba(8,16,30,0.86)'; roundRect(ctx, 60, y, VW - 120, 46, 8); ctx.fill();
        ctx.strokeStyle = telop.kind === 'finish' ? '#ffd34d' : '#c9a43a'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 19px "Noto Sans JP", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(telop.text, VW / 2, y + 23, VW - 150);
      }
      function hudBoard() {
        // 確定の掲示板（上位5頭）
        const k = Math.min(1, (T - winT - 0.3) / 0.5);
        const bw = 300, bh = 196, bx = VW / 2 - bw / 2, by = 128;
        ctx.globalAlpha = k;
        ctx.fillStyle = '#0b0b0b'; roundRect(ctx, bx, by, bw, bh, 8); ctx.fill();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#ff9a1f'; ctx.font = 'bold 15px "Noto Sans JP", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const fin = T > winT + 2.5;
        ctx.fillText(fin ? '確 定' : '審 議 中…', bx + bw / 2, by + 18);
        for (let i = 0; i < Math.min(5, results.length); i++) {
          const r = results[i]; const y = by + 44 + i * 30;
          ctx.fillStyle = '#ff9a1f'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), bx + 34, y);
          ctx.fillStyle = '#ffb648'; ctx.font = 'bold 26px monospace'; ctx.fillText(String(r.num), bx + 84, y);
          ctx.fillStyle = r.mine ? '#ffe680' : '#ffcf8a'; ctx.font = 'bold 14px "Noto Sans JP", sans-serif'; ctx.textAlign = 'left';
          ctx.fillText(r.horse.name, bx + 112, y - 6, 120);
          ctx.fillStyle = '#ff9a1f'; ctx.font = '12px "Noto Sans JP", sans-serif'; ctx.fillText(i === 0 ? U.time(r.time) : r.margin, bx + 112, y + 9);
          if (i === 0) { ctx.fillStyle = '#ff9a1f'; ctx.textAlign = 'right'; ctx.fillText(`上がり ${r.last3f ? r.last3f.toFixed(1) : '-'}`, bx + bw - 12, y + 9); }
        }
        ctx.globalAlpha = 1;
      }

      function loop(ts) {
        if (done) return;
        if (last == null) last = ts;
        const dt = Math.min(0.1, (ts - last) / 1000); last = ts;
        const Tprev = T;
        T += dt * speed;
        if (Tprev < 0 && T >= 0 && opts.onStart) opts.onStart();
        draw();
        if (T > winT + 0.3 && !finishShown) { finishShown = 1; }
        if (T > Math.min(tEnd, winT + 6) && finishShown === 1) {
          finishShown = 2;
          const bar = el.querySelector('.rv-bar');
          bar.innerHTML = '<button class="btn gold rv-close">結果を見る</button>';
          bar.querySelector('.rv-close').onclick = () => { done = true; resolve(); };
        }
        requestAnimationFrame(loop);
      }
      // テスト用：ある時刻の1枚だけ描く
      if (opts.stillAt != null) { T = opts.stillAt; for (let i = 0; i < 60; i++) draw(); return resolve(); }
      requestAnimationFrame(loop);
    });
  };
})();
