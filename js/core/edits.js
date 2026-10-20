// 競走馬エディット：史実馬のデータを書き換える。編集はこの端末に保存し、新しいゲームを始めるときにセーブへ写す
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const E = HS.Edits = {};
  E.KEY = 'horse-sim-edits-v1';
  // temper は前の版（気性を別に持っていたころ）の編集を読むためだけに残す
  E.FIELDS = ['rating', 'surface', 'distMin', 'distMax', 'style', 'kire', 'growth', 'coat', 'retire', 'pot', 'turf', 'dirt', 'heavy', 'health', 'skills', 'temper', 'jockey'];
  let ORIG = null, ORIGJ = null;

  // データの元の値を一度だけ控える
  E.snapshot = function () {
    if (ORIG) return;
    ORIG = new Map((HS.DATA.historic || []).map(h => [h.name, JSON.parse(JSON.stringify(h))]));
    ORIGJ = Object.assign({}, HS.DATA.historicJockeys || {});
  };
  E.original = name => ORIG && ORIG.get(name);
  E.originalJockey = name => ORIGJ && ORIGJ[name];

  // 編集を当てる（いったん元に戻してから）
  E.apply = function (edits) {
    E.snapshot();
    edits = edits || {};
    for (const h of HS.DATA.historic || []) {
      const o = ORIG.get(h.name);
      for (const k of Object.keys(h)) if (!(k in o)) delete h[k];
      Object.assign(h, JSON.parse(JSON.stringify(o)));
      const ed = edits[h.name];
      if (!ed) continue;
      for (const k of E.FIELDS) if (k !== 'jockey' && ed[k] != null) h[k] = JSON.parse(JSON.stringify(ed[k]));
    }
    HS.DATA.historicJockeys = Object.assign({}, ORIGJ);
    for (const [n, ed] of Object.entries(edits)) if (ed && ed.jockey) HS.DATA.historicJockeys[n] = ed.jockey;
    E.active = edits;
    E.version = (E.version || 0) + 1;
  };

  // 端末に保存した編集
  E.loadLocal = function () { try { const s = localStorage.getItem(E.KEY); return s ? JSON.parse(s) : {}; } catch (e) { return {}; } };
  E.saveLocal = function (edits) { try { localStorage.setItem(E.KEY, JSON.stringify(edits || {})); return true; } catch (e) { return false; } };

  // 1頭の編集を、元と違う項目だけにして整える
  E.clean = function (name, ed) {
    const o = ORIG.get(name); const out = {};
    for (const k of E.FIELDS) {
      if (ed[k] == null) continue;
      if (k === 'jockey') { const oj = ORIGJ[name]; const base = typeof oj === 'string' ? oj : (oj && oj.default) || null; if (ed.jockey !== base) out.jockey = ed.jockey; continue; }
      if (JSON.stringify(ed[k]) !== JSON.stringify(o[k])) out[k] = ed[k];
    }
    return Object.keys(out).length ? out : null;
  };
  E.validate = function (ed) {
    // rating は前の版の編集（能力の総合の目安を入れていたころ）を読むためだけに残す（持ち主の決定 2026-10-20「評価という項目がいらない」）
    if (ed.rating != null && !(ed.rating >= 20 && ed.rating <= 110)) return '能力の元の値は20〜110';
    if (ed.distMin != null && ed.distMax != null && ed.distMin >= ed.distMax) return '距離の下限は上限より短く';
    if (ed.pot) for (const v of Object.values(ed.pot)) if (!(v >= 20 && v <= 120)) return '能力は20〜120';
    if (ed.kire != null && !(ed.kire >= 1 && ed.kire <= 8)) return '脚の切れは1〜8';
    for (const k of ['turf', 'dirt', 'heavy', 'health']) if (ed[k] != null && !(ed[k] >= 0 && ed[k] <= 120)) return '適性・健康は0〜120';
    if (ed.distMin != null && !(ed.distMin >= 1000 && ed.distMin <= 4000)) return '距離は1000〜4000m';
    if (ed.distMax != null && !(ed.distMax >= 1000 && ed.distMax <= 4000)) return '距離は1000〜4000m';
    if (ed.skills != null && !(Array.isArray(ed.skills) && ed.skills.every(x => HS.Horse && HS.Horse.SKILLS[x]))) return '特殊能力の名前が違う';
    return null;
  };

  // ---------- 能力を直接書き換える（持ち主の決定 2026-10-20「各種パラメータをいじり、それをもとに評価点（＝総合力）が決まる」） ----------
  // いまのデータ d（編集を当てたもの）から作った馬。能力の値を持たない馬は、今の自動の作り方の値が初めの値になる
  E.horseOf = d => HS.Horse.fromHistoric(d, 'x');
  // 能力の値から芝・ダートの総合力（式は js/core/season.js の総合力のまま）
  E.fhOfPot = pot => ({ turf: HS.Season.fhOf(pot, '芝'), dirt: HS.Season.fhOf(pot, 'ダ') });
  // 画面で入れた値（form）を、1頭の編集にまとめる。form.pot は能力の値（整数）。
  // 能力は、書き換えていなければ（自動の値を丸めたのと同じなら）残さない。前の版の編集の rating・turf・dirt・temper は引き継ぐ
  E.build = function (d, form) {
    const H = HS.Horse;
    const prev = (E.active || {})[d.name] || {};
    const o = E.original(d.name) || d;
    const next = {};
    for (const k of ['surface', 'distMin', 'distMax', 'style', 'growth', 'coat', 'retire', 'jockey']) if (form[k] !== undefined) next[k] = form[k];
    for (const k of ['rating', 'turf', 'dirt', 'temper']) if (prev[k] != null) next[k] = prev[k];
    const shape = { surface: next.surface || d.surface, distMin: next.distMin || d.distMin, distMax: next.distMax || d.distMax, style: next.style || d.style };
    // 切れ・健康・道悪・特殊能力は、元の値から動かしたときだけ残す
    const base = H.fromHistoric(Object.assign({}, o, { rating: d.rating }, shape, { pot: null, temper: null }), 'x');
    if (form.kire != null && (form.kire !== base.kire || prev.kire != null)) next.kire = form.kire;
    if (form.health != null && (form.health !== Math.round(base.health) || prev.health != null)) next.health = form.health;
    if (form.heavy != null && (form.heavy !== Math.round(base.apt.heavy) || prev.heavy != null)) next.heavy = form.heavy;
    if (form.skills && (form.skills.join() !== base.skills.join() || prev.skills != null)) next.skills = form.skills.slice();
    if (form.pot) {
      // 書き換えた形のまま自動で作ったときの能力と比べる
      const auto = H.fromHistoric(Object.assign({}, d, shape, next.skills ? { skills: next.skills } : {}, { pot: null }), 'x').pot;
      if (H.STATS.some(k => Math.round(auto[k]) !== form.pot[k])) { next.pot = {}; for (const k of H.STATS) next.pot[k] = form.pot[k]; }
    }
    return next;
  };

  // 書き出した文字を読む（前の版の形：rating や芝・ダートの向き、前の能力の名前があっても読める）。names は今いる馬の名前
  E.parseImport = function (text, names) {
    let obj;
    try { obj = JSON.parse(String(text || '').trim()); } catch (err) { return { err: '読み込めませんでした（形が違います）' }; }
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { err: '読み込めませんでした' };
    E.snapshot();
    const out = {};
    for (const [n, ed] of Object.entries(obj)) {
      if (!names.has(n) || !ed || typeof ed !== 'object' || E.validate(ed)) continue;
      const c = E.clean(n, ed); if (c) out[n] = c;
    }
    return { edits: out };
  };
})();
