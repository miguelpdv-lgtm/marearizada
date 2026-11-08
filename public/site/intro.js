/* ==========================================================================
   Intro de Marea Rizada: el isotipo se dibuja (aro, sol, marea, rizos de
   espuma, gaviotas), aparece el nombre y el logo vuela hasta la navbar.
   Una vez por sesión. Clic, tecla o rueda la aceleran.
   ========================================================================== */
(function () {
  const root = document.documentElement;
  if (!root.classList.contains('mr-intro-pending')) return;

  const target = document.querySelector('.lp-brand svg');
  if (!target || !Element.prototype.animate) { root.classList.remove('mr-intro-pending'); return; }

  const EASE = 'cubic-bezier(.45,.05,.25,1)';
  const el = document.createElement('div');
  el.className = 'mr-intro';
  el.setAttribute('role', 'presentation');
  el.innerHTML = `
    <div class="mr-intro__bg"></div>
    <div class="mr-intro__stage">
      <svg class="mr-intro__mark" viewBox="0 0 100 100" aria-hidden="true">
        <defs><clipPath id="mr-intro-clip"><circle cx="50" cy="50" r="47"/></clipPath></defs>
        <g clip-path="url(#mr-intro-clip)">
          <rect class="i-sun" width="100" height="100" fill="#CDAA9C"/>
          <g class="i-gulls" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M57 26q2.8-2.8 5.6 0q2.8-2.8 5.6 0M69 18q2-2 4 0q2-2 4 0"/>
          </g>
          <g class="i-water">
            <path d="M-20 66C-8 60 2 58 14 62S36 58 50 56 72 60 80 60 100 58 120 60V120H-20Z" fill="#BDEEEF"/>
            <path d="M0 60C10 58 18 50 30 50S43 61 52 61 63 48 73 48 88 58 100 57V120H0Z" fill="#9EE5E7"/>
          </g>
          <g class="i-foam" fill="none" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
            <path pathLength="1" d="M0 60C10 58 18 50 30 50"/>
            <path pathLength="1" d="M30 50A8 8 0 0 0 22 58A7 7 0 0 0 29 65A5.5 5.5 0 0 0 34.5 59.5A3.8 3.8 0 0 0 30.7 55.7A2.4 2.4 0 0 0 28.3 58.1"/>
            <path pathLength="1" d="M37 53C41 58 45 61 52 61S63 48 73 48"/>
            <path pathLength="1" d="M73 48A8 8 0 0 0 65 56A7 7 0 0 0 72 63A5.5 5.5 0 0 0 77.5 57.5A3.8 3.8 0 0 0 73.7 53.7A2.4 2.4 0 0 0 71.3 56.1"/>
            <path pathLength="1" d="M80 50.5C86 53 92 57 100 57"/>
            <path pathLength="1" d="M4 79C12 74 18 74 25 78S38 83 46 78 58 73 66 78 79 83 87 78 97 74 100 75" stroke-width="2.3" opacity=".9"/>
            <path pathLength="1" d="M14 90C20 87 26 87 31 90S42 93 48 90" stroke-width="2" opacity=".75"/>
          </g>
        </g>
        <circle class="i-ring" cx="50" cy="50" r="47" fill="none" stroke="#E6CCC1" stroke-width="1.2" pathLength="1"/>
      </svg>
      <div class="mr-intro__word" aria-hidden="true"><span>MaReA</span><span>RiZADA</span></div>
    </div>
    <span class="mr-intro__skip">Toca para entrar</span>`;
  document.body.appendChild(el);
  root.classList.add('mr-intro-running');
  root.classList.remove('mr-intro-pending');

  const $ = (s) => el.querySelector(s);
  const mark = $('.mr-intro__mark');
  const word = $('.mr-intro__word');
  const anims = [];
  const run = (node, frames, opts) => { const a = node.animate(frames, Object.assign({ fill: 'both', easing: EASE }, opts)); anims.push(a); return a; };

  // 1 · Aparece el disco y se dibuja el aro
  run(mark, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
  run($('.mr-intro__stage'), [{ transform: 'scale(.86)' }, { transform: 'scale(1)' }], { duration: 550 });
  run($('.i-ring'), [{ strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDasharray: 1, strokeDashoffset: 0 }], { duration: 550 });
  // 2 · Sale el sol
  run($('.i-sun'), [{ opacity: 0 }, { opacity: 1 }], { duration: 350, delay: 80 });
  // 3 · Sube la marea, con un vaivén
  run($('.i-water'), [
    { transform: 'translate(0px, 46px)' },
    { transform: 'translate(-6px, -3px)', offset: .7 },
    { transform: 'translate(0px, 0px)' },
  ], { duration: 650, delay: 180 });
  // 4 · La espuma se enrosca
  el.querySelectorAll('.i-foam path').forEach((p, i) => {
    run(p, [{ strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDasharray: 1, strokeDashoffset: 0 }], { duration: 400, delay: 480 + i * 40 });
  });
  // 5 · Gaviotas y nombre
  run($('.i-gulls'), [{ opacity: 0, transform: 'translate(-6px, 4px)' }, { opacity: 1, transform: 'translate(0, 0)' }], { duration: 350, delay: 700 });
  word.querySelectorAll('span').forEach((s, i) => {
    run(s, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 420, delay: 520 + i * 90 });
  });

  let leaving = false;
  function leave(fast) {
    if (leaving) return;
    leaving = true;
    anims.forEach((a) => a.finish());
    const from = mark.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const dx = to.left - from.left, dy = to.top - from.top, s = to.width / from.width;
    const d = fast ? 350 : 560;
    word.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateX(-12px)' }], { duration: d * .35, fill: 'forwards', easing: EASE });
    $('.mr-intro__skip').animate([{ opacity: .7 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
    $('.mr-intro__bg').animate([{ opacity: 1 }, { opacity: 0 }], { duration: d * .8, delay: d * .2, fill: 'forwards', easing: 'ease-out' });
    const fly = mark.animate([
      { transform: 'translate(0, 0) scale(1)' },
      { transform: `translate(${dx}px, ${dy}px) scale(${s})` },
    ], { duration: d, fill: 'forwards', easing: 'cubic-bezier(.6,-.15,.25,1.1)' });
    fly.finished.then(() => {
      root.classList.remove('mr-intro-running');
      el.remove();
      try { sessionStorage.setItem('mr-intro-seen', '1'); } catch (e) {}
    });
  }
  const timer = setTimeout(() => leave(false), 1050);
  const skip = () => { clearTimeout(timer); leave(true); };
  el.addEventListener('click', skip);
  window.addEventListener('keydown', skip, { once: true });
  window.addEventListener('wheel', skip, { once: true, passive: true });
  window.addEventListener('touchmove', skip, { once: true, passive: true });
})();
