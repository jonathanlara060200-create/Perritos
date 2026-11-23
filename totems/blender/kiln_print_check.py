"""Ejecuta tools/print_check.py de Blender Kiln (MIT) con Blender como módulo de Python (bpy).

Uso: python3 totems/blender/kiln_print_check.py <archivos.stl ...> --process fdm [--json salida.json]
"""
import runpy, sys
import bpy  # noqa: F401  (habilita mathutils)
KILN = "/home/user/ext/blender-kiln/plugin/tools/print_check.py"
sys.argv = [KILN, "--"] + sys.argv[1:]
runpy.run_path(KILN, run_name="__main__")
