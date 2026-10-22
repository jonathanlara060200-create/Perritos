# AJolote ID — Análisis y arquitectura

Documento de las Fases 1 y 2 (análisis y arquitectura). Todo el código del repo sigue lo que se define aquí.

## 1. Análisis

### Actores y flujos núcleo

| Actor | Flujo |
|---|---|
| Dueño | Registrar mascota → fotos/info → pedir placa → recibirla → activarla con código → administrar perfil → modo perdida |
| Quien encuentra | Tap NFC / escanear QR → perfil público → contactar / reportar ubicación (sin cuenta, sin app) |
| Admin | Pedido → diseño → asignar placa → escribir NFC / QR → producción → envío |

### Entidades

`profiles` · `pets` · `pet_photos` · `pet_contacts` · `pet_emergency_info` · `pet_visibility` · `lost_pet_reports` · `pet_locations` · `pet_events` · `tags` · `tag_secrets` · `tag_designs` · `products` · `product_variants` · `orders` · `order_items` · `payments` · `notifications` · `admin_notes` · `audit_logs` · `app_settings`

### Decisiones que se desvían del brief (con razón)

1. **Una sola tabla `tags` en vez de `pet_tags` + `qr_codes` + `nfc_tags`.** NFC y QR apuntan a la misma URL, así que son dos formas de leer *la misma placa*. Separarlos solo crearía joins sin valor. `tags` guarda `nfc_uid`, `nfc_written_at` y el QR se genera al vuelo.
2. **Sin service_role en ningún lado.** Todo corre con la sesión del usuario + RLS + funciones RPC `security definer`. El admin es un usuario con `role = 'admin'`. Menos superficie de ataque y nada que filtrar.
3. **El público nunca toca tablas.** La persona que encuentra la mascota solo llama a dos funciones (`get_public_pet`, `report_pet_location`). La función decide qué campos salen según `pet_visibility`.
4. **`?s=n` / `?s=q` en la URL.** El path es el mismo y permanente (`/pet/luna-a82f91`). El parámetro solo sirve para distinguir NFC de QR en métricas.
5. **Código de activación por placa (`tag_secrets`, guardado como hash).** Impide que alguien registre una placa que no compró. Se muestra una sola vez al generarla (CSV).
6. **`/admin/qr` y `/admin/nfc` viven dentro de `/admin/tags`.** Son la misma cosa.
7. **Precios y colores en base de datos**, nunca hardcodeados.
8. **El pedido se crea con una función RPC**: el cliente no puede escribir su propio precio.
9. **Última ubicación conocida no se publica**: solo la descripción que escribe el dueño, para no revelar zonas cercanas a su casa.

### Riesgos y cómo se cubren

| Riesgo | Mitigación |
|---|---|
| Fuga de datos personales en perfil público | RPC con lista blanca de campos + `pet_visibility` |
| Spam de reportes falsos | Límite de 10 reportes / 10 min por mascota en la función. Recomendado después: Cloudflare Turnstile |
| Placa vieja sigue abriendo el perfil | La URL es de la mascota, no de la placa (así lo pide el brief). Si hay robo/abuso, el siguiente paso es rotar `public_id` |
| Fotos en bucket público | Rutas con UUID imposibles de adivinar; ocultar foto desde `pet_visibility.show_photo` |
| Adivinar códigos de activación | 8 caracteres sin ambiguos + bloqueo tras 10 intentos fallidos |
| Cambios admin sin rastro | Triggers de auditoría guardan quién y qué columnas cambiaron |

## 2. Arquitectura

### Stack final

- **Next.js 15 (App Router) + TypeScript + Tailwind 3**: Server Components para velocidad en el perfil público, Server Actions para formularios.
- **Supabase**: Postgres, Auth, Storage, RLS, RPC.
- **Cloudflare Workers vía OpenNext** (`@opennextjs/cloudflare`): es el camino recomendado hoy para Next en Cloudflare.
- **PWA**: manifest + service worker mínimo (sin caché de perfiles, para no mostrar estado de "perdida" viejo).
- **QR**: librería `qrcode`, generado al vuelo en `/qr/[publicId]`.
- **Mapa**: Leaflet + OpenStreetMap (sin API key).

### Estructura

```
src/
  app/
    page.tsx                  landing
    (auth)/                   login, register, forgot-password, reset-password
    auth/                     callback, signout
    (app)/                    zona del dueño (requiere sesión)
      dashboard, pets, pets/new, pets/[id], pets/[id]/edit,
      lost, orders, orders/new, orders/[id]
    pet/[publicId]            PERFIL PÚBLICO + /report
    qr/[publicId]             imagen QR (svg|png)
    admin/                    dashboard, orders, pets, users, tags,
                              products, lost, analytics, settings
    actions/                  server actions (auth, pets, lost, orders, public, admin)
  components/                 UI y piezas cliente (mapa, NFC, reporte, foto)
  lib/                        supabase clients, utils, validaciones, etiquetas
supabase/migrations/          esquema, RLS, funciones
supabase/seed.sql             productos iniciales
```

### Roles y permisos

- `customer`: CRUD solo de lo suyo (RLS por `owner_id` / `owns_pet()`).
- `admin`: acceso total mediante `is_admin()`. Solo se asigna desde el SQL Editor (un trigger impide que un usuario se suba el rol).
- `anon`: únicamente RPC públicas.

### Base de datos

UUIDs, `timestamptz`, FKs con índices, checks en rangos (lat/lng, longitudes). Triggers: `updated_at`, auditoría, creación de perfil al registrarse, filas por defecto de visibilidad/emergencia al crear mascota, notificación al cambiar estado del pedido, eventos de modo perdida.

### Flujo de la placa (no reutilizable)

1. Admin genera placas → `tags` en `available` + hash del código en `tag_secrets` + CSV con códigos (única vez).
2. Se asigna a un pedido/mascota → `reserved` → `in_production` → `produced` → `shipped`.
3. El dueño ingresa código de placa + código de activación → `claim_tag()` → `active`. Una vez activa, no se puede volver a reclamar.
4. Reemplazo: la placa vieja pasa a `replaced`; la nueva hereda la mascota. El perfil y el historial no cambian.

### Deployment

Ver README. Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`.

## 3. Lo que requiere algo externo

| Función | Qué requiere |
|---|---|
| Escribir NFC físico | Chip NTAG + Chrome en Android (Web NFC) o app como NFC Tools |
| Pagos en línea | Proveedor (Mercado Pago / Stripe). Hoy: pago manual y el admin registra el pago |
| Notificaciones push / WhatsApp / email | Proveedor + configuración. Hoy: notificaciones dentro de la app (tabla lista) |
| Anti-spam fuerte | Cloudflare Turnstile |
| Subir STL/3MF > 6 MB | Subida directa desde el navegador (hoy el límite es el de Server Actions) |
| Silueta automática desde foto | Proceso de diseño manual en esta fase |
