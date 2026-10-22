# 騎乗の画面の左下の塊（docs/FEEL.md 4）。持ち主の指摘 2026-10-22「脚質の表示箇所左下の項目にまとめて　今浮いてるから」
# ・脚質の矢印と帯の段は、速さの計器の右の1枚の板（STAMINA・手綱と同じ板）の中にある。別の板は作らない
# ・脚質の段は STAMINA の上で、左の端と幅は手綱の帯とそろう。馬の頭の札・STAMINA・手綱・丸い計器と重ならない
# ・全開の光（丸い計器の外の輪）は脚質の段に届かない。左上の順位の板・右のレーダーとぶつからない
extends RefCounted

func run(t) -> void:
	var L := UiRideHud.meters_layout()
	var panel: Rect2 = L.panel
	var st: Rect2 = L.style
	var sa: Rect2 = L.stamina
	var rn: Rect2 = L.reins
	var tp: Dictionary = L.temper
	var dial: Dictionary = L.dial
	# 矢印は帯の段の上の端より 1.5 上へ出る・光は半径 9 ほど
	var st_ink := st.grow_individual(0, 3.0, 0, 0)
	t.ok(panel.encloses(st_ink), "脚質の段が計器の板の中にある：%s ⊂ %s" % [st_ink, panel])
	t.ok(panel.encloses(sa) and panel.encloses(rn), "STAMINA と手綱が計器の板の中にある")
	t.ok(st.end.y < sa.position.y, "脚質の段は STAMINA の上")
	t.ok(not st.intersects(sa) and not st.intersects(rn), "脚質の段が STAMINA・手綱と重ならない")
	t.eq(st.position.x, rn.position.x, "脚質の段の左の端は手綱の帯とそろう")
	t.eq(st.size.x, rn.size.x, "脚質の段の幅は手綱の帯とそろう")
	var tbox := Rect2(float(tp.cx) - float(tp.r), float(tp.cy) - float(tp.r), float(tp.r) * 2.0, float(tp.r) * 2.0)
	t.ok(panel.encloses(tbox), "馬の頭の札が計器の板の中にある")
	t.ok(not st.intersects(tbox), "脚質の段が馬の頭の札と重ならない")
	# 丸い計器の全開の光（外の輪。半径 R+2+3×7.5、入った瞬間の輪は R+26）が脚質の段に届かない
	var glow_r := float(dial.r) + 26.0
	var c := Vector2(float(dial.cx), float(dial.cy))
	var nearest := Vector2(clampf(c.x, st.position.x, st.end.x), clampf(c.y, st.position.y, st.end.y))
	t.ok(nearest.distance_to(c) > glow_r + 4.0, "全開の光の輪が脚質の段に届かない（%.1f > %.1f）" % [nearest.distance_to(c), glow_r + 4.0])
	# 塊が画面（960×600）に収まり、左上の順位の板（16,14,232×66）・右のレーダー（右から 86、y 112〜432）とぶつからない
	var top_left := Rect2(16, 14, 232, 66)
	var radar := Rect2(960.0 - 70.0 - 16.0, 112, 70, 320)   # 1600×1000 では仮の画面の幅が 960
	t.ok(panel.end.y <= 600.0 and panel.position.x >= 0.0, "計器の板が画面の中")
	t.ok(not panel.intersects(top_left), "計器の板が左上の順位の板とぶつからない")
	t.ok(not panel.intersects(radar), "計器の板が右のレーダーとぶつからない")
	# 前の形（丸い計器の上に浮いた脚質の板 _style_panel）に戻さない
	var src := FileAccess.get_file_as_string("res://ui/ride_hud.gd")
	t.ok(not src.contains("func _style_panel("), "脚質の別の板（_style_panel）が無い")
