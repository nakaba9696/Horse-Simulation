#!/bin/sh
# Godot の試作で絵を撮る（画面の無い container でも動く：Xvfb と mesa の lavapipe＝Vulkan）
#   sh godot/tools/shot_godot.sh 出力先 --shot=秒:tv|ride:名前 ... --seq=始め:終わり:枚数:tv|ride:名前
# GODOT＝Godot 4.7 の実行ファイル（既定は /home/user/godot-bin/godot）
DIR=$(cd "$(dirname "$0")/.." && pwd)
OUT=$1; shift
GODOT=${GODOT:-/home/user/godot-bin/godot}
export VK_ICD_FILENAMES=${VK_ICD_FILENAMES:-/usr/share/vulkan/icd.d/lvp_icd.json}
[ -d "$DIR/.godot/imported" ] || "$GODOT" --headless --path "$DIR" --import >/dev/null 2>&1
xvfb-run -a -s "-screen 0 1920x1080x24" "$GODOT" --path "$DIR" --audio-driver Dummy --resolution 1920x1080 -- --out="$OUT" "$@" 2>&1 | grep -vE "ALSA|^$"
