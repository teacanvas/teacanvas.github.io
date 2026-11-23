/* TEA CANVAS 오프라인 저장: 한 번 열면 앱 화면·사진·글꼴을 저장해 두고, 인터넷이 끊겨도 열린다 */
const CACHE='teacanvas-v6-46';
const SHELL=['./TEA_CANVAS_prototype_v6.html','./manifest.webmanifest','./assets/icons/icon-192.png','./assets/icons/icon-512.png',
  './assets/photos/s1.jpg','./assets/photos/s2.jpg','./assets/photos/s4.jpg','./assets/photos/s8.jpg'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  // 앱 화면: 새 버전을 먼저 받아보고, 안 되면 저장된 것
  if(url.origin===location.origin&&(req.mode==='navigate'||url.pathname.endsWith('.html'))){
    e.respondWith(fetch(req,{cache:'no-cache'}).then(r=>{ const cp=r.clone();   // 휴대폰 브라우저 캐시를 건너뛰고 늘 서버에 새 버전을 확인
 caches.open(CACHE).then(c=>c.put(req,cp)); return r; }).catch(()=>caches.match(req,{ignoreSearch:true}))); return; }
  // 나머지(사진·아이콘·글꼴): 저장된 것을 먼저
  e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(r=>{ if(r.ok||r.type==='opaque'){ const cp=r.clone(); caches.open(CACHE).then(c=>c.put(req,cp)); } return r; })));
});
