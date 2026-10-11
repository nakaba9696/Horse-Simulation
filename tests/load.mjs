// ブラウザ用のスクリプトを Node で読み込む
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const LOGIC_FILES = ['src/rng.js', 'src/data.js', 'src/horses.js', 'src/race.js', 'src/breeding.js', 'src/calendar.js', 'src/game.js'];

export function loadHS() {
  const ctx = vm.createContext({ console, Math });
  for (const f of LOGIC_FILES) {
    vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  }
  return ctx.HS;
}
