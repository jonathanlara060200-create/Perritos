-- =====================================================================
-- Hidratación · módulo base (perfiles, registros de agua, llaveros NFC,
-- recordatorios, logros). REFERENCIA: ya está aplicada en producción
-- (2026-11-04, "hydration_module"). Es idempotente: se puede volver a correr.
-- Todo es por usuario (RLS). El admin solo gestiona llaveros.
-- =====================================================================

create table if not exists public.hyd_profiles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  bottle_ml     integer not null default 950  check (bottle_ml between 100 and 5000),
  daily_goal_ml integer not null default 2000 check (daily_goal_ml between 500 and 10000),
  wake_time     time not null default '07:00',
  sleep_time    time not null default '23:00',
  timezone      text not null default 'America/Mexico_City',
  does_sport    boolean not null default false,   -- solo contexto; nunca fija objetivos médicos
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.hyd_devices (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique default ('HY-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  label        text,
  status       text not null default 'available' check (status in ('available','active','disabled')),
  owner_id     uuid references auth.users(id) on delete set null,
  claimed_at   timestamptz,
  last_seen_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists hyd_devices_owner_idx on public.hyd_devices(owner_id);

-- El código de activación solo se guarda con hash (se ve una vez al crear el llavero).
create table if not exists public.hyd_device_secrets (
  device_id       uuid primary key references public.hyd_devices(id) on delete cascade,
  claim_code_hash text not null,
  failed_attempts integer not null default 0
);

create table if not exists public.hyd_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  amount_ml   integer not null check (amount_ml between 1 and 10000),   -- NUNCA limitado al termo
  consumed_at timestamptz not null default now(),
  source      text not null default 'manual' check (source in ('manual','bottle','quick','nfc')),
  device_id   uuid references public.hyd_devices(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists hyd_logs_user_time_idx on public.hyd_logs(user_id, consumed_at desc);

create table if not exists public.hyd_reminder_prefs (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  enabled       boolean not null default false,
  morning_on    boolean not null default true,
  morning_time  time not null default '07:00',
  day_on        boolean not null default true,
  first_time    time not null default '10:00',
  every_hours   integer not null default 3 check (every_hours between 1 and 8),
  workout_on    boolean not null default false,
  night_on      boolean not null default true,
  night_time    time not null default '21:30',
  days          integer[] not null default '{1,2,3,4,5,6,7}',   -- 1 = lunes … 7 = domingo
  updated_at    timestamptz not null default now()
);

create table if not exists public.hyd_push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists hyd_push_user_idx on public.hyd_push_subscriptions(user_id);

create table if not exists public.hyd_notification_log (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind    text not null check (kind in ('morning','day','workout','night','test')),
  title   text,
  body    text,
  status  text not null default 'sent',
  sent_at timestamptz not null default now()
);
create index if not exists hyd_notif_user_idx on public.hyd_notification_log(user_id, sent_at desc);

create table if not exists public.hyd_achievements (
  user_id   uuid not null references auth.users(id) on delete cascade,
  code      text not null check (code in ('first_log','goal_reached','streak_3','streak_7','first_month')),
  earned_at timestamptz not null default now(),
  primary key (user_id, code)
);

-- updated_at automático
drop trigger if exists hyd_profiles_updated on public.hyd_profiles;
create trigger hyd_profiles_updated before update on public.hyd_profiles for each row execute function public.set_updated_at();
drop trigger if exists hyd_logs_updated on public.hyd_logs;
create trigger hyd_logs_updated before update on public.hyd_logs for each row execute function public.set_updated_at();
drop trigger if exists hyd_reminder_prefs_updated on public.hyd_reminder_prefs;
create trigger hyd_reminder_prefs_updated before update on public.hyd_reminder_prefs for each row execute function public.set_updated_at();

-- ---------- RLS: cada persona solo ve y edita lo suyo ----------
alter table public.hyd_profiles          enable row level security;
alter table public.hyd_devices           enable row level security;
alter table public.hyd_device_secrets    enable row level security;
alter table public.hyd_logs              enable row level security;
alter table public.hyd_reminder_prefs    enable row level security;
alter table public.hyd_push_subscriptions enable row level security;
alter table public.hyd_notification_log  enable row level security;
alter table public.hyd_achievements      enable row level security;

drop policy if exists hyd_profiles_own on public.hyd_profiles;
create policy hyd_profiles_own on public.hyd_profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists hyd_logs_own on public.hyd_logs;
create policy hyd_logs_own on public.hyd_logs for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and amount_ml between 1 and 10000 and consumed_at <= now() + interval '5 minutes');

drop policy if exists hyd_prefs_own on public.hyd_reminder_prefs;
create policy hyd_prefs_own on public.hyd_reminder_prefs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists hyd_push_own on public.hyd_push_subscriptions;
create policy hyd_push_own on public.hyd_push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists hyd_notif_read on public.hyd_notification_log;
create policy hyd_notif_read on public.hyd_notification_log for select to authenticated using (user_id = auth.uid());

drop policy if exists hyd_ach_read on public.hyd_achievements;
create policy hyd_ach_read on public.hyd_achievements for select to authenticated using (user_id = auth.uid());

drop policy if exists hyd_devices_read on public.hyd_devices;
create policy hyd_devices_read on public.hyd_devices for select to authenticated using (owner_id = auth.uid() or public.is_admin());
drop policy if exists hyd_devices_admin on public.hyd_devices;
create policy hyd_devices_admin on public.hyd_devices for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists hyd_secrets_admin on public.hyd_device_secrets;
create policy hyd_secrets_admin on public.hyd_device_secrets for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Funciones ----------
create or replace function public.hyd_ensure_profile()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into hyd_profiles(user_id) values (auth.uid()) on conflict do nothing;
  insert into hyd_reminder_prefs(user_id) values (auth.uid()) on conflict do nothing;
end $$;

create or replace function public.hyd_award(p_uid uuid)
returns text[] language plpgsql security definer set search_path = public as $$
declare
  v_tz text; v_today date; v_goal int; v_total int; v_streak int := 0; v_new text[] := '{}'; c text; v_ins int;
begin
  select timezone, daily_goal_ml into v_tz, v_goal from hyd_profiles where user_id = p_uid;
  if not found then return v_new; end if;
  v_today := (now() at time zone v_tz)::date;
  select coalesce(sum(amount_ml),0) into v_total from hyd_logs
   where user_id = p_uid and (consumed_at at time zone v_tz)::date = v_today;

  with d as (select distinct (consumed_at at time zone v_tz)::date as dd from hyd_logs where user_id = p_uid),
       g as (select dd, dd - (row_number() over (order by dd))::int as grp from d)
  select count(*) into v_streak from g
   where grp = (select grp from g order by dd desc limit 1)
     and (select max(dd) from d) >= v_today - 1;

  for c in
    select t.code from (values
      ('first_log', exists(select 1 from hyd_logs where user_id = p_uid)),
      ('goal_reached', v_total >= v_goal),
      ('streak_3', v_streak >= 3),
      ('streak_7', v_streak >= 7),
      ('first_month', coalesce((select min(consumed_at) from hyd_logs where user_id = p_uid) <= now() - interval '30 days', false))
    ) as t(code, ok) where t.ok
  loop
    insert into hyd_achievements(user_id, code) values (p_uid, c) on conflict do nothing;
    get diagnostics v_ins = row_count;
    if v_ins > 0 then v_new := v_new || c; end if;
  end loop;
  return v_new;
end $$;

create or replace function public.hyd_log_water(
  p_amount integer, p_at timestamptz default null, p_source text default 'manual', p_device_code text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_at timestamptz; v_dev uuid; v_id uuid; v_tz text; v_total int; v_new text[];
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_amount is null or p_amount < 1 or p_amount > 10000 then raise exception 'invalid_amount'; end if;
  if p_source not in ('manual','bottle','quick','nfc') then p_source := 'manual'; end if;
  v_at := coalesce(p_at, now());
  if v_at > now() + interval '5 minutes' then raise exception 'future_date'; end if;
  if v_at < now() - interval '60 days' then raise exception 'too_old'; end if;

  perform hyd_ensure_profile();
  if p_device_code is not null then
    select id into v_dev from hyd_devices
     where code = upper(btrim(p_device_code)) and owner_id = v_uid and status = 'active';
    if v_dev is not null then update hyd_devices set last_seen_at = now() where id = v_dev; end if;
  end if;

  insert into hyd_logs(user_id, amount_ml, consumed_at, source, device_id)
  values (v_uid, p_amount, v_at, p_source, v_dev) returning id into v_id;

  select timezone into v_tz from hyd_profiles where user_id = v_uid;
  select coalesce(sum(amount_ml),0) into v_total from hyd_logs
   where user_id = v_uid and (consumed_at at time zone v_tz)::date = (now() at time zone v_tz)::date;
  v_new := hyd_award(v_uid);
  return jsonb_build_object('id', v_id, 'today_total_ml', v_total, 'new_achievements', to_jsonb(v_new));
end $$;

create or replace function public.hyd_daily(p_from date, p_to date)
returns table(day date, total_ml bigint, entries bigint)
language sql stable set search_path = public as $$
  select (l.consumed_at at time zone p.timezone)::date as day, sum(l.amount_ml)::bigint as total_ml, count(*)::bigint as entries
    from hyd_logs l join hyd_profiles p on p.user_id = l.user_id
   where l.user_id = auth.uid()
     and (l.consumed_at at time zone p.timezone)::date between p_from and p_to
   group by 1 order by 1
$$;

create or replace function public.hyd_admin_create_device(p_label text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_claim text := ''; b bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex'); i int; v_dev hyd_devices%rowtype;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  for i in 0..7 loop v_claim := v_claim || substr(alphabet, (get_byte(b, i) % 31) + 1, 1); end loop;
  insert into hyd_devices(label) values (nullif(btrim(p_label),'')) returning * into v_dev;
  insert into hyd_device_secrets(device_id, claim_code_hash)
  values (v_dev.id, encode(sha256(convert_to(v_claim, 'UTF8')), 'hex'));
  return jsonb_build_object('device_id', v_dev.id, 'code', v_dev.code, 'claim_code', v_claim);
end $$;

create or replace function public.hyd_claim_device(p_code text, p_claim_code text)
returns text language plpgsql security definer set search_path = public as $$
declare v hyd_devices%rowtype; s hyd_device_secrets%rowtype; v_hash text;
begin
  if auth.uid() is null then return 'not_authenticated'; end if;
  select * into v from hyd_devices where code = upper(btrim(p_code)) for update;
  if not found then return 'invalid_device'; end if;
  select * into s from hyd_device_secrets where device_id = v.id for update;
  if not found then return 'invalid_device'; end if;
  if s.failed_attempts >= 10 then return 'device_locked'; end if;
  if v.status <> 'available' then return 'device_not_claimable'; end if;
  v_hash := encode(sha256(convert_to(upper(btrim(p_claim_code)), 'UTF8')), 'hex');
  if v_hash <> s.claim_code_hash then
    update hyd_device_secrets set failed_attempts = failed_attempts + 1 where device_id = v.id;
    return 'invalid_code';
  end if;
  update hyd_devices set owner_id = auth.uid(), status = 'active', claimed_at = now() where id = v.id;
  update hyd_device_secrets set failed_attempts = 0 where device_id = v.id;
  perform hyd_ensure_profile();
  return 'ok';
end $$;

create or replace function public.hyd_device_lookup(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v hyd_devices%rowtype;
begin
  select * into v from hyd_devices where code = upper(btrim(p_code));
  if not found then return jsonb_build_object('state','invalid'); end if;
  if v.status = 'disabled' then return jsonb_build_object('state','disabled'); end if;
  if v.status = 'available' then return jsonb_build_object('state','available'); end if;
  if auth.uid() is not null and v.owner_id = auth.uid() then
    return jsonb_build_object('state','mine','device_id',v.id,'label',v.label);
  end if;
  return jsonb_build_object('state','taken');
end $$;

create or replace function public.hyd_release_device(p_device_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  update hyd_devices set owner_id = null, status = 'disabled'
   where id = p_device_id and owner_id = auth.uid();
end $$;

-- ---------- Permisos de las funciones ----------
revoke execute on function public.hyd_award(uuid) from public, anon, authenticated;   -- solo la usa hyd_log_water
revoke execute on function public.hyd_ensure_profile() from public, anon;
revoke execute on function public.hyd_log_water(integer, timestamptz, text, text) from public, anon;
revoke execute on function public.hyd_daily(date, date) from public, anon;
revoke execute on function public.hyd_admin_create_device(text) from public, anon;
revoke execute on function public.hyd_claim_device(text, text) from public, anon;
revoke execute on function public.hyd_release_device(uuid) from public, anon;
grant  execute on function public.hyd_ensure_profile() to authenticated;
grant  execute on function public.hyd_log_water(integer, timestamptz, text, text) to authenticated;
grant  execute on function public.hyd_daily(date, date) to authenticated;
grant  execute on function public.hyd_admin_create_device(text) to authenticated;
grant  execute on function public.hyd_claim_device(text, text) to authenticated;
grant  execute on function public.hyd_release_device(uuid) to authenticated;
grant  execute on function public.hyd_device_lookup(text) to anon, authenticated;
