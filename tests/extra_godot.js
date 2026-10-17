// Godot 版（godot/）：書き出したデータと一致テストの答えが最新か。Godot があれば、Godot の中身のテスト（godot/tests/run.sh）も回す
// Godot は GODOT＝実行ファイル、PATH の godot、/home/user/godot-bin/godot の順に探す。無ければ飛ばしたと表示する
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
module.exports = function (check, assert) {
  const ROOT = path.join(__dirname, '..');
  const node = (args) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
  check('godot: 書き出したデータ（godot/data）が最新', () => {
    const r = node(['tools/export_godot.js', '--check']);
    assert(r.status === 0, (r.stderr || r.stdout).trim());
    return r.stdout.trim();
  });
  check('godot: 一致テストの答え（godot/tests/golden）が今の JS の模擬と同じ', () => {
    const r = node(['tools/golden_race.js', '--check']);
    assert(r.status === 0, (r.stderr || r.stdout).trim());
  });
  check('godot: 世界の進行の答え（godot/tests/golden/world.json）が今の JS と同じ', () => {
    const r = node(['tools/golden_world.js', '--check']);
    assert(r.status === 0, (r.stderr || r.stdout).trim());
  });
  const which = spawnSync('sh', ['-c', 'command -v godot'], { encoding: 'utf8' });
  const godot = process.env.GODOT || (which.status === 0 ? which.stdout.trim() : fs.existsSync('/home/user/godot-bin/godot') ? '/home/user/godot-bin/godot' : null);
  check('godot: Godot 版の中身のテスト（データ・数学・乱数・模擬が JS と同じ）', () => {
    if (!godot) return 'Godot が無いので飛ばした（GODOT= で場所を渡すと回る）';
    const r = spawnSync('sh', ['godot/tests/run.sh'], { cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { GODOT: godot }), maxBuffer: 64 << 20, timeout: 1800 * 1000 });
    const out = (r.stdout || '') + (r.stderr || '');
    assert(r.status === 0, out.split('\n').filter(l => /NG|godot:|見つからない|ERROR/.test(l)).slice(0, 12).join('\n') || out.slice(-1500));
    return (out.match(/godot: .*/) || [''])[0];
  });
};
