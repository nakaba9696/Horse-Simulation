// 年末のドリームレース（グランドフィナーレ）の画面：ホームの「資格」の表と、12月の招待（出るなら自分の馬から1頭を選ぶ・出ない）
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, W = HS.World, UI = HS.UI, App = HS.App, J = HS.Jockey, T = HS.Season;
  if (!UI || !App || !T || !T.dcStatus) return;
  const e = U.esc;
  const isJ = () => J && J.isMode();
  const PLACE = '12月4週・東京芝2400m・16頭';
  const RULE = 'G1を勝った自分の馬と前の年の勝ち馬は必ず招待。残りはその年のファンの票（大きいレースほど・上の着ほど多い）の上位。外国の馬は4頭まで。出られるのは自分の馬から1頭。';
  // 招待の締め切り前か（12月4週のレースが終わるまで選び直せる）
  const open = () => { const G = W.get(); return G.dc && G.dc.y === G.year && G.dc.ai && G.month === 12; };

  // 状態の札
  const BADGE = { sure: ['ok', '資格あり'], in: ['in', '圏内'], out: ['out', '圏外'], young: ['', '3歳から'], off: ['', '休み'], invited: ['ok', '招待'], notInvited: ['out', '招待なし'] };
  UI.dcBadge = st => { const b = BADGE[st.state] || ['', st.text]; return `<span class="dc-badge ${b[0]}">${b[1]}</span>`; };
  // お手馬の札に付ける小さな印（資格がある・圏内のときだけ）
  UI.dcChip = function (h) {
    if (!isJ()) return '';
    const st = T.dcStatus(h);
    if (!st || !st.ok) return '';
    return `<span class="chip dc">GF ${st.state === 'in' ? '圏内' : st.state === 'invited' ? '招待' : '資格あり'}</span>`;
  };

  // ---------- ホームの節 ----------
  UI.dcSection = function () {
    if (!isJ()) return '';
    const G = W.get();
    const mine = W.mine().filter(h => h.loc !== 'retired');
    if (open()) return invitedSection();
    if (!mine.some(h => G.year - h.born >= 3 || (G.month >= 10 && G.year - h.born >= 2))) return '';
    const cut = T.dcCut();
    const rows = mine.map(h => ({ h, st: T.dcStatus(h) })).filter(x => x.st)
      .sort((a, b) => (b.st.ok - a.st.ok) || ((b.st.votes || 0) - (a.st.votes || 0)));
    return `<h2 class="sec">${T.DC_NAME}への道<span class="r">${PLACE}</span></h2>
      <div class="panel dc-road">
        <div class="small muted">${RULE}</div>
        <div class="small mt">招待は12月1週。いまの16位は <b>${cut.votes}票</b>。</div>
        <table class="t mt">${rows.map(({ h, st }) => `<tr><td><a href="#" data-act="horse" data-id="${e(h.id)}"><b>${e(h.name)}</b></a> <span class="small muted">${UI.age(h)}</span></td>
          <td>${UI.dcBadge(st)}</td>
          <td class="num small">${st.votes != null ? `${st.votes}票` : ''}</td>
          <td class="small">${e(st.ok ? st.why || '' : st.need || '')}</td></tr>`).join('')}</table>
      </div>`;
  };
  function invitedSection() {
    const G = W.get(), dc = G.dc;
    const elig = T.dcEligible();
    const me = T.dcRunner();
    const lineup = T.dcLineup();
    const done = G.week > 4;
    let my;
    if (!dc.elig.length) my = `<div class="muted">自分の馬は招待されなかった。${e(RULE)}</div>`;
    else if (dc.ans === 'no') my = `<div><b>今年は出ない。</b>${elig.length ? '<span class="small muted">（レースの日まで選び直せる）</span>' : ''}</div>`;
    else if (me) my = `<div>出る：<b class="dc-me">★${e(me.name)}</b>${dc.ans ? '' : '<span class="small muted">（まだ決めていない。このままならこの馬で出る）</span>'}</div>`;
    else my = '<div class="muted">招待された馬が故障などで出られない。</div>';
    return `<h2 class="sec">${T.DC_NAME}<span class="r">${PLACE}</span></h2>
      <div class="panel dc-road">
        ${my}
        ${elig.length && !done ? `<div class="btns mt"><button class="btn gold" data-act="dc-open">${dc.ans ? '選び直す' : '出るかどうか決める'}</button></div>` : ''}
        <div class="small mt dc-lineup">${lineup.map(h => h.owner === 'P' ? `<b class="dc-me">★${e(h.name)}</b>` : e(h.name)).join('・')}</div>
      </div>`;
  }

  // ---------- 招待の画面：出るなら1頭を選ぶ。出ないなら AI の馬だけで走る（結果は週のまとめから観戦できる） ----------
  UI.dreamAsk = function () {
    return new Promise(res => {
      const G = W.get(), wIdx = W.wIdx();
      const list = T.dcEligible();
      if (!list.length) { res(null); return; }
      const best = T.dcBest();
      const cur = G.dc.ans === 'yes' ? G.dc.pick : null;
      const card = ({ h, why }) => {
        const fh = T.fhBoth(h, wIdx);
        return `<div class="dc-card ${cur === h.id ? 'on' : ''}">
          ${UI.thumb(h)}
          <div class="grow">
            <div class="row"><span class="nm">${e(h.name)}</span>${UI.histMark(h)}${h === best ? '<span class="chip mine">おすすめ</span>' : ''}<span class="small muted">${UI.age(h)}・${e(h.style)}</span></div>
            <div class="small">招待の理由：<b>${e(why)}</b></div>
            <div class="row dc-fh"><span class="small muted">${T.FH_NAME}</span><span class="fhv turf"><small>芝</small>${fh.turf}</span><span class="fhv dirt dim"><small>ダ</small>${fh.dirt}</span>${UI.condMark(h, wIdx)}</div>
            ${UI.numStats(h, wIdx, { surface: '芝' })}
            ${UI.hasSkills(h) ? `<div class="skills">${UI.skillChips(h)}</div>` : '<div class="small muted">特殊能力なし</div>'}
            <div class="small muted">近走：${e(UI.recentRuns(h))}</div>
          </div>
          <button class="btn ${cur === h.id || (!cur && h === best) ? 'gold' : ''}" data-x="pick" data-id="${e(h.id)}">この馬で出る</button>
        </div>`;
      };
      const bg = App.modal(`<div class="dc-ask">
          <div class="dc-kicker">招待状</div>
          <h3 class="dc-title">${T.DC_NAME}</h3>
          <div class="small center muted">${W.yLabel(G.year)} ${PLACE}。その年に活躍した馬だけが走る、年末のドリームレース。</div>
          <div class="small center mt">出るなら、招待された自分の馬から<b>1頭</b>を選ぶ。出ない年は、ほかの馬だけで走る（結果は観戦できる）。</div>
          <div class="dc-cards mt">${list.map(card).join('')}</div>
          <div class="btns mt center"><button class="btn" data-x="no">今年は出ない</button>${G.dc.ans ? '<button class="btn" data-x="keep">このまま</button>' : ''}</div>
        </div>`, { wide: true, noClose: true, scene: 'paddock' });
      const done = v => { App.closeModal(); App.save(); res(v); };
      bg.querySelectorAll('[data-x=pick]').forEach(b => { b.onclick = () => { const err = T.dcChoose(b.dataset.id); if (err) { App.toast(err); return; } App.toast(`${W.horse(b.dataset.id).name}で${T.DC_NAME}に出る`); done('yes'); }; });
      bg.querySelector('[data-x=no]').onclick = () => { T.dcDecline(); App.toast(`今年の${T.DC_NAME}には出ない`); done('no'); };
      const keep = bg.querySelector('[data-x=keep]'); if (keep) keep.onclick = () => { App.closeModal(); res(null); };
      // 既定のボタンに光を当てる（十字キー・Enter で選べる）
      const def = bg.querySelector('.btn.gold'); if (def) def.focus();
    });
  };
  App.act['dc-open'] = async () => { await UI.dreamAsk(); App.render(); };
})();
