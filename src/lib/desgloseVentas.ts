import "server-only";

import { prisma } from "@/lib/db";
import { METODO_PAGO_LABEL, type MetodoPago } from "@/lib/constants";
import { COLORES_DONA } from "@/components/admin/coloresDona";
import type { Tajada } from "@/components/admin/GraficaDona";

/**
 * Lo pagado en un rango, partido de dos formas: servicios vs. productos y por
 * medio de pago. Alimenta las donas de Ventas y de Reportes, para que las dos
 * páginas digan lo mismo.
 *
 * Cuenta lo mismo que la tabla de Ventas: ventas registradas (ya con
 * descuentos) y citas atendidas que todavía no pasaron por "Finalizar".
 * Todo en pesos pagados.
 */
export async function desgloseVentas({
  branchIds,
  desde,
  hasta,
}: {
  branchIds: string[];
  /** Rango en UTC; sin él, todo el histórico. */
  desde?: Date;
  hasta?: Date;
}) {
  const rango = desde && hasta ? { gte: desde, lt: hasta } : undefined;
  const sede = { branchId: { in: branchIds } };

  const [ventas, citas] = await Promise.all([
    prisma.sale.findMany({
      where: { ...sede, ...(rango ? { createdAt: rango } : {}) },
      select: {
        paymentMethod: true,
        items: { select: { kind: true, unitPrice: true, quantity: true, discount: true } },
        payments: { select: { method: true, amount: true } },
      },
    }),
    prisma.appointment.findMany({
      where: {
        ...sede,
        status: "ATENDIDA",
        // Las finalizadas ya cuentan como venta.
        sale: null,
        ...(rango ? { startsAt: rango } : {}),
      },
      select: {
        paymentMethod: true,
        depositPaid: true,
        priceOverride: true,
        service: { select: { price: true } },
        items: { select: { kind: true, unitPrice: true, quantity: true } },
      },
    }),
  ]);

  const porTipo = { SERVICE: 0, PRODUCT: 0 };
  const porMetodo: Record<string, number> = {};
  const sumarMetodo = (metodo: string | null | undefined, monto: number) => {
    if (monto <= 0) return;
    const clave = metodo && metodo in METODO_PAGO_LABEL ? metodo : "SIN";
    porMetodo[clave] = (porMetodo[clave] ?? 0) + monto;
  };

  for (const venta of ventas) {
    let pagado = 0;
    for (const item of venta.items) {
      const neto = item.unitPrice * item.quantity - item.discount;
      porTipo[item.kind === "PRODUCT" ? "PRODUCT" : "SERVICE"] += neto;
      pagado += neto;
    }
    // Pago repartido en varios medios: cada parte en el suyo.
    if (venta.payments.length > 0) for (const pago of venta.payments) sumarMetodo(pago.method, pago.amount);
    else sumarMetodo(venta.paymentMethod, pagado);
  }

  for (const cita of citas) {
    const precio = cita.priceOverride ?? cita.service.price;
    porTipo.SERVICE += precio;
    let pagado = precio;
    for (const item of cita.items) {
      porTipo[item.kind === "PRODUCT" ? "PRODUCT" : "SERVICE"] += item.unitPrice * item.quantity;
      pagado += item.unitPrice * item.quantity;
    }
    // El abono entró en línea; el resto, con lo que se haya anotado en la cita.
    const abono = Math.min(cita.depositPaid, pagado);
    sumarMetodo("EN_LINEA", abono);
    sumarMetodo(cita.paymentMethod, pagado - abono);
  }

  return { porTipo, porMetodo };
}

/** Color fijo por medio de pago: no cambia aunque un día falte alguno. */
const COLOR_METODO: Record<MetodoPago, string> = {
  EFECTIVO: COLORES_DONA.azul,
  TRANSFERENCIA: COLORES_DONA.naranja,
  DATAFONO: COLORES_DONA.aguamarina,
  EN_LINEA: COLORES_DONA.ciruela,
};

/** Las tajadas de las dos donas a partir del desglose. */
export function tajadasDesglose({ porTipo, porMetodo }: Awaited<ReturnType<typeof desgloseVentas>>) {
  const tipo: Tajada[] = [
    { id: "SERVICE", label: "Servicios", valor: porTipo.SERVICE, color: COLORES_DONA.azul },
    { id: "PRODUCT", label: "Productos", valor: porTipo.PRODUCT, color: COLORES_DONA.naranja },
  ];
  const metodo: Tajada[] = [
    ...(Object.keys(COLOR_METODO) as MetodoPago[]).map((m) => ({
      id: m,
      label: METODO_PAGO_LABEL[m],
      valor: porMetodo[m] ?? 0,
      color: COLOR_METODO[m],
    })),
    { id: "SIN", label: "Sin especificar", valor: porMetodo.SIN ?? 0, color: COLORES_DONA.gris },
  ];
  return { tipo, metodo };
}
