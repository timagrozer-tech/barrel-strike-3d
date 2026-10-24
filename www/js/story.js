'use strict';
/* Сюжет «Космический розыск СОЧ». Вымышленная история: Архитектор Бездны — вымышленный персонаж,
 * события не являются утверждениями о реальном человеке. */
const STORY_DEFAULT=()=>({suspicion:24,reports:0,need:4,hide:0,freeze:0,hideCd:0,freezeCd:0,alarmCd:0,interlude:false,alerted:false,caught:0});
let story=STORY_DEFAULT(),reports=[],storyAwards=0;
const storyEvents={duck:'«Кто потерял отчёт? Кря!»',flower:'«Справка о наличии справки — где?»',slipper:'«Кто заминировал тапок?!»',mountain:'«Я Кавказ! Где мои таблицы?»',dumpling:'«Где мой обед?!»',toilet:'«Ответственного за слив — сюда!»',grandpa:'«Почему опять не работает Excel?»',sock:'«Найдите второй носок по описи!»'};
const CASE_OPERATIONS=[
 {title:'ПОТЕРЯННЫЙ СИГНАЛ',sector:'ОРБИТА «ОРИОН»',brief:'Перехвачена запись о самовольном уходе Архитектора. Собери фрагменты телеметрии и уничтожь ложные маяки.',evidence:'Журнал выхода из сектора',mini:'duck',tint:'#1b5b72',reward:300},
 {title:'ЦВЕТОЧНЫЙ СЛЕД',sector:'ТУМАННОСТЬ «АЗАЛИЯ»',brief:'Беглец оставил след в биомеханическом облаке. Его курьер прячет данные за энергетическими ловушками.',evidence:'Маршрут беглеца',mini:'flower',tint:'#79357d',reward:425},
 {title:'ОБХОД НИЖНЕГО КПП',sector:'СТАНЦИЯ «КПП-7»',brief:'Получен сигнал с подпольной станции. Прорвись через укреплённые перехватчики и найди код флагмана.',evidence:'Код скрытого флагмана',mini:'slipper',tint:'#8c6235',reward:550},
 {title:'ОПЕРАЦИЯ «НУЛЕВОЙ»',sector:'СЕКТОР «БЕЗДНА»',brief:'Архитектор скрывается на флагмане. Собери последние доказательства, победи охрану «Я Кавказ» и выйди на цель.',evidence:'Доказательство по делу № 000',mini:'mountain',tint:'#8c244a',reward:800}
];
let currentCaseStage=0,caseTraceCount=0,caseBeacons=0,caseSpawnedMini=false,caseFinalFlag=false;
function caseCurrent(){return CASE_OPERATIONS[currentCaseStage]||CASE_OPERATIONS[0]}
function startCaseStage(stage){
 const n=Number(stage);if(!Number.isInteger(n)||n<0||n>=CASE_OPERATIONS.length||n>caseUnlocked)return;
 mode='story';currentCaseStage=n;showBriefing(n);
}
// Короткий брифинг перед вылетом (новое в 2.0).
function showBriefing(n){
 const op=CASE_OPERATIONS[n],m=MINI.find(x=>x.kind===op.mini);
 state='briefing';panel.classList.remove('hangar','office-dialog');panel.style.display='block';document.body.classList.remove('in-combat');
 panel.innerHTML=`<div class="dialog-scene briefing" style="--tint:${op.tint}"><span class="eyebrow">ДЕЛО № 000 · ОПЕРАЦИЯ ${n+1}/4</span><h1>${op.title}</h1><div class="brief-sector">${op.sector}</div><p>${op.brief}</p>
 <div class="terminal"><span>ЦЕЛЬ: собрать 3 капсулы-улики (${officeCleared?'1 уже есть из архива штаба':'архив штаба даёт стартовую улику'})</span><span>ПОМОЩНИК БЕГЛЕЦА: ${m.name} — ${m.attack}</span>${n===3?'<span class="warn">ПОСЛЕ ОХРАНЫ — ФЛАГМАН АРХИТЕКТОРА</span>':''}<span>НАГРАДА: ${op.reward} ₡ + бонус за улики</span></div>
 <button id="briefGo">НА ВЫЛЕТ 🚀</button><button id="briefBack" class="ghost">К ДОСЬЕ</button><p class="hint">Улики подбирай в космосе. Красные пунктирные зоны — предупреждения об атаке: уйди из них.</p></div>`;
 document.getElementById('briefGo').onclick=()=>{initAudio();launchCaseStage(n)};
 document.getElementById('briefBack').onclick=()=>menu('story');
}
function launchCaseStage(n){
 mode='story';currentCaseStage=n;reset();
 story.need=3;story.reports=officeCleared?1:0;caseTraceCount=story.reports;caseBeacons=0;caseSpawnedMini=false;caseFinalFlag=false;
 announce('ОПЕРАЦИЯ '+(n+1)+' · '+caseCurrent().sector,3.5,caseCurrent().title);sfx('signal');
}
function finishCaseStage(){
 if(state!=='play'||mode!=='story')return;
 const i=currentCaseStage,op=caseCurrent(),flawless=story.caught===0,reward=op.reward+story.reports*40+(flawless?80:0);
 credits+=reward;runCredits+=reward;bestScore=Math.max(bestScore,score);caseCleared[i]=true;caseBest[i]=Math.max(caseBest[i]||0,score);caseUnlocked=Math.max(caseUnlocked,Math.min(3,i+1));
 persist();state='caseResult';sfx('win');document.body.classList.remove('in-combat');bombBtn.style.display='none';pauseBtn.style.display='none';hideBtn.style.display='none';freezeBtn.style.display='none';panel.style.display='block';
 const next=i<3?CASE_OPERATIONS[i+1]:null;
 panel.innerHTML=`<div class="dialog-scene result win"><span class="eyebrow">ГРУППА РОЗЫСКА СОЧ · ДЕЛО № 000</span><h1>СЛЕД ОБНАРУЖЕН</h1><p><b>${op.sector}</b> очищен. Получена улика: «${op.evidence}».${next?' Новые координаты ведут в '+next.sector+'.':''}</p>
 <div class="result-grid"><div><b>${score.toLocaleString('ru-RU')}</b><span>ОЧКИ</span></div><div><b>${story.reports}/3</b><span>УЛИКИ</span></div><div><b>${kills}</b><span>СБИТО</span></div><div><b>+${reward}</b><span>КРЕДИТЫ ₡</span></div></div>
 <div class="terminal"><span>ПОБЕЖДЁН ПОМОЩНИК: ${MINI.find(m=>m.kind===op.mini)?.name||'НЕИЗВЕСТНЫЙ'}</span><span>${storyEvents[op.mini]||''}</span>${flawless?'<span>БЕЗ ОБНАРУЖЕНИЙ: +80 ₡</span>':''}</div>
 ${next?'<button id="nextCase">СЛЕДУЮЩАЯ ОПЕРАЦИЯ →</button>':''}<button id="upgradeShip" class="ghost">В АНГАР: УЛУЧШИТЬ КОРАБЛЬ</button><button id="backDossier" class="ghost">В ДОСЬЕ РОЗЫСКА</button></div>`;
 if(next)document.getElementById('nextCase').onclick=()=>startCaseStage(i+1);
 document.getElementById('upgradeShip').onclick=()=>menu('ship');
 document.getElementById('backDossier').onclick=()=>menu('story');
}
function showPrologue(){
 state='intro';panel.classList.remove('hangar');panel.style.display='block';document.body.classList.remove('in-combat');bombBtn.style.display='none';pauseBtn.style.display='none';hideBtn.style.display='none';freezeBtn.style.display='none';
 panel.innerHTML=`<div class="dialog-scene"><span class="eyebrow">07:59 · ШТАБНАЯ ГРУППА РОЗЫСКА СОЧ</span><h1>«ГДЕ АРХИТЕКТОР?»</h1><p>Ты работаешь в группе розыска СОЧ. На стол поступает дело № 000: Архитектор Бездны самовольно покинул космическую часть и улетел на секретном флагмане. Вместо рапорта он оставил сообщение: «НЕ ДОГОНИШЬ».</p><div class="terminal"><span>ДЕЛО № 000 · ЦЕЛЬ: «АРХИТЕКТОР БЕЗДНЫ»</span><span>ПОСЛЕДНИЙ СИГНАЛ: ОРБИТА «ОРИОН»</span><span class="warn">ВНИМАНИЕ: ЦЕЛЬ МОЖЕТ ПОДГОТОВИТЬ ЛОВУШКУ</span></div><p>Космический перехват — твоя основная работа. Но в архиве штаба можно найти полезные материалы и доступ к Нижнему рынку.</p><button id="prologueStart">НАЧАТЬ КОСМИЧЕСКИЙ РОЗЫСК 🚀</button><button id="prologueOffice" class="ghost">ПОИСКАТЬ УЛИКИ В ШТАБЕ</button><button id="prologueBack" class="ghost">К ДОСЬЕ</button></div>`;
 document.getElementById('prologueStart').onclick=()=>startCaseStage(Math.min(caseUnlocked,3));
 document.getElementById('prologueOffice').onclick=()=>{sfx('door');officeMission.start()};
 document.getElementById('prologueBack').onclick=()=>menu('story');
}
function showInterlude(){
 story.interlude=true;state='dialog';panel.style.display='block';
 panel.innerHTML=`<div class="dialog-scene"><span class="eyebrow">ПЕРЕХВАТ КОМАНДНОГО КАНАЛА</span><h1>«ДОГОНЯЙ, ЕСЛИ СМОЖЕШЬ»</h1><p>Помощник «Я Кавказ» отключён. Ты расшифровываешь голосовое сообщение беглеца. Архитектор заявляет, что дело № 000 подделано, и предлагает проверить главный архив.</p><div class="terminal"><span>СИГНАЛ: ФЛАГМАН АРХИТЕКТОРА</span><span>ЦЕЛЬ В ЗОНЕ ПРЯМОГО КОНТАКТА</span><span class="warn">БОЕВАЯ ТРЕВОГА · БУДЬ ГОТОВ</span></div><button id="dialogNext">ПРОДОЛЖИТЬ ПОГОНЮ →</button></div>`;
 document.getElementById('dialogNext').onclick=()=>{state='play';panel.style.display='none';last=performance.now();announce('ЦЕЛЬ ВПЕРЕДИ: АРХИТЕКТОР БЕЗДНЫ',3);sfx('alert')};
}
function changeSuspicion(delta){
 if(mode!=='story'||state!=='play')return;
 const mod=contraband.jammer&&delta>0?delta*.78:delta,before=story.suspicion;story.suspicion=clamp(story.suspicion+mod,0,100);
 if(before<70&&story.suspicion>=70){announce('БЕГЛЕЦ ЗАМЕТИЛ ТВОЙ СЛЕД!',2.6);sfx('alert')}
 if(story.suspicion>=100&&story.alarmCd<=0){story.caught++;story.alarmCd=18;story.suspicion=62;announce('ПЕРЕХВАТЧИКИ ОБНАРУЖИЛИ ТЕБЯ!',3);sfx('alert');hit(18);
  for(const s of [-1,1])makeFoe('zig',clamp(player.x+s*120,40,500),-40)}
}
function collectReport(){story.reports=Math.min(story.need,story.reports+1);caseTraceCount=story.reports;score+=240;credits+=20;runCredits+=20;changeSuspicion(-15);sfx('clue');popText(player.x,player.y-60,'УЛИКА '+story.reports+'/'+story.need,'#ffe48b',16);announce(['СИГНАЛ ДЕШИФРОВАН!','УЛИКА ОБНАРУЖЕНА!','ТЕЛЕМЕТРИЯ СОХРАНЕНА!','МАРШРУТ ПОДТВЕРЖДЁН!'][story.reports%4],1.8)}
function useHide(){if(state==='market')return marketMission.hide();if(state==='office')return officeMission.hide();if(state!=='play'||mode!=='story'||story.hideCd>0)return;story.hide=3.2;story.hideCd=17;changeSuspicion(-22);sfx('hide');announce('ALT+TAB · СИГНАТУРА КОРАБЛЯ СКРЫТА',2)}
function useFreeze(){if(state==='market')return marketMission.freeze();if(state==='office')return officeMission.freeze();if(state!=='play'||mode!=='story'||story.freezeCd>0)return;story.freeze=4;story.freezeCd=20;sfx('freeze');announce('EXCEL ЗАВИС · ВРЕМЯ ЗАМЕДЛЕНО',2)}
function setAbilityButton(btn,label,icon,cd,max){
 btn.disabled=cd>0;btn.style.setProperty('--cd',cd>0?(cd/max*360)+'deg':'0deg');
 const html=`<i>${icon}</i><span>${cd>0?Math.ceil(cd)+'с':label}</span>`;if(btn._html!==html){btn.innerHTML=html;btn._html=html}
}
function updateAbilityButtons(){if(mode!=='story'||state!=='play')return;setAbilityButton(hideBtn,'ALT+TAB','⌨',story.hideCd,17);setAbilityButton(freezeBtn,'EXCEL','❄',story.freezeCd,20)}
function showEndingChoice(){
 state='ending';document.body.classList.remove('in-combat');bombBtn.style.display='none';hideBtn.style.display='none';freezeBtn.style.display='none';pauseBtn.style.display='none';panel.style.display='block';
 caseCleared[3]=true;caseUnlocked=3;caseBest[3]=Math.max(caseBest[3]||0,score);persist();
 const secret=story.reports>=story.need&&story.suspicion<=55&&story.caught===0;
 panel.innerHTML=`<div class="dialog-scene"><span class="eyebrow">КОСМИЧЕСКИЙ РОЗЫСК · ФИНАЛ</span><h1>ЦЕЛЬ ПЕРЕХВАЧЕНА</h1><p>Ты вывел из строя флагман Архитектора. Он признаёт, что самовольно покинул часть, но утверждает: приказ № 000 содержал ошибку, а его отлёт был попыткой сохранить доказательства.</p><div class="terminal"><span>УЛИКИ: ${story.reports} / ${story.need}</span><span>ВНИМАНИЕ ЦЕЛИ: ${Math.floor(story.suspicion)}%</span><span>ОБНАРУЖЕНИЙ: ${story.caught}</span></div><p>Как завершить дело группы розыска?</p><button id="takeChair">ЗАДЕРЖАТЬ И ДОСТАВИТЬ В ЧАСТЬ</button><button id="rejectOrder">ПРОВЕРИТЬ ПРИКАЗ № 000</button><button id="goHome" ${secret?'':'disabled'}>СЕКРЕТНО: ТИХО ЗАКРЫТЬ ДЕЛО ${secret?'':'🔒'}</button><p class="hint">${secret?'Секретный финал доступен.':'Для секретной развязки собери 3 улики и не поднимай тревогу выше 55% к финалу; не допускай обнаружений.'}</p></div>`;
 document.getElementById('takeChair').onclick=()=>completeEnding('chief');document.getElementById('rejectOrder').onclick=()=>completeEnding('loop');
 if(secret)document.getElementById('goHome').onclick=()=>completeEnding('escape');
}
function completeEnding(kind){
 if(!ENDING_IDS.includes(kind))return;if(!caseEndings.includes(kind))caseEndings.push(kind);persist();state='ended';
 const choices={chief:['ЦЕЛЬ ЗАДЕРЖАНА','Ты доставляешь Архитектора в часть и передаёшь собранные материалы по делу № 000. Дальнейшую проверку проводят другие сотрудники. Тебе достаётся ещё три папки отчётов.'],loop:['ТАЙНА ПРИКАЗА № 000','Ты изучаешь найденные записи и обнаруживаешь сбой в штабном алгоритме. Архитектора доставляют для разбирательства, а дело пересматривают.'],escape:['ОПЕРАЦИЯ «ТИХИЙ ВОЗВРАТ»','Ты сохраняешь доказательства, убеждаешь Архитектора вернуться без космического преследования и закрываешь дежурство к 18:00.']};
 const [title,desc]=choices[kind];
 panel.innerHTML=`<div class="dialog-scene result win"><span class="eyebrow">ОПЕРАЦИЯ «НУЛЕВОЙ» ЗАВЕРШЕНА</span><h1>${title}</h1><p>${desc}</p><p>Концовок открыто: ${caseEndings.length}/3. Это вымышленная фантастическая история.</p><button id="endingMenu">К ДОСЬЕ РОЗЫСКА</button><button id="endingReplay" class="ghost">ПОВТОРИТЬ ФИНАЛ</button></div>`;
 document.getElementById('endingMenu').onclick=()=>menu('story');document.getElementById('endingReplay').onclick=()=>startCaseStage(3);
}
