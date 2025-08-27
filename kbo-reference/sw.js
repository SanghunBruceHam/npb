// Service Worker for KBO Dashboard - Performance Optimization
const CACHE_NAME = 'kbo-dashboard-v1.0';
const STATIC_CACHE_NAME = 'kbo-static-v1.0';

// 정적 리소스 캐싱 목록
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/images/kbo-main-icon.png',
  // 팀 로고들
  '/images/lg.png',
  '/images/kia.png',
  '/images/samsung.png',
  '/images/doosan.png',
  '/images/ssg.png',
  '/images/nc.png',
  '/images/lotte.png',
  '/images/hanwha.png',
  '/images/kt.png',
  '/images/kiwoom.png'
];

// 동적 데이터 캐싱 패턴
const DYNAMIC_CACHE_PATTERNS = [
  /^https:\/\/.*\.json/,
  /magic-number\/.*\.json/
];

// Service Worker 설치
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // 정적 리소스 캐싱
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
    ])
  );
  
  // 즉시 활성화
  self.skipWaiting();
});

// Service Worker 활성화
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  
  event.waitUntil(
    // 오래된 캐시 삭제
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // 모든 클라이언트에서 즉시 제어
  self.clients.claim();
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 정적 리소스 처리
  if (STATIC_ASSETS.includes(url.pathname) || url.pathname.startsWith('/images/')) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((fetchResponse) => {
          const responseClone = fetchResponse.clone();
          caches.open(STATIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return fetchResponse;
        });
      })
    );
    return;
  }
  
  // JSON 데이터 캐싱 (짧은 TTL)
  if (DYNAMIC_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        
        // 캐시된 데이터가 있고 5분 이내면 캐시 사용
        if (cachedResponse) {
          const cachedTime = cachedResponse.headers.get('sw-cached-time');
          if (cachedTime && (Date.now() - parseInt(cachedTime)) < 300000) {
            return cachedResponse;
          }
        }
        
        // 네트워크에서 새 데이터 가져오기
        try {
          const networkResponse = await fetch(request);
          const responseClone = networkResponse.clone();
          
          // 캐시에 저장 (타임스탬프 추가)
          const modifiedResponse = new Response(await networkResponse.clone().text(), {
            status: networkResponse.status,
            statusText: networkResponse.statusText,
            headers: {
              ...Object.fromEntries(networkResponse.headers.entries()),
              'sw-cached-time': Date.now().toString()
            }
          });
          
          cache.put(request, modifiedResponse);
          return responseClone;
        } catch (error) {
          // 네트워크 실패 시 캐시된 데이터 반환
          return cachedResponse || new Response('Offline', { status: 503 });
        }
      })
    );
    return;
  }
  
  // 기본 네트워크 요청
  event.respondWith(fetch(request));
});

// 백그라운드 동기화 (데이터 업데이트)
self.addEventListener('sync', (event) => {
  if (event.tag === 'kbo-data-sync') {
    event.waitUntil(
      // 최신 데이터로 캐시 업데이트
      updateDataCache()
    );
  }
});

// 데이터 캐시 업데이트 함수
async function updateDataCache() {
  const cache = await caches.open(CACHE_NAME);
  const dataUrls = [
    '/magic-number/data/service-data.json',
    '/magic-number/data/game-by-game-records.json',
    '/magic-number/data/kbo-records.json'
  ];
  
  for (const url of dataUrls) {
    try {
      const response = await fetch(url + '?v=' + Date.now());
      if (response.ok) {
        await cache.put(url, response);
      }
    } catch (error) {
      console.log('Failed to update cache for:', url);
    }
  }
}