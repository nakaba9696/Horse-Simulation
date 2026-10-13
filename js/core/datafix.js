// データの仕上げ：複数のファイルから来た史実馬をまとめる（重複をなくし、勝ち鞍・主戦騎手を合わせる）
// すべての data/*.js を読んだあと、エディットより前に一度だけ動く
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const D = HS.DATA = HS.DATA || {};
  const list = D.historic || [];
  // 昔の登録名は小さいカナを使えない（ヤマピツト＝ヤマピット）。比べるときはそろえる
  const SMALL = { 'ッ': 'ツ', 'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ', 'ァ': 'ア', 'ィ': 'イ', 'ゥ': 'ウ', 'ェ': 'エ', 'ォ': 'オ', 'ヮ': 'ワ' };
  HS.normName = n => String(n || '').replace(/[ッャュョァィゥェォヮ]/g, c => SMALL[c]);
  const byNorm = new Map();
  const byName = new Map();
  const out = [];
  for (const h of list) {
    const prev = byName.get(h.name) || (Math.abs(((byNorm.get(HS.normName(h.name)) || {}).born || -99) - h.born) <= 1 ? byNorm.get(HS.normName(h.name)) : null);
    if (!prev) { byName.set(h.name, h); byNorm.set(HS.normName(h.name), h); out.push(h); continue; }
    // 先に読んだもの（手で確かめたデータ）を正とし、勝ち鞍だけ足す
    for (const k of ['wins', 'ran']) if (h[k]) prev[k] = [...new Set([...(prev[k] || []), ...h[k]])];
    for (const k of Object.keys(h)) if (prev[k] == null && h[k] != null) prev[k] = h[k];
  }
  // 追加の勝ち鞍（自動生成のファイルから）
  for (const [n, ws] of Object.entries(D.historicExtraWins || {})) {
    const h = byName.get(n) || byNorm.get(HS.normName(n)); if (!h) continue;
    h.wins = [...new Set([...(h.wins || []), ...ws])];
  }
  // 勝ち鞍を年の順に
  for (const h of out) if (h.wins) h.wins.sort();
  // 主戦騎手：馬のデータにある jockey を表へ（表にあるものが優先）
  D.historicJockeys = D.historicJockeys || {};
  for (const h of out) if (h.jockey && !D.historicJockeys[h.name]) D.historicJockeys[h.name] = h.jockey;
  for (const [n, j] of Object.entries(D.historicJockeysAuto || {})) if (!D.historicJockeys[n]) D.historicJockeys[n] = j;
  D.historic = out;
  // 外国で調教された馬かどうか
  D.isForeign = h => !!(h.country && h.country !== '日');
})();
