// 見直しの一覧（docs/SPECIAL_AUDIT.json）で持ち主が付けた採否を data/horse_fix.js に書く（2回目からの見直し。1回目は tools/special_audit.js --apply-owner）。
//   adopt: true  ＝ 案（proposal.set）を採る
//   target: 数    ＝ 得意な馬場の総合力をこの値に（adopt より先。adopt が true なら特殊能力などの案も一緒に）
//   adopt: false ＝ 採らない（前に書いた値を消す。--keep で残す）
//   node tools/special_audit_apply.js            # 書く
//   node tools/special_audit_apply.js --dry      # 書かずに何が変わるかだけ出す
//   node tools/special_audit_apply.js 採否.json  # 見直しのページから書き出したもの（[{name, adopt, target, note}] の並びか、docs/SPECIAL_AUDIT.json と同じ形）
// 書いたあと：node tools/special_audit.js && node tools/special_list.js && node tools/export_godot.js && node tools/golden_race.js && node tools/golden_world.js、そして node tests/run.js
const fs = require('fs'), path = require('path');
const { load, ROOT } = require('../tests/load.js');
const A = require('./special_audit.js');
const args = process.argv.slice(2);
const dry = args.includes('--dry'), keep = args.includes('--keep');
const inFile = args.find(a => !a.startsWith('--')) || path.join(ROOT, 'docs', 'SPECIAL_AUDIT.json');
const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'SPECIAL_AUDIT.json'), 'utf8'));
const input = JSON.parse(fs.readFileSync(inFile, 'utf8'));
const picks = Array.isArray(input) ? input : input.horses;
const byName = new Map(audit.horses.map(h => [h.name, h]));
const STRENGTH = ['rating', 'pot'];

const HS = load(); HS.U.ERA = HS.Eraless.ERA;
const kit = A.makeKit(HS);
const fix = A.readFix();
const log = [];
for (const p of picks) {
  if (p.adopt == null && p.target == null) continue;
  const a = byName.get(p.name);
  const d = kit.SP.data(p.name) || HS.DATA.historic.find(x => x.name === p.name);
  if (!a || !d) { log.push(`？ ${p.name}：一覧に無い`); continue; }
  if (p.adopt === false && p.target == null) { if (!keep && fix[p.name]) { delete fix[p.name]; log.push(`− ${p.name}：前に採った値を消した`); } continue; }
  const prop = (a.proposal && a.proposal.set) || {};
  const set = {};
  if (p.adopt === true) for (const [k, v] of Object.entries(prop)) if (p.target == null || !STRENGTH.includes(k)) set[k] = v;
  let why = (a.proposal && a.proposal.why) || '';
  if (p.target != null) {
    const surf = kit.mainSurf(kit.build(d, set).f);
    const b = kit.solve(d, set, surf, p.target);
    if (b.cost) Object.assign(set, b.s);
    why = `持ち主の見直しで総合力 ${p.target}${p.note ? `（メモ：${p.note}）` : ''}${p.adopt === true && why ? '。' + why : ''}`;
  }
  if (!Object.keys(set).length) { log.push(`＝ ${p.name}：いまの値のまま`); continue; }
  fix[p.name] = Object.assign({}, fix[p.name] || {}, set, { why });
  log.push(`＋ ${p.name}：${JSON.stringify(set)}`);
}
console.log(log.join('\n') || '採否の付いた案はありません');
if (dry) console.log('（--dry：書いていない）');
else { A.writeFix(fix); console.log(`data/horse_fix.js：${Object.keys(fix).length}頭`); }
