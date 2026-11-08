export {};

declare global {
  interface Window {
    /** "Integración personalizada" de Bold: dispara el pago con `.open()`,
     * sin depender de que su script escanee un botón declarativo en la
     * página. Ver el comentario largo en `configCheckout()`, src/lib/bold.ts. */
    BoldCheckout?: new (config: Record<string, unknown>) => { open: () => void };
  }
}
