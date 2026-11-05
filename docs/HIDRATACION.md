# Hidratación (/hidratacion)

Sección independiente del sitio de mascotas: llavero 3D con NFC → página personal → registro de agua.
Comparte Supabase Auth y la base con el resto, pero sus tablas son `hyd_*` y sus rutas viven en `/hidratacion`.

## Archivos
- Páginas: `src/app/hidratacion/**` (landing, registro, login, nfc/[id], y `(app)/` dashboard, historial, estadisticas, recordatorios, perfil)
- Acciones: `src/app/actions/hyd.ts` · Lógica: `src/lib/hyd.ts`, `hyd-stats.ts`, `webpush.ts`, `hyd-push-config.ts`
- Componentes: `src/components/hyd/*` · Admin: `src/app/admin/hidratacion/` (llaveros) y `/avisos` (claves push)
- Recordatorios: `src/app/api/hyd/cron/route.ts`, `public/sw.js` (push), `.github/workflows/hyd-reminders.yml`
- PWA propia: `public/hidratacion.webmanifest`
- SQL: `supabase/migrations/20261104000001_hydration_module.sql` (referencia, ya aplicada) y `...000002_hydration_reminders.sql`

## Cómo funciona el NFC
Cada llavero es una fila en `hyd_devices` con un código aleatorio (`HY-XXXXXXXXXXXX`) y un código de activación de 8 caracteres (solo se guarda su hash; se ve una vez al crearlo en `/admin/hidratacion`). El chip guarda `https://TU-DOMINIO/hidratacion/nfc/<código>`: sin datos personales.
- Sin sesión → pide iniciar sesión/crear cuenta y vuelve al llavero.
- Llavero libre + sesión → pide el código de activación (con bloqueo tras 10 intentos) y lo vincula a la cuenta.
- Llavero propio → abre el dashboard con acción rápida. Una cuenta puede tener varios llaveros; el admin puede desactivarlos.

## Variables de entorno
Ya existentes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Nuevas (solo para avisos push; sin ellas todo funciona menos las notificaciones):
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (antes del build), `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:…`)
- Secretos de GitHub Actions: `HYD_CRON_URL` (`https://TU-DOMINIO/api/hyd/cron`) y `HYD_CRON_SECRET`.
Genera todo en `/admin/hidratacion/avisos` (se crea en tu navegador) y ejecuta el SQL que muestra, una sola vez, en Supabase.

## Migraciones
Supabase → SQL Editor: pega y ejecuta el contenido de los archivos de `supabase/migrations/` en orden (son idempotentes).

## Cómo probar
1. Admin → Llaveros de hidratación → crear llavero; abre su URL en el celular.
2. Crear cuenta, activar con el código, registrar 100/250/950 ml y una cantidad personalizada mayor al termo.
3. Editar/eliminar en Historial; revisar Estadísticas y Perfil.
4. Avisos → “Activar notificaciones” → “Enviar prueba” (en iPhone, primero “Agregar a pantalla de inicio”).

## Servicios externos
Supabase (ya), Cloudflare (ya), GitHub Actions (programador de avisos; alternativa: cron-job.org llamando al mismo endpoint con `Authorization: Bearer <secreto>`).
