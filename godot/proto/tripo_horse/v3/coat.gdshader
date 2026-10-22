// 馬モデル試作 v3 の毛色（引き継ぎの preview/coat.gdshader を元に、脚先・背と腹の濃淡・毛づやを足したもの）
// UV2 に領域（region＝floor(UV2.x*8)：0 胴・1 たてがみ・2 尾・3 蹄・4 鼻先・5 目・6 顔の白徴候補・7 耳内側候補）と
// 脚（leg＝floor(UV2.y*8)：0 脚以外・1 左前・2 右前・3 左後・4 右後）、脚の元の高さ（モデル単位 0〜0.45）が入っている。
// UV2 はライトマップ用に作り直さないこと（.import の meshes/light_baking を 2＝Static Lightmaps にしない）
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
uniform float normal_strength = 0.65;
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
	if (region == 1) color = mix(body, mane_color.rgb, clamp((fract(UV2.x * 8.0) - 0.1) / 0.8, 0.0, 1.0));
	if (region == 2) color = tail_color.rgb;
	if (region == 3) color = hoof_color.rgb;
	if (region == 4) color = muzzle_color.rgb;
	if (region == 5) color = vec3(0.005, 0.004, 0.003);
	if (region == 7) color = mix(body, vec3(0.2, 0.12, 0.10), 0.5);
	float sock = 0.0;
	if (leg == 1) sock = sock_heights.x;
	if (leg == 2) sock = sock_heights.y;
	if (leg == 3) sock = sock_heights.z;
	if (leg == 4) sock = sock_heights.w;
	if (region == 0 && leg > 0 && sock > 0.0) color = mix(color, vec3(0.88), 1.0 - smoothstep(sock - 0.005, sock + 0.005, rest_height));
	if (region == 6 && face_mark) color = vec3(0.88);
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
	ALBEDO = color;
	ROUGHNESS = 0.82 - 0.1 * gloss;
	SPECULAR = 0.35;
	if (has_normal_map) {
		NORMAL_MAP = texture(normal_texture, UV).rgb;
		NORMAL_MAP_DEPTH = normal_strength;
	}
}
