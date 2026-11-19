-- Los colores nuevos (negro, blanco, gris, madera) se AGREGAN a los pasteles, no los reemplazan.
-- Se reactivan las variantes pastel que 20261118000001 había desactivado.
update public.product_variants
   set is_active = true
 where color_name in ('Rosa', 'Rosa bajito', 'Amarillo', 'Azul cielo', 'Morado');
