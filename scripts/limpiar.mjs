/**
 * Borra .next reintentando cuando Windows tiene el archivo tomado.
 *
 *   npm run clean
 *
 * En Windows, Defender y el indexador mantienen handles abiertos unos
 * milisegundos después de que un proceso termina. Borrar de una sola pasada
 * falla con EBUSY o EPERM; reintentando con pausas creciente sí funciona.
 */
import { rm, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const objetivos = ["\.next", "node_modules/.cache"];

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function existe(ruta) {
  try {
    await access(ruta);
    return true;
  } catch {
    return false;
  }
}

async function borrar(ruta, nombre) {
  if (!(await existe(ruta))) {
    console.log(`  ${nombre}: no existe`);
    return true;
  }

  const intentos = 6;

  for (let i = 1; i <= intentos; i++) {
    try {
      await rm(ruta, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
      if (!(await existe(ruta))) {
        console.log(`  ${nombre}: borrado${i > 1 ? ` (intento ${i})` : ""}`);
        return true;
      }
    } catch (e) {
      if (i === intentos) {
        console.log(`  ${nombre}: no se pudo borrar → ${e.code ?? e.message}`);
        return false;
      }
    }
    await dormir(i * 500);
  }

  return false;
}

console.log("Limpiando carpetas de build...\n");

let todoOk = true;
for (const objetivo of objetivos) {
  const ok = await borrar(resolve(raiz, objetivo), objetivo);
  todoOk = todoOk && ok;
}

if (!todoOk) {
  console.log(
    "\nAlgo quedó bloqueado. Cierra el servidor de desarrollo y el editor,\n" +
      "y vuelve a correr `npm run clean`.\n" +
      "Si se repite seguido, mira la sección de Windows en el README.",
  );
  process.exit(1);
}

console.log("\nListo.");
