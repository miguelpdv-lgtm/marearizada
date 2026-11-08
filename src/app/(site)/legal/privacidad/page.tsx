import type { Metadata } from "next";

import { Destacado, EMPRESA, Lista, Seccion, TituloLegal } from "@/components/site/Legal";

export const metadata: Metadata = {
  title: "Política de tratamiento de datos",
  description:
    "Qué datos personales recoge Amicrespa, para qué los usa, con quién los comparte y cómo ejercer tus derechos de habeas data.",
  alternates: { canonical: "/legal/privacidad" },
};

const ACTUALIZADO = "21 de septiembre de 2026";

export default function Privacidad() {
  return (
    <>
      <TituloLegal actualizado={ACTUALIZADO}>
        Política de tratamiento de datos personales
      </TituloLegal>

      <Seccion titulo="Quién responde por tus datos">
        <p>
          El responsable del tratamiento es {EMPRESA.razonSocial}, NIT{" "}
          {EMPRESA.nit}, con domicilio en {EMPRESA.ciudades}. Para cualquier
          asunto relacionado con tus datos personales, escribe a{" "}
          <a href={`mailto:${EMPRESA.correo}`} className="text-terra-deep underline">
            {EMPRESA.correo}
          </a>
          . Ese es el canal oficial para consultas y reclamos.
        </p>
        <p>
          Esta política se rige por la Ley 1581 de 2012, el Decreto 1377 de 2013
          y las demás normas colombianas sobre protección de datos personales.
        </p>
      </Seccion>

      <Seccion titulo="Qué datos recogemos">
        <Lista
          items={[
            <>
              <strong>Para reservar una cita:</strong> tu nombre, celular y
              correo. Opcionalmente, tu tipo de rizo, si es tu primera visita y
              las notas que nos quieras dejar.
            </>,
            <>
              <strong>Para comprar en la tienda:</strong> además de lo anterior,
              tu tipo y número de documento —que exige la DIAN para la factura
              electrónica— y la dirección de entrega.
            </>,
            <>
              <strong>Del historial del salón:</strong> los servicios que te
              hemos hecho, los productos que has comprado y las notas que el
              equipo registra sobre el cuidado de tu cabello.
            </>,
            <>
              <strong>Del uso del sitio:</strong> datos técnicos básicos como tu
              dirección IP, que usamos para frenar el uso abusivo de los
              formularios.
            </>,
          ]}
        />
        <p>
          No pedimos ni guardamos datos de tarjetas de crédito o débito. Esa
          información la maneja directamente Bold, la pasarela de pagos, y nunca
          pasa por nuestros servidores.
        </p>
      </Seccion>

      <Seccion titulo="Para qué los usamos">
        <Lista
          items={[
            "Agendar, confirmar y recordarte tus citas.",
            "Procesar, despachar y hacer seguimiento a tus pedidos.",
            "Emitir la factura electrónica que exige la ley.",
            "Atender tus preguntas, reclamos y solicitudes de garantía.",
            "Llevar tu historial de servicios, para que el equipo sepa qué se te ha hecho antes y pueda recomendarte mejor.",
            "Mantener la seguridad del sitio y prevenir fraude o uso abusivo.",
          ]}
        />
        <p>
          Solo te enviamos comunicaciones comerciales si nos das tu
          autorización expresa para eso, y puedes retirarla cuando quieras.
        </p>
      </Seccion>

      <Seccion titulo="Con quién los compartimos">
        <p>
          No vendemos tus datos ni los cedemos a terceros con fines
          publicitarios. Los compartimos únicamente con quienes hacen falta para
          prestarte el servicio:
        </p>
        <Lista
          items={[
            <>
              <strong>Siigo</strong> — para emitir la factura electrónica y
              reportarla a la DIAN, como exige la ley.
            </>,
            <>
              <strong>Bold</strong> — para procesar el pago de tu pedido.
            </>,
            <>
              <strong>Resend</strong> — para enviarte los correos de
              confirmación de cita y de pedido.
            </>,
            <>
              <strong>Supabase</strong> — donde vive la base de datos del sitio.
            </>,
            <>
              <strong>La transportadora</strong> que lleve tu pedido, con los
              datos mínimos para entregarlo.
            </>,
            <>
              Las <strong>autoridades</strong>, cuando una norma o una orden
              judicial nos obligue.
            </>,
          ]}
        />
      </Seccion>

      <Seccion titulo="Cuánto tiempo los guardamos">
        <p>
          Conservamos tus datos mientras seas clienta y mientras la ley nos
          obligue a guardarlos. La información de facturación se conserva por el
          término que exige la normativa tributaria y contable colombiana.
          Cuando ya no haya razón para tenerlos, los eliminamos o los
          anonimizamos.
        </p>
      </Seccion>

      <Seccion titulo="Tus derechos">
        <Destacado>
          Puedes <strong>conocer</strong> qué datos tuyos tenemos,{" "}
          <strong>actualizarlos</strong>, <strong>rectificarlos</strong>,{" "}
          <strong>revocar</strong> la autorización que nos diste y pedir que los{" "}
          <strong>suprimamos</strong> cuando no exista un deber legal de
          conservarlos. También puedes pedir prueba de la autorización que nos
          otorgaste.
        </Destacado>
        <p>
          Para ejercer cualquiera de estos derechos escribe a{" "}
          <a href={`mailto:${EMPRESA.correo}`} className="text-terra-deep underline">
            {EMPRESA.correo}
          </a>{" "}
          desde el correo que tengas registrado, o desde otro si nos indicas cómo
          verificar tu identidad. Respondemos las consultas dentro de los diez
          (10) días hábiles siguientes y los reclamos dentro de los quince (15)
          días hábiles, como fija la Ley 1581 de 2012.
        </p>
        <p>
          Si no quedas conforme con nuestra respuesta, puedes presentar tu queja
          ante la Superintendencia de Industria y Comercio.
        </p>
      </Seccion>

      <Seccion titulo="Datos de quienes ya eran clientas">
        <p>
          Si visitaste el salón antes de que existiera este sitio, tus datos de
          contacto y tu historial de servicios pueden estar en nuestra base
          porque los registramos al atenderte. Se usan para lo mismo que está
          descrito arriba, y tienes exactamente los mismos derechos sobre ellos.
          Si prefieres que los eliminemos, escríbenos.
        </p>
      </Seccion>

      <Seccion titulo="Seguridad">
        <p>
          Ciframos el tráfico del sitio, guardamos las contraseñas del equipo
          con funciones de hash y limitamos el acceso a la información al
          personal que la necesita para su trabajo. Ningún sistema es
          infalible, pero si llegara a ocurrir un incidente que afecte tus
          datos, te lo informaremos y lo reportaremos a la autoridad, como
          corresponde.
        </p>
      </Seccion>

      <Seccion titulo="Cambios en esta política">
        <p>
          Si cambiamos algo sustancial —una finalidad nueva, un tercero nuevo—
          lo publicaremos acá con su fecha, y cuando la ley lo exija te pediremos
          otra vez tu autorización.
        </p>
      </Seccion>
    </>
  );
}
