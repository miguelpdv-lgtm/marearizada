import type { Metadata } from "next";

import {
  Correo,
  Destacado,
  Lista,
  Seccion,
  TituloLegal,
  datosEmpresa,
  titularConNit,
} from "@/components/site/Legal";

export const metadata: Metadata = {
  title: "Política de tratamiento de datos",
  description:
    "Qué datos personales recoge Marea Rizada, para qué los usa, con quién los comparte y cómo ejercer tus derechos.",
  alternates: { canonical: "/legal/privacidad" },
};

export const revalidate = 300;

const ACTUALIZADO = "8 de noviembre de 2026";

export default async function Privacidad() {
  const empresa = await datosEmpresa();

  return (
    <>
      <TituloLegal actualizado={ACTUALIZADO} empresa={empresa}>
        Política de tratamiento de datos personales
      </TituloLegal>

      <Seccion titulo="Quién responde por tus datos">
        <p>
          El responsable del tratamiento es {titularConNit(empresa)}, con domicilio en{" "}
          {empresa.ciudad}, que opera la marca Marea Rizada. Para cualquier asunto sobre tus datos
          personales escribe a <Correo empresa={empresa} />. Ese es el canal oficial para consultas
          y reclamos.
        </p>
        <p>
          Esta política se rige por la Ley 1581 de 2012, el Decreto 1377 de 2013 y las demás normas
          colombianas sobre protección de datos personales.
        </p>
      </Seccion>

      <Seccion titulo="Qué datos recogemos">
        <Lista
          items={[
            <>
              <strong>Para reservar una cita:</strong> tu nombre, celular y correo. Si quieres, tu
              patrón de rizo, si es tu primera visita y las notas que nos dejes.
            </>,
            <>
              <strong>Tu ficha en el salón:</strong> las citas que has tenido, los servicios que te
              hicimos, los abonos y pagos, y las notas que el equipo registra sobre el cuidado de tu
              cabello.
            </>,
            <>
              <strong>Si dejas una reseña:</strong> tu nombre y lo que escribas.
            </>,
            <>
              <strong>Del uso del sitio:</strong> datos técnicos básicos, como tu dirección IP, que
              usamos para frenar el uso abusivo de los formularios.
            </>,
          ]}
        />
        <p>
          No pedimos ni guardamos datos de tarjetas ni claves bancarias. Esa información la maneja
          directamente Wompi, la pasarela de pagos, y nunca pasa por nuestros servidores.
        </p>
      </Seccion>

      <Seccion titulo="Para qué los usamos">
        <Lista
          items={[
            "Agendar tus citas, enviarte la confirmación y recordártelas por correo.",
            "Dejarte cambiar tu cita desde el enlace que te enviamos.",
            "Registrar y conciliar tus abonos y pagos.",
            "Llevar tu historial, para que el equipo sepa qué se te ha hecho antes y pueda recomendarte mejor.",
            "Invitarte a dejar una reseña después de tu cita.",
            "Atender tus preguntas, reclamos y solicitudes de garantía.",
            "Mantener la seguridad del sitio y prevenir fraude o uso abusivo.",
          ]}
        />
        <p>
          Solo te enviamos promociones si nos das tu autorización para eso, y puedes retirarla
          cuando quieras.
        </p>
      </Seccion>

      <Seccion titulo="Con quién los compartimos">
        <p>
          No vendemos tus datos ni los cedemos con fines publicitarios. Los compartimos solo con
          quienes hacen falta para prestarte el servicio:
        </p>
        <Lista
          items={[
            <>
              <strong>Wompi</strong>, la pasarela de pagos, para procesar el abono o el pago de tu
              cita.
            </>,
            <>
              <strong>Nuestro proveedor de correo</strong>, para enviarte la confirmación, los
              cambios y los recordatorios de tu cita.
            </>,
            <>
              <strong>Nuestro proveedor de alojamiento y base de datos</strong>, donde funciona el
              sitio y se guarda la información.
            </>,
            <>
              Las <strong>autoridades</strong>, cuando una norma o una orden judicial nos obligue.
            </>,
          ]}
        />
        <p>
          Algunos de estos proveedores guardan la información en servidores fuera de Colombia, con
          medidas de seguridad equivalentes o superiores a las que exige la ley colombiana.
        </p>
      </Seccion>

      <Seccion titulo="Cuánto tiempo los guardamos">
        <p>
          Conservamos tus datos mientras seas clienta y mientras la ley nos obligue a guardarlos.
          Cuando ya no haya razón para tenerlos, los eliminamos o los anonimizamos.
        </p>
      </Seccion>

      <Seccion titulo="Tus derechos">
        <Destacado>
          Puedes <strong>conocer</strong> qué datos tuyos tenemos, <strong>actualizarlos</strong>,{" "}
          <strong>rectificarlos</strong>, <strong>revocar</strong> la autorización que nos diste y
          pedir que los <strong>suprimamos</strong> cuando no exista un deber legal de conservarlos.
          También puedes pedir prueba de la autorización que nos diste.
        </Destacado>
        <p>
          Para ejercer cualquiera de estos derechos escribe a <Correo empresa={empresa} /> desde el
          correo con el que reservaste, o desde otro si nos indicas cómo verificar tu identidad.
          Respondemos las consultas dentro de los diez (10) días hábiles siguientes y los reclamos
          dentro de los quince (15) días hábiles, como fija la Ley 1581 de 2012.
        </p>
        <p>
          Si no quedas conforme con la respuesta, puedes presentar tu queja ante la Superintendencia
          de Industria y Comercio.
        </p>
      </Seccion>

      <Seccion titulo="Seguridad">
        <p>
          Ciframos el tráfico del sitio, guardamos las contraseñas del equipo con funciones de hash
          y limitamos el acceso a la información al personal que la necesita para su trabajo. Si
          llegara a ocurrir un incidente que afecte tus datos, te lo informaremos y lo reportaremos
          a la autoridad, como corresponde.
        </p>
      </Seccion>

      <Seccion titulo="Cambios en esta política">
        <p>
          Si cambiamos algo sustancial, como una finalidad o un proveedor nuevo, lo publicaremos acá
          con su fecha y, cuando la ley lo exija, te pediremos otra vez tu autorización.
        </p>
      </Seccion>
    </>
  );
}
