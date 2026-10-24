#!/bin/sh
# 騎乗の外の画面をまとめて 1600×1000 で撮る（直す前と後を同じ画面・同じ見本で並べるため。docs/UI.md「色の役目」）
#   sh godot/tools/shot_screens.sh 出力先 [--contrast] [画面の名前 …]
# 名前：title home program shop shop_detail card paddock result stable horse farm farm_pair data owners gf settings
# --contrast：撮った絵で押せる物の面と縁が周りから浮いているかを測る（UiScreen.measure_contrast）。1枚ごとの JSON と、まとめの contrast.txt
# 見本は決まった種の新しいゲーム（--demo=1。セーブは書かない）。牧場は史実の名馬を引退馬に置いた見本（--setup=inbreed）
DIR=$(cd "$(dirname "$0")" && pwd)
OUT=$1; shift
mkdir -p "$OUT"
OUT=$(cd "$OUT" && pwd)
C=""
if [ "$1" = "--contrast" ]; then C="--contrast"; shift; fi
ALL="title home program shop shop_detail card paddock result stable horse farm farm_pair data owners gf settings"
[ $# -gt 0 ] && ALL="$*"
shot() { # 名前 場面 秒[:後ろに足す] 引数…（出走表の --shot は 秒:名前:選ぶ馬:paddock）
  n=$1; sc=$2; t=${3%%:*}; x=${3#"$t"}; shift 3
  sh "$DIR/run_scene.sh" "res://scenes/$sc.tscn" -- --out="$OUT" --shot="$t:$n$x" $C "$@" > "$OUT/$n.log" 2>&1
  if [ -f "$OUT/$n.png" ]; then echo "撮った $n"; grep "^contrast" "$OUT/$n.log"; else echo "撮れなかった $n（$OUT/$n.log）"; fi
}
for n in $ALL; do
  case $n in
    title) shot title title 1.2 ;;
    home) shot home home 1.2 --demo=1 ;;
    program) shot program program 1.2 --demo=1 ;;
    shop) shot shop shop 1.2 --demo=1 ;;
    shop_detail) shot shop_detail shop 1.2 --demo=1 --setup=shop_detail ;;
    card) shot card race_card 1.2 --demo=1 ;;
    paddock) shot paddock race_card "2.5:-1:paddock" --demo=1 ;;
    result) shot result week_result 1.2 --demo=1 ;;
    stable) shot stable stable 1.2 --demo=1 ;;
    horse) shot horse horse 1.2 --demo=1 ;;
    farm) shot farm breed 1.2 --demo=1 --setup=inbreed ;;
    farm_pair) shot farm_pair breed 1.2 --demo=1 --setup=inbreed --pick=ドゥラメンテ --pick=アーモンドアイ ;;
    data) shot data data 1.2 --demo=1 ;;
    owners) shot owners owners 1.2 --demo=1 --setup=owners8 ;;
    gf) shot gf gf 1.2 --demo=1 ;;
    settings) shot settings settings 1.2 ;;
  esac
done
[ -n "$C" ] && cat "$OUT"/*.log | grep "^contrast" > "$OUT/contrast.txt"
exit 0
