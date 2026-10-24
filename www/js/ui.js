'use strict';
/* Интерфейс вне боя в стиле №2 «Военный штаб и розыск».
 * Экраны-хабы (нижняя навигация): ШТАБ · ФЛОТ · ОПЕРАЦИИ · ДОСЬЕ · НАГРАДЫ. Диалоги (брифинг, итоги, пауза) — модальные окна.
 * Все данные берутся из действующего прогресса (save.js / meta.js / story.js). */
const panel=document.querySelector('#panel'),bombBtn=document.querySelector('#bomb'),pauseBtn=document.querySelector('#pause'),hideBtn=document.querySelector('#hide'),freezeBtn=document.querySelector('#freeze');
hideBtn.onclick=()=>useHide();freezeBtn.onclick=()=>useFreeze();bombBtn.onclick=()=>bomb();pauseBtn.onclick=()=>pauseGame();
const fmt=n=>Math.max(0,Math.floor(n)).toLocaleString('ru-RU');
let previewTier=null,previewCanvas=null,fleetSub='ship',shopFilter='all',opsSel=null,dossierTarget='architect',dossierTab='ops';
// Открыть модальное окно (диалог) вместо экрана-хаба.
function dlg(cls=''){panel.className=('modal '+cls).trim();panel.style.display='block'}
function hideCombatButtons(){document.body.classList.remove('in-combat');pauseBtn.style.display='none';bombBtn.style.display='none';hideBtn.style.display='none';freezeBtn.style.display='none'}
function procThumb(key){try{const cv=procArt(key);return cv?cv.toDataURL('image/png'):''}catch(e){return ''}}
const thumbCache={};
function miniThumb(kind){if(SPRITE_FILES[kind])return 'assets/sprites/'+SPRITE_FILES[kind]+'.png';return thumbCache[kind]||(thumbCache[kind]=procThumb(kind))}

/* ---------- Иконки (SVG, без внешних ресурсов) ---------- */
const I={
 hq:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6M9 11h.01M15 11h.01"/></svg>',
 fleet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2l3 7 6 4-6 1-1 6h-4l-1-6-6-1 6-4z"/><path d="M10 20l-2 2M14 20l2 2"/></svg>',
 ops:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5"/></svg>',
 dossier:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 6h7l2 2h9v12H3z"/><path d="M8 13h8M8 16h5"/></svg>',
 awards:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/><path d="M12 6l1 2h2l-1.6 1.3.6 2-2-1.2-2 1.2.6-2L9 8h2z"/></svg>',
 gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
 abyss:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 12m-2 0a2 2 0 104 0 2 2 0 10-4 0M12 4a8 8 0 018 8M20 12a8 8 0 01-8 8M12 20a8 8 0 01-8-8M4 12a8 8 0 018-8"/></svg>',
 parade:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>',
 archive:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="5"/><path d="M5 9v11h14V9M10 13h4"/></svg>',
 medal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 15l-3.5 2 1-4L6.5 10l4-.3L12 6l1.5 3.7 4 .3-3 3 1 4z"/><circle cx="12" cy="12" r="10"/></svg>',
 laser:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 20L20 4M9 20l11-11M4 15L15 4"/></svg>',
 drone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 4l4 9-4-2-4 2z"/><circle cx="5" cy="17" r="2"/><circle cx="19" cy="17" r="2"/><path d="M7 17h10"/></svg>',
 missile:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2c2 2 3 5 3 9v6H9v-6c0-4 1-7 3-9zM9 17l-2 4M15 17l2 4M12 17v5"/></svg>',
 hull:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/></svg>',
 speed:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
 dmg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>',
 module:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="5" y="5" width="14" height="14"/><path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4"/></svg>',
 emblem:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2"><path d="M24 4l6 14 14 4-10 4 2 16-12-9-12 9 2-16L4 22l14-4z" opacity=".35"/><path d="M24 10v30M14 18l10 8 10-8M10 28l14 6 14-6"/></svg>'
};
const ROMAN=['I','II','III','IV','V'];

/* ---------- Каркас экрана ---------- */
function topbar(){
 const rp=rankProgress();
 return `<header class="topbar"><div class="emblem">${I.emblem}</div><div class="pilot"><b>${RANKS[rp.i][0]}</b><div class="bar gold"><i style="width:${Math.round(rp.k*100)}%"></i></div><small>Группа розыска · ${fmt(pilotXp)} оп.</small></div>
 <div class="wallet"><span class="coin" title="Кредиты"><span class="ic">◈</span>${fmt(credits)}</span><span class="coin cyan" title="Достижения"><span class="ic">🏆</span>${achievements.length}</span></div><button class="icon-btn" data-go="settings" aria-label="Настройки">${I.gear}</button></header>`;
}
function bottomNav(tab){
 const items=[['home','ШТАБ',I.hq],['fleet','ФЛОТ',I.fleet],['ops','ОПЕРАЦИИ',I.ops],['dossier','ДОСЬЕ',I.dossier],['awards','НАГРАДЫ',I.awards]];
 const dot=dailyAvailable()||!challengeDoneToday();
 return `<nav class="bottom-nav">${items.map(([id,l,ic])=>`<button data-go="${id}" class="${tab===id?'on':''}" aria-label="${l}">${ic}<span>${l}</span>${id==='awards'&&dot?'<em class="dot"></em>':''}</button>`).join('')}</nav>`;
}
const TAB_MAP={ship:['fleet','ship'],shop:['fleet','shop'],arsenal:['fleet','arsenal'],ships:['fleet','ship'],story:['ops'],rewards:['awards'],codex:['dossier','intel'],bosses:['dossier','intel'],market:['dossier','intel']};
function menu(tab=hangarTab){
 if(TAB_MAP[tab]){const [t,sub]=TAB_MAP[tab];if(t==='fleet'&&sub)fleetSub=sub;if(t==='dossier'&&sub)dossierTab=sub;tab=t}
 if(!['home','fleet','ops','dossier','awards','settings'].includes(tab))tab='home';
 state='menu';hangarTab=tab;hideCombatButtons();if(typeof officeRun!=='undefined'&&officeRun&&officeRun.keys)officeRun.keys.clear();
 const scr={home:homeScreen,fleet:fleetScreen,ops:opsScreen,dossier:dossierScreen,awards:awardsScreen,settings:settingsScreen}[tab]();
 panel.className='screen';panel.style.display='flex';
 panel.innerHTML=topbar()+`<section class="scr-body" id="scrBody">${scr.body}</section>${scr.cta?`<div class="scr-cta">${scr.cta}</div>`:''}`+bottomNav(tab);
 panel.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{sfx('click');menu(b.dataset.go)});
 if(scr.bind)scr.bind();
 previewCanvas=document.getElementById('shipPreview');
 const sc=document.getElementById('scrBody');if(sc&&menu.keepScroll&&menu.keepScroll.tab===tab)sc.scrollTop=menu.keepScroll.y;menu.keepScroll=null;
 checkAchievements();
}
function rerender(tab){const sc=document.getElementById('scrBody');menu.keepScroll={tab,y:sc?sc.scrollTop:0};menu(tab)}
function toast(msg,bad){let el=document.getElementById('toast');if(!el){el=document.createElement('div');el.id='toast';el.className='toast';el.setAttribute('role','status');document.body.appendChild(el)}el.textContent=msg;el.className='toast show'+(bad?' bad':'');clearTimeout(toast.t);toast.t=setTimeout(()=>el.className='toast',2600)}
// Подтверждение покупки: кредиты списываются один раз, кнопка блокируется сразу после нажатия.
function confirmBuy(title,desc,cost,onOk){
 const wrap=document.createElement('div');wrap.className='confirm-wrap';const short=credits<cost;
 wrap.innerHTML=`<div class="confirm steel chamfer" role="dialog" aria-modal="true"><span class="label">ПОДТВЕРЖДЕНИЕ ПОКУПКИ</span><h3>${title}</h3><p class="muted">${desc}</p><div class="cost">${fmt(cost)} ₡</div>${short?`<div class="notice red">Недостаточно кредитов: не хватает ${fmt(cost-credits)} ₡. Выполняй операции и забирай награды.</div>`:`<p class="hint">После покупки останется ${fmt(credits-cost)} ₡.</p>`}<div class="cta-row"><button class="btn ghost" data-act="no">ОТМЕНА</button><button class="btn gold" data-act="ok" ${short?'disabled':''}>ПОДТВЕРДИТЬ</button></div></div>`;
 document.body.appendChild(wrap);sfx('click');
 const close=()=>wrap.remove();wrap.onclick=e=>{if(e.target===wrap)close()};
 wrap.querySelector('[data-act=no]').onclick=close;
 const ok=wrap.querySelector('[data-act=ok]');ok.onclick=()=>{ok.disabled=true;close();buy(cost,onOk)};
}
function buy(cost,action,tab){
 if(credits<cost){toast(`Недостаточно кредитов: нужно ${fmt(cost)} ₡, не хватает ${fmt(cost-credits)} ₡`,true);sfx('hit');return false}
 credits-=cost;action();sfx('upgrade');persist();checkAchievements();rerender(tab||hangarTab);return true;
}
const costBtn=(id,label,cost)=>{const short=credits<cost;return `<button class="btn ${short?'':'gold'} small" id="${id}">${label} · ${fmt(cost)} ₡</button>${short?`<p class="hint t-red">Не хватает ${fmt(cost-credits)} ₡</p>`:''}`};

/* ---------- Данные сюжета для экранов ---------- */
function nextOpIndex(){return Math.min(caseUnlocked,LAST_OP)}
function currentTarget(){return caseUnlocked>=4&&caseEndings.length?'phantom':'architect'}
function targetInfo(id){
 if(id==='phantom'){const caught=!!caseCleared[4],open=caseUnlocked>=4;
  return {id,open,caught,code:'КАПИТАН УХМЫЛКА',alias:'ПРИЗРАК САМОВОЛКИ',real:'ЗАСЕКРЕЧЕНО',faction:'ЭКИПАЖ «НЕВИДИМКИ»',status:caught?'ЗАДЕРЖАН':'В РОЗЫСКЕ',threat:'КЛАСС «ПРИЗРАК»',reward:CASE_OPERATIONS[4].reward,photo:'assets/ui/wanted_phantom.jpg',ship:'assets/sprites/phantom_hull.png',shipName:'СТЕЛС-КРЕЙСЕР «НЕВИДИМКА»',last:caught?'ДОСТАВЛЕН В ЧАСТЬ':'ТУМАННОСТЬ «ЦИФРА»',
   note:'Бывший штурман Архитектора. Украл маскировочное ядро «Цифра», улыбается на всех ориентировках и исчезает с радаров. Любимая фраза: «Я просто вышел за хлебом». Вымышленный персонаж.',card:'assets/ui/card_phantom.jpg'}}
 const caught=caseEndings.length>0,next=CASE_OPERATIONS[Math.min(caseUnlocked,3)];
 return {id:'architect',open:true,caught,code:'АРХИТЕКТОР БЕЗДНЫ',alias:'ЦЕЛЬ № 000',real:'ЗАСЕКРЕЧЕНО',faction:'ЭКИПАЖ ФЛАГМАНА',status:caught?'ЗАДЕРЖАН':'В РОЗЫСКЕ',threat:'КЛАСС «ФЛАГМАН»',reward:CASE_OPERATIONS.slice(0,4).reduce((s,o)=>s+o.reward,0),photo:'assets/ui/wanted_architect.jpg',ship:'assets/sprites/arch_hull.png',shipName:'ФЛАГМАН АРХИТЕКТОРА',last:caught?'ДОСТАВЛЕН В ЧАСТЬ':next.sector,
  note:'Самовольно оставил космическую часть и угнал секретный флагман. Утверждает, что приказ № 000 содержит ошибку. Вымышленный персонаж.',card:'assets/ui/card_dossier.jpg'};
}

/* ---------- ШТАБ (главный экран) ---------- */
function homeScreen(){
 const n=nextOpIndex(),op=CASE_OPERATIONS[n],tg=targetInfo(currentTarget()),cleared=caseCleared.filter(Boolean).length,sh=SHIPS[ship];
 const allDone=caseCleared.every(Boolean);
 const body=`<div class="logo"><b>VOID<span>FRONTIER</span></b><small>Специальные операции розыска</small></div>
 <div class="hero"><img src="${shipImageSrc(ship)}" alt="Корабль ${sh.name}"><span class="ship-tag chamfer">${sh.name} · ${SHIP_CLASSES[sh.cls].name}</span></div>
 ${dailyAvailable()?`<div class="notice chamfer"><span>🎁 Награда дня: <b class="t-gold">${DAILY_REWARDS[nextDailyStreak()-1]} ₡</b></span><button class="btn gold" id="homeDaily">ЗАБРАТЬ</button></div>`:''}
 <button class="target-card chamfer" id="toTarget"><div><span class="label">ОСНОВНАЯ ЦЕЛЬ</span><b>${tg.code}</b><span class="chip ${tg.caught?'green':'red'}">${tg.status}</span>
  <div class="row"><span class="muted">Операций закрыто</span><b class="t-gold">${cleared}/${CASE_OPERATIONS.length}</b></div><div class="bar red"><i style="width:${Math.round(cleared/CASE_OPERATIONS.length*100)}%"></i></div>
  <div class="row"><span class="muted">Награда за поимку</span><b class="t-gold">${fmt(tg.reward)} ₡</b></div></div><div class="photo" style="background-image:url(${tg.photo})"></div></button>
 <div class="menu-grid">
  <button class="mcard gold chamfer" data-go="ops" style="background-image:url(assets/ui/card_ops.jpg)"><b>ОПЕРАЦИИ</b><small>Карта маршрута · ${allDone?'все дела закрыты':'операция '+(n+1)+' из '+CASE_OPERATIONS.length}</small></button>
  <button class="mcard red chamfer" data-go="dossier" style="background-image:url(${tg.card})"><b>ДОСЬЕ</b><small>Дело № 000 · цели и улики</small>${!tg.caught?'<span class="badge chip red">РОЗЫСК</span>':''}</button>
  <button class="mcard chamfer" data-go="fleet" style="background-image:url(assets/ui/card_fleet.jpg)"><b>ФЛОТ</b><small>Ангар · эволюция · верфь</small></button>
  <button class="mcard chamfer" id="homeAbyss" style="background-image:url(assets/ui/card_abyss.jpg)"><b>БЕЗДНА ∞</b><small>Рекорд: волна ${abyssBestWave}</small></button>
 </div>`;
 const cta=`<button class="btn gold big" id="continue">${allDone?'ПОВТОРИТЬ РОЗЫСК':'ПРОДОЛЖИТЬ РОЗЫСК'} <span class="chev">»</span></button><p class="hint" style="text-align:center;margin:6px 0 0">Операция ${n+1}: ${op.title} · ${op.sector}</p>`;
 return {body,cta,bind(){
  const $=id=>document.getElementById(id);
  $('continue').onclick=()=>{initAudio();startCaseStage(n)};
  $('toTarget').onclick=()=>{dossierTarget=currentTarget();menu('dossier')};
  $('homeAbyss').onclick=()=>{challengeActive=null;mode='endless';initAudio();reset();announce('БЕЗДНА ∞',2.5,'ПРОДЕРЖИСЬ КАК МОЖНО ДОЛЬШЕ')};
  if($('homeDaily'))$('homeDaily').onclick=()=>{if(claimDaily())rerender('home')};
 }};
}

/* ---------- ФЛОТ: корабль, верфь, арсенал ---------- */
function fleetScreen(){
 const seg=`<div class="seg" style="margin-top:0">${[['ship','КОРАБЛЬ'],['shop','ВЕРФЬ'],['arsenal','АРСЕНАЛ']].map(([v,l])=>`<button data-sub="${v}" class="${fleetSub===v?'chosen':''}">${l}</button>`).join('')}</div>`;
 const part=fleetSub==='shop'?shipyardPart():fleetSub==='arsenal'?arsenalPart():shipPart();
 return {body:seg+part.body,cta:part.cta,bind(){panel.querySelectorAll('[data-sub]').forEach(b=>b.onclick=()=>{fleetSub=b.dataset.sub;sfx('click');menu('fleet')});part.bind&&part.bind()}};
}
const segbar=(v,max,next,c)=>{const n=Math.round(clamp(v/max,0,1)*10),m=next!=null?Math.round(clamp(next/max,0,1)*10):n;return `<div class="segbar" ${c?`style="--c:${c}"`:''}>${Array.from({length:10},(_,i)=>`<i class="${i<n?'on':i<m?'next':''}"></i>`).join('')}</div>`};
function volleyDamage(L,w=weapon){const base=(w==='plasma'?16:10)+L*3,bonus=L>=9?.25:L>=6?.16:L>=3?.08:0;return Math.round(2*base*(1+bonus)*(SHIPS[ship].dmg||1))}
function shipPart(){
 const s=SHIPS[ship],h=hullInfo(),next=HULL[hullLevel]||null,pt=previewTier||hullLevel,cls=SHIP_CLASSES[s.cls];
 const hpNow=shipMaxHp(),hpNext=next?Math.round(s.hp+next.hp+(contraband.armor?25:0)):hpNow,spNow=Math.round(s.speed*(1+h.speed)),spNext=next?Math.round(s.speed*(1+next.speed)):spNow;
 const special=activeDroneCount()+activeMissileCount(),owned=Object.values(contraband).filter(Boolean).length;
 const modules=[['Крылья',hullLevel>=2],['Двигатели',hullLevel>=3],['Крыльевые пушки',hullLevel>=4],['Дроновый узел',hullLevel>=5],['Контрабанда '+owned+'/6',owned>0]];
 const body=`<div class="ship-show chamfer"><canvas id="shipPreview" width="520" height="440" aria-label="Корабль ${s.name}"></canvas>${ownedShips.length>1?'<button class="nav-arrow l" id="shipPrev" aria-label="Предыдущий корабль">‹</button><button class="nav-arrow r" id="shipNext" aria-label="Следующий корабль">›</button>':''}</div>
 <div class="ship-head"><span class="cls-badge" style="--c:${cls.color}">${s.cls==='L'?'★':s.cls}-${hullLevel}</span><div><b>${s.name}</b><small>${s.type}</small></div><span class="chip green">НА ВЫЛЕТЕ</span></div>
 <p class="hint">${s.special}</p>
 <div class="stats">
  <div class="stat">${I.dmg}<span>УРОН ЗАЛПА</span>${segbar(volleyDamage(weaponLevel),120,null,'#E9BF68')}<em>${volleyDamage(weaponLevel)}</em></div>
  <div class="stat">${I.speed}<span>СКОРОСТЬ</span>${segbar(spNow,560,next?spNext:null,'#69CBEB')}<em>${spNow}</em></div>
  <div class="stat">${I.hull}<span>КОРПУС</span>${segbar(hpNow,300,next?hpNext:null,'#4FD3A6')}<em>${hpNow}</em></div>
  <div class="stat">${I.module}<span>ОСОБЫЙ МОДУЛЬ</span>${segbar(special,10,null,'#AB6DFF')}<em>${special}</em></div>
 </div>
 <div class="h-sec">ЭВОЛЮЦИЯ КОРПУСА <small>${hullLevel}/5 · для всех кораблей</small></div>
 <div class="evo">${HULL.map(x=>`<button class="evo-card ${x.lvl<=hullLevel?'owned':''} ${x.lvl===pt?'viewing':''}" data-preview="${x.lvl}" aria-label="Ступень ${x.lvl}"><img src="assets/sprites/player_lvl${x.lvl}.png" alt="" loading="lazy"><span class="rn">${ROMAN[x.lvl-1]}</span><small>${x.module}</small>${x.lvl>hullLevel?'<span class="lock">🔒</span>':''}</button>`).join('')}</div>
 <div class="modules">${modules.map(([n,on])=>`<span class="chip ${on?'green':'gray'}">${on?'✓':'·'} ${n}</span>`).join('')}</div>
 ${next?`<div class="compare chamfer"><div class="side"><span class="label">СЕЙЧАС · ${ROMAN[hullLevel-1]}</span><div><span>Корпус</span><b>${hpNow}</b></div><div><span>Скорость</span><b>${spNow}</b></div><div><span>Модуль</span><b>${h.module}</b></div></div><div class="arrow">»</div><div class="side after"><span class="label">ПОСЛЕ · ${ROMAN[next.lvl-1]}</span><div><span>Корпус</span><b>${hpNext}</b></div><div><span>Скорость</span><b>${spNext}</b></div><div><span>Модуль</span><b>${next.module}</b></div></div></div>
 <p class="hint">Ступень ${ROMAN[next.lvl-1]} «${next.name}»: ${next.desc} ${s.sprite?'':'Внешний вид корабля изменится — нажми на миниатюру, чтобы посмотреть.'}</p>`:`<div class="notice chamfer"><span>Корпус полностью эволюционировал: ступень V «${HULL[4].name}».</span></div>`}`;
 const cta=next?`<button class="btn ${credits>=next.cost?'gold':''} big" id="hullUp">УЛУЧШИТЬ <small>· ${fmt(next.cost)} ₡</small></button>${credits<next.cost?`<p class="hint t-red" style="text-align:center;margin:4px 0 0">Не хватает ${fmt(next.cost-credits)} ₡</p>`:''}`:'';
 return {body,cta,bind(){
  panel.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>{const v=Number(b.dataset.preview);previewTier=v===hullLevel?null:v;sfx('click');rerender('fleet')});
  const cyc=d=>{const i=ownedShips.indexOf(ship);ship=ownedShips[(i+d+ownedShips.length)%ownedShips.length];previewTier=null;persist();sfx('click');rerender('fleet')};
  const p=document.getElementById('shipPrev');if(p){p.onclick=()=>cyc(-1);document.getElementById('shipNext').onclick=()=>cyc(1)}
  const up=document.getElementById('hullUp');if(up)up.onclick=()=>{const nx=HULL[hullLevel];if(!nx)return;confirmBuy('Корпус: ступень '+ROMAN[nx.lvl-1],nx.name+'. '+nx.desc,nx.cost,()=>{hullLevel=nx.lvl;previewTier=null;toast('Корпус усилен: '+nx.name)})};
 }};
}
function shipyardPart(){
 const rIdx=rankIndex(),list=Object.entries(SHIPS).filter(([id,v])=>shopFilter==='all'||v.cls===shopFilter);
 const body=`<div class="seg filters">${[['all','ВСЕ'],['C','C'],['B','B'],['A','A'],['S','S'],['L','★']].map(([v,l])=>`<button data-filter="${v}" class="${shopFilter===v?'chosen':''}">${l}</button>`).join('')}</div>
 <div class="ship-list">${list.map(([id,v])=>{const own=ownedShips.includes(id),eq=ship===id,cls=SHIP_CLASSES[v.cls],lock=v.rank&&rIdx<v.rank;
  return `<div class="ship-card chamfer ${eq?'equipped':''} cls-${v.cls}"><div class="sc-img"><img src="${shipImageSrc(id)}" alt="" loading="lazy"><span class="cls-badge" style="--c:${cls.color}">${cls.name}</span></div>
  <div class="sc-body"><b>${v.name}</b><small>${v.type}</small><div class="mini-stats"><span>КОРПУС</span>${segbar(v.hp,240,null,'#4FD3A6')}<span>СКОРОСТЬ</span>${segbar(v.speed,500,null,'#69CBEB')}<span>УРОН</span>${segbar((v.dmg||1)*8,10,null,'#E9BF68')}</div><p>${v.special}</p>
  ${eq?'<button class="btn small" disabled>✓ НА ВЫЛЕТЕ</button>':own?`<button class="btn cyan small" data-equip="${id}">ВЫБРАТЬ</button>`:lock?`<button class="btn small" disabled>🔒 ЗВАНИЕ «${RANKS[v.rank][0]}»</button>`:`<button class="btn ${credits>=v.price?'gold':''} small" data-buy="${id}">КУПИТЬ · ${fmt(v.price)} ₡</button>${credits<v.price?`<p class="hint t-red">Не хватает ${fmt(v.price-credits)} ₡</p>`:''}`}</div></div>`}).join('')}</div>
 <p class="hint">Оружие, дроны, ракеты, корпус и контрабанда переносятся на любой корабль.</p>`;
 return {body,bind(){
  panel.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{shopFilter=b.dataset.filter;sfx('click');rerender('fleet')});
  panel.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{ship=b.dataset.equip;persist();sfx('upgrade');toast(SHIPS[ship].name+' готов к вылету');rerender('fleet')});
  panel.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const id=b.dataset.buy,v=SHIPS[id];confirmBuy(v.name+' · '+SHIP_CLASSES[v.cls].name,v.special,v.price,()=>{if(!ownedShips.includes(id))ownedShips.push(id);if(id==='specter')shipUnlocked=true;ship=id;toast(v.name+' куплен и выбран!')})});
 }};
}
function arsenalPart(){
 const L=weaponLevel,streams=l=>2+(l>=3?2:0)+(l>=6?1:0)+(l>=9?2:0);
 const cmp=(a,b,lbl)=>`<div class="compare"><div class="side"><span class="label">СЕЙЧАС</span><div><span>${lbl}</span><b>${a}</b></div></div><div class="arrow">»</div><div class="side after"><span class="label">ПОСЛЕ</span><div><span>${lbl}</span><b>${b}</b></div></div></div>`;
 const body=`<div class="arm-list">
 <div class="arm steel chamfer"><div class="arm-top"><div class="mi">${I.laser}</div><div><b>${weapon==='laser'?'Импульсный лазер':'Плазменная пушка'}</b><small>${weapon==='laser'?'Быстрые узкие лучи':'Медленные тяжёлые заряды'} · урон залпа ${volleyDamage(L)}</small></div></div>
  <button class="btn small" id="weapon" style="margin-top:10px">СМЕНИТЬ НА ${weapon==='laser'?'ПЛАЗМУ':'ЛАЗЕР'}</button></div>
 <div class="arm steel chamfer"><div class="arm-top"><div class="mi">${I.dmg}</div><div><b>Усиление оружия · ${L}/10</b><small>Потоков огня: ${streams(L)} · новые потоки на 3, 6 и 9 уровне</small></div></div>
  ${L<10?cmp(`ур.${L} · ${volleyDamage(L)}`,`ур.${L+1} · ${volleyDamage(L+1)}${streams(L+1)>streams(L)?' +поток':''}`,'Урон')+costBtn('upgrade','УЛУЧШИТЬ',L*150):'<div class="notice"><span>Максимальный уровень оружия.</span></div>'}</div>
 <div class="arm steel chamfer"><div class="arm-top"><div class="mi">${I.drone}</div><div><b>Боевые дроны · ${drones}/2</b><small>Постоянные дроны сопровождения · в бою: ${activeDroneCount()}</small></div></div>
  ${drones<2?cmp(activeDroneCount(),activeDroneCount()+1,'Дронов в бою')+costBtn('drone','ДОКУПИТЬ',(drones+1)*500):'<div class="notice"><span>Все слоты дронов заняты.</span></div>'}</div>
 <div class="arm steel chamfer"><div class="arm-top"><div class="mi">${I.missile}</div><div><b>Ракетный комплекс · ${missiles}/3</b><small>Самонаводящиеся ракеты каждые 2,5 с · в залпе: ${activeMissileCount()}</small></div></div>
  ${missiles<3?cmp(activeMissileCount(),activeMissileCount()+1,'Ракет в залпе')+costBtn('missile','УЛУЧШИТЬ',(missiles+1)*400):'<div class="notice"><span>Ракетный комплекс на максимуме.</span></div>'}</div>
 </div><p class="hint">Контрабандные модули с Нижнего рынка действуют во всех режимах и показаны во вкладке «Корабль».</p>`;
 return {body,bind(){
  const $=id=>document.getElementById(id);
  $('weapon').onclick=()=>{weapon=weapon==='laser'?'plasma':'laser';persist();sfx('collect');rerender('fleet')};
  if($('upgrade'))$('upgrade').onclick=e=>{e.currentTarget.disabled=true;if(weaponLevel<10)buy(weaponLevel*150,()=>weaponLevel++,'fleet')};
  if($('drone'))$('drone').onclick=e=>{e.currentTarget.disabled=true;if(drones<2)buy((drones+1)*500,()=>drones++,'fleet')};
  if($('missile'))$('missile').onclick=e=>{e.currentTarget.disabled=true;if(missiles<3)buy((missiles+1)*400,()=>missiles++,'fleet')};
 }};
}
// Предпросмотр корабля (вызывается из главного цикла, пока открыт экран «Флот»).
function drawHangarPreview(dt){
 if(!previewCanvas||!previewCanvas.isConnected)return;const pc=previewCanvas,x=pc.getContext('2d'),Wd=pc.width,Hd=pc.height;x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,Wd,Hd);
 const tier=previewTier||hullLevel,sh=SHIPS[ship],img=IMG[sh.sprite&&!previewTier?sh.sprite:'player'+tier],tt=performance.now()/1000,cx=Wd/2,cy=Hd*.46;
 x.save();x.translate(cx,Hd*.8);x.scale(1,.28);for(let r=60;r<Wd*.48;r+=34){x.strokeStyle=`rgba(105,203,235,${Math.max(0,.32-r/Wd*.4)})`;x.lineWidth=2;x.beginPath();x.arc(0,0,r,0,TAU);x.stroke()}
 x.strokeStyle='rgba(233,191,104,.45)';x.lineWidth=3;x.beginPath();x.arc(0,0,Wd*.2,0,TAU);x.stroke();x.restore();
 const lg=x.createRadialGradient(cx,Hd*.8,0,cx,Hd*.8,Wd*.4);lg.addColorStop(0,'rgba(105,203,235,.22)');lg.addColorStop(1,'rgba(105,203,235,0)');x.fillStyle=lg;x.fillRect(0,0,Wd,Hd);
 x.save();x.translate(cx,cy+Math.sin(tt*1.6)*6);
 const size=Hd*.72,d=glowDot(rgba(sh.engine,1),16),nozzles=sh.sprite&&!previewTier?[-16,0,16]:tier>=4?[-22,-8,8,22]:tier>=2?[-14,0,14]:[-10,10],fl=1+Math.sin(tt*30)*.12;
 x.globalCompositeOperation='lighter';for(const nx of nozzles){const s=(nx===0?36:28)*fl;x.drawImage(d.cv,nx*size/100-s/2,size*.34,s,s*2)}x.globalCompositeOperation='source-over';
 if(imgReady(img)){x.shadowColor=sh.engine||'#69CBEB';x.shadowBlur=22;const k=size/Math.max(img.naturalWidth,img.naturalHeight);x.drawImage(img,-img.naturalWidth*k/2,-img.naturalHeight*k/2,img.naturalWidth*k,img.naturalHeight*k)}
 x.restore();
}

/* ---------- ОПЕРАЦИИ: карта маршрута и режимы ---------- */
const MAP_NODES=[[40,150],[105,72],[180,128],[250,56],[310,136]];
function starMapSvg(sel){
 let stars='';const r=seeded(91);for(let i=0;i<70;i++)stars+=`<circle cx="${(r()*340).toFixed(1)}" cy="${(r()*200).toFixed(1)}" r="${(r()*1.1+.2).toFixed(2)}" fill="#cfe6ff" opacity="${(r()*.6+.2).toFixed(2)}"/>`;
 let path='';for(let i=0;i<MAP_NODES.length-1;i++){const [a,b]=[MAP_NODES[i],MAP_NODES[i+1]],done=caseCleared[i],open=i+1<=caseUnlocked;path+=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${done?'#69CBEB':i===3?'#F1545C':'#3C5467'}" stroke-width="${done?2.2:1.6}" ${done?'':'stroke-dasharray="4 4"'} opacity="${open||done?1:.6}"/>`}
 const nodes=CASE_OPERATIONS.map((op,i)=>{const [x,y]=MAP_NODES[i],done=caseCleared[i],open=i<=caseUnlocked,boss=!!op.boss,col=done?'#4FD3A6':!open?'#5d7385':boss?'#F1545C':'#69CBEB';
  const lbl=op.sector.replace(/.*«(.*)»/,'$1');
  return `<g class="node" data-op="${i}" tabindex="0" role="button" aria-label="Операция ${i+1}: ${op.title}"><circle cx="${x}" cy="${y}" r="20" fill="transparent"/>${i===sel?`<circle cx="${x}" cy="${y}" r="17" fill="none" stroke="#E9BF68" stroke-width="1.6"/>`:''}${open&&!done?`<circle cx="${x}" cy="${y}" r="13" fill="none" stroke="${col}" opacity=".5"><animate attributeName="r" values="10;17;10" dur="2.2s" repeatCount="indefinite"/><animate attributeName="opacity" values=".6;0;.6" dur="2.2s" repeatCount="indefinite"/></circle>`:''}
  <circle cx="${x}" cy="${y}" r="9" fill="#0a1624" stroke="${col}" stroke-width="2.2"/><circle cx="${x}" cy="${y}" r="3.4" fill="${col}"/>${done?`<path d="M${x-4} ${y} l3 3 l5 -6" stroke="#0a1624" stroke-width="2" fill="none"/>`:''}
  <text x="${x}" y="${y+(y>110?24:-16)}" text-anchor="middle" fill="${open?'#EDF4F7':'#7d93a4'}" font-family="Oswald,Arial Narrow,sans-serif" font-size="10" letter-spacing=".6">${String(i+1).padStart(2,'0')} · ${lbl.toUpperCase()}</text></g>`}).join('');
 return `<svg viewBox="0 0 340 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Звёздная карта операций"><defs><radialGradient id="gx" cx="30%" cy="55%" r="45%"><stop offset="0" stop-color="#f3d8a0" stop-opacity=".5"/><stop offset=".4" stop-color="#4a6fa8" stop-opacity=".25"/><stop offset="1" stop-color="#060E19" stop-opacity="0"/></radialGradient></defs><rect width="340" height="200" fill="url(#gx)"/>${stars}${path}${nodes}</svg>`;
}
function opsScreen(){
 if(opsSel==null||opsSel>LAST_OP)opsSel=nextOpIndex();
 const i=opsSel,op=CASE_OPERATIONS[i],open=i<=caseUnlocked,done=caseCleared[i],m=MINI.find(x=>x.kind===op.mini),ch=todayChallenge();
 const body=`<div class="h-sec" style="margin-top:2px">МАРШРУТ ЦЕЛИ <small>${caseCleared.filter(Boolean).length}/${CASE_OPERATIONS.length} операций</small></div>
 <div class="starmap chamfer">${starMapSvg(i)}</div>
 <div class="op-card steel chamfer"><div class="op-top"><div><span class="label">ОПЕРАЦИЯ ${String(i+1).padStart(2,'0')} · ${op.sector}</span><h3>${open?op.title:'ЗАСЕКРЕЧЕНО'}</h3></div><span class="chip ${done?'green':open?(op.boss?'red':'cyan'):'gray'}">${done?'ЗАКРЫТО':open?(op.boss?'ЦЕЛЬ':'ДОСТУПНО'):'НЕТ КООРДИНАТ'}</span></div>
 <p class="muted" style="margin:6px 0;font-size:14px">${open?op.brief:'Координаты появятся после завершения предыдущей операции.'}</p>
 <div class="kv"><span>Помощник</span><b>${open?m.name+' — '+m.attack:'???'}</b>${op.boss&&open?`<span>Главная цель</span><b class="t-red">${BOSS_INFO[op.boss].name}</b>`:''}<span>Улика</span><b>${done?op.evidence:'не получена'}</b><span>Награда</span><b class="t-gold">${fmt(op.reward)} ₡ + бонус за улики</b><span>Лучший счёт</span><b>${fmt(caseBest[i]||0)}</b></div></div>
 <div class="h-sec">ДРУГИЕ РЕЖИМЫ</div>
 <div class="mode-list">
  <button class="mode-card chamfer" id="mEndless"><div class="mi">${I.abyss}</div><div><b>БЕЗДНА ∞</b><small>Бесконечные волны, перки, боссы на 10-й и 20-й волне · рекорд: ${abyssBestWave}</small></div><span class="chev">›</span></button>
  <button class="mode-card violet chamfer" id="mChallenge"><div class="mi">${I.medal}</div><div><b>ИСПЫТАНИЕ ДНЯ</b><small>«${ch.name}»: ${ch.desc} · ${challengeDoneToday()?'пройдено ✓':'награда '+CHALLENGE_REWARD+' ₡'}</small></div><span class="chev">›</span></button>
  <button class="mode-card chamfer" id="mParade"><div class="mi">${I.parade}</div><div><b>ПАРАД ДЕБИЛОВ</b><small>8 мини-боссов подряд · лучший: ${paradeBest}/8</small></div><span class="chev">›</span></button>
  <button class="mode-card dashed chamfer" id="mOffice"><div class="mi">${I.archive}</div><div><b>АРХИВ ШТАБА</b><small>Необязательно: стелс, стартовая улика, путь через нижнее КПП на Нижний рынок${officeCleared?' · пройдено ✓':''}</small></div><span class="chev">›</span></button>
 </div>`;
 const cta=open?`<button class="btn ${op.boss?'red':'gold'} big" id="opStart">${done?'ПОВТОРИТЬ ОПЕРАЦИЮ':'НАЧАТЬ ОПЕРАЦИЮ'} <span class="chev">»</span></button>`:`<button class="btn big" disabled>🔒 НЕТ КООРДИНАТ</button>`;
 return {body,cta,bind(){
  const $=id=>document.getElementById(id);
  panel.querySelectorAll('[data-op]').forEach(n=>{const go=()=>{opsSel=Number(n.dataset.op);sfx('click');rerender('ops')};n.addEventListener('click',go);n.addEventListener('keydown',e=>{if(e.key==='Enter')go()})});
  if($('opStart'))$('opStart').onclick=()=>{initAudio();startCaseStage(opsSel)};
  $('mEndless').onclick=()=>{challengeActive=null;mode='endless';initAudio();reset();announce('БЕЗДНА ∞',2.5,'ПРОДЕРЖИСЬ КАК МОЖНО ДОЛЬШЕ')};
  $('mChallenge').onclick=()=>startChallenge();
  $('mParade').onclick=()=>{mode='parade';initAudio();reset();announce('ПАРАД ДЕБИЛОВ',2.5,'ВОСЕМЬ АНОМАЛИЙ ПОДРЯД')};
  $('mOffice').onclick=()=>{mode='story';initAudio();showPrologue()};
 }};
}
function showModeSelect(){opsSel=nextOpIndex();menu('ops');const sc=document.getElementById('scrBody'),el=document.getElementById('mEndless');if(sc&&el)sc.scrollTop=el.offsetTop-80}

/* ---------- ДОСЬЕ: дело № 000 ---------- */
function dossierScreen(){
 const ph=targetInfo('phantom');if(dossierTarget==='phantom'&&!ph.open)dossierTarget='architect';
 const tg=targetInfo(dossierTarget);
 const sw=`<div class="target-switch"><button data-target="architect" class="${tg.id==='architect'?'on':''}">АРХИТЕКТОР БЕЗДНЫ</button><button data-target="phantom" class="${tg.id==='phantom'?'on':''}" ${ph.open?'':'disabled'}>${ph.open?'КАПИТАН УХМЫЛКА':'🔒 ЗАСЕКРЕЧЕНО'}</button></div>`;
 const card=`<div class="dossier chamfer"><div class="dossier-head"><span class="case-no">ДЕЛО №000</span><span class="prio">ПРИОРИТЕТ: <b>${tg.caught?'ЗАКРЫТО':'ЗАДЕРЖАНИЕ'}</b></span></div>
 <h2>${tg.caught?'ЦЕЛЬ ЗАДЕРЖАНА':'ЦЕЛЬ В РОЗЫСКЕ'}</h2>
 <div class="dossier-grid"><div class="dfields"><span class="label">КОДОВОЕ ИМЯ</span><div class="code">${tg.code}</div><dl><dt>Прозвище</dt><dd>${tg.alias}</dd><dt>Имя</dt><dd>${tg.real}</dd><dt>Группа</dt><dd>${tg.faction}</dd><dt>Статус</dt><dd class="${tg.caught?'t-green':'t-red'}">${tg.status}</dd><dt>Угроза</dt><dd class="t-red">${tg.threat}</dd><dt>Награда</dt><dd class="t-gold">${fmt(tg.reward)} ₡</dd></dl></div>
 <div class="dphoto" style="background-image:url(${tg.photo})"><span class="stamp ${tg.caught?'green':''}">${tg.caught?'ЗАДЕРЖАН':'РОЗЫСК'}</span><span class="barcode"></span></div></div>
 <p class="hint">${tg.note}</p>
 <div class="dthumbs"><div class="dthumb" style="background-image:url(${tg.ship})"><small>Известный корабль</small><b>${tg.shipName}</b></div><div class="dthumb" style="background-image:url(assets/ui/card_ops.jpg);background-size:cover"><small>Последнее обнаружение</small><b>${tg.last}</b></div></div></div>`;
 const tabs=`<div class="tabs">${[['ops','ОПЕРАЦИИ'],['evidence','УЛИКИ'],['intel','РАЗВЕДКА'],['brief','БРИФИНГ']].map(([v,l])=>`<button data-dtab="${v}" class="${dossierTab===v?'on':''}">${l}</button>`).join('')}</div>`;
 const tb={ops:dossierOps(tg),evidence:dossierEvidence(tg),intel:dossierIntel(),brief:dossierBrief(tg)}[dossierTab]||'';
 const next=nextOpIndex(),allDone=caseCleared.every(Boolean);
 const cta=`<button class="btn red big" id="pursuit">${tg.caught&&allDone?'ПОВТОРИТЬ ПРЕСЛЕДОВАНИЕ':'НАЧАТЬ ПРЕСЛЕДОВАНИЕ'} <span class="chev">»</span></button>`;
 return {body:sw+card+tabs+`<div class="tab-body">${tb}</div>`,cta,bind(){
  panel.querySelectorAll('[data-target]').forEach(b=>b.onclick=()=>{dossierTarget=b.dataset.target;sfx('click');menu('dossier')});
  panel.querySelectorAll('[data-dtab]').forEach(b=>b.onclick=()=>{dossierTab=b.dataset.dtab;sfx('click');rerender('dossier')});
  document.getElementById('pursuit').onclick=()=>{initAudio();startCaseStage(tg.id==='phantom'?4:Math.min(next,3))};
  const ob=document.getElementById('dOffice');if(ob)ob.onclick=()=>{mode='story';initAudio();showPrologue()};
 }};
}
function taskCard(n,title,desc,st){const map={done:['t-green','✓ ВЫПОЛНЕНО'],prog:['t-cyan','◔ В ПРОЦЕССЕ'],wait:['muted','○ ОЖИДАНИЕ']};return `<div class="task chamfer"><b>${n}. ${title}</b><p>${desc}</p><span class="st ${map[st][0]}">${map[st][1]}</span></div>`}
function dossierOps(tg){
 let tasks;
 if(tg.id==='phantom')tasks=taskCard(1,'Допросить Архитектора','Получить имя сообщника.',caseEndings.length?'done':'wait')+taskCard(2,'Найти «Цифру»','Выйти на след маскировочного ядра.',caseUnlocked>=4?(caseCleared[4]?'done':'prog'):'wait')+taskCard(3,'Взять призрака','Обездвижить «Невидимку».',caseCleared[4]?'done':'wait');
 else{const c=caseCleared.slice(0,3).filter(Boolean).length;tasks=taskCard(1,'Собрать данные','Архив штаба и первые улики.',officeCleared||c>0?'done':'prog')+taskCard(2,'Отследить маршрут','Операции 1–3 по следу беглеца.',c>=3?'done':c>0||caseUnlocked>0?'prog':'wait')+taskCard(3,'Подготовить перехват','Флагман в секторе «Бездна».',caseCleared[3]?'done':caseUnlocked>=3?'prog':'wait')}
 const ops=CASE_OPERATIONS.map((op,i)=>({op,i})).filter(({op})=>tg.id==='phantom'?op.boss==='phantom':op.boss!=='phantom');
 return `<div class="h-sec" style="margin-top:0">ЗАДАЧИ ПОИСКОВОЙ ГРУППЫ</div><div class="task-grid">${tasks}</div>
 <div class="h-sec">ОПЕРАЦИИ ПО ДЕЛУ</div>${ops.map(({op,i})=>`<div class="evidence ${i>caseUnlocked?'locked':''}"><i>${caseCleared[i]?'✓':i<=caseUnlocked?'▶':'🔒'}</i><div><b>${String(i+1).padStart(2,'0')} · ${i<=caseUnlocked?op.title:'ЗАСЕКРЕЧЕНО'}</b><small>${op.sector} · ${caseCleared[i]?'закрыто, лучший счёт '+fmt(caseBest[i]):i<=caseUnlocked?'координаты получены':'нет координат'}</small></div></div>`).join('')}`;
}
function dossierEvidence(tg){
 const ev=CASE_OPERATIONS.map((op,i)=>({op,i})).filter(({op})=>tg.id==='phantom'?op.boss==='phantom':op.boss!=='phantom');
 const endings=[['chief','Задержание'],['loop','Установить правду'],['escape','Тихое завершение']];
 return `${ev.map(({op,i})=>`<div class="evidence ${caseCleared[i]?'':'locked'}"><i>${caseCleared[i]?'🗂':'?'}</i><div><b>${caseCleared[i]?op.evidence:'Улика не найдена'}</b><small>Операция ${i+1} · ${op.sector}</small></div></div>`).join('')}
 ${tg.id==='architect'?`<div class="evidence ${officeCleared?'':'locked'}"><i>${officeCleared?'📁':'?'}</i><div><b>${officeCleared?'Журнал службы, телеметрия, карточка № 000':'Материалы архива штаба'}</b><small>Архив штаба · стартовая улика в каждой операции</small></div></div>
 ${officeCleared?'':'<button class="btn small" id="dOffice">ОТКРЫТЬ АРХИВ ШТАБА</button>'}
 <div class="h-sec">ИТОГИ РОЗЫСКА <small>${caseEndings.length}/3</small></div>${endings.map(([id,l])=>`<div class="evidence ${caseEndings.includes(id)?'':'locked'}"><i>${caseEndings.includes(id)?'✓':'🔒'}</i><div><b>${l}</b><small>${caseEndings.includes(id)?'Концовка открыта':'Концовка не открыта'}</small></div></div>`).join('')}`:''}`;
}
function dossierIntel(){
 const enemies=[['scout','РАЗВЕДЧИК','Быстрый, прицельные одиночные выстрелы'],['zig','ПЕРЕХВАТЧИК','Манёвры зигзагом, очереди по 3'],['heavy','ШТУРМОВИК','Медленный и бронированный, веер вперёд'],['sniper','СНАЙПЕР','Зависает и прицеливается — следи за лучом'],['carrier','НОСИТЕЛЬ ДРОНОВ','Выпускает самонаводящихся дронов'],['bomber','БОМБАРДИРОВЩИК','Бомбы взрываются кольцом']];
 const items=[{k:'overdrive',n:'Реактор: +18% урона'},{k:'armor',n:'Броня: +25 к корпусу'},{k:'jammer',n:'Глушилка: медленнее растёт подозрение'},{k:'blackMissiles',n:'Чёрные ракеты: +1 в залпе'},{k:'shadowDrones',n:'Теневой дрон: +1 дрон'},{k:'phaseShield',n:'Фазовый щит: −20% урона'}];
 return `<div class="h-sec" style="margin-top:0">ПОМОЩНИКИ БЕГЛЕЦОВ</div>${MINI.map((m,i)=>`<div class="intel-row"><img src="${miniThumb(m.kind)}" alt=""><div><b>${String(i+1).padStart(2,'0')} · ${m.name}</b><small>${m.attack} · ${m.special}${minisDefeated.includes(m.kind)?' · побеждён ✓':''}</small></div></div>`).join('')}
 <div class="h-sec">ПРОТИВНИКИ</div>${enemies.map(([k,n,d])=>`<div class="intel-row"><img src="assets/sprites/${SPRITE_FILES[k]}.png" alt=""><div><b>${n}</b><small>${d}</small></div></div>`).join('')}
 <div class="h-sec">НИЖНИЙ РЫНОК <small>посещений ${marketVisits} · облав ${marketRaids}</small></div><p class="hint">Вход только через нижнее КПП: начни миссию в архиве штаба, обойди сканеры в правом нижнем коридоре и найди фиолетовую дверь.</p>
 ${items.map(o=>`<div class="evidence ${contraband[o.k]?'':'locked'}"><i style="color:var(--violet)">${contraband[o.k]?'✓':'·'}</i><div><b>${o.n}</b><small>${contraband[o.k]?'Установлено на все корабли':'Продаётся на Нижнем рынке'}</small></div></div>`).join('')}`;
}
function dossierBrief(tg){
 if(tg.id==='phantom')return `<p>На допросе Архитектор проговорился: настоящий мозг побега — его бывший штурман по прозвищу Капитан Ухмылка, второй самый опасный беглец во вселенной.</p><p>Ухмылка увёл маскировочное ядро «Цифра» и прячется в пиксельной туманности на стелс-крейсере «Невидимка». Бой в три фазы: маскировка, ложные цели и телепорт, лучи «Ухмылки».</p><p class="hint">Вымышленная фантастическая история.</p>`;
 return `<p>07:59. В штаб поступает срочное дело № 000: Архитектор Бездны самовольно покинул космическую часть и улетел на секретном флагмане. Вместо рапорта — сообщение «НЕ ДОГОНИШЬ».</p><p>Ты — сотрудник штабной группы розыска СОЧ. Каждый помощник беглеца охраняет часть маршрута. Собирай капсулы-улики, побеждай помощников и выходи на флагман.</p><p class="hint">Секретная концовка: 3 улики, внимание цели не выше 55% и ни одного обнаружения в финальной операции. Вымышленная фантастическая история.</p>`;
}

/* ---------- НАГРАДЫ ---------- */
function awardsScreen(){
 const rp=rankProgress(),next=RANKS[rp.i+1],ch=todayChallenge(),avail=dailyAvailable(),ns=avail?nextDailyStreak():dailyStreak,done=ACH.filter(a=>achievements.includes(a.id)).length;
 const sorted=[...ACH].sort((a,b)=>(achievements.includes(a.id)-achievements.includes(b.id))||((b.p()[0]/b.p()[1])-(a.p()[0]/a.p()[1])));
 const body=`<div class="reward-box steel chamfer"><div class="rank-line"><b>НАГРАДА ДНЯ</b><span>серия ${avail?ns-1:dailyStreak}/7</span></div><div class="days">${DAILY_REWARDS.map((r,i)=>`<span class="${i<ns-(avail?1:0)?'got':''} ${avail&&i===ns-1?'today':''}"><b>${i+1}</b>${r}₡</span>`).join('')}</div>
 <button class="btn ${avail?'gold':''}" id="claimDaily" ${avail?'':'disabled'}>${avail?'ЗАБРАТЬ '+DAILY_REWARDS[ns-1]+' ₡':'ЗАБРАНО · ВОЗВРАЩАЙСЯ ЗАВТРА'}</button></div>
 <div class="reward-box steel chamfer" style="border-color:rgba(171,109,255,.6)"><div class="rank-line"><b style="color:var(--violet)">ИСПЫТАНИЕ ДНЯ</b><span>${challengeDoneToday()?'пройдено ✓':'+'+CHALLENGE_REWARD+' ₡'}</span></div><p style="margin:4px 0"><b>«${ch.name}»</b> — ${ch.desc}. Цель: дойти до ${CHALLENGE_GOAL}-й волны Бездны.</p><button class="btn ${challengeDoneToday()?'ghost':'cyan'}" id="playChallenge">${challengeDoneToday()?'СЫГРАТЬ ЕЩЁ':'НАЧАТЬ ИСПЫТАНИЕ'}</button></div>
 <div class="reward-box steel chamfer"><div class="rank-line"><b>${RANKS[rp.i][0]}</b><span>${fmt(pilotXp)} оп.</span></div><div class="bar gold"><i style="width:${Math.round(rp.k*100)}%"></i></div><p class="hint">${next?`До звания «${next[0]}»: ${fmt(next[1]-pilotXp)} оп. · награда ${fmt(250*(rp.i+1))} ₡.`:'Высшее звание получено!'} Опыт дают очки, сбитые враги, операции и достижения.</p></div>
 <div class="h-sec">СТАТИСТИКА ПИЛОТА</div><div class="stat-grid"><span>СБИТО <b>${fmt(stats.kills)}</b></span><span>ЭЛИТЫ <b>${fmt(stats.elites)}</b></span><span>МИНИ-БОССЫ <b>${fmt(stats.minis)}</b></span><span>БОССЫ <b>${fmt(stats.bosses+(stats.phantoms||0))}</b></span><span>ВЫЛЕТОВ <b>${fmt(stats.runs)}</b></span><span>ЛУЧШЕЕ КОМБО <b>${fmt(stats.bestCombo)}</b></span><span>БЕЗДНА <b>волна ${abyssBestWave}</b></span><span>ПАРАД <b>${paradeBest}/8</b></span><span>ЗАРАБОТАНО <b>${fmt(stats.earned)} ₡</b></span><span>В БОЮ <b>${Math.floor(stats.playTime/60)} мин</b></span></div>
 <div class="h-sec">ДОСТИЖЕНИЯ <small>${done}/${ACH.length}</small></div><div class="ach-list">${sorted.map(a=>{const got=achievements.includes(a.id),[c,m]=a.p(),k=Math.min(1,c/m);
  return `<div class="ach chamfer ${got?'got':''}"><i>${a.ic}</i><div><b>${a.name}</b><small>${a.desc}</small>${got?'':`<div class="bar"><i style="width:${Math.round(k*100)}%"></i></div><small>${fmt(Math.min(c,m))} / ${fmt(m)}</small>`}</div><em>${got?'✓':'+'+fmt(a.reward)+' ₡'}</em></div>`}).join('')}</div>`;
 return {body,bind(){
  document.getElementById('claimDaily').onclick=()=>{if(claimDaily()){sfx('win');rerender('awards')}};
  document.getElementById('playChallenge').onclick=()=>startChallenge();
 }};
}

/* ---------- НАСТРОЙКИ ---------- */
function settingsScreen(){
 const sl=(id,label,v,max=100)=>`<label>${label} <output>${Math.round(v*100)}%</output><input id="${id}" type="range" min="0" max="${max}" value="${Math.round(v*100)}"></label>`;
 const seg=(name,opts,cur)=>`<div class="seg" data-seg="${name}">${opts.map(([v,l])=>`<button data-v="${v}" class="${cur===v?'chosen':''}">${l}</button>`).join('')}</div>`;
 const body=`<button class="btn ghost small" data-go="home" style="width:auto;margin-bottom:6px">‹ НАЗАД В ШТАБ</button><h2 class="h-title">НАСТРОЙКИ</h2>
 <div class="h-sec">ЗВУК</div><div class="seg"><button id="sound" class="${audio.enabled?'chosen':''}">ЭФФЕКТЫ: ${audio.enabled?'ВКЛ':'ВЫКЛ'}</button><button id="music" class="${audio.musicOn?'chosen':''}">МУЗЫКА: ${audio.musicOn?'ВКЛ':'ВЫКЛ'}</button></div>
 <div class="sliders">${sl('master','Общая громкость',settings.master)}${sl('fx','Эффекты',settings.fx)}${sl('musvol','Музыка',settings.music)}${sl('mCombat','Музыка: обычные бои',settings.musicCombat,150)}${sl('mBoss','Музыка: боссы',settings.musicBoss,150)}${sl('mBase','Музыка: штаб и рынок',settings.musicBase,150)}</div>
 <div class="h-sec">ГРАФИКА <small>сейчас: ${QUALITY.name.toLowerCase()} · ${Math.round(perfMon.fps)} кадр/с</small></div>${seg('quality',[['auto','АВТО'],['low','НИЗКОЕ'],['medium','СРЕДНЕЕ'],['high','ВЫСОКОЕ']],settings.quality)}<p class="hint">«Авто» снижает качество при долгих просадках частоты кадров.</p>
 <div class="h-sec">УПРАВЛЕНИЕ</div><span class="label">Размер боевых кнопок</span>${seg('buttons',[['s','МАЛЕНЬКИЕ'],['m','СРЕДНИЕ'],['l','БОЛЬШИЕ']],settings.buttons)}
 <span class="label">Управление кораблём</span>${seg('control',[['point','НАД ПАЛЬЦЕМ'],['drag','ОТНОСИТЕЛЬНОЕ']],settings.control)}
 <div class="seg"><button id="shakeT" class="${settings.shake?'chosen':''}">ТРЯСКА: ${settings.shake?'ВКЛ':'ВЫКЛ'}</button><button id="vibT" class="${settings.vibrate?'chosen':''}">ВИБРАЦИЯ: ${settings.vibrate?'ВКЛ':'ВЫКЛ'}</button></div>
 <div class="h-sec">ПРОФИЛЬ</div><p class="hint">Перенос прогресса без облака: скопируй код или сохрани файл и импортируй на другом устройстве.</p>
 <div class="cta-row"><button class="btn small" id="expCopy">КОПИРОВАТЬ КОД</button><button class="btn small" id="expFile">СКАЧАТЬ ФАЙЛ</button></div>
 <textarea id="profileCode" rows="3" placeholder="Вставь код профиля VF2:… или JSON" spellcheck="false" style="margin-top:8px"></textarea>
 <div class="cta-row" style="margin-top:8px"><button class="btn small" id="impCode">ИМПОРТ ИЗ КОДА</button><label class="filebtn chamfer">ИЗ ФАЙЛА<input id="impFile" type="file" accept=".json,.txt,application/json,text/plain" hidden></label></div>
 <p class="hint">Перед импортом текущий профиль копируется в резерв. Версия сохранения: ${SAVE_VERSION} · ключ ${SAVE_KEY} · игра ${VF_VERSION}.</p>`;
 return {body,bind(){
  const $=id=>document.getElementById(id);
  $('sound').onclick=()=>{audio.enabled=!audio.enabled;initAudio();applyVolumes();persist();rerender('settings')};
  $('music').onclick=()=>{audio.musicOn=!audio.musicOn;initAudio();applyVolumes();persist();rerender('settings')};
  for(const [id,key] of [['master','master'],['fx','fx'],['musvol','music'],['mCombat','musicCombat'],['mBoss','musicBoss'],['mBase','musicBase']])$(id).oninput=e=>{settings[key]=Number(e.target.value)/100;e.target.closest('label').querySelector('output').textContent=Math.round(settings[key]*100)+'%';applyVolumes();persist()};
  panel.querySelectorAll('[data-seg]').forEach(s=>s.querySelectorAll('button').forEach(b=>b.onclick=()=>{settings[s.dataset.seg]=b.dataset.v;persist();if(s.dataset.seg==='quality'){autoQualityLevel=null;applyQuality()}applyButtonSize();sfx('click');rerender('settings')}));
  $('shakeT').onclick=()=>{settings.shake=!settings.shake;persist();rerender('settings')};
  $('vibT').onclick=()=>{settings.vibrate=!settings.vibrate;persist();vibrate(30);rerender('settings')};
  $('expCopy').onclick=async()=>{const code=exportProfileCode();$('profileCode').value=code;try{await navigator.clipboard.writeText(code);toast('Код профиля скопирован')}catch(e){$('profileCode').select();toast('Код в поле ниже — скопируй вручную')}};
  $('expFile').onclick=()=>{const blob=new Blob([JSON.stringify(snapshotProfile(),null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='void-frontier-profile.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);toast('Файл профиля сохранён')};
  const doImport=txt=>{try{const p=parseProfileCode(txt);if(!confirmImport(p))return;importProfile(txt);rerender('settings');toast('Профиль импортирован')}catch(e){toast('Ошибка импорта: '+e.message,true)}};
  $('impCode').onclick=()=>doImport($('profileCode').value);
  $('impFile').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(doImport)};
 }};
}
function confirmImport(p){return window.confirm(`Импортировать профиль?\nКредиты: ${p.credits} ₡, оружие ур.${p.weaponLevel}, корпус ур.${p.hullLevel}, операций закрыто: ${p.caseCleared.filter(Boolean).length}.\nТекущий профиль будет сохранён в резервную копию.`)}
function applyButtonSize(){document.documentElement.dataset.btn=settings.buttons}

/* ---------- Пауза ---------- */
function pauseGame(){
 if(state==='market'){marketMission.pause();return}if(state==='office'){officeMission.pause();return}if(state!=='play')return;
 state='pause';dlg('');
 panel.innerHTML=`<div class="dialog-scene"><span class="eyebrow">${mode==='story'?'ОПЕРАЦИЯ '+(currentCaseStage+1)+' · '+caseCurrent().sector:mode==='endless'?'БЕЗДНА · ВОЛНА '+wave:'ПАРАД ДЕБИЛОВ'}</span><h1>ПАУЗА</h1><p>Бой остановлен. Прогресс текущего вылета не теряется.</p>
 <button id="resume">ПРОДОЛЖИТЬ</button><div class="seg"><button id="pSound" class="${audio.enabled?'chosen':''}">ЗВУК ${audio.enabled?'ВКЛ':'ВЫКЛ'}</button><button id="pMusic" class="${audio.musicOn?'chosen':''}">МУЗЫКА ${audio.musicOn?'ВКЛ':'ВЫКЛ'}</button></div>
 <button id="restart" class="ghost">НАЧАТЬ ЗАНОВО</button><button id="quit" class="ghost">В ШТАБ</button></div>`;
 const $=id=>document.getElementById(id);
 $('resume').onclick=resumeGame;
 $('pSound').onclick=()=>{audio.enabled=!audio.enabled;applyVolumes();persist();state='play';pauseGame()};
 $('pMusic').onclick=()=>{audio.musicOn=!audio.musicOn;applyVolumes();persist();state='play';pauseGame()};
 $('restart').onclick=()=>{if(mode==='story')launchCaseStage(currentCaseStage);else reset()};
 $('quit').onclick=()=>menu('home');
}
function resumeGame(){initAudio();state='play';panel.style.display='none';last=performance.now()}
