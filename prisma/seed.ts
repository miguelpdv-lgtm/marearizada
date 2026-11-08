/**
 * Seed de Marea Rizada.
 *
 * Carga la configuración, una sede, el catálogo y el equipo. TODO lo que hay
 * aquí es CONTENIDO DE EJEMPLO: servicios, precios, duraciones, profesionales
 * y horarios se reemplazan desde el panel con los datos reales del salón antes
 * de publicar. Es reejecutable: los ajustes no pisan valores ya editados.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { AJUSTES_NUEVOS } from "../src/lib/ajustes-datos";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@marearizada.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

type Ajuste = {
  key: string;
  value: string;
  label: string;
  group: string;
  type: string;
  order: number;
  hint?: string;
};

const settings: Ajuste[] = [
  // General
  { key: "site.name", value: "Marea Rizada", label: "Nombre de la marca", group: "general", type: "TEXT", order: 1 },
  { key: "site.tagline", value: "Expertos en salud capilar", label: "Frase de la marca", group: "general", type: "TEXT", order: 2 },
  { key: "brand.logoUrl", value: "", label: "Logo (URL)", hint: "Vacío = se usa el isotipo de la marca.", group: "marca", type: "URL", order: 1 },

  // Contacto
  { key: "contact.whatsapp", value: "", label: "WhatsApp del salón", hint: "Solo números, con el 57 adelante. Ej.: 573001234567", group: "contacto", type: "TEXT", order: 1 },
  { key: "contact.phone", value: "", label: "Teléfono de contacto", group: "contacto", type: "TEXT", order: 2 },
  { key: "contact.email", value: "", label: "Correo de contacto", hint: "A este correo llegan los avisos del salón y las respuestas de las clientas.", group: "contacto", type: "TEXT", order: 3 },

  // Redes
  { key: "social.instagram", value: "https://www.instagram.com/marea.rizada", label: "Instagram", group: "redes", type: "URL", order: 1 },
  { key: "social.tiktok", value: "", label: "TikTok", group: "redes", type: "URL", order: 2 },
  { key: "social.facebook", value: "", label: "Facebook", group: "redes", type: "URL", order: 3 },

  // Reservas
  { key: "phase.bookingEnabled", value: "true", label: "Reservas en línea activas", hint: "Apagado, el botón Reservar lleva al WhatsApp del salón.", group: "fases", type: "BOOLEAN", order: 1 },
  { key: "phase.bookingUrl", value: "", label: "Enlace externo de reservas", hint: "Solo si las reservas en línea están apagadas y se quiere mandar a otra página.", group: "fases", type: "URL", order: 2 },
  { key: "booking.minHoursAhead", value: "3", label: "Anticipación mínima (horas)", hint: "Con cuántas horas de anticipación se puede reservar en línea.", group: "fases", type: "NUMBER", order: 3 },
  { key: "booking.maxDaysAhead", value: "60", label: "Hasta cuántos días adelante", group: "fases", type: "NUMBER", order: 4 },
];

/** Lunes a viernes de 9 a 6 (última cita 5:00), sábado de 9 a 2. Domingo cerrado. */
const HORARIO_SEDE = [1, 2, 3, 4, 5]
  .map((weekday) => ({ weekday, opensAt: "09:00", closesAt: "18:00" }))
  .concat([{ weekday: 6, opensAt: "09:00", closesAt: "14:00" }]);

const HORARIO_PROFESIONAL = [1, 2, 3, 4, 5]
  .map((weekday) => ({ weekday, opensAt: "09:00", closesAt: "17:00", closed: false }))
  .concat([
    { weekday: 6, opensAt: "09:00", closesAt: "13:00", closed: false },
    { weekday: 0, opensAt: "00:00", closesAt: "00:00", closed: true },
  ]);

const CATEGORIAS = [
  { slug: "rizos", name: "Marea Rizada · Rizos", description: "Salud capilar, corte y tratamientos para rizos.", order: 1 },
  { slug: "nails", name: "Marea Rizada Nails", description: "Manicura y pedicura.", order: 2 },
];

const SERVICIOS = [
  { categoria: "rizos", slug: "diagnostico-capilar", name: "Diagnóstico capilar", tagline: "Patrón, porosidad y plan", durationMin: 60, price: 60000 },
  { categoria: "rizos", slug: "corte-rizo-a-rizo", name: "Corte rizo a rizo", tagline: "Corte en seco, mechón a mechón", durationMin: 90, price: 120000 },
  { categoria: "rizos", slug: "hidratacion-profunda", name: "Hidratación profunda", tagline: "Según tu porosidad", durationMin: 75, price: 95000 },
  { categoria: "rizos", slug: "asesoria-curly", name: "Asesoría curly", tagline: "Tu rutina en casa, paso a paso", durationMin: 45, price: 50000 },
  { categoria: "nails", slug: "manicura-semipermanente", name: "Manicura semipermanente", tagline: "Esmaltado de larga duración", durationMin: 60, price: 45000 },
  { categoria: "nails", slug: "manicura-tradicional", name: "Manicura tradicional", tagline: "Limpieza, forma y esmalte", durationMin: 45, price: 30000 },
  { categoria: "nails", slug: "pedicura-spa", name: "Pedicura spa", tagline: "Exfoliación e hidratación", durationMin: 60, price: 50000 },
  { categoria: "nails", slug: "retiro-y-nivelacion", name: "Retiro y nivelación", tagline: "Retiro seguro de producto", durationMin: 45, price: 25000 },
];

const EQUIPO = [
  { name: "Profesional A", role: "Estilista", specialty: "Rizos y corte en seco", categoria: "rizos", order: 1 },
  { name: "Profesional B", role: "Estilista", specialty: "Afro y coily, 4A a 4C", categoria: "rizos", order: 2 },
  { name: "Profesional C", role: "Manicurista", specialty: "Semipermanente y diseño", categoria: "nails", order: 3 },
  { name: "Profesional D", role: "Manicurista", specialty: "Pedicura y cuidado", categoria: "nails", order: 4 },
];

async function main() {
  console.log("Sembrando datos de ejemplo de Marea Rizada...\n");

  for (const s of [...settings, ...AJUSTES_NUEVOS]) {
    await prisma.setting.upsert({
      where: { key: s.key },
      // El valor no se sobrescribe si el equipo ya lo editó desde el panel.
      update: { label: s.label, group: s.group, type: s.type, hint: s.hint ?? null, order: s.order },
      create: { ...s, hint: s.hint ?? null },
    });
  }
  console.log(`  OK ${settings.length + AJUSTES_NUEVOS.length} ajustes`);

  const sede = await prisma.branch.upsert({
    where: { slug: "principal" },
    update: {},
    create: {
      name: "Marea Rizada",
      slug: "principal",
      city: "Ciudad por confirmar",
      address: "Dirección por confirmar",
      order: 1,
    },
  });
  for (const h of HORARIO_SEDE) {
    await prisma.businessHour.upsert({
      where: { branchId_weekday: { branchId: sede.id, weekday: h.weekday } },
      update: {},
      create: { branchId: sede.id, ...h },
    });
  }
  console.log("  OK Sede con su horario de atención");

  const categoria: Record<string, string> = {};
  for (const c of CATEGORIAS) {
    const row = await prisma.serviceCategory.upsert({ where: { slug: c.slug }, update: {}, create: c });
    categoria[c.slug] = row.id;
  }

  const serviciosPorCategoria: Record<string, string[]> = {};
  for (const s of SERVICIOS) {
    const { categoria: cat, ...datos } = s;
    const row = await prisma.service.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        ...datos,
        description: `${s.tagline}. Servicio de ejemplo: reemplázalo con la descripción real.`,
        priceFrom: false,
        bookable: true,
        categoryId: categoria[cat],
        branchId: sede.id,
      },
    });
    (serviciosPorCategoria[cat] ??= []).push(row.id);
  }
  console.log(`  OK ${SERVICIOS.length} servicios de ejemplo`);

  if ((await prisma.teamMember.count()) === 0) {
    for (const p of EQUIPO) {
      const { categoria: cat, ...datos } = p;
      await prisma.teamMember.create({
        data: {
          ...datos,
          branchId: sede.id,
          schedule: { create: HORARIO_PROFESIONAL },
          services: { create: serviciosPorCategoria[cat].map((serviceId) => ({ serviceId })) },
        },
      });
    }
    console.log(`  OK ${EQUIPO.length} profesionales de ejemplo con horario y servicios`);
  }

  if (!ADMIN_PASSWORD) {
    console.log("\n  ! Falta SEED_ADMIN_PASSWORD en .env: no se creó el usuario administrador.");
  } else {
    const admin = await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: { role: "ADMIN", active: true },
      create: {
        email: ADMIN_EMAIL,
        name: "Administración Marea Rizada",
        role: "ADMIN",
        passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
        active: true,
        branches: { connect: { id: sede.id } },
      },
    });
    console.log(`  OK Usuario administrador: ${admin.email}`);
  }

  console.log("\nListo. Panel: http://localhost:3000/admin\n");
}

main()
  .catch((e) => {
    console.error("Error al sembrar los datos:\n", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
