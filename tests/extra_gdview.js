// Godot 版の見た目と操作（godot/view・godot/ui）：Godot があれば、画面なしで確かめる
//   操作の割り当て（十字キー・スティック・キーボード。押したコマで動く・押し続け）・模擬の入れ口が JS と同じレースになるか・絵の決まり（毛色・白徴・勝負服）が JS と同じか
// Godot は GODOT＝実行ファイル、PATH の godot、/home/user/godot-bin/godot の順に探す。無ければ飛ばしたと表示する
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
module.exports = function (check, assert) {
  const ROOT = path.join(__dirname, '..');
  const which = spawnSync('sh', ['-c', 'command -v godot'], { encoding: 'utf8' });
  const godot = process.env.GODOT || (which.status === 0 ? which.stdout.trim() : fs.existsSync('/home/user/godot-bin/godot') ? '/home/user/godot-bin/godot' : null);
  const run = (script, extra) => {
    const r = spawnSync(godot, ['--headless', '--path', 'godot'].concat(extra || [], ['-s', script]), { cwd: ROOT, encoding: 'utf8', input: '', maxBuffer: 16 << 20, timeout: 600 * 1000 });
    return { ok: r.status === 0, out: ((r.stdout || '') + (r.stderr || '')).split('\n').filter(l => l.trim() && !/^Godot Engine/.test(l)) };
  };
  check('gdview: 騎乗の操作（十字キー・左スティック・キーボードで、押したコマに動く。押し続けで進路が続けて動く）', () => {
    if (!godot) return 'Godot が無いので飛ばした';
    const r = run('res://tools/check_input.gd', ['--fixed-fps', '60']);
    assert(r.ok, r.out.filter(l => /FAIL|ERROR/.test(l)).join('\n') || r.out.slice(-10).join('\n'));
    return r.out.filter(l => /ok/.test(l)).length + ' 件';
  });
  check('gdview: 絵の決まり（毛色・白徴・勝負服・枠の色）が JS と同じ', () => {
    if (!godot) return 'Godot が無いので飛ばした';
    const r = run('res://tools/check_art.gd');
    assert(r.ok, r.out.slice(-10).join('\n'));
    return r.out.filter(l => /art:/.test(l)).join('');
  });
  check('gdview: 模擬の入れ口（ViewLive）が、記録と同じ出走馬・種で JS と同じ着順とタイムになる', () => {
    if (!godot) return 'Godot が無いので飛ばした';
    const js = spawnSync(process.execPath, ['tools/check_live.js'], { cwd: ROOT, encoding: 'utf8' });
    const g = run('res://tools/check_live.gd');
    const a = (js.stdout.match(/js:\s+(.*?)\s+start=/) || [])[1], b = ((g.out.find(l => /^live:/.test(l)) || '').match(/live:\s+(.*?)\s+start=/) || [])[1];
    assert(a && b && a === b, `JS：${a}\nGodot：${b}`);
    return a.split(' / ')[0];
  });
};
