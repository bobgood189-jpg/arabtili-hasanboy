/* ============================================================
   features.js — новые возможности (загружается ПОСЛЕ main.js)
   • SRS (интервальное повторение)
   • Спряжение глаголов + тренажёр
   • Диалоги по ситуациям (озвучка)
   • Тексты для чтения (перевод по тапу)
   • Диктант на слух (игра)
   • Тёмная тема, «медленная» озвучка
   • Бэкап прогресса (экспорт/импорт)
   • Ежедневная цель, заморозка стрика, уведомления
   • PWA (service worker) + доп. достижения
   ============================================================ */
(function () {
  if (typeof DB === 'undefined' || typeof state === 'undefined') return;
  const P = () => state.progress;
  const stripHarakat = s => (s || '').replace(/[ً-ْٰـ]/g, '');

  /* =========================================================
     ДОП. ПОЛЯ ПРОГРЕССА
     ========================================================= */
  if (!P().srs) P().srs = {};
  if (!P().dailyGoal) P().dailyGoal = 10;
  if (P().streakFreeze == null) P().streakFreeze = 1;
  if (!P().dailyLog) P().dailyLog = {};   // {dateStr: reviewsDone}
  saveProgress();

  /* =========================================================
     SRS — интервальное повторение (SM-2 lite)
     ========================================================= */
  const DAY = 86400000;
  function srsCard() { return { due: Date.now(), interval: 0, ease: 2.3, reps: 0, lapses: 0 }; }
  function srsSyncLearned() {
    (P().learnedWords || []).forEach(k => { if (!P().srs[k]) P().srs[k] = srsCard(); });
    saveProgress();
  }
  function srsAddCategory(cat) {
    let n = 0;
    (DB.vocab[cat] || []).forEach(w => { if (!P().srs[w.a]) { P().srs[w.a] = srsCard(); n++; } });
    saveProgress();
    return n;
  }
  window.srsAddCategory = srsAddCategory;
  function srsDueKeys() {
    const now = Date.now();
    return Object.keys(P().srs).filter(k => P().srs[k].due <= now);
  }
  function srsNewCount() { return Object.values(P().srs).filter(c => c.reps === 0).length; }
  function srsPreview(card, grade) {
    const c = { ...card };
    if (grade === 0) return 'через 1 мин';
    if (grade === 1) { const i = c.interval < 1 ? 1 : Math.round(c.interval * 1.2); return i + (i === 1 ? ' день' : ' дн.'); }
    const i = c.reps === 0 ? 1 : (c.interval <= 1 ? 3 : Math.round(c.interval * c.ease));
    return i + (i === 1 ? ' день' : ' дн.');
  }
  function srsGrade(key, grade) {
    const c = P().srs[key] || srsCard();
    if (grade === 0) { c.interval = 0; c.reps = 0; c.lapses++; c.ease = Math.max(1.3, c.ease - 0.2); c.due = Date.now() + 60000; }
    else if (grade === 1) { c.interval = c.interval < 1 ? 1 : Math.round(c.interval * 1.2); c.ease = Math.max(1.3, c.ease - 0.05); c.reps++; c.due = Date.now() + c.interval * DAY; }
    else { c.interval = c.reps === 0 ? 1 : (c.interval <= 1 ? 3 : Math.round(c.interval * c.ease)); c.ease = Math.min(2.8, c.ease + 0.02); c.reps++; c.due = Date.now() + c.interval * DAY; }
    P().srs[key] = c;
    const today = new Date().toDateString();
    P().dailyLog[today] = (P().dailyLog[today] || 0) + 1;
    saveProgress();
  }
  function wordByKey(k) { return allWords().find(w => w.a === k) || { a: k, t: '', r: '?', e: '📘' }; }

  function renderSRS() {
    srsSyncLearned();
    const el = document.getElementById('srs-content');
    if (!el) return;
    const due = srsDueKeys().length;
    const total = Object.keys(P().srs).length;
    const today = new Date().toDateString();
    const doneToday = P().dailyLog[today] || 0;
    const goal = P().dailyGoal;
    const goalPct = Math.min(100, Math.round(doneToday / goal * 100));
    el.innerHTML = `
      <div class="srs-stats">
        <div class="srs-stat"><span class="srs-stat__num">${due}</span><span class="srs-stat__lbl">к повторению</span></div>
        <div class="srs-stat"><span class="srs-stat__num">${total}</span><span class="srs-stat__lbl">всего карточек</span></div>
        <div class="srs-stat"><span class="srs-stat__num">${srsNewCount()}</span><span class="srs-stat__lbl">новых</span></div>
      </div>
      <div class="srs-goal">
        <div class="srs-goal__head"><span>🎯 Цель на сегодня</span><strong>${doneToday} / ${goal}</strong></div>
        <div class="srs-goal__bar"><div class="srs-goal__fill" style="width:${goalPct}%"></div></div>
      </div>
      ${total === 0 ? `
        <div class="srs-empty">
          <span>🗂️</span>
          <p>Колода пуста. Добавь слова из словаря — открой тему и нажми «Учить эту тему», или просто отмечай слова изученными.</p>
          <button class="btn btn-gold" onclick="App.navigate('vocaboverview')">📚 К словарю</button>
        </div>` : `
        <div class="srs-actions">
          ${due > 0
            ? `<button class="btn btn-gold" id="srs-start">▶️ Повторить (${due})</button>`
            : `<p class="srs-done">✅ На сегодня всё повторено! Возвращайся завтра.</p>`}
          <button class="btn btn-outline" id="srs-add-learned">➕ Добавить выученные слова</button>
        </div>`}
      <div id="srs-review"></div>
    `;
    const start = document.getElementById('srs-start');
    if (start) start.onclick = () => startSRSReview();
    const addL = document.getElementById('srs-add-learned');
    if (addL) addL.onclick = () => { srsSyncLearned(); toast('Выученные слова добавлены в повторение', 'success'); renderSRS(); };
  }
  window.renderSRS = renderSRS;

  function startSRSReview() {
    const queue = shuffle(srsDueKeys());
    const total = queue.length;
    let done = 0;
    const box = document.getElementById('srs-review');
    document.querySelector('.srs-actions')?.style && (document.querySelector('.srs-actions').style.display = 'none');

    function next() {
      if (!queue.length) {
        box.innerHTML = `<div class="srs-finish"><span>🎉</span><h3>Сессия завершена!</h3><p>Повторено карточек: ${done}</p>
          <button class="btn btn-gold" onclick="renderSRS()">Готово</button></div>`;
        confetti();
        checkAchievements();
        return;
      }
      const key = queue.shift();
      const w = wordByKey(key);
      const card = P().srs[key];
      box.innerHTML = `
        <div class="srs-progress">Осталось: ${queue.length + 1} · готово: ${done}/${total}</div>
        <div class="srs-card" id="srs-card">
          <div class="srs-card__inner">
          <div class="srs-card__face srs-front">
            <div class="srs-emoji">${w.e || ''}</div>
            <div class="srs-ar">${w.a}</div>
            <button class="btn btn-light btn-sm srs-speak">🔊 Произнести</button>
            <p class="srs-hint">Нажми, чтобы увидеть перевод</p>
          </div>
          <div class="srs-card__face srs-back">
            <div class="srs-ar small">${w.a}</div>
            <div class="srs-tr">${w.t || ''}</div>
            <div class="srs-ru">${w.r}</div>
            <div class="srs-grade">
              <button class="srs-g again" data-g="0">🔴 Повторить<small>${srsPreview(card,0)}</small></button>
              <button class="srs-g hard" data-g="1">🟡 Трудно<small>${srsPreview(card,1)}</small></button>
              <button class="srs-g good" data-g="2">🟢 Знаю<small>${srsPreview(card,2)}</small></button>
            </div>
          </div>
          </div>
        </div>`;
      const cardEl = document.getElementById('srs-card');
      const reveal = () => { cardEl.classList.add('flipped'); };
      cardEl.querySelector('.srs-front').addEventListener('click', e => { if (!e.target.closest('.srs-speak')) reveal(); });
      cardEl.querySelector('.srs-speak').onclick = (e) => { e.stopPropagation(); speak(w.a); };
      setTimeout(() => speak(w.a), 250);
      cardEl.querySelectorAll('.srs-g').forEach(b => b.onclick = () => {
        const g = +b.dataset.g;
        srsGrade(key, g);
        if (g === 0) queue.push(key); // снова в этой сессии
        else done++;
        next();
      });
    }
    next();
  }

  /* =========================================================
     СПРЯЖЕНИЕ ГЛАГОЛОВ
     ========================================================= */
  let _conjVerb = 0;
  function renderConjugation() {
    const el = document.getElementById('conjugation-content');
    if (!el) return;
    const C = DB.conjugation;
    const v = C.verbs[_conjVerb];
    const rows = C.pronouns.map(p => `
      <tr>
        <td class="cj-pron"><span class="ar">${p.ar}</span><span class="cj-pron__ru">${p.ru}</span></td>
        <td class="cj-cell"><span class="ar">${v.past[p.id]}</span></td>
        <td class="cj-cell"><span class="ar">${v.present[p.id]}</span></td>
      </tr>`).join('');
    el.innerHTML = `
      <div class="cj-verbs">
        ${C.verbs.map((x, i) => `<button class="cj-vbtn ${i === _conjVerb ? 'active' : ''}" data-i="${i}"><span class="ar">${x.inf}</span><small>${x.meaning}</small></button>`).join('')}
      </div>
      <div class="cj-table-wrap">
        <div class="cj-head">
          <h3><span class="ar">${v.inf}</span> — ${v.meaning}</h3>
          <span class="cj-root">корень: ${v.root} · порода ${v.form}</span>
          <button class="btn btn-light btn-sm" id="cj-speak">🔊 ${v.inf}</button>
        </div>
        <table class="cj-table">
          <thead><tr><th>Местоимение</th><th>Прошедшее (الماضي)</th><th>Настоящее (المضارع)</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="cj-forms">
        <h3>Породы глагола (الأوزان) I–X</h3>
        <table class="cj-table">
          <thead><tr><th>№</th><th>Модель</th><th>Пример</th><th>Значение</th></tr></thead>
          <tbody>${C.forms.map(f => `<tr><td><b>${f.n}</b></td><td><span class="ar">${f.model}</span></td><td><span class="ar">${f.ex}</span></td><td>${f.meaning}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="cj-trainer-launch">
        <button class="btn btn-gold" id="cj-train">🎯 Тренажёр: проспрягай глагол</button>
      </div>
      <div id="cj-trainer"></div>
    `;
    el.querySelectorAll('.cj-vbtn').forEach(b => b.onclick = () => { _conjVerb = +b.dataset.i; renderConjugation(); });
    document.getElementById('cj-speak').onclick = () => speak(v.inf);
    document.getElementById('cj-train').onclick = () => startConjTrainer();
  }
  window.renderConjugation = renderConjugation;

  function startConjTrainer() {
    const C = DB.conjugation;
    const box = document.getElementById('cj-trainer');
    const N = 8;
    let idx = 0, score = 0;
    const qs = [];
    for (let i = 0; i < N; i++) {
      const v = pick(C.verbs);
      const tense = pick(['past', 'present']);
      const pr = pick(C.pronouns);
      const correct = v[tense][pr.id];
      // дистракторы: те же формы из других местоимений/времён/глаголов
      const pool = new Set();
      C.pronouns.forEach(p => { pool.add(v.past[p.id]); pool.add(v.present[p.id]); });
      pool.delete(correct);
      const wrong = shuffle([...pool]).slice(0, 3);
      qs.push({ v, tense, pr, correct, opts: shuffle([correct, ...wrong]) });
    }
    function show() {
      if (idx >= qs.length) {
        box.innerHTML = `<div class="srs-finish"><span>🎉</span><h3>Готово!</h3><p>Результат: ${score} / ${qs.length}</p>
          <button class="btn btn-gold" id="cj-again">🔄 Ещё раз</button></div>`;
        document.getElementById('cj-again').onclick = startConjTrainer;
        if (score === qs.length) confetti();
        return;
      }
      const q = qs[idx];
      box.innerHTML = `
        <div class="cj-q">
          <p class="cj-q__num">Вопрос ${idx + 1} из ${qs.length} · очки: ${score}</p>
          <p class="cj-q__task">Проспрягай <b class="ar">${q.v.inf}</b> (${q.v.meaning})<br>
             ${q.tense === 'past' ? 'прошедшее время' : 'настоящее время'}, <b>${q.pr.ru}</b> (<span class="ar">${q.pr.ar}</span>)</p>
          <div class="cj-opts">${q.opts.map(o => `<button class="cj-opt ar" data-o="${o}">${o}</button>`).join('')}</div>
        </div>`;
      box.querySelectorAll('.cj-opt').forEach(b => b.onclick = () => {
        const ok = b.dataset.o === q.correct;
        if (ok) { score++; b.classList.add('correct'); }
        else { b.classList.add('wrong'); box.querySelector(`.cj-opt[data-o="${q.correct}"]`).classList.add('correct'); }
        box.querySelectorAll('.cj-opt').forEach(x => x.style.pointerEvents = 'none');
        speak(q.correct);
        setTimeout(() => { idx++; show(); }, 1100);
      });
    }
    show();
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* =========================================================
     ДИАЛОГИ
     ========================================================= */
  function renderDialogues() {
    const el = document.getElementById('dialogues-content');
    if (!el) return;
    el.innerHTML = `<div class="dlg-grid">${DB.dialogues.map(d => `
      <div class="dlg-card" data-id="${d.id}">
        <span class="dlg-card__icon">${d.icon}</span>
        <div class="dlg-card__title">${d.title}</div>
        <div class="dlg-card__sub">${d.sub}</div>
      </div>`).join('')}</div>
      <div id="dlg-open"></div>`;
    el.querySelectorAll('.dlg-card').forEach(c => c.onclick = () => openDialogue(c.dataset.id));
  }
  window.renderDialogues = renderDialogues;

  function openDialogue(id) {
    const d = DB.dialogues.find(x => x.id === id);
    const box = document.getElementById('dlg-open');
    box.innerHTML = `
      <div class="dlg-view">
        <div class="dlg-view__head">
          <h3>${d.icon} ${d.title}</h3>
          <button class="btn btn-gold btn-sm" id="dlg-play">▶️ Прослушать диалог</button>
        </div>
        <p class="dlg-hint">👂 Слушай и переводи сам! Нажми на реплику, чтобы увидеть её перевод — или открой весь перевод кнопкой внизу.</p>
        <div class="dlg-lines">
          ${d.lines.map((l, i) => `
            <div class="dlg-line ${l.s === 'A' ? 'a' : 'b'}" data-i="${i}">
              <div class="dlg-bubble">
                <div class="dlg-ar ar">${l.a}</div>
                <button class="dlg-speak" data-i="${i}">🔊</button>
                <div class="dlg-trans" style="display:none">
                  <div class="dlg-tr">${l.t}</div>
                  <div class="dlg-ru">${l.r}</div>
                </div>
              </div>
            </div>`).join('')}
        </div>
        <div class="dlg-reveal-wrap">
          <button class="btn btn-outline" id="dlg-reveal">👁 Показать перевод диалога</button>
        </div>
      </div>`;
    box.querySelectorAll('.dlg-speak').forEach(b => b.onclick = (e) => {
      e.stopPropagation();
      const l = d.lines[+b.dataset.i];
      speak(l.a, { gender: l.s === 'A' ? 'female' : 'male' });
    });
    // тап по реплике — показать/скрыть её перевод
    box.querySelectorAll('.dlg-line').forEach(line => line.addEventListener('click', (e) => {
      if (e.target.closest('.dlg-speak')) return;
      const tr = line.querySelector('.dlg-trans');
      tr.style.display = (tr.style.display === 'none') ? 'block' : 'none';
    }));
    // кнопка внизу — показать/скрыть весь перевод
    const reveal = document.getElementById('dlg-reveal');
    reveal.onclick = () => {
      const showing = reveal.dataset.s === '1';
      box.querySelectorAll('.dlg-trans').forEach(t => t.style.display = showing ? 'none' : 'block');
      reveal.textContent = showing ? '👁 Показать перевод диалога' : '🙈 Скрыть перевод';
      reveal.dataset.s = showing ? '0' : '1';
    };
    let playing = false;
    document.getElementById('dlg-play').onclick = function () {
      if (playing) return; playing = true;
      let i = 0;
      const lines = box.querySelectorAll('.dlg-line');
      const step = () => {
        if (i >= d.lines.length) { playing = false; lines.forEach(x => x.classList.remove('speaking')); return; }
        lines.forEach(x => x.classList.remove('speaking'));
        lines[i].classList.add('speaking');
        lines[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
        // оба голоса: A — женский, B — мужской
        speak(d.lines[i].a, { gender: d.lines[i].s === 'A' ? 'female' : 'male' });
        const dur = Math.max(1600, d.lines[i].a.length * 130);
        i++;
        setTimeout(step, dur);
      };
      step();
    };
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* =========================================================
     ЧТЕНИЕ (перевод по тапу)
     ========================================================= */
  function renderReading() {
    const el = document.getElementById('reading-content');
    if (!el) return;
    el.innerHTML = `<div class="rd-grid">${DB.reading.map(t => `
      <div class="rd-card" data-id="${t.id}">
        <span class="rd-card__icon">${t.icon}</span>
        <div class="rd-card__title">${t.title}</div>
        <div class="rd-card__lvl">Уровень ${t.level}</div>
      </div>`).join('')}</div>
      <div id="rd-open"></div>`;
    el.querySelectorAll('.rd-card').forEach(c => c.onclick = () => openReading(c.dataset.id));
  }
  window.renderReading = renderReading;

  function openReading(id) {
    const t = DB.reading.find(x => x.id === id);
    const box = document.getElementById('rd-open');
    const toks = t.tokens.map((tk, i) =>
      tk.r ? `<span class="rd-word" data-i="${i}">${tk.a}</span>` : `<span class="rd-punct">${tk.a}</span>`
    ).join(' ');
    box.innerHTML = `
      <div class="rd-view">
        <div class="rd-view__head">
          <h3>${t.icon} ${t.title} <span class="rd-badge">Ур. ${t.level}</span></h3>
          <button class="btn btn-light btn-sm" id="rd-listen">🔊 Прослушать</button>
        </div>
        <p class="rd-tip">👆 Нажми на любое слово — появится перевод и озвучка.</p>
        <div class="rd-text ar" id="rd-text">${toks}</div>
        <div class="rd-pop" id="rd-pop" style="display:none"></div>
        <button class="btn btn-outline" id="rd-toggle">👁 Показать полный перевод</button>
        <div class="rd-full" id="rd-full" style="display:none">${t.ru}</div>
      </div>`;
    const pop = document.getElementById('rd-pop');
    box.querySelectorAll('.rd-word').forEach(wd => wd.onclick = () => {
      const tk = t.tokens[+wd.dataset.i];
      box.querySelectorAll('.rd-word').forEach(x => x.classList.remove('active'));
      wd.classList.add('active');
      pop.style.display = 'block';
      pop.innerHTML = `<span class="ar">${tk.a}</span> — <b>${tk.r}</b> <button class="rd-pop-speak">🔊</button>`;
      pop.querySelector('.rd-pop-speak').onclick = () => speak(tk.a);
      speak(tk.a);
    });
    document.getElementById('rd-listen').onclick = () => speak(t.tokens.filter(x => x.r).map(x => x.a).join(' '));
    const tg = document.getElementById('rd-toggle'), full = document.getElementById('rd-full');
    tg.onclick = () => {
      const sh = tg.dataset.s === '1';
      full.style.display = sh ? 'none' : 'block';
      tg.textContent = sh ? '👁 Показать полный перевод' : '🙈 Скрыть перевод';
      tg.dataset.s = sh ? '0' : '1';
    };
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* =========================================================
     ДИКТАНТ НА СЛУХ (игра)
     ========================================================= */
  function gameDictation(area, words) {
    const pool = shuffle(words.filter(w => stripHarakat(w.a).replace(/\s/g, '').length >= 2)).slice(0, Math.min(10, words.length));
    let idx = 0, score = 0;
    function show() {
      if (idx >= pool.length) {
        gameResult(area, 'Диктант завершён!', `Очки: ${score} / ${pool.length}`, () => gameDictation(area, words));
        return;
      }
      const w = pool[idx];
      area.innerHTML = `
        <div class="dict-game">
          <p class="dict-hint">Послушай слово и запиши его арабскими буквами:</p>
          <button class="btn btn-gold dict-play" id="dict-play">🔊 Воспроизвести</button>
          <button class="btn btn-light btn-sm" id="dict-slow">🐢 Медленно</button>
          <div class="dict-ru">подсказка: ${w.r}</div>
          <input type="text" class="spelling-input" id="dict-in" dir="rtl" placeholder="اكتب هنا..." autocomplete="off"/>
          <div style="margin-top:1rem">
            <button class="btn btn-gold" id="dict-check">Проверить</button>
          </div>
          <p class="dict-progress">Слово ${idx + 1} из ${pool.length}</p>
        </div>`;
      const play = () => speak(w.a);
      document.getElementById('dict-play').onclick = play;
      document.getElementById('dict-slow').onclick = () => speakSlow(w.a);
      const input = document.getElementById('dict-in');
      input.focus();
      setTimeout(play, 300);
      document.getElementById('dict-check').onclick = () => {
        const ok = stripHarakat(input.value.trim()) === stripHarakat(w.a);
        if (ok) { score++; document.getElementById('game-score').textContent = score; toast('Верно! ' + w.a, 'success'); }
        else toast('Правильно: ' + w.a, 'error');
        updateGameProgress(((idx + 1) / pool.length) * 100);
        setTimeout(() => { idx++; show(); }, 1200);
      };
    }
    show();
  }
  window.gameDictation = gameDictation;
  if (!DB.gameList.find(g => g.id === 'dictation')) {
    DB.gameList.push({
      id: 'dictation', name: 'Диктант на слух', icon: '🎧',
      desc: 'Услышь слово — запиши его арабскими буквами', color: '#5C6BC0',
      how: ['Нажми 🔊 и послушай слово (можно «🐢 Медленно»).', 'Впечатай слово арабскими буквами в поле (справа налево).', 'Огласовки можно не ставить — проверяется без них.', 'Нажми «Проверить». Всего 10 слов.'],
      tip: 'Сначала повтори слово вслух, потом пиши — так лучше слышишь буквы.'
    });
  }

  /* =========================================================
     ТЁМНАЯ ТЕМА + «МЕДЛЕННО»
     ========================================================= */
  const THEMES = [
    { id: 'green',    name: '🌿 Классика', dark: false, bar: ['#0d3d24', '#1a5c38', '#d4af37'] },
    { id: 'sand',     name: '🏜️ Песок',   dark: false, bar: ['#5b3b1a', '#c98a2b', '#f6efe2'] },
    { id: 'sky',      name: '🌊 Небо',     dark: false, bar: ['#0e4654', '#157f9a', '#eef5f8'] },
    { id: 'rose',     name: '🌹 Роза',     dark: false, bar: ['#a31f4a', '#d9a441', '#fbeef1'] },
    { id: 'lavender', name: '🪻 Лаванда',  dark: false, bar: ['#5b2a9b', '#7c44c0', '#f1eefb'] },
    { id: 'night',    name: '🌙 Ночь',     dark: true,  bar: ['#0a2f1c', '#7fd6a0', '#161d22'] },
    { id: 'ocean',    name: '🌌 Океан',    dark: true,  bar: ['#0c1a33', '#7fb0ff', '#141b2b'] },
    { id: 'plum',     name: '🍇 Слива',    dark: true,  bar: ['#251436', '#d3a8ff', '#201829'] },
    { id: 'charcoal', name: '⚫ Графит',   dark: true,  bar: ['#16191e', '#e6c25a', '#1d2228'] },
    { id: 'cherry',   name: '🍒 Вишня',    dark: true,  bar: ['#5a1020', '#ff9bb0', '#28121a'] },
    { id: 'mint',     name: '🌿 Мята',     dark: false, bar: ['#0f5a3c', '#159e63', '#eef8f1'] },
    { id: 'peach',    name: '🍑 Персик',   dark: false, bar: ['#9c3d18', '#e0934a', '#fdf1ea'] },
    { id: 'coffee',   name: '☕ Кофе',     dark: true,  bar: ['#2a1c12', '#e0b07a', '#241a14'] },
    { id: 'teal',     name: '🦚 Бирюза',   dark: true,  bar: ['#0a2e2c', '#5fd8c8', '#122422'] },
    { id: 'calligraphy', name: '🖋 Каллиграфия', dark: false, bar: ['#6b2f1b', '#b8862f', '#f4ecd8'] },
    { id: 'contrast',    name: '🔳 Контраст',    dark: false, bar: ['#000000', '#8a6d00', '#ffffff'] },
    { id: 'auto',        name: '🌗 Авто (по системе)', dark: false, bar: ['#0d3d24', '#7fd6a0', '#faf6ef'] },
  ];
  window.THEMES = THEMES;
  function prefersDark() { try { return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); } catch (e) { return false; } }
  function resolveTheme(id) { return id === 'auto' ? (prefersDark() ? 'night' : 'green') : id; }
  function applyTheme(id) {
    const realId = resolveTheme(id);
    const t = THEMES.find(x => x.id === realId) || THEMES[0];
    document.body.dataset.theme = t.id;          // фактическая палитра
    document.body.dataset.themePref = id;        // что выбрал пользователь (вкл. 'auto')
    document.body.classList.toggle('dark', !!t.dark);
    try { localStorage.setItem('arabic_theme', id); } catch (e) {}
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = t.bar[0];
  }
  window.applyTheme = applyTheme;
  // авто-тема: реагируем на смену системной светлой/тёмной
  try {
    if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      let pref = 'green'; try { pref = localStorage.getItem('arabic_theme') || 'green'; } catch (e) {}
      if (pref === 'auto') applyTheme('auto');
    });
  } catch (e) {}
  applyTheme((function () {
    try {
      const s = localStorage.getItem('arabic_theme');
      if (s === 'dark') return 'night';
      if (s === 'wine') return 'cherry';
      if (s === 'light' || !s) return 'green';
      return s;
    } catch (e) { return 'green'; }
  })());

  /* Арабская типографика: размер букв и межстрочный интервал (ползунки в Настройках) */
  function getArScale() { try { return Math.min(2, Math.max(0.8, parseFloat(localStorage.getItem('arabic_ar_scale')) || 1)); } catch (e) { return 1; } }
  function getArLh()    { try { return Math.min(1.8, Math.max(0.9, parseFloat(localStorage.getItem('arabic_ar_lh')) || 1)); } catch (e) { return 1; } }
  function applyTypography() {
    document.documentElement.style.setProperty('--ar-scale', getArScale());
    document.documentElement.style.setProperty('--ar-lh', getArLh());
  }
  window.getArScale = getArScale; window.getArLh = getArLh; window.applyTypography = applyTypography;
  applyTypography();

  /* Режим анимаций: full | reduced | off (упр. через <html data-motion>) */
  function getMotion() {
    try { const m = localStorage.getItem('motion'); if (m === 'full' || m === 'reduced' || m === 'off') return m; } catch (e) {}
    return (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'reduced' : 'full';
  }
  function setMotion(m) {
    try { localStorage.setItem('motion', m); } catch (e) {}
    document.documentElement.setAttribute('data-motion', m);
    if (window.renderSettings) renderSettings();
  }
  window.getMotion = getMotion; window.setMotion = setMotion;
  document.documentElement.setAttribute('data-motion', getMotion());

  /* =========================================================
     МУЛЬТИЯЗЫК интерфейса (RU / UZ / EN)
     Перевод по совпадению русского текста — без правки HTML.
     ========================================================= */
  const LANGS = [{ id: 'ru', name: 'Русский' }, { id: 'uz', name: 'O‘zbek' }, { id: 'en', name: 'English' }];
  const I18N = {
    uz: {
      'Главная': 'Bosh sahifa', 'Алфавит': 'Alifbo', 'Словарь': 'Lug‘at', 'Грамматика': 'Grammatika',
      'Игры': 'O‘yinlar', 'Тесты': 'Testlar', 'Другие': 'Boshqa', 'Повторение': 'Takrorlash',
      'Спряжение': 'Tuslanish', 'Диалоги': 'Dialoglar', 'Чтение': 'O‘qish', 'Хадисы': 'Hadislar',
      'Переводчик': 'Tarjimon', 'Разговорник': 'So‘zlashgich', 'Мастерская': 'Ustaxona',
      'Админ-панель': 'Admin panel', 'Прогресс': 'Natijalar', 'Настройки': 'Sozlamalar',
      'дней подряд': 'kun ketma-ket', 'Категория:': 'Toifa:', 'Учи арабский': 'Arab tilini o‘rgan',
      'Учи арабский язык': 'Arab tilini o‘rgan',
      'الحُرُوف — Арабский алфавит': 'الحُرُوف — Arab alifbosi',
      '📚 Словарь — все разделы': '📚 Lug‘at — barcha bo‘limlar',
      'القَوَاعِد — Грамматика': 'القَوَاعِد — Grammatika',
      '🎮 Игры — 22 вида': '🎮 O‘yinlar — 22 xil', '📝 Тесты и контроль': '📝 Testlar va nazorat',
      '🔁 Повторение слов': '🔁 So‘zlarni takrorlash', '🔀 Спряжение глаголов': '🔀 Fe’l tuslanishi',
      '💬 Диалоги по ситуациям': '💬 Vaziyatli dialoglar', '📜 Тексты для чтения': '📜 O‘qish matnlari',
      '📿 Хадисы Пророка ﷺ': '📿 Payg‘ambar ﷺ hadislari', '🔤 Переводчик': '🔤 Tarjimon',
      '🗣️ Разговорник': '🗣️ So‘zlashgich', '🛠 Мастерская': '🛠 Ustaxona', '🛡 Админ-панель': '🛡 Admin panel',
      '⚙️ Настройки': '⚙️ Sozlamalar', '📊 Мой прогресс': '📊 Mening natijalarim',
      'Выбери тему, чтобы изучить слова': 'So‘zlarni o‘rganish uchun mavzuni tanlang',
      'Выбери игру и категорию слов': 'O‘yin va so‘z toifasini tanlang',
      'Проверь свои знания после изучения тем': 'Mavzularni o‘rgangach, bilimingizni sinang',
      'Продолжить обучение': 'O‘qishni davom ettirish', 'Разделы': 'Bo‘limlar',
      'Популярные игры': 'Mashhur o‘yinlar', 'Начать обучение →': 'O‘qishni boshlash →',
      '👤 Аккаунт': '👤 Hisob', '🎨 Тема оформления': '🎨 Ko‘rinish mavzusi',
      '🔤 Размер арабского текста': '🔤 Arab matni o‘lchami', '🔊 Озвучка': '🔊 Ovoz',
      '🎯 Ежедневная цель': '🎯 Kunlik maqsad', '💾 Сохранение прогресса': '💾 Natijani saqlash',
      '👋 Знакомство': '👋 Tanishuv', '⚠️ Сброс': '⚠️ Tozalash', '🌍 Язык интерфейса': '🌍 Interfeys tili',
      'Выйти': 'Chiqish', 'Войти / Регистрация': 'Kirish / Ro‘yxatdan o‘tish',
      'Голос': 'Ovoz', 'Медленное произношение': 'Sekin talaffuz', 'Рейтинг учеников': 'O‘quvchilar reytingi',
      'Добро пожаловать!': 'Xush kelibsiz!', 'Начать с алфавита →': 'Alifbodan boshlash →', '🎮 К играм': '🎮 O‘yinlarga',
      '🌟 Слово дня': '🌟 Kun so‘zi', 'слов выучено': 'so‘z o‘rganildi',
      'буква алфавита': 'alifbo harfi', 'букв алфавита': 'alifbo harfi', 'тем грамматики': 'grammatika mavzusi',
      'Женский': 'Ayol', 'Мужской': 'Erkak', 'Карточек в день': 'Kuniga kartochka',
      'Сохранить в файл': 'Faylga saqlash', 'Загрузить из файла': 'Fayldan yuklash',
      'Сбросить весь прогресс': 'Butun natijani tozalash', 'Пройти заново': 'Qaytadan o‘tish',
      'Поиск слова...': 'So‘z qidirish...', 'Размер букв': 'Harf o‘lchami', 'Межстрочный интервал': 'Qatorlar oralig‘i'
    },
    en: {
      'Главная': 'Home', 'Алфавит': 'Alphabet', 'Словарь': 'Dictionary', 'Грамматика': 'Grammar',
      'Игры': 'Games', 'Тесты': 'Tests', 'Другие': 'More', 'Повторение': 'Review',
      'Спряжение': 'Conjugation', 'Диалоги': 'Dialogues', 'Чтение': 'Reading', 'Хадисы': 'Hadiths',
      'Переводчик': 'Translator', 'Разговорник': 'Phrasebook', 'Мастерская': 'Workshop',
      'Админ-панель': 'Admin panel', 'Прогресс': 'Progress', 'Настройки': 'Settings',
      'дней подряд': 'day streak', 'Категория:': 'Category:', 'Учи арабский': 'Learn Arabic',
      'Учи арабский язык': 'Learn Arabic',
      'الحُرُوف — Арабский алфавит': 'الحُرُوف — Arabic alphabet',
      '📚 Словарь — все разделы': '📚 Dictionary — all sections',
      'القَوَاعِد — Грамматика': 'القَوَاعِد — Grammar',
      '🎮 Игры — 22 вида': '🎮 Games — 22 types', '📝 Тесты и контроль': '📝 Tests & quizzes',
      '🔁 Повторение слов': '🔁 Word review', '🔀 Спряжение глаголов': '🔀 Verb conjugation',
      '💬 Диалоги по ситуациям': '💬 Situational dialogues', '📜 Тексты для чтения': '📜 Reading texts',
      '📿 Хадисы Пророка ﷺ': '📿 Hadiths of the Prophet ﷺ', '🔤 Переводчик': '🔤 Translator',
      '🗣️ Разговорник': '🗣️ Phrasebook', '🛠 Мастерская': '🛠 Workshop', '🛡 Админ-панель': '🛡 Admin panel',
      '⚙️ Настройки': '⚙️ Settings', '📊 Мой прогресс': '📊 My progress',
      'Выбери тему, чтобы изучить слова': 'Pick a topic to learn words',
      'Выбери игру и категорию слов': 'Choose a game and a word category',
      'Проверь свои знания после изучения тем': 'Test your knowledge after studying topics',
      'Продолжить обучение': 'Continue learning', 'Разделы': 'Sections',
      'Популярные игры': 'Popular games', 'Начать обучение →': 'Start learning →',
      '👤 Аккаунт': '👤 Account', '🎨 Тема оформления': '🎨 Theme',
      '🔤 Размер арабского текста': '🔤 Arabic text size', '🔊 Озвучка': '🔊 Audio',
      '🎯 Ежедневная цель': '🎯 Daily goal', '💾 Сохранение прогресса': '💾 Save progress',
      '👋 Знакомство': '👋 Intro tour', '⚠️ Сброс': '⚠️ Reset', '🌍 Язык интерфейса': '🌍 Interface language',
      'Выйти': 'Log out', 'Войти / Регистрация': 'Log in / Sign up',
      'Голос': 'Voice', 'Медленное произношение': 'Slow pronunciation', 'Рейтинг учеников': 'Leaderboard',
      'Добро пожаловать!': 'Welcome!', 'Начать с алфавита →': 'Start with the alphabet →', '🎮 К играм': '🎮 To games',
      '🌟 Слово дня': '🌟 Word of the day', 'слов выучено': 'words learned',
      'буква алфавита': 'alphabet letter', 'букв алфавита': 'alphabet letters', 'тем грамматики': 'grammar topics',
      'Женский': 'Female', 'Мужской': 'Male', 'Карточек в день': 'Cards per day',
      'Сохранить в файл': 'Save to file', 'Загрузить из файла': 'Load from file',
      'Сбросить весь прогресс': 'Reset all progress', 'Пройти заново': 'Restart',
      'Поиск слова...': 'Search a word...', 'Размер букв': 'Letter size', 'Межстрочный интервал': 'Line spacing'
    }
  };
  // приоритет: инлайн (выше) > ручной data-i18n.js > авто-перевод контента (ниже)
  const _inlUz = Object.assign({}, I18N.uz), _inlEn = Object.assign({}, I18N.en);
  if (window.I18N_AUTO) { Object.assign(I18N.uz, window.I18N_AUTO.uz); Object.assign(I18N.en, window.I18N_AUTO.en); }
  if (window.I18N_DATA) { Object.assign(I18N.uz, window.I18N_DATA.uz); Object.assign(I18N.en, window.I18N_DATA.en); }
  Object.assign(I18N.uz, _inlUz); Object.assign(I18N.en, _inlEn);
  function currentLang() { try { return localStorage.getItem('arabic_lang') || 'ru'; } catch (e) { return 'ru'; } }
  const I18N_EMOJI = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{2600}-\u{26FF}]/gu;
  function i18nBase(t) { return t.replace(I18N_EMOJI, '').replace(/\s+/g, ' ').trim(); }
  function i18nPatterns(t, lang, dict) {
    const uz = lang === 'uz'; let m;
    if ((m = /^(\d+)\s+слов(?:а|о)?$/.exec(t))) return uz ? m[1] + ' ta so‘z' : m[1] + (m[1] === '1' ? ' word' : ' words');
    if ((m = /^(\d+)\s+вопрос(?:а|ов)?$/.exec(t))) return uz ? m[1] + ' ta savol' : m[1] + (m[1] === '1' ? ' question' : ' questions');
    if ((m = /^(\d+)\s+игр(?:а|ы)?\s+сыграно$/.exec(t))) return uz ? m[1] + ' ta o‘yin o‘ynaldi' : m[1] + ' games played';
    if ((m = /^(\d+)\s+игр(?:а|ы)?$/.exec(t))) return uz ? m[1] + ' ta o‘yin' : m[1] + (m[1] === '1' ? ' game' : ' games');
    if ((m = /^(\d+)\s+букв(?:а|ы)?(?:\s+алфавита)?$/.exec(t))) return uz ? m[1] + ' ta harf' : m[1] + (m[1] === '1' ? ' letter' : ' letters');
    if ((m = /^(\d+)\s+тем(?:ы)?\s+грамматики$/.exec(t))) return uz ? m[1] + ' ta grammatika mavzusi' : m[1] + ' grammar topics';
    if ((m = /^(\d+)\s+слов(?:а|о)?\s+в этой категории$/.exec(t))) return uz ? m[1] + ' ta so‘z bu toifada' : m[1] + ' words in this category';
    if ((m = /^(\d+)\s+карточ\w+\s+в\s+повторении$/.exec(t))) return uz ? m[1] + ' ta kartochka takrorlashda' : m[1] + ' cards in review';
    if ((m = /^(\d+)\s+дн(?:ей|я)?\s+подряд$/.exec(t))) return uz ? m[1] + ' kun ketma-ket' : m[1] + ' day streak';
    if ((m = /^Набрать\s+(\d+)\s+XP навыка$/.exec(t))) return uz ? m[1] + ' XP malaka to‘plash' : 'Earn ' + m[1] + ' skill XP';
    if ((m = /^Уровень\s+(\d+)$/.exec(t))) return uz ? m[1] + '-daraja' : 'Level ' + m[1];
    if ((m = /^Контроль усвоения тем\s+(\d+)-(\d+)$/.exec(t))) return uz ? m[1] + '–' + m[2] + '-mavzular nazorati' : 'Topics ' + m[1] + '–' + m[2] + ' check';
    if ((m = /^Тест:\s*(.+)$/.exec(t))) return 'Test: ' + translate(m[1].trim(), lang, dict);
    if ((m = /^Ранг:\s*(.+)$/.exec(t))) return (uz ? 'Daraja: ' : 'Rank: ') + translate(m[1].trim(), lang, dict);
    if ((m = /^Игр сыграно:\s*(\d+)$/.exec(t))) return uz ? 'O‘yinlar o‘ynaldi: ' + m[1] : 'Games played: ' + m[1];
    if ((m = /^Букв:\s*(\d+)\/28$/.exec(t))) return uz ? 'Harflar: ' + m[1] + '/28' : 'Letters: ' + m[1] + '/28';
    if ((m = /^Грамматика:\s*(\d+)\/(\d+)$/.exec(t))) return uz ? 'Grammatika: ' + m[1] + '/' + m[2] : 'Grammar: ' + m[1] + '/' + m[2];
    if ((m = /^Большой тест:\s*(.+)$/.exec(t))) return (uz ? 'Katta test: ' : 'Big test: ') + m[1];
    if ((m = /^Стрик:\s*(\d+)\s*дн\.\s*·\s*заморозок:\s*(\d+)$/.exec(t))) return uz ? 'Strik: ' + m[1] + ' kun · muzlatish: ' + m[2] : 'Streak: ' + m[1] + ' days · freezes: ' + m[2];
    if ((m = /^До ранга «(.+)»:\s*ещё$/.exec(t))) return uz ? '«' + translate(m[1], lang, dict) + '» darajasigacha: yana' : 'To rank «' + translate(m[1], lang, dict) + '»:';
    if ((m = /^(Слово|Вопрос|Раунд|Карта|Карточка)\s+(\d+)\s+из\s+(\d+)$/.exec(t))) { const W = { 'Слово': uz ? 'So‘z' : 'Word', 'Вопрос': uz ? 'Savol' : 'Question', 'Раунд': uz ? 'Raund' : 'Round', 'Карта': uz ? 'Karta' : 'Card', 'Карточка': uz ? 'Karta' : 'Card' }; return W[m[1]] + ' ' + m[2] + (uz ? ' / ' : ' of ') + m[3]; }
    if ((m = /^из\s+(\d+)$/.exec(t))) return uz ? m[1] + ' dan' : 'of ' + m[1];
    if ((m = /^Жизней:\s*(\d+)\s*\/\s*(\d+)$/.exec(t))) return (uz ? 'Jonlar: ' : 'Lives: ') + m[1] + '/' + m[2];
    if ((m = /^подсказка:\s*(.+)$/i.exec(t))) return (uz ? 'maslahat: ' : 'hint: ') + translate(m[1], lang, dict);
    if ((m = /^\((.+)\)$/.exec(t))) { const tw = translate(m[1], lang, dict); if (tw !== m[1]) return '(' + tw + ')'; }
    if ((m = /^(.+?)\s+(\([^)]*\).*)$/.exec(t))) { const tw = translate(m[1], lang, dict); if (tw !== m[1]) return tw + ' ' + m[2]; }
    if (/·\s*рег\./.test(t)) return t.replace(/система/g, uz ? 'tizim' : 'system').replace(/·\s*рег\./g, uz ? '· roʻyx.' : '· reg.');
    if ((m = /Прогресс этого аккаунта сохраняется отдельно на этом устройстве\.\s*Зарегистрировано аккаунтов:\s*(\d+)\.?$/.exec(t))) return (uz ? '✅ Bu hisob taraqqiyoti shu qurilmada alohida saqlanadi. Roʻyxatdan oʻtgan hisoblar: ' + m[1] + '.' : '✅ This account’s progress is saved separately on this device. Registered accounts: ' + m[1] + '.');
    if ((m = /^Зарегистрировано аккаунтов:\s*(\d+)\.?$/.exec(t))) return (uz ? 'Roʻyxatdan oʻtgan hisoblar: ' : 'Registered accounts: ') + m[1];
    if ((m = /^Всего зарегистрировано:\s*(\d+)$/.exec(t))) return (uz ? 'Jami roʻyxatdan oʻtgan: ' : 'Total registered: ') + m[1];
    if ((m = /^(\d+)\.\s+(.+)$/.exec(t))) { const tw = translate(m[2], lang, dict); if (tw !== m[2]) return m[1] + '. ' + tw; }
    if ((m = /^(.+?)\s+(I{1,3}|IV|V|VI{0,3}|IX|X)$/.exec(t))) { const b = dict[m[1]]; if (b) return b + ' ' + m[2]; }
    return null;
  }
  function translate(t, lang, dict) {
    if (lang === 'ru' || !dict) return t;
    if (dict[t]) return dict[t];
    const b = i18nBase(t);
    if (b !== t && dict[b] && t.indexOf(b) >= 0) return t.replace(b, dict[b]);
    let p = i18nPatterns(t, lang, dict);
    if (p != null) return p;
    if (b !== t && t.indexOf(b) >= 0) { p = i18nPatterns(b, lang, dict); if (p != null) return t.replace(b, p); }
    return t;
  }
  function translateTree(root, lang) {
    if (!root) return;
    const dict = I18N[lang];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = w.nextNode())) {
      const raw = n.nodeValue;
      if (!raw || !raw.trim()) continue;
      let e = n.__i18n;
      if (!e) { const t = raw.trim(); const at = raw.indexOf(t); e = { ru: t, pre: raw.slice(0, at), post: raw.slice(at + t.length) }; n.__i18n = e; }
      const tr = (lang === 'ru' || !dict) ? e.ru : translate(e.ru, lang, dict);
      const next = e.pre + tr + e.post;
      if (n.nodeValue !== next) n.nodeValue = next;
    }
    // атрибуты: placeholder / title / aria-label
    if (root.querySelectorAll) {
      const els = root.querySelectorAll('[placeholder],[title],[aria-label]');
      const list = root.matches && root.matches('[placeholder],[title],[aria-label]') ? [root, ...els] : els;
      list.forEach(el => {
        const store = el.__i18nAttr || (el.__i18nAttr = {});
        ['placeholder', 'title', 'aria-label'].forEach(attr => {
          if (!el.hasAttribute || !el.hasAttribute(attr)) return;
          if (store[attr] === undefined) store[attr] = el.getAttribute(attr);
          const ru = store[attr];
          if (!ru || !/[А-Яа-яЁё]/.test(ru)) return;
          el.setAttribute(attr, (lang === 'ru' || !dict) ? ru : translate(ru.trim(), lang, dict));
        });
      });
    }
  }
  let _i18nObs = null;
  function startI18nObserver() {
    if (_i18nObs || !window.MutationObserver) return;
    _i18nObs = new MutationObserver(muts => {
      const lang = currentLang(); if (lang === 'ru') return;
      for (const mu of muts) for (const nd of mu.addedNodes) {
        if (nd.nodeType === 1) translateTree(nd, lang);
        else if (nd.nodeType === 3 && nd.parentNode) translateTree(nd.parentNode, lang);
      }
    });
    _i18nObs.observe(document.body, { childList: true, subtree: true });
  }
  function applyLang(lang) {
    lang = lang || currentLang();
    translateTree(document.body, lang);          // весь сайт: меню, контент, модалки, тосты
    try { document.documentElement.lang = lang; } catch (e) {}
    startI18nObserver();                          // авто-перевод динамически добавленного
  }
  function setLang(lang) {
    try { localStorage.setItem('arabic_lang', lang); } catch (e) {}
    applyLang(lang);
    if (window.renderSettings) renderSettings();
    // перерисовать текущий раздел — для контента, зависящего от языка (напр. хадисы)
    try { const av = document.querySelector('.view.active'); if (av && window.App) { App.navigate(av.id.replace('view-', '')); } } catch (e) {}
    applyLang(lang);
  }
  window.applyLang = applyLang; window.setLang = setLang; window.currentLang = currentLang; window.LANGS = LANGS;
  // Оркестрованный вход: поэтапно проявляем заголовок → подзаголовок → карточки
  function staggerView(view) {
    if (!view) return;
    try { if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
    const targets = [];
    const head = view.querySelector('.view-header');
    if (head) head.querySelectorAll(':scope > h1, :scope > p').forEach(el => targets.push(el));
    // NB: .word-card исключена — она 3D-flip с perspective; внешний transform от
    // stagger «расплющивает» переворот. Карточки слов проявляются с общим fade раздела.
    const cardSel = '.game-card,.dlg-card,.rd-card,.grammar-item,.theme-swatch,.set-block,.lb-row,.conj-card,.menu-card,.test-card,.vocab-cat-card,.hadith-card,.cat-card,.ph-card,.lm-card';
    const cards = Array.from(view.querySelectorAll(cardSel));
    if (!cards.length && head) Array.from(view.children).forEach(c => { if (c !== head) targets.push(c); });
    const seq = targets.concat(cards).slice(0, 16);
    seq.forEach((el, i) => {
      el.classList.remove('stagger-in');
      void el.offsetWidth;            // рефлоу — рестарт анимации
      el.style.animationDelay = (i * 0.05) + 's';
      el.classList.add('stagger-in');
    });
  }
  window.staggerView = staggerView;

  /* Кинематографичные входные сцены разделов (только режим full) */
  const SCENES = {
    home: 'star', alphabet: 'ink', vocaboverview: 'wipe', vocab: 'wipe', grammar: 'page',
    games: 'rise', tests: 'star', progress: 'ring', srs: 'ink', conjugation: 'page',
    dialogues: 'wipe', reading: 'page', hadith: 'ink', translator: 'wipe', phrasebook: 'wipe',
    workshop: 'rise', admin: 'rise', settings: 'wipe'
  };
  const SCENE_CLASSES = ['scene-wipe', 'scene-ink', 'scene-star', 'scene-ring', 'scene-page', 'scene-rise'];
  const _sceneSeen = {};
  function playScene(view) {
    if (!view) return;
    SCENE_CLASSES.forEach(c => view.classList.remove(c));
    if (document.documentElement.getAttribute('data-motion') !== 'full') return;
    const id = (view.id || '').replace('view-', '');
    let type = SCENES[id] || 'wipe';
    if (_sceneSeen[id]) type = 'rise';      // повторный заход — лёгкая версия, чтобы не надоедало
    _sceneSeen[id] = 1;
    void view.offsetWidth;                   // рефлоу — рестарт анимации
    view.classList.add('scene-' + type);
  }
  window.playScene = playScene;

  (function () {
    if (!window.App || !App.navigate) return;
    const orig = App.navigate.bind(App);
    App.navigate = function () {
      const r = orig.apply(this, arguments);
      try { playScene(document.querySelector('.view.active')); } catch (e) {}
      try { applyLang(); } catch (e) {}
      try { staggerView(document.querySelector('.view.active')); } catch (e) {}
      try { if (window.__scanScroll) __scanScroll(); } catch (e) {}
      try { if (window.__scanTilt) __scanTilt(); } catch (e) {}
      try { if (window.__scanMagnetic) __scanMagnetic(); } catch (e) {}
      try { if (window.__markReveal) __markReveal(); } catch (e) {}
      return r;
    };
  })();

  /* =========================================================
     БЛОК B — Scroll-driven движок (.main как контейнер)
     ========================================================= */
  (function () {
    const scroller = document.scrollingElement || document.documentElement;
    const bar = document.createElement('div'); bar.className = 'scroll-progress'; document.body.appendChild(bar);
    const aura = document.createElement('div'); aura.className = 'scroll-aura'; document.body.appendChild(aura);
    let ticking = false;
    function tick() {
      ticking = false;
      const motion = document.documentElement.getAttribute('data-motion');
      if (motion === 'off') { bar.style.transform = 'scaleX(0)'; return; }
      const h = scroller.scrollHeight - scroller.clientHeight;
      const p = h > 0 ? scroller.scrollTop / h : 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      if (motion === 'full') {
        document.documentElement.style.setProperty('--scroll-p', p.toFixed(3));
        const y = scroller.scrollTop;
        document.documentElement.style.setProperty('--par1', (y * 0.08).toFixed(1) + 'px');   // дальний слой — медленнее
        document.documentElement.style.setProperty('--par2', (y * 0.18).toFixed(1) + 'px');   // ближний слой — быстрее
      }
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }, { passive: true });
    let io = null, cio = null;
    function setNum(el, s) { const n = el.firstChild; if (n && n.nodeType === 3) n.nodeValue = s; else el.textContent = s; }
    function countUp(el) {
      const raw = (el.getAttribute('data-count-target') || el.textContent || '').trim();
      const m = raw.match(/^(\d[\d ]*)(.*)$/s);
      if (!m) return;
      const target = parseInt(m[1].replace(/ /g, ''), 10); const rest = m[2] || '';
      if (isNaN(target)) return;
      el.setAttribute('data-count-target', raw);
      if (document.documentElement.getAttribute('data-motion') !== 'full') { setNum(el, target + rest); return; }
      const dur = 1000, t0 = performance.now();
      (function step(t) { const k = Math.min(1, (t - t0) / dur); setNum(el, Math.round(target * (1 - Math.pow(1 - k, 3))) + rest); if (k < 1) requestAnimationFrame(step); })(t0);
    }
    function ensure() {
      if (!io) io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('b-revealed'); io.unobserve(e.target); } }), { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
      if (!cio) cio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); } }), { root: null, threshold: 0.4 });
    }
    function scanView() {
      const view = document.querySelector('.view.active'); if (!view) return;
      ensure();
      view.querySelectorAll('.stat-value, .ring-info strong').forEach(el => cio.observe(el));
      if (document.documentElement.getAttribute('data-motion') !== 'full') return;
      const cards = Array.from(view.querySelectorAll('.word-card,.game-card,.dlg-card,.rd-card,.grammar-item,.hadith-card,.lb-row,.test-card,.conj-card,.menu-card,.ph-card'));
      cards.forEach((c, i) => { if (c.classList.contains('stagger-in') || i < 6) return; c.classList.add('b-reveal'); io.observe(c); });
    }
    window.__scanScroll = scanView;
    setTimeout(scanView, 60);
  })();

  /* БЛОК D1 — ambient «живой фон» (создаём один раз; видимость решает CSS по data-motion) */
  (function () {
    if (document.querySelector('.ambient')) return;
    const amb = document.createElement('div');
    amb.className = 'ambient'; amb.setAttribute('aria-hidden', 'true');
    let html = '<span class="amb-blob amb-blob-1"></span><span class="amb-blob amb-blob-2"></span>';
    const letters = ['ب', 'م', 'ع', 'ر', 'ن', 'ل', 'ك', 'ف', 'ه', 'و'];
    for (let i = 0; i < 6; i++) {
      const l = letters[Math.floor(Math.random() * letters.length)];
      html += '<span class="amb-letter" style="left:' + (8 + Math.random() * 84).toFixed(1) + '%;'
        + 'animation-delay:' + (i * 3.4).toFixed(1) + 's;'
        + 'animation-duration:' + (18 + Math.random() * 10).toFixed(1) + 's;'
        + 'font-size:' + (1.4 + Math.random() * 1.9).toFixed(2) + 'rem;">' + l + '</span>';
    }
    amb.innerHTML = html;
    document.body.insertBefore(amb, document.body.firstChild);
  })();

  /* БЛОК D2 — ripple на кнопках + magnetic на hero-CTA */
  (function () {
    document.addEventListener('pointerdown', function (e) {
      if (document.documentElement.getAttribute('data-motion') === 'off') return;
      const btn = e.target.closest ? e.target.closest('.btn') : null;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2;
      const sp = document.createElement('span'); sp.className = 'btn-ripple';
      sp.style.width = sp.style.height = size + 'px';
      sp.style.left = (e.clientX - r.left - size / 2) + 'px';
      sp.style.top = (e.clientY - r.top - size / 2) + 'px';
      btn.appendChild(sp);
      const rm = () => { if (sp.parentNode) sp.remove(); };
      sp.addEventListener('animationend', rm); setTimeout(rm, 800);
    }, { passive: true });

    function attachMagnetic(el) {
      if (el.__mag) return; el.__mag = 1; el.classList.add('magnetic');
      el.addEventListener('pointermove', e => {
        if (document.documentElement.getAttribute('data-motion') !== 'full') return;
        const r = el.getBoundingClientRect();
        el.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.4).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    }
    function scanMagnetic() { document.querySelectorAll('#view-home .hero-btns .btn').forEach(attachMagnetic); }
    window.__scanMagnetic = scanMagnetic;
    scanMagnetic();
  })();

  /* БЛОК D3 — tilt-карточки разделов (наклон за курсором + золотой блик; десктоп) */
  (function () {
    const canHover = window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches;
    function attachTilt(card) {
      if (card.__tilt) return; card.__tilt = 1; card.classList.add('tilt');
      const glow = document.createElement('span'); glow.className = 'tilt-glow'; card.appendChild(glow);
      if (!canHover) return;       // на тач-устройствах — без наклона
      card.addEventListener('pointermove', e => {
        if (document.documentElement.getAttribute('data-motion') !== 'full') return;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.transform = 'perspective(700px) rotateX(' + ((0.5 - py) * 9).toFixed(2) + 'deg) rotateY(' + ((px - 0.5) * 9).toFixed(2) + 'deg) translateY(-3px)';
        card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    }
    function scanTilt() {
      document.querySelectorAll('#view-vocaboverview .vocat-card').forEach(attachTilt);
    }
    window.__scanTilt = scanTilt;
    scanTilt();
  })();

  /* БЛОК D4 — награда за верный ответ (галочка + +XP + конфетти) */
  (function () {
    function confettiAt(cx, cy) {
      const colors = ['#d6b25c', '#f1d68a', '#a8842f', '#7fae97', '#ffffff'];
      for (let i = 0; i < 16; i++) {
        const p = document.createElement('div'); p.className = 'reward-particle';
        p.style.left = cx + 'px'; p.style.top = cy + 'px'; p.style.background = colors[i % colors.length];
        document.body.appendChild(p);
        const ang = Math.random() * Math.PI * 2, dist = 55 + Math.random() * 95;
        const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 30;
        p.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 },
          { transform: 'translate(' + dx.toFixed(0) + 'px,' + (dy + 130).toFixed(0) + 'px) rotate(' + (Math.random() * 540).toFixed(0) + 'deg)', opacity: 0 }],
          { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.6,.3,1)' }).onfinish = () => p.remove();
      }
    }
    function rewardBurst(el, xp) {
      const motion = document.documentElement.getAttribute('data-motion');
      if (motion === 'off') return;
      let cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      if (el && el.getBoundingClientRect) { const r = el.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
      const wrap = document.createElement('div'); wrap.className = 'reward-burst';
      wrap.style.left = cx + 'px'; wrap.style.top = cy + 'px';
      wrap.innerHTML = '<svg class="reward-check" viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M14 27l8 8 16-18"/></svg>' + (xp ? '<span class="reward-xp">+' + xp + ' XP</span>' : '');
      document.body.appendChild(wrap);
      setTimeout(() => wrap.remove(), 1400);
      if (motion === 'full') confettiAt(cx, cy);
    }
    window.rewardBurst = rewardBurst; window.confettiAt = confettiAt;

    const main = document.getElementById('main'); if (!main) return;
    let last = 0;
    new MutationObserver(muts => {
      if (document.documentElement.getAttribute('data-motion') === 'off') return;
      const now = performance.now(); if (now - last < 650) return;
      for (const m of muts) {
        const el = m.target;
        if (m.type !== 'attributes' || !el.classList || !el.classList.contains('correct')) continue;
        const cont = el.closest && el.closest('#game-area, #test-area');
        if (!cont) continue;                              // только тесты и игры
        if (cont.querySelector('.wrong, .incorrect')) continue;  // пользователь ошибся — без награды
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.width > window.innerWidth * 0.85 || r.height > 240) continue;
        last = now; rewardBurst(el, 10); break;
      }
    }).observe(main, { subtree: true, attributes: true, attributeFilter: ['class'] });
  })();

  /* БЛОК D5 — анимация озвучки (эквалайзер у 🔊 + пульс слова, по play/ended) */
  (function () {
    let activeBtn = null, activeTime = 0, eqEl = null;
    document.addEventListener('click', function (e) {
      const t = e.target.closest && e.target.closest('button, [role="button"]');
      if (!t) return;
      const label = (t.textContent || '') + ' ' + (t.getAttribute('aria-label') || '');
      if (label.indexOf('🔊') >= 0 || /speak/i.test(t.className)) { activeBtn = t; activeTime = Date.now(); }
    }, true);
    function clearEq() {
      if (eqEl) { eqEl.remove(); eqEl = null; }
      document.querySelectorAll('.speak-pulse').forEach(x => x.classList.remove('speak-pulse'));
    }
    function showEq() {
      clearEq();
      if (document.documentElement.getAttribute('data-motion') === 'off') return;
      if (!activeBtn || !document.body.contains(activeBtn) || Date.now() - activeTime > 4000) return;
      eqEl = document.createElement('span'); eqEl.className = 'speak-eq';
      eqEl.innerHTML = '<i></i><i></i><i></i><i></i>';
      activeBtn.appendChild(eqEl);
      const card = activeBtn.closest('.word-card,.srs-card,.hadith-card,.dlg-line,.dlg-card,.wod,.lm-ex-row') || activeBtn.parentElement;
      const word = card && card.querySelector('.word-card__ar,.srs-ar,.hadith-ar,.dlg-ar,.ar-big,.wod__ar,.ar');
      if (word) word.classList.add('speak-pulse');
    }
    document.addEventListener('arabic-speak', function (e) { if (e.detail === 'start') showEq(); else clearEq(); });
  })();

  /* БЛОК D6 — 8-конечная звезда-разделитель под заголовками разделов */
  (function () {
    document.querySelectorAll('.view-header').forEach(h => {
      const nx = h.nextElementSibling;
      if (nx && nx.classList && nx.classList.contains('star-divider')) return;
      const d = document.createElement('div'); d.className = 'star-divider'; d.setAttribute('aria-hidden', 'true');
      d.innerHTML = '<b>۞</b>';
      h.parentNode.insertBefore(d, h.nextSibling);
    });
  })();

  /* БЛОК D7 — живой прогресс: дорисовка кольца + стрик-календарь (тепловая карта) */
  (function () {
    function enhanceProgress() {
      const layout = document.getElementById('progress-layout'); if (!layout) return;
      const motion = document.documentElement.getAttribute('data-motion');
      // кольцо: анимируем дорисовку (пусто → цель)
      const rf = layout.querySelector('.ring-fill');
      if (rf && motion !== 'off') {
        const target = rf.getAttribute('stroke-dashoffset');
        const circ = rf.getAttribute('stroke-dasharray');
        rf.style.transition = 'none'; rf.setAttribute('stroke-dashoffset', circ);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          rf.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.5,.05,.2,1)';
          rf.setAttribute('stroke-dashoffset', target);
        }));
      }
      // стрик-календарь (28 дней из dailyLog)
      const firstCard = layout.querySelector('.progress-card');
      if (firstCard && !firstCard.querySelector('.streak-cal')) {
        const p = (typeof P === 'function') ? P() : (typeof state !== 'undefined' ? state.progress : null); if (!p) return;
        const lang = (window.currentLang ? currentLang() : 'ru');
        const title = lang === 'uz' ? '🔥 Faollik · 28 kun' : lang === 'en' ? '🔥 Activity · 28 days' : '🔥 Активность · 28 дней';
        const days = 28, now = new Date(), cells = [];
        for (let i = days - 1; i >= 0; i--) {
          const dt = new Date(now); dt.setDate(now.getDate() - i);
          const key = dt.toDateString();
          const c = (p.dailyLog && p.dailyLog[key]) || 0;
          const cls = c > 0 ? (c >= 3 ? 'on hi' : 'on') : '';
          cells.push('<span class="streak-cal__cell ' + cls + '" style="animation-delay:' + ((days - 1 - i) * 0.022).toFixed(3) + 's" title="' + key + ': ' + c + '"></span>');
        }
        const block = document.createElement('div');
        block.innerHTML = '<h4 class="streak-cal-title">' + title + '</h4><div class="streak-cal">' + cells.join('') + '</div>';
        firstCard.appendChild(block);
      }
    }
    if (window.renderProgress) {
      const _rp = window.renderProgress;
      window.renderProgress = function () { const r = _rp.apply(this, arguments); try { enhanceProgress(); } catch (e) {} return r; };
    }
  })();

  /* БЛОК D8 — каллиграфический спиннер + скелетоны (хелперы) */
  window.calliSpinner = function () { return '<span class="calli-spinner"><svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="20"/></svg></span>'; };
  window.skeletonRows = function (n, cls) { let s = ''; for (let i = 0; i < (n || 3); i++) s += '<div class="skeleton ' + (cls || '') + '" style="height:14px;margin:.5rem 0;width:' + (60 + Math.random() * 35).toFixed(0) + '%"></div>'; return s; };

  /* БЛОК B2.1 — слои параллакса (двигаются через --par1/--par2 в scroll-tick) */
  (function () {
    if (document.querySelector('.par-layer')) return;
    ['par-layer-1', 'par-layer-2'].forEach(function (c) {
      const d = document.createElement('div'); d.className = 'par-layer ' + c; d.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(d, document.body.firstChild);
    });
  })();

  /* БЛОК B2.2 — pinned-скроллителлинг: буква перетекает ا→ب→ت по скроллу секции */
  (function () {
    const home = document.getElementById('view-home'); if (!home || home.querySelector('.pin-section')) return;
    const sec = document.createElement('section'); sec.className = 'pin-section'; sec.setAttribute('aria-hidden', 'true');
    sec.innerHTML = '<div class="pin-sticky"><div class="pin-kicker">الأَبْجَدِيَّة</div><div class="pin-stage"><span class="pin-letter">ا</span></div><div class="pin-caption">Алиф</div><div class="pin-progress"><span class="pin-progress__fill"></span></div></div>';
    home.appendChild(sec);
    const letters = (typeof DB !== 'undefined' && DB.alphabet) ? DB.alphabet.slice(0, 8) : [{ letter: 'ا', name: 'Алиф' }];
    const stage = sec.querySelector('.pin-letter'), cap = sec.querySelector('.pin-caption'), fill = sec.querySelector('.pin-progress__fill');
    let lastIdx = -1, ticking = false;
    function update() {
      ticking = false;
      if (document.documentElement.getAttribute('data-motion') !== 'full') return;
      const rect = sec.getBoundingClientRect();
      const total = Math.max(1, sec.offsetHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, -rect.top / total));
      fill.style.transform = 'scaleX(' + p.toFixed(3) + ')';
      const idx = Math.min(letters.length - 1, Math.floor(p * letters.length));
      if (idx !== lastIdx) {
        lastIdx = idx; const L = letters[idx];
        stage.textContent = L.letter; cap.textContent = L.name || '';
        stage.classList.remove('pin-pop'); void stage.offsetWidth; stage.classList.add('pin-pop');
      }
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.__pinUpdate = update;
  })();

  /* SCROLL-DRIVEN цепочечный reveal карточек Home + Прогресс */
  (function () {
    const SUPPORTS = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline', 'view()'));
    let io = null;
    function getIO() { if (io) return io; io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); } }), { threshold: 0.15 }); return io; }
    function markReveal() {
      const view = document.querySelector('.view.active'); if (!view) return;
      if (view.id !== 'view-home' && view.id !== 'view-progress') return;
      const motion = document.documentElement.getAttribute('data-motion');
      view.querySelectorAll('.quick-card, .featured-card, .continue-card, .progress-card').forEach((c, i) => {
        if (!c.classList.contains('sd-reveal')) c.classList.add('sd-reveal');
        if (motion !== 'full') { c.classList.add('in-view'); return; }           // reduced/off — сразу видно
        if (!SUPPORTS) { c.style.transitionDelay = ((i % 8) * 70) + 'ms'; getIO().observe(c); }  // фолбэк: цепочка
        // нативно (animation-timeline: view()) — цепочка получается сама по входу в кадр
      });
    }
    window.__markReveal = markReveal;
    setTimeout(markReveal, 70);
  })();
  setTimeout(() => { try { applyLang(); } catch (e) {} }, 0);

  window.__slowSpeech = (function () { try { return localStorage.getItem('arabic_slow') === '1'; } catch (e) { return false; } })();
  function setSlow(v) { window.__slowSpeech = v; try { localStorage.setItem('arabic_slow', v ? '1' : '0'); } catch (e) {} }
  window.setSlow = setSlow;

  /* =========================================================
     БЭКАП ПРОГРЕССА (экспорт / импорт)
     ========================================================= */
  function exportProgress() {
    const data = JSON.stringify(state.progress, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = `arabic-progress-${d}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('💾 Прогресс сохранён в файл', 'success');
  }
  window.exportProgress = exportProgress;
  function importProgressFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (typeof data !== 'object' || !data) throw 0;
        state.progress = { ...state.progress, ...data };
        saveProgress();
        toast('📂 Прогресс загружен!', 'success');
        setTimeout(() => location.reload(), 700);
      } catch (err) { toast('Не удалось прочитать файл', 'error'); }
    };
    reader.readAsText(file);
  }
  window.importProgressFile = importProgressFile;

  /* =========================================================
     УВЕДОМЛЕНИЯ
     ========================================================= */
  function enableNotifications() {
    if (!('Notification' in window)) { toast('Уведомления не поддерживаются', 'error'); return; }
    Notification.requestPermission().then(p => {
      if (p === 'granted') {
        try { localStorage.setItem('arabic_notif', '1'); } catch (e) {}
        new Notification('عربي — Учи арабский', { body: 'Отлично! Будем напоминать о ежедневной практике 🌙', icon: 'icons/icon-192.png' });
        toast('🔔 Уведомления включены', 'success');
      } else toast('Уведомления отклонены', 'error');
      renderSettings();
    });
  }
  window.enableNotifications = enableNotifications;

  /* =========================================================
     НАСТРОЙКИ (view)
     ========================================================= */
  function renderSettings() {
    const el = document.getElementById('settings-content');
    if (!el) return;
    const curTheme = document.body.dataset.themePref || document.body.dataset.theme || 'green';
    const curMotion = document.documentElement.getAttribute('data-motion') || 'full';
    const notif = (function () { try { return localStorage.getItem('arabic_notif') === '1'; } catch (e) { return false; } })();
    const acc = currentUser();
    const accCount = Object.keys(getUsers()).length;
    el.innerHTML = `
      <div class="set-block">
        <h3>👤 Аккаунт</h3>
        ${acc
          ? `<div class="set-row"><span>Вы вошли как <b>${acc}</b></span><button class="btn btn-light btn-sm" id="set-logout">Выйти</button></div>
             <p class="set-note">✅ Прогресс этого аккаунта сохраняется отдельно на этом устройстве. Зарегистрировано аккаунтов: ${accCount}.</p>`
          : `<div class="set-row"><span>Сейчас вы занимаетесь как <b>гость</b></span><button class="btn btn-gold btn-sm" id="set-login">Войти / Регистрация</button></div>
             <p class="set-note">Войдите или зарегистрируйтесь, чтобы прогресс сохранялся в вашем личном аккаунте. На одном устройстве можно вести несколько отдельных аккаунтов.</p>`}
      </div>
      <div class="set-block">
        <h3>🌍 Язык интерфейса</h3>
        <div class="lang-row">
          ${LANGS.map(l => `<button class="lang-btn ${currentLang() === l.id ? 'active' : ''}" data-lang="${l.id}">${l.name}</button>`).join('')}
        </div>
      </div>
      <div class="set-block">
        <h3>🎞️ Анимации</h3>
        <p class="set-note">Уровень визуальных эффектов. «Сниженные» — без тяжёлого фона и эффектов прокрутки. «Выключены» — мгновенно, без анимаций.</p>
        <div class="motion-row">
          <button class="motion-btn ${curMotion==='full'?'active':''}" data-motion-set="full">Полные</button>
          <button class="motion-btn ${curMotion==='reduced'?'active':''}" data-motion-set="reduced">Сниженные</button>
          <button class="motion-btn ${curMotion==='off'?'active':''}" data-motion-set="off">Выключены</button>
        </div>
      </div>
      <div class="set-block">
        <h3>🎨 Тема оформления</h3>
        <p class="set-note">Выбери оформление по настроению. «🌗 Авто» подстраивается под светлую/тёмную тему телефона.</p>
        <div class="theme-grid" id="theme-grid">
          ${THEMES.map(t => `
            <button class="theme-swatch ${curTheme === t.id ? 'active' : ''}" data-theme="${t.id}">
              <span class="theme-swatch__bar"><i style="background:${t.bar[0]}"></i><i style="background:${t.bar[1]}"></i><i style="background:${t.bar[2]}"></i></span>
              <span class="theme-swatch__name">${t.name}</span>
            </button>`).join('')}
        </div>
      </div>
      <div class="set-block">
        <h3>🔤 Размер арабского текста</h3>
        <p class="set-note">Арабские буквы мелкие? Увеличь размер и межстрочный интервал — меняется вживую, применяется ко всему сайту.</p>
        <div class="ar-preview">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
        <div class="set-row">
          <span>Размер букв <b id="ar-scale-val"></b></span>
          <input type="range" class="set-range" id="ar-scale" min="0.8" max="2" step="0.05"/>
        </div>
        <div class="set-row">
          <span>Межстрочный интервал <b id="ar-lh-val"></b></span>
          <input type="range" class="set-range" id="ar-lh" min="0.9" max="1.8" step="0.05"/>
        </div>
        <div class="set-row set-row--btns">
          <button class="btn btn-light btn-sm" id="ar-typo-reset">↺ Сбросить к стандарту</button>
        </div>
      </div>
      <div class="set-block">
        <h3>🔊 Озвучка</h3>
        <div class="set-row">
          <span>Медленное произношение</span>
          <button class="toggle ${window.__slowSpeech ? 'on' : ''}" id="set-slow"><span class="toggle__dot"></span></button>
        </div>
        <div class="set-row">
          <span>Голос</span>
          <span class="set-mini">
            <button class="btn btn-light btn-sm" onclick="setVoiceGender('female')">👩 Женский</button>
            <button class="btn btn-light btn-sm" onclick="setVoiceGender('male')">👨 Мужской</button>
          </span>
        </div>
      </div>
      <div class="set-block">
        <h3>🎯 Ежедневная цель</h3>
        <div class="set-row">
          <span>Карточек в день</span>
          <select id="set-goal" class="set-select">
            ${[5, 10, 15, 20, 30].map(n => `<option value="${n}" ${P().dailyGoal === n ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
        <div class="set-row">
          <span>🔥 Стрик: ${P().streak} дн. · заморозок: ${P().streakFreeze}</span>
          <span class="set-mini-txt">1 пропущенный день не сбросит стрик</span>
        </div>
        <div class="set-row">
          <span>Напоминания</span>
          <button class="btn btn-light btn-sm" id="set-notif" ${notif ? 'disabled' : ''}>${notif ? '🔔 Включены' : '🔔 Включить'}</button>
        </div>
      </div>
      <div class="set-block">
        <h3>💾 Сохранение прогресса</h3>
        <p class="set-note">Прогресс хранится в этом браузере. Скачай резервную копию, чтобы не потерять его при очистке кэша или смене устройства.</p>
        <div class="set-row set-row--btns">
          <button class="btn btn-gold" id="set-export">💾 Сохранить в файл</button>
          <button class="btn btn-outline" id="set-import">📂 Загрузить из файла</button>
          <input type="file" id="set-import-file" accept="application/json,.json" style="display:none"/>
        </div>
      </div>
      <div class="set-block">
        <h3>👋 Знакомство</h3>
        <div class="set-row">
          <span>Вводный тур и тест на уровень</span>
          <button class="btn btn-light btn-sm" onclick="showOnboarding()">Пройти заново</button>
        </div>
      </div>
      <div class="set-block">
        <h3>⚠️ Сброс</h3>
        <button class="btn btn-light btn-sm" onclick="resetProgress()">🗑 Сбросить весь прогресс</button>
      </div>
    `;
    const slo = document.getElementById('set-logout'); if (slo) slo.onclick = logout;
    const sli = document.getElementById('set-login'); if (sli) sli.onclick = openAuthModal;
    el.querySelectorAll('.theme-swatch').forEach(sw => sw.onclick = () => {
      applyTheme(sw.dataset.theme);
      renderSettings();
    });
    document.getElementById('set-slow').onclick = function () {
      const v = !window.__slowSpeech; setSlow(v); this.classList.toggle('on', v);
      if (v) speakSlow('سَلَام');
    };
    document.getElementById('set-goal').onchange = function () { P().dailyGoal = +this.value; saveProgress(); toast('Цель обновлена'); };
    const nb = document.getElementById('set-notif'); if (nb && !notif) nb.onclick = enableNotifications;
    document.getElementById('set-export').onclick = exportProgress;
    const imp = document.getElementById('set-import'), impf = document.getElementById('set-import-file');
    imp.onclick = () => impf.click();
    impf.onchange = () => { if (impf.files[0]) importProgressFile(impf.files[0]); };
    // ползунки арабской типографики
    const arS = document.getElementById('ar-scale'), arL = document.getElementById('ar-lh');
    const arSV = document.getElementById('ar-scale-val'), arLV = document.getElementById('ar-lh-val');
    const fmtScale = v => Math.round(v * 100) + '%';
    const fmtLh = v => (Math.round(v * 100) / 100).toFixed(2).replace(/\.?0+$/, '') + '×';
    if (arS && arL) {
      arS.value = getArScale(); arL.value = getArLh();
      arSV.textContent = fmtScale(arS.value); arLV.textContent = fmtLh(arL.value);
      arS.oninput = function () {
        document.documentElement.style.setProperty('--ar-scale', this.value);
        arSV.textContent = fmtScale(this.value);
        try { localStorage.setItem('arabic_ar_scale', this.value); } catch (e) {}
      };
      arL.oninput = function () {
        document.documentElement.style.setProperty('--ar-lh', this.value);
        arLV.textContent = fmtLh(this.value);
        try { localStorage.setItem('arabic_ar_lh', this.value); } catch (e) {}
      };
      document.getElementById('ar-typo-reset').onclick = function () {
        try { localStorage.removeItem('arabic_ar_scale'); localStorage.removeItem('arabic_ar_lh'); } catch (e) {}
        applyTypography();
        arS.value = 1; arL.value = 1;
        arSV.textContent = fmtScale(1); arLV.textContent = fmtLh(1);
        toast('Размер сброшен к стандарту');
      };
    }
    el.querySelectorAll('.lang-btn').forEach(b => b.onclick = () => setLang(b.dataset.lang));
    el.querySelectorAll('[data-motion-set]').forEach(b => b.onclick = () => setMotion(b.dataset.motionSet));
    if (window.applyLang) applyLang();
  }
  window.renderSettings = renderSettings;

  /* =========================================================
     ПЕРЕВОДЧИК (по словарю приложения)
     ========================================================= */
  let _trIndex = null;
  function transIndex() {
    if (_trIndex) return _trIndex;
    _trIndex = [];
    Object.keys(DB.vocab).forEach(cat => (DB.vocab[cat] || []).forEach(w =>
      _trIndex.push({ a: w.a, t: w.t || '', r: w.r, e: w.e || '', cat })));
    return _trIndex;
  }
  function renderTranslator() {
    const el = document.getElementById('translator-content');
    if (!el) return;
    el.innerHTML = `
      <div class="tr-box">
        <input type="text" id="tr-input" class="tr-input" placeholder="Введите слово: رجل или мужчина…" autocomplete="off"/>
        <div class="tr-dir" id="tr-dir"></div>
      </div>
      <div class="tr-results" id="tr-results"></div>`;
    const input = document.getElementById('tr-input');
    const run = () => translateSearch(input.value);
    input.addEventListener('input', run);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
    input.focus();
    translateSearch('');
  }
  window.renderTranslator = renderTranslator;
  function translateSearch(q) {
    q = (q || '').trim();
    const res = document.getElementById('tr-results'), dir = document.getElementById('tr-dir');
    if (!res) return;
    if (!q) { res.innerHTML = `<p class="tr-hint">Например: <b class="ar">كتاب</b> → книга, или <b>дом</b> → <b class="ar">بيت</b></p>`; if (dir) dir.textContent = ''; return; }
    const isAr = /[؀-ۿ]/.test(q);
    if (dir) dir.textContent = isAr ? 'арабский → русский' : 'русский → арабский';
    const nq = isAr ? stripHarakat(q) : q.toLowerCase();
    function score(w) {
      if (isAr) {
        const a = stripHarakat(w.a);
        if (a === nq) return 3; if (a.indexOf(nq) === 0) return 2; if (a.indexOf(nq) >= 0) return 1; return 0;
      }
      let best = 0;
      (w.r || '').toLowerCase().split(/[\/,;()]+/).forEach(p => {
        p = p.trim(); if (!p) return;
        if (p === nq) best = Math.max(best, 3);
        else if (p.indexOf(nq) === 0) best = Math.max(best, 2);
        else if (p.indexOf(nq) >= 0) best = Math.max(best, 1);
      });
      if ((w.t || '').toLowerCase().indexOf(nq) >= 0) best = Math.max(best, 1);
      return best;
    }
    const hits = transIndex().map(w => ({ w, s: score(w) })).filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s).slice(0, 18);
    if (!hits.length) { res.innerHTML = `<p class="tr-none">😕 Ничего не найдено. Проверь написание или попробуй другое слово.</p>`; return; }
    res.innerHTML = hits.map(({ w }) => `
      <div class="tr-card">
        <div class="tr-emoji">${w.e || '📘'}</div>
        <div class="tr-main">
          <div class="tr-ar ar">${w.a}</div>
          <div class="tr-translit">${w.t || ''}</div>
          <div class="tr-ru">${w.r}</div>
          <div class="tr-cat">${DB.catLabels[w.cat] || w.cat}</div>
        </div>
        <button class="tr-speak" data-a="${w.a}">🔊</button>
      </div>`).join('');
    res.querySelectorAll('.tr-speak').forEach(b => b.onclick = () => speak(b.dataset.a));
  }

  /* =========================================================
     РАЗГОВОРНИК
     ========================================================= */
  const PHRASES = [
    { cat: '🙏 Вежливость', items: [
      { a: 'مِنْ فَضْلِك', t: 'min faḍlik', r: 'пожалуйста (просьба)' },
      { a: 'شُكْراً جَزِيلاً', t: 'shukran jazīlan', r: 'большое спасибо' },
      { a: 'عَفْواً', t: 'ʿafwan', r: 'не за что / извините' },
      { a: 'آسِف', t: 'āsif', r: 'извини' },
      { a: 'لَا بَأْس', t: 'lā baʾs', r: 'ничего страшного' },
      { a: 'تَفَضَّل', t: 'tafaḍḍal', r: 'прошу / пожалуйста' },
      { a: 'بَعْدَ إِذْنِك', t: 'baʿda idhnik', r: 'с вашего позволения' },
      { a: 'لَوْ سَمَحْت', t: 'law samaḥt', r: 'будьте добры' },
    ]},
    { cat: '👋 Общение', items: [
      { a: 'كَيْفَ حَالُك؟', t: 'kayfa ḥāluk?', r: 'как дела?' },
      { a: 'مَا اسْمُك؟', t: 'mā smuk?', r: 'как тебя зовут?' },
      { a: 'تَشَرَّفْنَا', t: 'tasharrafnā', r: 'приятно познакомиться' },
      { a: 'لَا أَفْهَم', t: 'lā afham', r: 'я не понимаю' },
      { a: 'تَكَلَّمْ بِبُطْء', t: 'takallam bibuṭʾ', r: 'говорите медленнее' },
      { a: 'أَعِدْ مِنْ فَضْلِك', t: 'aʿid min faḍlik', r: 'повторите, пожалуйста' },
      { a: 'مَاذَا يَعْنِي هَذَا؟', t: 'mādhā yaʿnī hādhā?', r: 'что это значит?' },
      { a: 'كَيْفَ أَقُول…؟', t: 'kayfa aqūl…?', r: 'как сказать…?' },
    ]},
    { cat: '🧭 В пути', items: [
      { a: 'أَيْنَ…؟', t: 'ayna…?', r: 'где…?' },
      { a: 'كَيْفَ أَصِلُ إِلَى…؟', t: 'kayfa aṣilu ilā…?', r: 'как добраться до…?' },
      { a: 'إِلَى اليَمِين', t: 'ilā l-yamīn', r: 'направо' },
      { a: 'إِلَى اليَسَار', t: 'ilā l-yasār', r: 'налево' },
      { a: 'عَلَى طُول', t: 'ʿalā ṭūl', r: 'прямо' },
      { a: 'هَل هُوَ بَعِيد؟', t: 'hal huwa baʿīd?', r: 'это далеко?' },
      { a: 'أَوْقِفْ هُنَا', t: 'awqif hunā', r: 'остановите здесь' },
      { a: 'أَنَا تَائِه', t: 'anā tāʾih', r: 'я заблудился' },
    ]},
    { cat: '🛒 Покупки', items: [
      { a: 'بِكَمْ هَذَا؟', t: 'bikam hādhā?', r: 'сколько это стоит?' },
      { a: 'غَالٍ جِدّاً', t: 'ghālin jiddan', r: 'очень дорого' },
      { a: 'هَل يُوجَدُ تَخْفِيض؟', t: 'hal yūjadu takhfīḍ?', r: 'есть ли скидка?' },
      { a: 'سَآخُذُه', t: 'saʾākhudhuh', r: 'я возьму это' },
      { a: 'أُرِيدُ هَذَا', t: 'urīdu hādhā', r: 'я хочу это' },
      { a: 'هَل تَقْبَلُ البِطَاقَة؟', t: 'hal taqbalu l-biṭāqa?', r: 'принимаете карту?' },
      { a: 'أَيْنَ الصُّنْدُوق؟', t: 'ayna ṣ-ṣundūq?', r: 'где касса?' },
      { a: 'هَذَا يَكْفِي', t: 'hādhā yakfī', r: 'этого достаточно' },
    ]},
    { cat: '🆘 Помощь', items: [
      { a: 'سَاعِدْنِي', t: 'sāʿidnī', r: 'помогите мне' },
      { a: 'النَّجْدَة!', t: 'an-najda!', r: 'на помощь!' },
      { a: 'اِتَّصِلْ بِالطَّبِيب', t: 'ittaṣil biṭ-ṭabīb', r: 'вызовите врача' },
      { a: 'أَنَا مَرِيض', t: 'anā marīḍ', r: 'я болен' },
      { a: 'أَيْنَ المُسْتَشْفَى؟', t: 'ayna l-mustashfā?', r: 'где больница?' },
      { a: 'أَحْتَاجُ المُسَاعَدَة', t: 'aḥtāju l-musāʿada', r: 'мне нужна помощь' },
      { a: 'اِتَّصِلْ بِالشُّرْطَة', t: 'ittaṣil bish-shurṭa', r: 'позвоните в полицию' },
      { a: 'فَقَدْتُ حَقِيبَتِي', t: 'faqadtu ḥaqībatī', r: 'я потерял сумку' },
    ]},
    { cat: '🍽️ В кафе', items: [
      { a: 'القَائِمَة، مِنْ فَضْلِك', t: 'al-qāʾima, min faḍlik', r: 'меню, пожалуйста' },
      { a: 'مَاءً، لَوْ سَمَحْت', t: 'māʾan, law samaḥt', r: 'воды, будьте добры' },
      { a: 'الحِسَاب، مِنْ فَضْلِك', t: 'al-ḥisāb, min faḍlik', r: 'счёт, пожалуйста' },
      { a: 'لَذِيذٌ جِدّاً', t: 'ladhīdhun jiddan', r: 'очень вкусно' },
      { a: 'أَنَا جَائِع', t: 'anā jāʾiʿ', r: 'я голоден' },
      { a: 'أَنَا عَطْشَان', t: 'anā ʿaṭshān', r: 'я хочу пить' },
      { a: 'بِدُونِ سُكَّر', t: 'bidūni sukkar', r: 'без сахара' },
      { a: 'صَحَّتَيْن', t: 'ṣaḥḥatayn', r: 'приятного аппетита' },
    ]},
  ];
  function renderPhrasebook() {
    const el = document.getElementById('phrasebook-content');
    if (!el) return;
    el.innerHTML = PHRASES.map(g => `
      <div class="pb-group">
        <h3 class="pb-title">${g.cat}</h3>
        <div class="pb-list">
          ${g.items.map(p => `
            <div class="pb-item">
              <div class="pb-texts"><div class="pb-ar ar">${p.a}</div><div class="pb-tr">${p.t}</div><div class="pb-ru">${p.r}</div></div>
              <button class="pb-speak" data-a="${p.a}">🔊</button>
            </div>`).join('')}
        </div>
      </div>`).join('');
    el.querySelectorAll('.pb-speak').forEach(b => b.onclick = () => speak(b.dataset.a));
  }
  window.renderPhrasebook = renderPhrasebook;

  /* =========================================================
     ХАДИСЫ (рус + узб)
     ========================================================= */
  function renderHadith() {
    const el = document.getElementById('hadith-content');
    if (!el || !DB.hadith) return;
    const lang = (window.currentLang ? currentLang() : 'ru');
    const label = lang === 'uz' ? '🇺🇿 Oʻzbekcha' : lang === 'en' ? '🇬🇧 English' : '🇷🇺 Русский';
    const listen = lang === 'uz' ? 'Tinglash' : lang === 'en' ? 'Listen' : 'Слушать';
    el.innerHTML = DB.hadith.map((h, i) => {
      const tr = lang === 'uz' ? h.u : lang === 'en' ? (h.en || h.r) : h.r;
      return `
      <div class="hadith-card">
        <div class="hadith-num">${i + 1}</div>
        <div class="hadith-ar ar">${h.a} ﷺ</div>
        ${h.t ? `<div class="hadith-tr">${h.t}</div>` : ''}
        <div class="hadith-block"><span class="hadith-lang">${label}</span><p class="hadith-text">${tr}</p></div>
        <div class="hadith-foot">
          <span class="hadith-src">📖 ${h.src}</span>
          <button class="hadith-speak" data-a="${h.a}">🔊 ${listen}</button>
        </div>
      </div>`;
    }).join('');
    el.querySelectorAll('.hadith-speak').forEach(b => b.onclick = () => speak(b.dataset.a, { rate: 0.78 }));
  }
  window.renderHadith = renderHadith;

  /* =========================================================
     СЛОВО ДНЯ (на главной)
     ========================================================= */
  function initWordOfDay() {
    const el = document.getElementById('word-of-day');
    if (!el) return;
    const all = (typeof allWords === 'function') ? allWords() : [];
    if (!all.length) return;
    const w = all[Math.floor(Date.now() / 86400000) % all.length];
    el.innerHTML = `
      <div class="wod">
        <div class="wod__label">🌟 Слово дня</div>
        <div class="wod__row">
          <div class="wod__emoji">${w.e || '📘'}</div>
          <div class="wod__main">
            <div class="wod__ar ar">${w.a}</div>
            <div class="wod__tr">${w.t || ''} · ${w.r}</div>
          </div>
          <button class="wod__speak">🔊</button>
        </div>
      </div>`;
    el.querySelector('.wod__speak').onclick = () => speak(w.a);
  }
  window.initWordOfDay = initWordOfDay;

  /* =========================================================
     РАНГИ / НАВЫК (XP) + РЕЙТИНГ УЧЕНИКОВ
     ========================================================= */
  const RANKS = [
    { n: 'Новичок I',   e: '🌱', ar: 'مُبْتَدِئ', min: 0 },
    { n: 'Новичок II',  e: '🌱', min: 40 },
    { n: 'Новичок III', e: '🌿', min: 90 },
    { n: 'Бронза I',    e: '🥉', min: 150 },
    { n: 'Бронза II',   e: '🥉', min: 230 },
    { n: 'Бронза III',  e: '🥉', min: 330 },
    { n: 'Серебро I',   e: '🥈', min: 450 },
    { n: 'Серебро II',  e: '🥈', min: 600 },
    { n: 'Серебро III', e: '🥈', min: 780 },
    { n: 'Золото I',    e: '🥇', min: 1000 },
    { n: 'Золото II',   e: '🥇', min: 1260 },
    { n: 'Золото III',  e: '🥇', min: 1560 },
    { n: 'Платина I',   e: '💎', min: 1900 },
    { n: 'Платина II',  e: '💎', min: 2300 },
    { n: 'Платина III', e: '💎', min: 2760 },
    { n: 'Алмаз I',     e: '💠', min: 3300 },
    { n: 'Алмаз II',    e: '💠', min: 3900 },
    { n: 'Алмаз III',   e: '💠', min: 4600 },
    { n: 'Мастер I',    e: '🏆', ar: 'مَاهِر', min: 5400 },
    { n: 'Мастер II',   e: '🏆', min: 6300 },
    { n: 'Мастер III',  e: '🏆', min: 7300 },
    { n: 'Легенда I',   e: '👑', min: 8500 },
    { n: 'Легенда II',  e: '👑', min: 9800 },
    { n: 'Легенда III', e: '👑', min: 11200 },
    { n: 'Легенда IV',  e: '👑', min: 12800 },
    { n: 'Легенда V',   e: '👑', ar: 'أُسْتَاذ', min: 14500 },
    { n: 'Феникс',      e: '🔥', ar: 'العَنْقَاء', min: 16500 },
    { n: 'Титан',       e: '⚡', ar: 'الجَبَل', min: 19500 },
    { n: 'Бессмертный', e: '🌟', ar: 'الخَالِد', min: 23000 },
  ];
  window.RANKS = RANKS;
  function calcXP(p) {
    if (!p) return 0;
    const words = (p.learnedWords || []).length;
    const letters = (p.learnedLetters || []).length;
    const grammar = (p.passedGrammar || []).length;
    const games = p.gamesPlayed || 0;
    const streak = p.streak || 0;
    const ach = (p.achievements || []).length;
    const srs = p.srs ? Object.keys(p.srs).length : 0;
    const srsMature = p.srs ? Object.values(p.srs).filter(c => (c.interval || 0) >= 7).length : 0;
    const tests = p.testScores ? Object.values(p.testScores).filter(v => v.total && v.score / v.total >= 0.6).length : 0;
    const base = words * 10 + letters * 8 + grammar * 20 + games * 4 + streak * 6 + ach * 25 + srs * 3 + srsMature * 8 + tests * 15;
    return Math.max(0, Math.round(base - (p.penalty || 0)));   // штраф от админа вычитается
  }
  window.calcXP = calcXP;
  function rankInfo(xp) {
    let idx = 0;
    for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].min) idx = i;
    const cur = RANKS[idx], next = RANKS[idx + 1] || null;
    const pct = next ? Math.round((xp - cur.min) / (next.min - cur.min) * 100) : 100;
    return { rank: cur, index: idx, next, pct: Math.max(0, Math.min(100, pct)), xp };
  }
  window.rankInfo = rankInfo;
  function gatherBoard() {
    const users = getUsers();
    const rows = [];
    Object.keys(users).forEach(name => {
      let p = null; try { p = JSON.parse(localStorage.getItem(progressKey(name))); } catch (e) {}
      rows.push({ name, xp: calcXP(p || {}), me: name === currentUser() });
    });
    if (!currentUser()) rows.push({ name: 'Гость (вы)', xp: calcXP(state.progress), me: true });
    rows.sort((a, b) => b.xp - a.xp);
    return rows;
  }
  function renderRankBoard() {
    drawRankBoard();
    if (CLOUD) maybeSyncThen(drawRankBoard);
  }
  function drawRankBoard() {
    const rc = document.getElementById('rank-card-wrap');
    if (rc) {
      const info = rankInfo(calcXP(state.progress));
      const u = currentUser();
      rc.innerHTML = `
        <div class="rank-card">
          <div class="rank-card__badge">${info.rank.e}</div>
          <div class="rank-card__info">
            <div class="rank-card__top">
              <span class="rank-card__name">${info.rank.n}${info.rank.ar ? ` <span class="ar">${info.rank.ar}</span>` : ''}</span>
              <span class="rank-card__who">${u ? '👤 ' + u : '👤 Гость'}</span>
            </div>
            <div class="rank-card__xp">${info.xp} <span>очков навыка (XP)</span></div>
            <div class="rank-bar"><div class="rank-bar__fill" style="width:${info.pct}%"></div></div>
            <div class="rank-card__next">${info.next ? `До ранга «${info.next.n}»: ещё <b>${info.next.min - info.xp}</b> XP` : '🎉 Максимальный ранг достигнут!'}</div>
          </div>
        </div>`;
    }
    const lb = document.getElementById('leaderboard-wrap');
    if (lb) {
      const rows = gatherBoard();
      if (!rows.length) { lb.innerHTML = ''; return; }
      const medal = i => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
      lb.innerHTML = `
        <div class="lb">
          <h3 class="lb__title">🏅 Рейтинг учеников</h3>
          <p class="lb__note">Зарегистрированные на этом устройстве — по уровню навыка. Учись больше и быстрее, чтобы подняться выше!</p>
          <p class="lb__note lb__note--tap">👁 Нажми на ученика, чтобы посмотреть его профиль.</p>
          <div class="lb__list">
            ${rows.map((r, i) => {
              const ri = rankInfo(r.xp);
              return `<div class="lb__row ${r.me ? 'me' : ''}" data-name="${r.name}">
                <span class="lb__pos">${medal(i)}</span>
                <span class="lb__name">${r.name}</span>
                <span class="lb__rank">${ri.rank.e} ${ri.rank.n}</span>
                <span class="lb__xp">${r.xp} XP</span>
              </div>`;
            }).join('')}
          </div>
          ${Object.keys(getUsers()).length === 0 ? `<p class="lb__hint">Зарегистрируйтесь, чтобы сохранять прогресс и попасть в рейтинг 👤</p>` : ''}
        </div>`;
      lb.querySelectorAll('.lb__row').forEach(row => row.onclick = () => openProfileModal(row.dataset.name));
    }
    renderRankTable();
  }
  window.renderRankBoard = renderRankBoard;

  function renderRankTable() {
    const rt = document.getElementById('ranktable-wrap');
    if (!rt) return;
    const curIdx = rankInfo(calcXP(state.progress)).index;
    rt.innerHTML = `
      <div class="rt">
        <h3 class="rt__title">📜 Таблица рангов и навыка (XP)</h3>
        <p class="rt__note">Сколько очков навыка нужно для каждого ранга. ✅ — пройден, ⭐ — текущий, 🔒 — впереди.</p>
        <div class="rt__list">
          ${RANKS.map((r, i) => {
            const st = i < curIdx ? '✅' : (i === curIdx ? '⭐' : '🔒');
            return `<div class="rt__row ${i === curIdx ? 'cur' : ''} ${i < curIdx ? 'done' : ''}">
              <span class="rt__badge">${r.e}</span>
              <span class="rt__name">${r.n}${r.ar ? ` <span class="ar">${r.ar}</span>` : ''}</span>
              <span class="rt__xp">${r.min.toLocaleString('ru')} XP</span>
              <span class="rt__st">${st}</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  function studentProgressByName(name) {
    if (name === currentUser() || /Гость/.test(name)) return state.progress;
    try { return JSON.parse(localStorage.getItem(progressKey(name))) || {}; } catch (e) { return {}; }
  }
  function openProfileModal(name) {
    const p = studentProgressByName(name);
    const info = rankInfo(calcXP(p));
    const stat = (icon, val, lbl) => `<div class="pf-stat"><span class="pf-stat__i">${icon}</span><span class="pf-stat__v">${val}</span><span class="pf-stat__l">${lbl}</span></div>`;
    const m = document.createElement('div');
    m.className = 'auth-overlay'; m.id = 'profile-modal';
    m.innerHTML = `
      <div class="auth-card pf-card">
        <button class="auth-close" id="pf-close">✕</button>
        <div class="pf-head">
          <span class="pf-avatar">${(name[0] || '?').toUpperCase()}</span>
          <div class="pf-id">
            <div class="pf-name">${name}</div>
            <div class="pf-rank">${info.rank.e} ${info.rank.n} · ${info.xp} XP</div>
          </div>
        </div>
        <div class="rank-bar pf-bar"><div class="rank-bar__fill" style="width:${info.pct}%"></div></div>
        <div class="pf-grid">
          ${stat('📚', (p.learnedWords || []).length, 'слов')}
          ${stat('الأ', (p.learnedLetters || []).length + '/28', 'букв')}
          ${stat('📖', (p.passedGrammar || []).length + '/' + DB.grammar.length, 'грамматика')}
          ${stat('🎮', p.gamesPlayed || 0, 'игр')}
          ${stat('🔥', p.streak || 0, 'дней подряд')}
          ${stat('🏅', (p.achievements || []).length, 'достижений')}
        </div>
      </div>`;
    document.body.appendChild(m);
    document.getElementById('pf-close').onclick = () => m.remove();
    m.onclick = e => { if (e.target === m) m.remove(); };
  }
  window.openProfileModal = openProfileModal;

  /* =========================================================
     АККАУНТЫ (локальный вход / регистрация)
     ========================================================= */
  const ORIG_KEY = 'arabic_progress_v1';
  function currentUser() { try { return localStorage.getItem('arabic_user') || null; } catch (e) { return null; } }
  function progressKey(name) { return name ? ORIG_KEY + '__' + name : ORIG_KEY; }
  function ensureFields() {
    const p = P();
    if (!p.srs) p.srs = {};
    if (!p.dailyGoal) p.dailyGoal = 10;
    if (p.streakFreeze == null) p.streakFreeze = 1;
    if (!p.dailyLog) p.dailyLog = {};
  }
  /* ----- Облако (Supabase) ----- */
  const CLOUD = !!(window.SUPABASE_URL && window.SUPABASE_KEY);
  window.__CLOUD = CLOUD;
  function supaH(extra) { return Object.assign({ apikey: window.SUPABASE_KEY, Authorization: 'Bearer ' + window.SUPABASE_KEY, 'Content-Type': 'application/json' }, extra || {}); }
  function supaU(path) { return window.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/' + path; }
  async function cloudGetUser(name) { const r = await fetch(supaU('accounts?select=*&username=eq.' + encodeURIComponent(name)), { headers: supaH() }); if (!r.ok) throw new Error('cloud'); const a = await r.json(); return a[0] || null; }
  async function cloudAllUsers() { const r = await fetch(supaU('accounts?select=*&order=username'), { headers: supaH() }); if (!r.ok) throw new Error('cloud'); return await r.json(); }
  async function cloudUpsertUser(rec) { const r = await fetch(supaU('accounts'), { method: 'POST', headers: supaH({ Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify(rec) }); return r.ok; }
  async function cloudPatchUser(name, patch) { const r = await fetch(supaU('accounts?username=eq.' + encodeURIComponent(name)), { method: 'PATCH', headers: supaH({ Prefer: 'return=minimal' }), body: JSON.stringify(patch) }); return r.ok; }
  async function cloudDeleteUser(name) { const r = await fetch(supaU('accounts?username=eq.' + encodeURIComponent(name)), { method: 'DELETE', headers: supaH({ Prefer: 'return=minimal' }) }); return r.ok; }
  function recToLocal(r) { return { pw: r.password, p: hashPass(r.password || ''), admin: !!r.admin, super: !!r.super, device: r.device, registered: r.registered, lastDevice: r.last_device, lastLogin: r.last_login }; }
  async function cloudSyncUsers() {
    if (!CLOUD) return;
    try {
      const list = await cloudAllUsers(); const users = {};
      list.forEach(r => { users[r.username] = recToLocal(r); if (r.progress) try { localStorage.setItem(progressKey(r.username), JSON.stringify(r.progress)); } catch (e) {} });
      setUsers(users);
    } catch (e) {}
  }
  window.cloudSyncUsers = cloudSyncUsers;
  let _pushTimer = null;
  function scheduleCloudPush() {
    clearTimeout(_pushTimer);
    _pushTimer = setTimeout(() => { const u = currentUser(); if (CLOUD && u) cloudPatchUser(u, { progress: state.progress, last_login: Date.now(), last_device: deviceInfo() }).catch(() => {}); }, 1500);
  }
  let _lastSync = 0;
  function maybeSyncThen(cb) {
    if (!CLOUD) { if (cb) cb(); return; }
    const now = Date.now();
    if (now - _lastSync < 6000) { if (cb) cb(); return; }
    _lastSync = now;
    cloudSyncUsers().then(() => { if (cb) cb(); });
  }

  // прогресс сохраняется локально (кэш) + пушится в облако
  window.saveProgress = function () {
    try { localStorage.setItem(progressKey(currentUser()), JSON.stringify(state.progress)); } catch (e) {}
    if (CLOUD && currentUser()) scheduleCloudPush();
  };
  function hashPass(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return '' + h; }
  function deviceInfo() {
    const ua = (navigator.userAgent || '');
    let os = 'устройство', br = '', emoji = '💻';
    if (/iPhone|iPad|iPod/i.test(ua)) { os = 'iPhone/iPad'; emoji = '📱'; }
    else if (/Android/i.test(ua)) { os = 'Android'; emoji = '📱'; }
    else if (/Windows/i.test(ua)) { os = 'Windows'; emoji = '💻'; }
    else if (/Mac OS X|Macintosh/i.test(ua)) { os = 'Mac'; emoji = '💻'; }
    else if (/Linux/i.test(ua)) { os = 'Linux'; emoji = '💻'; }
    if (/Edg\//i.test(ua)) br = 'Edge';
    else if (/Chrome\//i.test(ua) && !/Edg/i.test(ua)) br = 'Chrome';
    else if (/Firefox\//i.test(ua)) br = 'Firefox';
    else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) br = 'Safari';
    return emoji + ' ' + os + (br ? ' · ' + br : '');
  }
  window.deviceInfo = deviceInfo;
  function getUsers() { try { return JSON.parse(localStorage.getItem('arabic_users')) || {}; } catch (e) { return {}; } }
  function setUsers(u) { try { localStorage.setItem('arabic_users', JSON.stringify(u)); } catch (e) {} }
  const SUPERADMIN = 'hasanboy.admin';
  function checkPass(rec, pass) { if (!rec) return false; if (rec.pw != null) return rec.pw === pass; return rec.p === hashPass(pass); }
  function isAdmin(name) {
    name = (name === undefined) ? currentUser() : name;
    if (!name) return false;
    if (name === SUPERADMIN) return true;
    if (name === currentUser()) { try { if (localStorage.getItem('arabic_is_admin') === '1') return true; } catch (e) {} }
    const u = getUsers()[name];
    return !!(u && u.admin);
  }
  window.isAdmin = isAdmin;
  // Гарантируем существование супер-админа hasanboy.admin / admin.7476
  (function seedAdmin() {
    const users = getUsers();
    if (!users[SUPERADMIN]) users[SUPERADMIN] = {};
    users[SUPERADMIN].pw = 'admin.7476';
    users[SUPERADMIN].p = hashPass('admin.7476');
    users[SUPERADMIN].admin = true;
    users[SUPERADMIN].super = true;
    if (!users[SUPERADMIN].device) users[SUPERADMIN].device = '🛡 система';
    if (!users[SUPERADMIN].registered) users[SUPERADMIN].registered = Date.now();
    setUsers(users);
    // в облаке: создать админа, если его там ещё нет (не затирая прогресс)
    if (CLOUD) {
      cloudGetUser(SUPERADMIN).then(ex => {
        if (!ex) cloudUpsertUser({ username: SUPERADMIN, password: 'admin.7476', admin: true, super: true, device: '🛡 система', registered: Date.now(), progress: {} });
        else cloudPatchUser(SUPERADMIN, { password: 'admin.7476', admin: true, super: true });
      }).catch(() => {});
    }
  })();

  function refreshAfterAuth() {
    const sc = document.getElementById('streak-count');
    if (sc) sc.textContent = state.progress.streak || 0;
    renderAccount();
    if (typeof checkAchievements === 'function') checkAchievements();
    App.navigate('home');
  }
  function setAdminFlag(v) { try { localStorage.setItem('arabic_is_admin', v ? '1' : '0'); } catch (e) {} }
  async function doRegister(name, pass, errFn) {
    name = (name || '').trim();
    if (name.length < 2) return errFn('Имя должно быть от 2 символов');
    if (!/^[\p{L}\p{N}_.\-]{2,20}$/u.test(name)) return errFn('Имя: буквы, цифры, . _ - (2–20 символов)');
    if ((pass || '').length < 3) return errFn('Пароль должен быть от 3 символов');
    if (CLOUD) {
      try {
        const ex = await cloudGetUser(name);
        if (ex) return errFn('Такой пользователь уже существует');
        const ok = await cloudUpsertUser({ username: name, password: pass, admin: false, super: false, device: deviceInfo(), registered: Date.now(), last_device: deviceInfo(), last_login: Date.now(), progress: state.progress });
        if (!ok) return errFn('Ошибка облака — попробуйте позже');
      } catch (e) { return errFn('Нет связи с облаком. Проверьте интернет'); }
    } else {
      const users = getUsers();
      if (users[name]) return errFn('Такой пользователь уже существует');
      users[name] = { p: hashPass(pass), pw: pass, admin: false, device: deviceInfo(), registered: Date.now(), lastDevice: deviceInfo(), lastLogin: Date.now() }; setUsers(users);
    }
    setAdminFlag(false);
    try { localStorage.setItem('arabic_user', name); } catch (e) {}
    saveProgress(); // прогресс переносится в аккаунт (локально + облако)
    closeAuthModal();
    toast('Аккаунт создан! Прогресс сохранён 🎉', 'success');
    refreshAfterAuth();
  }
  async function doLogin(name, pass, errFn) {
    name = (name || '').trim();
    if (CLOUD) {
      try {
        const rec = await cloudGetUser(name);
        if (!rec || rec.password !== pass) return errFn('Неверное имя или пароль');
        try { localStorage.setItem('arabic_user', name); } catch (e) {}
        state.progress = Object.assign({}, defaultProgress, rec.progress || {});
        ensureFields();
        setAdminFlag(!!rec.admin || name === SUPERADMIN);
        cloudPatchUser(name, { last_device: deviceInfo(), last_login: Date.now() }).catch(() => {});
        saveProgress();
      } catch (e) { return errFn('Нет связи с облаком. Проверьте интернет'); }
    } else {
      const users = getUsers();
      if (!users[name] || !checkPass(users[name], pass)) return errFn('Неверное имя или пароль');
      users[name].lastDevice = deviceInfo(); users[name].lastLogin = Date.now(); setUsers(users);
      try { localStorage.setItem('arabic_user', name); } catch (e) {}
      let d = null; try { d = JSON.parse(localStorage.getItem(progressKey(name))); } catch (e) {}
      state.progress = Object.assign({}, defaultProgress, d || {});
      ensureFields(); setAdminFlag(!!users[name].admin || name === SUPERADMIN); saveProgress();
    }
    closeAuthModal();
    toast('С возвращением, ' + name + '! 👋', 'success');
    refreshAfterAuth();
  }
  function logout() {
    try { localStorage.removeItem('arabic_user'); localStorage.removeItem('arabic_is_admin'); } catch (e) {}
    let d = null; try { d = JSON.parse(localStorage.getItem(progressKey(null))); } catch (e) {}
    state.progress = Object.assign({}, defaultProgress, d || {});
    ensureFields();
    toast('Вы вышли из аккаунта');
    refreshAfterAuth();
  }
  window.logoutAccount = logout;

  function renderAccount() {
    const el = document.getElementById('sidebar-account');
    if (!el) return;
    const u = currentUser();
    const info = rankInfo(calcXP(state.progress));
    // Единый порядок в обоих состояниях: ранг сверху → действие (вход/имя) снизу.
    // Так ранг и кнопка входа больше не «прыгают» местами при входе/выходе.
    const rankHtml = `<div class="acc-rank" title="Очки навыка">
        <span class="acc-rank__badge">${info.rank.e}</span>
        <span class="acc-rank__name">${info.rank.n}</span>
        <span class="acc-rank__xp">${info.xp} XP</span>
      </div>
      <div class="acc-rankbar"><div class="acc-rankbar__fill" style="width:${info.pct}%"></div></div>`;
    const authHtml = u
      ? `<div class="acc-row"><span class="acc-avatar">${u[0].toUpperCase()}</span>
          <div class="acc-info"><span class="acc-name">${u}${isAdmin(u) ? ' <span class="acc-admin" title="Администратор">🛡</span>' : ''}</span><button class="acc-logout" id="acc-logout">Выйти</button></div></div>`
      : `<button class="btn btn-gold btn-sm acc-login-btn" id="acc-login">👤 Войти / Регистрация</button>`;
    el.innerHTML = rankHtml + authHtml;
    const lo = document.getElementById('acc-logout'); if (lo) lo.onclick = logout;
    const li = document.getElementById('acc-login'); if (li) li.onclick = openAuthModal;
    if (typeof updateAdminNav === 'function') updateAdminNav();
  }
  window.renderAccount = renderAccount;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  /* =========================================================
     МАСТЕРСКАЯ — слова/темы, добавленные админами
     ========================================================= */
  function wsGet() { try { return JSON.parse(localStorage.getItem('arabic_workshop')) || []; } catch (e) { return []; } }
  function wsSet(a) { try { localStorage.setItem('arabic_workshop', JSON.stringify(a)); } catch (e) {} }
  function renderWorkshop() {
    const el = document.getElementById('workshop-content');
    if (!el) return;
    const admin = isAdmin();
    const items = wsGet();
    const groups = {};
    items.forEach((it, idx) => { const th = it.theme || 'Общая'; (groups[th] = groups[th] || []).push({ ...it, idx }); });
    const addForm = admin ? `
      <div class="ws-add">
        <h3>➕ Добавить слово или тему</h3>
        <p class="ws-addnote">Введи арабское слово, перевод и (по желанию) транскрипцию. Оно появится в мастерской с твоим именем.</p>
        <div class="ws-form">
          <input id="ws-theme" class="ws-inp" placeholder="Тема (необязательно, напр. «Мои слова»)"/>
          <input id="ws-ar" class="ws-inp ar" dir="rtl" placeholder="арабское слово · مثال"/>
          <input id="ws-ru" class="ws-inp" placeholder="перевод на русский"/>
          <input id="ws-tr" class="ws-inp" placeholder="транскрипция (по желанию)"/>
          <button class="btn btn-gold" id="ws-add-btn">Добавить</button>
        </div>
      </div>` : `<p class="ws-note">🛠 Сюда слова и темы добавляют администраторы. Хочешь добавлять — попроси администратора выдать тебе права.</p>`;
    const groupsHtml = Object.keys(groups).length ? Object.keys(groups).map(th => `
      <div class="ws-group">
        <h3 class="ws-group__title">🛠 ${esc(th)}</h3>
        <div class="ws-list">
          ${groups[th].map(it => `
            <div class="ws-item">
              <button class="ws-speak" data-a="${esc(it.a)}">🔊</button>
              <div class="ws-texts"><div class="ws-ar ar">${esc(it.a)}</div><div class="ws-tr">${esc(it.t || '')}</div><div class="ws-ru">${esc(it.r)}</div></div>
              <div class="ws-by">от <b>${esc(it.by || '?')}</b></div>
              ${admin ? `<button class="ws-del" data-i="${it.idx}" title="Удалить">🗑</button>` : ''}
            </div>`).join('')}
        </div>
      </div>`).join('') : `<p class="ws-empty">Пока пусто. ${admin ? 'Добавь первое слово выше! ⬆️' : ''}</p>`;
    el.innerHTML = addForm + groupsHtml;
    if (admin) {
      document.getElementById('ws-add-btn').onclick = () => {
        const a = document.getElementById('ws-ar').value.trim();
        const r = document.getElementById('ws-ru').value.trim();
        const t = document.getElementById('ws-tr').value.trim();
        const theme = document.getElementById('ws-theme').value.trim() || 'Общая';
        if (!a || !r) { toast('Введите арабское слово и перевод', 'error'); return; }
        const arr = wsGet(); arr.push({ a, r, t, theme, by: currentUser() || 'админ', ts: Date.now() }); wsSet(arr);
        toast('Добавлено в мастерскую ✅', 'success');
        renderWorkshop();
      };
    }
    el.querySelectorAll('.ws-speak').forEach(b => b.onclick = () => speak(b.dataset.a));
    el.querySelectorAll('.ws-del').forEach(b => b.onclick = () => { const arr = wsGet(); arr.splice(+b.dataset.i, 1); wsSet(arr); renderWorkshop(); });
  }
  window.renderWorkshop = renderWorkshop;

  /* =========================================================
     АДМИН-ПАНЕЛЬ — управление пользователями
     ========================================================= */
  function updateAdminNav() {
    const li = document.getElementById('nav-admin-li');
    if (li) li.style.display = isAdmin() ? '' : 'none';
  }
  window.updateAdminNav = updateAdminNav;
  function adminProgressOf(name) {
    if (name === currentUser()) return state.progress;
    try { return JSON.parse(localStorage.getItem(progressKey(name))) || {}; } catch (e) { return {}; }
  }
  function adminPenalty(name, amount) {
    if (name === SUPERADMIN) { toast('Супер-админа нельзя штрафовать', 'error'); return; }
    const p = adminProgressOf(name);
    p.penalty = Math.max(0, (p.penalty || 0) + amount);
    if (name === currentUser()) { state.progress = p; saveProgress(); }
    else { try { localStorage.setItem(progressKey(name), JSON.stringify(p)); } catch (e) {} }
    if (CLOUD) cloudPatchUser(name, { progress: p }).catch(() => {});
    toast((amount > 0 ? '➖ Штраф ' : '➕ Бонус ') + Math.abs(amount) + ' XP · ' + name, 'success');
    renderAdmin(); renderRankBoard(); renderAccount();
  }
  function adminToggleAdmin(name) {
    if (name === SUPERADMIN) { toast('Супер-админ всегда администратор', 'error'); return; }
    const users = getUsers(); if (!users[name]) return;
    users[name].admin = !users[name].admin; setUsers(users);
    if (CLOUD) cloudPatchUser(name, { admin: users[name].admin }).catch(() => {});
    if (name === currentUser()) setAdminFlag(users[name].admin);
    toast(name + (users[name].admin ? ' теперь администратор 🛡' : ' больше не админ'), 'success');
    renderAdmin(); updateAdminNav(); renderAccount();
  }
  function adminDelete(name) {
    if (name === SUPERADMIN) { toast('Супер-админа удалить нельзя', 'error'); return; }
    if (!confirm('Удалить пользователя «' + name + '» и весь его прогресс?')) return;
    const users = getUsers(); delete users[name]; setUsers(users);
    try { localStorage.removeItem(progressKey(name)); } catch (e) {}
    if (CLOUD) cloudDeleteUser(name).catch(() => {});
    if (name === currentUser()) logout();
    toast('Пользователь ' + name + ' удалён', 'success');
    renderAdmin();
  }
  function renderAdmin() {
    drawAdmin();
    if (CLOUD && isAdmin()) {
      const el = document.getElementById('admin-content');
      if (el) { const s = document.createElement('div'); s.className = 'adm-sync'; s.innerHTML = (window.calliSpinner ? window.calliSpinner() : '') + ' Синхронизация с облаком…'; el.insertBefore(s, el.firstChild); }
      maybeSyncThen(drawAdmin);
    }
  }
  function drawAdmin() {
    const el = document.getElementById('admin-content');
    if (!el) return;
    if (!isAdmin()) { el.innerHTML = `<p class="adm-noaccess">🔒 Доступ только для администраторов. Войдите под аккаунтом администратора (например, <b>hasanboy.admin</b>).</p>`; return; }
    const users = getUsers();
    const rows = Object.keys(users).map(n => {
      const p = adminProgressOf(n); const xp = calcXP(p);
      return { n, xp, info: rankInfo(xp), rec: users[n] };
    }).sort((a, b) => b.xp - a.xp);
    el.innerHTML = `
      <div class="adm">
        <p class="adm-note">🛡 Панель администратора. Видны все зарегистрированные ученики: логин, пароль, ранг и навык. Можно дать штраф (−100 XP), бонус (+100), назначить/снять администратора или удалить ученика.</p>
        <div class="adm-table">
          <div class="adm-row adm-head"><span>Логин</span><span>Пароль</span><span>Ранг</span><span>XP</span><span>Действия</span></div>
          ${rows.map((r, i) => `
            <div class="adm-row">
              <span class="adm-login">${esc(r.n)}${r.rec.super ? ' 👑' : (r.rec.admin ? ' 🛡' : '')}
                <span class="adm-device">${esc(r.rec.device || '—')}${r.rec.registered ? ' · рег. ' + new Date(r.rec.registered).toLocaleDateString('ru') : ''}</span>
              </span>
              <span class="adm-pass">${r.rec.pw != null ? esc(r.rec.pw) : '—'}</span>
              <span class="adm-rank">${r.info.rank.e} ${r.info.rank.n}</span>
              <span class="adm-xp">${r.xp}</span>
              <span class="adm-actions">
                <button class="adm-btn" data-i="${i}" data-act="pen" title="Штраф −100 XP">−100</button>
                <button class="adm-btn plus" data-i="${i}" data-act="bon" title="Бонус +100 XP">+100</button>
                <button class="adm-btn" data-i="${i}" data-act="adm" title="Сделать/снять админа">🛡</button>
                <button class="adm-btn del" data-i="${i}" data-act="del" title="Удалить ученика">🗑</button>
              </span>
            </div>`).join('')}
        </div>
        <p class="adm-foot">Всего зарегистрировано: <b>${rows.length}</b></p>
      </div>`;
    el.querySelectorAll('.adm-btn').forEach(b => {
      const r = rows[+b.dataset.i]; const act = b.dataset.act;
      b.onclick = () => {
        if (act === 'pen') adminPenalty(r.n, 100);
        else if (act === 'bon') adminPenalty(r.n, -100);
        else if (act === 'adm') adminToggleAdmin(r.n);
        else if (act === 'del') adminDelete(r.n);
      };
    });
  }
  window.renderAdmin = renderAdmin;
  window.adminPenalty = adminPenalty;
  window.adminToggleAdmin = adminToggleAdmin;
  window.adminDelete = adminDelete;

  function closeAuthModal() { const m = document.getElementById('auth-modal'); if (m) m.remove(); }
  function openAuthModal() {
    closeAuthModal();
    const m = document.createElement('div');
    m.id = 'auth-modal'; m.className = 'auth-overlay';
    m.innerHTML = `
      <div class="auth-card">
        <button class="auth-close" id="auth-close">✕</button>
        <div class="auth-logo">عربي</div>
        <div class="auth-tabs">
          <button class="auth-tab active" data-tab="login">Вход</button>
          <button class="auth-tab" data-tab="register">Регистрация</button>
        </div>
        <input type="text" id="auth-name" class="auth-input" placeholder="Имя пользователя" autocomplete="username"/>
        <input type="password" id="auth-pass" class="auth-input" placeholder="Пароль" autocomplete="current-password"/>
        <p class="auth-err" id="auth-err"></p>
        <button class="btn btn-gold auth-submit" id="auth-submit">Войти</button>
        <p class="auth-note">${CLOUD ? '☁️ Вход работает с любого устройства — прогресс хранится в облаке.' : '🔒 Локальный режим: данные хранятся только на этом устройстве.'}</p>
      </div>`;
    document.body.appendChild(m);
    let mode = 'login';
    const err = msg => { document.getElementById('auth-err').textContent = msg; };
    m.querySelectorAll('.auth-tab').forEach(t => t.onclick = () => {
      mode = t.dataset.tab;
      m.querySelectorAll('.auth-tab').forEach(x => x.classList.toggle('active', x === t));
      document.getElementById('auth-submit').textContent = mode === 'login' ? 'Войти' : 'Создать аккаунт';
      err('');
    });
    document.getElementById('auth-close').onclick = closeAuthModal;
    m.onclick = e => { if (e.target === m) closeAuthModal(); };
    document.getElementById('auth-submit').onclick = async () => {
      const btn = document.getElementById('auth-submit');
      const n = document.getElementById('auth-name').value;
      const p = document.getElementById('auth-pass').value;
      const label = btn.textContent;
      btn.disabled = true; if (window.__CLOUD) btn.innerHTML = (window.calliSpinner ? window.calliSpinner() : '') + ' Подождите…'; err('');
      try { if (mode === 'login') await doLogin(n, p, err); else await doRegister(n, p, err); }
      finally { btn.disabled = false; btn.textContent = label; }
    };
    document.getElementById('auth-pass').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('auth-submit').click(); });
    setTimeout(() => document.getElementById('auth-name').focus(), 50);
  }
  window.openAuthModal = openAuthModal;

  // загрузка прогресса вошедшего пользователя + первичная отрисовка виджетов
  (function initAccount() {
    const u = currentUser();
    if (u) {
      let d = null; try { d = JSON.parse(localStorage.getItem(progressKey(u))); } catch (e) {}
      if (d) state.progress = Object.assign({}, defaultProgress, d);
      ensureFields();
    }
    renderAccount();
    initWordOfDay();
    // облако: подтянуть свежий прогресс текущего пользователя с сервера
    if (CLOUD && u) {
      cloudGetUser(u).then(rec => {
        if (rec) {
          state.progress = Object.assign({}, defaultProgress, rec.progress || {});
          ensureFields();
          setAdminFlag(!!rec.admin || u === SUPERADMIN);
          try { localStorage.setItem(progressKey(u), JSON.stringify(state.progress)); } catch (e) {}
          renderAccount();
          if (typeof App !== 'undefined' && state.currentView === 'home' && typeof renderHome === 'function') renderHome();
        }
      }).catch(() => {});
    }
    if (CLOUD) cloudSyncUsers();
  })();

  /* =========================================================
     МЕНЮ «ДРУГИЕ» — раскрытие + авто-открытие на нужной странице
     ========================================================= */
  (function initMoreMenu() {
    const MORE_VIEWS = ['srs', 'conjugation', 'dialogues', 'reading', 'hadith', 'translator', 'phrasebook', 'workshop', 'admin'];
    const toggle = document.getElementById('more-toggle');
    if (toggle) toggle.addEventListener('click', e => {
      e.preventDefault();
      toggle.closest('.nav-group').classList.toggle('open');
    });
    // авто-открыть раздел «Другие», если перешли на одну из его страниц
    if (window.App && typeof App.navigate === 'function') {
      const orig = App.navigate.bind(App);
      App.navigate = function (view, param) {
        orig(view, param);
        if (MORE_VIEWS.indexOf(view) >= 0) {
          const mg = document.getElementById('more-group');
          if (mg) mg.classList.add('open');
        }
      };
    }
  })();

  /* =========================================================
     ДОП. ДОСТИЖЕНИЯ
     ========================================================= */
  if (typeof ACHIEVEMENTS !== 'undefined') {
    const extra = [
      { id: 'words_300', icon: '🌟', name: '300 слов', desc: 'Выучил 300 слов', check: p => p.learnedWords.length >= 300 },
      { id: 'grammar_all', icon: '📚', name: 'Грамматик-мастер', desc: 'Пройдены все темы грамматики', check: p => p.passedGrammar.length >= DB.grammar.length },
      { id: 'srs_50', icon: '🧠', name: 'Память', desc: '50 карточек в повторении', check: p => p.srs && Object.keys(p.srs).length >= 50 },
      { id: 'srs_grad', icon: '🎓', name: 'Закрепил', desc: 'Слово с интервалом 14+ дней', check: p => p.srs && Object.values(p.srs).some(c => c.interval >= 14) },
      { id: 'streak_30', icon: '🏔️', name: 'Месяц подряд', desc: '30 дней подряд', check: p => p.streak >= 30 },
    ];
    extra.forEach(a => { if (!ACHIEVEMENTS.find(x => x.id === a.id)) ACHIEVEMENTS.push(a); });
    // достижение за каждый ранг
    RANKS.forEach((r, i) => {
      const id = 'rank_' + i;
      if (!ACHIEVEMENTS.find(a => a.id === id))
        ACHIEVEMENTS.push({ id, icon: r.e, name: 'Ранг: ' + r.n, desc: `Набрать ${r.min} XP навыка`, check: (function (min) { return p => calcXP(p) >= min; })(r.min) });
    });
    // тихо отметить уже достигнутые ранги, чтобы не было лавины уведомлений при первом запуске
    (function silentGrantRanks() {
      if (!state.progress.achievements) state.progress.achievements = [];
      let changed = false;
      RANKS.forEach((r, i) => {
        const id = 'rank_' + i;
        if (calcXP(state.progress) >= r.min && state.progress.achievements.indexOf(id) < 0) {
          state.progress.achievements.push(id); changed = true;
        }
      });
      if (changed) saveProgress();
    })();
  }

  /* =========================================================
     ОНБОРДИНГ + PLACEMENT-ТЕСТ (первый вход)
     ========================================================= */
  const ONBOARD_KEY = 'arabic_onboarded';
  const OB_SLIDES = [
    { icon: '👋', title: 'Добро пожаловать!', text: 'Здесь ты выучишь арабский с нуля: буквы, 2800+ слов с озвучкой, грамматику, игры и ранги.' },
    { icon: '📚', title: 'Словарь', text: 'Учи слова по темам. Слово засчитывается как «изученное» только после теста по этой теме.' },
    { icon: '📖', title: 'Грамматика', text: 'Понятные уроки и упражнения. Тема засчитывается после сдачи теста (≥60%).' },
    { icon: '🎮', title: 'Игры и тесты', text: 'Закрепляй слова в играх и без стресса проверяй себя тестами.' },
    { icon: '🏆', title: 'Прогресс и ранги', text: 'Зарабатывай XP, поднимай ранг и соревнуйся в рейтинге учеников.' },
  ];
  const OB_PLACEMENT = [
    { q: 'Какая из букв — «алиф» (а)?', opts: ['ا', 'ب', 'م', 'ك'], ans: 0, ar: true },
    { q: 'Какой звук у буквы «ب»?', opts: ['Б', 'Т', 'С', 'Н'], ans: 0 },
    { q: '«كِتَاب» — это…', opts: ['книга', 'дом', 'вода', 'хлеб'], ans: 0 },
    { q: 'Как будет «вода»?', opts: ['مَاء', 'نَار', 'شَمْس', 'لَيْل'], ans: 0, ar: true },
    { q: '«ثَلَاثَة» — какое это число?', opts: ['3', '5', '7', '2'], ans: 0 },
    { q: 'Определённый артикль («the») в арабском —', opts: ['الـ', 'وَ', 'فِي', 'مِنْ'], ans: 0, ar: true },
    { q: '«Я студент» (муж. род):', opts: ['أَنَا طَالِب', 'هُوَ بَيْت', 'نَحْنُ مَاء', 'هِيَ كِتَاب'], ans: 0, ar: true },
  ];
  function obShuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function finishOnboarding(navTo) {
    try { localStorage.setItem(ONBOARD_KEY, '1'); } catch (e) {}
    const ov = document.getElementById('ob-overlay');
    if (ov) { ov.classList.remove('show'); setTimeout(() => ov.remove(), 320); }
    if (navTo && window.App) try { App.navigate(navTo); } catch (e) {}
  }
  function showOnboarding() {
    let ov = document.getElementById('ob-overlay');
    if (ov) ov.remove();
    ov = document.createElement('div');
    ov.id = 'ob-overlay'; ov.className = 'ob-overlay';
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('show'));
    let step = 0;
    function renderTour() {
      const s = OB_SLIDES[step];
      ov.innerHTML =
        '<div class="ob-card">' +
        '<button class="ob-skip" id="ob-skip">Пропустить</button>' +
        '<div class="ob-icon">' + s.icon + '</div>' +
        '<h2>' + s.title + '</h2><p>' + s.text + '</p>' +
        '<div class="ob-dots">' + OB_SLIDES.map((_, i) => '<span class="' + (i === step ? 'on' : '') + '"></span>').join('') + '</div>' +
        '<div class="ob-btns">' +
        (step > 0 ? '<button class="btn btn-light" id="ob-prev">← Назад</button>' : '') +
        '<button class="btn btn-gold" id="ob-next">' + (step < OB_SLIDES.length - 1 ? 'Далее →' : 'Продолжить →') + '</button>' +
        '</div></div>';
      document.getElementById('ob-skip').onclick = () => finishOnboarding();
      const pv = document.getElementById('ob-prev'); if (pv) pv.onclick = () => { step--; renderTour(); };
      document.getElementById('ob-next').onclick = () => { if (step < OB_SLIDES.length - 1) { step++; renderTour(); } else renderIntro(); };
    }
    function renderIntro() {
      ov.innerHTML =
        '<div class="ob-card"><div class="ob-icon">🎯</div>' +
        '<h2>Определим твой уровень</h2>' +
        '<p>7 коротких вопросов — около минуты. Покажем, с чего лучше начать именно тебе.</p>' +
        '<div class="ob-btns ob-btns--col">' +
        '<button class="btn btn-gold" id="ob-pl-start">✅ Пройти тест на уровень</button>' +
        '<button class="btn btn-light" id="ob-pl-beg">Я совсем новичок → Алфавит</button>' +
        '<button class="btn btn-outline" id="ob-pl-skip">Пропустить</button>' +
        '</div></div>';
      document.getElementById('ob-pl-start').onclick = () => runPlacement();
      document.getElementById('ob-pl-beg').onclick = () => finishOnboarding('alphabet');
      document.getElementById('ob-pl-skip').onclick = () => finishOnboarding();
    }
    function runPlacement() {
      const qs = OB_PLACEMENT.map(q => ({ q: q.q, correct: q.opts[q.ans], opts: obShuffle(q.opts.slice()), ar: q.ar }));
      let i = 0, score = 0;
      function renderQ() {
        const it = qs[i];
        ov.innerHTML =
          '<div class="ob-card"><div class="ob-prog">Вопрос ' + (i + 1) + ' из ' + qs.length + '</div>' +
          '<h2 class="ob-q">' + it.q + '</h2>' +
          '<div class="ob-opts ' + (it.ar ? 'ob-opts--ar' : '') + '">' +
          it.opts.map((o, idx) => '<button class="ob-opt" data-i="' + idx + '">' + o + '</button>').join('') +
          '</div></div>';
        ov.querySelectorAll('.ob-opt').forEach(b => b.onclick = () => {
          const chosen = it.opts[+b.dataset.i];
          if (chosen === it.correct) { score++; b.classList.add('correct'); }
          else { b.classList.add('wrong'); ov.querySelectorAll('.ob-opt').forEach(x => { if (it.opts[+x.dataset.i] === it.correct) x.classList.add('correct'); }); }
          ov.querySelectorAll('.ob-opt').forEach(x => x.disabled = true);
          setTimeout(() => { i++; if (i < qs.length) renderQ(); else renderResult(score, qs.length); }, 700);
        });
      }
      renderQ();
    }
    function renderResult(score, total) {
      const pct = score / total;
      let level, navTo, desc, icon;
      if (pct < 0.43) { level = 'Новичок'; icon = '🌱'; navTo = 'alphabet'; desc = 'Начни с алфавита — освоишь буквы и звуки, это фундамент для всего остального.'; }
      else if (pct < 0.86) { level = 'Базовый'; icon = '📗'; navTo = 'vocab'; desc = 'Ты знаешь основы! Сейчас лучше всего набирать слова по темам в Словаре.'; }
      else { level = 'Средний'; icon = '🏅'; navTo = 'grammar'; desc = 'Отличный результат! Двигайся к грамматике и составлению фраз.'; }
      ov.innerHTML =
        '<div class="ob-card"><div class="ob-icon">' + icon + '</div>' +
        '<h2>Твой уровень: ' + level + '</h2>' +
        '<p class="ob-score">Правильно ' + score + ' из ' + total + '</p><p>' + desc + '</p>' +
        '<div class="ob-btns ob-btns--col">' +
        '<button class="btn btn-gold" id="ob-go">Начать отсюда →</button>' +
        '<button class="btn btn-outline" id="ob-home">На главную</button>' +
        '</div></div>';
      document.getElementById('ob-go').onclick = () => finishOnboarding(navTo);
      document.getElementById('ob-home').onclick = () => finishOnboarding('home');
    }
    renderTour();
  }
  function maybeStartOnboarding(force) {
    let seen = false; try { seen = localStorage.getItem(ONBOARD_KEY) === '1'; } catch (e) {}
    if (seen && !force) return;
    showOnboarding();
  }
  window.showOnboarding = showOnboarding;
  window.maybeStartOnboarding = maybeStartOnboarding;

  /* =========================================================
     PWA: service worker
     ========================================================= */
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    // если на устройстве уже был воркер — значит, смена контроллера = обновление кода:
    // перезагружаем страницу ОДИН раз, чтобы подхватить свежий main.js/features.js.
    const __hadController = !!navigator.serviceWorker.controller;
    let __reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (__reloaded) return;
      __reloaded = true;
      if (__hadController) window.location.reload();
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        // активно проверяем обновление при каждом запуске
        reg.update().catch(() => {});
        // если новый воркер уже ждёт — просим его взять управление сразу
        if (reg.waiting) reg.waiting.postMessage('skipWaiting');
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              nw.postMessage('skipWaiting');
            }
          });
        });
      }).catch(() => {});
    });
  }

})();
