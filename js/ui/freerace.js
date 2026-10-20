// フリーレースの画面：条件（競馬場・芝ダート・距離・馬場・天気）と出る馬（自分の馬・史実馬・スペシャルホース、18頭まで）を選び、
// 出走表 → 自分で乗る（js/ui/ride.js）か見る（js/ui/watch3d.js）→ 結果。リプレイも保存できる。セーブには何も残らない（js/core/freerace.js）
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse, W = HS.World, UI = HS.UI, App = HS.App, FR = HS.FreeRace, RP = HS.Replay;
  const e = U.esc;
  const st = () => App.st.fr || (App.st.fr = { step: 'course', course: '東京', surface: '芝', dist: 2400, ground: '良', weather: '晴', picks: [], ride: -1, tab: 'hist', q: '', n: 0, seed: (Date.now() % 2147483646) + 1 }); // 種は時刻から（世界の乱数とは別）

  const kindChip = k => k === 'special' ? '<span class="chip legend">スペシャル</span>' : k === 'mine' ? '<span class="chip mine">自分の馬</span>' : '<span class="chip hist">史</span>';
  const PAGE = 60;

  // ---------- 小さなコースの絵（競馬場の札。js/core/track.js と data/layouts.js の形） ----------
  UI.courseMini = function (course, surface) {
    const c = HS.DATA.courses[course] || {};
    const sf = surface || (c.turf ? '芝' : 'ダ');
    const cf = HS.Track.forRace({ course, surface: sf, dist: ((sf === 'ダ' ? c.dirt : c.turf) || {}).lap || 2000 }), tr = cf.track;
    const W0 = 150, H0 = 62, pad = 8;
    const pts = []; for (let k = 0; k <= 72; k++) { const p = tr.at(tr.L * k / 72); pts.push([p.x, p.y]); }
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const sc = Math.min((W0 - pad * 2) / Math.max(1, x1 - x0), (H0 - pad * 2) / Math.max(1, y1 - y0));
    const ox = (W0 - (x1 - x0) * sc) / 2, oy = (H0 - (y1 - y0) * sc) / 2;
    const P = p => `${(ox + (p[0] - x0) * sc).toFixed(1)},${(oy + (p[1] - y0) * sc).toFixed(1)}`;
    const g = P(pts[0]);
    return `<svg viewBox="0 0 ${W0} ${H0}" aria-hidden="true"><polyline points="${pts.map(P).join(' ')}" fill="none" stroke="${sf === 'ダ' ? '#b88a57' : '#59a84f'}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${g.split(',')[0]}" cy="${g.split(',')[1]}" r="3.2" fill="#fff"/></svg>`;
  };

  // ---------- 1. コースを選ぶ：中央・地方・海外の札から競馬場、右で芝ダ・距離・馬場・天気 ----------
  function courseStep(f, race) {
    const K = UI.kit, groups = FR.courseGroups();
    const grp = groups.find(g => g.id === f.grp) || groups.find(g => g.courses.some(c => c.name === f.course)) || groups[0];
    const cards = grp.courses.map(c => `<button class="u-ccard ${c.name === race.course ? 'on' : ''}" data-act="fr-course" data-k="${e(c.name)}"${c.name === race.course ? ' data-autofocus' : ''}>
        ${grp.id === 'world' ? `<span class="cty">${e(c.country)}</span>` : ''}${UI.courseMini(c.name, c.name === race.course ? race.surface : null)}
        <span class="cn">${e(c.name)}</span><span class="cm">${e(c.dir)}回り${c.turf ? UI.surf('芝') : ''}${c.dirt ? UI.surf('ダ') : ''}</span></button>`).join('');
    const cd = HS.DATA.courses[race.course] || {};
    const surfOpts = (cd.turf ? [['芝', '芝']] : []).concat(cd.dirt ? [['ダ', 'ダート']] : []);
    return `<div class="u-split"><div>
        <div class="u-segs">${K.seg('', groups.map(g => [g.id, `${g.label}<small class="muted">　${g.courses.length}</small>`]), grp.id, 'fr-set', 'grp')}</div>
        <div class="u-cards mt">${cards}</div></div>
      <aside class="u-side"><div class="u-pv fr-detail">
        <h3>${e(race.course)}</h3>
        ${UI.courseSvg(race)}
        ${K.seg('馬場', surfOpts, race.surface, 'fr-set', 'surface')}
        ${K.seg('距離', FR.dists(race.course, race.surface).map(d => [d, `${d}m`]), race.dist, 'fr-set', 'dist')}
        ${K.seg('状態', FR.GROUNDS.map(g => [g, g]), f.ground, 'fr-set', 'ground')}
        ${K.seg('天気', FR.WEATHERS.map(w => [w, `${HS.Season ? HS.Season.weatherIcon(w) : ''} ${w}`]), f.weather, 'fr-set', 'weather')}
        <button class="btn gold block" data-act="fr-step" data-step="horses">出る馬を選ぶ ▶</button></div></aside></div>`;
  }

  // ---------- 2. 出る馬を選ぶ：エディットのように能力を列で並べ、見出しで並べ替え、名前・年代・国・脚質・芝ダで絞る ----------
  const tableState = f => ({ tab: f.tab, q: f.q, decade: f.decade, cty: f.cty, style: f.style, surf: f.surf, sortKey: f.sortKey, sortDir: f.sortDir });
  function listHtml(f) {
    const K = UI.kit;
    const rows = FR.table(tableState(f), f.snap);
    const lim = f.limit || PAGE, full = f.picks.length >= FR.MAX;
    const key = f.sortKey || 'turf', dir = f.sortDir || (FR.COLS.find(c => c.k === key) || {}).dir || -1;
    if (!rows.length) return f.tab === 'mine' ? '<div class="u-empty">セーブに自分の馬がいません。</div>' : '<div class="u-empty">当てはまる馬がいません。</div>';
    const picked = new Set(f.picks.map(p => p.kind + ':' + p.key));
    const body = rows.slice(0, lim).map((x, k) => {
      const on = picked.has(x.kind + ':' + x.key);
      return `<tr class="${on ? 'on' : ''}" data-act="fr-toggle" data-kind="${x.kind}" data-key="${e(x.key)}" data-name="${e(x.name)}"${k === 0 ? ' data-autofocus' : ''}>
        <td><div class="nm">${e(x.name)} <small class="sub">${x.sex}</small></div></td><td class="num">${x.born}</td><td class="num">${e(x.country)}</td>
        <td class="num">${K.num(x.turf, '総合力（芝）', false, 'fh')}</td><td class="num">${K.num(x.dirt, '総合力（ダート）', false, 'fh')}</td>
        ${FR.STAT_KEYS.map(s => `<td class="num">${K.num(x.pot[s], null, false, 'stat')}</td>`).join('')}
        <td class="num">${K.num(x.kire, '脚の切れ', false, 'kire')}</td><td class="num small w">${x.distMin}〜${x.distMax}</td><td class="num small">${e(x.style)}</td>
        <td class="num">${on ? '<span class="fr-add on">✓</span>' : `<span class="fr-add ${full ? 'off' : ''}">＋</span>`}</td></tr>`;
    }).join('');
    return `<div class="small muted">${rows.length}頭・見出しを押すと並べ替え（もう一度で逆順）・行を押すと出る馬に加える／外す</div>
      <div class="u-tbox"><table class="u-t fr-tbl"><tr>${K.sortHead(FR.COLS, key, dir, 'fr-sort')}<th></th></tr>${body}</table></div>
      ${rows.length > lim ? `<div class="u-more"><button class="btn" data-act="fr-more">もっと見る（残り${rows.length - lim}頭）</button></div>` : ''}`;
  }
  function horseStep(f) {
    const K = UI.kit;
    const decades = FR.decades(f.tab, f.snap);
    const kinds = [['hist', '史実馬'], ['special', 'スペシャルホース'], ['mine', '自分の馬']];
    return `<div class="u-split"><div>
        <div class="fr-filters">${K.seg('', kinds, f.tab, 'fr-set', 'tab')}</div>
        <div class="fr-filters"><input id="fr-q" placeholder="馬の名前で探す（ひらがなでも）" value="${e(f.q || '')}" aria-label="馬の名前で探す">
          <select id="fr-decade" aria-label="年代"><option value="">年代：すべて</option>${decades.map(d => `<option value="${d}" ${String(f.decade) === String(d) ? 'selected' : ''}>${d}年代生</option>`).join('')}</select>
          ${K.seg('国', [['', 'すべて'], ['日', '日本'], ['外', '海外']], f.cty || '', 'fr-set', 'cty')}
          ${K.seg('脚質', [['', 'すべて'], ['逃げ', '逃げ'], ['先行', '先行'], ['差し', '差し'], ['追込', '追込']], f.style || '', 'fr-set', 'style')}
          ${K.seg('向き', [['', 'すべて'], ['芝', '芝'], ['ダ', 'ダート']], f.surf || '', 'fr-set', 'surf')}</div>
        <div id="fr-list">${listHtml(f)}</div></div>
      <aside class="u-side">${picksHtml(f)}</aside></div>`;
  }
  function picksHtml(f) {
    return `<div class="u-pv"><div class="row"><b class="grow">出る馬 ${f.picks.length} / ${FR.MAX}</b>${f.picks.length ? '<button class="btn sm" data-act="fr-clear">全部外す</button>' : ''}</div>
      <div class="small muted">「乗る」を押した馬に自分が乗る。誰にも乗らないなら「見るだけ」。</div>
      <div class="fr-picks">${f.picks.map((p, i) => `<div class="fr-pick ${f.ride === i ? 'me' : ''}"><span class="nm">${e(p.name)}</span>${kindChip(p.kind)}
          <button class="btn sm ${f.ride === i ? 'gold' : ''}" data-act="fr-ride" data-i="${i}">${f.ride === i ? '乗る ✓' : '乗る'}</button><button class="btn sm" data-act="fr-del" data-i="${i}" aria-label="${e(p.name)}を外す">外す</button></div>`).join('')}
        <div class="fr-pick ${f.ride < 0 ? 'me' : ''}"><span class="nm">見るだけ（乗らない）</span><button class="btn sm ${f.ride < 0 ? 'gold' : ''}" data-act="fr-ride" data-i="-1">${f.ride < 0 ? '✓' : '選ぶ'}</button></div></div>
      ${f.picks.length < 2 ? '<div class="small muted mt">2頭から走れる（足りない分は増やさない）。</div>' : ''}
      <button class="btn gold block mt" data-act="fr-go" ${f.picks.length < 2 ? 'disabled' : ''}>出走表へ ▶</button></div>`;
  }

  UI.freeRace = function () {
    const f = st(), K = UI.kit;
    if (f.snap === undefined) f.snap = FR.saveSnapshot();
    const courses = FR.courses();
    const c = courses.find(x => x.name === f.course) || courses[0];
    if (f.surface === 'ダ' && !c.dirt) f.surface = '芝'; if (f.surface === '芝' && !c.turf) f.surface = 'ダ';
    const race = FR.race(f); f.dist = race.dist;
    const step = f.step === 'horses' ? 'horses' : 'course';
    return `<main class="page-solo fr">
      ${K.band({ icon: 'races', title: 'フリーレース', sub: '番組と関係なく1レースだけ遊ぶ。結果はセーブに残らない', right: '<button class="btn" data-act="fr-back" data-back>もどる</button>' })}
      ${K.tabs([['course', '① コースを選ぶ'], ['horses', `② 出る馬を選ぶ`, `${f.picks.length}/${FR.MAX}`]], step, 'fr-step', 'step')}
      <div class="fr-top"><span class="cond">${e(race.course)} ${race.surface === 'ダ' ? 'ダート' : '芝'}${race.dist}m</span><span class="small muted">${e(f.ground)}・${HS.Season ? HS.Season.weatherIcon(f.weather) : ''}${e(f.weather)}・${(HS.DATA.courses[race.course] || {}).dir || ''}回り</span>
        <span class="grow"></span><span class="small">${f.picks.length ? `出る馬 <b>${f.picks.length}</b>頭${f.ride >= 0 && f.picks[f.ride] ? `・乗る <b>${e(f.picks[f.ride].name)}</b>` : '・見るだけ'}` : '出る馬はまだいない'}</span>
        <button class="btn gold" data-act="fr-go" ${f.picks.length < 2 ? 'disabled' : ''}>出走表へ ▶</button></div>
      ${step === 'course' ? courseStep(f, race) : horseStep(f)}
    </main>${K.keybar([['Q/E', 'LB/RB', '切り替え']])}`;
  };
  App.pages = App.pages || {};
  App.pages.free = function (app, anim) {
    App.setScene('paddock');
    app.innerHTML = UI.freeRace();
    App.enter(app.querySelector('main'), anim);
    App.hydrate(app);
    App.afterRender();
  };
  const keepScroll = fn => { const y = globalThis.scrollY || 0; fn(); App.render(); globalThis.scrollTo(0, y); };
  // 選んでいた札を描き直したあとも選んだままにする（十字キーで選んで押したとき）
  const keepSel = fn => { const sel = document.querySelector('.navsel'); const sig = sel && App.sigOf(sel); keepScroll(fn); if (sig) { const el = App.findSig(document.getElementById('app'), sig); if (el) App.navSelect(el, true); } };
  App.act.free = () => { App.st.frFrom = App.st.screen; st().snap = undefined; App.st.screen = 'free'; App.navAnim = 'push'; App.render(); globalThis.scrollTo(0, 0); };
  App.act['fr-back'] = () => { App.st.screen = App.st.frFrom === 'game' ? 'game' : 'title'; App.navAnim = 'back'; App.render(); };
  App.act['fr-step'] = d => { st().step = d.step; App.navAnim = 'tab'; App.render(); globalThis.scrollTo(0, 0); };
  App.act['fr-course'] = d => keepSel(() => { st().course = d.k; });
  App.act['fr-set'] = d => keepSel(() => { const f = st(); f[d.k] = d.k === 'dist' ? +d.v : d.v; if (d.k === 'tab' || d.k === 'cty' || d.k === 'style' || d.k === 'surf') f.limit = PAGE; });
  App.act['fr-sort'] = d => keepSel(() => { const f = st(); HS.List.toggle(f, FR.COLS, d.k); if (!f.sortDir) f.sortDir = -1; f.limit = PAGE; });
  App.act['fr-more'] = () => keepSel(() => { const f = st(); f.limit = (f.limit || PAGE) + PAGE; });
  App.act['fr-ride'] = d => keepSel(() => { st().ride = +d.i; });
  App.act['fr-toggle'] = d => keepSel(() => {
    const f = st(), i = f.picks.findIndex(p => p.kind === d.kind && p.key === d.key);
    if (i >= 0) { f.picks.splice(i, 1); if (f.ride === i) f.ride = -1; else if (f.ride > i) f.ride--; return; }
    if (f.picks.length >= FR.MAX) { App.toast(`出る馬は${FR.MAX}頭まで`); return; }
    f.picks.push({ kind: d.kind, key: d.key, name: d.name });
    if (f.ride < 0 && d.kind === 'mine' && !f.picks.some((p, k) => k < f.picks.length - 1 && p.kind === 'mine')) f.ride = f.picks.length - 1; // 自分の馬を入れたら、まずその馬に乗る
  });
  App.act['fr-del'] = d => keepSel(() => { const f = st(), i = +d.i; f.picks.splice(i, 1); if (f.ride === i) f.ride = -1; else if (f.ride > i) f.ride--; });
  App.act['fr-clear'] = () => keepSel(() => { const f = st(); f.picks = []; f.ride = -1; });
  // 名前で探す・年代は、打つたびに一覧だけ描き直す（入力欄から手を離さずに絞れる）
  const refresh = () => { const box = document.getElementById('fr-list'); if (box) { box.innerHTML = listHtml(st()); App.hydrate(box); } };
  document.addEventListener('input', ev => { if (App.st.screen !== 'free' || ev.target.id !== 'fr-q') return; st().q = ev.target.value; st().limit = PAGE; refresh(); });
  document.addEventListener('change', ev => { if (App.st.screen !== 'free' || ev.target.id !== 'fr-decade') return; st().decade = ev.target.value ? +ev.target.value : ''; st().limit = PAGE; refresh(); });

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
        const bg = App.modal(`${UI.entryTable(card)}<div class="btns mt">${card.ride ? '<button class="btn gold" data-x="ride">ゲートイン</button>' : '<button class="btn gold" data-x="watch">レースを見る</button>'}<button class="btn" data-x="no">もどる</button></div>`, { noClose: true, scene: 'paddock' });
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
