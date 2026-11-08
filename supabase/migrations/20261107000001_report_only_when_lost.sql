-- Los reportes de ubicación solo se aceptan mientras la mascota está en modo perdida.
create or replace function public.report_pet_location(
  p_public_id text, p_lat double precision default null, p_lng double precision default null,
  p_accuracy real default null, p_note text default null)
returns uuid language plpgsql security definer set search_path to 'public' as $function$
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

  select id into v_report from public.lost_pet_reports
   where pet_id = v_pet.id and ended_at is null;
  if v_report is null then raise exception 'not_lost'; end if;

  if (p_lat is null) <> (p_lng is null) then raise exception 'invalid_coordinates'; end if;
  if p_lat is not null and (p_lat not between -90 and 90 or p_lng not between -180 and 180) then
    raise exception 'invalid_coordinates';
  end if;
  if p_lat is null and v_note is null then raise exception 'empty_report'; end if;

  if (select count(*) from public.pet_locations
       where pet_id = v_pet.id and created_at > now() - interval '10 minutes') >= 10 then
    raise exception 'rate_limited';
  end if;

  insert into public.pet_locations(pet_id, lost_report_id, lat, lng, accuracy_m, note)
  values (v_pet.id, v_report, p_lat, p_lng, p_accuracy, v_note)
  returning id into v_loc;

  insert into public.pet_events(pet_id, event_type) values (v_pet.id, 'location_report');

  insert into public.notifications(user_id, type, title, body, pet_id)
  values (v_pet.owner_id, 'location_report',
          '📍 Alguien encontró a ' || v_pet.name,
          'Hay un nuevo reporte mientras está en modo perdida.',
          v_pet.id);

  return v_loc;
end $function$;
