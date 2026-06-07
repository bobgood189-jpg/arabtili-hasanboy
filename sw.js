/* Service Worker — офлайн-кэш приложения (PWA)
   Стратегия:
   • КОД (html/js/css/навигация) → network-first: онлайн всегда берётся
     свежая версия с сервера, офлайн — из кэша. Это гарантирует, что новые
     правки попадают на устройство сразу, без «застревания» на старом коде.
   • Прочее (картинки/иконки/шрифты) → cache-first для скорости. */
const CACHE = 'arabic-v7';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './config.js',
  './main.js',
  './data.js',
  './data-extra.js',
  './data-vocab.js',
  './data-pron.js',
  './data-grammar.js',
  './data-nouns.js',
  './data-words300.js',
  './data-words600.js',
  './data-words700.js',
  './data-words800.js',
  './data-words900.js',
  './data-grammar-ext.js',
  './data-grammar-ext2.js',
  './data-grammar-more.js',
  './data-content.js',
  './data-dialogues2.js',
  './data-hadith.js',
  './data-i18n.js',
  './data-i18n-auto.js',
  './features.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './build/icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// позволяем странице форсировать активацию нового воркера
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

function isCode(url) {
  const p = url.pathname;
  return p.endsWith('.js') || p.endsWith('.css') || p.endsWith('.html') ||
         p === '/' || p.endsWith('/');
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // внешние ресурсы (шрифты Google и т.п.) — сеть, без вмешательства
  if (url.origin !== location.origin) return;

  const isNav = e.request.mode === 'navigate';

  // КОД и навигация → network-first
  if (isNav || isCode(url)) {
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type === 'basic') {
            const clone = resp.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(e.request).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // прочее (картинки/иконки) → cache-first
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type === 'basic') {
            const clone = resp.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
