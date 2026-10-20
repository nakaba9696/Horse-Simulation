// 殿堂（お手馬）の画面：歴代の殿堂入りしたお手馬の札と、記録を振り返る小窓（js/core/hall.js）
// お手馬の1走の記録の小窓（出走馬・ラップ・勝ち時計。js/core/racerec.js）も、馬の画面の戦績と殿堂の全成績から開く
(function () {
  const HS = globalThis.HS;
  const UI = HS.UI, W = HS.World, U = HS.U, H = HS.Horse, App = HS.App;
  const e = U.esc;
  const thumb = x => `<canvas class="thumb" width="168" height="112" data-art="thumbdata" data-coat="${e(x.coat || '鹿毛')}" data-key="${e(x.name)}"></canvas>`;
  const trophyChips = x => x.trophies.map(t => `<span class="chip crown">🏆 ${e(t.label)}<small> ${e(W.yLabel(t.y))}</small></span>`).join('');
  const span = x => { const a = Math.min(x.first, x.retiredY), b = Math.max(x.first, x.retiredY, ...(x.results || []).map(r => r.y)); return a === b ? W.yLabel(a) : `${W.yLabel(a)}〜${W.yLabel(b)}`; };

  // 殿堂の節（データの「殿堂」の上に出す）
  UI.hallOwn = function () {
    const HL = HS.Hall; if (!HL) return '';
    const list = HL.list();
    // まだ走っている・牧場にいる馬で、引退すれば殿堂入りする馬
    const cand = W.mine().filter(h => h.loc !== 'retired' && HL.eligible(h) && !HL.byId(h.id));
    const head = `<h2 class="sec">殿堂入りしたお手馬<span class="r">${list.length}頭</span></h2>
      <div class="small muted">トロフィーを${HL.NEED}つ以上手にした自分の馬は、引退させるときに殿堂入りさせるかを選べます。札を押すと、その馬の記録を振り返れます。</div>`;
    const candHtml = cand.length ? `<div class="panel gold mt">引退させるときに殿堂入りできる：${cand.map(h => `<b>${e(h.name)}</b>（トロフィー ${HL.trophiesOf(h).length}）`).join('・')}</div>` : '';
    if (!list.length) return head + candHtml + `<div class="panel empty mt">まだ殿堂入りしたお手馬はいません。</div>`;
    return head + candHtml + `<div class="hall-cards mt">${list.map((x, k) => `<button class="hall-card" data-act="hallview" data-id="${e(x.id)}" style="--i:${Math.min(k, 12)}">
        ${thumb(x)}
        <span class="hc-body"><b class="nm">${e(x.name)}</b><span class="small muted">${x.sex === '牝' ? '牝馬' : '牡馬'}・${e(x.coat || '')}・${span(x)}</span>
          <span class="hc-rec">${x.starts}戦${x.wins}勝・G1 ${x.g1}勝・${U.money(x.prize)}</span>
          <span class="hc-tr">${trophyChips(x)}</span></span></button>`).join('')}</div>`;
  };

  // 記録を振り返る小窓
  UI.hallModal = function (id) {
    const x = HS.Hall.byId(id); if (!x) return '';
    const sk = (x.skills || []).filter(s => !(H.SKILLS[s] && H.SKILLS[s].style)).map(s => { const k = H.SKILLS[s] || (HS.Skills && HS.Skills.BY && HS.Skills.BY[s]); return k ? `<span class="chip skill">${e(k.label)}</span>` : ''; }).join('');
    const gw = (x.gradedWins || []).map(g => `<div>${e(W.yLabel(g.y))} ${UI.gradeTag ? UI.gradeTag({ grade: g.grade, region: g.region, year: g.y }) : e(g.grade)} ${e(g.race)}</div>`).join('');
    const rows = (x.results || []).map((r, i) => `<tr class="${r.pos === 1 ? 'win' : ''} click" data-act="racerec" data-hall="${e(x.id)}" data-i="${i}"><td>${e(W.yLabel(r.y))}${r.m}月</td><td>${e(r.race)}</td><td>${e(r.course || '')}${r.surface === 'ダ' ? 'ダ' : '芝'}${r.dist || ''}</td><td class="num"><b>${r.pos}</b>/${r.n || ''}</td><td class="num">${r.time ? U.time(r.time) : ''}</td><td>${e(r.jockey || '')}</td><td class="small muted">${HS.RaceRec && HS.RaceRec.has(r) ? '記録' : ''}</td></tr>`).join('');
    return `<div class="hall-modal">
      <div class="hm-head">${thumb(x)}<div><div class="hm-badge">殿堂入り</div><h3>${e(x.name)}</h3>
        <div class="small muted">${x.born}年生・${x.sex === '牝' ? '牝' : '牡'}・${e(x.coat || '')}　父 ${e(x.sire || '?')}　母 ${e(x.dam || '?')}</div>
        <div class="small muted">${span(x)}（${W.yLabel(x.retiredY)}に引退）・${e(x.style || '')}${x.fh ? `・総合力 芝${x.fh.turf}／ダ${x.fh.dirt}` : ''}</div></div></div>
      <div class="apt mt"><div>戦績<b>${x.starts}戦${x.wins}勝</b></div><div>2着・3着<b>${x.w2}・${x.w3}</b></div><div>G1<b>${x.g1}勝</b></div><div>獲得賞金<b>${U.money(x.prize)}</b></div></div>
      <h4>トロフィー</h4><div>${trophyChips(x)}</div>
      ${x.titles && x.titles.length ? `<div class="mt">${x.titles.map(l => `<span class="chip crown">👑 ${e(l)}</span>`).join('')}</div>` : ''}
      ${sk ? `<h4>特殊能力</h4><div class="skills">${sk}</div>` : ''}
      ${gw ? `<h4>重賞の勝ち鞍</h4><div class="panel">${gw}</div>` : ''}
      ${rows ? `<h4>全成績<span class="small muted">（行を押すと、そのレースの出走馬とラップ）</span></h4><div class="tblwrap hm-res"><table class="t"><tr><th>時期</th><th>レース</th><th>コース</th><th>着順</th><th>タイム</th><th>騎手</th><th></th></tr>${rows}</table></div>` : ''}
      <div class="btns mt"><button class="btn" data-act="close">閉じる</button></div></div>`;
  };
  if (App && App.act) App.act.hallview = d => App.modal(UI.hallModal(d.id), { wide: true });

  // お手馬の1走の記録（出走馬・ラップ・勝ち時計）。前のセーブで記録の無い1走は「記録なし」
  UI.raceRecModal = function (r, name) {
    const RR = HS.RaceRec;
    const head = `<h3>${UI.gradeTag ? UI.gradeTag({ grade: r.grade, region: '', year: r.y }) : ''} ${e(r.race)}</h3>
      <div class="small muted">${e(W.yLabel(r.y))} ${r.m}月${r.w ? r.w + '週' : ''}・${e(r.course || '')} ${r.surface === 'ダ' ? 'ダート' : '芝'}${r.dist || ''}m${r.ground ? '・' + e(r.ground) : ''}</div>
      <div class="apt mt"><div>${e(name)}<b>${r.pos}着／${r.n || ''}頭</b></div><div>タイム<b>${r.time ? U.time(r.time) : '－'}</b></div><div>着差<b>${r.pos > 1 ? e(r.margin || '') : '－'}</b></div><div>人気<b>${r.pop ? r.pop + '番人気' : '－'}</b></div></div>`;
    const close = '<div class="btns mt"><button class="btn" data-act="close">閉じる</button></div>';
    if (!RR || !RR.has(r)) return `<div class="racerec">${head}<div class="panel empty mt">記録なし（出走馬とラップを残す前のレース）</div>${close}</div>`;
    const laps = RR.laps(r);
    const rows = RR.rows(r).map(x => `<tr class="${x.name === name ? 'lead-me' : ''}"><td class="num"><b>${x.pos}</b></td><td>${UI.waku ? UI.waku(x.frame, x.num) : x.num}</td><td>${e(x.name)}</td><td class="num">${U.time(x.time)}</td><td class="small">${x.pos > 1 ? e(x.margin) : ''}</td><td class="num">${x.pop || ''}</td><td class="small">${e(x.jockey)}</td></tr>`).join('');
    return `<div class="racerec">${head}
      <h4>ラップ<span class="small muted">（先頭の200mごと）</span></h4><div class="panel num">${laps.length ? laps.map(v => v.toFixed(1)).join(' - ') : '－'}<span class="right">勝ち時計 <b>${U.time(RR.winTime(r))}</b></span></div>
      <h4>出走馬<span class="small muted">（${RR.rows(r).length}頭）</span></h4>
      <div class="tblwrap"><table class="t"><tr><th>着</th><th>枠・馬番</th><th>馬名</th><th>タイム</th><th>着差</th><th>人気</th><th>騎手</th></tr>${rows}</table></div>${close}</div>`;
  };
  if (App && App.act) App.act.racerec = d => {
    const i = +d.i;
    if (d.hall) { const x = HS.Hall.byId(d.hall); if (x && x.results[i]) App.modal(UI.raceRecModal(x.results[i], x.name), { wide: true }); return; }
    const h = W.horse(d.id); if (h && h.results[i]) App.modal(UI.raceRecModal(h.results[i], h.name), { wide: true });
  };
})();
