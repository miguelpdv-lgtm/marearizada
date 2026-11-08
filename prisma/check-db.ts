/**
 * Comprueba que la conexión a Supabase esté bien configurada.
 *
 *   npm run db:check
 *
 * Verifica las dos cadenas, se conecta, mide la latencia y cuenta las filas
 * de cada tabla para confirmar que las migraciones y el seed corrieron.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function revisarCadena(nombre: string, valor: string | undefined) {
  if (!valor) return `${nombre}: ❌ vacía`;

  try {
    const u = new URL(valor);
    const puerto = u.port || "5432";
    const pooler = u.hostname.includes("pooler.supabase.com");
    const pgbouncer = valor.includes("pgbouncer=true");

    const avisos: string[] = [];
    if (nombre === "DATABASE_URL") {
      if (puerto !== "6543") avisos.push("se espera el puerto 6543 (transaction pooler)");
      if (!pgbouncer) avisos.push("le falta ?pgbouncer=true&connection_limit=1");
    }
    if (nombre === "DIRECT_URL") {
      if (puerto !== "5432") avisos.push("se espera el puerto 5432 (session pooler)");
      if (!pooler) {
        avisos.push(
          "usa el host …pooler.supabase.com; db.<ref>.supabase.co es solo IPv6",
        );
      }
    }

    const estado = avisos.length ? `⚠️  ${avisos.join(" · ")}` : "✅";
    return `${nombre}: ${estado}  (${u.hostname}:${puerto})`;
  } catch {
    return `${nombre}: ❌ no es una URL válida`;
  }
}

async function main() {
  console.log("Configuración\n");
  console.log("  " + revisarCadena("DATABASE_URL", process.env.DATABASE_URL));
  console.log("  " + revisarCadena("DIRECT_URL", process.env.DIRECT_URL));

  if (!process.env.DATABASE_URL) {
    console.log("\n❌ Falta DATABASE_URL en .env. Revisa .env.example.");
    process.exit(1);
  }

  console.log("\nConexión\n");
  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log(`  ✅ Conectado en ${Date.now() - t0} ms`);
  } catch (e) {
    console.log(`  ❌ No se pudo conectar: ${(e as Error).message}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  const version = await prisma.$queryRaw<{ version: string }[]>`SELECT version()`;
  console.log(`  ${version[0].version.split(",")[0]}`);

  console.log("\nContenido\n");
  const conteos: [string, number][] = [
    ["Usuarios", await prisma.user.count()],
    ["Sucursales", await prisma.branch.count()],
    ["Servicios", await prisma.service.count()],
    ["Productos", await prisma.product.count()],
    ["Equipo", await prisma.teamMember.count()],
    ["Historias", await prisma.testimonial.count()],
    ["Galería", await prisma.galleryItem.count()],
    ["Artículos", await prisma.post.count()],
    ["Espacios de medios", await prisma.mediaSlot.count()],
    ["Ajustes", await prisma.setting.count()],
  ];

  for (const [nombre, n] of conteos) {
    console.log(`  ${nombre.padEnd(20)} ${n}`);
  }

  const total = conteos.reduce((a, [, n]) => a + n, 0);
  console.log(
    total === 0
      ? "\n⚠️  Las tablas están vacías. Corre: npm run db:seed"
      : "\n✅ Todo listo.",
  );

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
