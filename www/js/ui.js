'use strict';
/* Меню: стартовый экран, ангар (4 вкладки + настройки), выбор режима, пауза. DOM поверх canvas. */
const panel=document.querySelector('#panel'),bombBtn=document.querySelector('#bomb'),pauseBtn=document.querySelector('#pause'),hideBtn=document.querySelector('#hide'),freezeBtn=document.querySelector('#freeze');
hideBtn.onclick=()=>useHide();freezeBtn.onclick=()=>useFreeze();bombBtn.onclick=()=>bomb();pauseBtn.onclick=()=>pauseGame();
const TAB_ALIAS={ships:'ship',bosses:'codex',market:'codex'};
let previewTier=null,previewCanvas=null;
const fmt=n=>Math.max(0,Math.floor(n)).toLocaleString('ru-RU');
function hideCombatButtons(){document.body.classList.remove('in-combat');pauseBtn.style.display='none';bombBtn.style.display='none';hideBtn.style.display='none';freezeBtn.style.display='none'}
function procThumb(key){try{const cv=procArt(key);return cv?cv.toDataURL('image/png'):''}catch(e){return ''}}
const thumbCache={};
function miniThumb(kind){if(SPRITE_FILES[kind])return 'assets/sprites/'+SPRITE_FILES[kind]+'.png';return thumbCache[kind]||(thumbCache[kind]=procThumb(kind))}

function menu(tab=hangarTab){
 tab=TAB_ALIAS[tab]||tab;if(!['ship','shop','arsenal','story','rewards','codex','settings'].includes(tab))tab='ship';
 state='menu';hangarTab=tab;hideCombatButtons();if(typeof officeRun!=='undefined'&&officeRun)officeRun.keys&&officeRun.keys.clear();
 panel.className='hangar';panel.style.display='flex';
 const tabs=[['ship','🚀','КОРАБЛЬ'],['shop','🛒','МАГАЗИН'],['arsenal','🎯','АРСЕНАЛ'],['story','📁','ДЕЛО СОЧ'],['rewards','🏆','НАГРАДЫ']];
 const bodies={ship:shipTab,shop:shopTab,arsenal:arsenalTab,story:storyTab,rewards:rewardsTab,codex:codexTab,settings:settingsTab};
 const rp=rankProgress(),titles={settings:'НАСТРОЙКИ',codex:'КОДЕКС',shop:'ВЕРФЬ И МАГАЗИН',rewards:'НАГРАДЫ И ДОСТИЖЕНИЯ'};
 const rewardDot=dailyAvailable()||(!challengeDoneToday());
 panel.innerHTML=`<header class="hangar-header"><div class="hh-top"><div class="rank-chip"><b>🎖 ${RANKS[rp.i][0]}</b><div class="xpbar"><i style="width:${Math.round(rp.k*100)}%"></i></div></div><div class="hh-icons"><button class="icon-btn ${tab==='codex'?'chosen':''}" data-tab="codex" aria-label="Кодекс">📖</button><button class="icon-btn ${tab==='settings'?'chosen':''}" data-tab="settings" aria-label="Настройки">⚙</button></div></div>
 <h1>${titles[tab]||'КОСМИЧЕСКИЙ АНГАР'}</h1><div class="currency"><span>◈ ${fmt(credits)} ₡</span><span>★ ${fmt(bestScore)}</span><span>🏆 ${achievements.length}/${ACH.length}</span><span>⚑ ${caseCleared.filter(Boolean).length}/${CASE_OPERATIONS.length}</span></div></header>
 <nav class="hangar-nav">${tabs.map(([id,ic,l])=>`<button data-tab="${id}" class="${tab===id?'chosen':''}"><i>${ic}</i>${l}${id==='rewards'&&rewardDot?'<em class="dot"></em>':''}</button>`).join('')}</nav>
 <section class="hangar-content">${bodies[tab]()}</section>
 <footer class="deploy"><button id="deployBtn" class="deploy-main">В БОЙ ▶</button></footer><p id="hangar-toast" role="status" aria-live="polite" class="toast"></p>`;
 const $=id=>document.getElementById(id);
 panel.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{sfx('click');menu(b.dataset.tab)});
 $('deployBtn').onclick=()=>{initAudio();sfx('click');showModeSelect()};
 ({ship:bindShipTab,shop:bindShopTab,arsenal:bindArsenalTab,story:bindStoryTab,rewards:bindRewardsTab,settings:bindSettingsTab}[tab]||(()=>{}))();
 previewCanvas=document.getElementById('shipPreview');
 const sc=panel.querySelector('.hangar-content');if(sc&&menu.keepScroll&&menu.keepScroll.tab===tab)sc.scrollTop=menu.keepScroll.y;menu.keepScroll=null;
 if(checkAchievements()){}
}
function toast(msg,bad){const el=document.getElementById('hangar-toast');if(el){el.textContent=msg;el.className='toast show'+(bad?' bad':'');clearTimeout(toast.t);toast.t=setTimeout(()=>el.className='toast',2600)}}
function buy(cost,action,tab){if(credits<cost){toast(`Недостаточно кредитов: нужно ${fmt(cost)} ₡`,true);sfx('hit');return false}credits-=cost;action();sfx('upgrade');persist();checkAchievements();const sc=panel.querySelector('.hangar-content');menu.keepScroll={tab,y:sc?sc.scrollTop:0};menu(tab);return true}

/* ---------- Корабль ---------- */
function shipTab(){
 const s=SHIPS[ship],h=hullInfo(),next=HULL[hullLevel]||null,pt=previewTier||hullLevel,cls=SHIP_CLASSES[s.cls];
 const owned=Object.values(contraband).filter(Boolean).length;
 const modules=[['Крылья',hullLevel>=2],['Двигатели',hullLevel>=3],['Крыльевые пушки',hullLevel>=4],['Дроновый узел',hullLevel>=5],['Контрабанда '+owned+'/6',owned>0]];
 return `<div class="ship-stage"><canvas id="shipPreview" width="300" height="300" aria-label="Предпросмотр корабля"></canvas>
  <div class="ship-meta"><span class="cls" style="--c:${cls.color}">${cls.name}</span><strong>${s.name}</strong><small>${s.type}</small><p>${s.special}</p><button id="toShop" class="ghost small">СМЕНИТЬ КОРАБЛЬ 🛒</button></div></div>
 <div class="stat-grid"><span>КОРПУС <b>${shipMaxHp()}</b></span><span>МАНЁВР <b>${Math.round(s.speed*(1+h.speed))}</b></span><span>УРОН <b>×${(s.dmg||1).toFixed(2)}</b></span><span>ДРОНЫ / РАКЕТЫ <b>${activeDroneCount()} / ${activeMissileCount()}</b></span></div>
 <h2 class="sub">ЭВОЛЮЦИЯ КОРПУСА · ${hullLevel}/5 <small>бонусы действуют на все корабли</small></h2>
 <div class="evo">${HULL.map(x=>`<button class="evo-card ${x.lvl<=hullLevel?'owned':''} ${x.lvl===pt?'viewing':''}" data-preview="${x.lvl}"><img src="assets/sprites/player_lvl${x.lvl}.png" alt="" loading="lazy"><b>УР.${x.lvl}</b>${x.lvl>hullLevel?'<i>🔒</i>':''}</button>`).join('')}</div>
 <div class="modules">${modules.map(([n,on])=>`<span class="${on?'on':''}">${on?'✓':'·'} ${n}</span>`).join('')}</div>
 ${next?`<div class="upgrade-card"><div><b>${next.name}</b><small>${next.desc}</small></div><button id="hullUp">УСИЛИТЬ · ${fmt(next.cost)} ₡</button></div>`:'<div class="upgrade-card done"><b>КОРПУС ПОЛНОСТЬЮ ЭВОЛЮЦИОНИРОВАЛ</b></div>'}
 ${s.sprite?'':'<p class="hint">Внешний вид ASTRA, TITAN и SPECTER меняется вместе с уровнем корпуса.</p>'}`;
}
function bindShipTab(){
 panel.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>{const v=Number(b.dataset.preview);previewTier=v===hullLevel?null:v;sfx('click');menu('ship')});
 const up=document.getElementById('hullUp');if(up)up.onclick=()=>{const next=HULL[hullLevel];if(next&&buy(next.cost,()=>{hullLevel=next.lvl;previewTier=null},'ship'))toast('Корпус усилен: '+next.name)};
 document.getElementById('toShop').onclick=()=>menu('shop');
}
/* ---------- Магазин кораблей ---------- */
let shopFilter='all';
function shopTab(){
 const rIdx=rankIndex(),maxHp=220,maxSp=470,maxD=1.25;
 const list=Object.entries(SHIPS).filter(([id,v])=>shopFilter==='all'||v.cls===shopFilter);
 const bar=(k)=>`<i style="width:${Math.round(clamp(k,0,1)*100)}%"></i>`;
 return `<div class="seg filters">${[['all','ВСЕ'],['C','C'],['B','B'],['A','A'],['S','S'],['L','★']].map(([v,l])=>`<button data-filter="${v}" class="${shopFilter===v?'chosen':''}">${l}</button>`).join('')}</div>
 <div class="shop-list">${list.map(([id,v])=>{const own=ownedShips.includes(id),eq=ship===id,cls=SHIP_CLASSES[v.cls],lock=v.rank&&rIdx<v.rank;
  return `<div class="ship-card ${eq?'equipped':''} cls-${v.cls}" style="--c:${cls.color}"><div class="sc-img"><img src="${shipImageSrc(id)}" alt="" loading="lazy"><span class="cls">${cls.name}</span></div>
  <div class="sc-body"><b>${v.name}</b><small>${v.type}</small>
  <div class="sbars"><span>КОРПУС</span><div>${bar(v.hp/maxHp)}</div><span>СКОРОСТЬ</span><div>${bar(v.speed/maxSp)}</div><span>УРОН</span><div>${bar((v.dmg||1)/maxD)}</div></div>
  <p>${v.special}</p>
  ${eq?'<button disabled class="eq">✓ НА ВЫЛЕТЕ</button>':own?`<button data-equip="${id}">ВЫБРАТЬ</button>`:lock?`<button disabled>🔒 ЗВАНИЕ: ${RANKS[v.rank][0]}</button>`:`<button data-buy="${id}" class="${credits>=v.price?'':'cant'}">КУПИТЬ · ${fmt(v.price)} ₡</button>`}</div></div>`}).join('')}</div>
 <p class="hint">Улучшения оружия, дроны, ракеты, корпус и контрабанда переносятся на любой корабль.</p>`;
}
function bindShopTab(){
 panel.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{shopFilter=b.dataset.filter;sfx('click');menu('shop')});
 panel.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{ship=b.dataset.equip;persist();sfx('upgrade');toast(SHIPS[ship].name+' готов к вылету');const sc=panel.querySelector('.hangar-content');menu.keepScroll={tab:'shop',y:sc?sc.scrollTop:0};menu('shop')});
 panel.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const id=b.dataset.buy,v=SHIPS[id];if(buy(v.price,()=>{if(!ownedShips.includes(id))ownedShips.push(id);if(id==='specter')shipUnlocked=true;ship=id},'shop'))toast(v.name+' куплен и выбран!')});
}
// Анимированный предпросмотр (вызывается из главного цикла, пока открыт ангар).
function drawHangarPreview(dt){
 if(!previewCanvas||!previewCanvas.isConnected)return;const pc=previewCanvas,x=pc.getContext('2d'),S=pc.width;x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,S,S);
 const tier=previewTier||hullLevel,sh=SHIPS[ship],img=IMG[sh.sprite&&!previewTier?sh.sprite:'player'+tier],tt=performance.now()/1000;
 const bg=x.createRadialGradient(S/2,S/2,10,S/2,S/2,S/2);bg.addColorStop(0,'rgba(40,140,200,.35)');bg.addColorStop(1,'rgba(4,12,26,0)');x.fillStyle=bg;x.fillRect(0,0,S,S);
 x.strokeStyle='rgba(90,210,255,.25)';x.lineWidth=1;for(let r=50;r<S/2;r+=40){x.beginPath();x.ellipse(S/2,S*.62,r*1.3,r*.35,0,0,TAU);x.stroke()}
 x.save();x.translate(S/2,S/2+Math.sin(tt*1.6)*6);
 const d=glowDot(rgba(sh.engine,1),16),nozzles=tier>=4?[-22,-8,8,22]:tier>=2?[-14,0,14]:[-10,10],size=S*.62,fl=1+Math.sin(tt*30)*.12;
 x.globalCompositeOperation='lighter';for(const nx of nozzles){const s=(nx===0?30:24)*fl;x.drawImage(d.cv,nx*size/100-s/2,size*.36,s,s*2)}x.globalCompositeOperation='source-over';
 if(imgReady(img)){x.shadowColor=sh.engine||'#00cfff';x.shadowBlur=18;const k=size/Math.max(img.naturalWidth,img.naturalHeight);x.drawImage(img,-img.naturalWidth*k/2,-img.naturalHeight*k/2,img.naturalWidth*k,img.naturalHeight*k)}
 x.restore();
}

/* ---------- Арсенал ---------- */
function arsenalTab(){
 const L=weaponLevel,streams=2+(L>=3?2:0)+(L>=6?1:0)+(L>=9?2:0);
 return `<div class="armory">
 <div><strong>ОСНОВНОЕ ОРУЖИЕ</strong><p>${weapon==='laser'?'Импульсный лазер: быстрые узкие лучи':'Плазменная пушка: медленные тяжёлые заряды'}</p><button id="weapon">СМЕНИТЬ НА ${weapon==='laser'?'ПЛАЗМУ':'ЛАЗЕР'}</button></div>
 <div><strong>УСИЛЕНИЕ ОРУЖИЯ</strong><p>Уровень ${L}/10 · потоков: ${streams}</p><div class="pips">${Array.from({length:10},(_,i)=>`<i class="${i<L?'on':''}"></i>`).join('')}</div><button id="upgrade" ${L>=10?'disabled':''}>${L>=10?'МАКСИМУМ':'УЛУЧШИТЬ · '+fmt(L*150)+' ₡'}</button></div>
 <div><strong>БОЕВЫЕ ДРОНЫ</strong><p>${drones}/2 постоянных · в бою: ${activeDroneCount()}</p><button id="drone" ${drones>=2?'disabled':''}>${drones>=2?'МАКСИМУМ':'ДОКУПИТЬ · '+fmt((drones+1)*500)+' ₡'}</button></div>
 <div><strong>РАКЕТНЫЙ КОМПЛЕКС</strong><p>${missiles}/3 самонаводящихся ракет за залп</p><button id="missile" ${missiles>=3?'disabled':''}>${missiles>=3?'МАКСИМУМ':'УЛУЧШИТЬ · '+fmt((missiles+1)*400)+' ₡'}</button></div>
 </div><p class="hint">Уровни 3, 6 и 9 добавляют новые потоки огня. Контрабанда с Нижнего рынка действует во всех режимах.</p>`;
}
function bindArsenalTab(){
 const $=id=>document.getElementById(id);
 $('weapon').onclick=()=>{weapon=weapon==='laser'?'plasma':'laser';persist();sfx('collect');menu('arsenal')};
 $('upgrade').onclick=()=>{if(weaponLevel<10)buy(weaponLevel*150,()=>weaponLevel++,'arsenal')};
 $('drone').onclick=()=>{if(drones<2)buy((drones+1)*500,()=>drones++,'arsenal')};
 $('missile').onclick=()=>{if(missiles<3)buy((missiles+1)*400,()=>missiles++,'arsenal')};
}

/* ---------- Дело СОЧ ---------- */
function storyTab(){
 return `<div class="story-codex"><span class="eyebrow">КОСМИЧЕСКИЙ РОЗЫСК · ДЕЛО № 000</span><h2>РАЗЫСКИВАЕТСЯ «АРХИТЕКТОР БЕЗДНЫ»</h2><p>Ты — сотрудник штабной группы розыска СОЧ в вымышленной космической части. Архитектор самовольно оставил службу, захватил флагман и скрылся в глубоком космосе.</p>
 <div class="case-grid">${CASE_OPERATIONS.map((op,i)=>`<button class="case-card ${caseCleared[i]?'complete':''}" data-case="${i}" ${i>caseUnlocked?'disabled':''} style="--tint:${op.tint}"><span class="case-top">${String(i+1).padStart(2,'0')} · ${op.sector} ${caseCleared[i]?'✓':i>caseUnlocked?'🔒':'▶'}</span><strong>${op.title}</strong><small>${caseCleared[i]?'ДЕЛО ЗАКРЫТО · ЛУЧШИЙ СЧЁТ '+fmt(caseBest[i]):i<=caseUnlocked?'ПОЛУЧЕНЫ КООРДИНАТЫ':'НЕТ КООРДИНАТ'}</small></button>`).join('')}</div>
 <div class="story-objective">📁 ДОПОЛНИТЕЛЬНО: архив штаба даёт стартовую улику${officeCleared?' ✓':''}; через нижнее КПП — Нижний рынок.</div>
 <button id="officeBtn" class="ghost wide">АРХИВ ШТАБА (НЕОБЯЗАТЕЛЬНО)</button>
 <h2>ИТОГ РОЗЫСКА</h2><div class="ending-chips">${[['chief','Задержание'],['loop','Установить правду'],['escape','Тихое завершение']].map(([id,label])=>`<span class="${caseEndings.includes(id)?'found':'locked'}">${caseEndings.includes(id)?'✓':'🔒'} ${label}</span>`).join('')}</div></div>`;
}
function bindStoryTab(){panel.querySelectorAll('[data-case]').forEach(b=>b.onclick=()=>{initAudio();startCaseStage(Number(b.dataset.case))});document.getElementById('officeBtn').onclick=()=>{mode='story';initAudio();showPrologue()}}

/* ---------- Награды ---------- */
function rewardsTab(){
 const rp=rankProgress(),next=RANKS[rp.i+1],ch=todayChallenge(),avail=dailyAvailable(),ns=avail?nextDailyStreak():dailyStreak;
 const done=ACH.filter(a=>achievements.includes(a.id)).length;
 const sorted=[...ACH].sort((a,b)=>(achievements.includes(a.id)-achievements.includes(b.id))||((b.p()[0]/b.p()[1])-(a.p()[0]/a.p()[1])));
 return `<div class="reward-box"><h2 class="sub">НАГРАДА ДНЯ</h2><div class="days">${DAILY_REWARDS.map((r,i)=>`<span class="${i<ns-(avail?1:0)?'got':''} ${avail&&i===ns-1?'today':''}"><b>${i+1}</b>${r}₡</span>`).join('')}</div>
 <button id="claimDaily" ${avail?'':'disabled'}>${avail?'ЗАБРАТЬ '+DAILY_REWARDS[ns-1]+' ₡':'ЗАБРАНО · ВОЗВРАЩАЙСЯ ЗАВТРА'}</button></div>
 <div class="reward-box challenge"><h2 class="sub">ИСПЫТАНИЕ ДНЯ</h2><b>«${ch.name}»</b><p>${ch.desc}. Цель: дойти до ${CHALLENGE_GOAL}-й волны Бездны.</p>
 <button id="playChallenge" ${challengeDoneToday()?'class="ghost"':''}>${challengeDoneToday()?'ПРОЙДЕНО ✓ · СЫГРАТЬ ЕЩЁ':'НАЧАТЬ · '+CHALLENGE_REWARD+' ₡'}</button></div>
 <div class="reward-box"><h2 class="sub">ЗВАНИЕ ПИЛОТА</h2><div class="rank-line"><b>🎖 ${RANKS[rp.i][0]}</b><span>${fmt(pilotXp)} опыта</span></div><div class="xpbar big"><i style="width:${Math.round(rp.k*100)}%"></i></div>
 <p class="hint">${next?`До звания «${next[0]}»: ${fmt(next[1]-pilotXp)} опыта · награда ${250*(rp.i+1)} ₡`:'Высшее звание получено!'} Опыт дают очки, сбитые враги, операции и достижения.</p></div>
 <h2 class="sub">ДОСТИЖЕНИЯ · ${done}/${ACH.length}</h2><div class="ach-list">${sorted.map(a=>{const got=achievements.includes(a.id),[c,m]=a.p(),k=Math.min(1,c/m);
  return `<div class="ach ${got?'got':''}"><i>${a.ic}</i><div><b>${a.name}</b><small>${a.desc}</small>${got?'':`<div class="xpbar"><i style="width:${Math.round(k*100)}%"></i></div><small>${fmt(Math.min(c,m))} / ${fmt(m)}</small>`}</div><em>${got?'✓':'+'+a.reward+' ₡'}</em></div>`}).join('')}</div>`;
}
function bindRewardsTab(){
 document.getElementById('claimDaily').onclick=()=>{const r=claimDaily();if(r){sfx('win');menu('rewards')}};
 document.getElementById('playChallenge').onclick=()=>startChallenge();
}
/* ---------- Кодекс ---------- */
function codexTab(){
 const enemies=[['scout','РАЗВЕДЧИК','Быстрый, прицельные одиночные выстрелы'],['zig','ПЕРЕХВАТЧИК','Манёвры зигзагом, очереди по 3'],['heavy','ШТУРМОВИК','Медленный и бронированный, веер вперёд'],['sniper','СНАЙПЕР','Зависает и прицеливается — следи за лучом'],['carrier','НОСИТЕЛЬ ДРОНОВ','Выпускает рой самонаводящихся дронов'],['bomber','БОМБАРДИРОВЩИК','Плазменные бомбы взрываются кольцом']];
 const items=[{k:'overdrive',n:'⚡ Реактор +18% урона'},{k:'armor',n:'🛡 Броня +25 HP'},{k:'jammer',n:'📡 Глушилка подозрения'},{k:'blackMissiles',n:'🚀 Чёрные ракеты'},{k:'shadowDrones',n:'🛰 Теневой дрон'},{k:'phaseShield',n:'🔮 Фазовый щит'}];
 return `<div class="codex"><div class="codex-boss"><img src="assets/sprites/arch_hull.png" alt=""></div><h2>АРХИТЕКТОР БЕЗДНЫ · ЦЕЛЬ № 1</h2><p>Вымышленная цель группы розыска СОЧ на секретном флагмане. Флагман меняет свет и форму по фазам: залпы и гравитационные кольца → турели → лучи Бездны и раскрытие щитов → абсолютный залп.</p>
 <div class="codex-boss phantom"><img src="assets/sprites/phantom_hull.png" alt=""></div><h2>КАПИТАН УХМЫЛКА · ЦЕЛЬ № 2</h2><p>Он же Призрак Самоволки — второй самый опасный беглец во вселенной, бывший штурман Архитектора. Украл маскировочное ядро «Цифра», летает на стелс-крейсере «Невидимка» и всегда улыбается на ориентировках. Любимая фраза: «Я просто вышел за хлебом». Три фазы: маскировка → ложные цели и телепорт → лучи «Ухмылки» и пиксельный дождь. ${caseCleared[4]?'<b>СТАТУС: ЗАДЕРЖАН ✓</b>':caseUnlocked>=4?'<b>СТАТУС: В РОЗЫСКЕ</b>':'<b>СТАТУС: ДАННЫЕ ЗАСЕКРЕЧЕНЫ</b>'}</p>
 <h2>АНОМАЛЬНЫЕ МИНИ-БОССЫ</h2><div class="codex-list">${MINI.map((m,i)=>`<div class="codex-row"><img src="${miniThumb(m.kind)}" alt=""><div><b>${String(i+1).padStart(2,'0')} · ${m.name}</b><small>${m.attack} · ${m.special}</small></div></div>`).join('')}</div>
 <h2>ПРОТИВНИКИ</h2><div class="codex-list">${enemies.map(([k,n,d])=>`<div class="codex-row"><img src="assets/sprites/${SPRITE_FILES[k]}.png" alt=""><div><b>${n}</b><small>${d}</small></div></div>`).join('')}</div>
 <h2>НИЖНИЙ РЫНОК</h2><p>Вход только через нижнее КПП: начни миссию в архиве штаба, обойди сканеры в правом нижнем коридоре и найди фиолетовую дверь.</p><div class="story-objective">🕳 ПОСЕЩЕНИЙ: ${marketVisits} · 🚨 ОБЛАВ: ${marketRaids}</div>
 <div class="ending-chips">${items.map(o=>`<span class="${contraband[o.k]?'found':'locked'}">${contraband[o.k]?'✓':'🔒'} ${o.n}</span>`).join('')}</div>
 <h2>СТАТИСТИКА ПИЛОТА</h2><div class="stat-grid"><span>БЕЗДНА <b>волна ${abyssBestWave}</b></span><span>ПАРАД <b>${paradeBest}/8</b></span><span>СБИТО <b>${fmt(stats.kills)}</b></span><span>ЭЛИТЫ <b>${fmt(stats.elites)}</b></span><span>МИНИ-БОССЫ <b>${fmt(stats.minis)}</b></span><span>АРХИТЕКТОР <b>${fmt(stats.bosses)}</b></span><span>ВЫЛЕТОВ <b>${fmt(stats.runs)}</b></span><span>ЛУЧШЕЕ КОМБО <b>${fmt(stats.bestCombo)}</b></span><span>GRAZE <b>${fmt(stats.graze)}</b></span><span>ЗАРАБОТАНО <b>${fmt(stats.earned)} ₡</b></span><span>В БОЮ <b>${Math.floor(stats.playTime/60)} мин</b></span><span>КОНЦОВКИ <b>${caseEndings.length}/3</b></span></div></div>`;
}

/* ---------- Настройки ---------- */
function settingsTab(){
 const sl=(id,label,v,max=100)=>`<label>${label} <output>${Math.round(v*100)}%</output><input id="${id}" type="range" min="0" max="${max}" value="${Math.round(v*100)}"></label>`;
 const seg=(name,opts,cur)=>`<div class="seg" data-seg="${name}">${opts.map(([v,l])=>`<button data-v="${v}" class="${cur===v?'chosen':''}">${l}</button>`).join('')}</div>`;
 return `<div class="settings"><h2 class="sub">ЗВУК</h2><div class="seg"><button id="sound" class="${audio.enabled?'chosen':''}">ЭФФЕКТЫ: ${audio.enabled?'ВКЛ':'ВЫКЛ'}</button><button id="music" class="${audio.musicOn?'chosen':''}">МУЗЫКА: ${audio.musicOn?'ВКЛ':'ВЫКЛ'}</button></div>
 <div class="sliders">${sl('master','ОБЩАЯ ГРОМКОСТЬ',settings.master)}${sl('fx','ЭФФЕКТЫ',settings.fx)}${sl('musvol','МУЗЫКА',settings.music)}${sl('mCombat','МУЗЫКА: ОБЫЧНЫЕ БОИ',settings.musicCombat,150)}${sl('mBoss','МУЗЫКА: БОССЫ И АРХИТЕКТОР',settings.musicBoss,150)}${sl('mBase','МУЗЫКА: ШТАБ И РЫНОК',settings.musicBase,150)}</div>
 <h2 class="sub">ГРАФИКА</h2>${seg('quality',[['auto','АВТО'],['low','НИЗКОЕ'],['medium','СРЕДНЕЕ'],['high','ВЫСОКОЕ']],settings.quality)}<p class="hint">Сейчас: ${QUALITY.name}. «Авто» снижает качество при просадках FPS.</p>
 <h2 class="sub">УПРАВЛЕНИЕ</h2><span class="lbl">РАЗМЕР КНОПОК</span>${seg('buttons',[['s','МАЛЕНЬКИЕ'],['m','СРЕДНИЕ'],['l','БОЛЬШИЕ']],settings.buttons)}
 <span class="lbl">УПРАВЛЕНИЕ КОРАБЛЁМ</span>${seg('control',[['point','КОРАБЛЬ НАД ПАЛЬЦЕМ'],['drag','ОТНОСИТЕЛЬНОЕ']],settings.control)}<div class="seg"><button id="shakeT" class="${settings.shake?'chosen':''}">ТРЯСКА: ${settings.shake?'ВКЛ':'ВЫКЛ'}</button><button id="vibT" class="${settings.vibrate?'chosen':''}">ВИБРАЦИЯ: ${settings.vibrate?'ВКЛ':'ВЫКЛ'}</button></div>
 <h2 class="sub">ПРОФИЛЬ</h2><p class="hint">Перенос прогресса без облака: скопируй код или сохрани файл и импортируй на другом устройстве.</p>
 <div class="seg"><button id="expCopy">СКОПИРОВАТЬ КОД</button><button id="expFile">СКАЧАТЬ ФАЙЛ</button></div>
 <textarea id="profileCode" rows="3" placeholder="Вставь код профиля VF2:… или JSON" spellcheck="false"></textarea>
 <div class="seg"><button id="impCode">ИМПОРТ ИЗ КОДА</button><label class="filebtn">ИЗ ФАЙЛА<input id="impFile" type="file" accept=".json,.txt,application/json,text/plain" hidden></label></div>
 <p class="hint">Перед импортом текущий профиль копируется в резерв. Версия сохранения: ${SAVE_VERSION} · ключ ${SAVE_KEY}.</p></div>`;
}
function bindSettingsTab(){
 const $=id=>document.getElementById(id);
 $('sound').onclick=()=>{audio.enabled=!audio.enabled;initAudio();applyVolumes();persist();menu('settings')};
 $('music').onclick=()=>{audio.musicOn=!audio.musicOn;initAudio();applyVolumes();persist();menu('settings')};
 for(const [id,key] of [['master','master'],['fx','fx'],['musvol','music'],['mCombat','musicCombat'],['mBoss','musicBoss'],['mBase','musicBase']])$(id).oninput=e=>{settings[key]=Number(e.target.value)/100;e.target.closest('label').querySelector('output').textContent=Math.round(settings[key]*100)+'%';applyVolumes();persist()};
 panel.querySelectorAll('[data-seg]').forEach(s=>s.querySelectorAll('button').forEach(b=>b.onclick=()=>{settings[s.dataset.seg]=b.dataset.v;persist();if(s.dataset.seg==='quality'){autoQualityLevel=null;applyQuality()}applyButtonSize();sfx('click');menu('settings')}));
 $('shakeT').onclick=()=>{settings.shake=!settings.shake;persist();menu('settings')};
 $('vibT').onclick=()=>{settings.vibrate=!settings.vibrate;persist();vibrate(30);menu('settings')};
 $('expCopy').onclick=async()=>{const code=exportProfileCode();$('profileCode').value=code;try{await navigator.clipboard.writeText(code);toast('Код профиля скопирован')}catch(e){$('profileCode').select();toast('Код в поле ниже — скопируй вручную')}};
 $('expFile').onclick=()=>{const blob=new Blob([JSON.stringify(snapshotProfile(),null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='void-frontier-profile.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);toast('Файл профиля сохранён')};
 const doImport=txt=>{try{const p=parseProfileCode(txt);if(!confirmImport(p))return;importProfile(txt);menu('settings');toast('Профиль импортирован')}catch(e){toast('Ошибка импорта: '+e.message,true)}};
 $('impCode').onclick=()=>doImport($('profileCode').value);
 $('impFile').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(doImport)};
}
function confirmImport(p){return window.confirm(`Импортировать профиль?\nКредиты: ${p.credits} ₡, оружие ур.${p.weaponLevel}, корпус ур.${p.hullLevel}, операций закрыто: ${p.caseCleared.filter(Boolean).length}/4.\nТекущий профиль будет сохранён в резервную копию.`)}
function applyButtonSize(){document.documentElement.dataset.btn=settings.buttons}

/* ---------- Выбор режима ---------- */
function showModeSelect(){
 state='modes';panel.className='hangar modes';panel.style.display='flex';hideCombatButtons();
 const next=Math.min(caseUnlocked,LAST_OP),op=CASE_OPERATIONS[next];
 panel.innerHTML=`<header class="hangar-header"><div class="hh-top"><span class="eyebrow">ВЫБОР ВЫЛЕТА</span><button class="icon-btn" id="modesBack" aria-label="Назад">✕</button></div><h1>КУДА ЛЕТИМ?</h1></header>
 <section class="hangar-content mode-list">
  <button class="mode-card primary" id="mCampaign"><i>🚀</i><div><b>РОЗЫСК СОЧ · КАМПАНИЯ</b><small>Операция ${next+1}/${CASE_OPERATIONS.length} · ${op.sector}${caseCleared.every(Boolean)?' · все дела закрыты':''}</small></div></button>
  <button class="mode-card" id="mDossier"><i>📁</i><div><b>ДОСЬЕ ОПЕРАЦИЙ</b><small>Выбрать любую открытую операцию</small></div></button>
  <button class="mode-card" id="mEndless"><i>🌀</i><div><b>БЕЗДНА ∞</b><small>Бесконечные волны, перки, боссы · рекорд: волна ${abyssBestWave}</small></div></button>
  <button class="mode-card challenge" id="mChallenge"><i>🏅</i><div><b>ИСПЫТАНИЕ ДНЯ · «${todayChallenge().name}»</b><small>${todayChallenge().desc} · ${challengeDoneToday()?'пройдено ✓':'награда '+CHALLENGE_REWARD+' ₡'}</small></div></button>
  <button class="mode-card" id="mParade"><i>🤡</i><div><b>ПАРАД ДЕБИЛОВ</b><small>8 мини-боссов подряд · лучший: ${paradeBest}/8</small></div></button>
  <button class="mode-card side" id="mOffice"><i>🗄</i><div><b>АРХИВ ШТАБА</b><small>Необязательно: стелс, стартовая улика, путь на Нижний рынок</small></div></button>
 </section>`;
 const $=id=>document.getElementById(id);
 $('modesBack').onclick=()=>menu();
 $('mCampaign').onclick=()=>{initAudio();startCaseStage(next)};
 $('mDossier').onclick=()=>menu('story');
 $('mChallenge').onclick=()=>startChallenge();
 $('mEndless').onclick=()=>{challengeActive=null;mode='endless';initAudio();reset();announce('БЕЗДНА ∞',2.5,'ПРОДЕРЖИСЬ КАК МОЖНО ДОЛЬШЕ')};
 $('mParade').onclick=()=>{mode='parade';initAudio();reset();announce('ПАРАД ДЕБИЛОВ',2.5,'ВОСЕМЬ АНОМАЛИЙ ПОДРЯД')};
 $('mOffice').onclick=()=>{mode='story';initAudio();showPrologue()};
}

/* ---------- Пауза ---------- */
function pauseGame(){
 if(state==='market'){marketMission.pause();return}if(state==='office'){officeMission.pause();return}if(state!=='play')return;
 state='pause';panel.className='';panel.style.display='block';
 panel.innerHTML=`<div class="dialog-scene"><span class="eyebrow">${mode==='story'?'РОЗЫСК СОЧ · '+caseCurrent().sector:mode==='endless'?'БЕЗДНА · ВОЛНА '+wave:'ПАРАД ДЕБИЛОВ'}</span><h1>ПАУЗА</h1><p>Прогресс текущего боя не теряется.</p>
 <button id="resume">ПРОДОЛЖИТЬ</button><div class="seg"><button id="pSound" class="${audio.enabled?'chosen':''}">ЗВУК ${audio.enabled?'ВКЛ':'ВЫКЛ'}</button><button id="pMusic" class="${audio.musicOn?'chosen':''}">МУЗЫКА ${audio.musicOn?'ВКЛ':'ВЫКЛ'}</button></div>
 <button id="restart" class="ghost">НАЧАТЬ ЗАНОВО</button><button id="quit" class="ghost">В АНГАР</button></div>`;
 const $=id=>document.getElementById(id);
 $('resume').onclick=resumeGame;
 $('pSound').onclick=()=>{audio.enabled=!audio.enabled;applyVolumes();persist();state='play';pauseGame()};
 $('pMusic').onclick=()=>{audio.musicOn=!audio.musicOn;applyVolumes();persist();state='play';pauseGame()};
 $('restart').onclick=()=>{if(mode==='story')launchCaseStage(currentCaseStage);else reset()};
 $('quit').onclick=()=>menu('ship');
}
function resumeGame(){initAudio();state='play';panel.style.display='none';last=performance.now()}
