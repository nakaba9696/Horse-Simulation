// 番組表の画面（馬の画面の「出走」タブ）：今週から1年先までの週ごとのレースを表で見せ、今週は出走登録、先の週は予約する
// 行は js/core/program.js の HS.Program.rows。厩舎の一覧（騎手のゲーム）もここ
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse, W = HS.World, R = HS.Races, UI = HS.UI, App = HS.App, P = HS.Program, T = HS.Season;
  const e = U.esc;
  const isJ = () => HS.Jockey && HS.Jockey.isMode();

  const clsLabel = r => UI.gradeTag(r); // レースは OP 以上だけ（オープンは OP・リステッドは L の札）
  // 牧場にいる馬の一言（騎手のゲームに放牧は無い。持ち主の指摘 2026-10-17「放牧いらない」）：入厩前の若駒・前のセーブで放牧に出していた馬（World.migrate が戻す）
  const farmNote = h => h.parked ? '牧場（次の週に入厩）' : '入厩前（2歳の4月から入厩）';
  const nextLabel = h => { const n = P.next(h); return !n ? `<span class="muted">${h.auto ? 'おまかせ' : '未定'}</span>` : n.entered ? `今週 <b>${e(R.label(n.race))}</b>` : `${n.label} <b>${e(n.name)}</b>`; };

  UI.programTab = function (h, st) {
    const K = UI.kit, G = W.get();
    const o = { show: st.pshow || 'ok', kind: st.pkind || 'all', surf: st.psurf || '' };
    const rows = P.rows(h, o);
    const wIdx = W.wIdx();
    const head = `<div class="pg-head"><span>距離 <b>${h.distMin}〜${h.distMax}m</b></span><span>芝 ${K.mark(P.fitSurf(h, '芝'))} ダート ${K.mark(P.fitSurf(h, 'ダ'))}</span><span>脚質 <b>${e(H.styleText(h))}</b></span>
      ${h.loc === 'stable' ? `<span>疲労 ${UI.fatigueMark(h)}</span>` : `<span class="muted">${h.loc === 'farm' ? farmNote(h) : ''}</span>`}
      <span class="next">次走：${nextLabel(h)}</span></div>
      ${h.auto ? `<div class="panel small mt row"><span class="grow">おまかせ中：出るレースは自動で決まる。表から選ぶと、おまかせは切れる。</span><button class="btn sm" data-act="auto" data-id="${h.id}">おまかせを切る</button></div>` : ''}`;
    const filters = `<div class="u-segs mt">${K.seg('表示', [['ok', '出られるレース'], ['all', '出られない重賞も']], o.show, 'pg-set', 'pshow')}
      ${K.seg('種類', [['all', 'オープンと重賞'], ['graded', '重賞だけ']], o.kind, 'pg-set', 'pkind')}
      ${K.seg('馬場', [['', 'すべて'], ['芝', '芝'], ['ダ', 'ダート']], o.surf, 'pg-set', 'psurf')}</div>`;
    let lastM = null, first = true;
    const body = rows.map(x => {
      const r = x.race, wk = x.wk;
      let mh = '';
      if (lastM !== `${wk.y}-${wk.m}`) { lastM = `${wk.y}-${wk.m}`; mh = `<tr class="u-month"><td colspan="7">${wk.m}月<small>${wk.y !== G.year ? W.yLabel(wk.y) : ''}</small></td></tr>`; }
      const act = x.state === 'entered' ? `<span class="tag ent">出走登録</span> <button class="btn sm" data-act="unenter" data-id="${h.id}">取消</button>`
        : x.state === 'reserved' ? `<span class="tag rsv">予約</span> <button class="btn sm" data-act="unreserve" data-id="${h.id}" data-key="${e(r.key)}">取消</button>`
        : x.can === 'enter' ? `<button class="btn sm gold" data-act="enter" data-id="${h.id}" data-race="${e(r.key)}"${first ? ' data-autofocus' : ''}>出走する</button>`
        : x.can === 'reserve' ? `<button class="btn sm" data-act="reserve" data-id="${h.id}" data-key="${e(r.key)}"${first ? ' data-autofocus' : ''}>予約する</button>`
        : x.busy ? '<span class="tag busy">この週は予約あり</span>' : `<span class="why">${e(x.why || '')}</span>`;
      if (x.can) first = false;
      return `${mh}<tr class="${x.state ? 'mine' : ''} ${x.why && !x.state ? 'dim' : ''} ${r.grade === 'G1' ? 'g1' : ''} ${wk.i === 0 ? 'now' : ''}">
        <td class="wk"><b>${W.weekLabel(wk.m, wk.w)}</b><small>${wk.i === 0 ? '今週' : `${wk.i}週後`}</small></td>
        <td><div>${clsLabel(r)} <span class="nm">${e(R.label(r))}</span></div><div class="sub">${UI.ageCond(r)}${x.others.length ? `・<span style="color:var(--warn)">${x.others.map(e).join('・')}も予約</span>` : ''}</div></td>
        <td class="w">${e(r.course)} ${UI.surf(r.surface)} ${r.dist}m</td>
        <td class="c" title="距離の向き">${K.mark(x.dist)}</td><td class="c" title="馬場の向き">${K.mark(x.surf)}</td>
        <td class="r w small">${U.money(r.prize || 0)}</td><td class="act">${act}</td></tr>`;
    }).join('');
    return `${head}${filters}
      <div class="u-tbox mt">${rows.length ? `<table class="u-t pg-t"><tr><th>週</th><th>レース</th><th>コース</th><th class="c">距離</th><th class="c">馬場</th><th class="r">1着賞金</th><th></th></tr>${body}</table>` : '<div class="u-empty">この条件で出られるレースがありません。「出られない重賞も」で見られます。</div>'}</div>
      <div class="small muted mt">今週のレースは出走登録、来週から1年先までは予約。予約はその週の初めに出走登録に変わる（出られなくなったら知らせる）。G1 は獲得賞金の条件がある。◎○△× は距離と馬場の向き。</div>`;
  };
  App.act['pg-set'] = d => { const v = App.st.view; if (!v) return; v[d.k] = d.v; const y = window.scrollY; App.render(); window.scrollTo(0, y); const el = App.findSig(document.getElementById('app'), JSON.stringify(['pg-set', '', '', d.k, d.v, '', '', '', ''])); if (el && document.body.dataset.input !== 'mouse') App.navSelect(el, true); };
  // 予約：今週から1年先の番組から探す（重賞もオープンも）
  App.act.reserve = d => {
    const race = P.find(d.key);
    const err = race ? T.reserve(d.id, race) : 'レースが見つからない';
    if (err) App.toast(err); else { App.toast(`${R.label(race)}（${race.month}月${race.week}週）を予約した`); App.save(); }
    const y = window.scrollY; App.render(); window.scrollTo(0, y);
  };
  const keepY = fn => d => { const y = window.scrollY; fn(d); window.scrollTo(0, y); };
  App.act.unreserve = keepY(App.act.unreserve);
  App.act.enter = keepY(App.act.enter);
  App.act.unenter = keepY(App.act.unenter);
  App.act.program = d => { App.go({ name: 'horse', id: d.id, htab: 'train' }); };

  // ---------- 厩舎（騎手のゲーム）：お手馬を1行ずつ。疲労・総合力・次走が一目で分かる。「番組表」で次走を選ぶ ----------
  const stable0 = UI.screens.stable;
  UI.screens.stable = function (st) {
    if (!isJ()) return stable0(st);
    const G = W.get(), K = UI.kit, wIdx = W.wIdx();
    const inStable = W.mine('stable').sort((a, b) => a.born - b.born || (b.prize || 0) - (a.prize || 0));
    const farm = W.mine('farm');
    const row = (h, k) => {
      const fh = T.fhBoth(h, wIdx);
      return `<tr data-act="horse" data-id="${h.id}"${k === 0 ? ' data-autofocus' : ''}><td class="th">${UI.thumb(h)}</td>
        <td><div class="nm">${e(h.name)} ${UI.histMark(h)}${h.auto ? ' <span class="chip">おまかせ</span>' : ''}</div><div class="sub">${UI.age(h)}・${h.starts || 0}戦${h.wins || 0}勝・本賞金 ${U.money(h.earn || 0)}</div>${UI.reachLine(h)}</td>
        <td>${h.loc === 'stable' ? UI.fatigueMark(h) : `<span class="muted small">${farmNote(h)}</span>`}</td>
        <td>${K.fh(fh.turf, fh.dirt)}</td>
        <td class="next small">${nextLabel(h)}</td>
        <td class="r"><button class="btn sm gold" data-act="program" data-id="${h.id}">番組表</button></td></tr>`;
    };
    const tbl = list => `<div class="u-tbox"><table class="u-t st-t"><tr><th></th><th>馬</th><th>疲労</th><th>${T.FH_NAME}（いま）</th><th>次走</th><th></th></tr>${list.map(row).join('')}</table></div>`;
    return K.band({ icon: 'stable', title: '厩舎', sub: '馬を押すと能力、「番組表」で次に出るレースを選ぶ', right: K.stat('お手馬', `${T.ownCount()} / ${T.MAX_OWN}`) + K.stat('毎月の費用', U.money(W.monthlyCost())) })
      + (inStable.length ? tbl(inStable) : '<div class="u-empty">入厩している馬がいません。馬の店で買った馬は、2歳の4月から自動で入厩します。</div>')
      + (farm.length ? `<h2 class="sec">牧場<span class="r">入厩前の馬</span></h2>${tbl(farm)}` : '');
  };
})();
