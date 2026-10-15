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
    if (HS.Audio && !App.inRace) HS.Audio.bgm(st.screen === 'game' ? 'home' : 'title');
    if (st.screen === 'title') { app.innerHTML = UI.screens.title(); App.titleCanvas(); return; }
    if (st.screen === 'newgame') { app.innerHTML = UI.screens.newgame(st.ng); App.drawNgSilks(); return; }
    if (st.screen === 'editor') { app.innerHTML = UI.screens.editor(st.ed || (st.ed = {})); App.hydrate(app); return; }
    const view = st.view || { name: st.tab };
    const html = UI.screens[view.name] ? UI.screens[view.name](view) : '';
    app.innerHTML = UI.header() + `<main>${html}</main>` + UI.nav(st.tab);
    App.hydrate(app);
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
    bg.className = 'modal-bg';
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
  App.go = function (view) { App.st.stack.push(App.st.view || { name: App.st.tab }); App.st.view = view; App.render(); window.scrollTo(0, 0); };
  App.back = function () { App.st.view = App.st.stack.pop() || { name: App.st.tab }; App.render(); };
  App.save = function () { if (!W.saveLocal()) App.toast('この端末に保存できませんでした（セーブの書き出しを使ってください）'); };

  // ---------- 操作 ----------
  const act = App.act = {};
  act.title = () => { App.closeAll(); App.st.screen = 'title'; App.render(); };
  act['newgame-form'] = () => { App.st.screen = 'newgame'; App.st.ng = App.st.ng || { name: '', farm: '', crown: '', year: 1995, diff: 'normal', silks: { base: '#1f4fbf', sub: '#ffd100', pattern: 'hoops' } }; App.render(); };
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
  act.continue = () => { if (!W.loadLocal()) return App.toast('セーブが読めませんでした'); App.st.screen = 'game'; App.st.tab = 'home'; App.st.view = null; App.render(); };
  act.tab = d => { App.st.tab = d.tab; App.st.view = null; App.st.stack = []; App.render(); window.scrollTo(0, 0); };
  act.back = () => App.back();
  act.close = () => App.closeModal();
  act.horse = d => { App.closeAll(); App.go({ name: 'horse', id: d.id }); };
  act.htab = d => { App.st.view.htab = d.tab; App.render(); };
  act.mtab = d => { App.st.view = { name: 'market', mtab: d.tab }; App.render(); };
  act.mmore = () => { App.st.view.mlimit = (App.st.view.mlimit || 30) + 30; App.render(); };
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
      const bg = App.modal(`${UI.raceCard(r)}<div class="btns mt"><button class="btn gold" data-x="go">${replay ? '再生する' : '発走！'}</button>${replay ? '' : '<button class="btn" data-x="skip">結果だけ見る</button>'}</div>`, { noClose: true });
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
    await new Promise(res => {
      const mine = slim.rows.filter(x => x.mine);
      const msg = mine.map(x => x.pos === 1 ? (r.race.graded ? `<div class="hero"><canvas class="winner-cv" width="960" height="560" data-name="${e(x.name)}"></canvas></div>` : `<div class="panel gold center"><div class="serif" style="font-size:24px;font-weight:900;color:var(--gold2)">🏆 ${e(x.name)} 優勝！</div></div>`) : `<div class="panel center">${e(x.name)}は${x.pos}着</div>`).join('');
      const bg = App.modal(`${msg}${UI.resultTable(slim)}<div class="btns mt"><button class="btn gold" data-x="ok">次へ</button></div>`, { noClose: true });
      if (AU && mine.some(x => x.pos === 1)) { App.inRace = true; AU.playOnce('victory').then(() => { App.inRace = false; AU.bgm('home'); }); }
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
    const g1 = report.races.filter(r => r.race.grade === 'G1' && !r.hasMine);
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
      <ul class="news mt">${fresh.map(n => `<li class="${n.kind}"><span class="d">${n.y}/${n.m}-${n.w}</span>${e(n.text)}</li>`).join('')}</ul>
      <div class="btns mt"><button class="btn gold" data-act="close">閉じる</button></div>`);
  };

  // ---------- タイトルの動く絵 ----------
  App.titleCanvas = function () {
    const cv = $('#title-cv'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    const horses = [
      { coat: '鹿毛', silks: { base: '#1f4fbf', sub: '#ffd100', pattern: 'hoops' }, cap: '#fff', x: 640, lane: 0, sp: 1.0 },
      { coat: '芦毛', silks: { base: '#ffffff', sub: '#c8102e', pattern: 'cross' }, cap: '#e0312f', x: 520, lane: 1, sp: 1.03 },
      { coat: '青鹿毛', silks: { base: '#111', sub: '#ffd100', pattern: 'sash' }, cap: '#2a63d4', x: 380, lane: 2, sp: 0.98 },
      { coat: '栗毛', silks: { base: '#00843d', sub: '#fff', pattern: 'stripes' }, cap: '#f2cf1d', x: 460, lane: 3, sp: 1.01 },
    ];
    let t = 0, last = null;
    const draw = ts => {
      if (last == null) last = ts;
      const dt = Math.min(0.05, (ts - last) / 1000); last = ts; t += dt;
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
      sky.addColorStop(0, '#1b2a55'); sky.addColorStop(0.5, '#e07a3f'); sky.addColorStop(1, '#ffd38a');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,230,160,0.9)'; ctx.beginPath(); ctx.arc(w * 0.72, h * 0.42, 60, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2b2f4f'; ctx.beginPath(); ctx.moveTo(0, h * 0.55);
      for (let i = 0; i <= 12; i++) ctx.lineTo(w * i / 12, h * (0.45 + ((i * 7) % 5) / 40)); ctx.lineTo(w, h * 0.55); ctx.closePath(); ctx.fill();
      // スタンドの影
      ctx.fillStyle = '#1d2238'; ctx.fillRect(w * 0.05, h * 0.42, w * 0.3, h * 0.14);
      for (let i = 0; i < 14; i++) { ctx.fillStyle = 'rgba(255,220,150,0.5)'; ctx.fillRect(w * 0.06 + i * w * 0.021, h * 0.45, w * 0.012, h * 0.02); }
      const g = ctx.createLinearGradient(0, h * 0.55, 0, h);
      g.addColorStop(0, '#3a6d2e'); g.addColorStop(1, '#1f4419');
      ctx.fillStyle = g; ctx.fillRect(0, h * 0.55, w, h * 0.45);
      ctx.fillStyle = '#f2ead8'; ctx.fillRect(0, h * 0.58, w, 5);
      for (let i = 0; i < 30; i++) ctx.fillRect(((i * 60 - t * 300) % (w + 60) + w + 60) % (w + 60) - 30, h * 0.58, 4, 18);
      for (const ho of horses) {
        ho.x += dt * 120 * ho.sp * (1 + 0.05 * Math.sin(t * 1.3 + ho.lane));
        if (ho.x > w + 200) ho.x = -200;
        const y = h * 0.72 + ho.lane * 34;
        A.horse(ctx, ho.x, y, 1.45 + ho.lane * 0.08, (t * 1.9 + ho.lane * 0.23) % 1, { coat: ho.coat, marks: A.marks(ho.coat), silks: ho.silks, cap: ho.cap });
      }
      titleAnim = requestAnimationFrame(draw);
    };
    titleAnim = requestAnimationFrame(draw);
  };

  // 起動
  window.addEventListener('DOMContentLoaded', () => {
    App.applyTheme();
    if (HS.Edits) HS.Edits.apply(HS.Edits.loadLocal());
    W.index();
    App.render();
  });
})();
