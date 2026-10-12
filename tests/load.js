// index.html の <script> の並びどおりに、ゲームのコア（UI 以外）を Node で読み込む
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

function scriptList() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const block = html.split('<!-- scripts')[1].split('<!-- /scripts -->')[0];
  return [...block.matchAll(/src="([^"]+)"/g)].map(m => m[1]);
}

function load(opts) {
  opts = opts || {};
  globalThis.HS = undefined;
  const files = scriptList().filter(f => !f.startsWith('js/ui/'));
  for (const f of files) {
    const full = path.join(opts.dataDir && f.startsWith('data/') && fs.existsSync(path.join(opts.dataDir, path.basename(f))) ? opts.dataDir : ROOT, opts.dataDir && f.startsWith('data/') && fs.existsSync(path.join(opts.dataDir, path.basename(f))) ? path.basename(f) : f);
    if (!fs.existsSync(full)) { if (opts.allowMissing) continue; throw new Error('missing ' + f); }
    vm.runInThisContext(fs.readFileSync(full, 'utf8'), { filename: full });
  }
  return globalThis.HS;
}
module.exports = { load, scriptList, ROOT };
