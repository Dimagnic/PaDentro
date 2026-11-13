# Pa'dentro Buffet y Cantina · Sitio + panel de administración

React + Vite + TypeScript + Supabase. Carta (251 productos), carrito, pedidos guardados con folio y envío por WhatsApp, y panel `/admin` para pedidos, carta y promociones.

## Puesta en marcha (una sola vez)

### 1. Base de datos (Supabase > SQL Editor)
Ejecuta en este orden, cada archivo completo:
1. `supabase/01_schema.sql`: crea las tablas, las reglas de seguridad y la función de pedidos.
2. `supabase/02_seed.sql`: carga la carta completa y la promoción "De Bandidas".
3. Crea tu usuario en **Authentication > Users > Add user > Create new user** (correo + contraseña, marca *Auto Confirm User*).
4. `supabase/03_admin.sql`: cambia el correo por el tuyo y ejecútalo.
5. `supabase/04_tienda_cms.sql`: agrega la tienda en línea, el CMS y el espacio para fotos.
6. `supabase/05_checkout_directo.sql`: el pago va directo a Stripe (sin formulario en el carrito).

Recomendado: en **Authentication > Sign In / Providers** desactiva *Allow new users to sign up*. Aunque alguien cree una cuenta, sin estar en la tabla `admins` no puede ver ni cambiar nada.

### 2. Variables de entorno
Copia la *anon public key* de **Project Settings > API**.
- **Local:** copia `.env.example` como `.env.local` y pega la clave.
- **Vercel:** Settings > Environment Variables > agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, y vuelve a hacer el deploy.

Nunca uses la clave `service_role` en este proyecto.

### 3. Correr
```bash
npm install
npm run dev      # http://localhost:5173  ·  panel en /admin
npm run build    # producción (dist/)
```

## Tienda en línea con Stripe (una sola vez)

1. **Stripe:** crea tu cuenta en stripe.com. Trabaja primero en **modo de prueba** (Test mode). En **Developers > API keys** copia la **Secret key** (`sk_test_...`).
2. **Sube las funciones de pago a Supabase** desde PowerShell, en la carpeta del proyecto:
   ```powershell
   npx supabase@latest login
   npx supabase@latest link --project-ref hzcakovqgkloaliflqwd
   npx supabase@latest secrets set STRIPE_SECRET_KEY=sk_test_XXXX SITE_URL=https://TU-DOMINIO
   npx supabase@latest functions deploy create-checkout --no-verify-jwt --use-api
   npx supabase@latest functions deploy stripe-webhook --no-verify-jwt --use-api
   ```
3. **Webhook en Stripe:** ve a **Developers > Webhooks > Add endpoint**.
   - URL: `https://hzcakovqgkloaliflqwd.supabase.co/functions/v1/stripe-webhook`
   - Eventos: `checkout.session.completed` y `checkout.session.expired`
   - Copia el **Signing secret** (`whsec_...`) y guárdalo:
     ```powershell
     npx supabase@latest secrets set STRIPE_WEBHOOK_SECRET=whsec_XXXX
     ```
4. **Prueba** con la tarjeta `4242 4242 4242 4242`, cualquier fecha futura y cualquier CVC. El pedido debe aparecer en `/admin` como **💳 Pagado en línea**.
5. **Para cobrar de verdad:** activa tu cuenta en Stripe (datos fiscales y cuenta bancaria), cambia a modo real y repite los pasos 2 y 3 con las claves `sk_live_...` y el nuevo `whsec_...`.

## Cómo funciona
- **Carta y promociones** se leen de Supabase. Si Supabase no responde o faltan las variables, el sitio usa `src/menu.json` y sigue funcionando.
- **Pago en línea:** el carrito muestra el resumen y "Proceder al pago" lleva directo a Stripe, que pide tarjeta, nombre, teléfono y hora de recogida. El servidor calcula el total (el navegador no puede cambiarlo). Stripe avisa a `stripe-webhook` y el pedido queda como pagado. Los pedidos sin pagar no aparecen en "Activos".
- **Pedido por WhatsApp:** se guarda con folio y se abre WhatsApp; el cliente paga en el local.
- **Botón "Acceso"** en el pie de página: abre el inicio de sesión del panel.
- **Panel `/admin`:**
  - *Pedidos:* se actualiza cada 15 s, suena al llegar uno nuevo y muestra si está pagado, el cliente y la hora de recogida.
  - *Carta:* editar nombre y precios, marcar como agotado, agregar y eliminar productos.
  - *Promociones:* con fechas de inicio y fin; se ocultan solas al vencer.
  - *Sitio (CMS):* textos, horarios, contacto, WhatsApp, favoritos, fotos (se suben y se reducen solas) y el interruptor para abrir o cerrar la tienda en línea.

## Fotos
Se suben desde **/admin > Sitio**. Si una foto no existe, se muestra un fondo de marca.
