-- Pagos en línea (Mercado Pago). El webhook no tiene sesión de usuario, así que llama a
-- esta función con un secreto compartido; en la base solo se guarda su hash.

create table if not exists public.webhook_secrets (
  name        text primary key,
  secret_hash text not null
);
alter table public.webhook_secrets enable row level security;
-- Sin políticas: nadie lo lee desde la API; solo las funciones security definer.

create or replace function public.confirm_online_payment(
  p_secret       text,
  p_order_id     uuid,
  p_provider     text,
  p_provider_ref text,
  p_amount       numeric,
  p_raw          jsonb default null)
returns text language plpgsql volatile security definer set search_path = public as $$
declare
  v_hash  text;
  v_order public.orders%rowtype;
begin
  select secret_hash into v_hash from public.webhook_secrets where name = 'payments';
  if v_hash is null or v_hash <> encode(sha256(convert_to(coalesce(p_secret, ''), 'UTF8')), 'hex') then
    return 'forbidden';
  end if;

  if exists (select 1 from public.payments where provider = p_provider and provider_ref = p_provider_ref) then
    return 'duplicate';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then return 'order_not_found'; end if;
  if v_order.status <> 'pending_payment' then return 'not_pending'; end if;
  if p_amount < v_order.total then return 'amount_mismatch'; end if;

  insert into public.payments(order_id, provider, provider_ref, amount, status, paid_at, raw)
  values (p_order_id, p_provider, p_provider_ref, p_amount, 'paid', now(), p_raw);

  update public.orders set status = 'paid' where id = p_order_id;
  return 'ok';
end $$;

revoke execute on function public.confirm_online_payment(text, uuid, text, text, numeric, jsonb) from public;
grant  execute on function public.confirm_online_payment(text, uuid, text, text, numeric, jsonb) to anon, authenticated;
