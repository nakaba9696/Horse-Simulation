// フリーレースの画面：条件（競馬場・芝ダート・距離・馬場・天気）と出る馬（自分の馬・史実馬・スペシャルホース、18頭まで）を選び、
// 出走表 → 自分で乗る（js/ui/ride.js）か見る（js/ui/watch3d.js）→ 結果。リプレイも保存できる。セーブには何も残らない（js/core/freerace.js）
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse, W = HS.World, UI = HS.UI, App = HS.App, FR = HS.FreeRace, RP = HS.Replay;
  const e = U.esc;
  const st = () => App.st.fr || (App.st.fr = { course: '東京', surface: '芝', dist: 2400, ground: '良', weather: '晴', picks: [], ride: -1, tab: 'hist', q: '', n: 0, seed: (Date.now() % 2147483646) + 1 }); // 種は時刻から（世界の乱数とは別）

  const kindChip = k => k === 'special' ? '<span class="chip legend">スペシャル</span>' : k === 'mine' ? '<span class="chip mine">自分の馬</span>' : '<span class="chip hist">史</span>';
  const surfOf = d => d.surface === 'ダ' ? 'ダート' : d.surface === '芝ダ' ? '芝・ダート' : '芝';
  const pickRow = (d, kind, key, extra) => {
    const f = st(), on = f.picks.some(p => p.kind === kind && p.key === key), full = f.picks.length >= FR.MAX;
    return `<tr><td class="nm">${e(d.name)} ${kindChip(kind)}</td><td class="small">${extra}</td>
      <td class="right">${on ? '<span class="small muted">出走</span>' : `<button class="btn sm" data-act="fr-add" data-kind="${kind}" data-key="${e(key)}" data-name="${e(d.name)}" ${full ? 'disabled' : ''}>加える</button>`}</td></tr>`;
  };

  UI.freeRace = function () {
    const f = st();
    const snap = f.snap === undefined ? (f.snap = FR.saveSnapshot()) : f.snap;
    const courses = FR.courses();
    const c = courses.find(x => x.name === f.course) || courses[0];
    if (f.surface === 'ダ' && !c.dirt) f.surface = '芝'; if (f.surface === '芝' && !c.turf) f.surface = 'ダ';
    const race = FR.race(f); f.dist = race.dist;
    const opt = (v, l, cur) => `<option value="${e(String(v))}" ${String(v) === String(cur) ? 'selected' : ''}>${e(l)}</option>`;
    const sel = (k, label, opts) => `<label class="fr-f"><span class="small muted">${label}</span><select data-act-change="fr" data-k="${k}">${opts}</select></label>`;
    // 候補
    let cand = '';
    if (f.tab === 'hist') {
      const list = FR.search(f.q, 40);
      cand = `<div class="row mt"><input id="fr-q" class="grow" placeholder="馬の名前で探す（ひらがなでも）" value="${e(f.q)}" data-act-change="fr-q"><button class="btn sm" data-act="fr-search">探す</button></div>
        <div class="tblwrap mt"><table class="t fr-t">${list.map(d => pickRow(d, 'hist', d.name, `${d.born}年生 ${d.sex}・${surfOf(d)} ${d.distMin}〜${d.distMax}m`)).join('') || '<tr><td class="muted">見つかりません</td></tr>'}</table></div>`;
    } else if (f.tab === 'special') {
      cand = `<div class="small muted mt">1989年より前に走り終えた名馬。いちばん良いときの力で走る。</div><div class="tblwrap mt"><table class="t fr-t">${FR.specials().map(d => pickRow(d, 'special', d.name, `${d.born}年生 ${d.sex}・${surfOf(d)}`)).join('')}</table></div>`;
    } else {
      const mine = FR.myHorses(snap);
      cand = mine.length ? `<div class="small muted mt">いまの年齢・能力のまま走る（このレースの結果は残らない）。</div><div class="tblwrap mt"><table class="t fr-t">${mine.map(h => pickRow(h, 'mine', h.id, `${h.sex}・${e(h.style || '')}・${h.loc === 'stable' ? '入厩' : '牧場'}`)).join('')}</table></div>`
        : '<div class="panel empty mt">セーブに自分の馬がいません。</div>';
    }
    const tabs = [['hist', '史実馬'], ['special', 'スペシャルホース'], ['mine', '自分の馬']];
    return `<main class="page-solo fr">
      <div class="row"><h2 class="sec grow">フリーレース</h2><button class="btn" data-act="fr-back">もどる</button></div>
      <div class="panel mt"><b>条件</b>
        <div class="small muted">番組と関係なく、1レースだけ遊ぶ。結果はセーブに何も残らない（賞金・成績・レコード・故障・疲れが付かない）。</div>
        <div class="fr-cond mt">
          ${sel('course', '競馬場', courses.map(x => opt(x.name, x.name, f.course)).join(''))}
          ${sel('surface', '芝・ダート', (c.turf ? opt('芝', '芝', f.surface) : '') + (c.dirt ? opt('ダ', 'ダート', f.surface) : ''))}
          ${sel('dist', '距離', FR.dists(race.course, race.surface).map(d => opt(d, `${d}m`, f.dist)).join(''))}
          ${sel('ground', '馬場', FR.GROUNDS.map(g => opt(g, g, f.ground)).join(''))}
          ${sel('weather', '天気', FR.WEATHERS.map(w => opt(w, `${HS.Season ? HS.Season.weatherIcon(w) : ''}${w}`, f.weather)).join(''))}
        </div>
        <div class="fr-course mt">${UI.courseSvg ? UI.courseSvg(race) : ''}</div></div>
      <div class="panel mt"><div class="row"><b class="grow">出る馬 ${f.picks.length} / ${FR.MAX}</b>${f.picks.length ? '<button class="btn sm" data-act="fr-clear">全部外す</button>' : ''}</div>
        ${f.picks.length ? `<div class="tblwrap mt"><table class="t fr-picks"><tr><th>乗る</th><th>馬</th><th></th></tr>
          ${f.picks.map((p, i) => `<tr class="${f.ride === i ? 'mine' : ''}"><td><input type="radio" name="fr-ride" data-act-change="fr-ride" value="${i}" ${f.ride === i ? 'checked' : ''} aria-label="${e(p.name)}に乗る"></td><td class="nm">${e(p.name)} ${kindChip(p.kind)}</td><td class="right"><button class="btn sm" data-act="fr-del" data-i="${i}">外す</button></td></tr>`).join('')}
          <tr class="${f.ride < 0 ? 'mine' : ''}"><td><input type="radio" name="fr-ride" data-act-change="fr-ride" value="-1" ${f.ride < 0 ? 'checked' : ''} aria-label="見るだけ"></td><td colspan="2" class="small">見るだけ（乗らない）</td></tr></table></div>`
          : '<div class="small muted mt">下の一覧から「加える」で選ぶ（2頭から。足りない分は増やさない）。</div>'}
        <div class="btns mt"><button class="btn gold" data-act="fr-go" ${f.picks.length < 2 ? 'disabled' : ''}>出走表へ</button></div></div>
      <div class="panel mt"><b>馬を選ぶ</b>
        <div class="tabs mt">${tabs.map(([k, l]) => `<button class="${f.tab === k ? 'on' : ''}" data-act="fr-tab" data-tab="${k}">${l}</button>`).join('')}</div>
        ${cand}</div>
    </main>`;
  };
  App.pages = App.pages || {};
  App.pages.free = function (app, anim) {
    App.setScene('paddock');
    app.innerHTML = UI.freeRace();
    App.enter(app.querySelector('main'), anim);
    App.hydrate(app);
  };
  const keepScroll = fn => { const y = globalThis.scrollY || 0; fn(); App.render(); globalThis.scrollTo(0, y); };
  App.act.free = () => { App.st.frFrom = App.st.screen; st().snap = undefined; App.st.screen = 'free'; App.navAnim = 'push'; App.render(); globalThis.scrollTo(0, 0); };
  App.act['fr-back'] = () => { App.st.screen = App.st.frFrom === 'game' ? 'game' : 'title'; App.navAnim = 'back'; App.render(); };
  App.change.fr = el => keepScroll(() => { const f = st(); f[el.dataset.k] = el.dataset.k === 'dist' ? +el.value : el.value; });
  App.change['fr-q'] = el => keepScroll(() => { st().q = el.value; });
  App.change['fr-ride'] = el => keepScroll(() => { st().ride = +el.value; });
  App.act['fr-search'] = () => keepScroll(() => { const q = document.querySelector('#fr-q'); if (q) st().q = q.value; });
  App.act['fr-tab'] = d => keepScroll(() => { st().tab = d.tab; });
  App.act['fr-add'] = d => keepScroll(() => {
    const f = st(); if (f.picks.length >= FR.MAX) return;
    f.picks.push({ kind: d.kind, key: d.key, name: d.name });
    if (f.ride < 0 && d.kind === 'mine' && !f.picks.some((p, i) => i < f.picks.length - 1 && p.kind === 'mine')) f.ride = f.picks.length - 1; // 自分の馬を入れたら、まずその馬に乗る
  });
  App.act['fr-del'] = d => keepScroll(() => { const f = st(), i = +d.i; f.picks.splice(i, 1); if (f.ride === i) f.ride = -1; else if (f.ride > i) f.ride--; });
  App.act['fr-clear'] = () => keepScroll(() => { const f = st(); f.picks = []; f.ride = -1; });

  // 出走表 → 乗る／見る → 結果
  let busy = false;
  App.act['fr-go'] = async () => {
    if (busy) return; busy = true;
    try {
      const f = st();
      f.n++; f.seed = (Math.imul(f.seed, 1103515245) + 12345 + f.n * 7919) >>> 0 || 1; // 遊ぶたびに別の種（世界の乱数は使わない）
      const card = FR.build({ course: f.course, surface: f.surface, dist: f.dist, ground: f.ground, weather: f.weather, entries: f.picks, ride: f.ride, seed: f.seed, n: f.n }, f.snap);
      if (!card) return App.toast('出る馬を選んでください');
      const how = await new Promise(res => {
        const bg = App.modal(`${UI.entryTable(card)}<div class="btns mt">${card.ride ? '<button class="btn gold" data-x="ride">ゲートイン（自分で乗る）</button><button class="btn" data-x="watch">おまかせで見る</button>' : '<button class="btn gold" data-x="watch">レースを見る</button>'}<button class="btn" data-x="no">もどる</button></div>`, { noClose: true, scene: 'paddock' });
        bg.querySelectorAll('[data-x]').forEach(b => { b.onclick = () => { App.closeModal(); res(b.dataset.x); }; });
      });
      if (how === 'no') return;
      const AU = HS.Audio;
      let sim;
      if (how === 'ride') {
        App.inRace = true;
        const bg = App.modal('<div class="ride-holder"></div>', { wide: true, noClose: true });
        try { sim = await HS.Ride.ride(bg.querySelector('.ride-holder'), card, { makeSim: () => FR.sim(card, { ride: true }), record: null }); }
        finally { App.closeModal(); App.inRace = false; }
      } else {
        sim = FR.run(card);
        await UI.playReplayData({ race: card.race, sim, runners: card.runners }, { speeds: [1, 2, 4], seek: false, speed: 1 });
      }
      RP.remember(card.race.key, { race: card.race, sim, runners: card.runners }, { free: true, yearLabel: 'フリー' });
      const me = sim.results.find(x => x.rider === 'P');
      const head = me ? (me.pos === 1 ? `<div class="panel gold center"><div class="serif" style="font-size:24px;font-weight:900;color:var(--gold2)">🏆 ${e(me.horse.name)}で1着！</div></div>` : `<div class="panel center">${e(me.horse.name)}は${me.pos}着</div>`) : '';
      if (me && me.pos === 1 && AU) AU.playOnce('victory');
      await new Promise(res => {
        const bg = App.modal(`${head}${UI.resultTable(FR.slim(card, sim))}<div class="btns mt"><button class="btn gold" data-x="again">同じ条件でもう一度</button><button class="btn" data-x="ok">閉じる</button></div>`, { noClose: true, scene: 'result' });
        bg.querySelector('[data-x=ok]').onclick = () => { App.closeModal(); res(); };
        bg.querySelector('[data-x=again]').onclick = () => { App.closeModal(); res('again'); };
      }).then(x => { if (x === 'again') setTimeout(() => App.act['fr-go'](), 0); });
      if (AU) AU.bgm(App.st.screen === 'game' ? 'home' : 'title');
    } catch (err) {
      console.error(err); App.toast('エラー：' + err.message);
    } finally { busy = false; }
  };
})();
