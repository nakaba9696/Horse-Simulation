// Godot 版の週の流れ（godot/ui）：Godot があれば、本物の画面で数週を自動で遊ぶ（godot/tools/autoplay.gd）
//   ホーム → 出走表 → おまかせで乗る → 週の結果 → 次の週。ほかの画面（厩舎・番組表・データ・馬主・店・生産・GF）も巡回して戻る。
//   止まった画面・実行時の誤り（SCRIPT ERROR）があれば落ちる。QUICK=1 のときは 6 週、ふだんは 10 週
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
module.exports = function (check, assert) {
  const ROOT = path.join(__dirname, '..');
  const which = spawnSync('sh', ['-c', 'command -v godot'], { encoding: 'utf8' });
  const godot = process.env.GODOT || (which.status === 0 ? which.stdout.trim() : fs.existsSync('/home/user/godot-bin/godot') ? '/home/user/godot-bin/godot' : null);
  check('gdgame: 本物の画面で週の流れを自動で遊んで、止まる所・実行時の誤りが無い', () => {
    if (!godot) return 'Godot が無いので飛ばした';
    const weeks = process.env.QUICK ? 6 : 10;
    const r = spawnSync(godot, ['--headless', '--path', 'godot', '-s', 'res://tools/autoplay.gd', '--', `--weeks=${weeks}`], { cwd: ROOT, encoding: 'utf8', input: '', maxBuffer: 16 << 20, timeout: 600 * 1000 });
    const out = ((r.stdout || '') + (r.stderr || '')).split('\n');
    const errs = out.filter(l => /SCRIPT ERROR|^NG /.test(l));
    const last = out.find(l => /^autoplay:/.test(l)) || '';
    assert(r.status === 0 && !errs.length && /autoplay: ok/.test(last), errs.slice(0, 6).join('\n') || out.slice(-10).join('\n'));
    return last.replace(/^autoplay: ok /, '');
  });
};
