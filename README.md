# 🦎 AJolote ID · Ajolote de Bolsillo

La identidad física y digital de tu mascota: una placa impresa en 3D con su silueta, NFC y QR que abre un perfil público (sin cuenta ni app) para ayudarla a volver a casa.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind · Supabase (Postgres, Auth, Storage, RLS) · Cloudflare Workers (OpenNext) · PWA.

> Estado: el código está escrito pero **todavía no se ha compilado ni probado** (el entorno donde se generó no pudo instalar paquetes). El primer paso es `npm install && npm run typecheck`; si hay errores, pásalos y se corrigen. Ver [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) para las decisiones de diseño.

---

## 1. Requisitos

- Node 20+ y npm
- Un proyecto de Supabase (plan gratis sirve)
- Cuenta de Cloudflare (para publicar) y un dominio (recomendado: lo que grabas en el NFC debe ser permanente)

## 2. Supabase

1. Crea el proyecto.
2. En **SQL Editor**, ejecuta en este orden el contenido de:
   1. `supabase/migrations/20261021000001_schema.sql`
   2. `supabase/migrations/20261021000002_rls.sql`
   3. `supabase/migrations/20261021000003_functions.sql`
   4. `supabase/seed.sql` (productos y colores iniciales; los precios se editan después en `/admin/products`)
   
   Alternativa con la CLI: `supabase link --project-ref TU_REF && supabase db push`.
3. **Authentication → URL Configuration**
   - Site URL: la URL pública de tu sitio.
   - Redirect URLs: `https://TU-DOMINIO/auth/callback` y `http://localhost:3000/auth/callback`.
4. **Authentication → Email**: para empezar puedes dejar activa la confirmación por correo. Para recuperar contraseña, revisa que las plantillas apunten a `{{ .ConfirmationURL }}` (el valor por defecto sirve).
5. **Storage**: los buckets `pet-photos` (público, 5 MB, solo imágenes) y `design-files` (privado, solo admin) los crea la migración 2.
6. **Hazte administrador**: regístrate en la app y luego, en el SQL Editor:
   ```sql
   update public.profiles set role = 'admin'
    where id = (select id from auth.users where email = 'tu-correo@ejemplo.com');
   ```
   El rol no se puede cambiar desde la app a propósito (un trigger lo impide).

## 3. Variables de entorno

Copia `.env.example` a `.env.local`:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave **anon/publishable** |
| `NEXT_PUBLIC_SITE_URL` | URL pública final (se codifica en QR y NFC) |

**Este proyecto no usa la `service_role` en ningún lado. Nunca la pongas en el repositorio ni en variables públicas.**

## 4. Correr en local

```bash
npm install
npm run typecheck
npm run dev        # http://localhost:3000
```

## 5. Publicar en Cloudflare

Se usa `@opennextjs/cloudflare` (Workers con assets estáticos).

- **Build command:** `npx opennextjs-cloudflare build`
- **Deploy command:** `npx wrangler deploy` (o `npm run cf:deploy`)
- **Salida:** `.open-next/` (la define `wrangler.jsonc`)
- **Variables:** agrega las tres `NEXT_PUBLIC_*` en *Settings → Variables and Secrets* **antes del build** (se incrustan al compilar).
- **Dominio:** Workers → tu Worker → *Settings → Domains & Routes → Add custom domain*. HTTPS es automático.
- **Redirects:** no hay redirects a nivel de plataforma; `/admin/qr` y `/admin/nfc` redirigen dentro de la app a `/admin/tags`.
- **GitHub:** conecta el repositorio en *Workers & Pages → Create → Import a repository* para desplegar con cada push.

Cosas a verificar en el primer despliegue (no pude probarlas): la generación de QR PNG (`/qr/[id]?format=png`) en Workers, y que `middleware.ts` corra bien con OpenNext.

## 6. PWA

- `public/manifest.webmanifest` + iconos en `public/icons/` (son un placeholder del ajolote: reemplázalos por tu logo definitivo en 192, 512 y maskable 512).
- `public/sw.js` es mínimo y **a propósito no cachea nada**: el perfil público siempre debe mostrar el estado real (por ejemplo "perdida").
- El service worker solo se registra en producción. En el celular: abrir `/dashboard` → *Agregar a pantalla de inicio*.
- El perfil público (`/pet/...`) no requiere instalar nada.

## 7. Flujo de operación

1. **Admin → Placas:** genera un lote. Se descarga un CSV con `tag_code, claim_code`. **Es la única vez que se ven los códigos de activación** (en la base solo queda su hash). Imprime las tarjetitas.
2. **Cliente:** registra mascota (foto, contactos, emergencia, privacidad) → *Pedir AJolote ID*.
3. **Admin → Pedidos:** registra el pago, asigna una placa disponible, llena datos de fabricación (silueta, medidas, color, DTF UV), cambia estados (el cliente recibe notificación).
4. **Admin → Placas → detalle:** descarga el QR y escribe el NFC.
5. **Cliente:** recibe la placa y la activa en el perfil de su mascota con el código de placa + código de activación. Una vez activa, no se puede reclamar otra vez.
6. **Si se pierde la placa:** Admin → detalle de placa → *Reemplazar*. El enlace de la mascota no cambia.

### Escribir el NFC
- **Android + Chrome:** botón *Escribir URL en el chip* (Web NFC, requiere HTTPS). Opción de bloquear el chip (irreversible).
- **iPhone o computadora:** copia la URL del detalle de la placa y grábala con **NFC Tools** (registro tipo *URL*).
- Usa chips **NTAG213/215**. El NFC y el QR apuntan al mismo enlace permanente `/pet/<id>`; `?s=n` / `?s=q` solo sirve para medir el origen.

## 8. Qué requiere algo externo (no inventado)

| Función | Qué requiere |
|---|---|
| Pagos en línea | Un proveedor (Mercado Pago / Stripe). Hoy el pago es manual: el admin registra el pago |
| Push / WhatsApp / correo de avisos | Proveedor + configuración. Hoy hay notificaciones dentro de la app |
| Anti-spam fuerte en reportes | Cloudflare Turnstile (hoy: límite de 10 reportes / 10 min por mascota) |
| Archivos STL/3MF grandes | Subida directa a Storage (hoy se suben desde el panel de Supabase al bucket `design-files`) |
| Silueta automática desde foto | Hoy es un proceso de diseño manual |
| Login con Google / Apple | Activar el proveedor en Supabase y agregar el botón |

## 9. Seguridad y privacidad (resumen)

- RLS en todas las tablas; el dueño solo ve y edita lo suyo; el admin se valida con `is_admin()`.
- El público solo llama a dos funciones (`get_public_pet`, `report_pet_location`) que devuelven una lista blanca de campos según la privacidad que eligió el dueño.
- No se guarda IP ni identidad de quien escanea o reporta; los escaneos solo guardan mascota, fecha y origen NFC/QR.
- La dirección de envío solo la ven el cliente y el admin; nunca el perfil público.
- La ubicación exacta de "última vez vista" solo la ve el dueño; públicamente solo se muestra la descripción que escribió.
- Subida de fotos: solo JPG/PNG/WebP, máximo 5 MB, carpeta por usuario.
- Cambios importantes (mascotas, contactos, privacidad, modo perdida, placas, pedidos, productos, ajustes) quedan en `audit_logs` con quién y qué columnas cambiaron.

## 10. Estructura

```
src/app/            rutas (landing, auth, (app) dueño, pet/ público, qr/, admin/)
src/app/actions/    server actions (auth, pets, lost, orders, public, admin)
src/components/     UI y piezas cliente (mapa, NFC, formulario de reporte, fotos)
src/lib/            clientes de Supabase, utilidades, etiquetas
supabase/           migraciones y seed
docs/               análisis y arquitectura
```
