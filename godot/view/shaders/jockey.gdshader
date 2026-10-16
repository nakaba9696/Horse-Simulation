// 騎手（素材の体）：部位は頂点色の R（番号/8）を CUSTOM0.w に。0 肌・1 勝負服・2 袖・3 ズボン・4 長靴・5 長靴の折り返し・6 手袋・7 帽子・8 ゴーグル
// 勝負服の柄は写す前の位置（CUSTOM0.xyz、素材の座標）で描く（js/ui/race3d.js の jockeyMaterial と同じ）
shader_type spatial;

uniform vec3 base_col : source_color = vec3(0.12, 0.31, 0.75);
uniform vec3 sub_col : source_color = vec3(1.0, 0.82, 0.25);
uniform vec3 cap_col : source_color = vec3(1.0, 1.0, 1.0);
uniform vec3 skin_col : source_color = vec3(0.85, 0.66, 0.51);
uniform int pattern = 0;
uniform float fade_near = 2.8;
uniform float fade_far = 4.9;
varying vec3 v_bp;
varying float v_reg;

float bayer4(vec2 p) {
	int x = int(mod(p.x, 4.0));
	int y = int(mod(p.y, 4.0));
	const float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
	return (m[y * 4 + x] + 0.5) / 16.0;
}

float silk_mask(vec3 p) {
	float x = p.x;
	float y = p.y;
	if (pattern == 0) return 0.0;
	if (pattern == 1) return step(0.5, fract((y - 0.98) / 0.13));
	if (pattern == 2) return step(0.5, fract(x / 0.085 + 0.25));
	if (pattern == 3) return step(abs((y - 1.24) - 0.95 * x), 0.06);
	if (pattern == 4) return max(step(abs((y - 1.24) - 0.95 * x), 0.045), step(abs((y - 1.24) + 0.95 * x), 0.045));
	if (pattern == 5) { vec2 q = abs(fract(vec2(x / 0.15 + 0.5, (y - 1.0) / 0.17)) - 0.5); return step(q.x + q.y, 0.24); }
	if (pattern == 6) { vec2 c = fract(vec2(x / 0.14 + 0.5, (y - 1.0) / 0.15 + p.z * 2.0)) - 0.5; float a = atan(c.y, c.x); float r = length(c); return step(r, 0.2 * (0.62 + 0.38 * cos(5.0 * a + 1.5708))); }
	if (pattern == 7) return step(0.0, x);
	return step(1.37, y);
}

void vertex() {
	v_bp = CUSTOM0.xyz;
	v_reg = CUSTOM0.w;
}

void fragment() {
	if (fade_far > 0.0) {
		float a = clamp((length(VERTEX) - fade_near) / (fade_far - fade_near), 0.0, 1.0);
		if (a < 0.999 && a <= bayer4(FRAGCOORD.xy)) {
			discard;
		}
	}
	float rg = floor(v_reg + 0.5);
	vec3 jc = skin_col;
	float jr = 0.62;
	if (rg > 0.5 && rg < 1.5) { jc = mix(base_col, sub_col, silk_mask(v_bp)); jr = 0.38; }
	else if (rg > 1.5 && rg < 2.5) { jc = pattern == 7 ? mix(base_col, sub_col, step(0.0, v_bp.x)) : sub_col; jr = 0.38; }
	else if (rg > 2.5 && rg < 3.5) { jc = vec3(0.86); jr = 0.6; }
	else if (rg > 3.5 && rg < 4.5) { jc = vec3(0.012); jr = 0.32; }
	else if (rg > 4.5 && rg < 5.5) { jc = vec3(0.23, 0.11, 0.04); jr = 0.45; }
	else if (rg > 5.5 && rg < 6.5) { jc = vec3(0.88); jr = 0.6; }
	else if (rg > 6.5 && rg < 7.5) { jc = cap_col; jr = 0.25; }
	else if (rg > 7.5) { jc = vec3(0.02, 0.025, 0.03); jr = 0.12; }
	ALBEDO = jc;
	ROUGHNESS = jr;
	SPECULAR = 0.5;
	if (rg > 0.5 && rg < 2.5) {
		RIM = 0.3;
		RIM_TINT = 0.6;
	}
}
