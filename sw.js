/* EFI Web: scoped app shell only. Never cache imports, student records or model binaries. */
const CACHE='efi-core-rc2-v1';
const ASSETS=['./efi-intelligence/','./efi-intelligence/index.html','./efi-intelligence/style.css','./efi-intelligence/app.mjs','./efi-intelligence/analyzer.mjs','./efi-intelligence/fixtures.mjs','./efi-intelligence/importer.mjs','./manifest.webmanifest','./efi-icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil((async()=>{const keys=await caches.keys();for(const k of keys)if(k.startsWith('efi-core-')&&k!==CACHE)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{const req=e.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin)return;
 const permitted=new Set(ASSETS.map(p=>new URL(p,self.registration.scope).pathname));if(!permitted.has(url.pathname))return;
 e.respondWith(caches.open(CACHE).then(async c=>(await c.match(req))||fetch(req)));
});