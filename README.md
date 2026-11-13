# Pa'dentro Buffet y Cantina · Sitio + panel de administración

React + Vite + TypeScript + Supabase. Carta (251 productos), carrito, pedidos guardados con folio y envío por WhatsApp, y panel `/admin` para pedidos, carta y promociones.

## Puesta en marcha (una sola vez)

### 1. Base de datos (Supabase > SQL Editor)
Ejecuta en este orden, cada archivo completo:
1. `supabase/01_schema.sql`: crea las tablas, las reglas de seguridad y la función de pedidos.
2. `supabase/02_seed.sql`: carga la carta completa y la promoción "De Bandidas".
3. Crea tu usuario en **Authentication > Users > Add user > Create new user** (correo + contraseña, marca *Auto Confirm User*).
4. `supabase/03_admin.sql`: cambia el correo por el tuyo y ejecútalo.

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

## Cómo funciona
- **Carta y promociones** se leen de Supabase. Si Supabase no responde o faltan las variables, el sitio usa `src/menu.json` y sigue funcionando.
- **Pedidos:** al enviar, se guardan con la función `create_order`, que calcula los precios en el servidor (el cliente no puede alterar el total). Después se abre WhatsApp con el folio. Si falla el guardado, WhatsApp se abre igual, sin folio.
- **Panel `/admin`:**
  - *Pedidos:* se actualiza cada 20 s y permite cambiar el estado (nuevo, confirmado, preparando, entregado, cancelado).
  - *Carta:* editar nombre y precios, marcar como agotado, agregar y eliminar productos.
  - *Promociones:* con fechas de inicio y fin; se ocultan solas al vencer.

## Fotos
Coloca en `public/images/`: `hero.jpg`, `casa.jpg`, `fav-mole.jpg`, `fav-nogada.jpg`, `fav-carajillo.jpg`, `galeria-1.jpg` … `galeria-5.jpg`. Si no existen, se muestra un fondo de marca.

## Otros datos
Negocio, teléfono, redes y horario en `src/config.ts`.
