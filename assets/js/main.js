/* =========================================================
   GERRARD — shared behaviour
   Loaded once with `defer`; runs after DOM parse, non-blocking.
   ========================================================= */
(function(){
  "use strict";

  /* ---- Theme (persisted, applied pre-paint by the tiny inline
     script in <head> to avoid a flash; this just wires the toggle) ---- */
  function initTheme(){
    var toggle = document.getElementById('themeToggle');
    if(!toggle) return;
    toggle.addEventListener('click', function(){
      var root = document.documentElement;
      var isDark = root.getAttribute('data-theme') === 'dark';
      var next = isDark ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try{ localStorage.setItem('gerrard-theme', next); }catch(e){}
    });
  }

  /* ---- Mobile nav ---- */
  function initMobileNav(){
    var navToggle = document.getElementById('navToggle');
    var mobilePanel = document.getElementById('mobilePanel');
    if(!navToggle || !mobilePanel) return;
    navToggle.addEventListener('click', function(){
      navToggle.classList.toggle('open');
      mobilePanel.classList.toggle('open');
    });
    mobilePanel.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        navToggle.classList.remove('open');
        mobilePanel.classList.remove('open');
      });
    });
  }

  /* ---- Sliding nav indicator ---- */
  function initNavIndicator(){
    var navLinks = document.getElementById('navLinks');
    var indicator = document.getElementById('navIndicator');
    if(!navLinks || !indicator) return;
    var links = navLinks.querySelectorAll('a');

    function moveTo(el){
      var navRect = navLinks.getBoundingClientRect();
      var rect = el.getBoundingClientRect();
      indicator.style.width = rect.width + 'px';
      indicator.style.transform = 'translateX(' + (rect.left - navRect.left) + 'px)';
    }
    links.forEach(function(link){
      link.addEventListener('mouseenter', function(){ moveTo(link); });
    });
    navLinks.addEventListener('mouseleave', function(){
      var active = navLinks.querySelector('a.active');
      if(active) moveTo(active);
    });
    var active = navLinks.querySelector('a.active');
    if(active){ moveTo(active); indicator.style.opacity = '1'; }
    window.addEventListener('resize', function(){
      var a = navLinks.querySelector('a.active');
      if(a) moveTo(a);
    });
  }

  /* ---- Footer year ---- */
  function initFooterYear(){
    document.querySelectorAll('[data-year]').forEach(function(el){
      el.textContent = new Date().getFullYear();
    });
  }

  /* ---- Scroll reveal (single shared observer, not one per element) ---- */
  function initReveal(){
    var items = document.querySelectorAll('.reveal');
    if(!items.length) return;
    if(!('IntersectionObserver' in window)){
      items.forEach(function(el){ el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function(el){ io.observe(el); });
  }

  /* ---- Back to top ---- */
  function initToTop(){
    var btn = document.querySelector('.to-top');
    if(!btn) return;
    var ticking = false;
    window.addEventListener('scroll', function(){
      if(ticking) return;
      ticking = true;
      requestAnimationFrame(function(){
        btn.classList.toggle('visible', window.scrollY > 480);
        ticking = false;
      });
    }, { passive: true });
    btn.addEventListener('click', function(){
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---- Skill bars fill on view ---- */
  function initSkillBars(){
    var fills = document.querySelectorAll('.skill-fill[data-fill]');
    if(!fills.length) return;
    if(!('IntersectionObserver' in window)){
      fills.forEach(function(f){ f.style.width = f.dataset.fill; });
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.style.width = entry.target.dataset.fill;
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    fills.forEach(function(f){ io.observe(f); });
  }

  /* ---- Hero typing effect ---- */
  function initTyping(){
    var el = document.querySelector('[data-typing]');
    if(!el) return;
    var words;
    try{ words = JSON.parse(el.getAttribute('data-typing')); }catch(e){ return; }
    if(!words || !words.length) return;
    var wordIdx = 0, charIdx = 0, deleting = false;

    function tick(){
      var word = words[wordIdx];
      if(!deleting){
        charIdx++;
        el.textContent = word.slice(0, charIdx);
        if(charIdx === word.length){
          deleting = true;
          setTimeout(tick, 1400);
          return;
        }
      } else {
        charIdx--;
        el.textContent = word.slice(0, charIdx);
        if(charIdx === 0){
          deleting = false;
          wordIdx = (wordIdx + 1) % words.length;
        }
      }
      setTimeout(tick, deleting ? 40 : 70);
    }
    tick();
  }

  /* ---- Contact form (client-side validation + status message) ---- */
  function initContactForm(){
    var form = document.getElementById('contact-form');
    if(!form) return;
    var status = form.querySelector('.form-status');
    form.addEventListener('submit', function(e){
      e.preventDefault();
      if(!form.checkValidity()){
        if(status){ status.textContent = 'Please fill in every field before sending.'; status.style.color = '#b3432b'; }
        return;
      }
      if(status){ status.textContent = "Thanks — that's sent. I'll reply within a day or two."; status.style.color = 'var(--accent-dark)'; }
      form.reset();
    });
  }

  /* ---- Newsletter / subscribe form ---- */
  function initSubscribeForm(){
    var form = document.querySelector('.subscribe-form');
    if(!form) return;
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var input = form.querySelector('input[type="email"]');
      var btn = form.querySelector('button');
      if(input && input.checkValidity() && btn){
        btn.textContent = 'Subscribed ✓';
        form.reset();
      }
    });
  }

  /* ---- Portfolio filter + lightbox ---- */
  var PROJECTS = [
    { id:1, no:'01', title:'Nova Banking Redesign', desc:'A calmer, more legible visual system for a finance app used daily by tens of thousands of people.', category:'Branding', tags:['Branding','Digital'], medium:'Identity + UI', year:'2026', img:'work/product.jpg' },
    { id:2, no:'02', title:'Atlas Component Library', desc:'A documented design system built to keep a fast-moving product team visually consistent.', category:'Digital', tags:['Design Systems','Web'], medium:'Design System', year:'2025', img:'work/logo1.1.jpg' },
    { id:3, no:'03', title:'Solace Wellness Rebrand', desc:'Full identity refresh for a wellness brand, from packaging through to the website.', category:'Branding', tags:['Branding','Web'], medium:'Identity + Web', year:'2025', img:'work/bag%20mokup.jpg' },
    { id:4, no:'04', title:'Field Notes Poster Series', desc:'A limited-run poster series exploring type-driven editorial layout.', category:'Print', tags:['Print','Editorial'], medium:'Offset print', year:'2025', img:'work/poster%201.jpg' },
    { id:5, no:'05', title:'Marque Logo System', desc:'A flexible mark built to scale from favicon to storefront signage.', category:'Branding', tags:['Branding'], medium:'Identity', year:'2024', img:'work/logo%201.jpg' },
    { id:6, no:'06', title:'Harbor Packaging Line', desc:'Shelf-ready packaging system for a consumer goods relaunch.', category:'Print', tags:['Print','Packaging'], medium:'Packaging', year:'2024', img:'work/a.jpg' }
  ];

  function initPortfolio(){
    var grid = document.getElementById('projectGrid');
    var filterBar = document.getElementById('filterBar');
    if(!grid || !filterBar) return;

    var categories = ['All'].concat(Array.from(new Set(PROJECTS.map(function(p){ return p.category; }))));
    filterBar.innerHTML = categories.map(function(c, i){
      return '<button class="filter-btn' + (i === 0 ? ' active' : '') + '" data-filter="' + c + '">' + c + '</button>';
    }).join('');

    function renderGrid(list){
      grid.innerHTML = list.map(function(p){
        return '<a href="#" class="card project-card reveal in" data-id="' + p.id + '">' +
          '<div class="project-thumb"><img src="' + p.img + '" alt="' + p.title + '" loading="lazy" decoding="async" width="600" height="450"><span class="project-thumb-tag">' + p.category + '</span></div>' +
          '<div class="project-body"><span class="pf-no mono">JOB—' + p.no + '</span><h3 style="margin-top:8px;">' + p.title + '</h3>' +
          '<div class="project-tags">' + p.tags.map(function(t){ return '<span class="tag">' + t + '</span>'; }).join('') + '</div></div></a>';
      }).join('');
      grid.querySelectorAll('.project-card').forEach(function(card){
        card.addEventListener('click', function(e){
          e.preventDefault();
          openLightbox(Number(card.dataset.id));
        });
      });
    }
    renderGrid(PROJECTS);

    filterBar.addEventListener('click', function(e){
      var btn = e.target.closest('.filter-btn');
      if(!btn) return;
      filterBar.querySelectorAll('.filter-btn').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      var f = btn.dataset.filter;
      renderGrid(f === 'All' ? PROJECTS : PROJECTS.filter(function(p){ return p.category === f; }));
    });

    /* Lightbox */
    var lightbox = document.getElementById('lightbox');
    if(!lightbox) return;
    var current = 0;
    var els = {
      img: document.getElementById('lbImage'),
      jobNo: document.getElementById('lbJobNo'),
      title: document.getElementById('lbTitle'),
      desc: document.getElementById('lbDesc'),
      medium: document.getElementById('lbMedium'),
      year: document.getElementById('lbYear')
    };
    function openLightbox(id){
      current = PROJECTS.findIndex(function(p){ return p.id === id; });
      renderLightbox();
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function renderLightbox(){
      var p = PROJECTS[current];
      els.img.src = p.img; els.img.alt = p.title;
      els.jobNo.textContent = 'JOB—' + p.no;
      els.title.textContent = p.title;
      els.desc.textContent = p.desc;
      els.medium.textContent = p.medium;
      els.year.textContent = p.year;
    }
    function closeLightbox(){
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    }
    document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function(e){ if(e.target === lightbox) closeLightbox(); });
    document.getElementById('lbPrev').addEventListener('click', function(){
      current = (current - 1 + PROJECTS.length) % PROJECTS.length; renderLightbox();
    });
    document.getElementById('lbNext').addEventListener('click', function(){
      current = (current + 1) % PROJECTS.length; renderLightbox();
    });
    document.addEventListener('keydown', function(e){
      if(!lightbox.classList.contains('open')) return;
      if(e.key === 'Escape') closeLightbox();
      if(e.key === 'ArrowLeft') document.getElementById('lbPrev').click();
      if(e.key === 'ArrowRight') document.getElementById('lbNext').click();
    });
  }

  function init(){
    initTheme();
    initMobileNav();
    initNavIndicator();
    initFooterYear();
    initReveal();
    initToTop();
    initSkillBars();
    initTyping();
    initContactForm();
    initSubscribeForm();
    initPortfolio();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();