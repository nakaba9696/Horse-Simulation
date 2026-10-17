// Variant（GDScript の値）を JS と同じ意味で読む小物（godot/core/hs_u.gd の or_・truthy と同じ）
#pragma once
#include <cmath>
#include <godot_cpp/variant/variant.hpp>
#include <godot_cpp/variant/string.hpp>
#include <godot_cpp/variant/dictionary.hpp>
#include <godot_cpp/variant/array.hpp>

namespace hs {

inline bool is_num(const godot::Variant &v) { auto t = v.get_type(); return t == godot::Variant::FLOAT || t == godot::Variant::INT; }
// JS の !!v
inline bool truthy(const godot::Variant &v) {
	switch (v.get_type()) {
		case godot::Variant::NIL: return false;
		case godot::Variant::BOOL: return (bool)v;
		case godot::Variant::INT: return (int64_t)v != 0;
		case godot::Variant::FLOAT: { double d = v; return d != 0.0 && !std::isnan(d); }
		case godot::Variant::STRING: return !((godot::String)v).is_empty();
		default: return true;
	}
}
// JS の (v || d) を数で（v が数でなく真なら、その数に直したもの）
inline double num_or(const godot::Variant &v, double d) {
	if (!truthy(v)) return d;
	if (is_num(v)) return (double)v;
	if (v.get_type() == godot::Variant::BOOL) return 1.0;
	return d;
}
inline double num_or(double v, double d) { return (v != 0.0 && !std::isnan(v)) ? v : d; }
// 文字か（"左" など。UTF-8 で書いた文字と比べる）
inline bool is_str(const godot::Variant &v, const char *s) {
	auto t = v.get_type();
	if (t != godot::Variant::STRING && t != godot::Variant::STRING_NAME) return false;
	return (godot::String)v == godot::String::utf8(s);
}
inline godot::Variant dget(const godot::Dictionary &d, const char *k) { return d.get(godot::String(k), godot::Variant()); }
inline godot::String U8(const char *s) { return godot::String::utf8(s); }

} // namespace hs
