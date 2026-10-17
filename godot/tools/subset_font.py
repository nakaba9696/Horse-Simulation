# 見出しの明朝（Noto Serif JP Black・SIL OFL 1.1）を、ゲームで使う字だけに減らす（8MB → 1MB ほど）
#   pip install fonttools; python3 godot/tools/subset_font.py 元の NotoSerifJP_900Black.ttf
# 元のフォントは npm の @expo-google-fonts/noto-serif-jp@0.4.4 に入っている（npm pack で取れる）
# 使う字：data/*.js・js/**/*.js・godot/ui・godot/view・docs/VISION.md・docs/UI.md に出てくる字と、かな・英数・記号の範囲。無い字は Noto Sans JP で出る
import glob, os, subprocess, sys
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
chars = set()
for pat in ['data/*.js', 'js/**/*.js', 'godot/ui/*.gd', 'godot/view/*.gd', 'docs/VISION.md', 'docs/UI.md']:
    for f in glob.glob(os.path.join(ROOT, pat), recursive=True):
        with open(f, encoding='utf8') as fh:
            chars.update(fh.read())
for a, b in [(0x20, 0x7e), (0xa0, 0xff), (0x2010, 0x2044), (0x2190, 0x21ff), (0x2460, 0x24ff), (0x25a0, 0x25ff), (0x2600, 0x26ff), (0x3000, 0x30ff), (0x31f0, 0x31ff), (0xff00, 0xffef)]:
    chars.update(chr(c) for c in range(a, b + 1))
tmp = os.path.join(ROOT, 'godot', '.godot', 'subset_chars.txt')
os.makedirs(os.path.dirname(tmp), exist_ok=True)
with open(tmp, 'w', encoding='utf8') as fh:
    fh.write(''.join(sorted(chars)))
out = os.path.join(ROOT, 'godot', 'assets', 'fonts', 'NotoSerifJP_900Black_sub.ttf')
subprocess.run(['pyftsubset', sys.argv[1], '--text-file=' + tmp, '--output-file=' + out, "--layout-features=*", '--no-hinting'], check=True)
print(out, os.path.getsize(out) // 1024, 'KB', len(chars), '字')
