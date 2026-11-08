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
  title: "Términos y condiciones",
  description: "Condiciones de uso del sitio y de las reservas de cita de Marea Rizada.",
  alternates: { canonical: "/legal/terminos" },
};

export const revalidate = 300;

const ACTUALIZADO = "8 de noviembre de 2026";

export default async function Terminos() {
  const empresa = await datosEmpresa();

  return (
    <>
      <TituloLegal actualizado={ACTUALIZADO} empresa={empresa}>
        Términos y condiciones
      </TituloLegal>

      <Seccion titulo="Quiénes somos">
        <p>
          Este sitio lo opera {titularConNit(empresa)}, con domicilio en {empresa.ciudad}, bajo la
          marca Marea Rizada. Puedes escribirnos a <Correo empresa={empresa} /> o por WhatsApp al
          número publicado en el sitio.
        </p>
        <p>
          Al usar este sitio o reservar una cita aceptas lo que está escrito acá. Si algo no te
          queda claro, escríbenos antes de reservar.
        </p>
      </Seccion>

      <Seccion titulo="Reservas de cita">
        <Lista
          items={[
            "Al reservar eliges el servicio, la profesional (o cualquiera disponible), el día y la hora. Los horarios que ves son los que están libres en ese momento.",
            "Tu reserva queda registrada cuando recibes el correo con tu código de cita. Si no te llega en unos minutos, revisa el spam o escríbenos antes de venir.",
            "Las citas se toman con la antelación mínima que muestra el calendario y hasta donde llegue la agenda abierta.",
            "Te enviamos un recordatorio por correo antes de la cita.",
            "Puedes cambiar la fecha y la hora tú misma desde el enlace del correo, mientras haya cupo. Si no puedes venir, avísanos con tiempo.",
            "Llegar más de 15 minutos tarde puede obligarnos a reprogramar, porque el espacio siguiente ya está tomado por otra persona.",
            "El precio publicado de un servicio es una referencia: algunos dependen del largo, la densidad y el estado del cabello, y se confirman en el diagnóstico antes de empezar. Nunca se cobra nada que no se te haya dicho antes.",
          ]}
        />
      </Seccion>

      <Seccion titulo="Abono en línea">
        <p>
          Al terminar la reserva puedes pagar un abono, o el valor completo del servicio, con
          tarjeta o PSE. El pago lo procesa Bold, la pasarela de pagos: los datos de tu tarjeta o
          de tu banco nunca pasan por este sitio ni quedan guardados acá.
        </p>
        <Lista
          items={[
            "Lo que abones se descuenta del valor del servicio el día de tu cita.",
            "Si mueves la cita, el abono queda para la nueva fecha.",
            "Si necesitas cancelar, escríbenos y acordamos cómo devolverlo o usarlo en otra cita.",
            "Los descuentos y cupones se aplican según las condiciones de cada promoción y no son acumulables, salvo que la promoción diga lo contrario.",
          ]}
        />
      </Seccion>

      <Seccion titulo="Garantía del servicio">
        <p>
          Si el resultado no corresponde a lo acordado en el diagnóstico, vuelve al salón dentro de
          los ocho días siguientes y lo revisamos sin costo. La garantía no cubre cambios que
          resulten de procesos químicos o térmicos hechos después de tu cita, ni el desgaste normal
          del cabello con el tiempo.
        </p>
      </Seccion>

      <Seccion titulo="Reseñas">
        <p>
          Después de tu cita podemos invitarte a dejar una reseña. Al enviarla nos autorizas a
          publicarla en este sitio con tu nombre de pila. Revisamos las reseñas antes de publicarlas
          y no publicamos las que tengan datos personales de otras personas o lenguaje ofensivo.
        </p>
      </Seccion>

      <Seccion titulo="Contenido del sitio">
        <p>
          Los textos, fotografías, el nombre Marea Rizada y su identidad visual son nuestros o los
          usamos con autorización. Puedes compartir enlaces y citar con atribución; reproducir el
          contenido con fines comerciales requiere permiso.
        </p>
        <p>
          Lo que compartimos en el sitio, como la guía de patrones de rizo, es información general
          sobre el cuidado del cabello. No reemplaza un diagnóstico presencial ni una consulta
          dermatológica.
        </p>
      </Seccion>

      <Seccion titulo="Cambios en estos términos">
        <p>
          Podemos actualizar este documento cuando cambie cómo funciona el sitio. La fecha de arriba
          dice cuándo fue la última vez. A tu cita le aplica lo que estaba publicado el día que la
          reservaste.
        </p>
      </Seccion>

      <Seccion titulo="Ley aplicable">
        <Destacado>
          Estos términos se rigen por la ley colombiana, en particular la Ley 1480 de 2011
          (Estatuto del Consumidor). Cualquier reclamo puedes dirigirlo primero a{" "}
          <Correo empresa={empresa} />; también puedes acudir a la Superintendencia de Industria y
          Comercio.
        </Destacado>
      </Seccion>
    </>
  );
}
