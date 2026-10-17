#!/bin/sh
# Godot 版の場面を画面の無い container で動かして撮る（Xvfb と mesa の lavapipe＝CPU の Vulkan）
#   sh godot/tools/run_scene.sh res://scenes/xxx.tscn [幅x高さ] -- --out=DIR ...
DIR=$(cd "$(dirname "$0")/.." && pwd)
SCENE=$1; shift
RES=1600x1000
case "$1" in *x*) RES=$1; shift;; esac
GODOT=${GODOT:-/home/user/godot-bin/godot}
export VK_ICD_FILENAMES=${VK_ICD_FILENAMES:-/usr/share/vulkan/icd.d/lvp_icd.json}
[ -d "$DIR/.godot/imported" ] || "$GODOT" --headless --path "$DIR" --import >/dev/null 2>&1
xvfb-run -a -s "-screen 0 ${RES}x24" "$GODOT" --path "$DIR" --fixed-fps 30 --audio-driver Dummy --resolution "$RES" "$SCENE" "$@" 2>&1 | grep -vE "ALSA|^$"
