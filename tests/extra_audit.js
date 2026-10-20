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
  check('audit: 地方の名馬は芝だけの馬にならない・スペシャルホースの米国の古い名馬は芝だけの馬にならない', () => {
    const local = D.historic.filter(d => d.local && (d.surface || '芝') === '芝' && d.dirt == null);
    assert(!local.length, `地方の馬なのに芝だけ：${local.map(d => d.name).join('・')}`);
    const us = SP.list().map(x => x.d).filter(d => ['米', '加'].includes(d.country) && (d.surface || '芝') === '芝');
    assert(!us.length, `米国の古い名馬なのに芝だけ：${us.map(d => d.name).join('・')}`);
    // 当てた直し：南関東の三冠馬サンオーイはダートが芝より上
    const f = T.fhPeak(H.fromHistoric(SP.data('サンオーイ'), 'x'));
    assert(f.dirt > f.turf, `サンオーイのダート ${f.dirt} が芝 ${f.turf} 以下`);
  });
};
