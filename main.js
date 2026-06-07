/* ============================
   APP STATE & STORAGE
   ============================ */
const STORAGE_KEY = 'arabic_progress_v1';

const defaultProgress = {
  learnedLetters: [],
  learnedWords: [],
  passedGrammar: [],
  testScores: {},
  gamesPlayed: 0,
  totalScore: 0,
  streak: 0,
  lastVisit: null,
  achievements: [],
};

function loadProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...defaultProgress, ...(data || {}) };
  } catch(e) {
    return { ...defaultProgress };
  }
}
function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

const state = {
  progress: loadProgress(),
  currentView: 'home',
  currentCategory: null,
  currentGrammar: null,
  currentGame: null,
  vocabViewMode: 'cards',
  voiceGender: (function(){ try { return localStorage.getItem('arabic_voice') || 'female'; } catch(e){ return 'female'; } })(),
};

/* ============================
   STREAK
   ============================ */
function updateStreak() {
  const today = new Date().toDateString();
  const last = state.progress.lastVisit;
  if (!last) {
    state.progress.streak = 1;
  } else if (last === today) {
    // same day, no change
  } else {
    const lastDate = new Date(last);
    const diff = Math.round((new Date(today) - lastDate) / (1000*60*60*24));
    if (diff === 1) state.progress.streak += 1;
    else if (diff === 2 && (state.progress.streakFreeze || 0) > 0) {
      // заморозка стрика: один пропущенный день не обнуляет прогресс
      state.progress.streakFreeze -= 1;
      state.progress.streak += 1;
      setTimeout(() => toast('❄️ Использована заморозка стрика — серия сохранена!'), 800);
    }
    else state.progress.streak = 1;
  }
  state.progress.lastVisit = today;
  saveProgress();
}

/* ============================
   ACHIEVEMENTS
   ============================ */
const ACHIEVEMENTS = [
  {id:'first_step',icon:'👶',name:'Первый шаг',desc:'Запустил приложение',check:p=>true},
  {id:'alphabet_5',icon:'🔤',name:'Знаток букв',desc:'Изучил 5 букв',check:p=>p.learnedLetters.length>=5},
  {id:'alphabet_all',icon:'📚',name:'Мастер алфавита',desc:'Все 28 букв',check:p=>p.learnedLetters.length>=28},
  {id:'words_10',icon:'💡',name:'10 слов',desc:'Запомнил 10 слов',check:p=>p.learnedWords.length>=10},
  {id:'words_50',icon:'🎓',name:'50 слов',desc:'Запомнил 50 слов',check:p=>p.learnedWords.length>=50},
  {id:'words_100',icon:'🏆',name:'Полиглот',desc:'100 слов!',check:p=>p.learnedWords.length>=100},
  {id:'grammar_1',icon:'📖',name:'Грамматик',desc:'Прошел 1 тему грамматики',check:p=>p.passedGrammar.length>=1},
  {id:'grammar_5',icon:'🎯',name:'Знаток правил',desc:'5 тем грамматики',check:p=>p.passedGrammar.length>=5},
  {id:'games_5',icon:'🎮',name:'Игроман',desc:'Сыграл 5 партий',check:p=>p.gamesPlayed>=5},
  {id:'games_20',icon:'🎲',name:'Геймер',desc:'20 игр сыграно',check:p=>p.gamesPlayed>=20},
  {id:'streak_3',icon:'🔥',name:'Постоянство',desc:'3 дня подряд',check:p=>p.streak>=3},
  {id:'streak_7',icon:'⚡',name:'Неделя',desc:'7 дней подряд',check:p=>p.streak>=7},
];

function checkAchievements() {
  let newOnes = [];
  ACHIEVEMENTS.forEach(a => {
    if (a.check(state.progress) && !state.progress.achievements.includes(a.id)) {
      state.progress.achievements.push(a.id);
      newOnes.push(a);
    }
  });
  saveProgress();
  newOnes.forEach(a => toast(`🏅 Получено достижение: ${a.name}!`, 'success'));
}

/* ============================
   TOAST
   ============================ */
function toast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(t.__timer);
  t.__timer = setTimeout(() => t.classList.remove('show'), 3000);
}

/* ============================
   NAVIGATION
   ============================ */
const App = {
  navigate(view, param = null) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    if (view === 'alphabet') {
      document.getElementById('view-alphabet').classList.add('active');
      document.querySelector('[data-view="alphabet"]').classList.add('active');
      renderAlphabet();
    } else if (view === 'home') {
      document.getElementById('view-home').classList.add('active');
      document.querySelector('[data-view="home"]').classList.add('active');
      renderHome();
    } else if (view === 'vocaboverview') {
      document.getElementById('view-vocaboverview').classList.add('active');
      document.querySelector('[data-view="vocaboverview"]')?.classList.add('active');
      renderVocabOverview();
    } else if (view === 'vocab') {
      document.getElementById('view-vocab').classList.add('active');
      state.currentCategory = param || 'numbers';
      renderVocab(state.currentCategory);
    } else if (view === 'grammar') {
      document.getElementById('view-grammar').classList.add('active');
      document.querySelector('[data-view="grammar"]').classList.add('active');
      renderGrammar();
      if (param) showGrammarTopic(param);
    } else if (view === 'games') {
      document.getElementById('view-games').classList.add('active');
      document.querySelector('[data-view="games"]').classList.add('active');
      renderGamesHub();
    } else if (view === 'tests') {
      document.getElementById('view-tests').classList.add('active');
      document.querySelector('[data-view="tests"]').classList.add('active');
      renderTests();
    } else if (view === 'progress') {
      document.getElementById('view-progress').classList.add('active');
      document.querySelector('[data-view="progress"]').classList.add('active');
      renderProgress();
      if (window.renderRankBoard) renderRankBoard();
    } else if (view === 'srs') {
      document.getElementById('view-srs').classList.add('active');
      document.querySelector('[data-view="srs"]')?.classList.add('active');
      if (window.renderSRS) renderSRS();
    } else if (view === 'conjugation') {
      document.getElementById('view-conjugation').classList.add('active');
      document.querySelector('[data-view="conjugation"]')?.classList.add('active');
      if (window.renderConjugation) renderConjugation();
    } else if (view === 'dialogues') {
      document.getElementById('view-dialogues').classList.add('active');
      document.querySelector('[data-view="dialogues"]')?.classList.add('active');
      if (window.renderDialogues) renderDialogues();
    } else if (view === 'reading') {
      document.getElementById('view-reading').classList.add('active');
      document.querySelector('[data-view="reading"]')?.classList.add('active');
      if (window.renderReading) renderReading();
    } else if (view === 'settings') {
      document.getElementById('view-settings').classList.add('active');
      document.querySelector('[data-view="settings"]')?.classList.add('active');
      if (window.renderSettings) renderSettings();
    } else if (view === 'translator') {
      document.getElementById('view-translator').classList.add('active');
      document.querySelector('[data-view="translator"]')?.classList.add('active');
      if (window.renderTranslator) renderTranslator();
    } else if (view === 'phrasebook') {
      document.getElementById('view-phrasebook').classList.add('active');
      document.querySelector('[data-view="phrasebook"]')?.classList.add('active');
      if (window.renderPhrasebook) renderPhrasebook();
    } else if (view === 'hadith') {
      document.getElementById('view-hadith').classList.add('active');
      document.querySelector('[data-view="hadith"]')?.classList.add('active');
      if (window.renderHadith) renderHadith();
    } else if (view === 'workshop') {
      document.getElementById('view-workshop').classList.add('active');
      document.querySelector('[data-view="workshop"]')?.classList.add('active');
      if (window.renderWorkshop) renderWorkshop();
    } else if (view === 'admin') {
      document.getElementById('view-admin').classList.add('active');
      document.querySelector('[data-view="admin"]')?.classList.add('active');
      if (window.renderAdmin) renderAdmin();
    }
    state.currentView = view;
    document.getElementById('sidebar')?.classList.remove('open');
    window.scrollTo({top:0, behavior:'smooth'});
  }
};
window.App = App;

/* ============================
   UTILS
   ============================ */
function shuffle(arr) {
  const a = [...arr];
  for (let i=a.length-1; i>0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function rand(min, max) { return Math.floor(Math.random()*(max-min+1)) + min; }
// Русское склонение: plural(1,['слово','слова','слов']) → 'слово'
function plural(n, forms) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}
function pick(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function allWords() {
  return Object.values(DB.vocab).flat();
}
function wordsByCategory(cat) {
  return DB.vocab[cat] || allWords();
}

/* ============================
   SPEECH SYNTHESIS  (мужской / женский голос)
   ============================ */
let _voiceCache = [];
function _loadVoices() {
  if (!('speechSynthesis' in window)) return [];
  _voiceCache = window.speechSynthesis.getVoices() || [];
  return _voiceCache;
}
if ('speechSynthesis' in window) {
  _loadVoices();
  try { window.speechSynthesis.onvoiceschanged = _loadVoices; } catch(e) {}
}

// Подсказки по именам голосов на разных платформах (Windows/Mac/Android/Chrome)
const MALE_VOICE_HINTS = ['naayf','nayf','shakir','hamed','hamid','maged','majed','tarik','mehdi','hamza','fahad','bandar','ahmed','omar','khalid','male','رجل','رجالي','عبدالله','بندر'];
const FEMALE_VOICE_HINTS = ['zariyah','salma','hoda','هدى','laila','layla','hala','amira','amina','fatima','noura','nour','sara','imane','rana','female','أنثى','نسائي','ليلى'];

function arabicVoices() {
  const voices = _voiceCache.length ? _voiceCache : _loadVoices();
  return voices.filter(v => /^ar(-|_|$)/i.test(v.lang) || /arab|عرب/i.test(v.name));
}

// Оценка «качества» голоса: сетевые Google/Microsoft звучат живо (как в переводчике),
// локальные «compact» голоса звучат сухо и роботизированно — занижаем их.
function _scoreVoice(v, gender) {
  const n = (v.name || '').toLowerCase();
  let s = 0;
  if (n.includes('google')) s += 100;                                   // голос Google (= Google Переводчик)
  if (n.includes('microsoft')) s += 75;
  if (v.localService === false) s += 50;                                // сетевой → качественнее
  if (/(online|natural|neural|enhanced|premium|wavenet)/.test(n)) s += 45;
  if (/(compact|eloquence|espeak)/.test(n)) s -= 50;                     // «сухие» голоса
  const hints = gender === 'male' ? MALE_VOICE_HINTS : FEMALE_VOICE_HINTS;
  const anti  = gender === 'male' ? FEMALE_VOICE_HINTS : MALE_VOICE_HINTS;
  if (hints.some(h => n.includes(h))) s += 30;
  if (anti.some(h => n.includes(h)))  s -= 25;
  if (/^ar[-_]?sa/i.test(v.lang)) s += 6;                               // стандартный арабский (фусха)
  return s;
}

// Возвращает {voice, trueGender}: trueGender=true, если это «настоящий» мужской/женский голос
function pickArabicVoice(gender) {
  const ar = arabicVoices();
  if (!ar.length) return { voice: null, trueGender: false };
  const ranked = ar.map(v => ({ v, s: _scoreVoice(v, gender) })).sort((a, b) => b.s - a.s);
  const best = ranked[0].v;
  const hints = gender === 'male' ? MALE_VOICE_HINTS : FEMALE_VOICE_HINTS;
  const trueGender = hints.some(h => (best.name || '').toLowerCase().includes(h));
  return { voice: best, trueGender };
}

// state может ещё не существовать на момент первого вызова — безопасно читаем
function currentVoiceGender() {
  try { return (window.state && state.voiceGender) || localStorage.getItem('arabic_voice') || 'female'; }
  catch(e) { return 'female'; }
}

function speak(text, opts = {}) {
  if (!('speechSynthesis' in window) || !text) return;
  if (typeof opts === 'string') opts = { lang: opts };       // обратная совместимость
  const gender = opts.gender || currentVoiceGender();
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = opts.lang || 'ar-SA';
    u.rate = opts.rate != null ? opts.rate : (window.__slowSpeech ? 0.5 : (gender === 'male' ? 0.82 : 0.92));
    u.volume = 1;
    const picked = pickArabicVoice(gender);
    if (picked.voice) { u.voice = picked.voice; u.lang = picked.voice.lang; }
    // Если найден настоящий мужской/женский голос — небольшой сдвиг высоты.
    // Если только один голос — делаем разницу заметной через pitch + rate.
    if (opts.pitch != null)       u.pitch = opts.pitch;
    else if (picked.trueGender)   u.pitch = gender === 'male' ? 0.88 : 1.15;
    else                          u.pitch = gender === 'male' ? 0.62 : 1.65;
    // События начала/конца речи — для анимации озвучки (эквалайзер + пульс слова)
    u.onstart = () => { try { document.body.classList.add('is-speaking'); document.dispatchEvent(new CustomEvent('arabic-speak', { detail: 'start' })); } catch (e) {} };
    u.onend = u.onerror = () => { try { document.body.classList.remove('is-speaking'); document.dispatchEvent(new CustomEvent('arabic-speak', { detail: 'end' })); } catch (e) {} };
    // Chrome иногда «засыпает» — короткая пауза перед запуском повышает надёжность
    const go = () => { try { window.speechSynthesis.resume(); window.speechSynthesis.speak(u); } catch(e) {} };
    setTimeout(go, 40);
  } catch(e) {}
}
// Чёткое произношение одной буквы/звука (медленнее обычного)
function speakSlow(text, gender) { speak(text, { gender: gender || currentVoiceGender(), rate: 0.6 }); }
window.speak = speak; window.speakSlow = speakSlow;

function setVoiceGender(g) {
  if (window.state) state.voiceGender = g;
  try { localStorage.setItem('arabic_voice', g); } catch(e) {}
  document.querySelectorAll('.voice-opt').forEach(b =>
    b.classList.toggle('active', b.dataset.gender === g));
  toast(g === 'male' ? '🔊 Выбран мужской голос' : '🔊 Выбран женский голос');
}
window.setVoiceGender = setVoiceGender;

/* ============================
   CONFETTI
   ============================ */
function confetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors = ['#d4af37','#f9c846','#2d8855','#1a5c38','#fff','#ff6b6b'];
  const particles = [];
  for (let i = 0; i < 120; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -20,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 4 + 2,
      size: Math.random() * 8 + 4,
      color: pick(colors),
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
    });
  }
  let frame = 0;
  function loop() {
    frame++;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
      ctx.restore();
    });
    if (frame < 180) requestAnimationFrame(loop);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  loop();
}

/* ============================
   HOME RENDER
   ============================ */
function renderHome() {
  const stats = document.getElementById('home-stats');
  const p = state.progress;
  stats.innerHTML = `
    <div class="stat-card"><span class="stat-icon">📚</span>
      <div class="stat-value">${p.learnedWords.length}</div>
      <span class="stat-label">${plural(p.learnedWords.length,['слово выучено','слова выучено','слов выучено'])}</span></div>
    <div class="stat-card"><span class="stat-icon">الأ</span>
      <div class="stat-value">${p.learnedLetters.length}/28</div>
      <span class="stat-label">букв алфавита</span></div>
    <div class="stat-card"><span class="stat-icon">📖</span>
      <div class="stat-value">${p.passedGrammar.length}/${DB.grammar.length}</div>
      <span class="stat-label">тем грамматики</span></div>
    <div class="stat-card"><span class="stat-icon">🔥</span>
      <div class="stat-value">${p.streak}</div>
      <span class="stat-label">дней подряд</span></div>
  `;

  const fg = document.getElementById('featured-games');
  const featured = ['flashcard','memory','twoplayer','speed','hangman','wordsearch'];
  fg.innerHTML = featured.map((id,i) => {
    const g = DB.gameList.find(x => x.id === id);
    return `<div class="featured-card bg-${i+1}" onclick="launchGame('${g.id}')">
      <span class="featured-icon">${g.icon}</span>
      <div class="featured-name">${g.name}</div>
    </div>`;
  }).join('');

  // Continue section
  if (p.learnedWords.length > 0 || p.passedGrammar.length > 0) {
    document.getElementById('continue-section').style.display = 'block';
    const cont = document.getElementById('continue-cards');
    const cards = [];
    if (p.passedGrammar.length < DB.grammar.length) {
      const nextGrammar = DB.grammar.find(g => !p.passedGrammar.includes(g.id));
      if (nextGrammar) cards.push(`
        <div class="continue-card" onclick="App.navigate('grammar','${nextGrammar.id}')">
          <div class="continue-card__icon">📖</div>
          <div class="continue-card__title">${nextGrammar.title}</div>
          <div class="continue-card__sub">Следующая тема грамматики</div>
        </div>
      `);
    }
    if (p.learnedLetters.length < 28) {
      cards.push(`
        <div class="continue-card" onclick="App.navigate('alphabet')">
          <div class="continue-card__icon">الأ</div>
          <div class="continue-card__title">Учить алфавит</div>
          <div class="continue-card__sub">${28 - p.learnedLetters.length} букв осталось</div>
        </div>
      `);
    }
    cards.push(`
      <div class="continue-card" onclick="App.navigate('games')">
        <div class="continue-card__icon">🎮</div>
        <div class="continue-card__title">Сыграть в игру</div>
        <div class="continue-card__sub">22 разных вида игр</div>
      </div>
    `);
    cont.innerHTML = cards.join('');
  } else {
    document.getElementById('continue-section').style.display = 'none';
  }
}

/* ============================
   VOCAB OVERVIEW
   ============================ */
function renderVocabOverview() {
  const grid = document.getElementById('vocaboverview-grid');
  if (!grid) return;
  grid.innerHTML = Object.keys(DB.vocab).map(cat => {
    const words = DB.vocab[cat];
    const learned = words.filter(w => state.progress.learnedWords.includes(w.a)).length;
    const pct = Math.round(learned / words.length * 100);
    const label = DB.catLabels[cat] || cat;
    const emoji = label.match(/[\u{1F300}-\u{1FFFF}]/u)?.[0] || '📚';
    const name = label.replace(/[\u{1F000}-\u{1FFFF}]/gu, '').trim();
    return `
      <div class="vocat-card" onclick="App.navigate('vocab','${cat}')">
        <div class="vocat-icon">${emoji}</div>
        <div class="vocat-name">${name}</div>
        <div class="vocat-count">${words.length} ${plural(words.length,['слово','слова','слов'])}</div>
        <div class="vocat-bar"><div class="vocat-fill" style="width:${pct}%"></div></div>
        <div class="vocat-pct">${pct}%</div>
      </div>
    `;
  }).join('');
}

/* ============================
   ALPHABET RENDER
   ============================ */
function renderAlphabet(filter='all') {
  const grid = document.getElementById('alphabet-grid');
  const letters = DB.alphabet.filter(l => {
    if (filter === 'all') return true;
    if (filter === 'connects') return l.left;
    if (filter === 'noconnect') return !l.left;
    return true;
  });
  grid.innerHTML = letters.map((l, idx) => `
    <div class="letter-card ${state.progress.learnedLetters.includes(l.letter)?'learned':''}" data-letter="${l.letter}" data-idx="${DB.alphabet.indexOf(l)}">
      <div class="letter-card__big">${l.letter}</div>
      <div class="letter-card__name">${l.name}</div>
      <div class="letter-card__latin">${l.latin}</div>
    </div>
  `).join('');
  grid.querySelectorAll('.letter-card').forEach(card => {
    card.addEventListener('click', () => showLetterDetail(parseInt(card.dataset.idx)));
  });
}

/* SVG-«самопись» буквы: контур рисуется (stroke-dashoffset), затем заливка */
function letterDrawSVG(ch) {
  const esc = String(ch).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return '<svg class="draw-letter" viewBox="0 0 200 200" width="170" height="170" aria-hidden="true">'
    + '<text x="100" y="150" text-anchor="middle" font-size="150">' + esc + '</text></svg>';
}
function playLetterDraw(host) {
  const s = host && host.querySelector('.draw-letter');
  if (!s) return;
  s.classList.remove('animate');
  void s.offsetWidth;           // рефлоу — рестарт анимации
  s.classList.add('animate');
}

function showLetterDetail(idx) {
  const l = DB.alphabet[idx];
  const lmEl = document.getElementById('lm-letter');
  lmEl.innerHTML = letterDrawSVG(l.letter);
  // кнопка «написать заново» — отдельным соседом (чтобы не наследовать text-clip)
  const oldBtn = document.getElementById('lm-redraw');
  if (oldBtn) oldBtn.remove();
  const lang = (window.currentLang ? currentLang() : 'ru');
  const redrawLabel = lang === 'uz' ? '✍️ Qaytadan yozish' : lang === 'en' ? '✍️ Write again' : '✍️ Написать заново';
  lmEl.insertAdjacentHTML('afterend', '<button class="lm-redraw" id="lm-redraw">' + redrawLabel + '</button>');
  requestAnimationFrame(() => playLetterDraw(lmEl));
  document.getElementById('lm-redraw').onclick = () => playLetterDraw(lmEl);
  document.getElementById('lm-name').textContent = l.name;
  document.getElementById('lm-latin').textContent = `Звук: ${l.latin}`;
  document.getElementById('lm-desc').textContent = l.desc;
  document.getElementById('lm-iso').textContent = l.forms.iso;
  document.getElementById('lm-ini').textContent = l.forms.ini;
  document.getElementById('lm-med').textContent = l.forms.med;
  document.getElementById('lm-fin').textContent = l.forms.fin;
  const ex = document.getElementById('lm-ex');
  ex.innerHTML = l.ex.map(e => `
    <div class="lm-ex-row">
      <span class="ar">${e.a}</span>
      <span class="tr">${e.t}</span>
      <span class="ru">— ${e.r}</span>
    </div>
  `).join('');
  renderPronGuide(l);
  document.getElementById('letter-modal').style.display = 'flex';

  // mark as learned
  if (!state.progress.learnedLetters.includes(l.letter)) {
    state.progress.learnedLetters.push(l.letter);
    saveProgress();
    checkAchievements();
  }

  // speak (текущий выбранный голос) — чуть медленнее для чёткости
  setTimeout(() => speak(l.letter, {rate:0.7}), 350);
  document.getElementById('lm-speak-f').onclick = () => speak(l.letter, {gender:'female', rate:0.72});
  document.getElementById('lm-speak-m').onclick = () => speak(l.letter, {gender:'male', rate:0.72});

  document.getElementById('lm-practice').onclick = () => {
    closeLetterModal();
    launchGame('flashcard', null, l.ex.map(e => ({a:e.a, t:e.t, r:e.r, e:'📖', lvl:1})));
  };
}
function closeLetterModal() {
  document.getElementById('letter-modal').style.display = 'none';
}

/* ============================
   PRONUNCIATION GUIDE (схема артикуляции — «рисунок»)
   ============================ */
// Схема рта в профиль: рот открыт влево, глотка уходит вправо-вниз.
// Подсвечиваются зоны из массива zones (см. data-pron.js).
function pronDiagram(zones) {
  zones = zones || [];
  const on = z => zones.includes(z) ? ' on' : '';
  return `
  <svg class="pron-svg" viewBox="0 0 250 220" role="img" aria-label="Схема: где образуется звук">
    <!-- полость рта (фон) -->
    <path class="pron-cavity" d="M34,84 Q42,56 80,58 L150,56 Q188,56 198,86 L206,150 Q208,188 188,198 L72,198 Q34,198 32,150 Z"/>
    <!-- нос (ориентир) -->
    <path class="pron-nose" d="M34,84 Q16,94 28,108 L44,108"/>
    <!-- зубы -->
    <rect class="pron-z z-teeth-up${on('teeth-up')}" x="54" y="68" width="13" height="15" rx="3"/>
    <rect class="pron-z z-teeth-low${on('teeth-low')}" x="54" y="150" width="13" height="15" rx="3"/>
    <!-- губы -->
    <ellipse class="pron-z z-lips${on('lips')}" cx="40" cy="117" rx="11" ry="31"/>
    <!-- альвеолы (бугорки) -->
    <circle class="pron-z z-alveolar${on('alveolar')}" cx="74" cy="80" r="8"/>
    <!-- твёрдое нёбо -->
    <ellipse class="pron-z z-palate${on('palate')}" cx="110" cy="69" rx="40" ry="9"/>
    <!-- мягкое нёбо -->
    <ellipse class="pron-z z-velum${on('velum')}" cx="168" cy="76" rx="20" ry="9"/>
    <!-- язычок (увула) -->
    <ellipse class="pron-z z-uvula${on('uvula')}" cx="188" cy="93" rx="5" ry="11"/>
    <!-- глотка -->
    <rect class="pron-z z-pharynx${on('pharynx')}" x="189" y="92" width="19" height="88" rx="9"/>
    <!-- гортань -->
    <ellipse class="pron-z z-glottis${on('glottis')}" cx="198" cy="186" rx="12" ry="13"/>
    <!-- язык: основа -->
    <path class="pron-tongue z-tongue-body${on('tongue-body')}" d="M56,150 Q58,127 86,120 Q120,110 152,120 Q178,128 182,150 L182,170 Q120,178 56,170 Z"/>
    <!-- язык: подсветка частей -->
    <ellipse class="pron-hl z-tongue-tip${on('tongue-tip')}" cx="74" cy="131" rx="15" ry="13"/>
    <ellipse class="pron-hl z-tongue-mid${on('tongue-mid')}" cx="118" cy="121" rx="21" ry="15"/>
    <ellipse class="pron-hl z-tongue-back${on('tongue-back')}" cx="166" cy="132" rx="19" ry="16"/>
  </svg>`;
}

function renderPronGuide(l) {
  const box = document.getElementById('lm-pron');
  if (!box) return;
  const p = (DB.pron && DB.pron[l.letter]) || null;
  if (!p) { box.innerHTML = ''; box.style.display = 'none'; return; }
  box.style.display = '';
  const chips = (p.zones || [])
    .map(z => `<span class="pron-zone-chip">${(DB.pronZones && DB.pronZones[z]) || z}</span>`).join('');
  box.innerHTML = `
    <h4 class="pron-h">🗣️ Как произнести этот звук</h4>
    <div class="pron-grid">
      <div class="pron-diagram">
        ${pronDiagram(p.zones)}
        <div class="pron-zones">${chips}</div>
      </div>
      <div class="pron-text">
        <p class="pron-place"><strong>📍 Где:</strong> ${p.place}</p>
        <p class="pron-tongue"><strong>👅 Язык:</strong> ${p.tongue}</p>
        <ol class="pron-steps">${(p.how || []).map(s => `<li>${s}</li>`).join('')}</ol>
        <div class="pron-tip">💡 <strong>Совет:</strong> ${p.tip}</div>
        <div class="pron-listen">
          <button class="btn btn-light btn-sm" id="pron-slow-f">🐢 👩 Медленно</button>
          <button class="btn btn-light btn-sm" id="pron-slow-m">🐢 👨 Медленно</button>
        </div>
      </div>
    </div>`;
  const sf = document.getElementById('pron-slow-f'); if (sf) sf.onclick = () => speakSlow(l.letter, 'female');
  const sm = document.getElementById('pron-slow-m'); if (sm) sm.onclick = () => speakSlow(l.letter, 'male');
}

/* ============================
   VOCAB RENDER
   ============================ */
function renderVocab(cat) {
  state.currentCategory = cat;
  const title = document.getElementById('vocab-title');
  const sub = document.getElementById('vocab-subtitle');
  title.textContent = (DB.catLabels[cat] || cat).replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
  const titleAr = {numbers:'الأرقام',colors:'الألوان',animals:'الحيوانات',family:'العائلة',food:'الطعام',body:'الجسم',greetings:'التحيات',days:'أيام الأسبوع',verbs:'الأفعال',adjectives:'الصفات',forms:'المفرد والمثنى والجمع'}[cat] || '';
  if (titleAr) title.innerHTML = `${title.textContent} <span class="ar" style="color:var(--gold-d)">${titleAr}</span>`;
  const words = wordsByCategory(cat);
  sub.textContent = `${words.length} ${plural(words.length,['слово','слова','слов'])} в этой категории`;

  // mark current sub-nav
  document.querySelectorAll('#vocab-sub a').forEach(a => {
    a.classList.toggle('active', a.dataset.cat === cat);
  });

  renderVocabGrid(words);
  document.getElementById('vocab-search').value = '';
}

function renderVocabGrid(words, mode = state.vocabViewMode) {
  const grid = document.getElementById('vocab-grid');
  if (mode === 'cards') {
    grid.className = 'vocab-grid';
    grid.innerHTML = words.map(w => `
      <div class="word-card ${state.progress.learnedWords.includes(w.a)?'learned':''}" data-word="${w.a}">
        <div class="word-card__inner">
          <div class="word-card__face word-card__front">
            <div class="word-card__emoji">${w.e}</div>
            <div class="word-card__ar">${w.a}</div>
            <span class="word-card__flip-hint">↻</span>
          </div>
          <div class="word-card__face word-card__back">
            <div class="word-card__tr">${w.t}</div>
            <div class="word-card__ru">${w.r}</div>
            ${(w.du||w.pl) ? `<div class="word-card__forms">
              ${w.du?`<span class="wcf"><span class="wcf-lbl">مثنى</span><span class="wcf-ar">${w.du}</span></span>`:''}
              ${w.pl?`<span class="wcf"><span class="wcf-lbl">جمع</span><span class="wcf-ar">${w.pl}</span></span>`:''}
            </div>`:''}
            <button class="word-card__speak" type="button" aria-label="Озвучить">🔊</button>
          </div>
        </div>
      </div>
    `).join('');
    grid.querySelectorAll('.word-card').forEach(card => {
      // Клик переворачивает карточку и озвучивает. В «изученные» слова попадают
      // ТОЛЬКО после прохождения теста по этой теме (см. startVocabTest) — не здесь.
      card.addEventListener('click', () => { card.classList.toggle('flipped'); speak(card.dataset.word); });
      const sp = card.querySelector('.word-card__speak');
      if (sp) sp.addEventListener('click', e => { e.stopPropagation(); speak(card.dataset.word); });
    });
  } else {
    grid.className = '';
    grid.innerHTML = `<table class="vocab-table">
      <thead><tr><th>Арабский</th><th>Транслитерация</th><th>Перевод</th><th>Уровень</th></tr></thead>
      <tbody>
        ${words.map(w => `<tr>
          <td class="ar-cell">${w.a} <span style="opacity:.5">${w.e}</span>${(w.du||w.pl)?`<span class="tbl-forms">${w.du?` · مثنى ${w.du}`:''}${w.pl?` · جمع ${w.pl}`:''}</span>`:''}</td>
          <td class="tr-cell">${w.t}</td>
          <td>${w.r}</td>
          <td>${'⭐'.repeat(w.lvl||1)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  }
}

/* ============================
   GRAMMAR
   ============================ */
function renderGrammar() {
  const menu = document.getElementById('grammar-menu');
  const units = {};
  DB.grammar.forEach(g => {
    if (!units[g.unit]) units[g.unit] = [];
    units[g.unit].push(g);
  });
  let html = '';
  const unitLabels = (typeof DB !== 'undefined' && DB.grammarUnits) || {};
  Object.keys(units).forEach(unit => {
    const label = unitLabels[unit] || `Раздел ${unit}`;
    html += `<div class="grammar-unit-header">${label}</div>`;
    units[unit].forEach((g, i) => {
      const passed = state.progress.passedGrammar.includes(g.id);
      const num = DB.grammar.findIndex(x => x.id === g.id) + 1;
      html += `<button class="grammar-item ${passed?'passed':''} ${state.currentGrammar===g.id?'active':''}" data-id="${g.id}">
        <span class="grammar-item__num">${num}</span>${g.title}
      </button>`;
    });
  });
  menu.innerHTML = html;
  menu.querySelectorAll('.grammar-item').forEach(b => {
    b.addEventListener('click', () => showGrammarTopic(b.dataset.id));
  });
}

function showGrammarTopic(id) {
  state.currentGrammar = id;
  const g = DB.grammar.find(x => x.id === id);
  if (!g) return;
  document.querySelectorAll('.grammar-item').forEach(b => {
    b.classList.toggle('active', b.dataset.id === id);
  });
  const content = document.getElementById('grammar-content');
  const tipsHtml = (g.tips && g.tips.length) ? `
    <div class="grammar-tips">
      <h4>💡 Советы по теме</h4>
      <ul>${g.tips.map(t => `<li>${t}</li>`).join('')}</ul>
    </div>` : '';
  const exercisesHtml = renderExercisesHtml(g);
  const translationHtml = renderTranslationHtml(g);
  content.innerHTML = `
    ${g.text}
    ${tipsHtml}
    ${exercisesHtml}
    ${translationHtml}
    <div class="grammar-actions">
      <button class="btn btn-gold" onclick="startGrammarQuiz('${g.id}')">📝 Пройти тест по теме</button>
      ${state.progress.passedGrammar.includes(g.id)
        ? `<span class="grammar-passed">✅ Тема пройдена</span>`
        : `<span class="grammar-hint">Тема засчитается после сдачи теста (≥60%)</span>`}
    </div>
  `;
  content.scrollTop = 0;
  initExercises(content);
}

const RU_LETTERS = ['А','Б','В','Г','Д','Е','Ж','З','И','К'];

function _distinctAnswers(items) {
  const seen = {}, list = [];
  items.forEach(it => { if (!(it.answer in seen)) { seen[it.answer] = list.length; list.push(it.answer); } });
  return list;
}

function renderExercisesHtml(g) {
  if (!g.exercises || !g.exercises.length) return '';
  const exHtml = g.exercises.map((ex, ei) => {
    const items = ex.items || [];
    const distinct = _distinctAnswers(items);
    const isMatch = items.length >= 2 && items.length <= RU_LETTERS.length && distinct.length === items.length;
    const head = `
        <div class="exercise-block__head">
          <h4 class="exercise-block__title">${ex.title || 'Упражнение ' + (ei + 1)}</h4>
          <button class="btn-show-ans" data-ex="${ei}">👁 Показать ответы</button>
        </div>
        <p class="exercise-block__instr">${ex.instruction}</p>`;

    if (isMatch) {
      const order = shuffle(items.map((_, i) => i));
      const leftHtml = items.map((it, i) => `
          <button type="button" class="m-left" data-i="${i}">
            <span class="m-badge">${RU_LETTERS[i]}</span>
            <span class="m-text">${it.prompt}${it.hint ? ` <span class="ex-hint">(${it.hint})</span>` : ''}</span>
            <span class="m-pick"></span>
          </button>`).join('');
      const rightHtml = order.map((ansIdx, pos) => `
          <button type="button" class="m-right" data-ans="${ansIdx}">
            <span class="m-badge num">${pos + 1}</span>
            <span class="m-text">${items[ansIdx].answer}</span>
          </button>`).join('');
      return `
      <div class="exercise-block ex-match" data-ex="${ei}">
        ${head}
        <p class="ex-tip">🔗 Нажми букву слева, затем подходящую цифру справа — и так все пары.</p>
        <div class="match-wrap">
          <div class="match-col">${leftHtml}</div>
          <div class="match-col">${rightHtml}</div>
        </div>
        <div class="ex-actions">
          <button type="button" class="m-check">✓ Проверить</button>
          <button type="button" class="m-reset">↻ Сброс</button>
          <span class="ex-result"></span>
        </div>
      </div>`;
    }

    // choice mode (ответы повторяются — классификация)
    const itemsHtml = items.map((it, i) => {
      const correct = distinct.indexOf(it.answer);
      const optsHtml = shuffle(distinct.map((_, di) => di)).map(di =>
        `<button type="button" class="c-opt" data-opt="${di}">${distinct[di]}</button>`).join('');
      return `
          <div class="c-item" data-i="${i}" data-correct="${correct}">
            <div class="c-prompt"><span class="ex-num">${i + 1}.</span> ${it.prompt}${it.hint ? ` <span class="ex-hint">(${it.hint})</span>` : ''}</div>
            <div class="c-opts">${optsHtml}</div>
          </div>`;
    }).join('');
    return `
      <div class="exercise-block ex-choice" data-ex="${ei}">
        ${head}
        <p class="ex-tip">👉 Выбери правильный вариант для каждого пункта.</p>
        <div class="choice-items">${itemsHtml}</div>
        <div class="ex-actions">
          <button type="button" class="c-check">✓ Проверить</button>
          <button type="button" class="c-reset">↻ Сброс</button>
          <span class="ex-result"></span>
        </div>
      </div>`;
  }).join('');
  return `<div class="grammar-exercises"><h3 class="exercises-title">📋 Упражнения — выполни прямо здесь</h3>${exHtml}</div>`;
}

function renderTranslationHtml(g) {
  if (!g.translation) return '';
  const t = g.translation;
  const wordsHtml = (t.words && t.words.length) ? `
    <div class="translation-words">
      <span class="tw-title">🆕 Новые слова:</span>
      <div class="tw-list">
        ${t.words.map(w => `<span class="tw-item"><span class="ar">${w.a}</span> — ${w.r}</span>`).join('')}
      </div>
    </div>` : '';
  return `
    <div class="grammar-translation">
      <h3 class="translation-title">📖 Текст для перевода</h3>
      <p class="translation-instr">${t.instruction || 'Переведи следующий текст на арабский язык:'}</p>
      ${wordsHtml}
      <div class="translation-text-ru">${t.ru}</div>
      <button class="btn-show-translation">👁 Показать перевод</button>
      <div class="translation-text-ar" style="display:none">${t.ar}</div>
    </div>
  `;
}

function initExercises(container) {
  // ---------- MATCH (А,Б,В ↔ 1,2,3) ----------
  container.querySelectorAll('.exercise-block.ex-match').forEach(block => {
    const lefts  = block.querySelectorAll('.m-left');
    const rights = block.querySelectorAll('.m-right');
    const result = block.querySelector('.ex-result');
    const pairs = {};      // leftIdx -> ansIdx
    const usedRight = {};  // ansIdx  -> leftIdx
    let aL = null, aR = null;

    const rightByAns = a => block.querySelector(`.m-right[data-ans="${a}"]`);
    const leftByIdx  = i => block.querySelector(`.m-left[data-i="${i}"]`);
    const numOf = r => r ? r.querySelector('.m-badge').textContent : '';
    function updatePick(l) {
      if (!l) return;
      const p = l.querySelector('.m-pick');
      p.textContent = (pairs[l.dataset.i] != null) ? '→ ' + numOf(rightByAns(pairs[l.dataset.i])) : '';
    }
    function pair() {
      if (!aL || !aR) return;
      const li = aL.dataset.i, ans = aR.dataset.ans;
      if (pairs[li] != null) { const o = rightByAns(pairs[li]); if (o) o.classList.remove('used'); delete usedRight[pairs[li]]; }
      if (usedRight[ans] != null) { const ol = usedRight[ans]; delete pairs[ol]; const oe = leftByIdx(ol); if (oe) updatePick(oe); }
      pairs[li] = ans; usedRight[ans] = li;
      aR.classList.add('used');
      updatePick(aL);
      aL.classList.remove('active'); aR.classList.remove('active'); aL = null; aR = null;
    }
    lefts.forEach(l => l.addEventListener('click', () => {
      if (block.dataset.done) return;
      if (l.classList.contains('active')) { l.classList.remove('active'); aL = null; return; }
      lefts.forEach(x => x.classList.remove('active')); l.classList.add('active'); aL = l; pair();
    }));
    rights.forEach(r => r.addEventListener('click', () => {
      if (block.dataset.done) return;
      if (r.classList.contains('active')) { r.classList.remove('active'); aR = null; return; }
      rights.forEach(x => x.classList.remove('active')); r.classList.add('active'); aR = r; pair();
    }));
    block.querySelector('.m-check').addEventListener('click', () => {
      let ok = 0;
      lefts.forEach(l => {
        const i = l.dataset.i; l.classList.remove('correct','wrong');
        const r = pairs[i] != null ? rightByAns(pairs[i]) : null;
        if (r) r.classList.remove('correct','wrong');
        if (pairs[i] == null) return;
        if (String(pairs[i]) === String(i)) { ok++; l.classList.add('correct'); if (r) r.classList.add('correct'); }
        else { l.classList.add('wrong'); if (r) r.classList.add('wrong'); }
      });
      result.textContent = `${ok} из ${lefts.length} верно`;
      result.className = 'ex-result ' + (ok === lefts.length ? 'all-ok' : 'some');
      if (ok === lefts.length) toast('✅ Отлично! Все пары верны!', 'success');
    });
    block.querySelector('.m-reset').addEventListener('click', () => {
      Object.keys(pairs).forEach(k => delete pairs[k]);
      Object.keys(usedRight).forEach(k => delete usedRight[k]);
      lefts.forEach(l => { l.classList.remove('correct','wrong','active'); updatePick(l); });
      rights.forEach(r => r.classList.remove('correct','wrong','used','active'));
      result.textContent = ''; result.className = 'ex-result';
      block.dataset.done = ''; aL = null; aR = null;
    });
    block.__reveal = () => {
      Object.keys(pairs).forEach(k => delete pairs[k]);
      Object.keys(usedRight).forEach(k => delete usedRight[k]);
      lefts.forEach(l => {
        const i = l.dataset.i; pairs[i] = i; usedRight[i] = i;
        l.classList.remove('wrong','active'); l.classList.add('correct'); updatePick(l);
        const r = rightByAns(i); if (r) { r.classList.remove('wrong','active'); r.classList.add('correct','used'); }
      });
      result.textContent = 'Правильные пары показаны'; result.className = 'ex-result all-ok';
      block.dataset.done = '1';
    };
  });

  // ---------- CHOICE (выбор варианта) ----------
  container.querySelectorAll('.exercise-block.ex-choice').forEach(block => {
    const items = block.querySelectorAll('.c-item');
    const result = block.querySelector('.ex-result');
    items.forEach(item => {
      const opts = item.querySelectorAll('.c-opt');
      opts.forEach(o => o.addEventListener('click', () => {
        if (block.dataset.done) return;
        opts.forEach(x => x.classList.remove('sel')); o.classList.add('sel'); item.dataset.sel = o.dataset.opt;
      }));
    });
    block.querySelector('.c-check').addEventListener('click', () => {
      let ok = 0;
      items.forEach(item => {
        const opts = item.querySelectorAll('.c-opt');
        opts.forEach(x => x.classList.remove('correct','wrong'));
        if (item.dataset.sel == null) return;
        const sel = item.dataset.sel, cor = item.dataset.correct;
        const sb = item.querySelector(`.c-opt[data-opt="${sel}"]`);
        if (String(sel) === String(cor)) { ok++; sb.classList.add('correct'); }
        else { sb.classList.add('wrong'); const cb = item.querySelector(`.c-opt[data-opt="${cor}"]`); if (cb) cb.classList.add('correct'); }
      });
      result.textContent = `${ok} из ${items.length} верно`;
      result.className = 'ex-result ' + (ok === items.length ? 'all-ok' : 'some');
      if (ok === items.length) toast('✅ Отлично! Всё верно!', 'success');
    });
    block.querySelector('.c-reset').addEventListener('click', () => {
      items.forEach(item => { delete item.dataset.sel; item.querySelectorAll('.c-opt').forEach(x => x.classList.remove('sel','correct','wrong')); });
      result.textContent = ''; result.className = 'ex-result'; block.dataset.done = '';
    });
    block.__reveal = () => {
      items.forEach(item => {
        const cor = item.dataset.correct;
        item.querySelectorAll('.c-opt').forEach(x => x.classList.remove('wrong','sel'));
        const cb = item.querySelector(`.c-opt[data-opt="${cor}"]`); if (cb) cb.classList.add('correct');
        item.dataset.sel = cor;
      });
      result.textContent = 'Правильные ответы показаны'; result.className = 'ex-result all-ok';
      block.dataset.done = '1';
    };
  });

  // ---------- Кнопка-глазик: показать/скрыть ответы ----------
  container.querySelectorAll('.btn-show-ans').forEach(btn => {
    btn.addEventListener('click', () => {
      const block = container.querySelector(`.exercise-block[data-ex="${btn.dataset.ex}"]`);
      if (!block || !block.__reveal) return;
      const showing = btn.dataset.showing === '1';
      if (!showing) { block.__reveal(); btn.textContent = '🙈 Скрыть ответы'; btn.dataset.showing = '1'; }
      else { const rs = block.querySelector('.m-reset, .c-reset'); if (rs) rs.click(); btn.textContent = '👁 Показать ответы'; btn.dataset.showing = '0'; }
    });
  });

  // ---------- Текст для перевода ----------
  container.querySelectorAll('.btn-show-translation').forEach(btn => {
    btn.addEventListener('click', () => {
      const tr = container.querySelector('.translation-text-ar');
      if (!tr) return;
      const showing = btn.dataset.showing === '1';
      tr.style.display = showing ? 'none' : 'block';
      btn.textContent = showing ? '👁 Показать перевод' : '🙈 Скрыть перевод';
      btn.dataset.showing = showing ? '0' : '1';
    });
  });
}

function markGrammarRead(id) {
  if (!state.progress.passedGrammar.includes(id)) {
    state.progress.passedGrammar.push(id);
    saveProgress();
    checkAchievements();
    renderGrammar();
    toast('Тема отмечена как изученная', 'success');
  } else {
    toast('Тема уже отмечена');
  }
}

function startGrammarQuiz(id) {
  const g = DB.grammar.find(x => x.id === id);
  if (!g || !g.quiz) return;
  startTest({
    title: `Тест: ${g.title}`,
    questions: g.quiz,
    onComplete: (score, total) => {
      state.progress.testScores[`grammar_${id}`] = { score, total, date: Date.now() };
      // Тема засчитывается как пройденная ТОЛЬКО при сдаче теста (≥60%)
      if (total > 0 && score / total >= 0.6) {
        if (!state.progress.passedGrammar.includes(id)) state.progress.passedGrammar.push(id);
        setTimeout(() => toast('✅ Тема грамматики засчитана как пройденная!', 'success'), 400);
      } else {
        setTimeout(() => toast('Тест не сдан (нужно ≥60%). Тема не засчитана — попробуй ещё раз', 'error'), 400);
      }
      saveProgress();
      checkAchievements();
    }
  });
}

/* ============================
   GAMES HUB
   ============================ */
function renderGamesHub() {
  const sel = document.getElementById('game-category-select');
  if (!sel.dataset.init) {
    sel.innerHTML = `<option value="all">Все категории</option>` +
      Object.keys(DB.vocab).map(c => `<option value="${c}">${DB.catLabels[c]}</option>`).join('');
    sel.dataset.init = '1';
  }
  const grid = document.getElementById('games-grid');
  grid.innerHTML = DB.gameList.map(g => `
    <div class="game-card" style="--game-color:${g.color}" onclick="launchGame('${g.id}')">
      <span class="game-card__icon">${g.icon}</span>
      <div class="game-card__name">${g.name}</div>
      <div class="game-card__desc">${g.desc}</div>
    </div>
  `).join('');
}

function getGameWords() {
  const cat = document.getElementById('game-category-select')?.value || 'all';
  return cat === 'all' ? allWords() : wordsByCategory(cat);
}

function launchGame(gameId, words = null, customWords = null) {
  state.currentGame = gameId;
  const game = DB.gameList.find(g => g.id === gameId);
  if (!game) return;
  const w = customWords || words || getGameWords();
  document.getElementById('game-title-bar').textContent = `${game.icon} ${game.name}`;
  document.getElementById('game-score').textContent = '0';
  document.getElementById('game-progress-fill').style.width = '0%';
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-game').classList.add('active');
  state.progress.gamesPlayed += 1;
  saveProgress();
  checkAchievements();
  startGame(gameId, w);
}

function startGame(id, words) {
  const area = document.getElementById('game-area');
  area.innerHTML = '';
  const game = DB.gameList.find(g => g.id === id) || {};
  // Сначала показываем правила игры, затем запускаем
  showGameRules(area, game, () => runGame(id, words));
}

/* Экран с правилами перед игрой */
function showGameRules(area, game, onStart) {
  const steps = (game.how && game.how.length) ? game.how : [game.desc || 'Следуй подсказкам на экране.'];
  area.innerHTML = `
    <div class="game-rules">
      <span class="game-rules__icon">${game.icon || '🎮'}</span>
      <h2 class="game-rules__name">${game.name || 'Игра'}</h2>
      <p class="game-rules__desc">${game.desc || ''}</p>
      <div class="game-rules__box">
        <h4>📋 Как играть — правила</h4>
        <ol class="game-rules__steps">
          ${steps.map(s => `<li>${s}</li>`).join('')}
        </ol>
        ${game.tip ? `<div class="game-rules__tip">💡 <strong>Совет:</strong> ${game.tip}</div>` : ''}
      </div>
      <button class="btn btn-gold game-rules__start" id="rules-start">▶️ Начать игру</button>
    </div>
  `;
  document.getElementById('rules-start').onclick = onStart;
}

function runGame(id, words) {
  const area = document.getElementById('game-area');
  area.innerHTML = '';
  const map = {
    flashcard: gameFlashcard,
    choice: gameChoice,
    tf: gameTrueFalse,
    spelling: gameSpelling,
    memory: gameMemory,
    anagram: gameAnagram,
    blank: gameBlank,
    hangman: gameHangman,
    wordsearch: gameWordSearch,
    dragdrop: gameDragDrop,
    sort: gameSort,
    speed: gameSpeed,
    builder: gameBuilder,
    missing: gameMissing,
    race: gameRace,
    picture: gamePicture,
    listen: gameListen,
    crossword: gameCrossword,
    chain: gameChain,
    twoplayer: gameTwoPlayer,
    columns: gameColumns,
    speedcard: gameSpeedCard,
    dictation: (typeof gameDictation === 'function' ? gameDictation : gameFlashcard),
  };
  (map[id] || gameFlashcard)(area, words);
}

function gameResult(area, title, scoreText, onReplay) {
  area.innerHTML = `
    <div class="game-result">
      <span class="game-result__icon">🎉</span>
      <h2 class="game-result__title">${title}</h2>
      <p class="game-result__score">${scoreText}</p>
      <div class="game-result__buttons">
        <button class="btn btn-gold" id="rep">🔄 Ещё раз</button>
        <button class="btn btn-outline" style="color:var(--green-d);border-color:var(--gold)" id="back">К списку игр</button>
      </div>
    </div>
  `;
  document.getElementById('rep').onclick = onReplay;
  document.getElementById('back').onclick = () => App.navigate('games');
  confetti();
}

function updateGameProgress(pct) {
  document.getElementById('game-progress-fill').style.width = Math.min(100, pct) + '%';
}
function setGameScore(s) {
  document.getElementById('game-score').textContent = s;
  state.progress.totalScore = (state.progress.totalScore || 0) + 0;
}

/* ============================
   GAME 1: FLASHCARDS
   ============================ */
function gameFlashcard(area, words) {
  const deck = shuffle(words).slice(0, Math.min(15, words.length));
  let idx = 0, learned = 0;
  area.innerHTML = `
    <div class="flashcard-game">
      <p class="flashcard-hint">Кликни по карточке, чтобы перевернуть</p>
      <div class="flashcard" id="fc">
        <div class="flashcard__inner">
          <div class="flashcard__face flashcard__front"><div class="ar-big" id="fc-ar"></div><div style="color:var(--ink-mute);font-size:1.2rem" id="fc-emoji"></div></div>
          <div class="flashcard__face flashcard__back"><div class="ru-big" id="fc-ru"></div><div class="tr" id="fc-tr"></div></div>
        </div>
      </div>
      <p style="color:var(--ink-soft);margin-bottom:1rem">Карта <strong id="fc-num">1</strong> из ${deck.length}</p>
      <div class="flashcard-controls">
        <button class="btn btn-light" id="fc-no">❌ Не знаю</button>
        <button class="btn btn-light" id="fc-speak">🔊 Произнести</button>
        <button class="btn btn-gold" id="fc-yes">✓ Знаю</button>
      </div>
    </div>
  `;
  const card = document.getElementById('fc');
  function show() {
    if (idx >= deck.length) {
      gameResult(area, 'Колода пройдена!', `Знаешь ${learned} из ${deck.length} слов`, () => gameFlashcard(area, words));
      return;
    }
    const w = deck[idx];
    card.classList.remove('flipped');
    document.getElementById('fc-ar').textContent = w.a;
    document.getElementById('fc-emoji').textContent = w.e;
    document.getElementById('fc-ru').textContent = w.r;
    document.getElementById('fc-tr').textContent = w.t;
    document.getElementById('fc-num').textContent = idx + 1;
    updateGameProgress((idx / deck.length) * 100);
  }
  card.onclick = () => card.classList.toggle('flipped');
  document.getElementById('fc-yes').onclick = () => {
    learned++;
    // Игра — это тренировка. В «изученные» слова попадают ТОЛЬКО после
    // сдачи теста по теме (см. startVocabTest), не из игр.
    document.getElementById('game-score').textContent = learned;
    idx++; show();
  };
  document.getElementById('fc-no').onclick = () => { idx++; show(); };
  document.getElementById('fc-speak').onclick = () => speak(deck[idx].a);
  show();
}

/* ============================
   GAME 2: MULTIPLE CHOICE
   ============================ */
function gameChoice(area, words) {
  const pool = shuffle(words).slice(0, Math.min(10, words.length));
  let idx = 0, score = 0;
  function show() {
    if (idx >= pool.length) {
      gameResult(area, 'Игра окончена!', `Очки: ${score} / ${pool.length}`, () => gameChoice(area, words));
      return;
    }
    const correct = pool[idx];
    const wrong = shuffle(words.filter(w => w.r !== correct.r)).slice(0, 3);
    const opts = shuffle([correct, ...wrong]);
    area.innerHTML = `
      <div class="choice-game">
        <div class="choice-question">${correct.a}</div>
        <div class="choice-tr">${correct.t}</div>
        <div class="choice-prompt">Что означает это слово?</div>
        <div class="choice-options">
          ${opts.map(o => `<button class="choice-option" data-correct="${o.r === correct.r ? '1' : '0'}">${o.r}</button>`).join('')}
        </div>
      </div>
    `;
    area.querySelectorAll('.choice-option').forEach(b => {
      b.onclick = () => {
        const ok = b.dataset.correct === '1';
        b.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) area.querySelector('[data-correct="1"]').classList.add('correct');
        area.querySelectorAll('.choice-option').forEach(x => x.style.pointerEvents = 'none');
        if (ok) { score++; document.getElementById('game-score').textContent = score; }
        updateGameProgress(((idx + 1) / pool.length) * 100);
        setTimeout(() => { idx++; show(); }, 1100);
      };
    });
  }
  show();
}

/* ============================
   GAME 3: TRUE/FALSE
   ============================ */
function gameTrueFalse(area, words) {
  const pool = shuffle(words).slice(0, Math.min(10, words.length));
  let idx = 0, score = 0;
  function show() {
    if (idx >= pool.length) {
      gameResult(area, 'Готово!', `Очки: ${score} / ${pool.length}`, () => gameTrueFalse(area, words));
      return;
    }
    const w = pool[idx];
    const isTrue = Math.random() > 0.5;
    const shownRu = isTrue ? w.r : pick(words.filter(x => x.r !== w.r)).r;
    area.innerHTML = `
      <div class="tf-game">
        <p style="color:var(--ink-soft);font-size:1.1rem;margin-bottom:1rem">Верно ли это соответствие?</p>
        <div class="tf-pair">
          <span class="ar-side">${w.a}</span>
          <span class="equal">=</span>
          <span class="ru-side">${shownRu}</span>
        </div>
        <div class="tf-buttons">
          <button class="tf-btn yes">✓ Верно</button>
          <button class="tf-btn no">✗ Неверно</button>
        </div>
      </div>
    `;
    const finish = (ans) => {
      const right = ans === isTrue;
      if (right) { score++; document.getElementById('game-score').textContent = score; toast(right?'Правильно!':'Неверно', right?'success':'error'); }
      else toast('Неверно — правильный ответ: ' + w.r, 'error');
      updateGameProgress(((idx + 1) / pool.length) * 100);
      setTimeout(() => { idx++; show(); }, 1100);
    };
    area.querySelector('.tf-btn.yes').onclick = () => finish(true);
    area.querySelector('.tf-btn.no').onclick = () => finish(false);
  }
  show();
}

/* ============================
   GAME 4: SPELLING
   ============================ */
function gameSpelling(area, words) {
  const pool = shuffle(words).slice(0, Math.min(10, words.length));
  let idx = 0, score = 0;
  function show() {
    if (idx >= pool.length) {
      gameResult(area, 'Все слова пройдены!', `Очки: ${score} / ${pool.length}`, () => gameSpelling(area, words));
      return;
    }
    const w = pool[idx];
    const letters = shuffle(w.a.split('').filter(c => c !== ' '));
    area.innerHTML = `
      <div class="spelling-game">
        <div class="spelling-emoji">${w.e}</div>
        <div class="spelling-clue">${w.r}</div>
        <div class="spelling-tr">${w.t}</div>
        <div class="spelling-input-wrap">
          <input type="text" class="spelling-input" id="sp-in" placeholder="..." dir="rtl"/>
        </div>
        <div class="spelling-letters">
          ${letters.map((l,i) => `<button class="spelling-letter" data-i="${i}">${l}</button>`).join('')}
        </div>
        <div style="margin-top:1.5rem">
          <button class="btn btn-light" id="sp-clear">↻ Очистить</button>
          <button class="btn btn-gold" id="sp-check">Проверить</button>
        </div>
      </div>
    `;
    const input = document.getElementById('sp-in');
    area.querySelectorAll('.spelling-letter').forEach(b => {
      b.onclick = () => {
        input.value += b.textContent;
        b.classList.add('used');
      };
    });
    document.getElementById('sp-clear').onclick = () => {
      input.value = '';
      area.querySelectorAll('.spelling-letter').forEach(b => b.classList.remove('used'));
    };
    document.getElementById('sp-check').onclick = () => {
      if (input.value === w.a) {
        score++;
        document.getElementById('game-score').textContent = score;
        toast('Правильно!', 'success');
      } else {
        toast(`Неверно. Правильно: ${w.a}`, 'error');
      }
      updateGameProgress(((idx + 1) / pool.length) * 100);
      setTimeout(() => { idx++; show(); }, 1200);
    };
  }
  show();
}

/* ============================
   GAME 5: MEMORY MATCH
   ============================ */
function gameMemory(area, words) {
  const pairsCount = Math.min(8, words.length);
  const selected = shuffle(words).slice(0, pairsCount);
  const cards = [];
  selected.forEach((w, i) => {
    cards.push({type:'ar', word:w, pairId:i});
    cards.push({type:'ru', word:w, pairId:i});
  });
  const shuffled = shuffle(cards);
  let flipped = [], matched = 0, moves = 0;
  area.innerHTML = `
    <div class="memory-game">
      <div class="memory-stats">
        <span>Найдено: <strong id="mm-found">0</strong>/${pairsCount}</span>
        <span>Ходы: <strong id="mm-moves">0</strong></span>
      </div>
      <div class="memory-grid" id="mm-grid"></div>
    </div>
  `;
  const grid = document.getElementById('mm-grid');
  grid.innerHTML = shuffled.map((c, i) => `
    <div class="memory-card" data-i="${i}">
      <div class="memory-card__inner">
        <div class="memory-card__face memory-card__front">?</div>
        <div class="memory-card__face memory-card__back ${c.type === 'ru' ? 'is-ru' : ''}">
          ${c.type === 'ar' ? `<span class="ar">${c.word.a}</span>` : c.word.r}
        </div>
      </div>
    </div>
  `).join('');
  grid.querySelectorAll('.memory-card').forEach(card => {
    card.onclick = () => {
      if (card.classList.contains('flipped') || card.classList.contains('matched')) return;
      if (flipped.length >= 2) return;
      card.classList.add('flipped');
      flipped.push(card);
      if (flipped.length === 2) {
        moves++;
        document.getElementById('mm-moves').textContent = moves;
        const a = shuffled[+flipped[0].dataset.i];
        const b = shuffled[+flipped[1].dataset.i];
        if (a.pairId === b.pairId && a.type !== b.type) {
          setTimeout(() => {
            flipped.forEach(f => f.classList.add('matched'));
            matched++;
            document.getElementById('mm-found').textContent = matched;
            document.getElementById('game-score').textContent = matched;
            updateGameProgress((matched / pairsCount) * 100);
            flipped = [];
            if (matched === pairsCount) {
              setTimeout(() => gameResult(area, 'Все пары найдены!', `Ходов: ${moves}`, () => gameMemory(area, words)), 700);
            }
          }, 500);
        } else {
          setTimeout(() => {
            flipped.forEach(f => f.classList.remove('flipped'));
            flipped = [];
          }, 900);
        }
      }
    };
  });
}

/* ============================
   GAME 6: ANAGRAM
   ============================ */
function gameAnagram(area, words) {
  const pool = shuffle(words.filter(w => w.a.length >= 3 && w.a.length <= 7)).slice(0, Math.min(8, words.length));
  let idx = 0, score = 0;
  function show() {
    if (idx >= pool.length) {
      gameResult(area, 'Все слова собраны!', `Очки: ${score} / ${pool.length}`, () => gameAnagram(area, words));
      return;
    }
    const w = pool[idx];
    const chars = w.a.split('').filter(c => c.trim());
    const scrambled = shuffle(chars);
    let answer = [];
    area.innerHTML = `
      <div class="anagram-game">
        <div class="anagram-hint">Собери слово: <strong>${w.r}</strong></div>
        <div class="anagram-tr">${w.t} ${w.e}</div>
        <div class="anagram-target" id="ag-target"></div>
        <div class="anagram-letters" id="ag-letters">
          ${scrambled.map((c, i) => `<button class="anagram-letter" data-i="${i}" data-c="${c}">${c}</button>`).join('')}
        </div>
        <div style="margin-top:1.5rem">
          <button class="btn btn-light" id="ag-clear">↻ Начать сначала</button>
          <button class="btn btn-gold" id="ag-check">Проверить</button>
        </div>
      </div>
    `;
    function refreshTarget() {
      document.getElementById('ag-target').innerHTML = answer.map(a => `<div class="anagram-slot">${a.c}</div>`).join('');
    }
    area.querySelectorAll('.anagram-letter').forEach(b => {
      b.onclick = () => {
        if (b.disabled) return;
        answer.push({c:b.dataset.c, i:b.dataset.i});
        b.disabled = true;
        refreshTarget();
      };
    });
    document.getElementById('ag-clear').onclick = () => {
      answer = [];
      area.querySelectorAll('.anagram-letter').forEach(b => b.disabled = false);
      refreshTarget();
    };
    document.getElementById('ag-check').onclick = () => {
      const built = answer.map(a => a.c).join('');
      if (built === chars.join('')) {
        score++;
        document.getElementById('game-score').textContent = score;
        toast('Отлично!', 'success');
      } else {
        toast('Неверно. Правильно: ' + w.a, 'error');
      }
      updateGameProgress(((idx + 1) / pool.length) * 100);
      setTimeout(() => { idx++; show(); }, 1100);
    };
  }
  show();
}

/* ============================
   GAME 7: FILL BLANK
   ============================ */
function gameBlank(area, words) {
  const sentences = DB.sentences;
  let idx = 0, score = 0;
  function show() {
    if (idx >= sentences.length) {
      gameResult(area, 'Все предложения готовы!', `Очки: ${score} / ${sentences.length}`, () => gameBlank(area, words));
      return;
    }
    const s = sentences[idx];
    const blankWordIdx = rand(0, s.words.length - 1);
    const blankWord = s.words[blankWordIdx];
    const correctText = blankWord.a;
    // Build sentence with blank
    const sentenceHtml = s.words.map((w, i) =>
      i === blankWordIdx ? `<span class="blank-slot" id="b-slot">_____</span>` : w.a
    ).join(' ');
    // Build options
    const wrongOpts = shuffle(allWords().filter(w => w.a !== correctText)).slice(0, 3).map(w => w.a);
    const opts = shuffle([correctText, ...wrongOpts]);
    area.innerHTML = `
      <div class="blank-game">
        <div class="blank-translation">${s.full.r}</div>
        <div class="blank-sentence">${sentenceHtml}</div>
        <p style="color:var(--ink-soft);margin-bottom:1rem">Выбери пропущенное слово:</p>
        <div class="blank-options">
          ${opts.map(o => `<button class="blank-option" data-w="${o}">${o}</button>`).join('')}
        </div>
      </div>
    `;
    area.querySelectorAll('.blank-option').forEach(b => {
      b.onclick = () => {
        if (b.dataset.w === correctText) {
          score++;
          document.getElementById('game-score').textContent = score;
          document.getElementById('b-slot').textContent = correctText;
          document.getElementById('b-slot').classList.add('filled');
          toast('Правильно!', 'success');
        } else {
          toast('Правильный ответ: ' + correctText, 'error');
        }
        area.querySelectorAll('.blank-option').forEach(x => x.style.pointerEvents = 'none');
        updateGameProgress(((idx + 1) / sentences.length) * 100);
        setTimeout(() => { idx++; show(); }, 1200);
      };
    });
  }
  show();
}

/* ============================
   GAME 8: HANGMAN
   ============================ */
function gameHangman(area, words) {
  const filtered = words.filter(w => w.a.replace(/\s/g,'').length >= 3);
  const word = pick(filtered);
  const chars = word.a.split('').filter(c => c.trim());
  const guessed = new Set();
  let wrongCount = 0;
  const maxWrong = 6;
  const arabicLetters = ['ا','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'];

  function render() {
    const display = chars.map(c => guessed.has(c) ? c : '').map(c => `<div class="hangman-letter-box">${c}</div>`).join('');
    const keys = arabicLetters.map(l => {
      const used = guessed.has(l);
      const inWord = chars.includes(l);
      const cls = used ? (inWord ? 'used-correct' : 'used-wrong') : '';
      return `<button class="hangman-key ${cls}" data-l="${l}" ${used?'disabled':''}>${l}</button>`;
    }).join('');
    area.innerHTML = `
      <div class="hangman-game">
        <svg class="hangman-svg" width="200" height="220" viewBox="0 0 200 220">
          <line class="hangman-line" x1="20" y1="200" x2="120" y2="200"/>
          <line class="hangman-line" x1="60" y1="200" x2="60" y2="20"/>
          <line class="hangman-line" x1="60" y1="20" x2="140" y2="20"/>
          <line class="hangman-line" x1="140" y1="20" x2="140" y2="40"/>
          <circle class="hangman-line ${wrongCount<1?'hidden':''}" cx="140" cy="55" r="15" />
          <line class="hangman-line ${wrongCount<2?'hidden':''}" x1="140" y1="70" x2="140" y2="120"/>
          <line class="hangman-line ${wrongCount<3?'hidden':''}" x1="140" y1="85" x2="120" y2="100"/>
          <line class="hangman-line ${wrongCount<4?'hidden':''}" x1="140" y1="85" x2="160" y2="100"/>
          <line class="hangman-line ${wrongCount<5?'hidden':''}" x1="140" y1="120" x2="120" y2="150"/>
          <line class="hangman-line ${wrongCount<6?'hidden':''}" x1="140" y1="120" x2="160" y2="150"/>
        </svg>
        <p class="hangman-lives">Жизней: ${maxWrong - wrongCount} / ${maxWrong}</p>
        <div class="hangman-tr">${word.r} (${word.t}) ${word.e}</div>
        <div class="hangman-word">${display}</div>
        <div class="hangman-keyboard">${keys}</div>
      </div>
    `;
    area.querySelectorAll('.hangman-key').forEach(b => {
      b.onclick = () => {
        const l = b.dataset.l;
        if (guessed.has(l)) return;
        guessed.add(l);
        if (!chars.includes(l)) wrongCount++;
        const won = chars.every(c => guessed.has(c));
        const lost = wrongCount >= maxWrong;
        render();
        updateGameProgress(((6-wrongCount)/6)*100);
        if (won) {
          setTimeout(() => gameResult(area, 'Победа! 🎉', `Слово: ${word.a} = ${word.r}`, () => gameHangman(area, words)), 600);
        } else if (lost) {
          setTimeout(() => gameResult(area, 'Поражение 😢', `Слово было: ${word.a} = ${word.r}`, () => gameHangman(area, words)), 600);
        }
      };
    });
  }
  render();
}

/* ============================
   GAME 9: WORD SEARCH
   ============================ */
function gameWordSearch(area, words) {
  const size = 9;
  const wordsPool = shuffle(words.filter(w => w.a.replace(/\s/g,'').length >= 3 && w.a.replace(/\s/g,'').length <= size)).slice(0, 5);
  const grid = [];
  for (let i = 0; i < size; i++) grid.push(Array(size).fill(''));
  const placed = [];

  // Place words horizontally or vertically
  wordsPool.forEach(w => {
    const clean = w.a.replace(/[\sً-ٟ]/g,'');
    let attempts = 0;
    while (attempts < 50) {
      const dir = pick(['h','v']);
      const row = rand(0, size - 1);
      const col = rand(0, size - clean.length);
      if (dir === 'v' && row + clean.length > size) { attempts++; continue; }
      let canPlace = true;
      for (let i = 0; i < clean.length; i++) {
        const r = dir === 'h' ? row : row + i;
        const c = dir === 'h' ? col + i : col;
        if (grid[r][c] && grid[r][c] !== clean[i]) { canPlace = false; break; }
      }
      if (canPlace) {
        const cells = [];
        for (let i = 0; i < clean.length; i++) {
          const r = dir === 'h' ? row : row + i;
          const c = dir === 'h' ? col + i : col;
          grid[r][c] = clean[i];
          cells.push(`${r}-${c}`);
        }
        placed.push({word:w, clean, cells});
        break;
      }
      attempts++;
    }
  });

  // Fill empties
  const allLetters = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'.split('');
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!grid[r][c]) grid[r][c] = pick(allLetters);

  let selection = [];
  let foundCount = 0;

  area.innerHTML = `
    <div class="wordsearch-game">
      <div>
        <div class="ws-grid" id="ws-grid" style="grid-template-columns:repeat(${size},36px)"></div>
        <p style="text-align:center;margin-top:1rem;color:var(--ink-soft);font-size:.85rem">Клик на первую и последнюю букву слова</p>
      </div>
      <div>
        <div class="ws-list">
          <h4>Найди слова (${placed.length}):</h4>
          ${placed.map(p => `<div class="ws-word" data-w="${p.word.a}"><span>${p.word.a}</span><span class="ru">${p.word.r}</span></div>`).join('')}
        </div>
      </div>
    </div>
  `;
  const gridEl = document.getElementById('ws-grid');
  let cellsHtml = '';
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      cellsHtml += `<div class="ws-cell" data-r="${r}" data-c="${c}">${grid[r][c]}</div>`;
  gridEl.innerHTML = cellsHtml;

  function clearSelection() {
    gridEl.querySelectorAll('.ws-cell:not(.found)').forEach(c => c.classList.remove('selected'));
    selection = [];
  }
  function highlight(cells) {
    cells.forEach(k => {
      const [r,c] = k.split('-').map(Number);
      gridEl.querySelector(`[data-r="${r}"][data-c="${c}"]`).classList.add('selected');
    });
  }

  gridEl.querySelectorAll('.ws-cell').forEach(cell => {
    cell.onclick = () => {
      if (cell.classList.contains('found')) return;
      const r = +cell.dataset.r, c = +cell.dataset.c;
      if (selection.length === 0) {
        selection.push({r, c});
        cell.classList.add('selected');
      } else if (selection.length === 1) {
        const s = selection[0];
        const e = {r, c};
        // determine if horizontal or vertical
        let path = [];
        if (s.r === e.r) {
          const [start, end] = [Math.min(s.c, e.c), Math.max(s.c, e.c)];
          for (let i = start; i <= end; i++) path.push(`${s.r}-${i}`);
        } else if (s.c === e.c) {
          const [start, end] = [Math.min(s.r, e.r), Math.max(s.r, e.r)];
          for (let i = start; i <= end; i++) path.push(`${i}-${s.c}`);
        } else {
          clearSelection();
          selection.push({r, c});
          cell.classList.add('selected');
          return;
        }
        const word = path.map(k => { const [pr,pc] = k.split('-'); return grid[pr][pc]; }).join('');
        const reverse = word.split('').reverse().join('');
        const match = placed.find(p => p.clean === word || p.clean === reverse);
        if (match) {
          highlight(path);
          path.forEach(k => {
            const [r,c] = k.split('-').map(Number);
            const el = gridEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
            el.classList.remove('selected');
            el.classList.add('found');
          });
          area.querySelector(`.ws-word[data-w="${match.word.a}"]`).classList.add('found');
          foundCount++;
          document.getElementById('game-score').textContent = foundCount;
          updateGameProgress((foundCount / placed.length) * 100);
          if (foundCount === placed.length) {
            setTimeout(() => gameResult(area, 'Все слова найдены!', `Найдено: ${foundCount}/${placed.length}`, () => gameWordSearch(area, words)), 600);
          }
        } else {
          highlight(path);
          setTimeout(() => clearSelection(), 600);
        }
        selection = [];
      }
    };
  });
}

/* ============================
   GAME 10: DRAG & DROP
   ============================ */
function gameDragDrop(area, words) {
  const pool = shuffle(words).slice(0, Math.min(6, words.length));
  const arOrder = shuffle(pool);
  const ruOrder = shuffle(pool);
  let matchedCount = 0;
  area.innerHTML = `
    <div class="drag-game">
      <p style="text-align:center;color:var(--ink-soft);margin-bottom:.5rem">Перетащи арабские слова к их переводам</p>
      <div class="drag-columns">
        <div class="drag-column">
          <h4>Арабские слова</h4>
          ${arOrder.map(w => `<div class="drag-item ar-item" draggable="true" data-w="${w.a}">${w.a}</div>`).join('')}
        </div>
        <div class="drag-column">
          <h4>Переводы</h4>
          ${ruOrder.map(w => `<div class="drag-target" data-w="${w.a}">${w.r} ${w.e}</div>`).join('')}
        </div>
      </div>
    </div>
  `;
  let dragged = null;
  area.querySelectorAll('.drag-item').forEach(it => {
    it.addEventListener('dragstart', e => {
      dragged = it;
      it.classList.add('dragging');
    });
    it.addEventListener('dragend', () => it.classList.remove('dragging'));
  });
  area.querySelectorAll('.drag-target').forEach(tg => {
    tg.addEventListener('dragover', e => { e.preventDefault(); tg.classList.add('drag-over'); });
    tg.addEventListener('dragleave', () => tg.classList.remove('drag-over'));
    tg.addEventListener('drop', e => {
      e.preventDefault();
      tg.classList.remove('drag-over');
      if (!dragged) return;
      if (tg.dataset.w === dragged.dataset.w) {
        tg.classList.add('correct');
        tg.innerHTML = `<span class="ar" style="font-family:'Amiri',serif;font-size:1.4rem">${dragged.dataset.w}</span> = ${tg.textContent}`;
        dragged.style.visibility = 'hidden';
        matchedCount++;
        document.getElementById('game-score').textContent = matchedCount;
        updateGameProgress((matchedCount / pool.length) * 100);
        if (matchedCount === pool.length) {
          setTimeout(() => gameResult(area, 'Все пары соединены!', `${matchedCount} из ${pool.length}`, () => gameDragDrop(area, words)), 600);
        }
      } else {
        tg.classList.add('wrong');
        setTimeout(() => tg.classList.remove('wrong'), 500);
      }
    });
  });
}

/* ============================
   GAME 11: CATEGORY SORT
   ============================ */
function gameSort(area, words) {
  const cats = shuffle(Object.keys(DB.vocab)).slice(0, 3);
  const pool = [];
  cats.forEach(c => {
    shuffle(DB.vocab[c]).slice(0, 4).forEach(w => pool.push({...w, cat:c}));
  });
  const items = shuffle(pool);
  let sortedCount = 0;
  let correctCount = 0;
  area.innerHTML = `
    <div class="sort-game">
      <p style="text-align:center;color:var(--ink-soft);margin-bottom:1rem">Распредели слова по категориям</p>
      <div class="sort-words" id="sort-words">
        ${items.map(w => `<div class="sort-word" draggable="true" data-cat="${w.cat}" data-a="${w.a}">${w.a}</div>`).join('')}
      </div>
      <div class="sort-buckets">
        ${cats.map(c => `<div class="sort-bucket" data-cat="${c}"><h5>${DB.catLabels[c]}</h5></div>`).join('')}
      </div>
    </div>
  `;
  let dragged = null;
  area.querySelectorAll('.sort-word').forEach(w => {
    w.addEventListener('dragstart', () => dragged = w);
  });
  area.querySelectorAll('.sort-bucket').forEach(b => {
    b.addEventListener('dragover', e => { e.preventDefault(); b.classList.add('drag-over'); });
    b.addEventListener('dragleave', () => b.classList.remove('drag-over'));
    b.addEventListener('drop', e => {
      e.preventDefault();
      b.classList.remove('drag-over');
      if (!dragged) return;
      sortedCount++;
      if (dragged.dataset.cat === b.dataset.cat) {
        correctCount++;
        dragged.style.background = 'rgba(76,175,80,.15)';
        dragged.style.borderColor = 'var(--green)';
      } else {
        dragged.style.background = 'rgba(231,76,60,.15)';
        dragged.style.borderColor = '#e74c3c';
      }
      b.appendChild(dragged);
      document.getElementById('game-score').textContent = correctCount;
      updateGameProgress((sortedCount / items.length) * 100);
      if (sortedCount === items.length) {
        setTimeout(() => gameResult(area, 'Сортировка завершена!', `Правильно: ${correctCount} / ${items.length}`, () => gameSort(area, words)), 800);
      }
    });
  });
}

/* ============================
   GAME 12: SPEED TYPING
   ============================ */
function gameSpeed(area, words) {
  let score = 0;
  let timeLeft = 60;
  const used = new Set();
  area.innerHTML = `
    <div class="speed-game">
      <div class="speed-timer" id="sp-timer">${timeLeft}</div>
      <div class="speed-score">Очки: <strong id="sp-score">0</strong></div>
      <div class="speed-current" id="sp-current"></div>
      <input type="text" class="speed-input" id="sp-input" placeholder="Перевод на русском..." autocomplete="off"/>
      <p style="margin-top:1rem;color:var(--ink-soft);font-size:.85rem">Печатай перевод и нажимай Enter</p>
    </div>
  `;
  function nextWord() {
    const avail = words.filter(w => !used.has(w.a));
    if (avail.length === 0) used.clear();
    const w = pick(avail.length ? avail : words);
    used.add(w.a);
    document.getElementById('sp-current').textContent = w.a;
    return w;
  }
  let current = nextWord();
  const input = document.getElementById('sp-input');
  input.focus();
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const val = input.value.trim().toLowerCase();
      if (val === current.r.toLowerCase() || current.r.toLowerCase().includes(val) && val.length >= 3) {
        score++;
        document.getElementById('sp-score').textContent = score;
        document.getElementById('game-score').textContent = score;
        input.style.background = '#d4edda';
        setTimeout(() => input.style.background = '', 200);
      } else {
        input.style.background = '#f8d7da';
        setTimeout(() => input.style.background = '', 200);
      }
      input.value = '';
      current = nextWord();
    }
  });
  const timer = setInterval(() => {
    timeLeft--;
    document.getElementById('sp-timer').textContent = timeLeft;
    updateGameProgress(((60-timeLeft)/60)*100);
    if (timeLeft <= 10) document.getElementById('sp-timer').classList.add('warning');
    if (timeLeft <= 0) {
      clearInterval(timer);
      gameResult(area, 'Время вышло!', `Очки: ${score}`, () => gameSpeed(area, words));
    }
  }, 1000);
}

/* ============================
   GAME 13: SENTENCE BUILDER
   ============================ */
function gameBuilder(area, words) {
  const sentences = DB.sentences;
  let idx = 0, score = 0;
  function show() {
    if (idx >= sentences.length) {
      gameResult(area, 'Все собрано!', `Очки: ${score} / ${sentences.length}`, () => gameBuilder(area, words));
      return;
    }
    const s = sentences[idx];
    const scrambled = shuffle(s.words.map((w, i) => ({...w, oi:i})));
    let built = [];
    area.innerHTML = `
      <div class="builder-game">
        <p class="builder-target">Собери предложение: «${s.full.r}»</p>
        <div class="builder-slots" id="b-slots"></div>
        <div class="builder-words" id="b-pool">
          ${scrambled.map(w => `<button class="builder-word" data-oi="${w.oi}" data-a="${w.a}">${w.a}</button>`).join('')}
        </div>
        <div style="margin-top:1.5rem">
          <button class="btn btn-light" id="b-clear">↻ Сброс</button>
          <button class="btn btn-gold" id="b-check">Проверить</button>
        </div>
      </div>
    `;
    function refresh() {
      document.getElementById('b-slots').innerHTML = built.map(b => `<span class="builder-word" style="cursor:default">${b.a}</span>`).join('');
    }
    area.querySelectorAll('#b-pool .builder-word').forEach(w => {
      w.onclick = () => {
        if (w.classList.contains('used')) return;
        built.push({a:w.dataset.a, oi:+w.dataset.oi});
        w.classList.add('used');
        refresh();
      };
    });
    document.getElementById('b-clear').onclick = () => {
      built = [];
      area.querySelectorAll('#b-pool .builder-word').forEach(w => w.classList.remove('used'));
      refresh();
    };
    document.getElementById('b-check').onclick = () => {
      const ok = built.every((b, i) => b.oi === i) && built.length === s.words.length;
      if (ok) {
        score++;
        document.getElementById('game-score').textContent = score;
        toast('Идеально!', 'success');
      } else {
        toast(`Правильно: ${s.full.a}`, 'error');
      }
      updateGameProgress(((idx + 1) / sentences.length) * 100);
      setTimeout(() => { idx++; show(); }, 1200);
    };
  }
  show();
}

/* ============================
   GAME 14: MISSING LETTERS
   ============================ */
function gameMissing(area, words) {
  const pool = shuffle(words.filter(w => w.a.length >= 3)).slice(0, Math.min(10, words.length));
  let idx = 0, score = 0;
  function show() {
    if (idx >= pool.length) {
      gameResult(area, 'Готово!', `Очки: ${score} / ${pool.length}`, () => gameMissing(area, words));
      return;
    }
    const w = pool[idx];
    const chars = w.a.split('');
    const hideIdx = [];
    const numHide = Math.max(1, Math.floor(chars.length / 3));
    while (hideIdx.length < numHide) {
      const i = rand(0, chars.length - 1);
      if (!hideIdx.includes(i) && chars[i].trim()) hideIdx.push(i);
    }
    const inputs = chars.map((c, i) =>
      hideIdx.includes(i)
        ? `<div class="missing-box input"><input class="missing-input" data-i="${i}" data-c="${c}" maxlength="1"/></div>`
        : `<div class="missing-box">${c}</div>`
    ).join('');
    area.innerHTML = `
      <div class="missing-game">
        <div class="missing-emoji">${w.e}</div>
        <div class="missing-clue">${w.r} <span style="color:var(--gold-d);font-style:italic">(${w.t})</span></div>
        <div class="missing-word">${inputs}</div>
        <button class="btn btn-gold" id="ms-check">Проверить</button>
      </div>
    `;
    const ins = area.querySelectorAll('.missing-input');
    ins.forEach(i => { i.addEventListener('input', () => { if (i.value) { const next = i.parentNode.nextElementSibling?.querySelector('input'); next?.focus(); } }); });
    ins[0]?.focus();
    document.getElementById('ms-check').onclick = () => {
      let ok = true;
      ins.forEach(inp => {
        if (inp.value !== inp.dataset.c) ok = false;
      });
      if (ok) {
        score++;
        document.getElementById('game-score').textContent = score;
        toast('Правильно!', 'success');
      } else {
        toast(`Правильно: ${w.a}`, 'error');
      }
      updateGameProgress(((idx + 1) / pool.length) * 100);
      setTimeout(() => { idx++; show(); }, 1200);
    };
  }
  show();
}

/* ============================
   GAME 15: RACE (timed translations)
   ============================ */
function gameRace(area, words) {
  let score = 0;
  let timeLeft = 60;
  area.innerHTML = `
    <div class="speed-game">
      <div class="speed-timer" id="rc-timer">${timeLeft}</div>
      <div class="speed-score">Переведено: <strong id="rc-score">0</strong></div>
      <div class="speed-current" id="rc-current"></div>
      <p style="color:var(--gold-d);font-style:italic" id="rc-tr"></p>
      <div class="choice-options" id="rc-opts" style="margin-top:2rem"></div>
    </div>
  `;
  function nextRound() {
    const correct = pick(words);
    const wrong = shuffle(words.filter(w => w.r !== correct.r)).slice(0, 3);
    const opts = shuffle([correct, ...wrong]);
    document.getElementById('rc-current').textContent = correct.a;
    document.getElementById('rc-tr').textContent = correct.t;
    const optsEl = document.getElementById('rc-opts');
    optsEl.innerHTML = opts.map(o => `<button class="choice-option" data-c="${o.r === correct.r ? 1 : 0}">${o.r}</button>`).join('');
    optsEl.querySelectorAll('.choice-option').forEach(b => {
      b.onclick = () => {
        if (b.dataset.c === '1') {
          score++;
          document.getElementById('rc-score').textContent = score;
          document.getElementById('game-score').textContent = score;
          b.classList.add('correct');
          setTimeout(nextRound, 300);
        } else {
          b.classList.add('wrong');
          setTimeout(nextRound, 500);
        }
      };
    });
  }
  nextRound();
  const timer = setInterval(() => {
    timeLeft--;
    document.getElementById('rc-timer').textContent = timeLeft;
    updateGameProgress(((60-timeLeft)/60)*100);
    if (timeLeft <= 10) document.getElementById('rc-timer').classList.add('warning');
    if (timeLeft <= 0) {
      clearInterval(timer);
      gameResult(area, 'Время вышло! 🏁', `Переведено: ${score}`, () => gameRace(area, words));
    }
  }, 1000);
}

/* ============================
   GAME 16: PICTURE
   ============================ */
function gamePicture(area, words) {
  const pool = shuffle(words.filter(w => w.e && w.e.length > 0)).slice(0, Math.min(10, words.length));
  let idx = 0, score = 0;
  function show() {
    if (idx >= pool.length) {
      gameResult(area, 'Все картинки!', `Очки: ${score} / ${pool.length}`, () => gamePicture(area, words));
      return;
    }
    const w = pool[idx];
    const wrong = shuffle(words.filter(x => x.a !== w.a)).slice(0, 3);
    const opts = shuffle([w, ...wrong]);
    area.innerHTML = `
      <div class="picture-game">
        <p style="color:var(--ink-soft);font-size:1.1rem">Что это?</p>
        <div class="picture-emoji">${w.e}</div>
        <div class="picture-options">
          ${opts.map(o => `<button class="picture-option" data-c="${o.a === w.a ? 1 : 0}">${o.a}</button>`).join('')}
        </div>
      </div>
    `;
    area.querySelectorAll('.picture-option').forEach(b => {
      b.onclick = () => {
        if (b.dataset.c === '1') {
          score++; document.getElementById('game-score').textContent = score;
          b.classList.add('correct');
        } else {
          b.classList.add('wrong');
          area.querySelector('[data-c="1"]').classList.add('correct');
        }
        area.querySelectorAll('.picture-option').forEach(x => x.style.pointerEvents = 'none');
        updateGameProgress(((idx + 1) / pool.length) * 100);
        setTimeout(() => { idx++; show(); }, 1000);
      };
    });
  }
  show();
}

/* ============================
   GAME 17: LISTEN
   ============================ */
function gameListen(area, words) {
  const pool = shuffle(words).slice(0, Math.min(10, words.length));
  let idx = 0, score = 0;
  function show() {
    if (idx >= pool.length) {
      gameResult(area, 'Молодец!', `Очки: ${score} / ${pool.length}`, () => gameListen(area, words));
      return;
    }
    const w = pool[idx];
    const wrong = shuffle(words.filter(x => x.a !== w.a)).slice(0, 3);
    const opts = shuffle([w, ...wrong]);
    area.innerHTML = `
      <div class="listen-game">
        <p style="color:var(--ink-soft);font-size:1.1rem;margin-bottom:0">Послушай и выбери правильное слово</p>
        <button class="listen-play-btn" id="ls-play">🔊</button>
        <div class="picture-options">
          ${opts.map(o => `<button class="picture-option" data-c="${o.a === w.a ? 1 : 0}">${o.a}</button>`).join('')}
        </div>
      </div>
    `;
    setTimeout(() => speak(w.a), 400);
    document.getElementById('ls-play').onclick = () => speak(w.a);
    area.querySelectorAll('.picture-option').forEach(b => {
      b.onclick = () => {
        if (b.dataset.c === '1') {
          score++; document.getElementById('game-score').textContent = score;
          b.classList.add('correct');
        } else {
          b.classList.add('wrong');
          area.querySelector('[data-c="1"]').classList.add('correct');
        }
        area.querySelectorAll('.picture-option').forEach(x => x.style.pointerEvents = 'none');
        updateGameProgress(((idx + 1) / pool.length) * 100);
        setTimeout(() => { idx++; show(); }, 1100);
      };
    });
  }
  show();
}

/* ============================
   GAME 18: CROSSWORD (mini)
   ============================ */
function gameCrossword(area, words) {
  // Simple cross: 1 horizontal + 1 vertical sharing a letter
  const pool = shuffle(words.filter(w => {
    const c = w.a.replace(/[\sً-ٟ]/g,'');
    return c.length >= 3 && c.length <= 5;
  }));
  let h, v, shared = null;
  for (const wh of pool) {
    const hClean = wh.a.replace(/[\sً-ٟ]/g,'');
    for (const wv of pool) {
      if (wv === wh) continue;
      const vClean = wv.a.replace(/[\sً-ٟ]/g,'');
      for (let i = 0; i < hClean.length; i++) {
        for (let j = 0; j < vClean.length; j++) {
          if (hClean[i] === vClean[j]) {
            h = {word:wh, clean:hClean, idx:i};
            v = {word:wv, clean:vClean, idx:j};
            shared = {row:j, col:i};
            break;
          }
        }
        if (shared) break;
      }
      if (shared) break;
    }
    if (shared) break;
  }
  if (!shared) { area.innerHTML = '<p style="text-align:center">Не удалось построить кроссворд для этой категории. Попробуй другую.</p>'; return; }

  const rows = Math.max(v.clean.length, shared.row + 1);
  const cols = Math.max(h.clean.length, shared.col + 1);
  const cellEls = {};
  let html = `<div class="cw-grid" style="grid-template-columns:repeat(${cols},40px)">`;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const inH = r === shared.row && c < h.clean.length;
      const inV = c === shared.col && r < v.clean.length;
      if (inH || inV) {
        const num = (inH && c === 0) || (inV && r === 0) ? ((inH && c === 0 ? '1' : '') || (inV && r === 0 ? '2' : '')) : '';
        const correct = inH ? h.clean[c] : v.clean[r];
        html += `<div class="cw-cell"><input data-correct="${correct}" maxlength="1" data-r="${r}" data-c="${c}"/>${num?`<span class="cw-num">${num}</span>`:''}</div>`;
      } else {
        html += `<div class="cw-cell empty"></div>`;
      }
    }
  }
  html += `</div>`;
  area.innerHTML = `
    <div class="crossword-game">
      ${html}
      <div class="cw-clues">
        <div>
          <h4>По горизонтали:</h4>
          <div class="cw-clue">1. ${h.word.r} <em>(${h.word.t})</em></div>
        </div>
        <div>
          <h4>По вертикали:</h4>
          <div class="cw-clue">2. ${v.word.r} <em>(${v.word.t})</em></div>
        </div>
      </div>
      <div style="margin-top:1.5rem">
        <button class="btn btn-gold" id="cw-check">Проверить кроссворд</button>
        <button class="btn btn-light" id="cw-hint">💡 Подсказка</button>
      </div>
    </div>
  `;
  document.getElementById('cw-check').onclick = () => {
    let allRight = true, total = 0, right = 0;
    area.querySelectorAll('.cw-cell input').forEach(i => {
      total++;
      if (i.value === i.dataset.correct) { i.style.background = 'rgba(76,175,80,.2)'; right++; }
      else { i.style.background = 'rgba(231,76,60,.15)'; allRight = false; }
    });
    document.getElementById('game-score').textContent = right;
    updateGameProgress((right/total)*100);
    if (allRight) {
      setTimeout(() => gameResult(area, 'Кроссворд решён!', `${right}/${total}`, () => gameCrossword(area, words)), 700);
    } else {
      toast(`Правильно: ${right} из ${total}`, '');
    }
  };
  document.getElementById('cw-hint').onclick = () => {
    const empty = [...area.querySelectorAll('.cw-cell input')].filter(i => !i.value);
    if (empty.length) {
      const r = pick(empty);
      r.value = r.dataset.correct;
      r.style.background = 'rgba(255,235,59,.3)';
    }
  };
}

/* ============================
   GAME 19: CHAIN (relate by category)
   ============================ */
function gameChain(area, words) {
  let rounds = 8, idx = 0, score = 0;
  function show() {
    if (idx >= rounds) {
      gameResult(area, 'Цепочка собрана!', `Очки: ${score} / ${rounds}`, () => gameChain(area, words));
      return;
    }
    // pick a category and find related words
    const cat = pick(Object.keys(DB.vocab));
    const catWords = DB.vocab[cat];
    if (catWords.length < 2) { idx++; show(); return; }
    const target = pick(catWords);
    const related = pick(catWords.filter(w => w.a !== target.a));
    const unrelatedCats = Object.keys(DB.vocab).filter(c => c !== cat);
    const wrong1 = pick(DB.vocab[pick(unrelatedCats)]);
    const wrong2 = pick(DB.vocab[pick(unrelatedCats)]);
    const opts = shuffle([related, wrong1, wrong2, pick(DB.vocab[pick(unrelatedCats)])]);
    area.innerHTML = `
      <div class="chain-game">
        <p class="chain-question">Найди слово той же категории:</p>
        <div class="chain-target">${target.a} <span style="font-size:.5em;color:var(--ink-mute)">(${target.r})</span></div>
        <div class="chain-options">
          ${opts.map(o => `<button class="choice-option" data-c="${o.a === related.a ? 1 : 0}">${o.a} <small style="display:block;color:var(--ink-mute);font-family:inherit;font-size:.7rem">${o.r}</small></button>`).join('')}
        </div>
      </div>
    `;
    area.querySelectorAll('.choice-option').forEach(b => {
      b.onclick = () => {
        const ok = b.dataset.c === '1';
        b.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) area.querySelector('[data-c="1"]').classList.add('correct');
        if (ok) { score++; document.getElementById('game-score').textContent = score; }
        area.querySelectorAll('.choice-option').forEach(x => x.style.pointerEvents = 'none');
        updateGameProgress(((idx + 1) / rounds) * 100);
        setTimeout(() => { idx++; show(); }, 900);
      };
    });
  }
  show();
}

/* ============================
   GAME 20: TWO PLAYER
   ============================ */
function gameTwoPlayer(area, words) {
  let p1 = 0, p2 = 0;
  let rounds = 10, current = 0;
  let answered = false;

  function show() {
    if (current >= rounds) {
      const winner = p1 > p2 ? '🥇 Игрок 1' : p2 > p1 ? '🥇 Игрок 2' : '🤝 Ничья';
      area.innerHTML = `
        <div class="tp-game" style="position:relative;min-height:400px">
          <div class="tp-winner">
            <h2>${winner}</h2>
            <p>Игрок 1: ${p1} | Игрок 2: ${p2}</p>
            <div class="game-result__buttons">
              <button class="btn btn-gold" onclick="gameTwoPlayer(document.getElementById('game-area'), [${words.map(w=>'').join('')}])">🔄 Реванш</button>
              <button class="btn btn-outline" style="color:#fff;border-color:#fff" onclick="App.navigate('games')">К играм</button>
            </div>
          </div>
        </div>
      `;
      document.querySelector('.tp-winner .btn-gold').onclick = () => gameTwoPlayer(area, words);
      return;
    }
    const correct = pick(words);
    const wrong = shuffle(words.filter(w => w.r !== correct.r)).slice(0, 3);
    const opts = shuffle([correct, ...wrong]);
    answered = false;
    area.innerHTML = `
      <div class="tp-game">
        <div class="tp-side p1">
          <div class="tp-header">🔵 Игрок 1</div>
          <div class="tp-score">${p1}</div>
          <div class="tp-question">${correct.a}</div>
          <div class="tp-options">
            ${opts.map((o, i) => `<button class="tp-opt" data-side="1" data-c="${o.r === correct.r ? 1 : 0}">${i+1}. ${o.r}</button>`).join('')}
          </div>
          <div class="tp-keys">Клавиши: 1 2 3 4</div>
        </div>
        <div class="tp-side p2">
          <div class="tp-header">🔴 Игрок 2</div>
          <div class="tp-score">${p2}</div>
          <div class="tp-question">${correct.a}</div>
          <div class="tp-options">
            ${opts.map((o, i) => `<button class="tp-opt" data-side="2" data-c="${o.r === correct.r ? 1 : 0}">${i+1}. ${o.r}</button>`).join('')}
          </div>
          <div class="tp-keys">Клавиши: 7 8 9 0</div>
        </div>
      </div>
    `;
    function answer(side, isCorrect) {
      if (answered) return;
      answered = true;
      if (isCorrect) {
        if (side === 1) p1++;
        else p2++;
      }
      updateGameProgress(((current + 1) / rounds) * 100);
      document.getElementById('game-score').textContent = `${p1}:${p2}`;
      setTimeout(() => { current++; show(); }, 700);
    }
    area.querySelectorAll('.tp-opt').forEach(b => {
      b.onclick = () => answer(+b.dataset.side, b.dataset.c === '1');
    });
    // keyboard
    function keyHandler(e) {
      if (answered) return;
      const k = e.key;
      const map = {'1':[1,0],'2':[1,1],'3':[1,2],'4':[1,3],'7':[2,0],'8':[2,1],'9':[2,2],'0':[2,3]};
      if (map[k]) {
        const [side, optIdx] = map[k];
        const btn = area.querySelectorAll(`.tp-side.p${side} .tp-opt`)[optIdx];
        if (btn) {
          btn.style.background = side === 1 ? 'rgba(52,152,219,.3)' : 'rgba(231,76,60,.3)';
          answer(side, btn.dataset.c === '1');
          window.removeEventListener('keydown', keyHandler);
        }
      }
    }
    window.addEventListener('keydown', keyHandler);
  }
  show();
}

/* ============================
   GAME 21: COLUMNS MATCHING
   ============================ */
function gameColumns(area, words) {
  const pool = shuffle(words).slice(0, 6);
  const arOrder = shuffle(pool.map(w => ({...w, type:'ar'})));
  const ruOrder = shuffle(pool.map(w => ({...w, type:'ru'})));
  let selected = null;
  let matched = 0;
  area.innerHTML = `
    <div class="cols-game">
      <p style="text-align:center;color:var(--ink-soft);margin-bottom:1rem">Сопоставь арабские слова с переводами. Клик по одному, затем по другому.</p>
      <div class="cols-wrap">
        <div class="cols-list">
          ${arOrder.map(w => `<button class="cols-item ar" data-a="${w.a}">${w.a}</button>`).join('')}
        </div>
        <div class="cols-list">
          ${ruOrder.map(w => `<button class="cols-item" data-a="${w.a}">${w.r} ${w.e}</button>`).join('')}
        </div>
      </div>
    </div>
  `;
  area.querySelectorAll('.cols-item').forEach(b => {
    b.onclick = () => {
      if (b.classList.contains('matched')) return;
      if (selected === b) { b.classList.remove('selected'); selected = null; return; }
      if (!selected) {
        b.classList.add('selected');
        selected = b;
      } else {
        if (selected.dataset.a === b.dataset.a && selected !== b) {
          selected.classList.remove('selected');
          selected.classList.add('matched');
          b.classList.add('matched');
          matched++;
          document.getElementById('game-score').textContent = matched;
          updateGameProgress((matched / pool.length) * 100);
          if (matched === pool.length) {
            setTimeout(() => gameResult(area, 'Все слова сопоставлены!', `${matched} пар`, () => gameColumns(area, words)), 500);
          }
        } else {
          b.classList.add('wrong');
          selected.classList.add('wrong');
          setTimeout(() => {
            b.classList.remove('wrong');
            selected.classList.remove('wrong', 'selected');
            selected = null;
          }, 500);
          return;
        }
        selected = null;
      }
    };
  });
}

/* ============================
   GAME 22: SPEED CARDS
   ============================ */
function gameSpeedCard(area, words) {
  const deck = shuffle(words);
  let idx = 0, known = 0, learn = 0;
  function show() {
    if (idx >= deck.length) {
      gameResult(area, 'Колода пройдена!', `Знаю: ${known} | Учу: ${learn}`, () => gameSpeedCard(area, words));
      return;
    }
    const w = deck[idx];
    area.innerHTML = `
      <div class="speedcard-game">
        <p style="color:var(--ink-soft)">Карта <strong>${idx+1}</strong> из ${deck.length}</p>
        <div class="sc-card">
          <div class="sc-ar">${w.a}</div>
          <div class="sc-ru">${w.r}</div>
          <p style="color:var(--gold-l);font-size:.85rem;margin-top:.5rem">${w.t}</p>
        </div>
        <div class="sc-buttons">
          <button class="sc-btn learn" id="sc-learn">📖 Учить</button>
          <button class="sc-btn know" id="sc-know">✓ Знаю</button>
        </div>
      </div>
    `;
    document.getElementById('sc-know').onclick = () => {
      known++;
      // Тренировка: засчёт в «изученные» — только через тест по теме.
      document.getElementById('game-score').textContent = known;
      idx++;
      updateGameProgress((idx / deck.length) * 100);
      show();
    };
    document.getElementById('sc-learn').onclick = () => {
      learn++; idx++;
      updateGameProgress((idx / deck.length) * 100);
      show();
    };
    speak(w.a);
  }
  show();
}

/* ============================
   TESTS
   ============================ */
function renderTests() {
  const grid = document.getElementById('tests-grid');
  const html = [];
  // Per topic
  DB.grammar.forEach(g => {
    const score = state.progress.testScores[`grammar_${g.id}`];
    html.push(`
      <div class="test-card" onclick="startGrammarQuiz('${g.id}')">
        <span class="test-card__icon">📝</span>
        <div class="test-card__title">${g.title}</div>
        <div class="test-card__sub">Тест по теме</div>
        <div class="test-card__meta">
          <span>📚 ${g.quiz.length} вопросов</span>
        </div>
        ${score ? `<div class="test-card__score">Лучший: ${score.score}/${score.total}</div>` : ''}
      </div>
    `);
  });
  // Big tests (every 4 topics)
  for (let i = 0; i < DB.grammar.length; i += 4) {
    const end = Math.min(i + 4, DB.grammar.length);
    const topics = DB.grammar.slice(i, end);
    if (topics.length < 2) continue;
    const id = `big_${i}`;
    const score = state.progress.testScores[id];
    html.push(`
      <div class="test-card big" onclick="startBigTest('${id}', ${i}, ${end})">
        <span class="test-card__icon">⭐</span>
        <div class="test-card__title">Большой тест: ${topics[0].title.split(' ')[0]} → ${topics[topics.length-1].title.split(' ')[0]}</div>
        <div class="test-card__sub">Контроль усвоения тем ${i+1}-${end}</div>
        <div class="test-card__meta">
          <span>📚 ${topics.reduce((s,t)=>s+t.quiz.length,0)} вопросов</span>
        </div>
        ${score ? `<div class="test-card__score">Лучший: ${score.score}/${score.total}</div>` : ''}
      </div>
    `);
  }
  // Vocab tests
  Object.keys(DB.vocab).forEach(cat => {
    const id = `vocab_${cat}`;
    const score = state.progress.testScores[id];
    html.push(`
      <div class="test-card" onclick="startVocabTest('${cat}')">
        <span class="test-card__icon">📚</span>
        <div class="test-card__title">Тест: ${DB.catLabels[cat]}</div>
        <div class="test-card__sub">Проверь знания категории</div>
        <div class="test-card__meta">
          <span>${DB.vocab[cat].length} слов</span>
        </div>
        ${score ? `<div class="test-card__score">Лучший: ${score.score}/${score.total}</div>` : ''}
      </div>
    `);
  });
  // Final test
  const finalScore = state.progress.testScores['final'];
  html.push(`
    <div class="test-card big" onclick="startFinalTest()">
      <span class="test-card__icon">🏆</span>
      <div class="test-card__title">Итоговый экзамен</div>
      <div class="test-card__sub">Полный контроль всех знаний</div>
      <div class="test-card__meta">
        <span>📚 20 вопросов</span>
      </div>
      ${finalScore ? `<div class="test-card__score">Лучший: ${finalScore.score}/${finalScore.total}</div>` : ''}
    </div>
  `);
  grid.innerHTML = html.join('');
}

function startBigTest(id, from, to) {
  const topics = DB.grammar.slice(from, to);
  const questions = topics.flatMap(t => t.quiz);
  startTest({
    title: `Большой тест ${from+1}-${to}`,
    questions,
    onComplete: (score, total) => {
      state.progress.testScores[id] = {score, total, date: Date.now()};
      saveProgress();
    }
  });
}

function startVocabTest(cat) {
  const words = DB.vocab[cat];
  const pool = shuffle(words).slice(0, Math.min(20, words.length));
  const questions = pool.map(w => {
    const wrong = shuffle(allWords().filter(x => x.r !== w.r)).slice(0, 3);
    const opts = shuffle([w.r, ...wrong.map(x => x.r)]);
    return {
      q: `Что означает <span class="ar">${w.a}</span> (${w.t})?`,
      opts,
      ans: opts.indexOf(w.r)
    };
  });
  startTest({
    title: `Тест: ${DB.catLabels[cat]}`,
    questions,
    onComplete: (score, total) => {
      state.progress.testScores[`vocab_${cat}`] = {score, total, date: Date.now()};
      // Слова засчитываются как изученные ТОЛЬКО при сдаче теста (≥60%)
      if (total > 0 && score / total >= 0.6) {
        let added = 0;
        (DB.vocab[cat] || []).forEach(w => {
          if (!state.progress.learnedWords.includes(w.a)) { state.progress.learnedWords.push(w.a); added++; }
        });
        setTimeout(() => toast(added > 0
          ? `✅ Тема пройдена! ${added} ${plural(added,['слово','слова','слов'])} засчитано как изученные`
          : '✅ Тема пройдена! Все слова уже были изученными', 'success'), 400);
      } else {
        setTimeout(() => toast('Тест не сдан (нужно ≥60%). Слова не засчитаны — попробуй ещё раз', 'error'), 400);
      }
      saveProgress();
      checkAchievements();
    }
  });
}

function startFinalTest() {
  const grammarQ = shuffle(DB.grammar.flatMap(g => g.quiz)).slice(0, 10);
  const vocabQ = shuffle(allWords()).slice(0, 10).map(w => {
    const wrong = shuffle(allWords().filter(x => x.r !== w.r)).slice(0, 3);
    const opts = shuffle([w.r, ...wrong.map(x => x.r)]);
    return {
      q: `Что означает <span class="ar">${w.a}</span>?`,
      opts,
      ans: opts.indexOf(w.r)
    };
  });
  startTest({
    title: '🏆 Итоговый экзамен',
    questions: shuffle([...grammarQ, ...vocabQ]),
    onComplete: (score, total) => {
      state.progress.testScores['final'] = {score, total, date: Date.now()};
      saveProgress();
    }
  });
}

function startTest({ title, questions, onComplete }) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-test-active').classList.add('active');
  document.getElementById('test-title-bar').textContent = title;
  document.getElementById('test-q-total').textContent = questions.length;

  let idx = 0, score = 0;
  let answers = [];

  function show() {
    if (idx >= questions.length) {
      // results
      const pct = Math.round((score / questions.length) * 100);
      const passed = pct >= 60;
      document.getElementById('test-area').innerHTML = `
        <div class="test-results">
          <div class="test-results__grade ${passed?'':'fail'}">${passed ? 'Зачёт!' : 'Не сдано'}</div>
          <div class="test-results__score">${score}/${questions.length}</div>
          <p class="test-results__sub">${pct}% правильных ответов</p>
          <div class="test-results__breakdown">
            <div class="tr-stat"><strong>${score}</strong><span>Правильно</span></div>
            <div class="tr-stat"><strong>${questions.length-score}</strong><span>Ошибок</span></div>
            <div class="tr-stat"><strong>${pct}%</strong><span>Результат</span></div>
          </div>
          <button class="btn btn-gold" id="test-retry">🔄 Пройти снова</button>
          <button class="btn btn-light" id="test-done" style="margin-left:1rem">Вернуться</button>
        </div>
      `;
      document.getElementById('test-retry').onclick = () => startTest({title, questions, onComplete});
      document.getElementById('test-done').onclick = () => App.navigate('tests');
      if (passed) confetti();
      onComplete && onComplete(score, questions.length);
      return;
    }
    const q = questions[idx];
    document.getElementById('test-q-num').textContent = idx + 1;
    document.getElementById('test-progress-fill').style.width = ((idx) / questions.length * 100) + '%';
    document.getElementById('test-area').innerHTML = `
      <div class="test-question">${q.q}</div>
      <div class="test-options">
        ${q.opts.map((o, i) => `<button class="test-option" data-i="${i}">${o}</button>`).join('')}
      </div>
      <div class="test-actions">
        <button class="btn btn-light" id="test-skip">⏭ Пропустить</button>
        <button class="btn btn-gold" id="test-confirm" disabled>Подтвердить</button>
      </div>
    `;
    let selected = null;
    document.querySelectorAll('.test-option').forEach(o => {
      o.onclick = () => {
        document.querySelectorAll('.test-option').forEach(x => x.classList.remove('selected'));
        o.classList.add('selected');
        selected = +o.dataset.i;
        document.getElementById('test-confirm').disabled = false;
      };
    });
    document.getElementById('test-skip').onclick = () => { idx++; show(); };
    document.getElementById('test-confirm').onclick = () => {
      const ok = selected === q.ans;
      document.querySelectorAll('.test-option').forEach((x, i) => {
        x.style.pointerEvents = 'none';
        if (i === q.ans) x.classList.add('correct');
        if (i === selected && !ok) x.classList.add('incorrect');
      });
      if (ok) score++;
      answers.push({q, selected, correct: q.ans});
      setTimeout(() => { idx++; show(); }, 1200);
    };
  }
  show();
}

/* ============================
   PROGRESS DASHBOARD
   ============================ */
function renderProgress() {
  const p = state.progress;
  const wordsTotal = allWords().length;
  const wordsPct = Math.round((p.learnedWords.length / wordsTotal) * 100);
  const lettersPct = Math.round((p.learnedLetters.length / 28) * 100);
  const grammarPct = Math.round((p.passedGrammar.length / DB.grammar.length) * 100);

  const layout = document.getElementById('progress-layout');
  const nothingYet = p.learnedWords.length === 0 && p.passedGrammar.length === 0 &&
    p.learnedLetters.length === 0 && (p.gamesPlayed || 0) === 0;
  if (nothingYet) {
    layout.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__art">
          <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
            <circle cx="60" cy="60" r="56" fill="none" stroke="var(--gold)" stroke-width="2" opacity=".5"/>
            <path d="M60 16 L73 47 L106 50 L81 71 L89 104 L60 86 L31 104 L39 71 L14 50 L47 47 Z" fill="var(--gold)" opacity=".18" stroke="var(--gold)" stroke-width="1.5"/>
            <text x="60" y="74" text-anchor="middle" font-size="40" style="font-family:var(--ar-font)">ع</text>
          </svg>
        </div>
        <h3>Здесь будет твой прогресс 🌙</h3>
        <p>Пока пусто. Выучи первые слова и пройди тест по теме — появятся проценты, достижения и ранги. Путь в тысячу слов начинается с одного! 🌟</p>
        <div class="empty-state__btns">
          <button class="btn btn-gold" onclick="App.navigate('vocab')">📚 Начать со слов</button>
          <button class="btn btn-outline" onclick="App.navigate('alphabet')">الأ Выучить алфавит</button>
        </div>
      </div>`;
    return;
  }
  layout.innerHTML = `
    <div class="progress-col-left">
    <div class="progress-card">
      <h3>Общий прогресс</h3>
      <div class="progress-ring">
        <svg class="ring-svg" width="140" height="140" viewBox="0 0 140 140">
          <defs>
            <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#d4af37"/>
              <stop offset="100%" stop-color="#f9c846"/>
            </linearGradient>
          </defs>
          <circle class="ring-bg" cx="70" cy="70" r="60"/>
          <circle class="ring-fill" cx="70" cy="70" r="60"
            stroke-dasharray="${2*Math.PI*60}"
            stroke-dashoffset="${2*Math.PI*60 * (1 - wordsPct/100)}"/>
          <text class="ring-text" x="70" y="78" text-anchor="middle" transform="rotate(90 70 70)">${wordsPct}%</text>
        </svg>
        <div class="ring-info">
          <p>Слов изучено</p>
          <strong>${p.learnedWords.length} / ${wordsTotal}</strong>
          <p style="margin-top:.5rem">Букв: ${p.learnedLetters.length}/28</p>
          <p>Грамматика: ${p.passedGrammar.length}/${DB.grammar.length}</p>
          <p>Игр сыграно: ${p.gamesPlayed}</p>
        </div>
      </div>
    </div>

    <div class="progress-card">
      <h3>Достижения</h3>
      <div class="achievement-list">
        ${ACHIEVEMENTS.map(a => `
          <div class="achievement ${p.achievements.includes(a.id) ? 'earned' : ''}">
            <span class="achievement-icon">${a.icon}</span>
            <div class="achievement-info">
              <strong>${a.name}</strong>
              <p>${a.desc}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="progress-card">
      <h3>Результаты тестов</h3>
      ${Object.keys(p.testScores).length === 0
        ? '<p style="color:var(--ink-mute);text-align:center;padding:2rem 0">Пока нет результатов. Пройди тесты!</p>'
        : Object.entries(p.testScores).map(([k,v]) => {
          let name = k;
          if (k.startsWith('grammar_')) {
            const g = DB.grammar.find(x => x.id === k.replace('grammar_',''));
            name = '📖 ' + (g?.title || k);
          } else if (k.startsWith('vocab_')) {
            name = '📚 ' + DB.catLabels[k.replace('vocab_','')];
          } else if (k.startsWith('big_')) {
            name = '⭐ Большой тест';
          } else if (k === 'final') {
            name = '🏆 Итоговый экзамен';
          }
          const pct = Math.round(v.score/v.total*100);
          return `<div class="cat-progress-row">
            <span class="cat-progress-name">${name}</span>
            <div class="cat-progress-bar"><div class="cat-progress-fill" style="width:${pct}%; background: ${pct>=60?'linear-gradient(90deg,#2ecc71,#27ae60)':'linear-gradient(90deg,#e74c3c,#c0392b)'}"></div></div>
            <span class="cat-progress-num">${v.score}/${v.total}</span>
          </div>`;
        }).join('')
      }
      <button class="btn btn-light btn-sm" style="margin-top:1rem" onclick="resetProgress()">🗑 Сбросить весь прогресс</button>
    </div>
    </div>

    <div class="progress-col-right">
    <div class="progress-card">
      <h3>Прогресс по категориям</h3>
      <div class="cat-progress">
        ${Object.keys(DB.vocab).map(c => {
          const cw = DB.vocab[c];
          const learned = cw.filter(w => p.learnedWords.includes(w.a)).length;
          const pct = Math.round(learned / cw.length * 100);
          return `<div class="cat-progress-row">
            <span class="cat-progress-name">${DB.catLabels[c]}</span>
            <div class="cat-progress-bar"><div class="cat-progress-fill" style="width:${pct}%"></div></div>
            <span class="cat-progress-num">${learned}/${cw.length}</span>
          </div>`;
        }).join('')}
      </div>
    </div>
    </div>
  `;
}

function resetProgress() {
  if (confirm('Уверены? Весь прогресс будет удалён.')) {
    state.progress = { ...defaultProgress };
    saveProgress();
    location.reload();
  }
}
window.resetProgress = resetProgress;

/* ============================
   INIT
   ============================ */
function init() {
  // Welcome / founder splash on entry
  (function () {
    const ov = document.getElementById('welcome-overlay');
    if (!ov) return;
    ov.style.display = 'flex';
    requestAnimationFrame(() => ov.classList.add('show'));
    document.body.classList.add('welcome-open');
    const close = () => {
      ov.classList.remove('show');
      document.body.classList.remove('welcome-open');
      setTimeout(() => { ov.style.display = 'none'; }, 380);
      try { if (window.staggerView) staggerView(document.querySelector('.view.active')); } catch (e) {}
      // при первом входе — вводный тур + тест на уровень
      if (window.maybeStartOnboarding) setTimeout(() => maybeStartOnboarding(), 430);
    };
    const startBtn = document.getElementById('welcome-start');
    if (startBtn) startBtn.addEventListener('click', close);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && ov.style.display !== 'none') close();
    });
  })();

  // Sub-nav for vocab
  const vocabSub = document.getElementById('vocab-sub');
  vocabSub.innerHTML = Object.keys(DB.vocab).map(c =>
    `<li><a href="#" data-cat="${c}">${DB.catLabels[c]}</a></li>`
  ).join('');

  // Nav clicks
  document.querySelectorAll('.nav-item[data-view]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      App.navigate(a.dataset.view);
    });
  });

  // Vocab main link
  const vocabMainLink = document.querySelector('.nav-vocab-main');
  if (vocabMainLink) {
    vocabMainLink.addEventListener('click', e => {
      e.preventDefault();
      App.navigate('vocaboverview');
    });
  }

  // Vocab toggle (arrow button)
  const vocabToggle = document.querySelector('[data-group="vocab"]');
  if (vocabToggle) {
    vocabToggle.addEventListener('click', e => {
      e.preventDefault();
      vocabToggle.closest('.nav-group').classList.toggle('open');
    });
  }

  // Sub-nav clicks
  vocabSub.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      App.navigate('vocab', a.dataset.cat);
    });
  });

  // Sidebar toggle (mobile)
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Modal close
  document.getElementById('modal-close').addEventListener('click', closeLetterModal);
  document.getElementById('letter-modal').addEventListener('click', e => {
    if (e.target.id === 'letter-modal') closeLetterModal();
  });

  // Alphabet filters
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      renderAlphabet(b.dataset.filter);
    });
  });

  // Vocab view mode
  document.querySelectorAll('.view-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.view-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      state.vocabViewMode = b.dataset.vmode;
      renderVocabGrid(wordsByCategory(state.currentCategory), state.vocabViewMode);
    });
  });

  // Vocab search
  document.getElementById('vocab-search').addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    const all = wordsByCategory(state.currentCategory);
    const filtered = q ? all.filter(w =>
      w.a.includes(q) || w.t.toLowerCase().includes(q) || w.r.toLowerCase().includes(q)
    ) : all;
    renderVocabGrid(filtered, state.vocabViewMode);
  });

  // Vocab play buttons
  document.getElementById('vocab-play-btn').addEventListener('click', () => {
    launchGame('flashcard', wordsByCategory(state.currentCategory));
  });
  document.getElementById('vocab-test-btn').addEventListener('click', () => {
    startVocabTest(state.currentCategory);
  });
  document.getElementById('vocab-srs-btn')?.addEventListener('click', () => {
    if (window.srsAddCategory) {
      const n = srsAddCategory(state.currentCategory);
      toast(n > 0 ? `🔁 ${n} слов добавлено в повторение` : 'Все слова темы уже в повторении', 'success');
    }
  });

  // Game back
  document.getElementById('game-back-btn').addEventListener('click', () => App.navigate('games'));
  document.getElementById('test-back-btn').addEventListener('click', () => App.navigate('tests'));

  // Game category change
  document.getElementById('game-category-select').addEventListener('change', () => {});

  // ESC closes modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLetterModal();
  });

  // Voice gender toggle
  document.querySelectorAll('.voice-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.gender === state.voiceGender);
    b.addEventListener('click', () => {
      setVoiceGender(b.dataset.gender);
      speak('السَّلَامُ عَلَيْكُم', {gender:b.dataset.gender});
    });
  });

  // Update streak and init
  updateStreak();
  document.getElementById('streak-count').textContent = state.progress.streak;
  checkAchievements();
  renderHome();
  renderTests();
}

// Boot
init();
