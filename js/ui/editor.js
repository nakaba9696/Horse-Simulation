// 競走馬エディット（タイトルから開く）：史実馬の一覧と書き換え
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, H = HS.Horse, E = HS.Edits, UI = HS.UI, App = HS.App, W = HS.World;
  const e = U.esc;
  const PAGE = 60;
  const DISTS = []; for (let d = 1000; d <= 3600; d += 100) DISTS.push(d);

  const edits = () => E.loadLocal();
  // 編集を当てたデータ（一覧で見る値）
  const list = () => HS.DATA.historic || [];
  const jockeyOf = d => { const j = HS.DATA.historicJockeys && HS.DATA.historicJockeys[d.name]; return !j ? '' : typeof j === 'string' ? j : (j.default || ''); };
  const surfLabel = s => s === 'ダ' ? 'ダート' : s === '芝ダ' ? '芝・ダ' : '芝';

  function filtered(st) {
    const q = (st.q || '').trim();
    const ed = edits();
    let a = list().filter(d =>
      (!q || d.name.includes(q) || (d.sire || '').includes(q) || (d.dam || '').includes(q) || jockeyOf(d).includes(q)) &&
      (!st.born || (st.born.length === 3 ? String(d.born).startsWith(st.born) : d.born === +st.born)) &&
      (!st.sex || (st.sex === '牡' ? d.sex !== '牝' : d.sex === '牝')) &&
      (!st.surf || (st.surf === '芝' ? d.surface !== 'ダ' : d.surface !== '芝')) &&
      (!st.cty || (st.cty === '日' ? !HS.DATA.isForeign(d) : HS.DATA.isForeign(d))) &&
      (!st.edited || ed[d.name]));
    // 見出しで選んだ列で並べる（同じ値なら生年・名前の順）
    const col = COLS.find(c => c.k === (st.sortKey || 'born')) || COLS[1];
    const dir = st.sortDir || col.dir;
    a = a.map(d => [d, col.val(d)]).sort((x, y) => {
      const c = col.str ? String(x[1] || '').localeCompare(String(y[1] || ''), 'ja') : (x[1] ?? -1e9) - (y[1] ?? -1e9);
      return c * dir || x[0].born - y[0].born || x[0].name.localeCompare(y[0].name, 'ja');
    }).map(x => x[0]);
    return a;
  }

  // 1頭ぶんの能力（編集を当てたデータから計算。編集が変わるまで使い回す）
  const infoCache = new Map();
  let infoVer = -1;
  function info(d) {
    if (infoVer !== E.version) { infoCache.clear(); infoVer = E.version; }
    let v = infoCache.get(d.name);
    if (!v) { const h = H.fromHistoric(d, 'x'); v = { pot: h.pot, temper: h.temper, health: h.health, heavy: h.apt.heavy }; infoCache.set(d.name, v); }
    return v;
  }
  const order = arr => v => { const i = arr.indexOf(v); return i < 0 ? 99 : i; };
  // 一覧の列。dir：最初に押したときの向き（1＝小さい順、-1＝大きい順）
  const COLS = [
    { k: 'name', label: '馬名', val: d => d.name, str: true, dir: 1 },
    { k: 'born', label: '生年', val: d => d.born, dir: 1 },
    { k: 'rating', label: '評価', val: d => d.rating, dir: -1, heat: true },
    ...H.STATS.map(k => ({ k, label: H.STAT_LABEL[k], val: d => Math.round(info(d).pot[k]), dir: -1, heat: true })),
    { k: 'temper', label: '気性', val: d => Math.round(info(d).temper), dir: -1, heat: true, title: '大きいほど落ち着いている' },
    { k: 'health', label: '体質', val: d => Math.round(info(d).health), dir: -1, heat: true, title: '大きいほど丈夫' },
    { k: 'heavy', label: '道悪', val: d => Math.round(info(d).heavy), dir: -1, heat: true, title: '大きいほど重い馬場が得意（自動で決まる）' },
    { k: 'dist', label: '距離', val: d => d.distMin * 10000 + d.distMax, dir: 1, show: d => `${d.distMin}〜${d.distMax}` },
    { k: 'surface', label: '馬場', val: d => order(['芝', '芝ダ', 'ダ'])(d.surface), dir: 1, show: d => surfLabel(d.surface) },
    { k: 'style', label: '脚質', val: d => order(H.STYLES)(d.style), dir: 1, show: d => d.style },
    { k: 'growth', label: '成長', val: d => order(H.GROWTHS)(d.growth), dir: 1, show: d => d.growth },
    { k: 'retire', label: '引退', val: d => d.retire, dir: 1 },
    { k: 'country', label: '国', val: d => HS.DATA.isForeign(d) ? d.country : '日', str: true, dir: 1 },
    { k: 'jockey', label: '主戦', val: d => jockeyOf(d), str: true, dir: 1 },
  ];
  // 数の大きさで色を付ける（Excel の条件付き書式のように）
  const heat = v => { const t = Math.max(0, Math.min(1, (v - 50) / 50)); return `background:hsla(${210 - t * 170}, 70%, ${38 + t * 10}%, ${0.18 + t * 0.5})`; };

  UI.screens.editor = function (st) {
    const ed = edits();
    const n = Object.keys(ed).length;
    const years = [...new Set(list().map(d => d.born))].sort((a, b) => a - b);
    return `<div class="mt">
      <div class="row"><button class="btn sm" data-act="title">← タイトル</button><span class="right small muted">${list().length}頭・編集済み ${n}頭</span></div>
      <h2 class="sec">競走馬エディット</h2>
      <div class="panel small">史実馬の能力・適性・毛色・主戦騎手などを書き換えられます。編集はこの端末に保存され、<b>次に「はじめから」始めるゲーム</b>に反映されます（遊んでいるセーブは、始めたときの内容のまま）。</div>
      <div class="panel mt">
        <div class="field"><label for="ed-q">検索（馬名・父・母・騎手）</label><input id="ed-q" value="${e(st.q || '')}" placeholder="例：ディープ、サンデーサイレンス、武豊"></div>
        <div class="filters">
          <select id="ed-born" aria-label="生年"><option value="">生年：すべて</option>
            ${['195', '196', '197', '198', '199', '200', '201', '202'].map(dc => `<option value="${dc}" ${st.born === dc ? 'selected' : ''}>${dc}0年代生</option>`).join('')}
            ${years.map(y => `<option value="${y}" ${String(st.born) === String(y) ? 'selected' : ''}>${y}年生</option>`).join('')}</select>
          <select id="ed-sex" aria-label="性別"><option value="">性：すべて</option><option ${st.sex === '牡' ? 'selected' : ''} value="牡">牡・セ</option><option ${st.sex === '牝' ? 'selected' : ''} value="牝">牝</option></select>
          <select id="ed-surf" aria-label="馬場"><option value="">馬場：すべて</option><option ${st.surf === '芝' ? 'selected' : ''} value="芝">芝</option><option ${st.surf === 'ダ' ? 'selected' : ''} value="ダ">ダート</option></select>
          <select id="ed-cty" aria-label="国"><option value="">国：すべて</option><option ${st.cty === '日' ? 'selected' : ''} value="日">日本</option><option ${st.cty === '外' ? 'selected' : ''} value="外">海外</option></select>
          <label class="small"><input type="checkbox" id="ed-edited" ${st.edited ? 'checked' : ''}> 編集済みだけ</label>
        </div>
      </div>
      <div id="ed-list" class="mt">${listHtml(st)}</div>
      <div class="btns mt"><button class="btn" data-act="ed-export">編集を書き出す</button><button class="btn" data-act="ed-import">編集を読み込む</button><button class="btn red" data-act="ed-reset-all" ${n ? '' : 'disabled'}>すべて初期値に戻す</button></div>
    </div>`;
  };
  function listHtml(st) {
    const a = filtered(st);
    const ed = edits();
    const lim = st.limit || PAGE;
    if (!a.length) return '<div class="panel empty">当てはまる馬がいません。</div>';
    const key = st.sortKey || 'born';
    const curCol = COLS.find(c => c.k === key) || COLS[1];
    const dir = st.sortDir || curCol.dir;
    const head = COLS.map(c => `<th class="sortable ${c.k === key ? 'on' : ''}" data-act="ed-sortcol" data-k="${c.k}"${c.title ? ` title="${e(c.title)}"` : ''}>${c.label}${c.k === key ? (dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('');
    const cell = (c, d) => {
      if (c.k === 'name') return `<td class="nm"><b>${e(d.name)}</b>${ed[d.name] ? ' <span class="chip mine">編集</span>' : ''}<div class="small muted">${d.sex}・${e(d.coat || '')}・父 ${e(d.sire || '?')}</div></td>`;
      const v = c.val(d);
      if (c.heat) return `<td class="num" style="${heat(v)}">${v}</td>`;
      return `<td class="small ${c.str ? '' : 'num'}">${e(c.show ? c.show(d) : v)}</td>`;
    };
    return `<div class="small muted">${a.length}頭・見出しを押すとその列で並べ替え（もう一度押すと逆順）</div>
      <div class="tblwrap ed mt"><table class="t ed-table">
        <tr>${head}</tr>
        ${a.slice(0, lim).map(d => `<tr class="click ${ed[d.name] ? 'mine' : ''}" data-act="ed-open" data-name="${e(d.name)}">${COLS.map(c => cell(c, d)).join('')}</tr>`).join('')}
      </table></div>
      ${a.length > lim ? `<div class="center mt"><button class="btn" data-act="ed-more">もっと見る（残り${a.length - lim}頭）</button></div>` : ''}`;
  }
  function refreshList() {
    const st = App.st.ed;
    const box = document.querySelector('#ed-list');
    if (box) box.innerHTML = listHtml(st);
  }
  // 入力のたびに一覧だけ描き直す（入力欄のフォーカスを保つ）
  document.addEventListener('input', ev => {
    if (App.st.screen !== 'editor') return;
    const st = App.st.ed;
    if (ev.target.id === 'ed-q') { st.q = ev.target.value; st.limit = PAGE; refreshList(); }
  });
  document.addEventListener('change', ev => {
    if (App.st.screen !== 'editor') return;
    const st = App.st.ed; const id = ev.target.id;
    const map = { 'ed-born': 'born', 'ed-sex': 'sex', 'ed-surf': 'surf', 'ed-sort': 'sort', 'ed-cty': 'cty' };
    if (map[id]) { st[map[id]] = ev.target.value; st.limit = PAGE; refreshList(); }
    if (id === 'ed-edited') { st.edited = ev.target.checked; st.limit = PAGE; refreshList(); }
  });

  App.act.editor = () => { E.apply(E.loadLocal()); W.index(); App.st.screen = 'editor'; App.st.ed = App.st.ed || {}; App.render(); window.scrollTo(0, 0); };
  // 見出しを押したら、その列で並べ替え。同じ列ならもう一度で逆順
  App.act['ed-sortcol'] = ds => {
    const st = App.st.ed;
    const col = COLS.find(c => c.k === ds.k); if (!col) return;
    if ((st.sortKey || 'born') === col.k) st.sortDir = -(st.sortDir || col.dir);
    else { st.sortKey = col.k; st.sortDir = col.dir; }
    st.limit = PAGE; refreshList();
  };
  App.act['ed-more'] = () => { App.st.ed.limit = (App.st.ed.limit || PAGE) + PAGE; refreshList(); };

  // ---------- 1頭の編集 ----------
  function defaultsFor(d, rating) {
    const tmp = Object.assign({}, d, { rating, pot: null, temper: null, health: null });
    return H.fromHistoric(tmp, 'x');
  }
  App.act['ed-open'] = ds => {
    const d = list().find(x => x.name === ds.name);
    if (!d) return;
    const o = E.original(d.name);
    const ed = edits()[d.name] || {};
    const base = defaultsFor(d, d.rating);
    const custom = !!d.pot;
    const pot = d.pot || base.pot;
    const temper = d.temper != null ? d.temper : base.temper, health = d.health != null ? d.health : base.health;
    const span = [d.born + 2, d.retire];
    const riders = (HS.DATA.jockeys || []).filter(j => j.from <= span[1] && (j.to || 9999) >= span[0]).map(j => j.name);
    const curJ = jockeyOf(d);
    const jOpts = [...new Set([curJ, ...riders].filter(Boolean))];
    const sel = (id, opts, cur) => `<select id="${id}">${opts.map(v => `<option ${String(v) === String(cur) ? 'selected' : ''} value="${e(v)}">${e(v)}</option>`).join('')}</select>`;
    const statRow = k => `<div class="stat"><span class="lb">${H.STAT_LABEL[k]}</span><input type="range" id="ed-p-${k}" min="20" max="120" value="${Math.round(pot[k])}" ${custom ? '' : 'disabled'}><span class="gr" id="ed-pv-${k}">${Math.round(pot[k])}</span></div>`;
    const bg = App.modal(`<h3>${e(d.name)}${Object.keys(ed).length ? ' <span class="chip mine">編集済み</span>' : ''}</h3>
      <div class="hero"><canvas width="960" height="480" id="ed-cv"></canvas>
        <div class="plate"><div class="nm">${e(d.name)}</div><div class="pd">${d.born}年生 ${d.sex}　父 ${e(d.sire || '?')}　母 ${e(d.dam || '?')}${d.damsire ? '（母父 ' + e(d.damsire) + '）' : ''}</div></div></div>
      <div class="panel small mt">${d.note ? e(d.note) + '<br>' : ''}${(d.wins || []).length ? '史実の勝ち鞍：' + d.wins.map(e).join('、') : '史実ではG1未勝利'}</div>
      <div class="panel mt">
        <div class="field"><label for="ed-rating">評価（能力の総合。100で歴代の名馬級）</label>
          <div class="row"><input type="range" id="ed-rating" class="grow" min="20" max="110" value="${d.rating}"><b id="ed-rv" class="serif" style="min-width:64px;text-align:right;color:var(--gold2)">${U.grade(d.rating)} ${d.rating}</b></div>
          <div class="small muted">元の値：${U.grade(o.rating)} ${o.rating}</div></div>
        <div class="row wrap">
          <div class="field grow"><label for="ed-surface">馬場</label>${sel('ed-surface', ['芝', 'ダ', '芝ダ'], d.surface)}</div>
          <div class="field grow"><label for="ed-dmin">距離（短）</label>${sel('ed-dmin', DISTS, d.distMin)}</div>
          <div class="field grow"><label for="ed-dmax">距離（長）</label>${sel('ed-dmax', DISTS, d.distMax)}</div>
        </div>
        <div class="row wrap">
          <div class="field grow"><label for="ed-style">脚質</label>${sel('ed-style', H.STYLES, d.style)}</div>
          <div class="field grow"><label for="ed-growth">成長型</label>${sel('ed-growth', H.GROWTHS, d.growth)}</div>
          <div class="field grow"><label for="ed-coat">毛色</label>${sel('ed-coat', H.COATS, d.coat || '鹿毛')}</div>
        </div>
        <div class="row wrap">
          <div class="field grow"><label for="ed-retire">引退する年（AIのとき）</label><input id="ed-retire" type="number" min="${d.born + 2}" max="${d.born + 12}" value="${d.retire}"></div>
          <div class="field grow"><label for="ed-jockey">主戦騎手</label>${sel('ed-jockey', jOpts, curJ)}</div>
        </div>
        <div class="row wrap">
          <div class="field grow"><label for="ed-temper">気性（大きいほど落ち着き）<b id="ed-tv">${Math.round(temper)}</b></label><input type="range" id="ed-temper" min="5" max="100" value="${Math.round(temper)}"></div>
          <div class="field grow"><label for="ed-health">体質（大きいほど丈夫）<b id="ed-hv">${Math.round(health)}</b></label><input type="range" id="ed-health" min="10" max="100" value="${Math.round(health)}"></div>
        </div>
        <label class="small"><input type="checkbox" id="ed-custom" ${custom ? 'checked' : ''}> 能力を個別に決める（決めないときは評価から自動で決まる）</label>
        <div class="stats mt">${H.STATS.map(statRow).join('')}</div>
      </div>
      <div class="btns mt"><button class="btn gold" data-x="save">保存</button><button class="btn" data-x="reset">初期値に戻す</button><button class="btn" data-act="close">やめる</button></div>`);
    HS.Art.portrait(bg.querySelector('#ed-cv'), { coat: d.coat, name: d.name });
    const $ = s => bg.querySelector(s);
    const syncStats = () => {
      const custom = $('#ed-custom').checked;
      const r = +$('#ed-rating').value;
      const auto = defaultsFor(Object.assign({}, d, { surface: $('#ed-surface').value, distMax: +$('#ed-dmax').value, style: $('#ed-style').value }), r).pot;
      for (const k of H.STATS) {
        const inp = $('#ed-p-' + k);
        inp.disabled = !custom;
        if (!custom) inp.value = Math.round(auto[k]);
        $('#ed-pv-' + k).textContent = inp.value;
      }
    };
    $('#ed-rating').oninput = () => { const r = +$('#ed-rating').value; $('#ed-rv').textContent = `${U.grade(r)} ${r}`; syncStats(); };
    $('#ed-temper').oninput = () => { $('#ed-tv').textContent = $('#ed-temper').value; };
    $('#ed-health').oninput = () => { $('#ed-hv').textContent = $('#ed-health').value; };
    $('#ed-custom').onchange = syncStats;
    for (const id of ['#ed-surface', '#ed-dmax', '#ed-style']) $(id).onchange = syncStats;
    for (const k of H.STATS) $('#ed-p-' + k).oninput = () => { $('#ed-pv-' + k).textContent = $('#ed-p-' + k).value; };
    $('#ed-coat').onchange = () => HS.Art.portrait($('#ed-cv'), { coat: $('#ed-coat').value, name: d.name });
    $('[data-x=save]').onclick = () => {
      const next = {
        rating: +$('#ed-rating').value, surface: $('#ed-surface').value, distMin: +$('#ed-dmin').value, distMax: +$('#ed-dmax').value,
        style: $('#ed-style').value, growth: $('#ed-growth').value, coat: $('#ed-coat').value, retire: +$('#ed-retire').value,
        jockey: $('#ed-jockey').value || null,
      };
      // 気性・体質は動かしたときだけ残す
      if (+$('#ed-temper').value !== Math.round(temper) || d.temper != null) next.temper = +$('#ed-temper').value;
      if (+$('#ed-health').value !== Math.round(health) || d.health != null) next.health = +$('#ed-health').value;
      if ($('#ed-custom').checked) { next.pot = {}; for (const k of H.STATS) next.pot[k] = +$('#ed-p-' + k).value; }
      const err = E.validate(next);
      if (err) return App.toast(err);
      if (!(next.retire >= d.born + 2)) return App.toast(`引退する年は${d.born + 2}年以降`);
      const all = edits();
      const c = E.clean(d.name, next);
      if (c) all[d.name] = c; else delete all[d.name];
      if (!E.saveLocal(all)) return App.toast('この端末に保存できませんでした');
      E.apply(all); W.index();
      App.closeModal(); App.toast(c ? `${d.name}を保存した` : `${d.name}は元のままです`); refreshList();
    };
    $('[data-x=reset]').onclick = () => {
      const all = edits(); delete all[d.name]; E.saveLocal(all); E.apply(all); W.index();
      App.closeModal(); App.toast(`${d.name}を初期値に戻した`); refreshList();
    };
  };

  App.act['ed-reset-all'] = async () => {
    if (!(await App.confirm('すべての編集を消して、史実の値に戻します。', '戻す'))) return;
    E.saveLocal({}); E.apply({}); W.index(); App.render();
  };
  App.act['ed-export'] = () => {
    const s = JSON.stringify(edits());
    App.modal(`<h3>編集を書き出す</h3><p class="small">下の文字をコピーしておけば、別の端末の「編集を読み込む」で同じ編集を使えます。</p><textarea id="ed-out" style="width:100%;height:160px" readonly>${e(s)}</textarea><div class="btns mt"><button class="btn gold" data-x="copy">コピー</button><button class="btn" data-act="close">閉じる</button></div>`)
      .querySelector('[data-x=copy]').onclick = () => {
        const ta = document.querySelector('#ed-out');
        if (navigator.clipboard) navigator.clipboard.writeText(s).then(() => App.toast('コピーした'), () => { ta.select(); App.toast('選択したので手でコピーしてください'); });
        else { ta.select(); App.toast('選択したので手でコピーしてください'); }
      };
  };
  App.act['ed-import'] = () => {
    const bg = App.modal(`<h3>編集を読み込む</h3><textarea id="ed-in" style="width:100%;height:160px" placeholder="書き出した文字を貼り付け"></textarea><div class="small muted">今の編集は置き換わります。</div><div class="btns mt"><button class="btn gold" data-x="ok">読み込む</button><button class="btn" data-act="close">やめる</button></div>`);
    bg.querySelector('[data-x=ok]').onclick = () => {
      let obj;
      try { obj = JSON.parse(bg.querySelector('#ed-in').value.trim()); } catch (err) { return App.toast('読み込めませんでした（形が違います）'); }
      if (!obj || typeof obj !== 'object') return App.toast('読み込めませんでした');
      const names = new Set(list().map(d => d.name));
      const clean = {};
      for (const [n, ed] of Object.entries(obj)) { if (!names.has(n) || !ed || E.validate(ed)) continue; const c = E.clean(n, ed); if (c) clean[n] = c; }
      E.saveLocal(clean); E.apply(clean); W.index();
      App.closeModal(); App.toast(`${Object.keys(clean).length}頭の編集を読み込んだ`); App.render();
    };
  };
})();
