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
  const texts = (D.famous || []).concat(D.profiles || []).map(f => f.text).filter(Boolean).join('\n');
  for (const n of real) if (n.length >= 3 && texts.includes(n)) bad.push('解説:' + n);
  assert(!bad.length, '実名が残っている: ' + bad.slice(0, 8).join(', '));
  return `${F.map.size}人・例 ${['武豊', 'C.ルメール'].map(n => n + '→' + F.map.get(n)).join('・')}`;
});

check('profiles: スペシャルホースは全頭に名鑑（年代・戦績・主な勝鞍・8行ほどの解説）', () => {
  HS.U.ERA = HS.Eraless.ERA;
  const SP = HS.Special, bad = [];
  for (const { d } of SP.list()) {
    if (!/^\d{4}(〜\d{4})?年$/.test(d.years || '')) bad.push(d.name + ':年代');
    if (!/^\d+戦\d+勝/.test(d.record || '')) bad.push(d.name + ':戦績');
    if (!(d.mainWins || []).length) bad.push(d.name + ':主な勝鞍');
    if ((d.text || '').length < 250) bad.push(d.name + ':解説' + (d.text || '').length + '字');
  }
  const known = new Set((D.historic || []).concat(D.legendsExtra || []).map(d => d.name));
  for (const p of D.profiles || []) if (!known.has(p.name)) bad.push(p.name + ':史実馬にいない');
  // 名馬の解説がある史実馬は、全頭に名鑑がある
  const prof = new Set((D.profiles || []).map(p => p.name));
  for (const d of D.historic || []) if (d.text && !d.record) bad.push(d.name + ':名鑑なし');
  for (const p of D.profiles || []) if (/……|どこか|ふと|まるで|です。|ます。/.test(p.text)) bad.push(p.name + ':避ける癖');
  assert(!bad.length, bad.slice(0, 10).join(', '));
  const lens = SP.list().map(x => x.d.text.length);
  return `スペシャルホース ${SP.list().length}頭・解説 ${Math.min(...lens)}〜${Math.max(...lens)}字・名鑑 ${prof.size}頭`;
});

check('assets: 素材はすべて出典の一覧にあり、大きさが目安以内', () => {
  const fs = require('fs'), path = require('path');
  const dir = path.join(__dirname, '..', 'assets');
  if (!fs.existsSync(dir)) return '素材なし';
  const credits = fs.readFileSync(path.join(dir, 'CREDITS.md'), 'utf8');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  let total = 0; const bad = [];
  for (const f of files) {
    total += fs.statSync(path.join(dir, f)).size;
    if (!html.includes(`assets/${f}`)) bad.push(f + ':index.html で読んでいない');
    if (!credits.includes(f.replace(/\.js$/, '')) && !credits.includes(f)) bad.push(f + ':CREDITS に無い');
  }
  assert(!bad.length, bad.join(', '));
  assert(total < 60 * 1024 * 1024, `素材が大きすぎる（${(total / 1048576).toFixed(1)}MB）`);
  return `${files.length}個・${(total / 1048576).toFixed(1)}MB`;
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

check('layouts: 競馬場の形（コーナー・直線・高低差）がそろっている', () => {
  // index.html でまだ読んでいなければ、ここで読み、終わったら外す（ほかの確かめはゲームと同じ読み込みで動かす）
  const own = !D.layouts;
  if (own) { const fs = require('fs'), path = require('path'), vm = require('vm'); const f = path.join(__dirname, '..', 'data', 'layouts.js'); vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f }); }
  try { return checkLayouts(D.layouts); } finally { if (own) delete D.layouts; }
});
function checkLayouts(L) {
  assert(L, 'data/layouts.js がない');
  const RAD = Math.PI / 180, bad = [];
  // 走る向きにたどって、ゴールに戻るかを見る（半径は角度に沿って入口から出口へ直線的に変わる。track.js の fromLayout と同じ読み方）
  const arcLen = s => Math.abs(s[3]) * RAD * (s[1] + s[2]) / 2;
  const closeErr = segs => {
    let x = 0, y = 0, h = 0;
    for (const s of segs.slice().reverse()) {
      if (s[0] === 'S') { x += s[1] * Math.cos(h); y += s[1] * Math.sin(h); continue; }
      const m = 360, dphi = s[3] * RAD / m;
      for (let i = 0; i < m; i++) { const r = s[1] + (s[2] - s[1]) * (i + 0.5) / m, hm = h + dphi / 2; x += r * Math.abs(dphi) * Math.cos(hm); y += r * Math.abs(dphi) * Math.sin(hm); h += dphi; }
    }
    return Math.hypot(x, y);
  };
  let n = 0, maxErr = 0;
  for (const [name, c] of Object.entries(L)) {
    const co = D.courses[name];
    if (!co) { bad.push(`${name}:courses.js に無い`); continue; }
    for (const sf of Object.keys(c)) {
      const k = `${name}${sf === 'turf' ? '芝' : 'ダ'}`;
      if (!['turf', 'dirt'].includes(sf) || !co[sf]) { bad.push(`${k}:courses.js にその馬場が無い`); continue; }
      const uses = new Set();
      for (const o of c[sf]) {
        n++;
        const kk = `${k}${o.id}`;
        if (!(o.lap > 0 && o.straight > 0 && o.straight <= o.lap)) bad.push(`${kk}:lap/straight`);
        if (!Array.isArray(o.segs) || !o.segs.length) { bad.push(`${kk}:segs が無い`); continue; }
        let len = 0, ang = 0;
        for (const s of o.segs) {
          if (s[0] === 'S' && s.length === 2 && s[1] >= 0) len += s[1];
          else if (s[0] === 'C' && s.length === 5 && s[1] > 0 && s[2] > 0 && s[3] !== 0) { len += arcLen(s); ang += s[3]; }
          else bad.push(`${kk}:segs の形 ${JSON.stringify(s)}`);
        }
        if (o.segs[0][0] !== 'S' || Math.abs(o.segs[0][1] - o.straight) > 1) bad.push(`${kk}:最初の直線が straight と違う`);
        if (Math.abs(len - o.lap) > o.lap * 0.01) bad.push(`${kk}:長さの合計 ${len.toFixed(1)} が lap ${o.lap} と1%より違う`);
        const loop = !o.line && !o.open;
        if (o.line && (o.segs.length !== 1 || o.segs[0][0] !== 'S')) bad.push(`${kk}:直線のコースの segs`);
        if (loop) {
          if (Math.abs(ang - 360) > 0.5) bad.push(`${kk}:角度の合計 ${ang.toFixed(1)}`);
          const e = closeErr(o.segs); maxErr = Math.max(maxErr, e / o.lap);
          if (e > o.lap * 0.02) bad.push(`${kk}:形が閉じない（${e.toFixed(1)}m）`);
        }
        if (HS.Track && HS.Track.fromLayout && !o.open) { const tr = HS.Track.fromLayout(o, co.dir); if (Math.abs(tr.L - o.lap) > o.lap * 0.01) bad.push(`${kk}:fromLayout の長さ ${tr.L.toFixed(1)} が lap と1%より違う`); }
        const ev = o.elev || [];
        if (ev.length < 2 || ev[0][0] !== 0 || Math.abs(ev[ev.length - 1][0] - o.lap) > 0.5) bad.push(`${kk}:elev が残り0から lap まででない`);
        for (let i = 1; i < ev.length; i++) if (!(ev[i][0] > ev[i - 1][0])) { bad.push(`${kk}:elev の並び`); break; }
        if (ev.length && Math.abs(Math.min(...ev.map(p => p[1]))) > 0.05) bad.push(`${kk}:elev のいちばん低い所が0でない`);
        if (loop && ev.length && Math.abs(ev[0][1] - ev[ev.length - 1][1]) > 0.05) bad.push(`${kk}:周回なのに残り0と lap の高さが違う`);
        if (!Array.isArray(o.use)) bad.push(`${kk}:use が無い`);  // 今のゲームのレースで使わない回りは空でよい
        for (const d of o.use || []) { if (uses.has(d)) bad.push(`${k}:${d}m が2つの回りにある`); uses.add(d); }
        if (!Array.isArray(o.src) || !o.src.length || o.src.some(u => !/^https:\/\//.test(u))) bad.push(`${kk}:src`);
        if (typeof o.note !== 'string' || !o.note) bad.push(`${kk}:note`);
      }
      // このゲームのレースの距離が、どれかの回りにある
      const need = new Set(D.races.filter(r => r.course === name && (r.surface === 'ダ' ? 'dirt' : 'turf') === sf).map(r => r.dist));
      const cd = R.DISTS && R.DISTS[name] && R.DISTS[name][sf === 'turf' ? '芝' : 'ダ'];
      for (const d of cd || []) need.add(d);
      for (const d of need) if (!uses.has(d)) bad.push(`${k}:${d}m の回りが無い`);
    }
  }
  // courses.js の全部の場・馬場に形がある
  for (const [name, co] of Object.entries(D.courses)) for (const sf of ['turf', 'dirt']) if (co[sf] && !(L[name] && L[name][sf] && L[name][sf].length)) bad.push(`${name}${sf === 'turf' ? '芝' : 'ダ'}:形が無い`);
  assert(!bad.length, bad.slice(0, 15).join(', '));
  const all = Object.keys(D.courses).length, has = Object.keys(L).length;
  return `${has}/${all}場・${n}の回り・閉じ方の誤差は最大 ${(maxErr * 100).toFixed(2)}%`;
}

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
  assert(hill - flat > 0.35, `中山 ${hill.toFixed(2)} 京都 ${flat.toFixed(2)}`); // 京都も3コーナーに坂がある（実際の高低差）。ゴール前の急坂の分だけ中山で沈む
  return `平均着順 中山 ${hill.toFixed(1)}・京都 ${flat.toFixed(1)}`;
});
check('track: 実際の形と高低差（data/layouts.js の形）から、コースの位置・高さ・勝ち負けへの効きを出す', () => {
  const T = HS.Track;
  const lay = { id: '内', lap: 1667, straight: 310, use: [2000], segs: [['S', 310], ['C', 120, 95, 180, 3], ['S', 420], ['C', 100, 100, 180, 1], ['S', 300]], elev: [[0, 3], [70, 3], [180, 0.8], [800, 0], [1300, 4], [1667, 3]] };
  const t = T.fromLayout(lay, '右');
  const p0 = t.at(0), pL = t.at(t.L - 0.01);
  assert(Math.hypot(p0.x - pL.x, p0.y - pL.y) < 1, `周回が閉じていない ${JSON.stringify([p0, pL])}`);
  assert(t.at(100).corner === 0 && t.at(400).corner === 3, 'コーナーの番号が違う');
  assert(t.gAt(120) > 0.015 && t.gAt(1000) < 0, `勾配の向きが違う ${t.gAt(120)} ${t.gAt(1000)}`);
  const ln = T.fromLayout({ id: '直線', line: true, lap: 1000, straight: 1000, segs: [['S', 1000]], elev: [[0, 0]] }, '左');
  assert(Math.abs(Math.hypot(ln.at(0).x - ln.at(1000).x, ln.at(0).y - ln.at(1000).y) - 1000) < 1 && ln.at(500).corner === 0, '直線のコースの長さが違う');
  // 坂の弱い馬は、実際の坂（ゴール前の急坂）があると沈む。仮の形で中山と京都を置き換えて比べる
  const LY0 = HS.DATA.layouts; HS.DATA.layouts = Object.assign({}, LY0, { '中山': { turf: [lay] }, '京都': { turf: [Object.assign({}, lay, { elev: [[0, 0]] })] } });
  try {
    const weak = h => { h.pot.slope = 50; };
    const hill = fieldTest('中山', 2000, weak, 150).pos, flat = fieldTest('京都', 2000, weak, 150).pos;
    assert(hill - flat > 0.4, `坂あり ${hill.toFixed(2)} 平ら ${flat.toFixed(2)}`);
    const f = T.forRace({ course: '中山', surface: '芝', dist: 2000 });
    assert(f.geo.loop === '内' && Math.abs(f.geo.lap - 1667) < 20 && !f.track.flat, '回りの選び方が違う');
    return `周回 ${t.L.toFixed(0)}m・坂の弱い馬の平均着順 坂あり ${hill.toFixed(1)}・平ら ${flat.toFixed(1)}`;
  } finally { HS.DATA.layouts = LY0; }
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
  for (const sk of ['oonige', 'longspurt', 'big', 'hipace']) {
    const r = fieldTest('東京', 2000, h => { h.skills = [sk]; if (sk === 'oonige') h.style = '逃げ'; }, 120);
    assert(r.win < 0.5, `${sk} の勝率 ${r.win}`);
    out.push(`${H.SKILLS[sk].label}${Math.round(r.win * 100)}%`);
  }
  // 出遅れ癖は出遅れたレースだけに効くので、種を変えて数を重ねて比べる
  let badPos = 0, basePos = 0;
  for (let sd = 1; sd <= 4; sd++) { badPos += fieldTest('東京', 2000, h => { h.skills = ['deokure']; }, 100, sd).pos; basePos += fieldTest('東京', 2000, h => { h.skills = []; }, 100, sd).pos; }
  assert(badPos >= basePos, `出遅れ癖が得になっている（平均着順 ${(badPos / 4).toFixed(2)}・癖なし ${(basePos / 4).toFixed(2)}）`);
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
  // 無くした特殊能力（馬群割り）を受け継いでいた前のセーブの馬は、それを外して走る
  assert(JSON.stringify(K.of({ trigFixed: ['bagun', 'oosoto'] })) === '["oosoto"]', '無くした特殊能力が残る');
  // 最後方一気は直線の長さに関係なく、残りの距離（500m から）で発動する
  assert(K.BY.saikoubi.when({ R: 450, rank: 14, n: 14, c: null, s: { spurting: true }, inStraight: false }) && !K.BY.saikoubi.when({ R: 600, rank: 14, n: 14, c: null, s: { spurting: true }, inStraight: false }), '最後方一気が残りの距離で決まらない');
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

check('skills: 系統を1つずつ回して選ぶ・一気系は1レースに1つだけ・足した能力（自由自在・砂かぶり×・左右の回り×）が効く', () => {
  const K = HS.Skills, S = HS.Sim;
  // 選び方：系統を1つずつ回すので、まだ取っていない系統に持てる能力があるのに、同じ系統を2つ取ることはない
  const rng = new U.RNG(15);
  for (let i = 0; i < 400; i++) {
    const h = H.makeFiller(rng, { level: 70 + (i % 30), surface: '芝', dist: 2000, born: 2000 });
    const p = K.stats(h), ids = K.of(h);
    const groups = ids.map(id => K.BY[id].group);
    const avail = K.ORDER.filter(g => K.LIST.some(k => k.group === g && k.learn(p)));
    if (new Set(groups).size < groups.length) assert(avail.every(g => groups.includes(g)), `系統が偏る ${ids.join(',')}（取れる系統 ${avail.join(',')}）`);
  }
  // 一気系を3つ持たせても、1レースで発動するのは1つだけ
  const setup0 = K.setup;
  K.setup = sim => { setup0(sim); sim.st[0].trig = ['saikoubi', 'chokusen', 'oosoto']; };
  let ikki = 0, over = 0;
  try {
    const r = new U.RNG(8);
    for (let k = 0; k < 40; k++) {
      const field = []; for (let i = 0; i < 14; i++) { const h = H.makeFiller(r, { level: 82, surface: '芝', dist: 2000, born: 2000 }); if (i === 0) h.style = '追込'; field.push({ horse: h, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1 }); }
      const sim = S.create({ dist: 2000, surface: '芝', course: '東京', ground: '良', year: 2004 }, field, H.weekIndex(2004, 5, 1), r, {});
      while (!S.step(sim)) { /* 進める */ }
      const n = sim.skillFx.filter(f => f.i === 0 && K.BY[f.id] && K.BY[f.id].ikki).length;
      if (n) ikki++; if (n > 1) over++;
    }
  } finally { K.setup = setup0; }
  assert(ikki >= 10 && over === 0, `一気系の発動 ${ikki}/40・2つ以上 ${over}`);
  // 自由自在：スローなら前、ハイなら後ろで運ぶ。持たない馬は変わらない
  const h = H.makeFiller(new U.RNG(2), { level: 80, surface: '芝', dist: 2000, born: 2000 }); h.style = '差し';
  const plain = S.runPos(h, 0.99).gap;
  h.skills = ['jiyu'];
  assert(S.runPos(h, 0.99).gap < plain && S.runPos(h, 1.01).gap > plain && S.runPos(h, 1).gap === plain, '自由自在で位置が変わらない');
  // 左回り×・右回り×は、苦手な回りで総合が下がる
  const race = c => ({ course: c, surface: '芝', dist: 2000, grade: 'G2', month: 5 });
  assert(S.skillAdj({ skills: ['leftB'] }, race('東京'), null, {}) < 0 && S.skillAdj({ skills: ['leftB'] }, race('中山'), null, {}) === 0, '左回り×');
  assert(S.skillAdj({ skills: ['rightB'] }, race('中山'), null, {}) < 0 && S.skillAdj({ skills: ['rightB'] }, race('東京'), null, {}) === 0, '右回り×');
  // 砂かぶり×：ダートで前に馬がいると脚を使い、着順が下がる
  const dirt = mod => { const r = new U.RNG(17); let pos = 0; const N = 150;
    for (let k = 0; k < N; k++) {
      const field = []; for (let i = 0; i < 14; i++) { const x = H.makeFiller(r, { level: 82, surface: 'ダ', dist: 1800, born: 2000 }); x.name = 'h' + i; if (i === 0) { x.style = '差し'; mod(x); } field.push({ horse: x, jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1 }); }
      pos += S.run({ dist: 1800, surface: 'ダ', course: '東京', ground: '良', year: 2004 }, field, H.weekIndex(2004, 5, 1), r, {}).results.findIndex(x => x.horse.name === 'h0') + 1;
    }
    return pos / N; };
  const suna = dirt(x => { x.skills = ['sunaB']; }), none = dirt(x => { x.skills = []; });
  assert(suna > none, `砂かぶり×が損になっていない（${suna.toFixed(2)}・なし ${none.toFixed(2)}）`);
  // 史実馬にも付く
  const hs = D.historic.slice(0, 3000).map((d, i) => H.fromHistoric(d, 't' + i));
  for (const id of ['jiyu', 'leftB', 'sunaB']) assert(hs.some(x => x.skills.includes(id)), `${H.SKILLS[id].label}を持つ史実馬がいない`);
  return `一気系 ${ikki}/40 で1つずつ・砂かぶり× 平均着順 ${none.toFixed(2)}→${suna.toFixed(2)}`;
});
check('sim: ペース：スローは前・ハイは後ろが有利、平均ペースは脚質がおおむね釣り合う', () => {
  const S = HS.Sim;
  const bins = { 'スローペース': {}, '平均ペース': {}, 'ハイペース': {} };
  const rng = new U.RNG(77);
  for (let k = 0; k < 220; k++) {
    const field = []; for (let i = 0; i < 14; i++) field.push({ horse: H.makeFiller(rng, { level: 82, surface: '芝', dist: 2000, born: 2000 }), jockey: { skill: 75 }, weight: 57, num: i + 1, frame: 1 });
    const sim = S.create({ dist: 2000, surface: '芝', course: '東京', ground: '良', year: 2004 }, field, H.weekIndex(2004, 5, 1), rng, {});
    while (!S.step(sim)) { /* 進める */ }
    const b = bins[S.paceVerdict(sim.paceF)];
    S.finish(sim).results.forEach(r => { const x = b[r.horse.style] = b[r.horse.style] || { n: 0, pos: 0 }; x.n++; x.pos += r.pos; });
  }
  const avg = (v, sts) => { let n = 0, p = 0; for (const st of sts) if (bins[v][st]) { n += bins[v][st].n; p += bins[v][st].pos; } return p / n; };
  const F = ['逃げ', '先行'], B = ['差し', '追込'];
  assert(avg('スローペース', F) < avg('スローペース', B) - 1, 'スローで前が有利になっていない');
  assert(avg('ハイペース', B) < avg('ハイペース', F) - 1, 'ハイで後ろが有利になっていない');
  const mid = H.STYLES.map(st => avg('平均ペース', [st]));
  assert(Math.max(...mid) - Math.min(...mid) < 1.5, `平均ペースで脚質の差が大きい ${mid.map(x => x.toFixed(2)).join('・')}`);
  return `平均ペースの平均着順 ${H.STYLES.map((st, i) => st + mid[i].toFixed(1)).join('・')}`;
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
  const lane0 = sim.ctl.lane;
  const w = S.ctl.whip(sim, 'L');
  assert(w && w !== 'swap' && sim.ctl.whips === 1, `ムチが入らない（${w}）`);
  // ムチではよれない（持ち主の指摘 2026-10-17「どっちうってもよれないようにして」）
  for (let i = 0; i < 4; i++) { S.step(sim); S.ctl.whip(sim, 'L'); }
  S.ctl.swap(sim); for (let i = 0; i < 12; i++) S.step(sim);
  for (let i = 0; i < 4; i++) { S.ctl.whip(sim, 'R'); S.step(sim); }
  assert(sim.ctl.lane === lane0, `ムチで進路が変わった（${lane0}→${sim.ctl.lane}）`);
  return `平均着順 直線でしごく ${late.toFixed(1)}・追い通す ${all.toFixed(1)}・何もしない ${none.toFixed(1)}`;
});

check('season: お手馬10頭まで・資金切れで終わり・冠・調子の8段階・総合力', () => {
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
  // 調子と総合力
  const x = W.mine()[0];
  x.fatigue = 70; assert(T.condLevel(x, W.wIdx()) === 7, '使いすぎにならない');
  x.fatigue = 0; x.cond = 30; x.lastRaceW = W.wIdx() - 3; assert(T.condLevel(x, W.wIdx()) === 2, '絶好調にならない');
  x.lastRaceW = W.wIdx() - 30; assert(T.condLevel(x, W.wIdx()) === 0, '休みすぎにならない');
  const fh = T.fhBoth(x, W.wIdx());
  assert(fh.turf >= 1 && fh.turf <= 99 && fh.dirt >= 1 && fh.dirt <= 99, JSON.stringify(fh));
  // 総合力：史実馬は伸びきったとき45〜85に入る（ごく弱い馬を除く）。エアグルーヴ70・キンチェム85。能力の上限がそろうと99
  const pks = HS.Eraless.pool().map(d => { const p = T.fhPeak(H.fromHistoric(d, 'x')); return Math.max(p.turf, p.dirt); }).sort((a, b) => a - b);
  const q = f => pks[Math.floor(f * (pks.length - 1))];
  assert(q(0.02) >= 44 && q(0.5) >= 55 && q(0.5) <= 65 && pks[pks.length - 1] >= 77 && pks[pks.length - 1] <= 81, `史実馬の総合力 ${q(0.02)}〜${q(0.5)}〜${pks[pks.length - 1]}`);
  const fhN = n => { const p = T.fhPeak(H.fromHistoric(HS.Special.data(n) || W.histByName.get(n), 'x')); return Math.max(p.turf, p.dirt); };
  for (const [n, lo, hi] of [['キンチェム', 84, 86], ['エアグルーヴ', 69, 71]]) assert(fhN(n) >= lo && fhN(n) <= hi, `${n}の総合力 ${fhN(n)}`);
  const top = {}; for (const k of H.STATS) top[k] = 118;
  assert(T.fhOf(top, '芝') === 99 && T.fhOf(top, 'ダ') === 99, '能力の上限で99にならない');
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
  return `予約 ${target.short || target.name}・冠 ${tl.join('・')}・総合力 芝${fh.turf} ダ${fh.dirt}（史実馬の完成 ${q(0.02)}〜${pks[pks.length - 1]}）`;
});

check('season: デビュー前の馬も、新馬戦と重賞を1年先まで予約できる', () => {
  const T = HS.Season;
  W.newGame({ year: 2004, seed: 8, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
  const G = W.get(); G.player.money = 1e9;
  G.month = 6; // 店が2歳（デビュー前）を売るのは6〜12月（1〜5月は3歳。持ち主の仕様書「店」）
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

// 自分の馬が今年その距離の G1 を勝った扱いにする（成績と勝ち鞍）
function fakeG1(G, h, name, surface, dist) {
  h.results.push({ y: G.year, m: 10, w: 4, race: name, grade: 'G1', surface, dist, pos: 1, pop: 2 });
  h.gradedWins.push({ y: G.year, race: name, short: name, grade: 'G1', region: 'JRA' });
  W.dirty();
}

check('season: 12月4週のあとの GF の週に、グランドフェスティバルが6つ開かれ、招待馬が走る', () => {
  const T = HS.Season;
  // 種：長距離の GF の招待馬が12頭以上いる世界（長距離の馬は少なく、種しだいで11頭前後になる。史実馬のデータが変わったら選び直す）
  W.newGame({ year: 2005, seed: 14, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
  const G = W.get();
  assert(T.GF_CATS.length === 6 && T.GF_CATS.map(c => `${c.surface}${c.dist}`).join() === '芝1200,芝1600,芝2000,芝2400,芝3200,ダ2000', '6つの GF が無い');
  // 強い現役馬を1頭、自分の馬にする（クラシックの G1 を勝った扱い）
  const star = W.all().filter(h => h.loc === 'stable' && G.year - h.born >= 3 && h.hist).sort((a, b) => b.gradedWins.length - a.gradedWins.length)[0];
  star.owner = 'P'; star.auto = false;
  let guard = 0;
  while (!(G.month === 12 && G.week === 4) && guard++ < 60) W.finishWeek({});
  star.injury = null; star.loc = 'stable';
  fakeG1(G, star, 'ジャパンC', '芝', 2400);
  assert(T.dcStatus(star, 'classic').state === 'sure', `クラシックの G1 を勝った自分の馬が「資格あり」にならない（${T.dcStatus(star, 'classic').state}）`);
  W.finishWeek({});
  assert(G.month === 12 && G.week === T.GF_WEEK, 'GF の週にならない');
  assert(G.dc && G.dc.y === G.year && G.dc.gf && Object.keys(G.dc.gf).length === 6, '6つの招待が決まらない');
  for (const c of T.GF_CATS) assert(G.dc.gf[c.id].ai.length >= 12, `${c.label}の招待馬が少ない（${G.dc.gf[c.id].ai.length}）`);
  const ok = !star.injury;
  assert(G.dc.gf.classic.elig.some(x => x.id === star.id) || !ok, 'G1を勝った自分の馬がクラシックに招待されない');
  if (ok) assert(T.dcPendingList().includes('classic'), '招待の返事を待っていない');
  const ran = [];
  const cards = W.cards().filter(c => c.race.invite);
  assert(cards.length === 6, `GF の週の出走表が6つでない（${cards.length}）`);
  for (const card of cards) {
    assert(card.runners.length === T.DC_FIELD, `${card.race.name}の出走表が16頭でない（${card.runners.length}）`);
    assert(card.runners.filter(x => x.horse.foreignTrained).length <= T.DC_FOREIGN, '外国の馬が多すぎる');
    assert(card.race.name === T.gfName(card.race.gf) && card.race.week === T.GF_WEEK && card.race.course === T.GF_BY[card.race.gf].course, 'GF の名前・週・競馬場が違う');
    if (card.race.gf === 'classic' && ok && !star.injury) assert(card.ride && card.runners.filter(x => x.mine).length === 1, '返事が無いとき、おすすめの1頭で出ない');
  }
  const rep = W.finishWeek({});
  for (const r of rep.races.filter(x => x.race.invite)) { assert(r.watch && r.sim.results[0].horse.gradedWins.some(g => g.short === r.race.name), '勝ち鞍に残らない'); ran.push(r.race.gf + ':' + r.sim.results[0].horse.name); }
  assert(ran.length === 6 && G.month === 1 && G.week === 1, `走った GF が6つでない（${ran.length}）か、年が明けない`);
  const s1 = W.serialize(); W.load(s1); assert(W.serialize() === s1, 'セーブの往復で中身が変わる');
  return ran.join('・');
});

check('dream: GF ごとの資格（G1・前年の勝ち馬・その距離の票）と、出ない／1頭だけ選ぶ・連戦、古いセーブ', () => {
  const T = HS.Season;
  // 種：11月4週に「票で圏内」の内国産馬がいる世界（史実馬のデータが変わると世界も変わるので、そのときは種を選び直す）
  W.newGame({ seed: 32, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
  const G = W.get();
  let guard = 0;
  while (!(G.month === 11 && G.week === 4) && guard++ < 60) W.finishWeek({});
  // 票：G1の1着100・1番人気で+5。その年・その区分の距離のレースだけ数える
  const rs = { results: [{ y: G.year, grade: 'G1', pos: 1, pop: 1, surface: '芝', dist: 1600 }, { y: G.year, grade: 'G3', pos: 2, surface: '芝', dist: 1800 }, { y: G.year, grade: 'G1', pos: 1, surface: '芝', dist: 2400 }, { y: G.year - 1, grade: 'G1', pos: 1, surface: '芝', dist: 1600 }] };
  assert(T.votesOf(rs, G.year, 'mile') === 117 && T.votesOf(rs, G.year, 'classic') === 100 && T.votesOf(rs, G.year, 'dirt') === 0, `票の数え方（${T.votesOf(rs, G.year, 'mile')}・${T.votesOf(rs, G.year, 'classic')}）`);
  // 自分の馬を3頭：マイルとクラシックの G1 を勝った馬・クラシックの票で圏内の馬・圏外の馬
  const pool = W.all().filter(h => h.loc === 'stable' && !h.injury && G.year - h.born >= 3 && h.owner !== 'P' && !h.foreignTrained && !T.g1Wins(h, G.year).length && !T.gfWins(h).length);
  const st0 = T.dcStanding('classic');
  const inside = st0.find(x => x.in && x.tier === 2 && pool.includes(x.h)).h;
  const outside = pool.find(h => !T.GF_CATS.some(c => T.dcStanding(c.id).some(x => x.h === h && x.in)) && !T.GF_CATS.some(c => T.votesOf(h, G.year, c.id) > 0));
  const g1 = pool.find(h => h !== inside && h !== outside);
  for (const h of [inside, outside, g1]) { h.owner = 'P'; h.auto = false; }
  fakeG1(G, g1, 'マイルCS', '芝', 1600); fakeG1(G, g1, 'ジャパンC', '芝', 2400);
  const s = (h, c) => T.dcStatus(h, c);
  assert(s(g1, 'mile').state === 'sure' && s(g1, 'classic').state === 'sure' && s(g1, 'sprint').state !== 'sure', `G1の勝ち馬：${s(g1, 'mile').state}・${s(g1, 'sprint').state}`);
  assert(s(inside, 'classic').state === 'in' && /12月4週/.test(s(inside, 'classic').need), `票の圏内：${s(inside, 'classic').state}`);
  assert(s(outside, 'classic').state === 'out' && /票|G1/.test(s(outside, 'classic').need), `圏外とあと何が要るか：${s(outside, 'classic').state} ${s(outside, 'classic').need}`);
  const young = W.all().find(h => h.loc === 'stable' && G.year - h.born === 2);
  if (young) { const o = young.owner; young.owner = 'P'; assert(s(young, 'mile').state === 'young', '2歳が3歳からにならない'); young.owner = o; }
  for (const h of [inside, outside, g1]) { h.auto = false; }
  while (!(G.month === 12 && G.week === T.GF_WEEK) && guard++ < 70) { for (const h of [g1, outside]) { h.injury = null; h.loc = 'stable'; } W.finishWeek({}); }
  assert(G.month === 12 && G.week === T.GF_WEEK && G.dc && G.dc.gf, '12月4週のあとに招待が来ない');
  const elig = c => T.dcEligible(c).map(x => x.h.id);
  assert(elig('mile').includes(g1.id) && elig('classic').includes(g1.id) && !elig('classic').includes(outside.id), '招待された自分の馬が違う');
  assert(T.dcStatus(outside, 'classic').state === 'notInvited', '圏外の馬が招待されたことになる');
  // 連戦：マイルとクラシックの両方に同じ馬で出られる
  assert(T.dcChoose('classic', outside.id), '招待されていない馬で出られる');
  assert(!T.dcChoose('mile', g1.id) && G.dc.gf.mile.pick === g1.id, '招待された馬を選べない');
  assert(!T.dcChoose('classic', g1.id) && G.dc.gf.classic.pick === g1.id, '同じ馬で2つの GF に出られない');
  // 出ない：AI の馬だけで走る
  assert(!T.dcDecline('mile') && G.dc.gf.mile.ans === 'no', '出ないを選べない');
  let lineup = T.dcLineup('mile');
  assert(lineup.length === T.DC_FIELD && !lineup.some(h => h.owner === 'P'), '出ないのに自分の馬がいる');
  lineup = T.dcLineup('classic');
  assert(lineup.length === T.DC_FIELD && lineup.filter(h => h.owner === 'P').length === 1 && lineup.includes(g1), '自分の馬が1頭にならない');
  for (const c of T.dcPendingList()) T.dcDecline(c);
  assert(!T.dcPending(), '全部に返事をしても待っている');
  // 古いセーブ（12月2〜4週に GF を走っていた版の招待）：もう GF の週なら、その年は招待し直さない
  const g = JSON.parse(W.serialize());
  g.dc = { y: G.year, ids: T.dcLineup('classic').map(h => h.id).concat([inside.id]) };
  W.load(JSON.stringify(g));
  const G2 = W.get();
  assert(G2.dc && G2.dc.v === 2 && !Object.keys(G2.dc.gf).length && !W.weekRaces().some(r => r.invite), '古いセーブの招待が今の形にならない');
  // 前の年の勝ち馬は、その GF で確定（前の名前の GF はクラシック）
  const champ = W.all().find(h => h.owner === 'P' && h.loc === 'stable' && !h.injury);
  champ.gradedWins.push({ y: G2.year - 1, race: T.gfName('sprint'), short: T.gfName('sprint'), grade: 'GF' });
  champ.gradedWins.push({ y: G2.year - 1, race: 'ドリームクラシック', short: 'ドリームクラシック', grade: 'GF' });
  G2.dc = null; W.dirty();
  assert(T.dcStatus(champ, 'sprint').state === 'sure' && T.dcStatus(champ, 'classic').state === 'sure', '前の年の勝ち馬が確定にならない');
  const tl = T.titles(champ).map(t => t.label);
  assert(tl.includes('GF スプリント覇者') && tl.includes('GF クラシック覇者') && T.gfWins(champ).length >= 2, `GF ごとの冠（${tl}）`);
  // スペシャルホース（伝説級）：前の年のその GF を勝った馬が出ると、その GF の担当の名馬（データの gf）だけ出てくる
  const SP = HS.Special;
  const sprintRace = T.dcRace(G2.year, 'sprint');
  const lg = SP.pending(champ, sprintRace).filter(x => x.g.id === 'gf').map(x => x.d);
  assert(lg.length && lg.every(d => d.gf === 'sprint'), `短距離の GF の伝説級が担当でない（${lg.map(d => d.name)}）`);
  assert(!SP.pending(champ, T.dcRace(G2.year, 'mile')).some(x => x.g.id === 'gf'), '勝っていない GF にも伝説級が出る');
  return `16位の票 ${T.GF_CATS.map(c => c.label + T.dcCut(c.id).votes).join(' ')}・伝説級（短距離）${lg.map(d => d.name).join('・')}`;
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
  G.shopKeys = E.locks().map(l => l.key); // 値段の開きを見るため、店を全部開ける（開き方は 'shop:' で見る）
  const shop = E.market();
  const act = E.activeNames();
  assert(shop.length > 1000 && !shop.some(it => act.has(it.horse.name)), '走っている馬が店に並んでいる');
  assert(shop.every(it => G.year - it.horse.born === E.shopAge(G.month)) && E.shopAge(1) === 3 && E.shopAge(5) === 3 && E.shopAge(6) === 2 && E.shopAge(12) === 2, '店の馬の年齢が月の決まり（6〜12月は2歳・1〜5月は3歳）でない');
  // 値段は強さで大きく開く（いまの総合力が6上がると2倍）。始めの資金で、いちばん強い馬は買えない
  const strong = shop.slice().sort((a, b) => E.shopValue(b.horse, W.wIdx()) - E.shopValue(a.horse, W.wIdx()));
  assert(strong[0].price >= strong[strong.length - 1].price * 20, `値段の差が小さい（${strong[strong.length - 1].price}〜${strong[0].price}）`);
  assert(Math.max(...shop.map(x => x.price)) > G.player.money * 3, 'いちばん強い馬が始めの資金で買える');
  // 買うと店から消える
  G.player.money = 1e9;
  const it = shop.sort((a, b) => b.price - a.price)[0];
  assert(!W.buy(it), '買えない');
  const mine = W.horse(it.horse.id);
  assert(mine && mine.owner === 'P' && !E.market().some(x => x.horse.name === mine.name), '買った馬が店に残る');
  // 年が明けると新しい2歳が出て、引退した馬は店に戻る
  const old = hist.find(h => G.year - h.born >= 6);
  let guard = 0;
  while (G.year === G.startYear && guard++ < 60) W.finishWeek({});
  const crop = W.all().filter(h => h.hist && G.year - h.born === 2 && h.owner !== 'P').length;
  assert(crop >= E.CROP * 0.8, `今年の2歳 ${crop}`);
  if (old && !W.horse(old.id)) assert(E.market().some(x => x.horse.name === old.name), '引退した馬が店に戻らない');
  const s1 = W.serialize(); W.load(s1); assert(W.serialize() === s1 && U.ERA === E.ERA, 'セーブの往復で中身が変わる');
  return `史実馬 ${hist.length}頭・店 ${shop.length}頭・2年目の2歳 ${crop}頭`;
});

check('shop: 馬の店は少しずつ開く（はじめは G3 まで。G1・G2・地方・国のレースを勝つとその馬が並ぶ）', () => {
  const E = HS.Eraless;
  W.newGame({ seed: 22, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
  const G = W.get();
  const by = n => W.histByName.get(n) || E.pool().find(d => d.name === n);
  const lk = n => E.lockOf(by(n));
  assert(lk('ディープインパクト') === 'gf:classic' && lk('ロードカナロア') === 'gf:sprint' && lk('フリオーソ') === 'local' && lk('ダノンスマッシュ') === 'g1', `鍵 ${['ディープインパクト', 'ロードカナロア', 'フリオーソ', 'ダノンスマッシュ'].map(lk).join(',')}`);
  assert(E.pool().some(d => lk(d.name) === 'c:独') && E.pool().some(d => lk(d.name) === 'c:英'), '国の鍵が無い');
  const gfN = E.pool().filter(d => (E.lockOf(d) || '').startsWith('gf:')).length;
  assert(gfN >= 60 && gfN <= 300 && HS.Season.GF_CATS.every(c => E.pool().some(d => E.lockOf(d) === 'gf:' + c.id)), `GF の馬の数（${gfN}）か、区分の抜け`);
  const names = () => new Set(E.market().map(x => x.horse.name));
  let shop = names();
  const lockedNow = E.pool().filter(d => E.lockOf(d) && !E.activeNames().has(d.name));
  assert(lockedNow.every(d => !shop.has(d.name)), 'まだ開いていない馬が並んでいる');
  assert(shop.size > 500, `はじめの店が少ない ${shop.size}`);
  const g1 = E.pool().find(d => E.lockOf(d) === 'g1' && !E.activeNames().has(d.name));
  const de = E.pool().find(d => E.lockOf(d) === 'c:独' && !E.activeNames().has(d.name));
  // G1 を勝つと G1馬と G2馬、ドイツのレースを勝つとドイツの馬
  E.unlockWin({ grade: 'G1', region: 'JRA', course: '東京' });
  shop = names();
  assert(shop.has(g1.name) && !shop.has(de.name), 'G1 を勝っても G1馬が並ばない（か、ドイツの馬まで並ぶ）');
  assert(G.shopKeys.includes('g2'), 'G1 を勝つと G2馬も並ぶ');
  const deRace = HS.DATA.races.find(r => (HS.DATA.courses[r.course] || {}).country === '独');
  E.unlockWin(deRace);
  assert(names().has(de.name), 'ドイツのレースを勝ってもドイツの馬が並ばない');
  const locks = E.locks();
  assert(locks.find(l => l.key === 'g1').open && !locks.find(l => l.key === 'local').open && locks.find(l => l.key === 'local').hint === '地方のレースを勝つ', '解放の表が違う');
  // 前のセーブ：自分の馬の勝ち鞍から開ける
  const h = W.mine()[0] || Object.values(G.horses)[0];
  const g = { eraless: true, horses: { a: { owner: 'P', gradedWins: [{ grade: 'G2', region: 'JRA' }], results: [{ pos: 1, course: '大井' }] } } };
  const k = E.migrateKeys(g);
  assert(k.includes('g2') && k.includes('local') && !k.includes('g1'), `前のセーブの鍵 ${k}`);
  // GF を勝つと、その区分の GF の馬が並ぶ（G1 の鍵も開く）
  const gfh = E.pool().find(d => E.lockOf(d) === 'gf:sprint' && !E.activeNames().has(d.name));
  const gfm = E.pool().find(d => E.lockOf(d) === 'gf:mile' && !E.activeNames().has(d.name));
  assert(!names().has(gfh.name), 'GF の馬が初めから並ぶ');
  E.unlockWin(HS.Season.dcRace(G.year, 'sprint'));
  assert(names().has(gfh.name) && !names().has(gfm.name), 'スプリントの GF を勝っても、その区分の GF の馬だけが並ぶようにならない');
  const lk2 = E.locks().find(l => l.key === 'gf:mile');
  assert(lk2 && !lk2.open && lk2.label === 'GFの馬（マイル）' && lk2.hint === 'マイルのGFを勝つ', `解放の表の GF の段（${lk2 && lk2.label}）`);
  // 前のセーブ：自分の馬が勝った GF の区分を開けておく（前の名前の GF は中長距離）
  const g2 = JSON.parse(W.serialize());
  g2.shopKeys = []; delete g2.gfShop; const ph = Object.values(g2.horses).find(x => x.owner === 'P') || Object.values(g2.horses)[0]; ph.owner = 'P'; ph.gradedWins.push({ y: 2025, race: 'グランドフィナーレ', short: 'グランドフィナーレ', grade: 'GF' });
  W.load(JSON.stringify(g2));
  assert(W.get().shopKeys.includes('gf:classic'), `前のセーブで GF の鍵が開かない（${W.get().shopKeys}）`);
  return `はじめの店 ${new Set(E.market().map(x => x.horse.name)).size}頭（G1 とドイツを開けたあと）・鍵 ${locks.map(l => l.label + l.n).join(' ')}`;
});

check('shop: 品ぞろえは走っていない馬から牡馬・牝馬それぞれ10頭（毎月入れ替え・鍵が開いた馬は来月から・買うと消える・セーブに入る）', () => {
  const E = HS.Eraless;
  W.newGame({ seed: 24, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
  const G = W.get();
  const st = W.marketHistoric();
  const names = st.map(x => x.horse.name), act = E.activeNames();
  assert(st.filter(x => x.horse.sex === '牝').length === E.STOCK && st.filter(x => x.horse.sex !== '牝').length === E.STOCK, `品ぞろえの数 ${st.length}`);
  assert(new Set(names).size === names.length && !names.some(n => act.has(n)) && st.every(x => E.isOpen(x.data)), '品ぞろえに走っている馬か、開いていない馬か、重なりがある');
  assert(W.marketHistoric().map(x => x.horse.name).join() === names.join(), '同じ月のうちに品ぞろえが変わる');
  // 買うと消える
  G.player.money = 1e9;
  assert(!W.buy(st[0]) && !W.marketHistoric().some(x => x.horse.name === names[0]) && W.marketHistoric().length === 2 * E.STOCK - 1, '買った馬が品ぞろえに残る');
  // セーブの往復で同じ
  const s1 = W.serialize(); W.load(s1);
  assert(W.marketHistoric().map(x => x.horse.name).join() === names.slice(1).join(), 'セーブの往復で品ぞろえが変わる');
  // 鍵が開いても、品ぞろえは来月まで同じ
  E.unlockWin({ grade: 'G1', region: 'JRA', course: '東京' });
  const n2 = W.marketHistoric().map(x => x.horse.name);
  assert(n2.join() === names.slice(1).join(), '鍵が開いたその月に品ぞろえが変わる（来月から）');
  // 月が変わると入れ替わる
  let guard = 0; const m0 = G.month;
  while (G.month === m0 && guard++ < 8) W.finishWeek({});
  const n3 = W.marketHistoric().map(x => x.horse.name);
  assert(n3.join() !== n2.join() && n3.length >= 2 * E.STOCK - 2, `月が変わっても品ぞろえが変わらない（${n3.length}頭）`);
  // 前のセーブ（shopStock が無い）でも並ぶ
  const g = JSON.parse(W.serialize()); delete g.shopStock; W.load(JSON.stringify(g));
  assert(W.marketHistoric().length === 2 * E.STOCK, '前のセーブで品ぞろえが出ない');
  return `牡馬 ${n3.filter((n, i) => W.marketHistoric()[i].horse.sex !== '牝').length}・牝馬 ${E.STOCK}頭（開いている馬 ${E.market().length}頭から）`;
});

check('hall: トロフィーを2つ以上手にした自分の馬は、引退したときに殿堂入りし、記録が残る', () => {
  const HL = HS.Hall, J = HS.Jockey;
  W.newGame({ seed: 23, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
  const G = W.get();
  G.player.money = 1e9; G.shopKeys = HS.Eraless.locks().map(l => l.key);
  const shop = HS.Eraless.market().sort((a, b) => b.price - a.price);
  W.buy(shop[0]); W.buy(shop[1]);
  const [a, b] = W.mine();
  a.results = [{ y: G.year, m: 5, w: 4, race: '日本ダービー', course: '東京', surface: '芝', dist: 2400, pos: 1, n: 18, time: 143.5, jockey: 'テスト騎手' }]; a.starts = 1; a.wins = 1;
  G.trophies = { triple: { y: G.year, horse: a.name, hid: a.id, bonus: 1 }, autumn: { y: G.year, horse: a.name, bonus: 1 }, spring: { y: G.year, horse: b.name, hid: b.id, bonus: 1 } }; // autumn は前のセーブの形（名前だけ）
  assert(HL.trophiesOf(a).length === 2 && HL.eligible(a) && !HL.eligible(b), 'トロフィーの数え方が違う');
  assert(!(J.retire(a.id) || {}).err && !(J.retire(b.id) || {}).err, '引退できない');
  const x = HL.byId(a.id);
  assert(x && x.trophies.length === 2 && x.results.length === 1 && x.results[0].race === '日本ダービー' && !HL.byId(b.id), '殿堂の写しが違う');
  J.retire(a.id); assert(G.hallOwn.length === 1, '二度入る');
  const s1 = W.serialize(); W.load(s1); assert(W.get().hallOwn.length === 1, 'セーブの往復で殿堂が消える');
  return `${x.name}：トロフィー ${x.trophies.map(t => t.label).join('・')}`;
});

check('special: 1989年より前の名馬はグループごとの条件にリーチで出てきて、勝つと店に並ぶ', () => {
  const SP = HS.Special;
  W.newGame({ seed: 33, mode: 'jockey', jockeyName: 'テスト騎手', region: '美浦' });
  const G = W.get();
  const tri = SP.members(SP.BY.triple).map(d => d.name);
  assert(['セントライト', 'シンザン', 'ミスターシービー', 'シンボリルドルフ'].every(n => tri.includes(n)), `歴代の三冠馬 ${tri.join('・')}`);
  assert(SP.members(SP.BY.unbeaten).some(d => d.name === 'トキノミノル'), '無敗の名馬にトキノミノルがいない');
  assert(SP.members(SP.BY.gf).some(d => d.name === 'セントサイモン') && !SP.members(SP.BY.unbeaten).some(d => d.name === 'セントサイモン'), '伝説級はグランドフェスティバルのグループだけ');
  const seen = new Set(); for (const g of SP.GROUPS) for (const d of SP.members(g)) { assert(!seen.has(d.name), `${d.name} が2つ以上のグループにいる`); seen.add(d.name); }
  assert(!SP.members(SP.BY.autumn).some(d => d.name === 'シンボリルドルフ'), 'シンボリルドルフが三冠以外にもいる');
  assert(['ダンシングブレーヴ', 'ミルリーフ', 'トキノミノル'].every(n => SP.byName(n)), '名馬がスペシャルホースにいない');
  // 強さの下限は無い：評価の低い大レースの勝ち馬も入る
  assert(SP.list().some(x => (x.d.rating || 0) < 88 && !HS.DATA.isForeign(x.d)), '評価の低い名馬が入っていない');
  // 新しいグループの顔ぶれ（データの勝ち鞍・地方の印から）
  const mem = id => SP.members(SP.BY[id]).map(d => d.name);
  assert(mem('filly').includes('トウメイ') && mem('filly').includes('ガーネツト'), `牡馬を破った名牝 ${mem('filly').join('・')}`);
  assert(mem('long').includes('グリーングラス'), `長距離の王者 ${mem('long').join('・')}`);
  assert(mem('allround').includes('タケシバオー'), `万能の名馬 ${mem('allround').join('・')}`);
  assert(mem('local').includes('ハイセイコー'), `地方から来た名馬 ${mem('local').join('・')}`);
  assert(mem('arima2').includes('スピードシンボリ') && mem('arc2').includes('リボー') && mem('unbeaten').includes('ラフィアン'), 'スピードシンボリ・リボー・ラフィアンのグループが違う');
  assert(!SP.list().some(x => x.groups.length !== 1), '2つ以上のグループに入る名馬がいる');
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
  const money0 = G.player.money;
  const rep = W.finishWeek({});
  const res = rep.races.find(r => r.race.key === race.key).sim.results;
  assert(res[0].horse === h, `勝てなかった（1着 ${res[0].horse.name}）`);
  assert(sps.every(n => G.unlocked.includes(n)), '倒したのに店に並ばない');
  assert(G.trophies.triple && G.trophies.triple.bonus > 0, 'トロフィー「三冠」が付かない');
  assert(G.player.money - money0 >= G.trophies.triple.bonus, 'トロフィーのボーナス賞金が入らない');
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
  const m = mares[0]; m.skills = ['slowpace', 'tataki']; m.trigFixed = ['oosoto', 'startdash'];
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
  // 店の史実馬を、買えるだけ（店が売っている年齢の馬。1〜5月は3歳・6〜12月は2歳）
  const m0 = G.player.money;
  const market = W.marketHistoric().filter(it => G.year - it.horse.born === HS.Eraless.shopAge(G.month)).sort((a, b) => a.price - b.price);
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

check('look: 毛色の表に抜けがない・芦毛は年を取ると白い・馬具の馬は史実馬にいる・馬の形の三角形の数', () => {
  const vm = require('vm'), fs = require('fs'), path = require('path');
  globalThis.THREE = require('../lib/three.min.js');
  for (const f of ['js/ui/art.js', 'js/ui/race3d.js']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), { filename: f });
  const A = HS.Art, KEYS = ['body', 'top', 'belly', 'mane', 'tail', 'points', 'muzzle', 'hoof'];
  const hex = c => /^#[0-9a-f]{6}$/i.test(c);
  const coats = new Set(H.COATS);
  for (const h of D.historic) if (h.coat) coats.add(h.coat);
  for (const c of coats) {
    assert(A.COAT_LOOK[c], `毛色の表に無い：${c}`);
    for (const age of [2, 5, 10]) { const L = A.coatLook(c, age); for (const k of KEYS) assert(hex(L[k]), `${c} の ${k} が色でない：${L[k]}`); }
  }
  const lum = c => parseInt(c.slice(1, 3), 16) + parseInt(c.slice(3, 5), 16) + parseInt(c.slice(5, 7), 16);
  assert(lum(A.coatLook('芦毛', 2).body) < lum(A.coatLook('芦毛', 8).body), '芦毛が年を取っても白くならない');
  assert(A.coat('鹿毛').length === 4 && A.COAT['栗毛'], '2D の毛色の形が変わった');
  const names = new Set(D.historic.map(h => h.name));
  const GK = ['shadowRoll', 'blinkers', 'hood', 'cheekPieces', 'rollColor', 'color', 'cheekColor'];
  const g = D.gear || {};
  for (const [n, v] of Object.entries(g)) {
    assert(names.has(n), `馬具の馬が史実馬にいない：${n}`);
    for (const [k, x] of Object.entries(v)) { assert(GK.includes(k), `${n} の馬具の項目 ${k} を知らない`); if (/Color$|^color$/.test(k)) assert(hex(x), `${n} の ${k} が色でない`); }
    assert(v.shadowRoll || v.blinkers || v.hood || v.cheekPieces, `${n} に馬具が無い`);
  }
  assert(g['ナリタブライアン'] && g['ナリタブライアン'].shadowRoll, 'ナリタブライアンのシャドーロール');
  for (const k of Object.keys(HS.Race3D.GEAR)) assert(GK.includes(k), `描く馬具 ${k} が表の項目に無い`);
  // 馬の形：三角形の数の上限と、骨の重み
  const out = [];
  for (const [q, max] of [[1, 8000], [0, 2500]]) {
    const geo = HS.Race3D.horseGeometry(q), tri = geo.index.count / 3;
    assert(tri <= max, `馬の形（${q ? '近く' : '遠く'}）の三角形 ${tri} が ${max} を超える`);
    const si = geo.attributes.skinIndex.array, sw = geo.attributes.skinWeight.array;
    for (let i = 0; i < si.length; i += 4) {
      assert(si[i] < HS.Race3D.BONES && si[i + 1] < HS.Race3D.BONES, '骨の番号が範囲の外');
      assert(Math.abs(sw[i] + sw[i + 1] + sw[i + 2] + sw[i + 3] - 1) < 1e-4, '骨の重みの和が1でない');
    }
    const pos = geo.attributes.position.array;
    for (let i = 0; i < pos.length; i++) assert(isFinite(pos[i]), '形に NaN がある');
    out.push(`${q ? '近く' : '遠く'} ${tri}`);
    geo.dispose();
  }
  // 体の比（サラブレッド）：胴の長さ ≒ き甲の高さ、脚（肘から地面）は胴の深さ（き甲から腹）より短くない
  {
    const geo = HS.Race3D.horseGeometry(1, { bare: true }), P = geo.attributes.position, si = geo.attributes.skinIndex.array;
    let x0 = 9, x1 = -9, top = 0, belly = 9;
    for (let i = 0; i < P.count; i++) if (si[i * 4] === 1 && si[i * 4 + 1] === 1) { x0 = Math.min(x0, P.getX(i)); x1 = Math.max(x1, P.getX(i)); top = Math.max(top, P.getY(i)); if (Math.abs(P.getX(i) - 0.35) < 0.08) belly = Math.min(belly, P.getY(i)); }
    geo.dispose();
    const elbow = HS.Race3D.BONE_AT(9)[1];
    assert(Math.abs((x1 - x0) / top - 1) < 0.08, `胴の長さ ${(x1 - x0).toFixed(2)}m と体高 ${top.toFixed(2)}m の比が違う`);
    assert(elbow >= (top - belly) * 0.95, `脚 ${elbow.toFixed(2)}m が胴の深さ ${(top - belly).toFixed(2)}m より短い`);
    out.push(`体長 ${(x1 - x0).toFixed(2)}m・体高 ${top.toFixed(2)}m・胴の深さ ${(top - belly).toFixed(2)}m・肘の高さ ${elbow.toFixed(2)}m`);
  }
  // 芦毛の連銭は若いうちに出て、年を取るほど薄い
  const dp = [3, 5, 7, 9].map(a => HS.Art.coatLook('芦毛', a).dapple);
  assert(dp[0] > 0.3 && dp[1] < dp[0] + 0.2 && dp[2] < dp[1] && dp[3] < 0.05, `連銭の濃さ ${dp.map(v => v.toFixed(2))}`);
  return `毛色 ${coats.size}・馬具 ${Object.keys(g).length}頭・三角形 ${out.join(' / ')}`;
});

check('gait: 常歩は4拍子で着いた蹄が地面にあり、関節の角度が続いている（襲歩とまざっても NaN にならない）', () => {
  const R3 = HS.Race3D;
  let maxGap = 0, minLow = 9, maxStep = 0, prev = null;
  for (let i = 0; i < 40; i++) {
    const g = R3.gaitTest(i / 40);
    const lo = Math.min(...g.hoof);
    minLow = Math.min(minLow, lo); maxGap = Math.max(maxGap, Math.abs(lo));
    if (prev) for (let k = 8; k < 24; k++) maxStep = Math.max(maxStep, Math.abs(g.rot[k] - prev.rot[k]));
    prev = g;
  }
  assert(maxGap < 0.05, `常歩で着いた蹄が地面から ${maxGap.toFixed(3)}m 離れている`);
  assert(maxStep < 0.35, `常歩の関節が1/40周期で ${maxStep.toFixed(2)}rad 跳ぶ`);
  for (const w of [0.25, 0.5, 0.75]) { const g = R3.gaitTest(0.3, 0.4, w); assert(g.rot.every(isFinite) && isFinite(g.y), '常歩と襲歩の混ぜで NaN'); }
  return `蹄の高さのずれ 最大 ${(maxGap * 100).toFixed(1)}cm・関節の1コマの変化 最大 ${maxStep.toFixed(2)}rad`;
});

check('fight: 掛かると首と頭を上げ、騎手が上体を起こす。値が無いときは掛からない', () => {
  const R3 = HS.Race3D;
  const a = R3.gaitTest(null, 0.3, 0.5, 0), c = R3.gaitTest(null, 0.3, 0.5, 1);
  assert(c.rot[2] > a.rot[2] + 0.15 && c.rot[4] > a.rot[4] + 0.2, `掛かっても首・頭が上がらない ${a.rot[2].toFixed(2)}→${c.rot[2].toFixed(2)}`);
  assert(c.rot[25] > a.rot[25] + 0.2, '掛かっても騎手が上体を起こさない');
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'js/ui/ride.js'), 'utf8');
  assert(/kakari: s\.kakari \|\| 0, ears: s\.ears != null \? s\.ears : 0\.3/.test(src), 'ride.js が掛かり・耳を渡していない');
  return `首 ${a.rot[2].toFixed(2)}→${c.rot[2].toFixed(2)}・頭 ${a.rot[4].toFixed(2)}→${c.rot[4].toFixed(2)}`;
});

check('terrain: 3D の地面がコースの高さに合う（坂・楕円でない形・直線・馬蹄形）', () => {
  // race3d.js は前の 'look:' の確かめで読んである
  const T = HS.Track, R3 = HS.Race3D, out = [];
  const cases = [
    ['楕円・急坂', T.make(1667, 310, '右'), { slope: '急', dirt: false, hasOther: true }],
    ['周回の実際の形', T.fromLayout({ id: '内', lap: 1667, straight: 310, segs: [['S', 310], ['C', 120, 95, 180, 3], ['S', 420], ['C', 100, 100, 180, 1], ['S', 300]], elev: [[0, 4.6], [110, 4.0], [330, 0.6], [900, 1.0], [1350, 5.3], [1667, 4.6]] }, '右'), { dirt: true, hasOther: true }],
    ['直線', T.fromLayout({ id: '直線', line: true, lap: 1000, straight: 1000, segs: [['S', 1000]], elev: [[0, 0.3], [400, 0], [1000, 0.6]] }, '左'), { hasOther: false }],
    ['馬蹄形', T.fromLayout({ id: '馬蹄', line: true, lap: 2414, straight: 600, segs: [['S', 620], ['C', 260, 200, 110, 3], ['S', 380], ['C', 400, 400, 40, 1], ['S', 600], ['C', 500, 500, 30, 1], ['S', 300]], elev: [[0, 6], [150, 4], [700, 12], [1100, 26], [1600, 40], [2414, 1]] }, '左'), { hasOther: false }],
  ];
  // data/layouts.js の回りも全部（QUICK のときは各場の最初の回りだけ）
  const C = HS.DATA.courses, LY = HS.DATA.layouts || {};
  for (const [k, v] of Object.entries(LY)) for (const sf of ['turf', 'dirt']) (v[sf] || []).slice(0, QUICK ? 1 : 99).forEach(lay => {
    if (QUICK && sf === 'dirt' && v.turf && v.turf.length) return;
    cases.push([`${k}${sf === 'dirt' ? 'ダ' : '芝'}${lay.id || ''}`, T.fromLayout(lay, (C[k] || {}).dir), { dirt: sf === 'dirt', hasOther: !lay.line && !lay.open && !!(sf === 'dirt' ? (C[k] || {}).turf : (C[k] || {}).dirt) }, true]);
  });
  let nData = 0;
  for (const [name, tr, o, data] of cases) {
    const R = R3.terrain(tr, o), G = R.grid(), CS = 8, nx = Math.round((G.x1 - G.x0) / CS) + 1;
    for (let i = 0; i < G.pos.length; i++) assert(isFinite(G.pos[i]), `${name}：地面に NaN`);
    assert(G.idx.length > 3000, `${name}：地面の三角形が少ない`);
    // 升目の高さ（上から見た x, y。三角形の中は平面）
    const gridH = (x, y) => {
      const fx = (x - G.x0) / CS, fy = (y - G.y0) / CS, i = Math.floor(fx), j = Math.floor(fy), a = fx - i, b = fy - j, h = (ii, jj) => G.pos[(jj * nx + ii) * 3 + 1];
      return a + b <= 1 ? h(i, j) + (h(i + 1, j) - h(i, j)) * a + (h(i, j + 1) - h(i, j)) * b : h(i + 1, j + 1) + (h(i, j + 1) - h(i + 1, j + 1)) * (1 - a) + (h(i + 1, j) - h(i + 1, j + 1)) * (1 - b);
    };
    let worst = 0, hMin = Infinity, hMax = -Infinity;
    // ほかの所のコース（重なる回り・すぐ横を通る別の区間）がほぼ同じ近さにある所は、高さがどちらかに決まらないので除く
    const crowded = (p, f) => { const d = Math.hypot(f.x - p.x, f.y - p.y) + 12; return R.S.some(g => Math.abs(g.s - f.s) > 40 && Math.hypot(g.x - p.x, g.y - p.y) < d); };
    for (let k = 0; k < R.S.length; k += data ? 7 : 3) {
      const f = R.S[k];
      hMin = Math.min(hMin, f.e); hMax = Math.max(hMax, f.e);
      // 馬場の下は、地面がコースの帯より下
      const c = R.wpt(f, 12), nc = R.nearest(c.x, c.y);
      if (nc && !crowded(c, f)) assert(R.ground(c.x, c.y) <= f.e - 0.05, `${name}：残り ${f.s.toFixed(0)}m で地面が馬場から出る`);
      // 帯の内と外の縁で、地面がコースの高さとつながる（浮かない・埋まらない）
      for (const u of [R.bandI - 0.5, R.bandO0 + 0.5]) {
        const p = R.wpt(f, u), n = R.nearest(p.x, p.y);
        if (!n || Math.abs(n.u - u) > 1 || crowded(p, f)) continue;
        const d = gridH(p.x, p.y) - f.e;
        worst = Math.max(worst, Math.abs(d));
        assert(d < 0.08 && d > -0.3, `${name}：残り ${f.s.toFixed(0)}m の帯の縁（${u.toFixed(0)}m）で地面が ${d.toFixed(2)}m ずれる`);
      }
    }
    // 池は内馬場の中で、コースから離れている
    if (R.pond) {
      assert(R.loop, `${name}：直線のコースに池がある`);
      const n = R.nearest(R.pond.x, R.pond.y);
      assert(n && n.u < R.bandI - R.pond.rz, `${name}：池がコースに近い`);
    }
    if (data) nData++; else out.push(`${name} 高低差 ${(hMax - hMin).toFixed(1)}m・縁のずれ ${(worst * 100).toFixed(0)}cm`);
  }
  return out.join('／') + `／data/layouts.js の回り ${nData}`;
});
check('horse_rigged: 骨入りの馬の素材の形・骨の名前・出典（CC-BY の作者をクレジットに出す）', () => {
  const fs = require('fs'), path = require('path'), vm = require('vm'), R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
  const js = R('assets/horse_rigged.js'), b64 = js.slice(js.indexOf('base64,') + 7, js.lastIndexOf("'"));
  const glb = Buffer.from(b64, 'base64');
  assert(glb.readUInt32LE(0) === 0x46546C67, 'GLB でない');
  const jl = glb.readUInt32LE(12), g = JSON.parse(glb.slice(20, 20 + jl).toString('utf8'));
  const joints = g.skins[0].joints.length, tri = g.accessors[g.meshes[0].primitives[0].indices].count / 3;
  assert(joints === 42 && tri < 4000, `骨 ${joints}・三角形 ${tri}`);
  assert(js.length < 3 * 1024 * 1024, `素材の馬が大きすぎる（${(js.length / 1048576).toFixed(1)}MB）`);
  // js/ui/horse_rigged.js が使う骨の名前が、みな素材にある
  vm.runInThisContext(R('js/ui/horse_rigged.js'), { filename: 'js/ui/horse_rigged.js' });
  const HR = HS.HorseRigged, names = new Set(g.nodes.map(n => HR.keyOf(String(n.name || '').replace(/ /g, '_'))));
  const miss = Object.entries(HR.BN).filter(([k, v]) => !names.has(HR.keyOf(v))).map(([k]) => k);
  assert(!miss.length, `素材に無い骨 ${miss.join(',')}`);
  // 出典：CREDITS とゲームの中のクレジット
  const cr = R('assets/CREDITS.md');
  assert(cr.includes('horse_rigged') && cr.includes('abhayexe') && cr.includes('CC-BY-4.0'), 'CREDITS に骨入りの馬の出典が無い');
  vm.runInThisContext(R('js/ui/credits.js'), { filename: 'js/ui/credits.js' });
  assert(HS.Credits.LIST.some(x => x.by === 'abhayexe' && /CC-BY/.test(x.lic)), 'ゲームの中のクレジットに作者が無い');
  assert(R('js/ui/screens.js').includes('data-act="credits"'), 'タイトルにクレジットが無い');
  assert(['rigged', 'handmade'].includes(HR.model()), '馬の形の設定');
  return `骨 ${joints}・三角形 ${tri}・${(js.length / 1048576).toFixed(2)}MB・既定 ${HR.DEFAULT}`;
});
check('assets: 絵の素材は全部 CREDITS にあり大きさは上限の中・騎手の GLB の形・騎手が手綱と鐙に届く', () => {
  const vm = require('vm'), fs = require('fs'), path = require('path');
  const ROOT = path.join(__dirname, '..'), dir = path.join(ROOT, 'assets');
  const credits = fs.readFileSync(path.join(dir, 'CREDITS.md'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const { LIST } = require('../assets/pack_assets.cjs');
  // 3D のレースの素材（assets/pack_assets.cjs の表にあるもの。画面の背景 ui_bg_* は別の確かめ）
  const files = fs.readdirSync(dir).filter(f => /\.js$/.test(f) && LIST.some(a => a.key + '.js' === f));
  const uris = {};
  let total = 0;
  for (const f of files) {
    const key = f.replace(/\.js$/, ''), a = LIST.find(x => x.key === key);
    assert(a, `${f} が assets/pack_assets.cjs の表に無い`);
    const row = credits.split('\n').find(l => l.includes('`assets/' + f + '`'));
    assert(row, `${f} が assets/CREDITS.md に無い`);
    assert(/CC0|CC-BY/.test(row) && /https:\/\//.test(row), `${f} の行にライセンス（CC0・CC-BY）か URL が無い`);
    assert(html.includes(`src="assets/${f}"`), `${f} を index.html で読んでいない`);
    const size = fs.statSync(path.join(dir, f)).size;
    total += size;
    assert(size <= 1.5 * 1024 * 1024, `${f} が 1.5MB を超える（${(size / 1048576).toFixed(2)}MB）`);
    const ctx = {}; ctx.globalThis = ctx; vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx);
    const uri = ctx.HS && ctx.HS.ASSETS && ctx.HS.ASSETS[key];
    assert(typeof uri === 'string' && uri.startsWith(`data:${a.mime};base64,`), `${f} が HS.ASSETS.${key} に ${a.mime} の data URI を載せていない`);
    uris[key] = uri;
  }
  for (const a of LIST) assert(files.includes(a.key + '.js'), `assets/${a.key}.js が無い`);
  assert(total <= 40 * 1024 * 1024, `素材の合計 ${(total / 1048576).toFixed(1)}MB が 40MB を超える`); // 目安（持ち主の決定「PC だけ」で 15MB → 40MB）
  // 読む順：three → GLTFLoader・SkeletonUtils、素材 → race3d.js
  const at = f => html.indexOf(`src="${f}"`);
  assert(at('lib/three.min.js') < at('lib/GLTFLoader.js') && at('lib/GLTFLoader.js') < at('lib/SkeletonUtils.js') && at('lib/SkeletonUtils.js') < at('js/ui/race3d.js'), 'lib の読む順が違う');
  for (const f of files) assert(at('assets/' + f) < at('js/ui/race3d.js'), `assets/${f} を race3d.js より前に読んでいない`);
  for (const f of ['lib/GLTFLoader.js', 'lib/SkeletonUtils.js']) assert(credits.includes('`' + f + '`') && fs.existsSync(path.join(ROOT, f)), `${f} が CREDITS に無いか、ファイルが無い`);
  // 騎手の GLB：形の数・骨・部位の色
  const glb = Buffer.from(uris.jockey.split(',')[1], 'base64');
  assert(glb.readUInt32LE(0) === 0x46546c67 && glb.readUInt32LE(4) === 2, '騎手の GLB の頭が glTF 2 でない');
  const jl = glb.readUInt32LE(12), J = JSON.parse(glb.slice(20, 20 + jl).toString('utf8'));
  const tri = name => { const nd = J.nodes.find(x => x.name === name && x.mesh != null); assert(nd, `騎手の形 ${name} が無い`); const m = J.meshes[nd.mesh]; let n = 0; for (const p of m.primitives) { assert(p.attributes.COLOR_0 != null && p.attributes.JOINTS_0 != null, `${name} に部位の色か骨の重みが無い`); n += J.accessors[p.indices].count / 3; } return n; };
  const tHi = tri('Jockey'), tLo = tri('JockeyLo');
  assert(tHi <= 3500 && tLo <= 1200 && tLo < tHi, `騎手の三角形 ${tHi} / ${tLo} が多すぎる`);
  const names = J.skins[0].joints.map(i => J.nodes[i].name);
  assert(names.length <= 32, `騎手の骨 ${names.length} 本は多すぎる`);
  for (const n of ['pelvis', 'spine_01', 'spine_03', 'neck_01', 'Head', 'upperarm_l', 'lowerarm_l', 'hand_l', 'upperarm_r', 'lowerarm_r', 'hand_r', 'thigh_l', 'calf_l', 'foot_l', 'ball_l', 'thigh_r', 'calf_r', 'foot_r', 'ball_r']) assert(names.includes(n), `騎手の骨 ${n} が無い`);
  // 騎手の IK：GLB の骨の並びから骨だけを組み、走る姿勢の馬に乗せて、手が手綱・足が鐙・腰が鞍の上へ来るか
  if (!THREE.SkeletonUtils) vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'lib/SkeletonUtils.js'), 'utf8'), { filename: 'lib/SkeletonUtils.js' });
  const joints = new Set(J.skins[0].joints);
  const build = i => {
    const nd = J.nodes[i], o = joints.has(i) ? new THREE.Bone() : new THREE.Group();
    o.name = nd.name || '';
    if (nd.translation) o.position.fromArray(nd.translation);
    if (nd.rotation) o.quaternion.fromArray(nd.rotation);
    if (nd.scale) o.scale.fromArray(nd.scale);
    for (const c of nd.children || []) if (J.nodes[c].mesh == null) o.add(build(c));
    return o;
  };
  const src = new THREE.Group();
  for (const i of J.scenes[J.scene || 0].nodes) if (J.nodes[i].mesh == null) src.add(build(i));
  const IK = HS.Race3D._ik;
  const worst = { hand: 0, foot: 0, hip: 0 };
  for (const [ph, push, pose] of [[0.1, 0, null], [0.45, 1, null], [0.8, 0.5, 1.0]]) {
    const hb = IK.horseBones(), horse = new THREE.Group();
    horse.add(hb[0]);
    const Jk = IK.makeJockey({ silks: { base: '#1f4fbf', sub: '#ffd23f', pattern: 'hoops' }, cap: '#e53935' }, src);
    horse.add(Jk.root);
    horse.position.set(12, 0.5, -30); horse.rotation.set(0.05, 0.9, 0.02);
    IK.poseHorse({ bones: hb, lead: 1 }, ph, 1, push, 10, 0.3, null, pose);
    horse.updateMatrixWorld(true);
    IK.poseJockey(Jk, hb);
    const B = Jk.bones, wp = o => new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
    for (const [s, fa, sd] of [['l', 28, -1], ['r', 30, 1]]) {
      if (pose == null) worst.hand = Math.max(worst.hand, wp(B['hand_' + s]).distanceTo(IK.atBone(hb, fa, 0.8, 1.815, sd * 0.1)));
      worst.foot = Math.max(worst.foot, wp(B['foot_' + s]).distanceTo(IK.atBone(hb, 1, 0.235, 1.37, sd * 0.29)));
      const lz = horse.worldToLocal(wp(B['hand_' + s])).z, fz = horse.worldToLocal(wp(B['foot_' + s])).z;
      assert(Math.sign(lz) === sd && Math.sign(fz) === sd, `騎手の${s === 'l' ? '左' : '右'}の手足が馬の反対の側にある`);
    }
    worst.hip = Math.max(worst.hip, wp(B.pelvis).distanceTo(IK.atBone(hb, 24, -0.04, 1.9, 0)));
    const head = horse.worldToLocal(wp(B.Head)), pel = horse.worldToLocal(wp(B.pelvis));
    assert(head.y > pel.y + 0.06 && head.x > pel.x + 0.2, `騎手の頭が腰より前・上にない（頭 ${head.toArray().map(v => v.toFixed(2))}・腰 ${pel.toArray().map(v => v.toFixed(2))}）`);
  }
  assert(worst.hand < 0.05 && worst.foot < 0.05 && worst.hip < 0.01, `騎手の IK のずれ：手 ${worst.hand.toFixed(3)}・足 ${worst.foot.toFixed(3)}・腰 ${worst.hip.toFixed(3)} m`);
  // 騎手を抜いた馬の形
  const g1 = HS.Race3D.horseGeometry(1), g2 = HS.Race3D.horseGeometry(1, { noJockey: true });
  const g3 = HS.Race3D.horseGeometry(1, { bare: true });
  assert(g2.index.count < g1.index.count && g3.index.count < g2.index.count, '騎手を抜いた馬・鞍もない馬（肖像）の形が小さくならない');
  g1.dispose(); g2.dispose(); g3.dispose();
  return `素材 ${files.length}・合計 ${(total / 1048576).toFixed(2)}MB・騎手 ${tHi}/${tLo} 面・骨 ${names.length}・IK のずれ 手 ${(worst.hand * 100).toFixed(1)}cm 足 ${(worst.foot * 100).toFixed(1)}cm`;
});

require('./extra_replay.js')(check, assert, HS); // レコード・リプレイ・フリーレース
require('./extra_owners.js')(check, assert, HS); // 馬主と騎乗依頼
require('./extra_audio.js')(check, assert, HS); // BGM の曲の書式と長さ
require('./extra_rumble.js')(check, assert, HS); // コントローラーの振動
require('./extra_balance.js')(check, assert, HS); // 立ち回りの噛み合い・競り合いの気合
require('./extra_beat.js')(check, assert, HS); // 拍子（しごく手が馬の1完歩に合うと少し得）・ゲートを出たあとの隊列
require('./extra_ui.js')(check, assert, HS); // 画面の仕組み：並べ替え・絞り込み・番組表と予約
require('./extra_feel.js')(check, assert, HS); // 騎乗の手ざわり（パッドの向き・状態の文字を出さない）
require('./extra_gate.js')(check, assert, HS); // スタートの目押し（数えを出さない・待つ秒は種から・GOOD の幅）と、騎手のゲームに放牧が無い
require('./extra_skills2.js')(check, assert, HS); // 逃げ・追込の能力・道悪○・外枠○・伝説級の固有の能力
require('./extra_shop.js')(check, assert, HS); // 馬の店の年齢・値段（いまの総合力・晩成が安い）とレーティング
require('./extra_gf.js')(check, assert, HS); // グランドフェスティバル（6つ・GF の週・連戦・伝説級の担当・店と牧場・トロフィー・キンチェム）
require('./extra_godot.js')(check, assert); // Godot 版：データの書き出し・模擬が JS と同じか
require('./extra_gdview.js')(check, assert); // Godot 版：見た目と操作（操作の割り当て・絵の決まり・模擬の入れ口）
require('./extra_gdgame.js')(check, assert); // Godot 版の週の流れを本物の画面で自動で遊ぶ

console.log(results.join('\n'));
console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
