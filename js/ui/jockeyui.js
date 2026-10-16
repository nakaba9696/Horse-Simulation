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
    // ホームは管理画面の帯が同じものを出すので、上の帯は省く
    const v = App.st.view || { name: App.st.tab };
    if (v.name === 'home') return '';
    const G = W.get(), j = J.me();
    const yr = j.years[G.year] || { rides: 0, wins: 0 };
    const n = J.myRides().length;
    return `<div class="hdr">
      <div class="cal"><div class="y">${W.yLabel(G.year)}</div><div class="mw">${G.month}<small>月</small>${G.week}<small>週</small></div></div>
      <div class="hinfo"><div class="farm">${e(j.region)}・${e(j.name)}騎手・${W.yLabel(G.year)} ${yr.wins}勝 / ${yr.rides}戦</div><div class="money ${G.player.money < 0 ? 'neg' : ''}">${U.money(G.player.money)}</div></div>
      <button class="btn-next" data-act="next">${n ? 'レースへ' : '次の週へ'}<small>▶ ${n ? `${n}鞍に騎乗` : (G.week === 4 ? (G.month === 12 ? '新年' : (G.month + 1) + '月') : G.month + '月' + (G.week + 1) + '週')}</small></button>
    </div>`;
  };
  // 線のアイコン（24×24。色は字の色に合わせる）
  const ICONS = {
    home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>',
    stable: '<path d="M6.5 3.5v7.5a5.5 5.5 0 0 0 11 0V3.5"/><path d="M4.5 3.5h4M15.5 3.5h4"/><path d="M6.6 7.5h1.6M15.8 7.5h1.6M7.4 12h1.5M15.1 12h1.5"/>',
    market: '<path d="M4.5 8.5h15l-1.2 11.5H5.7z"/><path d="M8.8 8.5V7a3.2 3.2 0 0 1 6.4 0v1.5"/><path d="M9.5 13.5h5"/>',
    breed: '<path d="M12 20.5v-8"/><path d="M12 12.5c0-4.2-2.8-6.5-7-6.5 0 4.2 2.8 6.5 7 6.5z"/><path d="M12 10.5c0-3.4 2.2-5.5 6-5.5 0 3.4-2.2 5.5-6 5.5z"/><path d="M8 20.5h8"/>',
    races: '<path d="M8 4h8v5.5a4 4 0 0 1-8 0z"/><path d="M8 6H5.2a3 3 0 0 0 3.2 4.2"/><path d="M16 6h2.8a3 3 0 0 1-3.2 4.2"/><path d="M12 13.5V17"/><path d="M8.5 20h7l-.8-3h-5.4z"/>',
    jrecord: '<path d="M4 20h16"/><path d="M6.5 20v-6.5h3V20M10.5 20V6h3v14M14.5 20v-9h3v9"/>',
    records: '<path d="M6 4h10.5A2.5 2.5 0 0 1 19 6.5V20H8.5A2.5 2.5 0 0 1 6 17.5z"/><path d="M6 17.5A2.5 2.5 0 0 1 8.5 15H19"/><path d="M9.5 8h6"/>',
    menu: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  };
  UI.icon = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k] || ''}</svg>`;
  UI.nav = function (tab) {
    if (!isJ()) return nav0(tab);
    const items = [['home', 'ホーム'], ['stable', '厩舎'], ['market', '馬の店'], ['breed', '生産'], ['races', 'レース'], ['jrecord', 'データ'], ['menu', 'メニュー']];
    return `<nav class="nav"><div class="in">${items.map(([k, lb]) => `<button data-act="tab" data-tab="${k}" class="${tab === k ? 'on' : ''}"><span class="ic">${UI.icon(k)}</span>${lb}</button>`).join('')}</div></nav>`;
  };

  // ---------- 生産：オリジナルホース（引退させた牡馬と牝馬から） ----------
  const potStats = h => `<div class="nums">${['spd', 'sta', 'dspd', 'dsta', 'guts', 'mind', 'slope'].map(k => `<span>${H.STAT_SHORT[k]} <b>${Math.round(h.pot[k])}</b></span>`).join('')}<span>切れ <b>${h.kire || 4}</b></span></div>`;
  const skillChip = id => { const k = HS.Skills.BY[id]; return k ? `<span class="chip skill trig ${k.bad ? 'bad' : ''}" title="${e(k.note)}">⚡${e(k.label)}</span>` : H.SKILLS[id] ? `<span class="chip skill ${H.SKILLS[id].bad ? 'bad' : ''}" title="${e(H.SKILLS[id].note)}">${e(H.SKILLS[id].label)}</span>` : ''; };
  S.breed = function (st) {
    const O = HS.Original, G = W.get();
    if (!O || !O.on()) return '<div class="panel empty mt">この遊び方では使えません。</div>';
    const sires = O.retired('牡'), dams = O.retired('牝');
    const ps = sires.find(h => h.id === st.osire), pd = dams.find(h => h.id === st.odam);
    const card = (h, role, on) => `<div class="card ${on ? 'sel' : ''}" data-act="orig-pick" data-role="${role}" data-id="${h.id}">${UI.thumb(h)}<div class="grow">
        <div class="row"><span class="nm">${e(h.name)}</span>${h.hist ? UI.histMark(h) : ''}${h.parentBonus ? `<span class="chip crown">ボーナス +${h.parentBonus}</span>` : ''}${role === 'dam' && h.foalY === G.year ? '<span class="chip">今年は産んだ</span>' : ''}<button class="btn sm right" data-act="orig-release" data-id="${h.id}">放す</button></div>
        <div class="sub">${h.starts || 0}戦${h.wins || 0}勝・${e(h.style)}・${H.distLabel(h.distMin, h.distMax)}</div>${potStats(h)}
        <div class="skills">${O.skillsOf(h).map(skillChip).join('')}</div>${UI.titleChips(h) ? `<div>${UI.titleChips(h)}</div>` : ''}</div></div>`;
    const cand = ps && pd ? O.candidates(ps, pd) : [];
    const bonus = ps && pd ? Math.min(O.BONUS_MAX, (ps.parentBonus || 0) + (pd.parentBonus || 0)) : 0;
    return `<h2 class="sec">オリジナルホース<span class="r">お手馬 ${T.ownCount()}/${T.MAX_OWN}</span></h2>
      <div class="small muted">引退させた牡馬と牝馬から、オリジナルホースを作る。能力は両親の値をもとにばらつく。特殊能力は両親のもの（合わせて最大8つ）から4つまで受け継ぐ。トロフィーを手にした馬・グランドフィナーレを勝った馬を親にすると、仔の能力にボーナス。牝馬は1年に1頭。</div>
      ${ps && pd ? `<div class="panel gold mt"><b>${e(ps.name)} × ${e(pd.name)}</b>${bonus ? `<span class="chip crown" style="margin-left:6px">ボーナス +${bonus}</span>` : ''}
        <div class="small mt">受け継ぐ特殊能力の候補（${cand.length}つ${cand.length > O.MAX_SKILLS ? '。この中から4つ' : ''}）</div><div class="skills">${cand.map(skillChip).join('') || '<span class="small muted">なし</span>'}</div>
        <div class="row mt"><input id="orig-name" maxlength="12" placeholder="名前（空ならおまかせ）" class="grow"><button class="btn gold" data-act="orig-make">オリジナルホースを作る</button></div></div>`
        : '<div class="panel small mt">父と母を1頭ずつ選んでください。</div>'}
      <h2 class="sec">父（引退した牡馬）<span class="r">${sires.length} / ${O.MAX_EACH}</span></h2>
      ${sires.length ? `<div class="list">${sires.map(h => card(h, 'sire', h === ps)).join('')}</div>` : '<div class="panel empty">まだいません。牡馬を引退させると、ここに残ります。</div>'}
      <h2 class="sec">母（引退した牝馬）<span class="r">${dams.length} / ${O.MAX_EACH}</span></h2>
      ${dams.length ? `<div class="list">${dams.map(h => card(h, 'dam', h === pd)).join('')}</div>` : '<div class="panel empty">まだいません。牝馬を引退させると、ここに残ります。</div>'}`;
  };
  App.act['orig-pick'] = d => { const v = App.st.view || {}; if (d.role === 'sire') v.osire = d.id; else v.odam = d.id; App.st.view = Object.assign({ name: 'breed' }, v); App.render(); };
  App.act['orig-release'] = async d => {
    const h = W.horse(d.id); if (!h) return;
    if (!(await App.confirm(`${e(h.name)}を牧場から放しますか？（親にできなくなります）`, '放す'))) return;
    const err = HS.Original.release(d.id); if (err) App.toast(err); else { App.save(); App.render(); }
  };
  App.act['orig-make'] = () => {
    const v = App.st.view || {}, inp = document.getElementById('orig-name');
    const r = HS.Original.make(v.osire, v.odam, inp ? inp.value : '');
    if (r.err) { App.toast(r.err); return; }
    App.save();
    App.toast(`「${r.horse.name}」が生まれた！`);
    App.go({ name: 'horse', id: r.horse.id, htab: 'info' });
  };

  // ---------- 調子の8色・総合力・冠 ----------
  const T = HS.Season;
  UI.condMark = (h, wIdx) => { const c = T.cond(h, wIdx != null ? wIdx : W.wIdx()); return `<span class="cmark" style="--c:${c.color}" title="調子"><i></i>${c.label}</span>`; };
  const condTag0 = UI.condTag;
  UI.condTag = h => isJ() ? UI.condMark(h) : condTag0(h);
  UI.titleChips = h => (h.titles || []).map(l => `<span class="chip crown">👑 ${e(l)}</span>`).join('');
  UI.costOf = h => Math.round((h.loc === 'stable' ? 60 : h.loc === 'farm' ? 15 : 0) * U.priceIndex(W.get().year));
  // 成長の山を曲線で。横は年齢（1〜9歳）、縦は力の出し具合。●がいまの位置
  UI.growthCurve = function (h) {
    const G = W.get();
    const W0 = 280, H0 = 96, L = 8, R0 = 8, T0 = 10, B = 20, a0 = 1.5, a1 = 8.5;
    const X = a => L + (a - a0) / (a1 - a0) * (W0 - L - R0);
    const Y = g => T0 + (1 - U.clamp((g - 0.6) / 0.42, 0, 1)) * (H0 - T0 - B);
    const pts = [];
    for (let y = h.born + 1; y <= h.born + 9; y++) for (let m = 1; m <= 12; m++) {
      const age = y - h.born + (m - 1) / 12;
      if (age < a0 || age > a1) continue;
      pts.push([X(age), Y(H.growthFactor(h, H.weekIndex(y, m, 1)))]);
    }
    const line = pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
    const area = `${X(a0).toFixed(1)},${H0 - B} ${line} ${X(a1).toFixed(1)},${H0 - B}`;
    const nowA = G.year - h.born + (G.month - 1) / 12 + (G.week - 1) / 48;
    const nx = X(U.clamp(nowA, a0, a1)), ny = Y(H.growthFactor(h, W.wIdx()));
    const ticks = [2, 3, 4, 5, 6, 7, 8].map(a => `<line x1="${X(a)}" y1="${T0}" x2="${X(a)}" y2="${H0 - B}" stroke="rgba(255,255,255,.08)"/><text x="${X(a)}" y="${H0 - 6}" fill="#a9c4b0" font-size="10" text-anchor="middle">${a}歳</text>`).join('');
    return `<svg class="gcurve" viewBox="0 0 ${W0} ${H0}" role="img" aria-label="成長の山">${ticks}
      <polygon points="${area}" fill="rgba(127,224,160,.18)"/><polyline points="${line}" fill="none" stroke="#7fe0a0" stroke-width="2.5" stroke-linejoin="round"/>
      ${nowA >= a0 && nowA <= a1 ? `<line x1="${nx}" y1="${T0}" x2="${nx}" y2="${H0 - B}" stroke="#ffd34d" stroke-dasharray="3 3"/><circle cx="${nx}" cy="${ny}" r="5.5" fill="#ffd34d" stroke="#3a2a00" stroke-width="1.5"/><text x="${U.clamp(nx, 20, W0 - 20)}" y="${T0 - 1}" fill="#ffd34d" font-size="10" text-anchor="middle">いま</text>` : ''}</svg>`;
  };
  // 馬の画面の上：総合力（いま・完成）・国内の順位・調子・冠・成長の山・お金
  UI.grPanel = function (h, wIdx) {
    if (!isJ()) return '';
    const mine = h.owner === 'P';
    const fh = T.fhBoth(h, wIdx), pk = T.fhPeak(h), rk = h.loc === 'stable' ? T.rank(h, wIdx) : null;
    const bars = UI.growthCurve(h);
    return `<div class="panel gr mt">
      <div class="grrow"><div><div class="small muted">${T.FH_NAME}（いま）</div><b class="fh"><span class="turf">芝 ${fh.turf}</span><span class="dirt">ダ ${fh.dirt}</span></b></div>
        <div><div class="small muted">${T.FH_NAME}（完成）</div><b class="fh"><span class="turf">芝 ${pk.turf}</span><span class="dirt">ダ ${pk.dirt}</span></b></div>
        <div><div class="small muted">国内の順位</div><b>${rk && rk.pos ? `${rk.pos}位 <small class="muted">/ ${rk.n}頭</small>` : '－'}</b></div>
        <div><div class="small muted">調子</div>${UI.condMark(h, wIdx)}</div>
        <div><div class="small muted">成績</div><b>${h.starts || 0}戦${h.wins || 0}勝</b></div></div>
      ${(h.titles || []).length ? `<div class="mt">${UI.titleChips(h)}</div>` : ''}
      <div class="grrow mt"><div class="growth"><div class="small muted">成長の山（年齢）・●がいま</div>${bars}</div>
        ${!mine ? (() => { const hi = W.marketHistoric().findIndex(x => x.horse.id === h.id), fi = hi < 0 ? W.marketForeign().findIndex(x => x.horse.id === h.id) : -1; if (hi < 0 && fi < 0) return ''; const it = hi >= 0 ? W.marketHistoric()[hi] : W.marketForeign()[fi]; return `<div class="small"><div>馬の店の値段 <b>${U.money(it.price)}</b></div><button class="btn sm gold mt" data-act="buy" data-kind="${hi >= 0 ? 'hist' : 'fhist'}" data-i="${hi >= 0 ? hi : fi}">買う</button></div>`; })() : ''}
        ${mine ? `<div class="small"><div>総獲得賞金 <b>${U.money(h.prize || 0)}</b></div><div>値段 <b>${U.money(W.sellPrice(h))}</b></div><div>毎月の費用 <b>${U.money(UI.costOf(h))}</b></div></div>` : ''}</div>
    </div>`;
  };

  // スペシャルホースのリーチ（あと1勝で条件がそろう）
  UI.reachLine = h => { if (!HS.Special || !W.get().eraless || h.loc === 'retired') return ''; const r = HS.Special.reachInfo(h); return r.length ? `<div class="sp-reach small">★ リーチ：${r.map(x => `${e(x.need)}で「${e(x.group.label)}」`).join('／')}</div>` : ''; };
  // ---------- ホーム（管理画面）：上の帯と大きなコマンド ----------
  const home0 = S.home;
  S.home = function (st) {
    if (!isJ()) return home0(st);
    const G = W.get(), j = J.me();
    const yr = j.years[G.year] || { rides: 0, wins: 0, w2: 0, w3: 0, prize: 0 };
    const rank = J.myRank(G.year);
    const rides = J.myRides();
    const wk = W.prepareWeek();
    const up = W.upcomingGraded(12).filter(r => r.grade === 'G1' && r.inWeeks > 0 && r.region !== '海外').slice(0, 5);
    const allowance = J.allowance({ graded: false, region: 'JRA' });
    // 今週のおもなレース（乗るレースがあればその競馬場）の天気と馬場
    const main = rides.length ? rides[0].card.race : (W.cards().map(c => c.race).find(r => r.region === 'JRA' && r.graded) || (W.cards()[0] || {}).race);
    const wx = main ? T.weather(G.seed, G.year, G.month, G.week, main.course, main.ground) : null;
    const cmds = [['stable', '出走登録', '厩舎とレース'], ['market', '馬の店', `お手馬 ${T.ownCount()}/${T.MAX_OWN}`], ['breed', '生産', 'オリジナルホース'], ['jrecord', 'データ', '成績・スペシャル・トロフィー'], ['records', '記録', '年代記・表彰'], ['menu', 'システム', 'セーブ・音・色']];
    const over = G.gameOver;
    return `
      ${over ? `<div class="panel over mt"><div class="big">シーズン終了</div><div>${W.yLabel(over.y)}${over.m}月、資金が尽きた（${U.money(over.money)}）。</div><div class="small muted">記録はここまでの分が残っています。</div><div class="btns mt"><button class="btn gold" data-act="newgame-form">はじめから</button><button class="btn" data-act="tab" data-tab="jrecord">成績を見る</button></div></div>` : ''}
      <div class="mgr mt">
        <div class="mgr-top">
          <div><div class="small">騎手</div><b class="nm">${e(j.name)}</b><span class="small">　${e(j.region)}${allowance ? `・${J.allowanceMark(allowance)}${allowance}kg 減` : ''}</span></div>
          <div class="c"><div class="small">リーディング</div><b>${rank ? rank + '位' : '－'}</b></div>
          <div class="r"><div class="small">資金</div><b class="${G.player.money < 0 ? 'neg' : ''}">${U.money(G.player.money)}</b></div>
        </div>
        <div class="mgr-mid">
          <div class="plaque"><div class="y">${W.yLabel(G.year)}</div><div class="mw">${G.month}<small>月</small> 第${G.week}<small>週</small></div></div>
          <div class="wx">${wx ? `<div class="ic">${T.weatherIcon(wx)}</div><div><div class="small">${e(main.course)}</div><b>${wx}・${main.ground}</b></div>` : ''}</div>
          <button class="go ${rides.length ? 'on' : ''}" data-act="next" ${over ? 'disabled' : ''}>${rides.length ? 'レースへ' : '次の週へ'}<small>${rides.length ? `${rides.length}鞍に騎乗` : ''}</small></button>
        </div>
        <div class="mgr-cmds">${cmds.map(([k, lb, sub]) => `<button data-act="tab" data-tab="${k}"><span class="ic">${UI.icon(k)}</span><b>${lb}</b><small>${sub}</small></button>`).join('')}</div>
        <div class="mgr-foot small">今年 ${yr.rides}戦${yr.wins}勝（2着${yr.w2}・3着${yr.w3}）・通算 ${j.total.rides}戦${j.total.wins}勝・評判 ${J.repLabel(j.rep)}・騎乗技術 ${Math.round(j.skill)}</div>
      </div>
      ${!W.mine().length && !over ? `<div class="panel gold mt">📌 <a href="#" data-act="tab" data-tab="market">馬の店でデビュー前の史実馬を買おう</a>（2歳の4月から自動で入厩し、レースに出られる）。お手馬は${T.MAX_OWN}頭まで。毎月の費用がかかり、資金がマイナスのまま2か月続くとシーズンが終わる。</div>` : ''}
      ${UI.dcSection ? UI.dcSection() : ''}
      <h2 class="sec">今週の騎乗<span class="r">${G.month}月${G.week}週</span></h2>
      ${rides.length ? `<div class="list">${rides.map(({ card, runner }) => rideCard(card, runner, true)).join('')}</div>`
        : `<div class="panel empty">今週は乗るレースがありません。${W.mine('stable').length ? '<br><a href="#" data-act="tab" data-tab="stable">厩舎で出るレースを決める（おまかせなら自動で選ぶ）</a>' : ''}</div>`}
      ${T.reserves().length ? `<h2 class="sec">出走の予約<span class="r">${T.reserves().length}件</span></h2><div class="panel"><table class="t">${T.reserves().map(x => { const h = W.horse(x.id); return h ? `<tr><td class="small muted">${x.m}月${x.w}週</td><td><b>${e(x.label)}</b></td><td>${e(h.name)}</td><td><button class="btn sm" data-act="unreserve" data-id="${h.id}" data-key="${e(x.key)}">取消</button></td></tr>` : ''; }).join('')}</table></div>` : ''}
      <h2 class="sec">お手馬<span class="r">${T.ownCount()} / ${T.MAX_OWN}頭・毎月 ${U.money(W.monthlyCost())}</span></h2>
      ${W.mine().filter(h => h.loc !== 'retired').length ? `<div class="list">${W.mine().filter(h => h.loc !== 'retired').map(h => `<div class="card" data-act="horse" data-id="${h.id}">${UI.thumb(h)}<div class="grow"><div class="row"><span class="nm">${e(h.name)}</span>${UI.histMark(h)}${h.auto ? '<span class="chip">おまかせ</span>' : ''}${h.loc === 'stable' ? UI.condMark(h) : ''}</div><div class="sub">${UI.age(h)}・${h.loc === 'stable' ? '入厩中' : '牧場'}・${h.starts || 0}戦${h.wins || 0}勝・${U.money(h.prize || 0)}</div>${UI.titleChips(h) || (UI.dcChip && UI.dcChip(h)) ? `<div>${UI.titleChips(h)}${UI.dcChip ? UI.dcChip(h) : ''}</div>` : ''}${UI.reachLine(h)}${UI.numStats(h, W.wIdx())}</div></div>`).join('')}</div>` : '<div class="panel empty">まだお手馬がいません。</div>'}
      <h2 class="sec">これからのG1</h2>
      <div class="panel"><table class="t">${up.map(r => `<tr><td class="small muted">${r.inWeeks}週後</td><td>${UI.gradeTag(r)}</td><td><b>${e(R.label(r))}</b></td><td class="small">${r.course} ${UI.surf(r.surface)} ${r.dist}m</td></tr>`).join('') || '<tr><td class="muted">なし</td></tr>'}</table></div>
      <h2 class="sec">ニュース</h2>
      <ul class="news">${G.news.slice(0, 30).map(n => `<li class="${n.kind}"><span class="d">${UI.newsDate(n)}</span>${e(n.text)}</li>`).join('')}</ul>`;
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
        ${UI.hasSkills(h) ? `<div class="skills">${UI.skillChips(h)}</div>` : ''}
        <div class="small muted">近走：${e(UI.recentRuns(h))}</div>
        ${(() => { const lg = card.runners.filter(r => r.horse.legend).map(r => r.horse.name); if (!lg.length) return ''; return `<div class="legend-call">★ リーチ！ スペシャルホース <b>${lg.map(e).join('・')}</b> が出てくる。勝てば馬の店に並ぶ</div>`; })()}
        <div class="btns">${accepted ? `<span class="chip mine">騎乗する</span><button class="btn sm" data-act="horse" data-id="${e(h.id)}">馬を見る</button><button class="btn sm" data-act="skip-week" data-id="${e(h.id)}">今週は休ませる</button>` : `<button class="btn sm gold" data-act="offer-accept" data-race="${e(race.key)}" data-horse="${e(h.id)}">受ける</button>`}</div>
      </div></div>`;
  }

  // ---------- 馬の店：デビュー前の史実馬を、完成したときの総合力の高い順に一行ずつ（芝とダートを別の列で）。行を押すと馬の画面（解説もそこで読める） ----------
  const market0 = S.market;
  S.market = function (st) {
    if (!isJ()) return market0(st);
    const G = W.get(), wIdx = W.wIdx();
    const items = W.marketHistoric().map((it, i) => ({ it, i, kind: 'hist' })).concat(W.marketForeign().map((it, i) => ({ it, i, kind: 'fhist' })));
    for (const x of items) { x.fh = T.fhPeak(x.it.horse); x.top = Math.max(x.fh.turf, x.fh.dirt); }
    items.sort((a, b) => ((b.it.legend ? 1 : 0) - (a.it.legend ? 1 : 0)) || b.top - a.top || b.it.price - a.it.price); // 倒したスペシャルホースは上に
    const lim = st.mlimit || 40;
    const full = !T.canBuy();
    const rows = items.slice(0, lim).map(({ it, fh }, k) => {
      const h = it.horse, best = fh.turf >= fh.dirt ? 'turf' : 'dirt';
      return `<div class="shop-row ${it.legend ? 'legend' : ''}" data-act="horse" data-id="${e(h.id)}" style="--i:${Math.min(k, 12)}">
        <span class="rk">${k + 1}</span>
        <canvas class="thumb" width="168" height="112" data-art="thumbdata" data-coat="${e(h.coat || '鹿毛')}" data-key="${e(h.name)}"></canvas>
        <span class="who"><b>${e(h.name)}</b>${h.legendBought ? ' <span class="chip legend">スペシャル</span>' : ''}<span class="sub"><span class="sexm ${h.sex === '牝' ? 'f' : 'm'}">${h.sex === '牝' ? '牝馬' : '牡馬'}</span> ${G.year - h.born}歳</span></span>
        <span class="fhs"><span class="fhv turf ${best === 'turf' ? '' : 'dim'}"><small>芝</small>${fh.turf}</span><span class="fhv dirt ${best === 'dirt' ? '' : 'dim'}"><small>ダ</small>${fh.dirt}</span></span>
        <span class="price">${U.money(it.price)}</span></div>`;
    }).join('');
    return `<h2 class="sec">馬の店<span class="r">資金 ${U.money(G.player.money)}・お手馬 ${T.ownCount()}/${T.MAX_OWN}${full ? '（いっぱい）' : ''}</span></h2>
      <div class="small muted">1989〜2026年に走った馬で、いま走っていない馬を、デビュー前の2歳として売る。${T.FH_NAME}（伸びきったときの強さ。史実馬は45〜85で、オリジナルホースは99まで）の芝・ダートの高いほうの順。倒したスペシャルホースは上に並ぶ。行を押すと馬の画面が開き、そこで買えます。はじめは G3 までの馬だけ。自分の馬で勝つと、その格・地方・国の馬が並ぶようになる。</div>
      ${HS.Eraless && HS.Eraless.locks ? `<div class="shop-locks mt">${HS.Eraless.locks().map(l => `<span class="lk ${l.open ? 'open' : ''}"><b>${l.open ? '' : '🔒 '}${e(l.label)}</b> ${l.n}頭<small>${l.open ? '並んでいる' : `${e(l.hint)}と並ぶ`}</small></span>`).join('')}</div>` : ''}
      ${items.length ? `<div class="shop-head mt"><span>馬名</span><span>芝・ダ</span><span>値段</span></div><div class="shop">${rows}</div>
        ${items.length > lim ? `<div class="center mt"><button class="btn" data-act="mmore">もっと見る（残り${items.length - lim}頭）</button></div>` : ''}`
        : '<div class="panel empty">いま買えるデビュー前の史実馬はいません。毎年3月に新しい世代が生まれます。</div>'}`;
  };
  const retire0 = App.act.retire;
  App.act.retire = async d => {
    if (!isJ()) return retire0(d);
    const h = W.horse(d.id);
    const keep = HS.Original && HS.Original.on() && !h.gelding;
    if (!(await App.confirm(`${e(h.name)}を引退させますか？${keep ? '（牧場に残り、オリジナルホースの親にできます）' : '（手もとを離れます）'}`, '引退させる'))) return;
    const r = J.retire(d.id); if (r && r.err) { App.toast(r.err); return; }
    App.save(); App.back();
  };
  // 出走の予約（12月4週まで）
  App.act.reserve = d => {
    const G = W.get();
    const race = W.upcomingGraded(T.weeksLeft(G)).find(r => r.key === d.key);
    const err = race ? T.reserve(d.id, race) : 'レースが見つからない';
    if (err) App.toast(err); else { App.toast(`${R.label(race)}（${race.month}月${race.week}週）を予約した`); App.save(); }
    App.render();
  };
  App.act['reserve-debut'] = d => {
    const sel = document.getElementById('debut-week'); if (!sel) return;
    const [y, m, w] = sel.value.split('-').map(Number);
    const err = T.reserveDebut(d.id, y, m, w);
    if (err) App.toast(err); else { App.toast(`新馬戦（${W.yLabel(y)}${m}月${w}週）を予約した`); App.save(); }
    App.render();
  };
  App.act.unreserve = d => { T.unreserve(d.id, d.key); App.save(); App.render(); };
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
    const tabs = [['me', 'わたしの成績'], ['special', 'スペシャルホース'], ['trophy', 'トロフィー'], ['lead', 'リーディング'], ['awards', '騎手の表彰'], ['hall', '殿堂'], ['course', 'コースレコード'], ['replay', 'リプレイ'], ['mounts', '乗った馬'], ['hist', '騎乗の記録']];
    let body = '';
    if (tab === 'me') {
      const ys = Object.keys(j.years).map(Number).sort((a, b) => b - a);
      body = `<div class="tblwrap"><table class="t"><tr><th>年</th><th>騎乗</th><th>1着</th><th>2着</th><th>3着</th><th>勝率</th><th>順位</th></tr>
        ${ys.map(y => { const r = j.years[y]; return `<tr><td>${y}</td><td class="num">${r.rides}</td><td class="num"><b>${r.wins}</b></td><td class="num">${r.w2}</td><td class="num">${r.w3}</td><td class="num">${r.rides ? (r.wins / r.rides * 100).toFixed(1) : '0.0'}%</td><td class="num">${J.myRank(y) || '-'}</td></tr>`; }).join('')}
        <tr><td><b>通算</b></td><td class="num">${j.total.rides}</td><td class="num"><b>${j.total.wins}</b></td><td class="num">${j.total.w2}</td><td class="num">${j.total.w3}</td><td class="num">${j.total.rides ? (j.total.wins / j.total.rides * 100).toFixed(1) : '0.0'}%</td><td></td></tr></table></div>
        <h2 class="sec">重賞の勝ち鞍</h2>
        ${j.big.length ? `<div class="panel">${j.big.slice().reverse().map(b => `<div>${W.yLabel(b.y)} ${UI.gradeTag({ grade: b.grade, region: b.region, year: b.y })} ${e(b.race)}　${e(b.horse)}</div>`).join('')}</div>` : '<div class="panel empty">まだ重賞を勝っていません。</div>'}`;
    } else if (tab === 'lead') {
      const years = Object.keys(G.records.jockeys || {}).map(Number).sort((a, b) => b - a);
      const y = st.ly || years[0] || G.year;
      const l = J.leading(y);
      const top = l.slice(0, 30); const meI = l.findIndex(x => x.me);
      if (meI >= 30) top.push(l[meI]);
      body = `<div class="btns">${years.slice(0, 8).map(yy => `<button class="btn sm ${yy === y ? 'gold' : ''}" data-act="jlead-year" data-y="${yy}">${W.yLabel(yy)}</button>`).join('')}</div>
        <div class="tblwrap mt"><table class="t"><tr><th>順位</th><th>騎手</th><th>1着</th><th>2着</th><th>3着</th><th>騎乗</th><th>勝率</th></tr>
        ${top.map(x => `<tr class="${x.me ? 'lead-me' : ''}"><td class="num">${l.indexOf(x) + 1}</td><td>${x.me ? '<b>' + e(x.name) + '</b>（あなた）' : e(x.name)}</td><td class="num"><b>${x.wins}</b></td><td class="num">${x.w2}</td><td class="num">${x.w3}</td><td class="num">${x.rides}</td><td class="num">${x.rides ? (x.wins / x.rides * 100).toFixed(1) : '0.0'}%</td></tr>`).join('')}</table></div>`;
    } else if (tab === 'awards') {
      const aw = G.records.jawards || {};
      const ys = Object.keys(aw).map(Number).sort((a, b) => b - a);
      body = ys.length ? ys.map(y => `<h2 class="sec">${W.yLabel(y)}</h2><div class="panel"><dl class="kv">${Object.entries(aw[y]).map(([k, v]) => `<dt>${k}</dt><dd>${v === j.name ? '★ <b>' + e(v) + '</b>（あなた）' : e(v)}</dd>`).join('')}</dl></div>`).join('') : '<div class="panel empty">年が明けると、前の年の騎手の表彰が発表されます。</div>';
    } else if (tab === 'special' && HS.Special) {
      const un = G.unlocked || [];
      const SPx = HS.Special;
      const reach = {}; for (const h of W.mine().filter(x => x.loc === 'stable' || x.loc === 'farm')) for (const r of SPx.reachInfo(h)) (reach[r.group.id] = reach[r.group.id] || []).push(`${h.name}（${r.need}）`);
      body = `<div class="small muted">1989年より前に走り終えた名馬。自分の馬がグループの条件にリーチをかける（あと1勝でそろう）と、最後のレースにそのグループの名馬が出てくる。勝つと馬の店に並ぶ。名前を押すと名鑑（年代・戦績・主な勝鞍・解説）が開く。店に並んだ馬 ${un.length} / ${SPx.list().length}</div>
        <div class="list mt">${SPx.GROUPS.map(g => { const ms = SPx.members(g); if (!ms.length) return '';
          return `<details class="panel sp-g" ${!g.race || reach[g.id] ? 'open' : ''}><summary class="row"><b class="nm">${e(g.label)}</b><span class="right small muted">${ms.filter(d => un.includes(d.name)).length} / ${ms.length}頭</span></summary>
            <div class="small">${e(g.note)}</div>${reach[g.id] ? `<div class="sp-reach small">リーチ：${reach[g.id].map(e).join('・')}</div>` : ''}
            <div class="small mt">${ms.map(d => `<a href="#" class="sp-nm ${un.includes(d.name) ? 'sp-got' : ''}" data-act="htext" data-name="${e(d.name)}">${e(d.name)}</a>`).join('・')}</div></details>`; }).join('')}</div>`;
    } else if (tab === 'trophy' && HS.Trophy) {
      const tr = G.trophies || {};
      const n = HS.Trophy.LIST.filter(t => tr[t.id]).length;
      body = `<div class="small muted">勝ったレースの組み合わせで手にするトロフィー。${n} / ${HS.Trophy.LIST.length}</div>
        <div class="list mt">${HS.Trophy.LIST.map(t => { const got = tr[t.id];
          return `<div class="panel trophy ${got ? 'got' : ''}"><div class="row"><span class="cup">${got ? '🏆' : '🔒'}</span><b class="nm">${e(t.label)}</b><span class="right small muted">${got ? `${W.yLabel(got.y)}・${e(got.horse)}` : 'まだ'}</span></div>
            <div class="small">${e(t.note)}</div></div>`; }).join('')}</div>`;
    } else if (tab === 'hall') {
      const hall = (G.records.hall || []).slice().sort((a, b) => b.titles.length - a.titles.length || b.g1 - a.g1);
      body = UI.hallOwn() + `<h2 class="sec">冠を手にした馬</h2>` + (hall.length ? `<div class="small muted">冠（勝ったレースの組み合わせで付く称号）を手にした自分の馬。</div><div class="list mt">${hall.map(x => `<div class="panel"><div class="row"><b class="nm">${e(x.name)}</b><span class="small muted">${x.born}年生 ${x.sex}</span><span class="right small">${x.starts}戦${x.wins}勝・G1 ${x.g1}勝</span></div><div class="mt">${x.titles.map(l => `<span class="chip crown">👑 ${e(l)}</span>`).join('')}</div><div class="small muted">総獲得賞金 ${U.money(x.prize)}・${W.yLabel(x.since)}に冠</div></div>`).join('')}</div>` : '<div class="panel empty">まだ冠を手にした馬はいません。</div>');
    } else if (tab === 'course') {
      body = UI.courseRecords(st); // js/ui/records.js
    } else if (tab === 'replay') {
      body = UI.replayList(st); // js/ui/replayui.js
    } else if (tab === 'mounts') {
      const ms = Object.entries(j.mounts || {}).sort((a, b) => b[1].wins - a[1].wins || a[1].best - b[1].best || b[1].rides - a[1].rides);
      body = ms.length ? `<div class="small muted">これまでに乗った馬。</div><div class="tblwrap mt"><table class="t"><tr><th>馬</th><th>騎乗</th><th>1着</th><th>最高</th><th>最後</th></tr>${ms.slice(0, 60).map(([n, m]) => `<tr><td>${m.best <= 3 ? '<b>' + e(n) + '</b>' : e(n)}</td><td class="num">${m.rides}</td><td class="num">${m.wins}</td><td class="num">${m.best}着</td><td class="num">${m.last || ''}</td></tr>`).join('')}</table></div>` : '<div class="panel empty">まだお手馬はいません。</div>';
    } else {
      body = j.history.length ? `<div class="tblwrap"><table class="t"><tr><th>日付</th><th>レース</th><th>馬</th><th>人気</th><th>着順</th></tr>${j.history.slice(0, 80).map(r => `<tr><td class="small">${UI.newsDate(r)}</td><td class="small">${r.grade ? `<span class="grade ${r.grade}">${r.grade}</span> ` : ''}${e(r.race)}</td><td>${e(r.horse)}</td><td class="num">${r.pop}</td><td class="num ${r.pos <= 3 ? 'pos' + r.pos : ''}">${r.pos}着</td></tr>`).join('')}</table></div>` : '<div class="panel empty">まだ騎乗していません。</div>';
    }
    return `<div class="tabs mt">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="jtab" data-tab="${k}">${l}</button>`).join('')}</div>${body}`;
  };

  // ---------- 新しく始める（騎手か、馬主・生産者か） ----------
  const newgame0 = S.newgame;
  S.newgame = function (st) {
    // 馬主・生産者の遊び方は選べなくした（持ち主の決定 2026-10-15。前のセーブは「つづきから」で遊べる）
    void newgame0;
    const pick = '';
    return pick + `<div class="panel gold" style="margin-top:12px">
      <h3 class="serif" style="margin:0 0 12px;color:var(--gold2);font-size:22px">新人騎手としてデビューする</h3>
      <div class="field"><label>騎手の名前</label><input id="ng-jname" maxlength="10" value="${e(st.jname || '')}" placeholder="例：青空 翔"></div>
      <div class="field"><label>所属</label><select id="ng-region">${J.REGIONS.map(r => `<option ${st.region === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
      <div class="small muted">1989〜2026年に走った名馬が、年代に関係なく毎年デビューしてくる。馬の店で買い、自分で乗って勝とう。自分の馬が名馬の戦績に合わせた条件にリーチをかけると、1989年より前のスペシャルホースが出てくる。</div>
      <div class="btns mt"><button class="btn gold" data-act="newgame-jockey">デビューする</button><button class="btn" data-act="title">もどる</button></div>
    </div>`;
  };
  const act = App.act;
  const readJ = () => { const ng = App.st.ng; const n = document.querySelector('#ng-jname'); if (n) { ng.jname = n.value; ng.region = document.querySelector('#ng-region').value; const yy = document.querySelector('#ng-year'); if (yy) ng.year = +yy.value; } };
  act['ng-mode'] = d => { readJ(); App.st.ng.mode = d.m; App.render(); };
  act['newgame-jockey'] = () => {
    readJ();
    const ng = App.st.ng;
    const name = (ng.jname || '').trim() || '青空 翔';
    W.newGame({ mode: 'jockey', jockeyName: name, name, region: ng.region || '美浦', year: ng.year || 1995 });
    App.save();
    App.st.screen = 'game'; App.st.tab = 'home'; App.st.view = null; App.st.stack = []; App.navAnim = 'tab';
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
    if (W.get().gameOver) { App.toast('シーズンは終わりました。「はじめから」で新しく始められます。'); return; }
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
      const G0 = W.get(), tr0 = Object.keys(G0.trophies || {}), un0 = (G0.unlocked || []).slice();
      const report = W.finishWeek(played);
      W.lastReport = report;
      App.save();
      for (const r of report.races.filter(x => x.ride)) {
        if (r.ridden) await resultOf(r);
        else await App.playRace(r, false);
      }
      // トロフィーを手にした・スペシャルホースを破った：大きな見せ場
      const G1 = W.get();
      for (const id of Object.keys(G1.trophies || {}).filter(k => !tr0.includes(k))) {
        const t = HS.Trophy && HS.Trophy.BY[id], got = G1.trophies[id];
        if (t) await UI.celebrate({ kind: 'trophy', kicker: 'トロフィーを手にした', title: t.label, name: got.horse, sub: got.bonus ? `ボーナス賞金 ${U.money(got.bonus)}` : '' });
      }
      const beat = (G1.unlocked || []).filter(n => !un0.includes(n));
      if (beat.length) await UI.celebrate({ kind: 'special', kicker: 'スペシャルホースを破った', title: beat.join('・'), sub: `${beat.join('・')}が馬の店に並ぶようになった` });
      // 12月1週：グランドフィナーレの招待が届いたら、出るかどうか（出るなら1頭）を決める
      if (UI.dreamAsk && T.dcPending()) await UI.dreamAsk();
      App.weekSummary(report);
      App.render();
    } catch (err) {
      console.error(err);
      App.toast('エラー：' + err.message);
    } finally { busy = false; }
  };
  // パドック：1頭ずつ横から歩く姿（←→で切り替え）と、下の帯（馬番・馬名・性齢・斤量・騎手・単勝・気配）。出走表と、自分で乗るか・おまかせか
  UI.mood = (h, wIdx) => {
    const lv = T.condLevel(h, wIdx), mind = H.cur(h, wIdx).mind || 60;
    const rr = U.hashRng(`pd:${h.id}:${wIdx}`).next();
    if (lv >= 6) return { text: '覇気がない', cls: 'bad', jitter: 0, slow: 0.7 };
    if (mind < 55 && rr < 0.5) return { text: 'イレ込んでいる', cls: 'bad', jitter: 1, slow: 1.35 };
    if (lv === 2) return { text: '気合十分', cls: 'good', jitter: 0.25, slow: 1.1 };
    if (lv <= 1) return { text: '太め残り', cls: '', jitter: 0, slow: 0.85 };
    if (lv >= 4) return { text: '少し硬い', cls: '', jitter: 0.1, slow: 0.9 };
    return { text: '落ち着いている', cls: 'good', jitter: 0, slow: 1 };
  };
  function paddock(card, runner) {
    if (HS.Audio) HS.Audio.bgm('paddock');
    return new Promise(res => {
      const h = runner.horse;
      const wIdx = W.prepareWeek().wIdx;
      const rows = card.runners.slice().sort((a, b) => a.num - b.num);
      let sel = rows.indexOf(runner); if (sel < 0) sel = 0;
      const tip = h.style === '逃げ' ? 'ハナを切って、そのまま粘らせてください。' : h.style === '先行' ? '好位につけて、直線で抜け出してください。' : h.style === '差し' ? '中団で脚をためて、直線勝負でお願いします。' : '後ろで脚をためて、最後に外から。';
      const kireTip = (h.kire || 4) >= 6 ? '切れる脚があるので、仕掛けは我慢してください。' : (h.kire || 4) <= 3 ? 'エンジンのかかりが遅いので、早めに動いてください。' : '';
      const bg = App.modal(`<div class="paddock"><canvas class="pd-cv" width="720" height="250"></canvas>
          <button class="pd-nav l" data-d="-1" aria-label="前の馬">◀</button><button class="pd-nav r" data-d="1" aria-label="次の馬">▶</button>
          <div class="pd-band"></div></div>
        ${UI.entryTable(card)}
        <div class="panel mt offer"><div class="row"><b>${e(h.name)}</b><span class="small muted">${e(J.trainerOf(h))}調教師より</span></div>
          <div class="comment">「${tip}${kireTip}」</div>
          ${UI.hasSkills(h) ? `<div class="pd-myskills mt">${UI.skillList(h)}</div>` : ''}${UI.numStats(h, wIdx, { surface: card.race.surface })}</div>
        <div class="btns mt"><button class="btn gold" data-x="ride">ゲートイン（自分で乗る）</button><button class="btn" data-x="auto">おまかせで乗る</button></div>`, { noClose: true, scene: 'paddock' });
      const cv = bg.querySelector('.pd-cv'), ctx = cv.getContext('2d'), band = bg.querySelector('.pd-band');
      const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
      cv.width = 720 * dpr; cv.height = 250 * dpr; ctx.scale(dpr, dpr);
      let alive = true, t0 = performance.now(), x0 = -80;
      const pdSrc = HS.ASSETS && HS.ASSETS.ui_bg_paddock;
      const pdImg = pdSrc ? (UI._pdImg || (UI._pdImg = Object.assign(new Image(), { src: pdSrc }))) : null;
      const show = () => {
        const x = rows[sel], m = UI.mood(x.horse, wIdx), me = x === runner;
        band.innerHTML = `${UI.waku(x.frame, x.num)}<b class="nm ${me ? 'me' : ''}">${e(x.horse.name)}</b><span>${x.horse.gelding ? 'セ' : x.horse.sex}${W.get().year - x.horse.born}</span><span>${x.weight}kg</span><span>${e(x.jockey ? x.jockey.name : '')}</span><span>単勝 <b>${x.odds}</b>（${x.pop}番人気）</span><span class="md ${m.cls}">${m.text}</span>${me ? UI.condMark(x.horse, wIdx) : ''}<div class="pd-skills">${UI.hasSkills(x.horse) ? UI.skillChips(x.horse) : '<span class="small muted">特殊能力なし</span>'}</div>`;
        x0 = -80; t0 = performance.now();
      };
      const move = d => { sel = (sel + d + rows.length) % rows.length; show(); };
      bg.querySelectorAll('.pd-nav').forEach(b => { b.onclick = () => move(+b.dataset.d); });
      const key = ev => { if (ev.key === 'ArrowLeft') move(-1); else if (ev.key === 'ArrowRight') move(1); };
      window.addEventListener('keydown', key);
      const draw = now => {
        if (!alive) return;
        const t = (now - t0) / 1000, x = rows[sel], m = UI.mood(x.horse, wIdx);
        // 地面・柵・植え込み（背景の写真が読めれば、木立の写真の前に周回路と柵を置く）
        if (pdImg && pdImg.complete && pdImg.naturalWidth) {
          const iw = pdImg.naturalWidth, ih = pdImg.naturalHeight, sh = iw * 250 / 720;
          ctx.drawImage(pdImg, 0, ih * 0.3, iw, sh, 0, 0, 720, 250);
          const g = ctx.createLinearGradient(0, 120, 0, 250); g.addColorStop(0, 'rgba(201,180,138,0)'); g.addColorStop(0.35, 'rgba(190,166,120,.92)'); g.addColorStop(1, 'rgba(160,136,94,1)');
          ctx.fillStyle = g; ctx.fillRect(0, 120, 720, 130);
          ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, 0, 720, 250);
        } else {
          ctx.fillStyle = '#8fc4e8'; ctx.fillRect(0, 0, 720, 90);
          ctx.fillStyle = '#5c8f4a'; for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.arc(30 + i * 62, 92, 34, Math.PI, 0); ctx.fill(); }
          ctx.fillStyle = '#c9b48a'; ctx.fillRect(0, 90, 720, 160);
          ctx.fillStyle = '#b39c6e'; ctx.fillRect(0, 210, 720, 40);
        }
        ctx.strokeStyle = '#f2f2f2'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 112); ctx.lineTo(720, 112); ctx.moveTo(0, 128); ctx.lineTo(720, 128); ctx.stroke();
        for (let i = 0; i < 13; i++) { ctx.fillStyle = '#f2f2f2'; ctx.fillRect(i * 60, 104, 5, 34); }
        // 歩く馬（気配で歩き方が変わる：イレ込むと首を振って小走り、覇気がないとゆっくり）
        const sp = 70 * m.slow;
        const px = (x0 + 480 + t * sp) % 880 - 80;
        const jit = m.jitter ? Math.sin(t * 9) * 3 * m.jitter : 0;
        const ph = (t * 0.9 * m.slow) % 1;
        A.horse(ctx, px, 196 + jit, 1.25, ph, { coat: x.horse.coat, marks: A.marks(x.horse.name || x.horse.id), jockey: false, shadow: true });
        // 引く人
        ctx.fillStyle = '#2a3a5a'; ctx.fillRect(px + 70, 150, 12, 34); ctx.fillStyle = '#e8c8a0'; ctx.beginPath(); ctx.arc(px + 76, 143, 7, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2a3a5a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px + 72, 186); ctx.lineTo(px + 70 + Math.sin(t * 5) * 5, 208); ctx.moveTo(px + 80, 186); ctx.lineTo(px + 82 - Math.sin(t * 5) * 5, 208); ctx.stroke();
        ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px + 72, 160); ctx.lineTo(px + 52, 150); ctx.stroke();
        // 馬番のゼッケン
        ctx.fillStyle = HS.DATA.frameColors[(x.frame - 1) % 8]; ctx.fillRect(px - 14, 158, 26, 20);
        ctx.fillStyle = HS.DATA.frameText[(x.frame - 1) % 8]; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(x.num), px - 1, 169);
        requestAnimationFrame(draw);
      };
      show(); requestAnimationFrame(draw);
      const done = how => { alive = false; window.removeEventListener('keydown', key); App.closeModal(); res(how); };
      bg.querySelector('[data-x=ride]').onclick = () => done('ride');
      bg.querySelector('[data-x=auto]').onclick = () => done('auto');
    });
  }
  // ---------- レース前の画面：出走表（脚質・人気・近走）・展開予想・コース図 ----------
  const STYLE_CLS = { '逃げ': 'nige', '先行': 'sen', '差し': 'sashi', '追込': 'oi' };
  UI.courseSvg = function (race) {
    const course = HS.DATA.courses[race.course] || HS.DATA.courses['東京'];
    const cf = HS.Track.forRace(race), geo = cf.geo, tr = cf.track;
    const prof = !tr.flat, W0 = 220, H0 = prof ? 150 : 120, pad = 14, HM = 120;
    const sc = Math.min((W0 - pad * 2) / (tr.a + 2 * tr.r), (HM - pad * 2) / (2 * tr.r));
    const P = sx => { const p = tr.at(sx); return [(W0 / 2 + p.x * sc).toFixed(1), (HM / 2 + p.y * sc).toFixed(1)]; };
    // 高低差（スタートからゴールまで。左がスタート）
    let profSvg = '', hd = 0;
    if (prof) {
      const hs = []; for (let k = 0; k <= 60; k++) hs.push(tr.hAt(race.dist * (1 - k / 60)));
      const h0 = Math.min(...hs), h1 = Math.max(...hs); hd = h1 - h0;
      const hy = h => (H0 - 6 - (h - h0) / Math.max(4, hd) * 22).toFixed(1);
      profSvg = `<polyline points="${hs.map((h, k) => `${(pad + (W0 - pad * 2) * k / 60).toFixed(1)},${hy(h)}`).join(' ')}" fill="none" stroke="#c8d3e2" stroke-width="1.5"/>`;
      hd = Math.round(hd * 10) / 10;
    }
    const pts = []; for (let k = 0; k <= 80; k++) pts.push(P(tr.L * k / 80).join(','));
    const [gx, gy] = P(0), [sx, sy] = P(race.dist);
    return `<svg viewBox="0 0 ${W0} ${H0}" class="course-svg" role="img" aria-label="コース図">
      <polyline points="${pts.join(' ')}" fill="none" stroke="${race.surface === 'ダ' ? '#b88a57' : '#59a84f'}" stroke-width="7" stroke-linejoin="round"/>
      <line x1="${gx}" y1="${+gy - 8}" x2="${gx}" y2="${+gy + 8}" stroke="#fff" stroke-width="2.5"/><text x="${gx}" y="${+gy + 18}" fill="#fff" font-size="9" text-anchor="middle">ゴール</text>
      <circle cx="${sx}" cy="${sy}" r="5" fill="#ffd34d" stroke="#000"/><text x="${sx}" y="${+sy - 8}" fill="#ffd34d" font-size="9" text-anchor="middle">スタート</text>
      <text x="6" y="12" fill="#c8d3e2" font-size="9">${course.dir}回り${geo.loop && !tr.line ? `（${geo.loop}回り）` : ''}・直線 ${geo.straight}m・${prof ? `高低差 ${hd}m` : `坂 ${geo.slope}`}</text>${profSvg}</svg>`;
  };
  // 脚質の矢印（逃げ・先行・差し・追込の4つ。光っているのがこの馬の脚質）
  UI.kyakuArrows = st => `<span class="ka" title="${e(st)}">${['逃げ', '先行', '差し', '追込'].map(k => `<i class="${k === st ? 'on' : ''}"></i>`).join('')}</span>`;
  UI.entryTable = function (card) {
    const { race, runners } = card;
    const G = race.free || !W.get() ? { year: race.year, month: race.month, week: race.week, seed: 0 } : W.get(); // フリーレースはセーブの年でなく、そのレースの年で
    const rows = runners.slice().sort((a, b) => a.num - b.num);
    const cnt = { '逃げ': 0, '先行': 0, '差し': 0, '追込': 0 };
    for (const x of runners) cnt[x.horse.style] = (cnt[x.horse.style] || 0) + 1;
    const pace = cnt['逃げ'] >= 2 ? 'ハイペース' : cnt['逃げ'] === 0 ? 'スローペース' : '平均ペース';
    const favor = pace === 'ハイペース' ? '差し・追込に向く。仕掛けは遅めに' : pace === 'スローペース' ? '逃げ・先行に向く。仕掛けは早めに' : '力どおりの流れ';
    const recent = h => (h.results || []).slice(-3).map(r => `<span class="${r.pos <= 3 ? 'pos' + r.pos : ''}">${r.pos > 9 ? '×' : r.pos}</span>`).join('') || '<span class="muted">新</span>';
    return `<div class="entry">
      <div class="entry-head"><div>${UI.gradeTag(race)} <b class="serif" style="font-size:20px">${e(race.short || race.name)}</b></div>
        <div class="small">${race.free ? '' : `${W.yLabel(G.year)}${race.month}月 `}${race.course} ${race.surface === 'ダ' ? 'ダート' : '芝'}${race.dist}m　${(w => `${T.weatherIcon(w)}${w}`)(race.weather || T.weather(G.seed, G.year, G.month, G.week, race.course, race.ground))}・${race.ground}　${runners.length}頭</div></div>
      <div class="entry-top">${UI.courseSvg(race)}
        <div class="tenkai"><div class="small muted">展開予想</div><div class="big">${pace}</div><div class="small">${favor}</div>
          <div class="kyaku-cnt">${Object.entries(cnt).map(([k, v]) => `<span class="kyaku ${STYLE_CLS[k]}">${k[0]}</span>${v}`).join(' ')}</div></div></div>
      <div class="tblwrap mt"><table class="t entry-t"><tr><th>枠</th><th>馬名</th><th>脚質</th><th class="hide-sm">性齢</th><th class="hide-sm">斤量</th><th>騎手</th><th>人気</th><th>近走</th></tr>
      ${rows.map(x => { const me = x.rider === 'P' || x.mine; return `<tr class="${me ? 'mine' : ''}"><td>${UI.waku(x.frame, x.num)}</td>
        <td class="nm">${e(x.horse.name)}${x.horse.legend ? ' <span class="chip legend">スペシャル</span>' : x.horse.hist ? ' <span class="chip hist">史</span>' : ''}</td>
        <td>${UI.kyakuArrows(x.horse.style)}<div class="small muted">${e(x.horse.style)}</div></td>
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
      if (me && me.pos === 1 && AU) { App.inRace = true; AU.playOnce('victory').then(() => { App.inRace = false; AU.bgm('home'); }); }
      const show = () => {
        const bg = App.modal(`${head}${UI.resultTable(slim)}<div class="btns mt"><button class="btn gold" data-x="ok">次へ</button></div>`, { noClose: true, scene: 'result' });
        const cv = bg.querySelector('.winner-cv');
        if (cv && me) A.winner(cv, me.horse, HS.RaceView.silksOf(me.horse), `${r.race.short || r.race.name} 優勝`, `${me.horse.name}　${U.time(me.time)}　騎手 ${J.me().name}`);
        bg.querySelector('[data-x=ok]').onclick = () => { App.closeModal(); res(); };
      };
      if (me && me.pos === 1 && r.race.graded) UI.celebrate(UI.winFx(r.race, me.horse.name, me.time, J.me().name)).then(show);
      else show();
    });
  }

  // ---------- 見せ場：重賞の優勝・トロフィー・スペシャルホース（光の筋・紙吹雪・大きな題字。押すと閉じる） ----------
  UI.winFx = (race, name, time, jockey) => ({ kind: 'win', kicker: `${(R.gradeBadge && R.gradeBadge(race)) || '重賞'} 優勝`, title: race.short || race.name, name, sub: `${U.time(time)}　騎手 ${jockey || ''}` });
  UI.celebrate = function (o) {
    return new Promise(res => {
      const AU = HS.Audio;
      const el = document.createElement('div');
      el.className = `fx fx-${o.kind || 'win'}`;
      el.setAttribute('role', 'dialog');
      const img = App.bgUrl(o.kind === 'trophy' ? 'title' : 'result');
      el.innerHTML = `<div class="fx-bg" style="${img ? `background-image:${e(img)}` : ''}"></div><div class="fx-rays"></div><canvas class="fx-cf"></canvas>
        <div class="fx-body"><div class="fx-badge">${o.kind === 'trophy' ? '🏆' : o.kind === 'special' ? '★' : '👑'}</div>
          <div class="fx-kicker">${e(o.kicker || '')}</div><div class="fx-title">${e(o.title || '')}</div>
          ${o.name ? `<div class="fx-name">${e(o.name)}</div>` : ''}${o.sub ? `<div class="fx-sub">${e(o.sub)}</div>` : ''}
          <div class="fx-tap">クリック・Enter で次へ</div></div>`;
      document.body.appendChild(el);
      if (AU) { AU.se('skill'); if (o.kind !== 'win') setTimeout(() => AU.se('coin'), 380); }
      // 紙吹雪（動きを減らす設定では、散った形を1枚だけ描く）
      const cv = el.querySelector('.fx-cf'), ctx = cv.getContext('2d');
      const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
      const W0 = cv.clientWidth || innerWidth, H0 = cv.clientHeight || innerHeight;
      cv.width = W0 * dpr; cv.height = H0 * dpr; ctx.scale(dpr, dpr);
      const rnd = App.fxRand(o.title ? o.title.length * 97 : 3), still = App.reduced();
      const cols = o.kind === 'special' ? ['#c9a2ff', '#ffd34d', '#ffffff', '#8a5cf0'] : ['#ffd34d', '#f6e1a0', '#ffffff', '#e8b23a', o.kind === 'trophy' ? '#ffcf6b' : '#ff7d70'];
      const ps = []; for (let i = 0; i < 160; i++) ps.push({ x: rnd() * W0, y: still ? rnd() * H0 : -rnd() * H0 * 0.9, vx: (rnd() - 0.5) * 60, vy: 90 + rnd() * 160, r: rnd() * 6, vr: (rnd() - 0.5) * 9, w: 5 + rnd() * 6, c: cols[i % cols.length] });
      let alive = true, last = null;
      const draw = ts => {
        if (!alive) return;
        const dt = last == null ? 0 : Math.min(0.05, (ts - last) / 1000); last = ts;
        ctx.clearRect(0, 0, W0, H0);
        for (const p of ps) {
          p.x += (p.vx + Math.sin(p.y / 40) * 30) * dt; p.y += p.vy * dt; p.r += p.vr * dt;
          if (p.y > H0 + 20) { p.y = -20; p.x = rnd() * W0; }
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(1, Math.cos(p.r * 1.7));
          ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2); ctx.restore();
        }
        if (!still) requestAnimationFrame(draw);
      };
      requestAnimationFrame(draw);
      const t0 = performance.now();
      const close = ev => {
        if (ev && ev.type === 'keydown' && !['Enter', ' ', 'Escape'].includes(ev.key)) return;
        if (performance.now() - t0 < 700) return; // 開いた勢いで閉じない
        alive = false; window.removeEventListener('keydown', close);
        el.classList.add('out'); setTimeout(() => { el.remove(); res(); }, App.reduced() ? 0 : 280);
      };
      el.addEventListener('click', close); window.addEventListener('keydown', close);
      // ゲームパッドのボタンでも閉じる（押しっぱなしで開いた分は、いったん離してから）
      let held = true;
      const pad = () => {
        if (!alive) return;
        const any = [...(navigator.getGamepads ? navigator.getGamepads() : [])].some(g => g && g.buttons.some(b => b.pressed));
        if (!any) held = false; else if (!held) close();
        setTimeout(pad, 60);
      };
      pad();
    });
  };
})();
