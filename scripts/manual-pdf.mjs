/**
 * Genera `docs/Manual-Panel-Amicrespa.pdf` a partir de `docs/manual/manual.html`.
 *
 * Se corre con `npm run manual:pdf`.
 *
 * El paso que no es obvio es el de las tipografías. `manual.html` las enlaza
 * desde Google Fonts para poder abrirlo en el navegador mientras se edita,
 * pero **en headless esa hoja no llega a tiempo**: la página se imprime antes
 * y todo cae a las fuentes del sistema, sin que nada avise. Así que antes de
 * imprimir se descargan los `.woff2` y se incrustan como data URI.
 *
 * Del CSS de Google solo se conservan los bloques `latin` y `latin-ext`: el
 * resto (cirílico, griego, vietnamita) no se usa y quintuplica el peso.
 */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const RAIZ = path.resolve("docs");
const FUENTE = path.join(RAIZ, "manual", "manual.html");
const TEMPORAL = path.join(RAIZ, "manual", ".manual-pdf.html");
const SALIDA = path.join(RAIZ, "Manual-Panel-Amicrespa.pdf");
const CACHE = path.join(RAIZ, "manual", ".fuentes.css");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const GOOGLE =
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700" +
  "&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400" +
  "&family=JetBrains+Mono:wght@400;500&display=swap";

const CHROMES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

async function chrome() {
  for (const c of CHROMES) {
    try {
      await fs.access(c);
      return c;
    } catch {
      // siguiente
    }
  }
  // Si no hay Chrome del sistema, sirve el que trae Puppeteer.
  const { default: puppeteer } = await import("puppeteer");
  return puppeteer.executablePath();
}

async function fuentesIncrustadas() {
  try {
    const guardado = await fs.readFile(CACHE, "utf8");
    console.log("  Tipografías: de la caché local");
    return guardado;
  } catch {
    // se descargan
  }

  console.log("  Tipografías: descargando de Google…");
  const css = await fetch(GOOGLE, { headers: { "User-Agent": UA } }).then((r) => r.text());

  const bloques = css
    .split(/(?=\/\* )/)
    .filter((b) => b.trim().startsWith("/* latin"));

  const descargadas = new Map();
  const salida = [];

  for (const bloque of bloques) {
    const urls = [...bloque.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)];
    let texto = bloque;
    for (const [, url] of urls) {
      if (!descargadas.has(url)) {
        const buf = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
        descargadas.set(url, buf.toString("base64"));
      }
      texto = texto.replace(url, `data:font/woff2;base64,${descargadas.get(url)}`);
    }
    salida.push(texto);
  }

  const resultado = salida.join("\n");
  await fs.writeFile(CACHE, resultado, "utf8");
  console.log(`  Tipografías: ${descargadas.size} archivos incrustados`);
  return resultado;
}

async function main() {
  console.log("Generando el manual\n");

  const html = await fs.readFile(FUENTE, "utf8");
  const fuentes = await fuentesIncrustadas();

  const listo = html
    .replace(/<link rel="preconnect"[^>]*>\s*/g, "")
    .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>\s*/g, "")
    .replace("<style>", `<style>\n/* Tipografías incrustadas. */\n${fuentes}\n`);

  // Va junto a manual.html para que las rutas a capturas/ sigan resolviendo.
  await fs.writeFile(TEMPORAL, listo, "utf8");

  const exe = await chrome();
  console.log(`  Navegador: ${path.basename(exe)}`);

  await new Promise((resolver, rechazar) => {
    const proceso = spawn(exe, [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--no-pdf-header-footer",
      "--virtual-time-budget=40000",
      `--print-to-pdf=${SALIDA}`,
      `file:///${TEMPORAL.replace(/\\/g, "/")}`,
    ]);
    proceso.on("error", rechazar);
    proceso.on("exit", (codigo) =>
      codigo === 0 ? resolver() : rechazar(new Error(`Chrome salió con ${codigo}`)),
    );
  });

  await fs.unlink(TEMPORAL);

  const pdf = await fs.readFile(SALIDA);
  // Se cuenta /Type /Page y no /Count: ese campo aparece en varios nodos del
  // árbol de páginas y el primero es un subnodo, así que engaña.
  const paginas = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  const imagenes = (pdf.toString("latin1").match(/\/Subtype\s*\/Image/g) ?? []).length;

  console.log(
    `\n✓ ${path.relative(process.cwd(), SALIDA)} · ${paginas} páginas · ` +
      `${imagenes} capturas · ${(pdf.length / 1048576).toFixed(1)} MB`,
  );
}

main().catch((e) => {
  console.error("Falló:", e.message);
  process.exit(1);
});
