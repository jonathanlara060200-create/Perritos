-- =====================================================================
-- Nuevos colores de filamento (ELEGOO PLA): Negro, Blanco, Gris y Madera.
-- Sustituyen a los pasteles (azul cielo, amarillo, rosa bajito, morado) para clickers y placas.
-- · Los pasteles se siguen aceptando en la base de datos para no romper pedidos que ya existen,
--   pero el sitio solo ofrece los 4 nuevos.
-- · Las variantes de producto (colores de la placa) nuevas se crean y las pasteles se desactivan (no se borran,
--   porque hay pedidos que las referencian).
-- =====================================================================

create or replace function public.official_clicker_color(c text)
returns text language sql immutable as $$
  select case regexp_replace(lower(btrim(c)), '\s+', ' ', 'g')
    when 'negro'        then 'Negro'
    when 'blanco'       then 'Blanco'
    when 'gris'         then 'Gris'
    when 'madera'       then 'Madera'
    when 'color madera' then 'Madera'
    when 'cafe'         then 'Madera'
    when 'café'         then 'Madera'
    -- pasteles anteriores (solo pedidos existentes)
    when 'azul cielo' then 'Azul cielo'
    when 'azul'       then 'Azul cielo'
    when 'azul claro' then 'Azul cielo'
    when 'celeste'    then 'Azul cielo'
    when 'rosa bajito' then 'Rosa bajito'
    when 'rosa'        then 'Rosa bajito'
    when 'rosa claro'  then 'Rosa bajito'
    when 'rosa pastel' then 'Rosa bajito'
    when 'rosita'      then 'Rosa bajito'
    when 'amarillo'   then 'Amarillo'
    when 'morado'   then 'Morado'
    when 'lila'     then 'Morado'
    when 'lavanda'  then 'Morado'
    when 'violeta'  then 'Morado'
    when 'purpura'  then 'Morado'
    when 'púrpura'  then 'Morado'
    else null
  end
$$;

-- Clickers: base, tecla y letra aceptan los 4 nuevos (y los pasteles de pedidos viejos).
alter table public.custom_orders drop constraint if exists custom_orders_base_color_4;
alter table public.custom_orders drop constraint if exists custom_orders_key_color_4;
alter table public.custom_orders drop constraint if exists custom_orders_letter_color_4;

alter table public.custom_orders
  add constraint custom_orders_base_color_4
    check (base_color is null or base_color in ('Negro', 'Blanco', 'Gris', 'Madera', 'Azul cielo', 'Rosa bajito', 'Amarillo', 'Morado')),
  add constraint custom_orders_key_color_4
    check (key_color is null or key_color in ('Negro', 'Blanco', 'Gris', 'Madera', 'Azul cielo', 'Rosa bajito', 'Amarillo', 'Morado')),
  add constraint custom_orders_letter_color_4
    check (letter_color is null or letter_color in ('Negro', 'Blanco', 'Gris', 'Madera', 'Azul cielo', 'Rosa bajito', 'Amarillo', 'Morado'));

-- Placas: variantes de color nuevas en cada producto; las pasteles quedan desactivadas.
insert into public.product_variants (product_id, color_name, color_hex)
select p.id, c.name, c.hex
from public.products p
cross join (values
  ('Negro',  '#1F1F1F'),
  ('Blanco', '#F5F5F5'),
  ('Gris',   '#8E8E8E'),
  ('Madera', '#C9A66B')
) as c(name, hex)
on conflict (product_id, color_name) do update set color_hex = excluded.color_hex, is_active = true;

update public.product_variants
   set is_active = false
 where color_name not in ('Negro', 'Blanco', 'Gris', 'Madera');
