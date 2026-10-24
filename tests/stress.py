from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required']);pg=b.new_page(viewport={'width':412,'height':915},device_scale_factor=2.6,is_mobile=True,has_touch=True)
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8081/');pg.wait_for_timeout(600);pg.click('#start')
    a=pg.evaluate("()=>{initAudio();for(const n of ['shot','hit','explode','explodeBig','bomb','laser','charge','phase','powerup','win','lose','alert'])sfx(n);return audio.ctx&&audio.ctx.state}")
    print('audio state',a)
    for q in ['low','medium','high']:
        pg.evaluate(f"()=>{{settings.quality='{q}';applyQuality();mode='endless';reset();player.max=1e9;player.hp=1e9;weaponLevel=10;drones=2;missiles=3;hullLevel=5;spawnBoss();boss.y=boss.ty;boss.hp=boss.max*.2;boss.max=1e9;boss.hp=2e8}}")
        pg.wait_for_timeout(1500)
        pg.evaluate("()=>{for(let i=0;i<14;i++)makeFoe(pick(['scout','zig','heavy','bomber']),rnd(40,500),rnd(-200,300));for(let i=0;i<250;i++)enemyShot(rnd(0,540),rnd(0,500),rnd(0,6.28),rnd(60,160))}")
        pg.wait_for_timeout(3000)
        print(q,'fps',round(pg.evaluate('perfMon.fps'),1),'fx',pg.evaluate('FX.length'),'hostile',pg.evaluate('hostile.length'),'canvas px',pg.evaluate('[c.width,c.height]'))
        pg.screenshot(path=f'/tmp/claude-0/s/stress_{q}.png')
    pg.evaluate("musicTick(1)")
    print('errs',errs);b.close()
