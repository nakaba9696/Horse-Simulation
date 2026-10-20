// 見直しの一覧（docs/SPECIAL_AUDIT.json）で持ち主が採った案を data/horse_fix.js に書く。
// adopt が true の馬：adoptSet（値を変えて採るとき）か proposal.set を書く。adopt が false の馬：前に書いた値を消す（--keep で残す）。
//   node tools/special_audit_apply.js            # 書く
//   node tools/special_audit_apply.js --dry      # 書かずに何が変わるかだけ出す
//   node tools/special_audit_apply.js 採否.json  # 別のファイル（見直しのページから書き出したもの）を読む。形は docs/SPECIAL_AUDIT.json と同じか、[{name, adopt, adoptSet}] の並び
// 書いたあと：node tools/special_audit.js && node tools/special_list.js && node tools/export_godot.js && node tools/golden_race.js && node tools/golden_world.js、そして node tests/run.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const dry = args.includes('--dry'), keep = args.includes('--keep');
const inFile = args.find(a => !a.startsWith('--')) || path.join(ROOT, 'docs', 'SPECIAL_AUDIT.json');
const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'SPECIAL_AUDIT.json'), 'utf8'));
const input = JSON.parse(fs.readFileSync(inFile, 'utf8'));
const picks = Array.isArray(input) ? input : input.horses;
const byName = new Map(audit.horses.map(h => [h.name, h]));
const KEYS = ['rating', 'pot', 'turf', 'dirt', 'style', 'distMin', 'distMax', 'skills', 'kire']; // js/core/datafix.js の HS.FIX_KEYS と同じ

// いまの data/horse_fix.js を読む
const FIX = path.join(ROOT, 'data', 'horse_fix.js');
globalThis.HS = { DATA: {} };
require('vm').runInThisContext(fs.readFileSync(FIX, 'utf8'));
const fix = Object.assign({}, globalThis.HS.DATA.horseFix || {});

const log = [];
for (const p of picks) {
  if (p.adopt == null) continue;
  const a = byName.get(p.name);
  if (!a) { log.push(`？ ${p.name}：一覧に無い`); continue; }
  if (p.adopt === false) { if (!keep && fix[p.name]) { delete fix[p.name]; log.push(`− ${p.name}：前に採った値を消した`); } continue; }
  const set = p.adoptSet || (a.proposal && a.proposal.set);
  if (!set) { log.push(`？ ${p.name}：案が無い`); continue; }
  const bad = Object.keys(set).filter(k => !KEYS.includes(k));
  if (bad.length) { log.push(`？ ${p.name}：書けない値 ${bad.join('・')}`); continue; }
  fix[p.name] = Object.assign({}, fix[p.name] || {}, set, { why: (a.proposal && a.proposal.why) || p.why || '' });
  log.push(`＋ ${p.name}：${JSON.stringify(set)}`);
}
const lines = Object.keys(fix).sort().map(n => `    ${JSON.stringify(n)}: ${JSON.stringify(fix[n])},`);
const src = fs.readFileSync(FIX, 'utf8');
const head = src.slice(0, src.indexOf('HS.DATA.horseFix = {') + 'HS.DATA.horseFix = {'.length);
const out = head + '\n' + lines.join('\n') + (lines.length ? '\n' : '') + '  };\n})();\n';
console.log(log.join('\n') || '採否の付いた案はありません');
if (dry) console.log('（--dry：書いていない）');
else { fs.writeFileSync(FIX, out); console.log(`data/horse_fix.js：${Object.keys(fix).length}頭`); }
