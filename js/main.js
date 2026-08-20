/* =========================================================================
   Waseem Sajjadh — Portfolio behaviour
   Vanilla JS, no dependencies. Depends on PROJECTS / CATEGORIES from projects.js
   ========================================================================= */
(function () {
  "use strict";

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var icon = function (name) {
    return '<svg aria-hidden="true"><use href="#icon-' + name + '"/></svg>';
  };

  /* ---------- Theme ---------- */
  var root = document.documentElement;
  var themeToggle = $("#themeToggle");

  themeToggle.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  // Follow the OS only while the visitor hasn't picked a theme themselves.
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  var onSchemeChange = function (e) {
    var stored = null;
    try { stored = localStorage.getItem("theme"); } catch (err) {}
    if (!stored) root.setAttribute("data-theme", e.matches ? "dark" : "light");
  };
  if (mq.addEventListener) mq.addEventListener("change", onSchemeChange);
  else if (mq.addListener) mq.addListener(onSchemeChange);

  /* ---------- Mobile navigation ---------- */
  var menuToggle = $("#menuToggle");
  var mobileNav = $("#mobileNav");

  function closeMenu() {
    menuToggle.setAttribute("aria-expanded", "false");
    mobileNav.classList.remove("is-open");
    document.body.classList.remove("is-locked");
  }

  menuToggle.addEventListener("click", function () {
    var open = menuToggle.getAttribute("aria-expanded") === "true";
    if (open) return closeMenu();
    menuToggle.setAttribute("aria-expanded", "true");
    mobileNav.classList.add("is-open");
    document.body.classList.add("is-locked");
  });

  mobileNav.addEventListener("click", function (e) {
    if (e.target.closest("a")) closeMenu();
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth >= 1024 && mobileNav.classList.contains("is-open")) closeMenu();
  });

  /* ---------- Header state + back to top ---------- */
  var header = $("#header");
  var toTop = $("#toTop");

  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 8);
    toTop.classList.toggle("is-visible", y > 600);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---------- Scroll spy ---------- */
  var navLinks = $$(".nav__link");
  var sections = navLinks
    .map(function (link) { return document.querySelector(link.getAttribute("href")); })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.classList.toggle("is-active", link.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Reveal on scroll ---------- */
  function observeReveals(nodes) {
    if (!("IntersectionObserver" in window)) {
      nodes.forEach(function (n) { n.classList.add("is-visible"); });
      return;
    }
    nodes.forEach(function (node, i) {
      node.style.transitionDelay = Math.min(i, 5) * 60 + "ms";
      revealObserver.observe(node);
    });
  }

  var revealObserver = "IntersectionObserver" in window
    ? new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 })
    : null;

  observeReveals($$(".reveal"));

  /* ---------- Projects: filters + grid ---------- */
  var filtersEl = $("#filters");
  var gridEl = $("#projects");
  var activeFilter = "all";

  function countFor(id) {
    return id === "all"
      ? PROJECTS.length
      : PROJECTS.filter(function (p) { return p.category === id; }).length;
  }

  function renderFilters() {
    filtersEl.innerHTML = CATEGORIES.map(function (cat) {
      var active = cat.id === activeFilter;
      return (
        '<button class="filter' + (active ? " is-active" : "") + '" type="button"' +
        ' aria-pressed="' + active + '" data-filter="' + cat.id + '">' +
        cat.label + '<span class="filter__count">' + countFor(cat.id) + "</span></button>"
      );
    }).join("");
  }

  function cardMarkup(project) {
    var cover = project.shots[project.cover || 0];
    var stack = project.stack.slice(0, 4).map(function (t) {
      return '<span class="badge">' + t + "</span>";
    }).join("");
    var extra = project.stack.length > 4
      ? '<span class="badge badge--plain">+' + (project.stack.length - 4) + "</span>"
      : "";

    // The card is an <article>; the CTA button is stretched over it via ::after so the
    // whole card is clickable without nesting flow content inside a <button>.
    return (
      '<article class="card project reveal">' +
        '<div class="project__media' + (project.portrait ? " project__media--portrait" : "") + '">' +
          '<img src="' + cover.src + '" alt="' + project.name + " — " + cover.caption + '" loading="lazy" decoding="async">' +
          '<span class="project__shots">' + icon("images") + project.shots.length + "</span>" +
        "</div>" +
        '<div class="project__body">' +
          '<div class="project__top">' +
            '<h3 class="project__name">' + project.name + "</h3>" +
            '<span class="project__year">' + project.year + "</span>" +
          "</div>" +
          '<p class="project__tagline">' + project.tagline + "</p>" +
          '<p class="project__desc">' + project.summary + "</p>" +
          '<div class="project__stack">' + stack + extra + "</div>" +
          '<button class="project__cta" type="button" data-project="' + project.id + '"' +
          ' aria-label="View case study: ' + project.name + '">' +
            "View case study " + icon("arrow-right") +
          "</button>" +
        "</div>" +
      "</article>"
    );
  }

  function renderGrid() {
    var list = activeFilter === "all"
      ? PROJECTS
      : PROJECTS.filter(function (p) { return p.category === activeFilter; });

    gridEl.innerHTML = list.map(cardMarkup).join("");
    observeReveals($$(".reveal", gridEl));
  }

  filtersEl.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-filter]");
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    renderFilters();
    renderGrid();
  });

  gridEl.addEventListener("click", function (e) {
    var card = e.target.closest("[data-project]");
    if (card) openModal(card.dataset.project);
  });

  renderFilters();
  renderGrid();

  /* ---------- Project modal + gallery ---------- */
  var modal = $("#projectModal");
  var modalPanel = $(".modal__panel", modal);
  var galleryImage = $("#galleryImage");
  var galleryCaption = $("#galleryCaption");
  var galleryCounter = $("#galleryCounter");
  var galleryThumbs = $("#galleryThumbs");
  var current = null;
  var shotIndex = 0;
  var lastFocused = null;

  function showShot(i) {
    if (!current) return;
    var total = current.shots.length;
    shotIndex = (i + total) % total;
    var shot = current.shots[shotIndex];

    galleryImage.src = shot.src;
    galleryImage.alt = current.name + " — " + shot.caption;
    galleryCaption.textContent = shot.caption;
    galleryCounter.textContent = shotIndex + 1 + " / " + total;

    $$(".gallery__thumb", galleryThumbs).forEach(function (t, idx) {
      var active = idx === shotIndex;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-current", active ? "true" : "false");
      if (active) t.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  }

  function detailMarkup(project) {
    var highlights = project.highlights.map(function (h) { return "<li>" + h + "</li>"; }).join("");
    var stack = project.stack.map(function (t) { return '<span class="badge">' + t + "</span>"; }).join("");
    var note = project.note
      ? '<div class="detail__block detail__block--full"><p class="projects-note" style="margin:0">' +
        icon("info") + "<span>" + project.note + "</span></p></div>"
      : "";

    return (
      '<div class="detail__block">' +
        "<h4>Overview</h4><p>" + project.summary + "</p>" +
      "</div>" +
      '<div class="detail__block">' +
        "<h4>At a glance</h4>" +
        '<div class="detail__meta">' +
          '<div><div class="fact__label">Role</div><div class="fact__value">' + project.role + "</div></div>" +
          '<div><div class="fact__label">Client</div><div class="fact__value">' + project.client + "</div></div>" +
          '<div><div class="fact__label">Timeline</div><div class="fact__value">' + project.year + "</div></div>" +
          '<div><div class="fact__label">Type</div><div class="fact__value">' + project.categoryLabel + "</div></div>" +
        "</div>" +
      "</div>" +
      '<div class="detail__block detail__block--full">' +
        "<h4>What I built</h4>" +
        '<ul class="detail__list">' + highlights + "</ul>" +
      "</div>" +
      '<div class="detail__block detail__block--full">' +
        "<h4>Stack</h4>" +
        '<div class="detail__badges">' + stack + "</div>" +
      "</div>" +
      note
    );
  }

  function openModal(id) {
    current = PROJECTS.filter(function (p) { return p.id === id; })[0];
    if (!current) return;

    lastFocused = document.activeElement;

    $("#modalTitle").textContent = current.name;
    $("#modalSubtitle").textContent = current.tagline + " · " + current.year;
    $("#modalDetail").innerHTML = detailMarkup(current);

    galleryThumbs.innerHTML = current.shots.map(function (shot, i) {
      return (
        '<button class="gallery__thumb" type="button" data-index="' + i + '"' +
        ' aria-label="Screenshot ' + (i + 1) + ": " + shot.caption + '">' +
        '<img src="' + shot.src + '" alt="" loading="lazy" decoding="async"></button>'
      );
    }).join("");

    var multi = current.shots.length > 1;
    $("#galleryPrev").hidden = !multi;
    $("#galleryNext").hidden = !multi;
    galleryCounter.hidden = !multi;

    showShot(0);

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    $(".modal__close", modal).focus();
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    current = null;
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  modal.addEventListener("click", function (e) {
    if (e.target.closest("[data-close]")) closeModal();
    var thumb = e.target.closest("[data-index]");
    if (thumb) showShot(parseInt(thumb.dataset.index, 10));
  });

  $("#galleryPrev").addEventListener("click", function () { showShot(shotIndex - 1); });
  $("#galleryNext").addEventListener("click", function () { showShot(shotIndex + 1); });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (modal.classList.contains("is-open")) return closeModal();
      if (mobileNav.classList.contains("is-open")) return closeMenu();
    }
    if (!modal.classList.contains("is-open") || !current) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); showShot(shotIndex - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); showShot(shotIndex + 1); }
    if (e.key === "Tab") trapFocus(e);
  });

  function trapFocus(e) {
    var focusable = $$(
      'button:not([hidden]), [href], input, textarea, [tabindex]:not([tabindex="-1"])',
      modalPanel
    ).filter(function (el) { return el.offsetParent !== null; });
    if (!focusable.length) return;

    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // Swipe between screenshots on touch devices.
  var touchX = null;
  var stage = $(".gallery__stage");
  stage.addEventListener("touchstart", function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 45) showShot(shotIndex + (dx < 0 ? 1 : -1));
    touchX = null;
  }, { passive: true });

  /* ---------- Contact form → mailto ---------- */
  var form = $("#contactForm");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;

    var data = new FormData(form);
    var name = (data.get("name") || "").trim();
    var email = (data.get("email") || "").trim();
    var subject = (data.get("subject") || "").trim() || "Portfolio enquiry";
    var message = (data.get("message") || "").trim();

    var body = message + "\n\n—\n" + name + (email ? "\n" + email : "");
    window.location.href =
      "mailto:wsajjadh@gmail.com?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);
  });

  /* ---------- Footer year ---------- */
  $("#year").textContent = new Date().getFullYear();
})();
