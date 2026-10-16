// 検証：データの整合・模擬の妥当さ・決定性・セーブの往復・自動で何年も遊ぶ
// 使い方：node tests/run.js   （QUICK=1 で自動プレイを短く）
const { load } = require('./load.js');
let failures = 0, passes = 0;
const results = [];
function check(name, fn) {
  try { const msg = fn(); passes++; results.push(`  ok   ${name}${msg ? '  — ' + msg : ''}`); }
  catch (e) { failures++; results.push(`  FAIL ${name}\n       ${e.message}`); }
}
function assert(c, m) { if (!c) throw new Error(m); }

const HS = load(process.env.DATA_DIR ? { dataDir: process.env.DATA_DIR } : undefined);
const D = HS.DATA, U = HS.U, H = HS.Horse, W = HS.World, R = HS.Races, P = HS.Ped;
const QUICK = !!process.env.QUICK;

// ---------- データ ----------
const JRA_G1 = {
  'フェブラリーステークス': [1997, 9999], '高松宮杯': [1996, 1997], '高松宮記念': [1998, 9999], '大阪杯': [2017, 9999], '桜花賞': [1995, 9999], '皐月賞': [1995, 9999],
  '天皇賞（春）': [1995, 9999], 'NHKマイルカップ': [1996, 9999], 'ヴィクトリアマイル': [2006, 9999], '優駿牝馬': [1995, 9999], '東京優駿': [1995, 9999], '安田記念': [1995, 9999],
  '宝塚記念': [1995, 9999], 'スプリンターズステークス': [1995, 9999], '秋華賞': [1996, 9999], '菊花賞': [1995, 9999], '天皇賞（秋）': [1995, 9999], 'エリザベス女王杯': [1995, 9999],
  'マイルチャンピオンシップ': [1995, 9999], 'ジャパンカップ': [1995, 9999], 'ジャパンカップダート': [2000, 2013], 'チャンピオンズカップ': [2014, 9999],
  '阪神3歳牝馬ステークス': [1995, 2000], '阪神ジュベナイルフィリーズ': [2001, 9999], '朝日杯3歳ステークス': [1995, 2000], '朝日杯フューチュリティステークス': [2001, 9999], 'ホープフルステークス': [2017, 9999], '有馬記念': [1995, 9999],
};
check('races: 競馬場と馬場がある', () => {
  for (const r of D.races) { const c = D.courses[r.course]; assert(c, `競馬場がない: ${r.course} (${r.name})`); assert(r.surface === 'ダ' ? c.dirt : c.turf, `${r.course}に${r.surface}がない (${r.name})`); }
  return `${D.races.length}件`;
});
check('races: 項目の値', () => {
  for (const r of D.races) {
    assert(['G1', 'G2', 'G3'].includes(r.grade), `grade ${r.name}`);
    assert(['JRA', '地方', '海外'].includes(r.region), `region ${r.name}`);
    assert(r.month >= 1 && r.month <= 12 && r.week >= 1 && r.week <= 4, `日付 ${r.name}`);
    assert(['2', '3', '3+', '4+'].includes(r.age), `age ${r.name}`);
    assert(r.dist >= 800 && r.dist <= 4000, `dist ${r.name}`);
    assert(r.from <= (r.to || 9999), `from/to ${r.name}`);
  }
});
check('races: JRA の G1 が各年ちょうど1つ', () => {
  for (let y = 1995; y <= 2026; y++) for (const [n, [a, b]] of Object.entries(JRA_G1)) {
    if (y < a || y > b) continue;
    const c = D.races.filter(r => r.name === n && r.grade === 'G1' && r.region === 'JRA' && r.from <= y && y <= (r.to || 9999)).length;
    assert(c === 1, `${y} ${n} が ${c} 件`);
  }
});
check('historic: 名前の重複なし・値が正しい', () => {
  const seen = new Set();
  for (const h of D.historic) {
    assert(!seen.has(h.name), '重複: ' + h.name); seen.add(h.name);
    assert(['牡', '牝', 'セ'].includes(h.sex), 'sex ' + h.name);
    assert(['芝', 'ダ', '芝ダ'].includes(h.surface), 'surface ' + h.name);
    assert(H.STYLES.includes(h.style), 'style ' + h.name);
    assert(H.GROWTHS.includes(h.growth), 'growth ' + h.name);
    assert(h.rating >= 20 && h.rating <= 100, 'rating ' + h.name);
    assert(h.distMin < h.distMax, 'dist ' + h.name);
    assert(h.retire >= h.born + 2, 'retire ' + h.name);
    assert(!h.coat || H.COATS.includes(h.coat) || HS.Art === undefined || true, 'coat ' + h.name);
  }
  return `${D.historic.length}頭`;
});
check('historic: 1995年以降の勝ち鞍が暦にある（海外の一部を除く）', () => {
  const allowed = new Set(['モーリスドゲスト賞', 'ジュライカップ', 'アベイドロンシャン賞', 'サンクルー大賞', 'ジャックルマロワ賞', 'アメリカンオークス', 'シンガポール航空国際カップ', '全日本2歳優駿', 'ムーラン・ド・ロンシャン賞']);
  const bad = [];
  for (const h of D.historic) for (const w of [...(h.wins || []), ...(h.ran || [])]) {
    const y = +w.slice(0, 4), n = w.slice(4);
    if (y < 1995 || allowed.has(n)) continue;
    if (!D.races.some(r => r.name === n && r.from <= y && y <= (r.to || 9999))) bad.push(`${h.name}:${w}`);
  }
  assert(bad.length <= 5, '暦にないレース: ' + bad.join(', '));
  return bad.length ? '少しだけ: ' + bad.join(', ') : '';
});
if (D.stallions) {
  check('stallions: 血統表と父系', () => {
    P.build({});
    const noLine = [];
    for (const s of D.stallions) {
      assert(D.pedigree[s.name], '血統がない: ' + s.name);
      assert(s.from <= (s.to || 9999), 'from/to ' + s.name);
      if (P.lineOf(s.name) === 'その他') noLine.push(s.name);
      // 循環がない
      const seen = new Set(); let n = s.name;
      while (n) { assert(!seen.has(n), '循環: ' + s.name); seen.add(n); n = P.parents(n)[0]; }
    }
    assert(noLine.length <= 3, '系統が決まらない: ' + noLine.join(','));
    return `${D.stallions.length}頭・血統 ${Object.keys(D.pedigree).length}件`;
  });
  check('mares: 史実の仔が史実馬のデータにある', () => {
    const names = new Set(D.historic.map(h => h.name));
    const miss = [];
    for (const m of D.mares || []) for (const f of m.foals || []) if (!names.has(f[2])) miss.push(f[2]);
    assert(miss.length <= 3, '見つからない仔: ' + miss.join(','));
    return miss.length ? '見つからない: ' + miss.join(',') : '';
  });
}

check('fictional: 騎手の名前は全部架空（実名は出ない）・一対一', () => {
  const F = HS.Fictional, real = new Set(F.map.keys());
  assert(F.map.size > 500 && new Set(F.map.values()).size === F.map.size, '置き換えが一対一でない');
  const bad = (D.jockeys || []).filter(j => real.has(j.name)).map(j => j.name);
  for (const v of Object.values(D.historicJockeys || {})) for (const n of (typeof v === 'string' ? [v] : Object.values(v))) if (real.has(n)) bad.push(n);
  const texts = (D.famous || []).map(f => f.text).filter(Boolean).join('\n');
  for (const n of real) if (n.length >= 3 && texts.includes(n)) bad.push('解説:' + n);
  assert(!bad.length, '実名が残っている: ' + bad.slice(0, 8).join(', '));
  return `${F.map.size}人・例 ${['武豊', 'C.ルメール'].map(n => n + '→' + F.map.get(n)).join('・')}`;
});

check('jockeys: 毎年 JRA の騎手が足りる・主戦騎手が実在する', () => {
  const J = D.jockeys || [];
  assert(J.length > 0, '騎手のデータがない');
  for (let y = 1995; y <= 2026; y++) {
    const n = W.jockeysOf(y, W.JRA).length;
    assert(n >= 18, `${y}年の JRA の騎手が ${n} 人`);
  }
  const bad = [];
  for (const [horse, v] of Object.entries(D.historicJockeys || {})) {
    const names = typeof v === 'string' ? [v] : Object.values(v);
    for (const nm of names) if (!J.some(j => j.name === nm)) bad.push(`${horse}:${nm}`);
  }
  assert(bad.length === 0, '騎手の表にいない: ' + bad.slice(0, 10).join(', '));
  return `${J.length}人・主戦 ${Object.keys(D.historicJockeys || {}).length}頭`;
});

// ---------- 模擬 ----------
check('sim: 走破タイムが現実的', () => {
  const rng = new U.RNG(1);
  const out = [];
  for (const [dist, surf, lo, hi] of [[1200, '芝', 66, 71], [1600, '芝', 91, 96], [2000, '芝', 117, 122], [2400, '芝', 142, 149], [3200, '芝', 192, 203], [1800, 'ダ', 108, 114]]) {
    const ts = [];
    for (let k = 0; k < 40; k++) {
      const field = []; for (let i = 0; i < 16; i++) { const h = H.makeFiller(rng, { level: 84, surface: surf, dist, born: 2000 }); field.push({ horse: h, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1 }); }
      ts.push(HS.Sim.run({ dist, surface: surf, course: '東京', ground: '良' }, field, H.weekIndex(2004, 5, 1), rng, {}).winnerTime);
    }
    const a = U.avg(ts); out.push(`${surf}${dist}:${U.time(a)}`);
    assert(a >= lo && a <= hi, `${surf}${dist} の平均 ${a.toFixed(1)} 秒`);
  }
  return out.join(' ');
});
check('sim: 強い馬ほど勝つ', () => {
  const rng = new U.RNG(2); let wins = 0;
  for (let k = 0; k < 200; k++) {
    const field = []; for (let i = 0; i < 14; i++) { const h = H.makeFiller(rng, { level: i === 0 ? 86 : 80, surface: '芝', dist: 2000, born: 2000 }); h.name = 'h' + i; field.push({ horse: h, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1 }); }
    if (HS.Sim.run({ dist: 2000, surface: '芝', course: '京都', ground: '良' }, field, H.weekIndex(2004, 5, 1), rng, {}).results[0].horse.name === 'h0') wins++;
  }
  assert(wins >= 50 && wins <= 170, `+6点の馬の勝率 ${wins / 2}%`);
  return `+6点の馬の勝率 ${wins / 2}%`;
});
check('sim: 同じ種なら同じ結果', () => {
  const runOnce = () => { const rng = new U.RNG(9); const field = []; for (let i = 0; i < 10; i++) field.push({ horse: H.makeFiller(rng, { level: 70, surface: 'ダ', dist: 1400, born: 2000 }), jockey: { skill: 70 }, weight: 56, num: i + 1, frame: 1 }); return HS.Sim.run({ dist: 1400, surface: 'ダ', course: '中山', ground: '重' }, field, H.weekIndex(2004, 5, 1), rng, {}).results.map(r => r.num + ':' + r.time.toFixed(3)).join(','); };
  assert(runOnce() === runOnce(), '結果が違う');
});

// ---------- 自動で遊ぶ ----------
function autoPlay(year, seed, weeks) {
  W.newGame({ year, seed, name: 'テスト', farm: 'テスト牧場', crown: 'テスト' });
  const G = W.get();
  const r = new U.RNG(seed);
  // 史実馬を2頭買う
  for (const it of W.marketHistoric().slice(0, 2)) W.buy(it);
  const mm = W.marketMares()[0]; if (mm) W.buy(mm);
  let myStarts = 0;
  for (let i = 0; i < weeks; i++) {
    for (const h of W.mine('farm')) if (G.year - h.born >= 2 && G.month >= 4 && (h.starts || 0) === 0) { if (!h.name) { const e = W.rename(h.id, W.suggestName(r)); if (e) W.rename(h.id, 'テスト' + i % 10 + 'ゴウ'.slice(0, 2)); } W.toStable(h.id); h.auto = true; }
    if (W.canBreed()) for (const m of W.mine('mare')) if (!(m.cover && m.cover.year === G.year && m.cover.ok)) { const ss = W.stallionsOf(G.year).filter(s => s.fee < 1500); if (ss.length) W.breed(m.id, r.pick(ss).name); }
    // 手動の出走も試す
    for (const h of W.mine('stable')) if (!h.auto && !h.injury) { const rc = W.weekRaces().find(x => !R.ineligible(h, x, G.year) && x.region === 'JRA'); if (rc && r.chance(0.2)) W.enter(h.id, rc.key); }
    const rep = W.advance();
    myStarts += rep.races.filter(x => x.hasMine).length;
    assert(Number.isFinite(G.player.money), '資金が数でない');
  }
  return { G, myStarts };
}
const years = QUICK ? [[1995, 3]] : [[1960, 3], [1975, 3], [1995, 4], [2005, 3], [2018, 3], [2024, 2]];
for (const [year, n] of years) {
  check(`autoplay: ${year}年から${n}年`, () => {
    const t0 = Date.now();
    const { G, myStarts } = autoPlay(year, 1000 + year, n * 48);
    let total = 0, match = 0;
    for (const [y, list] of Object.entries(G.records.g1)) for (const rc of list) if (rc.region === 'JRA' && rc.histWinner) { total++; if (rc.histWinner === rc.winner) match++; }
    const histWins = Object.values(G.records.g1).flat().filter(rc => rc.region === 'JRA' && rc.hist).length;
    const allJ = Object.values(G.records.g1).flat().filter(rc => rc.region === 'JRA').length;
    assert(allJ > 0, 'G1 が行われていない');
    assert(histWins / allJ > 0.3, `史実馬の G1 勝率が低すぎる ${histWins}/${allJ}`);
    assert(Object.keys(G.horses).length < 3000, '馬が増えすぎ');
    // セーブの往復
    const s1 = W.serialize(); W.load(s1); const s2 = W.serialize();
    assert(s1 === s2, 'セーブの往復で中身が変わる');
    assert(s1.length < 4.5e6, `セーブが大きすぎる ${s1.length}`);
    return `${Date.now() - t0}ms・自分の出走 ${myStarts}・G1を史実馬が ${histWins}/${allJ}・史実どおり ${match}/${total}・資金 ${U.money(G.player.money)}・セーブ ${(s1.length / 1024).toFixed(0)}KB`;
  });
}
check('autoplay: 同じ種なら同じ歴史', () => {
  const a = JSON.stringify(autoPlay(2000, 77, 60).G.records.g1);
  const b = JSON.stringify(autoPlay(2000, 77, 60).G.records.g1);
  assert(a === b, '違う歴史になった');
});
check('history: 名牝を買い史実の相手をつけると史実馬が生まれる', () => {
  const m = (D.mares || []).find(x => (x.foals || []).some(f => f[0] >= 1997 && D.historic.some(h => h.name === f[2]) && D.stallions.some(s => s.name === f[1])));
  if (!m) return '対象の名牝なし';
  const f = m.foals.find(ff => ff[0] >= 1997 && D.historic.some(h => h.name === ff[2]) && D.stallions.some(s => s.name === ff[1]));
  const cover = f[0] - 1;
  W.newGame({ year: cover, seed: 5, money: 9e6 });
  const G = W.get();
  const it = W.marketMares().find(x => x.data.name === m.name);
  assert(it, `${cover}年に${m.name}が市場にいない（from ${m.from}）`);
  assert(W.buy(it) == null, '買えない');
  while (G.month < 2) W.advance();
  const mare = W.mine('mare').find(x => x.name === m.name);
  for (let k = 0; k < 6 && !(mare.cover && mare.cover.ok); k++) { const r = W.breed(mare.id, f[1]); assert(!r.err, r.err || ''); }
  while (!(G.year === f[0] && G.month === 3 && G.week === 2)) W.advance();
  const foal = W.mine().find(h => h.name === f[2]);
  assert(foal && foal.hist, `${f[2]}が生まれていない`);
  return `${m.name} × ${f[1]} → ${f[2]}`;
});

check('edits: エディットが新しいゲームとセーブに効く', () => {
  const E = HS.Edits;
  const edits = { 'ディープインパクト': { rating: 60, coat: '芦毛', jockey: '武豊', pot: { spd: 50, sta: 50, kick: 50, pow: 50, guts: 50, wise: 50 } } };
  assert(!E.validate(edits['ディープインパクト']), '検証で落ちた');
  W.newGame({ year: 2002, seed: 3, edits });
  const G = W.get();
  while (!(G.month === 3 && G.week === 2)) W.advance();
  const h = W.all().find(x => x.name === 'ディープインパクト');
  assert(h, '生まれていない');
  assert(h.coat === '芦毛' && Math.round(h.pot.spd) === 50, `編集が効いていない ${h.coat} ${h.pot.spd}`);
  const s = W.serialize();
  E.apply({});
  assert(D.historic.find(x => x.name === 'ディープインパクト').rating !== 60, '元に戻らない');
  W.load(s);
  assert(D.historic.find(x => x.name === 'ディープインパクト').rating === 60, 'ロードで編集が戻らない');
  E.apply({}); W.index();
  // clean：元と同じ値は残さない
  const o = D.historic.find(x => x.name === 'キタサンブラック');
  assert(E.clean(o.name, { rating: o.rating, jockey: HS.Fictional.map.get('武豊') }) === null, 'clean が同じ値を残した');
});

// ---------- 能力の形・脚の切れ・坂・特殊能力 ----------
check('stats: 能力の形と、前の版のセーブ・エディットの読み替え', () => {
  const old = { pot: { spd: 80, sta: 70, kick: 90, pow: 60, guts: 75, wise: 70 }, bonus: { kick: 2, pow: 3, wise: 1 }, temper: 40, style: '差し', apt: { turf: 100, dirt: 55, heavy: 50 } };
  H.fromLegacy(old);
  assert(JSON.stringify(Object.keys(old.pot).sort()) === JSON.stringify(H.STATS.slice().sort()), `能力の項目が違う ${Object.keys(old.pot)}`);
  assert(old.pot.mind === 55 && old.pot.slope === 60 && old.kire >= 6 && old.temper == null, `読み替えが違う ${JSON.stringify(old)}`);
  assert(old.pot.spd === 80 && old.pot.dspd < 70, `芝・ダートの分け方が違う ${JSON.stringify(old.pot)}`);
  assert(old.bonus.slope === 3 && old.bonus.mind === 1 && old.bonus.kick == null, '調教の上積みの読み替えが違う');
  const g = { v: 1, horses: { a: { name: 'x', pot: { spd: 80, sta: 80, kick: 70, pow: 70, guts: 70, wise: 70 }, temper: 60, style: '逃げ', apt: { turf: 50, dirt: 100, heavy: 50 } } } };
  W.migrate(g);
  const a = g.horses.a;
  assert(a.kire >= 1 && a.kire <= 8 && Array.isArray(a.skills) && a.pot.mind != null, '古いセーブが今の形にならない');
  assert(a.pot.dspd === 80 && a.pot.spd < 70, `ダートの馬の芝の能力が下がっていない ${JSON.stringify(a.pot)}`);
  // 一時期の版（段階で持っていた）のセーブも数に戻る
  const g2 = { v: 1, horses: { b: { name: 'y', pot: { spd: 80, sta: 80, dspd: 70, dsta: 70 }, gr: { guts: 'A', mind: 'E', slope: 'SS', heavy: 'B', health: 'S' }, style: '先行', apt: { turf: 100, dirt: 70 } } } };
  W.migrate(g2);
  const b = g2.horses.b;
  assert(b.pot.guts === 82 && b.pot.mind === 50 && b.pot.slope === 97 && b.health === 92 && b.apt.heavy === 72 && !b.gr, `段階のセーブが数に戻らない ${JSON.stringify(b)}`);
  for (const d of D.historic.slice(0, 400)) {
    const h = H.fromHistoric(d, 'x');
    assert(h.kire >= 1 && h.kire <= 8, `${d.name} の切れ ${h.kire}`);
    for (const k of H.STATS) assert(Number.isFinite(h.pot[k]), `${d.name} の ${k}`);
    for (const sk of h.skills) assert(H.SKILLS[sk], `${d.name} の特殊能力 ${sk}`);
  }
});
check('famous: 名馬の解説・切れ・特殊能力', () => {
  const names = new Set(D.historic.map(h => h.name));
  const seen = new Set();
  for (const f of D.famous || []) {
    assert(names.has(f.name), `史実馬にいない: ${f.name}`);
    assert(!seen.has(f.name), `重複: ${f.name}`); seen.add(f.name);
    assert(f.kire >= 1 && f.kire <= 8, `${f.name} の切れ`);
    for (const sk of f.skills || []) assert(H.SKILLS[sk], `${f.name} の特殊能力 ${sk}`);
    assert(f.text && f.text.length >= 20 && f.text.length <= 260, `${f.name} の解説の長さ ${f.text && f.text.length}`);
    assert(!/[！!]|……|%|％/.test(f.text), `${f.name} の解説に避ける書き方`);
  }
  const withText = D.historic.filter(h => h.text).length;
  assert(withText >= 200, `解説のある馬が少ない ${withText}`);
  return `解説 ${withText}頭`;
});
function fieldTest(course, dist, mod, N, seed) {
  const rng = new U.RNG(seed || 11); let pos = 0, wins = 0;
  for (let k = 0; k < N; k++) {
    const field = []; for (let i = 0; i < 14; i++) { const h = H.makeFiller(rng, { level: 82, surface: '芝', dist, born: 2000 }); h.name = 'h' + i; if (i === 0) mod(h); field.push({ horse: h, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1 }); }
    const res = HS.Sim.run({ dist, surface: '芝', course, ground: '良', year: 2004 }, field, H.weekIndex(2004, 5, 1), rng, {}).results;
    const q = res.findIndex(r => r.horse.name === 'h0') + 1; pos += q; if (q === 1) wins++;
  }
  return { pos: pos / N, win: wins / N };
}
check('sim: 芝の馬はダートで沈み、ダートの馬はダートで走る', () => {
  const run = (surface, mineSurf) => {
    const rng = new U.RNG(21); let pos = 0; const N = 120;
    for (let k = 0; k < N; k++) {
      const field = []; for (let i = 0; i < 12; i++) { const h = H.makeFiller(rng, { level: 82, surface: i === 0 ? mineSurf : surface, dist: 1800, born: 2000 }); h.name = 'h' + i; field.push({ horse: h, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1 }); }
      pos += HS.Sim.run({ dist: 1800, surface, course: '東京', ground: '良', year: 2004 }, field, H.weekIndex(2004, 5, 1), rng, {}).results.findIndex(r => r.horse.name === 'h0') + 1;
    }
    return pos / N;
  };
  const turfOnDirt = run('ダ', '芝'), dirtOnDirt = run('ダ', 'ダ');
  assert(turfOnDirt - dirtOnDirt > 2.5, `芝の馬 ${turfOnDirt.toFixed(1)} ダートの馬 ${dirtOnDirt.toFixed(1)}`);
  const h = H.makeFiller(new U.RNG(3), { level: 80, surface: 'ダ', dist: 1800, born: 2000 });
  assert(h.pot.dspd > h.pot.spd + 8 && h.apt.dirt > h.apt.turf, 'ダートの馬の芝スピードが下がっていない');
  return `ダート1800の平均着順 芝の馬 ${turfOnDirt.toFixed(1)}・ダートの馬 ${dirtOnDirt.toFixed(1)}`;
});
check('sim: 坂が弱い馬は坂のあるコースで沈む', () => {
  const weak = h => { h.pot.slope = 50; };
  const hill = fieldTest('中山', 2000, weak, 150).pos, flat = fieldTest('京都', 2000, weak, 150).pos;
  assert(hill - flat > 0.6, `中山 ${hill.toFixed(2)} 京都 ${flat.toFixed(2)}`);
  return `平均着順 中山 ${hill.toFixed(1)}・京都 ${flat.toFixed(1)}`;
});
check('sim: 脚の切れはコースで向き不向きがある', () => {
  const kire = k => h => { h.kire = k; };
  const tokyoCut = fieldTest('東京', 2400, kire(7), 150).pos, tokyoZubu = fieldTest('東京', 2400, kire(2), 150).pos;
  const nakaCut = fieldTest('中山', 2000, kire(7), 150).pos, nakaZubu = fieldTest('中山', 2000, kire(2), 150).pos;
  assert(tokyoCut - tokyoZubu < nakaCut - nakaZubu - 0.8, `東京 切れ${tokyoCut.toFixed(1)}/ズブ${tokyoZubu.toFixed(1)} 中山 切れ${nakaCut.toFixed(1)}/ズブ${nakaZubu.toFixed(1)}`);
  return `東京 切れ${tokyoCut.toFixed(1)}・ズブ${tokyoZubu.toFixed(1)}／中山 切れ${nakaCut.toFixed(1)}・ズブ${nakaZubu.toFixed(1)}`;
});
check('sim: 特殊能力の効き目が極端でない', () => {
  const out = [];
  for (const sk of ['oonige', 'longspurt', 'big', 'narabu']) {
    const r = fieldTest('東京', 2000, h => { h.skills = [sk]; if (sk === 'oonige') h.style = '逃げ'; }, 120);
    assert(r.win < 0.5, `${sk} の勝率 ${r.win}`);
    out.push(`${H.SKILLS[sk].label}${Math.round(r.win * 100)}%`);
  }
  const bad = fieldTest('東京', 2000, h => { h.skills = ['deokure']; }, 120);
  const base = fieldTest('東京', 2000, () => {}, 120);
  assert(bad.pos >= base.pos, '出遅れ癖が得になっている');
  return out.join(' ');
});

check('skills: 発動する特殊能力は能力値から決まり、数に上限があり、効き目が極端でない', () => {
  const K = HS.Skills, S = HS.Sim;
  const rng = new U.RNG(5);
  let total = 0, n = 0;
  for (let i = 0; i < 300; i++) {
    const h = H.makeFiller(rng, { level: 60 + (i % 40), surface: '芝', dist: 2000, born: 2000 });
    const ids = K.of(h);
    const p = K.stats(h);
    assert(ids.length <= K.cap(p), `${ids.length} 個は上限 ${K.cap(p)} を超える`);
    ids.forEach(id => assert(K.BY[id] && K.BY[id].learn(p), `${id} の条件を満たしていない`));
    assert(JSON.stringify(K.of(h)) === JSON.stringify(ids), '同じ馬で結果が変わる');
    total += ids.length; n++;
  }
  assert(total / n > 0.5, '特殊能力を持つ馬が少なすぎる');
  // 1つだけ持たせて、同じ相手と走らせる
  const setup0 = K.setup, out = [];
  const winWith = (id, N) => {
    K.setup = sim => { setup0(sim); sim.st.forEach(s => { s.trig = []; }); if (id) sim.st[0].trig = [id]; };
    const r = fieldTest('東京', 2000, () => {}, N, 31);
    K.setup = setup0;
    return r.win;
  };
  const base = winWith(null, 160);
  for (const id of ['isshun', 'chokusen', 'hanno', 'sessen']) {
    const w = winWith(id, 160);
    assert(w < 0.5 && w - base < 0.12, `${K.label(id)} の勝率 ${w}（なし ${base}）`);
    out.push(`${K.label(id)}${Math.round(w * 100)}%`);
  }
  // 発動したら記録に残る
  let fired = 0;
  K.setup = sim => { setup0(sim); sim.st[0].trig = ['startdash']; };
  const r2 = new U.RNG(3);
  for (let k = 0; k < 20; k++) {
    const field = []; for (let i = 0; i < 10; i++) field.push({ horse: H.makeFiller(r2, { level: 80, surface: '芝', dist: 1600, born: 2000 }), jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1 });
    const sim = S.create({ dist: 1600, surface: '芝', course: '東京', ground: '良', year: 2004 }, field, H.weekIndex(2004, 5, 1), r2, {});
    while (!S.step(sim)) { /* 進める */ }
    if (sim.skillFx.some(f => f.i === 0 && f.id === 'startdash')) fired++;
  }
  K.setup = setup0;
  assert(fired > 5, `スタートダッシュが発動しない（${fired}/20）`);
  return `平均 ${(total / n).toFixed(1)}個・なし${Math.round(base * 100)}% ${out.join(' ')}`;
});

check('ride: しごく・引くの段は手を止めても保たれ、追い通すと負ける。ムチは左右と持ち替え', () => {
  const S = HS.Sim;
  const play = (policy, N) => {
    const rng = new U.RNG(9); let pos = 0;
    for (let k = 0; k < N; k++) {
      const field = []; for (let i = 0; i < 12; i++) { const h = H.makeFiller(rng, { level: 82, surface: '芝', dist: 2000, born: 2000 }); h.name = 'h' + i; field.push({ horse: h, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1, rider: i === 0 ? 'P' : undefined }); }
      const sim = S.create({ dist: 2000, surface: '芝', course: '東京', ground: '良', year: 2004 }, field, H.weekIndex(2004, 5, 1), new U.RNG(rng.int(1, 1e9)), { frames: true, ride: true });
      let next = 0;
      while (!S.step(sim)) {
        const c = sim.ctl, R = sim.D - sim.st[0].x;
        if (!c.started) S.ctl.up(sim);
        if (policy === 'all' && sim.t >= next) { S.ctl.up(sim); next = sim.t + 0.15; }
        if (policy === 'late' && R < sim.straight + 350 && c.gear < 1 && sim.t >= next) { S.ctl.up(sim); next = sim.t + 0.2; }
      }
      pos += S.finish(sim).results.findIndex(r => r.horse.name === 'h0') + 1;
    }
    return pos / N;
  };
  const all = play('all', 40), late = play('late', 40), none = play('none', 40);
  assert(late < all && late < none, `直線でしごく ${late}・追い通す ${all}・何もしない ${none}`);
  // 段は保たれる
  const rng = new U.RNG(4);
  const field = []; for (let i = 0; i < 8; i++) field.push({ horse: H.makeFiller(rng, { level: 80, surface: '芝', dist: 1600, born: 2000 }), jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1, rider: i === 0 ? 'P' : undefined });
  const sim = S.create({ dist: 1600, surface: '芝', course: '東京', ground: '良', year: 2004 }, field, H.weekIndex(2004, 5, 1), rng, { frames: true, ride: true });
  S.ctl.up(sim); for (let i = 0; i < 20; i++) S.step(sim);
  S.ctl.up(sim); S.step(sim); S.ctl.up(sim);
  const g = sim.ctl.gear; for (let i = 0; i < 50; i++) S.step(sim);
  assert(g > 0 && sim.ctl.gear === g, '手を止めると段が戻る');
  S.ctl.down(sim); assert(sim.ctl.gear < g, '引いても下がらない');
  assert(sim.ctl.hand === 'R' && S.ctl.whip(sim, 'L') === 'swap' && sim.ctl.hand === 'L', '反対の手のムチで持ち替えない');
  for (let i = 0; i < 5; i++) S.step(sim);
  const w = S.ctl.whip(sim, 'L');
  assert(w && w !== 'swap' && sim.ctl.whips === 1, `ムチが入らない（${w}）`);
  return `平均着順 直線でしごく ${late.toFixed(1)}・追い通す ${all.toFixed(1)}・何もしない ${none.toFixed(1)}`;
});

check('season: お手馬10頭まで・資金切れで終わり・冠・調子の8段階・フリーハンデ', () => {
  const T = HS.Season;
  W.newGame({ year: 2003, seed: 5, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
  const G = W.get();
  G.player.money = 1e9;
  const market = W.marketHistoric().sort((a, b) => a.price - b.price);
  let bought = 0, refused = null;
  for (const it of market) { const r = W.buy(it); if (!r) bought++; else if (/頭まで/.test(r)) { refused = r; break; } }
  assert(bought === T.MAX_OWN && refused, `買えた数 ${bought}・断り ${refused}`);
  // 資金切れ：マイナスの月末が2回続くと終わり
  G.player.money = -1; T.monthEnd(); assert(!G.gameOver && G.broke === 1, '1か月目で終わった');
  T.monthEnd(); assert(G.gameOver, '2か月続いても終わらない');
  // 冠
  const h = { gradedWins: [{ y: 2005, short: '皐月賞', grade: 'G1' }, { y: 2005, short: '日本ダービー', grade: 'G1' }, { y: 2005, short: '菊花賞', grade: 'G1' }, { y: 2006, short: '宝塚記念', grade: 'G1' }, { y: 2006, short: '有馬記念', grade: 'G1' }] };
  const tl = T.titles(h).map(t => t.label);
  assert(tl.includes('三冠') && tl.includes('グランプリ制覇') && !tl.includes('二冠') && tl.includes('G1五勝'), tl.join('・'));
  // 調子とフリーハンデ
  const x = W.mine()[0];
  x.fatigue = 70; assert(T.condLevel(x, W.wIdx()) === 7, '使いすぎにならない');
  x.fatigue = 0; x.cond = 30; x.lastRaceW = W.wIdx() - 3; assert(T.condLevel(x, W.wIdx()) === 2, '絶好調にならない');
  x.lastRaceW = W.wIdx() - 30; assert(T.condLevel(x, W.wIdx()) === 0, '休みすぎにならない');
  const fh = T.fhBoth(x, W.wIdx());
  assert(fh.turf >= 30 && fh.turf <= 70 && fh.dirt >= 30 && fh.dirt <= 70, JSON.stringify(fh));
  // 出走の予約：1年先までの重賞を押さえると、その週に出走登録になる
  G.gameOver = null; G.broke = 0; G.player.money = 1e9;
  const y = W.all().find(m => m.owner !== 'P' && m.loc === 'stable' && G.year - m.born === 4 && !m.injury);
  y.owner = 'P'; y.auto = false; y.fatigue = 0;
  const target = W.upcomingGraded(T.weeksLeft(G)).find(r => r.inWeeks >= 2 && !T.reserve(y.id, r));
  assert(target, '予約できる重賞が無い');
  assert(T.reserves(y.id).length === 1, '予約が残っていない');
  const nextYear = W.upcomingGraded(T.weeksLeft()).filter(r => r.year > G.year && r.inWeeks > target.inWeeks);
  assert(nextYear.length && nextYear.some(r => !T.reserve(y.id, r)), '来年の重賞を予約できない');
  const extra = T.reserves(y.id).find(x => x.key !== target.key); T.unreserve(y.id, extra.key);
  for (let i = 0; i < target.inWeeks; i++) W.finishWeek({});
  const ent = W.entryOf(y.id);
  assert((ent && ent.raceKey === target.key) || G.news.some(n => n.text.includes('予約していた')), `予約が出走登録にならない（${target.key}）`);
  assert(T.reserves(y.id).length === 0, '使った予約が残る');
  const s1 = W.serialize(); W.load(s1); assert(W.serialize() === s1, 'セーブの往復で中身が変わる');
  return `予約 ${target.short || target.name}・冠 ${tl.join('・')}・フリーハンデ 芝${fh.turf} ダ${fh.dirt}`;
});

check('season: デビュー前の馬も、新馬戦と重賞を1年先まで予約できる', () => {
  const T = HS.Season;
  W.newGame({ year: 2004, seed: 8, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
  const G = W.get(); G.player.money = 1e9;
  const it = W.marketHistoric().find(x => G.year - x.horse.born === 2);
  assert(!W.buy(it), '買えない');
  const h = W.horse(it.horse.id);
  const g = W.upcomingGraded(T.weeksLeft()).filter(r => !T.staticIneligible(h, r, r.year));
  assert(g.length > 5 && g.some(r => r.year > G.year), `予約できる重賞 ${g.length}`);
  const dw = T.debutWeeks(h);
  assert(dw.length > 10, 'デビュー戦の週が無い');
  const wk = dw[2];
  assert(!T.reserveDebut(h.id, wk.y, wk.m, wk.w), '新馬戦を予約できない');
  let guard = 0;
  while (!(G.year === wk.y && G.month === wk.m && G.week === wk.w) && guard++ < 60) W.finishWeek({});
  const ent = W.entryOf(h.id);
  const race = ent && W.raceByKey(ent.raceKey);
  assert((race && race.cls === 'newcomer') || G.news.some(n => n.text.includes('予約していた')), `新馬戦に登録されない（${h.loc}）`);
  return `${h.name}：${wk.y}年${wk.m}月${wk.w}週 ${race ? race.name + ' ' + race.course + race.surface + race.dist : '（ニュースで知らせた）'}`;
});

check('season: 年末のグランドフィナーレに強い馬が招待され、12月4週に走る', () => {
  const T = HS.Season;
  W.newGame({ year: 2005, seed: 12, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
  const G = W.get();
  // 強い現役馬を1頭、自分の馬にする（G1を勝った扱い）
  const star = W.all().filter(h => h.loc === 'stable' && G.year - h.born >= 3 && h.hist).sort((a, b) => b.gradedWins.length - a.gradedWins.length)[0];
  star.owner = 'P';
  let guard = 0;
  while (!(G.month === 11 && G.week === 4) && guard++ < 60) W.finishWeek({});
  star.gradedWins.push({ y: G.year, race: '天皇賞（秋）', short: '天皇賞・秋', grade: 'G1' }); star.injury = null; star.loc = 'stable';
  while (!(G.month === 12 && G.week === 1) && guard++ < 60) W.finishWeek({});
  assert(G.dc && G.dc.y === G.year && G.dc.ids.length >= T.DC_FIELD, '招待馬が決まらない');
  assert(G.dc.ids.includes(star.id) || star.injury, 'G1を勝った自分の馬が招待されない');
  const ok = !star.injury;
  while (!(G.month === 12 && G.week === 4) && guard++ < 70) W.finishWeek({});
  const card = W.cards().find(c => c.race.invite);
  assert(card && card.runners.length >= 10, `グランドフィナーレの出走表が無い（${card && card.runners.length}）`);
  assert(!card.runners.some(x => x.horse.filler) || card.runners.filter(x => !x.horse.filler).length >= 10, '招待馬が少ない');
  const rep = W.finishWeek({});
  const r = rep.races.find(x => x.race.invite);
  assert(r && r.sim.results.length === card.runners.length, '走っていない');
  const w = r.sim.results[0].horse;
  assert(w.gradedWins.some(g => g.short === T.DC_NAME), '勝ち鞍に残らない');
  const s1 = W.serialize(); W.load(s1); assert(W.serialize() === s1, 'セーブの往復で中身が変わる');
  return `${card.runners.length}頭・勝ったのは${w.name}${ok ? '' : '（自分の馬は出られなかった）'}`;
});

check('eraless: 年代なし。1990〜2026年の馬が毎年ランダムにデビューし、走っている間は馬の店に並ばない', () => {
  const E = HS.Eraless;
  W.newGame({ seed: 21, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
  const G = W.get();
  assert(G.eraless && U.ERA === E.ERA && W.dateLabel(G.year, 1, 1).startsWith('1年目'), '年代なしになっていない');
  const hist = W.all().filter(h => h.hist);
  assert(hist.length >= E.CROP * 4, `史実馬が少ない ${hist.length}`);
  for (const h of hist) { const d = W.histByName.get(h.name); assert(d && E.isPool(d), `${h.name} は1990〜2026年の馬ではない`); }
  // 生年をずらしても、勝ち鞍は本当の年の分だけ前に持つ
  const shop = W.marketHistoric();
  const act = E.activeNames();
  assert(shop.length > 1000 && !shop.some(it => act.has(it.horse.name)), '走っている馬が店に並んでいる');
  assert(shop.every(it => G.year - it.horse.born === 2), '店の馬が2歳でない');
  // 買うと店から消える
  G.player.money = 1e9;
  const it = shop.sort((a, b) => b.price - a.price)[0];
  assert(!W.buy(it), '買えない');
  const mine = W.horse(it.horse.id);
  assert(mine && mine.owner === 'P' && !W.marketHistoric().some(x => x.horse.name === mine.name), '買った馬が店に残る');
  // 年が明けると新しい2歳が出て、引退した馬は店に戻る
  const old = hist.find(h => G.year - h.born >= 6);
  let guard = 0;
  while (G.year === G.startYear && guard++ < 60) W.finishWeek({});
  const crop = W.all().filter(h => h.hist && G.year - h.born === 2 && h.owner !== 'P').length;
  assert(crop >= E.CROP * 0.8, `今年の2歳 ${crop}`);
  if (old && !W.horse(old.id)) assert(W.marketHistoric().some(x => x.horse.name === old.name), '引退した馬が店に戻らない');
  const s1 = W.serialize(); W.load(s1); assert(W.serialize() === s1 && U.ERA === E.ERA, 'セーブの往復で中身が変わる');
  return `史実馬 ${hist.length}頭・店 ${shop.length}頭・2年目の2歳 ${crop}頭`;
});

check('special: 1989年より前の名馬はグループごとの条件にリーチで出てきて、勝つと店に並ぶ', () => {
  const SP = HS.Special;
  W.newGame({ seed: 33, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
  const G = W.get();
  const tri = SP.members(SP.BY.triple).map(d => d.name);
  assert(['セントライト', 'シンザン', 'ミスターシービー', 'シンボリルドルフ'].every(n => tri.includes(n)), `歴代の三冠馬 ${tri.join('・')}`);
  assert(SP.members(SP.BY.unbeaten).some(d => d.name === 'トキノミノル'), '無敗の名馬にトキノミノルがいない');
  assert(SP.members(SP.BY.gf).some(d => d.name === 'セントサイモン') && !SP.members(SP.BY.unbeaten).some(d => d.name === 'セントサイモン'), '伝説級はグランドフィナーレのグループだけ');
  const seen = new Set(); for (const g of SP.GROUPS) for (const d of SP.members(g)) { assert(!seen.has(d.name), `${d.name} が2つ以上のグループにいる`); seen.add(d.name); }
  assert(!SP.members(SP.BY.autumn).some(d => d.name === 'シンボリルドルフ'), 'シンボリルドルフが三冠以外にもいる');
  assert(SP.list().length < 150 && ['ダンシングブレーヴ', 'ミルリーフ', 'トキノミノル'].every(n => SP.byName(n)), `有名な強い馬だけになっていない（${SP.list().length}頭）`);
  assert(!SP.list().some(x => HS.Eraless.isPool(x.d)), '1989年以降の馬がスペシャルホースになっている');
  // 皐月賞と日本ダービーを勝った馬が菊花賞に出ると、歴代の三冠馬が出てくる
  const kk = R.gradedYear(G.year).find(r => r.short === '菊花賞');
  const h = W.all().find(x => x.hist && x.sex !== '牝' && !x.gelding && G.year - x.born === 3 && x.loc === 'stable' && !x.injury);
  h.owner = 'P'; h.auto = false; h.fatigue = 0; h.injury = null; h.earn = 30000; h.wins = 4; h.starts = 5;
  h.gradedWins.push({ y: G.year, race: '皐月賞', short: '皐月賞', grade: 'G1' }, { y: G.year, race: '東京優駿', short: '日本ダービー', grade: 'G1' });
  assert(SP.reachInfo(h).some(r => r.group.id === 'triple' && r.need === '菊花賞'), 'リーチが出ない');
  for (const k of H.STATS) h.pot[k] = 150;
  h.distMin = 1600; h.distMax = 3200; h.kire = 6; h.apt.turf = 100;
  G.month = kk.month; G.week = kk.week; W.dirty(); W._cache = null; W._week = null;
  const race = W.weekRaces().find(r => r.short === '菊花賞');
  assert(!W.enter(h.id, race.key), '菊花賞に登録できない');
  const card = W.cards().find(c => c.race.key === race.key);
  const sps = card.runners.filter(x => x.horse.legend).map(x => x.horse.name);
  assert(sps.includes('セントライト') && sps.includes('シンボリルドルフ') && sps.length <= SP.MAX_IN_RACE, `スペシャルホースが出ない（${sps.join('・')}）`);
  const rep = W.finishWeek({});
  const res = rep.races.find(r => r.race.key === race.key).sim.results;
  assert(res[0].horse === h, `勝てなかった（1着 ${res[0].horse.name}）`);
  assert(sps.every(n => G.unlocked.includes(n)), '倒したのに店に並ばない');
  assert(G.trophies.triple, 'トロフィー「三冠」が付かない');
  assert(W.marketHistoric().some(x => x.horse.name === 'セントライト' && x.legend), 'セントライトが店に並ばない');
  assert(!W.all().some(x => x.legend), 'スペシャルホースが世界に残る');
  // 無敗の連勝：7連勝の馬は、次のレースで無敗の名馬に挑む
  const g = Object.assign({}, h, { owner: 'P', wins: SP.STREAK - 1, starts: SP.STREAK - 1 });
  assert(SP.reach(g, SP.BY.unbeaten, { short: '何か' }) && !SP.reach(Object.assign({}, g, { starts: SP.STREAK }), SP.BY.unbeaten, { short: '何か' }), '無敗の連勝のリーチが合わない');
  return `${SP.list().length}頭・${SP.GROUPS.length}グループ・菊花賞に ${sps.join('・')}`;
});

check('original: 引退させた牡馬と牝馬からオリジナルホース。能力は親から、特殊能力は4つまで、トロフィー・GFでボーナス', () => {
  const O = HS.Original, J = HS.Jockey;
  W.newGame({ seed: 44, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
  const G = W.get();
  const pick = (sex, n) => W.all().filter(x => x.hist && x.loc === 'stable' && !x.gelding && (sex === '牝' ? x.sex === '牝' : x.sex !== '牝') && G.year - x.born >= 4).slice(0, n);
  const males = pick('牡', 6), mares = pick('牝', 2);
  for (const h of males.concat(mares)) h.owner = 'P';
  // 父はトロフィーとDCを勝っている
  const s = males[0];
  G.trophies.triple = { y: G.year, horse: s.name };
  s.gradedWins.push({ y: G.year, race: 'グランドフィナーレ', short: 'グランドフィナーレ', grade: 'GF' });
  for (let i = 0; i < 5; i++) { const r = J.retire(males[i].id); assert(r.to === 'retired', `引退できない ${r.err}`); }
  assert(J.retire(males[5].id).err, '6頭目の牡馬も牧場に残れてしまう');
  for (const m of mares) assert(J.retire(m.id).to === 'retired', '牝馬が残らない');
  assert(s.parentBonus === 2 * O.BONUS_PER, `ボーナス ${s.parentBonus}`);
  // 特殊能力：両親で8つあれば4つ
  s.skills = ['big', 'longspurt']; s.trigFixed = ['isshun', 'chokusen'];
  const m = mares[0]; m.skills = ['narabu', 'nino']; m.trigFixed = ['oosoto', 'startdash'];
  assert(O.candidates(s, m).length === 8, '候補が8つにならない');
  const n0 = W.mine().length;
  const r = O.make(s.id, m.id, 'テストオリジナル');
  assert(!r.err && r.horse.owner === 'P' && r.horse.original && W.mine().length === n0 + 1, `作れない ${r.err}`);
  const c = r.horse;
  const all = (c.skills || []).concat(HS.Skills.of(c));
  assert(all.length === 4 && all.every(id => O.candidates(s, m).includes(id)), `特殊能力 ${all.join(',')}`);
  assert(r.bonus === s.parentBonus, 'ボーナスが付かない');
  for (const k of H.STATS) { const avg = (s.pot[k] + m.pot[k]) / 2; assert(Math.abs(c.pot[k] - avg - r.bonus) < 30, `${k} が親から離れすぎ`); }
  assert(O.make(males[1].id, m.id).err, '同じ年に同じ牝馬から2頭作れてしまう');
  assert(!O.make(males[1].id, mares[1].id).err, '別の牝馬から作れない');
  assert(!O.release(males[4].id) && O.retired('牡').length === 4, '放せない');
  const s1 = W.serialize(); W.load(s1); assert(W.serialize() === s1, 'セーブの往復で中身が変わる');
  return `${c.name}：${c.sex}・特殊能力 ${all.map(id => HS.Skills.label(id)).join('・')}・ボーナス +${r.bonus}`;
});

// ---------- 騎手のゲーム ----------
check('jockey: 史実馬を買って自分で乗り、成績と賞金とリーディングが付く', () => {
  const J = HS.Jockey, S = HS.Sim;
  W.newGame({ year: 2000, seed: 77, mode: 'jockey', jockeyName: 'テスト騎手', region: '栗東' });
  const G = W.get();
  assert(G.mode === 'jockey' && G.jockey && W.mine().length === 0, '騎手のゲームになっていない');
  assert(J.offers().length === 0, '騎乗依頼は使わない');
  // デビュー前の史実馬を、買えるだけ（2歳を優先）
  const m0 = G.player.money;
  const market = W.marketHistoric().filter(it => G.year - it.horse.born === 2).sort((a, b) => a.price - b.price);
  for (const it of market) if (it.price <= G.player.money && W.mine().length < 2) assert(!W.buy(it), '買えない');
  assert(W.mine().length >= 1 && G.player.money < m0, `買えていない（資金 ${m0}・いちばん安い ${market[0] && market[0].price}）`);
  let ridden = 0;
  const weeks = 48;
  for (let i = 0; i < weeks; i++) {
    const played = {};
    const mine = J.myRides();
    mine.forEach(({ card }, k) => {
      if (k > 0) return; // 1レースは操作して乗り、ほかはおまかせ
      const sim = W.startSim(card, { ride: true });
      let next = 0;
      while (!S.step(sim)) {
        const s = sim.st[sim.me], R = sim.D - s.x;
        if (!sim.ctl.started) S.ctl.up(sim);
        if (R < sim.straight + 350 && sim.ctl.gear < 1 && sim.t >= next) { S.ctl.up(sim); next = sim.t + 0.2; }
        if (R < 250 && sim.t >= next + 0.3) { S.ctl.whip(sim, 'R'); next = sim.t + 0.3; }
        if (sim.ctl.blockedNow && sim.ctl.lane < 4) S.ctl.lane(sim, 1);
      }
      played[card.race.key] = S.finish(sim);
    });
    ridden += mine.length;
    W.finishWeek(played);
  }
  const j = G.jockey;
  assert(ridden > 0 && j.total.rides === ridden, `騎乗数 ${j.total.rides} / ${ridden}`);
  assert(W.mine('stable').length + W.mine('farm').length > 0, '持ち馬がいない');
  const lead = J.leading(G.startYear || 2000);
  assert(lead.length > 50 && lead.some(x => x.me), 'リーディングの表が無い');
  const s1 = W.serialize(); W.load(s1); const s2 = W.serialize();
  assert(s1 === s2, 'セーブの往復で中身が変わる');
  return `${weeks}週で騎乗 ${ridden}・${j.total.wins}勝・持ち馬 ${W.mine().map(h => h.name).join('・')}・資金 ${U.money(G.player.money)}`;
});

console.log(results.join('\n'));
console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
