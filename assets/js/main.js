/* Eko Engineering — minimal site JS (no dependencies)
   Handles: sticky header state, mega menu, mobile nav, scroll reveal,
   form validation + demo submission, textarea character counter. */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Sticky header shadow ---------- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('scrolled', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Mobile nav ---------- */
  var burger = document.querySelector('.hamburger');
  if (burger) {
    burger.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------- Mega menu (click + keyboard; hover-friendly on desktop) ----------
     A short close delay keeps the menu open while the pointer travels from the
     button across the header edge into the panel — without it, the dead zone
     between the two fires mouseleave and snaps the menu shut. */
  var megaItems = Array.prototype.slice.call(document.querySelectorAll('.has-mega'));
  megaItems.forEach(function (item) {
    var btn = item.querySelector('.nav-toggle-btn');
    if (!btn) return;
    var closeTimer = null;
    var openedByHover = false;
    var mq = window.matchMedia('(min-width: 981px)');

    function setOpen(open) {
      clearTimeout(closeTimer);
      item.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (!open) openedByHover = false;
    }
    item._megaSetOpen = setOpen; // shared with the document-level handlers below

    btn.addEventListener('click', function () {
      // On desktop, hovering the button has usually already opened the menu.
      // Without this guard, the click would immediately toggle it closed —
      // making "Services" feel broken for mouse users. First click after a
      // hover-open pins the menu; a second click closes it.
      if (item.classList.contains('open') && openedByHover) {
        openedByHover = false;
        return;
      }
      setOpen(!item.classList.contains('open'));
    });

    // Desktop hover: open immediately; close only after the pointer has been
    // away from BOTH the button and the panel for a forgiving grace period.
    // The grace period (350ms) plus the CSS hover-bridge means a user can move
    // diagonally toward a far column without the menu collapsing under them.
    var GRACE = 350;
    function scheduleClose() {
      if (!mq.matches) return;
      clearTimeout(closeTimer);
      closeTimer = setTimeout(function () { setOpen(false); }, GRACE);
    }
    function cancelClose() {
      clearTimeout(closeTimer);
    }
    item.addEventListener('mouseenter', function () {
      cancelClose();
      if (mq.matches && !item.classList.contains('open')) {
        openedByHover = true;
        setOpen(true);
      }
    });
    item.addEventListener('mouseleave', scheduleClose);
    // Re-entering the panel itself (or moving within it) always cancels a
    // pending close — belt-and-braces in case the cursor skims the item edge.
    var panel = item.querySelector('.mega');
    if (panel) {
      panel.addEventListener('mouseenter', cancelClose);
      panel.addEventListener('mousemove', cancelClose);
    }

    // Close when keyboard focus leaves the whole menu (button + panel)
    item.addEventListener('focusout', function () {
      // wait a tick so document.activeElement reflects the new focus target
      setTimeout(function () {
        if (!item.contains(document.activeElement)) setOpen(false);
      }, 0);
    });
  });

  // Single document-level handlers for all mega menus
  if (megaItems.length) {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      megaItems.forEach(function (item) {
        if (item.classList.contains('open')) {
          item._megaSetOpen(false);
          var btn = item.querySelector('.nav-toggle-btn');
          if (btn) btn.focus();
        }
      });
    });
    document.addEventListener('click', function (e) {
      megaItems.forEach(function (item) {
        if (!item.contains(e.target)) item._megaSetOpen(false);
      });
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window && !prefersReduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Textarea character counter ---------- */
  document.querySelectorAll('textarea[maxlength]').forEach(function (ta) {
    var counter = document.createElement('div');
    counter.className = 'char-count';
    ta.insertAdjacentElement('afterend', counter);
    var update = function () {
      counter.textContent = ta.value.length + ' / ' + ta.getAttribute('maxlength') + ' characters';
    };
    ta.addEventListener('input', update);
    update();
  });

  /* ---------- Forms ----------
     PRODUCTION NOTE: this static build performs front-end validation and then
     redirects to the thank-you page. Before launch, connect each form's
     `action` to your form handler (Gravity Forms / Fluent Forms endpoint,
     Formspree, or CRM webhook per Production Doc Part 10.1) and remove the
     demo redirect below. The hidden "company_website" field is a honeypot —
     submissions that fill it should be silently discarded server-side. */
  document.querySelectorAll('form[data-eko-form]').forEach(function (form) {
    form.setAttribute('novalidate', 'novalidate');
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Honeypot: silently "succeed" without doing anything
      var hp = form.querySelector('input[name="company_website"]');
      if (hp && hp.value) { window.location.href = form.dataset.thanks || 'thank-you.html'; return; }

      var valid = true;
      form.querySelectorAll('[required]').forEach(function (input) {
        var field = input.closest('.field') || input.parentElement;
        var ok = input.value.trim() !== '';
        if (ok && input.type === 'email') {
          ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
        }
        field.classList.toggle('invalid', !ok);
        if (!ok) valid = false;
      });

      if (!valid) {
        var firstInvalid = form.querySelector('.invalid input, .invalid select, .invalid textarea');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Demo behaviour: entered data is preserved if validation fails;
      // on success we redirect to the thank-you page (per spec).
      window.location.href = form.dataset.thanks || 'thank-you.html';
    });

    // Clear error state as the user types
    form.querySelectorAll('input, select, textarea').forEach(function (input) {
      input.addEventListener('input', function () {
        var field = input.closest('.field');
        if (field) field.classList.remove('invalid');
      });
    });
  });
})();
