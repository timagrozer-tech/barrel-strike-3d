# Визуальный тур: каждый мини-босс (фаза 1 и 2), Архитектор в 4 фазах, новые враги. Игрок бессмертен.
from playwright.sync_api import sync_playwright
OUT='/tmp/claude-0/s/'
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':412,'height':915},device_scale_factor=2,is_mobile=True,has_touch=True)
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
    pg.goto('http://localhost:8081/');pg.wait_for_timeout(1500)
    pg.evaluate("()=>{settings.quality='high';applyQuality();mode='endless';reset();window.god=setInterval(()=>{if(player){player.hp=player.max}},50)}")
    shots=[]
    for i,k in enumerate(['duck','flower','slipper','mountain','dumpling','toilet','grandpa','sock']):
        pg.evaluate(f"()=>{{boss=null;mini=null;foes=[];hostile=[];hazards=[];miniIndex={i};spawnMini();mini.specialCd=2.5;waveClock=0}}")
        pg.wait_for_timeout(3600);pg.screenshot(path=OUT+f'm_{k}1.png')
        pg.evaluate("()=>{if(mini){mini.hp=mini.max*.45}}");pg.wait_for_timeout(3200);pg.screenshot(path=OUT+f'm_{k}2.png')
    pg.evaluate("()=>{mini=null;foes=[];hostile=[];hazards=[];spawnBoss();boss.y=boss.ty}")
    for ph,hp in [(1,1),(2,.7),(3,.45),(4,.2)]:
        pg.evaluate(f"()=>{{boss.hp=boss.max*{hp}}}");pg.wait_for_timeout(3500);pg.screenshot(path=OUT+f'b_{ph}.png')
    pg.evaluate("()=>{boss=null;hostile=[];hazards=[];foes=[];makeFoe('sniper',150,-40);makeFoe('carrier',380,-60);makeFoe('bomber',260,-80);makeFoe('heavy',90,-40);makeFoe('zig',450,-40,{elite:true})}")
    pg.wait_for_timeout(2600);pg.screenshot(path=OUT+'e_new.png')
    print('errors',errs[:10],'fps',pg.evaluate('perfMon.fps'))
    b.close()
