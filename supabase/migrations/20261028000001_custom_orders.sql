-- =====================================================================
-- Control de pedidos personalizados (clickers "nombre control", llaveros y otros)
-- Solo el administrador puede ver y editar esta tabla.
-- =====================================================================

create table if not exists public.custom_orders (
  id            uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  contact       text check (char_length(contact) <= 120),
  item_type     text not null default 'clicker' check (item_type in ('clicker', 'llavero', 'otro')),

  -- Clicker "nombre control": el nombre va en teclas (una letra por tecla)
  control_name  text check (char_length(control_name) <= 30),
  base_color    text check (char_length(base_color) <= 40),   -- base modular: azul cielo, amarillo, rosa bajito, morado
  key_color     text check (char_length(key_color) <= 40),    -- color de la tecla (libre)
  letter_color  text check (char_length(letter_color) <= 40), -- color de la letra (libre)
  has_nfc       boolean not null default false,

  -- Avance por partes (solo clickers)
  base_done     boolean not null default false,
  keys_done     boolean not null default false,
  letters_done  boolean not null default false,

  status        text not null default 'pending'
                check (status in ('pending', 'in_progress', 'ready', 'delivered', 'cancelled')),
  price         numeric(10,2) not null default 0 check (price >= 0),
  paid_amount   numeric(10,2) not null default 0 check (paid_amount >= 0),
  due_date      date,
  description   text check (char_length(description) <= 500),
  notes         text check (char_length(notes) <= 1000),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists custom_orders_status_idx  on public.custom_orders(status);
create index if not exists custom_orders_created_idx on public.custom_orders(created_at desc);

drop trigger if exists custom_orders_updated on public.custom_orders;
create trigger custom_orders_updated before update on public.custom_orders
  for each row execute function public.set_updated_at();

alter table public.custom_orders enable row level security;

drop policy if exists custom_orders_admin on public.custom_orders;
create policy custom_orders_admin on public.custom_orders for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
