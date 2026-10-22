-- =====================================================================
-- AJolote ID · Funciones RPC
-- =====================================================================

-- ---------------------------------------------------------------------
-- PÚBLICA: perfil de mascota (lo que ve quien escanea). Lista blanca de campos.
-- ---------------------------------------------------------------------
create or replace function public.get_public_pet(p_public_id text, p_source text default null, p_log boolean default true)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_pet      public.pets%rowtype;
  v_vis      public.pet_visibility%rowtype;
  v_emg      public.pet_emergency_info%rowtype;
  v_lost     public.lost_pet_reports%rowtype;
  v_contacts jsonb;
  v_source   text := case when p_source in ('n','nfc') then 'nfc' when p_source in ('q','qr') then 'qr' else null end;
begin
  select * into v_pet from public.pets
   where public_id = lower(btrim(p_public_id)) and is_active;
  if not found then return null; end if;

  select * into v_vis  from public.pet_visibility     where pet_id = v_pet.id;
  select * into v_emg  from public.pet_emergency_info where pet_id = v_pet.id;
  select * into v_lost from public.lost_pet_reports   where pet_id = v_pet.id and ended_at is null;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'name',         c.name,
             'relationship', c.relationship,
             'is_primary',   c.is_primary,
             'phone',        case when c.show_phone    then c.phone    end,
             'whatsapp',     case when c.show_whatsapp then c.whatsapp end,
             'email',        case when c.show_email    then c.email    end)
           order by c.is_primary desc, c.sort_order, c.created_at), '[]'::jsonb)
    into v_contacts
    from public.pet_contacts c
   where c.pet_id = v_pet.id
     and ((c.show_phone and c.phone is not null)
       or (c.show_whatsapp and c.whatsapp is not null)
       or (c.show_email and c.email is not null));

  if p_log then
    insert into public.pet_events(pet_id, event_type, source)
    values (v_pet.id, 'profile_view', v_source);
  end if;

  return jsonb_build_object(
    'public_id',   v_pet.public_id,
    'name',        v_pet.name,
    'species',     v_pet.species,
    'breed',       case when v_vis.show_breed       then v_pet.breed       end,
    'description', case when v_vis.show_description then v_pet.description end,
    'photo_path',  case when v_vis.show_photo       then v_pet.main_photo_path end,
    'is_lost',     v_lost.id is not null,
    'allow_location_reports', v_vis.allow_location_reports,
    'lost', case when v_lost.id is null then null else jsonb_build_object(
        'lost_at',               v_lost.lost_at,
        'last_seen_description', v_lost.last_seen_description,
        'extra_info',            v_lost.extra_info,
        'reward_amount',         case when v_vis.show_reward then v_lost.reward_amount end) end,
    'emergency', jsonb_build_object(
        'allergies',     case when v_vis.show_allergies     then to_jsonb(v_emg.allergies)     else '[]'::jsonb end,
        'sensitivities', case when v_vis.show_sensitivities then to_jsonb(v_emg.sensitivities) else '[]'::jsonb end,
        'behavior',      case when v_vis.show_behavior      then to_jsonb(v_emg.behavior)      else '[]'::jsonb end,
        'special_care',  case when v_vis.show_special_care  then v_emg.special_care end,
        'medications',   case when v_vis.show_medications   then v_emg.medications  end,
        'vet_info',      case when v_vis.show_vet_info      then v_emg.vet_info     end),
    'contacts', v_contacts
  );
end $$;

-- ---------------------------------------------------------------------
-- PÚBLICA: reportar ubicación / avistamiento. No guarda identidad ni IP.
-- ---------------------------------------------------------------------
create or replace function public.report_pet_location(
  p_public_id text,
  p_lat       double precision default null,
  p_lng       double precision default null,
  p_accuracy  real default null,
  p_note      text default null)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare
  v_pet    public.pets%rowtype;
  v_allow  boolean;
  v_note   text := left(nullif(btrim(p_note), ''), 500);
  v_report uuid;
  v_loc    uuid;
begin
  select * into v_pet from public.pets
   where public_id = lower(btrim(p_public_id)) and is_active;
  if not found then raise exception 'pet_not_found'; end if;

  select allow_location_reports into v_allow from public.pet_visibility where pet_id = v_pet.id;
  if not coalesce(v_allow, true) then raise exception 'reports_disabled'; end if;

  if (p_lat is null) <> (p_lng is null) then raise exception 'invalid_coordinates'; end if;
  if p_lat is not null and (p_lat not between -90 and 90 or p_lng not between -180 and 180) then
    raise exception 'invalid_coordinates';
  end if;
  if p_lat is null and v_note is null then raise exception 'empty_report'; end if;

  if (select count(*) from public.pet_locations
       where pet_id = v_pet.id and created_at > now() - interval '10 minutes') >= 10 then
    raise exception 'rate_limited';
  end if;

  select id into v_report from public.lost_pet_reports
   where pet_id = v_pet.id and ended_at is null;

  insert into public.pet_locations(pet_id, lost_report_id, lat, lng, accuracy_m, note)
  values (v_pet.id, v_report, p_lat, p_lng, p_accuracy, v_note)
  returning id into v_loc;

  insert into public.pet_events(pet_id, event_type) values (v_pet.id, 'location_report');

  insert into public.notifications(user_id, type, title, body, pet_id)
  values (v_pet.owner_id, 'location_report',
          '📍 Alguien encontró a ' || v_pet.name,
          case when v_report is not null then 'Hay un nuevo reporte mientras está en modo perdida.'
               else 'Alguien reportó dónde la vio.' end,
          v_pet.id);

  return v_loc;
end $$;

-- ---------------------------------------------------------------------
-- DUEÑO: activar placa con código de activación. Devuelve un código de estado
-- (no lanza error en intentos fallidos para que el contador se guarde).
-- ---------------------------------------------------------------------
create or replace function public.claim_tag(p_tag_code text, p_claim_code text, p_pet_id uuid)
returns text language plpgsql volatile security definer set search_path = public as $$
declare
  v_tag    public.tags%rowtype;
  v_secret public.tag_secrets%rowtype;
  v_hash   text;
begin
  if auth.uid() is null then return 'not_authenticated'; end if;
  if not public.owns_pet(p_pet_id) then return 'not_your_pet'; end if;

  select * into v_tag from public.tags where tag_code = upper(btrim(p_tag_code)) for update;
  if not found then return 'invalid_tag'; end if;

  select * into v_secret from public.tag_secrets where tag_id = v_tag.id for update;
  if not found then return 'invalid_tag'; end if;
  if v_secret.failed_attempts >= 10 then return 'tag_locked'; end if;

  if v_tag.status not in ('produced', 'shipped', 'reserved', 'in_production') then
    return 'tag_not_claimable';
  end if;

  v_hash := encode(sha256(convert_to(upper(btrim(p_claim_code)), 'UTF8')), 'hex');
  if v_hash <> v_secret.claim_code_hash then
    update public.tag_secrets set failed_attempts = failed_attempts + 1 where tag_id = v_tag.id;
    return 'invalid_code';
  end if;

  if v_tag.pet_id is not null and v_tag.pet_id <> p_pet_id then
    return 'tag_assigned_to_other_pet';
  end if;

  update public.tags
     set pet_id = p_pet_id, owner_id = auth.uid(), status = 'active', activated_at = now()
   where id = v_tag.id;
  update public.tag_secrets set failed_attempts = 0 where tag_id = v_tag.id;
  return 'ok';
end $$;

-- ---------------------------------------------------------------------
-- DUEÑO: desactivar o marcar como perdida su placa
-- ---------------------------------------------------------------------
create or replace function public.owner_set_tag_status(p_tag_id uuid, p_status public.tag_status)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_status not in ('lost', 'deactivated', 'active') then raise exception 'invalid_status'; end if;
  update public.tags set status = p_status
   where id = p_tag_id and owner_id = auth.uid() and status in ('active', 'lost', 'deactivated');
  if not found then raise exception 'tag_not_found'; end if;
end $$;

-- ---------------------------------------------------------------------
-- DUEÑO: crear pedido. El precio sale SIEMPRE de la base de datos.
-- ---------------------------------------------------------------------
create or replace function public.create_order(
  p_pet_id           uuid,
  p_variant_id       uuid,
  p_engraved_name    text,
  p_shipping_name    text,
  p_shipping_phone   text,
  p_shipping_address jsonb,
  p_customer_notes   text default null)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare
  v_variant public.product_variants%rowtype;
  v_product public.products%rowtype;
  v_pet_name text;
  v_price   numeric(10,2);
  v_order   uuid;
  v_item    uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.owns_pet(p_pet_id) then raise exception 'not_your_pet'; end if;

  select * into v_variant from public.product_variants where id = p_variant_id and is_active;
  if not found then raise exception 'invalid_variant'; end if;
  select * into v_product from public.products where id = v_variant.product_id and is_active;
  if not found then raise exception 'invalid_product'; end if;
  select name into v_pet_name from public.pets where id = p_pet_id;

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

  insert into public.tag_designs(order_item_id, engraved_name, pla_color, dtf_uv)
  values (v_item,
          left(coalesce(nullif(btrim(p_engraved_name), ''), v_pet_name), 40),
          v_variant.color_name,
          v_product.includes_dtf_uv);

  return v_order;
end $$;

-- ---------------------------------------------------------------------
-- ADMIN: métricas
-- ---------------------------------------------------------------------
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  r jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;

  select jsonb_build_object(
    'users',                (select count(*) from public.profiles),
    'pets',                 (select count(*) from public.pets),
    'tags_active',          (select count(*) from public.tags where status = 'active'),
    'lost_active',          (select count(*) from public.lost_pet_reports where ended_at is null),
    'orders_open',          (select count(*) from public.orders where status not in ('delivered', 'cancelled')),
    'revenue',              (select coalesce(sum(amount), 0) from public.payments where status = 'paid'),
    'views_total',          (select count(*) from public.pet_events where event_type = 'profile_view'),
    'views_30d',            (select count(*) from public.pet_events where event_type = 'profile_view' and created_at > now() - interval '30 days'),
    'nfc_30d',              (select count(*) from public.pet_events where event_type = 'profile_view' and source = 'nfc' and created_at > now() - interval '30 days'),
    'qr_30d',               (select count(*) from public.pet_events where event_type = 'profile_view' and source = 'qr'  and created_at > now() - interval '30 days'),
    'location_reports_30d', (select count(*) from public.pet_locations where created_at > now() - interval '30 days'),
    'lost_closed',          (select count(*) from public.lost_pet_reports where ended_at is not null),
    'recovered',            (select count(*) from public.lost_pet_reports where resolution = 'found'),
    'top_pets',             (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
                               select p.name, p.public_id, count(*) as views
                                 from public.pet_events e join public.pets p on p.id = e.pet_id
                                where e.event_type = 'profile_view' and e.created_at > now() - interval '30 days'
                                group by p.id order by views desc limit 5) t),
    'orders_by_status',     (select coalesce(jsonb_object_agg(status, c), '{}'::jsonb) from (
                               select status, count(*) c from public.orders group by status) s)
  ) into r;
  return r;
end $$;

-- =====================================================================
-- Permisos de ejecución (por defecto Supabase da execute a anon: lo cerramos)
-- =====================================================================
revoke execute on function public.get_public_pet(text, text, boolean)                                  from public;
revoke execute on function public.report_pet_location(text, double precision, double precision, real, text) from public;
revoke execute on function public.claim_tag(text, text, uuid)                                 from public, anon;
revoke execute on function public.owner_set_tag_status(uuid, public.tag_status)               from public, anon;
revoke execute on function public.create_order(uuid, uuid, text, text, text, jsonb, text)     from public, anon;
revoke execute on function public.admin_stats()                                               from public, anon;

grant execute on function public.get_public_pet(text, text, boolean)                                   to anon, authenticated;
grant execute on function public.report_pet_location(text, double precision, double precision, real, text) to anon, authenticated;
grant execute on function public.claim_tag(text, text, uuid)                                  to authenticated;
grant execute on function public.owner_set_tag_status(uuid, public.tag_status)                to authenticated;
grant execute on function public.create_order(uuid, uuid, text, text, text, jsonb, text)      to authenticated;
grant execute on function public.admin_stats()                                                to authenticated;
