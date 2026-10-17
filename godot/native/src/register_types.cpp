// GDExtension の入り口（Godot が読み込むときに呼ぶ）
#include <gdextension_interface.h>
#include <godot_cpp/core/defs.hpp>
#include <godot_cpp/godot.hpp>
#include <godot_cpp/core/class_db.hpp>

using namespace godot;

void hs_register_classes();
void hs_cleanup();

static void initialize_hsnative(ModuleInitializationLevel p_level) {
	if (p_level != MODULE_INITIALIZATION_LEVEL_SCENE) return;
	hs_register_classes();
}
static void uninitialize_hsnative(ModuleInitializationLevel p_level) {
	if (p_level != MODULE_INITIALIZATION_LEVEL_SCENE) return;
	hs_cleanup(); // Godot の値を持つ使い回しの表を、Godot が終わる前に空にする
}

extern "C" {
GDExtensionBool GDE_EXPORT hsnative_init(GDExtensionInterfaceGetProcAddress p_get_proc_address, GDExtensionClassLibraryPtr p_library, GDExtensionInitialization *r_initialization) {
	godot::GDExtensionBinding::InitObject init_obj(p_get_proc_address, p_library, r_initialization);
	init_obj.register_initializer(initialize_hsnative);
	init_obj.register_terminator(uninitialize_hsnative);
	init_obj.set_minimum_library_initialization_level(MODULE_INITIALIZATION_LEVEL_SCENE);
	return init_obj.init();
}
}
