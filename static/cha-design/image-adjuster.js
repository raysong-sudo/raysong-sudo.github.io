/* image-adjuster.js
   Preview-only floating tool. Auto-discovers .split-hero-img and .img-ph
   on the page. For each image: horizontal + vertical pan (via
   object-position), zoom (via transform scale), horizontal + vertical
   flip, and container height. Per-image state is saved to localStorage
   keyed by page pathname.
   Remove before launch. */

(function () {
  'use strict';

  // -----------------------------
  // Discover adjustable images
  // -----------------------------
  var targets = [];

  document.querySelectorAll('.split-hero-img').forEach(function (container) {
    var media = container.querySelector('img, video');
    if (media) targets.push({ label: 'Hero', media: media, container: container, mode: 'grid' });
  });

  document.querySelectorAll('.img-ph').forEach(function (container) {
    var media = container.querySelector('img, video');
    if (media) {
      var n = targets.filter(function (t) { return t.mode === 'block'; }).length + 1;
      targets.push({ label: 'Image ' + n, media: media, container: container, mode: 'block' });
    }
  });

  // Homepage treatment blocks (.tx > .tx-img). Label each by sibling .tx-tag.
  document.querySelectorAll('.tx-img').forEach(function (container) {
    var media = container.querySelector('img, video');
    if (!media) return;
    var label = 'TX';
    var parent = container.parentElement;
    if (parent) {
      var tag = parent.querySelector('.tx-tag');
      if (tag && tag.textContent.trim()) label = tag.textContent.trim();
    }
    // Truncate long labels so the adjuster tab strip stays compact
    if (label.length > 16) label = label.slice(0, 14) + '…';
    targets.push({ label: label, media: media, container: container, mode: 'grid' });
  });

  // Full-bleed method hero (.method-hero with video wrapper).
  // Height is controlled by the outer .method-hero element, so use that
  // as the height-adjustable container.
  document.querySelectorAll('.method-hero-video-wrap').forEach(function (wrap) {
    var media = wrap.querySelector('img, video');
    if (!media) return;
    var heightTarget = wrap.closest('.method-hero') || wrap;
    targets.push({ label: 'Hero', media: media, container: heightTarget, mode: 'grid' });
  });

  // Pain management full-bleed video hero (.pm-hero with video wrapper).
  document.querySelectorAll('.pm-hero-video-wrap').forEach(function (wrap) {
    var media = wrap.querySelector('img, video');
    if (!media) return;
    var heightTarget = wrap.closest('.pm-hero') || wrap;
    targets.push({ label: 'Hero', media: media, container: heightTarget, mode: 'grid' });
  });

  if (targets.length === 0) return;

  // -----------------------------
  // State + storage
  // -----------------------------
  var storageKey = 'cha-img-adj::' + window.location.pathname;

  function defaultState() {
    return { cropX: 50, cropY: 50, zoom: 100, flipH: false, flipV: false, height: 95, fit: 'cover' };
  }
  var state = targets.map(defaultState);

  // Schema version: bump to invalidate previously saved adjuster state
  // (e.g. when the default container height changes).
  var SCHEMA_VERSION = 2;
  try {
    var savedVersion = +(localStorage.getItem('cha-img-adj-schema') || 0);
    if (savedVersion < SCHEMA_VERSION) {
      Object.keys(localStorage)
        .filter(function (k) { return k.indexOf('cha-img-adj::') === 0 || k === 'pf-crop-state'; })
        .forEach(function (k) { localStorage.removeItem(k); });
      localStorage.setItem('cha-img-adj-schema', String(SCHEMA_VERSION));
    }
  } catch (e) { /* ignore */ }

  var saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && Array.isArray(saved) && saved.length === targets.length) {
      // Upgrade any old-shape entries to the full schema
      state = saved.map(function (s) {
        return {
          cropX: s.cropX != null ? s.cropX : (s.crop != null ? 50 : 50),
          cropY: s.cropY != null ? s.cropY : (s.crop != null ? s.crop : 50),
          zoom:  s.zoom  != null ? s.zoom  : 100,
          flipH: !!s.flipH,
          flipV: !!s.flipV,
          height: s.height != null ? s.height : 60,
          fit:   s.fit   || 'cover'
        };
      });
    } else {
      saved = null;
    }
  } catch (e) { /* ignore */ }

  // Seed defaults from existing inline styles if nothing was saved
  targets.forEach(function (t, i) {
    if (saved) return;
    var op = t.media.style.objectPosition || '';
    var mx = op.match(/(\d+)%\s+/);
    var my = op.match(/\s+(\d+)%/);
    if (mx) state[i].cropX = +mx[1];
    if (my) state[i].cropY = +my[1];
    var h = t.container.style.height || '';
    var hm = h.match(/(\d+(?:\.\d+)?)vh/);
    if (hm) state[i].height = +hm[1];
  });

  var current = 0;

  // -----------------------------
  // Apply state to DOM
  // -----------------------------
  function ensureCoverSizing(t, fit) {
    var s = t.media.style;
    s.setProperty('object-fit', fit || 'cover', 'important');
    s.setProperty('width', '100%', 'important');
    s.setProperty('height', '100%', 'important');
    s.setProperty('position', 'absolute', 'important');
    s.setProperty('inset', '0', 'important');
    s.setProperty('display', 'block', 'important');
    s.setProperty('transform-origin', 'center center', 'important');
    var cs = window.getComputedStyle(t.container);
    if (cs.position === 'static') t.container.style.position = 'relative';
    if (cs.overflow === 'visible') t.container.style.overflow = 'hidden';
  }

  function buildTransform(s) {
    var zf = s.zoom / 100;
    var sx = (s.flipH ? -1 : 1) * zf;
    var sy = (s.flipV ? -1 : 1) * zf;
    // When zoomed in beyond 100%, the element overflows its container
    // symmetrically from the center. To let cropX/cropY pan that overflow,
    // translate by (50 - crop) * (zoom - 1) percent of the element size.
    // cropX = 0 shifts the element right (revealing the LEFT side of the
    // image), cropX = 100 shifts it left (revealing the right side).
    // Multiplied by 1/zf because the translate is applied AFTER scale.
    var overflow = Math.max(0, zf - 1);
    var tx = (50 - s.cropX) * overflow / zf;
    var ty = (50 - s.cropY) * overflow / zf;
    // Flips invert the translate direction along that axis
    if (s.flipH) tx = -tx;
    if (s.flipV) ty = -ty;
    return 'scale(' + sx + ',' + sy + ') translate(' + tx + '%,' + ty + '%)';
  }

  function applyOne(i) {
    var t = targets[i];
    var s = state[i];
    ensureCoverSizing(t, s.fit);
    t.media.style.setProperty('object-position', s.cropX + '% ' + s.cropY + '%', 'important');
    t.media.style.setProperty('transform', buildTransform(s), 'important');
    t.container.style.height = s.height + 'vh';
    if (t.mode === 'grid') t.container.style.alignSelf = 'start';
  }

  function applyAll() { targets.forEach(function (_, i) { applyOne(i); }); }

  // -----------------------------
  // Build UI
  // -----------------------------
  var css = [
    'position:fixed', 'bottom:24px', 'right:24px', 'z-index:9999',
    'background:#1E1B18', 'color:#F4F1EC',
    'font-family:system-ui,-apple-system,sans-serif', 'font-size:12px',
    'padding:14px 16px', 'border-radius:8px',
    'display:flex', 'flex-direction:column', 'gap:8px',
    'box-shadow:0 4px 24px rgba(0,0,0,0.4)',
    'min-width:280px', 'max-width:320px',
    'max-height:90vh', 'overflow-y:auto'
  ].join(';');

  var tool = document.createElement('div');
  tool.id = 'cha-img-adjuster';
  tool.style.cssText = css;

  function div(styles) {
    var d = document.createElement('div');
    if (styles) d.style.cssText = styles;
    return d;
  }
  function btn(label, styles) {
    var b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = (styles || '') + ';border:none;cursor:pointer;font-family:inherit;';
    return b;
  }
  function label(text) {
    var l = div('font-size:9.5px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.45;margin-top:2px;');
    l.textContent = text;
    return l;
  }
  function hairline() { return div('height:1px;background:rgba(255,255,255,0.08);'); }

  function slider(min, max, step) {
    var s = document.createElement('input');
    s.type = 'range';
    s.min = String(min); s.max = String(max); s.step = String(step || 1);
    s.style.cssText = 'flex:1;accent-color:#B8826B;cursor:pointer;';
    return s;
  }

  function sliderRow(leftCap, rightCap, sliderEl, valueEl) {
    var row = div('display:flex;align-items:center;gap:8px;');
    var l = document.createElement('span');
    l.textContent = leftCap;
    l.style.cssText = 'opacity:0.55;font-size:10px;width:34px;text-align:right;';
    var r = document.createElement('span');
    r.textContent = rightCap;
    r.style.cssText = 'opacity:0.55;font-size:10px;width:34px;text-align:left;';
    row.appendChild(l);
    row.appendChild(sliderEl);
    row.appendChild(r);
    valueEl.style.cssText = 'opacity:0.75;font-size:11px;width:44px;text-align:right;';
    row.appendChild(valueEl);
    return row;
  }

  function stepperRow(sliderEl, step) {
    var row = div('display:flex;align-items:center;gap:6px;justify-content:center;margin-top:-2px;');
    var minus = btn('−', 'background:rgba(255,255,255,0.08);color:#fff;padding:2px 10px;border-radius:3px;font-size:13px;line-height:1;');
    var plus  = btn('+', 'background:rgba(255,255,255,0.08);color:#fff;padding:2px 10px;border-radius:3px;font-size:13px;line-height:1;');
    minus.addEventListener('click', function () {
      sliderEl.value = Math.max(+sliderEl.min, +sliderEl.value - step);
      sliderEl.dispatchEvent(new Event('input'));
    });
    plus.addEventListener('click', function () {
      sliderEl.value = Math.min(+sliderEl.max, +sliderEl.value + step);
      sliderEl.dispatchEvent(new Event('input'));
    });
    row.appendChild(minus);
    row.appendChild(plus);
    return row;
  }

  // Header
  var header = div('display:flex;align-items:center;justify-content:space-between;');
  var title = div('font-size:10px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.55;');
  title.textContent = 'Image adjuster';
  var hideBtn = btn('Hide', 'background:transparent;color:#fff;padding:3px 8px;border:1px solid rgba(255,255,255,0.2);border-radius:4px;font-size:10px;');
  header.appendChild(title);
  header.appendChild(hideBtn);
  tool.appendChild(header);

  // Tabs
  var tabsWrap = div('display:flex;flex-wrap:wrap;gap:5px;');
  var tabEls = [];
  targets.forEach(function (t, i) {
    var b = btn(t.label, 'background:rgba(255,255,255,0.12);color:#fff;padding:4px 10px;border-radius:4px;font-size:11px;');
    b.addEventListener('click', function () { current = i; loadUI(); });
    tabsWrap.appendChild(b);
    tabEls.push(b);
  });
  tool.appendChild(tabsWrap);

  tool.appendChild(hairline());

  // Position
  tool.appendChild(label('Horizontal'));
  var cropXSlider = slider(0, 100);
  var cropXVal = document.createElement('span');
  tool.appendChild(sliderRow('← Left', 'Right →', cropXSlider, cropXVal));
  tool.appendChild(stepperRow(cropXSlider, 1));

  tool.appendChild(label('Vertical'));
  var cropYSlider = slider(0, 100);
  var cropYVal = document.createElement('span');
  tool.appendChild(sliderRow('↑ Top', 'Bot ↓', cropYSlider, cropYVal));
  tool.appendChild(stepperRow(cropYSlider, 1));

  tool.appendChild(hairline());

  // Zoom
  tool.appendChild(label('Zoom'));
  var zoomSlider = slider(50, 300);
  var zoomVal = document.createElement('span');
  tool.appendChild(sliderRow('Out', 'In', zoomSlider, zoomVal));
  tool.appendChild(stepperRow(zoomSlider, 5));

  tool.appendChild(hairline());

  // Flip
  tool.appendChild(label('Flip'));
  var flipRow = div('display:flex;gap:6px;');
  var flipHBtn = btn('Flip H', 'background:rgba(255,255,255,0.12);color:#fff;padding:5px 10px;border-radius:4px;font-size:11px;flex:1;');
  var flipVBtn = btn('Flip V', 'background:rgba(255,255,255,0.12);color:#fff;padding:5px 10px;border-radius:4px;font-size:11px;flex:1;');
  flipRow.appendChild(flipHBtn);
  flipRow.appendChild(flipVBtn);
  tool.appendChild(flipRow);

  tool.appendChild(hairline());

  // Fit mode
  tool.appendChild(label('Fit'));
  var fitRow = div('display:flex;gap:6px;');
  var fitCoverBtn   = btn('Cover',   'background:rgba(255,255,255,0.12);color:#fff;padding:5px 8px;border-radius:4px;font-size:10.5px;flex:1;');
  var fitContainBtn = btn('Full',    'background:rgba(255,255,255,0.12);color:#fff;padding:5px 8px;border-radius:4px;font-size:10.5px;flex:1;');
  var fitFillBtn    = btn('Stretch', 'background:rgba(255,255,255,0.12);color:#fff;padding:5px 8px;border-radius:4px;font-size:10.5px;flex:1;');
  fitRow.appendChild(fitCoverBtn);
  fitRow.appendChild(fitContainBtn);
  fitRow.appendChild(fitFillBtn);
  tool.appendChild(fitRow);
  var fitHint = div('font-size:9.5px;opacity:0.45;line-height:1.4;margin-top:2px;');
  fitHint.textContent = 'Cover: fill, may crop. Full: show whole image. Stretch: distort to fill.';
  tool.appendChild(fitHint);

  tool.appendChild(hairline());

  // Height
  tool.appendChild(label('Container height'));
  var heightSlider = slider(15, 140);
  var heightVal = document.createElement('span');
  tool.appendChild(sliderRow('Short', 'Tall', heightSlider, heightVal));
  tool.appendChild(stepperRow(heightSlider, 2));

  tool.appendChild(hairline());

  // Actions
  var saveBtn = btn('Save', 'background:#B8826B;color:#fff;padding:6px 14px;border-radius:4px;font-size:11px;font-weight:500;width:100%;');
  tool.appendChild(saveBtn);

  var actionsRow = div('display:flex;gap:6px;');
  var resetBtn = btn('Reset', 'background:transparent;color:#fff;padding:5px 10px;border:1px solid rgba(255,255,255,0.2);border-radius:4px;font-size:10px;flex:1;');
  var resetThisBtn = btn('Reset this', 'background:transparent;color:#fff;padding:5px 10px;border:1px solid rgba(255,255,255,0.2);border-radius:4px;font-size:10px;flex:1;');
  var exportBtn = btn('Copy', 'background:transparent;color:#fff;padding:5px 10px;border:1px solid rgba(255,255,255,0.2);border-radius:4px;font-size:10px;flex:1;');
  actionsRow.appendChild(resetThisBtn);
  actionsRow.appendChild(resetBtn);
  actionsRow.appendChild(exportBtn);
  tool.appendChild(actionsRow);

  document.body.appendChild(tool);

  // Hidden pill
  var ghost = btn('Adjust', 'position:fixed;bottom:24px;right:24px;z-index:9999;background:#1E1B18;color:#fff;padding:8px 14px;border-radius:6px;font-size:11px;display:none;');
  document.body.appendChild(ghost);
  ghost.addEventListener('click', function () { tool.style.display = 'flex'; ghost.style.display = 'none'; });
  hideBtn.addEventListener('click', function () { tool.style.display = 'none'; ghost.style.display = 'block'; });

  // -----------------------------
  // UI sync
  // -----------------------------
  function loadUI() {
    var s = state[current];
    cropXSlider.value = s.cropX; cropXVal.textContent = s.cropX + '%';
    cropYSlider.value = s.cropY; cropYVal.textContent = s.cropY + '%';
    zoomSlider.value  = s.zoom;  zoomVal.textContent  = s.zoom + '%';
    heightSlider.value = s.height; heightVal.textContent = s.height + 'vh';
    flipHBtn.style.background = s.flipH ? '#B8826B' : 'rgba(255,255,255,0.12)';
    flipVBtn.style.background = s.flipV ? '#B8826B' : 'rgba(255,255,255,0.12)';
    fitCoverBtn.style.background   = s.fit === 'cover'   ? '#B8826B' : 'rgba(255,255,255,0.12)';
    fitContainBtn.style.background = s.fit === 'contain' ? '#B8826B' : 'rgba(255,255,255,0.12)';
    fitFillBtn.style.background    = s.fit === 'fill'    ? '#B8826B' : 'rgba(255,255,255,0.12)';
    tabEls.forEach(function (b, i) {
      b.style.background = i === current ? '#B8826B' : 'rgba(255,255,255,0.12)';
    });
  }

  // -----------------------------
  // Events
  // -----------------------------
  cropXSlider.addEventListener('input', function () {
    state[current].cropX = +cropXSlider.value;
    cropXVal.textContent = cropXSlider.value + '%';
    applyOne(current);
  });
  cropYSlider.addEventListener('input', function () {
    state[current].cropY = +cropYSlider.value;
    cropYVal.textContent = cropYSlider.value + '%';
    applyOne(current);
  });
  zoomSlider.addEventListener('input', function () {
    state[current].zoom = +zoomSlider.value;
    zoomVal.textContent = zoomSlider.value + '%';
    applyOne(current);
  });
  heightSlider.addEventListener('input', function () {
    state[current].height = +heightSlider.value;
    heightVal.textContent = heightSlider.value + 'vh';
    applyOne(current);
  });
  flipHBtn.addEventListener('click', function () {
    state[current].flipH = !state[current].flipH;
    flipHBtn.style.background = state[current].flipH ? '#B8826B' : 'rgba(255,255,255,0.12)';
    applyOne(current);
  });
  flipVBtn.addEventListener('click', function () {
    state[current].flipV = !state[current].flipV;
    flipVBtn.style.background = state[current].flipV ? '#B8826B' : 'rgba(255,255,255,0.12)';
    applyOne(current);
  });

  function setFit(mode) {
    state[current].fit = mode;
    applyOne(current);
    loadUI();
  }
  fitCoverBtn.addEventListener('click',   function () { setFit('cover'); });
  fitContainBtn.addEventListener('click', function () { setFit('contain'); });
  fitFillBtn.addEventListener('click',    function () { setFit('fill'); });

  saveBtn.addEventListener('click', function () {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      var orig = saveBtn.textContent;
      saveBtn.textContent = 'Saved';
      setTimeout(function () { saveBtn.textContent = orig; }, 1200);
    } catch (e) {
      alert('Could not save: ' + e.message);
    }
  });

  resetBtn.addEventListener('click', function () {
    if (!confirm('Reset ALL images on this page?')) return;
    localStorage.removeItem(storageKey);
    location.reload();
  });

  resetThisBtn.addEventListener('click', function () {
    state[current] = defaultState();
    applyOne(current);
    loadUI();
  });

  exportBtn.addEventListener('click', function () {
    var lines = targets.map(function (t, i) {
      var s = state[i];
      var src = (t.media.getAttribute('src') || '').split('/').pop();
      var tx = buildTransform(s);
      return '/* ' + t.label + ' (' + src + ') */\n' +
             '  object-position: ' + s.cropX + '% ' + s.cropY + '%;\n' +
             '  transform: ' + tx + ';\n' +
             '  container height: ' + s.height + 'vh;';
    }).join('\n\n');
    navigator.clipboard.writeText(lines).then(function () {
      var orig = exportBtn.textContent;
      exportBtn.textContent = 'Copied';
      setTimeout(function () { exportBtn.textContent = orig; }, 1200);
    });
  });

  // Only write inline styles for images the user has actually adjusted.
  // For un-touched pages, let the CSS defaults govern the layout.
  if (saved) applyAll();
  loadUI();
})();
