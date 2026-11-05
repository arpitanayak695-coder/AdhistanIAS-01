'use strict';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const store = {
  get(key, fallback){
    try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch(e){ return fallback; }
  },
  set(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); } catch(e){ /* storage unavailable — feature degrades silently */ }
  }
};

/* 1. NAVIGATION + SHELL ANIMATIONS */
function initNavigation(){
  const nav = $('#siteNav');
  const toggle = $('#navToggle');
  const mobileMenu = $('#mobileMenu');
  if(!nav) return;

  const onScroll = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 40);
    const bar = $('#scrollProgress');
    if(bar){
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = h > 0 ? `${Math.min(100,(window.scrollY / h) * 100)}%` : '0%';
    }
  };
  window.addEventListener('scroll', onScroll, { passive:true });
  onScroll();

  if(toggle && mobileMenu){
    toggle.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    $$('a', mobileMenu).forEach(a => a.addEventListener('click', () => {
      mobileMenu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }));
  }

  // Highlight the navbar link of the page that is currently open
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  $$('[data-navlink]').forEach(l => l.classList.toggle('is-active', l.getAttribute('href').split('/').pop() === currentPage));
}

/* 2. HERO — TEXT REVEAL + cursor glow*/
function initHero(){
  revealHeroHeadline();
  initCursorGlow();
}

function revealHeroHeadline(){
  const lines = $$('#heroHeadline .line span');
  if(!lines.length) return;
  if(prefersReducedMotion || !window.gsap){
    lines.forEach(l => l.style.transform = 'none');
    return;
  }
  window.gsap.set(lines, { yPercent: 110 });
  window.gsap.to(lines, { yPercent: 0, duration: 1.1, stagger: 0.12, ease: 'power3.out', delay: 0.2 });
}

function initCursorGlow(){
  const hero = $('#hero');
  const glow = $('#cursorGlow');
  if(!hero || !glow || prefersReducedMotion) return;
  hero.addEventListener('pointermove', (e) => {
    glow.style.left = `${e.clientX}px`;
    glow.style.top = `${e.clientY}px`;
  });
}

/* 3. THE BEDROCK — SYLLABUS PROGRESS TRACKER*/
const SYLLABUS = {
  'GS-I': ['History','Geography','Society','Indian Heritage & Culture'],
  'GS-II': ['Polity','Governance','Social Justice','International Relations'],
  'GS-III': ['Economy','Environment','Science & Technology','Internal Security'],
  'GS-IV': ['Ethics','Integrity','Aptitude','Case Studies']
};
const STATUS_ORDER = ['Not Started','In Progress','Revised','Mastered'];
const STATUS_PROGRESS = { 'Not Started':0, 'In Progress':40, 'Revised':75, 'Mastered':100 };

function defaultSyllabusState(){
  const state = {};
  Object.entries(SYLLABUS).forEach(([paper, topics]) => {
    topics.forEach(topic => {
      state[`${paper}::${topic}`] = { status:'Not Started', revisions:0 };
    });
  });
  return state;
}

function initSyllabusHeatmap(){
  const tabsEl = $('#bedrockTabs');
  const listEl = $('#topicList');
  const panelEl = $('#bedrockPanel');
  const overallEl = $('#bedrockOverall');
  const resetBtn = $('#resetSyllabus');
  if(!tabsEl || !listEl) return;

  let state = store.get('adhishtan_syllabus', null) || defaultSyllabusState();
  let activePaper = 'GS-I';
  let activeKey = null;

  function save(){ store.set('adhishtan_syllabus', state); }

  function renderTabs(){
    tabsEl.innerHTML = Object.keys(SYLLABUS).map(p =>
      `<button class="bedrock-tab${p===activePaper?' is-active':''}" role="tab" aria-selected="${p===activePaper}" data-paper="${p}">${p}</button>`
    ).join('');
    $$('.bedrock-tab', tabsEl).forEach(btn => btn.addEventListener('click', () => {
      activePaper = btn.dataset.paper;
      renderTabs(); renderList();
    }));
  }

  function renderList(){
    const topics = SYLLABUS[activePaper];
    listEl.innerHTML = topics.map(topic => {
      const key = `${activePaper}::${topic}`;
      const entry = state[key];
      const pct = STATUS_PROGRESS[entry.status];
      const statusClass = 'status-' + entry.status.toLowerCase().replace(' ','');
      return `<button class="topic-row" data-key="${key}" role="listitem">
        <span class="topic-name">${topic}</span>
        <span class="topic-status ${statusClass}">${entry.status}</span>
        <span class="topic-bar-wrap"><span class="topic-bar" style="width:${pct}%"></span></span>
      </button>`;
    }).join('');
    $$('.topic-row', listEl).forEach(row => row.addEventListener('click', () => {
      activeKey = row.dataset.key;
      renderPanel();
    }));
    renderOverall();
  }

  function renderPanel(){
    if(!activeKey){
      panelEl.innerHTML = `<p class="panel-empty">Select a topic to view details and update your progress.</p>`;
      return;
    }
    const [paper, topic] = activeKey.split('::');
    const entry = state[activeKey];
    panelEl.innerHTML = `
      <h4>${topic}</h4>
      <p class="panel-meta">${paper} · Revised ${entry.revisions} time${entry.revisions===1?'':'s'}</p>
      <p class="panel-desc">Set your current status for this topic. Progress and revision counts are saved to this device only.</p>
      <div class="panel-actions" id="panelStatusActions"></div>
      <div class="panel-actions">
        <button type="button" id="panelRevise">+ Log a revision</button>
      </div>
    `;
    const actions = $('#panelStatusActions', panelEl);
    actions.innerHTML = STATUS_ORDER.map(s =>
      `<button type="button" data-status="${s}" class="${s===entry.status?'is-current':''}">${s}</button>`
    ).join('');
    $$('button[data-status]', actions).forEach(btn => btn.addEventListener('click', () => {
      state[activeKey].status = btn.dataset.status;
      save(); renderList(); renderPanel();
    }));
    $('#panelRevise', panelEl).addEventListener('click', () => {
      state[activeKey].revisions += 1;
      save(); renderPanel();
    });
  }

  function renderOverall(){
    const values = Object.values(state).map(e => STATUS_PROGRESS[e.status]);
    const avg = values.length ? Math.round(values.reduce((a,b)=>a+b,0) / values.length) : 0;
    if(overallEl) overallEl.textContent = `Overall progress: ${avg}%`;
  }

  if(resetBtn){
    resetBtn.addEventListener('click', () => {
      state = defaultSyllabusState();
      activeKey = null;
      save(); renderList(); renderPanel();
    });
  }

  renderTabs(); renderList(); renderPanel();
}

/* 4. PROGRAMS*/
const PROGRAMS = [
  { id:'foundation', name:'Foundation Program', duration:'12 Months', desc:'Complete conceptual foundation across all four General Studies papers, built from the ground up.',
    features:['Paper-wise concept building for GS-I to GS-IV','Weekly structured revision cycles','Basic answer writing introduced from month three','NCERT-to-standard-text bridging modules'] },
  { id:'advanced', name:'Advanced CSE Program', duration:'10 Months', desc:'Integrated Prelims and Mains preparation for aspirants with an existing conceptual base.',
    features:['Simultaneous Prelims and Mains tracking','Full-length integrated test series','Current affairs woven into every paper','Personal progress reviews every fortnight'] },
  { id:'mains', name:'Mains Intensive', duration:'6 Months', desc:'Answer writing, essay, ethics and evaluation for aspirants heading into the Mains examination.',
    features:['Daily answer writing with detailed evaluation','Essay structuring workshops','Ethics case-study practice','Model answer benchmarking'] },
  { id:'prelims', name:'Prelims Edge', duration:'4 Months', desc:'Revision, PYQ analysis, elimination technique and test strategy for the final stretch before Prelims.',
    features:['PYQ-pattern based revision','Weekly full-length mock tests','Elimination and guesswork strategy sessions','CSAT confidence building'] }
];

function initPrograms(){
  const grid = $('#programsGrid');
  if(!grid) return;
  grid.innerHTML = PROGRAMS.map(p => `
    <article class="program-card" data-reveal>
      <p class="prog-duration">${p.duration}</p>
      <h3>${p.name}</h3>
      <p>${p.desc}</p>
      <button type="button" data-program="${p.id}">View program details</button>
    </article>`).join('');
  $$('button[data-program]', grid).forEach(btn => btn.addEventListener('click', () => {
    const p = PROGRAMS.find(x => x.id === btn.dataset.program);
    openModal(`
      <h3 id="modalTitle">${p.name}</h3>
      <p class="modal-meta">${p.duration}</p>
      <div class="modal-body">
        <p>${p.desc}</p>
        <ul class="modal-feature-list">${p.features.map(f=>`<li>${f}</li>`).join('')}</ul>
        <a class="btn btn-primary" href="enquiry.html" style="margin-top:1.6rem;" data-modal-close>Enquire about this program</a>
      </div>`);
  }));
}

/* 5. DAILY EDITORIAL READER*/
const EDITORIALS = [
  { id:'ed1', title:"The Changing Architecture of India's Urban Governance", date:'8 September 2026', time:'6 min read',
    body:[
      "India's cities are governed through a layered structure of municipal bodies, parastatal agencies and state departments, each holding a slice of authority over the same geography.",
      "This fragmentation often means that a single street can fall under the jurisdiction of a municipal corporation for sanitation, a development authority for planning, and a state utility for water — with no single office accountable for the whole.",
      "Recent reform proposals have focused less on creating new bodies and more on coordination mechanisms: metropolitan planning committees, unified command structures for infrastructure, and data-sharing platforms across departments."
    ],
    highlight:"Urban governance today is less a question of administrative capacity and more a question of administrative coordination.",
    map:[ ['GS-II','Governance'], ['GS-III','Urban economy & infrastructure'], ['GS-IV','Public accountability'] ],
    question:"Urban governance requires institutional coordination rather than merely administrative expansion. Discuss." },
  { id:'ed2', title:'Groundwater Stress and the Limits of Supply-Side Solutions', date:'5 September 2026', time:'5 min read',
    body:[
      "Large parts of India's agricultural belt depend on groundwater far beyond the rate at which aquifers recharge, a pattern reinforced by decades of subsidised electricity for pumping.",
      "Supply-side responses — new canals, interlinking projects, additional bore wells — treat the symptom of scarcity without addressing the incentive structure that drives over-extraction in the first place.",
      "Demand management, including crop diversification, water pricing reform and community-managed aquifer recharge, has shown more durable results where it has been tried, though it remains politically harder to sustain."
    ],
    highlight:'A water crisis produced by incentives is rarely solved by infrastructure alone.',
    map:[ ['GS-III','Environment & agriculture'], ['GS-II','Centre-state coordination'], ['GS-IV','Ethics of resource use'] ],
    question:'Discuss why supply-side interventions have had limited success in addressing India\u2019s groundwater crisis.' },
  { id:'ed3', title:'Judicial Pendency and the Economics of Delay', date:'2 September 2026', time:'7 min read',
    body:[
      "Case pendency in Indian courts is often described as a capacity problem — too few judges for too many cases — but the picture is more layered once procedural delay is accounted for.",
      "Adjournments, repeated summons, and fragmented case management contribute as much to delay as sanctioned judicial vacancies, and are comparatively cheaper to fix.",
      "Commercial courts and specialised tribunals that adopted stricter case-management timelines have shown that procedural reform can reduce pendency even without a proportional rise in judicial strength."
    ],
    highlight:'Judicial delay is as much a management problem as a staffing one.',
    map:[ ['GS-II','Polity — judiciary'], ['GS-III','Economic cost of delay'], ['GS-IV','Fairness & timeliness'] ],
    question:'Examine the relationship between judicial vacancies and case pendency in India, and evaluate non-staffing reforms to reduce delay.' }
];

function initEditorialReader(){
  const tabsEl = $('#editorialTabs');
  const articleEl = $('#editorialArticle');
  const sideEl = $('#editorialSide');
  if(!tabsEl || !articleEl) return;

  let state = store.get('adhishtan_editorial', {});
  let activeId = EDITORIALS[0].id;

  function save(){ store.set('adhishtan_editorial', state); }
  function getState(id){ return state[id] || (state[id] = { saved:false, read:false }); }

  function renderTabs(){
    tabsEl.innerHTML = EDITORIALS.map(e =>
      `<button class="editorial-tab${e.id===activeId?' is-active':''}" data-id="${e.id}">${e.title.split(' ').slice(0,3).join(' ')}…</button>`
    ).join('');
    $$('.editorial-tab', tabsEl).forEach(btn => btn.addEventListener('click', () => { activeId = btn.dataset.id; render(); }));
  }

  function render(){
    const ed = EDITORIALS.find(e => e.id === activeId);
    const es = getState(ed.id);
    articleEl.innerHTML = `
      <div class="editorial-meta"><span>${ed.date}</span><span>${ed.time}</span></div>
      <h3>${ed.title}</h3>
      <div class="editorial-body">
        ${ed.body.map(p => `<p>${p}</p>`).join('')}
        <p class="highlight">${ed.highlight}</p>
      </div>
      <div class="editorial-controls">
        <button type="button" id="edSave" class="${es.saved?'is-saved':''}">${es.saved?'Saved':'Save'}</button>
        <button type="button" id="edRead" class="${es.read?'is-read':''}">${es.read?'Marked as Read':'Mark as Read'}</button>
        <button type="button" id="edNext">Next Editorial</button>
      </div>`;
    sideEl.innerHTML = `
      <h4>Syllabus Mapping</h4>
      <div class="editorial-map">
        ${ed.map.map(([paper,topic]) => `<div class="editorial-map-item"><strong>${paper}</strong><span>${topic}</span></div>`).join('')}
      </div>
      <div class="editorial-question">
        <h4>Model Mains Question</h4>
        <p>"${ed.question}"</p>
      </div>`;
    renderTabs();

    $('#edSave').addEventListener('click', () => { es.saved = !es.saved; save(); render(); });
    $('#edRead').addEventListener('click', () => { es.read = !es.read; save(); render(); });
    $('#edNext').addEventListener('click', () => {
      const idx = EDITORIALS.findIndex(e => e.id === activeId);
      activeId = EDITORIALS[(idx+1) % EDITORIALS.length].id;
      render();
    });
  }

  render();
}

/* 6. PYQ MATRIX ENGINE*/
const PYQ_STRUCTURE = {
  Prelims: {
    'GS Paper I': ['Polity','History','Geography','Economy','Environment','Science & Tech','Society','International Relations','Internal Security'],
    'CSAT': ['Aptitude']
  },
  Mains: {
    'GS-I': ['History','Geography','Society'],
    'GS-II': ['Polity','International Relations'],
    'GS-III': ['Economy','Environment','Science & Tech','Internal Security'],
    'GS-IV': ['Ethics'],
    'Essay': ['Essay']
  }
};

function buildPYQDataset(){
  const templates = [
    'Discuss the significance of {t} in the context of contemporary India.',
    'Critically examine the role of {t} in shaping public policy.',
    'With reference to {t}, evaluate the challenges faced by policymakers.',
    'How does {t} influence India\u2019s administrative and constitutional framework?',
    'Analyse the impact of {t} on India\u2019s development trajectory.'
  ];
  const topicsBySubject = {
    'Polity':['federalism','the anti-defection law','judicial review','Centre-State relations','the basic structure doctrine'],
    'History':['the Non-Cooperation Movement','colonial land revenue systems','the Partition of Bengal','post-independence integration of princely states'],
    'Geography':['monsoon variability','river interlinking','urban heat islands','coastal erosion'],
    'Economy':['fiscal federalism','disinvestment policy','inflation targeting','the informal sector'],
    'Environment':['biodiversity hotspots','carbon markets','e-waste management','climate finance'],
    'Science & Tech':['digital public infrastructure','space policy','biotechnology regulation','artificial intelligence governance'],
    'Ethics':['emotional intelligence in administration','conflict of interest','whistleblowing','probity in governance'],
    'Society':['caste and social mobility','urbanisation and family structures','gender budgeting'],
    'International Relations':['India-ASEAN relations','multilateral trade negotiations','India\u2019s neighbourhood policy'],
    'Internal Security':['left-wing extremism','cyber security architecture','border management'],
    'Aptitude':['reading comprehension','logical reasoning','data interpretation'],
    'Essay':['social justice','technology and governance','sustainable development']
  };
  const data = [];
  let id = 1;
  for(let year = 2025; year >= 2020; year--){
    Object.entries(PYQ_STRUCTURE).forEach(([exam, papers]) => {
      Object.entries(papers).forEach(([paper, subjects]) => {
        subjects.forEach((subject, si) => {
          const topics = topicsBySubject[subject];
          const topic = topics[(year + si) % topics.length];
          const template = exam === 'Prelims' ? 'Which of the following statements about {t} is correct?' : templates[(year + si) % templates.length];
          data.push({ id: id++, year, exam, paper, subject, topic, question: template.replace('{t}', topic), tags: [subject, topic] });
        });
      });
    });
  }
  return data;
}

function initPYQEngine(){
  const grid = $('#pyqGrid');
  if(!grid) return;
  const dataset = buildPYQDataset();
  const searchInput = $('#pyqSearch');
  const yearSel = $('#pyqYear');
  const examSel = $('#pyqExam');
  const paperSel = $('#pyqPaper');
  const subjectSel = $('#pyqSubject');
  const metaEl = $('#pyqResultsMeta');
  const loadMoreBtn = $('#pyqLoadMore');
  let pageSize = 6, shown = 6;

  function fillSelect(sel, values, newestFirst){
    const sorted = Array.from(new Set(values)).sort();
    if(newestFirst) sorted.reverse();
    sorted.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v; opt.textContent = v;
      sel.appendChild(opt);
    });
  }
  fillSelect(yearSel, dataset.map(d => d.year), true);
  fillSelect(examSel, dataset.map(d => d.exam));
  fillSelect(paperSel, dataset.map(d => d.paper));
  fillSelect(subjectSel, dataset.map(d => d.subject));

  function filtered(){
    const q = searchInput.value.trim().toLowerCase();
    return dataset.filter(d => {
      if(yearSel.value && String(d.year) !== yearSel.value) return false;
      if(examSel.value && d.exam !== examSel.value) return false;
      if(paperSel.value && d.paper !== paperSel.value) return false;
      if(subjectSel.value && d.subject !== subjectSel.value) return false;
      if(q && !(String(d.year).includes(q) || d.exam.toLowerCase().includes(q) || d.paper.toLowerCase().includes(q) || d.question.toLowerCase().includes(q) || d.subject.toLowerCase().includes(q) || d.topic.toLowerCase().includes(q))) return false;
      return true;
    });
  }

  function render(){
    const results = filtered();
    metaEl.textContent = `${results.length} question${results.length===1?'':'s'} found`;
    const visible = results.slice(0, shown);
    grid.innerHTML = visible.length ? visible.map(d => `
      <button class="pyq-card" data-id="${d.id}">
        <div class="pyq-tagrow"><span class="pyq-tag">${d.year}</span><span class="pyq-tag">${d.exam}</span><span class="pyq-tag">${d.paper}</span></div>
        <p class="pyq-q">${d.question}</p>
        <div class="pyq-foot"><span>${d.subject}</span><span>${d.topic}</span></div>
      </button>`).join('') : `<p class="pyq-empty">No questions match these filters. Try widening your search.</p>`;
    loadMoreBtn.style.display = results.length > shown ? 'block' : 'none';

    $$('.pyq-card', grid).forEach(card => card.addEventListener('click', () => {
      const d = dataset.find(x => x.id === Number(card.dataset.id));
      openModal(`
        <h3 id="modalTitle">${d.subject} — ${d.topic}</h3>
        <p class="modal-meta">${d.year} · ${d.exam} · ${d.paper}</p>
        <div class="modal-body">
          <p>${d.question}</p>
          <ul class="modal-feature-list">${d.tags.map(t=>`<li>${t}</li>`).join('')}</ul>
        </div>`);
    }));
  }

  [searchInput, yearSel, examSel, paperSel, subjectSel].forEach(el => {
    el.addEventListener('input', () => { shown = pageSize; render(); });
  });
  loadMoreBtn.addEventListener('click', () => { shown += pageSize; render(); });

  render();
}

/* 7. LBSNAA TARGET CLOCK*/
function initTargetClock(){
  const daysEl = $('#clockDays'), hoursEl = $('#clockHours'), minsEl = $('#clockMinutes'), secsEl = $('#clockSeconds');
  const form = $('#clockForm');
  const dateInput = $('#clockDate');
  if(!daysEl || !form) return;

  const DEFAULT_TARGET = '2027-06-01';
  let target = new Date(store.get('adhishtan_target_date', DEFAULT_TARGET));
  dateInput.value = store.get('adhishtan_target_date', DEFAULT_TARGET);

  function tick(){
    const now = new Date();
    let diff = Math.max(0, target - now);
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    daysEl.textContent = String(days).padStart(3,'0');
    hoursEl.textContent = String(hours).padStart(2,'0');
    minsEl.textContent = String(mins).padStart(2,'0');
    secsEl.textContent = String(secs).padStart(2,'0');
  }
  tick();
  setInterval(tick, 1000);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if(!dateInput.value) return;
    target = new Date(dateInput.value);
    store.set('adhishtan_target_date', dateInput.value);
    tick();
  });
}

/* 8. DAILY SANKALP DASHBOARD */
const SANKALP_METRICS = [
  { key:'study', label:'Study Hours', max:8, step:0.5, unit:'h' },
  { key:'questions', label:'Questions Solved', max:100, step:5, unit:'' },
  { key:'pages', label:'Pages Revised', max:60, step:5, unit:'' },
  { key:'answers', label:'Answer Writing', max:5, step:1, unit:'' },
  { key:'affairs', label:'Current Affairs', max:60, step:10, unit:'m' }
];
function todayKey(){ return `adhishtan_sankalp_${new Date().toISOString().slice(0,10)}`; }

function initSankalpDashboard(){
  const grid = $('#sankalpGrid');
  const resetBtn = $('#resetSankalp');
  if(!grid) return;

  let values = store.get(todayKey(), {});
  SANKALP_METRICS.forEach(m => { if(!(m.key in values)) values[m.key] = 0; });

  function save(){ store.set(todayKey(), values); }

  function circumference(r){ return 2 * Math.PI * r; }

  function render(){
    grid.innerHTML = SANKALP_METRICS.map(m => {
      const val = values[m.key];
      const pct = Math.min(100, Math.round((val / m.max) * 100));
      const r = 34, c = circumference(r);
      const offset = c - (pct/100) * c;
      const complete = pct >= 100;
      return `<div class="sankalp-card${complete?' is-complete':''}" data-key="${m.key}">
        <svg class="sankalp-ring" viewBox="0 0 78 78">
          <circle class="ring-bg" cx="39" cy="39" r="${r}"></circle>
          <circle class="ring-fg" cx="39" cy="39" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${offset}"></circle>
        </svg>
        <p class="sankalp-label">${m.label}</p>
        <p class="sankalp-value">${val}${m.unit}</p>
        <div class="sankalp-controls">
          <button type="button" data-action="dec" aria-label="Decrease ${m.label}">−</button>
          <button type="button" data-action="inc" aria-label="Increase ${m.label}">+</button>
        </div>
      </div>`;
    }).join('');

    $$('.sankalp-card', grid).forEach(card => {
      const key = card.dataset.key;
      const metric = SANKALP_METRICS.find(m => m.key === key);
      card.querySelector('[data-action="inc"]').addEventListener('click', () => {
        values[key] = Math.min(metric.max, +(values[key] + metric.step).toFixed(1));
        save(); render();
      });
      card.querySelector('[data-action="dec"]').addEventListener('click', () => {
        values[key] = Math.max(0, +(values[key] - metric.step).toFixed(1));
        save(); render();
      });
    });
  }

  if(resetBtn){
    resetBtn.addEventListener('click', () => {
      values = {}; SANKALP_METRICS.forEach(m => values[m.key] = 0);
      save(); render();
    });
  }

  render();
}

function initStudyDashboard(){
  initTargetClock();
  initSankalpDashboard();
}

/* 9. FACULTY*/
const FACULTY = [
  { name:'Dr. Arvind Rao',image:'../assets/faculty/arbind-rao.jpeg', spec:'Polity & Governance', bio:'Focuses on constitutional design and the machinery of Indian administration.', exp:'14 years teaching experience', initials:'AR' },
  { name:'Meera Iyer',image:'../assets/faculty/meera-iyer.jpeg' ,spec:'History & Culture', bio:'Builds narrative-driven timelines that connect movements to their administrative aftermath.', exp:'11 years teaching experience', initials:'MI' },
  { name:'Raghav Menon',image:'../assets/faculty/raghav-menon.jpeg' ,spec:'Economy & Environment', bio:'Links macroeconomic policy to on-ground environmental trade-offs aspirants are tested on.', exp:'9 years teaching experience', initials:'RM' },
  { name:'Ananya Sen',image:'../assets/faculty/ananya-sen.jpeg', spec:'Ethics & Essay', bio:'Trains structured reasoning for case studies and essay argumentation under time pressure.', exp:'8 years teaching experience', initials:'AS' }
];

function initFaculty(){
  const grid = $('#facultyGrid');
  if(!grid) return;
  grid.innerHTML = FACULTY.map(f => `
    <article class="faculty-card" data-reveal>
      <div class="faculty-portrait">
    <img
    src="${f.image}"
    alt="${f.name}"
    loading="lazy"
    />
      </div>
      
      <h3>${f.name}</h3>
      <p class="faculty-spec">${f.spec}</p>
      <p class="faculty-bio">${f.bio} ${f.exp}.</p>
    </article>`).join('');
}

/*  10. TESTIMONIALS*/
const TESTIMONIALS = [
  { quote:'The syllabus tracker changed how I planned my weeks — I finally knew what I hadn\u2019t touched instead of guessing.', name:'S. Bardhan, Mains 2025 attempt' },
  { quote:'Answer writing evaluation was blunt and specific. That was more useful than encouragement would have been.', name:'P. Nair, Repeating aspirant' },
  { quote:'The PYQ patterns across ten years told me more about what to prioritise than any single mock test did.', name:'K. Sundaram, Prelims 2025 stage' }
];

function initTestimonials(){
  const track = $('#testimonialTrack');
  const dotsEl = $('#testimonialDots');
  const prevBtn = $('#testimonialPrev');
  const nextBtn = $('#testimonialNext');
  const wrap = $('.testimonial-wrap');
  if(!track) return;

  track.innerHTML = TESTIMONIALS.map((t,i) => `
    <div class="testimonial-slide${i===0?' is-active':''}" data-index="${i}">
      <p class="testimonial-quote">"${t.quote}"</p>
      <p class="testimonial-name">${t.name}</p>
    </div>`).join('');
  dotsEl.innerHTML = TESTIMONIALS.map((_,i) => `<button aria-label="Show testimonial ${i+1}" class="${i===0?'is-active':''}" data-index="${i}"></button>`).join('');

  let current = 0, timer = null;
  function show(i){
    current = (i + TESTIMONIALS.length) % TESTIMONIALS.length;
    $$('.testimonial-slide', track).forEach((s,idx) => s.classList.toggle('is-active', idx===current));
    $$('button', dotsEl).forEach((d,idx) => d.classList.toggle('is-active', idx===current));
  }
  function next(){ show(current+1); }
  function prev(){ show(current-1); }
  function startAutoplay(){ if(!prefersReducedMotion) timer = setInterval(next, 6000); }
  function stopAutoplay(){ clearInterval(timer); }

  prevBtn.addEventListener('click', () => { prev(); stopAutoplay(); startAutoplay(); });
  nextBtn.addEventListener('click', () => { next(); stopAutoplay(); startAutoplay(); });
  $$('button', dotsEl).forEach(d => d.addEventListener('click', () => { show(Number(d.dataset.index)); stopAutoplay(); startAutoplay(); }));
  if(wrap){
    wrap.addEventListener('mouseenter', stopAutoplay);
    wrap.addEventListener('mouseleave', startAutoplay);
  }
  startAutoplay();
}

/* 11. EVENTS*/
const EVENTS = [
  { id:'ev1', cat:'Strategy', title:'UPSC Strategy Session', date:'21 September 2026', time:'5:00 PM', desc:'A strategic roadmap for first-time aspirants planning their first attempt.' },
  { id:'ev2', cat:'Mains', title:'Mains Answer Writing Lab', date:'28 September 2026', time:'4:00 PM', desc:'Hands-on practice with answer structure, framing and evaluation.' },
  { id:'ev3', cat:'Ethics', title:'Ethics Case Study Workshop', date:'4 October 2026', time:'5:30 PM', desc:'Working through administrative dilemmas the way GS-IV expects.' },
  { id:'ev4', cat:'Prelims', title:'Prelims Elimination Masterclass', date:'11 October 2026', time:'4:00 PM', desc:'Smarter elimination strategies for close-call MCQs under time pressure.' }
];

function initEvents(){
  const grid = $('#eventsGrid');
  if(!grid) return;
  grid.innerHTML = EVENTS.map(e => `
    <article class="event-card" data-reveal>
      <p class="event-cat">${e.cat}</p>
      <h3>${e.title}</h3>
      <p class="event-meta">${e.date} · ${e.time}</p>
      <p>${e.desc}</p>
      <button class="btn btn-primary" type="button" data-event="${e.id}">Register</button>
    </article>`).join('');

  $$('button[data-event]', grid).forEach(btn => btn.addEventListener('click', () => {
    const ev = EVENTS.find(x => x.id === btn.dataset.event);
    openModal(`
      <h3 id="modalTitle">Register — ${ev.title}</h3>
      <p class="modal-meta">${ev.date} · ${ev.time}</p>
      <form class="modal-body" id="eventForm">
        <div class="form-grid">
          <div class="form-field full"><label for="evName">Name</label><input type="text" id="evName" required></div>
          <div class="form-field full"><label for="evEmail">Email</label><input type="email" id="evEmail" required></div>
          <div class="form-field full"><label for="evPhone">Phone</label><input type="tel" id="evPhone" required></div>
          <div class="form-submit-row"><button class="btn btn-primary" type="submit">Register</button></div>
        </div>
      </form>`);
    const form = $('#eventForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      $('#modalContent').innerHTML = `
        <h3 id="modalTitle">Registration recorded</h3>
        <p class="modal-body">Registration request recorded for this frontend demonstration.</p>
        <button class="btn btn-primary" type="button" data-modal-close style="margin-top:1rem;">Close</button>`;
    });
  }));
}

/* 12. ENQUIRY FORM*/
function initEnquiryForm(){
  const form = $('#enquiryForm');
  const successEl = $('#enquirySuccess');
  if(!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const submitLabel = submitBtn.textContent;

  const PROGRAM_OPTIONS = new Set(['Foundation Program', 'Advanced CSE Program', 'Mains Intensive', 'Prelims Edge']);

  const validators = {
    enqName: v => v.trim().length >= 2 ? '' : 'Please enter your full name.',
    enqEmail: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Please enter a valid email address.',
    enqPhone: v => /^[0-9+\s-]{8,15}$/.test(v) ? '' : 'Please enter a valid phone number.',
    enqStage: v => v ? '' : 'Please select your current stage.',
    enqProgram: v => PROGRAM_OPTIONS.has(v) ? '' : 'Please select your preferred program.',
    enqMessage: v => v.trim().length >= 10 ? '' : 'Message must be at least 10 characters.'
  };

  function validateField(id){
    const input = $('#'+id);
    const errorEl = $('#'+id+'Error');
    const msg = validators[id] ? validators[id](input.value) : '';
    input.closest('.form-field').classList.toggle('has-error', !!msg);
    if(errorEl) errorEl.textContent = msg;
    return !msg;
  }

  Object.keys(validators).forEach(id => {
    $('#'+id).addEventListener('blur', () => validateField(id));
  });

  function showResult(message, isError){
    successEl.textContent = message;
    successEl.classList.toggle('is-visible', true);
    successEl.classList.toggle('is-error', !!isError);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const validIds = Object.keys(validators);
    const allValid = validIds.map(validateField).every(Boolean);
    if(!allValid){
      successEl.classList.remove('is-visible');
      return;
    }

    const payload = {
      name: $('#enqName').value.trim(),
      email: $('#enqEmail').value.trim(),
      phone: $('#enqPhone').value.trim(),
      stage: $('#enqStage').value,
      program: $('#enqProgram').value,
      message: $('#enqMessage').value.trim()
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    successEl.classList.remove('is-visible', 'is-error');

    const API_BASE = window.ADHISTHAN_API_BASE || 'http://127.0.0.1:5000';

    fetch(API_BASE + '/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json().catch(() => ({})).then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if(status === 200 && data.success){
          showResult(data.message || 'Your inquiry has been submitted successfully! Our team will contact you soon.', false);
          form.reset();
          return;
        }
        if(status === 422 && data.errors){
          Object.keys(data.errors).forEach(field => {
            const id = 'enq' + field.charAt(0).toUpperCase() + field.slice(1);
            const errorEl = $('#'+id+'Error');
            const fieldEl = $('#'+id);
            if(errorEl) errorEl.textContent = data.errors[field];
            if(fieldEl) fieldEl.closest('.form-field').classList.add('has-error');
          });
          showResult(data.message || 'Please correct the highlighted fields.', true);
          return;
        }
        showResult(data.message || 'We could not send your enquiry right now. Please try again later.', true);
      })
      .catch(() => {
        showResult('We could not reach the server. Please check your connection and try again, or call us directly.', true);
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = submitLabel;
      });
  });
}

/* 13. GENERIC MODAL SYSTEM + LEGAL CONTENT */
const LEGAL_CONTENT = {
  privacy: { title:'Privacy', body:'The enquiry form on this site sends the details you submit to our team by email so we can get back to you. Nothing is stored in a database — the email itself is the only record kept.' },
  terms: { title:'Terms', body:'This site is a design and engineering demonstration for Adhishtan IAS. Faculty profiles, statistics and testimonials are illustrative content built for this build and are not verified institutional claims.' }
};

function openModal(html){
  const overlay = $('#modalOverlay');
  const content = $('#modalContent');
  if(!overlay || !content) return;
  content.innerHTML = html;
  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
  const closeTargets = $$('[data-modal-close]', content);
  closeTargets.forEach(el => el.addEventListener('click', closeModal));
  const focusable = $('button, a, input, select, textarea', content);
  if(focusable) focusable.focus({ preventScroll:true });
}
function closeModal(){
  const overlay = $('#modalOverlay');
  if(!overlay) return;
  overlay.classList.remove('is-open');
  overlay.setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
}

function initModalSystem(){
  const overlay = $('#modalOverlay');
  const closeBtn = $('#modalClose');
  if(!overlay) return;
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if(e.target === overlay) closeModal(); });
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeModal(); });

  $$('[data-modal-open]').forEach(link => link.addEventListener('click', (e) => {
    e.preventDefault();
    const entry = LEGAL_CONTENT[link.dataset.modalOpen];
    if(!entry) return;
    openModal(`<h3 id="modalTitle">${entry.title}</h3><p class="modal-body">${entry.body}</p>`);
  }));
}

/*14. SITEWIDE ANIMATIONS — reveals, counters, footer year*/
function initAnimations(){
  const yearEl = $('#footerYear');
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  const revealEls = $$('[data-reveal]');
  if(revealEls.length && 'IntersectionObserver' in window){
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    revealEls.forEach(el => obs.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  const counters = $$('.achieve-num');
  if(counters.length && 'IntersectionObserver' in window){
    const cObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          animateCounter(entry.target);
          cObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(c => cObs.observe(c));
  }
}

function animateCounter(el){
  const target = Number(el.dataset.target) || 0;
  const suffix = el.dataset.suffix || '';
  if(prefersReducedMotion){ el.textContent = target + suffix; return; }
  const duration = 1400;
  const start = performance.now();
  function frame(now){
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(eased * target) + suffix;
    if(p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
/*BOOTSTRAP — each feature isolated so one failure never blocks the rest */
function bootstrap(){
  const inits = [
    initNavigation, initHero, initSyllabusHeatmap, initEditorialReader,
    initPYQEngine, initStudyDashboard, initPrograms, initFaculty,
    initTestimonials, initEvents, initEnquiryForm, initModalSystem, initAnimations
  ];
  inits.forEach(fn => {
    try{ fn(); }
    catch(err){ console.warn(`Adhishtan IAS: ${fn.name} failed to initialise.`, err); }
  });
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}