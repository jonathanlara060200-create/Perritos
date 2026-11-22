-- =====================================================================
-- Límite de reportes de ubicación POR PERSONA (antes era por mascota: un bromista con 10 reportes
-- falsos cada 10 min bloqueaba los avisos reales).
--
-- Límites:
--   · Por persona y mascota: 3 reportes cada 10 minutos y 10 por día.
--   · Tope de seguridad por mascota: 200 reportes por día (solo contra inundaciones).
--
-- "Persona" = huella anónima que calcula el servidor: sha256(secreto + IP + mascota). Sin el secreto
-- no se puede saber la IP, así que seguimos sin guardar identidad ni IP.
--
-- Solo el servidor de la app puede reportar (la función exige el secreto 'reports'). La función vieja
-- deja de estar abierta al público, así nadie se salta el límite llamando a la API directo.
-- Después de correr esto, genera el secreto (ver README · "Secreto de reportes").
-- =====================================================================

alter table public.pet_locations add column if not exists reporter_hash text;
create index if not exists pet_locations_reporter_idx
  on public.pet_locations(pet_id, reporter_hash, created_at desc);

create or replace function public.report_pet_location_v2(
  p_secret        text,
  p_reporter_hash text,
  p_public_id     text,
  p_lat           double precision default null,
  p_lng           double precision default null,
  p_accuracy      real default null,
  p_note          text default null)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare
  v_hash   text;
  v_pet    public.pets%rowtype;
  v_allow  boolean;
  v_note   text := left(nullif(btrim(p_note), ''), 500);
  v_who    text := left(nullif(btrim(p_reporter_hash), ''), 128);
  v_report uuid;
  v_loc    uuid;
begin
  select secret_hash into v_hash from public.webhook_secrets where name = 'reports';
  if v_hash is null or v_hash <> encode(sha256(convert_to(coalesce(p_secret, ''), 'UTF8')), 'hex') then
    raise exception 'forbidden';
  end if;
  if v_who is null then raise exception 'forbidden'; end if;

  select * into v_pet from public.pets
   where public_id = lower(btrim(p_public_id)) and is_active;
  if not found then raise exception 'pet_not_found'; end if;

  select allow_location_reports into v_allow from public.pet_visibility where pet_id = v_pet.id;
  if not coalesce(v_allow, true) then raise exception 'reports_disabled'; end if;

  select id into v_report from public.lost_pet_reports
   where pet_id = v_pet.id and ended_at is null;
  if v_report is null then raise exception 'not_lost'; end if;

  if (p_lat is null) <> (p_lng is null) then raise exception 'invalid_coordinates'; end if;
  if p_lat is not null and (p_lat not between -90 and 90 or p_lng not between -180 and 180) then
    raise exception 'invalid_coordinates';
  end if;
  if p_lat is null and v_note is null then raise exception 'empty_report'; end if;

  -- Por persona
  if (select count(*) from public.pet_locations
       where pet_id = v_pet.id and reporter_hash = v_who and created_at > now() - interval '10 minutes') >= 3
  or (select count(*) from public.pet_locations
       where pet_id = v_pet.id and reporter_hash = v_who and created_at > now() - interval '1 day') >= 10 then
    raise exception 'rate_limited';
  end if;

  -- Tope de seguridad por mascota
  if (select count(*) from public.pet_locations
       where pet_id = v_pet.id and created_at > now() - interval '1 day') >= 200 then
    raise exception 'rate_limited';
  end if;

  insert into public.pet_locations(pet_id, lost_report_id, lat, lng, accuracy_m, note, reporter_hash)
  values (v_pet.id, v_report, p_lat, p_lng, p_accuracy, v_note, v_who)
  returning id into v_loc;

  insert into public.pet_events(pet_id, event_type) values (v_pet.id, 'location_report');

  insert into public.notifications(user_id, type, title, body, pet_id)
  values (v_pet.owner_id, 'location_report',
          '📍 Alguien encontró a ' || v_pet.name,
          'Hay un nuevo reporte mientras está en modo perdida.',
          v_pet.id);

  return v_loc;
end $$;

revoke execute on function public.report_pet_location_v2(text, text, text, double precision, double precision, real, text) from public;
grant  execute on function public.report_pet_location_v2(text, text, text, double precision, double precision, real, text) to anon, authenticated;

-- La versión sin límite por persona ya no se puede llamar desde la API.
revoke execute on function public.report_pet_location(text, double precision, double precision, real, text) from public, anon, authenticated;
