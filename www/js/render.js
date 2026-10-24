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
function drawShip(x,y){
 const tier=currentPlayerTier(),sh=SHIPS[ship],size=[0,92,98,104,110,118][tier]*sh.scale;
 g.save();g.translate(x,y);
 let alpha=1;if(mode==='story'&&story.hide>0)alpha=.27;if(inv>0&&Math.floor(t*15)%2===0)alpha*=.35;
 g.globalAlpha=alpha;
 // Пламя двигателей.
 const fl=1+Math.sin(t*40)*.15+Math.random()*.1,nozzles=tier>=4?[-22,-8,8,22]:tier>=2?[-14,0,14]:[-10,10];
 if(QUALITY.additive)g.globalCompositeOperation='lighter';
 for(const nx of nozzles){const d=glowDot(rgba(sh.engine,1),16);const s=(nx===0?24:18)*fl;g.drawImage(d.cv,nx-s/2,size*.38-s*.2,s,s*1.7)}
 g.globalCompositeOperation='source-over';
 if(overcharge>0||ship==='specter'){const d=glowDot(rgba(overcharge>0?'#56f6ff':'#b98aff',1),32);g.globalAlpha=alpha*(.35+.15*Math.sin(t*8));g.drawImage(d.cv,-size*.7,-size*.7,size*1.4,size*1.4);g.globalAlpha=alpha}
 const bank=player.bank||0;
 if(!drawSprite('player'+tier,0,0,size,{glow:'#00cfff',sx:1-Math.abs(bank)*.1,rot:bank*.06}))fallbackPlayerShip();
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
/* ---------- Флагман Архитектора ---------- */
function drawBoss(b){
 const P=b.phase,light=['#5fd0ff','#5fd0ff','#ffa13a','#ff4a3a','#ff1a4a'][P],fl=P===4?.75+.25*Math.sin(b.age*22):1;
 g.save();g.translate(b.x,b.y);
 // Ореол и свет фазы.
 const aura=glowDot(rgba(light,1),32);g.globalAlpha=.45*fl;if(QUALITY.additive)g.globalCompositeOperation='lighter';g.drawImage(aura.cv,-300,-220,600,440);g.globalCompositeOperation='source-over';g.globalAlpha=1;
 const halo=spriteCache('archHalo',560);if(halo){g.save();g.translate(0,-40);g.scale(1+.03*Math.sin(b.age*2),1);g.globalAlpha=P===1?.55:.9;g.drawImage(halo.cv,-halo.w/2,-halo.h/2,halo.w,halo.h);g.restore();g.globalAlpha=1}
 // Крылья раскрываются с 3-й фазы.
 const wing=spriteCache('archWing',260),wk=lerp(.55,1,b.wing),wa=-(1-b.wing)*.55;
 if(wing)for(const s of [1,-1]){g.save();g.scale(s,1);g.translate(140,-20);g.rotate(wa);g.scale(wk,1);g.drawImage(wing.cv,-4,-wing.h/2,wing.w,wing.h);g.restore()}
 // Корпус и лицо.
 const core=spriteCache('archCore',380);if(core)g.drawImage(core.cv,-core.w/2,-core.h/2,core.w,core.h);
 const face=spriteCache('archFace',206);
 if(face){g.drawImage(face.cv,-face.w/2,10-face.h/2,face.w,face.h);
  if(P>=3){g.save();g.beginPath();g.ellipse(0,10,86,100,0,0,TAU);g.clip();g.fillStyle=rgba(P===4?'#ff1030':'#ff5a20',P===4?.18+.12*Math.sin(b.age*8):.12);g.fillRect(-90,-95,180,210);
   if(P===4){g.strokeStyle='rgba(255,200,120,.75)';g.lineWidth=2;g.beginPath();g.moveTo(-60,-60);g.lineTo(-30,-20);g.lineTo(-42,20);g.moveTo(50,-70);g.lineTo(28,-30);g.lineTo(44,0);g.lineTo(30,40);g.stroke()}g.restore()}}
 else{g.fillStyle='#c99';g.beginPath();g.ellipse(0,10,80,92,0,0,TAU);g.fill()}
 if(b.flash>0){g.globalAlpha=Math.min(.5,b.flash*8);g.fillStyle='#fff';g.beginPath();g.ellipse(0,20,150,110,0,0,TAU);g.fill();g.globalAlpha=1}
 // Двигатели.
 if(QUALITY.additive)g.globalCompositeOperation='lighter';
 for(const [ex,ey,s] of [[-70,150,34],[0,168,46],[70,150,34]]){const d=glowDot(rgba(light,1),16);const ss=s*(.85+Math.random()*.3);g.drawImage(d.cv,ex-ss/2,ey-ss/2,ss,ss*1.5)}
 g.globalCompositeOperation='source-over';
 // Турели.
 const tur=spriteCache('turret',52);
 for(const m of b.modules){if(m.hp<=0||(m.wingMount&&P<3))continue;const mx=m.x*wingK(m),my=m.y,a=Math.atan2(player.y-(b.y+my),player.x-(b.x+mx))-Math.PI/2;
  g.save();g.translate(mx,my);g.rotate(a);if(tur)g.drawImage(tur.cv,-tur.w/2,-tur.h/2,tur.w,tur.h);if(m.flash>0){g.globalAlpha=.6;g.fillStyle='#fff';g.beginPath();g.arc(0,0,22,0,TAU);g.fill()}g.restore();
  g.fillStyle='rgba(0,0,0,.6)';g.fillRect(mx-22,my-36,44,4);g.fillStyle='#ffb24a';g.fillRect(mx-22,my-36,44*m.hp/m.max,4)}
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
  if(b.kind==='needle'){const tx=bulletTex('needle',b.color,b.r);g.save();g.translate(b.x,b.y);g.rotate(Math.atan2(b.vy,b.vx)-Math.PI/2);g.drawImage(tx.cv,-tx.w/2,-tx.h/2,tx.w,tx.h);g.restore();continue}
  if(b.kind==='bomb'){const k=Math.max(0,b.fuse/b.max);g.strokeStyle=`rgba(255,176,42,${.25+.5*(1-k)})`;g.lineWidth=2;g.setLineDash([6,6]);g.beginPath();g.arc(b.x,b.y,58,0,TAU);g.stroke();g.setLineDash([]);
   const r=b.r*(1+.15*Math.sin(t*(20-k*12)));const tx=bulletTex('orb',b.color,13);g.drawImage(tx.cv,b.x-tx.w*r/26,b.y-tx.h*r/26,tx.w*r/13,tx.h*r/13);continue}
  const tx=bulletTex('orb',b.color,Math.round(b.r));g.drawImage(tx.cv,b.x-tx.w/2,b.y-tx.h/2,tx.w,tx.h);
 }
}
/* ---------- Улики, бонусы ---------- */
function drawCapsule(r){g.save();g.translate(r.x,r.y);g.rotate(Math.sin(r.spin*4)*.12);const d=glowDot('rgba(255,228,139,1)',24);g.globalAlpha=.8;g.drawImage(d.cv,-34,-34,68,68);g.globalAlpha=1;g.fillStyle='#6fe9ff';g.beginPath();g.moveTo(0,-22);g.lineTo(17,0);g.lineTo(0,22);g.lineTo(-17,0);g.closePath();g.fill();g.fillStyle='#172d5b';g.fillRect(-9,-7,18,14);g.fillStyle='#fff';g.fillRect(-3,-3,6,6);g.fillStyle='#ffe48b';g.font='bold 10px system-ui';g.textAlign='center';g.fillText('УЛИКА',0,36);g.restore()}
const PICK_STYLE={repair:['#4dffb0','+'],bomb:['#ffcf4a','B'],overcharge:['#56f6ff','⚡'],credits:['#ffd27a','₡']};
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
 const gr=g.createLinearGradient(0,0,0,118);gr.addColorStop(0,'rgba(2,7,18,.92)');gr.addColorStop(.75,'rgba(2,7,18,.55)');gr.addColorStop(1,'rgba(2,7,18,0)');g.fillStyle=gr;g.fillRect(0,0,W,118);
 g.textAlign='left';g.fillStyle='#7eefff';g.font='800 13px system-ui';
 g.fillText(mode==='story'?'РОЗЫСК СОЧ · ОПЕРАЦИЯ '+(currentCaseStage+1)+'/4':mode==='endless'?'БЕЗДНА ∞':'ПАРАД ДЕБИЛОВ',16,24);
 const sx=W-((pauseBtn.offsetWidth||44)+22)/cssScale;g.textAlign='right';g.fillStyle='#ffffff';g.font='900 22px system-ui';g.fillText(score.toLocaleString('ru-RU'),sx,30);
 if(combo>=8){g.fillStyle='#ffd27a';g.font='800 12px system-ui';g.fillText('КОМБО ×'+(1+Math.min(2,Math.floor(combo/8)*.25)).toFixed(2),sx,48)}
 const hpK=player.hp/player.max;hudBar(16,34,250,14,hpK,hpK>.5?'#36e5bc':hpK>.25?'#ffd36c':'#ff5270');
 g.textAlign='left';g.fillStyle='#04121e';g.font='800 10px system-ui';g.fillText('КОРПУС '+Math.max(0,Math.ceil(hpK*100))+'%',24,45);
 g.fillStyle='#bde5f4';g.font='700 12px system-ui';
 const status=boss?'ФЛАГМАН · ФАЗА '+boss.phase:mini?'АНОМАЛИЯ'+(mini.phase2?' · ФАЗА 2':''):mode==='parade'?`ПАРАД ${paradeKills}/${MINI.length}`:mode==='endless'?`ВОЛНА ${wave}`:`СЕКТОР · ${Math.ceil(t)}с`;
 g.fillText(status+' · GRAZE '+graze+(overcharge>0?' · ⚡'+Math.ceil(overcharge)+'с':''),16,66);
 if(mode==='story'){hudBar(16,74,170,9,story.suspicion/100,story.suspicion<40?'#35eab5':story.suspicion<70?'#ffd36c':'#ff4b60');g.fillStyle='#d8ecff';g.font='700 11px system-ui';g.fillText('ВНИМАНИЕ ЦЕЛИ '+Math.floor(story.suspicion)+'%',194,83);
  for(let i=0;i<story.need;i++){g.fillStyle=i<story.reports?'#ffe48b':'rgba(255,228,139,.2)';g.beginPath();g.moveTo(330+i*18,74);g.lineTo(337+i*18,81);g.lineTo(330+i*18,88);g.lineTo(323+i*18,81);g.closePath();g.fill()}
  if(story.hide>0||story.freeze>0){g.fillStyle='#7ff9e4';g.font='800 12px system-ui';g.fillText(story.hide>0?'ALT+TAB: НЕВИДИМОСТЬ':'EXCEL: ЗАМЕДЛЕНИЕ',16,104)}
  if(story.suspicion>=70){g.fillStyle='rgba(120,12,34,'+(.06+.05*Math.sin(t*12))+')';g.fillRect(0,0,W,H);g.textAlign='center';g.fillStyle='#ff6b83';g.font='900 17px system-ui';g.fillText('ЦЕЛЬ ВЫСЛАЛА ПЕРЕХВАТЧИКИ!',W/2,140)}}
 // Полоса босса.
 const bb=boss||mini;if(bb&&bb.y>-50){const y=mode==='story'?118:100,col=boss?'#ff4d6e':mini.color;g.textAlign='center';g.fillStyle='#fff';g.font='900 14px system-ui';g.fillText(boss?'АРХИТЕКТОР БЕЗДНЫ':mini.name,W/2,y);hudBar(40,y+6,W-80,9,bb.hp/bb.max,col,'#2a1220');
  if(boss){g.fillStyle='rgba(255,255,255,.6)';for(const k of [.25,.5,.75])g.fillRect(40+(W-80)*k-1,y+5,2,11)}else{g.fillStyle='rgba(255,255,255,.6)';g.fillRect(W/2-1,y+5,2,11)}}
 // Объявления.
 if(announceTimer>0){const k=Math.min(1,announceTimer*3,(announceMax-announceTimer)*6+.2),y=H*.34;g.globalAlpha=k;const bg=g.createLinearGradient(0,0,W,0);bg.addColorStop(0,'rgba(4,8,25,0)');bg.addColorStop(.2,'rgba(4,8,25,.85)');bg.addColorStop(.8,'rgba(4,8,25,.85)');bg.addColorStop(1,'rgba(4,8,25,0)');g.fillStyle=bg;g.fillRect(0,y-34,W,announceSub||mode==='story'?72:52);
  g.fillStyle='#ffdc84';g.textAlign='center';g.font='900 19px system-ui';g.fillText(announcement.slice(0,40),W/2,y);g.font='700 12px system-ui';g.fillStyle='#a9d8ff';g.fillText((announceSub||(mode==='story'?caseCurrent().sector:'')).slice(0,52),W/2,y+24);g.globalAlpha=1}
 if(!player.dead&&player.hp/player.max<.3){const v=g.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.7);v.addColorStop(0,'rgba(255,0,40,0)');v.addColorStop(1,`rgba(255,0,40,${.18+.1*Math.sin(t*6)})`);g.fillStyle=v;g.fillRect(0,0,W,H)}
}
