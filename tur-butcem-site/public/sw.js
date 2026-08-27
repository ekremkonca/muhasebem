const CACHE_PREFIX='rehberlik-muhasebe-';
const CACHE='rehberlik-muhasebe-v14-fresh';

self.addEventListener('install',event=>{
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  const url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/api/'))return;

  const freshOnly=req.mode==='navigate'||['document','script','style'].includes(req.destination);
  if(freshOnly){
    event.respondWith(fetch(req,{cache:'no-store'}));
  }
});
