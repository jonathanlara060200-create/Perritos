"""Estimación de filamento por pieza, color y placa a partir de los volúmenes reales de las mallas.

Modelo de laminado (aprox.): capa 0.2 mm, 2 paredes de 0.42 mm, 4 capas sólidas arriba y abajo,
relleno 15 % (base 10 %). Densidad PLA 1.24 g/cm³. Purga CFS ≈ 0.35 g por cambio de color.
"""
import json, pathlib
import numpy as np
import trimesh

HERE = pathlib.Path(__file__).parent; IMP = HERE / "impresion"
PL = json.load(open(IMP / "placas.json"))
DENS = 1.24e-3


def gramos(m, relleno):
    vol = abs(m.volume)                                   # mm³ sólido
    caja = m.bounds[1] - m.bounds[0]
    alto = max(caja[2], 0.2)
    if alto <= 2.0:                                       # relieves delgados: todo sólido
        return vol * DENS
    huella = vol / alto                                   # área en planta (aprox.)
    lateral = max(m.area - 2 * huella, 0)                 # superficie de las paredes
    paredes = min(lateral * 0.84, vol)                    # 2 perímetros × 0.42 mm
    tapas = min(huella * 1.6, max(vol - paredes, 0))      # 4 capas sólidas arriba + 4 abajo
    resto = max(vol - paredes - tapas, 0)
    return (paredes + tapas + resto * relleno) * DENS


por_color, por_placa = {}, {}
for n, info in PL["placas"].items():
    g_placa, cambios_capas = 0.0, 0
    for p in info["piezas"]:
        for f in (IMP / "stl" / p).glob("*.stl"):
            color = f.stem.split("__")[1]
            g = gramos(trimesh.load(f, process=False), 0.10 if p == "4_base" else 0.15)
            por_color[color] = por_color.get(color, 0) + g; g_placa += g
    # capas con más de un color ≈ altura de la zona de color / 0.2 mm; cambios = (colores-1) por capa
    zona_color = {"1": 1.4, "2": 2.2, "3": 4.6, "4": 1.0, "5": 0.8}[str(n)]
    cambios = int(zona_color / 0.2) * (len(info["colores"]) - 1)
    purga = cambios * 0.35
    por_placa[n] = dict(gramos_pieza=round(g_placa, 1), cambios_color=cambios, purga_g=round(purga, 1),
                        total_g=round(g_placa + purga, 1), horas_aprox=round((g_placa / 14.0) + cambios * 1.1 / 60, 1))
tot = sum(v["total_g"] for v in por_placa.values())
res = dict(por_color_g={k: round(v, 1) for k, v in sorted(por_color.items(), key=lambda x: -x[1])}, por_placa=por_placa,
           total_g=round(tot, 1), horas_total_aprox=round(sum(v["horas_aprox"] for v in por_placa.values()), 1),
           nota="Estimación; el dato real sale al laminar en Creality Print.")
json.dump(res, open(IMP / "material.json", "w"), indent=1, ensure_ascii=False)
print(json.dumps(res, indent=1, ensure_ascii=False))
