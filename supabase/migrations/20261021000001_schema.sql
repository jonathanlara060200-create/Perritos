-- =====================================================================
-- AJolote ID · Esquema base
-- Ejecutar en orden: 000001 (esquema) → 000002 (RLS) → 000003 (funciones)
-- =====================================================================

-- ---------- Tipos ----------
create type public.user_role      as enum ('customer', 'admin');
create type public.pet_species    as enum ('dog', 'cat', 'other');
create type public.pet_sex        as enum ('male', 'female', 'unknown');
create type public.tag_status     as enum ('available','reserved','in_production','produced','shipped','active','lost','deactivated','replaced');
create type public.order_status   as enum ('pending_payment','paid','info_pending','design_pending','design_approved','in_production','ready','shipped','delivered','cancelled');
create type public.payment_status as enum ('pending','paid','failed','refunded');
create type public.pet_event_type as enum ('profile_view','location_report','lost_mode_on','lost_mode_off');

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- profiles ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text check (char_length(full_name) <= 120),
  phone       text check (char_length(phone) <= 30),
  role        public.user_role not null default 'customer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- pets ----------
create table public.pets (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles(id) on delete cascade,
  public_id        text not null unique,
  name             text not null check (char_length(name) between 1 and 60),
  species          public.pet_species not null default 'dog',
  breed            text check (char_length(breed) <= 80),
  sex              public.pet_sex not null default 'unknown',
  birth_date       date check (birth_date is null or birth_date <= current_date),
  weight_kg        numeric(5,2) check (weight_kg is null or weight_kg > 0),
  color            text check (char_length(color) <= 80),
  description      text check (char_length(description) <= 1000),
  main_photo_path  text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index pets_owner_idx on public.pets(owner_id);
create trigger pets_updated before update on public.pets
  for each row execute function public.set_updated_at();

-- public_id permanente: slug-nombre + 8 hex aleatorios. No se puede cambiar por UPDATE.
create or replace function public.pets_before_write()
returns trigger language plpgsql as $$
declare
  v_slug text;
begin
  if tg_op = 'INSERT' then
    v_slug := regexp_replace(
                translate(lower(new.name), 'áéíóúüñàèìòù', 'aeiouunaeiou'),
                '[^a-z0-9]+', '', 'g');
    if v_slug = '' then v_slug := 'mascota'; end if;
    new.public_id := left(v_slug, 20) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  else
    new.public_id := old.public_id;
    new.owner_id  := old.owner_id;
  end if;
  return new;
end $$;
create trigger pets_before_write before insert or update on public.pets
  for each row execute function public.pets_before_write();

create table public.pet_photos (
  id            uuid primary key default gen_random_uuid(),
  pet_id        uuid not null references public.pets(id) on delete cascade,
  storage_path  text not null,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index pet_photos_pet_idx on public.pet_photos(pet_id);

create table public.pet_contacts (
  id             uuid primary key default gen_random_uuid(),
  pet_id         uuid not null references public.pets(id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 80),
  relationship   text check (char_length(relationship) <= 60),
  phone          text check (char_length(phone) <= 30),
  whatsapp       text check (char_length(whatsapp) <= 30),
  email          text check (char_length(email) <= 160),
  is_primary     boolean not null default false,
  show_phone     boolean not null default false,
  show_whatsapp  boolean not null default true,
  show_email     boolean not null default false,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  constraint contact_has_channel check (phone is not null or whatsapp is not null or email is not null)
);
create index pet_contacts_pet_idx on public.pet_contacts(pet_id);
create unique index pet_contacts_one_primary on public.pet_contacts(pet_id) where is_primary;

create table public.pet_emergency_info (
  pet_id         uuid primary key references public.pets(id) on delete cascade,
  allergies      text[] not null default '{}',
  sensitivities  text[] not null default '{}',
  behavior       text[] not null default '{}',
  special_care   text check (char_length(special_care) <= 1000),
  medications    text check (char_length(medications) <= 1000),
  vet_info       text check (char_length(vet_info) <= 1000),
  updated_at     timestamptz not null default now()
);
create trigger pet_emergency_updated before update on public.pet_emergency_info
  for each row execute function public.set_updated_at();

-- Qué ve el público (el dueño decide)
create table public.pet_visibility (
  pet_id                 uuid primary key references public.pets(id) on delete cascade,
  show_photo             boolean not null default true,
  show_breed             boolean not null default true,
  show_description       boolean not null default true,
  show_allergies         boolean not null default true,
  show_sensitivities     boolean not null default true,
  show_behavior          boolean not null default true,
  show_special_care      boolean not null default true,
  show_medications       boolean not null default false,
  show_vet_info          boolean not null default false,
  show_reward            boolean not null default true,
  allow_location_reports boolean not null default true,
  updated_at             timestamptz not null default now()
);
create trigger pet_visibility_updated before update on public.pet_visibility
  for each row execute function public.set_updated_at();

-- Al crear mascota: filas por defecto
create or replace function public.pets_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.pet_visibility(pet_id) values (new.id);
  insert into public.pet_emergency_info(pet_id) values (new.id);
  return new;
end $$;
create trigger pets_after_insert after insert on public.pets
  for each row execute function public.pets_after_insert();

-- ---------- Modo perdida y reportes ----------
create table public.lost_pet_reports (
  id                     uuid primary key default gen_random_uuid(),
  pet_id                 uuid not null references public.pets(id) on delete cascade,
  lost_at                timestamptz not null default now(),
  started_at             timestamptz not null default now(),
  ended_at               timestamptz,
  resolution             text check (resolution in ('found','cancelled')),
  last_seen_lat          double precision check (last_seen_lat between -90 and 90),
  last_seen_lng          double precision check (last_seen_lng between -180 and 180),
  last_seen_description  text check (char_length(last_seen_description) <= 500),
  extra_info             text check (char_length(extra_info) <= 1000),
  reward_amount          numeric(10,2) check (reward_amount is null or reward_amount >= 0),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint lost_end_has_resolution check ((ended_at is null) = (resolution is null))
);
create index lost_reports_pet_idx on public.lost_pet_reports(pet_id);
create unique index lost_one_active_per_pet on public.lost_pet_reports(pet_id) where ended_at is null;
create trigger lost_reports_updated before update on public.lost_pet_reports
  for each row execute function public.set_updated_at();

-- Reportes de ubicación de quien encuentra. NO se guarda IP ni identidad.
create table public.pet_locations (
  id              uuid primary key default gen_random_uuid(),
  pet_id          uuid not null references public.pets(id) on delete cascade,
  lost_report_id  uuid references public.lost_pet_reports(id) on delete set null,
  lat             double precision check (lat between -90 and 90),
  lng             double precision check (lng between -180 and 180),
  accuracy_m      real check (accuracy_m is null or accuracy_m >= 0),
  note            text check (char_length(note) <= 500),
  created_at      timestamptz not null default now(),
  constraint location_or_note check ((lat is not null and lng is not null) or note is not null)
);
create index pet_locations_pet_idx on public.pet_locations(pet_id, created_at desc);

-- Eventos anónimos para métricas (sin datos personales)
create table public.pet_events (
  id          bigint generated always as identity primary key,
  pet_id      uuid not null references public.pets(id) on delete cascade,
  event_type  public.pet_event_type not null,
  source      text check (source in ('nfc','qr')),
  created_at  timestamptz not null default now()
);
create index pet_events_pet_idx  on public.pet_events(pet_id, created_at desc);
create index pet_events_type_idx on public.pet_events(event_type, created_at desc);

-- ---------- Placas físicas ----------
create sequence public.tag_code_seq start 1;

create table public.tags (
  id               uuid primary key default gen_random_uuid(),
  tag_code         text not null unique default ('AJB-' || lpad(nextval('public.tag_code_seq')::text, 6, '0')),
  pet_id           uuid references public.pets(id) on delete set null,
  owner_id         uuid references public.profiles(id) on delete set null,
  status           public.tag_status not null default 'available',
  model            text not null default 'AJolote ID',
  color            text,
  material         text not null default 'PLA',
  version          text not null default 'v1',
  dtf_uv           boolean not null default false,
  nfc_uid          text unique,
  nfc_written_at   timestamptz,
  nfc_locked       boolean not null default false,
  activated_at     timestamptz,
  replaces_tag_id  uuid references public.tags(id) on delete set null,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index tags_pet_idx   on public.tags(pet_id);
create index tags_owner_idx on public.tags(owner_id);
create trigger tags_updated before update on public.tags
  for each row execute function public.set_updated_at();

-- Código de activación (hash). Solo admin y funciones security definer lo ven.
create table public.tag_secrets (
  tag_id           uuid primary key references public.tags(id) on delete cascade,
  claim_code_hash  text not null,
  failed_attempts  int not null default 0
);

-- ---------- Catálogo ----------
create table public.products (
  id               uuid primary key default gen_random_uuid(),
  sku              text not null unique,
  name             text not null,
  description      text,
  base_price       numeric(10,2) not null check (base_price >= 0),
  currency         text not null default 'MXN',
  includes_dtf_uv  boolean not null default false,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger products_updated before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_variants (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  color_name   text not null,
  color_hex    text not null check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  price_delta  numeric(10,2) not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (product_id, color_name)
);

-- ---------- Pedidos ----------
create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      bigint generated always as identity unique,
  customer_id       uuid not null references public.profiles(id) on delete restrict,
  status            public.order_status not null default 'pending_payment',
  subtotal          numeric(10,2) not null check (subtotal >= 0),
  shipping_cost     numeric(10,2) not null default 0 check (shipping_cost >= 0),
  total             numeric(10,2) not null check (total >= 0),
  currency          text not null default 'MXN',
  shipping_name     text,
  shipping_phone    text,
  shipping_address  jsonb,
  tracking_number   text,
  shipping_carrier  text,
  shipped_at        timestamptz,
  delivered_at      timestamptz,
  customer_notes    text check (char_length(customer_notes) <= 1000),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index orders_customer_idx on public.orders(customer_id, created_at desc);
create index orders_status_idx   on public.orders(status);
create trigger orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete restrict,
  variant_id  uuid references public.product_variants(id) on delete set null,
  pet_id      uuid references public.pets(id) on delete set null,
  tag_id      uuid references public.tags(id) on delete set null,
  unit_price  numeric(10,2) not null check (unit_price >= 0),
  created_at  timestamptz not null default now()
);
create index order_items_order_idx on public.order_items(order_id);

-- Datos de fabricación
create table public.tag_designs (
  id               uuid primary key default gen_random_uuid(),
  order_item_id    uuid not null unique references public.order_items(id) on delete cascade,
  tag_id           uuid references public.tags(id) on delete set null,
  silhouette_type  text,
  width_mm         numeric(6,2) check (width_mm is null or width_mm > 0),
  height_mm        numeric(6,2) check (height_mm is null or height_mm > 0),
  thickness_mm     numeric(5,2) check (thickness_mm is null or thickness_mm > 0),
  pla_color        text,
  engraved_name    text check (char_length(engraved_name) <= 40),
  dtf_uv           boolean not null default false,
  design_file_path text,
  stl_path         text,
  threemf_path     text,
  notes            text,
  approved_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger tag_designs_updated before update on public.tag_designs
  for each row execute function public.set_updated_at();

create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  provider      text not null default 'manual',
  provider_ref  text,
  amount        numeric(10,2) not null check (amount >= 0),
  status        public.payment_status not null default 'pending',
  paid_at       timestamptz,
  raw           jsonb,
  created_at    timestamptz not null default now()
);
create index payments_order_idx on public.payments(order_id);

-- ---------- Soporte ----------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  pet_id      uuid references public.pets(id) on delete cascade,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

create table public.admin_notes (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null,
  entity_id    uuid not null,
  author_id    uuid references public.profiles(id) on delete set null,
  note         text not null check (char_length(note) between 1 and 2000),
  created_at   timestamptz not null default now()
);
create index admin_notes_entity_idx on public.admin_notes(entity_type, entity_id);

create table public.audit_logs (
  id           bigint generated always as identity primary key,
  actor_id     uuid,
  action       text not null,
  entity_type  text not null,
  entity_id    text,
  diff         jsonb,
  created_at   timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
create index audit_logs_created_idx on public.audit_logs(created_at desc);

create table public.app_settings (
  key         text primary key,
  value       text not null default '',
  updated_at  timestamptz not null default now()
);

-- =====================================================================
-- Triggers de negocio
-- =====================================================================

-- Perfil automático al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nadie se sube el rol a sí mismo (desde el SQL Editor auth.uid() es null y sí se permite)
create or replace function public.profiles_protect_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'forbidden_role_change';
  end if;
  return new;
end $$;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.profiles_protect_role();

-- Auditoría: guarda quién y SOLO las columnas que cambiaron
create or replace function public.log_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_row  jsonb;
  v_diff jsonb := '{}'::jsonb;
begin
  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(n.key, n.value), '{}'::jsonb) into v_diff
    from jsonb_each(to_jsonb(new)) n
    where to_jsonb(old) -> n.key is distinct from n.value;
    v_diff := v_diff - 'updated_at';
    if v_diff = '{}'::jsonb then return new; end if;
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, diff)
  values (auth.uid(), lower(tg_op), tg_table_name,
          coalesce(v_row ->> 'id', v_row ->> 'pet_id', v_row ->> 'key'), v_diff);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger audit_pets          after insert or update or delete on public.pets              for each row execute function public.log_audit();
create trigger audit_contacts      after insert or update or delete on public.pet_contacts      for each row execute function public.log_audit();
create trigger audit_emergency     after update                     on public.pet_emergency_info for each row execute function public.log_audit();
create trigger audit_visibility    after update                     on public.pet_visibility     for each row execute function public.log_audit();
create trigger audit_lost          after insert or update or delete on public.lost_pet_reports  for each row execute function public.log_audit();
create trigger audit_tags          after insert or update or delete on public.tags              for each row execute function public.log_audit();
create trigger audit_orders        after insert or update           on public.orders             for each row execute function public.log_audit();
create trigger audit_products      after insert or update or delete on public.products          for each row execute function public.log_audit();
create trigger audit_variants      after insert or update or delete on public.product_variants  for each row execute function public.log_audit();
create trigger audit_profiles      after update                     on public.profiles           for each row execute function public.log_audit();
create trigger audit_settings      after insert or update           on public.app_settings       for each row execute function public.log_audit();

-- Eventos de modo perdida
create or replace function public.lost_report_events()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.pet_events(pet_id, event_type) values (new.pet_id, 'lost_mode_on');
  elsif old.ended_at is null and new.ended_at is not null then
    insert into public.pet_events(pet_id, event_type) values (new.pet_id, 'lost_mode_off');
  end if;
  return new;
end $$;
create trigger lost_report_events after insert or update on public.lost_pet_reports
  for each row execute function public.lost_report_events();

-- Avisar al cliente cuando cambia el estado de su pedido
create or replace function public.order_status_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_label text;
begin
  if new.status is distinct from old.status then
    v_label := case new.status
      when 'paid'            then 'Pago recibido'
      when 'info_pending'    then 'Necesitamos más información'
      when 'design_pending'  then 'Estamos preparando tu diseño'
      when 'design_approved' then 'Diseño aprobado'
      when 'in_production'   then 'Tu placa está en producción'
      when 'ready'           then 'Tu placa está lista'
      when 'shipped'         then 'Tu pedido va en camino'
      when 'delivered'       then 'Pedido entregado'
      when 'cancelled'       then 'Pedido cancelado'
      else 'Actualización de tu pedido' end;
    insert into public.notifications(user_id, type, title, body)
    values (new.customer_id, 'order_status', v_label, 'Pedido #' || new.order_number);
  end if;
  return new;
end $$;
create trigger order_status_notify after update on public.orders
  for each row execute function public.order_status_notify();
