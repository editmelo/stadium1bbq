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
     No submission endpoint is connected yet, so forms do not send.
     Rather than fake a success message, tell people plainly and point
     them at the phone, text and email that do work today.

     TO CONNECT: see README.md — add the endpoint to the <form> tag and
     delete the block below.
     ------------------------------------------------------------------ */
  var forms = document.querySelectorAll('form[data-no-endpoint]');

  Array.prototype.forEach.call(forms, function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!form.reportValidity()) return;

      var box = form.querySelector('[data-form-status]');
      if (!box) return;

      box.hidden = false;
      box.innerHTML =
        '<strong>This form isn\'t connected yet.</strong> ' +
        'Nothing was sent. Until it\'s hooked up, reach Shon directly &mdash; ' +
        '<a href="tel:+13173321327">call or text (317) 332-1327</a> or ' +
        '<a href="mailto:stadium1bbq@stadium1bbq.com">email stadium1bbq@stadium1bbq.com</a>. ' +
        'Your answers are still on screen, so you can copy them across.';

      box.setAttribute('tabindex', '-1');
      box.focus({ preventScroll: true });
      box.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    });
  });

  /* ---- Year stamp ---------------------------------------------------- */
  var years = document.querySelectorAll('[data-year]');
  Array.prototype.forEach.call(years, function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
