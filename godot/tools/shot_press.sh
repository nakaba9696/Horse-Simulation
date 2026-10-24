#!/bin/sh
# 押した返りと次週の見本をまとめて撮る（godot/tools/shot_press.gd。1600×1000・30fps の決まった刻み）
#   sh godot/tools/shot_press.sh 出力先 [week buy reserve deny]
DIR=$(cd "$(dirname "$0")/.." && pwd)
OUT=$1; shift
mkdir -p "$OUT"
OUT=$(cd "$OUT" && pwd)
GODOT=${GODOT:-/home/user/godot-bin/godot}
export VK_ICD_FILENAMES=${VK_ICD_FILENAMES:-/usr/share/vulkan/icd.d/lvp_icd.json}
ALL="week buy reserve deny"
[ $# -gt 0 ] && ALL="$*"
for c in $ALL; do
  xvfb-run -a -s "-screen 0 1600x1000x24" "$GODOT" --path "$DIR" --fixed-fps 30 --audio-driver Dummy --resolution 1600x1000 -s res://tools/shot_press.gd -- --out="$OUT" --case="$c" 2>&1 | grep -E "^shot|^done|ERROR|SCRIPT" | tail -3
done
