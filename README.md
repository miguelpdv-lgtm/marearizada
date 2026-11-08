# Marea Rizada · Plataforma

Sitio de **Marea Rizada** ([@marea.rizada](https://instagram.com/marea.rizada)) con reservas en línea y panel administrativo. Esta rama (`plataforma`) es la versión completa; `main` sigue publicando la landing estática en GitHub Pages hasta el lanzamiento.

## Qué incluye

- **Sitio público**: la landing aprobada (intro del logo, hero con la fachada, descubre tu patrón, servicios, método, antes y después, familia de marca, preguntas), términos y política de datos.
- **Reservas** (`/reservar`): línea (Rizos o Nails), servicio, profesional o "cualquiera disponible", día y hora, y datos. Cada elección pasa sola a la siguiente pantalla. Cierra con la animación de la marea y la botella; la confirmación llega por correo.
- **Cambiar cita** (`/reservar/cambiar`): la clienta mueve su cita desde el enlace del correo o con su código y celular.
- **Abono en línea** con Bold (tarjeta y PSE).
- **Promociones y cupones**: una promoción sin código aplica sola y se ve tachada en la lista de servicios; con código es un cupón que la clienta escribe al reservar. Pueden tener vigencia y usos máximos.
- **Recordatorios y reseñas por correo**: el día anterior sale el recordatorio (con el botón para cambiar la cita) y, después de una cita atendida, la invitación a dejar una reseña. Las reseñas llegan a Contenido → Reseñas e historias y se publican en la portada cuando el equipo las activa.
- **Panel** (`/admin`): agenda, citas, clientas con su historial, servicios, profesionales con horarios y bloqueos, ventas, reportes, promociones, galería y configuración.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 4 · Prisma 6 + PostgreSQL (Supabase) · Resend (correo) · Bold (pagos).

## Correr en local

```bash
cp .env.example .env      # completa DATABASE_URL, DIRECT_URL, AUTH_SECRET y SEED_ADMIN_PASSWORD
npm install
npm run setup             # migraciones + datos de ejemplo
npm run dev               # http://localhost:3000 · panel en /admin
```

Los datos de ejemplo crean una sede, 8 servicios (Rizos y Nails) y 4 profesionales de ejemplo con foto, horario y servicios. Se reemplazan desde el panel por los reales.

Verificación antes de subir cambios: `npm run typecheck && npm run lint && npm run build`.

## Trabajo diario

`GET /api/cron/diario` manda los recordatorios y las invitaciones a reseñar. Necesita la variable `CRON_SECRET` y el encabezado `Authorization: Bearer <CRON_SECRET>`. En Vercel lo programa `vercel.json` (10:00 a.m. de Colombia); en otro hosting se programa con cron-job.org o una GitHub Action. Llamarlo más de una vez al día no repite correos.

## Datos del negocio

Se editan en el panel, en **Configuración**: contacto (WhatsApp, correo), redes, razón social y NIT para los documentos legales, y las reglas de la agenda (antelación mínima, días abiertos).

## Sistema de diseño

`public/design-system/` y `public/design-system.html` son la guía del sistema (tokens, componentes, movimiento y las olas de `tide.js`). El sitio público usa ese mismo CSS dentro de una capa de Tailwind (`src/app/(site)/marea.css`) y los scripts de `src/lib/marea/`. Si cambias el CSS de `public/design-system` o `public/site/landing.css`, vuelve a generar `marea.css` con el mismo contenido.

`public/landing-estatica.html` es la landing estática original, como referencia.
