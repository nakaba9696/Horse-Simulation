// 馬主の画面：ホームの「騎乗依頼」の札・馬主の一覧と詳しい画面・ご褒美の場面・パドックとレースの後のひと言・顔の絵（SVG）
// 仕組みは js/core/owners.js。騎乗中には文字を出さない（パドックの前と、レースの結果のあとだけ）
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse, W = HS.World, R = HS.Races, UI = HS.UI, App = HS.App, J = HS.Jockey, O = HS.Owners, A = HS.Art;
  if (!O || !UI || !App) return;
  const S = UI.screens;
  const e = U.esc;

  // ---------- 顔の絵（画像ファイルは使わず SVG で描く。髪型・髪の色・目・服を馬主ごとに） ----------
  // mood：normal・smile・happy・sad
  // 持ち主が作った絵（assets/owners_<id>.js。HS.ASSETS.owner_<id>_<base|smile|joy|sad>）。札では顔を丸い枠に切り抜き、opts.big で胸から上
  const PMOOD = { normal: 'base', smile: 'smile', happy: 'joy', sad: 'sad' };
  UI.ownerPortrait = function (o, mood) {
    const A0 = HS.ASSETS || {};
    return A0[`owner_${o.id}_${PMOOD[mood] || 'base'}`] || A0[`owner_${o.id}_base`] || null;
  };
  UI.ownerFace = function (o, mood, size, opts) {
    opts = opts || {};
    const src = o.portrait && UI.ownerPortrait(o, mood || 'normal');
    if (!src) return UI.ownerFaceSvg(o, mood, size);
    const sz = size || 64;
    if (opts.big) {
      const w = Math.round(sz * 1.2), h = Math.round(w * 1.25);
      return `<span class="oface oport big" style="width:${w}px;height:${h}px" role="img" aria-label="${e(o.name)}"><img src="${src}" alt="" draggable="false"></span>`;
    }
    const p = o.portrait, iw = sz / (p.w / 100), ih = iw * 1.25;
    const left = sz / 2 - p.x / 100 * iw, top = sz / 2 - p.y / 100 * ih;
    return `<span class="oface oport" style="width:${sz}px;height:${sz}px" role="img" aria-label="${e(o.name)}"><img src="${src}" alt="" draggable="false" style="width:${iw.toFixed(1)}px;height:${ih.toFixed(1)}px;left:${left.toFixed(1)}px;top:${top.toFixed(1)}px"></span>`;
  };
  // 絵が読めないときの顔（SVG。js/ui/ownerface.js）
  UI.ownerFaceSvg = (o, mood, size) => HS.OwnerFace.svg(o, mood, size);
  const shade = HS.OwnerFace.shade;
  UI.shade = shade;

  // ---------- 小物 ----------
  const MOOD = { win: 'happy', bigwin: 'happy', good: 'smile', lose: 'sad', decline: 'sad' };
  const tierChip = oid => { const st = O.of(oid); return `<span class="own-tier t${Math.min(4, st.stage)}">${e(O.stageLabel(oid))}</span>`; };
  // 看板の特徴の札（短距離好きなど）と、補いの好み
  //   地は勝負服の2色のうち暗いほうをさらに暗く（白い字が読める）、縁は明るいほう
  const lum = hex => { const n = parseInt(String(hex).slice(1), 16) || 0; return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
  const signChip = o => {
    const s = O.signLabel(o); if (!s) return '';
    const [a, b] = lum(o.silks.base) <= lum(o.silks.sub) ? [o.silks.base, o.silks.sub] : [o.silks.sub, o.silks.base];
    return `<span class="own-sign" style="--sb:${shade(a, -0.3)};--sl:${b}">${e(s)}</span>`;
  };
  const subLine = o => { const l = O.subLabels(o); return l.length ? `<span class="own-sub">ほかに ${l.map(e).join('・')}</span>` : ''; };
  // まだ縁の無い馬主の顔（伏せて「？」）
  const qFace = size => `<span class="oface own-q" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.5)}px" role="img" aria-label="まだ会っていない馬主">？</span>`;
  // 次の段階までの帯（数は出さず、帯の長さで見せる）
  const gauge = oid => {
    const st = O.of(oid), cur = O.floor(st), nx = O.STAGES[st.stage + 1];
    const lo = O.done(oid) ? 0 : cur, hi = O.done(oid) ? O.MAX : nx ? nx.floor : O.MAX;
    const pct = U.clamp((st.pts - lo) / Math.max(1, hi - lo), 0, 1) * 100;
    const m = O.mission(oid);
    const to = O.done(oid) ? 'いちばんの間柄（依頼はすべてやり終えた）' : m ? `課題：${m.text}` : '';
    return `<div class="own-gauge"><i style="width:${pct.toFixed(1)}%"></i></div><div class="own-next small muted">${e(to)}</div>`;
  };
  const nextReward = oid => { const o = O.by(oid), st = O.of(oid); return O.done(oid) ? `${o.item.name}（受け取った）` : st.stage < O.WEAR_STAGE ? `お礼・${O.WEAR_STAGE - st.stage}つ先で勝負服・最後に${o.item.name}` : `お礼・最後に${o.item.name}（${o.item.text}）`; };
  const silksCv = oid => `<canvas class="own-silks" width="40" height="40" data-osilks="${e(oid)}"></canvas>`;
  const hydrate0 = App.hydrate;
  App.hydrate = function (root) {
    hydrate0(root);
    if (A) root.querySelectorAll('canvas[data-osilks]').forEach(cv => { const o = O.by(cv.dataset.osilks); if (o) A.silksIcon(cv, o.silks); });
  };
  // 勝負服：馬主の馬はその馬主の服、主戦になった馬主の服を着せた自分の馬はその服
  const RV = HS.RaceView;
  if (RV) { const silks0 = RV.silksOf; RV.silksOf = h => (h && !h._silks && O.silksOf(h)) || silks0(h); }

  // ---------- ホーム：騎乗依頼の札 ----------
  const raceLine = (race, x) => `${UI.gradeTag(race)} <b>${e(R.label(race))}</b> <span class="small">${e(race.course)} ${UI.surf(race.surface)} ${race.dist}m</span>`;
  UI.ownerOfferCard = function (o) {
    const card = W.cardOf(o.raceKey); if (!card) return '';
    const x = card.runners.find(r => r.horse.id === o.horseId); if (!x) return '';
    const ow = O.by(o.oid), h = x.horse, race = card.race;
    const acc = O.accepted(o.raceKey);
    const clash = O.clash(o);
    const line = O.line(o.oid, 'offer', o.line, { horse: h.name, race: R.label(race) }, { race, horse: h });
    const fee = Math.round(O.FEE[O.classOf(race)] * U.priceIndex(W.get().year) / 10) * 10;
    const wIdx = W.prepareWeek().wIdx;
    return `<div class="own-offer ${acc ? 'on' : ''}" style="--oc:${ow.silks.base};--oc2:${ow.silks.sub}">
      <button class="own-face" data-act="owner" data-id="${e(ow.id)}" aria-label="${e(ow.name)}">${UI.ownerFace(ow, acc ? 'smile' : 'normal', 72)}</button>
      <div class="grow">
        <div class="own-who"><b>${e(ow.name)}</b>${signChip(ow)}${tierChip(ow.id)}<span class="small muted">${e(ow.title)}</span>${o.best ? '<span class="chip hist">いちばんの馬</span>' : ''}</div>
        <div class="own-say">「${e(line)}」</div>
        <div class="own-race">${raceLine(race, x)}</div>
        <div class="row"><span class="nm">${e(h.name)}</span>${UI.histMark ? UI.histMark(h) : ''}<span class="small muted">${h.gelding ? 'セ' : h.sex}${W.get().year - h.born}・${e(h.style)}・${x.pop ? `${x.pop}番人気（${x.odds}倍）` : ''}・騎乗料 ${U.money(fee)}</span></div>
        ${UI.numStats ? UI.numStats(h, wIdx, { surface: race.surface }) : ''}
        ${clash ? `<div class="own-clash">同じレースに自分の馬「${e(clash.name)}」が出る。受けると「${e(clash.name)}」には別の騎手が乗る。</div>` : ''}
        <div class="btns">${acc ? `<span class="chip mine">受けた</span><button class="btn sm" data-act="own-cancel" data-race="${e(o.raceKey)}">取り消す</button>`
          : `<button class="btn sm gold" data-act="own-accept" data-race="${e(o.raceKey)}" data-horse="${e(h.id)}">${clash ? '依頼の馬に乗る' : '受ける'}</button><button class="btn sm" data-act="own-decline" data-race="${e(o.raceKey)}">断る</button>`}
          ${W.horse(h.id) ? `<button class="btn sm" data-act="horse" data-id="${e(h.id)}">馬を見る</button>` : ''}</div>
      </div></div>`;
  };
  UI.ownerOffersSection = function () {
    const offers = O.offers();
    const G = W.get();
    const none = !O.knownList().length;
    return `<h2 class="sec">騎乗依頼<span class="r">${offers.length}件・<a href="#" data-act="owners">馬主の一覧 ▶</a></span></h2>
      ${offers.length ? `<div class="list own-offers">${offers.map(UI.ownerOfferCard).join('')}</div>`
        : none ? '<div class="panel empty">まだ騎乗依頼をくれる馬主はいない。自分の馬で結果を出すと、馬主から声がかかる（条件は馬主の一覧）。</div>'
        : `<div class="panel empty">今週の騎乗依頼はありません。${G.month}月${G.week}週</div>`}`;
  };
  const home0 = S.home;
  S.home = function (st) {
    const html = home0(st);
    if (!O.on() || W.get().gameOver) return html;
    const mark = '<h2 class="sec">今週の騎乗';
    const sec = UI.ownerOffersSection();
    return html.includes(mark) ? html.replace(mark, sec + mark) : html + sec;
  };

  // ---------- 馬主の一覧 ----------
  S.owners = function () {
    const rows = O.list().map(o => {
      const st = O.of(o.id), best = O.horsesOf(o.id).slice(0, 3);
      // まだ縁の無い馬主：顔と名前を伏せ、看板の特徴と、条件のヒントだけ
      if (!st.known) return `<div class="own-card locked" style="--oc:#3a4a42;--oc2:#7d8f84">
        <div class="own-face">${qFace(84)}</div>
        <div class="grow">
          <div class="own-who"><b>まだ会っていない馬主</b>${signChip(o)}</div>
          <div class="own-hint">${e(O.hint(o.id))}</div>
          <div class="small muted">その人の好きなジャンルのレースで勝ちを重ねると声がかかり、次の週から騎乗依頼が来る。</div>
        </div></div>`;
      return `<div class="own-card" data-act="owner" data-id="${e(o.id)}" style="--oc:${o.silks.base};--oc2:${o.silks.sub}">
        <div class="own-face">${UI.ownerFace(o, st.stage >= 2 ? 'smile' : 'normal', 84)}</div>
        <div class="grow">
          <div class="own-who"><b>${e(o.name)}</b>${signChip(o)}${tierChip(o.id)}${silksCv(o.id)}</div>
          <div class="small muted">${e(o.title)}・${o.age}歳 ${subLine(o)}</div>
          ${gauge(o.id)}
          <div class="small">ご褒美：${e(nextReward(o.id))}</div>
          <div class="small muted">一緒に ${st.rides}戦${st.wins}勝${best.length ? `・持ち馬 ${best.map(h => e(h.name)).join('・')}ほか` : ''}</div>
        </div></div>`;
    }).join('');
    return `<h2 class="sec">馬主<span class="r">縁のある馬主 ${O.knownList().length}/${O.list().length}人</span></h2>
      <div class="small muted">騎乗依頼をくれる馬主たち。好きなジャンルのレースで勝つと好感度が上がり、たまると声がかかる。依頼は OP → G3 → G2 → G1 → お手馬の段階ごとに課題があり、やり終えると次の段階へ（大きなレースで強い馬の依頼が来る）。最後までやり終えると、繁殖の永続のボーナスのアイテムがもらえる。</div>
      <div class="own-grid mt">${rows}</div>`;
  };
  // ---------- 馬主の詳しい画面 ----------
  S.owner = function (v) {
    const o = O.by(v.id); if (!o) return '<div class="panel empty">馬主が見つからない</div>';
    const G = W.get(), st = O.of(o.id), s = O.state();
    if (!st.known) return `<div class="panel empty">まだ会っていない馬主。${e(O.hint(o.id))}</div>`;
    const ladder = O.STAGES.map((t, i) => {
      const m = o.missions[i];
      const on = st.stage > i, cur = st.stage === i;
      const extra = i + 1 === O.WEAR_STAGE ? '・勝負服' : i === 4 ? `・${o.item.name}` : '';
      return `<li class="${on ? 'on' : ''} ${cur ? 'cur' : ''}"><b>${e(t.label)}</b><span>${e(m.text)}${cur && m.need.count > 1 ? `（${st.prog}/${m.need.count}）` : ''}</span><em class="${on ? 'got' : ''}">${on ? '✓ ' : cur ? '▶ ' : ''}お礼 ${U.money(O.yen(t.money))}${e(extra)}</em></li>`;
    }).join('');
    const pending = st.got.bond && st.got.bond.pending;
    const mine = W.mine().filter(h => h.loc === 'stable' || h.loc === 'farm');
    const wear = O.canWear(o.id) && mine.length ? `<h2 class="sec">勝負服を着せる<span class="r">${silksCv(o.id)}</span></h2>
      <div class="panel"><table class="t">${mine.map(h => { const on = s.wear[h.id] === o.id; return `<tr><td><b>${e(h.name)}</b></td><td class="small muted">${on ? `${e(o.name)}さんの勝負服` : s.wear[h.id] ? `${e(O.by(s.wear[h.id]).name)}さんの勝負服` : '自分の勝負服'}</td><td><button class="btn sm ${on ? '' : 'gold'}" data-act="own-wear" data-horse="${e(h.id)}" data-oid="${on ? '' : e(o.id)}">${on ? '自分の服に戻す' : '着せる'}</button></td></tr>`; }).join('')}</table></div>` : '';
    const horses = O.horsesOf(o.id).slice(0, 8);
    const log = s.log.filter(x => x.oid === o.id).slice(0, 12);
    const T = HS.Season;
    return `<div class="own-hero" style="--oc:${o.silks.base};--oc2:${o.silks.sub}">
        <div class="own-face big">${UI.ownerFace(o, st.stage >= 2 ? 'happy' : 'smile', 180, { big: true })}</div>
        <div class="grow">
          <div class="small muted">${e(o.kana)}・${o.age}歳</div>
          <div class="own-name">${e(o.name)} ${signChip(o)} ${tierChip(o.id)}</div>
          <div class="own-title">${e(o.title)}</div>
          <div class="small">${subLine(o)}${o.unlock && o.unlock.text ? `<span class="small muted">　出会いの条件：${e(o.unlock.text)}</span>` : ''}</div>
          <div class="small">${e(o.note)}</div>
          <div class="own-say mt">「${e(O.fill_(o.intro))}」</div>
          ${gauge(o.id)}
        </div></div>
      ${pending ? `<div class="panel gold mt center">🎁 思い出の名馬 <b>${e(o.memory)}</b> を受け取れる（前の版の約束。お手馬に空きが要る）。<div class="btns mt" style="justify-content:center"><button class="btn gold" data-act="own-claim" data-id="${e(o.id)}">受け取る</button></div></div>` : ''}
      ${O.done(o.id) ? `<div class="panel gold mt center">🎁 ${e(o.item.name)}：${e(o.item.text)}（オリジナルホースが生まれるたびに効く）</div>` : ''}
      ${O.canAsk(o.id) ? `<div class="panel mt"><b>来月の馬の店</b>　${e(o.name)}さんに頼むと、好みの馬（${e(O.signLabel(o))}）が並びやすくなる。${s.ask && s.ask.oid === o.id ? `<span class="chip mine">${s.ask.m}月の店に頼んだ</span>` : `<button class="btn sm gold" data-act="own-ask" data-id="${e(o.id)}">頼む</button>`}</div>` : ''}
      <h2 class="sec">段階と課題<span class="r">一緒に ${st.rides}戦${st.wins}勝・G1 ${st.big}勝</span></h2>
      <ol class="own-ladder">${ladder}</ol>
      ${wear}
      <h2 class="sec">${e(o.name)}さんの馬<span class="r">${O.horsesOf(o.id).length}頭</span></h2>
      ${horses.length ? `<div class="panel"><table class="t">${horses.map(h => { const p = T ? T.fhPeak(h) : { turf: '-', dirt: '-' }; return `<tr data-act="horse" data-id="${e(h.id)}"><td><b>${e(h.name)}</b>${UI.histMark ? UI.histMark(h) : ''}</td><td class="small">${h.sex}${G.year - h.born}・${e(h.style)}</td><td class="small">芝 <b>${p.turf}</b>・ダ <b>${p.dirt}</b></td><td class="small muted">${h.starts || 0}戦${h.wins || 0}勝</td></tr>`; }).join('')}</table></div>` : '<div class="panel empty">いま走っている馬はいない。</div>'}
      <h2 class="sec">依頼の記録</h2>
      ${log.length ? `<div class="panel"><table class="t">${log.map(x => `<tr><td class="small muted">${e(W.yLabel(x.y))}${x.m}月${x.w}週</td><td>${e(x.race)}</td><td>${e(x.horse)}</td><td class="num ${x.pos && x.pos <= 3 ? 'pos' + x.pos : ''}">${x.pos ? x.pos + '着' : '断った'}</td></tr>`).join('')}</table></div>` : '<div class="panel empty">まだ依頼を受けていない。</div>'}`;
  };

  // ---------- 操作 ----------
  const act = App.act;
  act.owners = () => { App.closeAll(); App.go({ name: 'owners' }); };
  act.owner = d => { App.closeAll(); App.go({ name: 'owner', id: d.id }); };
  act['own-accept'] = d => { const err = O.accept(d.race, d.horse); if (err) return App.toast(err); if (HS.Audio) HS.Audio.se && HS.Audio.se('coin'); App.save(); App.render(); };
  act['own-cancel'] = d => { O.unaccept(d.race); App.save(); App.render(); };
  act['own-decline'] = d => {
    const o = O.offerOf(d.race); if (!o) return;
    const ow = O.by(o.oid), race = W.raceByKey(d.race);
    const err = O.decline(d.race); if (err) return App.toast(err);
    const c = W.cardOf(d.race), x = c && c.runners.find(r => r.horse.id === o.horseId);
    App.toast(`${ow.name}「${O.line(o.oid, 'decline', o.line, { horse: o.horse, race: race ? R.label(race) : '' }, { race, horse: x && x.horse })}」`);
    App.save(); App.render();
  };
  act['own-wear'] = d => { const err = O.wear(d.horse, d.oid || null); if (err) return App.toast(err); App.save(); App.render(); };
  act['own-claim'] = async d => { const err = O.claim(d.id); if (err) return App.toast(err); App.save(); App.render(); };
  act['own-ask'] = d => { const err = O.ask(d.id); if (err) return App.toast(err); const o = O.by(d.id); App.toast(`${o.name}「${O.fill_((o.scenes.ask || [''])[0])}」`); App.save(); App.render(); };

  // ---------- ご褒美の場面 ----------
  const KICK = { meet: '新しい馬主から声がかかった', m1: '「OP」の依頼をやり終えた', m2: '「G3」の依頼をやり終えた', m3: '「G2」の依頼をやり終えた', m4: '「G1」の依頼をやり終えた', m5: 'すべての依頼をやり終えた', award: '名コンビ賞' };
  UI.ownerScene = function (q) {
    return new Promise(res => {
      const o = O.by(q.oid); if (!o) return res();
      const lines = O.sceneLines(q.oid, q.kind, { horse: q.horse || '', race: q.race || '' });
      const meet = q.kind === 'meet';
      if (HS.Audio && HS.Audio.se) HS.Audio.se('coin');
      const bg = App.modal(`<div class="own-scene" style="--oc:${o.silks.base};--oc2:${o.silks.sub}">
          <div class="own-scene-face">${UI.ownerFace(o, meet ? 'smile' : 'happy', 220, { big: true })}</div>
          <div class="own-scene-body">
            <div class="own-kicker">${e(KICK[q.kind] || '')}</div>
            <div class="own-name">${e(o.name)}<small>${e(o.title)}</small> ${signChip(o)}</div>
            <div class="own-talk">${lines.map((t, i) => `<p style="--d:${i}">「${e(t)}」</p>`).join('')}</div>
            ${q.reward ? `<div class="own-reward" style="--d:${lines.length}">🎁 ${e(q.reward)}</div>` : ''}
            ${meet ? `<div class="own-reward" style="--d:${lines.length}">次の週から騎乗依頼が来る</div><div class="own-meet-note">${e(O.signLabel(o))}の馬主。${e(o.note)}</div>` : ''}
            ${(() => { const k = meet ? 0 : /^m[1-4]$/.test(q.kind) ? +q.kind[1] : -1; const m = k >= 0 && o.missions && o.missions[k]; return m ? `<div class="own-meet-note" style="--d:${lines.length + 1}">「${e(O.fill_(m.say))}」<br>次の依頼（${e(O.STAGES[k].label)}）：<b>${e(m.text)}</b></div>` : ''; })()}
            <div class="btns mt"><button class="btn gold" data-x="ok">${meet ? 'よろしくお願いします' : 'ありがとうございます'}</button></div>
          </div></div>`, { noClose: true, scene: 'home' });
      bg.querySelector('[data-x=ok]').onclick = () => { App.closeModal(); res(); };
    });
  };
  // たまった場面を順に見せる
  UI.ownersScenes = async function () {
    if (!O.on()) return;
    const s = O.state();
    while (s.queue.length) { const q = s.queue.shift(); await UI.ownerScene(q); }
    App.save();
  };
  // レースのあと：依頼で乗った馬の馬主のひと言（まとめて1枚）→ ご褒美の場面
  UI.ownersAfterWeek = async function () {
    if (!O.on()) return;
    const s = O.state();
    const rs = (s.react || []).slice();
    if (rs.length) {
      await new Promise(res => {
        const rows = rs.map(x => {
          const o = O.by(x.oid); if (!o) return '';
          const o0 = O.by(x.oid), st0 = O.of(x.oid);
          const set = ((o0.lines[x.kind] || {})[st0.stage >= 2 ? 'close' : 'near']) || [];
          const line = O.fill_(O.pickLine(set, x.line, new Set(x.tags || [])), { horse: x.horse, race: x.race });
          return `<div class="own-react" style="--oc:${o.silks.base}">${UI.ownerFace(o, MOOD[x.kind] || 'normal', 64)}
            <div class="grow"><div class="own-who"><b>${e(o.name)}</b>${tierChip(o.id)}<span class="small muted">${e(x.race)}・${e(x.horse)}・${x.pos}着</span></div>
            <div class="own-say">「${e(line)}」</div>${gauge(o.id)}<div class="small muted">騎乗料 ${U.money(x.fee)}</div></div></div>`;
        }).join('');
        const bg = App.modal(`<h3>馬主のひと言</h3>${rows}<div class="btns mt"><button class="btn gold" data-x="ok">次へ</button></div>`, { noClose: true });
        bg.querySelector('[data-x=ok]').onclick = () => { App.closeModal(); res(); };
      });
      s.react = [];
    }
    await UI.ownersScenes();
  };
  // パドック：依頼の馬なら、馬主のひと言
  UI.paddockOwner = function (card, runner) {
    if (!O.on() || !O.accepted(card.race.key)) return '';
    const a = O.state().week.acc[card.race.key];
    if (!a || a.horseId !== runner.horse.id) return '';
    const o = O.by(a.oid); if (!o) return '';
    const line = O.line(o.id, 'paddock', U.hash(card.race.key + runner.horse.name), { horse: runner.horse.name, race: R.label(card.race) }, { race: card.race, horse: runner.horse });
    return `<div class="panel mt own-paddock" style="--oc:${o.silks.base}">${UI.ownerFace(o, 'smile', 56)}<div class="grow"><div class="own-who"><b>${e(o.name)}</b>${tierChip(o.id)}<span class="small muted">馬主</span></div><div class="own-say">「${e(line)}」</div></div></div>`;
  };
})();
