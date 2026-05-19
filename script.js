(() => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Profile image is set to uploads/Picture1.svg (fallback to PNG if added);
  // do not allow client-side replacement or persistence.

  // Resume upload: try server POST; fallback to localStorage data URL.
  const resumeInput = document.getElementById('resumeInput');
  const resumeDownload = document.getElementById('resumeDownload');
  const resumeNameEl = document.getElementById('resumeName');
  const resumeMeta = document.getElementById('resumeMeta');
  const removeResumeBtn = document.getElementById('removeResume');
  const RESUME_KEY = 'neilprofile_resume_v1';
  const RESUME_MAX = 5 * 1024 * 1024; // 5MB

  function showResume(meta) {
    if (!resumeDownload || !resumeNameEl || !resumeMeta || !removeResumeBtn) return;
    resumeDownload.style.display = 'inline-flex';
    removeResumeBtn.style.display = 'inline-flex';
    resumeMeta.style.display = 'block';
    resumeNameEl.textContent = meta.name || 'Resume';
    resumeDownload.href = meta.dataUrl;
    resumeDownload.download = meta.name || 'resume.pdf';
  }

  function clearResumeUI() {
    if (!resumeDownload || !resumeNameEl || !resumeMeta || !removeResumeBtn) return;
    resumeDownload.style.display = 'none';
    removeResumeBtn.style.display = 'none';
    resumeMeta.style.display = 'none';
    resumeNameEl.textContent = '';
    resumeDownload.href = '#';
    resumeDownload.removeAttribute('download');
  }

  // Try to initialize from localStorage (fallback)
  try {
    const saved = localStorage.getItem(RESUME_KEY);
    if (saved) {
      const meta = JSON.parse(saved);
      if (meta && meta.dataUrl) showResume(meta);
    }
  } catch (e) {
    // ignore
  }

  if (resumeInput instanceof HTMLInputElement) {
    resumeInput.addEventListener('change', async () => {
      const file = resumeInput.files?.[0];
      if (!file) return;
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        window.alert('Please upload a PDF file.');
        resumeInput.value = '';
        return;
      }
      if (file.size > RESUME_MAX) {
        window.alert('Resume is too large. Please use a file under 5MB.');
        resumeInput.value = '';
        return;
      }

      // Try server upload first
      try {
        const form = new FormData();
        form.append('resume', file);
        const resp = await fetch('/upload', { method: 'POST', body: form });
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.url) {
            const meta = { name: file.name, dataUrl: data.url };
            // Save a reference locally (not the file contents)
            try {
              localStorage.setItem(RESUME_KEY, JSON.stringify(meta));
            } catch {}
            showResume(meta);
            return;
          }
        }
      } catch (err) {
        // server not available — fallback to localStorage
      }

      // Fallback: store data URL in localStorage so it remains downloadable
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== 'string') return;
        const meta = { name: file.name, dataUrl: result };
        try {
          localStorage.setItem(RESUME_KEY, JSON.stringify(meta));
        } catch (e) {}
        showResume(meta);
      };
      reader.readAsDataURL(file);
    });
  }

  if (removeResumeBtn instanceof HTMLButtonElement) {
    removeResumeBtn.addEventListener('click', async () => {
      // Try server-side delete if desired in future. For now, just clear local reference.
      try {
        localStorage.removeItem(RESUME_KEY);
      } catch (e) {}
      clearResumeUI();
    });
  }

  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  function setMenuOpen(isOpen) {
    if (!navToggle || !navMenu) return;

    navToggle.setAttribute('aria-expanded', String(isOpen));
    navMenu.classList.toggle('is-open', isOpen);

    const sr = navToggle.querySelector('.sr-only');
    if (sr) sr.textContent = isOpen ? 'Close menu' : 'Open menu';
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      setMenuOpen(!isOpen);
    });

    document.addEventListener('click', (e) => {
      if (!navMenu.classList.contains('is-open')) return;
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (navMenu.contains(target) || navToggle.contains(target)) return;
      setMenuOpen(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    });

    navLinks.forEach((a) => {
      a.addEventListener('click', () => setMenuOpen(false));
    });
  }

  // Highlight active section in the nav.
  const sectionIds = ['about', 'projects', 'resume', 'contact'];
  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const linkById = new Map();
  navLinks.forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (href.startsWith('#')) linkById.set(href.slice(1), a);
  });

  function clearCurrent() {
    navLinks.forEach((a) => a.removeAttribute('aria-current'));
  }

  if (sections.length) {
    const io = new IntersectionObserver(
      (entries) => {
        // Find the most visible intersecting section.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0));

        if (!visible.length) return;

        const id = visible[0].target.id;
        const link = linkById.get(id);
        if (!link) return;

        clearCurrent();
        link.setAttribute('aria-current', 'page');
      },
      {
        root: null,
        rootMargin: '-20% 0px -70% 0px',
        threshold: [0.05, 0.1, 0.2, 0.35, 0.5],
      },
    );

    sections.forEach((s) => io.observe(s));

    // Set a default state.
    clearCurrent();
    const first = linkById.get('about');
    if (first) first.setAttribute('aria-current', 'page');
  }

  // Reveal-on-scroll for visual polish: mark sections/cards/projects for animation
  const revealTargets = Array.from(document.querySelectorAll('.section, .project, .card'));
  revealTargets.forEach((el) => el.classList.add('reveal'));

  if (revealTargets.length) {
    const revealIo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealIo.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealTargets.forEach((t) => revealIo.observe(t));
  }

  // Decorative particles in hero (non-critical)
  (function createParticles(){
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const count = 26;
    for (let i=0;i<count;i++){
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = (Math.random()*100)+'%';
      p.style.top = (Math.random()*70)+'%';
      p.style.opacity = (0.06 + Math.random()*0.18).toString();
      p.style.transform = `scale(${0.6+Math.random()*1.4})`;
      hero.appendChild(p);
    }
  })();

  // Certificates renderer + lightbox viewer
  (function certificates(){
    try {
      const cfgEl = document.getElementById('certificates-config');
      const grid = document.getElementById('certificatesGrid');
      if (!cfgEl || !grid) return;
      let items = [];
      try { items = JSON.parse(cfgEl.textContent || '[]'); } catch(e){ items = []; }

      // create lightbox
      const lightbox = document.createElement('div');
      lightbox.className = 'lightbox';
      lightbox.innerHTML = `<div class="lightbox-content"><button class="btn lightbox-close">Close</button><div class="lightbox-body"></div></div>`;
      document.body.appendChild(lightbox);
      const lbBody = lightbox.querySelector('.lightbox-body');
      const lbClose = lightbox.querySelector('.lightbox-close');
      lbClose.addEventListener('click', ()=> lightbox.classList.remove('open'));
      lightbox.addEventListener('click', (e)=>{ if (e.target===lightbox) lightbox.classList.remove('open'); });

      function openLightboxFor(file){
        lbBody.innerHTML = '';
        if (!file) return;
        const lower = file.toLowerCase();
        if (lower.endsWith('.pdf')) {
          const iframe = document.createElement('iframe');
          iframe.src = file;
          lbBody.appendChild(iframe);
        } else {
          const img = document.createElement('img');
          img.src = file;
          lbBody.appendChild(img);
        }
        lightbox.classList.add('open');
      }

      // Expose helper globally so other parts of the page can open the same lightbox
      try { window.openLightboxFor = openLightboxFor; } catch (e) {}

      function downloadFile(file){
        try {
          const a = document.createElement('a');
          a.href = file;
          a.download = '';
          // For Safari and some browsers, set target to _blank to ensure download
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          a.remove();
        } catch (e) {
          // fallback: navigate to file (may open in-browser)
          window.location.href = file;
        }
      }

      try { window.downloadFile = downloadFile; } catch (e) {}

      grid.innerHTML = '';
      if (!items || !items.length) {
        // Render placeholder cards to occupy the certificates area until real files are added
        grid.innerHTML = '';
        for (let i=0;i<6;i++){
          const ph = document.createElement('div'); ph.className = 'cert-placeholder animate';
          const thumb = document.createElement('div'); thumb.className = 'ph-thumb';
          const title = document.createElement('div'); title.className = 'ph-line';
          const sub = document.createElement('div'); sub.className = 'ph-line short';
          ph.appendChild(thumb); ph.appendChild(title); ph.appendChild(sub);
          grid.appendChild(ph);
        }
        return;
      }

      items.forEach((it)=>{
        const card = document.createElement('div'); card.className='cert-card';
        const thumb = document.createElement('a'); thumb.className='cert-thumb'; thumb.href='#';
        const img = document.createElement('img'); img.alt = it.title || 'certificate'; img.src = it.file || '';
        thumb.appendChild(img);
        thumb.addEventListener('click',(e)=>{ e.preventDefault(); if (it.download) downloadFile(it.file); else openLightboxFor(it.file); });
        card.appendChild(thumb);
        const meta = document.createElement('div'); meta.className='cert-meta';
        const left = document.createElement('div'); left.innerHTML = `<div class="cert-title">${it.title||'Certificate'}</div><div class="cert-sub">${it.issuer||''} · ${it.date||''}</div>`;
        const right = document.createElement('div'); right.innerHTML = `<button class="btn btn-small">View</button>`;
        right.querySelector('button').addEventListener('click', ()=> { if (it.download) downloadFile(it.file); else openLightboxFor(it.file); });
        meta.appendChild(left); meta.appendChild(right);
        card.appendChild(meta);
        grid.appendChild(card);
      });
    } catch (e) { console.warn('certificates init failed', e && e.message); }
  })();

  // Simple testimonials carousel (cycles visible testimonial text) — supports optional avatar image
  (function testimonialsCarousel(){
    const cards = [
      { quote: '"Working with Sherneil was a game-changer for our project. He delivered thoughtful, maintainable solutions ahead of schedule."', cite: 'Michael Rodriguez — Product Manager', avatar: 'uploads/41_m.jpg' },
      { quote: '"Sherneil is a focused developer who ships clean code and thoughtful UX improvements."', cite: 'Team Lead, STAS-M', avatar: '' }
    ];
    const container = document.querySelector('.testimonials');
    if (!container) return;
    let idx = 0;
    function render(){
      container.innerHTML = '';
      const card = document.createElement('div');
      card.className = 'card testimonial-card reveal revealed';
      // build inner markup with optional avatar
      const inner = document.createElement('div'); inner.className = 'testimonial-inner';
      if (cards[idx].avatar) {
        const img = document.createElement('img'); img.className = 'testimonial-avatar'; img.src = cards[idx].avatar; img.alt = 'testimonial avatar';
        inner.appendChild(img);
      }
      const body = document.createElement('div'); body.className = 'testimonial-body';
      const quote = document.createElement('blockquote'); quote.className = 'quote'; quote.innerText = cards[idx].quote;
      const cite = document.createElement('div'); cite.className = 'cite'; cite.innerHTML = `<strong>${cards[idx].cite}</strong>`;
      body.appendChild(quote); body.appendChild(cite);
      inner.appendChild(body);
      card.appendChild(inner);
      container.appendChild(card);
    }
    render();
    setInterval(()=>{ idx = (idx+1)%cards.length; render(); }, 4500);
  })();

  // Global gallery/slideshow for arbitrary image arrays
  (function gallery(){
    function cleanup(){
      const lb = document.querySelector('.lightbox');
      if (!lb) return;
      lb.classList.remove('gallery-mode');
      const prev = lb.querySelector('.gallery-prev'); if (prev) prev.remove();
      const next = lb.querySelector('.gallery-next'); if (next) next.remove();
      try { delete window._openGalleryState; } catch(e){}
      document.removeEventListener('keydown', galleryKeyHandler);
    }

    function galleryKeyHandler(e){
      if (!window._openGalleryState) return;
      if (e.key === 'ArrowLeft') showIndex(window._openGalleryState.index - 1);
      if (e.key === 'ArrowRight') showIndex(window._openGalleryState.index + 1);
      if (e.key === 'Escape') {
        const lb = document.querySelector('.lightbox'); if (lb) lb.classList.remove('open'); cleanup();
      }
    }

    function showIndex(i){
      const s = window._openGalleryState; if (!s) return;
      if (i < 0) i = s.files.length - 1; if (i >= s.files.length) i = 0;
      s.index = i;
      // reuse existing lightbox opener
      if (typeof window.openLightboxFor === 'function') window.openLightboxFor(s.files[s.index]);
      // update caption or state if needed
    }

    function makeNav(lb){
      // prev
      const prev = document.createElement('button'); prev.className = 'gallery-prev'; prev.setAttribute('aria-label','Previous'); prev.textContent = '◀';
      prev.addEventListener('click', (e)=>{ e.preventDefault(); showIndex(window._openGalleryState.index - 1); });
      // next
      const next = document.createElement('button'); next.className = 'gallery-next'; next.setAttribute('aria-label','Next'); next.textContent = '▶';
      next.addEventListener('click', (e)=>{ e.preventDefault(); showIndex(window._openGalleryState.index + 1); });
      lb.appendChild(prev); lb.appendChild(next);
    }

    window.openGallery = function(files, startIndex){
      if (!Array.isArray(files) || !files.length) return;
      window._openGalleryState = { files: files.slice(), index: Math.max(0, startIndex||0) };
      // open first
      if (typeof window.openLightboxFor === 'function') window.openLightboxFor(window._openGalleryState.files[window._openGalleryState.index]);
      const lb = document.querySelector('.lightbox');
      if (!lb) return;
      lb.classList.add('gallery-mode');
      // add nav controls
      // remove existing if any
      const existingPrev = lb.querySelector('.gallery-prev'); if (existingPrev) existingPrev.remove();
      const existingNext = lb.querySelector('.gallery-next'); if (existingNext) existingNext.remove();
      makeNav(lb);
      // keyboard
      document.addEventListener('keydown', galleryKeyHandler);
      // cleanup when closed
      const closeBtn = lb.querySelector('.lightbox-close');
      if (closeBtn) {
        const original = closeBtn.onclick;
        closeBtn.onclick = function(ev){
          if (typeof original === 'function') try{ original(); }catch(e){}
          cleanup();
        };
      }
    };
  })();

  // Open STAS-M gallery but prefer a root-level 'uploads/Login Form.png' if it exists
  window.openSTASGallery = async function(){
    const base = 'uploads/STAS-M DASHBOARDS/';
    const dashboardFiles = [
      base + 'Student Login.png',
      base + 'Main Dashboard.png',
      base + 'Admin Dashboard.png',
      base + 'Principal Dashboard.png',
      base + 'Registrar.png',
      base + 'Dentist Dashboard.png',
      base + 'Doctor Dashboard.png',
      base + 'Teacher Dashboard.png'
    ];
    const preferred = 'uploads/Login Form.png';
    let files = [];
    try {
      // check if preferred exists
      const resp = await fetch(preferred, { method: 'HEAD' });
      if (resp && resp.ok) {
        files.push(preferred);
      }
    } catch (e) {
      // ignore — file likely missing
    }
    // append dashboard files (avoid duplicates)
    dashboardFiles.forEach(f=>{ if (!files.includes(f)) files.push(f); });
    // open at first index
    if (files.length) window.openGallery(files, 0);
  };

  // Contact form handler: POST to /contact (creates GitHub issue when server configured)
  (function contactForm(){
    const form = document.getElementById('contactForm');
    if (!form) return;
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const payload = {
        name: form.name.value,
        email: form.email.value,
        message: form.message.value,
      };

      try {
        const resp = await fetch('/contact', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (resp.ok && data && data.success) {
          alert('Thanks! Your message was submitted.');
          form.reset();
        } else {
          console.warn('contact response', data);
          alert('Message saved locally — server not configured.');
        }
      } catch (err) {
        console.error(err);
        alert('Could not submit message. You can still email me directly.');
      }
    });
  })();
})();
