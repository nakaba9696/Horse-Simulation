// ライバル騎手の画面：出走表の札・ホームの騎乗の札・パドックのひと言・データの「ライバル」タブ
// 仕組みは js/core/rivals.js。騎乗中には文字を出さない（馬群レーダーで色を変えるだけ。js/ui/ride.js）
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, W = HS.World, R = HS.Races, UI = HS.UI, App = HS.App, J = HS.Jockey, Rv = HS.Rivals;
  if (!Rv || !UI || !App) return;
  const e = U.esc;
  const on = () => Rv.on();
  const style = rv => `--rc:${rv.colors.base};--rs:${rv.colors.sub}`;

  // 顔の代わりの札：札の色（地・縁）と名前の一字
  UI.rivalBadge = (rv, size) => `<span class="rv-badge" style="${style(rv)};--rz:${size || 40}px" role="img" aria-label="${e(rv.name)}">${e(rv.crest)}</span>`;
  // 出走表の騎手の欄に付ける小さな札
  UI.rivalChip = x => { if (!on()) return ''; const rv = Rv.ofRunner(x); return rv ? `<span class="rv-chip" style="${style(rv)}" title="ライバル：${e(rv.label)}">${e(rv.crest)}</span>` : ''; };
  const record = id => { const v = Rv.vs(id); return v.meets ? `${v.ahead}勝${v.behind}敗` : '初対決'; };
  const sceneTag = (sc, id) => { const n = Math.abs(Rv.vs(id).streak); return { first: '初対決', g1: '大一番', streakL: `${n}連敗中`, streakW: `${n}連勝中`, afterWin: '前走は先着', afterLoss: '前走は先着された' }[sc] || ''; };

  // ホームの騎乗の札：同じレースに出てくるライバル
  UI.rideRivals = function (card) {
    if (!on()) return '';
    const rs = Rv.inCard(card); if (!rs.length) return '';
    return `<div class="rv-call">ライバル ${rs.map(({ rv, x }) => `<span class="rv-who">${UI.rivalChip(x)}<b>${e(rv.name)}</b><span class="small muted">${e(x.horse.name)}</span></span>`).join('')}</div>`;
  };

  // パドック：同じレースのライバルと、ひと言
  UI.paddockRivals = function (card) {
    if (!on()) return '';
    const rs = Rv.inCard(card); if (!rs.length) return '';
    return `<div class="panel mt rv-paddock"><div class="small muted">このレースのライバル</div>${rs.map(({ rv, x }) => {
      const ln = Rv.lineFor(rv.id, card.race, x.horse), tag = sceneTag(ln.scene, rv.id);
      return `<div class="rv-row" style="${style(rv)}">${UI.rivalBadge(rv, 52)}<div class="grow">
        <div class="rv-who"><b>${e(rv.name)}</b><span class="rv-type">${e(rv.label)}</span>${tag ? `<span class="rv-tag ${ln.scene}">${tag}</span>` : ''}</div>
        <div class="small">${UI.waku ? UI.waku(x.frame, x.num) : x.num + '番'} <b>${e(x.horse.name)}</b>　${x.pop ? `${x.pop}番人気` : ''}　対戦 ${record(rv.id)}</div>
        <div class="rv-say">「${e(ln.text)}」</div></div></div>`;
    }).join('')}</div>`;
  };

  // データの「ライバル」タブ：一人ずつの札（型・今年の相棒の馬・対戦成績）と、対戦の記録
  UI.rivalTab = function () {
    if (!on()) return '<div class="panel empty">騎手のゲームで出てきます。</div>';
    const g = W.get(), s = Rv.state(), y = g.year;
    const cards = Rv.list().map(rv => {
      const v = Rv.vs(rv.id), yr = v.years[y] || [0, 0];
      const ps = Rv.partners(rv.id).sort((a, b) => b.born - a.born);
      const big = (s.big[rv.id] || []).filter(b => b.grade === 'G1').slice(0, 4);
      const won = Object.entries(s.titles).filter(([, ids]) => ids.includes(rv.id)).map(([yy]) => W.yLabel(+yy));
      const pct = v.meets ? Math.round(v.ahead / v.meets * 100) : 50;
      return `<div class="rv-card" style="${style(rv)}">${UI.rivalBadge(rv, 64)}<div class="grow">
        <div class="rv-who"><b>${e(rv.name)}</b><span class="small muted">${e(rv.kana)}・${e(rv.region)}</span></div>
        <div><span class="rv-type">${e(rv.label)}</span><span class="small muted">　${e(Rv.TYPE_LABEL[rv.type] || '')}</span></div>
        <div class="small rv-note">${e(rv.note)}</div>
        <div class="rv-vs"><div><small>通算</small><b>${v.ahead}</b>-<b>${v.behind}</b></div><div><small>重賞</small><b>${v.gAhead}</b>-<b>${v.gMeets - v.gAhead}</b></div><div><small>G1</small><b>${v.g1Ahead}</b>-<b>${v.g1Meets - v.g1Ahead}</b></div><div><small>今年</small><b>${yr[0]}</b>-<b>${yr[1]}</b></div></div>
        <div class="rv-bar" title="先着の割合"><i style="width:${pct}%"></i></div>
        <div class="small">相棒の馬：${ps.length ? ps.map(h => `<b>${e(h.name)}</b>（${g.year - h.born}歳）`).join('・') : 'なし'}</div>
        ${big.length ? `<div class="small muted">G1：${big.map(b => `${W.yLabel(b.y)} ${e(b.race)}（${e(b.horse)}）`).join('・')}</div>` : ''}
        ${won.length ? `<div class="small rv-won">勝ち越した年：${won.join('・')}</div>` : ''}
      </div></div>`;
    }).join('');
    const log = s.log.slice(0, 40);
    const lt = log.length ? `<h2 class="sec">対戦の記録<span class="r">新しい順</span></h2><div class="tblwrap"><table class="t"><tr><th>日付</th><th>レース</th><th>ライバル</th><th>あなた</th><th>相手</th></tr>
      ${log.map(r => { const rv = Rv.by(r.id); if (!rv) return ''; const win = r.me < r.rv; return `<tr><td class="small">${UI.newsDate ? UI.newsDate(r) : `${W.yLabel(r.y)}${r.m}月`}</td><td class="small">${r.grade ? `<span class="grade ${r.grade}">${r.grade}</span> ` : ''}${e(r.race)}</td>
        <td class="small"><span class="rv-chip" style="${style(rv)}">${e(rv.crest)}</span>${e(rv.name)}</td><td class="num ${win ? 'pos1' : ''}">${r.me}着<div class="small muted">${e(r.mine)}</div></td><td class="num ${win ? '' : 'pos1'}">${r.rv}着<div class="small muted">${e(r.horse)}</div></td></tr>`; }).join('')}</table></div>`
      : '<div class="panel empty mt">まだ対戦していません。同じレースに出ると記録が残ります。</div>';
    return `<div class="small muted">毎年強い史実馬に乗ってくる、顔なじみの騎手たち。G1 で破る・1年の対戦で勝ち越すと評判が上がる。</div><div class="rv-grid mt">${cards}</div>${lt}`;
  };
})();
