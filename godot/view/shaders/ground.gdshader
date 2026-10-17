// 内馬場・外の地面（世界の座標で質感を貼る）
shader_type spatial;
uniform sampler2D tex_albedo : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D tex_normal : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform vec3 tint : source_color = vec3(0.30, 0.47, 0.17);
uniform float tile = 9.0;
varying vec3 wp;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
void vertex() { wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; }
void fragment() {
	vec2 m = wp.xz;
	vec3 a = texture(tex_albedo, m / tile).rgb;
	float l = dot(a, vec3(0.299, 0.587, 0.114));
	vec3 base = mix(a, vec3(l), 0.8);
	float macro = noise(m * 0.012) * 0.55 + noise(m * 0.05) * 0.45;
	vec3 col = tint * (base / 0.33) * mix(0.8, 1.12, macro);
	ALBEDO = clamp(col, 0.0, 1.0);
	ROUGHNESS = 0.95;
	SPECULAR = 0.25;
	NORMAL_MAP = texture(tex_normal, m / tile).rgb;
	NORMAL_MAP_DEPTH = 0.5;
}
