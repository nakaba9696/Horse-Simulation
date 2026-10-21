// 画面の言語（日本語と英語。持ち主の決定 2026-10-21。docs/I18N.md）：Godot 版の画面の文の英語の表に抜けが無いか（node だけで見る。画面を組んで見る確かめは godot/tests/test_i18n.gd）
const fs = require('fs');
const path = require('path');
module.exports = function (check, assert) {
  const ROOT = path.join(__dirname, '..');
  const K = require('../tools/i18n_keys.js');
  const keys = K.collect();
  const t = K.table();
  check('i18n: godot/ui・godot/view の日本語の文が、どれも英語の表（godot/i18n/text_en.gd）にある', () => {
    const miss = [...keys.keys()].filter(k => !(k in t));
    assert(miss.length === 0, '表に無い文 ' + miss.length + ' 件：' + miss.slice(0, 8).map(k => JSON.stringify(k) + '（' + keys.get(k) + '）').join('・'));
    return keys.size + ' 文';
  });
  check('i18n: 英語の訳の「%s」「%d」の数と並びが日本語と同じ（GDScript の % は並べ替えられない）', () => {
    const spec = s => (s.match(/%[-0-9.]*[sdf]/g) || []).map(x => x.slice(-1)).join('');
    const bad = Object.keys(t).filter(k => spec(k) !== spec(t[k]));
    assert(bad.length === 0, bad.slice(0, 8).map(k => JSON.stringify(k) + ' → ' + JSON.stringify(t[k])).join('・'));
    const pos = Object.keys(t).filter(k => /%[0-9]+\$|%[0-9]+[sd]/.test(t[k]));
    assert(pos.length === 0, '並びの指定（%2$s）や幅の指定（%2s）は使わない：' + pos.slice(0, 5).join('・'));
    return Object.keys(t).length + ' 件';
  });
  check('i18n: 英語の訳に日本語が残っていない・空でない', () => {
    const jp = /[぀-ヿ一-鿿]/;
    const bad = Object.keys(t).filter(k => t[k] === '' && k !== '' || jp.test(t[k]));
    assert(bad.length === 0, bad.slice(0, 8).map(k => JSON.stringify(k) + ' → ' + JSON.stringify(t[k])).join('・'));
  });
  check('i18n: 文の表は godot/i18n にあり、画面の文の直書き（HSText を通さない英語の切り替え）が無い', () => {
    const src = fs.readFileSync(path.join(ROOT, 'godot/i18n/hs_text.gd'), 'utf8');
    assert(/static func t\(/.test(src) && /static func horse_name\(/.test(src) && /static func race_name\(/.test(src) && /static func skill_label\(/.test(src), 'HSText の入れ口（t・horse_name・race_name・skill_label）');
    // 画面のコードで言語を見て日本語と英語を書き分けない（英語は表に書く）。is_en() は形の違い（字の大きさ・行の分け方）だけに使う
    for (const dir of ['godot/ui', 'godot/view']) {
      for (const f of fs.readdirSync(path.join(ROOT, dir)).filter(f => f.endsWith('.gd'))) {
        const s = fs.readFileSync(path.join(ROOT, dir, f), 'utf8');
        assert(!/HSText\.lang\s*==\s*"en"\s*\)?\s*\?|if HSText\.is_en\(\) else "[A-Za-z]/.test(s), dir + '/' + f + ' に英語の直書きの切り替え');
      }
    }
    assert(fs.existsSync(path.join(ROOT, 'docs/I18N.md')), 'docs/I18N.md（仕組みと用語の表）');
  });
};
