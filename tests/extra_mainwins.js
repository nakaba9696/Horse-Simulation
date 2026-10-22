// 検証：名鑑の無い海外の馬の史実の主な勝鞍（data/main_wins_world.js。持ち主の指示 2026-10-21・2026-10-22）
// 決まり：「勝った年 半角スペース レース名」。G1 は全部（多い馬は8件まで）、G1 が少ない馬は G2 を足して6件まで。
// g1 は表示の件数ではなく生涯の G1 の勝ち数（勝った年の格で数える）。Codex のレビューの対応：docs/review/codex/MAIN_WINS_REVIEW.md
const fs = require('fs');
const path = require('path');
module.exports = function (check, assert, HS) {
  const D = HS.DATA;
  const M = D.mainWinsWorld || {};
  const by = new Map();
  for (const h of D.historic) if (!by.has(h.name)) by.set(h.name, h);
  const list = (bad) => bad.slice(0, 6).join('・') + (bad.length > 6 ? ` ほか${bad.length - 6}件` : '');

  check('mainwins: 史実の主な勝鞍は「年 レース名」で日本語と英語の数がそろい、名鑑のある馬は名鑑が正のまま', () => {
    const bad = Object.entries(M).filter(([, w]) => !w.ja.length || w.ja.length !== w.en.length || !w.ja.every(x => /^\d{4} \S/.test(x)) || !w.en.every(x => /^\d{4} \S/.test(x)));
    assert(!bad.length, '形の違う馬：' + list(bad.map(x => x[0])));
    const prof = new Map(D.profiles.map(p => [p.name, p]));
    const over = Object.keys(M).filter(n => prof.has(n) && by.has(n) && prof.get(n).mainWins && JSON.stringify(by.get(n).mainWins) !== JSON.stringify(prof.get(n).mainWins));
    assert(!over.length, '名鑑の勝鞍を上書きした：' + over.join('・'));
    const used = Object.keys(M).filter(n => by.has(n) && by.get(n).mainWinsEn).length;
    return `${Object.keys(M).length}頭（ゲームに出る ${used}頭）`;
  });

  check('mainwins: 勝った年は生年+2 以降・2026年まで、日本語と英語で同じ年・同じ並び、同じ勝鞍の重複なし', () => {
    const bad = [];
    for (const [n, w] of Object.entries(M)) {
      const h = by.get(n);
      if (!h) { bad.push(n + '（史実馬にいない）'); continue; }
      w.ja.forEach((s, i) => {
        const y = +s.slice(0, 4);
        if (w.en[i].slice(0, 4) !== s.slice(0, 4)) bad.push(`${n} ${s}（英語と年が違う）`);
        if (y < h.born + 2 || y > 2026) bad.push(`${n} ${s}（生年 ${h.born}）`);
      });
      if (new Set(w.en).size !== w.en.length || new Set(w.ja).size !== w.ja.length) bad.push(n + '（同じ勝鞍が2回）');
    }
    assert(!bad.length, list(bad));
    return '年の範囲・日英の一致 OK';
  });

  check('mainwins: 件数の上限（8件まで・G1 が少ない馬は6件まで）と、g1（生涯の G1 勝ち数）が表示と矛盾しない', () => {
    const bad = [];
    for (const [n, w] of Object.entries(M)) {
      const L = w.ja.length;
      if (!Number.isInteger(w.g1) || w.g1 < 0) { bad.push(`${n}（g1 が整数でない）`); continue; }
      if (L > 8) bad.push(`${n}（${L}件。8件まで）`);
      // 7件・8件は G1 だけで埋まる（G2 を足すのは6件まで）ので、g1 は件数以上
      if (L > 6 && w.g1 < L) bad.push(`${n}（${L}件なのに g1=${w.g1}）`);
      // G1 は全部（8件まで）載せる
      if (L < Math.min(w.g1, 8)) bad.push(`${n}（g1=${w.g1} なのに ${L}件）`);
    }
    assert(!bad.length, list(bad));
    return 'OK';
  });

  check('mainwins: 着順の混入・表示用の略記・スポンサー名・香港の誤訳が無い', () => {
    const bad = [];
    const EN_BAD = /\b(2nd|3rd|4th|second|third|placed)\b|&nbsp;|&amp;|\(Hong Kong\)|\((ATC|VRC|Perth racing|United States|Argentina)\)|K\.George|Q\. Elizabeth|\bG\. P\.|Juddmonte|Investec|\bLKS\b|^\d{4} Breeders' Cup$/;
    for (const [n, w] of Object.entries(M)) {
      w.en.forEach((s, i) => {
        if (EN_BAD.test(s)) bad.push(`${n} ${s}`);
        // 香港の Queen Elizabeth II Cup は「クイーンエリザベス2世カップ」（JRA のエリザベス女王杯とは別のレース）
        if (/Queen Elizabeth II Cup/.test(s) && w.ja[i].slice(5) !== 'クイーンエリザベス2世カップ') bad.push(`${n} ${w.ja[i]}`);
      });
      for (const s of w.ja) if (/エリザベス女王杯|着|\(|（/.test(s)) bad.push(`${n} ${s}`);
    }
    assert(!bad.length, list(bad));
    return 'OK';
  });

  check('mainwins: 勝ち馬の記録（data/src の勝ち馬・着順）と食い違わない（ほかの馬が勝ったレース・2着以下のレースが無い）', () => {
    // 日本と海外で同じ名前の別のレース（例：米国の Fantasy Stakes と JRA のファンタジーステークス）は除く
    const SAME_NAME = new Set(['ファンタジーステークス', 'ホープフルステークス']);
    const winners = new Map();
    for (const h of D.historic) for (const s of h.wins || []) (winners.get(s) || winners.set(s, new Set()).get(s)).add(h.name);
    const src = path.join(__dirname, '..', 'data', 'src', 'placings_world.jsonl');
    const placed = new Map();
    for (const l of fs.readFileSync(src, 'utf8').split('\n')) {
      if (!l.trim()) continue;
      const p = JSON.parse(l);
      if (!p.horse) continue;
      const k = p.year + p.race + '|' + p.horse;
      if (!placed.has(k) || p.pos < placed.get(k)) placed.set(k, p.pos);
    }
    // 降着で繰り上がった勝ち（記録の着順は入線順）
    const PROMOTED = new Set(['2015英セントレジャー|シンプルヴァーズ', '2025仏1000ギニー|ザリガナ']);
    const bad = [];
    for (const [n, w] of Object.entries(M)) for (const s of w.ja) {
      const k = s.replace(' ', '');
      if (SAME_NAME.has(s.slice(5))) continue;
      const v = winners.get(k);
      if (v && !v.has(n)) bad.push(`${n} ${s}（勝ち馬は${[...v].join('・')}）`);
      const pos = placed.get(k + '|' + n);
      if (pos > 1 && !PROMOTED.has(k + '|' + n)) bad.push(`${n} ${s}（${pos}着）`);
    }
    assert(!bad.length, list(bad));
    return 'OK';
  });

  check('mainwins: 一覧 docs/review/main_wins.csv が元データと同じ（tools/build_main_wins_csv.js）', () => {
    const T = require('../tools/build_main_wins_csv.js');
    const text = fs.readFileSync(T.OUT, 'utf8');
    assert(text === T.build(HS), 'main_wins.csv が元データと合わない（node tools/build_main_wins_csv.js で作り直す）');
    return 'OK';
  });

  check('mainwins: 大きなレース（三冠・クラシック・メルボルンカップなど）の勝ちが、勝ち馬の記録にあるのに主な勝鞍から抜けていない', () => {
    const BIG = ['ケンタッキーダービー', 'プリークネスステークス', 'ベルモントステークス', '英2000ギニー', '英1000ギニー', '英ダービー', '英オークス', '仏ダービー', '仏オークス', '愛ダービー', 'ドイツダービー', '香港ダービー', 'メルボルンカップ', 'コックスプレート', '凱旋門賞', 'キングジョージ6世＆クイーンエリザベスステークス', 'ブリーダーズカップクラシック', 'ドバイワールドカップ', 'ジャパンカップ'];
    const bad = [];
    for (const [n, w] of Object.entries(M)) {
      const h = by.get(n);
      if (!h || w.ja.length >= 8) continue;
      const have = new Set(w.ja.map(s => s.replace(' ', '')));
      for (const s of h.wins || []) if (BIG.includes(s.slice(4)) && !have.has(s)) bad.push(`${n} ${s}`);
    }
    assert(!bad.length, list(bad));
    return 'OK';
  });
};
