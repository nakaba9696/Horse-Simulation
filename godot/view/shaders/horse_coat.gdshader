// 骨入りの馬の毛色（js/ui/horse_rigged.js の material() と同じ塗り方）
// 素材の絵（shade.jpg）は明るさの陰影だけ（赤＝陰影×0.5）。毛色・脚先・白徴・連銭・たてがみは、写す前の位置（CUSTOM0）から塗る
// CUSTOM0＝写す前の位置（xyz）と毛の重み（w）、CUSTOM1＝写す前の法線
shader_type spatial;
render_mode cull_back;

uniform sampler2D shade_tex : hint_default_white, filter_linear_mipmap_anisotropic, repeat_disable;
uniform vec3 c_body : source_color = vec3(0.49, 0.26, 0.13);
uniform vec3 c_top : source_color = vec3(0.36, 0.18, 0.09);
uniform vec3 c_belly : source_color = vec3(0.56, 0.33, 0.19);
uniform vec3 c_points : source_color = vec3(0.09, 0.07, 0.05);
uniform vec3 c_mane : source_color = vec3(0.09, 0.06, 0.05);
uniform vec3 c_muzzle : source_color = vec3(0.23, 0.15, 0.10);
uniform vec3 c_hoof : source_color = vec3(0.15, 0.13, 0.11);
uniform vec3 c_white : source_color = vec3(0.95, 0.94, 0.91);
uniform vec3 c_dapple : source_color = vec3(0.6, 0.6, 0.6);
uniform float dapple = 0.0;
uniform float pts_soft = 0.08;
uniform float pts_on = 1.0;
uniform float knee_y;
uniform float hock_y;
uniform float leg_z;
uniform float back_y;
uniform float belly_y;
uniform float hoof_y = 0.07;
uniform vec4 sock = vec4(0.0);
uniform vec3 head_p;
uniform vec3 head_dir;
uniform float head_len = 0.4;
uniform float blaze = 0.0;
uniform float gloss = 0.5;
// カメラのすぐ前の馬は網目に消す（自分の馬を隠さないように）。0 で消さない
uniform float fade_near = 2.2;
uniform float fade_far = 4.6;
float bayer4(vec2 p) {
	int x = int(mod(p.x, 4.0));
	int y = int(mod(p.y, 4.0));
	const float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
	return (m[y * 4 + x] + 0.5) / 16.0;
}

varying vec3 v_rest;
varying vec3 v_rest_n;
varying float v_hair;

float hr_h(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float hr_n(vec3 p) {
	vec3 i = floor(p);
	vec3 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(mix(hr_h(i), hr_h(i + vec3(1, 0, 0)), f.x), mix(hr_h(i + vec3(0, 1, 0)), hr_h(i + vec3(1, 1, 0)), f.x), f.y),
		mix(mix(hr_h(i + vec3(0, 0, 1)), hr_h(i + vec3(1, 0, 1)), f.x), mix(hr_h(i + vec3(0, 1, 1)), hr_h(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}

void vertex() {
	v_rest = CUSTOM0.xyz;
	v_hair = CUSTOM0.w;
	v_rest_n = CUSTOM1.xyz;
}

void fragment() {
	if (fade_far > 0.0) {
		float a = clamp((length(VERTEX) - fade_near) / (fade_far - fade_near), 0.0, 1.0);
		if (a < 0.999 && a <= bayer4(FRAGCOORD.xy)) {
			discard;
		}
	}
	vec4 tx = texture(shade_tex, UV);
	float sh = tx.r * 2.0;
	vec3 p = v_rest;
	// 体の色：腹 → 体 → 背
	vec3 c = mix(c_belly, c_body, smoothstep(belly_y - 0.05, belly_y + 0.25, p.y));
	c = mix(c, c_top, smoothstep(back_y - 0.1, back_y + 0.08, p.y) * 0.5);
	// 連銭（芦毛）
	if (dapple > 0.0) {
		float d = hr_n(p * 9.0);
		c = mix(c, c_dapple, dapple * smoothstep(0.58, 0.78, d) * smoothstep(belly_y, belly_y + 0.2, p.y));
	}
	// 脚先（膝・飛節から下）
	bool front = p.z > leg_z;
	float kn = front ? knee_y : hock_y;
	float pts = 1.0 - smoothstep(kn - 0.05, kn + pts_soft, p.y);
	c = mix(c, c_points, pts * pts_on);
	// 白い靴下（左＝+X）
	bool left = p.x > 0.0;
	float sk = front ? (left ? sock.x : sock.y) : (left ? sock.z : sock.w);
	if (sk > 0.0) {
		c = mix(c, c_white, 1.0 - smoothstep(sk - 0.015, sk + 0.015, p.y));
	}
	// 蹄
	c = mix(c, c_hoof, 1.0 - smoothstep(hoof_y - 0.01, hoof_y + 0.01, p.y));
	// 頭：鼻先・白徴
	float t = dot(p - head_p, head_dir) / head_len;
	vec3 q = p - head_p - head_dir * dot(p - head_p, head_dir);
	float on_head = step(0.0, t) * step(t, 1.15) * (1.0 - smoothstep(0.12, 0.2, length(q)));
	c = mix(c, c_muzzle, smoothstep(0.78, 0.92, t) * on_head);
	if (blaze > 0.5) {
		vec3 face = normalize(vec3(0.0, head_dir.z, -head_dir.y));
		if (face.y < 0.0) {
			face = -face;
		}
		float fr = smoothstep(0.15, 0.45, dot(normalize(v_rest_n), face)) * on_head;
		float w = blaze < 1.5 ? 0.035 : blaze < 2.5 ? 0.02 : blaze < 3.5 ? 0.04 : 0.06;
		float t0 = blaze < 1.5 ? 0.1 : 0.08;
		float t1 = blaze < 1.5 ? 0.28 : 0.88;
		float b = (1.0 - smoothstep(w, w + 0.012, abs(p.x))) * smoothstep(t0, t0 + 0.03, t) * (1.0 - smoothstep(t1 - 0.03, t1, t));
		c = mix(c, c_white, b * fr);
	}
	// たてがみ・尾の毛（陰影は暗めで差を小さく）
	float hm = max(v_hair, tx.g);
	c = mix(c, c_mane, hm);
	sh = mix(sh, 0.8 + 0.4 * (sh - 1.0), hm);
	// 遮蔽の陰：体の下側・脚の内側・腹より下を暗く
	vec3 rn = normalize(v_rest_n);
	float ao = 1.0 - 0.38 * smoothstep(0.05, -0.75, rn.y) * smoothstep(knee_y, belly_y + 0.1, p.y);
	float inner = smoothstep(0.1, 0.8, -sign(p.x) * rn.x) * (1.0 - smoothstep(belly_y - 0.05, belly_y + 0.1, p.y));
	ao *= 1.0 - 0.3 * inner;
	ao *= 0.82 + 0.18 * smoothstep(0.1, belly_y + 0.15, p.y);
	sh *= mix(ao, 1.0, hm);
	ALBEDO = c * sh;
	ROUGHNESS = mix(0.78 - 0.08 * gloss, 0.85, hm);
	SPECULAR = mix(0.5, 0.3, hm);
	// 毛艶：縁の明るみ（毛並みの光沢）
	RIM = 0.25 * gloss * (1.0 - hm);
	RIM_TINT = 0.7;
}
