'use strict';

/* ==========================================================
   Arthur Parente — Portfolio v5
   JavaScript puro, sem dependências. Cada módulo é isolado e
   falha de forma silenciosa se o elemento não existir.
   Animações: apenas transform/opacity. Respeita
   prefers-reduced-motion em todos os módulos.
   ========================================================== */

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

/* ── 1. TEMA (dark / light) ── */
(function () {
  const btn = $('#theme-btn');
  const meta = $('meta[name="theme-color"]');
  if (!btn) return;

  function apply(theme, persist) {
    root.setAttribute('data-theme', theme);
    btn.setAttribute('aria-label', theme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#09090b' : '#fafafa');
    if (persist) { try { localStorage.setItem('theme', theme); } catch (e) { /* storage indisponível */ } }
  }

  apply(root.getAttribute('data-theme') || 'dark', false);
  btn.addEventListener('click', () => apply(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true));
})();

/* ── 2. PRELOADER + entrada do hero ── */
(function () {
  const pre   = $('#preloader');
  const fill  = $('#pre-fill');
  const count = $('#pre-count');
  let done = false;

  function start() {
    if (done) return;
    done = true;
    root.classList.add('ready');
    if (pre) {
      pre.classList.add('hide');
      setTimeout(() => pre.remove(), 700);
    }
  }

  if (!pre || reduced) { start(); return; }

  const DURATION = 900;
  const t0 = performance.now();
  let loaded = document.readyState === 'complete';
  if (!loaded) window.addEventListener('load', () => { loaded = true; }, { once: true });

  function frame(now) {
    const p = Math.min((now - t0) / DURATION, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    if (fill)  fill.style.transform = 'scaleX(' + eased + ')';
    if (count) count.textContent = String(Math.round(eased * 100)).padStart(3, '0');
    if (p < 1) requestAnimationFrame(frame);
    else if (loaded) start();
    else window.addEventListener('load', start, { once: true });
  }
  requestAnimationFrame(frame);
  setTimeout(start, 3000); // segurança: nunca prende o usuário no preloader
})();

/* ── 3. NAVBAR, PROGRESSO E VOLTAR AO TOPO (um único scroll handler) ── */
(function () {
  const nav = $('#navbar');
  const bar = $('#progress');
  const top = $('#backTop');
  let ticking = false;

  function update() {
    const y = window.scrollY;
    if (nav) nav.classList.toggle('scrolled', y > 30);
    if (top) top.classList.toggle('visible', y > 480);
    if (bar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
    }
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();

  if (top) top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));
})();

/* ── 4. LINK ATIVO CONFORME A SEÇÃO ── */
(function () {
  const links = $$('.nav-link, .mob-link');
  const sections = $$('main section[id]');
  if (!links.length || !sections.length || !('IntersectionObserver' in window)) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = '#' + entry.target.id;
      links.forEach((l) => {
        const on = l.getAttribute('href') === id;
        l.classList.toggle('active', on);
        if (on) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => obs.observe(s));
})();

/* ── 5. MENU MOBILE ── */
(function () {
  const btn  = $('#hamburger');
  const menu = $('#mobile-menu');
  if (!btn || !menu) return;
  let open = false;

  function set(state) {
    open = state;
    btn.classList.toggle('open', open);
    menu.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.setAttribute('aria-hidden', String(!open));
  }

  btn.addEventListener('click', () => set(!open));
  $$('.mob-link', menu).forEach((l) => l.addEventListener('click', () => set(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) { set(false); btn.focus(); } });
  document.addEventListener('click', (e) => {
    if (open && !menu.contains(e.target) && !btn.contains(e.target)) set(false);
  });
  window.addEventListener('resize', () => { if (open && window.innerWidth > 980) set(false); }, { passive: true });
})();

/* ── 6. EFEITO DE DIGITAÇÃO ── */
(function () {
  const el = $('#typing-text');
  if (!el || reduced) return; // com movimento reduzido, fica a primeira frase estática

  const phrases = ['Desenvolvedor Front-end', 'UI/UX Designer', 'Analista de Dados'];
  let pi = 0, ci = phrases[0].length, deleting = true;

  function tick() {
    const phrase = phrases[pi];
    if (!deleting) {
      ci++;
      el.textContent = phrase.slice(0, ci);
      if (ci === phrase.length) {
        deleting = true;
        return setTimeout(tick, 2200);
      }
      return setTimeout(tick, 65);
    }
    ci--;
    el.textContent = phrase.slice(0, ci);
    if (ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; return setTimeout(tick, 280); }
    setTimeout(tick, 36);
  }
  setTimeout(tick, 2800); // começa depois da entrada do hero
})();

/* ── 7. REVEAL AO ROLAR (Intersection Observer + stagger) ── */
(function () {
  const els = $$('.reveal');
  if (!els.length) return;

  // índice entre irmãos .reveal → atraso escalonado (máx. 5 passos)
  els.forEach((el) => {
    const sibs = Array.from(el.parentElement.children).filter((c) => c.classList.contains('reveal'));
    el.style.setProperty('--i', Math.min(sibs.indexOf(el), 5));
  });

  if (reduced || !('IntersectionObserver' in window)) {
    els.forEach((e) => e.classList.add('visible'));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      obs.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach((e) => obs.observe(e));
})();

/* ── 8. CONTADORES ANIMADOS ── */
(function () {
  const counters = $$('.counter');
  if (!counters.length || reduced || !('IntersectionObserver' in window)) return;

  function run(el) {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || '';
    const steps = 38, dur = 1300;
    let i = 0;
    const id = setInterval(() => {
      i++;
      el.textContent = Math.round(target * (1 - Math.pow(1 - i / steps, 3))) + suffix;
      if (i >= steps) { el.textContent = target + suffix; clearInterval(id); }
    }, dur / steps);
  }

  counters.forEach((c) => { c.textContent = '0' + (c.dataset.suffix || ''); });
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { run(e.target); obs.unobserve(e.target); } });
  }, { threshold: 0.6 });
  counters.forEach((c) => obs.observe(c));
})();

/* ── 9. SPOTLIGHT: luz que acompanha o cursor nos cards ── */
(function () {
  if (!finePointer || reduced) return;
  let raf = 0, lastEvent = null;

  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    lastEvent = e;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const card = lastEvent.target.closest && lastEvent.target.closest('.spot');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (lastEvent.clientX - r.left) + 'px');
      card.style.setProperty('--my', (lastEvent.clientY - r.top) + 'px');
    });
  }, { passive: true });
})();

/* ── 10. BOTÕES MAGNÉTICOS ── */
(function () {
  if (!finePointer || reduced) return;
  $$('[data-magnetic]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      el.style.transform = 'translate3d(' + (dx * 10).toFixed(1) + 'px,' + (dy * 8).toFixed(1) + 'px,0)';
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
})();

/* ── 11. PARALLAX SUTIL NO HERO ── */
(function () {
  const hero   = $('#hero');
  const visual = $('.hero-visual');
  if (!hero || !visual || !finePointer || reduced) return;

  $$('.float-card', visual).forEach((c) => c.style.setProperty('--depth', c.dataset.depth || 0));

  let raf = 0, nx = 0, ny = 0;
  function paint() {
    raf = 0;
    visual.style.setProperty('--px', nx.toFixed(3));
    visual.style.setProperty('--py', ny.toFixed(3));
  }
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    nx = ((e.clientX - r.left) / r.width  - .5) * 2;
    ny = ((e.clientY - r.top)  / r.height - .5) * 2;
    if (!raf) raf = requestAnimationFrame(paint);
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { nx = 0; ny = 0; if (!raf) raf = requestAnimationFrame(paint); });
})();

/* ── 12. ÍCONES OFICIAIS DAS TECNOLOGIAS (Devicon) com fallback ── */
(function () {
  const BASE = 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/';
  const VARIANTS = ['original', 'plain'];

  $$('img[data-ico]').forEach((img) => {
    const name = img.dataset.ico;
    let v = 0;
    img.addEventListener('error', () => {
      v++;
      if (v < VARIANTS.length) img.src = BASE + name + '/' + name + '-' + VARIANTS[v] + '.svg';
      else img.remove(); // sem ícone: a tag continua legível só com o texto
    });
    img.src = BASE + name + '/' + name + '-' + VARIANTS[0] + '.svg';
  });
})();

/* ── 13. COPIAR E-MAIL ── */
(function () {
  const btn   = $('#copy-email');
  const label = $('#copy-label');
  const toast = $('#toast');
  if (!btn) return;
  let timer = 0;

  function notify(msg) {
    if (label) label.textContent = 'Copiado!';
    if (toast) { toast.textContent = msg; toast.classList.add('show'); }
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (label) label.textContent = 'Copiar e-mail';
      if (toast) toast.classList.remove('show');
    }, 2200);
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }

  btn.addEventListener('click', async () => {
    const email = btn.dataset.email;
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(email); ok = true; }
      else ok = fallbackCopy(email);
    } catch (e) { ok = fallbackCopy(email); }
    notify(ok ? 'E-mail copiado para a área de transferência' : 'Não foi possível copiar: ' + email);
  });
})();

/* ── 14. ANO DO RODAPÉ ── */
(function () {
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();
})();
