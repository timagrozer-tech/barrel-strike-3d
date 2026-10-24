'use strict';
/* Ввод, главный цикл, инициализация. */
let dragAnchor=null;
function point(e,isDown){
 if(state==='market'){marketMission.point(e);return}
 if(state==='office'){officeMission.point(e);return}
 if(state!=='play')return;
 const p=toLogical(e);
 if(settings.control==='drag'){
  if(isDown||!dragAnchor){dragAnchor={x:p.x,y:p.y,tx:target.x,ty:target.y};return}
  target.x=clamp(dragAnchor.tx+(p.x-dragAnchor.x)*1.15,30,W-30);target.y=clamp(dragAnchor.ty+(p.y-dragAnchor.y)*1.15,140,H-45);
 }else{target.x=clamp(p.x,30,W-30);target.y=clamp(p.y-70,140,H-45)}
}
c.addEventListener('pointerdown',e=>{try{c.setPointerCapture(e.pointerId)}catch(_){}point(e,true)});
c.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch')point(e,false)});
c.addEventListener('pointerup',()=>{dragAnchor=null});
c.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('keydown',e=>{
 if(state!=='play')return;const k=e.key.toLowerCase();
 if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
 if(k===' '||k==='b'){bomb();return}if(k==='escape'||k==='p'){pauseGame();return}if(k==='e'){useHide();return}if(k==='q'){useFreeze();return}
 keys.add(k);
});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>keys.clear());
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(state==='play'||state==='office'||state==='market'))pauseGame()});

const FROZEN_STATES=['pause','perk','dialog','win','lose','caseResult','ending','ended'];
function frame(now){
 const dt=Math.min(.033,(now-last)/1000||.016);last=now;
 g.setTransform(pixelScale,0,0,pixelScale,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';
 perfSample(dt,state==='play');
 try{
  if(state==='office'||state==='officePause'){g.fillStyle='#071521';g.fillRect(0,0,W,H);g.save();g.translate(0,OFFY);if(state==='office')officeMission.update(dt);officeMission.render();g.restore()}
  else if(state==='market'||state==='marketPause'||state==='marketShop'||state==='marketRaid'){g.fillStyle='#090e21';g.fillRect(0,0,W,H);g.save();g.translate(0,OFFY);if(state==='market')marketMission.update(dt);marketMission.render();g.restore()}
  else if(state==='play'){update(dt);if(state==='play'||FROZEN_STATES.includes(state))render()}
  else if(FROZEN_STATES.includes(state)){if(state!=='pause'&&state!=='perk'&&state!=='dialog'){updateBackground(dt,.5);updateFX(dt)}render()}
  else{renderMenuBackground(dt);if(state==='menu')drawHangarPreview(dt)}
 }catch(err){console.error(err);}
 requestAnimationFrame(frame);
}
function boot(){
 loadSave();applyQuality();applyVolumes();applyButtonSize();setBackgroundTheme(0);initStars();
 // Шрифт для текста на canvas (HUD); игра работает и без него.
 if(document.fonts&&document.fonts.load){Promise.all([document.fonts.load('600 20px Oswald'),document.fonts.load('600 14px "Exo 2"')]).catch(()=>{})}
 menu('home');
 // Кнопка «Назад» Android в APK (Capacitor App plugin, если доступен).
 const App=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App;
 if(App&&App.addListener)App.addListener('backButton',()=>{
  const cw=document.querySelector('.confirm-wrap');if(cw){cw.remove();return}
  if(state==='play'||state==='office'||state==='market')pauseGame();
  else if(state==='pause')resumeGame();
  else if(state==='menu'&&hangarTab!=='home')menu('home');
  else if(state==='menu'&&App.exitApp)App.exitApp();
  else if(['briefing','intro','win','lose','caseResult','ended','officeFail','officeComplete'].includes(state))menu('home');
 });
 last=performance.now();requestAnimationFrame(frame);
}
boot();
