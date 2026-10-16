// 画面の切り替え・操作・週の進行（レースの再生を含む）
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, W = HS.World, UI = HS.UI, A = HS.Art, R = HS.Races;
  const App = HS.App = {};
  const $ = s => document.querySelector(s);
  const e = U.esc;

  App.st = { screen: 'title', tab: 'home', stack: [], ng: null };
  let titleAnim = null;

  // ---------- 描画 ----------
  App.render = function () {
    const app = $('#app');
    const st = App.st;
    if (titleAnim) { cancelAnimationFrame(titleAnim); titleAnim = null; }
    if (HS.Audio && !App.inRace) HS.Audio.bgm(HS.Audio.songFor(st));
    const anim = App.navAnim; App.navAnim = null;
    document.body.dataset.screen = st.screen;
    if (st.screen === 'title') { App.setScene('title'); app.innerHTML = UI.screens.title(App.st.titleOpen); App.enter(app, anim); App.titleCanvas(); return; }
    if (st.screen === 'newgame') { App.setScene('title'); app.innerHTML = UI.screens.newgame(st.ng); App.enter(app, anim); App.drawNgSilks(); return; }
    if (App.pages && App.pages[st.screen]) { App.pages[st.screen](app, anim); return; } // ゲームの外の画面（リプレイ・フリーレース。js/ui/replayui.js・freerace.js）
    if (st.screen === 'editor') { App.setScene('home'); app.innerHTML = UI.screens.editor(st.ed || (st.ed = {})); App.hydrate(app); return; }
    const view = st.view || { name: st.tab };
    const html = UI.screens[view.name] ? UI.screens[view.name](view) : '';
    App.setScene(App.sceneOf(view));
    app.innerHTML = UI.header() + `<main>${html}</main>` + UI.nav(st.tab);
    App.enter(app.querySelector('main'), anim);
    App.hydrate(app);
  };

  // ---------- 背景の絵と画面の入り（持ち主の決定 2026-10-16「画面はゲームらしく派手に」） ----------
  // 背景は assets/ui_bg_*.js（HS.ASSETS）。読めないときは色の地のまま
  // 見た目だけの散らし（土ぼこり・紙吹雪）。ゲームの乱数（U.RNG）は使わず、Math.random も使わない
  App.fxRand = seed => { let x = (seed | 0) || 1; return () => (x = (x * 16807) % 2147483647) / 2147483647; };
  App.reduced = () => !!(globalThis.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  App.bgUrl = name => { const a = HS.ASSETS && HS.ASSETS['ui_bg_' + name]; return a ? `url("${a}")` : ''; };
  const SCENES = { home: 'home', stable: 'home', breed: 'home', farm: 'home', jrecord: 'home', records: 'home', menu: 'home', offers: 'home', market: 'shop', races: 'result' };
  App.sceneOf = view => {
    if (view.name === 'horse') { const h = W.horse(view.id); return h && h.owner === 'P' ? 'home' : 'shop'; }
    return SCENES[view.name] || 'home';
  };
  // 2枚の層を重ねて切り替える（ふわっと入れ替わる）
  App.setScene = function (name) {
    let el = document.getElementById('scene-bg');
    if (!el) { el = document.createElement('div'); el.id = 'scene-bg'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = '<i></i><i></i><b></b>'; document.body.prepend(el); }
    if (el.dataset.scene === name) return;
    el.dataset.scene = name;
    const [a, b] = el.querySelectorAll('i');
    const next = a.classList.contains('on') ? b : a, prev = next === a ? b : a;
    next.style.backgroundImage = App.bgUrl(name);
    next.dataset.scene = name;
    next.classList.add('on'); prev.classList.remove('on');
  };
  // 画面の入り：タブを替えたら金の帯がよぎり、中身が下から入る。進むと右から、戻ると左から
  App.enter = function (el, anim) {
    if (!el || !anim || App.reduced()) return;
    el.classList.add('enter-' + anim);
    if (anim === 'tab') {
      const w = document.createElement('div'); w.className = 'wipe'; document.body.appendChild(w);
      setTimeout(() => w.remove(), 700);
    }
  };
  // 絵を描く
  App.hydrate = function (root) {
    root.querySelectorAll('canvas[data-art]').forEach(cv => {
      const kind = cv.dataset.art;
      if (kind === 'portrait' || kind === 'thumb') {
        const h = W.horse(cv.dataset.id) || (App.marketHorse && App.marketHorse(cv.dataset.id));
        if (h) A.portrait(cv, h);
      } else if (kind === 'thumbdata') {
        A.portrait(cv, { coat: cv.dataset.coat, name: cv.dataset.key });
      } else if (kind === 'silks') {
        const mine = cv.dataset.mine === '1';
        A.silksIcon(cv, mine ? W.get().player.silks : HS.RaceView.silksOf({ name: cv.dataset.key }));
      }
    });
  };
  App.marketHorse = function (id) {
    const G = W.get();
    for (const it of G.market.gen.concat(G.market.genMares)) if (it.horse.id === id) return it.horse;
    return null;
  };

  // ---------- 小窓 ----------
  App.modal = function (html, opts) {
    opts = opts || {};
    const root = $('#modal-root');
    const bg = document.createElement('div');
    bg.className = 'modal-bg' + (opts.scene ? ' scene scene-' + opts.scene : '');
    if (opts.scene && App.bgUrl(opts.scene)) bg.style.setProperty('--scene-img', App.bgUrl(opts.scene));
    bg.innerHTML = `<div class="modal ${opts.wide ? 'wide' : ''}">${opts.noClose ? '' : '<button class="close" data-act="close">×</button>'}${html}</div>`;
    root.appendChild(bg);
    App.hydrate(bg);
    return bg;
  };
  App.closeModal = function () { const root = $('#modal-root'); if (root.lastChild) root.removeChild(root.lastChild); };
  App.closeAll = function () { $('#modal-root').innerHTML = ''; };
  App.toast = function (text) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  };
  App.confirm = function (text, okLabel) {
    return new Promise(res => {
      const bg = App.modal(`<h3>確認</h3><p>${text}</p><div class="btns"><button class="btn gold" data-x="ok">${okLabel || 'はい'}</button><button class="btn" data-x="no">やめる</button></div>`, { noClose: true });
      bg.querySelector('[data-x=ok]').onclick = () => { App.closeModal(); res(true); };
      bg.querySelector('[data-x=no]').onclick = () => { App.closeModal(); res(false); };
    });
  };
  App.prompt = function (title, value, note) {
    return new Promise(res => {
      const bg = App.modal(`<h3>${title}</h3><div class="field"><input id="pr-in" value="${e(value || '')}" maxlength="9"></div>${note ? `<div class="small muted">${note}</div>` : ''}<div class="btns mt"><button class="btn gold" data-x="ok">決定</button><button class="btn" data-x="sug">おまかせ</button><button class="btn" data-x="no">やめる</button></div>`, { noClose: true });
      const inp = bg.querySelector('#pr-in');
      bg.querySelector('[data-x=ok]').onclick = () => { const v = inp.value; App.closeModal(); res(v); };
      bg.querySelector('[data-x=sug]').onclick = () => { inp.value = W.suggestName(); };
      bg.querySelector('[data-x=no]').onclick = () => { App.closeModal(); res(null); };
      inp.focus();
    });
  };

  // ---------- 移動 ----------
  App.go = function (view) { App.st.stack.push(App.st.view || { name: App.st.tab }); App.st.view = view; App.navAnim = 'push'; App.render(); window.scrollTo(0, 0); };
  App.back = function () { App.st.view = App.st.stack.pop() || { name: App.st.tab }; App.navAnim = 'back'; App.render(); };
  App.save = function () { if (!W.saveLocal()) App.toast('この端末に保存できませんでした（セーブの書き出しを使ってください）'); };

  // ---------- 操作 ----------
  const act = App.act = {};
  act.title = () => { App.closeAll(); App.st.screen = 'title'; App.navAnim = 'tab'; App.render(); };
  // タイトル：画面を押すとメニューが出る
  act['title-open'] = () => { if (App.st.titleOpen) return; App.st.titleOpen = true; if (HS.Audio) HS.Audio.se('ok'); App.render(); };
  act['newgame-form'] = () => { App.st.screen = 'newgame'; App.navAnim = 'push'; App.st.ng = App.st.ng || { name: '', farm: '', crown: '', year: 1995, diff: 'normal', silks: { base: '#1f4fbf', sub: '#ffd100', pattern: 'hoops' } }; App.render(); };
  const readNg = () => { const ng = App.st.ng; ng.name = $('#ng-name').value; ng.farm = $('#ng-farm').value; ng.crown = $('#ng-crown').value; ng.year = +$('#ng-year').value; ng.diff = $('#ng-diff').value; };
  act['ng-color'] = d => { readNg(); App.st.ng.silks[d.k] = d.c; App.render(); };
  act['ng-pattern'] = d => { readNg(); App.st.ng.silks.pattern = d.p; App.render(); };
  App.drawNgSilks = () => { const cv = $('#ng-silks'); if (cv) A.silksIcon(cv, App.st.ng.silks); };
  act['newgame-start'] = () => {
    readNg();
    const ng = App.st.ng;
    const crown = (ng.crown || '').trim();
    if (crown && !/^[ァ-ヶー・ヴ]{1,5}$/.test(crown)) return App.toast('冠名はカタカナ1〜5文字');
    W.newGame({ name: ng.name.trim() || 'プレイヤー', farm: ng.farm.trim() || '新星牧場', crown, year: ng.year, money: { easy: 50000, normal: 30000, hard: 10000 }[ng.diff], difficulty: ng.diff, silks: Object.assign({}, ng.silks) });
    App.save();
    App.st.screen = 'game'; App.st.tab = 'home'; App.st.view = null; App.st.stack = [];
    App.render();
    App.modal(`<h3>ようこそ、${e(W.get().player.farm)}へ</h3>
      <p>${W.get().year}年1月。手もとには繁殖牝馬が2頭と、若駒が2頭。資金は${U.money(W.get().player.money)}。</p>
      <ul class="small"><li><b>市場</b>：デビュー前の史実馬や名牝が買える。</li><li><b>牧場</b>：2月〜6月に種付け。2歳の4月から入厩。</li><li><b>厩舎</b>：調教とレースを決める（おまかせもできる）。</li><li>決めたら上の<b>「次の週へ」</b>。</li></ul>
      <div class="btns"><button class="btn gold" data-act="close">はじめる</button></div>`);
  };
  act.continue = () => { if (!W.loadLocal()) return App.toast('セーブが読めませんでした'); App.st.screen = 'game'; App.st.tab = 'home'; App.st.view = null; App.navAnim = 'tab'; App.render(); };
  act.tab = d => { App.st.tab = d.tab; App.st.view = null; App.st.stack = []; App.navAnim = 'tab'; App.render(); window.scrollTo(0, 0); };
  act.back = () => App.back();
  act.close = () => App.closeModal();
  act.horse = d => { App.closeAll(); App.go({ name: 'horse', id: d.id }); };
  act.htab = d => { App.st.view.htab = d.tab; App.render(); };
  act.mtab = d => { App.st.view = { name: 'market', mtab: d.tab }; App.render(); };
  act.mmore = () => { App.st.view = App.st.view || { name: App.st.tab }; App.st.view.mlimit = (App.st.view.mlimit || 30) + 30; App.render(); };
  act.rtab = d => { App.st.view = { name: 'races', rtab: d.tab }; App.render(); };
  act.ctab = d => { App.st.view = { name: 'records', ctab: d.tab }; App.render(); };
  act.menu = d => { const h = W.horse(d.id); h.menu = d.m; h.auto = false; App.save(); App.render(); };
  act.auto = d => { const h = W.horse(d.id); h.auto = !h.auto; if (h.auto) W.unenter(h.id); App.save(); App.render(); };
  act.enter = d => { const err = W.enter(d.id, d.race); if (err) return App.toast(err); const h = W.horse(d.id); h.auto = false; App.save(); App.toast('出走を登録した'); App.render(); };
  act.unenter = d => { W.unenter(d.id); App.save(); App.render(); };
  act['to-stable'] = d => { const h = W.horse(d.id); if (h && !h.name) return act.name(d, true); const err = W.toStable(d.id); if (err) return App.toast(err); App.save(); App.toast(`${h.name}が入厩した`); App.render(); };
  act['to-farm'] = d => { W.toFarm(d.id); App.save(); App.toast('放牧に出した'); App.render(); };
  act.name = async (d, thenStable) => {
    const v = await App.prompt('名前を付ける', W.suggestName(), 'カタカナ2〜9文字。おまかせで候補を出せます。');
    if (v == null) return;
    const err = W.rename(d.id, v);
    if (err) return App.toast(err);
    if (thenStable === true) W.toStable(d.id);
    App.save(); App.render();
  };
  act.retire = async d => {
    const h = W.horse(d.id);
    if (!(await App.confirm(`${e(h.name)}を引退させますか？`, '引退させる'))) return;
    const r = W.retire(d.id); App.save();
    if (r.to === 'gone') { App.back(); } else App.render();
  };
  act.sell = async d => {
    const h = W.horse(d.id);
    if (!(await App.confirm(`${e(W.displayName(h))}を${U.money(W.sellPrice(h))}で売りますか？`, '売る'))) return;
    W.sell(d.id); App.save();
    if (App.st.view && App.st.view.name === 'horse') App.back(); else App.render();
  };
  act.upgrade = () => { const err = W.upgradeFarm(); if (err) return App.toast(err); App.save(); App.render(); };
  act.breed = d => { if (!W.canBreed()) return App.toast('種付けは2月〜6月'); App.go({ name: 'breed', id: d.id }); };
  act.bfilter = d => { App.st.view.filter = d.f; App.render(); };
  act.bsort = d => { App.st.view.sort = d.s; App.render(); };
  act.bpick = d => {
    const m = W.horse(App.st.view.id);
    const s = W.stallionsOf(W.get().year).find(x => x.name === d.s);
    if (!s) return;
    App.modal(UI.breedDetail(m, s));
  };
  act.bdo = d => {
    const r = W.breed(App.st.view.id, d.s);
    App.closeAll();
    if (r.err) return App.toast(r.err);
    App.save();
    if (HS.Audio) HS.Audio.se(r.ok ? 'ok' : 'error');
    App.toast(r.ok ? '受胎を確認した！' : '不受胎……もう一度つけられます');
    App.back();
  };
  act.buy = async d => {
    const G = W.get();
    let item;
    if (d.kind === 'hist') item = W.marketHistoric()[+d.i];
    else if (d.kind === 'fhist') item = W.marketForeign()[+d.i];
    else if (d.kind === 'hmare') item = W.marketMares()[+d.i];
    else if (d.kind === 'gen') item = Object.assign({ kind: 'gen' }, G.market.gen[+d.i]);
    else if (d.kind === 'gmare') item = Object.assign({ kind: 'gmare' }, G.market.genMares[+d.i]);
    if (!item) return;
    const name = item.horse ? W.displayName(item.horse) : item.data.name;
    if (!(await App.confirm(`${e(name)}を${U.money(item.price)}で買いますか？`, '買う'))) return;
    const err = W.buy(item);
    if (err) return App.toast(err);
    App.save(); if (HS.Audio) HS.Audio.se('coin'); App.toast('購入した！'); App.render();
  };
  act.htext = d => App.modal(UI.histTextModal(d.name));
  act.result = d => { const r = W.get().lastWeek.races.filter(x => x.grade || x.mine)[+d.i]; if (r) App.modal(UI.resultTable(r)); };
  act.replay = async d => {
    const r = W.lastReport && W.lastReport.races.find(x => x.race.key === d.key);
    if (r) await App.playRace(r, true);
  };
  act.export = () => {
    const s = W.serialize();
    App.modal(`<h3>セーブを書き出す</h3><p class="small">下の文字をすべてコピーして保存しておけば、別の端末でも「セーブを読み込む」で続きから遊べます。</p><textarea style="width:100%;height:180px" readonly>${e(s)}</textarea><div class="btns mt"><button class="btn gold" data-x="copy">コピー</button><button class="btn" data-act="close">閉じる</button></div>`)
      .querySelector('[data-x=copy]').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(s).then(() => App.toast('コピーした'), () => App.toast('コピーできませんでした')); };
  };
  act.import = () => {
    const bg = App.modal(`<h3>セーブを読み込む</h3><textarea id="imp" style="width:100%;height:180px" placeholder="書き出した文字を貼り付け"></textarea><div class="btns mt"><button class="btn gold" data-x="ok">読み込む</button><button class="btn" data-act="close">やめる</button></div>`);
    bg.querySelector('[data-x=ok]').onclick = () => {
      try { W.load(bg.querySelector('#imp').value.trim()); App.save(); App.closeAll(); App.st.screen = 'game'; App.st.tab = 'home'; App.st.view = null; App.render(); App.toast('読み込んだ'); }
      catch (err) { App.toast('読み込めませんでした'); }
    };
  };
  act.reset = async () => {
    if (!(await App.confirm('この端末のセーブを消します。元に戻せません。', '消す'))) return;
    if (!(await App.confirm('本当に消しますか？', '本当に消す'))) return;
    W.clearLocal(); App.st.screen = 'title'; App.render();
  };
  act.next = () => App.nextWeek();
  // 音のあり・なし（タイトル）
  act.sound = () => {
    const AU = HS.Audio; const on = AU.settings.bgm + AU.settings.se > 0;
    if (on) { AU._prev = { bgm: AU.settings.bgm, se: AU.settings.se }; AU.settings.bgm = 0; AU.settings.se = 0; }
    else Object.assign(AU.settings, AU._prev || { bgm: 0.5, se: 0.7 });
    AU.saveSettings(); AU.applyVolume(); App.render();
  };
  act['next-many'] = () => App.nextMany(4);

  const change = App.change = {};
  change.jockey = (el) => { const id = el.dataset.id; const ent = W.entryOf(id); if (!ent) return; W.enter(id, ent.raceKey, el.value); App.save(); };
  // 画面の色（深緑と金／紺と金）。この端末に覚えておく
  App.THEME_KEY = 'hs-theme';
  App.theme = () => { try { return localStorage.getItem(App.THEME_KEY) || 'green'; } catch (e) { return 'green'; } };
  App.applyTheme = t => { document.documentElement.dataset.theme = t || App.theme(); };
  change.theme = (el) => { try { localStorage.setItem(App.THEME_KEY, el.value); } catch (e) { /* 覚えられなくても切り替える */ } App.applyTheme(el.value); };
  change.rumble = (el) => { const RB = HS.Rumble; RB.setLevel((+el.value) / 100); RB.play(180, 0.8, 0.8); };
  change.volume = (el) => { const AU = HS.Audio; AU.settings[el.dataset.k] = (+el.value) / 100; AU.saveSettings(); AU.applyVolume(); if (el.dataset.k === 'se') AU.se('click'); };
  change.setting = (el) => { const G = W.get(); const k = el.dataset.k; G.settings[k] = k === 'watch' ? +el.value : el.value === '1'; App.save(); };

  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-act]');
    if (!el) return;
    const name = el.dataset.act;
    if (!act[name]) return;
    ev.preventDefault();
    if (HS.Audio) HS.Audio.se(name === 'tab' ? 'tab' : name === 'next' || name === 'next-many' ? 'week' : 'click');
    if (el.tagName === 'BUTTON' || el.tagName === 'A') ev.stopPropagation();
    act[name](el.dataset);
  });
  document.addEventListener('change', ev => {
    const el = ev.target.closest('[data-act-change]');
    if (el && change[el.dataset.actChange]) change[el.dataset.actChange](el);
  });

  // ---------- 週を進める ----------
  let busy = false;
  App.nextWeek = async function () {
    if (busy) return; busy = true;
    try {
      const G = W.get();
      const report = W.advance();
      W.lastReport = report;
      App.save();
      const mineRaces = report.races.filter(r => r.hasMine);
      for (const r of mineRaces) {
        if (G.settings.watch === 0) continue;
        await App.playRace(r, false);
      }
      App.weekSummary(report);
      App.render();
    } catch (err) {
      console.error(err);
      App.toast('エラー：' + err.message);
    } finally { busy = false; }
  };
  // まとめて進める（映像なし。最後にまとめを出す）
  App.nextMany = async function (n) {
    if (busy) return; busy = true;
    try {
      const rows = [], g1 = [];
      const start = W.dateLabel(W.get().year, W.get().month, W.get().week);
      for (let i = 0; i < n; i++) {
        const rep = W.advance();
        W.lastReport = rep;
        for (const r of rep.races) {
          for (const x of r.sim.results.filter(x => x.mine)) rows.push(`<tr><td class="small">${rep.m}/${rep.w}</td><td>${UI.gradeTag(r.race)} ${e(R.label(r.race))}</td><td><b>${e(x.horse.name)}</b></td><td class="num ${x.pos <= 3 ? 'pos' + x.pos : ''}">${x.pos}着</td></tr>`);
          if (r.race.grade === 'G1' && r.race.region !== '海外') g1.push(`<div class="small">${UI.gradeTag(r.race)} ${e(R.label(r.race))}　${e(r.sim.results[0].horse.name)}</div>`);
        }
      }
      App.save();
      App.render();
      App.modal(`<h3>${e(start)}から${n}週</h3>
        ${rows.length ? `<div class="tblwrap"><table class="t">${rows.join('')}</table></div>` : '<div class="panel empty">自分の馬の出走はありませんでした。</div>'}
        ${g1.length ? `<div class="panel mt">${g1.join('')}</div>` : ''}
        <ul class="news mt">${W.get().news.slice(0, 10).map(x => `<li class="${x.kind}"><span class="d">${x.y}/${x.m}-${x.w}</span>${e(x.text)}</li>`).join('')}</ul>
        <div class="btns mt"><button class="btn gold" data-act="close">閉じる</button></div>`);
    } catch (err) { console.error(err); App.toast('エラー：' + err.message); }
    finally { busy = false; }
  };

  // 出馬表 → レース → 結果
  App.playRace = async function (r, replay) {
    const G = W.get();
    await new Promise(res => {
      const bg = App.modal(`${UI.raceCard(r)}<div class="btns mt"><button class="btn gold" data-x="go">${replay ? '再生する' : '発走！'}</button>${replay ? '' : '<button class="btn" data-x="skip">結果だけ見る</button>'}</div>`, { noClose: true, scene: 'result' });
      bg.querySelector('[data-x=go]').onclick = () => { App.closeModal(); res(true); };
      const sk = bg.querySelector('[data-x=skip]'); if (sk) sk.onclick = () => { App.closeModal(); r.skip = true; res(false); };
    });
    const AU = HS.Audio;
    if (!r.skip) {
      App.inRace = true;
      const bg = App.modal('<div class="rv-holder"></div>', { wide: true, noClose: true });
      // ファンファーレ → 発走
      if (AU && AU.ready() && AU.settings.bgm > 0) {
        bg.querySelector('.rv-holder').innerHTML = `<div class="panel gold center" style="padding:40px 10px"><div class="serif" style="font-size:22px;font-weight:900;color:var(--gold2)">${e(R.label(r.race))}</div><div class="mt">ファンファーレ……</div><button class="btn sm mt" data-x="skipfan">飛ばす</button></div>`;
        await Promise.race([AU.playOnce('fanfare'), new Promise(res => { bg.querySelector('[data-x=skipfan]').onclick = () => { AU.stopBgm(); res(); }; })]);
      }
      if (AU) { AU.bgm('race'); AU.raceStart(); }
      await (HS.Watch3D ? HS.Watch3D.play : HS.RaceView.play)(bg.querySelector('.rv-holder'), r, {
        speed: G.settings.animSpeed || 1, onSpeed: s => { G.settings.animSpeed = s; },
        onStart: () => AU && AU.se('gate'),
        onTick: (remain, straight, running, finished) => AU && AU.raceUpdate(remain, straight, running, finished),
      });
      if (AU) { AU.raceEnd(); AU.stopBgm(); }
      App.closeModal();
      App.inRace = false;
    }
    const slim = W.slimResult(r);
    // 自分の馬が重賞を勝ったら、結果の前に大きな見せ場
    const won = !replay && r.race.graded && r.sim.results[0] && r.sim.results[0].mine ? r.sim.results[0] : null;
    if (won && UI.celebrate) {
      if (AU) { App.inRace = true; AU.playOnce('victory').then(() => { App.inRace = false; AU.bgm('home'); }); }
      await UI.celebrate(UI.winFx(r.race, won.horse.name, won.time, won.jockey ? won.jockey.name : ''));
    }
    await new Promise(res => {
      const mine = slim.rows.filter(x => x.mine);
      const msg = mine.map(x => x.pos === 1 ? (r.race.graded ? `<div class="hero"><canvas class="winner-cv" width="960" height="560" data-name="${e(x.name)}"></canvas></div>` : `<div class="panel gold center"><div class="serif" style="font-size:24px;font-weight:900;color:var(--gold2)">🏆 ${e(x.name)} 優勝！</div></div>`) : `<div class="panel center">${e(x.name)}は${x.pos}着</div>`).join('');
      const bg = App.modal(`${msg}${UI.resultTable(slim)}<div class="btns mt"><button class="btn gold" data-x="ok">次へ</button></div>`, { noClose: true, scene: 'result' });
      if (AU && !won && mine.some(x => x.pos === 1)) { App.inRace = true; AU.playOnce('victory').then(() => { App.inRace = false; AU.bgm('home'); }); }
      else if (AU && !won && mine.length && !replay) { App.inRace = true; AU.playOnce('lose').then(() => { App.inRace = false; AU.bgm('home'); }); }
      bg.querySelectorAll('.winner-cv').forEach(cv => {
        const run = r.runners.find(x => x.horse.name === cv.dataset.name);
        const win = r.sim.results[0];
        A.winner(cv, run.horse, G.player.silks, `${r.race.short || r.race.name} 優勝`, `${run.horse.name}　${U.time(win.time)}　騎手 ${win.jockey ? win.jockey.name : ''}`);
      });
      bg.querySelector('[data-x=ok]').onclick = () => { App.closeModal(); res(); };
    });
    r.skip = false;
    App.inRace = false;
    if (AU) AU.bgm('home');
  };
  App.weekSummary = function (report) {
    const G = W.get();
    const mine = report.races.filter(r => r.hasMine);
    const g1 = report.races.filter(r => (r.race.grade === 'G1' || r.race.invite) && !r.hasMine).sort((a, b) => (b.race.invite ? 1 : 0) - (a.race.invite ? 1 : 0)); // 出なかったグランドフィナーレも観戦できる（先頭に）
    // この週に起きたこと（週の処理のあとで暦が進むので、次の週の頭に出たものも含める）
    const fresh = G.news.filter(n => n.kind !== 'g1race' && ((n.y === report.y && n.m === report.m && n.w === report.w) || (n.y === G.year && n.m === G.month && n.w === G.week))).slice(0, 10);
    const items = [];
    for (const r of mine) for (const x of r.sim.results.filter(x => x.mine)) items.push(`<tr><td>${UI.gradeTag(r.race)} ${e(R.label(r.race))}</td><td><b>${e(x.horse.name)}</b></td><td class="num ${x.pos <= 3 ? 'pos' + x.pos : ''}">${x.pos}着</td></tr>`);
    const hasAny = items.length || g1.length || report.events.length;
    if (!hasAny && !fresh.length) return;
    App.modal(`<h3>${e(report.date)}のまとめ</h3>
      ${items.length ? `<div class="panel"><table class="t">${items.join('')}</table></div>` : ''}
      ${g1.length ? `<div class="panel mt">${g1.map(r => `<div class="row"><span class="grow">${UI.gradeTag(r.race)} <b>${e(R.label(r.race))}</b>　1着 ${e(r.sim.results[0].horse.name)}${(() => { const h = W.histWinner.get(r.race.year + r.race.name); return h && h !== r.sim.results[0].horse.name ? ` <span class="small muted">（史実：${e(h)}）</span>` : ''; })()}</span><button class="btn sm" data-act="replay" data-key="${e(r.race.key)}">観戦</button></div>`).join('')}</div>` : ''}
      ${report.events.length ? `<div class="small muted mt">${report.events.map(e).join('<br>')}</div>` : ''}
      <ul class="news mt">${fresh.map(n => `<li class="${n.kind}"><span class="d">${UI.newsDate(n)}</span>${e(n.text)}</li>`).join('')}</ul>
      <div class="btns mt"><button class="btn gold" data-act="close">閉じる</button></div>`);
  };

  // ---------- タイトルの動く絵：背景の写真の上を、馬群が柵の前を駆け抜ける（地は透明） ----------
  App.titleCanvas = function () {
    const cv = $('#title-cv'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    const w = 1280, h = 300;
    cv.width = w * dpr; cv.height = h * dpr; ctx.scale(dpr, dpr);
    const horses = [
      { coat: '鹿毛', silks: { base: '#1f4fbf', sub: '#ffd100', pattern: 'hoops' }, cap: '#fff', x: 760, lane: 0, sp: 1.0 },
      { coat: '芦毛', silks: { base: '#ffffff', sub: '#c8102e', pattern: 'cross' }, cap: '#e0312f', x: 600, lane: 1, sp: 1.03 },
      { coat: '青鹿毛', silks: { base: '#111', sub: '#ffd100', pattern: 'sash' }, cap: '#2a63d4', x: 420, lane: 2, sp: 0.98 },
      { coat: '栗毛', silks: { base: '#00843d', sub: '#fff', pattern: 'stripes' }, cap: '#f2cf1d', x: 520, lane: 3, sp: 1.01 },
    ];
    const dust = [], rnd = App.fxRand(7);
    let t = 0, last = null;
    const still = App.reduced();
    const draw = ts => {
      if (last == null) last = ts;
      const dt = still ? 0 : U.clamp((ts - last) / 1000, 0, 0.05); last = ts; t += dt; // 時刻が戻ったとき（タブの切り替えなど）に負にしない
      ctx.clearRect(0, 0, w, h);
      // 外の柵（流れて速さが出る）
      const ry = h * 0.36;
      ctx.fillStyle = 'rgba(245,240,226,.85)'; ctx.fillRect(0, ry, w, 4);
      for (let i = 0; i < 26; i++) ctx.fillRect(((i * 56 - t * 420) % (w + 56) + w + 56) % (w + 56) - 28, ry, 4, 20);
      for (const ho of horses) {
        ho.x += dt * 130 * ho.sp * (1 + 0.06 * Math.sin(t * 1.3 + ho.lane));
        if (ho.x > w + 200) ho.x = -200;
        const y = h * 0.62 + ho.lane * 26;
        if (!still && rnd() < 0.5) dust.push({ x: ho.x - 50, y: y + 4, vx: -40 - rnd() * 60, vy: -10 - rnd() * 20, life: 1 });
        A.horse(ctx, ho.x, y, 1.25 + ho.lane * 0.08, (t * 1.9 + ho.lane * 0.23) % 1, { coat: ho.coat, marks: A.marks(ho.coat), silks: ho.silks, cap: ho.cap });
      }
      // 蹴り上げた芝の土ぼこり
      for (let i = dust.length - 1; i >= 0; i--) {
        const p = dust[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.6;
        if (p.life <= 0) { dust.splice(i, 1); continue; }
        ctx.fillStyle = `rgba(214,196,150,${(p.life * 0.35).toFixed(3)})`; ctx.beginPath(); ctx.arc(p.x, p.y, 3 + (1 - p.life) * 6, 0, Math.PI * 2); ctx.fill();
      }
      // ゲームパッドのボタンでもメニューが出る
      if (!App.st.titleOpen && navigator.getGamepads && [...navigator.getGamepads()].some(g => g && g.buttons.some(b => b.pressed))) { act['title-open'](); return; }
      if (!still || !App.st.titleOpen) titleAnim = requestAnimationFrame(draw);
    };
    titleAnim = requestAnimationFrame(draw);
  };
  // タイトルは画面のどこをクリックしても・Enter・空白・ゲームパッドのボタンでもメニューが出る
  document.addEventListener('click', ev => { if (App.st.screen === 'title' && !App.st.titleOpen && !ev.target.closest('[data-act], #modal-root, .fx')) act['title-open'](); });
  document.addEventListener('keydown', ev => { if (App.st.screen === 'title' && !App.st.titleOpen && (ev.key === 'Enter' || ev.key === ' ') && !$('#modal-root').children.length) { ev.preventDefault(); act['title-open'](); } });

  // ---------- 十字キー・矢印キー・ゲームパッドで札を選ぶ（持ち主の決定 2026-10-16「遊ぶのは PC だけ」） ----------
  // 選んでいる札は金に光る（.navsel）。Enter・A で押す、Esc・B で閉じる・もどる。
  // 騎乗中・見せ場・タイトルの「スタート」の前は、それぞれの画面が自分で受け取るので触らない。パドックの左右は馬の切り替え
  const NAV_SEL = 'button:not([disabled]), a[href], [data-act], select, input, textarea';
  const navRoot = () => { const m = $('#modal-root'); return m.lastElementChild || $('#app'); };
  const navOff = () => App.inRace || !!document.querySelector('.ride, .fx') || (App.st.screen === 'title' && !App.st.titleOpen);
  const visible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  let navEl = null;
  App.navSelect = function (el) {
    if (navEl && navEl !== el) navEl.classList.remove('navsel');
    navEl = el; if (!el) return;
    el.classList.add('navsel');
    if (el.tabIndex < 0 && !/^(BUTTON|A|SELECT|INPUT|TEXTAREA)$/.test(el.tagName)) el.tabIndex = 0;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: App.reduced() ? 'auto' : 'smooth' });
  };
  App.navMove = function (dir) {
    const root = navRoot();
    const items = [...root.querySelectorAll(NAV_SEL)].filter(el => visible(el) && !el.matches('.title'));
    if (!items.length) return;
    const cur = navEl && root.contains(navEl) && visible(navEl) ? navEl : null;
    if (!cur) { App.navSelect(root.querySelector('.btn.gold:not([disabled]), .go:not([disabled])') || items[0]); return; }
    const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    // 下の並び（いつも画面の下にある）は、そこから動くときか、ほかに行き先が無いときだけ
    const inNav = el => !!el.closest('.nav');
    const pick = list => {
    let best = null, bs = Infinity;
    for (const el of list) {
      if (el === cur || el.contains(cur)) continue;
      const b = el.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2;
      const dx = bx - ax, dy = by - ay;
      const main = dir === 'right' ? dx : dir === 'left' ? -dx : dir === 'down' ? dy : -dy;
      const side = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
      if (main <= 4) continue;
      const sc = main + side * 2.2;
      if (sc < bs) { bs = sc; best = el; }
    }
    return best;
    };
    const best = inNav(cur) ? pick(items) : (pick(items.filter(el => !inNav(el))) || pick(items));
    if (best) App.navSelect(best);
  };
  App.navPress = function () { if (navEl && document.contains(navEl)) navEl.click(); };
  App.navBack = function () {
    const m = $('#modal-root').lastElementChild;
    if (m) { const c = m.querySelector('[data-act=close], [data-x=no]'); if (c) c.click(); return; }
    if (App.st.screen === 'game' && App.st.stack.length) App.back();
  };
  const KEYDIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  document.addEventListener('keydown', ev => {
    if (navOff() || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    const t = ev.target, typing = t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
    const dir = KEYDIR[ev.key];
    if (dir) {
      if (typing && (t.tagName !== 'INPUT' || dir === 'left' || dir === 'right')) return;
      if (document.querySelector('.paddock') && (dir === 'left' || dir === 'right')) return;
      ev.preventDefault(); App.navMove(dir);
    } else if (ev.key === 'Enter' && navEl && t === navEl && !/^(BUTTON|A|INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) { ev.preventDefault(); App.navPress(); }
    else if (ev.key === 'Escape') { ev.preventDefault(); App.navBack(); }
    else if ((ev.key === 'q' || ev.key === 'e' || ev.key === 'PageUp' || ev.key === 'PageDown') && !typing) App.navLR(ev.key === 'q' || ev.key === 'PageUp' ? 'prev' : 'next');
  });
  // 左右の切り替え（Q・E／PageUp・PageDown／LB・RB）：画面に [data-lr] の札があれば押す（馬の店の牡馬・牝馬など）
  App.navLR = function (side) { const b = navRoot().querySelector(`[data-lr=${side}]`); if (b && visible(b)) b.click(); };
  document.addEventListener('pointerdown', () => { if (navEl) { navEl.classList.remove('navsel'); navEl = null; } }, true);
  // ゲームパッド：十字キーで選ぶ（長押しで続けて動く）・A で押す・B で閉じる・もどる
  const padPrev = {};
  let padRepeat = 0;
  const pollPad = () => {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    if (pads.length) {
      const g = pads[0], btn = i => !!(g.buttons[i] && g.buttons[i].pressed);
      const ax = g.axes || [];
      const st = { up: btn(12) || ax[1] < -0.6, down: btn(13) || ax[1] > 0.6, left: btn(14) || ax[0] < -0.6, right: btn(15) || ax[0] > 0.6, a: btn(0), b: btn(1), lb: btn(4), rb: btn(5) };
      // 騎乗中などは見るだけ（押しっぱなしのボタンが、戻ったときに押したことにならないように）
      if (navOff()) { Object.assign(padPrev, st); setTimeout(pollPad, 50); return; }
      const now = performance.now();
      for (const d of ['up', 'down', 'left', 'right']) {
        if (st[d] && (!padPrev[d] || now > padRepeat)) {
          padRepeat = now + (padPrev[d] ? 120 : 380);
          if (document.querySelector('.paddock') && (d === 'left' || d === 'right')) window.dispatchEvent(new KeyboardEvent('keydown', { key: d === 'left' ? 'ArrowLeft' : 'ArrowRight' }));
          else App.navMove(d);
        }
      }
      if (st.a && !padPrev.a) { if (navEl && document.contains(navEl)) App.navPress(); else App.navMove('down'); }
      if (st.b && !padPrev.b) App.navBack();
      if (st.lb && !padPrev.lb) App.navLR('prev');
      if (st.rb && !padPrev.rb) App.navLR('next');
      Object.assign(padPrev, st);
    }
    setTimeout(pollPad, 50);
  };
  pollPad();

  // 起動
  window.addEventListener('DOMContentLoaded', () => {
    App.applyTheme();
    if (HS.Edits) HS.Edits.apply(HS.Edits.loadLocal());
    W.index();
    App.render();
  });
})();
