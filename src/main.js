// 画面の操作（出馬表・レースの描画・結果）
(function (HS) {
  const SAVE_KEY = 'horse-sim-save';
  const BET_STEPS = [0, 100, 200, 500, 1000, 2000, 5000, 10000];
  // 馬番ごとの色（帽子と馬番の地）
  const COLORS = ['#f5f5f5', '#222222', '#d32f2f', '#1565c0', '#f9a825', '#2e7d32', '#ef6c00', '#ec407a',
    '#6a1b9a', '#00838f', '#8d6e63', '#9e9d24'];
  const TEXT_ON = ['#222', '#fff', '#fff', '#fff', '#222', '#fff', '#fff', '#fff', '#fff', '#fff', '#fff', '#222'];

  const $ = (id) => document.getElementById(id);
  let game = load() || HS.newGame(Date.now() >>> 0);
  let card = null;
  let bets = {};      // `${type}:${index}` -> amount
  let playback = null;

  function load() {
    try { return HS.migrate(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(game)); } catch (e) { /* 保存できない環境でも遊べる */ }
  }
  const yen = (n) => n.toLocaleString('ja-JP');

  function show(view) {
    ['cardView', 'raceView', 'resultView'].forEach((v) => { $(v).hidden = v !== view; });
  }

  function renderStatus() {
    $('day').textContent = game.day + '日目';
    $('money').textContent = yen(game.money);
    $('history').innerHTML = game.history.length
      ? game.history.map((h) => {
        const diff = h.payout - h.stake;
        const bet = h.stake ? `／賭け ${yen(h.stake)} 円 → 払い戻し ${yen(h.payout)} 円 <span class="${diff > 0 ? 'plus' : ''}">(${diff >= 0 ? '+' : ''}${yen(diff)})</span>` : '（見送り）';
        return `<li>${h.day}日目 ${h.name}：1着 ${h.winner} ${bet}</li>`;
      }).join('')
      : '<li>まだ走っていません</li>';
  }

  function numBadge(i) {
    return `<span class="num" style="background:${COLORS[i]};color:${TEXT_ON[i]};border:1px solid #8884">${i + 1}</span>`;
  }

  function raceInfoText(race, n) {
    return `${HS.SURFACES[race.surface]} ${race.distance}m ／ 馬場：${HS.CONDITIONS[race.condition].label} ／ ${n}頭`;
  }

  function newCard() {
    card = HS.createRaceCard(game);
    bets = {};
    $('raceName').textContent = `${card.race.day}日目 ${card.race.name}`;
    $('raceInfo').textContent = raceInfoText(card.race, card.entries.length);
    $('placeHint').textContent = HS.placeSlots(card.entries.length);
    const opts = BET_STEPS.map((v) => `<option value="${v}">${v ? yen(v) + '円' : '—'}</option>`).join('');
    $('entriesBody').innerHTML = card.entries.map((h, i) => `
      <tr>
        <td>${numBadge(i)}</td>
        <td class="name"><button class="name-btn" data-horse="${i}">${h.name}</button></td>
        <td>${HS.STYLES[h.style].label}</td>
        <td>${HS.overall(h)}</td>
        <td>${HS.SURFACES[card.race.surface]}${h.aptitude[card.race.surface]}</td>
        <td>${h.record.starts}戦${h.record.wins}勝</td>
        <td>${card.popularity[i]}</td>
        <td>${card.odds[i].win.toFixed(1)}</td>
        <td>${card.odds[i].place.toFixed(1)}</td>
        <td><select data-bet="win:${i}">${opts}</select></td>
        <td><select data-bet="place:${i}">${opts}</select></td>
      </tr>`).join('');
    updateBetTotal();
    show('cardView');
  }

  function betTotal() {
    return Object.values(bets).reduce((a, b) => a + b, 0);
  }
  function updateBetTotal() {
    $('betTotal').textContent = yen(betTotal());
    $('betError').hidden = true;
  }

  function showHorse(i) {
    const h = card.entries[i];
    const rows = HS.STAT_KEYS.map((k) => `
      <div class="stat-row"><span>${HS.STAT_LABELS[k]}</span><div class="bar"><span style="width:${h.stats[k]}%"></span></div><span>${h.stats[k]}</span></div>`).join('');
    $('horseDetail').innerHTML = `
      <h2>${numBadge(i)} ${h.name}</h2>
      <p>脚質：${HS.STYLES[h.style].label} ／ 得意な距離：${h.bestDistance}m 前後<br>
      適性：芝 ${h.aptitude.turf}・ダート ${h.aptitude.dirt} ／ 戦績：${h.record.starts}戦${h.record.wins}勝（複勝圏 ${h.record.places}回）</p>
      ${rows}`;
    $('horseDialog').showModal();
  }

  // ---- レースの描画 ----
  function startRace() {
    const total = betTotal();
    if (total > game.money) {
      $('betError').textContent = '所持金が足りません。';
      $('betError').hidden = false;
      return;
    }
    const sim = HS.simulateRace(card.race, card.entries, card.race.seed, { record: true });
    $('raceNameLive').textContent = `${card.race.name}（${raceInfoText(card.race, card.entries.length)}）`;
    show('raceView');
    playback = { sim, t: 0, speed: playback ? playback.speed : 1, last: null, done: false };
    requestAnimationFrame(tick);
  }

  function frameAt(sim, t) {
    const f = sim.frames;
    const pos = t / sim.frameDt - 1;
    if (pos <= 0) return { xs: f[0].xs.map((x) => x * Math.max(0, pos + 1)), hp: f[0].hp };
    const i = Math.min(f.length - 2, Math.floor(pos));
    const a = Math.min(1, pos - i);
    return { xs: f[i].xs.map((x, k) => x + (f[i + 1].xs[k] - x) * a), hp: f[i + 1].hp };
  }

  function tick(now) {
    if (!playback || playback.done) return;
    if (playback.last !== null) playback.t += ((now - playback.last) / 1000) * playback.speed;
    playback.last = now;
    const sim = playback.sim;
    const endT = sim.frames.length * sim.frameDt;
    if (playback.t >= endT) {
      finishRace();
      return;
    }
    draw(frameAt(sim, playback.t));
    requestAnimationFrame(tick);
  }

  function draw(frame) {
    const cv = $('track');
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const D = card.race.distance;
    const n = card.entries.length;
    const top = 30, bottom = H - 50;
    const laneH = (bottom - top) / n;
    const pxPerM = 7;
    const leader = Math.max(...frame.xs);
    // カメラは先頭の少し後ろ
    const camX = Math.min(Math.max(leader - (W * 0.65) / pxPerM, 0), D - (W * 0.8) / pxPerM);
    const sx = (m) => (m - camX) * pxPerM;
    const css = getComputedStyle(document.documentElement);
    const c1 = css.getPropertyValue(card.race.surface === 'turf' ? '--turf' : '--dirt');
    const c2 = css.getPropertyValue(card.race.surface === 'turf' ? '--turf2' : '--dirt2');

    // 走路（10m ごとの縞）
    ctx.fillStyle = '#e9e4d6';
    ctx.fillRect(0, 0, W, H);
    for (let m = Math.floor(camX / 10) * 10; m < camX + W / pxPerM; m += 10) {
      ctx.fillStyle = (m / 10) % 2 === 0 ? c1 : c2;
      ctx.fillRect(sx(m), top, 10 * pxPerM + 1, bottom - top);
    }
    // 内ラチ・外ラチ
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, top - 4, W, 4);
    ctx.fillRect(0, bottom, W, 4);
    // 距離の標識（残り 100m ごと）
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    for (let rem = Math.ceil((D - camX - W / pxPerM) / 100) * 100; rem <= D - camX; rem += 100) {
      if (rem <= 0) continue;
      const x = sx(D - rem);
      ctx.fillStyle = rem % 200 === 0 ? '#c62828' : '#555';
      ctx.fillRect(x - 1, top - 14, 3, 14);
      ctx.fillText(`${rem}`, x, top - 17);
    }
    // ゴール
    const gx = sx(D);
    if (gx < W + 10) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(gx - 2, top, 4, bottom - top);
      ctx.fillStyle = '#c62828';
      ctx.fillText('ゴール', gx, top - 17);
    }
    // 馬
    const phase = playback.t * 9;
    for (let i = 0; i < n; i++) {
      const x = sx(frame.xs[i]);
      const y = top + laneH * (i + 0.5);
      drawHorse(ctx, x, y, Math.min(1.2, laneH / 26), i, phase + i * 1.7, frame.xs[i] >= D);
    }
    // 下の全体図
    const mapY = H - 26;
    ctx.fillStyle = '#ccc6b6';
    ctx.fillRect(20, mapY - 2, W - 40, 4);
    ctx.fillStyle = '#c62828';
    ctx.fillRect(W - 22, mapY - 8, 3, 16);
    for (let i = 0; i < n; i++) {
      const x = 20 + ((W - 40) * frame.xs[i]) / D;
      ctx.beginPath();
      ctx.fillStyle = COLORS[i];
      ctx.strokeStyle = '#333';
      ctx.arc(x, mapY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    const remain = Math.max(0, Math.ceil(D - leader));
    $('remain').textContent = remain > 0 ? `残り ${remain}m` : 'ゴール！';
    const order = frame.xs.map((x, i) => i).sort((a, b) => frame.xs[b] - frame.xs[a]);
    $('liveOrder').innerHTML = order.map((i) => `<li>${numBadge(i)} ${card.entries[i].name}</li>`).join('');
  }

  function drawHorse(ctx, x, y, s, i, phase, finished) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const leg = finished ? 0 : Math.sin(phase) * 5;
    ctx.strokeStyle = '#3e2a1c';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-10, 4); ctx.lineTo(-12 - leg, 12);
    ctx.moveTo(-6, 4); ctx.lineTo(-4 + leg, 12);
    ctx.moveTo(6, 4); ctx.lineTo(4 + leg, 12);
    ctx.moveTo(10, 4); ctx.lineTo(12 - leg, 12);
    ctx.stroke();
    // 胴・首・頭
    ctx.fillStyle = '#6d4c33';
    ctx.beginPath(); ctx.ellipse(0, 0, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, -3); ctx.lineTo(17, -10); ctx.lineTo(21, -7); ctx.lineTo(14, 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(21, -9, 5, 3, 0.3, 0, Math.PI * 2); ctx.fill();
    // 尾
    ctx.strokeStyle = '#2b1d13';
    ctx.beginPath(); ctx.moveTo(-14, -2); ctx.lineTo(-20, 2 + leg * 0.3); ctx.stroke();
    // 騎手（服の色＝馬番の色）
    ctx.fillStyle = COLORS[i];
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(2, -9, 5, 4, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(6, -15, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 馬番
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(String(i + 1), -18, 4);
    ctx.fillText(String(i + 1), -18, 4);
    ctx.restore();
  }

  function finishRace() {
    playback.done = true;
    const sim = playback.sim;
    const betList = Object.entries(bets).filter(([, v]) => v > 0).map(([k, amount]) => {
      const [type, idx] = k.split(':');
      return { type, index: Number(idx), amount };
    });
    const st = HS.settle(card, sim.results, betList);
    const out = HS.applyResult(game, card, sim.results, st);
    save();

    $('resultTitle').textContent = `${card.race.name} 結果`;
    $('resultBody').innerHTML = sim.results.map((r) => `
      <tr class="rank-${r.rank}">
        <td>${r.rank}</td><td>${numBadge(r.index)}</td><td class="name">${r.name}</td>
        <td>${formatTime(r.time)}</td><td>${r.margin}</td>
        <td>${card.popularity[r.index]}</td><td>${card.odds[r.index].win.toFixed(1)}</td>
      </tr>`).join('');
    const label = { win: '単勝', place: '複勝' };
    let html = '';
    if (st.lines.length === 0) {
      html = '<p>今回は見送りました。</p>';
    } else {
      html = '<ul>' + st.lines.map((l) => `<li class="${l.hit ? 'hit' : ''}">${label[l.type]} ${l.index + 1}番 ${card.entries[l.index].name} ${yen(l.amount)}円 → ${l.hit ? `的中！ ${yen(l.payout)}円（${l.odds.toFixed(1)}倍）` : 'はずれ'}</li>`).join('') + '</ul>';
      const diff = st.payout - st.stake;
      html += `<p>賭け ${yen(st.stake)} 円 ／ 払い戻し ${yen(st.payout)} 円 ／ 収支 <strong class="${diff > 0 ? 'hit' : ''}">${diff >= 0 ? '+' : ''}${yen(diff)} 円</strong></p>`;
    }
    if (out.bailout) html += '<p>所持金が尽きたので、馬主仲間から 3,000 円を借りました。</p>';
    $('payout').innerHTML = html;
    renderStatus();
    show('resultView');
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = (sec - m * 60).toFixed(1).padStart(4, '0');
    return `${m}:${s}`;
  }

  // ---- 操作 ----
  $('entriesBody').addEventListener('change', (e) => {
    const key = e.target.dataset.bet;
    if (!key) return;
    bets[key] = Number(e.target.value);
    updateBetTotal();
  });
  $('entriesBody').addEventListener('click', (e) => {
    const i = e.target.dataset.horse;
    if (i !== undefined) showHorse(Number(i));
  });
  $('clearBetsBtn').addEventListener('click', () => {
    bets = {};
    document.querySelectorAll('[data-bet]').forEach((s) => { s.value = '0'; });
    updateBetTotal();
  });
  $('startBtn').addEventListener('click', startRace);
  $('skipBtn').addEventListener('click', () => { if (playback && !playback.done) finishRace(); });
  document.querySelectorAll('.speed').forEach((b) => b.addEventListener('click', () => {
    if (playback) playback.speed = Number(b.dataset.speed);
    document.querySelectorAll('.speed').forEach((x) => x.classList.toggle('active', x === b));
  }));
  $('nextBtn').addEventListener('click', newCard);
  $('newGameBtn').addEventListener('click', () => {
    if (!confirm('所持金と戦績を消して、はじめからにしますか？')) return;
    game = HS.newGame(Date.now() >>> 0);
    save();
    renderStatus();
    newCard();
  });

  renderStatus();
  newCard();
})(globalThis.HS);
