/* =========================================================================
   GERRARD — main.js
   Mobile nav · theme toggle · scroll reveal · typing effect · skill bars ·
   back-to-top · portfolio filter + lightbox · contact form · footer year
   ========================================================================= */
(function () {
  "use strict";

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Theme toggle (dark / light luxury) ---------- */
  var root = document.documentElement;
  var THEME_KEY = "gerrard-theme";
  var stored = null;
  try { stored = localStorage.getItem(THEME_KEY); } catch (e) {}
  if (stored) root.setAttribute("data-theme", stored);

  document.querySelectorAll(".theme-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var current = root.getAttribute("data-theme") === "light" ? "light" : "dark";
      var next = current === "light" ? "dark" : "light";
      if (next === "dark") root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", "light");
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });
  });

  /* ---------- Mobile nav ---------- */
  var navToggle = document.getElementById("navToggle");
  var mobilePanel = document.getElementById("mobilePanel");
  if (navToggle && mobilePanel) {
    navToggle.addEventListener("click", function () {
      navToggle.classList.toggle("is-open");
      mobilePanel.classList.toggle("is-open");
    });
    mobilePanel.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        navToggle.classList.remove("is-open");
        mobilePanel.classList.remove("is-open");
      });
    });
  }

  /* ---------- Mark current nav link ---------- */
  var path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a, .mobile-panel a").forEach(function (a) {
    var href = a.getAttribute("href");
    if (href === path) a.classList.add("current");
  });

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Back to top ---------- */
  var toTop = document.querySelector(".to-top");
  if (toTop) {
    window.addEventListener("scroll", function () {
      toTop.classList.toggle("is-visible", window.scrollY > 480);
    });
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- Typing effect (hero role) ---------- */
  var typingEl = document.querySelector("[data-typing]");
  if (typingEl) {
    var words = [];
    try { words = JSON.parse(typingEl.getAttribute("data-typing")); } catch (e) {}
    if (words.length) {
      var wi = 0, ci = 0, deleting = false;
      var TYPE_SPEED = 55, DELETE_SPEED = 32, HOLD = 1600, GAP = 400;

      var tick = function () {
        var word = words[wi];
        if (!deleting) {
          ci++;
          typingEl.textContent = word.slice(0, ci);
          if (ci === word.length) {
            deleting = true;
            return setTimeout(tick, HOLD);
          }
          return setTimeout(tick, TYPE_SPEED);
        } else {
          ci--;
          typingEl.textContent = word.slice(0, ci);
          if (ci === 0) {
            deleting = false;
            wi = (wi + 1) % words.length;
            return setTimeout(tick, GAP);
          }
          return setTimeout(tick, DELETE_SPEED);
        }
      };
      typingEl.textContent = "";
      setTimeout(tick, 500);
    }
  }

  /* ---------- Skill bar fill animation ---------- */
  var skillFills = document.querySelectorAll(".skill-fill[data-fill]");
  if (skillFills.length) {
    if ("IntersectionObserver" in window) {
      var skillIo = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.style.width = entry.target.getAttribute("data-fill");
              skillIo.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      skillFills.forEach(function (el) { skillIo.observe(el); });
    } else {
      skillFills.forEach(function (el) { el.style.width = el.getAttribute("data-fill"); });
    }
  }

  /* ---------- Contact form (front-end only) ---------- */
  var contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = contactForm.querySelector(".form-status");
      var btn = contactForm.querySelector("button[type='submit']");
      var originalLabel = btn.textContent;
      btn.textContent = "Sending…";
      btn.disabled = true;
      setTimeout(function () {
        btn.textContent = originalLabel;
        btn.disabled = false;
        if (status) {
          status.textContent = "Thank you — your message has been received. I'll reply within 1–2 business days.";
          status.style.color = "var(--gold)";
        }
        contactForm.reset();
      }, 900);
    });
  }

  /* ---------- Portfolio: data, filter, grid, lightbox ---------- */
  var projectGrid = document.getElementById("projectGrid");
  if (projectGrid) {
    var projects = [
      { id: "01", title: "Nova Banking Redesign", cat: "Product", tags: ["Product Design", "Mobile"], img: "work/product.jpg", desc: "A full visual and interaction overhaul for a digital banking app, focused on clarity, trust, and a premium everyday feel.", medium: "Mobile · UI", year: "2026" },
      { id: "02", title: "Atlas Component Library", cat: "Systems", tags: ["Design Systems", "Web"], img: "work/logo1.1.jpg", desc: "A documented component library and token system built to keep a fast-moving product team consistent at scale.", medium: "Web · Design System", year: "2025" },
      { id: "03", title: "Solace Wellness Rebrand", cat: "Branding", tags: ["Branding", "Web"], img: "work/bag%20mokup.jpg", desc: "Full identity relaunch for a wellness studio — logo system, packaging, and a refreshed web presence.", medium: "Branding · Web", year: "2025" },
      { id: "04", title: "Meridian Packaging System", cat: "Packaging", tags: ["Packaging", "Print"], img: "work/bag%20mokup%20model.jpg", desc: "Modular packaging system for a specialty goods line, engineered for shelf presence and production efficiency.", medium: "Packaging · Print", year: "2024" },
      { id: "05", title: "Lumen Mark & Wordmark", cat: "Branding", tags: ["Logo", "Identity"], img: "work/logo%201.jpg", desc: "A precise, versatile mark built to scale from favicon to storefront signage without losing character.", medium: "Identity", year: "2024" },
      { id: "06", title: "Northbound Festival Poster", cat: "Print", tags: ["Print", "Editorial"], img: "work/poster%201.jpg", desc: "Limited-run poster series for an annual arts festival, screen-printed in two spot colors.", medium: "Print · Poster", year: "2023" }
    ];

    var categories = ["All"].concat(
      projects.reduce(function (acc, p) { return acc.indexOf(p.cat) === -1 ? acc.concat(p.cat) : acc; }, [])
    );

    var filterBar = document.getElementById("filterBar");
    var activeCat = "All";

    function renderFilters() {
      filterBar.innerHTML = "";
      categories.forEach(function (cat) {
        var b = document.createElement("button");
        b.textContent = cat;
        if (cat === activeCat) b.classList.add("is-active");
        b.addEventListener("click", function () {
          activeCat = cat;
          renderFilters();
          renderGrid();
        });
        filterBar.appendChild(b);
      });
    }

    function renderGrid() {
      projectGrid.innerHTML = "";
      var list = activeCat === "All" ? projects : projects.filter(function (p) { return p.cat === activeCat; });
      list.forEach(function (p, idx) {
        var a = document.createElement("a");
        a.href = "#";
        a.className = "project-card reveal is-visible";
        a.setAttribute("data-id", p.id);
        a.innerHTML =
          '<div class="project-thumb">' +
            '<img src="' + p.img + '" alt="' + p.title + '" loading="lazy" onerror="this.closest(\'.project-thumb\').classList.add(\'img-fallback\')">' +
            '<span class="project-thumb-tag">' + p.cat + '</span>' +
          '</div>' +
          '<div class="project-body">' +
            '<h3>' + p.title + '</h3>' +
            '<div class="project-tags">' + p.tags.map(function (t) { return '<span class="tag">' + t + '</span>'; }).join("") + '</div>' +
          '</div>';
        a.addEventListener("click", function (e) {
          e.preventDefault();
          openLightbox(list, idx);
        });
        projectGrid.appendChild(a);
      });
    }

    renderFilters();
    renderGrid();

    /* Lightbox */
    var lightbox = document.getElementById("lightbox");
    var lbImage = document.getElementById("lbImage");
    var lbTitle = document.getElementById("lbTitle");
    var lbDesc = document.getElementById("lbDesc");
    var lbJobNo = document.getElementById("lbJobNo");
    var lbMedium = document.getElementById("lbMedium");
    var lbYear = document.getElementById("lbYear");
    var lbPrev = document.getElementById("lbPrev");
    var lbNext = document.getElementById("lbNext");
    var lbClose = document.getElementById("lightboxClose");
    var currentList = [], currentIdx = 0;

    function openLightbox(list, idx) {
      currentList = list;
      currentIdx = idx;
      paint();
      lightbox.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }
    function paint() {
      var p = currentList[currentIdx];
      lbImage.src = p.img;
      lbImage.alt = p.title;
      lbTitle.textContent = p.title;
      lbDesc.textContent = p.desc;
      lbJobNo.textContent = "JOB — " + p.id;
      lbMedium.textContent = p.medium;
      lbYear.textContent = p.year;
    }
    function closeLightbox() {
      lightbox.classList.remove("is-open");
      document.body.style.overflow = "";
    }
    if (lbClose) lbClose.addEventListener("click", closeLightbox);
    if (lightbox) lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLightbox(); });
    if (lbPrev) lbPrev.addEventListener("click", function () { currentIdx = (currentIdx - 1 + currentList.length) % currentList.length; paint(); });
    if (lbNext) lbNext.addEventListener("click", function () { currentIdx = (currentIdx + 1) % currentList.length; paint(); });
    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft" && lbPrev) lbPrev.click();
      if (e.key === "ArrowRight" && lbNext) lbNext.click();
    });
  }
})();