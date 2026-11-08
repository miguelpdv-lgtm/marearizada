import type { Metadata } from "next";
import Link from "next/link";

import { Destacado, EMPRESA, Lista, Seccion, TituloLegal } from "@/components/site/Legal";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description:
    "Condiciones de uso del sitio, de la tienda en línea y de las reservas de cita de Amicrespa.",
  alternates: { canonical: "/legal/terminos" },
};

const ACTUALIZADO = "21 de septiembre de 2026";

export default function Terminos() {
  return (
    <>
      <TituloLegal actualizado={ACTUALIZADO}>Términos y condiciones</TituloLegal>

      <Seccion titulo="Quiénes somos">
        <p>
          Este sitio lo opera {EMPRESA.razonSocial}, identificada con NIT{" "}
          {EMPRESA.nit}, con salones en {EMPRESA.ciudades}. Puedes escribirnos a{" "}
          <a href={`mailto:${EMPRESA.correo}`} className="text-terra-deep underline">
            {EMPRESA.correo}
          </a>{" "}
          o por WhatsApp a los números publicados en la página de cada salón.
        </p>
        <p>
          Al usar este sitio, reservar una cita o comprar un producto, aceptas
          lo que está escrito acá. Si algo no te queda claro, escríbenos antes
          de comprar.
        </p>
      </Seccion>

      <Seccion titulo="Reservas de cita">
        <Lista
          items={[
            "Reservar por el sitio no exige pago anticipado: el servicio se paga en el salón, al terminar.",
            "Tu reserva queda confirmada cuando recibes el correo con tu código de cita. Si no te llega, escríbenos antes de venir.",
            "Las citas se toman con la antelación mínima que se indica en el formulario de reserva y hasta donde llegue el calendario abierto.",
            "Si no puedes venir, avísanos con tiempo por WhatsApp y movemos la cita sin costo. Llegar más de 15 minutos tarde puede obligarnos a reprogramar, porque el espacio siguiente ya está tomado por otra persona.",
            "El precio publicado de un servicio es una referencia: algunos servicios dependen del largo, la densidad y el estado del cabello, y se confirman en la valoración antes de empezar. Nunca se cobra nada que no se te haya dicho antes.",
          ]}
        />
      </Seccion>

      <Seccion titulo="Compras en la tienda">
        <Lista
          items={[
            "Los precios están en pesos colombianos e incluyen el IVA vigente.",
            "El costo de envío se calcula al momento de la compra según el peso del pedido y la ciudad de entrega, y se muestra antes de pagar.",
            "Los pagos los procesa Bold, la pasarela de pagos. Los datos de tu tarjeta nunca pasan por este sitio ni quedan guardados acá.",
            "Tu pedido queda confirmado cuando el pago es aprobado y recibes el correo de confirmación. Antes de eso no hay compra.",
            "Vendemos según existencias. Si un producto se agota entre que pagas y despachamos, te contactamos para reponerlo o devolverte el dinero.",
            "Por cada compra emitimos factura electrónica y te llega al correo que registres.",
          ]}
        />
      </Seccion>

      <Seccion titulo="Derecho de retracto">
        <Destacado>
          Tienes <strong>cinco (5) días hábiles</strong> desde que recibes el
          pedido para retractarte de la compra y que te devolvamos lo pagado,
          incluido el envío de ida. Es un derecho que da el artículo 47 de la
          Ley 1480 de 2011 y aplica a las compras hechas por este sitio.
        </Destacado>
        <p>
          Cómo se aplica, qué productos quedan por fuera y a quién le
          corresponde el flete de la devolución está detallado en{" "}
          <Link href="/legal/devoluciones" className="text-terra-deep underline">
            cambios y devoluciones
          </Link>
          .
        </p>
      </Seccion>

      <Seccion titulo="Garantía">
        <p>
          Los productos que vendemos tienen la garantía legal del artículo 7 de
          la Ley 1480 de 2011. Si un producto llega en mal estado, vencido o no
          corresponde a lo que pediste, escríbenos y lo reponemos, lo cambiamos
          o te devolvemos el dinero, según prefieras.
        </p>
        <p>
          Los servicios del salón también tienen garantía: si el resultado no
          corresponde a lo acordado en la valoración, vuelve al salón dentro de
          los ocho días siguientes y lo corregimos sin costo. La garantía no
          cubre los cambios que resulten de tratamientos hechos en otro lugar
          después de tu cita, ni el desgaste normal del cabello con el tiempo.
        </p>
      </Seccion>

      <Seccion titulo="Contenido del sitio">
        <p>
          Los textos, fotografías, videos, el nombre {EMPRESA.marca} y su
          identidad visual son nuestros o los usamos con autorización. Puedes
          compartir enlaces y citar con atribución; reproducir el contenido con
          fines comerciales requiere que nos pidas permiso.
        </p>
        <p>
          Lo que compartimos en el sitio y en las asesorías es
          información general sobre el cuidado del cabello. No reemplaza una
          valoración presencial ni un diagnóstico dermatológico.
        </p>
      </Seccion>

      <Seccion titulo="Cambios en estos términos">
        <p>
          Podemos actualizar este documento cuando cambie cómo funciona el
          sitio. La fecha de arriba dice cuándo fue la última vez. Lo que
          aplique a tu compra o a tu cita es lo que estaba publicado el día que
          la hiciste.
        </p>
      </Seccion>

      <Seccion titulo="Ley aplicable">
        <p>
          Estos términos se rigen por la ley colombiana. Cualquier reclamo
          puedes dirigirlo primero a{" "}
          <a href={`mailto:${EMPRESA.correo}`} className="text-terra-deep underline">
            {EMPRESA.correo}
          </a>
          ; también puedes acudir a la Superintendencia de Industria y Comercio,
          que es la autoridad de protección al consumidor en Colombia.
        </p>
      </Seccion>
    </>
  );
}
