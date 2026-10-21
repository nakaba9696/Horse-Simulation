// スペシャルホースの総点検（tools/special_audit.js）と、持ち主が採った値（data/horse_fix.js）の検証
module.exports = function (check, assert, HS) {
  const D = HS.DATA, SP = HS.Special, H = HS.Horse, T = HS.Season;
  check('audit: 採った値（data/horse_fix.js）は、ある馬の遊びの値だけで、読み込んだデータに入っている', () => {
    const all = new Map(D.historic.concat(D.legendsExtra || []).map(d => [d.name, d]));
    for (const [n, f] of Object.entries(D.horseFix || {})) {
      const d = all.get(n);
      assert(d, `data/horse_fix.js の ${n} がデータに無い`);
      for (const k of Object.keys(f)) assert(HS.FIX_KEYS.includes(k) || k === 'why', `${n} の ${k} は書けない値（史実は変えない）`);
      for (const k of HS.FIX_KEYS) if (f[k] != null && k !== 'pot') assert(JSON.stringify(d[k]) === JSON.stringify(f[k]), `${n} の ${k} がデータに入っていない`);
      if (f.pot) for (const [k, v] of Object.entries(f.pot)) assert(d.pot && d.pot[k] === v, `${n} の pot.${k} がデータに入っていない`);
    }
  });
  check('audit: 史実馬の能力は運で揺れない・芝とダートは実績で決まる・持ち主が1回目の見直しで決めた総合力とメモ（持ち主の決定 2026-10-20）', () => {
    const K = HS.Skills;
    // 運なし：rating・馬場・距離・脚質が同じなら、名前が違っても能力は同じ
    const base = { born: 2000, sex: '牡', rating: 90, surface: '芝', distMin: 1800, distMax: 2400, style: '先行', wins: [] };
    const a = H.fromHistoric(Object.assign({ name: 'テストA' }, base), 'a'), b = H.fromHistoric(Object.assign({ name: 'テストB' }, base), 'b');
    assert(JSON.stringify(a.pot) === JSON.stringify(b.pot) && a.health === b.health && a.kire === b.kire && a.skills.join() === b.skills.join(), '名前で能力が変わる（運が残っている）');
    assert(a.pot.spd === 90 && a.pot.sta === 93 && a.apt.turf === 100 && a.apt.dirt === H.SURF_APT.none, `能力の決まりが違う ${JSON.stringify(a.pot)} ${JSON.stringify(a.apt)}`);
    // 走って勝っていない馬場は能力で −15 くらい（総合力で 14〜17 下）
    const f = T.fhPeak(a); assert(f.turf - f.dirt >= 13 && f.turf - f.dirt <= 18, `走っていない馬場の差 ${f.turf - f.dirt}`);
    // 芝ダの馬は勝ち鞍の格で：芝の G1 だけ勝った芝ダの馬は芝が上
    const sd = H.surfaceApt({ surface: '芝ダ', wins: ['2005天皇賞（秋）'] }); assert(sd.turf === 100 && sd.dirt === 90, `芝ダの向き ${JSON.stringify(sd)}`);
    // 持ち主の1回目の決定（tools/special_audit_owner.js）：得意な馬場の総合力がその値
    const OWNER = require('../tools/special_audit_owner.js').OWNER;
    const off = [];
    const quiz = n => /比較クイズ/.test(((HS.DATA.horseFix || {})[n] || {}).why || ''); // 比較クイズ（持ち主 2026-10-21）で直した馬は、そちらが新しい決定
    for (const o of OWNER) { if (o.target == null || quiz(o.name)) continue; const d = SP.data(o.name) || D.historic.find(x => x.name === o.name); const p = T.fhPeak(H.fromHistoric(d, 'x')); if (Math.max(p.turf, p.dirt) !== o.target) off.push(`${o.name} ${o.target}→${Math.max(p.turf, p.dirt)}`); }
    assert(!off.length, '持ち主の決めた総合力と違う：' + off.join('・'));
    const hk = H.fromHistoric(SP.data('キンチェム'), 'x'), ks = K.of(hk);
    assert(ks[0] === K.UNIQUE_OF['キンチェム'].id && ks.includes('dokonjo') && ks.includes('oriai'), `キンチェムの発動する特殊能力 ${ks.join()}`);
    assert(H.fromHistoric(SP.data('セントサイモン'), 'x').skills.includes('kakari'), 'セントサイモンに気性難（掛かり癖）が無い');
    assert(H.fromHistoric(SP.data('パーソナルエンスン'), 'x').health === 60, 'パーソナルエンスンの健康');
    // リボー 80 ＞ アレッジド 79、オーモンド 79 ＞ バーラム 78
    const fh = n => { const p = T.fhPeak(H.fromHistoric(SP.data(n), 'x')); return Math.max(p.turf, p.dirt); };
    assert(fh('リボー') > fh('アレッジド') && fh('オーモンド') > fh('バーラム'), '持ち主のメモの順');
  });
  check('audit: 地方の名馬は芝だけの馬にならない・スペシャルホースの米国の古い名馬は芝だけの馬にならない', () => {
    const local = D.historic.filter(d => d.local && (d.surface || '芝') === '芝' && d.dirt == null);
    assert(!local.length, `地方の馬なのに芝だけ：${local.map(d => d.name).join('・')}`);
    // ただし勝ち鞍が全部芝の大レースの馬（BCターフのマニラ・シアトリカル。米国の最優秀芝牡馬）は芝の馬でよい
    const turfOnly = d => { const ws = H.winRaces(d); return ws.length > 0 && ws.every(r => r.surface === '芝'); };
    const us = SP.list().map(x => x.d).filter(d => ['米', '加'].includes(d.country) && (d.surface || '芝') === '芝' && !turfOnly(d));
    assert(!us.length, `米国の古い名馬なのに芝だけ：${us.map(d => d.name).join('・')}`);
    // 当てた直し：南関東の三冠馬サンオーイはダートが芝より上
    const f = T.fhPeak(H.fromHistoric(SP.data('サンオーイ'), 'x'));
    assert(f.dirt > f.turf, `サンオーイのダート ${f.dirt} が芝 ${f.turf} 以下`);
  });
};
