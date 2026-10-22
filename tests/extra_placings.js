// 検証：G1 の上位着順（data/src/placings_jra.jsonl・placings_world.jsonl と docs/review/placings.csv）
// Codex のレビュー（docs/review/codex/PLACINGS_REVIEW.md）の直し（docs/review/PLACINGS_FIXES.md）が戻らないように見張る
const fs = require('fs'), path = require('path');
module.exports = function (check, assert, HS) {
  const D = HS.DATA;
  const T = require('../tools/build_placings_csv.js');
  const J = T.readJsonl(T.SRC_JRA), W = T.readJsonl(T.SRC_WORLD);
  const ALL = [...J.map(x => ({ ...x, kind: 'jra' })), ...W.map(x => ({ ...x, kind: 'world' }))];
  const groups = new Map();
  for (const x of ALL) { const k = x.kind + '|' + x.race + '|' + x.year; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(x); }

  check('placings: 一覧（placings.csv）が元データから作り直したものと同じ・行が元データと1対1', () => {
    const text = fs.readFileSync(T.OUT, 'utf8');
    assert(text === T.build(J, W), 'placings.csv が元データと合わない（node tools/build_placings_csv.js で作り直す）');
    const rows = T.parseCsv(text).slice(1);
    assert(rows.length === ALL.length, `行の数が違う：CSV ${rows.length}・元データ ${ALL.length}`);
    const key = (r, y, p, h) => [r, y, p, h].join('|');
    const want = new Map();
    for (const x of ALL) { const k = key(x.race, x.year, x.pos, x.kind === 'jra' ? x.horse : x.horseEn); want.set(k, (want.get(k) || 0) + 1); }
    for (const r of rows) { const k = key(r[1], r[2], r[3], r[0] === '海外' ? r[5] : r[4]); assert(want.get(k) > 0, 'CSV だけにある行：' + k); want.set(k, want.get(k) - 1); }
    return `${rows.length}行（JRA・地方 ${J.length}・海外 ${W.length}）`;
  });

  check('placings: 馬の識別（ゲームにいる馬はカナ名と生年で正しく紐づき、同名の別世代の馬には紐づかない）', () => {
    const by = new Map(D.historic.map(h => [h.name, h]));
    const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '');
    // ゲームの側の生年が見積もりで外れている馬（いまは無し。メタルベンダーは元の記録の年齢を出典に合わせて 2005年生に直した 2026-10-22）
    const GAME_BORN_EST = new Set([]);
    const bad = [];
    for (const x of ALL) {
      if (!x.inData) continue;
      const h = by.get(x.horse);
      if (!h) { bad.push(`${x.race}${x.year} ${x.pos}着 ${x.horse}：ゲームにいない`); continue; }
      const age = x.year - h.born;
      if ((age < 2 || age > 12) && !GAME_BORN_EST.has(`${x.horse}|${x.race}|${x.year}`)) bad.push(`${x.race}${x.year} ${x.pos}着 ${x.horse}：ゲームの馬は${h.born}年生（${age}歳）`);
      if (x.kind === 'world' && h.nameEn && norm(h.nameEn) !== norm(x.horseEn)) bad.push(`${x.race}${x.year} ${x.horseEn}：ゲームの ${x.horse} は ${h.nameEn}`);
      if (x.kind === 'jra' && x.nameSrc && h.nameEn && norm(h.nameEn) !== norm(x.nameSrc)) bad.push(`${x.race}${x.year} ${x.nameSrc}：ゲームの ${x.horse} は ${h.nameEn}`);
    }
    // 同名の別馬は紐づけない（Codex の確定指摘の9行）
    for (const [r, y, p, n] of [['ジャパンカップダート', 2009, 3, 'ゴールデンチケット'], ['ジャパンダートダービー', 2009, 3, 'ゴールデンチケット'], ['東京大賞典', 2009, 5, 'ゴールデンチケット'], ['川崎記念', 2010, 4, 'ゴールデンチケット'],
      ['全日本2歳優駿', 2008, 2, 'ナサニエル'], ['朝日杯フューチュリティステークス', 2018, 5, 'ディープダイバー'], ['マイルチャンピオンシップ南部杯', 2022, 2, 'ヘリオス'], ['JBCスプリント', 2022, 3, 'ヘリオス']]) {
      const x = J.find(z => z.race === r && z.year === y && z.pos === p && z.horse === n);
      assert(x && !x.inData, `${r}${y} ${n} が同名の別馬に紐づいている`);
    }
    const hm = J.find(z => z.race === 'ジャパンカップ' && z.year === 1992 && z.pos === 5);
    assert(hm && hm.horse === 'ヒシマサル（1989）' && hm.inData, 'ジャパンカップ1992の5着はヒシマサル（1989）');
    // カナの無い外国馬（英字のまま）は残っていない
    const latin = J.filter(x => /^[A-Za-z]/.test(x.horse));
    assert(!latin.length, 'カナの無い馬：' + latin.map(x => x.race + x.year + ' ' + x.horse).join('・'));
    // 英字名に脚注・性別・着順の説明が混ざらない
    const junk = W.filter(x => /[*ƒ†‡]|\((winner|place|show|aust|ire|gb|usa|fr)\)/i.test(x.horseEn));
    assert(!junk.length, '英字名の混ざり物：' + junk.map(x => x.race + x.year + ' ' + x.horseEn).join('・'));
    assert(!bad.length, bad.slice(0, 8).join('\n       '));
    return `ゲームにいる ${ALL.filter(x => x.inData).length}行`;
  });

  check('placings: 着順の並び・同着・重複（同着の組は同じ着順で次の着順を飛ばし、着差もそろう）', () => {
    const bad = [];
    for (const [k, g] of groups) {
      const ps = g.map(x => x.pos).sort((a, b) => a - b);
      if (ps[0] !== 1) bad.push(k + '：1着が無い');
      const cnt = {}; ps.forEach(p => cnt[p] = (cnt[p] || 0) + 1);
      const ids = g.map(x => (x.kind === 'world' ? x.horseEn : x.horse).toLowerCase());
      if (new Set(ids).size !== ids.length) bad.push(k + '：同じ馬が2度');
      // 同着：海外は dh の印、JRA・地方は前の着順と同じ着順
      for (const x of g) { const dh = cnt[x.pos] > 1; if (x.kind === 'world' && !!x.dh !== dh) bad.push(`${k} ${x.pos}着 ${x.horseEn}：同着の印が合わない`); }
      // 同着の後は、同着の頭数だけ着順を飛ばす（ただし出典が上位だけで途中を載せない年は、飛びがあってもよい）
      let p = 1; for (const q of Object.keys(cnt).map(Number).sort((a, b) => a - b)) { if (q < p) bad.push(`${k}：${q}着の同着の後の着順が合わない`); p = q + cnt[q]; }
      // 同着の組の着差（勝ち馬との差・前の着順の馬との差）はそろう
      for (const q of Object.keys(cnt).map(Number)) { if (cnt[q] < 2) continue; const ms = new Set(g.filter(x => x.pos === q).map(x => x.margin || '')); if (ms.size > 1) bad.push(`${k} ${q}着の同着の着差が違う：${[...ms].join('・')}`); }
    }
    assert(!bad.length, bad.slice(0, 10).join('\n       '));
    // 正しい同着（JBIS と JRA の結果で確かめた）は残す
    const n = (r, y, p) => J.filter(x => x.race === r && x.year === y && x.pos === p).length;
    assert(n('有馬記念', 2020, 5) === 2 && n('ジャパンカップ', 1996, 3) === 2, '有馬記念2020の5着・ジャパンカップ1996の3着の同着が消えた');
    const bel = W.filter(x => x.race === 'ベルモントステークス' && x.year === 2023 && x.pos === 4);
    assert(bel.length === 2 && bel.every(x => x.margin === '¾' && x.dh), 'ベルモントS2023の4着同着は2頭とも¾');
    return `${groups.size}レース×年`;
  });

  check('placings: 着差と着差の基準（JRA・地方は勝ち馬との差・降着の6レースは空、海外は前の馬との差・香港だけ勝ち馬との差・表記が読める）', () => {
    const bad = [];
    const DEMOTE = [['秋華賞', 2009], ['スプリンターズステークス', 2010], ['ジャパンカップ', 2010], ['皐月賞', 2016], ['NHKマイルカップ', 2019], ['高松宮記念', 2020]];
    for (const [r, y] of DEMOTE) {
      const g = J.filter(x => x.race === r && x.year === y && x.pos >= 2);
      if (g.length < 4 || g.some(x => x.margin != null || !/降着/.test(x.note || ''))) bad.push(`${r}${y}：降着のレースの2着以下の着差は空で注がある`);
    }
    const demote = new Set(DEMOTE.map(a => a.join('|')));
    // JBIS の「*****」（着差の出ない馬）より後ろは、勝ち馬との差を積み上げられないので空
    const star = new Set(J.filter(x => /\*/.test(x.marginPrev || '')).map(x => x.race + '|' + x.year + '|' + x.pos));
    const afterStar = x => [...star].some(k => { const [r, y, p] = k.split('|'); return r === x.race && +y === x.year && +p <= x.pos; });
    for (const x of J) {
      if (x.pos === 1 ? x.margin != null : (x.margin == null && !demote.has(x.race + '|' + x.year) && !afterStar(x))) bad.push(`${x.race}${x.year} ${x.pos}着 ${x.horse}：着差 ${x.margin}`);
    }
    const TOK = /^(\d+(\s?[½¼¾]|\s\d\/\d|-\d\/\d)?|[½¼¾]|\d\/\d|\d*\.\d+|ns|nse|nose|shd|sh|s\.h|short head|snk|s\.nk|short neck|hd|head|nk|neck|N|SH|HD|sH|Head|Neck|Nose|NOSE|dist)$/;
    for (const x of W) {
      if (x.pos === 1 && !x.dh && x.margin) bad.push(`${x.race}${x.year} 1着に着差 ${x.margin}`);
      if (!x.margin) { if (x.marginTo) bad.push(`${x.race}${x.year} ${x.pos}着：着差が無いのに基準がある`); continue; }
      if (!['prev', 'winner'].includes(x.marginTo)) bad.push(`${x.race}${x.year} ${x.pos}着：基準 ${x.marginTo}`);
      if (x.marginTo === 'winner' && !/hkjc/.test(x.src)) bad.push(`${x.race}${x.year} ${x.pos}着：勝ち馬との差は香港（HKJC）だけ`);
      if (!TOK.test(x.margin)) bad.push(`${x.race}${x.year} ${x.pos}着：読めない着差「${x.margin}」`);
    }
    // 米国の en.wikipedia の表は「前の馬との差」に直してある（勝ち馬との差の累計を並べたままにしない）
    const usSrc = W.filter(x => /wikipedia/.test(x.src) && ['ケンタッキーダービー', 'プリークネスステークス', 'ベルモントステークス', 'ブリーダーズカップクラシック'].includes(x.race));
    const num = m => { const t = { ns: 0.05, nose: 0.05, Nose: 0.05, shd: 0.1, hd: 0.2, head: 0.2, Head: 0.2, nk: 0.3, neck: 0.3, Neck: 0.3 }[m]; if (t != null) return t; const f = { '½': 0.5, '¼': 0.25, '¾': 0.75 }; const a = String(m).match(/^(\d+)?([½¼¾])?$/); return a ? (+(a[1] || 0) + (a[2] ? f[a[2]] : 0)) : NaN; };
    const usG = new Map(); for (const x of usSrc) { const k = x.race + x.year; if (!usG.has(k)) usG.set(k, []); usG.get(k).push(x); }
    for (const [k, g] of usG) { const v = g.filter(x => x.pos >= 2 && x.margin).map(x => num(x.margin)); if (v.length >= 4 && v.every((a, i) => i === 0 || a > v[i - 1]) && v[v.length - 1] >= 8) bad.push(`${k}：着差がふえ続ける（勝ち馬との差のまま？）${g.map(x => x.margin).join(' ')}`); if (g.some(x => x.pos >= 2 && x.margin === '0')) bad.push(k + '：2着の着差が0'); }
    // Codex の確定指摘の着差
    const M = { 'ブリーダーズカップクラシック|2018': ['1', '¾', 'ns', '2¼'], 'ブリーダーズカップクラシック|2019': ['4¼', '4¼', '2¼', '4¼'], 'ブリーダーズカップクラシック|2020': ['2¼', '1', '2', 'ns'], 'ブリーダーズカップクラシック|2021': ['2¾', '¾', '1', '5¾'], 'ブリーダーズカップクラシック|2022': ['8¼', '½', '2½', '1¼'],
      'プリークネスステークス|2015': ['7', '1', '7½', '1¾'], 'ベルモントステークス|2022': ['3', '3¼', '¾', '5'] };
    for (const [k, want] of Object.entries(M)) { const [r, y] = k.split('|'); const got = W.filter(x => x.race === r && x.year === +y && x.pos >= 2).sort((a, b) => a.pos - b.pos).map(x => x.margin); if (got.join(' ') !== want.join(' ')) bad.push(`${k}：${got.join(' ')}（正しくは ${want.join(' ')}）`); }
    for (const [r, y, m] of [['プリークネスステークス', 1989, 'ns'], ['プリークネスステークス', 1998, '2¼'], ['プリークネスステークス', 2012, 'nk']]) { const x = W.find(z => z.race === r && z.year === y && z.pos === 2); if (!x || x.margin !== m) bad.push(`${r}${y} 2着の着差は ${m}`); }
    assert(!bad.length, bad.slice(0, 10).join('\n       '));
  });

  check('placings: 収録のレースと日付（G1 の年だけ・2026年は10月18日の秋華賞まで・別の競走や未施行の結果が無い）', () => {
    const races = [...D.races, ...(D.histRaces || [])];
    const bad = [];
    for (const [k, g] of groups) {
      const x = g[0]; const c = races.filter(r => r.name === x.race && r.from <= x.year && x.year <= (r.to || 9999));
      if (!c.some(r => r.grade === 'G1')) { bad.push(`${x.race}${x.year}：その年の G1 が暦に無い`); continue; }
      if (x.year > 2026 || x.year < 1989) bad.push(`${x.race}${x.year}：年の範囲の外`);
      if (x.year === 2026) {
        const r = c[0]; if (r.month * 10 + r.week > 103) bad.push(`${x.race}2026：暦では${r.month}月${r.week}週（10月18日より後）`);
        for (const y of g) { const m = y.src.match(/(\d{4})-?(\d{2})-?(\d{2})/); if (m && /jbis|sportinglife/.test(y.src) && +(m[1] + m[2] + m[3]) > 20261018) bad.push(`${x.race}2026：出典の日付 ${m[0]}`); }
      }
    }
    // 別の競走の結果が入っていた所（Codex の確定指摘・同じ原因の所）
    assert(!W.some(x => x.race === 'ブリーダーズカップフィリー＆メアターフ' && x.year === 2026), '2026年の BC フィリー＆メアターフ（未施行）がある');
    const saudi = W.filter(x => x.race === 'サウジカップ' && x.year === 2020).sort((a, b) => a.pos - b.pos).map(x => x.horseEn).join('・');
    assert(saudi === 'Midnight Bisou・Benbatl・Mucho Gusto・Tacitus・Gold Dream', 'サウジカップ2020は裁決後の着順：' + saudi);
    for (const [r, y, h4] of [['ドバイターフ', 2023, "Shirl's Speight"], ['ドバイデューティフリー', 2005, 'Alkaadhem'], ['フォレ賞', 2007, 'US Ranger'], ['コックスプレート', 2018, 'Avilius'], ['ドイツダービー', 2011, 'Mawingo']]) {
      const x = W.find(z => z.race === r && z.year === y && z.pos === 4); if (!x || x.horseEn !== h4) bad.push(`${r}${y} 4着は ${h4}`);
    }
    assert(!bad.length, bad.slice(0, 10).join('\n       '));
    return `${groups.size}レース×年`;
  });
};
