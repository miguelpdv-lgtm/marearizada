# Manual del panel administrativo

El PDF listo para repartir está en [`docs/Manual-Panel-Amicrespa.pdf`](../Manual-Panel-Amicrespa.pdf).

| Archivo | Qué es |
| --- | --- |
| `manual.html` | El fuente. Es lo único que se edita a mano. |
| `capturas/` | Las 19 capturas del panel, generadas. |
| `../Manual-Panel-Amicrespa.pdf` | El resultado. |

## Regenerar el PDF

```bash
npm run manual:pdf
```

Descarga las tipografías, las incrusta y lo imprime con Chrome. Tarda unos
segundos y deja las fuentes en caché para las siguientes veces.

## Regenerar las capturas

Hace falta el sitio construido y levantado:

```bash
npm run build && npm run start   # en otra terminal
npm run manual:capturas
npm run manual:pdf
```

El script entra al panel **firmando un token de sesión** con `AUTH_SECRET`, en
vez de rellenar el formulario de login: usa el mismo mecanismo que el panel
valida, sin tener que guardar una contraseña en ninguna parte.

### Las capturas van anonimizadas

El panel muestra nombres, celulares y correos de clientas reales, y este manual
circula. Antes de disparar cada foto, el script sustituye los nombres por
inventados —de forma consistente, la misma clienta sale siempre igual— y los
celulares y correos por valores de ejemplo.

Hay una lista de `INTOCABLES` en el script y conviene entender por qué: existe
una clienta registrada como **«Amicrespa»**, y sin esa lista la sustitución se
comía la marca en toda la interfaz. La barra superior pasaba a decir
*«Gestión interna · Manuela Castaño»*.

## Trampas de generar el PDF con Chrome

Están todas resueltas en `scripts/manual-pdf.mjs`, pero conviene saberlas si se
toca:

- **Las tipografías de Google no cargan en headless.** La página se imprime
  antes de que llegue la hoja de estilos y todo cae a las del sistema, sin que
  nada avise. Por eso se incrustan como data URI. Del CSS de Google solo se
  conservan los bloques `latin` y `latin-ext`: el resto quintuplica el peso.
- **Chrome no numera páginas por CSS.** `counter(page)` dentro de `@page` no
  está soportado, y el encabezado propio de Chrome mete la URL del archivo. Por
  eso el índice referencia **números de capítulo**, no de página, y se imprime
  con `--no-pdf-header-footer`.
- **Para contar páginas, cuenta `/Type /Page`**, no `/Count`: ese campo aparece
  en varios nodos del árbol y el primero es un subnodo, así que engaña. Durante
  el desarrollo llegó a reportar 8 páginas de 31.
- **Para ver qué tipografías quedaron, mira `/FontName`**, no `/BaseFont`: la
  mayoría van en el descriptor, y con `/BaseFont` parece que todo cayó a las
  del sistema cuando no es cierto.
- El HTML temporal se escribe **junto a `manual.html`** y no en otra carpeta,
  para que las rutas relativas a `capturas/` sigan resolviendo.

## Al cambiar el panel

Si cambias una pantalla, revisa el capítulo que la describe **y vuelve a
generar las capturas**. Los que más se desactualizan son el 2 (Hoy), el 1.5
(qué correos salen) y el 14 (los mensajes de error literales).

La paleta y las tipografías salen del brandbook, las mismas de
`src/app/globals.css`.
