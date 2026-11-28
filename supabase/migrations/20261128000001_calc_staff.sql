-- Equipo de la calculadora 3D: personas que pueden usar SOLO la calculadora de precios
-- (sin ver pedidos, clientes, mascotas ni el resto del admin). Cada quien guarda sus
-- propios costos en su navegador.
-- Para dar acceso a alguien:  insert into public.calc_staff (user_id) values ('<uuid del usuario>');

create table if not exists public.calc_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.calc_staff enable row level security;
revoke all on public.calc_staff from anon;
create policy calc_staff_admin on public.calc_staff for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy calc_staff_self_read on public.calc_staff for select to authenticated using (user_id = auth.uid());

create or replace function public.is_calc_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.calc_staff where user_id = auth.uid());
$$;
revoke execute on function public.is_calc_staff() from anon;
