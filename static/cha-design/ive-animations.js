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

  /* ---- Footer socials: inject icon row into every page's footer. ----
     CSS lives in ive-draft.css under FOOT SOCIAL. */
  function initFooterSocial() {
    var footer = document.querySelector('footer');
    if (!footer || footer.querySelector('.foot-social')) return;

    var socials = [
      { name: 'Instagram', url: 'https://www.instagram.com/chaphysicaltherapy',
        svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none"/></svg>' },
      { name: 'Threads', url: 'https://www.threads.com/@chaphysicaltherapy',
        svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.2 11.3c-.1 0-.2-.1-.3-.1-.2-2.7-1.6-4.2-4-4.2-1.4 0-2.6.6-3.3 1.7l1.3.9c.5-.8 1.3-1 2-1 1 0 1.7.3 2.1 1 .3.5.5 1.1.6 1.9-.7-.1-1.4-.2-2.2-.1-2.4.1-3.9 1.5-3.8 3.4.1.9.5 1.7 1.3 2.2.6.4 1.5.7 2.4.6 1.2-.1 2.1-.5 2.8-1.4.5-.6.8-1.5 1-2.5 1 .5 1.7 1.2 2.1 2 .6 1.2 1.1 3.1-1.5 5.7-2.3 2.3-5 2.5-7.7 1-2.5-1.4-3.9-4.1-3.9-7.4 0-3.3 1.4-6 3.9-7.4 1.7-1 3.7-1.3 5.7-.8 1.9.5 3.4 1.7 4.3 3.5l1.4-.7c-1.1-2.2-3-3.7-5.3-4.3C13.5 1.7 11 2 8.8 3.3 5.8 5 4.2 8.2 4.2 12s1.6 7 4.6 8.7c1.4.8 3 1.2 4.6 1.2 1.1 0 2.2-.2 3.2-.6 1.5-.5 2.8-1.4 3.8-2.7 1.5-2 2-4.7.6-7-.5-.9-1.2-1.7-2.1-2.3-.4-.3-.8-.5-1.2-.7l-.5-.3zm-3.8 5.6c-1.1.1-2.2-.4-2.3-1.4-.1-.7.5-1.5 2.2-1.6h.4c.6 0 1.1.1 1.6.2-.3 1.8-1.2 2.7-1.9 2.8z"/></svg>' },
      { name: 'TikTok', url: 'https://www.tiktok.com/@chaphysicaltherapy',
        svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.55 19.6a6.34 6.34 0 0 0 10.86-4.43V8.79a8.16 8.16 0 0 0 4.77 1.51v-3.45a4.85 4.85 0 0 1-1.59-.16z"/></svg>' },
      { name: 'Facebook', url: 'https://www.facebook.com/people/Cha-Physical-Therapy/61551543464271/',
        svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.19 2.24.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94"/></svg>' }
    ];

    var ul = document.createElement('ul');
    ul.className = 'foot-social';
    ul.innerHTML = socials.map(function (s) {
      return '<li><a href="' + s.url + '" aria-label="Cha PT on ' + s.name + '" target="_blank" rel="noopener noreferrer">' + s.svg + '</a></li>';
    }).join('');

    var legal = footer.querySelector('.foot-legal');
    if (legal) footer.insertBefore(ul, legal);
    else footer.appendChild(ul);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); initMobileNav(); initFooterSocial(); });
  } else {
    init();
    initMobileNav();
    initFooterSocial();
  }
})();
