-- Productos iniciales (precios provisionales, editables desde /admin/products)
insert into public.products (sku, name, description, base_price, includes_dtf_uv) values
  ('AJID-STD', 'AJolote ID',
   'Silueta 3D de tu mascota, nombre, NFC, QR y perfil digital.', 199, false),
  ('AJID-PRM', 'AJolote ID Premium',
   'Todo lo de AJolote ID más imagen personalizada con DTF UV.', 249, true)
on conflict (sku) do nothing;

-- Colores de PLA disponibles
insert into public.product_variants (product_id, color_name, color_hex)
select p.id, c.name, c.hex
from public.products p
cross join (values
  ('Rosa',       '#F4B8C8'),
  ('Amarillo',   '#F6E3A1'),
  ('Azul cielo', '#A9D6F0'),
  ('Morado',     '#CDB8F0')
) as c(name, hex)
on conflict (product_id, color_name) do nothing;

insert into public.app_settings (key, value) values
  ('payment_instructions',
   'Por ahora el pago es por transferencia. Escríbenos por WhatsApp con tu número de pedido y te compartimos los datos.'),
  ('support_whatsapp', '')
on conflict (key) do nothing;

-- Para hacerte administrador (SQL Editor, cambia el correo):
-- update public.profiles set role = 'admin'
--  where id = (select id from auth.users where email = 'tu-correo@ejemplo.com');
