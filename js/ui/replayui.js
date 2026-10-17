// リプレイの画面：結果の画面の「リプレイを保存」、データの「リプレイ」の一覧、3D の中継（js/ui/watch3d.js）での再生
// タイトルからも開ける（App.pages.replays）。保存の仕組みは js/core/replay.js
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, W = HS.World, UI = HS.UI, App = HS.App, RP = HS.Replay;
  const S = UI.screens;
  const e = U.esc;

  // ---------- 結果の表の下に「リプレイを保存」 ----------
  UI.replaySaveBtn = function (key) {
    if (!key || !RP.find(key)) return '';
    const done = RP.saved[key];
    return `<div class="btns rp-save"><button class="btn sm" data-act="replay-save" data-key="${e(key)}" ${done ? 'disabled' : ''}>${done ? '✓ リプレイを保存した' : '🎞 リプレイを保存'}</button></div>`;
  };
  const resultTable1 = UI.resultTable;
  UI.resultTable = r => resultTable1(r) + UI.replaySaveBtn(r && r.key);
  App.act['replay-save'] = (d) => {
    const f = RP.find(d.key);
    if (!f || RP.saved[d.key]) return;
    const res = RP.save(RP.make(f.r, f.o));
    if (res.err) return App.toast(res.err);
    RP.saved[d.key] = res.id;
    document.querySelectorAll(`[data-act="replay-save"][data-key="${CSS.escape(d.key)}"]`).forEach(b => { b.disabled = true; b.textContent = '✓ リプレイを保存した'; });
    App.toast('リプレイを保存した（データ → リプレイ）');
  };

  // ---------- 一覧 ----------
  UI.replayList = function (st) {
    const all = RP.list();
    const only = st.rpf || '';
    const list = all.filter(m => !only || (only === 'fav' ? m.fav : only === 'rode' ? m.rode : m.free));
    const nFav = all.filter(m => m.fav).length, nUsual = all.length - nFav;
    const kb = Math.round(all.reduce((s, m) => s + (m.size || 0), 0) / 1024);
    const f = (k, l) => `<button class="btn sm ${only === k ? 'gold' : ''}" data-act="replay-filter" data-f="${k}">${l}</button>`;
    return `<div class="small muted">保存したレースを3Dの中継で見直せる。お気に入り（★）でないものは${RP.MAX}本まで、古いものから消える。お気に入りは${RP.MAX_FAV}本まで。いま ${nUsual} / ${RP.MAX}・★ ${nFav} / ${RP.MAX_FAV}・${kb}KB</div>
      <div class="btns mt">${f('', 'すべて')}${f('rode', '自分が乗った')}${f('fav', '★お気に入り')}${f('free', 'フリーレース')}</div>
      ${list.length ? `<div class="tblwrap mt"><table class="t rp-t"><tr><th></th><th>レース</th><th>年</th><th>自分の馬</th><th>着順</th><th></th></tr>
      ${list.map(m => `<tr class="${m.rode ? 'lead-me' : ''}">
        <td><button class="rp-fav ${m.fav ? 'on' : ''}" data-act="replay-fav" data-id="${e(m.id)}" aria-label="お気に入り" title="お気に入り">${m.fav ? '★' : '☆'}</button></td>
        <td>${UI.gradeTag({ grade: m.grade, region: m.region, year: m.year })} <b>${e(m.title)}</b><div class="small muted">${e(m.course)} ${m.surface === 'ダ' ? 'ダート' : '芝'}${m.dist}m・${m.n}頭${m.free ? '・フリーレース' : ''}</div></td>
        <td class="small">${e(m.yearLabel || '')}</td>
        <td>${m.horse ? (m.rode ? '<b>' + e(m.horse) + '</b>' : e(m.horse)) : '<span class="muted">見ただけ</span>'}</td>
        <td class="num ${m.pos && m.pos <= 3 ? 'pos' + m.pos : ''}">${m.pos ? `${m.pos}着` : '－'}</td>
        <td class="rp-btns"><button class="btn sm gold" data-act="replay-play" data-id="${e(m.id)}">▶ 再生</button><button class="btn sm" data-act="replay-del" data-id="${e(m.id)}" aria-label="消す">消す</button></td></tr>`).join('')}</table></div>`
      : `<div class="panel empty mt">${all.length ? 'この条件のリプレイはありません。' : 'まだリプレイはありません。レースの結果の画面で「リプレイを保存」を押すと、ここに並びます。'}</div>`}`;
  };
  const view = () => App.st.screen === 'replays' ? (App.st.rpView = App.st.rpView || {}) : (App.st.view || {});
  App.act['replay-filter'] = d => { view().rpf = d.f; App.render(); };
  App.act['replay-fav'] = d => { const err = RP.toggleFav(d.id); if (err) App.toast(err); App.render(); };
  App.act['replay-del'] = async d => {
    const m = RP.list().find(x => x.id === d.id); if (!m) return;
    if (!(await App.confirm(`${e(m.title)}のリプレイを消しますか？${m.fav ? '（お気に入り）' : ''}`, '消す'))) return;
    RP.remove(d.id); for (const k of Object.keys(RP.saved)) if (RP.saved[k] === d.id) delete RP.saved[k];
    App.render();
  };
  // 再生：3D の中継（視点・速さ・10秒送り・ゴールまで飛ばす）→ 結果の表
  App.act['replay-play'] = async d => {
    const rp = RP.get(d.id);
    if (!rp) return App.toast('リプレイが読めませんでした');
    await UI.playReplayData(RP.expand(rp));
    const bg = App.modal(`${UI.resultTable(RP.slim(rp))}<div class="btns mt"><button class="btn gold" data-act="close">閉じる</button></div>`, { scene: 'result' });
    void bg;
  };
  UI.playReplayData = async function (data, opts) {
    const AU = HS.Audio;
    App.inRace = true;
    const bg = App.modal('<div class="rv-holder"></div>', { wide: true, noClose: true });
    if (AU) { AU.bgm('race', data && data.race); AU.raceStart(); }
    try {
      await (HS.Watch3D ? HS.Watch3D.play : HS.RaceView.play)(bg.querySelector('.rv-holder'), data, Object.assign({
        speed: 1, speeds: [0.5, 1, 2, 4], seek: true,
        onStart: () => AU && AU.se('gate'),
        onTick: (remain, straight, running, finished) => AU && AU.raceUpdate(remain, straight, running, finished),
      }, opts || {}));
    } finally {
      if (AU) { AU.raceEnd(); AU.stopBgm(); }
      App.closeModal();
      App.inRace = false;
      if (AU) AU.bgm(App.st.screen === 'game' ? 'home' : 'title');
    }
  };

  // ---------- 画面：データのタブと、タイトルから開く一覧 ----------
  S.replays = st => UI.replayList(st);
  App.pages = App.pages || {};
  App.pages.replays = function (app) {
    App.setScene('home');
    app.innerHTML = `<main class="page-solo"><div class="row"><h2 class="sec grow">リプレイ</h2><button class="btn" data-act="replays-back">もどる</button></div>${UI.replayList(App.st.rpView || {})}</main>`;
    App.hydrate(app);
  };
  App.act.replays = () => { App.st.rpFrom = App.st.screen; App.st.screen = 'replays'; App.st.rpView = {}; App.navAnim = 'push'; App.render(); };
  App.act['replays-back'] = () => { App.st.screen = App.st.rpFrom === 'game' ? 'game' : 'title'; App.navAnim = 'back'; App.render(); };

  // タイトルのメニューに「フリーレース」「リプレイ」を足す（エディットの前）
  const title0 = S.title;
  S.title = function (open) {
    const h = title0(open);
    const at = '<button class="btn" data-act="editor">';
    return open && h.includes(at) ? h.replace(at, `${HS.FreeRace ? '<button class="btn" data-act="free">フリーレース</button>' : ''}<button class="btn" data-act="replays">リプレイ</button>${at}`) : h;
  };
  // ゲームの中のメニューにも
  const menu0 = S.menu;
  S.menu = function (st) {
    const h = menu0(st), at = '<h2 class="sec">メニュー</h2>';
    const add = `<div class="panel"><b>レースだけ遊ぶ・見直す</b><div class="small muted">フリーレースはセーブに何も残らない（賞金・成績・レコード・疲れが付かない）。</div>
      <div class="btns mt">${HS.FreeRace ? '<button class="btn gold" data-act="free">フリーレース</button>' : ''}<button class="btn" data-act="replays">リプレイ</button></div></div>`;
    return h.includes(at) ? h.replace(at, at + add) : add + h;
  };
})();
