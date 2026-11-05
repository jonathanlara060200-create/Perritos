-- =====================================================================
-- Hidratación · recordatorios programados (push web)
-- 1) hora del aviso de entrenamiento
-- 2) hyd_cron_due(): decide qué avisos tocan AHORA y los registra (una sola vez por horario)
-- 3) hyd_cron_drop_sub(): borra suscripciones push vencidas
-- El envío lo dispara una URL protegida (/api/hyd/cron) con un secreto cuyo hash vive en
-- webhook_secrets (name = 'hyd_cron'), el mismo patrón que el webhook de pagos: sin service_role.
-- =====================================================================

alter table public.hyd_reminder_prefs
  add column if not exists workout_time time not null default '18:00';

create or replace function public.hyd_check_cron_secret(p_secret text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.webhook_secrets
     where name = 'hyd_cron'
       and secret_hash = encode(sha256(convert_to(coalesce(p_secret, ''), 'UTF8')), 'hex'));
$$;
revoke all on function public.hyd_check_cron_secret(text) from public, anon, authenticated;

create or replace function public.hyd_cron_due(p_secret text, p_window_min integer default 30)
returns table(o_user_id uuid, o_kind text, o_title text, o_body text, o_subs jsonb)
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_win     interval := make_interval(mins => greatest(5, least(coalesce(p_window_min, 30), 120)));
  v_title   constant text := '💧 Hidratación';
  v_local   timestamp;  v_today date;  v_dow int;
  v_total   int;  v_pct int;  v_last timestamptz;  v_subs jsonb;
  v_slot    timestamp;  v_slot_ts timestamptz;  v_end timestamp;
  v_n int;  v_sent_day int;  v_body text;  v_tip text;
begin
  if not public.hyd_check_cron_secret(p_secret) then raise exception 'forbidden'; end if;

  for r in
    select p.user_id as uid, p.timezone as tz, p.daily_goal_ml as goal, p.wake_time as wake, p.sleep_time as sleep,
           q.morning_on, q.morning_time, q.day_on, q.first_time, q.every_hours,
           q.workout_on, q.workout_time, q.night_on, q.night_time, q.days
      from public.hyd_profiles p
      join public.hyd_reminder_prefs q on q.user_id = p.user_id
     where q.enabled
       and exists (select 1 from pg_timezone_names z where z.name = p.timezone)
       and exists (select 1 from public.hyd_push_subscriptions s where s.user_id = p.user_id)
  loop
    v_local := now() at time zone r.tz;
    v_today := v_local::date;
    v_dow   := extract(isodow from v_local)::int;
    if not (v_dow = any (r.days)) then continue; end if;

    select coalesce(sum(l.amount_ml), 0)::int, max(l.consumed_at) into v_total, v_last
      from public.hyd_logs l
     where l.user_id = r.uid and (l.consumed_at at time zone r.tz)::date = v_today;
    v_pct := case when r.goal > 0 then round(v_total * 100.0 / r.goal)::int else 0 end;
    select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)) into v_subs
      from public.hyd_push_subscriptions s where s.user_id = r.uid;

    -- MAÑANA: solo si todavía no registró agua hoy
    if r.morning_on and v_total = 0 then
      v_slot_ts := (v_today + r.morning_time) at time zone r.tz;
      if now() >= v_slot_ts and now() < v_slot_ts + v_win
         and not exists (select 1 from public.hyd_notification_log n where n.user_id = r.uid and n.kind = 'morning' and n.sent_at >= v_slot_ts) then
        v_body := '¡Buenos días! Comienza tu día con un vaso de agua y dale a tu cuerpo un buen comienzo.';
        insert into public.hyd_notification_log(user_id, kind, title, body) values (r.uid, 'morning', v_title, v_body);
        o_user_id := r.uid; o_kind := 'morning'; o_title := v_title; o_body := v_body; o_subs := v_subs;
        return next;
      end if;
    end if;

    -- DURANTE EL DÍA: cada N horas desde la primera hora, sin pasar de 1 h antes de dormir,
    -- sin insistir si ya cumplió su objetivo o si registró agua hace menos de una hora, máximo 8 al día
    if r.day_on and v_total < r.goal then
      v_end := v_today + r.sleep - interval '1 hour';
      if r.sleep <= r.wake then v_end := v_end + interval '1 day'; end if;
      select count(*)::int into v_sent_day from public.hyd_notification_log n
       where n.user_id = r.uid and n.kind = 'day' and n.sent_at >= (v_today::timestamp at time zone r.tz);
      for v_n in 0..15 loop
        v_slot := v_today + r.first_time + make_interval(hours => v_n * r.every_hours);
        exit when v_slot > v_end;
        continue when v_slot < v_today + r.wake;
        v_slot_ts := v_slot at time zone r.tz;
        if now() >= v_slot_ts and now() < v_slot_ts + v_win
           and v_sent_day < 8
           and (v_last is null or v_last < now() - interval '60 minutes')
           and not exists (select 1 from public.hyd_notification_log n where n.user_id = r.uid and n.kind = 'day' and n.sent_at >= v_slot_ts) then
          v_body := '¡Es momento de hacer una pausa! Recuerda hidratarte.';
          insert into public.hyd_notification_log(user_id, kind, title, body) values (r.uid, 'day', v_title, v_body);
          v_sent_day := v_sent_day + 1;
          o_user_id := r.uid; o_kind := 'day'; o_title := v_title; o_body := v_body; o_subs := v_subs;
          return next;
        end if;
      end loop;
    end if;

    -- ACTIVIDAD FÍSICA: a la hora en que suele terminar de entrenar
    if r.workout_on then
      v_slot_ts := (v_today + r.workout_time) at time zone r.tz;
      if now() >= v_slot_ts and now() < v_slot_ts + v_win
         and not exists (select 1 from public.hyd_notification_log n where n.user_id = r.uid and n.kind = 'workout' and n.sent_at >= v_slot_ts) then
        v_body := 'Después de tu entrenamiento, recuerda reponer los líquidos que perdiste.';
        insert into public.hyd_notification_log(user_id, kind, title, body) values (r.uid, 'workout', v_title, v_body);
        o_user_id := r.uid; o_kind := 'workout'; o_title := v_title; o_body := v_body; o_subs := v_subs;
        return next;
      end if;
    end if;

    -- NOCHE: resumen del día (sin presionar)
    if r.night_on then
      v_slot_ts := (v_today + r.night_time) at time zone r.tz;
      if now() >= v_slot_ts and now() < v_slot_ts + v_win
         and not exists (select 1 from public.hyd_notification_log n where n.user_id = r.uid and n.kind = 'night' and n.sent_at >= v_slot_ts) then
        v_tip := case
          when v_pct >= 100 then 'Cumpliste tu objetivo, ¡bien hecho!'
          when v_total = 0  then 'Si tomaste agua y no la anotaste, puedes registrarla cuando quieras.'
          when v_pct < 60   then 'Mañana puedes dejar tu termo a la vista para ir tomando poco a poco.'
          else 'Vas muy bien.' end;
        v_body := 'Este es tu resumen del día. Hoy registraste ' || to_char(v_total, 'FM9,999,999') || ' ml de agua ('
                  || v_pct || '% de tu objetivo). ' || v_tip || ' ¡Mañana seguimos construyendo buenos hábitos!';
        insert into public.hyd_notification_log(user_id, kind, title, body) values (r.uid, 'night', v_title, v_body);
        o_user_id := r.uid; o_kind := 'night'; o_title := v_title; o_body := v_body; o_subs := v_subs;
        return next;
      end if;
    end if;
  end loop;
end $$;

create or replace function public.hyd_cron_drop_sub(p_secret text, p_endpoint text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.hyd_check_cron_secret(p_secret) then raise exception 'forbidden'; end if;
  delete from public.hyd_push_subscriptions where endpoint = p_endpoint;
end $$;

revoke all on function public.hyd_cron_due(text, integer) from public;
revoke all on function public.hyd_cron_drop_sub(text, text) from public;
grant execute on function public.hyd_cron_due(text, integer) to anon, authenticated;
grant execute on function public.hyd_cron_drop_sub(text, text) to anon, authenticated;
