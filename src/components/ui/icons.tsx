/**
 * Iconografía de la guía visual: trazo fino, esquinas redondeadas, sin relleno.
 * Todos comparten viewBox 24×24 y heredan el color con `currentColor`.
 */

type IconProps = {
  className?: string;
  strokeWidth?: number;
};

function Svg({
  children,
  className = "h-6 w-6",
  strokeWidth = 1.5,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/* --- Iconos base de la guía ------------------------------------------------ */

export const IconPerfil = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </Svg>
);

export const IconReservas = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    <path d="M8 14h3" />
  </Svg>
);

export const IconProductos = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 2.5h4v3h-4z" />
    <path d="M9 5.5h6a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-10a3 3 0 0 1 3-3Z" />
    <path d="M6 12h12" />
  </Svg>
);

export const IconPromociones = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="9" width="18" height="11.5" rx="2" />
    <path d="M2.5 9h19v3.5h-19zM12 9v11.5" />
    <path d="M12 9S9.5 9 8.3 7.8a2 2 0 1 1 3-2.6C12.3 6.3 12 9 12 9ZM12 9s2.5 0 3.7-1.2a2 2 0 1 0-3-2.6C11.7 6.3 12 9 12 9Z" />
  </Svg>
);

export const IconContacto = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.5 12c0 4-3.8 7.2-8.5 7.2a9.8 9.8 0 0 1-2.7-.37L4.5 20.5l1.3-3.4A6.9 6.9 0 0 1 3.5 12c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2Z" />
    <path d="M9 12h.01M12 12h.01M15 12h.01" />
  </Svg>
);

/* --- Pilares de la portada ------------------------------------------------- */

export const IconEspecialistas = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="9" r="4.5" />
    <path d="M8.5 13 7 21.5l5-2.5 5 2.5L15.5 13" />
  </Svg>
);

export const IconComunidad = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="9" r="3" />
    <path d="M3 19a6 6 0 0 1 12 0" />
    <path d="M16 6.3a3 3 0 0 1 0 5.4M17.5 14.4A6 6 0 0 1 21 19" />
  </Svg>
);

export const IconExperiencia = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5 13.7 9l5.8.2-4.6 3.5 1.7 5.6-4.6-3.3-4.6 3.3 1.7-5.6L4.5 9.2 10.3 9z" />
  </Svg>
);

/* --- Pasos de reserva ------------------------------------------------------ */

export const IconElige = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 12v6.5a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2H12" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L13 13l-3.5.8L10.3 10z" />
  </Svg>
);

export const IconConfirma = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20.5s-7.5-4.6-7.5-9.6a4 4 0 0 1 7.5-2 4 4 0 0 1 7.5 2c0 5-7.5 9.6-7.5 9.6Z" />
    <path d="M9.5 11.5l1.8 1.8 3.4-3.4" />
  </Svg>
);

/* --- Especialidades del salón ---------------------------------------------- */

export const IconTijeras = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="17.5" cy="18" r="2.5" />
    <path d="M8.3 16.2 18 3.5M15.7 16.2 6 3.5" />
  </Svg>
);

export const IconGota = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5c3.2 3.6 5.5 6.6 5.5 9.4a5.5 5.5 0 0 1-11 0c0-2.8 2.3-5.8 5.5-9.4Z" />
    <path d="M9.5 13.6a2.6 2.6 0 0 0 2.3 2.6" />
  </Svg>
);

export const IconOnda = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 8c2-2.6 4-2.6 6 0s4 2.6 6 0 4-2.6 5 0" />
    <path d="M3.5 16c2-2.6 4-2.6 6 0s4 2.6 6 0 4-2.6 5 0" />
  </Svg>
);

export const IconPaleta = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.3-1-1.6-1-2.6 0-.8.7-1.4 1.5-1.4h1.4a4.8 4.8 0 0 0 4.8-4.8c0-3.6-3.6-6.5-8.5-6.5Z" />
    <path d="M7.5 11h.01M10 7.8h.01M14.2 7.6h.01" />
  </Svg>
);

/* --- Promesas de marca ----------------------------------------------------- */

export const IconHoja = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 4c0 9-5.5 14-11 14a5.5 5.5 0 0 1-5.5-5.5C3.5 8 8.5 4 20 4Z" />
    <path d="M4.5 20c2-5.5 5.5-9 11-11.5" />
  </Svg>
);

export const IconCorazon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20.5s-8-4.9-8-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 8 2.7c0 5.3-8 10.2-8 10.2Z" />
  </Svg>
);

export const IconEscudo = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.2 19.5 6v6c0 4.4-3.1 7.7-7.5 9.3C7.6 19.7 4.5 16.4 4.5 12V6Z" />
    <path d="m9.2 12 2 2 3.6-3.8" />
  </Svg>
);

/* --- Utilidades ------------------------------------------------------------ */

export const IconFlecha = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 12h15M13.5 6l6 6-6 6" />
  </Svg>
);

export const IconTelefono = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.2 3.5h3l1.5 3.8-2 1.4a12 12 0 0 0 6.6 6.6l1.4-2 3.8 1.5v3a1.8 1.8 0 0 1-2 1.8A16.5 16.5 0 0 1 4.4 5.5a1.8 1.8 0 0 1 1.8-2Z" />
  </Svg>
);

export const IconCorreo = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="m3.8 7 7.2 5.4a1.7 1.7 0 0 0 2 0L20.2 7" />
  </Svg>
);

export const IconUbicacion = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s6.5-6 6.5-11a6.5 6.5 0 1 0-13 0c0 5 6.5 11 6.5 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </Svg>
);

export const IconReloj = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7v5.2l3.2 1.8" />
  </Svg>
);

export const IconBuscar = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Svg>
);

export const IconCarrito = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h2.2l1.9 10.2a1.6 1.6 0 0 0 1.6 1.3h7.7a1.6 1.6 0 0 0 1.6-1.3L20.5 9H7" />
    <circle cx="10" cy="20" r="1.1" />
    <circle cx="17.5" cy="20" r="1.1" />
  </Svg>
);

export const IconDiagnostico = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 3.5v6.2a4 4 0 0 0 .9 2.5l1.4 1.8a3 3 0 0 1 .7 1.9v4.6" />
    <path d="M15 3.5v6.2a4 4 0 0 1-.9 2.5l-1.4 1.8a3 3 0 0 0-.7 1.9v4.6" />
    <path d="M7.5 3.5h9M9 8h6" />
  </Svg>
);

/* --- Redes sociales (relleno, para el pie de página) ----------------------- */

export const IconInstagram = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className} aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconFacebook = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6c-.29-.04-1.27-.12-2.41-.12-2.39 0-4.03 1.46-4.03 4.14v2.31H7.5V13h2.76v8z" />
  </svg>
);

export const IconWhatsApp = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47 0 1.46 1.06 2.87 1.21 3.07.15.2 2.09 3.2 5.07 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z" />
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.28-1.38a9.87 9.87 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.25-4.38c0-4.53 3.69-8.22 8.23-8.22 2.2 0 4.26.86 5.82 2.41a8.17 8.17 0 0 1 2.41 5.82c0 4.54-3.69 8.23-8.24 8.23z" />
  </svg>
);

export const IconTikTok = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M16.5 3c.3 2.2 1.6 3.6 3.8 3.8v2.5c-1.3.1-2.5-.2-3.7-.9v5.9c0 3.7-2.9 6.2-6.3 5.6-2.6-.5-4.4-2.7-4.5-5.3-.1-3 2.2-5.6 5.2-5.8v2.7c-.4.1-.8.2-1.2.4-1.1.5-1.7 1.7-1.4 2.9.3 1.2 1.4 2 2.6 1.9 1.3-.1 2.3-1.1 2.3-2.4V3z" />
  </svg>
);
