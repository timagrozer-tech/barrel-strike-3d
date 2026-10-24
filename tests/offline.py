from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':412,'height':915});pg=ctx.new_page()
    pg.goto('http://localhost:8081/');pg.wait_for_timeout(500)
    pg.evaluate("navigator.serviceWorker.register('sw.js')");pg.wait_for_function("navigator.serviceWorker.controller!==null||navigator.serviceWorker.ready.then(()=>true)",timeout=10000)
    pg.wait_for_timeout(2500)
    n=pg.evaluate("caches.keys().then(k=>Promise.all(k.map(x=>caches.open(x).then(c=>c.keys().then(r=>r.length)))))");print('cached entries',n)
    ctx.set_offline(True);pg.reload();pg.wait_for_timeout(1500)
    print('offline state',pg.evaluate('state'),'sprites',pg.evaluate("Object.values(IMG).filter(i=>i.naturalWidth>0).length"),'/',pg.evaluate("Object.keys(IMG).length"))
    b.close()
