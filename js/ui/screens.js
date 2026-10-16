// 画面の中身（HTML を返す）。操作は data-act で app.js に渡す
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse, W = HS.World, R = HS.Races, P = HS.Ped;
  const UI = HS.UI = HS.UI || {};
  const e = U.esc;
  const S = UI.screens = {};

  // ---------- 小物 ----------
  // 日付の見せ方（年代なしのゲームは「n年目」）
  UI.newsDate = n => { const G = W.get(); return G && G.eraless ? `${n.y - G.startYear + 1}年目 ${n.m}/${n.w}` : `${n.y}/${n.m}-${n.w}`; };
  UI.ym = (y, m) => { const G = W.get(); return G && G.eraless ? `${y - G.startYear + 1}年目 ${m}月` : `${y}/${m}`; };
  UI.waku = (frame, num) => { const c = HS.DATA.frameColors[(frame - 1) % 8], t = HS.DATA.frameText[(frame - 1) % 8]; return `<span class="waku" style="background:${c};color:${t}">${num}</span>`; };
  UI.gradeTag = r => { const b = R.gradeBadge(r); if (!b) return ''; const cls = b.startsWith('Jpn') ? 'Jpn' : b === '重賞' ? 'Pre' : b; return `<span class="grade ${cls}">${b}</span>`; };
  UI.surf = s => `<span class="chip ${s === 'ダ' ? 'dirt' : 'turf'}">${s === 'ダ' ? 'ダート' : '芝'}</span>`;
  UI.age = h => `${h.gelding ? 'セ' : h.sex}${W.get().year - h.born}`;
  UI.yen = m => `<span class="${m < 0 ? 'neg' : ''}">${U.money(m)}</span>`;
  UI.condTag = h => { const c = H.condLabel(h.cond || 0); return `<span class="cond ${c.cls}">${c.icon} ${c.text}</span>`; };
  UI.fatigue = h => `<div class="bar" title="疲れ"><i style="width:${Math.round(h.fatigue || 0)}%"></i></div>`;
  UI.aptMark = v => v >= 90 ? '◎' : v >= 75 ? '○' : v >= 60 ? '△' : '×';
  UI.horseLink = (h, text) => `<a href="#" data-act="horse" data-id="${h.id}">${e(text || W.displayName(h))}</a>`;
  UI.histMark = h => h.hist ? '<span class="chip hist">史実</span>' : '';
  UI.thumb = h => `<canvas class="thumb" width="168" height="112" data-art="thumb" data-id="${h.id}"></canvas>`;

  UI.header = function () {
    const G = W.get();
    return `<div class="hdr">
      <div class="cal"><div class="y">${W.yLabel(G.year)}</div><div class="mw">${G.month}<small>月</small>${G.week}<small>週</small></div></div>
      <div class="hinfo"><div class="farm">${e(G.player.farm)}・${e(G.player.name)}</div><div class="money ${G.player.money < 0 ? 'neg' : ''}">${U.money(G.player.money)}</div></div>
      <button class="btn-next" data-act="next">次の週へ<small>▶ ${G.week === 4 ? (G.month === 12 ? '新年' : (G.month + 1) + '月') : G.month + '月' + (G.week + 1) + '週'}</small></button>
    </div>`;
  };
  UI.nav = function (tab) {
    const items = [['home', '🏠', 'ホーム'], ['stable', '🐎', '厩舎'], ['farm', '🌾', '牧場'], ['market', '💰', '市場'], ['races', '🏆', 'レース'], ['records', '📜', '記録'], ['menu', '⚙', 'メニュー']];
    return `<nav class="nav"><div class="in">${items.map(([k, ic, lb]) => `<button data-act="tab" data-tab="${k}" class="${tab === k ? 'on' : ''}"><span class="ic">${ic}</span>${lb}</button>`).join('')}</div></nav>`;
  };

  // ---------- タイトル ----------
  S.title = function (open) {
    return `<div class="title ${open ? 'open' : ''}" ${open ? '' : 'data-act="title-open"'}>
      <div class="t-flare" aria-hidden="true"></div>
      <div class="t-head">
        <div class="logo"><span>ターフの系譜</span></div>
        <div class="logo-sub">TURF DYNASTY</div>
      </div>
      <canvas id="title-cv" aria-hidden="true"></canvas>
      ${open ? `<div class="btns t-menu">
        ${W.hasLocal() ? '<button class="btn gold" data-act="continue">つづきから</button>' : ''}
        <button class="btn ${W.hasLocal() ? '' : 'gold'}" data-act="newgame-form">はじめから</button>
        <button class="btn" data-act="import">セーブを読み込む</button>
        <button class="btn" data-act="editor">競走馬エディット</button>
        <button class="btn" data-act="credits">クレジット</button>
        <button class="btn" data-act="sound">${HS.Audio && HS.Audio.settings.bgm + HS.Audio.settings.se > 0 ? '🔊 音：あり' : '🔇 音：なし'}</button>
      </div>
      <p class="small muted t-lead">実在の名馬と実在のレースに、騎手として乗る。新人騎手から始めて、リーディングと大レースを目指す。</p>`
      : '<div class="t-press">クリック・Enter でスタート</div>'}
    </div>`;
  };

  S.newgame = function (st) {
    const years = []; for (let y = 1960; y <= 2025; y++) years.push(y);
    const cols = ['#1f4fbf', '#c8102e', '#ffd100', '#00843d', '#ffffff', '#111111', '#ff6a13', '#7a2182', '#e04e9a', '#5bc2e7', '#8a5a2b', '#a4d65e'];
    const sk = st.silks;
    return `<div class="panel gold" style="margin-top:20px">
      <h3 class="serif" style="margin:0 0 12px;color:var(--gold2);font-size:22px">新しく始める</h3>
      <div class="field"><label>馬主の名前</label><input id="ng-name" maxlength="12" value="${e(st.name)}"></div>
      <div class="field"><label>牧場の名前</label><input id="ng-farm" maxlength="14" value="${e(st.farm)}"></div>
      <div class="field"><label>冠名（生まれた馬の名前の頭に付ける。空でもよい）</label><input id="ng-crown" maxlength="5" value="${e(st.crown)}" placeholder="例：ターフ"></div>
      <div class="field"><label>開始年</label><select id="ng-year">${years.map(y => `<option ${y === st.year ? 'selected' : ''}>${y}</option>`).join('')}</select>
        <div class="small muted">その年に生きている実在の馬が走り、まだデビュー前の史実馬は市場で買える。</div></div>
      <div class="field"><label>資金</label><select id="ng-diff">
        <option value="easy" ${st.diff === 'easy' ? 'selected' : ''}>たっぷり（今の5億円ぶん）</option>
        <option value="normal" ${st.diff === 'normal' ? 'selected' : ''}>ふつう（今の3億円ぶん）</option>
        <option value="hard" ${st.diff === 'hard' ? 'selected' : ''}>きびしい（今の1億円ぶん）</option></select>
        <div class="small muted">昔の年から始めると、その時代の物価に合わせて減ります。</div></div>
      <div class="field"><label>勝負服</label>
        <div class="row"><canvas id="ng-silks" width="80" height="80" style="width:64px;height:64px;background:#0c1a2c;border-radius:8px"></canvas>
          <div class="grow">
            <div class="small muted">地の色</div><div class="colors">${cols.map(c => `<button style="background:${c}" class="${sk.base === c ? 'on' : ''}" data-act="ng-color" data-k="base" data-c="${c}"></button>`).join('')}</div>
            <div class="small muted" style="margin-top:6px">模様の色</div><div class="colors">${cols.map(c => `<button style="background:${c}" class="${sk.sub === c ? 'on' : ''}" data-act="ng-color" data-k="sub" data-c="${c}"></button>`).join('')}</div>
          </div></div>
        <div class="btns mt">${Object.entries(HS.Art.SILK_PATTERNS).map(([k, v]) => `<button class="btn sm ${sk.pattern === k ? 'gold' : ''}" data-act="ng-pattern" data-p="${k}">${v}</button>`).join('')}</div>
      </div>
      <div class="btns mt"><button class="btn gold" data-act="newgame-start">この内容で始める</button><button class="btn" data-act="title">もどる</button></div>
    </div>`;
  };

  // ---------- ホーム ----------
  S.home = function () {
    const G = W.get();
    const races = W.weekRaces();
    const mineIn = Object.entries(G.entries).flatMap(([k, arr]) => arr.map(x => ({ race: W.raceByKey(k), h: W.horse(x.horseId), jockey: x.jockey }))).filter(x => x.race && x.h);
    const graded = races.filter(r => r.graded);
    const up = W.upcomingGraded(12).filter(r => r.grade === 'G1' && r.inWeeks > 0 && r.region !== '海外').slice(0, 6);
    const stable = W.mine('stable');
    const idle = stable.filter(h => !W.entryOf(h.id) && !h.injury && !h.auto);
    const tips = [];
    if (W.canBreed() && W.mine('mare').some(m => !(m.cover && m.cover.year === G.year && m.cover.ok))) tips.push('<a href="#" data-act="tab" data-tab="farm">種付けがまだの繁殖牝馬がいます</a>');
    const ready = W.mine('farm').filter(h => G.year - h.born === 2 && G.month >= 4);
    if (ready.length) tips.push(`<a href="#" data-act="tab" data-tab="farm">入厩できる2歳馬が${ready.length}頭います</a>`);
    if (!stable.length && !ready.length) tips.push('<a href="#" data-act="tab" data-tab="market">市場で馬を買ってみよう</a>');
    return `
      ${tips.length ? `<div class="panel gold mt">${tips.map(t => `<div>📌 ${t}</div>`).join('')}</div>` : ''}
      <div class="row mt"><span class="small muted grow">おまかせの馬が多いときは、まとめて進めると早い（映像は出ない）。</span><button class="btn sm" data-act="next-many">4週まとめて進める</button></div>
      <h2 class="sec">今週の出走<span class="r">${G.month}月${G.week}週</span></h2>
      ${mineIn.length ? `<div class="list">${mineIn.map(x => `<div class="card" data-act="horse" data-id="${x.h.id}">
          ${UI.thumb(x.h)}
          <div class="grow"><div class="nm">${e(x.h.name)}</div><div class="sub">${UI.gradeTag(x.race)} ${e(R.label(x.race))}　${x.race.course}${x.race.surface}${x.race.dist}m　騎手：${e(x.jockey)}</div></div></div>`).join('')}</div>`
        : `<div class="panel empty">今週の出走登録はありません。${idle.length ? `<br><a href="#" data-act="tab" data-tab="stable">厩舎で出走を決める（${idle.length}頭が空いています）</a>` : ''}</div>`}
      <h2 class="sec">今週の重賞</h2>
      ${graded.length ? `<div class="panel"><table class="t">${graded.map(r => `<tr><td>${UI.gradeTag(r)}</td><td><b>${e(R.label(r))}</b></td><td class="small">${r.course} ${UI.surf(r.surface)} ${r.dist}m</td><td class="small muted hide-sm">${ageCond(r)}</td></tr>`).join('')}</table></div>` : '<div class="panel empty">今週は重賞がありません。</div>'}
      <h2 class="sec">これからのG1</h2>
      <div class="panel"><table class="t">${up.map(r => `<tr><td class="small muted">${r.inWeeks}週後</td><td>${UI.gradeTag(r)}</td><td><b>${e(R.label(r))}</b></td><td class="small">${r.course} ${UI.surf(r.surface)} ${r.dist}m</td></tr>`).join('') || '<tr><td class="muted">なし</td></tr>'}</table></div>
      <h2 class="sec">ニュース</h2>
      <ul class="news">${G.news.slice(0, 30).map(n => `<li class="${n.kind}"><span class="d">${UI.newsDate(n)}</span>${e(n.text)}</li>`).join('')}</ul>`;
  };
  function ageCond(r) {
    const a = { '2': '2歳', '3': '3歳', '3+': '3歳以上', '4+': '4歳以上' }[r.age] || '';
    return a + (r.sex === '牝' ? '牝' : '') + (r.weight ? '・' + r.weight : '');
  }
  UI.ageCond = ageCond;

  // ---------- 厩舎 ----------
  S.stable = function () {
    const G = W.get();
    const list = W.mine('stable').sort((a, b) => a.born - b.born || (b.prize || 0) - (a.prize || 0));
    const rest = W.mine('farm').filter(h => G.year - h.born >= 3 || (h.starts || 0) > 0);
    return `
      <h2 class="sec">厩舎<span class="r">${list.length}頭・月の預託料 ${U.money(list.length * 60)}</span></h2>
      ${list.length ? `<div class="list">${list.map(h => stableCard(h)).join('')}</div>` : '<div class="panel empty">入厩している馬がいません。2歳の4月から、牧場の若駒を入厩させられます。</div>'}
      ${rest.length ? `<h2 class="sec">放牧中</h2><div class="list">${rest.map(h => stableCard(h, true)).join('')}</div>` : ''}`;
  };
  function stableCard(h, farm) {
    const ent = W.entryOf(h.id);
    const race = ent && W.raceByKey(ent.raceKey);
    const cls = H.className(H.classOf(h), W.get().year);
    return `<div class="card" data-act="horse" data-id="${h.id}">
      ${UI.thumb(h)}
      <div class="grow">
        <div class="row"><span class="nm ell">${e(W.displayName(h))}</span>${UI.histMark(h)}${h.auto ? '<span class="chip">おまかせ</span>' : ''}</div>
        <div class="sub">${UI.age(h)}・${cls}・${h.starts || 0}戦${h.wins || 0}勝・${U.money(h.prize || 0)}</div>
        <div class="row small">${h.injury ? `<span style="color:var(--bad)">故障：${e(h.injury.name)}（あと${h.injury.weeks}週）</span>` : UI.condTag(h)}<span class="grow">${UI.fatigue(h)}</span></div>
        <div class="small">${farm ? '<span class="muted">牧場で休養中</span>' : race ? `次走：${UI.gradeTag(race)} <b>${e(R.label(race))}</b>` : '<span class="muted">今週は出走なし</span>'}</div>
      </div></div>`;
  }

  // ---------- 馬の詳細 ----------
  S.horse = function (st) {
    const G = W.get();
    const h = W.horse(st.id);
    if (!h) return '<div class="panel empty">この馬はもういません。</div>';
    const wIdx = W.wIdx();
    const mine = h.owner === 'P';
    const tab = st.htab || (h.loc === 'stable' ? 'train' : 'info');
    const tabs = [['info', '能力'], (h.loc === 'stable' || (G.mode === 'jockey' && h.loc === 'farm')) && mine ? ['train', G.mode === 'jockey' ? '出走' : '調教・出走'] : null, ['results', '戦績'], ['ped', '血統']].filter(Boolean);
    const cls = H.className(H.classOf(h), G.year);
    let body = '';
    if (tab === 'info') body = infoTab(h, wIdx);
    else if (tab === 'train') body = trainTab(h, wIdx, st);
    else if (tab === 'results') body = resultsTab(h);
    else if (tab === 'ped') body = pedTab(h);
    const locLabel = { stable: '入厩中', farm: '牧場', mare: '繁殖牝馬', stud: '種牡馬' }[h.loc] || '';
    return `
      <div class="row mt"><button class="btn sm" data-act="back">← もどる</button><span class="right small muted">${locLabel}</span></div>
      <div class="hero mt"><canvas width="960" height="480" data-art="portrait" data-id="${h.id}"></canvas>
        <div class="plate"><div class="row"><span class="nm">${e(W.displayName(h))}</span>${UI.histMark(h)}</div>
        <div class="pd">${UI.age(h)}　${e(h.coat || '')}　父 ${e(h.sire || '不明')}　母 ${e(h.dam || '不明')}${P.parents(h.dam)[0] ? `（母父 ${e(P.parents(h.dam)[0])}）` : ''}</div>
        <div class="pd">${h.loc === 'stud' ? `種付け料 ${U.money(h.studFee)}` : `${cls}・${h.starts || 0}戦${h.wins || 0}勝（${h.w2 || 0}-${h.w3 || 0}）・獲得 ${U.money(h.prize || 0)}`}</div></div></div>
      ${mine ? actionsBar(h) : ''}
      <div class="tabs">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="htab" data-tab="${k}">${l}</button>`).join('')}</div>
      ${body}`;
  };
  function actionsBar(h) {
    const G = W.get();
    const age = G.year - h.born;
    const b = [];
    if (!h.name) b.push(`<button class="btn sm gold" data-act="name" data-id="${h.id}">名前を付ける</button>`);
    if (h.loc === 'farm' && age >= 2) b.push(`<button class="btn sm gold" data-act="to-stable" data-id="${h.id}">入厩させる</button>`);
    if (h.loc === 'stable') b.push(`<button class="btn sm" data-act="to-farm" data-id="${h.id}">放牧に出す</button>`, `<button class="btn sm ${h.auto ? 'gold' : ''}" data-act="auto" data-id="${h.id}">おまかせ ${h.auto ? 'ON' : 'OFF'}</button>`);
    if ((h.loc === 'stable' || h.loc === 'farm') && (h.starts || 0) > 0) b.push(`<button class="btn sm" data-act="retire" data-id="${h.id}">引退</button>`);
    if (h.loc === 'mare') b.push(`<button class="btn sm gold" data-act="breed" data-id="${h.id}">種付け</button>`);
    b.push(`<button class="btn sm red" data-act="sell" data-id="${h.id}">売却（${U.money(W.sellPrice(h))}）</button>`);
    return `<div class="btns mt">${b.join('')}</div>`;
  }
  function infoTab(h, wIdx) {
    const mine = h.owner === 'P';
    const known = mine || h.hist;
    // 能力は数値で見せる（持ち主の決定 2026-10-15）。自分の馬と史実馬だけ
    const cur = H.cur(h, wIdx);
    const statRow = (label, v) => `<div class="stat"><span class="lb">${label}</span><div class="bar"><i style="width:${v == null ? 0 : U.clamp(v / 110 * 100, 2, 100)}%"></i></div><span class="gr">${v == null ? '?' : Math.round(v)}</span></div>`;
    const stats = H.STATS.map(k => statRow(H.STAT_LABEL[k], known ? cur[k] : null)).join('')
      + statRow('道悪', known ? (h.apt.heavy != null ? h.apt.heavy : 50) : null) + statRow('健康', known ? (h.health != null ? h.health : 70) : null);
    const growthWord = h.growth;
    const peakNote = (() => { const g = H.growthFactor(h, wIdx); if (g >= 0.995) return 'いまが充実期'; const age = H.ageAt(h, wIdx); const p = H.PEAK[h.growth] || H.PEAK['普通']; return age < p[0] ? 'まだ成長途上' : '衰えが見え始めた'; })();
    return `
      ${known && UI.grPanel ? UI.grPanel(h, wIdx) : ''}
      ${h.loc === 'stable' && mine ? `<div class="comment mt">${e(H.comment(h, wIdx))}</div>` : ''}
      <h2 class="sec">能力<span class="r">${known ? 'いまの値' : ''}</span></h2>
      <div class="panel"><div class="stats">${stats}</div></div>
      <h2 class="sec">適性</h2>
      <div class="apt">
        <div>距離<b>${H.distLabel(h.distMin, h.distMax)}</b></div>
        <div>馬場<b>芝 ${UI.aptMark(h.apt.turf)}　ダート ${UI.aptMark(h.apt.dirt)}</b></div>
        <div>道悪<b>${h.apt.heavy >= 75 ? '得意' : h.apt.heavy >= 45 ? 'ふつう' : '苦手'}</b></div>
        <div>脚質<b>${h.style}${known ? '・' + H.kireLabel(h.kire) : ''}</b></div>
        <div>成長型<b>${growthWord}（${peakNote}）</b></div>
        <div>健康<b>${(h.health ?? 70) >= 85 ? '丈夫' : (h.health ?? 70) >= 65 ? 'ふつう' : '弱い'}</b></div>
        ${h.loc === 'stable' ? `<div>状態<b>${h.injury ? '故障中' : UI.condTag(h)}</b></div>` : ''}
      </div>
      ${known && UI.hasSkills(h) ? `<h2 class="sec">特殊能力</h2><div class="panel skills">${UI.skillChips(h)}</div>` : ''}
      ${h.gradedWins.length ? `<h2 class="sec">重賞の勝ち鞍</h2><div class="panel">${h.gradedWins.map(g => `<div>${W.yLabel(g.y)} ${UI.gradeTag({ grade: g.grade, region: g.region, year: g.y })} ${e(g.short || g.race)}${g.hist ? ' <span class="small muted">（開始前）</span>' : ''}</div>`).join('')}</div>` : ''}
      ${h.hist && W.get().settings.showHistNote ? histNote(h) : ''}`;
  }
  // 名馬の解説（市場などから開く）
  UI.histTextModal = function (name) {
    const d = UI.histData(name); if (!d) return '';
    const h = H.fromHistoric(d, 'x');
    return `<h3>${e(d.name)}</h3><div class="small muted">${d.born}年生 ${d.sex}・${e(d.coat || '')}${d.country && d.country !== '日' ? '・' + e(d.country) : ''}　父 ${e(d.sire || '?')}　母 ${e(d.dam || '?')}</div>
      <div class="mt">${UI.histInfo(d)}</div>
      <div class="apt mt"><div>距離<b>${H.distLabel(h.distMin, h.distMax)}</b></div><div>脚質<b>${h.style}・${H.kireLabel(h.kire)}</b></div><div>成長型<b>${h.growth}</b></div></div>
      ${UI.hasSkills(h) ? `<div class="skills mt">${UI.skillChips(h)}</div>` : ''}
      <div class="btns mt"><button class="btn" data-act="close">閉じる</button></div>`;
  };
  // 特殊能力の札。手書きのもの（出るだけで効く）と、能力値から決まる発動型（⚡。得は水色・損は赤茶）
  UI.trigSkills = h => HS.Skills && !h.filler ? HS.Skills.of(h, W.wIdx ? W.wIdx() : null) : [];
  UI.hasSkills = h => (h.skills || []).length > 0 || UI.trigSkills(h).length > 0;
  UI.skillChips = h => (h.skills || []).filter(x => H.SKILLS[x]).map(x => `<span class="chip skill ${H.SKILLS[x].bad ? 'bad' : ''}" title="${e(H.SKILLS[x].note)}">${e(H.SKILLS[x].label)}</span>`).join('')
    + UI.trigSkills(h).map(id => { const k = HS.Skills.BY[id]; return `<span class="chip skill trig ${k.bad ? 'bad' : ''}" title="${e(k.note)}">⚡${e(k.label)}</span>`; }).join('');
  // 史実の名馬の名鑑：年代・戦績・主な勝鞍・解説（data/profiles.js があればそちら。無ければ勝ち鞍から）
  UI.histData = name => W.histByName.get(name) || (HS.Special ? HS.Special.data(name) : null);
  UI.histYears = d => d.years || (d.born && d.retire ? `${Math.floor((d.born + 2 + d.retire) / 2 / 10) * 10}年代` : '');
  UI.histMainWins = function (d) {
    if (d.mainWins) return d.mainWins;
    const big = w => (HS.Special && HS.Special.mapWin(w) ? 0 : 1);
    return (d.wins || []).slice().sort((a, b) => big(a) - big(b)).slice(0, 6).sort().map(w => `${w.slice(0, 4)} ${w.slice(4)}`);
  };
  UI.histInfo = function (d) {
    const mw = UI.histMainWins(d);
    return `<div class="apt hinfo"><div>年代<b>${e(UI.histYears(d))}</b></div>${d.record ? `<div>戦績<b>${e(d.record)}</b></div>` : ''}</div>
      <div class="panel small mt">主な勝鞍：${mw.length ? mw.map(e).join('、') : '重賞の勝ち鞍なし'}${d.note ? `<div class="muted">${e(d.note)}</div>` : ''}</div>
      ${d.text ? `<div class="panel mt horse-text">${e(d.text)}</div>` : ''}`;
  };
  // 特殊能力の一覧（札と、どんなときに効くか）。パドックで自分の馬に
  UI.skillList = h => (h.skills || []).filter(x => H.SKILLS[x]).map(x => [H.SKILLS[x].label, H.SKILLS[x].note, H.SKILLS[x].bad, false])
    .concat(UI.trigSkills(h).map(id => { const k = HS.Skills.BY[id]; return [k.label, k.note, k.bad, true]; }))
    .map(([l, n, bad, trig]) => `<div class="sk-row"><span class="chip skill ${trig ? 'trig' : ''} ${bad ? 'bad' : ''}">${trig ? '⚡' : ''}${e(l)}</span><span class="small">${e(n || '')}</span></div>`).join('');
  function histNote(h) {
    const d = UI.histData(h.name);
    if (!d) return '';
    return `<h2 class="sec">名鑑<span class="r">史実</span></h2>${UI.histInfo(d)}`;
  }
  function trainTab(h, wIdx, st) {
    const G = W.get();
    const races = W.weekRaces();
    const ent = W.entryOf(h.id);
    const elig = races.filter(r => !R.ineligible(h, r, G.year));
    const menu = h.menu || '坂路(馬なり)';
    const sortKey = r => (r.graded ? 0 : 1) * 1000 + Math.abs((r.dist - (h.distMin + h.distMax) / 2) / 100);
    elig.sort((a, b) => sortKey(a) - sortKey(b));
    const fit = r => {
      const surfOk = (r.surface === 'ダ' ? h.apt.dirt : h.apt.turf) >= 75;
      const distOk = r.dist >= h.distMin && r.dist <= h.distMax;
      return (surfOk ? '' : '<span class="small" style="color:var(--warn)">馬場△</span> ') + (distOk ? '' : '<span class="small" style="color:var(--warn)">距離△</span>');
    };
    const jm = G.mode === 'jockey' && HS.Season;
    const upcoming = W.upcomingGraded(jm ? HS.Season.weeksLeft(G) : 16).filter(r => r.inWeeks > 0 && !(jm ? HS.Season.staticIneligible(h, r, r.year) : R.ineligible(Object.assign({}, h, { injury: null }), r, r.year))).slice(0, jm ? 200 : 10);
    const rsv = jm ? HS.Season.reserves(h.id) : [];
    return `
      ${h.loc === 'stable' ? `<div class="comment mt">${e(H.comment(h, wIdx))}</div>` : ''}
      ${jm ? `<div class="panel mt"><div class="row small">調子 ${UI.condTag(h)}<span class="muted">疲れ</span><span class="grow">${UI.fatigue(h)}</span></div><div class="small muted">調教は調教師にまかせています。</div></div>` : `<h2 class="sec">今週の調教<span class="r">${h.lastTrain && h.lastTrain.time ? '前回 ' + e(h.lastTrain.time) : ''}</span></h2>
      <div class="panel">
        ${h.auto ? '<div class="small muted">おまかせ中：調教と出走は自動で決まります。</div>' : ''}
        <div class="menus">${H.MENU_LIST.map(m => `<button class="${menu === m && !h.auto ? 'on' : ''}" data-act="menu" data-id="${h.id}" data-m="${m}">${m}</button>`).join('')}</div>
        <div class="row small mt">調子 ${UI.condTag(h)}<span class="muted">疲れ</span><span class="grow">${UI.fatigue(h)}</span></div>
      </div>`}
      <h2 class="sec">今週のレース<span class="r">${ent ? '登録済み' : elig.length + 'レースに出られる'}</span></h2>
      ${h.loc !== 'stable' ? `<div class="panel empty">まだ入厩していません${jm ? '（2歳の4月から自動で入厩）。先のレースは下で予約できます' : ''}。</div>` : h.injury ? `<div class="panel empty">故障中（${e(h.injury.name)}・あと${h.injury.weeks}週）</div>` : elig.length ? `<div class="tblwrap"><table class="t">
        <tr><th></th><th>レース</th><th>条件</th><th class="hide-sm">馬場</th><th></th></tr>
        ${elig.map(r => {
          const on = ent && ent.raceKey === r.key;
          return `<tr class="${on ? 'mine' : ''}"><td>${UI.gradeTag(r) || '<span class="small muted">条件</span>'}</td>
            <td><b>${e(R.label(r))}</b><div class="small muted">${r.course} ${r.surface}${r.dist}m ${fit(r)}</div></td>
            <td class="small">${ageCond(r)}${r.region === '海外' ? `<br><span style="color:var(--warn)">遠征費 ${U.money(W.travelCost(r))}</span>` : ''}</td>
            <td class="small hide-sm">${r.ground}</td>
            <td>${on ? `<button class="btn sm" data-act="unenter" data-id="${h.id}">取消</button>` : `<button class="btn sm gold" data-act="enter" data-id="${h.id}" data-race="${r.key}">出走</button>`}</td></tr>`;
        }).join('')}</table></div>` : '<div class="panel empty">今週は出られるレースがありません。</div>'}
      ${ent ? `<div class="panel mt"><div class="row"><span>騎手</span><select class="grow" data-act-change="jockey" data-id="${h.id}">${W.ridersForPlayer(G.year).map(j => `<option ${j.name === ent.jockey ? 'selected' : ''} value="${e(j.name)}">${e(j.name)}（腕 ${U.grade(j.skill)}・${j.region === '外国' ? '短期免許' : j.region}）</option>`).join('')}</select></div></div>` : ''}
      ${jm && !(h.starts > 0) && HS.Season.debutWeeks(h).length ? (() => { const dw = HS.Season.debutWeeks(h), cur = rsv.find(x => x.debut); return `<h2 class="sec">デビュー戦の予約</h2>
      <div class="panel row wrap">${cur ? `<span>新馬戦：<b>${W.yLabel(cur.y)}${cur.m}月${cur.w}週</b></span><button class="btn sm" data-act="unreserve" data-id="${h.id}" data-key="${e(cur.key)}">予約取消</button>` : `<select id="debut-week">${dw.map(x => `<option value="${x.y}-${x.m}-${x.w}">${W.yLabel(x.y)}${x.m}月${x.w}週</option>`).join('')}</select><button class="btn sm gold" data-act="reserve-debut" data-id="${h.id}">新馬戦を予約</button>`}<span class="small muted">その週の新馬戦から、馬場と距離の合うものに出ます。</span></div>`; })() : ''}
      <h2 class="sec">この先の重賞（出られるもの）${jm ? '<span class="r">1年先まで予約できる（勝ち上がりなどの条件はその週に確かめる）</span>' : ''}</h2>
      <div class="panel"><table class="t">${upcoming.map(r => { const on = rsv.some(x => x.key === r.key); const busy = !on && rsv.some(x => x.y === r.year && x.m === r.month && x.w === r.week);
        return `<tr class="${on ? 'lead-me' : ''}"><td class="small muted">${r.month}月${r.week}週<br>${r.inWeeks}週後</td><td>${UI.gradeTag(r)}</td><td><b>${e(R.label(r))}</b></td><td class="small">${r.course}${r.surface}${r.dist}m</td>${jm ? `<td>${on ? `<button class="btn sm" data-act="unreserve" data-id="${h.id}" data-key="${e(r.key)}">予約取消</button>` : busy ? '' : `<button class="btn sm gold" data-act="reserve" data-id="${h.id}" data-key="${e(r.key)}">予約</button>`}</td>` : ''}</tr>`; }).join('') || '<tr><td class="muted">なし</td></tr>'}</table></div>`;
  }
  function resultsTab(h) {
    const rs = h.results.slice().reverse();
    if (!rs.length) return '<div class="panel empty">まだ走っていません。</div>';
    return `<div class="tblwrap mt"><table class="t"><tr><th>日付</th><th>レース</th><th>距離</th><th>着</th><th class="hide-sm">人気</th><th>タイム</th><th class="hide-sm">上がり</th><th class="hide-sm">騎手</th></tr>
      ${rs.map(r => `<tr><td class="small">${UI.ym(r.y, r.m)}</td><td>${r.grade ? `<span class="grade ${r.grade.startsWith('Jpn') ? 'Jpn' : r.grade}">${r.grade}</span> ` : ''}${e(r.race)}<div class="small muted">${r.course} ${r.ground}</div></td><td class="small">${r.surface}${r.dist}</td>
        <td class="num ${r.pos <= 3 ? 'pos' + r.pos : ''}">${r.pos}<span class="small muted">/${r.n}</span></td><td class="num hide-sm">${r.pop || ''}</td><td class="num small">${U.time(r.time)}${r.pos > 1 ? `<div class="muted">${e(r.margin)}</div>` : ''}</td><td class="num small hide-sm">${r.last3f ? r.last3f.toFixed(1) : ''}</td><td class="small hide-sm">${e(r.jockey || '')}</td></tr>`).join('')}
    </table></div>`;
  }
  // 血統表（4代）
  UI.pedTable = function (sire, dam, selfName) {
    const t = P.tree(sire, dam, 4);
    const crosses = new Set(P.crosses(sire, dam).map(c => c.name));
    const cells = [];
    for (let g = 0; g < 4; g++) {
      const n = t[g].length, span = 16 / n;
      t[g].forEach((name, i) => {
        const female = i % 2 === 1;
        cells.push(`<div class="${female ? 'f' : ''} ${name ? '' : 'empty'} ${crosses.has(name) ? 'x' : ''} ${g === 0 ? 'g1' : ''}" style="grid-column:${g + 1};grid-row:${i * span + 1} / span ${span}">${name ? e(name) : '—'}</div>`);
      });
    }
    void selfName;
    return `<div class="ped">${cells.join('')}</div>`;
  };
  function pedTab(h) {
    const cr = P.crosses(h.sire, h.dam);
    const nk = P.nicks(h.sire, h.dam);
    return `<h2 class="sec">血統表<span class="r">父系：${e(P.lineOf(h.sire))}</span></h2>
      <div class="panel">${UI.pedTable(h.sire, h.dam)}</div>
      <div class="panel"><b>クロス</b>：${cr.length ? cr.map(c => `${e(c.name)} ${c.label}（${c.pct.toFixed(2)}%）`).join('、') : 'なし（5代内）'}
      ${nk.length ? `<div><b>ニックス</b>：${nk.map(n => e(n[0] + '×' + n[1])).join('、')}</div>` : ''}</div>`;
  }

  // ---------- 牧場 ----------
  S.farm = function () {
    const G = W.get();
    const mares = W.mine('mare');
    const young = W.mine('farm').filter(h => G.year - h.born <= 2 && (h.starts || 0) === 0);
    const studs = W.mine('stud');
    return `
      <h2 class="sec">${e(G.player.farm)}<span class="r">牧場 Lv.${G.farmLevel}・繁殖牝馬 ${mares.length}/${W.farmCap()}頭</span></h2>
      <div class="panel row wrap"><span class="small">月の維持費 ${U.money(W.monthlyCost())}（全体）</span><button class="btn sm right" data-act="upgrade" ${G.farmLevel >= 5 ? 'disabled' : ''}>牧場を拡張（${U.money(W.farmUpgradeCost())}）</button></div>
      <h2 class="sec">繁殖牝馬<span class="r">${W.canBreed() ? '<b style="color:var(--gold2)">種付けの季節（2〜6月）</b>' : '種付けは2月〜6月'}</span></h2>
      ${mares.length ? `<div class="list">${mares.map(m => {
        const c = m.cover;
        const st = c && c.year === G.year && c.ok ? `受胎（${e(c.sire)}）` : c && c.year === G.year - 1 && c.ok && G.month < 3 ? `受胎中（${e(c.sire)}・3月に出産）` : c && c.year === G.year && !c.ok ? '不受胎（もう一度つけられる）' : '空胎';
        return `<div class="card" data-act="horse" data-id="${m.id}">${UI.thumb(m)}<div class="grow"><div class="row"><span class="nm">${e(m.name)}</span>${UI.histMark(m)}</div>
          <div class="sub">${G.year - m.born}歳・父 ${e(m.sire || '不明')}・繁殖評価 ${U.grade(P.mareQuality(m))}</div><div class="small">${st}</div></div>
          ${W.canBreed() && !(c && c.year === G.year && c.ok) ? `<button class="btn sm gold" data-act="breed" data-id="${m.id}">種付け</button>` : ''}</div>`;
      }).join('')}</div>` : '<div class="panel empty">繁殖牝馬がいません。市場で買えます。</div>'}
      <h2 class="sec">若駒<span class="r">当歳・1歳・2歳</span></h2>
      ${young.length ? `<div class="list">${young.sort((a, b) => b.born - a.born).map(h => `<div class="card" data-act="horse" data-id="${h.id}">${UI.thumb(h)}<div class="grow">
          <div class="row"><span class="nm">${e(W.displayName(h))}</span>${UI.histMark(h)}</div>
          <div class="sub">${G.year - h.born}歳 ${h.sex}・${e(h.coat || '')}・父 ${e(h.sire || '?')}</div>
          <div class="btns">${!h.name ? `<button class="btn sm" data-act="name" data-id="${h.id}">名前を付ける</button>` : ''}${G.year - h.born >= 2 && G.month >= 4 ? `<button class="btn sm gold" data-act="to-stable" data-id="${h.id}">入厩</button>` : ''}</div></div></div>`).join('')}</div>` : '<div class="panel empty">若駒はいません。</div>'}
      ${studs.length ? `<h2 class="sec">種牡馬</h2><div class="list">${studs.map(s => `<div class="card" data-act="horse" data-id="${s.id}">${UI.thumb(s)}<div class="grow"><div class="nm">${e(s.name)}</div><div class="sub">種付け料 ${U.money(s.studFee)}・種牡馬評価 ${U.grade(s.studRating)}</div></div></div>`).join('')}</div>` : ''}`;
  };

  // 種付けの相手を選ぶ
  S.breed = function (st) {
    const G = W.get();
    const m = W.horse(st.id);
    if (!m) return '<div class="panel empty">いません</div>';
    let list = W.stallionsOf(G.year);
    const f = st.filter || 'all';
    if (f === 'turf') list = list.filter(s => s.surface !== 'ダ');
    if (f === 'dirt') list = list.filter(s => s.surface !== '芝');
    if (f === 'cheap') list = list.filter(s => s.fee <= 300);
    const rows = list.map(s => ({ s, ev: P.evaluate(s, m) }));
    const sort = st.sort || 'rank';
    rows.sort((a, b) => sort === 'fee' ? b.s.fee - a.s.fee : sort === 'feeAsc' ? a.s.fee - b.s.fee : b.ev.mean - a.ev.mean);
    return `
      <div class="row mt"><button class="btn sm" data-act="back">← もどる</button></div>
      <h2 class="sec">${e(m.name)}の相手を選ぶ<span class="r">${W.yLabel(G.year)}・${list.length}頭</span></h2>
      <div class="panel small">母 ${e(m.name)}（父 ${e(m.sire || '?')}・${e(P.lineOf(m.sire))}）　資金 ${U.money(G.player.money)}</div>
      <div class="tabs">${[['all', 'すべて'], ['turf', '芝向き'], ['dirt', 'ダート向き'], ['cheap', '300万円以下']].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-act="bfilter" data-f="${k}">${l}</button>`).join('')}
        ${[['rank', '評価順'], ['fee', '高い順'], ['feeAsc', '安い順']].map(([k, l]) => `<button class="${sort === k ? 'on' : ''}" data-act="bsort" data-s="${k}">${l}</button>`).join('')}</div>
      <div class="tblwrap"><table class="t"><tr><th>評価</th><th>種牡馬</th><th>種付け料</th><th class="hide-sm">系統</th><th class="hide-sm">傾向</th><th>クロス・ニックス</th></tr>
        ${rows.map(({ s, ev }) => `<tr class="click" data-act="bpick" data-s="${e(s.name)}"><td><span class="rank ${ev.rank}">${ev.rank}</span></td><td><b>${e(s.name)}</b>${s.owner === 'P' ? ' <span class="chip mine">自家</span>' : ''}</td><td class="num">${s.owner === 'P' ? '無料' : U.money(s.fee)}</td>
          <td class="small hide-sm">${e(P.lineOf(s.name))}</td><td class="small hide-sm">${s.surface}・${s.distMin}〜${s.distMax}m・${s.growth}</td>
          <td class="small">${ev.crosses.slice(0, 2).map(c => `${e(c.name)} ${c.label}`).join('<br>')}${ev.nicks.length ? '<br><b style="color:var(--gold2)">ニックス</b>' : ''}</td></tr>`).join('')}
      </table></div>`;
  };
  UI.breedDetail = function (mare, stallion) {
    const ev = P.evaluate(stallion, mare);
    return `<h3>${e(stallion.name)} × ${e(mare.name)}</h3>
      <div class="hero"><canvas width="960" height="480" data-art="thumbdata" data-coat="${e(stallion.coat || '鹿毛')}" data-key="${e(stallion.name)}"></canvas>
        <div class="plate"><div class="nm">${e(stallion.name)}</div><div class="pd">${stallion.born ? stallion.born + '年生' : ''} ${e(stallion.coat || '')}　父 ${e(P.parents(stallion.name)[0] || '?')}　母父 ${e(P.parents(P.parents(stallion.name)[1])[0] || '?')}</div></div></div>
      <div class="row"><span class="rank ${ev.rank}" style="width:44px;height:44px;line-height:44px;font-size:22px">${ev.rank}</span>
        <div class="grow small">父系 ${e(ev.sireLine)}　母父系 ${e(ev.damsireLine)}<br>種付け料 ${stallion.owner === 'P' ? '無料（自家の種牡馬）' : U.money(stallion.fee)}　${stallion.surface}・${stallion.distMin}〜${stallion.distMax}m・${stallion.growth}${(stallion.traits || []).length ? '・' + stallion.traits.map(e).join('・') : ''}</div></div>
      <div class="panel mt small">${ev.notes.length ? ev.notes.map(n => `<div>・${e(n)}</div>`).join('') : '5代内にクロスなし（アウトブリード）'}</div>
      <div class="panel mt">${UI.pedTable(stallion.name, mare.name)}</div>
      <div class="btns mt"><button class="btn gold" data-act="bdo" data-s="${e(stallion.name)}">この配合で種付けする</button><button class="btn" data-act="close">やめる</button></div>`;
  };

  // ---------- 市場 ----------
  S.market = function (st) {
    const G = W.get();
    const tab = st.mtab || 'hist';
    let body = '';
    if (tab === 'hist' || tab === 'foreign') {
      const all = tab === 'hist' ? W.marketHistoric() : W.marketForeign();
      const lim = st.mlimit || 30;
      const list = all.slice(0, lim);
      body = list.length ? `<div class="small muted">${all.length}頭${tab === 'foreign' ? '（輸入の費用込み。買うと日本で走らせられる）' : ''}</div><div class="list mt">${list.map((it, i) => {
        const h = it.horse, d = it.data;
        return `<div class="card">${UI.thumb(h)}<div class="grow"><div class="row"><span class="nm">${e(h.name)}</span><span class="chip hist">${tab === 'foreign' ? '海外' : '史実'}</span></div>
          <div class="sub">${G.year - h.born}歳 ${h.gelding ? 'セ' : h.sex}・${e(h.coat || '')}${h.country && tab === 'foreign' ? '・' + e(h.country) : ''}・父 ${e(h.sire || '?')}・母 ${e(h.dam || '?')}</div>
          ${G.settings.showHistNote && d ? `<div class="small muted">${d.note ? e(d.note) : ''}${(d.wins || []).length ? '（史実の重賞 ' + d.wins.length + '勝）' : ''}</div>` : ''}
          ${UI.hasSkills(h) ? `<div class="skills mt">${UI.skillChips(h)}</div>` : ''}
          ${G.settings.showHistNote && d && d.text ? `<button class="btn sm mt" data-act="htext" data-name="${e(h.name)}">解説を読む</button>` : ''}</div>
          <div class="center"><div class="small" style="color:var(--gold2);font-weight:900">${U.money(it.price)}</div><button class="btn sm gold" data-act="buy" data-kind="${tab === 'hist' ? 'hist' : 'fhist'}" data-i="${i}">買う</button></div></div>`;
      }).join('')}</div>${all.length > lim ? `<div class="center mt"><button class="btn" data-act="mmore">もっと見る（残り${all.length - lim}頭）</button></div>` : ''}`
        : `<div class="panel empty">いま買えるデビュー前の${tab === 'hist' ? '' : '海外の'}史実馬はいません。毎年3月に新しい世代が生まれます。</div>`;
    } else if (tab === 'gen') {
      body = `<div class="list">${G.market.gen.map((it, i) => {
        const h = it.horse;
        return `<div class="card">${UI.thumb(h)}<div class="grow"><div class="nm">${e(W.displayName(h))}</div><div class="sub">${G.year - h.born}歳 ${h.sex}・${e(h.coat || '')}・父 ${e(h.sire || '?')}</div><div class="small muted">見た目の印象：${['平凡', 'まずまず', 'よい', '目を引く'][U.clamp(Math.floor((H.overall(h.pot) - 50) / 7), 0, 3)]}</div></div>
          <div class="center"><div class="small" style="color:var(--gold2);font-weight:900">${U.money(it.price)}</div><button class="btn sm gold" data-act="buy" data-kind="gen" data-i="${i}">買う</button></div></div>`;
      }).join('') || '<div class="panel empty">売り物がありません。来月また来てください。</div>'}</div>`;
    } else if (tab === 'mare') {
      const hm = W.marketMares();
      body = `<div class="list">${hm.map((it, i) => `<div class="card"><canvas class="thumb" width="168" height="112" data-art="thumbdata" data-coat="${e(it.data.coat || '鹿毛')}" data-key="${e(it.data.name)}"></canvas><div class="grow"><div class="row"><span class="nm">${e(it.data.name)}</span><span class="chip hist">名牝</span></div>
          <div class="sub">${G.year - it.data.born}歳・父 ${e(it.data.sire || '?')}・繁殖評価 ${U.grade(it.data.quality)}</div>
          ${it.inFoal ? `<div class="small" style="color:var(--gold2)">受胎中：${e(it.inFoal[1])}の仔（3月に出産）</div>` : ''}
          ${G.settings.showHistNote ? `<div class="small muted">史実の仔：${(it.data.foals || []).map(f => `${f[2]}（${f[0]}・父${f[1]}）`).map(e).join('、')}</div>` : ''}</div>
          <div class="center"><div class="small" style="color:var(--gold2);font-weight:900">${U.money(it.price)}</div><button class="btn sm gold" data-act="buy" data-kind="hmare" data-i="${i}">買う</button></div></div>`).join('')}
        ${G.market.genMares.map((it, i) => `<div class="card">${UI.thumb(it.horse)}<div class="grow"><div class="nm">${e(it.horse.name)}</div><div class="sub">${G.year - it.horse.born}歳・父 ${e(it.horse.sire || '?')}・繁殖評価 ${U.grade(it.horse.quality)}</div></div>
          <div class="center"><div class="small" style="color:var(--gold2);font-weight:900">${U.money(it.price)}</div><button class="btn sm gold" data-act="buy" data-kind="gmare" data-i="${i}">買う</button></div></div>`).join('')}</div>`;
    } else if (tab === 'sell') {
      const mine = W.mine().filter(h => h.loc !== 'gone');
      body = mine.length ? `<div class="tblwrap"><table class="t"><tr><th>馬</th><th>場所</th><th>値段</th><th></th></tr>${mine.map(h => `<tr><td><b>${e(W.displayName(h))}</b><div class="small muted">${UI.age(h)}</div></td><td class="small">${{ stable: '厩舎', farm: '牧場', mare: '繁殖', stud: '種牡馬' }[h.loc]}</td><td class="num">${U.money(W.sellPrice(h))}</td><td><button class="btn sm red" data-act="sell" data-id="${h.id}">売る</button></td></tr>`).join('')}</table></div>` : '<div class="panel empty">持ち馬がいません。</div>';
    }
    return `<h2 class="sec">市場<span class="r">資金 ${U.money(G.player.money)}</span></h2>
      <div class="tabs">${[['hist', '史実馬（デビュー前）'], ['foreign', '海外の史実馬'], ['gen', '一般の若駒'], ['mare', '繁殖牝馬'], ['sell', '売却']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="mtab" data-tab="${k}">${l}</button>`).join('')}</div>
      ${body}`;
  };

  // ---------- レース ----------
  S.races = function (st) {
    const G = W.get();
    const tab = st.rtab || 'last';
    let body = '';
    if (tab === 'last') {
      const lw = W.lastReport;
      const lr = G.lastWeek;
      if (!lr || !lr.races.length) body = '<div class="panel empty">先週のレース結果はありません。</div>';
      else body = `<div class="small muted">${e(lr.date)}</div><div class="list mt">${lr.races.filter(r => r.grade || r.mine).map((r, i) => `<div class="card" data-act="result" data-i="${i}"><div class="grow"><div class="row">${UI.gradeTag(r)}<b>${e(r.short || r.name)}</b>${r.mine ? '<span class="chip mine">出走</span>' : ''}</div>
          <div class="sub">${r.course} ${r.surface}${r.dist}m ${r.ground}　1着 ${e(r.rows[0].name)}</div></div>${lw && lw.races.find(x => x.race.key === r.key && x.sim.frames) ? `<button class="btn sm" data-act="replay" data-key="${e(r.key)}">観戦</button>` : ''}</div>`).join('')}</div>`;
    } else if (tab === 'cal') {
      const list = R.gradedYear(G.year);
      const recs = G.records.g1[G.year] || [];
      body = `<div class="tblwrap"><table class="t"><tr><th>月週</th><th></th><th>レース</th><th>コース</th><th>勝ち馬</th></tr>${list.map(r => {
        const rec = recs.find(x => x.race === r.name);
        const past = r.month < G.month || (r.month === G.month && r.week < G.week);
        return `<tr class="${rec && rec.owner === 'P' ? 'mine' : ''}"><td class="small">${r.month}月${r.week}週</td><td>${UI.gradeTag(r)}</td><td><b>${e(R.label(r))}</b><div class="small muted">${ageCond(r)}</div></td><td class="small">${r.course}${r.surface}${r.dist}</td><td class="small">${rec ? e(rec.winner) : past && r.grade !== 'G1' ? '<span class="muted">—</span>' : ''}</td></tr>`;
      }).join('')}</table></div>`;
    }
    return `<h2 class="sec">レース</h2>
      <div class="tabs">${[['last', '先週の結果'], ['cal', G.year + '年の重賞']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="rtab" data-tab="${k}">${l}</button>`).join('')}</div>${body}`;
  };
  UI.resultTable = function (r) {
    return `<h3>${UI.gradeTag(r)} ${e(r.short || r.name)}</h3><div class="small muted">${r.course} ${r.surface}${r.dist}m　馬場：${r.ground}</div>
      <div class="tblwrap mt card-sheet"><table class="t"><tr><th>着</th><th>馬番</th><th>馬名</th><th class="hide-sm">性齢</th><th class="hide-sm">騎手</th><th>タイム</th><th>着差</th><th class="hide-sm">上がり</th><th>人気</th></tr>
      ${r.rows.map(x => `<tr class="${x.mine ? 'mine' : ''}"><td class="num ${x.pos <= 3 ? 'pos' + x.pos : ''}">${x.pos}</td><td>${UI.waku(x.frame, x.num)}</td><td class="nm">${e(x.name)} ${x.hist ? '<span class="chip hist">史</span>' : ''}<div class="small muted">${x.sire ? '父 ' + e(x.sire) : ''}<span class="show-sm">　${e(x.jockey || '')}</span></div></td><td class="small hide-sm">${x.sex}${x.age}</td><td class="small hide-sm">${e(x.jockey || '')}</td><td class="num">${U.time(x.time)}</td><td class="small">${e(x.margin)}</td><td class="num small hide-sm">${x.last3f ? x.last3f.toFixed(1) : ''}</td><td class="num small">${x.pop}<div class="muted">${x.odds}</div></td></tr>`).join('')}
      </table></div>`;
  };
  // 出馬表
  UI.raceCard = function (data) {
    const { race, runners } = data;
    const G = W.get();
    const rows = runners.slice().sort((a, b) => a.num - b.num);
    return `<h3>${UI.gradeTag(race)} ${e(race.short || race.name)}</h3>
      <div class="small muted">${W.yLabel(G.year)}${race.month}月 ${race.course} ${race.surface === 'ダ' ? 'ダート' : '芝'}${race.dist}m　馬場：${race.ground}　${runners.length}頭</div>
      <div class="tblwrap mt card-sheet"><table class="t"><tr><th>枠番</th><th></th><th>馬名</th><th class="hide-sm">性齢</th><th class="hide-sm">斤量</th><th class="hide-sm">騎手</th><th>人気</th><th>単勝</th></tr>
      ${rows.map(x => `<tr class="${x.mine || x.rider === 'P' ? 'mine' : ''}"><td>${UI.waku(x.frame, x.num)}</td><td><canvas class="silks" width="52" height="52" data-art="silks" data-key="${e(x.horse.name)}" data-mine="${x.mine ? 1 : 0}"></canvas></td><td class="nm">${e(x.horse.name)} ${x.horse.hist ? '<span class="chip hist">史</span>' : ''}<div class="small muted">${x.horse.sire ? '父 ' + e(x.horse.sire) : x.horse.foreign ? '外国馬' : ''}<span class="show-sm">　${e(x.jockey ? x.jockey.name : '')}</span></div></td>
        <td class="small hide-sm">${x.horse.gelding ? 'セ' : x.horse.sex}${G.year - x.horse.born}</td><td class="num small hide-sm">${x.weight}</td><td class="small hide-sm">${x.allowance && HS.Jockey ? HS.Jockey.allowanceMark(x.allowance) : ''}${e(x.jockey ? x.jockey.name : '')}</td><td class="num">${x.pop}</td><td class="num">${x.odds}</td></tr>`).join('')}
      </table></div>`;
  };

  // ---------- 記録 ----------
  S.records = function (st) {
    const G = W.get();
    const tab = st.ctab || 'g1';
    const years = Object.keys(G.records.g1).map(Number).sort((a, b) => b - a);
    let body = '';
    if (tab === 'g1') {
      body = years.length ? years.map(y => `<h2 class="sec">${W.yLabel(y)}のG1</h2><div class="tblwrap"><table class="t"><tr><th>レース</th><th>勝ち馬</th><th class="hide-sm">父</th><th>史実</th></tr>${G.records.g1[y].map(r => `<tr class="${r.owner === 'P' ? 'mine' : ''}"><td>${UI.gradeTag(Object.assign({ year: y }, r))} ${e(r.short || r.race)}</td><td><b>${e(r.winner)}</b>${r.hist ? ' <span class="chip hist">史</span>' : ''}</td><td class="small hide-sm">${e(r.sire || '')}</td><td class="small ${r.histWinner === r.winner ? '' : 'muted'}">${r.histWinner ? (r.histWinner === r.winner ? '史実どおり' : e(r.histWinner)) : ''}</td></tr>`).join('')}</table></div>`).join('') : '<div class="panel empty">まだG1は行われていません。</div>';
    } else if (tab === 'awards') {
      const ys = Object.keys(G.records.awards).map(Number).sort((a, b) => b - a);
      body = ys.length ? ys.map(y => `<h2 class="sec">${W.yLabel(y)}の年度表彰</h2><div class="panel"><dl class="kv">${Object.entries(G.records.awards[y]).map(([k, v]) => `<dt>${k}</dt><dd>${v.owner === 'P' ? '★ ' : ''}<b>${e(v.name)}</b></dd>`).join('')}</dl></div>`).join('') : '<div class="panel empty">年が明けると、前の年の表彰が発表されます。</div>';
    } else if (tab === 'mine') {
      const pr = G.records.player;
      body = `<div class="panel"><dl class="kv"><dt>通算</dt><dd>${pr.starts}戦${pr.wins}勝</dd><dt>獲得賞金</dt><dd>${U.money(pr.earn)}</dd><dt>重賞勝利</dt><dd>${pr.g1.length}勝（うちG1 ${pr.g1.filter(x => x.grade === 'G1').length}勝）</dd></dl></div>
        <h2 class="sec">重賞の勝利</h2>${pr.g1.length ? `<div class="tblwrap"><table class="t">${pr.g1.slice().reverse().map(x => `<tr><td class="small">${x.y}</td><td>${UI.gradeTag({ grade: x.grade, region: x.region, year: x.y })} ${e(x.race)}</td><td><b>${e(x.horse)}</b></td></tr>`).join('')}</table></div>` : '<div class="panel empty">まだありません。</div>'}`;
    }
    return `<h2 class="sec">記録</h2><div class="tabs">${[['g1', '年代記（G1）'], ['awards', '年度表彰'], ['mine', 'わたしの成績']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="ctab" data-tab="${k}">${l}</button>`).join('')}</div>${body}`;
  };

  // ---------- メニュー ----------
  S.menu = function () {
    const G = W.get();
    return `<h2 class="sec">メニュー</h2>
      <div class="panel"><div class="small muted">セーブは毎週自動でこの端末に保存されます。</div>
        <div class="btns mt"><button class="btn" data-act="export">セーブを書き出す</button><button class="btn" data-act="import">セーブを読み込む</button></div></div>
      <div class="panel"><b>音</b>
        <div class="row mt"><label class="grow" for="vol-bgm">BGM の音量</label><input id="vol-bgm" type="range" min="0" max="100" value="${Math.round(HS.Audio.settings.bgm * 100)}" data-act-change="volume" data-k="bgm"></div>
        <div class="row mt"><label class="grow" for="vol-se">効果音の音量</label><input id="vol-se" type="range" min="0" max="100" value="${Math.round(HS.Audio.settings.se * 100)}" data-act-change="volume" data-k="se"></div>
        <div class="small muted">音は画面にさわったあとで鳴り始めます。0 にすると消えます。</div>
        ${HS.Rumble ? `<div class="row mt"><label class="grow" for="vol-rumble">コントローラーの振動</label><input id="vol-rumble" type="range" min="0" max="100" value="${Math.round(HS.Rumble.level * 100)}" data-act-change="rumble"></div>
        <div class="small muted">騎乗中、馬の蹄が地面に着くたびに震えます（ゲートが開く・ムチ・特殊能力・ゴールでも）。0 にすると切れます。</div>` : ''}</div>
      <div class="panel"><b>設定</b>
        <div class="row mt"><span class="grow">画面の色</span><select data-act-change="theme"><option value="green" ${HS.App.theme() !== 'navy' ? 'selected' : ''}>深緑と金</option><option value="navy" ${HS.App.theme() === 'navy' ? 'selected' : ''}>紺と金</option></select></div>
        <div class="row mt"><span class="grow">自分の馬のレースを</span><select data-act-change="setting" data-k="watch"><option value="1" ${G.settings.watch !== 0 ? 'selected' : ''}>映像で見る</option><option value="0" ${G.settings.watch === 0 ? 'selected' : ''}>結果だけ見る</option></select></div>
        <div class="row mt"><span class="grow">史実メモ（史実の勝ち鞍など）</span><select data-act-change="setting" data-k="showHistNote"><option value="1" ${G.settings.showHistNote ? 'selected' : ''}>表示する</option><option value="0" ${!G.settings.showHistNote ? 'selected' : ''}>隠す</option></select></div>
      </div>
      <div class="panel"><b>遊び方</b>
        <ul class="small">
          <li>毎週、厩舎の馬の調教と出走レースを決めて「次の週へ」。おまかせにすると自動で決まります。</li>
          <li>市場ではデビュー前の史実馬が買えます。史実の名牝を買い、史実どおりの種牡馬をつければ、あの名馬が自分の牧場に生まれます。違う相手をつければ歴史が変わります。</li>
          <li>種付けは2月〜6月。血統表のクロス（インブリード）やニックスで仔の素質が上下します。</li>
          <li>能力は「見立て」です。レースを走り、調教を積むほど正確になります。</li>
          <li>引退した牡馬は実績しだいで種牡馬に、牝馬は繁殖牝馬になります。</li>
        </ul></div>
      <div class="panel"><b>データを消す</b><div class="small muted">この端末のセーブを消して、タイトルに戻ります。</div><div class="btns mt"><button class="btn red" data-act="reset">セーブを消す</button></div></div>
      <div class="small muted center mt">馬名・レース名・騎手名は実在のものを使ったファンメイドのゲームです。調教師・馬主は架空です。</div>`;
  };
})();
