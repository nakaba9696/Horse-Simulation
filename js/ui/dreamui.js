// 年末のドリームレース（グランドフィナーレ・距離ごとに6つ）の画面：
// ホームの「グランドフィナーレへの道」（自分の馬 × GF の資格の表）と、12月の招待（GF ごとに、出るなら自分の馬から1頭を選ぶ・出ない）
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, W = HS.World, UI = HS.UI, App = HS.App, J = HS.Jockey, T = HS.Season;
  if (!UI || !App || !T || !T.dcStatus || !T.GF_CATS) return;
  const e = U.esc;
  const isJ = () => J && J.isMode();
  const RULE = '距離ごとに6つ。その距離のG1を勝った自分の馬と、前の年のその GF の勝ち馬は必ず招待。残りはその距離のレースで集めたファンの票（大きいレースほど・上の着ほど多い）の上位16頭。外国の馬は4頭まで。1つの GF に出られるのは自分の馬から1頭。同じ馬が2つに出るのは間が2週あるときだけ。';
  const place = c => `12月${c.week}週・${c.course}${c.surface === 'ダ' ? 'ダ' : '芝'}${c.dist}m`;
  // 招待の決まった12月か
  const open = () => { const G = W.get(); return G.dc && G.dc.y === G.year && G.dc.gf && G.month === 12; };

  // 状態の札
  const BADGE = { sure: ['ok', '資格あり'], in: ['in', '圏内'], out: ['out', '圏外'], young: ['', '3歳から'], off: ['', '休み'], invited: ['ok', '招待'], notInvited: ['out', '招待なし'] };
  UI.dcBadge = st => { const b = BADGE[st.state] || ['', st.text]; return `<span class="dc-badge ${b[0]}">${b[1]}</span>`; };
  // お手馬の札に付ける小さな印（資格がある・圏内の GF の名前）
  UI.dcChip = function (h) {
    if (!isJ()) return '';
    const ok = T.GF_CATS.filter(c => { const st = T.dcStatus(h, c.id); return st && st.ok; });
    return ok.length ? `<span class="chip dc">GF ${ok.map(c => c.label).join('・')}</span>` : '';
  };

  // ---------- ホームの節 ----------
  UI.dcSection = function () {
    if (!isJ()) return '';
    const G = W.get();
    if (open()) return invitedSection();
    const mine = W.mine().filter(h => h.loc !== 'retired' && (G.year - h.born >= 3 || (G.month >= 10 && G.year - h.born >= 2)));
    if (!mine.length) return '';
    const cell = (h, c) => {
      const st = T.dcStatus(h, c.id);
      if (!st) return '<td></td>';
      const tip = st.ok ? st.why : st.need;
      return `<td class="dc-cell" title="${e(tip || '')}">${UI.dcBadge(st)}${st.votes ? `<small>${st.votes}票</small>` : ''}</td>`;
    };
    // 馬ごとに、いちばん近い GF の「あと何が要るか」
    const near = h => {
      const sts = T.GF_CATS.map(c => ({ c, st: T.dcStatus(h, c.id) })).filter(x => x.st);
      const ok = sts.filter(x => x.st.ok);
      if (ok.length) return ok.map(x => `${x.c.label}：${x.st.why}`).join('／');
      const o = sts.filter(x => x.st.state === 'out').sort((a, b) => (b.st.votes || 0) - (a.st.votes || 0))[0];
      return o ? o.st.need : (sts[0] && sts[0].st.need) || '';
    };
    return `<h2 class="sec">${T.DC_NAME}への道<span class="r">招待は12月1週・走るのは12月2〜4週</span></h2>
      <div class="panel dc-road">
        <div class="small muted">${RULE}</div>
        <div class="tblwrap mt"><table class="t dc-mx">
          <tr><th></th>${T.GF_CATS.map(c => `<th><b>${c.label}</b><small>${c.week}週・${c.course}${c.surface === 'ダ' ? 'ダ' : '芝'}${c.dist}</small><small>16位 ${T.dcCut(c.id).votes}票</small></th>`).join('')}</tr>
          ${mine.map(h => `<tr><td class="dc-h"><a href="#" data-act="horse" data-id="${e(h.id)}"><b>${e(h.name)}</b></a> <span class="small muted">${UI.age(h)}</span><div class="small muted">${e(near(h))}</div></td>${T.GF_CATS.map(c => cell(h, c)).join('')}</tr>`).join('')}
        </table></div>
      </div>`;
  };
  function invitedSection() {
    const G = W.get();
    const run = T.dcRunners();
    const rows = T.GF_CATS.map(c => {
      const x = G.dc.gf[c.id];
      if (!x) return '';
      const done = G.week > c.week;
      const elig = T.dcEligible(c.id);
      const me = run[c.id];
      let my;
      if (!x.elig.length) my = '<span class="muted">招待なし</span>';
      else if (x.ans === 'no') my = '<b>出ない</b>';
      else if (me) my = `出る：<b class="dc-me">★${e(me.name)}</b>${x.ans ? '' : ' <span class="small muted">（未定。このままならこの馬で出る）</span>'}`;
      else my = '<span class="muted">招待された馬が出られない</span>';
      const lineup = done ? [] : T.dcLineup(c.id);
      return `<div class="dc-gfrow ${done ? 'done' : ''}">
        <div class="dc-gfhead"><b>${e(T.gfName(c.id))}</b><span class="small muted">${place(c)}</span>${done ? '<span class="small muted">（終わった）</span>' : ''}</div>
        <div class="dc-gfmine">${my}${elig.length && !done ? ` <button class="btn sm ${x.ans ? '' : 'gold'}" data-act="dc-open" data-cat="${c.id}">${x.ans ? '選び直す' : '決める'}</button>` : ''}</div>
        ${lineup.length ? `<div class="small dc-lineup">${lineup.map(h => h.owner === 'P' ? `<b class="dc-me">★${e(h.name)}</b>` : e(h.name)).join('・')}</div>` : ''}
      </div>`;
    }).join('');
    return `<h2 class="sec">${T.DC_NAME}<span class="r">距離ごとに6つ・各16頭</span></h2><div class="panel dc-road">${rows}</div>`;
  }

  // ---------- 招待の画面（GF ひとつ）：出るなら1頭を選ぶ。出ないなら AI の馬だけで走る（結果は週のまとめから観戦できる） ----------
  UI.dreamAsk = function (cat) {
    return new Promise(res => {
      const G = W.get(), wIdx = W.wIdx(), C = T.GF_BY[cat], x = G.dc && G.dc.gf && G.dc.gf[cat];
      const list = T.dcEligible(cat);
      if (!x || !list.length) { res(null); return; }
      const sf = C.surface === 'ダ' ? 'ダ' : '芝';
      const best = T.dcRunners()[cat];
      const cur = x.ans === 'yes' ? x.pick : null;
      const explicit = T.dcRunners({ explicitOnly: true });
      const card = ({ h, why }) => {
        const fh = T.fhBoth(h, wIdx);
        const clash = T.dcClash(h.id, cat, explicit);
        return `<div class="dc-card ${cur === h.id ? 'on' : ''} ${clash.length ? 'off' : ''}">
          ${UI.thumb(h)}
          <div class="grow">
            <div class="row"><span class="nm">${e(h.name)}</span>${UI.histMark(h)}${!cur && h === best ? '<span class="chip mine">おすすめ</span>' : ''}<span class="small muted">${UI.age(h)}・${e(h.style)}・${h.distMin || '?'}〜${h.distMax || '?'}m</span></div>
            <div class="small">招待の理由：<b>${e(why)}</b></div>
            <div class="row dc-fh"><span class="small muted">${T.FH_NAME}</span><span class="fhv turf ${sf === '芝' ? '' : 'dim'}"><small>芝</small>${fh.turf}</span><span class="fhv dirt ${sf === 'ダ' ? '' : 'dim'}"><small>ダ</small>${fh.dirt}</span>${UI.condMark(h, wIdx)}</div>
            ${UI.numStats(h, wIdx, { surface: sf })}
            ${UI.hasSkills(h) ? `<div class="skills">${UI.skillChips(h)}</div>` : '<div class="small muted">特殊能力なし</div>'}
            <div class="small muted">近走：${e(UI.recentRuns(h))}</div>
            ${clash.length ? `<div class="small warn">${e(T.gfName(clash[0]))}に出るので、間が${T.GF_GAP}週ない</div>` : ''}
          </div>
          <button class="btn ${cur === h.id || (!cur && h === best) ? 'gold' : ''}" data-x="pick" data-id="${e(h.id)}" ${clash.length ? 'disabled' : ''}>この馬で出る</button>
        </div>`;
      };
      const bg = App.modal(`<div class="dc-ask">
          <div class="dc-kicker">招待状</div>
          <h3 class="dc-title">${e(T.gfName(cat))}</h3>
          <div class="small center muted">${W.yLabel(G.year)} ${place(C)}・16頭。その年に${e(C.label)}で活躍した馬だけが走る、年末のドリームレース。</div>
          <div class="small center mt">出るなら、招待された自分の馬から<b>1頭</b>を選ぶ。出ない年は、ほかの馬だけで走る（結果は観戦できる）。</div>
          <div class="dc-cards mt">${list.map(card).join('')}</div>
          <div class="btns mt"><button class="btn" data-x="no">この GF には出ない</button>${x.ans ? '<button class="btn" data-x="keep">このまま</button>' : ''}</div>
        </div>`, { wide: true, noClose: true, scene: 'paddock' });
      const done = v => { App.closeModal(); App.save(); res(v); };
      bg.querySelectorAll('[data-x=pick]').forEach(b => { b.onclick = () => { const err = T.dcChoose(cat, b.dataset.id); if (err) { App.toast(err); return; } App.toast(`${W.horse(b.dataset.id).name}で${T.gfName(cat)}に出る`); done('yes'); }; });
      bg.querySelector('[data-x=no]').onclick = () => { T.dcDecline(cat); App.toast(`${T.gfName(cat)}には出ない`); done('no'); };
      const keep = bg.querySelector('[data-x=keep]'); if (keep) keep.onclick = () => { App.closeModal(); res(null); };
      // 既定のボタンに光を当てる（十字キー・Enter で選べる）
      const def = bg.querySelector('.btn.gold:not([disabled])'); if (def) def.focus();
    });
  };
  // 返事を待っている GF を順に聞く（週送りのあと）
  UI.dreamAskAll = async function () { for (const cat of T.dcPendingList()) await UI.dreamAsk(cat); };
  App.act['dc-open'] = async d => { await UI.dreamAsk(d.cat || 'classic'); App.render(); };
})();
