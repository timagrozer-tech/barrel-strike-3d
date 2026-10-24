'use strict';
/* VOID FRONTIER 2.0 — ядро: canvas, адаптивный экран, качество графики, общие помощники.
 * Логическая ширина всегда 540. Логическая высота H растёт на вытянутых экранах (20:9) до 1200,
 * чтобы картинка не растягивалась и бой занимал весь экран. Штаб и рынок рисуются в 540×960
 * со смещением OFFY по вертикали. */
const VF_VERSION='2.0';
const c=document.querySelector('#game'),g=c.getContext('2d',{alpha:false});
const W=540;let H=960,OFFY=0,pixelScale=1,cssScale=1;
const TAU=Math.PI*2;
const rnd=(a,b)=>a+Math.random()*(b-a),clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),lerp=(a,b,k)=>a+(b-a)*k;
const pick=a=>a[Math.floor(Math.random()*a.length)];

// Настройки (сохраняются в vf02.settings). Старые поля master/fx/music сохранены.
const settings={master:.8,fx:.48,music:.15,musicCombat:1,musicBoss:1,musicBase:1,quality:'auto',shake:true,buttons:'m',vibrate:true,control:'point'};
const QUALITY_PRESETS={
 low:{name:'НИЗКОЕ',res:1,particles:170,stars:55,additive:false,trails:false},
 medium:{name:'СРЕДНЕЕ',res:1.5,particles:320,stars:85,additive:true,trails:true},
 high:{name:'ВЫСОКОЕ',res:2.5,particles:520,stars:120,additive:true,trails:true}
};
let QUALITY=QUALITY_PRESETS.medium,autoQualityLevel=null;
function detectQuality(){
 const mem=navigator.deviceMemory||4,cores=navigator.hardwareConcurrency||4;
 if(mem<=2||cores<=2)return 'low';
 if(mem>=6&&cores>=8&&!/Android/i.test(navigator.userAgent))return 'high';
 return 'medium';
}
function applyQuality(){
 const key=settings.quality==='auto'?(autoQualityLevel||(autoQualityLevel=detectQuality())):settings.quality;
 QUALITY=QUALITY_PRESETS[key]||QUALITY_PRESETS.medium;QUALITY.key=key;
 resize();
 if(typeof onQualityChanged==='function')onQualityChanged();
}
function resize(){
 const vw=window.innerWidth,vh=window.innerHeight,aspect=vh/vw;let cssW,cssH;
 if(aspect>=960/540){cssW=vw;H=Math.round(clamp(W*aspect,960,1200));cssH=cssW*H/W}
 else{H=960;cssH=vh;cssW=vh*W/H}
 OFFY=(H-960)/2;cssScale=cssW/W;
 c.style.width=cssW+'px';c.style.height=cssH+'px';
 const dpr=Math.min(window.devicePixelRatio||1,QUALITY.res||1.5);
 c.width=Math.round(cssW*dpr);c.height=Math.round(cssH*dpr);pixelScale=c.width/W;
 const rs=document.documentElement.style;
 rs.setProperty('--cw',cssW+'px');rs.setProperty('--ch',cssH+'px');
 rs.setProperty('--cl',((vw-cssW)/2)+'px');rs.setProperty('--ct',((vh-cssH)/2)+'px');
 rs.setProperty('--u',cssScale);
 if(typeof player!=='undefined'&&player){player.y=Math.min(player.y,H-40);target.y=Math.min(target.y,H-45)}
}
window.addEventListener('resize',()=>resize());
// Перевод координат касания в логические координаты боя.
function toLogical(e){const r=c.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H}}
// Для сцен штаба и рынка (поле 540×960, центрировано по вертикали).
function toScene(e){const p=toLogical(e);return {x:p.x,y:p.y-OFFY}}

// Простой монитор кадров: в режиме «авто» снижает качество при долгих просадках.
const perfMon={acc:0,frames:0,slow:0,fps:60};
function perfSample(dt,inCombat){
 perfMon.acc+=dt;perfMon.frames++;
 if(perfMon.acc>=1){perfMon.fps=perfMon.frames/perfMon.acc;perfMon.acc=0;perfMon.frames=0;
  if(inCombat&&settings.quality==='auto'&&perfMon.fps<42){perfMon.slow++;
   if(perfMon.slow>=4){perfMon.slow=0;const next=autoQualityLevel==='high'?'medium':autoQualityLevel==='medium'?'low':null;if(next){autoQualityLevel=next;applyQuality()}}}
  else perfMon.slow=0}
}
function vibrate(ms){if(settings.vibrate&&navigator.vibrate){try{navigator.vibrate(ms)}catch(e){}}}
function esc(s){return String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
