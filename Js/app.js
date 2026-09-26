/**
 * BCK Digital Library – Full Application
 * Bishop Cipriano Kihangire Secondary School
 * Developed by VYRNOX / VICt-n3r / MATAA
 *
 * Data source: data/resources.json (exported from Resource Spreadsheet)
 * PDF open: Google Drive viewer via authorized share links
 */

(function () {
  'use strict';

  const AUTH_KEY = 'bck_auth_user';
  const SAVED_KEY = 'bck_saved_ids';
  const THEME_KEY = 'bck_app_theme';
  const BOOKINGS_KEY = 'bck_course_bookings';

  let resources = [];
  let savedIds = new Set();
  let currentView = 'home';
  let currentUser = null;
  let selectedCourse = '';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  function sanitize(str) {
    if (str == null) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  function normalizeDriveUrl(url) {
    if (!url) return '';
    const m = String(url).match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m) return `https://drive.google.com/file/d/${m[1]}/view`;
    return url;
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.add('hidden'), 3200);
  }

  function normalizeResource(r) {
    return {
      id: r.id || '',
      title: r.title || 'Untitled',
      subject: r.subject || '',
      category: r.category || '',
      classLevel: r.classLevel || r.class || '',
      author: r.author || '',
      publisher: r.publisher || '',
      description: r.description || '',
      driveLink: r.driveLink || r.driveUrl || r.googleDrive || '',
      pdfLink: r.pdfLink || r.pdfUrl || '',
      status: r.status || r.verificationStatus || 'Unverified',
      dateAdded: r.dateAdded || ''
    };
  }

  async function loadResources() {
    try {
      const res = await fetch('data/resources.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const raw = Array.isArray(data) ? data : (data.books || data.resources || []);
      resources = raw.map(normalizeResource);
    } catch (e) {
      console.warn('resources.json load failed', e);
      resources = [];
    }
    try {
      const s = localStorage.getItem(SAVED_KEY);
      if (s) savedIds = new Set(JSON.parse(s));
    } catch (_) {}
  }

  function saveSaved() {
    localStorage.setItem(SAVED_KEY, JSON.stringify([...savedIds]));
  }

  // ---------- Auth ----------
  function checkAuth() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) {
        currentUser = JSON.parse(raw);
        return true;
      }
    } catch (_) {}
    return false;
  }

  function login(email) {
    currentUser = {
      email: email.trim(),
      name: email.split('@')[0] || 'Learner',
      loginAt: new Date().toISOString()
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
    showApp();
  }

  function logout() {
    localStorage.removeItem(AUTH_KEY);
    currentUser = null;
    $('#appShell').classList.add('hidden');
    $('#loginScreen').classList.remove('hidden');
    $('#loginForm').reset();
  }

  function showApp() {
    $('#loginScreen').classList.add('hidden');
    $('#appShell').classList.remove('hidden');
    const name = currentUser?.name || 'Learner';
    $('#userDisplay').textContent = name;
    updateNotifBadge();
    showView('home');
    renderHome();
  }

  // ---------- Navigation ----------
  function showView(name) {
    currentView = name;
    $$('.view').forEach(v => v.classList.remove('active'));
    const el = $(`#view-${name}`);
    if (el) el.classList.add('active');

    $$('.nav-item[data-view], .bnav[data-view]').forEach(b => {
      b.classList.toggle('active', b.dataset.view === name);
    });
    $('#sidebar').classList.remove('open');

    if (name === 'library') renderLibrary();
    if (name === 'home') renderHome();
    if (name === 'saved') renderSaved();
    if (name === 'exams') renderExamsList();
    if (name === 'media') renderMedia();
    if (name === 'notifications') renderNotifications();
  }

  // ---------- Cards ----------
  function resourceCard(r, delay) {
    const drive = normalizeDriveUrl(r.driveLink || r.pdfLink);
    const isSaved = savedIds.has(r.id);
    const style = delay != null ? `style="animation-delay:${delay * 0.05}s"` : '';
    return `
      <article class="res-card" data-id="${sanitize(r.id)}" ${style}>
        <h3>${sanitize(r.title)}</h3>
        <div class="res-meta">
          <span class="tag tag-subject">${sanitize(r.subject || '—')}</span>
          <span class="tag tag-class">${sanitize(r.classLevel || '—')}</span>
          <span class="tag tag-status">${sanitize(r.status)}</span>
        </div>
        <p class="res-desc">${sanitize(r.description || r.category || 'Study resource')}</p>
        <div class="res-actions">
          ${drive
            ? `<a class="btn btn-primary btn-sm" href="${sanitize(drive)}" target="_blank" rel="noopener noreferrer">
                <i class="fa-solid fa-file-pdf"></i> Open PDF
              </a>`
            : `<span class="btn btn-ghost btn-sm" style="opacity:.6">No link</span>`}
          <button class="btn btn-ghost btn-sm" data-action="detail"><i class="fa-solid fa-circle-info"></i> Details</button>
          <button class="btn btn-ghost btn-sm" data-action="save">
            <i class="fa-solid fa-bookmark"></i> ${isSaved ? 'Saved' : 'Save'}
          </button>
        </div>
      </article>
    `;
  }

  function renderGrid(sel, list) {
    const el = $(sel);
    if (!el) return;
    el.innerHTML = list.map((r, i) => resourceCard(r, i)).join('');
  }

  function getSubjects() {
    return [...new Set(resources.map(r => r.subject).filter(Boolean))].sort();
  }
  function getClasses() {
    return [...new Set(resources.map(r => r.classLevel).filter(Boolean))].sort();
  }
  function getCategories() {
    return [...new Set(resources.map(r => r.category).filter(Boolean))].sort();
  }

  function renderHome() {
    renderGrid('#featuredGrid', resources.slice(0, 6));
    const row = $('#subjectRow');
    row.innerHTML = getSubjects().map(s =>
      `<button class="chip" data-subject="${sanitize(s)}">${sanitize(s)}</button>`
    ).join('');
  }

  function getFiltered() {
    const subject = $('#fSubject')?.value || '';
    const cls = $('#fClass')?.value || '';
    const cat = $('#fCategory')?.value || '';
    const sort = $('#fSort')?.value || 'newest';
    const q = ($('#globalSearch')?.value || '').trim().toLowerCase();

    let list = resources.filter(r => {
      if (subject && r.subject !== subject) return false;
      if (cls && r.classLevel !== cls) return false;
      if (cat && r.category !== cat) return false;
      if (q) {
        const hay = [r.title, r.subject, r.category, r.classLevel, r.author, r.description].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sort === 'title') list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    else if (sort === 'subject') list.sort((a, b) => (a.subject || '').localeCompare(b.subject || ''));
    else list.sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''));

    return list;
  }

  function renderLibrary() {
    const sub = $('#fSubject');
    const cls = $('#fClass');
    const cat = $('#fCategory');
    if (sub && sub.options.length <= 1) {
      getSubjects().forEach(s => sub.add(new Option(s, s)));
      getClasses().forEach(c => cls.add(new Option(c, c)));
      getCategories().forEach(c => cat.add(new Option(c, c)));
    }
    const list = getFiltered();
    $('#libCount').textContent = `${list.length} resource${list.length !== 1 ? 's' : ''}`;
    renderGrid('#libraryGrid', list);
    $('#libEmpty').classList.toggle('hidden', list.length > 0);
  }

  function renderSaved() {
    const list = resources.filter(r => savedIds.has(r.id));
    renderGrid('#savedGrid', list);
    $('#savedEmpty').style.display = list.length ? 'none' : 'block';
  }

  function showDetail(id) {
    const r = resources.find(x => x.id === id);
    if (!r) return;
    const drive = normalizeDriveUrl(r.driveLink || r.pdfLink);
    $('#detailPanel').innerHTML = `
      <h1>${sanitize(r.title)}</h1>
      <div class="res-meta" style="margin-bottom:1rem">
        <span class="tag tag-subject">${sanitize(r.subject || '—')}</span>
        <span class="tag tag-class">${sanitize(r.classLevel || '—')}</span>
        <span class="tag">${sanitize(r.category || '—')}</span>
        <span class="tag tag-status">${sanitize(r.status)}</span>
      </div>
      <p style="color:var(--muted);line-height:1.65;margin-bottom:1rem">${sanitize(r.description || 'No description available.')}</p>
      <p style="font-size:.85rem;color:var(--muted)">
        ${r.author ? 'Author: ' + sanitize(r.author) + ' · ' : ''}
        ${r.publisher ? 'Publisher: ' + sanitize(r.publisher) + ' · ' : ''}
        Added: ${sanitize(r.dateAdded || '—')}
      </p>
      <div class="detail-actions">
        ${drive
          ? `<a class="btn btn-primary" href="${sanitize(drive)}" target="_blank" rel="noopener noreferrer">
              <i class="fa-solid fa-file-pdf"></i> Open PDF in Viewer
            </a>`
          : ''}
        <button class="btn btn-ghost" data-action="save-detail" data-id="${sanitize(r.id)}">
          <i class="fa-solid fa-bookmark"></i> ${savedIds.has(r.id) ? 'Saved' : 'Save to My Library'}
        </button>
      </div>
      <p style="margin-top:1.25rem;font-size:.8rem;color:var(--muted)">
        PDFs open in Google Drive’s secure viewer. Access depends on the school’s sharing settings.
      </p>
    `;
    showView('detail');
  }

  function toggleSave(id) {
    if (savedIds.has(id)) {
      savedIds.delete(id);
      toast('Removed from My Library');
    } else {
      savedIds.add(id);
      toast('Saved to My Library');
    }
    saveSaved();
  }

  // ---------- Payment / Courses ----------
  function openPayModal(courseName) {
    selectedCourse = courseName;
    $('#payCourseName').textContent = courseName;
    $('#payName').value = currentUser?.name || '';
    $('#payPhone').value = '';
    $('#payExtraInput').value = '';
    document.querySelector('input[name="payMethod"][value="mtn"]').checked = true;
    updatePayExtra('mtn');
    $('#payModal').classList.remove('hidden');
  }

  function closePayModal() {
    $('#payModal').classList.add('hidden');
  }

  function updatePayExtra(method) {
    const label = $('#payExtraLabel');
    const input = $('#payExtraInput');
    if (method === 'mtn') {
      label.textContent = 'MTN Mobile Money number';
      input.placeholder = '077X XXX XXX';
    } else if (method === 'airtel') {
      label.textContent = 'Airtel Money number';
      input.placeholder = '070X XXX XXX';
    } else {
      label.textContent = 'PayPal email';
      input.placeholder = 'you@email.com';
    }
  }

  function submitBooking() {
    const name = $('#payName').value.trim();
    const phone = $('#payPhone').value.trim();
    const method = document.querySelector('input[name="payMethod"]:checked')?.value;
    const extra = $('#payExtraInput').value.trim();

    if (!name || name.length < 2) {
      toast('Please enter your full name');
      return;
    }
    if (!phone || phone.length < 9) {
      toast('Please enter a valid phone number');
      return;
    }
    if (!extra) {
      toast(method === 'paypal' ? 'Enter PayPal email' : 'Enter mobile money number');
      return;
    }

    const booking = {
      id: 'BK-' + Date.now(),
      course: selectedCourse,
      name,
      phone,
      method,
      account: extra,
      amount: 50000,
      currency: 'UGX',
      status: 'pending_demo',
      createdAt: new Date().toISOString(),
      user: currentUser?.email
    };

    try {
      const list = JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]');
      list.push(booking);
      localStorage.setItem(BOOKINGS_KEY, JSON.stringify(list));
    } catch (_) {}

    closePayModal();
    toast('Booking submitted. You will be contacted to confirm payment of 50,000 UGX.');
  }

  // ---------- Notifications ----------
  const NOTIF_KEY = 'bck_notifications';
  const DEFAULT_NOTIFS = [
    { id: 'n1', title: 'Welcome to BCK Digital Library', text: 'Explore textbooks, practice exams, study media and online courses.', time: 'Just now', read: false, icon: 'fa-graduation-cap' },
    { id: 'n2', title: 'New resources available', text: 'Mathematics, Biology and Geography materials have been added to the library.', time: 'Today', read: false, icon: 'fa-book' },
    { id: 'n3', title: 'Holiday courses open', text: 'Book online lessons at 50,000 UGX via MTN MoMo, Airtel Money or PayPal.', time: 'This week', read: false, icon: 'fa-chalkboard-user' },
    { id: 'n4', title: 'Practice exams ready', text: 'Try the Mathematics and Science online quizzes to test yourself.', time: 'This week', read: false, icon: 'fa-clipboard-question' }
  ];

  function loadNotifs() {
    try {
      const raw = localStorage.getItem(NOTIF_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    localStorage.setItem(NOTIF_KEY, JSON.stringify(DEFAULT_NOTIFS));
    return [...DEFAULT_NOTIFS];
  }

  function saveNotifs(list) {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(list));
    updateNotifBadge();
  }

  function updateNotifBadge() {
    const list = loadNotifs();
    const n = list.filter(x => !x.read).length;
    const badge = $('#notifBadge');
    const dot = $('#topNotifDot');
    if (badge) {
      badge.textContent = n > 0 ? String(n) : '';
      badge.style.display = n > 0 ? 'inline-flex' : 'none';
    }
    if (dot) dot.classList.toggle('hidden', n === 0);
  }

  function renderNotifications() {
    const list = loadNotifs();
    const el = $('#notifList');
    if (!list.length) {
      el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-bell"></i><p>No notifications yet.</p></div>';
      return;
    }
    el.innerHTML = list.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}" data-nid="${sanitize(n.id)}">
        <i class="fa-solid ${sanitize(n.icon || 'fa-bell')}"></i>
        <div class="n-body">
          <div class="n-title">${sanitize(n.title)}</div>
          <div class="n-text">${sanitize(n.text)}</div>
          <div class="n-time">${sanitize(n.time)}</div>
        </div>
      </div>
    `).join('');
  }

  // ---------- Online Exams ----------
  const EXAMS = [
    {
      id: 'math-basics',
      title: 'Mathematics – Algebra Basics',
      subject: 'Mathematics',
      questions: [
        { q: 'What is the value of 2x + 3 when x = 4?', options: ['8', '11', '10', '14'], answer: 1 },
        { q: 'Simplify: 3(a + 2) − a', options: ['2a + 6', '3a + 6', '2a + 2', '4a + 6'], answer: 0 },
        { q: 'Solve: x + 7 = 15', options: ['x = 7', 'x = 8', 'x = 22', 'x = 15'], answer: 1 },
        { q: 'What is 15% of 200?', options: ['20', '25', '30', '35'], answer: 2 },
        { q: 'The square root of 81 is:', options: ['7', '8', '9', '10'], answer: 2 }
      ]
    },
    {
      id: 'science-gen',
      title: 'General Science – Quick Test',
      subject: 'General Science',
      questions: [
        { q: 'Water boils at sea level at approximately:', options: ['90°C', '100°C', '110°C', '120°C'], answer: 1 },
        { q: 'Which gas do plants absorb during photosynthesis?', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], answer: 2 },
        { q: 'The human heart has how many chambers?', options: ['2', '3', '4', '5'], answer: 2 },
        { q: 'Force is measured in:', options: ['Watts', 'Newtons', 'Joules', 'Pascals'], answer: 1 },
        { q: 'The chemical symbol for water is:', options: ['H2O', 'CO2', 'O2', 'NaCl'], answer: 0 }
      ]
    },
    {
      id: 'english-comp',
      title: 'English – Comprehension Basics',
      subject: 'English',
      questions: [
        { q: 'A noun is a word that names:', options: ['An action', 'A person, place or thing', 'A description', 'A connection'], answer: 1 },
        { q: 'Which is a synonym of “happy”?', options: ['Sad', 'Angry', 'Joyful', 'Tired'], answer: 2 },
        { q: 'The past tense of “go” is:', options: ['Goed', 'Gone', 'Went', 'Going'], answer: 2 },
        { q: 'An adjective describes a:', options: ['Verb', 'Noun', 'Preposition', 'Conjunction'], answer: 1 },
        { q: '“Their” refers to:', options: ['Location', 'Possession', 'Time', 'Action'], answer: 1 }
      ]
    }
  ];

  let activeExam = null;
  let examIndex = 0;
  let examAnswers = [];

  function renderExamsList() {
    $('#examsList').classList.remove('hidden');
    $('#examPlayer').classList.add('hidden');
    $('#examsList').innerHTML = EXAMS.map(ex => `
      <article class="exam-card">
        <h3>${sanitize(ex.title)}</h3>
        <p>${sanitize(ex.subject)} · ${ex.questions.length} questions</p>
        <div class="meta"><i class="fa-solid fa-clock"></i> About ${ex.questions.length * 1} min</div>
        <button class="btn btn-primary btn-block start-exam" data-exam="${sanitize(ex.id)}">
          <i class="fa-solid fa-play"></i> Start Exam
        </button>
      </article>
    `).join('');
  }

  function startExam(id) {
    activeExam = EXAMS.find(e => e.id === id);
    if (!activeExam) return;
    examIndex = 0;
    examAnswers = new Array(activeExam.questions.length).fill(null);
    $('#examsList').classList.add('hidden');
    $('#examPlayer').classList.remove('hidden');
    $('#examResult').classList.add('hidden');
    $('#examTitle').textContent = activeExam.title;
    renderExamQuestion();
  }

  function renderExamQuestion() {
    const q = activeExam.questions[examIndex];
    const total = activeExam.questions.length;
    $('#examQNum').textContent = `Question ${examIndex + 1} of ${total}`;
    $('#examProgressBar').style.width = `${((examIndex + 1) / total) * 100}%`;
    $('#examQuestion').textContent = q.q;
    $('#examOptions').innerHTML = q.options.map((opt, i) => `
      <button type="button" class="exam-opt ${examAnswers[examIndex] === i ? 'selected' : ''}" data-opt="${i}">
        ${String.fromCharCode(65 + i)}. ${sanitize(opt)}
      </button>
    `).join('');
    $('#examPrev').disabled = examIndex === 0;
    $('#examNext').textContent = examIndex === total - 1 ? 'Submit' : 'Next';
  }

  function finishExam() {
    let score = 0;
    activeExam.questions.forEach((q, i) => {
      if (examAnswers[i] === q.answer) score++;
    });
    const pct = Math.round((score / activeExam.questions.length) * 100);
    $('#examResult').classList.remove('hidden');
    $('#examResult').innerHTML = `
      <div class="score">${score}/${activeExam.questions.length}</div>
      <p><strong>${pct}%</strong> — ${pct >= 70 ? 'Great work!' : pct >= 50 ? 'Keep practising.' : 'Review the topic and try again.'}</p>
      <button class="btn btn-primary" id="examRetry" style="margin-top:1rem">Try another exam</button>
    `;
    $('#examNext').disabled = true;
    try {
      const scores = JSON.parse(localStorage.getItem('bck_exam_scores') || '[]');
      scores.push({ examId: activeExam.id, score, total: activeExam.questions.length, pct, at: new Date().toISOString() });
      localStorage.setItem('bck_exam_scores', JSON.stringify(scores));
    } catch (_) {}
  }

  // ---------- Study Media (educational YouTube) ----------
  const MEDIA = [
    { title: 'Algebra Basics – What Is Algebra?', channel: 'TabletClass Math', yt: 'NybHckSEQBI', topic: 'Mathematics' },
    { title: 'Introduction to Cells – Biology', channel: 'Amoeba Sisters', yt: '8IlzKri08kk', topic: 'Biology' },
    { title: 'Newton’s Laws of Motion', channel: 'Professor Dave Explains', yt: 'CQYELiTtUs8', topic: 'Physics' },
    { title: 'Photosynthesis Explained', channel: 'Amoeba Sisters', yt: 'uixA8ZXx0KU', topic: 'Biology' },
    { title: 'English Grammar – Parts of Speech', channel: 'English with Lucy', yt: 'vdpTz1YuQyw', topic: 'English' },
    { title: 'Map Skills – Geography Basics', channel: 'Geography Now', yt: '1KieyP0WFbs', topic: 'Geography' }
  ];

  function renderMedia() {
    $('#mediaGrid').innerHTML = MEDIA.map(m => `
      <article class="media-card">
        <div class="media-thumb">
          <iframe src="https://www.youtube.com/embed/${sanitize(m.yt)}" title="${sanitize(m.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
        </div>
        <div class="media-body">
          <h3>${sanitize(m.title)}</h3>
          <p>${sanitize(m.topic)} · ${sanitize(m.channel)}</p>
        </div>
      </article>
    `).join('');
  }

  // ---------- Events ----------
  function bindEvents() {
    $('#loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = $('#loginEmail').value.trim();
      const pass = $('#loginPass').value;
      if (!email || pass.length < 4) {
        toast('Enter email/ID and a password (min 4 characters)');
        return;
      }
      login(email);
      speakWelcome();
      toast('Welcome to BCK Digital Library');
    });

    $('#logoutBtn').addEventListener('click', () => {
      logout();
      toast('Signed out');
    });

    document.getElementById('installAppBtn')?.addEventListener('click', () => {
      triggerInstall();
    });

    $('#menuToggle').addEventListener('click', () => {
      $('#sidebar').classList.toggle('open');
    });

    $('#themeBtn').addEventListener('click', () => {
      const html = document.documentElement;
      const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      if (next === 'light') html.setAttribute('data-theme', 'light');
      else html.removeAttribute('data-theme');
      localStorage.setItem(THEME_KEY, next === 'light' ? 'light' : 'dark');
      const icon = $('#themeBtn').querySelector('i');
      if (icon) icon.className = next === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });

    $$('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.view) showView(btn.dataset.view);
      });
    });

    $('#globalSearch').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        showView('library');
        renderLibrary();
      }
    });

    ['fSubject', 'fClass', 'fCategory', 'fSort'].forEach(id => {
      $(`#${id}`)?.addEventListener('change', renderLibrary);
    });
    $('#clearFilters')?.addEventListener('click', () => {
      $('#fSubject').value = '';
      $('#fClass').value = '';
      $('#fCategory').value = '';
      $('#fSort').value = 'newest';
      $('#globalSearch').value = '';
      renderLibrary();
    });

    document.addEventListener('click', (e) => {
      const card = e.target.closest('.res-card');
      const action = e.target.closest('[data-action]')?.dataset.action;

      if (action === 'detail' && card) showDetail(card.dataset.id);
      if (action === 'save' && card) {
        toggleSave(card.dataset.id);
        if (currentView === 'home') renderHome();
        if (currentView === 'library') renderLibrary();
        if (currentView === 'saved') renderSaved();
      }
      if (action === 'save-detail') {
        toggleSave(e.target.closest('[data-id]').dataset.id);
        showDetail(e.target.closest('[data-id]').dataset.id);
      }

      const chip = e.target.closest('.chip[data-subject]');
      if (chip) {
        showView('library');
        $('#fSubject').value = chip.dataset.subject;
        renderLibrary();
      }

      const bookBtn = e.target.closest('.book-btn');
      if (bookBtn) openPayModal(bookBtn.dataset.course);

      const startEx = e.target.closest('.start-exam');
      if (startEx) startExam(startEx.dataset.exam);

      const opt = e.target.closest('.exam-opt');
      if (opt && activeExam) {
        examAnswers[examIndex] = parseInt(opt.dataset.opt, 10);
        renderExamQuestion();
      }

      const nid = e.target.closest('.notif-item')?.dataset.nid;
      if (nid) {
        const list = loadNotifs().map(n => n.id === nid ? { ...n, read: true } : n);
        saveNotifs(list);
        renderNotifications();
      }

      if (e.target.closest('#examRetry')) {
        activeExam = null;
        renderExamsList();
      }
    });

    $('#backBtn')?.addEventListener('click', () => showView('library'));

    $('#examBack')?.addEventListener('click', () => {
      activeExam = null;
      renderExamsList();
    });
    $('#examPrev')?.addEventListener('click', () => {
      if (examIndex > 0) { examIndex--; renderExamQuestion(); }
    });
    $('#examNext')?.addEventListener('click', () => {
      if (!activeExam) return;
      if (examIndex < activeExam.questions.length - 1) {
        examIndex++;
        renderExamQuestion();
      } else {
        finishExam();
      }
    });

    $('#markAllRead')?.addEventListener('click', () => {
      const list = loadNotifs().map(n => ({ ...n, read: true }));
      saveNotifs(list);
      renderNotifications();
      toast('All notifications marked as read');
    });

    $('#contactForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#cName').value.trim();
      const email = $('#cEmail').value.trim();
      const msg = $('#cMsg').value.trim();
      const subject = encodeURIComponent('BCK Digital Library – Message from ' + name);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${msg}`);
      window.location.href = `mailto:vyrnox74@gmail.com?subject=${subject}&body=${body}`;
      toast('Opening your email app…');
    });

    $('#payClose').addEventListener('click', closePayModal);
    $('#payModal').addEventListener('click', (e) => {
      if (e.target === $('#payModal')) closePayModal();
    });
    $$('input[name="payMethod"]').forEach(r => {
      r.addEventListener('change', () => updatePayExtra(r.value));
    });
    $('#paySubmit').addEventListener('click', submitBooking);
  }

  // ---------- Splash + Voice welcome ----------
  function speakWelcome() {
    try {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(
        'Welcome to the BCK Digital Library app'
      );
      utter.lang = 'en-US';
      utter.rate = 0.95;
      utter.pitch = 1;
      utter.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find(v => /en-US|en-GB/i.test(v.lang) && /Google|Microsoft|Samantha|Female/i.test(v.name)) ||
        voices.find(v => /en/i.test(v.lang));
      if (preferred) utter.voice = preferred;
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn('Speech not available', e);
    }
  }

  function hideSplashThenContinue() {
    const splash = $('#splashScreen');
    if (!splash) {
      afterSplash();
      return;
    }
    // Show splash with loading bar animation (~2.4s), then fade out
    setTimeout(() => {
      splash.classList.add('fade-out');
      setTimeout(() => {
        splash.remove();
        afterSplash();
      }, 600);
    }, 2400);
  }

  function afterSplash() {
    // Try voice on load (may be blocked until user interacts on some browsers)
    speakWelcome();
    if (checkAuth()) {
      showApp();
    } else {
      $('#loginScreen').classList.remove('hidden');
      $('#appShell').classList.add('hidden');
    }
  }

  // ---------- PWA install ----------
  let deferredInstallPrompt = null;

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service worker registration failed', err);
    });
  }

  function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      const btn = document.getElementById('installAppBtn');
      if (btn) btn.classList.remove('hidden');
    });
    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      const btn = document.getElementById('installAppBtn');
      if (btn) btn.classList.add('hidden');
      toast('BCK Digital Library installed');
    });
  }

  async function triggerInstall() {
    if (!deferredInstallPrompt) {
      toast('Use browser menu: Install app or Add to Home Screen');
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    const btn = document.getElementById('installAppBtn');
    if (btn) btn.classList.add('hidden');
  }

  // ---------- Init ----------
  async function init() {
    const theme = localStorage.getItem(THEME_KEY);
    if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');

    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    registerServiceWorker();
    setupInstallPrompt();

    await loadResources();
    bindEvents();
    updateNotifBadge();
    hideSplashThenContinue();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
