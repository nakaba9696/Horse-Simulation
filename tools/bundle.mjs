// index.html・style.css・src/*.js を 1 つの HTML にまとめる。
//   node tools/bundle.mjs dist/horse-simulation.html            … そのままブラウザで開ける 1 ファイル
//   node tools/bundle.mjs dist/artifact.html --fragment         … <html>/<head>/<body> を外した形（埋め込み先が包む場合）
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || join(root, 'dist', 'horse-simulation.html');
const fragment = process.argv.includes('--fragment');

let html = readFileSync(join(root, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g,
  (_, href) => `<style>\n${readFileSync(join(root, href), 'utf8')}</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g,
  (_, src) => `<script>\n${readFileSync(join(root, src), 'utf8').replace(/<\/script/gi, '<\\/script')}</script>`);

if (fragment) {
  const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
  const styles = html.match(/<style>[\s\S]*?<\/style>/g).join('\n');
  const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
  html = `${title}\n${styles}\n${body}`;
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`${out} (${Math.round(html.length / 1024)} KB)`);
