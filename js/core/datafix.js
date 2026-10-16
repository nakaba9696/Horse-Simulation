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
  // 勝ち鞍のレース名を、その年の暦の名前にそろえる（冠の有無・盃と杯・東西の金杯）
  const races = D.races || [];
  const raceByName = new Map();
  for (const r of races) { if (!raceByName.has(r.name)) raceByName.set(r.name, []); raceByName.get(r.name).push(r); }
  const active = (r, y) => r.from <= y && y <= (r.to || 9999);
  const cache = new Map();
  const canon = (n, y) => {
    const key = y + n;
    if (cache.has(key)) return cache.get(key);
    let out = n;
    if (!(raceByName.get(n) || []).some(r => active(r, y))) {
      const alt = [n, n.replace(/盃/g, '杯'), n.replace(/杯/g, '盃')];
      const east = /（東）$/.test(n), west = /（西）$/.test(n);
      const base = alt.map(a => a.replace(/（[東西]）$/, ''));
      const cands = races.filter(r => active(r, y) && r.region !== '海外' && base.some(b => (b.length >= 3 || /[杯盃]$/.test(b)) && (r.name.endsWith(b) || b.endsWith(r.name) || r.name.replace(/盃/g, '杯').endsWith(b.replace(/盃/g, '杯')))));
      let pick = cands[0];
      if (east || west) pick = cands.find(r => (east ? ['中山', '東京'] : ['京都', '阪神', '中京']).includes(r.course)) || pick;
      if (pick) out = pick.name;
    }
    cache.set(key, out);
    return out;
  };
  for (const h of out) for (const k of ['wins', 'ran']) if (h[k]) h[k] = [...new Set(h[k].map(w => { const y = +w.slice(0, 4); return y + canon(w.slice(4), y); }))];
  // 勝ち鞍を年の順に
  for (const h of out) if (h.wins) h.wins.sort();
  // 主戦騎手：馬のデータにある jockey を表へ（表にあるものが優先）
  D.historicJockeys = D.historicJockeys || {};
  for (const h of out) if (h.jockey && !D.historicJockeys[h.name]) D.historicJockeys[h.name] = h.jockey;
  for (const [n, j] of Object.entries(D.historicJockeysAuto || {})) if (!D.historicJockeys[n]) D.historicJockeys[n] = j;
  D.historic = out;
  // 名馬の解説・脚の切れ・特殊能力（data/famous_*.js）。種牡馬になった馬は、仔に切れと能力を伝える
  for (const f of D.famous || []) {
    const h = byName.get(f.name) || byNorm.get(HS.normName(f.name)); if (!h) continue;
    if (f.text) h.text = f.text;
    if (h.kire == null && f.kire) h.kire = f.kire;
    if (!h.skills && f.skills) h.skills = f.skills.slice();
  }
  // 名馬の名鑑（data/profiles.js）：年代・戦績・主な勝鞍と長い解説。名馬の解説より長いので、こちらを正にする
  const legendBy = new Map((D.legendsExtra || []).map(d => [d.name, d]));
  for (const p of D.profiles || []) {
    const h = byName.get(p.name) || byNorm.get(HS.normName(p.name)) || legendBy.get(p.name); if (!h) continue;
    if (p.text) h.text = p.text;
    if (p.years) h.years = p.years;
    if (p.record) h.record = p.record;
    if (p.mainWins) h.mainWins = p.mainWins.slice();
  }
  for (const s of D.stallions || []) {
    const h = byName.get(s.name); if (!h) continue;
    if (s.kire == null && h.kire != null) s.kire = h.kire;
    if (!s.skills && h.skills) s.skills = h.skills.slice();
  }
  // 外国で調教された馬かどうか
  D.isForeign = h => !!(h.country && h.country !== '日');
})();
