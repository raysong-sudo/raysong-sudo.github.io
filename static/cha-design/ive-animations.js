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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
