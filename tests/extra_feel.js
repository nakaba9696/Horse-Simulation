// 検証：騎乗の手ざわり（docs/FEEL.md）。コントローラーの向きの読み取りと、騎乗中に状態の文字・画面の箱の揺れを出さないこと
module.exports = function (check, assert, HS) {
  const vm = require('vm'), fs = require('fs'), path = require('path');
  const file = path.join(__dirname, '..', 'js/ui/ride.js');
  // JS 版にしかない確かめ「feel: パッドの十字…」は外した（持ち主の決定 2026-10-22「不要なら消していい」。JS 版はもう作らない）
  check('feel: 騎乗中に日本語の状態の文字を出さず、ムチで画面の箱ごと揺らさない（計器・光・音・振動で返す）', () => {
    const src = fs.readFileSync(file, 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\/\/.*$/, '')).join('\n');
    const words = ['前が壁', '掛かっている', '折り合っている', '追い出した', 'ためている', 'バテた', '外を回っている', '発動！', '発動してしまった', '発走まで'];
    const hit = words.filter(w => src.includes(`'${w}`) || src.includes(`\`${w}`));
    assert(!hit.length, '状態の文字が残っている：' + hit.join('・'));
    assert(!/stage?\.style\.transform\s*=/.test(src) && !/stg\.style\.transform/.test(src), '画面の箱（DOM）を揺らしている');
    return '状態の文字 0・DOM の揺れ 0';
  });
};
