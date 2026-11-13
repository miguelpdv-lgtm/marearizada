# Marea Rizada — contexto del proyecto

Plataforma (sitio + reservas en línea + panel) de **Marea Rizada**, salón de rizos y Nails en **Cartagena**, **un solo local**. Rama de trabajo: `plataforma` (`main` sigue siendo la landing estática en GitHub Pages hasta el lanzamiento). Plan contratado: **Completo**. Contacto comercial: Miguel Posada.

## Stack y dónde vive
- Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 4 · Prisma 6 + PostgreSQL · Zod. Sistema de diseño en `public/design-system/` (marea, espuma, abismo, concha, arcilla; Shantell Sans + Figtree; botones de letrero, sin píldoras).
- Sitio de prueba: https://marea-rizada.vercel.app (panel en `/admin`). Vercel (equipo `miguelpdv-lgtms-projects`, plan Pro) + Supabase (proyecto `marea-rizada`, org "Velas", id `yqsfpojqtnzedfknzfqa`). La app se conecta con el rol `marea_app`. Credenciales: NUNCA en el repo; el acceso al panel se entregó por archivo al dueño.
- Publicar: la CLI de Vercel no persiste entre sesiones (hay que iniciar sesión de nuevo con `vercel login`). El repo NO está conectado a Vercel (el remoto se llama `craneum`; GitHub redirige a `marearizada`). `npm run vercel-build` aplica migraciones y, con `SEED_ON_BUILD=true`, carga el seed.
- Local: Postgres 16 en el puerto 5433 (`/var/lib/postgresql/marea-dev`, trust), `.env` local (ignorado por git). Seed: `npx tsx --env-file=.env prisma/seed.ts`. Cerrar el servidor con `pkill -f next-server`.

## Decisiones tomadas
- **Abono obligatorio** para reservar: el cupo queda apartado (`POR_PAGAR`, `holdUntil`, 20 min por defecto) y la cita se confirma al aprobarse el pago. Porcentaje del abono y minutos, en Configuración.
- **Cancelar = escribirle al salón** (no hay botón). La clienta sí puede cambiar fecha y hora desde el enlace del correo.
- **Pasarela de pagos: solo Wompi** (pendiente de integrar). Sin pasarela ni `PAGOS_DE_PRUEBA=true`, `/reservar` se cierra. Bold fue retirado.
- **Correo: Brevo** (decidido; reemplaza a Resend, que es lo que hay en el código hoy).
- **Comisiones por servicio**, % por categoría (editable en Servicios → Categorías; opcional por servicio): Cabello 30, Nails 50, Cejas 50, Pestañas 50, Depilación 40. Los productos no comisionan. Cada línea de venta guarda el % vigente.
- Agenda del panel con pestañas **Salón / Nails** (campo `agenda` de cada categoría). Cejas, Pestañas y Depilación están en Nails (por confirmar con el cliente).
- Un solo local: selectores de local ocultos en el panel.
- Panel con layout propio (barra lateral de abismo en escritorio; barra superior + pestañas en celular) y alineado al sistema de diseño.
- Cupones, recordatorios del día anterior y reseñas con aprobación ya construidos. Tarea diaria: `GET /api/cron/diario` con `CRON_SECRET` (programada en `vercel.json`).

## Pendientes (por prioridad)
1. **Integrar Wompi**: pasos en `src/lib/pasarela.ts` (Web Checkout con firma de integridad, webhook con checksum, conciliación en `/reservar/pago/[codigo]`). Necesita: llave pública, secreto de integridad y secreto de eventos de la cuenta del salón.
2. **Cambiar el envío de correo de Resend a Brevo** (`src/lib/correo/enviar.ts`, variables `.env.example`, README y política de datos, que hoy mencionan al proveedor de correo). Necesita: cuenta Brevo, clave API y dominio remitente verificado (SPF/DKIM/DMARC).
3. **Datos reales** (los pasa Miguel luego): dirección, WhatsApp, correo, razón social, NIT y ciudad (en Configuración); servicios con precios reales; equipo con fotos, horarios y servicios; logo en vector; textos legales revisados por un abogado.
4. **Cuentas a nombre del salón**: Supabase (hoy en la org "Velas"), Vercel (hoy el plan Pro de Miguel), dominio propio, y conectar el repo a Vercel (Settings → Git, rama de producción `plataforma`).
5. Fotos subidas desde el panel: faltan `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
6. Seguridad antes de lanzar: cambiar la contraseña del administrador y crear los usuarios del equipo; `CRON_SECRET` y `AUTH_SECRET` propios en producción.
7. Pulido: objetivos táctiles de 40 px o menos (enlaces "Editar"/"Eliminar" en listas); probar en teléfonos reales; revisar Ventas y "Finalizar cita" en celular.
8. Nombre "Marea Rizada" fijo en el código (menú, logo, correos): pasar a configuración si se reutiliza el panel con otros clientes.
9. Manual de uso del panel para el equipo (el heredado era de Amicrespa; no se regeneró). `docs/manual` y `scripts/manual-*.mjs` son de ese manual.
10. Decisiones abiertas con el cliente: qué pasa con el abono si la clienta cancela; si Cejas/Pestañas/Depilación van en la agenda de Nails.

## Datos de demostración
`demo.sql` / `demo-limpiar.sql` (ids `demo-…`) cargan y quitan datos de ejemplo. Se usaron para grabar una presentación para otro cliente; NO deben quedar en producción. (Ver git: los archivos viven fuera del repo si no se commitearon; se pueden regenerar.) Presentación de ejemplo: https://claude.ai/artifact/8q3T1caRijZzREn9XBWzPb

## Convenciones
- Español en todo texto visible. Sin píldoras ni botones redondos; títulos de un solo color y tipografía.
- Antes de subir cambios: `npm run typecheck && npm run lint && npm run build`.
- No crear PRs sin que se pidan. Commits con el pie de coautoría y enlace de sesión que indique la sesión.
