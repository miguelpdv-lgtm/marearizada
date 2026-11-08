import "server-only";

import { prisma } from "@/lib/db";

/** Igual que la normalización de `prisma/import-legacy.mjs` — quita todo lo
 * que no sea dígito y le quita el prefijo `57` si quedan 12 dígitos. */
function normalizarTelefono(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("57")) return digits.slice(2);
  return digits;
}

/**
 * Directorio real de clientes: se llama cada vez que se guarda una cita o
 * una venta con datos de cliente, para que `Client` (y por lo tanto
 * `/admin/clientes`) siempre refleje lo que pasa en vivo, no solo lo
 * importado del histórico. Dedup por teléfono — es el único dato que los
 * tres flujos (reserva pública, reserva de panel, venta) siempre piden.
 */
export async function vincularCliente({
  name,
  phone,
  email,
  document,
  documentType,
}: {
  name: string;
  phone: string;
  email?: string | null;
  /** Ya normalizado — ver `normalizarDocumento` en src/lib/documentos.ts. */
  document?: string | null;
  /** Código DIAN del tipo de documento, no las siglas. */
  documentType?: string | null;
}): Promise<string | null> {
  const tel = normalizarTelefono(phone);
  if (!tel) return null;

  // El documento y el correo solo se pisan si vienen: una venta de mostrador
  // sin documento no debe borrar el que ya dio la clienta en la tienda.
  const cliente = await prisma.client.upsert({
    where: { phone: tel },
    update: {
      name,
      ...(email ? { email } : {}),
      ...(document ? { document } : {}),
      ...(documentType ? { documentType } : {}),
    },
    create: {
      name,
      phone: tel,
      email: email || null,
      document: document || null,
      documentType: documentType || null,
    },
  });
  return cliente.id;
}
