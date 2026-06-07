/**
 * animations.js — GSAP Premium Animation System
 * Приложение «arabtili-hasanboy» — Arabic Learning Dashboard
 *
 * Загрузка: ПОСЛЕ gsap.min.js, main.js, features.js (в самом конце <body>).
 *
 * Архитектура:
 *   1. Перехватываем App.navigate() — добавляем очередь exit→enter.
 *   2. EXIT: текущий вид плавно уходит (fade + micro-slide).
 *   3. ENTER: для каждой секции — именная кинематографическая сцена.
 *   4. Уважаем data-motion="full|reduced|off".
 *   5. applyTheme() получает жидкий кроссфейд.
 */

(function (W, D) {
  'use strict';

  /* ============================================================
     КОНСТАНТЫ
  ============================================================ */

  /** 28 букв арабского алфавита — для кольца Таваф */
  var AR_LETTERS = [
    'ا','ب','ت','ث','ج','ح','خ',
    'د','ذ','ر','ز','س','ش','ص',
    'ض','ط','ظ','ع','غ','ف','ق',
    'ك','ل','م','ن','ه','و','ي'
  ];

  /* ============================================================
     ЗАГРУЗКА — ждём GSAP + App
  ============================================================ */

  function boot() {
    if (!W.gsap || !W.App || !W.App.navigate) {
      setTimeout(boot, 60);
      return;
    }
    // Регистрируем ScrollTrigger если доступен
    if (W.ScrollTrigger) gsap.registerPlugin(W.ScrollTrigger);
    // Не ругаться когда элемент не найден (null target)
    gsap.config({ nullTargetWarn: false });

    patchNavigate();      // перехват tab-переходов
    patchApplyTheme();    // перехват смены темы
    initFirstLoad();      // анимация первого входа на Home
  }

  if (D.readyState === 'loading') {
    D.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ============================================================
     УТИЛИТЫ
  ============================================================ */

  /** Текущий режим анимаций (читаем из <html data-motion="...">) */
  function motion() {
    return D.documentElement.getAttribute('data-motion') || 'full';
  }

  /** Найти текущую активную секцию по DOM (не зависим от state.*) */
  function activeView() {
    var el = D.querySelector('.view.active');
    return el ? el.id.replace('view-', '') : 'home';
  }

  /**
   * Подавить CSS-анимацию элемента пока GSAP управляет им.
   * (CSS @keyframes fadeUp / viewIn конфликтуют с GSAP opacity/transform)
   */
  function freezeCSS(el) { if (el) el.style.animation = 'none'; }
  function thawCSS(el)   { if (el) el.style.animation = '';     }

  /** Быстрый вход для режима reduced */
  function reducedFade(el, cb) {
    gsap.fromTo(el,
      { opacity: 0 },
      { opacity: 1, duration: 0.22, ease: 'none', onComplete: cb || null }
    );
  }

  /* ============================================================
     ПЕРЕХВАТ App.navigate — ОЧЕРЕДЬ КИНЕМАТОГРАФИЧЕСКИХ ПЕРЕХОДОВ
  ============================================================ */

  var _busy = false; // блокировка двойного клика во время анимации

  function patchNavigate() {
    var _orig = App.navigate.bind(App);

    /**
     * Вставляем в App.navigate() последовательную очередь:
     *   1. exitView(текущий вид)
     *   2. _orig(новый вид)  → DOM рендер + .active
     *   3. enterView(новый вид)
     */
    App.navigate = function (view, param) {
      var m    = motion();
      var prev = activeView();

      /* --- motion="off" или та же секция — без анимации ---------- */
      if (m === 'off' || prev === view) {
        _orig(view, param);
        return;
      }

      /* --- motion="reduced" — лёгкий фейд ----------------------- */
      if (m === 'reduced') {
        _orig(view, param);
        var el = D.getElementById('view-' + view);
        if (el) reducedFade(el);
        return;
      }

      /* --- motion="full" — полная кинематография ----------------- */
      if (_busy) return; // защита: ждём конца текущего перехода
      _busy = true;

      var prevEl   = D.getElementById('view-' + prev);
      var targetEl = D.getElementById('view-' + view);

      // Предварительно скрываем новый вид (до добавления .active)
      // → предотвращает мигание при display:block + opacity:1
      if (targetEl) {
        freezeCSS(targetEl);
        gsap.set(targetEl, { opacity: 0 });
      }

      // ШАГ 1: EXIT → ШАГ 2: _orig → ШАГ 3: ENTER
      exitView(prevEl, function () {
        _orig(view, param); // синхронный рендер + classList.add('active')
        requestAnimationFrame(function () {
          var newEl = D.getElementById('view-' + view);
          enterView(newEl, view, function () { _busy = false; });
        });
      });
    };
  }

  /* ============================================================
     EXIT ANIMATION — уход текущей секции
  ============================================================ */

  function exitView(el, cb) {
    if (!el) { cb(); return; }
    freezeCSS(el);

    gsap.to(el, {
      opacity : 0,
      y       : -16,
      scale   : 0.972,
      duration: 0.28,
      ease    : 'power2.in',
      force3D : true,
      onComplete: function () {
        gsap.set(el, { clearProps: 'opacity,y,scale,transform' });
        thawCSS(el);
        cb();
      }
    });
  }

  /* ============================================================
     ENTER — диспетчер по названию секции
  ============================================================ */

  function enterView(el, view, done) {
    if (!el) { done(); return; }
    thawCSS(el); // снимаем animation:none, GSAP дальше управляет инлайн-стилями

    var map = {
      home    : animateHome,
      grammar : animateGrammar,
      progress: animateProgress,
      settings: animateSettings
    };

    (map[view] || animateDefault)(el, done);
  }

  /* ============================================================
     DEFAULT ENTER — все прочие секции
  ============================================================ */

  function animateDefault(el, done) {
    var items = el.querySelectorAll(
      '.view-header, [class*="-card"], [class*="-grid"], ' +
      '[class*="-list"], [class*="-content"], [class*="-layout"]'
    );

    var tl = gsap.timeline({ onComplete: done });
    tl.fromTo(el,    { opacity: 0 }, { opacity: 1, duration: 0.18 });
    tl.fromTo(items,
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, duration: 0.42, ease: 'power3.out',
        stagger: { amount: 0.38, from: 'start' } },
      '-=0.08'
    );
  }

  /* ============================================================

     ██╗  ██╗ ██████╗ ███╗   ███╗███████╗
     ██║  ██║██╔═══██╗████╗ ████║██╔════╝
     ███████║██║   ██║██╔████╔██║█████╗
     ██╔══██║██║   ██║██║╚██╔╝██║██╔══╝
     ██║  ██║╚██████╔╝██║ ╚═╝ ██║███████╗
     ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝

     «ЭФФЕКТ ТАВАФ» — 7 кругов орбиты арабского алфавита
  ============================================================ */

  function animateHome(el, done) {
    var tl = gsap.timeline({ onComplete: done });

    /* --- DOM-элементы секции Home ----------------------------- */
    var heroBanner   = el.querySelector('.hero-banner');
    var heroText     = el.querySelector('.hero-text');
    var heroDeco     = el.querySelector('.hero-deco');
    var arabicCircle = el.querySelector('.arabic-circle');
    var statCards    = el.querySelectorAll('#home-stats .stat-card');
    var wordOfDay    = el.querySelector('#word-of-day');
    var quickCards   = el.querySelectorAll('.quick-card');
    var featCards    = el.querySelectorAll('.featured-card');
    var contCards    = el.querySelectorAll('.continue-card');

    /* --- Начальные состояния (всё скрыто) --------------------- */
    gsap.set(el,         { opacity: 0 });
    gsap.set(heroBanner, { opacity: 0 });
    gsap.set(heroText,   { opacity: 0, y: 30 });
    if (arabicCircle)
      gsap.set(arabicCircle, { opacity: 0, scale: 0.38 });
    if (statCards.length)
      gsap.set(statCards, { opacity: 0, y: 40 });
    if (wordOfDay && wordOfDay.children.length)
      gsap.set(wordOfDay, { opacity: 0, scale: 0.86 });
    if (quickCards.length)
      gsap.set(quickCards, { opacity: 0, y: 20 });
    if (featCards.length)
      gsap.set(featCards, { opacity: 0, x: -20 });
    if (contCards.length)
      gsap.set(contCards, { opacity: 0, x: -16 });

    /* ===== СЦЕНА ============================================== */

    // 0 — fade вида
    tl.to(el, { opacity: 1, duration: 0.15, ease: 'none' });

    // 1 — Hero-баннер появляется
    tl.to(heroBanner, { opacity: 1, duration: 0.3, ease: 'power2.out' }, '-=0.05');

    // 2 — Текст: упругий влёт снизу («elastic из пустоты»)
    tl.to(heroText, {
      opacity: 1, y: 0,
      duration: 0.72, ease: 'elastic.out(1, 0.62)'
    }, '-=0.12');

    // 3 — Bismillah-круг: пружинное появление
    if (arabicCircle) {
      tl.to(arabicCircle, {
        opacity: 1, scale: 1,
        duration: 0.58, ease: 'back.out(1.85)'
      }, '-=0.48');
    }

    // 4 — Запуск кольца Таваф (параллельно, независимо от главного tl)
    //     Видимость круга гарантируем проверкой offsetWidth > 0
    if (arabicCircle && heroDeco && arabicCircle.offsetWidth > 0) {
      tl.call(function () { launchTawafRing(arabicCircle, heroDeco); });
    }

    // 5 — Стат-карточки всплывают снизу (задержка — пока идёт Таваф)
    if (statCards.length) {
      tl.to(statCards, {
        opacity: 1, y: 0,
        duration: 0.52, ease: 'power3.out',
        stagger: 0.1
      }, arabicCircle ? '+=0.22' : '-=0.1');
    }

    // 5а — Счётчики: анимируем числа 0 → значение (независимо)
    tl.call(function () { animateCounters(el); });

    // 6 — Слово дня: масштабируется на место
    if (wordOfDay && wordOfDay.children.length) {
      tl.to(wordOfDay, {
        opacity: 1, scale: 1,
        duration: 0.5, ease: 'back.out(1.5)'
      }, '-=0.5');
    }

    // 7 — Быстрый доступ: волна сверху-вниз
    if (quickCards.length) {
      tl.to(quickCards, {
        opacity: 1, y: 0,
        duration: 0.38, ease: 'power2.out',
        stagger: { amount: 0.4, from: 'start' }
      }, '-=0.42');
    }

    // 8 — Популярные игры: слева направо
    if (featCards.length) {
      tl.to(featCards, {
        opacity: 1, x: 0,
        duration: 0.32, ease: 'power2.out',
        stagger: 0.07
      }, '-=0.28');
    }

    // 9 — Карточки «Продолжить» (если есть)
    if (contCards.length) {
      tl.to(contCards, {
        opacity: 1, x: 0,
        duration: 0.28, ease: 'power2.out',
        stagger: 0.08
      }, '-=0.28');
    }
  }

  /**
   * Анимируем числа в стат-карточках от 0 до текущего значения.
   * Формат: «14» или «27/28» — оба варианта учтены.
   */
  function animateCounters(el) {
    el.querySelectorAll('#home-stats .stat-value').forEach(function (valEl) {
      var raw   = valEl.textContent.trim();
      var m     = raw.match(/^(\d+)(?:\/(\d+))?/);
      if (!m) return;
      var target = parseInt(m[1], 10);
      var denom  = m[2]; // знаменатель: «28» из «27/28», иначе undefined
      var obj    = { v: 0 };
      gsap.to(obj, {
        v       : target,
        duration: 1.35,
        ease    : 'power2.out',
        onUpdate: function () {
          valEl.textContent = denom
            ? Math.round(obj.v) + '/' + denom
            : String(Math.round(obj.v));
        }
      });
    });
  }

  /**
   * Строим кольцо из 28 арабских букв вокруг arabicCircle
   * и запускаем 7 полных орбитальных оборотов (7 × 360° = 2520°).
   *
   * Кольцо (.tawaf-ring) позиционируется абсолютно в центре .hero-deco.
   * Каждая буква размещена по формуле rotate(angle) translateY(-radius).
   * GSAP вращает весь ring-div → буквы орбитируют вокруг Бисмиллы.
   * По завершении кольцо автоматически удаляется из DOM.
   */
  function launchTawafRing(arabicCircle, heroDeco) {
    /* Убираем предыдущее кольцо (при повторном входе) */
    heroDeco.querySelectorAll('.tawaf-ring').forEach(function (r) { r.remove(); });

    var ring = D.createElement('div');
    ring.className = 'tawaf-ring';

    /* Центруем ring в heroDeco (width/height = 0 → pivot в центре) */
    Object.assign(ring.style, {
      position       : 'absolute',
      top            : '50%',
      left           : '50%',
      width          : '0',
      height         : '0',
      pointerEvents  : 'none',
      zIndex         : '3',
      transformOrigin: '0px 0px',
      willChange     : 'transform',
    });

    /* Радиус орбиты = половина диаметра круга + зазор */
    var radius = Math.round((arabicCircle.offsetWidth || 240) / 2) + 42;
    var count  = AR_LETTERS.length; // 28

    AR_LETTERS.forEach(function (letter, i) {
      var angle = (360 / count) * i;
      var span  = D.createElement('span');
      span.setAttribute('aria-hidden', 'true');
      span.textContent = letter;

      Object.assign(span.style, {
        /* Позиционирование по орбите (CSS transform chain, применяется справа налево):
           1. translateX(-50%)  — центруем букву по X
           2. translateY(-R px) — выносим на радиус
           3. rotate(angle°)    — ставим на нужный угол орбиты  */
        position       : 'absolute',
        display        : 'block',
        width          : '24px',
        height         : '24px',
        lineHeight     : '24px',
        textAlign      : 'center',
        fontFamily     : 'var(--ar-font, "Amiri", serif)',
        fontSize       : '15px',
        fontWeight     : '700',
        color          : 'var(--gold, #d4af37)',
        textShadow     : '0 0 12px rgba(212,175,55,.7)',
        transform      : 'rotate(' + angle + 'deg) translateY(-' + radius + 'px) translateX(-50%)',
        transformOrigin: '50% 50%',
        opacity        : '0',
        willChange     : 'opacity',
        userSelect     : 'none',
      });

      ring.appendChild(span);
    });

    heroDeco.style.position = 'relative'; // защита на случай если CSS не задан
    heroDeco.appendChild(ring);

    var letters = ring.querySelectorAll('span');

    /* Плавный fade-in букв (0 → 1, рассыпается по кругу) */
    gsap.fromTo(letters, { opacity: 0 }, {
      opacity : 1,
      duration: 0.55,
      stagger : 0.028,
      ease    : 'power2.out'
    });

    /* 7 оборотов за 5.6 секунды
       ease: power1.inOut — мягкий разгон/торможение, как реальный Таваф */
    gsap.fromTo(ring,
      { rotation: 0 },
      {
        rotation: 2520,     // 7 × 360°
        duration: 5.6,
        ease    : 'power1.inOut',
        force3D : true,
        onComplete: function () {
          /* Таваф завершён — буквы растворяются по кругу */
          gsap.to(letters, {
            opacity : 0,
            duration: 0.5,
            stagger : 0.024,
            ease    : 'power1.in',
            onComplete: function () { ring.remove(); }
          });
        }
      }
    );
  }

  /* ============================================================

     ██████╗ ██████╗  █████╗ ███╗   ███╗███╗   ███╗ █████╗ ██████╗
    ██╔════╝ ██╔══██╗██╔══██╗████╗ ████║████╗ ████║██╔══██╗██╔══██╗
    ██║  ███╗██████╔╝███████║██╔████╔██║██╔████╔██║███████║██████╔╝
    ██║   ██║██╔══██╗██╔══██║██║╚██╔╝██║██║╚██╔╝██║██╔══██║██╔══██╗
    ╚██████╔╝██║  ██║██║  ██║██║ ╚═╝ ██║██║ ╚═╝ ██║██║  ██║██║  ██║
     ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝

     «РАСКРЫТИЕ ЗОНТОВ МЕДИНЫ»
     Горизонталь → вертикаль: имитация механизма зонтов Мечети Пророка
  ============================================================ */

  function animateGrammar(el, done) {
    var tl = gsap.timeline({ onComplete: done });

    var header    = el.querySelector('.view-header');
    var menuItems = el.querySelectorAll(
      '#grammar-menu .grammar-item, #grammar-menu .grammar-unit-header'
    );
    var content   = el.querySelector('#grammar-content');

    /* --- Начальные состояния ---------------------------------- */
    gsap.set(el,     { opacity: 0 });
    gsap.set(header, { opacity: 0, y: -20 });

    if (menuItems.length)
      gsap.set(menuItems, { opacity: 0, x: -28, y: -6 });

    if (content)
      /* scaleX = 0.04 (почти нет) → scaleY = 0.55 (сложен вертикально)
         точка трансформации = верхний центр (как ось складного зонта) */
      gsap.set(content, {
        opacity          : 0,
        scaleX           : 0.04,
        scaleY           : 0.55,
        transformOrigin  : 'top center'
      });

    /* ===== СЦЕНА ============================================== */

    // 0 — вид
    tl.to(el, { opacity: 1, duration: 0.15 });

    // 1 — Заголовок падает сверху
    tl.to(header, { opacity: 1, y: 0, duration: 0.32, ease: 'power3.out' }, '-=0.05');

    // 2 — Меню: каскад сверху вниз (водопад)
    if (menuItems.length) {
      tl.to(menuItems, {
        opacity : 1, x: 0, y: 0,
        duration: 0.34, ease: 'power2.out',
        stagger : { amount: 0.58, from: 'start' }
      }, '-=0.14');
    }

    // 3а — Зонт раскрывается ГОРИЗОНТАЛЬНО (ось спицы)
    if (content) {
      tl.to(content, {
        scaleX  : 1,
        duration: 0.38,
        ease    : 'power3.out'
      }, '-=0.22');

      // 3б — Затем ВЕРТИКАЛЬНО с упругостью (полотно зонта)
      tl.to(content, {
        opacity         : 1,
        scaleY          : 1,
        duration        : 0.52,
        ease            : 'elastic.out(1, 0.68)',
        transformOrigin : 'top center'
      }, '-=0.22');

      // 4 — Внутреннее содержание появляется построчно
      tl.call(function () {
        var inner = content.querySelectorAll(
          'table, .grammar-tips, .grammar-actions, p, h2, h3, h4, .exercise-block, li'
        );
        if (inner.length) {
          gsap.fromTo(inner,
            { opacity: 0, y: 11 },
            { opacity: 1, y: 0, duration: 0.28, stagger: 0.055, ease: 'power2.out' }
          );
        }
      });
    }
  }

  /* ============================================================

    ██████╗ ██████╗  ██████╗  ██████╗ ██████╗ ███████╗███████╗███████╗
    ██╔══██╗██╔══██╗██╔═══██╗██╔════╝ ██╔══██╗██╔════╝██╔════╝██╔════╝
    ██████╔╝██████╔╝██║   ██║██║  ███╗██████╔╝█████╗  ███████╗███████╗
    ██╔═══╝ ██╔══██╗██║   ██║██║   ██║██╔══██╗██╔══╝  ╚════██║╚════██║
    ██║     ██║  ██║╚██████╔╝╚██████╔╝██║  ██║███████╗███████║███████║
    ╚═╝     ╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝

     «ПОТОК ДАННЫХ»
     Значок → XP-полоса → SVG-кольцо → категорийные бары
  ============================================================ */

  function animateProgress(el, done) {
    var tl = gsap.timeline({ onComplete: done });

    var header        = el.querySelector('.view-header');
    var rankCard      = el.querySelector('.rank-card');
    var rankBadge     = el.querySelector('.rank-card__badge');
    var rankBarFill   = el.querySelector('.rank-bar__fill');
    var ringFill      = el.querySelector('.ring-fill');
    var catFills      = el.querySelectorAll('.cat-progress-fill');
    var progressCards = el.querySelectorAll('.progress-card');
    var achievements  = el.querySelectorAll('.achievement');

    /* --- Снимаем целевые значения и обнуляем ------------------ */

    var rankBarTarget = '0%';
    if (rankBarFill) {
      rankBarTarget = rankBarFill.style.width || '0%';
      rankBarFill.style.width = '0%';
    }

    /* SVG ring: circumference r=60 → 2π×60 ≈ 376.99
       renderProgress() уже записал финальный stroke-dashoffset в атрибут.
       Сохраняем его и сбрасываем на полный (невидимый) круг.         */
    var CIRCUM     = 2 * Math.PI * 60;
    var ringTarget = CIRCUM; // по умолчанию — пустой (100% invisible)
    if (ringFill) {
      ringTarget = parseFloat(ringFill.getAttribute('stroke-dashoffset') || CIRCUM);
      ringFill.setAttribute('stroke-dashoffset', String(CIRCUM));
    }

    /* Категорийные бары — сохраняем ширины, обнуляем */
    var catTargets = [];
    catFills.forEach(function (f) {
      catTargets.push(f.style.width || '0%');
      f.style.width = '0%';
    });

    /* --- Начальные состояния ---------------------------------- */
    gsap.set(el,     { opacity: 0 });
    gsap.set(header, { opacity: 0, y: -18 });
    if (rankCard)     gsap.set(rankCard,      { opacity: 0, y: 24 });
    if (rankBadge)    gsap.set(rankBadge,     { rotation: -360, scale: 0.12, opacity: 0 });
    if (progressCards.length) gsap.set(progressCards, { opacity: 0, y: 24 });
    if (achievements.length)  gsap.set(achievements,  { opacity: 0, x: -14 });

    /* ===== СЦЕНА ============================================== */

    // 0 — вид
    tl.to(el, { opacity: 1, duration: 0.15 });

    // 1 — Заголовок
    tl.to(header, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' }, '-=0.05');

    // 2 — Карточка ранга всплывает
    if (rankCard) {
      tl.to(rankCard, { opacity: 1, y: 0, duration: 0.38, ease: 'power3.out' }, '-=0.1');
    }

    // 3 — Значок ранга: «вращение на место» (как монета, падающая на стол)
    if (rankBadge) {
      tl.to(rankBadge, {
        rotation: 0, scale: 1, opacity: 1,
        duration: 0.9, ease: 'elastic.out(1, 0.52)', force3D: true
      }, '-=0.3');
    }

    // 4 — XP-полоса разворачивается слева направо
    if (rankBarFill) {
      tl.to(rankBarFill, {
        width   : rankBarTarget,
        duration: 1.1,
        ease    : 'power2.out'
      }, '-=0.55');
    }

    // 5 — Карточки прогресса поднимаются
    if (progressCards.length) {
      tl.to(progressCards, {
        opacity: 1, y: 0,
        duration: 0.42, ease: 'power3.out', stagger: 0.1
      }, '-=0.75');
    }

    // 6 — SVG-кольцо: «обводка по контуру» (stroke-dashoffset)
    if (ringFill) {
      var ringProxy = { v: CIRCUM };
      tl.to(ringProxy, {
        v       : ringTarget,
        duration: 1.5,
        ease    : 'power2.inOut',
        onUpdate: function () {
          ringFill.setAttribute('stroke-dashoffset', String(ringProxy.v));
        }
      }, '-=0.6');
    }

    // 7 — Категорийные бары заполняются сверху вниз
    tl.call(function () {
      catFills.forEach(function (f, i) {
        gsap.to(f, {
          width   : catTargets[i] || '0%',
          duration: 0.72,
          delay   : i * 0.058,
          ease    : 'power2.out'
        });
      });
    }, [], '-=0.45');

    // 8 — Достижения скользят справа
    if (achievements.length) {
      tl.to(achievements, {
        opacity: 1, x: 0,
        duration: 0.28, stagger: 0.045, ease: 'power2.out'
      }, '-=0.75');
    }
  }

  /* ============================================================

    ███████╗███████╗████████╗████████╗██╗███╗   ██╗ ██████╗ ███████╗
    ██╔════╝██╔════╝╚══██╔══╝╚══██╔══╝██║████╗  ██║██╔════╝ ██╔════╝
    ███████╗█████╗     ██║      ██║   ██║██╔██╗ ██║██║  ███╗███████╗
    ╚════██║██╔══╝     ██║      ██║   ██║██║╚██╗██║██║   ██║╚════██║
    ███████║███████╗   ██║      ██║   ██║██║ ╚████║╚██████╔╝███████║
    ╚══════╝╚══════╝   ╚═╝      ╚═╝   ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝

     «КРОССФЕЙД ЦВЕТОВОЙ ПАЛИТРЫ»
  ============================================================ */

  function animateSettings(el, done) {
    var tl = gsap.timeline({ onComplete: done });

    var header   = el.querySelector('.view-header');
    var content  = el.querySelector('#settings-content');
    var blocks   = el.querySelectorAll('.set-block');
    var swatches = el.querySelectorAll('.theme-swatch');

    /* --- Начальные состояния ---------------------------------- */
    gsap.set(el,     { opacity: 0 });
    gsap.set(header, { opacity: 0, y: -16 });

    /* ===== СЦЕНА ============================================== */

    // 0 — вид
    tl.to(el, { opacity: 1, duration: 0.2 });

    // 1 — Заголовок
    tl.to(header, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, '-=0.1');

    // 2 — Блоки настроек (если уже отрендерены)
    if (blocks.length) {
      gsap.set(blocks, { opacity: 0, y: 18 });
      tl.to(blocks, {
        opacity: 1, y: 0,
        duration: 0.4, ease: 'power3.out', stagger: 0.1
      }, '-=0.14');
    } else if (content) {
      // renderSettings() отрисует контент чуть позже — анимируем враппер
      gsap.set(content, { opacity: 0, y: 14 });
      tl.to(content, { opacity: 1, y: 0, duration: 0.38, ease: 'power3.out' }, '-=0.1');
    }

    // 3 — Свотчи тем: вырастают из центра по одному
    if (swatches.length) {
      gsap.set(swatches, { opacity: 0, scale: 0.62 });
      tl.to(swatches, {
        opacity: 1, scale: 1,
        duration: 0.34, ease: 'back.out(1.65)', stagger: 0.062
      }, '-=0.22');
    }
  }

  /* ============================================================
     SETTINGS — жидкий кроссфейд при смене темы
     Перехватываем window.applyTheme() из features.js:
       1. Создаём full-screen overlay с текущим фоновым цветом.
       2. Применяем новую тему (CSS-переменные меняются мгновенно).
       3. Overlay плавно исчезает — открывая новую тему снизу.
  ============================================================ */

  function patchApplyTheme() {
    if (!W.applyTheme) { setTimeout(patchApplyTheme, 200); return; }

    var _orig = W.applyTheme;

    W.applyTheme = function (id) {
      if (motion() !== 'full') {
        _orig(id);
        return;
      }

      /* Снимаем «скриншот» текущего фона через CSS-переменную --bg */
      var cs  = getComputedStyle(D.documentElement);
      var bg  = cs.getPropertyValue('--bg').trim() || '#faf6ef';
      var sidebar = cs.getPropertyValue('--side1').trim() || bg;

      var overlay = D.createElement('div');
      Object.assign(overlay.style, {
        position  : 'fixed',
        inset     : '0',
        zIndex    : '9998',
        background: 'linear-gradient(135deg, ' + sidebar + ' 0%, ' + bg + ' 100%)',
        opacity   : '1',
        pointerEvents: 'none',
        willChange: 'opacity',
      });
      D.body.appendChild(overlay);

      /* Применяем тему ДО старта анимации overlay */
      _orig(id);

      /* Overlay тает — новая тема «просвечивает» снизу */
      gsap.to(overlay, {
        opacity : 0,
        duration: 0.68,
        ease    : 'power2.inOut',
        onComplete: function () { overlay.remove(); }
      });
    };
  }

  /* ============================================================
     ПЕРВЫЙ ВХОД — Home при загрузке страницы
     Запускаем анимацию Home ПОСЛЕ того как:
       — welcome-overlay скрыл экран (или его нет)
       — renderHome() уже отработал (вызван из init())
  ============================================================ */

  function initFirstLoad() {
    W.addEventListener('load', function () {
      /*
       * Небольшой setTimeout — гарантируем что:
       *   1. main.js → init() завершился (renderHome вызван)
       *   2. features.js инициализирован (staggerView отработал)
       * 300мс достаточно; welcome-overlay всё равно скрывает экран
       * пока пользователь не нажмёт кнопку.
       */
      setTimeout(function () {
        var m      = motion();
        var homeEl = D.getElementById('view-home');
        if (!homeEl || !homeEl.classList.contains('active')) return;

        if (m === 'off')      { return; }
        if (m === 'reduced')  { reducedFade(homeEl); return; }

        /* full — запускаем полную Tawaf-сцену */
        animateHome(homeEl, function () {});
      }, 320);
    });
  }

})(window, document);
