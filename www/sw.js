const CACHE='void-frontier-v15-claude-handoff';
const ASSETS=[
'./','./index.html','./game.js','./office.js','./market.js',
'./assets/architect.jpg',
'./assets/sprites/player_lvl1.png','./assets/sprites/player_lvl2.png',
'./assets/sprites/player_lvl3.png','./assets/sprites/player_lvl4.png',
'./assets/sprites/enemy_scout.png','./assets/sprites/enemy_zig.png',
'./assets/sprites/enemy_heavy.png',
'./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'
];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('void-frontier-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
