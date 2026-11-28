-- Catálogo compartido de la calculadora 3D: fichas de producto (nombre, foto, gramos, horas,
-- colores, precio final, mayoreo, notas). Lo ven y editan el admin y el equipo de la calculadora;
-- solo el admin puede borrar.

create table if not exists public.calc_products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  photo_path text,
  job jsonb not null default '{}'::jsonb,
  colors text[] not null default '{}',
  notes text,
  final_price numeric(10,2),
  wholesale text,
  suggested_price numeric(10,2),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.calc_products enable row level security;
revoke all on public.calc_products from anon;

create policy calc_products_select on public.calc_products for select to authenticated
  using (public.is_admin() or public.is_calc_staff());
create policy calc_products_insert on public.calc_products for insert to authenticated
  with check (public.is_admin() or public.is_calc_staff());
create policy calc_products_update on public.calc_products for update to authenticated
  using (public.is_admin() or public.is_calc_staff())
  with check (public.is_admin() or public.is_calc_staff());
create policy calc_products_delete on public.calc_products for delete to authenticated
  using (public.is_admin());

-- Fotos de las fichas: lectura pública por URL; subir/borrar solo admin o equipo de la calculadora.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('calc-photos', 'calc-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy calc_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'calc-photos' and (public.is_admin() or public.is_calc_staff()));
create policy calc_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'calc-photos' and (public.is_admin() or public.is_calc_staff()));
create policy calc_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'calc-photos' and (public.is_admin() or public.is_calc_staff()));
