"""Escritor de 3MF en formato Bambu Studio / Orca / Creality Print.

Cada objeto se guarda como ensamble (componentes en 3D/Objects/object_N.model) y
Metadata/model_settings.config le asigna a cada pieza su filamento (extrusor =
ranura del CFS). Así Creality Print abre los colores ya asignados.
"""
import uuid, zipfile
import trimesh

CT = ('<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n'
      ' <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n'
      ' <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>\n'
      ' <Default Extension="png" ContentType="image/png"/>\n'
      ' <Default Extension="config" ContentType="text/xml"/>\n</Types>')
RELS = ('<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
        ' <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n'
        '</Relationships>')
NS = ('xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" '
      'xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" '
      'xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p"')


def _esc(s):
    return (s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;"))


def escribir_3mf(ruta, objetos, ranuras=None):
    """objetos: [{nombre, pos:(x,y), partes:[(nombre_parte, stl_o_malla, color_hex)]}]
    ranuras: {color_hex: n° de ranura CFS (1-4)}; si falta, se numeran por orden de aparición."""
    ranuras = dict(ranuras or {})
    for o in objetos:
        for _, _, c in o["partes"]:
            if c not in ranuras:
                ranuras[c] = len(set(ranuras.values())) + 1
    sig_id = 1
    archivos, raiz, build, cfg_obj, inst, rels = {}, [], [], [], [], []
    for k, o in enumerate(objetos, 1):
        sub, comps, partes_cfg = [], [], []
        for nombre, fuente, c in o["partes"]:
            m = trimesh.load(fuente) if isinstance(fuente, str) else fuente
            m = m.copy(); m.merge_vertices()
            F = m.faces
            ok = (F[:, 0] != F[:, 1]) & (F[:, 1] != F[:, 2]) & (F[:, 0] != F[:, 2])
            m.update_faces(ok)            # quita triángulos degenerados (lib3mf/Creality los rechazan)
            m.remove_unreferenced_vertices()
            pid = sig_id; sig_id += 1
            v = "".join(f'<vertex x="{a:.4f}" y="{b:.4f}" z="{z:.4f}"/>' for a, b, z in m.vertices)
            t = "".join(f'<triangle v1="{a}" v2="{b}" v3="{d}"/>' for a, b, d in m.faces)
            sub.append(f' <object id="{pid}" p:UUID="{uuid.uuid4()}" type="model">\n  <mesh>\n'
                       f'   <vertices>{v}</vertices>\n   <triangles>{t}</triangles>\n  </mesh>\n </object>')
            comps.append(f'<component p:path="/3D/Objects/object_{k}.model" objectid="{pid}" '
                         f'p:UUID="{uuid.uuid4()}" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>')
            partes_cfg.append(
                f'    <part id="{pid}" subtype="normal_part">\n'
                f'      <metadata key="name" value="{_esc(nombre)}"/>\n'
                f'      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>\n'
                f'      <metadata key="extruder" value="{ranuras[c]}"/>\n'
                f'      <mesh_stat face_count="{len(m.faces)}" edges_fixed="0" degenerate_facets="0" '
                f'facets_removed="0" facets_reversed="0" backwards_edges="0"/>\n    </part>')
        archivos[f"3D/Objects/object_{k}.model"] = (
            f'<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" {NS}>\n'
            ' <metadata name="BambuStudio:3mfVersion">1</metadata>\n <resources>\n'
            + "\n".join(sub) + '\n </resources>\n <build/>\n</model>')
        rels.append(f' <Relationship Target="/3D/Objects/object_{k}.model" Id="rel-{k}" '
                    'Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>')
        oid = sig_id; sig_id += 1
        raiz.append(f'  <object id="{oid}" p:UUID="{uuid.uuid4()}" type="model">\n   <components>\n    '
                    + "\n    ".join(comps) + '\n   </components>\n  </object>')
        x, y = o["pos"]
        build.append(f'  <item objectid="{oid}" p:UUID="{uuid.uuid4()}" '
                     f'transform="1 0 0 0 1 0 0 0 1 {x:.4f} {y:.4f} 0" printable="1"/>')
        primero = ranuras[o["partes"][0][2]]
        cfg_obj.append(f'  <object id="{oid}">\n    <metadata key="name" value="{_esc(o["nombre"])}"/>\n'
                       f'    <metadata key="extruder" value="{primero}"/>\n' + "\n".join(partes_cfg) + '\n  </object>')
        inst.append(f'    <model_instance>\n      <metadata key="object_id" value="{oid}"/>\n'
                    f'      <metadata key="instance_id" value="0"/>\n'
                    f'      <metadata key="identify_id" value="{1000 + k}"/>\n    </model_instance>')
    modelo = (f'<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="es-MX" {NS}>\n'
              ' <metadata name="Application">BambuStudio-02.00.00.00</metadata>\n'
              ' <metadata name="BambuStudio:3mfVersion">1</metadata>\n'
              ' <metadata name="Title">Ajolote de Bolsillo - esferas navidenas</metadata>\n'
              ' <metadata name="Designer">Ajolote de Bolsillo</metadata>\n'
              ' <resources>\n' + "\n".join(raiz) + '\n </resources>\n <build>\n'
              + "\n".join(build) + '\n </build>\n</model>')
    config = ('<?xml version="1.0" encoding="UTF-8"?>\n<config>\n' + "\n".join(cfg_obj) +
              '\n  <plate>\n    <metadata key="plater_id" value="1"/>\n    <metadata key="plater_name" value=""/>\n'
              '    <metadata key="locked" value="false"/>\n' + "\n".join(inst) + '\n  </plate>\n</config>')
    with zipfile.ZipFile(ruta, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CT)
        z.writestr("_rels/.rels", RELS)
        z.writestr("3D/3dmodel.model", modelo)
        z.writestr("3D/_rels/3dmodel.model.rels",
                   '<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
                   + "\n".join(rels) + '\n</Relationships>')
        for n, s in archivos.items():
            z.writestr(n, s)
        z.writestr("Metadata/model_settings.config", config)
    return ranuras
