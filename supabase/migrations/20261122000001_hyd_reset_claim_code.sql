-- Permite al admin generar un NUEVO código de activación para un llavero que aún no tiene dueño
-- (el código original solo se muestra una vez y se guarda con hash, así que no se puede "recuperar").
create or replace function public.hyd_admin_reset_claim_code(p_device_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_claim text := ''; b bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex'); i int; v hyd_devices%rowtype;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select * into v from hyd_devices where id = p_device_id for update;
  if not found then raise exception 'invalid_device'; end if;
  if v.owner_id is not null then raise exception 'device_has_owner'; end if;
  for i in 0..7 loop v_claim := v_claim || substr(alphabet, (get_byte(b, i) % 31) + 1, 1); end loop;
  insert into hyd_device_secrets(device_id, claim_code_hash, failed_attempts)
  values (v.id, encode(sha256(convert_to(v_claim, 'UTF8')), 'hex'), 0)
  on conflict (device_id) do update set claim_code_hash = excluded.claim_code_hash, failed_attempts = 0;
  return jsonb_build_object('device_id', v.id, 'code', v.code, 'claim_code', v_claim);
end $$;

revoke execute on function public.hyd_admin_reset_claim_code(uuid) from public, anon;
grant  execute on function public.hyd_admin_reset_claim_code(uuid) to authenticated;
