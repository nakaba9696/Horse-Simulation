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
    // 史実の勝ち鞍の記録のためのレース（data/hist_races.js）にその年の形があれば、そのまま
    const hist = (D.histRaces || []).some(r => r.name === n && active(r, y));
    if (!hist && !(raceByName.get(n) || []).some(r => active(r, y))) {
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
  // ゲームに出さない史実馬（data/drop_horses.js）を外す
  const drop = new Set(D.dropHorses || []);
  D.historic = out.filter(h => !drop.has(h.name));
  // 伝説級の印（data/legends.js の legendMarks）：史実馬のデータにいる名馬を伝説級にし、担当のグランドフェスティバルを付ける
  for (const [n, gf] of Object.entries(D.legendMarks || {})) {
    const h = byName.get(n) || byNorm.get(HS.normName(n)); if (!h) continue;
    h.tier = 'legend'; h.gf = gf;
  }
  // 能力の見直しで持ち主が採った値（data/horse_fix.js。tools/special_audit_apply.js が書く）。遊びの値だけを上書きする
  HS.FIX_KEYS = ['rating', 'pot', 'turf', 'dirt', 'heavy', 'health', 'style', 'distMin', 'distMax', 'skills', 'trig', 'kire'];
  {
    const extra = new Map((D.legendsExtra || []).map(d => [d.name, d]));
    for (const [n, f] of Object.entries(D.horseFix || {})) {
      const h = byName.get(n) || byNorm.get(HS.normName(n)) || extra.get(n); if (!h) continue;
      for (const k of HS.FIX_KEYS) if (f[k] != null) h[k] = Array.isArray(f[k]) ? f[k].slice() : k === 'pot' ? Object.assign({}, h.pot || {}, f.pot) : f[k];
    }
  }
  // 距離の幅に、勝った G1 の距離を必ず入れる（持ち主の決定 2026-10-20）。勝ち鞍のうち、その年の暦で G1 のレースの距離（100m に丸める）が
  // distMin〜distMax の外なら、幅をその距離まで広げる。2歳の G1 は数えない（若いときだけの距離で幅を広げない）。
  // データの値は書き換えず、読み込んだあとの遊びの値だけ。Godot へはこのあとの HS.DATA（tools/export_godot.js）で届く
  {
    // 暦にその年の形が無ければ、史実の勝ち鞍の記録のためのレース（data/hist_races.js。遊ぶ番組には出ない。H.winRaces と同じ引き方）
    const raceAt = (w) => { const y = +w.slice(0, 4), n = w.slice(4); return (raceByName.get(n) || []).find(r => active(r, y)) || (D.histRaces || []).find(r => r.name === n && active(r, y)); };
    const widen = h => {
      let lo = h.distMin || 1600, hi = h.distMax || 2400;
      for (const w of h.wins || []) {
        const r = raceAt(w);
        if (!r || r.grade !== 'G1' || r.age === '2' || !r.dist) continue;
        const d = Math.round(r.dist / 100) * 100;
        if (d < lo) lo = d;
        if (d > hi) hi = d;
      }
      if (lo !== (h.distMin || 1600)) h.distMin = lo;
      if (hi !== (h.distMax || 2400)) h.distMax = hi;
    };
    for (const h of out) widen(h);
    for (const h of D.legendsExtra || []) widen(h);
  }
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
  // 名鑑の無い海外の馬の史実の主な勝鞍（data/main_wins_world.js。名鑑があればそちらが正）
  for (const [n, w] of Object.entries(D.mainWinsWorld || {})) {
    const h = byName.get(n); if (!h || h.mainWins) continue;
    h.mainWins = w.ja.slice(); h.mainWinsEn = w.en.slice();
  }
  for (const s of D.stallions || []) {
    const h = byName.get(s.name); if (!h) continue;
    if (s.kire == null && h.kire != null) s.kire = h.kire;
    if (!s.skills && h.skills) s.skills = h.skills.slice();
  }
  // 史実馬の道悪の向き（data/mud.js。史実で得手不得手がはっきりした馬だけ。ほかは H.fromHistoric の 66）。
  // 得意の馬は道悪○（特殊能力 'mud'）も付ける：名馬の表で特殊能力を決めた馬は H.histSkills2 が通らないので、ここで足す（境目は H.MUD_HEAVY と同じ 86）
  {
    const extra = new Map((D.legendsExtra || []).map(d => [d.name, d]));
    for (const [n, f] of Object.entries(D.mudFix || {})) {
      const h = byName.get(n) || byNorm.get(HS.normName(n)) || extra.get(n); if (!h) continue;
      h.heavy = f.heavy;
      if (f.heavy >= 86 && Array.isArray(h.skills) && !h.skills.includes('mud')) h.skills = h.skills.concat('mud');
    }
  }
  // 記録から作った史実馬の脚質（data/style_fix.js。名鑑・出典で走り方がはっきりした名の知れた馬だけ。ほかは tools/build_auto.js の引きのまま）
  for (const [n, f] of Object.entries(D.styleFix || {})) {
    const h = byName.get(n) || byNorm.get(HS.normName(n)); if (h && f.style) h.style = f.style;
  }
  // ---- 出典で決めていない能力の散らし（持ち主の指摘 2026-10-25「わからない数値全員66とかじゃなくてある程度ばらけさせてね」
  // 「重馬場適正以外もちゃんとみんな同じ数値とかにしないでね」）。決まりと幅は docs/BALANCE.md「22. 決めていない能力の散らし」 ----
  // 馬ごとのずらし（d.spr）を、データの手がかり（父の特徴・父の道悪・国・名鑑の言葉・勝った馬場の格）と馬名の種で決める（Math.random は使わない）。
  // H.fromHistoric（godot/core/hs_horse.gd の from_historic も同じ）が、手で決めていない値にだけ足す。総合力の元（スピード・スタミナ）には足さない。
  // Godot へは書き出したデータ（tools/export_godot.js）で届く
  {
    const U = HS.U, stal = new Map((D.stallions || []).map(s => [s.name, s]));
    const extra = D.legendsExtra || [];
    const all = out.concat(extra), byAll = new Map(all.map(h => [h.name, h]));
    const mudOf = n => { const f = (D.mudFix || {})[n]; if (f) return f.heavy; const h = byAll.get(n); return h && h.heavy != null ? h.heavy : null; };
    const traitsOf = n => (stal.get(n) || {}).traits || [];
    const surfOf = n => (stal.get(n) || byAll.get(n) || {}).surface || null;
    const EU = ['英', '愛', '仏', '独', '伊'];
    const raceAt = (w) => { const y = +w.slice(0, 4), n = w.slice(4); return (raceByName.get(n) || []).find(r => active(r, y)) || (D.histRaces || []).find(r => r.name === n && active(r, y)); };
    const SA = { G1: 100, G2: 95, G3: 90 }; // H.SURF_APT と同じ
    HS.SPREAD = { heavy: [55, 76], health: [67, 85], offApt: [48, 59], topApt: 90 };
    for (const h of all) {
      const rng = k => U.hashRng('spread:' + k + ':' + h.name);
      const uni = (k, a, b) => rng(k).int(a, b);              // a..b の整数を同じ割合で
      const half = (k, a, b) => rng(k).int(a * 2, b * 2) / 2; // a..b を 0.5 刻みで
      const tr = traitsOf(h.sire), text = String(h.text || '') + String(h.note || '');
      const spr = {};
      // 重馬場（ふつうの 66 の馬）：55〜76。父・母の父が道悪巧者 ＋4・苦手 −4、父の「パワー」＋2、欧州の馬（柔らかい馬場で走る）＋2
      if (h.heavy == null) {
        let v = 66 + uni('heavy', -9, 8);
        const sm = mudOf(h.sire), dm = mudOf(h.damsire);
        if ((sm != null && sm >= 86) || (dm != null && dm >= 86)) v += 4;
        if ((sm != null && sm <= 40) || (dm != null && dm <= 40)) v -= 4;
        if (tr.includes('パワー')) v += 2;
        if (EU.includes(h.country)) v += 2;
        spr.heavy = U.clamp(v, HS.SPREAD.heavy[0], HS.SPREAD.heavy[1]) - 66;
      }
      // 健康（戦数の段の値）：−5〜＋5。父の「丈夫」＋2・「体質弱」−3、名鑑の丈夫の言葉 ＋3・故障の言葉 −3。67〜85 に収める（H.fromHistoric）
      if (h.health == null) {
        let v = uni('health', -5, 5);
        if (tr.includes('丈夫')) v += 2;
        if (tr.includes('体質弱')) v -= 3;
        if (/丈夫|頑健|頑丈|タフ|鉄の/.test(text)) v += 3;
        if (/骨折|屈腱炎|脚部不安|故障|裂蹄|靭帯/.test(text)) v -= 3;
        spr.health = v;
      }
      // 切れ（脚質から出す値）：−1・0・＋1 を同じ割合で。父の「瞬発力」・名鑑の切れ味の言葉は −1 を 0 に、父の「持続力」・長く脚を使う言葉は ＋1 を 0 に
      if (h.kire == null) {
        let v = uni('kire', -1, 1);
        if (v < 0 && (tr.includes('瞬発力') || /瞬発|一瞬の脚|切れ味/.test(text))) v = 0;
        if (v > 0 && (tr.includes('持続力') || /長く(良い|いい)?脚|ロングスパート|まくり|捲|バテな/.test(text))) v = 0;
        spr.kire = v;
      }
      // 根性・気性・坂（強さから出す値）：−3〜＋3 を 0.5 刻みで。父の「底力」根性 ＋1、「気性難」気性 −1.5、「パワー」坂 ＋1
      const pot = h.pot || {};
      if (pot.guts == null) spr.guts = half('guts', -3, 3) + (tr.includes('底力') ? 1 : 0);
      if (pot.mind == null) spr.mind = half('mind', -3, 3) - (tr.includes('気性難') ? 1.5 : 0);
      if (pot.slope == null) spr.slope = half('slope', -3, 3) + (tr.includes('パワー') ? 1 : 0);
      // 芝・ダートの適性（H.surfaceApt の値のうち、得意の馬場の 100 と、走っていない馬場の 55 だけ）。画面と出走の目安だけで、能力（総合力）には効かない
      //   得意の 100：90〜100 を同じ割合で（番組表の「向いている」の段のまま。勝ち鞍の格はもう 100 に入っているので寄せない）
      //   走っていない 55：48〜59（番組表の「向いていない」の段のまま）。父がその馬場の馬 ＋3・芝ダ ＋1・逆の馬場 −1
      if (!(pot.dspd != null && pot.dsta != null)) {
        const ws = (h.wins || []).map(raceAt).filter(Boolean);
        const best = s => { let b = null; for (const r of ws) if ((r.surface === 'ダ') === (s === 'ダ')) { const v = SA[r.grade] || SA.G3; if (b == null || v > b) b = v; } return b; };
        const bt = best('芝'), bd = best('ダ');
        let turf, dirt;
        if (h.surface === '芝ダ') { turf = bt != null ? bt : 90; dirt = bd != null ? bd : 90; const top = Math.max(turf, dirt); turf += 100 - top; dirt += 100 - top; }
        else if (h.surface === 'ダ') { dirt = 100; turf = bt != null ? bt - 3 : 55; }
        else { turf = 100; dirt = bd != null ? bd - 3 : 55; }
        const ss = surfOf(h.sire);
        for (const [k, v, s] of [['turf', turf, '芝'], ['dirt', dirt, 'ダ']]) {
          if (h[k] != null) continue;
          if (v === 100) {
            spr[k] = -uni(k, 0, 100 - HS.SPREAD.topApt);
          } else if (v === 55) {
            const w = uni(k, -5, 4) + (ss === s ? 3 : ss === '芝ダ' ? 1 : ss ? -1 : 0);
            spr[k] = U.clamp(55 + w, HS.SPREAD.offApt[0], HS.SPREAD.offApt[1]) - 55;
          }
        }
      }
      for (const k of Object.keys(spr)) if (!spr[k]) delete spr[k];
      if (Object.keys(spr).length) h.spr = spr; else delete h.spr;
    }
  }
  // ---- 英語の名前（持ち主の決定 2026-10-21「言語は日本語と英語にしたい」。決まりは docs/I18N_DATA.md） ----
  // 馬：データの nameEn（海外の馬の元の名前）→ data/names_en.js（出典で確かめた登録の英語名）→ カナをヘボン式のローマ字に。
  // カナの外来語も綴りを推さずにローマ字にする（スペシャルウィーク＝Supesharuwiku）。確かめた名前は names_en.js に足す
  {
    const K1 = { 'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o', 'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko', 'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so',
      'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to', 'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no', 'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
      'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo', 'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo', 'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro', 'ワ': 'wa', 'ヰ': 'i', 'ヱ': 'e', 'ヲ': 'o', 'ン': 'n',
      'ガ': 'ga', 'ギ': 'gi', 'グ': 'gu', 'ゲ': 'ge', 'ゴ': 'go', 'ザ': 'za', 'ジ': 'ji', 'ズ': 'zu', 'ゼ': 'ze', 'ゾ': 'zo', 'ダ': 'da', 'ヂ': 'ji', 'ヅ': 'zu', 'デ': 'de', 'ド': 'do',
      'バ': 'ba', 'ビ': 'bi', 'ブ': 'bu', 'ベ': 'be', 'ボ': 'bo', 'パ': 'pa', 'ピ': 'pi', 'プ': 'pu', 'ペ': 'pe', 'ポ': 'po', 'ヴ': 'vu',
      'ァ': 'a', 'ィ': 'i', 'ゥ': 'u', 'ェ': 'e', 'ォ': 'o', 'ャ': 'ya', 'ュ': 'yu', 'ョ': 'yo', 'ヮ': 'wa' };
    const K2 = { 'キャ': 'kya', 'キュ': 'kyu', 'キョ': 'kyo', 'シャ': 'sha', 'シュ': 'shu', 'ショ': 'sho', 'チャ': 'cha', 'チュ': 'chu', 'チョ': 'cho', 'ニャ': 'nya', 'ニュ': 'nyu', 'ニョ': 'nyo',
      'ヒャ': 'hya', 'ヒュ': 'hyu', 'ヒョ': 'hyo', 'ミャ': 'mya', 'ミュ': 'myu', 'ミョ': 'myo', 'リャ': 'rya', 'リュ': 'ryu', 'リョ': 'ryo', 'ギャ': 'gya', 'ギュ': 'gyu', 'ギョ': 'gyo',
      'ジャ': 'ja', 'ジュ': 'ju', 'ジョ': 'jo', 'ヂャ': 'ja', 'ヂュ': 'ju', 'ヂョ': 'jo', 'ビャ': 'bya', 'ビュ': 'byu', 'ビョ': 'byo', 'ピャ': 'pya', 'ピュ': 'pyu', 'ピョ': 'pyo',
      'シェ': 'she', 'ジェ': 'je', 'チェ': 'che', 'ティ': 'ti', 'ディ': 'di', 'トゥ': 'tu', 'ドゥ': 'du', 'テュ': 'tyu', 'デュ': 'dyu', 'ファ': 'fa', 'フィ': 'fi', 'フェ': 'fe', 'フォ': 'fo', 'フュ': 'fyu',
      'ウィ': 'wi', 'ウェ': 'we', 'ウォ': 'wo', 'ヴァ': 'va', 'ヴィ': 'vi', 'ヴェ': 've', 'ヴォ': 'vo', 'ヴュ': 'vyu', 'ツァ': 'tsa', 'ツィ': 'tsi', 'ツェ': 'tse', 'ツォ': 'tso', 'イェ': 'ye',
      'クァ': 'kwa', 'クィ': 'kwi', 'クェ': 'kwe', 'クォ': 'kwo', 'グァ': 'gwa', 'スィ': 'si', 'ズィ': 'zi' };
    // カナ → ヘボン式（長音の「ー」と、オウ・ウウ・オオの伸ばす音は書かない。ンは b・m・p の前で m。ッは次の子音を重ねる）
    HS.romaji = function (kana) {
      const s = String(kana || '').replace(/（\d{4}）$/, '').replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
      const words = [];
      for (const part of s.split(/[・＝\s]+/)) {
        let out = '', sokuon = false;
        for (let i = 0; i < part.length; i++) {
          const two = part.slice(i, i + 2);
          let r = K2[two] ? (i++, K2[two]) : K1[part[i]];
          if (part[i] === 'ッ') { sokuon = true; continue; }
          if (part[i] === 'ー') continue;
          if (r == null) r = /[A-Za-z0-9]/.test(part[i]) ? part[i] : '';
          if (sokuon && r) { r = (r.startsWith('ch') ? 't' : r[0]) + r; sokuon = false; }
          out += r;
        }
        out = out.replace(/n(?=[bmp])/g, 'm').replace(/ou/g, 'o').replace(/oo/g, 'o').replace(/uu/g, 'u');
        if (out) words.push(out[0].toUpperCase() + out.slice(1));
      }
      return words.join(' ');
    };
    const EN = D.namesEn || {};
    const enOf = h => EN[h.name] || EN[h.name.replace(/（\d{4}）$/, '')] || null;
    for (const h of out.concat(D.legendsExtra || [])) {
      if (h.nameEn && !h.nameEnRule) continue;
      const e = enOf(h);
      if (e) { h.nameEn = e; delete h.nameEnRule; } else { h.nameEn = HS.romaji(h.name); h.nameEnRule = true; }
    }
    // レース：data/races_en.js の表から（暦・史実の勝ち鞍のためのレース・オーナーの依頼のオープン）
    const RE = D.raceNamesEn || {};
    for (const r of (D.races || []).concat(D.histRaces || [], D.ownerRaces || [])) if (!r.nameEn && RE[r.name]) r.nameEn = RE[r.name];
  }
  // 外国で調教された馬かどうか
  D.isForeign = h => !!(h.country && h.country !== '日');
})();
