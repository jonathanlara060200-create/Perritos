-- =====================================================================
-- Configurador de placas: color de las letras + diseños A-D + 5 tipografías.
-- · Placa y letras solo pueden ser uno de los 4 filamentos (amarillo, morado, azul cielo, rosa bajito).
-- · Diseños: personalizada (A), misteriosa (B), navidad (C), huesito (D).
-- · Tipografías: clasica, moderna, redondeada, divertida, elegante.
-- Se reemplaza create_order (una sola función, con p_letter_color al final).
-- Requiere official_clicker_color() de 20261103000001_clicker_colors.sql.
-- =====================================================================

alter table public.tag_designs add column if not exists letter_color text;

drop function if exists public.create_order(uuid, uuid, text, text, text, jsonb, text, text, text, text, text);

create or replace function public.create_order(
  p_pet_id           uuid,
  p_variant_id       uuid,
  p_engraved_name    text,
  p_shipping_name    text,
  p_shipping_phone   text,
  p_shipping_address jsonb,
  p_customer_notes   text default null,
  p_silhouette       text default null,
  p_size_code        text default null,
  p_font             text default null,
  p_charm            text default null,   -- sin uso; se conserva por compatibilidad
  p_letter_color     text default null)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare
  v_variant public.product_variants%rowtype;
  v_product public.products%rowtype;
  v_pet_name text;
  v_price   numeric(10,2);
  v_order   uuid;
  v_item    uuid;
  v_size    numeric(6,2);
  v_plate   text;
  v_letters text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.owns_pet(p_pet_id) then raise exception 'not_your_pet'; end if;

  if p_silhouette is not null and p_silhouette not in ('personalizada','misteriosa','navidad','huesito') then
    raise exception 'invalid_silhouette';
  end if;
  if p_size_code is not null and p_size_code not in ('S','M','L') then raise exception 'invalid_size'; end if;
  if p_font is not null and p_font not in ('clasica','moderna','redondeada','divertida','elegante') then
    raise exception 'invalid_font';
  end if;
  v_size := case p_size_code when 'S' then 30 when 'M' then 38 when 'L' then 46 else null end;

  select * into v_variant from public.product_variants where id = p_variant_id and is_active;
  if not found then raise exception 'invalid_variant'; end if;
  select * into v_product from public.products where id = v_variant.product_id and is_active;
  if not found then raise exception 'invalid_product'; end if;
  select name into v_pet_name from public.pets where id = p_pet_id;

  -- El color de la placa (variante) y el de las letras deben ser filamentos reales.
  v_plate := public.official_clicker_color(v_variant.color_name);
  if v_plate is null then raise exception 'invalid_plate_color'; end if;
  if p_letter_color is not null and btrim(p_letter_color) <> '' then
    v_letters := public.official_clicker_color(p_letter_color);
    if v_letters is null then raise exception 'invalid_letter_color'; end if;
    if v_letters = v_plate then raise exception 'letter_color_same_as_plate'; end if;
  end if;

  v_price := v_product.base_price + v_variant.price_delta;

  insert into public.orders(customer_id, subtotal, total, currency,
                            shipping_name, shipping_phone, shipping_address, customer_notes)
  values (auth.uid(), v_price, v_price, v_product.currency,
          left(btrim(p_shipping_name), 120), left(btrim(p_shipping_phone), 30),
          p_shipping_address, left(nullif(btrim(p_customer_notes), ''), 1000))
  returning id into v_order;

  insert into public.order_items(order_id, product_id, variant_id, pet_id, unit_price)
  values (v_order, v_product.id, v_variant.id, p_pet_id, v_price)
  returning id into v_item;

  insert into public.tag_designs(order_item_id, engraved_name, pla_color, letter_color, dtf_uv,
                                 silhouette_type, size_code, width_mm, height_mm, font, charm)
  values (v_item,
          left(coalesce(nullif(btrim(p_engraved_name), ''), v_pet_name), 40),
          v_plate, v_letters, v_product.includes_dtf_uv,
          p_silhouette, p_size_code, v_size, v_size, p_font, null);

  return v_order;
end $$;

revoke execute on function public.create_order(uuid, uuid, text, text, text, jsonb, text, text, text, text, text, text) from public, anon;
grant  execute on function public.create_order(uuid, uuid, text, text, text, jsonb, text, text, text, text, text, text) to authenticated;
