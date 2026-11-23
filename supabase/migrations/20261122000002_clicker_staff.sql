-- Equipo de clickers: personas que pueden ver, agregar y editar SOLO pedidos de clickers
-- (sin borrar, sin ver llaveros, mascotas, placas ni el resto del admin).
-- Para dar acceso a alguien:  insert into public.clicker_staff (user_id) values ('<uuid del usuario>');

create table if not exists public.clicker_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  can_delete boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.clicker_staff enable row level security;
revoke all on public.clicker_staff from anon;
create policy clicker_staff_admin on public.clicker_staff for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy clicker_staff_self_read on public.clicker_staff for select to authenticated using (user_id = auth.uid());

create or replace function public.is_clicker_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.clicker_staff where user_id = auth.uid());
$$;
revoke execute on function public.is_clicker_staff() from anon;

create policy custom_orders_clicker_staff_select on public.custom_orders
  for select to authenticated using (public.is_clicker_staff() and item_type = 'clicker');
create policy custom_orders_clicker_staff_insert on public.custom_orders
  for insert to authenticated with check (public.is_clicker_staff() and item_type = 'clicker');
create policy custom_orders_clicker_staff_update on public.custom_orders
  for update to authenticated using (public.is_clicker_staff() and item_type = 'clicker')
  with check (public.is_clicker_staff() and item_type = 'clicker');
