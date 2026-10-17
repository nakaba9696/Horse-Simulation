# BGM（Godot 版）

`node tools/render_bgm.js` が `js/ui/audio.js` の曲から書き出す生成物。手で直さず、曲を変えたら道具で作り直す
（`node tests/run.js` が `bgm.json` の `source_hash` で古さを見分ける）。

- `<曲>.ogg`：Ogg Vorbis・44.1kHz・ステレオ。曲の名前は JS 版の `HS.Audio.SONGS` と同じ（title・home・paddock・paddockGF・race・fanfare・fanfareGF・victory・lose・glory と、国の paddockUK・raceUK など14曲）。
- `bgm.json`：曲ごとの `loop`（くり返すか）・`loop_offset`（終わりまで鳴らしたら戻る秒）・`bpm`・場面の名前。
- くり返す曲は、終わりの 512 サンプルを戻り先の直前の波形へ寄せてあるので、`loop_offset` へ戻っても途切れない。

読み方の例（GDScript）：
```gdscript
var meta = JSON.parse_string(FileAccess.get_file_as_string("res://audio/bgm/bgm.json"))
func bgm_stream(name: String) -> AudioStream:
	var m = meta.songs[name]
	var s: AudioStreamOggVorbis = load("res://audio/bgm/" + m.file)
	s.loop = m.loop
	s.loop_offset = m.loop_offset
	return s
```
年末の大レース（GF）では、`paddock`・`fanfare` の代わりに `paddockGF`・`fanfareGF` を鳴らす。
海外のレースでは、`paddock`・`race` の後ろに国（地域）の記号を付けた曲を鳴らす：英・愛＝UK、仏＝FR、米・加＝US、豪＝AU、香港・星＝HK、UAE・サウジ＝ME、独＝DE（例：`raceFR`）。
選び方は JS 版の `AU.songFor({ scene }, race)`・`AU.REGION` と同じ（GF が先、次に国）。
