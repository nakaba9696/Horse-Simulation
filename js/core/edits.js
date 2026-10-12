// 競走馬エディット：史実馬のデータを書き換える。編集はこの端末に保存し、新しいゲームを始めるときにセーブへ写す
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const E = HS.Edits = {};
  E.KEY = 'horse-sim-edits-v1';
  E.FIELDS = ['rating', 'surface', 'distMin', 'distMax', 'style', 'growth', 'coat', 'retire', 'pot', 'temper', 'health', 'jockey'];
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
    if (ed.rating != null && !(ed.rating >= 20 && ed.rating <= 110)) return '評価は20〜110';
    if (ed.distMin != null && ed.distMax != null && ed.distMin >= ed.distMax) return '距離の下限は上限より短く';
    if (ed.pot) for (const v of Object.values(ed.pot)) if (!(v >= 20 && v <= 120)) return '能力は20〜120';
    return null;
  };
})();
