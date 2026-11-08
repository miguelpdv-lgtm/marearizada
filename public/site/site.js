/* Interacciones de la guía del sistema de diseño Marea Rizada. */
(function () {
  const { Tide, curlPath, CURL_TYPES, drawStrands, reduceMotion } = window.MareaRizada;
  const $ = (s, r = document) => r.querySelector(s);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
  };

  /* ---- Tema: sistema → claro → oscuro -------------------------------- */
  const themes = [['system', 'Sistema'], ['light', 'Claro'], ['dark', 'Oscuro']];
  let themeIdx = Math.max(0, themes.findIndex(([k]) => k === store.get('mr-theme')));
  function applyTheme() {
    const [key, label] = themes[themeIdx];
    if (key === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', key);
    $('#theme-label').textContent = label;
    store.set('mr-theme', key);
  }
  applyTheme();
  $('#theme-toggle').addEventListener('click', () => { themeIdx = (themeIdx + 1) % themes.length; applyTheme(); });

  /* ---- Olas ---------------------------------------------------------- */
  new Tide($('#hero-tide'));
  new Tide($('#footer-tide'), {
    layers: [
      { color: '--water-1', base: 0.45, amp: 12, k: 0.011, speed: 0.6, phase: 1.0, curl: 9 },
      { color: '--water-2', base: 0.62, amp: 14, k: 0.009, speed: 0.8, phase: 3.0, curl: 12 },
      { color: '--water-3', base: 0.80, amp: 10, k: 0.013, speed: 1.0, phase: 5.0, curl: 9 },
    ],
  });

  /* ---- Burbujas ------------------------------------------------------ */
  function bubbles(host, n) {
    for (let i = 0; i < n; i++) {
      const b = document.createElement('i');
      b.style.left = (5 + Math.random() * 90) + '%';
      b.style.setProperty('--s', (5 + Math.random() * 9).toFixed(1) + 'px');
      b.style.setProperty('--d', (5 + Math.random() * 5).toFixed(1) + 's');
      b.style.setProperty('--delay', (-Math.random() * 8).toFixed(1) + 's');
      host.appendChild(b);
    }
  }
  bubbles($('#hero-bubbles'), 10);
  bubbles($('#bubble-demo'), 12);

  /* ---- Texto que riza ------------------------------------------------ */
  function splitRipple(el) {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.textContent = ch;
      s.style.setProperty('--i', i);
      s.setAttribute('aria-hidden', 'true');
      el.appendChild(s);
    });
  }
  splitRipple($('#hero-ripple'));
  splitRipple($('#ripple-demo'));

  /* ---- Contraste de muestras ---------------------------------------- */
  function lum(hex) {
    const c = hex.replace('#', '').match(/.{2}/g).map((h) => {
      const v = parseInt(h, 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function ratio(a, b) {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  }
  document.querySelectorAll('#swatches .ds-swatch').forEach((sw) => {
    const hex = sw.dataset.hex;
    const vsSal = ratio(hex, '#F2F8F7'), vsAbismo = ratio(hex, '#0F3236');
    const tag = (r, on) => `<span title="Contraste sobre ${on}">${on} ${r.toFixed(1)}${r >= 4.5 ? ' · AA' : r >= 3 ? ' · AA grande' : ''}</span>`;
    sw.querySelector('.ds-aa').innerHTML = tag(vsSal, 'sal') + tag(vsAbismo, 'abismo');
  });

  /* ---- Ejes tipográficos -------------------------------------------- */
  const spec = $('#type-specimen');
  function setFill(input) {
    const p = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.setProperty('--fill', p + '%');
  }
  function updateAxes() {
    const b = $('#ax-bnce').value, i = $('#ax-infm').value, w = $('#ax-wght').value;
    spec.style.fontVariationSettings = `"BNCE" ${b}, "INFM" ${i}`;
    spec.style.fontWeight = w;
    $('#ax-bnce-out').textContent = b; $('#ax-infm-out').textContent = i; $('#ax-wght-out').textContent = w;
  }
  ['#ax-bnce', '#ax-infm', '#ax-wght'].forEach((id) => $(id).addEventListener('input', updateAxes));
  updateAxes();
  document.querySelectorAll('.mr-range').forEach((r) => { setFill(r); r.addEventListener('input', () => setFill(r)); });

  /* ---- Escala de rizos ---------------------------------------------- */
  const curlsHost = $('#curls');
  const families = { 2: 'Ondulado', 3: 'Rizado', 4: 'Afro / coily' };
  Object.entries(CURL_TYPES).forEach(([code, info], idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ds-curl';
    btn.setAttribute('aria-pressed', code === '3B' ? 'true' : 'false');
    btn.innerHTML = `
      <span class="ds-curl__top"><span class="ds-curl__code">${code}</span><span class="ds-curl__fam">${families[code[0]]}</span></span>
      <svg class="mr-draw" viewBox="0 0 240 86" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="${curlPath(code, 240, 86, 6)}"/></svg>
      <span class="ds-curl__name">${info.name}</span>`;
    curlsHost.appendChild(btn);
    const svg = btn.querySelector('svg');
    const path = svg.querySelector('path');
    const len = Math.ceil(path.getTotalLength());
    svg.style.setProperty('--len', len);
    const draw = () => {
      if (reduceMotion.matches) return;
      svg.classList.remove('is-drawing'); void svg.getBoundingClientRect();
      path.style.animationDelay = '0ms';
      svg.classList.add('is-drawing');
    };
    path.style.animationDelay = (idx * 90) + 'ms';
    if (!reduceMotion.matches) svg.classList.add('is-drawing');
    btn.addEventListener('click', () => {
      curlsHost.querySelectorAll('.ds-curl').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      draw();
    });
  });

  /* ---- Marea de carga ----------------------------------------------- */
  $('#loader-range').addEventListener('input', (e) => {
    $('#loader').style.setProperty('--level', e.target.value + '%');
    $('#loader-out').textContent = e.target.value + '%';
  });

  /* ---- Chips -------------------------------------------------------- */
  document.querySelectorAll('#chip-row .mr-chip').forEach((c) => c.addEventListener('click', () => {
    c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'));
  }));

  /* ---- Formulario de reserva --------------------------------------- */
  $('#f-hyd').addEventListener('input', (e) => { $('#f-hyd-out').textContent = e.target.value + '%'; });
  $('#booking').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#f-name');
    const ok = name.value.trim().length > 0;
    name.setAttribute('aria-invalid', String(!ok));
    const slot = $('#toast-slot');
    slot.innerHTML = ok
      ? `<div class="mr-toast mr-rise" style="animation-timing-function:var(--ease-resaca)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 14c3-3 6-3 9 0s6 3 9 0M7 9l3 3 6-6"/></svg>Solicitud preparada para ${name.value.trim()} (demostración).</div>`
      : '<span class="mr-error">Escribe tu nombre para que sepamos a quién llamar.</span>';
  });

  /* ---- Antes / después --------------------------------------------- */
  const ba = $('#ba');
  const redrawBA = () => { drawStrands($('#ba-before'), 'antes'); drawStrands($('#ba-after'), 'despues'); };
  new ResizeObserver(redrawBA).observe(ba);
  new MutationObserver(redrawBA).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redrawBA);
  $('#ba-range').addEventListener('input', (e) => ba.style.setProperty('--split', e.target.value + '%'));

  /* ---- Copiar código ----------------------------------------------- */
  $('#copy-btn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const pre = $('#code-sample');
    try {
      await navigator.clipboard.writeText(pre.innerText);
      btn.textContent = 'Copiado';
    } catch {
      const sel = window.getSelection(); const range = document.createRange();
      range.selectNodeContents(pre); sel.removeAllRanges(); sel.addRange(range);
      btn.textContent = 'Seleccionado';
    }
    setTimeout(() => { btn.textContent = 'Copiar'; }, 1800);
  });
})();
