/**
 * Capturas del panel para el manual (`docs/manual/`).
 *
 * Se corre con `npm run manual:capturas` contra el sitio ya construido y
 * levantado en local (`npm run build && npm run start`).
 *
 * Dos cosas que hace y conviene entender:
 *
 * 1. **Entra al panel firmando un token de sesión** con `AUTH_SECRET`, en vez
 *    de rellenar el formulario de login. Automatizar el login real obligaría a
 *    tener una contraseña en el script, y esto usa exactamente el mismo
 *    mecanismo que el panel valida.
 *
 * 2. **Anonimiza antes de disparar la foto.** El panel muestra nombres,
 *    celulares y correos de clientas reales, y el manual es un documento que
 *    circula. Los nombres se sustituyen por inventados de forma consistente
 *    —la misma clienta sale siempre igual— y los celulares y correos por
 *    valores de ejemplo. Sin esto habría que elegir entre un manual con
 *    capturas inútiles o publicar la base de clientas.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import puppeteer from "puppeteer";

const BASE = process.env.CAPTURAS_URL ?? "http://localhost:3000";
const DESTINO = path.resolve("docs/manual/capturas");

const prisma = new PrismaClient();

/**
 * Nombres de relleno, combinando dos listas: 20 x 20 dan 400 combinaciones, las
 * suficientes para que no se repita el mismo nombre en filas contiguas de una
 * tabla —que es lo que delata una captura trucada—.
 */
const PILA = ["Valentina", "Mariana", "Camila", "Daniela", "Laura", "Sofía",
  "Andrea", "Paula", "Isabela", "Natalia", "Juliana", "Carolina", "Manuela",
  "Sara", "Alejandra", "Gabriela", "Luciana", "Antonia", "Emilia", "Renata"];
const APELLIDOS = ["Restrepo", "Ochoa", "Arango", "Herrera", "Jiménez",
  "Cabrera", "Mendoza", "Rivera", "Guzmán", "Peña", "Salazar", "Vélez",
  "Castaño", "Montoya", "Ruiz", "Osorio", "Pardo", "Bermúdez", "Chacón",
  "Acosta"];
const NOMBRES = PILA.flatMap((n) => APELLIDOS.map((a) => `${n} ${a}`));

/**
 * Palabras que NO se tocan aunque coincidan con el nombre de alguna clienta.
 *
 * Hay una clienta registrada como "Amicrespa" —seguramente una prueba del
 * propio salón—, y sin esta lista la sustitución se comía la marca en toda la
 * interfaz: la barra superior pasaba a decir "Gestión interna · Manuela
 * Castaño".
 */
const INTOCABLES = new Set(["amicrespa", "admin", "administrador", "cliente",
  "clienta", "prueba", "test", "consumidor final"]);

async function sesion() {
  const user = await prisma.user.findFirstOrThrow({
    where: { active: true, role: "ADMIN" },
    select: { id: true, name: true },
  });
  const token = await new SignJWT({ sub: user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(new Date(Date.now() + 3600_000))
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  return { token, user };
}

/**
 * El mapa de sustitución. Se arma en Node —donde está la base— y se inyecta en
 * la página, que solo aplica lo que le llega.
 *
 * Se ordenan de más largo a más corto para que "María Fernanda" se reemplace
 * entera antes de que "María" se la coma por delante.
 */
async function mapaAnonimo() {
  // Además de las fichas, los nombres escritos en las citas y en los pedidos:
  // el histórico de AgendaPro trae citas con nombre pero sin clienta vinculada,
  // y esos se colaban reales en las capturas de la agenda.
  const [clientes, citas, pedidos] = await Promise.all([
    prisma.client.findMany({ select: { name: true } }),
    prisma.appointment.findMany({ select: { clientName: true }, distinct: ["clientName"] }),
    prisma.order.findMany({ select: { clientName: true }, distinct: ["clientName"] }),
  ]);
  const todos = [
    ...clientes.map((c) => c.name),
    ...citas.map((c) => c.clientName),
    ...pedidos.map((c) => c.clientName),
  ];
  const nombres = [...new Set(todos.filter(Boolean))]
    .filter((n) => !INTOCABLES.has(n.trim().toLowerCase()))
    // Menos de seis letras es casi siempre una palabra suelta que aparece en
    // otro sitio de la interfaz; sustituirla hace más daño que bien.
    .filter((n) => n.trim().length >= 6)
    .sort((a, b) => b.length - a.length);
  const mapa = {};
  nombres.forEach((real, i) => {
    mapa[real] = NOMBRES[i % NOMBRES.length];
  });
  return mapa;
}

/** Se ejecuta dentro de la página. */
function anonimizar(mapa) {
  const entradas = Object.entries(mapa);
  const andar = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodos = [];
  while (andar.nextNode()) nodos.push(andar.currentNode);

  for (const nodo of nodos) {
    let t = nodo.nodeValue;
    if (!t || !t.trim()) continue;

    for (const [real, falso] of entradas) {
      if (t.includes(real)) t = t.split(real).join(falso);
    }
    // Celulares colombianos y cualquier cosa de 10 dígitos seguidos.
    t = t.replace(/\b3\d{9}\b/g, "3001234567").replace(/\b\d{10}\b/g, "3001234567");
    // Correos.
    t = t.replace(/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, "clienta@ejemplo.com");

    if (t !== nodo.nodeValue) nodo.nodeValue = t;
  }

  // Los valores de un <input> no son nodos de texto.
  for (const i of document.querySelectorAll("input")) {
    if (/@/.test(i.value)) i.value = "clienta@ejemplo.com";
    else if (/^\d{10}$/.test(i.value)) i.value = "3001234567";
  }
}

const TODAS = [
  { archivo: "01-login", url: "/admin/login", sesion: false, alto: 820 },
  { archivo: "02-hoy", url: "/admin" },
  { archivo: "03-agenda-semana", url: "/admin/agenda?vista=semana" },
  { archivo: "04-agenda-profesionales", url: "/admin/agenda?vista=profesionales" },
  { archivo: "05-agenda-lista", url: "/admin/agenda?vista=lista" },
  { archivo: "06-bloqueos", url: "/admin/agenda/bloqueos" },
  { archivo: "07-venta-nueva", url: "/admin/ventas/nuevo" },
  { archivo: "08-ventas", url: "/admin/ventas?fecha=todo" },
  { archivo: "09-pedidos", url: "/admin/pedidos" },
  { archivo: "10-facturas", url: "/admin/facturas" },
  { archivo: "11-clientes", url: "/admin/clientes" },
  { archivo: "12-productos", url: "/admin/productos" },
  { archivo: "13-promociones", url: "/admin/promociones" },
  { archivo: "14-promocion-nueva", url: "/admin/promociones/nueva" },
  { archivo: "15-reportes", url: "/admin/reportes" },
  { archivo: "16-comisiones", url: "/admin/reportes/comisiones" },
  { archivo: "17-usuarios", url: "/admin/usuarios" },
  { archivo: "18-configuracion", url: "/admin/configuracion" },
  // Esta pantalla carga decenas de videos desde Supabase, así que la red nunca
  // llega a estar quieta: se espera al DOM y no a `networkidle2`.
  { archivo: "19-medios", url: "/admin/medios", espera: "domcontentloaded", reposo: 4000 },
];

const SOLO = process.env.CAPTURAS_SOLO?.split(",").map((x) => x.trim());
const PANTALLAS = SOLO ? TODAS.filter((p) => SOLO.includes(p.archivo)) : TODAS;

async function main() {
  await fs.mkdir(DESTINO, { recursive: true });
  const { token, user } = await sesion();
  const mapa = await mapaAnonimo();
  console.log(`Sesión de ${user.name} · ${Object.keys(mapa).length} nombres a sustituir\n`);

  const navegador = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  try {
    for (const p of PANTALLAS) {
      const pagina = await navegador.newPage();
      // 1440 CSS px a 1,5x dan 2160 px reales. En el manual se imprimen a unos
      // 165 mm de ancho, así que eso es ~330 ppp: de sobra para papel, y la
      // mitad de peso que a 2x —que llevaba el PDF por encima de los 6 MB—.
      await pagina.setViewport({
        width: 1440,
        height: p.alto ?? 900,
        deviceScaleFactor: 1.5,
      });
      if (p.sesion !== false) {
        await pagina.setCookie({
          name: "marea_session",
          value: token,
          domain: "localhost",
          path: "/",
        });
      }

      try {
        await pagina.goto(`${BASE}${p.url}`, {
          waitUntil: p.espera ?? "networkidle2",
          timeout: 45000,
        });
        await pagina.evaluate(anonimizar, mapa);
        // Un respiro para que asienten fuentes y transiciones.
        await new Promise((r) => setTimeout(r, p.reposo ?? 600));

        const ruta = path.join(DESTINO, `${p.archivo}.png`);
        await pagina.screenshot({ path: ruta, captureBeyondViewport: false });
        const { size } = await fs.stat(ruta);
        console.log(`  ✓ ${p.archivo.padEnd(26)} ${Math.round(size / 1024)} KB`);
      } catch (e) {
        console.log(`  ✗ ${p.archivo.padEnd(26)} ${e.message.slice(0, 70)}`);
      }
      await pagina.close();
    }
  } finally {
    await navegador.close();
    await prisma.$disconnect();
  }

  console.log(`\nCapturas en ${DESTINO}`);
}

main().catch(async (e) => {
  console.error("Falló:", e.message);
  await prisma.$disconnect();
  process.exit(1);
});
