# Pa'dentro Buffet y Cantina · Sitio, tienda y panel

React + Vite + TypeScript + Supabase + Stripe.

## Qué incluye
- **Sitio público:** portada con foto o video, carta tipo restaurante con buscador, carrito con **calendario** para programar fecha y hora de recogida, pago en línea con Stripe o pedido por WhatsApp, y página **/pedido** para que el cliente siga su pedido con su código.
- **Panel /admin:**
  - **Caja (POS):** ventas de mostrador, teléfono o WhatsApp; efectivo, tarjeta, transferencia o por cobrar; descuento, cambio y ticket impreso.
  - **Pedidos en curso:** tablero Nuevo → Confirmado → En preparación → Listo. Se actualiza solo y suena al llegar un pedido.
  - **Detalle de pedido:** cambiar estado, agregar o quitar productos, cobrar saldo, avisar al cliente por WhatsApp e imprimir ticket.
  - **Registro:** historial con filtros, totales por método de pago y descarga a Excel (CSV).
  - **Calendario:** pedidos programados por día.
  - **Carta, Promociones y Sitio web (CMS):** tienda y horario, contacto, redes sociales con íconos, botones flotantes, orden y visibilidad de secciones, portada, video, galería, etc. Al guardar, la página se actualiza al instante.

## Base de datos (Supabase > SQL Editor)
Ejecuta en orden, cada archivo completo: `01_schema.sql`, `02_seed.sql`, `03_admin.sql` (con tu correo), `04_tienda_cms.sql`, `05_checkout_directo.sql`, `06_pos_calendario.sql`.

## Variables (Vercel > Settings > Environment Variables)
`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (ver `.env.example`).

## Stripe
```powershell
npx --yes supabase@latest secrets set STRIPE_SECRET_KEY=sk_... SITE_URL=https://pa-dentro.vercel.app
npx --yes supabase@latest functions deploy create-checkout --no-verify-jwt --use-api
npx --yes supabase@latest functions deploy stripe-webhook --no-verify-jwt --use-api
```
Webhook en Stripe: `https://hzcakovqgkloaliflqwd.supabase.co/functions/v1/stripe-webhook`, eventos `checkout.session.completed` y `checkout.session.expired`; guarda su `whsec_...` con `secrets set STRIPE_WEBHOOK_SECRET=...`.

## Correr en local
```bash
npm install
npm run dev
```
