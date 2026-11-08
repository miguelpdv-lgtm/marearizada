"use server";

import { prisma } from "@/lib/db";
import {
  aUtc,
  asignarProfesional,
  configAgenda,
  diasConCupo,
  hoyBogota,
  horasLibres,
  sumarDias,
} from "@/lib/agenda";
import { avisarCambioAlSalon, avisarCitaReagendada } from "@/lib/correo/avisos";
import { consumir, esperaLegible, ipDeLaPeticion, perdonar } from "@/lib/rateLimit";

import { cargarCita, motivoNoCambiable, normalizarCodigo, tokenCambio } from "./cita";

/**
 * La clienta cambia su cita sola con el código que le llegó al reservar.
 *
 * El código (MR-XXXX) es corto y se puede adivinar, así que buscarlo pide
 * además el celular con el que reservó. Encontrada la cita, se trabaja con un
 * token firmado (el mismo que va en el enlace del correo), nunca con el código
 * solo.
 */

/** Los mismos 10 dígitos de un celular colombiano, con o sin +57, espacios o guiones. */
const ultimos10 = (tel: string) => tel.replace(/\D/g, "").slice(-10);

export async function buscarMiCita(
  codigoEscrito: string,
  celular: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const ip = await ipDeLaPeticion();
  const permiso = await consumir("cita-buscar", ip);
  if (!permiso.ok) {
    return {
      ok: false,
      error: `Demasiados intentos. Espera ${esperaLegible(permiso.segundos)} o escríbenos por WhatsApp.`,
    };
  }

  const codigo = normalizarCodigo(codigoEscrito);
  if (!codigo) return { ok: false, error: "Escribe el código de tu cita, por ejemplo MR-7K3P." };
  if (ultimos10(celular).length < 10) return { ok: false, error: "Escribe el celular con el que reservaste." };

  const cita = await prisma.appointment.findUnique({
    where: { code: codigo },
    select: { code: true, clientPhone: true },
  });
  // Mismo mensaje si no existe o si el celular no coincide: no dice qué códigos existen.
  if (!cita || ultimos10(cita.clientPhone) !== ultimos10(celular)) {
    return {
      ok: false,
      error: "No encontramos una cita con ese código y ese celular. Revisa el correo de confirmación.",
    };
  }

  await perdonar("cita-buscar", ip);
  return { ok: true, url: `/reservar/cambiar?codigo=${cita.code}&t=${tokenCambio(cita.code)}` };
}

/** Qué días tienen hora libre para la duración de esta cita (para el calendario). */
export async function diasParaCambiar(codigo: string, token: string, desde: string, dias: number) {
  const cita = await cargarCita(codigo, token);
  if (!cita || !/^\d{4}-\d{2}-\d{2}$/.test(desde)) return {};
  return diasConCupo(cita.branchId, cita.serviceId, desde, Math.min(dias, 62), {
    excluirCitaId: cita.id,
    duracion: cita.duracionMin,
  });
}

export async function horasParaCambiar(codigo: string, token: string, fecha: string) {
  const cita = await cargarCita(codigo, token);
  if (!cita || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return [];
  return horasLibres(cita.branchId, cita.serviceId, fecha, {
    excluirCitaId: cita.id,
    duracion: cita.duracionMin,
  });
}

export type ResultadoCambio = { ok: true; inicio: string } | { ok: false; error: string };

export async function cambiarMiCita(
  codigo: string,
  token: string,
  fecha: string,
  hora: string,
): Promise<ResultadoCambio> {
  const cita = await cargarCita(codigo, token);
  if (!cita) return { ok: false, error: "Este enlace ya no es válido. Busca tu cita de nuevo." };

  const permiso = await consumir("cita-cambiar", await ipDeLaPeticion());
  if (!permiso.ok) {
    return { ok: false, error: `Ya hiciste varios cambios. Espera ${esperaLegible(permiso.segundos)}.` };
  }

  const cfg = await configAgenda();
  const motivo = motivoNoCambiable(cita, cfg.minHorasAntes);
  if (motivo) return { ok: false, error: motivo };
  if (cita.branch.closedNotice) return { ok: false, error: cita.branch.closedNotice };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) {
    return { ok: false, error: "Elige el día y la hora nuevos." };
  }
  const inicio = aUtc(fecha, hora);
  if (inicio.getTime() === cita.startsAt.getTime()) {
    return { ok: false, error: "Esa ya es la hora de tu cita." };
  }
  if (inicio.getTime() < Date.now() + cfg.minHorasAntes * 3600_000) {
    return { ok: false, error: `Necesitamos al menos ${cfg.minHorasAntes} horas de antelación.` };
  }
  if (fecha > sumarDias(hoyBogota(), cfg.maxDiasAdelante)) {
    return { ok: false, error: "Esa fecha todavía no está abierta en la agenda." };
  }

  // Se comprueba el cupo justo antes de guardar y se elige quién atiende:
  // si su profesional sigue libre a esa hora, se queda con ella.
  const staffId = await asignarProfesional(cita.branchId, cita.serviceId, fecha, hora, {
    excluirCitaId: cita.id,
    duracion: cita.duracionMin,
    preferir: cita.staffId,
  });
  if (!staffId) return { ok: false, error: "Justo acaban de tomar esa hora. Elige otra, por favor." };

  const anterior = cita.startsAt;
  const actualizada = await prisma.appointment.update({
    where: { id: cita.id },
    data: {
      startsAt: inicio,
      endsAt: new Date(inicio.getTime() + cita.duracionMin * 60_000),
      staffId,
    },
    select: { startsAt: true },
  });

  avisarCitaReagendada(cita.id);
  avisarCambioAlSalon(cita.id, anterior);

  return { ok: true, inicio: actualizada.startsAt.toISOString() };
}

