// 画面の共通部品（docs/UI.md の決まり）：見出しの帯・タブ・並べ替えの見出し・能力の数値の札・値段・選び肢の札・操作の案内
// どの画面もこの部品で作り、作りをそろえる。見た目は css/ui.css
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const U = HS.U, UI = HS.UI, App = HS.App;
  const e = U.esc;
  const K = UI.kit = {};

  // ---------- 操作の案内：いま使っている道具（キーボード・ゲームパッド）のボタンの名前で出す ----------
  // body[data-input] が 'pad' ならパッドの名前、それ以外はキーの名前（css/ui.css が出し分ける）
  K.key = (k, p) => `<span class="u-key"><i class="k">${e(k)}</i><i class="p">${e(p || k)}</i></span>`;
  App.setInput = kind => { if (document.body && document.body.dataset.input !== kind) document.body.dataset.input = kind; };
  document.addEventListener('keydown', ev => { if (!ev.repeat && ev.key && ev.key.length) App.setInput('key'); }, true);
  document.addEventListener('pointerdown', ev => { if (ev.pointerType !== 'touch') App.setInput('mouse'); }, true);

  // ---------- 見出しの帯：画面の名前（大きく）・ひと言・右に今の状態（資金など） ----------
  // o：{ icon（UI.icon の名前）, title, sub, right（HTML）}
  K.band = o => `<header class="u-band"><span class="u-band-ic">${UI.icon ? UI.icon(o.icon || 'home') : ''}</span>
    <div class="u-band-t"><h1>${e(o.title)}</h1>${o.sub ? `<div class="u-band-sub">${o.sub}</div>` : ''}</div>
    ${o.right ? `<div class="u-band-r">${o.right}</div>` : ''}</header>`;
  // 帯の右に置く「見出し＋値」
  K.stat = (label, value, cls) => `<div class="u-bstat ${cls || ''}"><small>${e(label)}</small><b>${value}</b></div>`;

  // ---------- タブ：左右の端に Q・E（LB・RB）の印。押しても、Q・E でも切り替わる ----------
  // items：[[鍵, 名前, 数（なくてよい）]]。act：押したときの data-act。attr：鍵を入れる data- の名前
  K.tabs = function (items, cur, act, attr, extra) {
    attr = attr || 'tab';
    return `<nav class="u-tabs" role="tablist">${items.length > 1 ? `<span class="u-lr" data-lr-hint>${K.key('Q', 'LB')}</span>` : ''}
      ${items.map(([k, l, n]) => `<button role="tab" aria-selected="${k === cur}" class="u-tab ${k === cur ? 'on' : ''}" data-act="${act}" data-${attr}="${e(k)}"${extra ? ' ' + extra : ''}>${e(l)}${n != null ? `<small>${n}</small>` : ''}</button>`).join('')}
      ${items.length > 1 ? `<span class="u-lr" data-lr-hint>${K.key('E', 'RB')}</span>` : ''}</nav>`;
  };

  // ---------- 能力の段（docs/UI.md「能力の段」。持ち主の指摘 2026-10-17「ステータスの数値によって色つけてください　数字だけだとわかりにくいので」） ----------
  // 段：0 低い（暗い青）・1 ふつう（灰）・2 良い（緑）・3 とても良い（金）・4 飛び抜けている（紅。光る）。色は css/ui.css の .u-num.t0〜t4
  // 境目は「この値から上がその段」。Godot 版（godot/ui/theme.gd の TIER_*）と同じ値（tests/extra_ui.js が比べる）
  K.TIER_NAMES = ['低い', 'ふつう', '良い', 'とても良い', '飛び抜けている'];
  K.TIER = { fh: [45, 55, 65, 75], stat: [60, 75, 85, 95], kire: [3, 5, 7, 8] };
  // kind：'fh'（総合力 1〜99）・'stat'（能力 20〜120）・'kire'（脚の切れ 1〜8）
  K.tier = (v, kind) => { const cut = K.TIER[kind] || K.TIER.stat; const r = Math.round(v); return cut.filter(c => r >= c).length; };
  // 能力の数値の札：段の色の地・字・縁。数は等幅。4つ目の引数に前の呼び方の lo（数）が来たら、40 台なら総合力の段
  K.num = (v, title, big, kind) => {
    if (typeof kind === 'number') kind = kind < 50 ? 'fh' : 'stat';
    const t = v == null ? 1 : K.tier(v, kind || 'stat');
    return `<span class="u-num t${t} ${big ? 'big' : ''}" title="${e((title ? title + '・' : '') + K.TIER_NAMES[t])}">${v == null ? '－' : Math.round(v)}</span>`;
  };
  // 総合力（芝・ダート）の札：それぞれの段の色で
  K.fh = (turf, dirt) => `<span class="u-fh"><span class="u-num t${K.tier(turf, 'fh')}" title="総合力（芝）・${K.TIER_NAMES[K.tier(turf, 'fh')]}"><small>芝</small>${turf}</span><span class="u-num t${K.tier(dirt, 'fh')}" title="総合力（ダート）・${K.TIER_NAMES[K.tier(dirt, 'fh')]}"><small>ダ</small>${dirt}</span></span>`;
  // 値段：資金が足りなければ赤
  K.price = (v, money) => `<span class="u-price ${money != null && v > money ? 'over' : ''}"${money != null && v > money ? ' title="資金が足りない"' : ''}>${U.money(v)}</span>`;
  // 適性の印（◎○△×）
  K.mark = (lv, title) => `<span class="u-mark m${lv}"${title ? ` title="${e(title)}"` : ''}>${HS.Program ? HS.Program.MARK[lv] : lv}</span>`;

  // ---------- 並べ替えの見出し（押すとその列で。もう一度で逆順） ----------
  K.sortHead = (cols, key, dir, act, cls) => cols.map(c => `<th class="sortable ${c.k === key ? 'on' : ''} ${(cls && cls(c)) || ''}" data-act="${act}" data-k="${c.k}"${c.title ? ` title="${e(c.title)}"` : ''}>${e(c.label)}${c.k === key ? `<i class="u-dir">${dir > 0 ? '▲' : '▼'}</i>` : ''}</th>`).join('');

  // ---------- 選び肢の札（一つを選ぶ。select の代わり。十字キーで渡れる） ----------
  // opts：[[値, 名前]]
  K.seg = (label, opts, cur, act, k) => `<div class="u-seg" role="radiogroup"${label ? ` aria-label="${e(label)}"` : ''}>${label ? `<span class="u-seg-l">${e(label)}</span>` : ''}${opts.map(([v, l]) => `<button role="radio" aria-checked="${String(v) === String(cur)}" class="${String(v) === String(cur) ? 'on' : ''}" data-act="${act}" data-k="${e(k)}" data-v="${e(String(v))}">${l}</button>`).join('')}</div>`;

  // ---------- 下の操作の案内（PC。画面の右下に小さく） ----------
  K.keybar = function (extra) {
    return `<div class="u-keybar" aria-hidden="true"><span class="u-help" id="u-help"></span>${(extra || []).map(([k, p, l]) => `<span>${K.key(k, p)}${e(l)}</span>`).join('')}
      <span>${K.key('↑↓←→', '十字')}選ぶ</span><span>${K.key('Enter', 'A')}決定</span><span>${K.key('Esc', 'B')}もどる</span></div>`;
  };

  // 選んでいる札のひと言（data-help か title）を、下の案内の左に出す（項目名の言い換えは書かない）
  const help = el => { const box = document.getElementById('u-help'); if (!box) return; const h = el && el.closest && el.closest('[data-help], [title]'); box.textContent = h ? (h.dataset.help || h.getAttribute('title') || '') : ''; };
  document.addEventListener('focusin', ev => help(ev.target));
  document.addEventListener('mouseover', ev => help(ev.target));
  // 下の並びの札のひと言
  K.NAV_HELP = { home: '今週の騎乗・依頼・お手馬', stable: 'お手馬の調子と次走。番組表で出るレースを選ぶ', market: 'デビュー前の史実馬を買う', breed: '引退させた馬からオリジナルホースを作る', races: '先週の結果と今年の重賞', jrecord: '成績・スペシャルホース・トロフィー・リーディング', menu: 'セーブ・音・画面の設定・フリーレース' };

  // ---------- 騎手のゲームの画面の頭の帯（App.render が中身の前に置く）。中身の最初の同じ名前の見出しは外す ----------
  const BANDS = {
    breed: { icon: 'breed', title: '生産', sub: '引退させた牡馬と牝馬から、オリジナルホースを作る' },
    races: { icon: 'races', title: 'レース', sub: '先週の結果と、今年の重賞' },
    jrecord: { icon: 'jrecord', title: 'データ', sub: '成績・スペシャルホース・トロフィー・記録' },
    records: { icon: 'records', title: '記録', sub: '年代記と表彰' },
    menu: { icon: 'menu', title: 'メニュー', sub: 'セーブ・音・画面の設定' },
  };
  UI.withBand = function (view, html) {
    const b = BANDS[view.name];
    if (!b || !(HS.Jockey && HS.Jockey.isMode())) return html;
    const G = HS.World.get();
    return K.band(Object.assign({ right: K.stat('資金', U.money(G.player.money), 'money') }, b)) + html.replace(new RegExp(`^\\s*<h2 class="sec">${b.title}</h2>`), '');
  };

  // ---------- 右の見本（一覧の行に乗る・選ぶと中身が変わる）：data-pv="種類:鍵" の行と #u-pv の板 ----------
  UI.previews = UI.previews || {};
  let pvLast = '';
  const showPv = el => {
    const box = document.getElementById('u-pv'); if (!box) return;
    const v = el.dataset.pv; if (!v || v === pvLast) return;
    const i = v.indexOf(':'), kind = v.slice(0, i), key = v.slice(i + 1);
    if (!UI.previews[kind]) return;
    pvLast = v; box.innerHTML = UI.previews[kind](key); App.hydrate(box);
    document.querySelectorAll('[data-pv].pv-on').forEach(x => x.classList.remove('pv-on')); el.classList.add('pv-on');
  };
  K.pvReset = () => { pvLast = ''; };
  document.addEventListener('mouseover', ev => { const el = ev.target.closest && ev.target.closest('[data-pv]'); if (el) showPv(el); });
  document.addEventListener('focusin', ev => { const el = ev.target.closest && ev.target.closest('[data-pv]'); if (el) showPv(el); });
})();
