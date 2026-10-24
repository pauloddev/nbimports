/* NB Imports MOC · interações (sem dependências) */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Header */
  const header = document.getElementById('topo-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

  /* Menu mobile */
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('menu-mobile');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  document.addEventListener('click', (e) => { if (menu.classList.contains('is-open') && !menu.contains(e.target) && !toggle.contains(e.target)) setMenu(false); });

  /* Transições de entrada: cada bloco revela textos e imagens de cima para baixo.
     Quando um elemento entra na tela, todos os anteriores do mesmo bloco entram junto,
     então nenhum texto fica deslocado por cima do próximo. */
  const reveals = Array.from(document.querySelectorAll('.reveal'));
  reveals.forEach((el) => {
    if (/^H[1-3]$/.test(el.tagName)) el.classList.add('r-title');
    else if (el.matches('.help-photo, .spot-photo, .map-card') || el.querySelector(':scope > .ceo-photo')) el.classList.add('r-media');
  });
  const groupOf = (el) => el.closest('.hero-copy, .split-copy, .section-head, .callout-grid, .brand-duo, .loc-grid, .container, section') || document.body;
  const groups = new Map();
  reveals.forEach((el) => { const g = groupOf(el); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(el); });
  groups.forEach((list) => list.forEach((el, i) => { if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', `${Math.min(i * 0.07, 0.42)}s`); }));
  const show = (el) => { const list = groups.get(groupOf(el)); const idx = list.indexOf(el); for (let i = 0; i <= idx; i++) list[i].classList.add('is-in'); };
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    reveals.forEach((el) => io.observe(el));
  } else reveals.forEach((el) => el.classList.add('is-in'));

  /* Carrossel 3D: o item da vez fica no centro, os outros entram e saem pelas laterais (loop infinito) */
  document.querySelectorAll('[data-c3d]').forEach((root) => {
    const stage = root.querySelector('.c3d-stage');
    const slides = Array.from(stage.children);
    const n = slides.length;
    const dotsWrap = root.querySelector('[data-dots]');
    const cap = root.querySelector('[data-caption]');
    let active = 0, drag = 0, timer = null, visible = false, paused = false;

    const many = n > 9;
    const counter = many ? Object.assign(document.createElement('span'), { className: 'car-count' }) : null;
    if (counter) dotsWrap.appendChild(counter);
    const dots = many ? [] : slides.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('aria-label', `Ir para o item ${i + 1} de ${n}`);
      b.addEventListener('click', () => { go(i); restart(); });
      dotsWrap.appendChild(b); return b;
    });

    const rel = (i) => { let d = i - active; if (d > n / 2) d -= n; if (d < -n / 2) d += n; return d; };
    const wide = root.classList.contains('is-wide');
    const layout = () => {
      const w = slides[0].offsetWidth;
      const gap = parseFloat(getComputedStyle(root).getPropertyValue('--gap')) || 0.78;
      const shrink = wide ? 0.26 : 0.2;
      slides.forEach((s, i) => {
        const d = rel(i) + drag; const a = Math.abs(d);
        // posição acumulada: cada vizinho encosta no anterior sem bagunçar a pilha
        const x = Math.sign(d) * (Math.min(a, 1) * w * gap + Math.max(0, a - 1) * w * gap * 0.78);
        const scale = Math.max(0.5, 1 - a * shrink);
        s.style.transform = `translateX(${x.toFixed(1)}px) scale(${scale.toFixed(3)})`;
        const op = a > 2.2 ? 0 : (wide ? Math.max(0, 1 - a * 0.55) : Math.max(0, 1 - a * 0.3));
        s.style.opacity = op.toFixed(3);
        s.style.zIndex = String(100 - Math.round(a * 10));
        s.style.filter = (wide || a < 0.5) ? 'none' : `brightness(${Math.max(0.5, 1 - a * 0.3).toFixed(2)})`;
        s.style.visibility = a > 2.4 ? 'hidden' : 'visible';
        s.style.pointerEvents = a > 1.6 ? 'none' : 'auto';
        const isA = Math.round(rel(i)) === 0 && Math.abs(drag) < 0.5;
        s.classList.toggle('is-active', isA);
        s.setAttribute('aria-hidden', String(!isA));
      });
      dots.forEach((d, i) => d.setAttribute('aria-current', String(i === active)));
      if (counter) counter.innerHTML = `<span><b>${String(active + 1).padStart(2, '0')}</b> / ${String(n).padStart(2, '0')}</span><i style="--p:${((active + 1) / n).toFixed(3)}"></i>`;
      if (cap) {
        const s = slides[active];
        cap.innerHTML = s.dataset.title ? `<b>${s.dataset.title}</b>${s.dataset.sub ? `<span>${s.dataset.sub}</span>` : ''}` : '';
      }
      // vídeos: só o da vez e os vizinhos tocam
      slides.forEach((s, i) => {
        const v = s.querySelector('video'); if (!v) return;
        const near = Math.abs(rel(i)) <= 1 && visible;
        if (near && !reduce) { if (v.preload !== 'auto') { v.preload = 'auto'; } const p = v.play(); if (p) p.catch(() => {}); } else v.pause();
      });
    };
    const go = (i) => { active = ((i % n) + n) % n; drag = 0; layout(); };

    root.querySelector('[data-prev]').addEventListener('click', () => { go(active - 1); restart(); });
    root.querySelector('[data-next]').addEventListener('click', () => { go(active + 1); restart(); });
    slides.forEach((s, i) => s.addEventListener('click', () => { if (!moved && i !== active) { go(i); restart(); } }));
    root.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') { go(active - 1); restart(); } if (e.key === 'ArrowRight') { go(active + 1); restart(); } });

    // arrastar / swipe
    let startX = 0, startY = 0, dragging = false, moved = false, lastX = 0, lastT = 0, vel = 0;
    stage.addEventListener('pointerdown', (e) => {
      dragging = true; moved = false; startX = lastX = e.clientX; startY = e.clientY; lastT = performance.now(); vel = 0;
      stop();
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) < 8) return;
      if (!moved && Math.abs(e.clientY - startY) > Math.abs(dx)) { dragging = false; return; }
      moved = true; root.classList.add('is-dragging');
      const now = performance.now(); vel = (e.clientX - lastX) / Math.max(1, now - lastT); lastX = e.clientX; lastT = now;
      const w = slides[0].offsetWidth * (parseFloat(getComputedStyle(root).getPropertyValue('--gap')) || 0.78);
      drag = dx / w; layout();
    });
    const end = () => {
      if (!dragging) return; dragging = false; root.classList.remove('is-dragging');
      if (moved) {
        const projected = drag + vel * 0.35; // projeta o movimento (flick)
        const steps = Math.round(-projected);
        go(active + (steps === 0 && Math.abs(vel) > 0.4 ? (vel < 0 ? 1 : -1) : steps));
      }
      setTimeout(() => { moved = false; }, 0);
      restart();
    };
    window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);

    const delay = Number(root.dataset.autoplay || 0);
    function stop() { clearInterval(timer); timer = null; }
    function restart() { stop(); if (delay && !reduce && visible && !paused) timer = setInterval(() => go(active + 1), delay); }
    root.addEventListener('mouseenter', () => { paused = true; stop(); });
    root.addEventListener('mouseleave', () => { paused = false; restart(); });
    root.addEventListener('focusin', () => { paused = true; stop(); });
    root.addEventListener('focusout', () => { paused = false; restart(); });
    window.addEventListener('resize', layout);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => en.forEach((e) => { visible = e.isIntersecting; layout(); restart(); }), { threshold: 0.25 }).observe(root);
    } else { visible = true; }
    go(0);
  });

  /* Mapa do Google: carrega bem antes de chegar na seção, para abrir de imediato */
  const mapFrame = document.querySelector('iframe[data-src]');
  if (mapFrame) {
    const load = () => { if (!mapFrame.src) mapFrame.src = mapFrame.dataset.src; };
    if ('IntersectionObserver' in window) {
      const mio = new IntersectionObserver((en) => { if (en.some((e) => e.isIntersecting)) { load(); mio.disconnect(); } }, { rootMargin: '1600px 0px' });
      mio.observe(mapFrame);
    } else load();
    window.addEventListener('load', () => setTimeout(load, 2500)); // garante que já esteja pronto
  }

  /* Horário: destaca o dia e mostra aberto/fechado (horário de Brasília) */
  const hours = document.querySelector('[data-hours]');
  if (hours) {
    try {
      // [abre, fecha] em minutos, por dia (0 = domingo)
      const sched = { 0: null, 1: [510, 1140], 2: [510, 1080], 3: [510, 1080], 4: [510, 1080], 5: [510, 1140], 6: [540, 1080] };
      const update = () => {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
        const get = (t) => parts.find((p) => p.type === t).value;
        const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
        const mins = (Number(get('hour')) % 24) * 60 + Number(get('minute'));
        hours.querySelectorAll('[data-day]').forEach((li) => li.classList.toggle('today', Number(li.dataset.day) === day));
        const s = sched[day]; const open = !!s && mins >= s[0] && mins < s[1];
        const st = hours.querySelector('[data-status]');
        st.textContent = open ? 'Aberto agora' : 'Fechado agora';
        st.classList.toggle('open', open); st.classList.toggle('closed', !open); st.hidden = false;
      };
      update(); setInterval(update, 60000);
    } catch (e) { /* sem destaque se o navegador não suportar */ }
  }

  /* Movimento reduzido: para os aviões no destino */
  if (reduce) document.querySelectorAll('.brasil-3d animateMotion').forEach((a) => a.remove());

  const y = document.querySelector('[data-year]'); if (y) y.textContent = String(new Date().getFullYear());
})();
