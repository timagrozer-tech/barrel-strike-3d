#!/usr/bin/env python3
"""Генерирует www/sw.js со списком ВСЕХ файлов игры для офлайн-кеша. Запускать перед каждым релизом."""
import os,hashlib,pathlib
root=pathlib.Path(__file__).resolve().parents[1]/'www'
files=sorted(str(p.relative_to(root)).replace(os.sep,'/') for p in root.rglob('*') if p.is_file() and p.name!='sw.js' and not p.name.startswith('.'))
h=hashlib.sha1(b''.join((root/f).read_bytes() for f in files)).hexdigest()[:10]
assets=",\n ".join(repr('./'+f) for f in ['']+files)
sw=f"""/* VOID FRONTIER — service worker (генерируется tools/gen_sw.py). Версия кеша меняется при любом изменении файлов. */
const CACHE='void-frontier-v2.0-{h}';
const ASSETS=[
 {assets}
];
self.addEventListener('install',e=>{{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))}});
self.addEventListener('activate',e=>{{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('void-frontier-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))}});
self.addEventListener('fetch',e=>{{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 e.respondWith(caches.match(e.request,{{ignoreSearch:true}}).then(hit=>hit||fetch(e.request).then(res=>{{if(res.ok){{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}}return res}})))
}});
"""
(root/'sw.js').write_text(sw,encoding='utf-8');print('sw.js:',len(files),'files, cache',h)
