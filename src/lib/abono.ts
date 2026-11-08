import "server-only";

import { getSettings } from "@/lib/site";

/** Lo menos que se cobra como abono (salvo servicios que cuestan menos). */
export const ABONO_MINIMO = 10_000;

/**
 * Abono obligatorio para reservar en línea: un porcentaje del precio final
 * (Configuración → Fases), redondeado a miles hacia arriba. Un servicio que
 * cuesta menos que el mínimo se paga completo. Precio 0 → sin abono.
 */
export async function reglasAbono(precioFinal: number) {
  const settings = await getSettings();
  const porcentaje = Math.min(100, Math.max(1, settings.num("booking.abonoPorcentaje", 50)));
  const minutos = Math.min(120, Math.max(5, settings.num("booking.minutosParaPagar", 20)));

  if (precioFinal <= 0) return { monto: 0, total: 0, minutos };
  const calculado = Math.ceil((precioFinal * porcentaje) / 100 / 1000) * 1000;
  const monto = Math.min(precioFinal, Math.max(ABONO_MINIMO, calculado));
  return { monto, total: precioFinal, minutos };
}
