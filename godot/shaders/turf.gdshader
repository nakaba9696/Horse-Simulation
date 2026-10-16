// 馬場（芝・ダート）。UV は (u＝内ラチからの距離 m, s＝ゴールからの距離 m)
shader_type spatial;
render_mode cull_disabled;
uniform sampler2D tex_albedo : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D tex_normal : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform vec3 tint : source_color = vec3(0.36, 0.56, 0.20);
uniform float tile = 3.0;          // 質感 1 枚の大きさ（m）
uniform float stripe_len = 0.0;    // 刈り目の縞の長さ（m）。0 で縞なし
uniform float stripe_amp = 0.08;
uniform float desat = 0.85;        // 質感の色を抜く割合（色は tint で決める）
uniform float rough = 0.92;
uniform float normal_depth = 0.7;
uniform float wear_u = -1.0;       // 内ラチ沿いの荒れ（芝の剥げ）の幅。負で無し

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

void fragment() {
	vec2 m = UV;
	vec3 a = texture(tex_albedo, m / tile).rgb;
	vec3 b = texture(tex_albedo, m.yx / (tile * 5.3) + 0.37).rgb;
	float l = dot(a, vec3(0.299, 0.587, 0.114));
	vec3 base = mix(a, vec3(l), desat);
	vec3 col = tint * (base / 0.32);
	float macro = noise(m * 0.035) * 0.6 + noise(m * 0.11) * 0.4;
	col *= mix(0.86, 1.1, macro) * mix(0.93, 1.05, dot(b, vec3(0.333)) / 0.35);
	if (stripe_len > 0.0) {
		float s = step(0.5, fract(m.y / stripe_len));
		col *= 1.0 + stripe_amp * (s * 2.0 - 1.0);
	}
	if (wear_u > 0.0) {
		float w = smoothstep(wear_u, 0.0, m.x) * smoothstep(0.2, 0.6, noise(m * vec2(0.9, 0.25)));
		col = mix(col, vec3(0.42, 0.36, 0.25), w * 0.35);
	}
	ALBEDO = clamp(col, 0.0, 1.0);
	ROUGHNESS = rough;
	SPECULAR = 0.3;
	NORMAL_MAP = texture(tex_normal, m / tile).rgb;
	NORMAL_MAP_DEPTH = normal_depth;
}
