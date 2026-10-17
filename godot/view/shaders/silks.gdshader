// 勝負服。部品の形の座標（m）で模様を描く。y＝体の軸、x＝左右、z＝前後
shader_type spatial;
uniform vec3 base_col : source_color = vec3(0.1, 0.3, 0.8);
uniform vec3 sub_col : source_color = vec3(1.0, 0.85, 0.2);
uniform int pattern = 0; // 0 無地 1 横縞 2 縦縞 3 たすき 4 十字たすき 5 ダイヤ 6 星 7 左右 8 肩
uniform float sheen = 0.35;
uniform float fade_near = 2.8;
uniform float fade_far = 4.9;
float bayer4(vec2 p) {
	int x = int(mod(p.x, 4.0));
	int y = int(mod(p.y, 4.0));
	const float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
	return (m[y * 4 + x] + 0.5) / 16.0;
}
varying vec3 lp;
void vertex() { lp = VERTEX; }
void fragment() {
	if (fade_far > 0.0) {
		float a = clamp((length(VERTEX) - fade_near) / (fade_far - fade_near), 0.0, 1.0);
		if (a < 0.999 && a <= bayer4(FRAGCOORD.xy)) {
			discard;
		}
	}
	float k = 0.0;
	if (pattern == 1) k = step(0.5, fract(lp.y * 7.0));
	else if (pattern == 2) k = step(0.5, fract(atan(lp.x, lp.z) / 6.2831853 * 10.0));
	else if (pattern == 3) k = step(abs(lp.x * 0.9 - lp.y), 0.045);
	else if (pattern == 4) k = max(step(abs(lp.x * 0.9 - lp.y), 0.04), step(abs(lp.x * 0.9 + lp.y), 0.04));
	else if (pattern == 5) { vec2 q = vec2(lp.x + lp.y, lp.x - lp.y) * 9.0; k = mod(floor(q.x) + floor(q.y), 2.0); }
	else if (pattern == 6) { vec2 q = fract(vec2(atan(lp.x, lp.z) * 1.4, lp.y * 7.0)) - 0.5; k = step(length(q), 0.22); }
	else if (pattern == 7) k = step(0.0, lp.x);
	else if (pattern == 8) k = step(0.12, lp.y);
	ALBEDO = mix(base_col, sub_col, k);
	ROUGHNESS = 0.45;
	SPECULAR = 0.5;
	RIM = sheen;
	RIM_TINT = 0.6;
}
