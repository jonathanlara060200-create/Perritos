// ============================================================
//  Esfera navideña plana MODULAR — BASE de stock
//  Ajolote de Bolsillo · Guadalajara · diseño 100% propio
//
//  Se imprime BOCA ABAJO: la cara visible queda en z = 0 (sobre
//  la cama PEI texturizada) => acabado parejo y sin soportes.
//  El modelo ya viene espejeado para que, al voltearlo, la
//  decoración se vea correcta de frente.
//
//  Decoración = incrustación a ras (0.6 mm) en 2.º color (CFS).
//  Si se imprime en un solo color, queda como grabado táctil:
//  todos los trazos miden <= 2.5 mm, así que el puente es corto.
//
//  Uso:
//    openscad -D 'variante="copos"' -D 'parte="base"' -o base.stl esfera_base.scad
//    variante: "lisa" | "copos" | "pino" | "rayas"
//    parte:    "base" | "deco" | "todo"   (todo = vista previa a color)
// ============================================================

variante = "copos";
parte    = "todo";

// ---------- Medidas principales ----------
D          = 80;    // diámetro del disco
T          = 4;     // grosor total
argolla_d  = 4;     // agujero para colgar
argolla_ext= 11;    // diámetro exterior de la argolla
argolla_y  = 48;    // centro del agujero (desde el centro del disco)
casq_w     = 20;    // casquillo (la "tapita" de la esfera)
casq_y0    = 35;
casq_y1    = 45;

// ---------- Rebaje para el nombre ----------
rebaje_prof = 0.6;  // profundidad
rebaje_L    = 74;   // largo del óvalo (estadio)
rebaje_H    = 24;   // alto del óvalo
rebaje_y    = 0;    // posición vertical

// ---------- Decoración ----------
deco_prof = 0.6;    // espesor de la incrustación
trazo     = 1.2;    // grosor de línea de copos
margen    = 3;      // margen de la deco al borde del disco
zona_libre= rebaje_H/2 + 2;  // franja libre alrededor del rebaje

$fn = 96;
eps = 0.01;

// ============================================================
//  2D
// ============================================================
module contorno() {
    difference() {
        union() {
            circle(d = D);
            translate([-casq_w/2, casq_y0])
                offset(r = 1.5) offset(delta = -1.5)
                    square([casq_w, casq_y1 - casq_y0]);
            translate([0, argolla_y]) circle(d = argolla_ext);
        }
        translate([0, argolla_y]) circle(d = argolla_d);
    }
}

module estadio(L, H) {
    hull() for (s = [-1, 1]) translate([s * (L/2 - H/2), 0]) circle(d = H);
}

module rebaje2d() { translate([0, rebaje_y]) estadio(rebaje_L, rebaje_H); }

// segmento redondeado entre dos puntos
module linea(p1, p2, w) { hull() { translate(p1) circle(d = w, $fn = 24);
                                   translate(p2) circle(d = w, $fn = 24); } }

// área donde se permite decorar (disco con margen, sin franja del nombre)
module zona_deco() {
    difference() {
        circle(r = D/2 - margen);
        translate([-D, -zona_libre]) square([2*D, 2*zona_libre]);
    }
}

// ranuras del casquillo (detalle que llevan todas las decoradas)
module ranuras_casquillo() {
    for (y = [38, 41.5]) linea([-7, y], [7, y], 1.0);
}

// ---------------- Copo de nieve (6 brazos, diseño propio) ----------------
module copo(s, w = trazo) {
    r = s/2;
    for (i = [0:5]) rotate(i * 60) {
        linea([0, 0], [0, r], w);
        for (k = [0.45, 0.72]) {
            b = r * (k == 0.45 ? 0.30 : 0.22);
            linea([0, r*k], [ b*0.8, r*k + b*0.7], w*0.9);
            linea([0, r*k], [-b*0.8, r*k + b*0.7], w*0.9);
        }
    }
    circle(d = w * 2.2, $fn = 6);
}

module deco_copos_todo() {
    for (p = [[0, 26, 14], [-21, 20, 10], [21, 20, 10],
              [0, -26, 14], [-20, -21, 10], [20, -21, 10]])
        translate([p[0], p[1]]) copo(p[2]);
    // copitos-punto
    for (p = [[-11, 33], [11, 33], [-30, 17], [30, 17],
              [-10, -34], [10, -34], [-29, -17], [29, -17]])
        translate(p) copo(4.5, 0.9);
}

// ---------------- Pino estilo suéter (chevrones) ----------------
module estrella(r) {
    polygon([for (i = [0:9]) let(a = 90 + i*36, rr = (i % 2 == 0) ? r : r*0.45)
             [rr * cos(a), rr * sin(a)]]);
}
module pino(h, w_trazo = 1.4, con_estrella = true) {
    // h = altura del follaje; base en y = 0
    tronco_h = h * 0.16;
    n = 5;
    translate([-h*0.07, -tronco_h]) square([h*0.14, tronco_h + 1]);
    for (i = [0:n-1]) {
        y  = i * h / (n + 0.4);
        hw = (h * 0.48) * (1 - i / (n + 0.6));
        linea([-hw, y], [0, y + h * 0.26], w_trazo);
        linea([ hw, y], [0, y + h * 0.26], w_trazo);
    }
    if (con_estrella) translate([0, h * 1.02]) estrella(h * 0.12);
}
module deco_pino() {
    translate([0, 17]) pino(15);               // pino grande arriba
    for (x = [-18, 0, 18])                     // fila de pinitos abajo
        translate([x, (x == 0 ? -31 : -28.5)]) pino(x == 0 ? 12 : 10, 1.2, false);
    for (p = [[-20, 24], [20, 24], [-27, 17], [27, 17], [-14, 31], [14, 31]])
        translate(p) circle(d = 2.2, $fn = 24);   // esferitas/nieve
}

// ---------------- Rayas tipo suéter ----------------
module zigzag(y0, amp, periodo, w) {
    for (x = [-42 : periodo : 42 - periodo]) {
        linea([x, y0], [x + periodo/2, y0 + amp], w);
        linea([x + periodo/2, y0 + amp], [x + periodo, y0], w);
    }
}
module banda_sueter() {
    translate([-45, 15.2]) square([90, 2]);          // raya lisa
    zigzag(19.6, 4.2, 6, 1.3);                        // zigzag
    for (x = [-42 : 6 : 42]) translate([x, 28.8]) rotate(45) square(2.3, center = true); // rombos
    translate([-45, 31.6]) square([90, 1.4]);         // raya fina
}
module deco_rayas() {
    intersection() {
        zona_deco();
        union() { banda_sueter(); mirror([0, 1]) banda_sueter(); }
    }
}

module deco2d() {
    intersection() {
        circle(r = D/2 - margen + 0.01);
        union() {
            if (variante == "copos") deco_copos_todo();
            if (variante == "pino")  deco_pino();
            if (variante == "rayas") deco_rayas();
        }
    }
    if (variante != "lisa") ranuras_casquillo();
}

// ============================================================
//  3D  (espejo en X porque la cara visible va hacia la cama)
// ============================================================
module base3d() {
    difference() {
        linear_extrude(T) contorno();
        translate([0, 0, -eps]) linear_extrude(rebaje_prof + eps) rebaje2d();
        translate([0, 0, -eps]) linear_extrude(deco_prof + eps)
            difference() { deco2d(); rebaje2d(); }
    }
}
module deco3d() {
    linear_extrude(deco_prof) difference() { deco2d(); rebaje2d(); }
}

mirror([1, 0, 0]) {
    if (parte == "base" || parte == "todo") color("#B3121B") base3d();
    if ((parte == "deco" || parte == "todo") && variante != "lisa")
        color("#F4F1EA") deco3d();
}
