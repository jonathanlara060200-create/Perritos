-- =====================================================================
-- AJolote ID · Row Level Security + Storage
-- =====================================================================

-- ---------- Helpers (security definer para evitar recursión en policies) ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.owns_pet(p_pet_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pets where id = p_pet_id and owner_id = auth.uid());
$$;

create or replace function public.owns_order(p_order_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.orders where id = p_order_id and customer_id = auth.uid());
$$;

-- ---------- Activar RLS en TODO ----------
alter table public.profiles           enable row level security;
alter table public.pets               enable row level security;
alter table public.pet_photos         enable row level security;
alter table public.pet_contacts       enable row level security;
alter table public.pet_emergency_info enable row level security;
alter table public.pet_visibility     enable row level security;
alter table public.lost_pet_reports   enable row level security;
alter table public.pet_locations      enable row level security;
alter table public.pet_events         enable row level security;
alter table public.tags               enable row level security;
alter table public.tag_secrets        enable row level security;
alter table public.tag_designs        enable row level security;
alter table public.products           enable row level security;
alter table public.product_variants   enable row level security;
alter table public.orders             enable row level security;
alter table public.order_items        enable row level security;
alter table public.payments           enable row level security;
alter table public.notifications      enable row level security;
alter table public.admin_notes        enable row level security;
alter table public.audit_logs         enable row level security;
alter table public.app_settings       enable row level security;

-- ---------- profiles ----------
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- pets y tablas hijas ----------
create policy pets_owner on public.pets for all to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy pet_photos_owner on public.pet_photos for all to authenticated
  using (public.owns_pet(pet_id) or public.is_admin())
  with check (public.owns_pet(pet_id) or public.is_admin());

create policy pet_contacts_owner on public.pet_contacts for all to authenticated
  using (public.owns_pet(pet_id) or public.is_admin())
  with check (public.owns_pet(pet_id) or public.is_admin());

create policy pet_emergency_owner on public.pet_emergency_info for all to authenticated
  using (public.owns_pet(pet_id) or public.is_admin())
  with check (public.owns_pet(pet_id) or public.is_admin());

create policy pet_visibility_owner on public.pet_visibility for all to authenticated
  using (public.owns_pet(pet_id) or public.is_admin())
  with check (public.owns_pet(pet_id) or public.is_admin());

create policy lost_reports_owner on public.lost_pet_reports for all to authenticated
  using (public.owns_pet(pet_id) or public.is_admin())
  with check (public.owns_pet(pet_id) or public.is_admin());

-- Solo lectura (los reportes entran por la función report_pet_location)
create policy pet_locations_read on public.pet_locations for select to authenticated
  using (public.owns_pet(pet_id) or public.is_admin());
create policy pet_locations_delete on public.pet_locations for delete to authenticated
  using (public.owns_pet(pet_id) or public.is_admin());

create policy pet_events_read on public.pet_events for select to authenticated
  using (public.owns_pet(pet_id) or public.is_admin());

-- ---------- tags ----------
create policy tags_read on public.tags for select to authenticated
  using (owner_id = auth.uid() or public.owns_pet(pet_id) or public.is_admin());
create policy tags_admin_write on public.tags for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy tag_secrets_admin on public.tag_secrets for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- catálogo ----------
create policy products_read on public.products for select to anon, authenticated
  using (is_active or public.is_admin());
create policy products_admin on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy variants_read on public.product_variants for select to anon, authenticated
  using (is_active or public.is_admin());
create policy variants_admin on public.product_variants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- pedidos (el cliente solo lee; crea con create_order()) ----------
create policy orders_read on public.orders for select to authenticated
  using (customer_id = auth.uid() or public.is_admin());
create policy orders_admin_write on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy order_items_read on public.order_items for select to authenticated
  using (public.owns_order(order_id) or public.is_admin());
create policy order_items_admin on public.order_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy tag_designs_read on public.tag_designs for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.order_items oi
    where oi.id = order_item_id and public.owns_order(oi.order_id)));
create policy tag_designs_admin on public.tag_designs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy payments_read on public.payments for select to authenticated
  using (public.owns_order(order_id) or public.is_admin());
create policy payments_admin on public.payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- soporte ----------
create policy notifications_read on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());

create policy admin_notes_admin on public.admin_notes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy audit_logs_admin on public.audit_logs for select to authenticated
  using (public.is_admin());

create policy settings_read on public.app_settings for select to anon, authenticated
  using (true);
create policy settings_admin on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- Storage
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('pet-photos',   'pet-photos',   true,  5242880,  array['image/jpeg','image/png','image/webp']),
  ('design-files', 'design-files', false, 52428800, null)
on conflict (id) do nothing;

-- pet-photos: público para lectura por URL; escritura solo en tu carpeta {user_id}/...
create policy pet_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'pet-photos'
              and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy pet_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'pet-photos'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy pet_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'pet-photos'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy pet_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'pet-photos'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- design-files: solo admin
create policy design_files_admin on storage.objects for all to authenticated
  using (bucket_id = 'design-files' and public.is_admin())
  with check (bucket_id = 'design-files' and public.is_admin());
