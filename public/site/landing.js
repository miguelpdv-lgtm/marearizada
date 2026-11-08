/* Interacciones de la landing de Marea Rizada. */
(function () {
  const { Tide, curlPath, CURL_TYPES, drawStrands, reduceMotion } = window.MareaRizada;
  const $ = (s, r = document) => r.querySelector(s);

  /* ---- Olas ---------------------------------------------------------- */
  // Olas que suben sobre la foto de la fachada y enlazan con la franja
  new Tide($('#hero-tide'), {
    layers: [
      { color: '--water-3', base: 0.40, amp: 12, k: 0.010, speed: 0.55, phase: 0.0, curl: 10 },
      { color: '--water-2', base: 0.58, amp: 14, k: 0.008, speed: 0.80, phase: 2.1, curl: 13 },
      { color: '--water-1', base: 0.78, amp: 10, k: 0.012, speed: 1.10, phase: 4.0, curl: 9 },
    ],
  });
  new Tide($('#sea-tide'), {
    layers: [
      { color: '--water-1', base: 0.35, amp: 16, k: 0.009, speed: 0.5, phase: 0.0, curl: 12 },
      { color: '--water-2', base: 0.55, amp: 18, k: 0.007, speed: 0.75, phase: 2.0, curl: 16 },
      { color: '--water-3', base: 0.76, amp: 13, k: 0.011, speed: 1.0, phase: 4.0, curl: 11 },
    ],
  });
  new Tide($('#footer-tide'), {
    layers: [
      { color: '--water-1', base: 0.45, amp: 12, k: 0.011, speed: 0.6, phase: 1.0, curl: 9 },
      { color: '--water-2', base: 0.62, amp: 14, k: 0.009, speed: 0.8, phase: 3.0, curl: 12 },
      { color: '--water-3', base: 0.80, amp: 10, k: 0.013, speed: 1.0, phase: 5.0, curl: 9 },
    ],
  });

  /* ---- Franja de patrones ------------------------------------------- */
  const band = $('#band');
  const bandItems = Object.entries(CURL_TYPES).map(([code, info]) =>
    `<span class="lp-band__item"><svg viewBox="0 0 76 30" aria-hidden="true"><path d="${curlPath(code, 76, 30, 3)}"/></svg>${code} <small>${info.name}</small></span>`
  ).join('');
  band.innerHTML = bandItems + bandItems.replace(/<span class="lp-band__item">/g, '<span class="lp-band__item" aria-hidden="true">');

  /* ---- Descubre tu patrón ------------------------------------------- */
  const CARE = {
    '2A': { t: 'Ondas sueltas y finas que se alisan con facilidad. Pide productos ligeros: espuma o gel suave. Los aceites pesados la aplastan.', hid: 2, def: 2, noc: 1 },
    '2B': { t: 'Ondas en S desde media melena, con algo de frizz en la coronilla. Un gel ligero aplicado en mojado y un buen scrunch las marcan.', hid: 2, def: 3, noc: 2 },
    '2C': { t: 'Ondas marcadas desde la raíz y tendencia al frizz. Crema ligera más gel, y difusor a baja temperatura.', hid: 3, def: 4, noc: 2 },
    '3A': { t: 'Rizos amplios y brillantes. Hidratación regular, poca manipulación y gel en el pelo bien mojado para que no se abran.', hid: 3, def: 3, noc: 3 },
    '3B': { t: 'Rizos del grosor de un rotulador, con mucho volumen. Pierden forma cuando les falta agua: necesitan hidratación profunda, sellado con crema o aceite ligero y poca manipulación.', hid: 4, def: 4, noc: 3 },
    '3C': { t: 'Sacacorchos densos y apretados que tienden a la sequedad. Leave-in cremoso, peinado con los dedos y mascarilla semanal.', hid: 4, def: 4, noc: 4 },
    '4A': { t: 'Muelles pequeños y definidos. Mucha hidratación y un buen sellado (método LOC o LCO) para que el agua no se escape.', hid: 5, def: 3, noc: 4 },
    '4B': { t: 'Patrón en zigzag con mucho encogimiento. Cremas densas, desenredado por secciones y protección de satén por la noche.', hid: 5, def: 3, noc: 5 },
    '4C': { t: 'Coils muy compactos y frágiles. Máxima hidratación, mínima manipulación y peinados protectores para retener largo.', hid: 5, def: 2, noc: 5 },
  };
  const finder = $('#finder');
  const bars = (el, n) => { el.innerHTML = Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join(''); };
  function select(code) {
    const c = CARE[code], info = CURL_TYPES[code];
    finder.querySelectorAll('.lp-pick').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.code === code)));
    $('#r-code').textContent = code;
    $('#r-name').textContent = info.name;
    $('#r-text').textContent = c.t;
    bars($('#n-hid'), c.hid); bars($('#n-def'), c.def); bars($('#n-noc'), c.noc);
    const level = 10 + c.hid * 16;
    $('#r-tide').style.setProperty('--level', level + '%');
    $('#r-tide-out').textContent = ['', 'poca sed', 'algo de sed', 'sed', 'mucha sed', 'sed máxima'][c.hid];
    const path = $('#r-curve');
    path.setAttribute('d', curlPath(code, 600, 70, 6));
    if (!reduceMotion.matches) {
      const len = Math.ceil(path.getTotalLength());
      path.animate([{ strokeDasharray: len, strokeDashoffset: len }, { strokeDasharray: len, strokeDashoffset: 0 }],
        { duration: 1200, easing: 'cubic-bezier(.45,.05,.25,1)' });
    }
  }
  Object.entries(CURL_TYPES).forEach(([code, info]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lp-pick';
    b.dataset.code = code;
    b.innerHTML = `<svg viewBox="0 0 92 34" aria-hidden="true"><path d="${curlPath(code, 92, 34, 3)}"/></svg><b>${code}</b><span>${info.name}</span>`;
    b.addEventListener('click', () => select(code));
    finder.appendChild(b);
  });
  select('3B');

  /* ---- Antes / después --------------------------------------------- */
  const ba = $('#ba');
  const redrawBA = () => { drawStrands($('#ba-before'), 'antes'); drawStrands($('#ba-after'), 'despues'); };
  new ResizeObserver(redrawBA).observe(ba);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redrawBA);
  $('#ba-range').addEventListener('input', (e) => ba.style.setProperty('--split', e.target.value + '%'));
})();
