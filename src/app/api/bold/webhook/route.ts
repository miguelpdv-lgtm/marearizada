import { NextResponse } from "next/server";

import { verificarFirmaWebhook, webhookConfiable } from "@/lib/bold";
import {
  registrarPagoAnulado,
  registrarPagoAprobado,
  registrarPagoRechazado,
} from "@/lib/pagos";

/**
 * Notificaciones de Bold. Se registra en bold.co → Integraciones → Webhooks
 * como {NEXT_PUBLIC_SITE_URL}/api/bold/webhook.
 *
 * Es la única ruta pública que no pasa por el middleware (su matcher es
 * `/admin/:path*`), y con razón: quien la llama es Bold, no una sesión. Lo que
 * la protege es la firma `x-bold-signature`.
 *
 * Bold espera respuesta en 2 segundos y reintenta hasta 5 veces (15 min, 1 h,
 * 4 h, 8 h y 24 h). Por eso el handler hace lo mínimo y por eso todo lo que
 * llama es idempotente: un reintento no duplica ventas ni movimientos de
 * stock. Si algo falla, devolvemos 500 a propósito para que Bold reintente en
 * vez de dar el evento por entregado.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EventoBold = {
  type?: string;
  subject?: string;
  data?: {
    payment_id?: string;
    reference?: string;
    payment_method?: string;
    payer_email?: string;
    metadata?: { reference?: string };
  };
};

export async function POST(request: Request) {
  // Sin llave de webhook en producción no hay nada que verificar: el HMAC de
  // una llave vacía lo calcula cualquiera. Antes que dar por pagado un pedido
  // que nadie pagó, se rechaza todo y se deja el aviso en el log.
  if (!webhookConfiable()) {
    console.error(
      "[bold] BOLD_WEBHOOK_SECRET está vacío en producción: se rechazan todos los webhooks.",
    );
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 });
  }

  // El cuerpo crudo, tal cual llegó: la firma se calcula sobre esos bytes.
  // Reserializar el JSON cambia un espacio y la validación deja de cuadrar.
  const cuerpo = await request.text();

  if (!verificarFirmaWebhook(cuerpo, request.headers.get("x-bold-signature"))) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  let evento: EventoBold;
  try {
    evento = JSON.parse(cuerpo);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const referencia = evento.data?.metadata?.reference ?? evento.data?.reference;
  if (!referencia) {
    // Firma válida pero sin referencia nuestra: se acepta para que Bold no
    // reintente en vano.
    return NextResponse.json({ ok: true, ignorado: "sin referencia" });
  }

  const datos = {
    boldPaymentId: evento.data?.payment_id ?? null,
    boldTransactionId: evento.subject ?? null,
    metodo: evento.data?.payment_method ?? null,
    correo: evento.data?.payer_email ?? null,
    payload: cuerpo,
  };

  try {
    switch (evento.type) {
      case "SALE_APPROVED":
        await registrarPagoAprobado(referencia, datos);
        break;
      case "SALE_REJECTED":
        await registrarPagoRechazado(referencia, datos);
        break;
      case "VOID_APPROVED":
        await registrarPagoAnulado(referencia, datos);
        break;
      default:
        // VOID_REJECTED y lo que Bold agregue después no cambian nuestro estado.
        break;
    }
  } catch (e) {
    console.error("[bold] falló el webhook", referencia, e);
    return NextResponse.json({ error: "Error procesando el evento" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
