'use strict';
/* Графика: загрузка PNG, кеш спрайтов с запечённым свечением, текстуры снарядов,
 * пул частиц, параллакс-фон, процедурные модели 4 мини-боссов и флагман Архитектора.
 * shadowBlur используется только при создании кеша, а не в каждом кадре — это важно для Android. */
const SPRITE_FILES={
 player1:'player_lvl1',player2:'player_lvl2',player3:'player_lvl3',player4:'player_lvl4',player5:'player_lvl5',
 scout:'enemy_scout',zig:'enemy_zig',heavy:'enemy_heavy',sniper:'enemy_sniper',carrier:'enemy_carrier',bomber:'enemy_bomber',drone:'enemy_drone',
 duck:'mini_duck',flower:'mini_flower',slipper:'mini_slipper',mountain:'mini_mountain',duckling:'duckling'
};
const IMG={};let assetsLoaded=0,assetsTotal=0;
function loadImage(src){const img=new Image();assetsTotal++;img.onload=()=>{assetsLoaded++;img.ok=true};img.onerror=()=>{assetsLoaded++;img.failed=true;console.warn('Не загружен ресурс',src)};img.decoding='async';img.src=src;return img}
for(const [k,f] of Object.entries(SPRITE_FILES))IMG[k]=loadImage('assets/sprites/'+f+'.png');
const portrait=IMG.portrait=loadImage('assets/architect.jpg');
const imgReady=img=>img&&img.complete&&img.naturalWidth>0;

function makeCanvas(w,h){const cv=document.createElement('canvas');cv.width=Math.max(1,Math.ceil(w));cv.height=Math.max(1,Math.ceil(h));return cv}
let RF=2;const CACHE=new Map();
function onQualityChanged(){RF=QUALITY.key==='low'?1.25:QUALITY.key==='high'?2.2:1.7;CACHE.clear();BG.cache.clear()}

// Спрайт размером size (по большей стороне) с запечённым свечением.
function spriteCache(key,size,glow,variant){
 const id=key+'|'+size+'|'+(glow||'')+'|'+(variant||'');let e=CACHE.get(id);if(e)return e;
 const img=IMG[key]||PROC[key]&&procArt(key);if(!img||(img instanceof Image&&!imgReady(img)))return null;
 const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height,k=size/Math.max(iw,ih),w=iw*k,h=ih*k,m=glow?size*.22:2;
 const cv=makeCanvas((w+m*2)*RF,(h+m*2)*RF),x=cv.getContext('2d');x.scale(RF,RF);
 if(glow){x.shadowColor=glow;x.shadowBlur=size*.14;}
 x.drawImage(img,m,m,w,h);x.shadowBlur=0;
 if(variant==='white'){x.globalCompositeOperation='source-atop';x.fillStyle='rgba(255,255,255,.92)';x.fillRect(0,0,cv.width,cv.height)}
 if(variant==='red'){x.globalCompositeOperation='source-atop';x.fillStyle='rgba(255,40,60,.55)';x.fillRect(0,0,cv.width,cv.height)}
 e={cv,w:w+m*2,h:h+m*2};CACHE.set(id,e);return e;
}
function drawSprite(key,x,y,size,o={}){
 const e=spriteCache(key,size,o.glow,o.variant);if(!e)return false;
 g.save();g.translate(x,y);if(o.rot)g.rotate(o.rot);if(o.alpha!=null)g.globalAlpha*=o.alpha;if(o.sx||o.sy)g.scale(o.sx||1,o.sy||1);
 g.drawImage(e.cv,-e.w/2,-e.h/2,e.w,e.h);
 if(o.flash>0){const wv=spriteCache(key,size,o.glow,'white');if(wv){g.globalAlpha*=Math.min(1,o.flash*5);g.drawImage(wv.cv,-wv.w/2,-wv.h/2,wv.w,wv.h)}}
 g.restore();return true;
}
// Мягкие точки/свечение для частиц и снарядов.
function glowDot(color,r){
 const id='dot|'+color+'|'+r;let e=CACHE.get(id);if(e)return e;
 const s=r*2,cv=makeCanvas(s*RF,s*RF),x=cv.getContext('2d');x.scale(RF,RF);
 const gr=x.createRadialGradient(r,r,0,r,r,r);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.18,color);gr.addColorStop(.5,color.replace(/[\d.]+\)$/,'0.35)'));gr.addColorStop(1,'rgba(0,0,0,0)');
 x.fillStyle=gr;x.fillRect(0,0,s,s);e={cv,s};CACHE.set(id,e);return e;
}
function rgba(hex,a){const h=hex.replace('#','');const n=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h,16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`}
// Текстуры снарядов.
function bulletTex(kind,color,r){
 const id='b|'+kind+'|'+color+'|'+r;let e=CACHE.get(id);if(e)return e;let cv,x,w,h;
 if(kind==='laser'||kind==='drone'){w=r*4;h=r*9;cv=makeCanvas(w*RF,h*RF);x=cv.getContext('2d');x.scale(RF,RF);
  x.shadowColor=color;x.shadowBlur=r*1.6;x.fillStyle=color;x.beginPath();x.roundRect(w/2-r*.75,r*.8,r*1.5,h-r*1.6,r);x.fill();x.shadowBlur=0;x.fillStyle='#f2ffff';x.beginPath();x.roundRect(w/2-r*.32,r*1.4,r*.64,h-r*2.8,r);x.fill()}
 else if(kind==='plasma'){w=h=r*4;cv=makeCanvas(w*RF,h*RF);x=cv.getContext('2d');x.scale(RF,RF);
  const gr=x.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);gr.addColorStop(0,'#ffffff');gr.addColorStop(.22,'#c8fff4');gr.addColorStop(.42,color);gr.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gr;x.fillRect(0,0,w,h)}
 else if(kind==='needle'){w=r*3;h=r*10;cv=makeCanvas(w*RF,h*RF);x=cv.getContext('2d');x.scale(RF,RF);
  x.shadowColor=color;x.shadowBlur=r*1.5;x.fillStyle=color;x.beginPath();x.moveTo(w/2,r*.5);x.lineTo(w/2+r*.7,h*.6);x.lineTo(w/2,h-r*.5);x.lineTo(w/2-r*.7,h*.6);x.closePath();x.fill();x.shadowBlur=0;x.fillStyle='#fff';x.fillRect(w/2-r*.18,r*1.5,r*.36,h*.5)}
 else {// orb
  w=h=r*3.4;cv=makeCanvas(w*RF,h*RF);x=cv.getContext('2d');x.scale(RF,RF);const cx=w/2;
  const gr=x.createRadialGradient(cx,cx,0,cx,cx,cx);gr.addColorStop(0,rgba(color,.55));gr.addColorStop(1,rgba(color,0));x.fillStyle=gr;x.fillRect(0,0,w,h);
  x.fillStyle=color;x.beginPath();x.arc(cx,cx,r,0,TAU);x.fill();x.fillStyle='rgba(255,255,255,.95)';x.beginPath();x.arc(cx,cx,r*.55,0,TAU);x.fill();
  x.strokeStyle='rgba(255,255,255,.55)';x.lineWidth=1.2;x.beginPath();x.arc(cx,cx,r,0,TAU);x.stroke()}
 e={cv,w,h};CACHE.set(id,e);return e;
}

/* ---------- Частицы (пул) ---------- */
const FX=[];
function fxAdd(p){if(FX.length>=QUALITY.particles){if(p.kind!=='ring'&&p.kind!=='flash')return;FX.shift()}FX.push(p)}
function burst(x,y,col,n=14,speed=170,life=.7){
 n=Math.round(n*(QUALITY.key==='low'?.55:1));
 for(let i=0;i<n;i++){const a=Math.random()*TAU,v=rnd(.25,1)*speed;fxAdd({kind:'spark',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.35,1)*life,max:life,color:col,size:rnd(2,4.5)})}
}
function explosion(x,y,scale=1,color='#ff8a3d'){
 fxAdd({kind:'flash',x,y,life:.22,max:.22,r:60*scale,color});
 fxAdd({kind:'ring',x,y,life:.45,max:.45,r:10*scale,grow:260*scale,color:'#ffd27a',w:5*scale});
 burst(x,y,color,Math.round(18*scale),240*scale,.8);burst(x,y,'#fff3c4',Math.round(6*scale),120*scale,.4);
 const deb=Math.round(5*scale*(QUALITY.key==='low'?.5:1));for(let i=0;i<deb;i++){const a=Math.random()*TAU,v=rnd(40,160)*scale;fxAdd({kind:'debris',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.6,1.2),max:1.2,rot:Math.random()*TAU,vr:rnd(-8,8),size:rnd(3,7)*Math.sqrt(scale),color:'#5d6676'})}
 if(QUALITY.trails)for(let i=0;i<Math.round(4*scale);i++)fxAdd({kind:'smoke',x:x+rnd(-12,12)*scale,y:y+rnd(-12,12)*scale,vx:rnd(-20,20),vy:rnd(-20,20),life:rnd(.6,1.1),max:1.1,r:rnd(14,26)*scale});
}
function popText(x,y,text,color='#ffe28a',size=16){fxAdd({kind:'text',x,y,vy:-40,life:1,max:1,text,color,size})}
function updateFX(dt){
 for(let i=FX.length-1;i>=0;i--){const p=FX[i];p.life-=dt;if(p.life<=0){FX[i]=FX[FX.length-1];FX.pop();continue}
  if(p.vx!=null){p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.kind==='spark'||p.kind==='debris'){p.vx*=1-1.6*dt;p.vy*=1-1.6*dt}}
  if(p.kind==='ring')p.r+=p.grow*dt;if(p.kind==='debris')p.rot+=p.vr*dt;if(p.kind==='smoke')p.r+=18*dt;if(p.kind==='trail'){p.y+=p.vy*dt}}
}
function renderFX(layer){
 const add=QUALITY.additive;
 for(const p of FX){const k=p.life/p.max;
  if(layer==='under'){if(p.kind!=='smoke'&&p.kind!=='trail')continue}else if(p.kind==='smoke'||p.kind==='trail')continue;
  switch(p.kind){
   case 'spark':{const d=glowDot(rgba(p.color,1),8);g.globalAlpha=Math.min(1,k*1.6);if(add)g.globalCompositeOperation='lighter';const s=p.size*2.6;g.drawImage(d.cv,p.x-s/2,p.y-s/2,s,s);break}
   case 'flash':{const d=glowDot(rgba(p.color,1),32);g.globalAlpha=k;if(add)g.globalCompositeOperation='lighter';const s=p.r*2*(1.3-k*.3);g.drawImage(d.cv,p.x-s/2,p.y-s/2,s,s);break}
   case 'ring':g.globalAlpha=k*.9;g.strokeStyle=p.color;g.lineWidth=p.w*k+1;g.beginPath();g.arc(p.x,p.y,p.r,0,TAU);g.stroke();break;
   case 'debris':g.globalAlpha=Math.min(1,k*2);g.fillStyle=p.color;g.save();g.translate(p.x,p.y);g.rotate(p.rot);g.fillRect(-p.size/2,-p.size/3,p.size,p.size*.66);g.fillStyle='#ffb36b';g.fillRect(-p.size/2,-p.size/3,p.size*.4,2);g.restore();break;
   case 'smoke':{const d=glowDot('rgba(70,80,100,1)',32);g.globalAlpha=k*.35;const s=p.r*2;g.drawImage(d.cv,p.x-s/2,p.y-s/2,s,s);break}
   case 'trail':{const d=glowDot(rgba(p.color,1),12);g.globalAlpha=k*.7;if(add)g.globalCompositeOperation='lighter';const s=p.size*k+2;g.drawImage(d.cv,p.x-s,p.y-s,s*2,s*2);break}
   case 'text':g.globalAlpha=Math.min(1,k*2);g.fillStyle=p.color;g.font=`900 ${p.size}px system-ui,sans-serif`;g.textAlign='center';g.fillText(p.text,p.x,p.y);break;
  }
  g.globalCompositeOperation='source-over';
 }
 g.globalAlpha=1;
}

/* ---------- Фон: туманность + звёзды в 3 слоя + далёкая планета ---------- */
const SECTOR_THEMES=[
 {name:'orion',a:'#1676a8',b:'#22306e',c:'#0a1534',planet:'#4ba3c7',ring:true},
 {name:'azalia',a:'#a23a8c',b:'#4a2a7a',c:'#160a2a',planet:'#e07ad0',ring:false},
 {name:'kpp7',a:'#a8682a',b:'#4b3a2a',c:'#140f12',planet:'#d79a52',ring:true},
 {name:'abyss',a:'#a51c3c',b:'#3a0f3e',c:'#08040f',planet:'#7a2135',ring:false},
 {name:'endless',a:'#3a3ec0',b:'#1a5a8a',c:'#050a1e',planet:'#6f7bff',ring:true},
 {name:'parade',a:'#1d9a7a',b:'#3a5a1a',c:'#04140f',planet:'#8ee06a',ring:false}
];
const BG={cache:new Map(),y:0,stars:[],theme:SECTOR_THEMES[0],planetY:-300,planetX:400};
function seeded(seed){let s=seed>>>0||1;return ()=>(s=(s*1664525+1013904223)>>>0)/4294967296}
function nebulaCanvas(theme){
 let cv=BG.cache.get(theme.name);if(cv)return cv;
 const w=180,h=400;cv=makeCanvas(w,h);const x=cv.getContext('2d'),r=seeded(theme.name.length*977+theme.a.charCodeAt(2));
 x.fillStyle=theme.c;x.fillRect(0,0,w,h);
 const blob=(col,a,cx,cy,rad)=>{for(const oy of [-h,0,h]){const gr=x.createRadialGradient(cx,cy+oy,0,cx,cy+oy,rad);gr.addColorStop(0,rgba(col,a));gr.addColorStop(1,rgba(col,0));x.fillStyle=gr;x.fillRect(0,0,w,h)}};
 for(let i=0;i<9;i++)blob(i%3?theme.b:theme.a,.18+r()*.22,r()*w,r()*h,40+r()*90);
 for(let i=0;i<5;i++)blob('#000000',.35,r()*w,r()*h,30+r()*50);
 for(let i=0;i<140;i++){x.fillStyle=`rgba(220,240,255,${.15+r()*.5})`;x.fillRect(r()*w,r()*h,r()<.9?.5:1,r()<.9?.5:1)}
 BG.cache.set(theme.name,cv);return cv;
}
function planetCanvas(theme){
 const id='planet|'+theme.name;let e=CACHE.get(id);if(e)return e;const R=70,s=R*3;const cv=makeCanvas(s*RF,s*RF),x=cv.getContext('2d');x.scale(RF,RF);const cx=s/2;
 const at=x.createRadialGradient(cx,cx,R*.9,cx,cx,R*1.25);at.addColorStop(0,rgba(theme.planet,.35));at.addColorStop(1,rgba(theme.planet,0));x.fillStyle=at;x.fillRect(0,0,s,s);
 const gr=x.createRadialGradient(cx-R*.4,cx-R*.4,R*.1,cx,cx,R);gr.addColorStop(0,rgba(theme.planet,1));gr.addColorStop(.7,rgba(theme.b,1));gr.addColorStop(1,'#05060c');x.fillStyle=gr;x.beginPath();x.arc(cx,cx,R,0,TAU);x.fill();
 x.save();x.beginPath();x.arc(cx,cx,R,0,TAU);x.clip();x.globalAlpha=.18;for(let i=0;i<7;i++){x.fillStyle=i%2?'#fff':'#000';x.fillRect(cx-R,cx-R+i*R*.3+5,R*2,R*.12)}x.restore();
 if(theme.ring){x.strokeStyle=rgba(theme.planet,.55);x.lineWidth=4;x.beginPath();x.ellipse(cx,cx,R*1.45,R*.35,-.35,0,TAU);x.stroke()}
 e={cv,s};CACHE.set(id,e);return e;
}
function setBackgroundTheme(i){BG.theme=SECTOR_THEMES[i]||SECTOR_THEMES[0];BG.planetY=-260;BG.planetX=rnd(120,420)}
function initStars(){BG.stars=[];for(let i=0;i<QUALITY.stars;i++){const d=Math.random();BG.stars.push({x:Math.random()*W,y:Math.random()*1200,d,s:d<.6?1:d<.9?1.6:2.4,v:d<.6?40:d<.9?90:170})}}
function updateBackground(dt,speed=1){
 BG.y=(BG.y+dt*14*speed)%800;BG.planetY+=dt*9*speed;if(BG.planetY>H+300){BG.planetY=-500;BG.planetX=rnd(80,460)}
 for(const s of BG.stars){s.y+=s.v*dt*speed;if(s.y>H){s.y-=H+10;s.x=Math.random()*W}}
}
function renderBackground(tintAlpha=0){
 const neb=nebulaCanvas(BG.theme),nh=800;g.drawImage(neb,0,BG.y-nh,W,nh);g.drawImage(neb,0,BG.y,W,nh);if(BG.y+nh<H)g.drawImage(neb,0,BG.y+nh,W,nh);
 const p=planetCanvas(BG.theme);g.globalAlpha=.85;g.drawImage(p.cv,BG.planetX-p.s/2,BG.planetY-p.s/2,p.s,p.s);g.globalAlpha=1;
 for(const s of BG.stars){g.fillStyle=s.d<.6?'rgba(150,190,230,.55)':s.d<.9?'rgba(200,230,255,.8)':'#ffffff';if(s.d>=.9){g.fillRect(s.x,s.y,s.s,s.s*4)}else g.fillRect(s.x,s.y,s.s,s.s)}
 if(tintAlpha){g.fillStyle=rgba(BG.theme.a,tintAlpha);g.fillRect(0,0,W,H)}
}

/* ---------- Процедурные модели мини-боссов без концептов ---------- */
const PROC={dumpling:1,toilet:1,grandpa:1,sock:1,archCore:1,archWing:1,archHalo:1,archFace:1,turret:1};
const procStore={};
function metal(x,x0,y0,x1,y1){const gr=x.createLinearGradient(x0,y0,x1,y1);gr.addColorStop(0,'#c9d2de');gr.addColorStop(.45,'#5d6879');gr.addColorStop(1,'#232a36');return gr}
function engineGlow(x,cx,cy,r,col){const gr=x.createRadialGradient(cx,cy,0,cx,cy,r);gr.addColorStop(0,'#fff');gr.addColorStop(.3,col);gr.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gr;x.beginPath();x.arc(cx,cy,r,0,TAU);x.fill()}
function lightStrip(x,x0,y0,x1,y1,col,w=3){x.save();x.shadowColor=col;x.shadowBlur=8;x.strokeStyle=col;x.lineWidth=w;x.lineCap='round';x.beginPath();x.moveTo(x0,y0);x.lineTo(x1,y1);x.stroke();x.restore()}
function gunPod(x,cx,cy,len=34,col='#ff5a3c'){x.fillStyle=metal(x,cx-10,cy,cx+10,cy+len);x.fillRect(cx-9,cy,18,len*.55);x.fillStyle='#1b2029';x.fillRect(cx-4,cy+len*.5,8,len*.5);x.fillStyle=col;x.fillRect(cx-3,cy+len*.92,6,4)}
function procArt(key){
 if(procStore[key])return procStore[key];const S=2;let cv,x;
 const begin=(w,h)=>{cv=makeCanvas(w*S,h*S);x=cv.getContext('2d');x.scale(S,S);return x};
 if(key==='dumpling'){begin(300,240);
  for(const ex of [95,150,205])engineGlow(x,ex,28,26,'#ffb347');
  x.fillStyle=metal(x,40,40,260,90);x.beginPath();x.roundRect(52,30,196,46,14);x.fill();
  gunPod(x,62,150,52);gunPod(x,238,150,52);
  const body=x.createRadialGradient(130,110,10,150,140,140);body.addColorStop(0,'#fff6dc');body.addColorStop(.6,'#f2d29a');body.addColorStop(1,'#a8834e');
  x.fillStyle=body;x.beginPath();x.moveTo(30,140);x.quadraticCurveTo(150,20,270,140);x.quadraticCurveTo(150,230,30,140);x.closePath();x.fill();
  x.strokeStyle='rgba(140,100,50,.7)';x.lineWidth=3;for(let i=-4;i<=4;i++){x.beginPath();x.moveTo(150+i*22,62+Math.abs(i)*6);x.quadraticCurveTo(150+i*26,95,150+i*28,128);x.stroke()}
  x.fillStyle=metal(x,40,140,260,160);x.beginPath();x.roundRect(36,136,228,22,9);x.fill();
  for(let i=0;i<9;i++){lightStrip(x,52+i*24,147,62+i*24,147,'#ff4e3a',4)}
  x.fillStyle='#2a1a10';x.beginPath();x.ellipse(118,108,13,9,0,0,TAU);x.ellipse(182,108,13,9,0,0,TAU);x.fill();x.fillStyle='#ff4a2a';x.beginPath();x.arc(118,108,5,0,TAU);x.arc(182,108,5,0,TAU);x.fill();
  x.strokeStyle='#5a3418';x.lineWidth=5;x.beginPath();x.moveTo(98,92);x.lineTo(134,100);x.moveTo(202,92);x.lineTo(166,100);x.stroke();
  x.fillStyle='#3a1a0c';x.beginPath();x.ellipse(150,182,26,10,0,0,TAU);x.fill();x.fillStyle='#ff6a3a';x.fillRect(132,180,36,4);
 }else if(key==='toilet'){begin(280,280);
  for(const ex of [70,210])engineGlow(x,ex,24,28,'#7ff0ff');
  x.fillStyle=metal(x,60,20,220,90);x.beginPath();x.roundRect(55,22,170,66,16);x.fill();
  x.fillStyle='#eef8ff';x.beginPath();x.roundRect(68,30,144,48,12);x.fill();x.fillStyle='#9bb7c9';x.fillRect(120,40,40,8);
  lightStrip(x,72,84,208,84,'#5ff3ff',4);
  x.fillStyle=metal(x,20,120,60,200);x.beginPath();x.roundRect(14,120,40,86,12);x.roundRect(226,120,40,86,12);x.fill();gunPod(x,34,198,40,'#5ff3ff');gunPod(x,246,198,40,'#5ff3ff');
  const bowl=x.createRadialGradient(126,150,10,140,165,120);bowl.addColorStop(0,'#ffffff');bowl.addColorStop(.7,'#d6eaf5');bowl.addColorStop(1,'#7d97ab');
  x.fillStyle=bowl;x.beginPath();x.ellipse(140,165,92,104,0,0,TAU);x.fill();
  x.strokeStyle='#8aa6ba';x.lineWidth=6;x.beginPath();x.ellipse(140,165,80,92,0,0,TAU);x.stroke();
  const water=x.createRadialGradient(140,170,4,140,170,62);water.addColorStop(0,'#e8ffff');water.addColorStop(.25,'#4ee8ff');water.addColorStop(.8,'#0c4f74');water.addColorStop(1,'#062338');
  x.fillStyle=water;x.beginPath();x.ellipse(140,170,58,68,0,0,TAU);x.fill();
  x.strokeStyle='rgba(220,255,255,.7)';x.lineWidth=3;for(let i=0;i<3;i++){x.beginPath();x.arc(140,170,16+i*15,i,i+3.4);x.stroke()}
  for(let i=0;i<8;i++){const a=i/8*TAU;x.fillStyle='#ff4e6a';x.beginPath();x.arc(140+Math.cos(a)*86,165+Math.sin(a)*98,4,0,TAU);x.fill()}
 }else if(key==='grandpa'){begin(300,260);
  for(const ex of [100,150,200])engineGlow(x,ex,22,24,'#ff7a3a');
  x.fillStyle=metal(x,30,60,270,200);x.beginPath();x.ellipse(150,138,134,90,0,0,TAU);x.fill();
  x.strokeStyle='#ff6a2a';x.lineWidth=4;x.shadowColor='#ff5a1a';x.shadowBlur=12;x.beginPath();x.ellipse(150,138,124,80,0,0,TAU);x.stroke();x.shadowBlur=0;
  for(let i=0;i<10;i++){const a=Math.PI*.15+i/9*Math.PI*.7;lightStrip(x,150+Math.cos(a)*108,138+Math.sin(a)*68,150+Math.cos(a)*126,138+Math.sin(a)*80,'#ff8a3a',5)}
  gunPod(x,40,150,50,'#ff8a3a');gunPod(x,260,150,50,'#ff8a3a');
  const head=x.createRadialGradient(130,100,10,150,130,92);head.addColorStop(0,'#ffd9b8');head.addColorStop(.7,'#e79a6e');head.addColorStop(1,'#9a4e30');
  x.fillStyle=head;x.beginPath();x.arc(150,128,78,0,TAU);x.fill();
  x.fillStyle='#e8eef5';x.beginPath();x.ellipse(98,90,24,30,-.5,0,TAU);x.ellipse(202,90,24,30,.5,0,TAU);x.fill();
  x.strokeStyle='#2a2f3a';x.lineWidth=5;x.fillStyle='rgba(120,200,255,.35)';x.beginPath();x.arc(122,120,20,0,TAU);x.fill();x.stroke();x.beginPath();x.arc(178,120,20,0,TAU);x.fill();x.stroke();x.beginPath();x.moveTo(142,120);x.lineTo(158,120);x.stroke();
  x.fillStyle='#ff3a1a';x.beginPath();x.arc(122,122,6,0,TAU);x.arc(178,122,6,0,TAU);x.fill();
  x.fillStyle='#f2f4f8';x.beginPath();x.moveTo(150,150);x.quadraticCurveTo(106,148,90,176);x.quadraticCurveTo(122,168,150,166);x.quadraticCurveTo(178,168,210,176);x.quadraticCurveTo(194,148,150,150);x.fill();
  x.fillStyle='#e8edf2';x.fillRect(108,96,30,7);x.fillRect(162,96,30,7);
  x.fillStyle='rgba(255,90,40,.5)';x.beginPath();x.ellipse(150,62,40,10,0,0,TAU);x.fill();
 }else if(key==='sock'){begin(260,300);
  for(const ex of [92,150])engineGlow(x,ex,24,24,'#a8ff6a');
  x.fillStyle=metal(x,70,20,190,60);x.beginPath();x.roundRect(64,24,116,40,10);x.fill();
  const body=x.createLinearGradient(60,40,200,280);body.addColorStop(0,'#c8ff9a');body.addColorStop(.5,'#6ccf4a');body.addColorStop(1,'#2d6a22');
  x.fillStyle=body;x.beginPath();x.moveTo(70,56);x.lineTo(176,56);x.lineTo(180,170);x.quadraticCurveTo(232,190,224,240);x.quadraticCurveTo(214,284,150,276);x.lineTo(96,262);x.quadraticCurveTo(60,250,66,200);x.closePath();x.fill();
  x.save();x.clip();for(let i=0;i<4;i++){x.fillStyle=i%2?'#f2fff0':'#2c5a24';x.fillRect(50,74+i*22,160,11)}x.restore();
  x.fillStyle=metal(x,140,220,230,280);x.beginPath();x.moveTo(170,232);x.quadraticCurveTo(232,224,224,250);x.quadraticCurveTo(214,284,150,276);x.lineTo(146,246);x.closePath();x.fill();
  gunPod(x,40,140,50,'#a8ff6a');gunPod(x,220,120,44,'#a8ff6a');x.fillStyle=metal(x,30,130,60,150);x.fillRect(40,132,30,12);x.fillRect(184,114,36,12);
  x.fillStyle='rgba(170,255,100,.35)';for(let i=0;i<6;i++){x.beginPath();x.arc(80+Math.sin(i*2)*50,180+i*14,14+i*2,0,TAU);x.fill()}
  x.fillStyle='#1c3a12';x.beginPath();x.ellipse(110,150,12,8,0,0,TAU);x.ellipse(150,150,12,8,0,0,TAU);x.fill();x.fillStyle='#d6ff3a';x.beginPath();x.arc(110,150,4,0,TAU);x.arc(150,150,4,0,TAU);x.fill();
 }else if(key==='turret'){begin(64,64);
  x.fillStyle=metal(x,8,8,56,56);x.beginPath();x.arc(32,32,24,0,TAU);x.fill();x.strokeStyle='#ff9a3a';x.lineWidth=3;x.beginPath();x.arc(32,32,18,0,TAU);x.stroke();
  x.fillStyle='#1c1f28';x.fillRect(26,30,12,30);x.fillStyle='#ffb24a';x.fillRect(28,54,8,6);engineGlow(x,32,32,9,'#ff7a2a');
 }else if(key==='archHalo'){begin(560,200);
  x.save();x.shadowColor='#ff8a2a';x.shadowBlur=18;x.strokeStyle='rgba(255,150,60,.9)';x.lineWidth=5;x.beginPath();x.ellipse(280,100,262,78,0,0,TAU);x.stroke();
  x.strokeStyle='rgba(255,210,140,.6)';x.lineWidth=2;x.beginPath();x.ellipse(280,100,240,66,0,0,TAU);x.stroke();x.restore();
  for(let i=0;i<24;i++){const a=i/24*TAU;x.fillStyle=i%3?'#4a5262':'#ff9a3a';x.fillRect(280+Math.cos(a)*262-4,100+Math.sin(a)*78-4,8,8)}
 }else if(key==='archWing'){begin(260,240);// правое крыло, ось у левого края
  const pyl=[[20,40,30,150],[62,30,28,170],[102,48,26,160],[140,62,24,140],[176,80,22,118],[210,96,20,96]];
  x.fillStyle=metal(x,0,90,260,150);x.beginPath();x.moveTo(0,90);x.lineTo(250,120);x.lineTo(250,146);x.lineTo(0,150);x.closePath();x.fill();
  for(const [px,py,pw,ph] of pyl){x.fillStyle=metal(x,px,py,px+pw,py+ph);x.beginPath();x.moveTo(px,py+ph*.15);x.lineTo(px+pw/2,py);x.lineTo(px+pw,py+ph*.15);x.lineTo(px+pw,py+ph);x.lineTo(px+pw/2,py+ph+16);x.lineTo(px,py+ph);x.closePath();x.fill();
   x.strokeStyle='#1a1e27';x.lineWidth=2;x.stroke();lightStrip(x,px+pw/2,py+ph*.25,px+pw/2,py+ph*.8,'#ff8a2a',3);engineGlow(x,px+pw/2,py+ph+14,10,'#ff7a2a')}
  lightStrip(x,6,120,244,132,'#ffb24a',2);
 }else if(key==='archCore'){begin(380,360);
  // шпили позади лица
  for(let i=-4;i<=4;i++){const sx=190+i*30,hgt=110-Math.abs(i)*18;x.fillStyle=metal(x,sx-10,10,sx+10,140);x.beginPath();x.moveTo(sx,120-hgt);x.lineTo(sx+11,150);x.lineTo(sx-11,150);x.closePath();x.fill();lightStrip(x,sx,140-hgt*.7,sx,150,'#ff8a2a',2)}
  x.fillStyle=metal(x,40,100,340,320);x.beginPath();x.moveTo(190,90);x.lineTo(320,150);x.lineTo(350,250);x.lineTo(280,320);x.lineTo(220,350);x.lineTo(190,320);x.lineTo(160,350);x.lineTo(100,320);x.lineTo(30,250);x.lineTo(60,150);x.closePath();x.fill();
  x.strokeStyle='#161a22';x.lineWidth=3;x.stroke();
  x.fillStyle='rgba(15,18,26,.7)';for(const [a,b,w2,h2] of [[52,170,48,90],[280,170,48,90],[110,290,50,30],[220,290,50,30]]){x.beginPath();x.roundRect(a,b,w2,h2,6);x.fill()}
  for(let i=0;i<5;i++){lightStrip(x,60,180+i*16,96,180+i*16,'#ff8a2a',3);lightStrip(x,284,180+i*16,320,180+i*16,'#ff8a2a',3)}
  lightStrip(x,190,300,190,352,'#ff5a1a',6);lightStrip(x,120,300,160,340,'#ffb24a',3);lightStrip(x,260,300,220,340,'#ffb24a',3);
  x.fillStyle='#0b0d12';x.beginPath();x.ellipse(190,190,92,104,0,0,TAU);x.fill();
  x.strokeStyle='#ff9a3a';x.lineWidth=4;x.shadowColor='#ff7a2a';x.shadowBlur=14;x.beginPath();x.ellipse(190,190,94,106,0,0,TAU);x.stroke();x.shadowBlur=0;
  for(let i=0;i<16;i++){const a=i/16*TAU;x.fillStyle='#c9d2de';x.beginPath();x.arc(190+Math.cos(a)*100,190+Math.sin(a)*112,3.5,0,TAU);x.fill()}
 }else if(key==='archFace'){
  if(!imgReady(portrait))return null;begin(180,206);
  x.save();x.beginPath();x.ellipse(90,103,86,100,0,0,TAU);x.clip();
  const iw=portrait.naturalWidth,ih=portrait.naturalHeight,k=Math.max(180/iw,206/ih);x.drawImage(portrait,(180-iw*k)/2,(206-ih*k)/2,iw*k,ih*k);
  const vg=x.createRadialGradient(90,100,50,90,103,104);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(10,4,0,.65)');x.fillStyle=vg;x.fillRect(0,0,180,206);
  x.fillStyle='rgba(255,120,40,.10)';x.fillRect(0,0,180,206);x.restore();
 }
 procStore[key]=cv;return cv;
}
// Совместимость с прежними именами функций рендера 1.4.
const playerSprites={},enemySprites={};
