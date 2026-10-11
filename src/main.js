// 画面の操作（厩舎・牧場・セリ・番組表・記録・レースの描画）
(function (HS) {
  const SAVE_KEY = 'horse-sim-save-v2';
  // 馬番ごとの色（騎手の服と馬番の地）
  const COLORS = ['#f5f5f5', '#222222', '#d32f2f', '#1565c0', '#f9a825', '#2e7d32', '#ef6c00', '#ec407a',
    '#6a1b9a', '#00838f', '#8d6e63', '#9e9d24'];
  const TEXT_ON = ['#222', '#fff', '#fff', '#fff', '#222', '#fff', '#fff', '#fff', '#fff', '#fff', '#fff', '#222'];

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let game = load() || HS.newGame(Date.now() >>> 0);
  let tab = 'stable';
  let playback = null;
  let queue = [];     // このあと流すレース
  let weekResult = null;

  function load() {
    try { return HS.migrate(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(game)); } catch (e) { /* 保存できない環境でも遊べる */ }
  }

  // 金額（万円）の表示
  function money(man) {
    const neg = man < 0;
    const v = Math.abs(Math.round(man));
    const oku = Math.floor(v / 10000);
    const rest = v % 10000;
    const s = oku ? `${oku}億${rest ? rest.toLocaleString('ja-JP') + '万' : ''}円` : `${rest.toLocaleString('ja-JP')}万円`;
    return (neg ? '-' : '') + s;
  }

  function show(view) {
    ['homeView', 'raceView', 'weekView'].forEach((v) => { $(v).hidden = v !== view; });
    $('nextWeekBtn').disabled = view !== 'homeView' || game.gameOver;
  }

  function notice(text) {
    const el = $('notice');
    el.textContent = text || '';
    el.hidden = !text;
  }

  const sexLabel = (h) => (h.sex === 'colt' ? '牡' : '牝');
  const ageLabel = (h) => `${sexLabel(h)}${HS.ageOf(h, game.year)}`;
  function grades(h) {
    return `<span class="grades">${HS.STAT_KEYS.map((k) => {
      const g = HS.grade(h.stats[k]);
      return `<span class="g-${g}" title="${HS.STAT_LABELS[k]}">${g}</span>`;
    }).join('')}</span>`;
  }
  function condLabel(c) {
    const cls = c > 0 ? `cond-${c}` : c < 0 ? `cond-m${-c}` : '';
    return `<span class="${cls}">${HS.CONDITION_LABELS[String(c)]}</span>`;
  }
  function fatigueBar(f) {
    const color = f > 70 ? '#c62828' : f > 40 ? '#ef6c00' : '#2e7d32';
    return `<span class="fatigue" title="疲れ ${Math.round(f)}"><span style="width:${Math.min(100, f)}%;background:${color}"></span></span>`;
  }
  function raceLabel(r) {
    return `${r.name} ${HS.SURFACES[r.surface]}${r.distance}m`;
  }
  function numBadge(i) {
    return `<span class="num" style="background:${COLORS[i]};color:${TEXT_ON[i]};border:1px solid #8884">${i + 1}</span>`;
  }
  const nameBtn = (h) => `<button class="name-btn" data-detail="${h.id}">${esc(h.name)}</button>`;

  // ---- 画面の描き分け ----
  function render() {
    $('date').textContent = HS.dateLabel(game.year, game.week);
    $('money').textContent = money(game.money);
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    ['stable', 'farm', 'auction', 'program', 'record'].forEach((t) => { $('tab-' + t).hidden = t !== tab; });
    renderStable();
    renderFarm();
    renderAuction();
    renderProgram();
    renderRecord();
    if (game.gameOver) notice('借金がふくらみ、牧場を手放すことになりました。「記録」の画面からはじめからやり直せます。');
  }

  function renderStable() {
    const races = HS.weekRaces(game, game.year, game.week);
    const horses = game.horses.filter((h) => h.status === 'stable');
    const opts = (h) => {
      const ok = races.filter((r) => !HS.ineligibleReason(h, r));
      return `<option value="">出走しない</option>` + ok.map((r) => `<option value="${r.id}" ${h.entry === r.id ? 'selected' : ''}>${esc(raceLabel(r))}</option>`).join('');
    };
    const trainOpts = (h) => HS.TRAINING_KEYS.map((k) => `<option value="${k}" ${(h.training || 'wood') === k ? 'selected' : ''}>${HS.TRAININGS[k].label}</option>`).join('');
    $('tab-stable').innerHTML = `
      <h3>厩舎（${horses.length}/${HS.STABLE_LIMIT}頭）</h3>
      <p class="hint">毎週、調教か出走を選んで「次の週へ」。能力は ${HS.STAT_KEYS.map((k) => HS.STAT_LABELS[k]).join('・')} の順に S〜G で表示。疲れが赤いときに強い調教をすると故障しやすくなります。</p>
      ${horses.length ? `<div class="table-wrap"><table>
        <thead><tr><th class="left">馬名</th><th>性齢</th><th>クラス</th><th>能力</th><th>調子</th><th>疲れ</th><th>戦績</th><th>今週の調教</th><th>今週の出走</th><th></th></tr></thead>
        <tbody>${horses.map((h) => `
          <tr>
            <td class="left">${nameBtn(h)}<div class="small">父 ${esc(h.sireName)}</div></td>
            <td>${ageLabel(h)}</td>
            <td>${HS.CLASSES[HS.classOf(h)].label}</td>
            <td>${grades(h)}</td>
            <td>${condLabel(h.condition)}</td>
            <td>${fatigueBar(h.fatigue)}</td>
            <td>${h.record.starts}戦${h.record.wins}勝</td>
            <td><select data-train="${h.id}" ${h.entry ? 'disabled' : ''}>${trainOpts(h)}</select></td>
            <td><select data-entry="${h.id}">${opts(h)}</select></td>
            <td class="row-actions"><button data-farm="${h.id}">放牧</button><button data-retire="${h.id}">引退</button></td>
          </tr>`).join('')}</tbody></table></div>` : '<p class="empty">厩舎に馬がいません。牧場から 2 歳以上の馬を入厩させましょう。</p>'}`;
  }

  function renderFarm() {
    const young = game.horses.filter((h) => h.status === 'farm');
    const mares = game.horses.filter((h) => h.status === 'broodmare');
    const season = HS.inSeason(game);
    $('tab-farm').innerHTML = `
      <h3>育成中・放牧中の馬</h3>
      ${young.length ? `<div class="table-wrap"><table>
        <thead><tr><th class="left">馬名</th><th>性齢</th><th>血統</th><th>能力</th><th>状態</th><th>牧場長の見立て</th><th></th></tr></thead>
        <tbody>${young.map((h) => {
          const age = HS.ageOf(h, game.year);
          const state = h.injuredWeeks > 0 ? `故障（あと${h.injuredWeeks}週）` : age < 2 ? '育成中' : '放牧中';
          return `<tr>
            <td class="left">${nameBtn(h)}</td><td>${ageLabel(h)}</td>
            <td class="small">父 ${esc(h.sireName)}<br>母 ${esc(h.damName)}</td>
            <td>${grades(h)}</td><td>${state}</td>
            <td class="left small wrap">${HS.potentialComment(h)}</td>
            <td class="row-actions">${age >= 2 ? `<button data-enter="${h.id}">入厩</button><button data-retire="${h.id}">引退</button>` : ''}</td>
          </tr>`;
        }).join('')}</tbody></table></div>` : '<p class="empty">いません。</p>'}
      <h3>繁殖牝馬</h3>
      <p class="hint">種付けは 2〜4 月（${HS.BREEDING_WEEKS[0]}〜${HS.BREEDING_WEEKS[1]}週）。仔は翌年の 3 月に生まれます。${season ? '<strong>いまが種付けの季節です。</strong>' : ''}</p>
      ${mares.length ? `<div class="table-wrap"><table>
        <thead><tr><th class="left">馬名</th><th>年齢</th><th>父（系統）</th><th>母の父</th><th>得意距離</th><th>状態</th><th></th></tr></thead>
        <tbody>${mares.map((m) => `<tr>
          <td class="left">${nameBtn(m)}</td><td>${HS.ageOf(m, game.year)}</td>
          <td>${esc(m.sireName)}（${esc(m.line)}）</td><td>${esc(m.damSireName || '—')}</td><td>${m.bestDistance}m</td>
          <td>${m.pregnant ? `受胎（父 ${esc(m.pregnant.sire.name)}）` : '空胎'}</td>
          <td>${season && !m.pregnant ? `<button data-breed="${m.id}" class="primary">種付け</button>` : ''}</td>
        </tr>`).join('')}</tbody></table></div>` : '<p class="empty">いません。牝馬が引退すると繁殖牝馬になります。</p>'}`;
  }

  function renderAuction() {
    if (!HS.auctionOpen(game) || !game.auction) {
      $('tab-auction').innerHTML = '<h3>セリ</h3><p class="empty">1 歳馬のセリは毎年 7 月に開かれます。</p>';
      return;
    }
    $('tab-auction').innerHTML = `
      <h3>1 歳馬のセリ（7 月いっぱい）</h3>
      <p class="hint">値段と素質は一致しません。血統と見立てから、掘り出し物を探しましょう。</p>
      <div class="table-wrap"><table>
        <thead><tr><th class="left">馬名</th><th>性</th><th>血統</th><th>系統</th><th>配合・見立て</th><th>能力</th><th>値段</th><th></th></tr></thead>
        <tbody>${game.auction.map((lot, i) => {
          const h = lot.horse;
          return `<tr>
            <td class="left">${esc(h.name)}</td><td>${sexLabel(h)}</td>
            <td class="small">父 ${esc(h.sireName)}<br>母の父 ${esc(h.damSireName || '—')}</td>
            <td class="small">${esc(h.line)}</td>
            <td class="left small wrap">${(h.theory || []).map(esc).join('<br>')}<br><strong>見立て：</strong>${HS.impressionComment(h)}</td>
            <td>${grades(h)}</td>
            <td>${money(lot.price)}</td>
            <td>${lot.sold ? '落札済み' : `<button data-buy="${i}" class="primary">買う</button>`}</td>
          </tr>`;
        }).join('')}</tbody></table></div>`;
  }

  function renderProgram() {
    const weeks = [0, 1, 2, 3].map((d) => {
      let y = game.year, w = game.week + d;
      if (w > HS.WEEKS_PER_YEAR) { w -= HS.WEEKS_PER_YEAR; y++; }
      return { y, w };
    });
    const ageText = (r) => (r.age === 2 ? '2歳' : r.age === 3 ? '3歳' : '3歳以上') + (r.filly ? '・牝' : '');
    $('tab-program').innerHTML = weeks.map(({ y, w }, i) => {
      const races = HS.weekRaces(game, y, w).filter((r) => i === 0 || r.graded);
      return `<h3>${HS.dateLabel(y, w)}${i === 0 ? '（今週）' : 'の重賞'}</h3>
        ${races.length ? `<div class="table-wrap"><table><tbody>${races.map((r) => `
          <tr><td class="left">${r.graded ? '<strong>' : ''}${esc(r.name)}${r.graded ? '</strong>' : ''}</td>
          <td>${HS.SURFACES[r.surface]}${r.distance}m</td><td>${ageText(r)}</td><td>1着 ${money(HS.CLASSES[r.cls].prize)}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="empty">重賞はありません。</p>'}`;
    }).join('');
  }

  function renderRecord() {
    const hof = game.hallOfFame;
    $('tab-record').innerHTML = `
      <h3>引退した馬</h3>
      ${hof.length ? `<div class="table-wrap"><table><thead><tr><th class="left">馬名</th><th>父</th><th>戦績</th><th>獲得賞金</th><th class="left">主な勝ち鞍</th></tr></thead><tbody>
        ${hof.map((h) => `<tr><td class="left">${esc(h.name)}（${h.sex === 'colt' ? '牡' : '牝'}）</td><td>${esc(h.sireName)}</td>
          <td>${h.record.starts}戦${h.record.wins}勝</td><td>${money(h.record.earnings)}</td><td class="left small">${h.record.titles.map(esc).join('<br>') || '—'}</td></tr>`).join('')}
      </tbody></table></div>` : '<p class="empty">まだいません。</p>'}
      ${game.ownStallions.length ? `<h3>自家の種牡馬</h3><p>${game.ownStallions.map((s) => esc(s.name)).join('、')}</p>` : ''}
      <h3>できごと</h3>
      <ul class="log">${game.log.map((l) => `<li><span class="d">${l.date}</span>${esc(l.text)}</li>`).join('')}</ul>
      <div class="bet-bar"><button id="newGameBtn" class="ghost">はじめから</button></div>`;
  }

  // ---- 馬の詳しい情報 ----
  function showDetail(id) {
    const h = game.horses.find((x) => x.id === id);
    if (!h) return;
    const rows = HS.STAT_KEYS.map((k) => {
      const g = HS.grade(h.stats[k]);
      return `<div class="stat-row"><span>${HS.STAT_LABELS[k]}</span><div class="bar"><span style="width:${Math.min(100, h.stats[k])}%"></span></div><span class="g-${g}"><strong>${g}</strong></span></div>`;
    }).join('');
    const canRename = h.record.starts === 0 && h.status !== 'broodmare';
    $('dialogBody').innerHTML = `
      <h2>${esc(h.name)} <span class="small">${ageLabel(h)}・${HS.GROWTH[h.growth].label}</span></h2>
      <p>父 ${esc(h.sireName)}（${esc(h.line || '—')}）／ 母 ${esc(h.damName)}${h.damSireName ? `（母の父 ${esc(h.damSireName)}）` : ''}<br>
      脚質：${HS.STYLES[h.style].label} ／ 得意な距離：${h.bestDistance}m 前後 ／ 適性：芝 ${h.aptitude.turf}・ダート ${h.aptitude.dirt}
      ${h.frail ? '<br><strong>体質が弱く、故障しやすい</strong>' : ''}</p>
      ${h.theory ? `<p class="small">配合：${h.theory.map(esc).join('／')}</p>` : ''}
      ${h.status !== 'broodmare' ? rows : ''}
      <p>見立て：${HS.potentialComment(h)}</p>
      <p>戦績：${h.record.starts}戦${h.record.wins}勝（3着以内 ${h.record.places}回）／ 獲得賞金 ${money(h.record.earnings)}</p>
      ${h.record.titles.length ? `<ul class="titles">${h.record.titles.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      ${canRename ? `<p><button data-rename="${h.id}">名前を変える</button></p>` : ''}`;
    $('dialog').showModal();
  }

  function showBreeding(mareId) {
    const mare = game.horses.find((x) => x.id === mareId);
    const list = HS.allStallions(game).map((s) => ({ s, th: HS.breedingTheory(s, mare), fee: HS.studFee(s) }));
    $('dialogBody').innerHTML = `
      <h2>${esc(mare.name)} の種付け</h2>
      <p class="small">母 ${esc(mare.name)}：父 ${esc(mare.sireName)}（${esc(mare.line)}）／ 得意距離 ${mare.bestDistance}m ／ 資金 ${money(game.money)}</p>
      <div class="table-wrap"><table>
        <thead><tr><th class="left">種牡馬</th><th>系統</th><th>得意距離</th><th>種付け料</th><th>配合</th><th></th></tr></thead>
        <tbody>${list.map(({ s, th, fee }) => `<tr>
          <td class="left"><strong>${esc(s.name)}</strong><div class="small">父 ${esc(s.sire || '—')}・${HS.STYLES[s.style].label}・${HS.GROWTH[s.growth].label}</div></td>
          <td class="small">${esc(s.line)}</td><td>${s.bestDistance}m</td><td>${fee ? money(fee) : '無料'}</td>
          <td class="left wrap"><span class="score">${th.score}</span><ul class="theory">${th.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></td>
          <td><button data-dobreed="${mare.id}|${s.id}" ${fee > game.money ? 'disabled' : ''}>決める</button></td>
        </tr>`).join('')}</tbody></table></div>`;
    $('dialog').showModal();
  }

  // ---- 週を進める ----
  function nextWeek() {
    notice('');
    const out = HS.advanceWeek(game);
    save();
    weekResult = out;
    queue = out.races.slice();
    playNext();
  }

  function playNext() {
    const item = queue.shift();
    if (!item) { showWeek(); return; }
    const mine = new Set(item.field.map((h, i) => (item.mineIds.includes(h.id) ? i : -1)).filter((i) => i >= 0));
    playback = { race: item.race, field: item.field, sim: item.sim, mine, t: 0, speed: playback ? playback.speed : 1, last: null, done: false, item };
    $('raceNameLive').textContent = `${item.race.name}（${HS.SURFACES[item.race.surface]}${item.race.distance}m・${HS.CONDITIONS[item.race.condition].label}・${item.field.length}頭）`;
    show('raceView');
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
    if (playback.t >= sim.frames.length * sim.frameDt) {
      playback.done = true;
      playNext();
      return;
    }
    draw(frameAt(sim, playback.t));
    requestAnimationFrame(tick);
  }

  function showWeek() {
    const out = weekResult;
    const label = HS.dateLabel(game.year, game.week);
    if (!out.races.length && !out.events.length) { show('homeView'); render(); return; }
    $('weekTitle').textContent = `今週のできごと`;
    $('weekBody').innerHTML = out.races.map((o) => `
      <h3>${esc(o.race.name)}（${HS.SURFACES[o.race.surface]}${o.race.distance}m・${HS.CONDITIONS[o.race.condition].label}）</h3>
      <div class="table-wrap"><table class="results"><thead><tr><th>着</th><th>番</th><th class="left">馬名</th><th>タイム</th><th>着差</th></tr></thead><tbody>
      ${o.sim.results.map((r) => {
        const mine = o.mineIds.includes(r.horseId);
        return `<tr class="${mine ? 'mine-row' : ''}"><td>${r.rank}</td><td>${numBadge(r.index)}</td><td class="left">${mine ? '★ ' : ''}${esc(r.name)}</td><td>${formatTime(r.time)}</td><td>${r.margin}</td></tr>`;
      }).join('')}</tbody></table></div>`).join('') +
      (out.events.length ? `<h3>お知らせ</h3><ul class="log">${out.events.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : '') +
      `<p class="small">いまは ${label}</p>`;
    show('weekView');
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = (sec - m * 60).toFixed(1).padStart(4, '0');
    return `${m}:${s}`;
  }

  function draw(frame) {
    const cv = $('track');
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const D = playback.race.distance;
    const n = playback.field.length;
    const top = 30, bottom = H - 50;
    const laneH = (bottom - top) / n;
    const pxPerM = 7;
    const leader = Math.max(...frame.xs);
    // カメラは先頭の少し後ろ
    const camX = Math.min(Math.max(leader - (W * 0.65) / pxPerM, 0), D - (W * 0.8) / pxPerM);
    const sx = (m) => (m - camX) * pxPerM;
    const css = getComputedStyle(document.documentElement);
    const c1 = css.getPropertyValue(playback.race.surface === 'turf' ? '--turf' : '--dirt');
    const c2 = css.getPropertyValue(playback.race.surface === 'turf' ? '--turf2' : '--dirt2');

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
      drawHorse(ctx, x, y, Math.min(1.2, laneH / 26), i, phase + i * 1.7, frame.xs[i] >= D, playback.mine.has(i));
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
    $('liveOrder').innerHTML = order.map((i) => `<li class="${playback.mine.has(i) ? 'mine' : ''}">${numBadge(i)} ${playback.field[i].name}</li>`).join('');
  }

  function drawHorse(ctx, x, y, s, i, phase, finished, mine) {
    ctx.save();
    ctx.translate(x, y);
    if (mine) {
      ctx.fillStyle = 'rgba(255, 235, 59, 0.55)';
      ctx.beginPath(); ctx.ellipse(2, 0, 30 * s, 14 * s, 0, 0, Math.PI * 2); ctx.fill();
    }
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

  // ---- 操作 ----
  function act(err) {
    if (err) notice(err);
    save();
    render();
  }
  document.addEventListener('change', (e) => {
    const d = e.target.dataset;
    if (d.train) { HS.setTraining(game, d.train, e.target.value); save(); }
    if (d.entry !== undefined && 'entry' in d) act(HS.setEntry(game, d.entry, e.target.value));
  });
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    const d = t.dataset;
    if (d.tab) { tab = d.tab; notice(''); render(); return; }
    if (d.detail) { showDetail(d.detail); return; }
    if (d.enter) { act(HS.enterStable(game, d.enter)); return; }
    if (d.farm) { act(HS.sendToFarm(game, d.farm)); return; }
    if (d.retire) {
      const h = game.horses.find((x) => x.id === d.retire);
      if (h && confirm(`${h.name} を引退させますか？`)) act(HS.retire(game, d.retire));
      return;
    }
    if (d.breed) { showBreeding(d.breed); return; }
    if (d.dobreed) {
      const [m, s] = d.dobreed.split('|');
      const err = HS.breed(game, m, s);
      $('dialog').close();
      act(err);
      return;
    }
    if (d.buy !== undefined && 'buy' in d) {
      const lot = game.auction && game.auction[Number(d.buy)];
      if (lot && confirm(`${lot.horse.name} を ${money(lot.price)} で買いますか？`)) act(HS.buyAtAuction(game, Number(d.buy)));
      return;
    }
    if (d.rename) {
      const h = game.horses.find((x) => x.id === d.rename);
      const name = prompt('新しい名前（9 文字まで）', h ? h.name : '');
      if (name !== null) { const err = HS.rename(game, d.rename, name); $('dialog').close(); act(err); }
      return;
    }
    if (d.speed) {
      if (playback) playback.speed = Number(d.speed);
      document.querySelectorAll('.speed').forEach((x) => x.classList.toggle('active', x === t));
      return;
    }
    if (t.id === 'newGameBtn') {
      if (!confirm('牧場の記録を消して、はじめからにしますか？')) return;
      game = HS.newGame(Date.now() >>> 0);
      tab = 'stable';
      act(null);
      show('homeView');
    }
  });
  $('nextWeekBtn').addEventListener('click', nextWeek);
  $('skipBtn').addEventListener('click', () => { if (playback && !playback.done) { playback.done = true; queue = []; showWeek(); } });
  $('weekOkBtn').addEventListener('click', () => { show('homeView'); render(); });

  show('homeView');
  render();
})(globalThis.HS);
