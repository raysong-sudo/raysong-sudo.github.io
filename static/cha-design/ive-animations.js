/**
 * ive-animations.js
 * Scroll-reveal for the v2 Cha Physical Therapy site.
 * Targets elements by CSS selector — no HTML class changes needed.
 * Elements already in the viewport on load get .is-visible immediately.
 */
(function () {
  if (!('IntersectionObserver' in window)) return;

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -28px 0px' });

  function inViewport(el) {
    var r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  }

  function observe(el, cls) {
    el.classList.add(cls);
    if (inViewport(el)) {
      el.classList.add('is-visible');
    } else {
      io.observe(el);
    }
  }

  function init() {
    /* Single fade-up reveals */
    [
      '.section-label',
      '.statement',
      '.two-col',
      '.originated-block',
      '.program-block',
      '.end h2',
      '.tx-tag',
      '.tx-copy h2',
      '.tx-copy > p',
      '.tx-copy .tx-link',
      '.split-hero-copy .sub',
      '.prose',
      '.img-ph',
      '.success-state',
      '.submit-row',
    ].forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        observe(el, 'reveal');
      });
    });

    /* Stagger groups — children reveal sequentially */
    [
      '.big-list',
      '.session-list',
      '.faq-list',
      '.table-rows',
      '.team-rows',
      '.success-meta',
      '.end-meta',
    ].forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        if (!el.classList.contains('reveal')) {
          observe(el, 'reveal-group');
        }
      });
    });
  }

  /* ---- Mobile nav: inject hamburger button + wire the toggle. ----
     Runs on every page because the nav markup is the same everywhere.
     CSS hides the button above 760px so it has no effect on desktop. */
  function initMobileNav() {
    var nav = document.querySelector('.nav');
    var links = nav && nav.querySelector('.nav-links');
    if (!nav || !links || nav.querySelector('.nav-toggle')) return;

    var btn = document.createElement('button');
    btn.className = 'nav-toggle';
    btn.setAttribute('aria-label', 'Toggle menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span></span><span></span><span></span>';

    nav.insertBefore(btn, links);

    function setOpen(open) {
      nav.classList.toggle('nav-open', open);
      btn.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    }

    btn.addEventListener('click', function () {
      setOpen(!nav.classList.contains('nav-open'));
    });

    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') setOpen(false);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 760 && nav.classList.contains('nav-open')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('nav-open')) setOpen(false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); initMobileNav(); });
  } else {
    init();
    initMobileNav();
  }
})();
