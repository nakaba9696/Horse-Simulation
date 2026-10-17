// 検証：騎乗の手ざわり（docs/FEEL.md）。コントローラーの向きの読み取りと、騎乗中に状態の文字・画面の箱の揺れを出さないこと
module.exports = function (check, assert, HS) {
  const vm = require('vm'), fs = require('fs'), path = require('path');
  const file = path.join(__dirname, '..', 'js/ui/ride.js');
  check('feel: パッドの十字は標準の並び・左スティック・hat の軸（axes[9]）・axes[6]/[7] のどれでも上下左右になる', () => {
    vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: 'js/ui/ride.js' });
    const R = HS.Ride;
    const pad = (axes, mapping, btn, id) => ({ id: id || 'x', index: 0, mapping: mapping || '', axes, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: (btn || []).includes(i), value: (btn || []).includes(i) ? 1 : 0 })) });
    const on = d => Object.keys(d).filter(k => d[k]).join(',');
    // 標準の並び
    assert(on(R.padDirs(pad([0, 0, 0, 0], 'standard', [14]))) === 'left', '十字の左（14）');
    assert(on(R.padDirs(pad([0, 0, 0, 0], 'standard', [15]))) === 'right', '十字の右（15）');
    assert(on(R.padDirs(pad([0, 0, 0, 0], 'standard', [12]))) === 'up', '十字の上（12）');
    assert(on(R.padDirs(pad([0.9, 0, 0, 0], 'standard'))) === 'right', '左スティックの右');
    assert(on(R.padDirs(pad([0, -0.8, 0, 0], 'standard'))) === 'up', '左スティックの上');
    // 標準でない並び：hat（離すと 1.2857。離した値を一度見てから読む）
    const hat = v => { const a = new Array(10).fill(0); a[9] = v; return a; };
    assert(on(R.padDirs(pad(hat(0.14), '', [], 'h1'))) === '', '離した値を見る前の hat を読んだ（ふつうの軸を十字と取り違える）');
    R.padDirs(pad(hat(1.2857), '', [], 'h1'));
    const want = [[-1, 'up'], [-0.714, 'up,right'], [-0.428, 'right'], [-0.142, 'down,right'], [0.142, 'down'], [0.428, 'down,left'], [0.714, 'left'], [1, 'up,left'], [1.2857, '']];
    for (const [v, w] of want) { const got = on(R.padDirs(pad(hat(v), '', [], 'h1'))); assert(got.split(',').sort().join() === w.split(',').sort().join(), `hat ${v} → ${got}（${w} のはず）`); }
    // 標準でない並び：axes[6]・[7]
    const a8 = [0, 0, 0, 0, 0, 0, 1, 0];
    assert(on(R.padDirs(pad(a8))) === 'right', 'axes[6] の右');
    assert(on(R.padDirs(pad([0, 0, 0, 0, 0, 0, 0, -1]))) === 'up', 'axes[7] の上');
    // 標準の並びでは axes[6]・[7] を読まない（引き金などのことがある）
    assert(on(R.padDirs(pad([0, 0, 0, 0, 0, 0, 1, 0], 'standard'))) === '', '標準の並びで axes[6] を十字と読んだ');
    return 'hat 8方向・標準・スティック・axes[6]/[7]';
  });
  check('feel: 騎乗中に日本語の状態の文字を出さず、ムチで画面の箱ごと揺らさない（計器・光・音・振動で返す）', () => {
    const src = fs.readFileSync(file, 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\/\/.*$/, '')).join('\n');
    const words = ['前が壁', '掛かっている', '折り合っている', '追い出した', 'ためている', 'バテた', '外を回っている', '発動！', '発動してしまった', '発走まで'];
    const hit = words.filter(w => src.includes(`'${w}`) || src.includes(`\`${w}`));
    assert(!hit.length, '状態の文字が残っている：' + hit.join('・'));
    assert(!/stage?\.style\.transform\s*=/.test(src) && !/stg\.style\.transform/.test(src), '画面の箱（DOM）を揺らしている');
    return '状態の文字 0・DOM の揺れ 0';
  });
};
