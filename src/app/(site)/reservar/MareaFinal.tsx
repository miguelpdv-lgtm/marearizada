"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * El cierre de la reserva: sube la marea con sus crestas rizadas y cruza una
 * botella con un mensaje —la confirmación que va al correo—. Después aparece
 * la tarjeta con los datos. Con "reducir movimiento" queda la escena quieta.
 */
export function MareaFinal({ children, etiqueta }: { children: ReactNode; etiqueta: string }) {
  const atras = useRef<HTMLCanvasElement>(null);
  const adelante = useRef<HTMLCanvasElement>(null);
  const botella = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const back = atras.current!;
    const front = adelante.current!;
    const bottle = botella.current!;
    const cb = back.getContext("2d")!;
    const cf = front.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    const size = () => {
      W = back.clientWidth;
      H = back.clientHeight;
      for (const c of [back, front]) {
        c.width = W * dpr;
        c.height = H * dpr;
        c.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };
    size();
    window.addEventListener("resize", size);
    document.body.style.overflow = "hidden";

    type Capa = { ctx: CanvasRenderingContext2D; color: string; off: number; amp: number; k: number; sp: number; ph: number; curl: number };
    const capas: Capa[] = [
      { ctx: cb, color: "#1C6F75", off: 0, amp: 16, k: 0.009, sp: 0.6, ph: 0, curl: 11 },
      { ctx: cb, color: "#278E95", off: 34, amp: 18, k: 0.007, sp: 0.85, ph: 2, curl: 14 },
      { ctx: cf, color: "#6FCFD3", off: 74, amp: 12, k: 0.011, sp: 1.1, ph: 4, curl: 10 },
    ];
    const t0 = performance.now();
    const ease = (x: number) => 1 - Math.pow(1 - x, 3);
    const nivel = (t: number) => H * (1 - 0.44 * ease(Math.min(1, t / 1.4)));
    const superficie = (L: Capa, x: number, t: number, base: number) =>
      base + L.off + L.amp * Math.sin(L.k * x + L.sp * t + L.ph) + L.amp * 0.35 * Math.sin(2.3 * L.k * x - 0.7 * L.sp * t + L.ph * 1.7);
    const rizo = (ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number) => {
      const vueltas = 1.15 * Math.PI * 2;
      ctx.beginPath();
      for (let a = 0; a <= vueltas; a += 0.12) {
        const r = R * (1 - (a / vueltas) * 0.78);
        const th = -Math.PI / 2 - a;
        const x = cx + r * Math.cos(th);
        const y = cy + R + r * Math.sin(th);
        if (a) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    };

    let raf = 0;
    const cuadro = (ahora: number) => {
      const t = reduce ? 9 : (ahora - t0) / 1000;
      const base = reduce ? H * 0.56 : nivel(t);
      cb.clearRect(0, 0, W, H);
      cf.clearRect(0, 0, W, H);
      for (const L of capas) {
        const c = L.ctx;
        const pts: [number, number][] = [];
        for (let x = -8; x <= W + 8; x += 6) pts.push([x, superficie(L, x, t, base)]);
        c.fillStyle = L.color;
        c.beginPath();
        c.moveTo(-8, H);
        for (const [x, y] of pts) c.lineTo(x, y);
        c.lineTo(W + 8, H);
        c.fill();
        c.strokeStyle = "#EFFBFB";
        c.lineWidth = 2.2;
        c.lineCap = "round";
        c.globalAlpha = 0.9;
        c.beginPath();
        pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.stroke();
        for (let i = 2; i < pts.length - 2; i++) {
          const y = pts[i][1];
          if (y < pts[i - 1][1] && y <= pts[i + 1][1] && y < pts[i - 2][1] && base + L.off - y > L.amp * 0.55) {
            rizo(c, pts[i][0], y, L.curl);
          }
        }
        c.globalAlpha = 1;
      }
      // La botella sale del agua y cruza sobre la segunda ola.
      const p = reduce ? 0.62 : Math.min(1, Math.max(0, (t - 0.4) / 3.4));
      const bx = -110 + (W + 220) * p;
      const L = capas[1];
      const y1 = superficie(L, bx, t, base);
      const y2 = superficie(L, bx + 10, t, base);
      const angulo = Math.atan2(y2 - y1, 10) * 57.3 + Math.sin(t * 2.2) * 6;
      const sube = reduce ? 0 : Math.max(0, 1 - (t - 0.4) / 0.7) * 40;
      bottle.style.transform = `translate(${bx - 48}px, ${y1 - 30 + sube}px) rotate(${angulo}deg)`;
      bottle.style.opacity = p >= 1 ? "0" : "1";
      if (!reduce) raf = requestAnimationFrame(cuadro);
    };
    raf = requestAnimationFrame(cuadro);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="rf-done" role="dialog" aria-modal="true" aria-label={etiqueta}>
      <canvas ref={atras} aria-hidden="true" />
      <svg ref={botella} className="rf-bottle" viewBox="0 0 96 44" aria-hidden="true">
        <path d="M8 22c0-9 6-14 16-14h38c4 0 7 2 9 5l3 3h9v12h-9l-3 3c-2 3-5 5-9 5H24C14 36 8 31 8 22z" fill="#BDEEEF" fillOpacity=".55" stroke="#FFFFFF" strokeWidth="2" />
        <rect x="83" y="15" width="10" height="14" rx="2" fill="#CDAA9C" stroke="#FFFFFF" strokeWidth="1.5" />
        <rect x="22" y="14" width="40" height="16" rx="3" fill="#F3E3DC" />
        <path d="M26 22c3-3 5-3 8 0s5 3 8 0 5-3 8 0 5 3 8 0" fill="none" stroke="#9A5B49" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 16c3-3 7-4 11-4" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity=".8" />
      </svg>
      <canvas ref={adelante} aria-hidden="true" />
      {children}
    </div>
  );
}

/** El sello del logo dibujándose: sube el agua, se enroscan los rizos, salen las gaviotas. */
export function SelloMarea() {
  return (
    <svg className="rf-seal" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <clipPath id="rf-seal-clip">
          <circle cx="50" cy="50" r="47" />
        </clipPath>
      </defs>
      <g clipPath="url(#rf-seal-clip)">
        <rect width="100" height="100" fill="#CDAA9C" />
        <g className="s-gulls">
          <path d="M57 26q2.8-2.8 5.6 0q2.8-2.8 5.6 0M69 18q2-2 4 0q2-2 4 0" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g className="s-water">
          <path d="M-20 66C-8 60 2 58 14 62S36 58 50 56 72 60 80 60 100 58 120 60V130H-20Z" fill="#BDEEEF" />
          <path d="M0 60C10 58 18 50 30 50S43 61 52 61 63 48 73 48 88 58 100 57V130H0Z" fill="#9EE5E7" />
        </g>
        <g className="s-foam" fill="none" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path pathLength={1} d="M0 60C10 58 18 50 30 50" />
          <path pathLength={1} d="M30 50A8 8 0 0 0 22 58A7 7 0 0 0 29 65A5.5 5.5 0 0 0 34.5 59.5A3.8 3.8 0 0 0 30.7 55.7A2.4 2.4 0 0 0 28.3 58.1" />
          <path pathLength={1} d="M73 48A8 8 0 0 0 65 56A7 7 0 0 0 72 63A5.5 5.5 0 0 0 77.5 57.5A3.8 3.8 0 0 0 73.7 53.7A2.4 2.4 0 0 0 71.3 56.1" />
          <path pathLength={1} d="M4 79C12 74 18 74 25 78S38 83 46 78 58 73 66 78 79 83 87 78 97 74 100 75" />
        </g>
      </g>
    </svg>
  );
}
