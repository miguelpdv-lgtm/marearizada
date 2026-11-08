"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireUserForAction } from "@/lib/auth";
import { sedesPermitidas } from "@/lib/branchAccess";
import { canManageContent, METODOS_PAGO } from "@/lib/constants";
import { generarCodigoVenta } from "@/lib/codigos";
import { formatCOP } from "@/lib/format";
import { moverStock } from "@/lib/stock";
import { vincularCliente } from "@/lib/clients";
import { mejorDescuento, promocionesVigentes } from "@/lib/promociones";
import { avisarVentaMostrador } from "@/lib/correo/avisos";
import {
  CODIGOS_DOCUMENTO,
  normalizarDocumento,
  validarDocumento,
} from "@/lib/documentos";

/** Venta de mostrador: productos (y opcionalmente servicios ya prestados)
 * vendidos sin que haya una cita de por medio. Ver items-actions.ts en
 * agenda/ para el caso de vender dentro de una cita — son casos separados
 * a propósito (no polimórficos), siguiendo el estilo del schema. */

const itemSchema = z.object({
  kind: z.enum(["SERVICE", "PRODUCT"]),
  id: z.string().min(1),
  quantity: z.number().int().min(1),
  /// Rebaja en pesos sobre el total de la línea. El tope contra el valor de la
  /// línea se valida abajo, cuando ya se conoce el precio real de la base.
  discount: z.number().int().min(0).optional(),
  /// Quién vendió esta línea, para su comisión.
  staffId: z.string().optional(),
  /// Solo servicios: el precio que se cobró, para los de precio variable
  /// ("desde $35.000" según el largo). Sin él, el del catálogo.
  precio: z.number().int().min(0).optional(),
});

const pagoSchema = z.object({
  method: z.enum(METODOS_PAGO),
  amount: z.number().int().min(0),
});

const ventaSchema = z.object({
  branchId: z.string().min(1, "Elige una sede."),
  clientName: z.string().trim().max(200).optional(),
  clientPhone: z.string().trim().max(30).optional(),
  // Identificación de quien compra. Opcional: solo si la clienta la da.
  // Si se elige un tipo, el número deja de ser opcional.
  clientDocType: z.enum(CODIGOS_DOCUMENTO as [string, ...string[]]).optional(),
  clientDocument: z.string().trim().max(30).optional(),
  /// Cómo se pagó. Vacío = sin especificar. Con una sola parte y sin dividir,
  /// su valor se toma del total que calcula el servidor (con promociones).
  pagos: z.array(pagoSchema).max(6).optional(),
  pagoDividido: z.boolean().optional(),
  notes: z.string().trim().max(600).optional(),
  items: z.array(itemSchema).min(1, "Agrega al menos un producto o servicio."),
})
  .superRefine((d, ctx) => {
    if (!d.clientDocType) return;
    const problema = validarDocumento(d.clientDocType, d.clientDocument ?? "");
    if (problema) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["clientDocument"], message: problema });
    }
  });

export type VentaInput = z.infer<typeof ventaSchema>;

export type VentaResultado =
  | { ok: true; id: string; code: string }
  | { ok: false; error: string };

export async function crearVenta(datos: VentaInput): Promise<VentaResultado> {
  const user = await requireUserForAction(canManageContent);

  const parsed = ventaSchema.safeParse(datos);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const d = parsed.data;

  const sede = await prisma.branch.findUnique({ where: { id: d.branchId } });
  if (!sede) return { ok: false, error: "Esa sede ya no existe." };
  if (sedesPermitidas(user, [sede]).length === 0) {
    return { ok: false, error: "No tienes acceso a esa sede." };
  }

  const itemsData: {
    kind: string;
    serviceId?: string;
    productId?: string;
    name: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    staffId: string | null;
  }[] = [];

  // Solo se acepta una profesional activa; lo demás queda sin asignar.
  const equipoActivo = new Set(
    (await prisma.teamMember.findMany({ where: { active: true }, select: { id: true } })).map(
      (p) => p.id,
    ),
  );
  const vendedora = (id: string | undefined) => (id && equipoActivo.has(id) ? id : null);

  /**
   * El descuento se recorta contra el precio que manda la base, no contra el
   * que vino del formulario: el navegador puede mandar cualquier cosa, y un
   * descuento mayor al valor de la línea dejaría un precio negativo.
   */
  const descuentoValido = (pedido: number | undefined, valorLinea: number) =>
    Math.max(0, Math.min(valorLinea, pedido ?? 0));

  // Promociones vigentes para el canal de caja. Se traen una sola vez para
  // toda la venta: son pocas y así no se consulta la base por cada línea.
  const promociones = await promocionesVigentes();

  /**
   * Qué descuento lleva la línea.
   *
   * El que escribió el equipo manda: si alguien en caja acordó una rebaja con
   * la clienta, una promoción automática no puede pisársela. La promoción solo
   * entra cuando la casilla quedó vacía.
   */
  function descuentoDeLinea(
    manual: number | undefined,
    item: Parameters<typeof mejorDescuento>[0],
    cantidad: number,
  ) {
    const total = item.precio * cantidad;
    if (manual && manual > 0) return descuentoValido(manual, total);

    const promo = mejorDescuento(item, promociones, "MOSTRADOR");
    return promo ? descuentoValido(promo.monto * cantidad, total) : 0;
  }

  for (const item of d.items) {
    if (item.kind === "SERVICE") {
      const servicio = await prisma.service.findUnique({ where: { id: item.id } });
      if (!servicio) return { ok: false, error: "Uno de los servicios elegidos ya no existe." };
      // El precio que se cobró, si el equipo lo ajustó (servicios de precio
      // variable); si no, el del catálogo.
      const precio = item.precio ?? servicio.price;
      itemsData.push({
        kind: "SERVICE",
        serviceId: servicio.id,
        name: servicio.name,
        quantity: item.quantity,
        unitPrice: precio,
        discount: descuentoDeLinea(
          item.discount,
          {
            tipo: "SERVICIO",
            id: servicio.id,
            categoriaId: servicio.categoryId,
            precio,
          },
          item.quantity,
        ),
        staffId: vendedora(item.staffId),
      });
    } else {
      const producto = await prisma.product.findUnique({ where: { id: item.id } });
      if (!producto) return { ok: false, error: "Uno de los productos elegidos ya no existe." };
      const stockSede = await prisma.productStock.findUnique({
        where: { productId_branchId: { productId: producto.id, branchId: d.branchId } },
      });
      const disponible = stockSede?.stock ?? 0;
      if (item.quantity > disponible) {
        return {
          ok: false,
          error: `Solo quedan ${disponible} unidades de "${producto.name}" en esta sede.`,
        };
      }
      itemsData.push({
        kind: "PRODUCT",
        productId: producto.id,
        name: producto.name,
        quantity: item.quantity,
        unitPrice: producto.price,
        discount: descuentoDeLinea(
          item.discount,
          {
            tipo: "PRODUCTO",
            id: producto.id,
            categoriaId: producto.categoryId,
            precio: producto.price,
          },
          item.quantity,
        ),
        staffId: vendedora(item.staffId),
      });
    }
  }

  // El total que vale es el de acá (con promociones aplicadas), no el que
  // calculó el navegador.
  const total = itemsData.reduce((a, i) => a + i.unitPrice * i.quantity - i.discount, 0);

  const pagos = d.pagos ?? [];
  let pagosData: { method: string; amount: number }[] = [];
  if (pagos.length === 1 && !d.pagoDividido) {
    pagosData = [{ method: pagos[0].method, amount: total }];
  } else if (pagos.length > 0) {
    pagosData = pagos.filter((p) => p.amount > 0);
    const suma = pagosData.reduce((a, p) => a + p.amount, 0);
    if (suma !== total) {
      return {
        ok: false,
        // La diferencia más común es una promoción que se aplicó sola al
        // guardar y que el formulario no conocía.
        error: `Los pagos suman ${formatCOP(suma)} y la venta da ${formatCOP(total)} (puede haberse aplicado una promoción). Ajusta los valores.`,
      };
    }
  }
  // El medio "principal" (el de más valor), para las vistas de una sola columna.
  const medioPrincipal =
    [...pagosData].sort((a, b) => b.amount - a.amount)[0]?.method ?? null;

  // Si toda la venta la hizo una sola persona, queda también como la de la
  // venta; con varias, cada línea lleva la suya.
  const vendedoras = new Set(itemsData.map((i) => i.staffId));
  const staffVenta = vendedoras.size === 1 ? [...vendedoras][0] : null;

  const documento =
    d.clientDocType && d.clientDocument
      ? normalizarDocumento(d.clientDocType, d.clientDocument)
      : null;

  const clientId = d.clientPhone
    ? await vincularCliente({
        name: d.clientName || d.clientPhone,
        phone: d.clientPhone,
        document: documento,
        documentType: documento ? d.clientDocType : null,
      })
    : null;

  let venta: { id: string; code: string } | null = null;
  for (let intento = 0; intento < 5 && !venta; intento++) {
    try {
      venta = await prisma.sale.create({
        data: {
          code: generarCodigoVenta(),
          branchId: d.branchId,
          clientName: d.clientName || null,
          clientPhone: d.clientPhone || null,
          clientDocType: documento ? d.clientDocType : null,
          clientDocument: documento,
          clientId,
          staffId: staffVenta,
          soldById: user.id,
          paymentMethod: medioPrincipal,
          notes: d.notes || null,
          items: { create: itemsData },
          payments: { create: pagosData },
        },
        select: { id: true, code: true },
      });
    } catch (e) {
      const err = e as { code?: string };
      if (err.code === "P2002" && intento < 4) continue;
      return { ok: false, error: "No pudimos guardar la venta. Inténtalo de nuevo." };
    }
  }
  if (!venta) return { ok: false, error: "No pudimos generar el código de la venta." };

  for (const item of itemsData) {
    if (item.kind !== "PRODUCT" || !item.productId) continue;
    await moverStock({
      productId: item.productId,
      branchId: d.branchId,
      delta: -item.quantity,
      cause: "Venta",
      comment: `Venta ${venta.code}`,
      staffId: user.id,
    });
  }

  // Comprobante a la clienta, si tiene correo registrado.
  avisarVentaMostrador(venta.id);

  revalidatePath("/admin/ventas");
  return { ok: true, id: venta.id, code: venta.code };
}

export async function eliminarVenta(formData: FormData) {
  const user = await requireUserForAction(canManageContent);

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const venta = await prisma.sale.findUnique({ where: { id }, include: { items: true } });
  if (!venta) return;
  // La venta de una cita se deshace desde la agenda ("Reabrir"): los
  // productos siguen dentro de la cita y no se pueden devolver al inventario
  // desde acá sin descuadrarlo.
  if (venta.appointmentId) redirect(`/admin/ventas/${id}?error=cita`);

  for (const item of venta.items) {
    if (item.kind !== "PRODUCT" || !item.productId) continue;
    await moverStock({
      productId: item.productId,
      branchId: venta.branchId,
      delta: item.quantity,
      cause: "Ajuste manual",
      comment: `Venta ${venta.code} eliminada`,
      staffId: user.id,
    });
  }

  await prisma.sale.delete({ where: { id } });
  revalidatePath("/admin/ventas");
  redirect("/admin/ventas?ok=eliminada");
}

/* --- Buscar clientes para la venta ------------------------------------------ */

export type ClienteEncontrado = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  document: string | null;
  documentType: string | null;
};

/**
 * Busca en el directorio de clientes por nombre, celular o documento, para
 * llenar la venta con un clic. Se busca en el servidor (no se manda la lista
 * entera al navegador): son miles de clientes con datos personales.
 */
export async function buscarClientesVenta(q: string): Promise<ClienteEncontrado[]> {
  await requireUserForAction(canManageContent);
  const texto = q.trim();
  if (texto.length < 2) return [];
  const digitos = texto.replace(/\D/g, "");

  return prisma.client.findMany({
    where: {
      OR: [
        // Cada palabra tiene que aparecer en el nombre: "vale rojas" encuentra
        // a "Valentina Rojas".
        { AND: texto.split(/\s+/).map((p) => ({ name: { contains: p, mode: "insensitive" as const } })) },
        ...(digitos.length >= 3
          ? [{ phone: { contains: digitos } }, { document: { contains: digitos } }]
          : []),
        { email: { contains: texto, mode: "insensitive" as const } },
      ],
    },
    select: { id: true, name: true, phone: true, email: true, document: true, documentType: true },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });
}
