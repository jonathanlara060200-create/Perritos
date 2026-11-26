// ============================================================
//  Esfera navideña plana MODULAR — NOMBRE (pieza aparte)
//  Ajolote de Bolsillo · Guadalajara
//
//  Pieza única = placa ovalada de 0.6 mm (embona en el rebaje de
//  la base con 0.2 mm de holgura por lado) + letras cursivas de
//  2.5 mm encima. Se imprime tal cual (placa en la cama), sin
//  soportes. Con CFS: placa de un color y letras de otro, con un
//  solo cambio de filamento a z = 0.6 mm.
//
//  Fuente: Pacifico (SIL Open Font License 1.1) en ./fuentes
//
//  Lo normal es NO usar este archivo a mano: generar.py mide el
//  nombre y calcula "tam", "dx" y "dy" para que quepa.
// ============================================================

use <fuentes/Pacifico-Regular.ttf>

nombre  = "Sofía";
tam     = 12;     // tamaño de fuente (mm)  -> lo calcula generar.py
dx      = 0;      // corrección de centrado -> lo calcula generar.py
dy      = 0;
parte   = "todo"; // "placa" | "letras" | "todo" | "medir"

// ---- deben coincidir con esfera_base.scad ----
rebaje_prof = 0.6;
rebaje_L    = 74;
rebaje_H    = 24;
holgura     = 0.2;   // por lado

letra_esp   = 2.5;   // grosor de las letras (sobresalen de la base)
placa_esp   = rebaje_prof;

$fn = 96;

module estadio(L, H) {
    hull() for (s = [-1, 1]) translate([s * (L/2 - H/2), 0]) circle(d = H);
}

module texto2d(t = tam) {
    translate([dx, dy])
        text(nombre, size = t, font = "Pacifico", halign = "center",
             valign = "baseline", $fn = 48);
}

if (parte == "medir") {
    linear_extrude(1) texto2d(10);
} else {
    if (parte == "placa" || parte == "todo")
        color("#F4F1EA") linear_extrude(placa_esp)
            estadio(rebaje_L - 2*holgura, rebaje_H - 2*holgura);
    if (parte == "letras" || parte == "todo")
        color("#1E6B3A") translate([0, 0, placa_esp - 0.01])
            linear_extrude(letra_esp + 0.01) texto2d();
}
