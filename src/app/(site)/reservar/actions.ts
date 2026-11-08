"use server";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { consumir, esperaLegible, ipDeLaPeticion } from "@/lib/rateLimit";
import {
  aUtc,
  asignarProfesional,
  configAgenda,
  diasConCupo,
  generarCodigo,
  horasLibres,
} from "@/lib/agenda";
import { vincularCliente } from "@/lib/clients";
import { avisarCitaNueva } from "@/lib/correo/avisos";
import { boldConfigurado, configCheckout, MONTO_MINIMO, type ConfigCheckout } from "@/lib/bold";
import { tokenCambioCita, tokenPublico, tokenValido } from "@/lib/pagos";
import { formatCOP } from "@/lib/format";
import { urlSitio } from "@/lib/site";

/* --- Consultas ------------------------------------------------------------- */

/** `staffId` vacío = "cualquiera disponible": cuentan todas las profesionales. */
export async function obtenerHoras(
  branchId: string,
  serviceId: string,
  fecha: string,
  staffId?: string | null,
) {
  return horasLibres(branchId, serviceId, fecha, { staffId: staffId || null });
}

export async function obtenerDiasConCupo(
  branchId: string,
  serviceId: string,
  desde: string,
  dias: number,
  staffId?: string | null,
) {
  return diasConCupo(branchId, serviceId, desde, Math.min(dias, 62), { staffId: staffId || null });
}

/** El primer día y hora libres de una profesional, para su tarjeta. */
export async function proximoCupo(
  branchId: string,
  serviceId: string,
  staffId: string,
  desde: string,
): Promise<{ fecha: string; hora: string } | null> {
  const dias = await diasConCupo(branchId, serviceId, desde, 21, { staffId });
  const fecha = Object.keys(dias)
    .sort()
    .find((f) => dias[f] > 0);
  if (!fecha) return null;
  const [hora] = await horasLibres(branchId, serviceId, fecha, { staffId });
  return hora ? { fecha, hora } : null;
}

/* --- Reserva --------------------------------------------------------------- */

const esquema = z.object({
  branchId: z.string().min(1, "Elige una sede."),
  serviceId: z.string().min(1, "Elige un servicio."),
  /** Vacío = cualquiera disponible. */
  staffId: z.string().trim().max(60).optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha."),
  hora: z.string().regex(/^\d{2}:\d{2}$/, "Elige una hora."),
  clientName: z.string().trim().min(2, "Escribe tu nombre."),
  clientPhone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Escribe un celular válido."),
  // Obligatorio: la confirmación de la cita llega por correo.
  clientEmail: z
    .string({ required_error: "Escribe tu correo." })
    .trim()
    .min(1, "Escribe tu correo.")
    .email("Escribe un correo válido."),
  notes: z.string().trim().max(600).optional(),
  firstVisit: z.boolean().optional(),
  curlType: z.enum(["ONDULADO", "RIZADO", "CRESPO", "NO_SE"]).optional(),
});

export type DatosReserva = z.infer<typeof esquema>;

export type ResultadoReserva =
  | {
      ok: true;
      codigo: string;
      inicio: string;
      servicio: string;
      profesional: string | null;
      sede: string;
      direccion: string;
      whatsapp: string | null;
      /** Abono opcional que se le ofrece al terminar: la clienta elige cuánto,
       * entre `minimo` (lo menos que cobra Bold) y `maximo` (el valor del
       * servicio). null si no aplica. */
      abono: { minimo: number; maximo: number; token: string } | null;
      /** Enlace para que la clienta mueva la cita sola. */
      cambiar: string;
    }
  | { ok: false; error: string; campo?: string };

export async function crearReserva(
  datos: DatosReserva,
): Promise<ResultadoReserva> {
  const parsed = esquema.safeParse(datos);
  if (!parsed.success) {
    const primero = parsed.error.issues[0];
    return {
      ok: false,
      error: primero.message,
      campo: primero.path.join("."),
    };
  }

  // Esta acción escribe en la agenda sin sesión de por medio. Sin freno, un
  // script la llena de citas falsas en minutos y el salón las limpia a mano.
  const permiso = await consumir("reserva", await ipDeLaPeticion());
  if (!permiso.ok) {
    return {
      ok: false,
      error: `Ya hiciste varias reservas seguidas. Espera ${esperaLegible(permiso.segundos)} o escríbenos por WhatsApp.`,
    };
  }

  const d = parsed.data;

  const [servicio, sede, cfg] = await Promise.all([
    prisma.service.findUnique({ where: { id: d.serviceId } }),
    prisma.branch.findUnique({ where: { id: d.branchId } }),
    configAgenda(),
  ]);

  if (!servicio || !servicio.active) {
    return { ok: false, error: "Ese servicio ya no está disponible." };
  }
  // Los que requieren abono (color) los agenda solo el salón.
  if (!servicio.bookable) {
    return { ok: false, error: "Ese servicio requiere abono: escríbenos por WhatsApp y lo agendamos contigo." };
  }
  if (!sede || !sede.active) {
    return { ok: false, error: "Esa sede ya no está disponible." };
  }
  if (sede.closedNotice) {
    return { ok: false, error: sede.closedNotice };
  }
  if (servicio.branchId && servicio.branchId !== sede.id) {
    return { ok: false, error: "Ese servicio no se presta en la sede elegida." };
  }

  const inicio = aUtc(d.fecha, d.hora);
  const fin = new Date(inicio.getTime() + servicio.durationMin * 60_000);

  if (inicio.getTime() < Date.now() + cfg.minHorasAntes * 3600_000) {
    return {
      ok: false,
      error: `Necesitamos al menos ${cfg.minHorasAntes} horas de antelación. Elige otra hora.`,
    };
  }

  // Se vuelve a comprobar el cupo justo antes de guardar: entre que la clienta
  // eligió la hora y confirmó, alguien más pudo tomarla. Si eligió profesional
  // se exige esa; si no, se elige entre las calificadas y libres a esa hora.
  const staffId = await asignarProfesional(sede.id, servicio.id, d.fecha, d.hora, {
    staffId: d.staffId || null,
  });

  if (!staffId) {
    return {
      ok: false,
      error: "Justo acaban de tomar esa hora. Elige otra, por favor.",
    };
  }

  const clientId = await vincularCliente({
    name: d.clientName,
    phone: d.clientPhone,
    email: d.clientEmail,
  });

  // Reintenta si el código corto choca con uno existente.
  for (let intento = 0; intento < 5; intento++) {
    try {
      const cita = await prisma.appointment.create({
        data: {
          code: generarCodigo(),
          branchId: sede.id,
          serviceId: servicio.id,
          staffId,
          startsAt: inicio,
          endsAt: fin,
          status: "PENDIENTE",
          clientName: d.clientName,
          clientPhone: d.clientPhone,
          clientEmail: d.clientEmail || null,
          clientId,
          notes: d.notes || null,
          firstVisit: d.firstVisit ?? false,
          curlType: d.curlType ?? null,
        },
      });

      // Confirmación a la clienta y aviso al salón. Sale por `after()`, así
      // que la pantalla de "tu cita quedó lista" no espera a Resend y una
      // caída del correo no se ve como una reserva fallida.
      avisarCitaNueva(cita.id);

      const maximo = maximoAbono(servicio.price);

      return {
        ok: true,
        codigo: cita.code,
        inicio: cita.startsAt.toISOString(),
        servicio: servicio.name,
        profesional: (await prisma.teamMember.findUnique({ where: { id: staffId }, select: { name: true } }))?.name ?? null,
        sede: sede.city,
        direccion: sede.address,
        whatsapp: sede.whatsapp,
        abono: maximo ? { minimo: MONTO_MINIMO, maximo, token: tokenPublico(cita.code) } : null,
        cambiar: `/reservar/cambiar?codigo=${cita.code}&t=${tokenCambioCita(cita.code)}`,
      };
    } catch (e) {
      const err = e as { code?: string };
      if (err.code === "P2002" && intento < 4) continue; // código repetido
      return {
        ok: false,
        error: "No pudimos guardar tu cita. Inténtalo de nuevo.",
      };
    }
  }

  return { ok: false, error: "No pudimos generar tu código de cita." };
}

/* --- Abono opcional con Bold ------------------------------------------------ */

/** Hasta cuánto puede abonar la clienta: el valor del servicio, o sea dejar la
 * cita paga. El monto lo elige ella. `null` si no se ofrece (sin Bold, o un
 * servicio gratis o por debajo del mínimo que cobra Bold). */
function maximoAbono(precioServicio: number) {
  if (!boldConfigurado()) return null;
  return precioServicio >= MONTO_MINIMO ? precioServicio : null;
}

export type ResultadoAbono =
  | { ok: true; checkout: ConfigCheckout }
  | { ok: false; error: string };

/**
 * Prepara el cobro del abono. El monto lo elige la clienta, pero se valida acá
 * contra el precio del servicio (nunca más de lo que cuesta). El token (el
 * mismo de la pantalla de retorno) evita que alguien con solo el código corto
 * arme cobros sobre citas ajenas.
 */
export async function iniciarAbono(
  codigo: string,
  token: string,
  montoElegido: number,
): Promise<ResultadoAbono> {
  if (!tokenValido(codigo, token)) return { ok: false, error: "No encontramos esa cita." };

  const cita = await prisma.appointment.findUnique({
    where: { code: codigo },
    include: { service: { select: { name: true, price: true } } },
  });
  if (!cita) return { ok: false, error: "No encontramos esa cita." };
  if (cita.status === "CANCELADA") return { ok: false, error: "Esa cita está cancelada." };
  if (cita.depositPaid > 0) return { ok: false, error: "Esa cita ya tiene un abono." };

  const maximo = maximoAbono(cita.priceOverride ?? cita.service.price);
  if (!maximo) return { ok: false, error: "El abono en línea no está disponible." };
  const monto = Math.round(Number(montoElegido));
  if (!Number.isFinite(monto) || monto < MONTO_MINIMO) {
    return { ok: false, error: `El abono mínimo es ${formatCOP(MONTO_MINIMO)}.` };
  }
  if (monto > maximo) {
    return { ok: false, error: `Tu cita cuesta ${formatCOP(maximo)}; no puedes abonar más que eso.` };
  }

  // Una referencia por intento: Bold exige que cada cobro tenga la suya, y
  // la clienta puede cerrar el pago y volver a intentarlo.
  let referencia = "";
  for (let intento = 0; intento < 5 && !referencia; intento++) {
    const candidata = `${cita.code}-A${generarCodigo().slice(-4)}`;
    try {
      await prisma.payment.create({
        data: { kind: "ABONO", appointmentId: cita.id, reference: candidata, amount: monto },
      });
      referencia = candidata;
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
  if (!referencia) return { ok: false, error: "No pudimos preparar el pago. Inténtalo de nuevo." };

  const urlRetorno = `${urlSitio()}/reservar/abono/${cita.code}?t=${token}`;
  return {
    ok: true,
    checkout: configCheckout({
      referencia,
      monto,
      descripcion: `${monto === maximo ? "Pago" : "Abono"} cita ${cita.code} · ${cita.service.name}`,
      urlRetorno,
      cliente: {
        nombre: cita.clientName,
        correo: cita.clientEmail,
        telefono: cita.clientPhone,
      },
    }),
  };
}
