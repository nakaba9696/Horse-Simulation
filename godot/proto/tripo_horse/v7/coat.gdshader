// 馬モデル試作 v7 の毛色（v6/coat.gdshader を元に、v7 の引き継ぎの preview/coat.gdshader と CLAUDE_HANDOFF.md「付属シェーダとimport — 必須」の差分を入れたもの）
//   v6 付属からの差分は D だけ（A〜C は v6 と同じ式）。付属と食い違う所は付属を正にした（D の式・数・どの領域に掛けるか）
//   A. 肩・首の黒い切れ目を抑える法線の補正：スキンで運んだ法線が実の三角形の面の向きと 0.15 より食い違う画素だけ、面の向きに戻す（ALBEDO・NORMAL_MAP の前）
//   B. 鼻先（region 4）の色を UV2.x の小数で胴の色から混ぜる
//   C. たてがみの根元（region 1）も同じ混ぜ方
//   D. v7：鼻の穴と口の線。GLB の COLOR_0 は頂点の色ではなく、頭の決まった座標（骨に付いて動く）が入っている：
//        r＝0.5＋左右÷0.12・g＝(頭の軸の向きの割合−0.65)÷0.55・b＝0.5＋表裏÷0.12・a＝頭の皮だけ 1（ほかは 0）。正面の側は −face_front
//      これを戻して、小さな斜めの鼻の穴2つと細い曲がった口の線を fragment で描く（口の線の縁は fwidth）。COLOR を ALBEDO に掛けない。
//      たてがみ（1）・目（5）・耳の内側（7）には掛けない。色は muzzle_color（毛色の表の鼻先の色）へ混ぜる（付属と同じ）
//   付属と違う所（ゲーム側の毛色。v6 から残す）：混ぜる元は胴の色そのものでなく背と腹の濃淡を掛けた色・脚先の黒（鹿毛）・全体の明るさ tone・下を向いた面の陰・毛づや gloss。
//   色は UiArt.coat_look（毛色の表）から tripo_model.gd が渡す。白い脚（sock_heights）・顔の白徴（region 6）は付属と同じ決まり。D は白徴の後に掛ける（付属と同じ順。白徴の上にも鼻の穴が出る）
// 法線の絵の強さは GLB の normalTexture.scale（v7 も 0.03）を tripo_model.gd が渡す
// UV2 に領域（region＝floor(UV2.x*8)：0 胴・1 たてがみ・2 尾・3 蹄・4 鼻先・5 目・6 顔の白徴候補・7 耳内側候補）と
// 脚（leg＝floor(UV2.y*8)：0 脚以外・1 左前・2 右前・3 左後・4 右後）、脚の元の高さ（モデル単位 0〜0.45）が入っている（v5・v6 と同じ決まり）
// UV2 はライトマップ用に作り直さないこと（.import の meshes/light_baking を 0 のまま）。COLOR_0 も消さないこと
// 頭絡（BridleLeather・BridleMetal）には使わない
shader_type spatial;
render_mode cull_back;

uniform vec4 coat_color : source_color = vec4(0.36, 0.13, 0.045, 1.0);
uniform vec4 top_color : source_color = vec4(0.30, 0.11, 0.04, 1.0);     // 背（上を向いた面）
uniform vec4 belly_color : source_color = vec4(0.45, 0.20, 0.09, 1.0);   // 腹（下を向いた面）
uniform vec4 mane_color : source_color = vec4(0.018, 0.012, 0.008, 1.0);
uniform vec4 tail_color : source_color = vec4(0.018, 0.012, 0.008, 1.0);
uniform vec4 points_color : source_color = vec4(0.02, 0.015, 0.012, 1.0); // 脚先（鹿毛の黒い脚）
uniform vec4 hoof_color : source_color = vec4(0.065, 0.06, 0.055, 1.0);
uniform vec4 muzzle_color : source_color = vec4(0.055, 0.035, 0.03, 1.0);
uniform float points_on = 1.0;          // 脚先の色を出すか（0〜1）
uniform vec2 points_h = vec2(0.19, 0.24); // 脚先の色の上の端（モデル単位。前脚の膝 0.5m・後脚の飛節 0.62m の 2.6 分の 1）
uniform float points_soft = 0.02;       // 脚先の境のぼかし（モデル単位）
uniform float tone = 0.7;               // 全体の明るさ（いまの馬は素材の陰影の絵を掛けて暗く見えるので、それに寄せる）
uniform float gloss = 0.5;              // 毛づや（毛色の表の gloss）
uniform vec4 sock_heights = vec4(0.0);  // 白い脚の高さ（左前・右前・左後・右後。モデル単位。0 は無し）
uniform bool face_mark = false;         // 顔の白徴（候補の領域を白く。史実の白徴の再現ではない）
uniform bool show_regions = false;
uniform float normal_strength = 0.03;   // GLB の normalTexture.scale（v5〜v7 は 0.03）
uniform bool has_normal_map = false;
uniform sampler2D normal_texture : hint_normal;

varying float up_k;

void vertex() {
	up_k = NORMAL.y;   // モデルの座標（Y が上）での面の向き
}

void fragment() {
	int region = int(floor(UV2.x * 8.0));
	float packed = UV2.y * 8.0;
	int leg = int(floor(packed));
	float rest_height = clamp((fract(packed) - 0.15) / 0.7, 0.0, 1.0) * 0.45;
	vec3 body = coat_color.rgb;
	body = mix(body, top_color.rgb, smoothstep(0.35, 0.95, up_k) * 0.7);
	body = mix(body, belly_color.rgb, smoothstep(-0.35, -0.95, up_k) * 0.6);
	vec3 color = body;
	if (region == 0 && leg > 0) {
		float ph = leg <= 2 ? points_h.x : points_h.y;
		color = mix(color, points_color.rgb, points_on * (1.0 - smoothstep(ph - points_soft, ph + points_soft, rest_height)));
	}
	// 鼻先とたてがみの根元：UV2.x の小数（0.1〜0.9）で胴の色から混ぜる（引き継ぎ B・C）
	float region_blend = clamp((fract(UV2.x * 8.0) - 0.1) / 0.8, 0.0, 1.0);
	if (region == 1) color = mix(body, mane_color.rgb, region_blend);
	if (region == 2) color = tail_color.rgb;
	if (region == 3) color = hoof_color.rgb;
	if (region == 4) color = mix(body, muzzle_color.rgb, region_blend);
	if (region == 5) color = vec3(0.005, 0.004, 0.003);
	if (region == 7) color = mix(body, vec3(0.2, 0.12, 0.10), 0.5);
	float sock = 0.0;
	if (leg == 1) sock = sock_heights.x;
	if (leg == 2) sock = sock_heights.y;
	if (leg == 3) sock = sock_heights.z;
	if (leg == 4) sock = sock_heights.w;
	if (region == 0 && leg > 0 && sock > 0.0) color = mix(color, vec3(0.88), 1.0 - smoothstep(sock - 0.005, sock + 0.005, rest_height));
	if (region == 6 && face_mark) color = vec3(0.88);
	// D. 鼻の穴と口の線（v7 付属の式のまま。COLOR は頭の座標で、色ではない）
	float face_y = (COLOR.r - 0.5) * 0.12;
	float face_u = 0.65 + COLOR.g * 0.55;
	float face_front = (COLOR.b - 0.5) * 0.12;
	float face_gate = COLOR.a * smoothstep(0.003, 0.014, -face_front);
	float nostril = 0.0;
	for (int sign_i = -1; sign_i <= 1; sign_i += 2) {
		float side = float(sign_i);
		float dy = face_y - side * 0.027;
		float along = face_u - 0.89 + side * dy * 1.2;
		float distance = length(vec2(dy / 0.012, along / 0.017));
		nostril = max(nostril, 1.0 - smoothstep(0.40, 1.0, distance));
	}
	float mouth_u = 0.985 - 0.025 * pow(abs(face_y) / 0.045, 2.0);
	float mouth_aa = max(fwidth(face_u) * 0.70, 0.0003);
	float mouth = (1.0 - smoothstep(0.00035, 0.00035 + mouth_aa, abs(face_u - mouth_u))) * (1.0 - smoothstep(0.035, 0.047, abs(face_y)));
	float mouth_gate = COLOR.a * smoothstep(-0.008, 0.006, -face_front);
	float facial_crease = max(nostril * 0.80 * face_gate, mouth * 0.36 * mouth_gate);
	if (region != 1 && region != 5 && region != 7) color = mix(color, muzzle_color.rgb, facial_crease);
	if (show_regions) {
		color = vec3(0.7);
		if (region == 1) color = mix(vec3(0.7), vec3(0.9, 0.1, 0.05), clamp((fract(UV2.x * 8.0) - 0.1) / 0.8, 0.0, 1.0));
		if (region == 2) color = vec3(0.6, 0.05, 0.8);
		if (region == 3) color = vec3(0.05, 0.2, 0.9);
		if (region == 4) color = vec3(0.05, 0.8, 0.8);
		if (region == 5) color = vec3(0.01);
		if (region == 6) color = vec3(1.0, 1.0, 0.05);
		if (region == 7) color = vec3(0.1, 0.9, 0.1);
		if (region == 0 && leg > 0) color = vec3(0.55 + 0.1 * float(leg), 0.6, 0.55);
	}
	// 遮蔽の陰：下を向いた面を暗く（いまの馬の毛色と同じ考え。最大 30%）
	if (!show_regions) color *= tone * (1.0 - 0.3 * smoothstep(0.0, -0.9, up_k));
	// 肩・首の黒い切れ目を抑える（引き継ぎ A）。穴を隠す処理ではない（形の穴は v5 で閉じてある）
	vec3 geometric_normal = normalize(cross(dFdx(VERTEX), dFdy(VERTEX)));
	if (dot(geometric_normal, VIEW) < 0.0) geometric_normal = -geometric_normal;
	if (dot(NORMAL, geometric_normal) < 0.15) NORMAL = geometric_normal;
	ALBEDO = color;
	ROUGHNESS = 0.82 - 0.1 * gloss;
	SPECULAR = 0.35;
	if (has_normal_map) {
		NORMAL_MAP = texture(normal_texture, UV).rgb;
		NORMAL_MAP_DEPTH = normal_strength;
	}
}
