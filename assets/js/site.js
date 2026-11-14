/* ==========================================================================
   Stadium 1 BBQ & More — site behavior
   Mobile nav, scroll reveals, form handling.
   ========================================================================== */

(function () {
  'use strict';

  /* ---- Mobile navigation ------------------------------------------- */
  var burger = document.querySelector('[data-burger]');
  var nav = document.querySelector('[data-nav]');

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      nav.setAttribute('data-open', String(!open));
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        burger.setAttribute('aria-expanded', 'false');
        nav.setAttribute('data-open', 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        burger.setAttribute('aria-expanded', 'false');
        nav.setAttribute('data-open', 'false');
        burger.focus();
      }
    });
  }

  /* ---- Scroll reveals ---------------------------------------------- */
  var reveals = document.querySelectorAll('[data-reveal]');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reveals.length && 'IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    Array.prototype.forEach.call(reveals, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('is-in'); });
  }

  /* ---- Forms --------------------------------------------------------
     Submits to /api/contact, which prices nothing and decides nothing —
     it checks the submission and hands it to the Sheet that records it
     and emails Shon.

     The one rule here: never tell someone their message was sent when it
     was not. A failed send says so and gives the phone number, with
     their answers still on screen to copy across.
     ------------------------------------------------------------------ */
  var forms = document.querySelectorAll('form[data-site-form]');

  var FALLBACK =
    'Reach Shon directly &mdash; ' +
    '<a href="tel:+13173321327">call or text (317) 332-1327</a> or ' +
    '<a href="mailto:stadium1bbq@stadium1bbq.com">email stadium1bbq@stadium1bbq.com</a>. ' +
    'Your answers are still on screen, so you can copy them across.';

  Array.prototype.forEach.call(forms, function (form) {
    var kind = form.getAttribute('data-site-form');
    var box = form.querySelector('[data-form-status]');
    var button = form.querySelector('button[type="submit"]');
    var sending = false;

    function say(html, bad) {
      if (!box) return;
      box.hidden = false;
      box.innerHTML = html;
      box.classList.toggle('notice--bad', !!bad);
      box.setAttribute('tabindex', '-1');
      box.focus({ preventScroll: true });
      box.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending || !form.reportValidity()) return;

      var fields = {};
      var honeypot = '';
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.type === 'submit') return;
        if (el.name === 'website') { honeypot = el.value; return; }
        fields[el.name] = el.value;
      });

      sending = true;
      if (button) { button.disabled = true; button.dataset.label = button.textContent;
                    button.textContent = 'Sending…'; }
      if (box) { box.hidden = true; box.classList.remove('notice--bad'); }

      function done(ok, html) {
        sending = false;
        if (button) { button.disabled = false;
                      button.textContent = button.dataset.label || 'Send'; }
        say(html, !ok);
        if (ok) form.reset();
      }

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form: kind, website: honeypot, fields: fields })
      }).then(function (r) {
        return r.json().then(function (d) { return { ok: r.ok, data: d }; });
      }).then(function (res) {
        if (res.ok && res.data && res.data.ok) {
          done(true, '<strong>Got it &mdash; thank you.</strong> ' +
            (kind === 'quote'
              ? 'Shon has your request and will be in touch about your event.'
              : 'Shon has your message and will get back to you.'));
          return;
        }
        /* Everything else is a failure, including the honest 503 while the
           Sheet is still being hooked up. Say so; do not claim it sent. */
        done(false, '<strong>That didn&rsquo;t send.</strong> ' +
          ((res.data && res.data.error) ? res.data.error + ' ' : '') + FALLBACK);
      }).catch(function () {
        done(false, '<strong>That didn&rsquo;t send.</strong> ' + FALLBACK);
      });
    });
  });

  /* ---- Year stamp ---------------------------------------------------- */
  var years = document.querySelectorAll('[data-year]');
  Array.prototype.forEach.call(years, function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
