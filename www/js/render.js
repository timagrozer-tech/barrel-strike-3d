'use strict';
/* Отрисовка боя и HUD. Все тяжёлые эффекты свечения берутся из кеша (art.js). */
const FOE_SPRITE={scout:'scout',zig:'zig',heavy:'heavy',sniper:'sniper',carrier:'carrier',bomber:'bomber',drone:'drone',duckling:'duckling'};
function render(){
 g.save();
 renderBackground(mode==='story'?.05:0);
 if(shake)g.translate(rnd(-shake,shake)*.6,rnd(-shake,shake)*.6);
 renderFX('under');
 renderHazards(false);
 if(mode==='story')for(const r of reports)drawCapsule(r);
 for(const p of pickups)drawPickup(p);
 for(const f of foes)drawFoe(f);
 if(boss)drawBoss(boss);
 if(mini)drawMini(mini);
 if(!player.dead&&['play','pause','perk','dialog'].includes(state)){drawDrones();drawShip(player.x,player.y)}
 drawShots();
 drawHostile();
 renderHazards(true);
 renderFX('over');
 g.restore();
 renderHUD();
}
function renderMenuBackground(dt){updateBackground(dt,.6);renderBackground(0)}

/* ---------- Игрок ---------- */
function shipSpriteKey(){const sh=SHIPS[ship];return sh.sprite||('player'+currentPlayerTier())}
function drawShip(x,y){
 const sh=SHIPS[ship],key=shipSpriteKey(),size=(sh.sprite?108:[0,92,98,104,110,118][currentPlayerTier()])*sh.scale;
 g.save();g.translate(x,y);
 let alpha=1;if(mode==='story'&&story.hide>0)alpha=.27;if(inv>0&&Math.floor(t*15)%2===0)alpha*=.35;
 g.globalAlpha=alpha;
 // Пламя двигателей.
 const tr=currentPlayerTier(),fl=1+Math.sin(t*40)*.15+Math.random()*.1,nozzles=sh.sprite?[-16,0,16]:tr>=4?[-22,-8,8,22]:tr>=2?[-14,0,14]:[-10,10];
 if(QUALITY.additive)g.globalCompositeOperation='lighter';
 for(const nx of nozzles){const d=glowDot(rgba(sh.engine,1),16);const s=(nx===0?24:18)*fl;g.drawImage(d.cv,nx-s/2,size*.38-s*.2,s,s*1.7)}
 g.globalCompositeOperation='source-over';
 if(overcharge>0||ship==='specter'){const d=glowDot(rgba(overcharge>0?'#56f6ff':'#b98aff',1),32);g.globalAlpha=alpha*(.35+.15*Math.sin(t*8));g.drawImage(d.cv,-size*.7,-size*.7,size*1.4,size*1.4);g.globalAlpha=alpha}
 const bank=player.bank||0;
 if(!drawSprite(key,0,0,size,{glow:sh.engine||'#00cfff',sx:1-Math.abs(bank)*.1,rot:bank*.06}))fallbackPlayerShip();
 if(sh.shield&&player.shieldCd<=0){g.strokeStyle=`rgba(255,215,110,${.55+.2*Math.sin(t*6)})`;g.lineWidth=3;g.beginPath();g.arc(0,8,size*.62,-Math.PI*.85,-Math.PI*.15);g.stroke()}
 if(player.bubble>0){g.strokeStyle=`rgba(127,216,255,${.45+.25*Math.sin(t*8)})`;g.lineWidth=3;g.beginPath();g.arc(0,2,size*.6,0,TAU);g.stroke();g.fillStyle='rgba(127,216,255,.08)';g.fill()}
 if(player.magnet>0){g.strokeStyle='rgba(255,122,216,.25)';g.setLineDash([6,8]);g.lineWidth=2;g.beginPath();g.arc(0,0,90+Math.sin(t*5)*6,0,TAU);g.stroke();g.setLineDash([])}
 if(Object.values(contraband).some(Boolean)){g.strokeStyle='rgba(219,93,255,.5)';g.lineWidth=2;g.beginPath();g.arc(0,6,size*.42+Math.sin(t*7)*3,0,TAU);g.stroke()}
 if(inv>.75){g.globalAlpha=(inv-.75)*2;g.strokeStyle='#9ff8ff';g.lineWidth=3;g.beginPath();g.arc(0,0,size*.55,0,TAU);g.stroke()}
 g.restore();
}
function fallbackPlayerShip(){g.fillStyle='#29dfff';g.beginPath();g.moveTo(0,-38);g.lineTo(15,-9);g.lineTo(34,12);g.lineTo(28,28);g.lineTo(7,15);g.lineTo(0,26);g.lineTo(-7,15);g.lineTo(-28,28);g.lineTo(-34,12);g.lineTo(-15,-9);g.closePath();g.fill();g.fillStyle='#e7fbff';g.beginPath();g.moveTo(0,-22);g.lineTo(8,7);g.lineTo(-8,7);g.fill()}
function drawDrones(){
 const n=activeDroneCount();for(let i=0;i<n;i++){const p=dronePos(i,n);g.save();g.translate(p.x,p.y);
  const d=glowDot('rgba(110,220,255,1)',12);g.globalAlpha=.7;g.drawImage(d.cv,-14,-6,28,28);g.globalAlpha=1;
  g.fillStyle='#d9f6ff';g.beginPath();g.moveTo(0,-13);g.lineTo(10,8);g.lineTo(0,4);g.lineTo(-10,8);g.closePath();g.fill();g.fillStyle='#2bbcff';g.fillRect(-2,-6,4,8);g.restore()}
}
/* ---------- Враги ---------- */
function drawFoe(f){
 const d=FOE[f.type],glow=f.elite?'#b55cff':d.glow,rot=f.type==='zig'?Math.sin(f.age*5)*.09:f.type==='drone'||f.type==='duckling'?Math.atan2(f.vy||1,f.vx||0)-Math.PI/2:0;
 if(f.type==='sniper'&&(f.state===1||f.state===2)){
  g.save();const lock=f.state===2;g.strokeStyle=lock?'rgba(255,90,220,.95)':'rgba(255,79,216,.45)';g.lineWidth=lock?3:1.5;g.setLineDash(lock?[]:[10,8]);g.beginPath();g.moveTo(f.x,f.y+20);g.lineTo(f.x+Math.cos(f.aim)*1100,f.y+20+Math.sin(f.aim)*1100);g.stroke();g.restore();
 }
 if(f.elite){const a=glowDot('rgba(181,92,255,1)',32);g.globalAlpha=.55+.2*Math.sin(t*6);g.drawImage(a.cv,f.x-d.size*.75,f.y-d.size*.75,d.size*1.5,d.size*1.5);g.globalAlpha=1}
 const sz=d.size*(f.elite?1.12:1);
 if(!drawSprite(FOE_SPRITE[f.type],f.x,f.y,sz,{glow,rot,flash:f.flash})){g.save();g.translate(f.x,f.y);g.fillStyle=f.elite?'#ad4bff':'#d34c60';g.beginPath();g.moveTo(0,24);g.lineTo(-28,-14);g.lineTo(0,-5);g.lineTo(28,-14);g.closePath();g.fill();g.restore()}
 if((f.max>=90||f.elite)&&f.hp<f.max&&f.type!=='drone'){const w=sz*.7;g.fillStyle='rgba(0,0,0,.55)';g.fillRect(f.x-w/2,f.y-sz*.52,w,4);g.fillStyle=f.elite?'#c46bff':'#ff6a5a';g.fillRect(f.x-w/2,f.y-sz*.52,w*Math.max(0,f.hp/f.max),4)}
}
/* ---------- Мини-боссы ---------- */
function drawMini(m){
 const bob=Math.sin(m.age*2.2)*6,rot=m.kind==='flower'?m.age*.25:m.kind==='duck'?Math.sin(m.age*2)*.08:Math.sin(m.age*1.6)*.05;
 g.save();g.translate(m.x,m.y+bob);
 const aura=glowDot(rgba(m.color,1),32),pulse=m.phase2?.55+.25*Math.sin(m.age*9):.35;g.globalAlpha=pulse;g.drawImage(aura.cv,-m.size*.8,-m.size*.7,m.size*1.6,m.size*1.4);g.globalAlpha=1;
 if(m.charge>0){g.strokeStyle=rgba(m.color,m.charge);g.lineWidth=4;g.beginPath();g.arc(0,0,m.size*.55*(1.4-m.charge*.4),0,TAU);g.stroke()}
 if(m.kind==='toilet'){g.save();g.rotate(m.age*3);g.strokeStyle='rgba(127,240,255,.35)';g.lineWidth=3;for(let i=0;i<3;i++){g.beginPath();g.arc(0,8,m.size*.42+i*9,i,i+2.4);g.stroke()}g.restore()}
 if(m.kind==='grandpa'&&Math.random()<.4)fxAdd({kind:'smoke',x:m.x+rnd(-50,50),y:m.y-40,vx:rnd(-10,10),vy:-40,life:.9,max:.9,r:10});
 if(m.kind==='sock'&&Math.random()<.3)fxAdd({kind:'trail',x:m.x+rnd(-60,60),y:m.y+rnd(-30,50),vx:0,vy:20,life:1,max:1,size:12,color:'#9dff5a'});
 const drew=drawSprite(m.kind,0,0,m.size,{glow:m.color,rot,flash:m.flash,variant:null});
 if(drew&&m.phase2){g.globalAlpha=.25+.2*Math.sin(m.age*10);drawSprite(m.kind,0,0,m.size,{glow:m.color,rot,variant:'red'});g.globalAlpha=1}
 if(!drew){g.fillStyle='#171d37';g.strokeStyle=m.color;g.lineWidth=8;g.beginPath();g.arc(0,0,65,0,TAU);g.fill();g.stroke()}
 if(m.kind==='duck'&&QUALITY.trails)fxAdd({kind:'trail',x:m.x-m.size*.42,y:m.y+bob-10+rnd(-8,8),vx:-60,vy:0,life:.3,max:.3,size:8,color:'#6fd8ff'});
 g.restore();
}
/* ---------- Флагман Архитектора (слои из концепта + интегрированное лицо) ---------- */
const BOSS_S=.72,BOSS_W=612,BOSS_WING=265;
const BOSS_LIGHT=['#ffb050','#ffb050','#ff8a2a','#ff3a3a','#ff1040'],BOSS_AURA=['#3aa0ff','#3aa0ff','#ff8a2a','#ff3030','#ff0040'];
function drawBoss(b){
 if(b.kind==='phantom')return drawPhantom(b);
 const P=b.phase,col=BOSS_LIGHT[P],fl=P===4?.65+.35*Math.sin(b.age*24):1,add=QUALITY.additive;
 g.save();g.translate(b.x,b.y);
 if(P===4)g.translate(rnd(-1.5,1.5),rnd(-1,1));
 // Аура фазы.
 const aura=glowDot(rgba(BOSS_AURA[P],1),32);g.globalAlpha=(P===1?.32:.42)*fl;if(add)g.globalCompositeOperation='lighter';g.drawImage(aura.cv,-360,-230,720,460);g.globalCompositeOperation='source-over';g.globalAlpha=1;
 // Щиты-крылья: в 3-й фазе раздвигаются и разворачиваются.
 const sh=b.wing*26,rot=b.wing*.07,jit=P===4?rnd(-2,2):0;
 const wl=spriteCache('archWingL',BOSS_WING),wr=spriteCache('archWingR',BOSS_WING);
 if(wl){g.save();g.translate(-246.6-sh+jit,b.wing*6);g.rotate(-rot);g.drawImage(wl.cv,-wl.w/2,-wl.h/2,wl.w,wl.h);g.restore()}
 if(wr){g.save();g.translate(264.6+sh-jit,b.wing*6);g.rotate(rot);g.drawImage(wr.cv,-wr.w/2,-wr.h/2,wr.w,wr.h);g.restore()}
 const hull=spriteCache('archHull',BOSS_W);
 if(hull){
  g.drawImage(hull.cv,-hull.w/2,-hull.h/2,hull.w,hull.h);
  // Огни корпуса меняют цвет по фазам и пульсируют.
  const glow=tintedSprite('archGlow',BOSS_W,col);
  if(glow){g.globalAlpha=(.45+.3*Math.sin(b.age*(2+P)))*fl;if(add)g.globalCompositeOperation='lighter';g.drawImage(glow.cv,-glow.w/2,-glow.h/2,glow.w,glow.h);if(P>=3)g.drawImage(glow.cv,-glow.w/2,-glow.h/2,glow.w,glow.h);g.globalCompositeOperation='source-over';g.globalAlpha=1}
  if(b.flash>0){const wv=spriteCache('archHull',BOSS_W,null,'white');if(wv){g.globalAlpha=Math.min(.16,b.flash*3);g.drawImage(wv.cv,-wv.w/2,-wv.h/2,wv.w,wv.h);g.globalAlpha=1}}
 }else{g.fillStyle='#2a2f3a';g.beginPath();g.ellipse(0,0,250,110,0,0,TAU);g.fill();if(imgReady(portrait)){g.save();g.beginPath();g.ellipse(0,0,60,74,0,0,TAU);g.clip();g.drawImage(portrait,-60,-74,120,148);g.restore()}}
 // Лицо: ярость в поздних фазах.
 if(P>=3){g.save();g.beginPath();g.ellipse(-3,9,36,53,0,0,TAU);g.clip();g.fillStyle=rgba(P===4?'#ff1030':'#ff5a20',P===4?.16+.12*Math.sin(b.age*8):.1);g.fillRect(-40,-50,80,115);
  if(P===4){g.strokeStyle='rgba(255,190,110,.8)';g.lineWidth=1.4;g.beginPath();g.moveTo(-26,-30);g.lineTo(-14,-10);g.lineTo(-19,8);g.moveTo(20,-36);g.lineTo(11,-14);g.lineTo(18,2);g.lineTo(12,22);g.stroke()}g.restore()}
 // Глаза и двигатели.
 if(add)g.globalCompositeOperation='lighter';
 const eye=glowDot(rgba(col,1),12),es=(P>=3?22:15)*(1+.25*Math.sin(b.age*6));for(const ex of [-21,16])g.drawImage(eye.cv,ex-es/2,-14-es/2,es,es);
 const eng=glowDot(rgba(col,1),16);for(const [ex,ey,sz] of [[0,128,30],[-150,98,20],[150,98,20],[-75,118,18],[75,118,18]]){const ss=sz*(.8+Math.random()*.35);g.drawImage(eng.cv,ex-ss/2,ey-ss*.3,ss,ss*1.6)}
 g.globalCompositeOperation='source-over';
 // Турели.
 const tur=spriteCache('turret',46);
 for(const m of b.modules){if(m.hp<=0||(m.wingMount&&P<3))continue;const mp=modulePos(m),mx=mp.x-b.x,my=mp.y-b.y,a=Math.atan2(player.y-mp.y,player.x-mp.x)-Math.PI/2;
  if(m.wingMount&&b.wing<.6){g.globalAlpha=b.wing/.6}
  g.save();g.translate(mx,my);g.rotate(a);if(tur)g.drawImage(tur.cv,-tur.w/2,-tur.h/2,tur.w,tur.h);if(m.flash>0){g.globalAlpha=.6;g.fillStyle='#fff';g.beginPath();g.arc(0,0,20,0,TAU);g.fill()}g.restore();g.globalAlpha=1;
  g.fillStyle='rgba(0,0,0,.6)';g.fillRect(mx-20,my-32,40,4);g.fillStyle='#ffb24a';g.fillRect(mx-20,my-32,40*m.hp/m.max,4)}
 g.restore();
}
/* ---------- Снаряды ---------- */
function drawShots(){
 if(QUALITY.additive)g.globalCompositeOperation='lighter';
 for(const b of shots){
  if(b.kind==='missile'){g.save();g.translate(b.x,b.y);g.rotate(Math.atan2(b.vy,b.vx)+Math.PI/2);g.globalCompositeOperation='source-over';g.fillStyle='#e9eef5';g.fillRect(-2.5,-9,5,14);g.fillStyle='#ff6a3a';g.beginPath();g.moveTo(-2.5,-9);g.lineTo(0,-14);g.lineTo(2.5,-9);g.fill();const d=glowDot('rgba(255,170,80,1)',12);g.drawImage(d.cv,-7,4,14,16);g.restore();if(QUALITY.additive)g.globalCompositeOperation='lighter';continue}
  const tx=bulletTex(b.kind==='plasma'?'plasma':b.kind==='drone'?'drone':'laser',b.color,b.kind==='drone'?3:b.r);
  if(b.vx){g.save();g.translate(b.x,b.y);g.rotate(Math.atan2(b.vy,b.vx)+Math.PI/2);g.drawImage(tx.cv,-tx.w/2,-tx.h/2,tx.w,tx.h);g.restore()}
  else g.drawImage(tx.cv,b.x-tx.w/2,b.y-tx.h/2,tx.w,tx.h);
 }
 g.globalCompositeOperation='source-over';
}
function drawHostile(){
 for(const b of hostile){
  if(b.kind==='pixel'){const tx=bulletTex('pixel',b.color,Math.round(b.r));g.save();g.translate(b.x,b.y);g.rotate(t*3+b.x*.01);g.drawImage(tx.cv,-tx.w/2,-tx.h/2,tx.w,tx.h);g.restore();continue}
  if(b.kind==='needle'){const tx=bulletTex('needle',b.color,b.r);g.save();g.translate(b.x,b.y);g.rotate(Math.atan2(b.vy,b.vx)-Math.PI/2);g.drawImage(tx.cv,-tx.w/2,-tx.h/2,tx.w,tx.h);g.restore();continue}
  if(b.kind==='bomb'){const k=Math.max(0,b.fuse/b.max);g.strokeStyle=`rgba(255,176,42,${.25+.5*(1-k)})`;g.lineWidth=2;g.setLineDash([6,6]);g.beginPath();g.arc(b.x,b.y,58,0,TAU);g.stroke();g.setLineDash([]);
   const r=b.r*(1+.15*Math.sin(t*(20-k*12)));const tx=bulletTex('orb',b.color,13);g.drawImage(tx.cv,b.x-tx.w*r/26,b.y-tx.h*r/26,tx.w*r/13,tx.h*r/13);continue}
  const tx=bulletTex('orb',b.color,Math.round(b.r));g.drawImage(tx.cv,b.x-tx.w/2,b.y-tx.h/2,tx.w,tx.h);
 }
}
/* ---------- Улики, бонусы ---------- */
function drawCapsule(r){g.save();g.translate(r.x,r.y);g.rotate(Math.sin(r.spin*4)*.12);const d=glowDot('rgba(255,228,139,1)',24);g.globalAlpha=.8;g.drawImage(d.cv,-34,-34,68,68);g.globalAlpha=1;g.fillStyle='#6fe9ff';g.beginPath();g.moveTo(0,-22);g.lineTo(17,0);g.lineTo(0,22);g.lineTo(-17,0);g.closePath();g.fill();g.fillStyle='#172d5b';g.fillRect(-9,-7,18,14);g.fillStyle='#fff';g.fillRect(-3,-3,6,6);g.fillStyle='#ffe48b';g.font='bold 10px system-ui';g.textAlign='center';g.fillText('УЛИКА',0,36);g.restore()}
const PICK_STYLE={repair:['#4dffb0','+'],bomb:['#ffcf4a','B'],overcharge:['#56f6ff','⚡'],credits:['#ffd27a','₡'],shield:['#7fd8ff','◈'],magnet:['#ff7ad8','U']};
function drawPickup(p){const [col,ic]=PICK_STYLE[p.type];g.save();g.translate(p.x,p.y+Math.sin(p.age*5)*3);const d=glowDot(rgba(col,1),20);g.globalAlpha=.75;g.drawImage(d.cv,-26,-26,52,52);g.globalAlpha=1;g.rotate(p.age*1.5);g.strokeStyle=col;g.lineWidth=3;g.fillStyle='rgba(6,20,36,.85)';g.beginPath();g.roundRect(-13,-13,26,26,6);g.fill();g.stroke();g.rotate(-p.age*1.5);g.fillStyle='#fff';g.font='900 15px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText(ic,0,1);g.textBaseline='alphabetic';g.restore()}
/* ---------- Опасные зоны ---------- */
function renderHazards(firing){
 for(const h of hazards){
  const isFire=h.state==='fire',over=isFire&&h.type!=='cloud'&&h.type!=='pull';if(over!==firing)continue;
  const col=h.color||'#ff245b',warnK=h.state==='warn'?h.t/h.warn:1,blink=.35+.25*Math.sin(t*25);
  g.save();
  if(h.type==='beamV'){const y0=h.y0||110;
   if(!isFire){g.globalAlpha=.16+.14*warnK;g.fillStyle=col;g.fillRect(h.x-h.w/2,y0,h.w,H-y0);g.globalAlpha=1;g.strokeStyle=col;g.lineWidth=2;g.setLineDash([14,10]);g.strokeRect(h.x-h.w/2,y0,h.w,H-y0);g.setLineDash([]);
    g.globalAlpha=blink+.3;g.fillStyle=col;g.font='900 15px system-ui';g.textAlign='center';g.fillText('⚠ '+(h.label||'ОПАСНО'),clamp(h.x,70,W-70),y0+90)}
   else if(h.rain==='pixel'){for(let i=0;i<8;i++){const yy=(y0+((t*650+i*130)%(H-y0)));const xx=h.x+Math.sin(i*3)*h.w*.3;g.fillStyle=i%2?'#9dff5a':'#5f8a3a';g.fillRect(xx-8,yy-8,16,16);g.fillStyle='#e8ffd8';g.fillRect(xx-3,yy-3,6,6)}}
   else if(h.rain){for(let i=0;i<7;i++){const yy=(y0+((t*700+i*140)%(H-y0)));g.fillStyle='#ffe1a8';g.beginPath();g.ellipse(h.x+Math.sin(i*3)*h.w*.3,yy,12,9,0,0,TAU);g.fill();g.strokeStyle='#b38a4e';g.lineWidth=2;g.stroke()}}
   else{const k=1-h.t/h.active;if(QUALITY.additive)g.globalCompositeOperation='lighter';const gr=g.createLinearGradient(h.x-h.w/2,0,h.x+h.w/2,0);gr.addColorStop(0,rgba(col,0));gr.addColorStop(.3,rgba(col,.8));gr.addColorStop(.5,'rgba(255,255,255,1)');gr.addColorStop(.7,rgba(col,.8));gr.addColorStop(1,rgba(col,0));g.globalAlpha=.6+.4*k;g.fillStyle=gr;g.fillRect(h.x-h.w*.7,y0,h.w*1.4,H-y0)}}
  else if(h.type==='beamH'){
   if(!isFire){g.globalAlpha=.15+.15*warnK;g.fillStyle=col;g.fillRect(0,h.y-h.w/2,W,h.w);g.globalAlpha=1;g.strokeStyle=col;g.lineWidth=2;g.setLineDash([14,10]);g.strokeRect(0,h.y-h.w/2,W,h.w);g.setLineDash([]);g.globalAlpha=blink+.3;g.fillStyle=col;g.font='900 15px system-ui';g.textAlign='center';g.fillText('⚠ '+(h.label||'ОПАСНО'),W/2,h.y-h.w/2-8)}
   else{if(QUALITY.additive)g.globalCompositeOperation='lighter';const gr=g.createLinearGradient(0,h.y-h.w/2,0,h.y+h.w/2);gr.addColorStop(0,rgba(col,0));gr.addColorStop(.5,'rgba(255,255,255,1)');gr.addColorStop(1,rgba(col,0));g.fillStyle=gr;g.fillRect(0,h.y-h.w*.7,W,h.w*1.4)}}
  else if(h.type==='circle'&&!isFire){g.fillStyle=rgba(col,.12+.18*warnK);g.beginPath();g.arc(h.x,h.y,h.r,0,TAU);g.fill();g.strokeStyle=col;g.lineWidth=3;g.beginPath();g.arc(h.x,h.y,h.r*(1-warnK*.85)+4,0,TAU);g.stroke();g.setLineDash([8,6]);g.beginPath();g.arc(h.x,h.y,h.r,0,TAU);g.stroke();g.setLineDash([]);g.fillStyle=col;g.font='900 13px system-ui';g.textAlign='center';g.fillText(h.label||'',h.x,h.y+5)}
  else if(h.type==='cloud'){
   if(!isFire){g.strokeStyle=col;g.setLineDash([8,6]);g.lineWidth=2;g.globalAlpha=blink+.3;g.beginPath();g.arc(h.x,h.y,h.r,0,TAU);g.stroke();g.setLineDash([]);g.fillStyle=col;g.font='900 13px system-ui';g.textAlign='center';g.fillText('⚠ '+h.label,h.x,h.y+5)}
   else{const fade=Math.min(1,(h.active-h.t)*2),d=glowDot(rgba(col,1),32);g.globalAlpha=.45*fade;for(let i=0;i<5;i++){const a=t*.8+i*1.3,rr=h.r*(.9+.15*Math.sin(t*2+i));g.drawImage(d.cv,h.x+Math.cos(a)*h.r*.25-rr,h.y+Math.sin(a)*h.r*.25-rr,rr*2,rr*2)}}}
  else if(h.type==='pull'){const src=mini||h;g.translate(src.x,src.y);g.rotate(t*(isFire?5:2));g.strokeStyle=rgba(col,isFire?.7:.35+.2*warnK);g.lineWidth=isFire?4:2;for(let i=0;i<4;i++){g.rotate(TAU/4);g.beginPath();for(let k=0;k<30;k++){const rr=30+k*14,a=k*.22;g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}g.stroke()}}
  g.restore();
 }
 g.globalCompositeOperation='source-over';g.globalAlpha=1;
}
/* ---------- HUD ---------- */
function hudBar(x,y,w,h,k,col,bg='#16304a'){g.fillStyle=bg;g.beginPath();g.roundRect(x,y,w,h,h/2);g.fill();if(k>0){g.fillStyle=col;g.beginPath();g.roundRect(x,y,Math.max(h,w*clamp(k,0,1)),h,h/2);g.fill()}g.fillStyle='rgba(255,255,255,.18)';g.fillRect(x+h/2,y+1,Math.max(0,w*clamp(k,0,1)-h),h*.35)}
function renderHUD(){
 if(!['play','pause','perk','dialog'].includes(state))return;
 const gr=g.createLinearGradient(0,0,0,140);gr.addColorStop(0,'rgba(2,7,18,.94)');gr.addColorStop(.7,'rgba(2,7,18,.6)');gr.addColorStop(1,'rgba(2,7,18,0)');g.fillStyle=gr;g.fillRect(0,0,W,140);
 const sx=W-((pauseBtn.offsetWidth||44)+22)/cssScale;
 g.textAlign='left';g.fillStyle='#7eefff';g.font='800 16px system-ui';
 g.fillText(mode==='story'?'ОПЕРАЦИЯ '+(currentCaseStage+1)+'/'+CASE_OPERATIONS.length+' · '+caseCurrent().sector:challengeActive?'ИСПЫТАНИЕ · '+challengeActive.name.toUpperCase():mode==='endless'?'БЕЗДНА ∞':'ПАРАД ДЕБИЛОВ',16,26);
 g.textAlign='right';g.fillStyle='#ffffff';g.font='900 28px system-ui';g.fillText(score.toLocaleString('ru-RU'),sx,32);
 if(combo>=8){g.fillStyle='#ffd27a';g.font='900 15px system-ui';g.fillText('КОМБО ×'+(1+Math.min(2,Math.floor(combo/8)*.25)).toFixed(2),sx,54)}
 const hpK=player.hp/player.max;hudBar(16,38,280,20,hpK,hpK>.5?'#36e5bc':hpK>.25?'#ffd36c':'#ff5270');
 g.textAlign='left';g.fillStyle='#04121e';g.font='900 13px system-ui';g.fillText('КОРПУС '+Math.max(0,Math.ceil(hpK*100))+'%',26,53);
 g.fillStyle='#cfeaf7';g.font='800 15px system-ui';
 const status=boss?(boss.kind==='phantom'?'«НЕВИДИМКА» · ФАЗА ':'ФЛАГМАН · ФАЗА ')+boss.phase+(boss.kind==='phantom'&&boss.cloak>0?' · МАСКИРОВКА':''):mini?'АНОМАЛИЯ'+(mini.phase2?' · ФАЗА 2':''):mode==='parade'?`ПАРАД ${paradeKills}/${MINI.length}`:mode==='endless'?`ВОЛНА ${wave}`+(challengeActive?'/'+CHALLENGE_GOAL:''):`СЕКТОР · ${Math.ceil(t)}с`;
 let extra='';if(overcharge>0)extra+=' · ⚡'+Math.ceil(overcharge);if(player.bubble>0)extra+=' · ◈'+Math.ceil(player.bubble);if(player.magnet>0)extra+=' · U'+Math.ceil(player.magnet);
 g.fillText(status+' · GRAZE '+graze+extra,16,80);
 if(mode==='story'){hudBar(16,90,200,12,story.suspicion/100,story.suspicion<40?'#35eab5':story.suspicion<70?'#ffd36c':'#ff4b60');g.fillStyle='#d8ecff';g.font='800 13px system-ui';g.fillText('ВНИМАНИЕ '+Math.floor(story.suspicion)+'%',226,101);
  for(let i=0;i<story.need;i++){const x0=372+i*24;g.fillStyle=i<story.reports?'#ffe48b':'rgba(255,228,139,.22)';g.beginPath();g.moveTo(x0,88);g.lineTo(x0+9,97);g.lineTo(x0,106);g.lineTo(x0-9,97);g.closePath();g.fill()}
  if(story.hide>0||story.freeze>0){g.fillStyle='#7ff9e4';g.font='900 14px system-ui';g.fillText(story.hide>0?'ALT+TAB: НЕВИДИМОСТЬ':'EXCEL: ЗАМЕДЛЕНИЕ',16,126)}
  if(story.suspicion>=70){g.fillStyle='rgba(120,12,34,'+(.06+.05*Math.sin(t*12))+')';g.fillRect(0,0,W,H);g.textAlign='center';g.fillStyle='#ff6b83';g.font='900 19px system-ui';g.fillText('ЦЕЛЬ ВЫСЛАЛА ПЕРЕХВАТЧИКИ!',W/2,160)}}
 const bb=boss||mini;if(bb&&bb.y>-80){const y=mode==='story'?140:116,col=boss?'#ff4d6e':mini.color;g.textAlign='center';g.fillStyle='#fff';g.font='900 16px system-ui';g.fillText(boss?BOSS_INFO[boss.kind].name:mini.name,W/2,y);hudBar(30,y+7,W-60,11,bb.hp/bb.max,col,'#2a1220');
  g.fillStyle='rgba(255,255,255,.6)';for(const k of (boss?(boss.kind==='phantom'?[.33,.66]:[.25,.5,.75]):[.5]))g.fillRect(30+(W-60)*k-1,y+6,2,13)}
 if(warnBanner>0){const k=Math.min(1,warnBanner*2,(3-warnBanner)*4),y=H*.24;g.save();g.globalAlpha=k;g.fillStyle='rgba(60,0,10,.75)';g.fillRect(0,y-30,W,60);g.beginPath();g.rect(0,y-30,W,60);g.clip();g.fillStyle='rgba(255,40,70,.85)';const off=(t*120)%60;for(let x=-60;x<W+60;x+=60){g.beginPath();g.moveTo(x+off,y-30);g.lineTo(x+off+24,y-30);g.lineTo(x+off-6,y+30);g.lineTo(x+off-30,y+30);g.closePath();g.fill()}
  g.fillStyle='rgba(10,0,4,.82)';g.fillRect(70,y-22,W-140,44);g.fillStyle=Math.floor(t*6)%2?'#ffffff':'#ff5a78';g.font='900 26px system-ui';g.textAlign='center';g.fillText('⚠ ВНИМАНИЕ ⚠',W/2,y+9);g.restore()}
 if(announceTimer>0){const k=Math.min(1,announceTimer*3,(announceMax-announceTimer)*6+.2),y=H*.36;g.globalAlpha=k;const bg=g.createLinearGradient(0,0,W,0);bg.addColorStop(0,'rgba(4,8,25,0)');bg.addColorStop(.15,'rgba(4,8,25,.88)');bg.addColorStop(.85,'rgba(4,8,25,.88)');bg.addColorStop(1,'rgba(4,8,25,0)');g.fillStyle=bg;g.fillRect(0,y-38,W,announceSub||mode==='story'?80:58);
  g.fillStyle='#ffdc84';g.textAlign='center';g.font='900 22px system-ui';g.fillText(announcement.slice(0,36),W/2,y);g.font='800 14px system-ui';g.fillStyle='#a9d8ff';g.fillText((announceSub||(mode==='story'?caseCurrent().sector:'')).slice(0,48),W/2,y+27);g.globalAlpha=1}
 if(!player.dead&&player.hp/player.max<.3){const v=g.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.7);v.addColorStop(0,'rgba(255,0,40,0)');v.addColorStop(1,`rgba(255,0,40,${.18+.1*Math.sin(t*6)})`);g.fillStyle=v;g.fillRect(0,0,W,H)}
}


/* ---------- «Невидимка» Капитана Ухмылки ---------- */
const PH_S=600;
function drawPhantomBody(b,alpha,ghost){
 const hull=spriteCache('phHull',PH_S),wl=spriteCache('phWingL',PH_S),wr=spriteCache('phWingR',PH_S);
 if(!hull){g.fillStyle='#3a4a2a';g.beginPath();g.ellipse(0,0,220,100,0,0,TAU);g.fill();return}
 const spread=b.phase>=2?8+Math.sin(b.age*2)*3:0;g.globalAlpha=alpha;
 if(wl)g.drawImage(wl.cv,-wl.w/2-spread,-wl.h/2,wl.w,wl.h);if(wr)g.drawImage(wr.cv,-wr.w/2+spread,-wr.h/2,wr.w,wr.h);
 g.drawImage(hull.cv,-hull.w/2,-hull.h/2,hull.w,hull.h);
 const glow=tintedSprite('phGlow',PH_S,ghost?'#c8ff9a':'#9dff5a');
 if(glow){g.globalAlpha=alpha*(.45+.3*Math.sin(b.age*(2+b.phase)));if(QUALITY.additive)g.globalCompositeOperation='lighter';g.drawImage(glow.cv,-glow.w/2,-glow.h/2,glow.w,glow.h);g.globalCompositeOperation='source-over'}
 g.globalAlpha=1;
}
function drawPhantom(b){
 const P=b.phase,cl=b.cloak>0;
 // Ложные цели.
 for(const d of decoys){g.save();g.translate(d.x,d.y);g.scale(.62,.62);drawPhantomBody(b,.42+.12*Math.sin(d.age*9),true);if(d.flash>0){g.globalAlpha=.3;g.fillStyle='#e8ffd8';g.beginPath();g.ellipse(0,0,200,100,0,0,TAU);g.fill();g.globalAlpha=1}g.restore();
  g.fillStyle='rgba(0,0,0,.6)';g.fillRect(d.x-40,d.y-78,80,4);g.fillStyle='#9dff5a';g.fillRect(d.x-40,d.y-78,80*d.hp/d.max,4)}
 // Точка телепорта.
 if(b.tele){const k=1-b.tele.t/.8;g.save();g.globalAlpha=.3+.4*k;g.strokeStyle='#9dff5a';g.lineWidth=2;for(let i=0;i<9;i++){const xx=b.tele.x-180+i*45+rnd(-4,4);g.beginPath();g.moveTo(xx,b.y-90);g.lineTo(xx,b.y+110);g.stroke()}g.fillStyle='#9dff5a';g.font='900 14px system-ui';g.textAlign='center';g.fillText('⚠ ТЕЛЕПОРТ',b.tele.x,b.y+140);g.restore()}
 g.save();g.translate(b.x,b.y);
 const aura=glowDot(rgba(P===3?'#c8ff4a':'#5aff7a',1),32);g.globalAlpha=(cl?.15:.35)*(P===3?1.3:1);if(QUALITY.additive)g.globalCompositeOperation='lighter';g.drawImage(aura.cv,-330,-200,660,400);g.globalCompositeOperation='source-over';g.globalAlpha=1;
 if(cl){
  // Маскировка: почти прозрачный корпус, сдвинутые полосы-глитчи.
  const a=.16+.08*Math.sin(b.age*30);g.save();g.translate(rnd(-3,3),0);drawPhantomBody(b,a,true);g.restore();
  g.globalAlpha=.35;g.fillStyle='#9dff5a';for(let i=0;i<6;i++){const yy=rnd(-110,110),hh=rnd(2,6);g.fillRect(rnd(-260,-40),yy,rnd(80,300),hh)}g.globalAlpha=1;
 }else{
  drawPhantomBody(b,1,false);
  if(b.flash>0){const wv=spriteCache('phHull',PH_S,null,'white');if(wv){g.globalAlpha=Math.min(.16,b.flash*3);g.drawImage(wv.cv,-wv.w/2,-wv.h/2,wv.w,wv.h);g.globalAlpha=1}}
  // Фаза «Ухмылка»: зелёное свечение лица.
  if(P===3){const f=glowDot('rgba(157,255,90,1)',24);g.globalAlpha=.25+.2*Math.sin(b.age*7);if(QUALITY.additive)g.globalCompositeOperation='lighter';g.drawImage(f.cv,-80,-110,160,180);g.globalCompositeOperation='source-over';g.globalAlpha=1}
 }
 // Гондолы-турели.
 const tur=spriteCache('turret',46);
 for(const m of b.modules){if(m.hp<=0)continue;const mx=m.x,my=m.y,a=Math.atan2(player.y-(b.y+my),player.x-(b.x+mx))-Math.PI/2;g.save();g.translate(mx,my);g.globalAlpha=cl?.25:1;g.rotate(a);if(tur)g.drawImage(tur.cv,-tur.w/2,-tur.h/2,tur.w,tur.h);if(m.flash>0){g.globalAlpha=.6;g.fillStyle='#fff';g.beginPath();g.arc(0,0,20,0,TAU);g.fill()}g.restore();
  if(!cl){g.fillStyle='rgba(0,0,0,.6)';g.fillRect(mx-20,my-32,40,4);g.fillStyle='#9dff5a';g.fillRect(mx-20,my-32,40*m.hp/m.max,4)}}
 g.restore();
}
