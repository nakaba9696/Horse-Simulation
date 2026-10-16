// 鞍の下の白い布（ゼッケン）と鞍：馬の体の面を少し浮かせた殻。写す前の位置（CUSTOM0）で四角く切り取り、縁をきれいにする
shader_type spatial;
render_mode cull_disabled;

uniform vec3 base : source_color = vec3(0.96, 0.96, 0.94);
uniform vec3 trim : source_color = vec3(0.12, 0.2, 0.55);
uniform float z0 = -0.34;
uniform float z1 = 0.22;
uniform float y0 = 1.02;
uniform float trim_w = 0.02;
uniform float round_k = 0.06;
uniform float rough = 0.85;
uniform float fade_near = 2.2;
uniform float fade_far = 4.6;
varying vec3 v_rest;

float bayer4(vec2 p) {
	int x = int(mod(p.x, 4.0));
	int y = int(mod(p.y, 4.0));
	const float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
	return (m[y * 4 + x] + 0.5) / 16.0;
}

void vertex() {
	v_rest = CUSTOM0.xyz;
}

void fragment() {
	vec3 p = v_rest;
	// 下の角を丸めた四角
	float dz = max(z0 + round_k - p.z, p.z - (z1 - round_k));
	float dy = y0 + round_k - p.y;
	float d = length(max(vec2(dz, dy), 0.0)) - round_k;
	if (max(dz, dy) < 0.0) {
		d = max(dz, dy) - round_k;
	}
	if (d > 0.0) {
		discard;
	}
	if (fade_far > 0.0) {
		float a = clamp((length(VERTEX) - fade_near) / (fade_far - fade_near), 0.0, 1.0);
		if (a < 0.999 && a <= bayer4(FRAGCOORD.xy)) {
			discard;
		}
	}
	float edge = smoothstep(-trim_w - 0.004, -trim_w, d);
	ALBEDO = mix(base, trim, edge);
	ROUGHNESS = rough;
	SPECULAR = 0.3;
}
