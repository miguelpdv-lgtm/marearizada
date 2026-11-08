/* ==========================================================================
   MAREA RIZADA · tide.js
   Motor de olas rizadas en canvas + generador de curvas de rizo.
   Sin dependencias. Expone window.MareaRizada.
   ========================================================================== */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function cssVar(el, name, fallback) {
    const v = getComputedStyle(el).getPropertyValue(name).trim();
    return v || fallback;
  }

  /* ------------------------------------------------------------------------
     Tide: capas de agua con crestas que se enroscan (el "rizo" de la ola).
     Cada capa: y(x) = base + A·sin(kx + ωt + φ) + 0.35A·sin(2.3kx − 0.7ωt + φ2)
     En cada cresta se dibuja una espiral que gira en el sentido de avance,
     igual que las olas del logo.
     ------------------------------------------------------------------------ */
  class Tide {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.opts = Object.assign({
        layers: [
          { color: '--water-3', base: 0.42, amp: 16, k: 0.010, speed: 0.55, phase: 0.0, curl: 10 },
          { color: '--water-2', base: 0.56, amp: 20, k: 0.008, speed: 0.80, phase: 2.1, curl: 15 },
          { color: '--water-1', base: 0.72, amp: 14, k: 0.012, speed: 1.10, phase: 4.0, curl: 11 },
        ],
        foam: '--foam',
        foamWidth: 2,
        interactive: true,
        time: 0,
      }, opts);
      this.t = this.opts.time;
      this.pointer = { x: -9999, strength: 0, target: 0 };
      this.colors = {};
      this.frame = 0;
      this.visible = true;
      this.running = false;

      this.resize = this.resize.bind(this);
      this.loop = this.loop.bind(this);
      new ResizeObserver(this.resize).observe(canvas);
      this.resize();
      this.readColors();

      if (this.opts.interactive) {
        const host = canvas.parentElement;
        host.addEventListener('pointermove', (e) => {
          const r = canvas.getBoundingClientRect();
          this.pointer.x = e.clientX - r.left;
          this.pointer.target = 1;
        });
        host.addEventListener('pointerleave', () => { this.pointer.target = 0; });
      }
      new IntersectionObserver(([entry]) => {
        this.visible = entry.isIntersecting;
        if (this.visible) this.start();
      }).observe(canvas);

      // Recalcular colores al cambiar el tema
      new MutationObserver(() => this.readColors()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => this.readColors());
      reduceMotion.addEventListener('change', () => this.start());
      this.start();
    }

    readColors() {
      for (const l of this.opts.layers) this.colors[l.color] = cssVar(this.canvas, l.color, '#9EE5E7');
      this.colors.foam = cssVar(this.canvas, this.opts.foam, '#ffffff');
      if (reduceMotion.matches || !this.running) this.draw();
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = this.canvas.getBoundingClientRect();
      this.w = Math.max(1, width); this.h = Math.max(1, height);
      this.canvas.width = Math.round(this.w * dpr);
      this.canvas.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.draw();
    }

    start() {
      if (reduceMotion.matches) { this.running = false; this.draw(); return; }
      if (this.running || !this.visible) return;
      this.running = true;
      this.last = performance.now();
      requestAnimationFrame(this.loop);
    }

    loop(now) {
      if (!this.visible || reduceMotion.matches) { this.running = false; return; }
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.t += dt;
      this.pointer.strength += (this.pointer.target - this.pointer.strength) * 0.04;
      this.draw();
      requestAnimationFrame(this.loop);
    }

    surface(layer, x) {
      const { amp, k, speed, phase } = layer;
      const t = this.t;
      const near = this.pointer.strength * Math.exp(-Math.pow((x - this.pointer.x) / 160, 2));
      const A = amp * (1 + 0.9 * near) * Math.min(1, this.w / 700 + 0.35);
      return this.h * layer.base
        + A * Math.sin(k * x + speed * t + phase)
        + A * 0.35 * Math.sin(2.3 * k * x - 0.7 * speed * t + phase * 1.7);
    }

    draw() {
      const { ctx, w, h } = this;
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      const step = 4;
      this.opts.layers.forEach((layer, idx) => {
        const pts = [];
        for (let x = -step; x <= w + step; x += step) pts.push([x, this.surface(layer, x)]);

        // Agua
        ctx.beginPath();
        ctx.moveTo(pts[0][0], h);
        for (const [x, y] of pts) ctx.lineTo(x, y);
        ctx.lineTo(w + step, h);
        ctx.closePath();
        ctx.fillStyle = this.colors[layer.color];
        ctx.fill();

        // Línea de espuma
        ctx.lineWidth = this.opts.foamWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = this.colors.foam;
        ctx.globalAlpha = 0.95 - idx * 0.1;
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();

        // Rizos en las crestas (mínimos locales en coordenadas de pantalla)
        for (let i = 2; i < pts.length - 2; i++) {
          const y = pts[i][1];
          if (y < pts[i - 1][1] && y <= pts[i + 1][1] && y < pts[i - 2][1] && y <= pts[i + 2][1]) {
            const depth = (h * layer.base) - y; // cuánto sobresale la cresta
            if (depth > layer.amp * 0.55) this.curl(pts[i][0], y, layer.curl * Math.min(1.4, depth / layer.amp));
          }
        }
        ctx.globalAlpha = 1;
      });
    }

    // Espiral que arranca en la cresta y se enrosca hacia la izquierda
    // (sentido de avance de la ola) y hacia dentro.
    curl(cx, cy, R) {
      const { ctx } = this;
      const turns = 1.15 * Math.PI * 2;
      ctx.beginPath();
      for (let a = 0; a <= turns; a += 0.12) {
        const r = R * (1 - (a / turns) * 0.78);
        const th = -Math.PI / 2 - a;
        const x = cx + r * Math.cos(th);
        const y = cy + R + r * Math.sin(th);
        a ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }

  /* ------------------------------------------------------------------------
     Curvas de rizo: un rizo es una trocoide.
       x(t) = r·t − d·sin t      y(t) = −d·cos t  (bucles arriba, como crestas)
     d < r  → onda (tipo 2) · d ≈ r → cúspide (tipo 3A) · d > r → bucles (3B–4C)
     ------------------------------------------------------------------------ */
  const CURL_TYPES = {
    '2A': { d: 0.30, n: 1.5, name: 'Ondulado suave' },
    '2B': { d: 0.55, n: 1.75, name: 'Ondulado en S' },
    '2C': { d: 0.80, n: 2, name: 'Ondas marcadas' },
    '3A': { d: 1.10, n: 2.25, name: 'Rizo amplio' },
    '3B': { d: 1.45, n: 2.5, name: 'Rizo definido' },
    '3C': { d: 1.85, n: 3, name: 'Rizo sacacorchos' },
    '4A': { d: 2.30, n: 3.5, name: 'Muelle definido' },
    '4B': { d: 2.90, n: 4, name: 'Zigzag' },
    '4C': { d: 3.50, n: 4.75, name: 'Coily compacto' },
  };

  function curlPath(type, W, H, pad = 4) {
    const { d, n } = CURL_TYPES[type];
    const r = 1;
    const T = Math.PI * 2 * n;
    const spanX = r * T + 2 * d;
    const s = Math.min((W - pad * 2) / spanX, (H - pad * 2) / (2 * d + 0.0001));
    const ox = pad + d * s + ((W - pad * 2) - spanX * s) / 2;
    const oy = H / 2;
    let path = '';
    for (let i = 0, N = 260; i <= N; i++) {
      const t = (i / N) * T;
      const x = ox + s * (r * t - d * Math.sin(t));
      const y = oy - s * d * Math.cos(t);
      path += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return path;
  }

  /* ------------------------------------------------------------------------
     Mechones para el comparador antes/después.
     ------------------------------------------------------------------------ */
  function seeded(seed) {
    return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  }

  function drawStrands(canvas, mode) {
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width: W, height: H } = canvas.getBoundingClientRect();
    if (!W || !H) return;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rand = seeded(mode === 'antes' ? 7 : 11);
    const ink = cssVar(canvas, '--fg-strong', '#1F2725');
    const shine = cssVar(canvas, '--accent', '#1C6F75');
    const muted = cssVar(canvas, '--fg-muted', '#5F6B68');
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round';
    const count = Math.round(W / (mode === 'antes' ? 9 : 24));
    for (let i = 0; i < count; i++) {
      const x0 = ((i + 0.5) / count) * W + (rand() - 0.5) * 8;
      ctx.beginPath();
      if (mode === 'antes') {
        // Encrespado: amplitud irregular, fibras sueltas
        ctx.strokeStyle = muted;
        ctx.globalAlpha = 0.35 + rand() * 0.4;
        ctx.lineWidth = 0.8 + rand();
        let x = x0, y = -10;
        ctx.moveTo(x, y);
        while (y < H + 10) {
          y += 3 + rand() * 4;
          x += (rand() - 0.5) * 9;
          ctx.lineTo(x, y);
        }
      } else {
        // Definido: tirabuzones en hélice. La mitad trasera de cada vuelta es
        // fina y tenue, la delantera gruesa: así se lee como un rizo con volumen.
        const A = 8 + rand() * 4, P = 20 + rand() * 8, ph = rand() * 6, sway = rand() * 6;
        const col = i % 3 === 0 ? shine : ink;
        const pt = (t) => {
          const y = -10 + (t / (Math.PI * 2)) * P;
          return [x0 + A * Math.sin(t + ph) + 6 * Math.sin(y / 140 + sway), y, Math.cos(t + ph)];
        };
        const tMax = ((H + 20) / P) * Math.PI * 2;
        for (const front of [false, true]) {
          ctx.strokeStyle = col;
          ctx.globalAlpha = front ? 0.9 : 0.3;
          ctx.lineWidth = front ? 2.2 : 1;
          ctx.beginPath();
          let drawing = false;
          for (let t = 0; t < tMax; t += 0.1) {
            const [x, y, z] = pt(t);
            if ((z > 0) === front) { drawing ? ctx.lineTo(x, y) : ctx.moveTo(x, y); drawing = true; }
            else drawing = false;
          }
          ctx.stroke();
        }
        continue;
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  window.MareaRizada = { Tide, curlPath, CURL_TYPES, drawStrands, reduceMotion };
})();
