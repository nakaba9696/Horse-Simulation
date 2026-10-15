// 騎手のゲームの画面：ホーム・騎乗依頼・成績とリーディング・週の流れ（パドック → 騎乗 → 結果）
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse, W = HS.World, R = HS.Races, UI = HS.UI, App = HS.App, J = HS.Jockey, A = HS.Art;
  const S = UI.screens;
  const e = U.esc;
  const isJ = () => J.isMode();

  // ---------- 能力の数値（ゲームの中でも数で見せる） ----------
  UI.numStats = function (h, wIdx, opts) {
    opts = opts || {};
    const c = H.cur(h, wIdx);
    const keys = opts.surface === 'ダ' ? ['dspd', 'dsta'] : opts.surface === '芝' ? ['spd', 'sta'] : ['spd', 'sta', 'dspd', 'dsta'];
    const items = keys.concat(['guts', 'mind', 'slope']).map(k => [H.STAT_SHORT[k], Math.round(c[k])]);
    items.push(['道悪', Math.round(h.apt.heavy != null ? h.apt.heavy : 50)], ['健康', Math.round(h.health != null ? h.health : 70)], ['切れ', h.kire || 4]);
    return `<div class="nums">${items.map(([l, v]) => `<span>${l} <b>${v}</b></span>`).join('')}</div>`;
  };
  UI.recentRuns = h => (h.results || []).slice(-3).reverse().map(r => `${r.race}${r.pos}着`).join('・') || '初出走';

  // ---------- 見出しと下の並び ----------
  const header0 = UI.header, nav0 = UI.nav;
  UI.header = function () {
    if (!isJ()) return header0();
    const G = W.get(), j = J.me();
    const yr = j.years[G.year] || { rides: 0, wins: 0 };
    const n = J.myRides().length;
    return `<div class="hdr">
      <div class="cal"><div class="y">${G.year}年</div><div class="mw">${G.month}<small>月</small>${G.week}<small>週</small></div></div>
      <div class="hinfo"><div class="farm">${e(j.region)}・${e(j.name)}騎手・${G.year}年 ${yr.wins}勝 / ${yr.rides}戦</div><div class="money ${G.player.money < 0 ? 'neg' : ''}">${U.money(G.player.money)}</div></div>
      <button class="btn-next" data-act="next">${n ? 'レースへ' : '次の週へ'}<small>▶ ${n ? `${n}鞍に騎乗` : (G.week === 4 ? (G.month === 12 ? '新年' : (G.month + 1) + '月') : G.month + '月' + (G.week + 1) + '週')}</small></button>
    </div>`;
  };
  UI.nav = function (tab) {
    if (!isJ()) return nav0(tab);
    const items = [['home', '🏠', 'ホーム'], ['stable', '🐎', '厩舎'], ['market', '💰', '市場'], ['races', '🏆', 'レース'], ['jrecord', '🏇', '成績'], ['records', '📜', '記録'], ['menu', '⚙', 'メニュー']];
    return `<nav class="nav"><div class="in">${items.map(([k, ic, lb]) => `<button data-act="tab" data-tab="${k}" class="${tab === k ? 'on' : ''}"><span class="ic">${ic}</span>${lb}</button>`).join('')}</div></nav>`;
  };

  // ---------- ホーム ----------
  const home0 = S.home;
  S.home = function (st) {
    if (!isJ()) return home0(st);
    const G = W.get(), j = J.me();
    const yr = j.years[G.year] || { rides: 0, wins: 0, w2: 0, w3: 0, prize: 0 };
    const rank = J.myRank(G.year);
    const rides = J.myRides();
    const up = W.upcomingGraded(12).filter(r => r.grade === 'G1' && r.inWeeks > 0 && r.region !== '海外').slice(0, 5);
    const allowance = J.allowance({ graded: false, region: 'JRA' });
    return `
      <div class="panel gold mt jcard">
        <div><div class="big">${e(j.name)}</div><div class="small muted">${e(j.region)}所属・${j.debut}年デビュー${allowance ? `・見習い ${J.allowanceMark(allowance)}${allowance}kg 減` : ''}</div></div>
        <div class="right"><div class="small muted">評判</div><b>${J.repLabel(j.rep)}</b></div>
        <div style="grid-column:1/-1"><div class="repbar"><i style="width:${Math.round(j.rep)}%"></i></div></div>
        <div class="small">今年 <b>${yr.rides}戦${yr.wins}勝</b>（2着${yr.w2}・3着${yr.w3}）${rank ? `・リーディング <b>${rank}位</b>` : ''}</div>
        <div class="small right">通算 ${j.total.rides}戦${j.total.wins}勝・騎乗技術 <b>${Math.round(j.skill)}</b></div>
      </div>
      ${!W.mine().length ? `<div class="panel gold mt">📌 <a href="#" data-act="tab" data-tab="market">市場でデビュー前の史実馬を買おう</a>（2歳の4月から自動で入厩し、レースに出られる）</div>` : ''}
      <h2 class="sec">今週の騎乗<span class="r">${G.month}月${G.week}週</span></h2>
      ${rides.length ? `<div class="list">${rides.map(({ card, runner }) => rideCard(card, runner, true)).join('')}</div>`
        : `<div class="panel empty">今週は乗るレースがありません。${W.mine('stable').length ? '<br><a href="#" data-act="tab" data-tab="stable">厩舎で出るレースを決める（おまかせなら自動で選ぶ）</a>' : ''}</div>`}
      <h2 class="sec">持ち馬<span class="r">${W.mine().length}頭</span></h2>
      ${W.mine().length ? `<div class="list">${W.mine().map(h => `<div class="card" data-act="horse" data-id="${h.id}">${UI.thumb(h)}<div class="grow"><div class="row"><span class="nm">${e(h.name)}</span>${UI.histMark(h)}${h.auto ? '<span class="chip">おまかせ</span>' : ''}</div><div class="sub">${UI.age(h)}・${h.loc === 'stable' ? '入厩中' : '牧場'}・${h.starts || 0}戦${h.wins || 0}勝・${U.money(h.prize || 0)}</div>${UI.numStats(h, W.wIdx())}</div></div>`).join('')}</div>` : '<div class="panel empty">まだ持ち馬がいません。</div>'}
      <h2 class="sec">これからのG1</h2>
      <div class="panel"><table class="t">${up.map(r => `<tr><td class="small muted">${r.inWeeks}週後</td><td>${UI.gradeTag(r)}</td><td><b>${e(R.label(r))}</b></td><td class="small">${r.course} ${UI.surf(r.surface)} ${r.dist}m</td></tr>`).join('') || '<tr><td class="muted">なし</td></tr>'}</table></div>
      <h2 class="sec">ニュース</h2>
      <ul class="news">${G.news.slice(0, 30).map(n => `<li class="${n.kind}"><span class="d">${n.y}/${n.m}-${n.w}</span>${e(n.text)}</li>`).join('')}</ul>`;
  };

  // 騎乗する馬・依頼の馬のカード
  function rideCard(card, x, accepted, offer) {
    const race = card.race, h = x.horse;
    const wIdx = W.prepareWeek().wIdx;
    const trainer = offer ? offer.trainer : J.trainerOf(h);
    return `<div class="card offer">
      <canvas class="thumb" width="168" height="112" data-art="thumbdata" data-coat="${e(h.coat || '鹿毛')}" data-key="${e(h.name)}"></canvas>
      <div class="grow">
        <div class="small">${UI.gradeTag(race)} <b>${e(R.label(race))}</b>　${race.course} ${UI.surf(race.surface)} ${race.dist}m</div>
        <div class="row"><span class="nm">${e(h.name)}</span>${UI.histMark(h)}${(J.me().mounts || {})[h.name] && !h.filler ? `<span class="chip mine">お手馬</span>` : ''}<span class="small muted">${h.gelding ? 'セ' : h.sex}${W.get().year - h.born}・${e(h.style)}・切れ${h.kire || 4}</span></div>
        <div class="small muted">${e(trainer)}厩舎・${x.pop ? `${x.pop}番人気（${x.odds}倍）` : ''}・斤量 ${(() => { const al = x.allowance || (accepted ? 0 : J.allowance(race)); const w = x.allowance ? x.weight : x.weight - al; return al ? `${w}kg（${J.allowanceMark(al)}${al}kg減）` : `${w}kg`; })()}</div>
        ${UI.numStats(h, wIdx, { surface: race.surface })}
        ${(h.skills || []).length ? `<div class="skills">${UI.skillChips(h)}</div>` : ''}
        <div class="small muted">近走：${e(UI.recentRuns(h))}</div>
        <div class="btns">${accepted ? `<span class="chip mine">騎乗する</span><button class="btn sm" data-act="horse" data-id="${e(h.id)}">馬を見る</button><button class="btn sm" data-act="skip-week" data-id="${e(h.id)}">今週は休ませる</button>` : `<button class="btn sm gold" data-act="offer-accept" data-race="${e(race.key)}" data-horse="${e(h.id)}">受ける</button>`}</div>
      </div></div>`;
  }

  // ---------- 市場（史実馬のデビュー前だけ） ----------
  const market0 = S.market;
  S.market = function (st) {
    if (!isJ()) return market0(st);
    const html = market0(Object.assign({}, st, { mtab: 'hist' }));
    return `<div class="panel small mt">デビュー前の史実馬を買って、自分で乗る。2歳の4月から自動で入厩します。資金は賞金（馬主の取り分と騎手の取り分）で増えます。</div>` + html.replace(/<div class="tabs">[\s\S]*?<\/div>/, '');
  };
  const retire0 = App.act.retire;
  App.act.retire = async d => {
    if (!isJ()) return retire0(d);
    const h = W.horse(d.id);
    if (!(await App.confirm(`${e(h.name)}を引退させますか？（手もとを離れます）`, '引退させる'))) return;
    J.retire(d.id); App.save(); App.back();
  };
  const toFarm0 = App.act['to-farm'], toStable0 = App.act['to-stable'];
  App.act['to-farm'] = d => { const h = W.horse(d.id); if (isJ() && h) h.parked = true; toFarm0(d); };
  App.act['to-stable'] = d => { const h = W.horse(d.id); if (isJ() && h) h.parked = false; toStable0(d); };

  // ---------- 騎乗依頼（使っていない） ----------
  S.offers = function () {
    const G = W.get();
    const offers = J.offers();
    if (!offers.length) return '<h2 class="sec">騎乗依頼</h2><div class="panel empty">今週の騎乗依頼はありません。</div>';
    const rows = offers.map(o => {
      const card = W.cardOf(o.raceKey); if (!card) return '';
      const x = card.runners.find(r => r.horse.id === o.horseId); if (!x) return '';
      const taken = G.rides[o.raceKey];
      if (taken && taken !== o.horseId) return `<div class="panel small muted">${e(R.label(card.race))}：${e(x.horse.name)}（${e(o.trainer)}厩舎）の依頼は、同じレースでほかの馬に乗るので受けられません。</div>`;
      return rideCard(card, x, taken === o.horseId, o);
    });
    return `<h2 class="sec">騎乗依頼<span class="r">${offers.length}件・1レースに1頭</span></h2>
      <div class="small muted">評判が上がるほど、強い馬・大きいレースの依頼が来ます。</div>
      <div class="list mt">${rows.join('')}</div>`;
  };

  // ---------- 成績・リーディング ----------
  S.jrecord = function (st) {
    const G = W.get(), j = J.me();
    const tab = st.jtab || 'me';
    const tabs = [['me', 'わたしの成績'], ['lead', 'リーディング'], ['awards', '騎手の表彰'], ['mounts', 'お手馬'], ['hist', '騎乗の記録']];
    let body = '';
    if (tab === 'me') {
      const ys = Object.keys(j.years).map(Number).sort((a, b) => b - a);
      body = `<div class="tblwrap"><table class="t"><tr><th>年</th><th>騎乗</th><th>1着</th><th>2着</th><th>3着</th><th>勝率</th><th>順位</th></tr>
        ${ys.map(y => { const r = j.years[y]; return `<tr><td>${y}</td><td class="num">${r.rides}</td><td class="num"><b>${r.wins}</b></td><td class="num">${r.w2}</td><td class="num">${r.w3}</td><td class="num">${r.rides ? (r.wins / r.rides * 100).toFixed(1) : '0.0'}%</td><td class="num">${J.myRank(y) || '-'}</td></tr>`; }).join('')}
        <tr><td><b>通算</b></td><td class="num">${j.total.rides}</td><td class="num"><b>${j.total.wins}</b></td><td class="num">${j.total.w2}</td><td class="num">${j.total.w3}</td><td class="num">${j.total.rides ? (j.total.wins / j.total.rides * 100).toFixed(1) : '0.0'}%</td><td></td></tr></table></div>
        <h2 class="sec">重賞の勝ち鞍</h2>
        ${j.big.length ? `<div class="panel">${j.big.slice().reverse().map(b => `<div>${b.y}年 ${UI.gradeTag({ grade: b.grade, region: b.region, year: b.y })} ${e(b.race)}　${e(b.horse)}</div>`).join('')}</div>` : '<div class="panel empty">まだ重賞を勝っていません。</div>'}`;
    } else if (tab === 'lead') {
      const years = Object.keys(G.records.jockeys || {}).map(Number).sort((a, b) => b - a);
      const y = st.ly || years[0] || G.year;
      const l = J.leading(y);
      const top = l.slice(0, 30); const meI = l.findIndex(x => x.me);
      if (meI >= 30) top.push(l[meI]);
      body = `<div class="btns">${years.slice(0, 8).map(yy => `<button class="btn sm ${yy === y ? 'gold' : ''}" data-act="jlead-year" data-y="${yy}">${yy}年</button>`).join('')}</div>
        <div class="tblwrap mt"><table class="t"><tr><th>順位</th><th>騎手</th><th>1着</th><th>2着</th><th>3着</th><th>騎乗</th><th>勝率</th></tr>
        ${top.map(x => `<tr class="${x.me ? 'lead-me' : ''}"><td class="num">${l.indexOf(x) + 1}</td><td>${x.me ? '<b>' + e(x.name) + '</b>（あなた）' : e(x.name)}</td><td class="num"><b>${x.wins}</b></td><td class="num">${x.w2}</td><td class="num">${x.w3}</td><td class="num">${x.rides}</td><td class="num">${x.rides ? (x.wins / x.rides * 100).toFixed(1) : '0.0'}%</td></tr>`).join('')}</table></div>`;
    } else if (tab === 'awards') {
      const aw = G.records.jawards || {};
      const ys = Object.keys(aw).map(Number).sort((a, b) => b - a);
      body = ys.length ? ys.map(y => `<h2 class="sec">${y}年</h2><div class="panel"><dl class="kv">${Object.entries(aw[y]).map(([k, v]) => `<dt>${k}</dt><dd>${v === j.name ? '★ <b>' + e(v) + '</b>（あなた）' : e(v)}</dd>`).join('')}</dl></div>`).join('') : '<div class="panel empty">年が明けると、前の年の騎手の表彰が発表されます。</div>';
    } else if (tab === 'mounts') {
      const ms = Object.entries(j.mounts || {}).sort((a, b) => b[1].wins - a[1].wins || a[1].best - b[1].best || b[1].rides - a[1].rides);
      body = ms.length ? `<div class="small muted">勝った馬・3着までに来た馬は、その馬が出るレースでまた依頼が来やすい。</div><div class="tblwrap mt"><table class="t"><tr><th>馬</th><th>騎乗</th><th>1着</th><th>最高</th><th>最後</th></tr>${ms.slice(0, 60).map(([n, m]) => `<tr><td>${m.best <= 3 ? '<b>' + e(n) + '</b>' : e(n)}</td><td class="num">${m.rides}</td><td class="num">${m.wins}</td><td class="num">${m.best}着</td><td class="num">${m.last || ''}</td></tr>`).join('')}</table></div>` : '<div class="panel empty">まだお手馬はいません。</div>';
    } else {
      body = j.history.length ? `<div class="tblwrap"><table class="t"><tr><th>日付</th><th>レース</th><th>馬</th><th>人気</th><th>着順</th></tr>${j.history.slice(0, 80).map(r => `<tr><td class="small">${r.y}/${r.m}-${r.w}</td><td class="small">${r.grade ? `<span class="grade ${r.grade}">${r.grade}</span> ` : ''}${e(r.race)}</td><td>${e(r.horse)}</td><td class="num">${r.pop}</td><td class="num ${r.pos <= 3 ? 'pos' + r.pos : ''}">${r.pos}着</td></tr>`).join('')}</table></div>` : '<div class="panel empty">まだ騎乗していません。</div>';
    }
    return `<div class="tabs mt">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="jtab" data-tab="${k}">${l}</button>`).join('')}</div>${body}`;
  };

  // ---------- 新しく始める（騎手か、馬主・生産者か） ----------
  const newgame0 = S.newgame;
  S.newgame = function (st) {
    // 馬主・生産者の遊び方は選べなくした（持ち主の決定 2026-10-15。前のセーブは「つづきから」で遊べる）
    void newgame0;
    const pick = '';
    const years = []; for (let y = 1960; y <= 2025; y++) years.push(y);
    return pick + `<div class="panel gold" style="margin-top:12px">
      <h3 class="serif" style="margin:0 0 12px;color:var(--gold2);font-size:22px">新人騎手としてデビューする</h3>
      <div class="field"><label>騎手の名前</label><input id="ng-jname" maxlength="10" value="${e(st.jname || '')}" placeholder="例：青空 翔"></div>
      <div class="field"><label>所属</label><select id="ng-region">${J.REGIONS.map(r => `<option ${st.region === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
      <div class="field"><label>デビューの年</label><select id="ng-year">${years.map(y => `<option ${y === st.year ? 'selected' : ''}>${y}</option>`).join('')}</select>
        <div class="small muted">その年の実在の馬と騎手と一緒に走る。勝って評判を上げると、強い馬・大きいレース・史実の名馬の依頼が来る。</div></div>
      <div class="btns mt"><button class="btn gold" data-act="newgame-jockey">デビューする</button><button class="btn" data-act="title">もどる</button></div>
    </div>`;
  };
  const act = App.act;
  const readJ = () => { const ng = App.st.ng; const n = document.querySelector('#ng-jname'); if (n) { ng.jname = n.value; ng.region = document.querySelector('#ng-region').value; ng.year = +document.querySelector('#ng-year').value; } };
  act['ng-mode'] = d => { readJ(); App.st.ng.mode = d.m; App.render(); };
  act['newgame-jockey'] = () => {
    readJ();
    const ng = App.st.ng;
    const name = (ng.jname || '').trim() || '青空 翔';
    W.newGame({ mode: 'jockey', jockeyName: name, name, region: ng.region || '美浦', year: ng.year || 1995 });
    App.save();
    App.st.screen = 'game'; App.st.tab = 'home'; App.st.view = null; App.st.stack = [];
    App.render();
    App.modal(`<h3>${e(name)}騎手、デビュー</h3>
      <p>${W.get().year}年1月。${e(W.get().jockey.region)}所属の新人騎手として、最初の依頼を待つ。</p>
      <ul class="small"><li><b>騎乗依頼</b>：毎週、調教師から依頼が来る。受けたレースに乗る。</li>
        <li><b>騎乗</b>：「抑える」で脚をため、「追う」を馬の拍子に合わせて押し、ゴール前は「ムチ」。前が壁なら進路を変える。</li>
        <li>操作したくないレースは「おまかせ」で乗れる。</li><li>勝って評判を上げれば、強い馬と大きいレースの依頼が来る。</li></ul>
      <div class="btns"><button class="btn gold" data-act="close">はじめる</button></div>`);
  };
  act['offer-accept'] = d => { const err = J.accept(d.race, d.horse); if (err) return App.toast(err); App.save(); App.render(); };
  act['offer-cancel'] = d => { J.cancel(d.race); App.save(); App.render(); };
  act['skip-week'] = d => { const h = W.horse(d.id); if (!h) return; W.unenter(h.id); h.skipW = W.wIdx(); App.save(); App.toast(`${h.name}は今週休ませる`); App.render(); };
  act.jtab = d => { App.st.view = { name: 'jrecord', jtab: d.tab }; App.render(); };
  act['jlead-year'] = d => { App.st.view = { name: 'jrecord', jtab: 'lead', ly: +d.y }; App.render(); };

  // ---------- 週の流れ：パドック → 騎乗 → 結果 ----------
  const next0 = App.nextWeek;
  let busy = false;
  App.nextWeek = async function () {
    if (!isJ()) return next0();
    if (busy) return; busy = true;
    try {
      const rides = J.myRides();
      const played = {};
      for (const { card, runner } of rides) {
        const how = await paddock(card, runner);
        if (how !== 'ride') continue;
        App.inRace = true;
        const bg = App.modal('<div class="ride-holder"></div>', { wide: true, noClose: true });
        const AU = HS.Audio;
        if (AU && AU.ready() && AU.settings.bgm > 0 && card.race.graded) {
          bg.querySelector('.ride-holder').innerHTML = `<div class="panel gold center" style="padding:40px 10px"><div class="serif" style="font-size:22px;font-weight:900;color:var(--gold2)">${e(R.label(card.race))}</div><div class="mt">ファンファーレ</div><button class="btn sm mt" data-x="skipfan">飛ばす</button></div>`;
          await Promise.race([AU.playOnce('fanfare'), new Promise(res => { bg.querySelector('[data-x=skipfan]').onclick = () => { AU.stopBgm(); res(); }; })]);
        }
        played[card.race.key] = await HS.Ride.ride(bg.querySelector('.ride-holder'), card);
        App.closeModal();
        App.inRace = false;
      }
      const report = W.finishWeek(played);
      W.lastReport = report;
      App.save();
      for (const r of report.races.filter(x => x.ride)) {
        if (r.ridden) await resultOf(r);
        else await App.playRace(r, false);
      }
      App.weekSummary(report);
      App.render();
    } catch (err) {
      console.error(err);
      App.toast('エラー：' + err.message);
    } finally { busy = false; }
  };
  // パドック：出馬表と自分の馬。自分で乗るか、おまかせか
  function paddock(card, runner) {
    if (HS.Audio) HS.Audio.bgm('paddock');
    return new Promise(res => {
      const h = runner.horse;
      const tip = h.style === '逃げ' ? 'ハナを切って、そのまま粘らせてください。' : h.style === '先行' ? '好位につけて、直線で抜け出してください。' : h.style === '差し' ? '中団で脚をためて、直線勝負でお願いします。' : '後ろで脚をためて、最後に外から。';
      const kireTip = (h.kire || 4) >= 6 ? '切れる脚があるので、仕掛けは我慢してください。' : (h.kire || 4) <= 3 ? 'エンジンのかかりが遅いので、早めに動いてください。' : '';
      const bg = App.modal(`${UI.entryTable(card)}
        <div class="panel mt offer"><div class="row"><b>${e(h.name)}</b><span class="small muted">${e(J.trainerOf(h))}調教師より</span></div>
          <div class="comment">「${tip}${kireTip}」</div>${UI.numStats(h, W.prepareWeek().wIdx, { surface: card.race.surface })}</div>
        <div class="btns mt"><button class="btn gold" data-x="ride">自分で乗る</button><button class="btn" data-x="auto">おまかせで乗る</button></div>`, { noClose: true });
      bg.querySelector('[data-x=ride]').onclick = () => { App.closeModal(); res('ride'); };
      bg.querySelector('[data-x=auto]').onclick = () => { App.closeModal(); res('auto'); };
    });
  }
  // ---------- レース前の画面：出走表（脚質・人気・近走）・展開予想・コース図 ----------
  const STYLE_CLS = { '逃げ': 'nige', '先行': 'sen', '差し': 'sashi', '追込': 'oi' };
  UI.courseSvg = function (race) {
    const course = HS.DATA.courses[race.course] || HS.DATA.courses['東京'];
    const geo = (race.surface === 'ダ' ? course.dirt : course.turf) || course.turf || course.dirt;
    const tr = HS.Track.make(geo.lap, geo.straight, course.dir);
    const W0 = 220, H0 = 120, pad = 14;
    const sc = Math.min((W0 - pad * 2) / (tr.a + 2 * tr.r), (H0 - pad * 2) / (2 * tr.r));
    const P = sx => { const p = tr.at(sx); return [(W0 / 2 + p.x * sc).toFixed(1), (H0 / 2 + p.y * sc).toFixed(1)]; };
    const pts = []; for (let k = 0; k <= 80; k++) pts.push(P(tr.L * k / 80).join(','));
    const [gx, gy] = P(0), [sx, sy] = P(race.dist);
    return `<svg viewBox="0 0 ${W0} ${H0}" class="course-svg" role="img" aria-label="コース図">
      <polyline points="${pts.join(' ')}" fill="none" stroke="${race.surface === 'ダ' ? '#b88a57' : '#59a84f'}" stroke-width="7" stroke-linejoin="round"/>
      <line x1="${gx}" y1="${+gy - 8}" x2="${gx}" y2="${+gy + 8}" stroke="#fff" stroke-width="2.5"/><text x="${gx}" y="${+gy + 18}" fill="#fff" font-size="9" text-anchor="middle">ゴール</text>
      <circle cx="${sx}" cy="${sy}" r="5" fill="#ffd34d" stroke="#000"/><text x="${sx}" y="${+sy - 8}" fill="#ffd34d" font-size="9" text-anchor="middle">スタート</text>
      <text x="6" y="12" fill="#c8d3e2" font-size="9">${course.dir}回り・直線 ${geo.straight}m・坂 ${geo.slope}</text></svg>`;
  };
  UI.entryTable = function (card) {
    const { race, runners } = card;
    const G = W.get();
    const rows = runners.slice().sort((a, b) => a.num - b.num);
    const cnt = { '逃げ': 0, '先行': 0, '差し': 0, '追込': 0 };
    for (const x of runners) cnt[x.horse.style] = (cnt[x.horse.style] || 0) + 1;
    const pace = cnt['逃げ'] >= 2 ? 'ハイペース' : cnt['逃げ'] === 0 ? 'スローペース' : '平均ペース';
    const favor = pace === 'ハイペース' ? '差し・追込に向く' : pace === 'スローペース' ? '逃げ・先行に向く' : '力どおりの流れ';
    const recent = h => (h.results || []).slice(-3).map(r => `<span class="${r.pos <= 3 ? 'pos' + r.pos : ''}">${r.pos > 9 ? '×' : r.pos}</span>`).join('') || '<span class="muted">新</span>';
    return `<div class="entry">
      <div class="entry-head"><div>${UI.gradeTag(race)} <b class="serif" style="font-size:20px">${e(race.short || race.name)}</b></div>
        <div class="small">${G.year}年${race.month}月 ${race.course} ${race.surface === 'ダ' ? 'ダート' : '芝'}${race.dist}m　馬場：${race.ground}　${runners.length}頭</div></div>
      <div class="entry-top">${UI.courseSvg(race)}
        <div class="tenkai"><div class="small muted">展開予想</div><div class="big">${pace}</div><div class="small">${favor}</div>
          <div class="kyaku-cnt">${Object.entries(cnt).map(([k, v]) => `<span class="kyaku ${STYLE_CLS[k]}">${k[0]}</span>${v}`).join(' ')}</div></div></div>
      <div class="tblwrap mt"><table class="t entry-t"><tr><th>枠</th><th>馬名</th><th>脚質</th><th class="hide-sm">性齢</th><th class="hide-sm">斤量</th><th>騎手</th><th>人気</th><th>近走</th></tr>
      ${rows.map(x => { const me = x.rider === 'P' || x.mine; return `<tr class="${me ? 'mine' : ''}"><td>${UI.waku(x.frame, x.num)}</td>
        <td class="nm">${e(x.horse.name)}${x.horse.hist ? ' <span class="chip hist">史</span>' : ''}</td>
        <td><span class="kyaku ${STYLE_CLS[x.horse.style] || ''}">${e(x.horse.style)}</span></td>
        <td class="small hide-sm">${x.horse.gelding ? 'セ' : x.horse.sex}${G.year - x.horse.born}</td><td class="num small hide-sm">${x.weight}</td>
        <td class="small">${x.allowance ? J.allowanceMark(x.allowance) : ''}${e(x.jockey ? x.jockey.name : '')}</td>
        <td class="num">${x.pop}<div class="small muted">${x.odds}</div></td><td class="recent">${recent(x.horse)}</td></tr>`; }).join('')}
      </table></div></div>`;
  };

  // 自分で乗ったレースの結果
  function resultOf(r) {
    return new Promise(res => {
      const slim = W.slimResult(r);
      const me = r.sim.results.find(x => x.rider === 'P');
      const AU = HS.Audio;
      const head = me && me.pos === 1
        ? (r.race.graded ? '<div class="hero"><canvas class="winner-cv" width="960" height="560"></canvas></div>' : `<div class="panel gold center"><div class="serif" style="font-size:24px;font-weight:900;color:var(--gold2)">🏆 ${e(me.horse.name)}で1着！</div></div>`)
        : `<div class="panel center">${me ? `${e(me.horse.name)}は${me.pos}着` : ''}</div>`;
      const bg = App.modal(`${head}${UI.resultTable(slim)}<div class="btns mt"><button class="btn gold" data-x="ok">次へ</button></div>`, { noClose: true });
      if (me && me.pos === 1 && AU) { App.inRace = true; AU.playOnce('victory').then(() => { App.inRace = false; AU.bgm('home'); }); }
      const cv = bg.querySelector('.winner-cv');
      if (cv && me) A.winner(cv, me.horse, HS.RaceView.silksOf(me.horse), `${r.race.short || r.race.name} 優勝`, `${me.horse.name}　${U.time(me.time)}　騎手 ${J.me().name}`);
      bg.querySelector('[data-x=ok]').onclick = () => { App.closeModal(); res(); };
    });
  }
})();
