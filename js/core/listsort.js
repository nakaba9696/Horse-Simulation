// 一覧の並べ替えと絞り込み（馬の店・フリーレースの馬選び・番組表で使う）
// 列は { k: 名前, val: x => 値, str: 文字で比べるか, dir: 最初に押したときの向き（1＝小さい順、-1＝大きい順） }
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const L = HS.List = {};

  // 並べ替え。値の無いもの（null・undefined）は向きに関係なく最後。同じ値なら元の並び
  L.sort = function (items, cols, key, dir) {
    const col = cols.find(c => c.k === key) || cols[0];
    const d = dir || col.dir || 1;
    return items.map((x, i) => [x, col.val(x), i]).sort((a, b) => {
      const na = a[1] == null || a[1] === '', nb = b[1] == null || b[1] === '';
      if (na !== nb) return na ? 1 : -1;
      const c = na ? 0 : col.str ? String(a[1]).localeCompare(String(b[1]), 'ja') : a[1] - b[1];
      return c * d || a[2] - b[2];
    }).map(a => a[0]);
  };
  // 見出しを押したとき：同じ列なら逆順、別の列ならその列の向きで。st.sortKey・st.sortDir を書き換える
  L.toggle = function (st, cols, key) {
    const col = cols.find(c => c.k === key);
    if (!col) return st;
    if (st.sortKey === key) st.sortDir = -(st.sortDir || col.dir || 1);
    else { st.sortKey = key; st.sortDir = col.dir || 1; }
    return st;
  };
  // 名前で探す（ひらがなはカタカナに直し、大文字小文字をそろえて比べる）
  L.kana = s => String(s || '').replace(/[ぁ-ゖ]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60)).toLowerCase();
  L.match = (q, ...fields) => { q = L.kana(q).trim(); return !q || fields.some(f => L.kana(f).includes(q)); };
})();
