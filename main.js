(function () {
  'use strict';

  /* =========================================================
     UTILITIES
  ========================================================= */

  function $(selector, context) {
    return (context || document).querySelector(selector);
  }

  function $$(selector, context) {
    return Array.from((context || document).querySelectorAll(selector));
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* =========================================================
     1. MENU TAB FILTERING
  ========================================================= */

  function initMenuTabs() {
    var tabs = $$('.menu-tab');
    var panels = $$('.menu-panel');

    if (!tabs.length || !panels.length) return;

    function activateTab(tab) {
      var category = tab.getAttribute('data-category');

      tabs.forEach(function (t) {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      panels.forEach(function (panel) {
        var isMatch = panel.getAttribute('data-category') === category;
        panel.classList.toggle('active', isMatch);
        panel.setAttribute('aria-hidden', isMatch ? 'false' : 'true');
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        activateTab(tab);
      });

      tab.addEventListener('keydown', function (e) {
        var idx = tabs.indexOf(tab);
        var next;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          next = tabs[(idx + 1) % tabs.length];
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          next = tabs[(idx - 1 + tabs.length) % tabs.length];
        } else if (e.key === 'Home') {
          e.preventDefault();
          next = tabs[0];
        } else if (e.key === 'End') {
          e.preventDefault();
          next = tabs[tabs.length - 1];
        }

        if (next) {
          next.focus();
          activateTab(next);
        }
      });
    });

    /* Activate first tab by default if none is active */
    var alreadyActive = tabs.find(function (t) {
      return t.classList.contains('active');
    });

    if (!alreadyActive && tabs.length) {
      activateTab(tabs[0]);
    }
  }

  /* =========================================================
     2. INTERSECTION OBSERVER SCROLL ANIMATIONS
  ========================================================= */

  function initScrollAnimations() {
    if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
      /* Graceful degradation: reveal everything immediately */
      $$('section, .reveal-child').forEach(function (el) {
        el.classList.add('revealed');
      });
      return;
    }

    /* --- Section-level observer --- */
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            sectionObserver.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -48px 0px'
      }
    );

    $$('section').forEach(function (section) {
      sectionObserver.observe(section);
    });

    /* --- Child-level staggered observer --- */
    var STAGGER_BASE_MS = 80;

    var childObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;

          var parent = entry.target.parentElement;
          var siblings = $$('.reveal-child', parent);
          var idx = siblings.indexOf(entry.target);

          if (!prefersReducedMotion()) {
            var delay = idx * STAGGER_BASE_MS;
            entry.target.style.transitionDelay = delay + 'ms';
          }

          /* Use rAF so the delay is applied before the class */
          requestAnimationFrame(function () {
            entry.target.classList.add('revealed');
          });

          childObserver.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -32px 0px'
      }
    );

    $$('.reveal-child').forEach(function (el) {
      childObserver.observe(el);
    });
  }

  /* =========================================================
     3. MOBILE HAMBURGER MENU
  ========================================================= */

  function initMobileMenu() {
    var hamburger = $('#hamburger, .hamburger, [data-hamburger]');
    var nav = $('nav, .site-nav');

    if (!hamburger || !nav) return;

    function openMenu() {
      nav.classList.add('nav-open');
      hamburger.setAttribute('aria-expanded', 'true');
      hamburger.setAttribute('aria-label', 'Close navigation menu');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      nav.classList.remove('nav-open');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-label', 'Open navigation menu');
      document.body.style.overflow = '';
    }

    function toggleMenu() {
      if (nav.classList.contains('nav-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    }

    hamburger.addEventListener('click', toggleMenu);

    /* Close when any nav anchor link is clicked */
    $$('a[href^="#"]', nav).forEach(function (link) {
      link.addEventListener('click', function () {
        closeMenu();
      });
    });

    /* Close on Escape key */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('nav-open')) {
        closeMenu();
        hamburger.focus();
      }
    });

    /* Close when clicking outside the nav */
    document.addEventListener('click', function (e) {
      if (
        nav.classList.contains('nav-open') &&
        !nav.contains(e.target) &&
        e.target !== hamburger &&
        !hamburger.contains(e.target)
      ) {
        closeMenu();
      }
    });
  }

  /* =========================================================
     4. SMOOTH-SCROLL CTA → RESERVATIONS
  ========================================================= */

  function initSmoothScroll() {
    var OFFSET_PX = 80; /* height of sticky header */

    function smoothScrollTo(targetId) {
      var target = document.getElementById(targetId) || $(targetId);
      if (!target) return;

      if (prefersReducedMotion()) {
        target.scrollIntoView();
        target.focus({ preventScroll: true });
        return;
      }

      var targetTop =
        target.getBoundingClientRect().top + window.pageYOffset - OFFSET_PX;

      window.scrollTo({
        top: targetTop,
        behavior: 'smooth'
      });

      /* Move focus after scroll for accessibility */
      setTimeout(function () {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }, 600);
    }

    /* CTA buttons that link to #reservations */
    $$('[data-cta-scroll], .cta-btn[href="#reservations"], a[href="#reservations"]').forEach(
      function (btn) {
        btn.addEventListener('click', function (e) {
          var href = btn.getAttribute('href') || btn.getAttribute('data-cta-scroll');
          if (href && href.startsWith('#')) {
            e.preventDefault();
            smoothScrollTo(href.slice(1));
          }
        });
      }
    );

    /* Generic smooth scroll for all internal anchor links */
    $$('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var href = anchor.getAttribute('href');
        if (!href || href === '#') return;
        var targetId = href.slice(1);
        var target = document.getElementById(targetId);
        if (!target) return;
        e.preventDefault();
        smoothScrollTo(targetId);
      });
    });
  }

  /* =========================================================
     5. RESERVATION FORM SUBMIT
  ========================================================= */

  function initReservationForm() {
    var form = $('#reservation-form, .reservation-form, form[data-reservation]');
    if (!form) return;

    function showSuccess(form) {
      /* Remove any previous success message */
      var existing = form.parentElement.querySelector('.form-success');
      if (existing) existing.remove();

      var msg = document.createElement('div');
      msg.className = 'form-success';
      msg.setAttribute('role', 'status');
      msg.setAttribute('aria-live', 'polite');
      msg.innerHTML =
        '<span class="form-success__icon" aria-hidden="true">✦</span>' +
        '<p class="form-success__heading">Reservation Request Received</p>' +
        '<p class="form-success__body">Grazie! We\'ll confirm your table within 24 hours. ' +
        'Check your inbox for a confirmation email.</p>';

      /* Insert after form */
      form.insertAdjacentElement('afterend', msg);

      /* Animate in */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          msg.classList.add('form-success--visible');
        });
      });

      /* Scroll to success message */
      if (!prefersReducedMotion()) {
        setTimeout(function () {
          msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 80);
      }

      /* Hide form with graceful transition */
      form.style.transition = 'opacity 400ms ease-out';
      form.style.opacity = '0';
      setTimeout(function () {
        form.style.display = 'none';
      }, 420);
    }

    function validateForm(form) {
      var valid = true;
      var firstInvalid = null;

      $$('[required]', form).forEach(function (field) {
        var errorId = field.id + '-error';
        var existingError = document.getElementById(errorId);

        var isEmpty =
          field.type === 'checkbox'
            ? !field.checked
            : !field.value.trim();

        if (isEmpty) {
          valid = false;
          field.classList.add('field-error');
          field.setAttribute('aria-invalid', 'true');

          if (!existingError) {
            var err = document.createElement('span');
            err.id = errorId;
            err.className = 'field-error-msg';
            err.setAttribute('role', 'alert');
            err.textContent = 'This field is required.';
            field.insertAdjacentElement('afterend', err);
            field.setAttribute('aria-describedby', errorId);
          }

          if (!firstInvalid) firstInvalid = field;
        } else {
          field.classList.remove('field-error');
          field.removeAttribute('aria-invalid');
          if (existingError) existingError.remove();
          field.removeAttribute('aria-describedby');
        }
      });

      if (firstInvalid) {
        firstInvalid.focus();
      }

      return valid;
    }

    /* Live validation: clear error on input */
    $$('[required]', form).forEach(function (field) {
      var events = field.type === 'checkbox' ? ['change'] : ['input', 'change'];
      events.forEach(function (evtName) {
        field.addEventListener(evtName, function () {
          var errorId = field.id + '-error';
          var existingError = document.getElementById(errorId);
          field.classList.remove('field-error');
          field.removeAttribute('aria-invalid');
          if (existingError) existingError.remove();
        });
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!validateForm(form)) return;

      /* Simulate async submission */
      var submitBtn = $('[type="submit"]', form);
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }

      setTimeout(function () {
        showSuccess(form);
      }, 700);
    });
  }

  /* =========================================================
     6. HEADER SCROLL BEHAVIOR
  ========================================================= */

  function initHeaderScroll() {
    var header = $('header, .site-header');
    if (!header) return;

    var lastScrollY = 0;
    var ticking = false;

    function onScroll() {
      var scrollY = window.pageYOffset;

      header.classList.toggle('header-scrolled', scrollY > 40);

      /* Hide header on scroll down, show on scroll up */
      if (scrollY > lastScrollY && scrollY > 120) {
        header.classList.add('header-hidden');
      } else {
        header.classList.remove('header-hidden');
      }

      lastScrollY = scrollY;
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(onScroll);
        ticking = true;
      }
    }, { passive: true });
  }

  /* =========================================================
     INIT
  ========================================================= */

  function init() {
    initMenuTabs();
    initScrollAnimations();
    initMobileMenu();
    initSmoothScroll();
    initReservationForm();
    initHeaderScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());