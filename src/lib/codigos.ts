/**
 * Códigos cortos y legibles que se le dan a la clienta: AMI-7K3Q para una
 * cita, AMI-V-7K3Q para una venta, AMI-P-7K3Q para un pedido de la tienda.
 *
 * El alfabeto no tiene caracteres ambiguos (ni O/0 ni I/1), porque estos
 * códigos se dictan por teléfono y se leen en pantalla. Se generan al azar y
 * la unicidad la garantiza el índice de la base: quien los use debe reintentar
 * ante un P2002 (ver `crearVenta` o `crearPedido`).
 */

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function codigoCorto(prefijo: string, largo = 4) {
  let s = "";
  for (let i = 0; i < largo; i++) {
    s += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return `${prefijo}${s}`;
}

/** Venta de mostrador: AMI-V-7K3Q. */
export const generarCodigoVenta = () => codigoCorto("AMI-V-");

/** Pedido de la tienda en línea: AMI-P-7K3Q. */
export const generarCodigoPedido = () => codigoCorto("AMI-P-");
