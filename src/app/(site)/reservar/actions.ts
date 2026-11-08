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
  liberarVencidas,
} from "@/lib/agenda";
import { vincularCliente } from "@/lib/clients";
import { avisarCitaNueva } from "@/lib/correo/avisos";
import { registrarPagoAprobado, registrarPagoRechazado, tokenPublico, tokenValido } from "@/lib/pagos";
import { reglasAbono } from "@/lib/abono";
import { iniciarCobro, pasarelaActiva, type InicioCobro } from "@/lib/pasarela";
import { urlSitio } from "@/lib/site";
import { resumenCita, type InfoPago, type ResumenCita } from "./resumen";
import { descuentoReserva } from "@/lib/cupones";
import { etiquetaPromocion } from "@/lib/promociones";

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

/* --- Cupones -------------------------------------------------------------- */

export type ResultadoCupon =
  | { ok: true; nombre: string; etiqueta: string; descuento: number; precioFinal: number }
  | { ok: false; error: string };

/** Revisa un cupón contra el servicio elegido, antes de reservar. */
export async function revisarCupon(serviceId: string, cupon: string): Promise<ResultadoCupon> {
  const permiso = await consumir("cupon", await ipDeLaPeticion());
  if (!permiso.ok) {
    return { ok: false, error: `Probaste varios cupones seguidos. Espera ${esperaLegible(permiso.segundos)}.` };
  }
  const servicio = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, categoryId: true, price: true, active: true },
  });
  if (!servicio?.active) return { ok: false, error: "Ese servicio ya no está disponible." };
  const r = await descuentoReserva(servicio, cupon);
  if (!r.ok) return r;
  if (!r.descuento?.promocion.code) return { ok: false, error: "Ese cupón no mejora el precio de este servicio." };
  return {
    ok: true,
    nombre: r.descuento.promocion.name,
    etiqueta: etiquetaPromocion(r.descuento.promocion),
    descuento: r.descuento.monto,
    precioFinal: r.descuento.precioFinal,
  };
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
  cupon: z.string().trim().max(40).optional(),
});

export type DatosReserva = z.infer<typeof esquema>;

export type ResultadoReserva =
  | {
      ok: true;
      codigo: string;
      /** Para las acciones del pago y la pantalla de retorno. */
      token: string;
      resumen: ResumenCita;
      /** null si el servicio no cobra abono y la cita ya quedó confirmada. */
      pago: InfoPago | null;
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

  // Sin pasarela no se puede cobrar el abono, y sin abono no hay reserva.
  if (!pasarelaActiva()) {
    return { ok: false, error: "La reserva en línea abre muy pronto. Mientras tanto, escríbenos por WhatsApp." };
  }
  // Las reservas que no se pagaron a tiempo sueltan su cupo (y su cupón).
  await liberarVencidas();

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
    return { ok: false, error: "Ese servicio se agenda directamente con el salón: escríbenos por WhatsApp." };
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

  // El precio se resuelve acá, nunca con lo que mande el navegador.
  const precio = await descuentoReserva(servicio, d.cupon);
  if (!precio.ok) return { ok: false, error: precio.error, campo: "cupon" };
  const descuento = precio.descuento;

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

  const precioFinal = descuento?.precioFinal ?? servicio.price;
  const reglas = await reglasAbono(precioFinal);
  const conAbono = reglas.monto > 0;

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
          // Con abono, el cupo queda apartado mientras paga; la confirmación
          // (y su correo) sale cuando la pasarela aprueba el pago.
          status: conAbono ? "POR_PAGAR" : "PENDIENTE",
          holdUntil: conAbono ? new Date(Date.now() + reglas.minutos * 60_000) : null,
          clientName: d.clientName,
          clientPhone: d.clientPhone,
          clientEmail: d.clientEmail || null,
          clientId,
          notes: d.notes || null,
          firstVisit: d.firstVisit ?? false,
          curlType: d.curlType ?? null,
          ...(descuento
            ? { promotionId: descuento.promocion.id, discount: descuento.monto, priceOverride: descuento.precioFinal }
            : {}),
        },
      });

      // Un servicio sin costo no tiene abono: se confirma como antes.
      if (!conAbono) avisarCitaNueva(cita.id);

      const r = await resumenCita(cita.code);
      if (!r) throw new Error("La cita no se pudo leer después de crearla.");
      return { ok: true, codigo: cita.code, token: tokenPublico(cita.code), resumen: r.resumen, pago: r.pago };
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

/* --- Pago del abono -------------------------------------------------------- */

export type EstadoReserva =
  | { ok: true; resumen: ResumenCita; pago: InfoPago | null; vencida: boolean }
  | { ok: false; error: string };

/** Cómo va la reserva: para la pantalla del pago y la de retorno. */
export async function estadoReserva(codigo: string, token: string): Promise<EstadoReserva> {
  if (!tokenValido(codigo, token)) return { ok: false, error: "No encontramos esa reserva." };
  const r = await resumenCita(codigo);
  if (!r) return { ok: false, error: "No encontramos esa reserva." };
  return { ok: true, resumen: r.resumen, pago: r.pago, vencida: r.vencida };
}

export type ResultadoInicioPago =
  | { ok: true; inicio: InicioCobro }
  | { ok: false; error: string; vencida?: boolean };

/**
 * Prepara el cobro: el abono o el total, según elija la clienta. Los montos
 * salen del servidor; del navegador solo llega cuál de los dos quiere.
 */
export async function iniciarPago(
  codigo: string,
  token: string,
  modo: "ABONO" | "TOTAL",
): Promise<ResultadoInicioPago> {
  if (!tokenValido(codigo, token)) return { ok: false, error: "No encontramos esa reserva." };
  const r = await resumenCita(codigo);
  if (!r) return { ok: false, error: "No encontramos esa reserva." };
  const { cita, pago } = r;
  if (cita.status !== "POR_PAGAR" || !pago || !cita.holdUntil) {
    return { ok: false, error: "Esta reserva ya no está esperando un pago." };
  }
  // Con menos de un minuto no alcanza a pagar: mejor que elija otra vez.
  if (cita.holdUntil.getTime() - Date.now() < 60_000) {
    return { ok: false, vencida: true, error: "Se acabó el tiempo para pagar y el cupo se liberó." };
  }

  const monto = modo === "TOTAL" ? pago.total : pago.abono;
  let referencia = "";
  for (let intento = 0; intento < 5 && !referencia; intento++) {
    const candidata = `${cita.code}-${generarCodigo().slice(-4)}`;
    try {
      await prisma.payment.create({
        data: { kind: "ABONO", appointmentId: cita.id, reference: candidata, amount: monto, gateway: pasarelaActiva() },
      });
      referencia = candidata;
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
  if (!referencia) return { ok: false, error: "No pudimos preparar el pago. Inténtalo de nuevo." };

  try {
    const inicio = await iniciarCobro({
      referencia,
      monto,
      descripcion: `${monto >= pago.total ? "Pago" : "Abono"} cita ${cita.code} · ${cita.service.name}`,
      urlRetorno: `${urlSitio()}/reservar/pago/${cita.code}?t=${token}`,
      expira: cita.holdUntil,
      cliente: { nombre: cita.clientName, correo: cita.clientEmail, telefono: cita.clientPhone },
    });
    return { ok: true, inicio };
  } catch {
    return { ok: false, error: "El pago en línea no está disponible en este momento. Escríbenos por WhatsApp." };
  }
}

/**
 * Solo en modo de prueba: hace de pasarela y aprueba o rechaza el cobro.
 * Con una pasarela real esta acción no hace nada.
 */
export async function simularPago(
  codigo: string,
  token: string,
  referencia: string,
  aprobado: boolean,
): Promise<EstadoReserva> {
  if (pasarelaActiva() !== "PRUEBA") return { ok: false, error: "Simulación no disponible." };
  if (!tokenValido(codigo, token) || !referencia.startsWith(`${codigo}-`)) {
    return { ok: false, error: "No encontramos esa reserva." };
  }
  const datos = { pasarela: "PRUEBA", metodo: "PRUEBA", transaccionId: `prueba-${referencia}` };
  if (aprobado) await registrarPagoAprobado(referencia, datos);
  else await registrarPagoRechazado(referencia, datos);
  return estadoReserva(codigo, token);
}

/** La clienta quiere cambiar algo antes de pagar: suelta el cupo apartado. */
export async function soltarReserva(codigo: string, token: string) {
  if (!tokenValido(codigo, token)) return;
  await prisma.appointment.updateMany({
    where: { code: codigo, status: "POR_PAGAR" },
    data: {
      status: "CANCELADA",
      cancelledAt: new Date(),
      // El plazo termina ya: si llegara un pago tarde, se revisa el cupo.
      holdUntil: new Date(),
      internalNotes: "La clienta volvió atrás antes de pagar el abono.",
    },
  });
}
