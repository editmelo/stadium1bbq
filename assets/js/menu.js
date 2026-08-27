/* ==========================================================================
   Menu photo preview
   Stadium 1 BBQ & More

   Rows carrying data-shot show that photograph in the panel beside the
   price list when hovered or focused.

   Every row already carries a thumbnail in the markup, so the food is
   visible without this running at all. The panel is an enhancement for
   screens wide enough to hold it, and is never built otherwise.
   ========================================================================== */

(function () {
  'use strict';

  var MIN_WIDTH = 1080;   // below this the column would be too narrow to help
  var VERSION = '?v=8';

  function init() {
    var panel = document.querySelector('[data-menu-preview]');
    if (!panel) return;

    var rows = Array.prototype.slice.call(document.querySelectorAll('tr[data-shot]'));
    if (!rows.length) return;

    var wide = window.matchMedia('(min-width: ' + MIN_WIDTH + 'px)');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var built = false;
    var img, caption, current;

    function build() {
      if (built) return;
      panel.hidden = false;
      panel.innerHTML =
        '<div class="menu-preview__frame">' +
          '<img class="menu-preview__img" alt="" decoding="async">' +
          '<p class="menu-preview__caption"></p>' +
        '</div>' +
        '<p class="menu-preview__hint">Hover an item to see it</p>';
      img = panel.querySelector('.menu-preview__img');
      caption = panel.querySelector('.menu-preview__caption');
      built = true;

      // Start on the first item so the panel is never an empty box.
      show(rows[0], true);
    }

    function teardown() {
      if (!built) return;
      panel.hidden = true;
      panel.innerHTML = '';
      built = false;
      current = null;
    }

    function show(row, quiet) {
      if (!built) return;
      var slug = row.getAttribute('data-shot');
      if (!slug || slug === current) return;
      current = slug;

      var label = row.getAttribute('data-shot-label') || '';
      var next = new Image();
      next.onload = function () {
        img.src = next.src;
        img.alt = label ? label + ' from Stadium 1 BBQ' : '';
        caption.textContent = label;
        panel.classList.add('is-loaded');
        if (!reduced && !quiet) {
          panel.classList.remove('is-swapping');
          void panel.offsetWidth;
          panel.classList.add('is-swapping');
        }
      };
      next.src = '/assets/img/' + slug + '.jpg' + VERSION;
    }

    rows.forEach(function (row) {
      row.addEventListener('mouseenter', function () { show(row); });
      row.addEventListener('focusin', function () { show(row); });
      // Focusable so keyboard users get the same thing as the mouse.
      if (!row.hasAttribute('tabindex')) row.setAttribute('tabindex', '0');
    });

    function sync() {
      if (wide.matches) build(); else teardown();
    }

    if (wide.addEventListener) wide.addEventListener('change', sync);
    else if (wide.addListener) wide.addListener(sync);
    sync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
