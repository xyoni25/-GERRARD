/* =========================================================
   THEME
   ========================================================= */
(function initTheme(){
  const saved = localStorage.getItem('theme');
  if(saved) document.documentElement.setAttribute('data-theme', saved);
})();

function setupThemeToggle(){
  const btn = document.querySelector('.theme-toggle');
  if(!btn) return;
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
}

/* =========================================================
   LANGUAGE SWITCHER — ENGLISH / AMHARIC
   ========================================================= */
let currentLang = localStorage.getItem('lang') || 'en';

function setLang(lang){
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.setAttribute('lang', lang === 'am' ? 'am' : 'en');
  applyTranslations();
  updateLangToggleUI();
}

function applyTranslations(){
  const dict = TRANSLATIONS[currentLang];
  if(!dict) return;

  // Translate text-bearing elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const text = dict[key];
    if(text === undefined) return;

    if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'){
      if(el.getAttribute('placeholder') !== null){
        el.setAttribute('placeholder', text);
      } else {
        el.value = text;
      }
    } else if(el.tagName === 'IMG'){
      el.setAttribute('alt', text);
    } else {
      el.textContent = text;
    }
  });
}

function updateLangToggleUI(){
  const btn = document.querySelector('.lang-toggle');
  if(!btn) return;
  btn.textContent = currentLang === 'am' ? 'ENG' : 'AM';
}

function setupLangToggle(){
  const btn = document.querySelector('.lang-toggle');
  if(!btn) return;
  btn.addEventListener('click', () => {
    const next = currentLang === 'en' ? 'am' : 'en';
    setLang(next);
  });
  // Init UI
  updateLangToggleUI();
}

/* =========================================================
   MOBILE NAV
   ========================================================= */
function setupMobileNav(){
  const toggle = document.getElementById('navToggle');
  const panel = document.getElementById('mobilePanel');
  if(!toggle || !panel) return;
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    panel.classList.toggle('open');
  });
  panel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    toggle.classList.remove('open');
    panel.classList.remove('open');
  }));
}

/* =========================================================
   ACTIVE NAV
   ========================================================= */
function setupActiveNav(){
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-panel a').forEach(a => {
    if(a.getAttribute('href') === path){
      a.classList.add('current');
    }
  });
}

/* =========================================================
   SCROLL REVEAL
   ========================================================= */
function setupReveal(){
  const el = document.querySelectorAll('.reveal');
  if(!el.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting){
        e.target.classList.add('in');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  el.forEach((item, i) => {
    item.style.transitionDelay = (i % 4) * 0.08 + 's';
    obs.observe(item);
  });
}

/* =========================================================
   SKILL BARS
   ========================================================= */
function setupSkillBars(){
  const bars = document.querySelectorAll('.skill-fill');
  if(!bars.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting){
        const el = e.target;
        el.style.width = el.getAttribute('data-fill') || '0%';
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.3 });
  bars.forEach((b, i) => {
    b.style.transitionDelay = i * 0.1 + 's';
    obs.observe(b);
  });
}

/* =========================================================
   TYPING ROLE
   ========================================================= */
function setupTypingRole(){
  const el = document.querySelector('[data-typing]');
  if(!el) return;
  const roles = JSON.parse(el.getAttribute('data-typing'));
  let ri = 0, ci = 0, del = false;
  function tick(){
    const cur = roles[ri];
    if(!del){
      ci++;
      el.textContent = cur.slice(0, ci);
      if(ci === cur.length){ del = true; setTimeout(tick, 1400); return; }
    } else {
      ci--;
      el.textContent = cur.slice(0, ci);
      if(ci === 0){ del = false; ri = (ri + 1) % roles.length; }
    }
    setTimeout(tick, del ? 45 : 85);
  }
  tick();
}

/* =========================================================
   BACK TO TOP
   ========================================================= */
function setupToTop(){
  const btn = document.querySelector('.to-top');
  if(!btn) return;
  window.addEventListener('scroll', () => btn.classList.toggle('show', window.scrollY > 500));
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* =========================================================
   PORTFOLIO FILTER + LIGHTBOX
   ========================================================= */
function setupPortfolio(){
  const filterBar = document.getElementById('filterBar');
  const grid = document.getElementById('projectGrid');
  if(!filterBar || !grid) return;

  const PROJECTS = [
    { no:'01', img:'work/product.jpg', title:'Nova Brand Identity', desc:'A polished identity system for a finance brand that balances clarity with premium style.', medium:'Identity System', year:'2024', category:'brand' },
    { no:'02', img:'work/logo1.1.jpg', title:'Logo & Identity System', desc:'A distinctive brand system built around custom marks, color and typography.', medium:'Logo Design', year:'2023', category:'brand' },
    { no:'03', img:'work/bag%20mokup.jpg', title:'Wellness Packaging', desc:'A tactile packaging concept for wellness products with a premium visual language.', medium:'Brand Design', year:'2024', category:'packaging' },
    { no:'04', img:'work/a.jpg', title:'Editorial Spread', desc:'A bold publication layout designed for readability and vibrant storytelling.', medium:'Editorial', year:'2022', category:'print' },
    { no:'05', img:'work/poster%201.jpg', title:'Poster Campaign', desc:'A visually striking print campaign designed for impact and readability.', medium:'Campaign', year:'2023', category:'print' },
    { no:'06', img:'work/poster%202.jpg', title:'Event Poster', desc:'A bold event poster that combines expressive typography with strong imagery.', medium:'Poster', year:'2023', category:'print' },
    { no:'07', img:'work/poster%203.jpg', title:'Promotional Poster', desc:'A campaign-ready poster layout created to capture attention in physical spaces.', medium:'Promotional', year:'2022', category:'print' },
    { no:'08', img:'work/poster%204.jpg', title:'Poster Series', desc:'Visual messaging designed for impact across event and campaign print materials.', medium:'Series', year:'2021', category:'print' },
    { no:'09', img:'work/poster%205.jpg', title:'Flyer & Poster Set', desc:'A coordinated print set created for event promotion and digital sharing.', medium:'Collateral', year:'2021', category:'print' },
    { no:'10', img:'work/bag%20mokup%20model.jpg', title:'Premium Packaging', desc:'A realistic product mockup conveying premium shelf presence and finish.', medium:'Mockup', year:'2024', category:'packaging' },
    { no:'11', img:'work/logo%201.jpg', title:'Signature Mark', desc:'A signature-style logo concept with refined linework and color balance.', medium:'Logo', year:'2020', category:'brand' },
    { no:'12', img:'work/logo%20type%20color.jpg', title:'Color Logo Variant', desc:'A bold logo variant built for vibrant brand applications and color-driven design.', medium:'Logo', year:'2020', category:'brand' },
    { no:'13', img:'work/logo.png', title:'Logo Family', desc:'A suite of logo variations designed for flexible brand use across touchpoints.', medium:'Logo Family', year:'2021', category:'brand' },
    { no:'14', img:'work/c.jpg', title:'Creative Asset', desc:'A creative brand asset designed to support campaign visuals and identity rollouts.', medium:'Asset', year:'2022', category:'brand' },
  ];

  const CATS = [
    { key:'all', label:'All Work' },
    { key:'brand', label:'Branding' },
    { key:'print', label:'Print' },
    { key:'packaging', label:'Packaging' },
  ];

  function count(key){ return key==='all' ? PROJECTS.length : PROJECTS.filter(p=>p.category===key).length; }

  filterBar.innerHTML = CATS.map((c,i) =>
    `<button class="filter-btn${i===0?' active':''}" data-filter="${c.key}">${c.label} <span class="count">${count(c.key)}</span></button>`
  ).join('');

  grid.innerHTML = PROJECTS.map((p,i) => `
    <div class="pf-card" data-category="${p.category}" data-index="${i}">
      <div class="pf-thumb">
        <img src="${p.img}" alt="${p.title}" loading="lazy">
        <span class="pf-tag ${p.category}">${p.category}</span>
        <span class="pf-view"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></span>
      </div>
      <div class="pf-body">
        <span class="pf-no mono">No. ${p.no}</span>
        <h3>${p.title}</h3>
        <p class="desc">${p.desc}</p>
        <div class="pf-spec"><span>${p.medium}</span><span>${p.year}</span></div>
      </div>
    </div>
  `).join('');

  const cards = grid.querySelectorAll('.pf-card');

  /* filter */
  filterBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if(!btn) return;
    filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    cards.forEach(c => c.classList.toggle('is-hidden', f !== 'all' && c.dataset.category !== f));
  });

  /* reveal on scroll */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  cards.forEach((c,i) => { c.style.transitionDelay = (i % 3) * 0.06 + 's'; io.observe(c); });

  /* lightbox */
  const lightbox = document.getElementById('lightbox');
  if(!lightbox) return;
  let currentIndex = 0;

  function openLightbox(index){
    currentIndex = index;
    const p = PROJECTS[index];
    document.getElementById('lbImage').src = p.img;
    document.getElementById('lbImage').alt = p.title;
    document.getElementById('lbJobNo').textContent = 'No. ' + p.no;
    document.getElementById('lbTitle').textContent = p.title;
    document.getElementById('lbDesc').textContent = p.desc;
    document.getElementById('lbMedium').textContent = p.medium;
    document.getElementById('lbYear').textContent = p.year;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox(){
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }
  cards.forEach(c => {
    c.addEventListener('click', () => openLightbox(parseInt(c.dataset.index, 10)));
  });
  document.getElementById('lightboxClose')?.addEventListener('click', closeLightbox);
  document.getElementById('lbPrev')?.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + PROJECTS.length) % PROJECTS.length;
    openLightbox(currentIndex);
  });
  document.getElementById('lbNext')?.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % PROJECTS.length;
    openLightbox(currentIndex);
  });
  lightbox.addEventListener('click', (e) => { if(e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if(!lightbox.classList.contains('open')) return;
    if(e.key === 'Escape') closeLightbox();
    if(e.key === 'ArrowRight') { currentIndex = (currentIndex + 1) % PROJECTS.length; openLightbox(currentIndex); }
    if(e.key === 'ArrowLeft') { currentIndex = (currentIndex - 1 + PROJECTS.length) % PROJECTS.length; openLightbox(currentIndex); }
  });
}

/* =========================================================
   CONTACT FORM
   ========================================================= */
function setupContactForm(){
  const form = document.getElementById('contact-form');
  if(!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const status = form.querySelector('.form-status');
    if(status){
      status.textContent = 'Message sent — thanks for reaching out, I\'ll reply within a day or two.';
      status.style.color = 'var(--accent)';
      status.style.fontSize = '14px';
    }
    form.reset();
  });
}

/* =========================================================
   FOOTER YEAR
   ========================================================= */
function setupYear(){
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
}

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  setupThemeToggle();
  setupLangToggle();
  setupMobileNav();
  setupActiveNav();
  setupReveal();
  setupSkillBars();
  setupTypingRole();
  setupToTop();
  setupPortfolio();
  setupContactForm();
  setupYear();
  // Apply saved lang
  setLang(currentLang);
});
