// コースレコードの一覧（競馬場・芝ダート・距離で絞る）と、レコードを破ったときの「RECORD」の札
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, W = HS.World, UI = HS.UI, App = HS.App;
  const e = U.esc;

  // 前のレコードとの差（-0.4 のように。速くなった分は負）
  UI.recDiff = d => d == null ? '' : `${d < 0 ? '−' : '+'}${Math.abs(d).toFixed(1)}`;
  // 結果の画面の頭に出す札。rec＝W.noteRecord の戻り値
  UI.recordBanner = rec => rec ? `<div class="rec-banner ${rec.rode ? 'me' : ''}"><b class="rec-word">RECORD</b><span class="rec-time">${U.time(rec.t)}</span><span class="rec-diff">${UI.recDiff(rec.diff)}</span><span class="rec-old small">前のレコード ${U.time(rec.old)}</span></div>` : '';
  const resultTable0 = UI.resultTable;
  UI.resultTable = r => UI.recordBanner(r && r.rec) + resultTable0(r);

  // 一覧。st：{ rc: 競馬場, rs: 芝ダ, rd: 距離 }（空は「すべて」）
  UI.courseRecords = function (st) {
    const G = W.get();
    const all = Object.entries(G.records.course || {}).map(([k, v]) => { const [c, sf, d] = k.split('|'); return Object.assign({ c, sf, d: +d }, v); });
    if (!all.length) return '<div class="panel empty">まだ記録がありません。</div>';
    const rc = st.rc || '', rs = st.rs || '', rd = +st.rd || 0;
    const courses = [...new Set(all.map(r => r.c))].sort((a, b) => a.localeCompare(b, 'ja'));
    const byCS = all.filter(r => (!rc || r.c === rc) && (!rs || r.sf === rs));
    const dists = [...new Set(byCS.map(r => r.d))].sort((a, b) => a - b);
    const rows = byCS.filter(r => !rd || r.d === rd).sort((a, b) => a.c.localeCompare(b.c, 'ja') || a.sf.localeCompare(b.sf, 'ja') || a.d - b.d);
    const mineN = all.filter(r => r.rode).length;
    const opt = (v, label, cur) => `<option value="${e(String(v))}" ${String(v) === String(cur) ? 'selected' : ''}>${e(label)}</option>`;
    return `<div class="small muted">このゲームの中で出た、競馬場・芝ダート・距離ごとの一番速い時計。<span class="rec-star">★</span>は自分が乗って作ったレコード（${mineN}件）。</div>
      <div class="filters mt">
        <select data-act-change="recf" data-k="rc" aria-label="競馬場">${opt('', '競馬場：すべて', rc)}${courses.map(c => opt(c, c, rc)).join('')}</select>
        <select data-act-change="recf" data-k="rs" aria-label="芝・ダート">${opt('', '芝・ダート：すべて', rs)}${opt('芝', '芝', rs)}${opt('ダ', 'ダート', rs)}</select>
        <select data-act-change="recf" data-k="rd" aria-label="距離">${opt(0, '距離：すべて', rd)}${dists.map(d => opt(d, `${d}m`, rd)).join('')}</select>
      </div>
      ${rows.length ? `<div class="tblwrap mt"><table class="t rec-t"><tr><th>コース</th><th>持ちタイム</th><th>馬</th><th class="hide-sm">騎手</th><th>年</th><th class="hide-sm">レース</th></tr>
      ${rows.map(r => `<tr class="${r.rode ? 'lead-me rec-mine' : ''}"><td>${r.rode ? '<span class="rec-star">★</span>' : ''}${e(r.c)} ${UI.surf(r.sf)} ${r.d}m</td>
        <td class="num"><b>${U.time(r.t)}</b>${r.prev != null ? `<div class="small muted">${UI.recDiff(Math.round((r.t - r.prev) * 10) / 10)}</div>` : ''}</td>
        <td>${r.rode ? '<b>' + e(r.name) + '</b>' : e(r.name)}<div class="small muted show-sm">${e(r.jockey || '')}</div></td><td class="small hide-sm">${e(r.jockey || '－')}</td>
        <td class="small">${e(W.yLabel(r.year))}</td><td class="small hide-sm">${e(r.race || '')}</td></tr>`).join('')}</table></div>` : '<div class="panel empty mt">この条件の記録はありません。</div>'}`;
  };
  App.change.recf = el => {
    const v = App.st.view && App.st.view.name === 'jrecord' ? App.st.view : (App.st.view = { name: 'jrecord', jtab: 'course' });
    v[el.dataset.k] = el.value;
    if (el.dataset.k !== 'rd') v.rd = ''; // 競馬場・芝ダを変えたら距離は選び直す
    App.render();
  };
})();
