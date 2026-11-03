-- =====================================================================
-- Clickers: base, tecla y letra solo pueden ser los 4 colores de filamento.
-- Primero se arreglan los pedidos que ya existen (azul → Azul cielo, lila → Morado, etc.)
-- y después se pone el candado para que no entre ningún otro color.
-- Lo que no se reconoce (por ejemplo "verde") queda vacío para elegirlo de nuevo.
-- =====================================================================

create or replace function public.official_clicker_color(c text)
returns text language sql immutable as $$
  select case regexp_replace(lower(btrim(c)), '\s+', ' ', 'g')
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

update public.custom_orders
   set base_color   = public.official_clicker_color(base_color),
       key_color    = public.official_clicker_color(key_color),
       letter_color = public.official_clicker_color(letter_color);

alter table public.custom_orders drop constraint if exists custom_orders_base_color_4;
alter table public.custom_orders drop constraint if exists custom_orders_key_color_4;
alter table public.custom_orders drop constraint if exists custom_orders_letter_color_4;

alter table public.custom_orders
  add constraint custom_orders_base_color_4
    check (base_color is null or base_color in ('Azul cielo', 'Rosa bajito', 'Amarillo', 'Morado')),
  add constraint custom_orders_key_color_4
    check (key_color is null or key_color in ('Azul cielo', 'Rosa bajito', 'Amarillo', 'Morado')),
  add constraint custom_orders_letter_color_4
    check (letter_color is null or letter_color in ('Azul cielo', 'Rosa bajito', 'Amarillo', 'Morado'));

drop function public.official_clicker_color(text);
