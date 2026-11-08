/**
 * Bloqueo de scroll por contador: el menú móvil y el carrito pueden
 * quedar abiertos a la vez, cada uno con su propio efecto. Sin contador,
 * el que se cierra primero le quita el bloqueo al que sigue abierto.
 */
let locks = 0;

export function lockBodyScroll() {
  locks += 1;
  document.body.style.overflow = "hidden";
}

export function unlockBodyScroll() {
  locks = Math.max(0, locks - 1);
  if (locks === 0) document.body.style.overflow = "";
}
