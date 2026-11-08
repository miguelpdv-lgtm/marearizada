import { getSettings } from "@/lib/site";

/** Pie del sitio: la marea animada y una línea con redes y lo legal. */
export async function Footer() {
  const settings = await getSettings();
  const instagram = settings.get("social.instagram") || "https://instagram.com/marea.rizada";
  const redes = [
    { label: "Instagram", href: instagram },
    { label: "Shop", href: "https://instagram.com/marearizada_shop" },
    { label: "Nails", href: "https://instagram.com/marea.rizada_nails" },
  ];

  return (
    <footer className="ds-footer">
      <div className="ds-footer__sea">
        <canvas id="footer-tide" aria-hidden="true" />
      </div>
      <div className="ds-footer__body">
        <div className="mr-wrap">
          <span>© {new Date().getFullYear()} Marea Rizada · Expertos en salud capilar</span>
          <span className="lp-footer__links">
            {redes.map((r) => (
              <a key={r.label} href={r.href} target="_blank" rel="noopener noreferrer">
                {r.label}
              </a>
            ))}
            <a href="/reservar/cambiar">Cambiar mi cita</a>
            <a href="/legal/terminos">Términos</a>
            <a href="/legal/privacidad">Datos personales</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
