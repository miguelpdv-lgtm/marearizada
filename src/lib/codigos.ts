/**
 * Códigos cortos y legibles que se le dan a la clienta: MR-7K3Q para una
 * cita y MR-V-7K3Q para una venta.
 *
 * El alfabeto no tiene caracteres ambiguos (ni O/0 ni I/1), porque estos
 * códigos se dictan por teléfono y se leen en pantalla. Se generan al azar y
 * la unicidad la garantiza el índice de la base: quien los use debe reintentar
 * ante un P2002 (ver `crearVenta`).
 */

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function codigoCorto(prefijo: string, largo = 4) {
  let s = "";
  for (let i = 0; i < largo; i++) {
    s += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return `${prefijo}${s}`;
}

/** Venta de mostrador: MR-V-7K3Q. */
export const generarCodigoVenta = () => codigoCorto("MR-V-");
