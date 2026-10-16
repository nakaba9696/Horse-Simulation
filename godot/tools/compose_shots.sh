#!/bin/sh
# 撮った絵を docs/shots/godot/ に並べる（ImageMagick）
#   sh godot/tools/compose_shots.sh Godotの絵のフォルダ ブラウザ版の絵のフォルダ
# 1枚ずつ 1920x1080 の JPEG・左右に並べた見比べ（1920x540）・連番（1280x720）を作る
set -e
G=$1; W=$2
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
OUT=$ROOT/docs/shots/godot
FONT=$ROOT/godot/assets/fonts/NotoSansJP_700Bold.ttf
mkdir -p "$OUT/godot" "$OUT/web" "$OUT/seq"
for f in "$G"/[0-9]_*.png; do n=$(basename "$f" .png); convert "$f" -quality 86 "$OUT/godot/$n.jpg"; done
for f in "$W"/[0-9]_*.png; do n=$(basename "$f" .png); convert "$f" -quality 86 "$OUT/web/$n.jpg"; done
tag() { # 画像 文字 出力
  convert "$1" -resize 960x540 -gravity northwest -fill '#0008' -draw 'rectangle 0,500 960,540' \
    -font "$FONT" -pointsize 24 -fill '#ffd34d' -annotate +14+505 "$2" "$3"
}
for f in "$W"/[0-9]_*.png; do
  n=$(basename "$f" .png)
  [ -f "$G/$n.png" ] || continue
  tag "$G/$n.png" "Godot 4.7（Forward+）" /tmp/_g.png
  tag "$W/$n.png" "いまのブラウザ版（Three.js r128）" /tmp/_w.png
  convert /tmp/_g.png /tmp/_w.png +append -quality 86 "$OUT/compare_$n.jpg"
done
for f in "$G"/seq_*.png; do n=$(basename "$f" .png); convert "$f" -resize 1280x720 -quality 82 "$OUT/seq/godot_${n#seq_}.jpg"; done
for f in "$W"/seq_*.png; do n=$(basename "$f" .png); convert "$f" -resize 1280x720 -quality 82 "$OUT/seq/web_${n#seq_}.jpg"; done
# 動きが分かる GIF（連番から。640x360）
for k in tv ride; do
  if ls "$G"/seq_${k}_*.png >/dev/null 2>&1; then convert -delay 40 -loop 0 "$G"/seq_${k}_*.png -resize 640x360 -layers Optimize "$OUT/seq/godot_${k}.gif"; fi
  if ls "$W"/seq_${k}_*.png >/dev/null 2>&1; then convert -delay 40 -loop 0 "$W"/seq_${k}_*.png -resize 640x360 -layers Optimize "$OUT/seq/web_${k}.gif"; fi
done
rm -f /tmp/_g.png /tmp/_w.png
du -sh "$OUT"
