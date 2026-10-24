/* VOID FRONTIER — service worker (генерируется tools/gen_sw.py). Версия кеша меняется при любом изменении файлов. */
const CACHE='void-frontier-v2.0-f4d5e250cb';
const ASSETS=[
 './',
 './assets/architect.jpg',
 './assets/sprites/duckling.png',
 './assets/sprites/enemy_bomber.png',
 './assets/sprites/enemy_carrier.png',
 './assets/sprites/enemy_drone.png',
 './assets/sprites/enemy_heavy.png',
 './assets/sprites/enemy_scout.png',
 './assets/sprites/enemy_sniper.png',
 './assets/sprites/enemy_zig.png',
 './assets/sprites/mini_duck.png',
 './assets/sprites/mini_flower.png',
 './assets/sprites/mini_mountain.png',
 './assets/sprites/mini_slipper.png',
 './assets/sprites/player_lvl1.png',
 './assets/sprites/player_lvl2.png',
 './assets/sprites/player_lvl3.png',
 './assets/sprites/player_lvl4.png',
 './assets/sprites/player_lvl5.png',
 './icon-192.png',
 './icon-512.png',
 './icon.svg',
 './index.html',
 './js/art.js',
 './js/audio.js',
 './js/combat.js',
 './js/engine.js',
 './js/main.js',
 './js/market.js',
 './js/office.js',
 './js/render.js',
 './js/save.js',
 './js/story.js',
 './js/ui.js',
 './manifest.webmanifest'
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('void-frontier-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(hit=>hit||fetch(e.request).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return res})))
});
