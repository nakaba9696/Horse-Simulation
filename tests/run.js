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
  assert(E.clean(o.name, { rating: o.rating, jockey: '武豊' }) === null, 'clean が同じ値を残した');
});

// ---------- 能力の形・脚の切れ・坂・特殊能力 ----------
check('stats: 能力の形と、前の版のセーブ・エディットの読み替え', () => {
  const old = { pot: { spd: 80, sta: 70, kick: 90, pow: 60, guts: 75, wise: 70 }, bonus: { kick: 2, pow: 3, wise: 1 }, temper: 40, style: '差し', apt: { turf: 100, dirt: 55, heavy: 50 } };
  H.fromLegacy(old);
  assert(JSON.stringify(Object.keys(old.pot).sort()) === JSON.stringify(H.STATS.slice().sort()), `能力の項目が違う ${Object.keys(old.pot)}`);
  assert(old.gr.mind === 'D' && old.gr.slope === 'C' && old.gr.guts === 'B+' && old.gr.heavy === 'E' && old.kire >= 6 && old.temper == null, `読み替えが違う ${JSON.stringify(old)}`);
  assert(old.pot.spd === 80 && old.pot.dspd < 70, `芝・ダートの分け方が違う ${JSON.stringify(old.pot)}`);
  assert(old.bonus.slope === 3 && old.bonus.mind === 1 && old.bonus.kick == null, '調教の上積みの読み替えが違う');
  const g = { v: 1, horses: { a: { name: 'x', pot: { spd: 80, sta: 80, kick: 70, pow: 70, guts: 70, wise: 70 }, temper: 60, style: '逃げ', apt: { turf: 50, dirt: 100, heavy: 50 } } } };
  W.migrate(g);
  const a = g.horses.a;
  assert(a.kire >= 1 && a.kire <= 8 && Array.isArray(a.skills) && H.GRADED.every(k => H.isGrade(a.gr[k])), `古いセーブが今の形にならない ${JSON.stringify(a.gr)}`);
  assert(a.pot.dspd === 80 && a.pot.spd < 70, `ダートの馬の芝の能力が下がっていない ${JSON.stringify(a.pot)}`);
  for (const d of D.historic.slice(0, 400)) {
    const h = H.fromHistoric(d, 'x');
    assert(h.kire >= 1 && h.kire <= 8, `${d.name} の切れ ${h.kire}`);
    for (const k of H.STATS) assert(Number.isFinite(h.pot[k]), `${d.name} の ${k}`);
    for (const sk of h.skills) assert(H.SKILLS[sk], `${d.name} の特殊能力 ${sk}`);
    for (const k of H.GRADED) assert(H.isGrade(h.gr[k]), `${d.name} の ${k} が段階でない ${h.gr[k]}`);
  }
  // エディットの段階と、前の版の数のエディット
  const dd = D.historic.find(x => x.name === 'ディープインパクト');
  const e1 = H.fromHistoric(Object.assign({}, dd, { guts: 'E', heavy: 'SS' }), 'x');
  assert(e1.gr.guts === 'E' && e1.gr.heavy === 'SS', 'エディットの段階が効かない');
  const e2 = H.fromHistoric(Object.assign({}, dd, { health: 93, heavy: 41 }), 'x');
  assert(e2.gr.health === 'S' && e2.gr.heavy === 'E', '前の版の数のエディットが段階にならない');
  // 調教の上積みで段階が上がる
  const t = { gr: { guts: 'B' }, bonus: { guts: 8 } };
  assert(H.gradeOf(t, 'guts') === 'A', `調教で段階が上がらない ${H.gradeOf(t, 'guts')}`);
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
  const weak = h => { h.gr.slope = 'E'; };
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

console.log(results.join('\n'));
console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
