/* =====================================================================
   ЦКС — ЛОКАЛЬНИЙ ПОМІЧНИК
   Працює повністю у вашому браузері: без інтернету, без зовнішніх сервісів,
   дані нікуди не відправляються. Це не нейромережа, а «розумний» помічник на
   правилах: розуміє прості запити українською та російською, вчиться на ваших
   задачах (шукає схожі) і має базу типових планів, яку можна доповнювати нижче.

   Що вміє:
   • «Розпиши план для виставки до 20.11»        — план кроків (з перевіркою схожих ваших задач)
   • «Додай підзадачі до «Виставка»»              — підзадачі до наявної задачі
   • «Створи задачу Підготувати КП до п’ятниці для Олени по проєкту Об’єкт А»
   • «Термін доставки МК до 17.10.2026 по проєкту Об’єкт А» — термін + автозадача + нагадування
   • «Аналіз процесів»                             — сильні/слабкі сторони, що довго, що швидко, ризики
   • «Що на сьогодні?», «Кому призначити?», «Чого не вистачає по проєкту …?»
   ===================================================================== */

/* ---------- База типових планів (можна редагувати й додавати свої) ---------- */
const AIKB=[
 {n:'Виставка / стенд',k:/виставк|выставк|експо|экспо|експозиц|стенд/,s:['Узгодити мету, бюджет і формат участі','Підготувати концепцію та бриф','Розробити дизайн-макет стенду','Погодити макет із керівництвом','Виготовити стенд і друковані матеріали','Організувати логістику та доставку','Змонтувати стенд на місці','Провести роботу на виставці та зібрати контакти','Демонтаж і повернення обладнання','Підготувати звіт і передати ліди відділу продажів']},
 {n:'Поставка / відвантаження МК',k:/поставк|відвантаж|отгруз|доставк|металоконструкц|(^|\s)мк(\s|$|[,.;:])/,s:['Узгодити специфікацію та графік поставки','Підтвердити готовність продукції (ВТК, маркування)','Замовити транспорт і погодити машини','Оформити супровідні документи (ТТН, накладні)','Завантажити та відвантажити машину','Контроль доставки та приймання на об’єкті','Закрити документи та акти приймання']},
 {n:'Монтаж / будівництво',k:/монтаж|будівн|строительств|будов|об['’ʼ]?єкт|объект/,s:['Підготувати майданчик і допуски','Завезти конструкції та матеріали','Підготувати бригаду, техніку, інструмент','Змонтувати конструкції за черговістю','Контроль якості та усунення зауважень','Підписати акти виконаних робіт','Передати об’єкт замовнику']},
 {n:'Виготовлення (цех)',k:/виготовл|изготовл|цех|виробниц|производств|зварюван|сварк/,s:['Отримати креслення КМД','Закупити метал і комплектуючі','Розкрій і заготівля','Збірка та зварювання','Контроль якості (ВТК)','Антикорозійний захист / фарбування','Маркування та передача на склад']},
 {n:'Тендер / кошторис / КП',k:/тендер|кошторис|смет|комерційн|коммерческ|(^|\s)кп(\s|$)|пропозиц/,s:['Зібрати вихідні дані та вимоги замовника','Розрахувати кошторис','Підготувати комерційну пропозицію / тендерну документацію','Внутрішнє погодження','Подати документи','Відповісти на запитання замовника','Підбити підсумки та зафіксувати результат']},
 {n:'Проєктування / документація',k:/проєкт|проект|креслен|кмд|(^|\s)км(\s|$)|документац|технічн/,s:['Сформувати технічне завдання','Розробити креслення / модель','Внутрішня перевірка та розрахунки','Погодити з замовником','Внести правки','Випустити остаточну документацію']},
 {n:'Маркетинг / контент',k:/маркетинг|бренд|реклам|соцмереж|сайт|контент|кампан|пост\b|публікац/,s:['Визначити мету та аудиторію','Скласти контент-план і бюджет','Підготувати матеріали (тексти, візуали)','Погодити матеріали','Запустити / опублікувати','Зібрати та проаналізувати результати']},
 {n:'Договір / документи',k:/договір|договор|контракт|підписан|подпис|угод/,s:['Підготувати проєкт договору','Юридична перевірка','Погодити умови зі сторонами','Підписати договір','Передати в бухгалтерію та архів']},
 {n:'Нарада / захід',k:/нарад|зустріч|встреч|презентац|захід|мероприят|семінар|конференц/,s:['Визначити мету та учасників','Підготувати матеріали й порядок денний','Розіслати запрошення','Провести захід','Зафіксувати рішення та розіслати протокол']}
];
const AIGEN=['Уточнити вимоги та очікуваний результат','Скласти план, терміни й ресурси','Підготувати необхідні матеріали / документи','Виконати основну роботу','Перевірити якість і погодити результат','Закрити задачу: звіт та передача результату'];

/* ---------- Стан ---------- */
const AI={open:false,msgs:[],pend:{},n:0,ready:false};
const aiId=()=>'p'+(++AI.n);

/* ---------- Розуміння тексту ---------- */
const aiN=s=>String(s||'').toLowerCase().replace(/ё/g,'е').replace(/ы/g,'и').replace(/э/g,'е').replace(/ъ/g,"'").replace(/[’ʼ`´]/g,"'").replace(/і/g,'и').replace(/ї/g,'и').replace(/є/g,'е');
const AISTOP=new Set(['для','при','над','про','або','чи','що','це','по','на','до','от','від','та','за','из','із','как','что','или','это','его','щодо','під','підзадачі','задачу','задачі']);
const aiTok=s=>aiN(s).split(/[^a-zа-я0-9']+/).filter(w=>w.length>=2&&!AISTOP.has(w)).map(w=>w.slice(0,5));
function aiSim(a,b){const A=new Set(aiTok(a)),B=new Set(aiTok(b));if(!A.size||!B.size)return 0;let i=0;A.forEach(x=>{if(B.has(x))i++});return i/(A.size+B.size-i)}
const aiCap=s=>s?s.charAt(0).toUpperCase()+s.slice(1):s;
const aiClean=s=>String(s||'').replace(/^[\s:,.\-–—;]+|[\s:,.\-–—;]+$/g,'').replace(/\s{2,}/g,' ').trim();
function aiDate(text){const n=aiN(text),td=dnum(today());let m;
  const cut=(m0)=>aiClean((text.slice(0,m0.index)+' '+text.slice(m0.index+m0[0].length)).replace(/\s(до|на|к|до|в|у)\s*$/i,'').replace(/(^|\s)(до|на|к)\s*(?=\s|$)/i,' '));
  if(m=n.match(/(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{2,4}))?/)){const dd=+m[1],mm=+m[2];if(dd>=1&&dd<=31&&mm>=1&&mm<=12){let yy=m[3]?+m[3]:new Date().getFullYear();if(yy<100)yy+=2000;let s=yy+'-'+String(mm).padStart(2,'0')+'-'+String(dd).padStart(2,'0');if(!m[3]&&dnum(s)<td)s=(yy+1)+s.slice(4);return {d:s,rest:cut(m)}}}
  if(m=n.match(/через\s+(\d+)\s*(дн|ден|тиж|нед|мис|мес)/)){const k=+m[1],u=m[2],days=u=='дн'||u=='ден'?k:u=='тиж'||u=='нед'?k*7:k*30;return {d:dstr(td+days),rest:cut(m)}}
  if(m=n.match(/(?:^|\s)(післязавтра|послезавтра)/)){return {d:dstr(td+2),rest:cut(m)}}
  if(m=n.match(/(?:^|\s)(завтра)/)){return {d:dstr(td+1),rest:cut(m)}}
  if(m=n.match(/(?:^|\s)(сьогодни|сегодня|сьогодни)/)){return {d:dstr(td),rest:cut(m)}}
  const WD=[[/понедил\S*|понедел\S*/,0],[/вивтор\S*|вторник\S*/,1],[/серед[аиуою]\b|средa?\S*|среду/,2],[/четвер\S*|четверг\S*/,3],[/п'ятн\S*|пятн\S*/,4],[/субот\S*|суббот\S*/,5],[/недил\S*|воскрес\S*/,6]];
  for(const w of WD){if(m=n.match(w[0])){const cur=(td+3)%7;let k=(w[1]-cur+7)%7;if(k==0)k=7;return {d:dstr(td+k),rest:cut(m)}}}
  return {d:'',rest:text}}
function aiUsers(text){const T=aiN(text),res=[];S.users.forEach(u=>{const ws=aiN(u.name).split(/\s+/).filter(w=>w.length>2);if(ws.some(w=>new RegExp("(^|[^а-яa-z'])"+w.slice(0,Math.max(4,w.length-1)).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).test(T)))res.push(u)});return res}
function aiProj(text){const d=D();if(!d)return null;const T=aiN(text);let best=null,bl=0;d.projects.forEach(p=>{const nm=aiN(p.name).trim(),tk=aiTok(p.name);if(!nm)return;const hit=T.includes(nm)||(tk.length&&tk.every(w=>aiTok(text).includes(w)));if(hit&&nm.length>bl){best=p;bl=nm.length}});return best}
function aiCat(text){const d=D();if(!d)return null;const T=aiN(text);return (d.cats||[]).find(c=>T.includes(aiN(c.name)))||null}
function aiSubject(q){const m=q.match(/[«"“]([^»"”]{2,})[»"”]/);if(m)return aiClean(m[1]);
  let s=q.replace(/(будь ласка|пліз|please|пожалуйста)[,\s]*/ig,' ').replace(/(розпиши|розписати|розпишіть|розбий|склади|скласти|створи|створити|додай|додати|зроби|сформуй|распиши|расписать|составь|создай|создать|добавь|план(\s+дій|\s+робіт|\s+действий)?|підзадач[іи]?|подзадач[иы]?|нову|нове|нова|нову задачу|задачу|завдання|задача)(?=[\s:,.]|$)/ig,' ');
  s=aiClean(s).replace(/^(для|по|на|до|про|щодо|під|для)\s+/i,'');return aiClean(s)}

/* ---------- Кроки плану: спочатку схожі ваші задачі, потім база типових планів ---------- */
function aiSteps(subject){let best=null,bs=0;
  vis().forEach(dd=>dd.tasks.forEach(t=>{if(t.subs.length<2)return;const s=aiSim(subject,t.title);if(s>bs){bs=s;best=t}}));
  if(best&&bs>=.34)return {src:'Взяв підзадачі зі схожої задачі «'+best.title+'» (збіг '+Math.round(bs*100)+'%)',steps:best.subs.map(s=>s.t)};
  const low=String(subject).toLowerCase(),k=AIKB.find(x=>x.k.test(low));
  if(k)return {src:'Типовий план: '+k.n+' (базу планів можна доповнювати в ai.js)',steps:k.s.slice()};
  return {src:'Універсальний план — доповніть кроки під вашу задачу',steps:AIGEN.slice()}}

/* ---------- Картки з попереднім переглядом ---------- */
function aiStepRows(steps){return steps.map((s,i)=>`<label class="ai-st"><input type="checkbox" checked><input type="text" value="${esc(s)}"></label>`).join('')}
function aiOptLine(o){const d=D(),a=[];if(o.end)a.push('термін: '+fmtD(o.end));if(o.project){const p=d.projects.find(x=>x.id==o.project);if(p)a.push('проєкт: '+esc(p.name))}if(o.who&&o.who.length)a.push('виконавці: '+o.who.map(u=>esc(un(u))).join(', '));if(o.cat){const c=(d.cats||[]).find(x=>x.id==o.cat);if(c)a.push('категорія: '+esc(c.name))}return a.length?`<div class="mu">${a.join(' · ')}</div>`:''}
function aiPlanCard(subject,o){const p=aiSteps(subject),id=aiId();AI.pend[id]={subject:subject,o:o};
  return `<div data-pend="${id}"><b>План: ${esc(aiCap(subject))}</b><div class="mu">${esc(p.src)}</div>${aiOptLine(o)}<div style="margin-top:6px">${aiStepRows(p.steps)}</div><div class="ai-b">${o.taskId?`<button class="b" onclick="aiApply('${id}','sub')">Додати підзадачі до «${esc(tgTitle(o.taskId))}»</button>`:`<button class="b" onclick="aiApply('${id}','task')">Створити задачу з підзадачами</button><button class="b2" onclick="aiApply('${id}','split')">Кроки — окремі задачі</button>`}</div></div>`}
const tgTitle=id=>{const t=D().tasks.find(x=>x.id==id);return t?t.title:''};
function aiRead(id){const r=document.querySelector('#aip [data-pend="'+id+'"]');if(!r)return [];return [...r.querySelectorAll('.ai-st')].filter(x=>x.querySelector('input[type=checkbox]').checked).map(x=>aiClean(x.querySelector('input[type=text]').value)).filter(Boolean)}
function aiMk(o){const t={id:uid(),title:o.title,status:ST[0],start:o.start||'',end:o.end||'',who:o.who||[],subs:(o.subs||[]).map(s=>({id:uid(),t:s,done:false,who:[]})),project:o.project||'',cat:o.cat||'',pri:'mid',ts:Date.now(),doneAt:''};D().tasks.push(t);return t}
function aiApply(id,mode){const P=AI.pend[id],d=D();if(!P||!d)return;const steps=aiRead(id),o=P.o;if(!steps.length)return aiSay('Відмітьте хоча б один крок.');
  if(mode=='sub'){const t=d.tasks.find(x=>x.id==o.taskId);if(!t)return aiSay('Не знайшов задачу.');steps.forEach(s=>t.subs.push({id:uid(),t:s,done:false,who:[]}));autoSt(t);sv();return aiSay(`✅ Додано підзадач: <b>${steps.length}</b> до задачі «${esc(t.title)}». <a onclick="aiOpen('${t.id}')">Відкрити</a>`)}
  if(mode=='task'){const t=aiMk({title:aiCap(P.subject),start:today(),end:o.end,who:o.who,project:o.project,cat:o.cat,subs:steps});sv();return aiSay(`✅ Створено задачу «${esc(t.title)}» з підзадачами: <b>${steps.length}</b>. <a onclick="aiOpen('${t.id}')">Відкрити</a>`)}
  const n=steps.length,a=dnum(today()),b=o.end?Math.max(a,dnum(o.end)):null,made=[];
  steps.forEach((s,i)=>{let st='',en='';if(b!=null){const tot=b-a+1;st=dstr(a+Math.floor(i*tot/n));en=dstr(Math.max(a+Math.floor(i*tot/n),a+Math.floor((i+1)*tot/n)-1))}made.push(aiMk({title:s,start:st,end:en,who:o.who,project:o.project,cat:o.cat}))});
  sv();aiSay(`✅ Створено окремих задач: <b>${made.length}</b>${b!=null?' (строки розподілено до '+fmtD(o.end)+')':''}. Відкрийте «Таймлайн» чи «Календар», щоб побачити їх.`)}
function aiOpen(tid){const dd=S.depts.find(x=>x.tasks.some(t=>t.id==tid));if(!dd)return;S.dept=dd.id;const pg=dd.pages.find(p=>p.type=='tasks');if(pg)S.page=pg.id;op(tid)}

/* ---------- Розбір запитів ---------- */
function aiFindTask(text){const T=text,m=T.match(/[«"“]([^»"”]{2,})[»"”]/),key=m?m[1]:aiSubject(T);if(!key)return null;let best=null,bs=0;const d=D();d.tasks.filter(t=>!t.arch).forEach(t=>{const s=aiN(t.title).includes(aiN(key))?1:aiSim(key,t.title);if(s>bs){bs=s;best=t}});return bs>=.4?best:null}
function aiCreate(q){const dt=aiDate(q);let rest=dt.rest;const us=aiUsers(rest),pj=aiProj(rest),ct=aiCat(rest);
  us.forEach(u=>aiN(u.name).split(/\s+/).forEach(w=>{if(w.length>2)rest=rest.replace(new RegExp('(для|на|виконавець|відповідальн\\S*|призначити|назначить)?\\s*'+w.slice(0,Math.max(4,w.length-1)).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\S*','ig'),' ')}));
  if(pj)rest=rest.replace(new RegExp('(по|в|у|для)?\\s*(проєкт\\S*|проект\\S*)?\\s*'+pj.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'ig'),' ');
  const parts=aiSubject(rest).split(/\s*;\s*|\n+/).map(aiClean).filter(x=>x.length>1);return {items:parts,end:dt.d,who:us.map(u=>u.id),project:pj?pj.id:'',cat:ct?ct.id:''}}
function aiCreateCard(c){const id=aiId();AI.pend[id]={c:c};return `<div data-pend="${id}"><b>Створити ${c.items.length>1?'задачі':'задачу'}:</b>${aiOptLine({end:c.end,project:c.project,who:c.who,cat:c.cat})}<div style="margin-top:6px">${aiStepRows(c.items.map(aiCap))}</div><div class="ai-b"><button class="b" onclick="aiApplyCreate('${id}')">Створити</button></div></div>`}
function aiApplyCreate(id){const P=AI.pend[id],c=P&&P.c;if(!c)return;const items=aiRead(id);if(!items.length)return aiSay('Відмітьте хоча б одну задачу.');const L=items.map(t=>aiMk({title:t,start:c.end?today():'',end:c.end,who:c.who,project:c.project,cat:c.cat}));sv();aiSay('✅ Створено: '+L.map(t=>`«${esc(t.title)}» <a onclick="aiOpen('${t.id}')">відкрити</a>`).join('; '))}

/* ---------- Термін проєкту → автозадача ---------- */
function aiMs(q){const dt=aiDate(q);if(!dt.d)return null;const d=D(),pj=aiProj(q),X=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');let nm=dt.rest;
  if(pj)nm=nm.replace(new RegExp('(по|в|у|для)?\\s*(проєкт\\S*|проект\\S*)?\\s*'+X(pj.name),'ig'),' ');
  nm=aiClean(nm.replace(/\s+(по|в|у|для)\s+(проєкт\S*|проект\S*)\s*$/i,' ').replace(/^(створи|додай|додати|добавь|створити)\s+/i,''));
  if(!/^(термін|строк|срок|дедлайн)/i.test(nm))nm=nm?'Термін '+nm:'Термін';
  let tpl=null,bs=0;(d.tpl||[]).forEach(t=>{const s=aiSim(nm,t.m);if(s>bs){bs=s;tpl=t}});return {name:aiCap(nm),date:dt.d,project:pj,task:(tpl&&bs>=.3)?tpl.t:'Виконати: '+nm.replace(/^(термін|строк|срок|дедлайн)\s*/i,'')}}
function aiMsCard(m){const d=D(),id=aiId();AI.pend[id]={m:m};return `<div data-pend="${id}"><b>Новий термін проєкту</b><div class="mu">Створю віху на графіку, автозадачу з датою та нагадування за 3 дні.</div><div style="margin-top:6px"><div class="ai-st"><span class="mu" style="width:70px">Назва</span><input type="text" data-f="name" value="${esc(m.name)}"></div><div class="ai-st"><span class="mu" style="width:70px">Дата</span><input type="date" data-f="date" value="${m.date}"></div><div class="ai-st"><span class="mu" style="width:70px">Задача</span><input type="text" data-f="task" value="${esc(m.task)}"></div><div class="ai-st"><span class="mu" style="width:70px">Проєкт</span><select data-f="proj">${d.projects.map(p=>`<option value="${p.id}" ${m.project&&m.project.id==p.id?'selected':''}>${esc(p.name)}</option>`).join('')||'<option value="">— немає проєктів —</option>'}</select></div></div><div class="ai-b"><button class="b" onclick="aiApplyMs('${id}')">Створити термін і задачу</button></div></div>`}
function aiApplyMs(id){const r=document.querySelector('#aip [data-pend="'+id+'"]'),v=f=>r.querySelector('[data-f="'+f+'"]').value.trim(),p=pj2(v('proj'));if(!p)return aiSay('Спершу створіть проєкт (сторінка «Проєкти»).');if(!v('name')||!v('date'))return aiSay('Вкажіть назву та дату.');
  p.ms=p.ms||[];const x={id:uid(),name:v('name'),date:v('date'),title:v('task')||('Виконати: '+v('name')),remind:3,task:''};p.ms.push(x);msMkTask(p,x);sv();aiSay(`✅ Термін «${esc(x.name)}» (${fmtD(x.date)}) додано до проєкту «${esc(p.name)}». Автозадача створена, нагадування — за 3 дні (змінюється в картці проєкту).`)}

/* ---------- Що на сьогодні, кому призначити, чого не вистачає ---------- */
function aiToday(){const td=dnum(today()),me1=S.me;let L=[];vis().forEach(dd=>dd.tasks.forEach(t=>{if(t.arch||t.status==ST[3])return;const mine=t.who.includes(me1),due=t.end&&dnum(t.end)<=td;if((mine&&(due||t.status==ST[2]))||(t.ms&&due))L.push({t:t,dd:dd,k:t.end?dnum(t.end)-td:99})}));L.sort((a,b)=>a.k-b.k);
  if(!L.length)return 'На сьогодні для вас нічого не горить 👍 Можна взяти задачу з «Робочі задачі» або попросити мене розписати план.';
  return `<b>Ваш день</b><ul>${L.slice(0,12).map(o=>`<li><a onclick="aiOpen('${o.t.id}')">${esc(o.t.title)}</a> <span class="mu">${o.k<0?'прострочено '+(-o.k)+' дн.':o.k==0?'сьогодні':o.k<99?'через '+o.k+' дн.':'в процесі'}</span></li>`).join('')}</ul>`}
function aiWho(){const d=D(),cnt={};d.members.forEach(u=>cnt[u]=0);d.tasks.forEach(t=>{if(t.arch||t.status==ST[3])return;t.who.forEach(u=>{if(cnt[u]!=null)cnt[u]++})});const a=Object.keys(cnt).map(u=>[u,cnt[u]]).sort((x,y)=>x[1]-y[1]);if(!a.length)return 'У відділі ще немає співробітників.';
  return `<b>Навантаження (невиконані задачі)</b>${a.map(x=>`<div class="hb"><span>${esc(un(x[0]))}</span><div class="bar"><b style="width:${100*x[1]/Math.max(1,a[a.length-1][1])}%"></b></div><b>${x[1]}</b></div>`).join('')}<div style="margin-top:6px">Найменше зайнятий(а): <b>${esc(un(a[0][0]))}</b> (${a[0][1]}). Далі: ${a.slice(1,3).map(x=>esc(un(x[0]))+' ('+x[1]+')').join(', ')||'—'}.</div>`}
function aiGaps(q){const d=D(),pj=aiProj(q);if(!pj)return 'Скажіть, про який проєкт мова, наприклад: «чого не вистачає по проєкту Об’єкт А?»';
  const T=d.tasks.filter(t=>t.project==pj.id),base=pj.name+' '+T.map(t=>t.title).join(' ')+' '+(pj.desc||''),low=base.toLowerCase(),k=AIKB.find(x=>x.k.test(low))||{n:'Універсальний',s:AIGEN},miss=k.s.filter(s=>!T.some(t=>aiSim(s,t.title)>=.3));
  if(!miss.length)return `По проєкту «${esc(pj.name)}» (план «${esc(k.n)}») усі типові кроки вже покриті задачами 👍`;
  const id=aiId();AI.pend[id]={subject:pj.name,o:{project:pj.id}};return `<div data-pend="${id}"><b>Можливо, пропущено по «${esc(pj.name)}»</b><div class="mu">Порівняв ваші задачі з типовим планом «${esc(k.n)}».</div><div style="margin-top:6px">${aiStepRows(miss)}</div><div class="ai-b"><button class="b" onclick="aiApply('${id}','split')">Створити вибране як задачі</button></div></div>`}

/* ---------- Аналіз процесів ---------- */
function aiAnalyze(){const d=D();if(!d)return 'Оберіть відділ.';const td=dnum(today()),all=d.tasks,open=all.filter(t=>t.status!=ST[3]&&!t.arch),done=all.filter(t=>t.status==ST[3]&&t.doneAt);
  const st0=t=>t.start?dnum(t.start):(t.ts?Math.floor(t.ts/ONE):null),dur=t=>{const s=st0(t);return s==null?null:Math.max(1,dnum(t.doneAt)-s+1)};
  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0,r1=x=>Math.round(x*10)/10;
  const D1=done.map(t=>({t:t,k:dur(t)})).filter(x=>x.k!=null);
  const grp=f=>{const m={};D1.forEach(x=>{const k=f(x.t);if(!k)return;(m[k]=m[k]||[]).push(x.k)});return Object.keys(m).map(k=>({k:k,n:m[k].length,a:avg(m[k])})).sort((a,b)=>b.a-a.a)};
  const byCat=grp(catN),byProj=grp(pn),byWho={};D1.forEach(x=>x.t.who.forEach(u=>{(byWho[u]=byWho[u]||[]).push(x.k)}));const who=Object.keys(byWho).map(u=>({k:un(u),n:byWho[u].length,a:avg(byWho[u])})).sort((a,b)=>b.a-a.a);
  const withEnd=done.filter(t=>t.end),onTime=withEnd.filter(t=>t.doneAt<=t.end),otp=withEnd.length?Math.round(100*onTime.length/withEnd.length):null;
  const gaps={};done.concat(open).forEach(t=>{const s=t.subs.filter(x=>x.done&&x.doneAt).sort((a,b)=>a.doneAt<b.doneAt?-1:1);let prev=st0(t);s.forEach(x=>{const g=Math.max(0,dnum(x.doneAt)-(prev==null?dnum(x.doneAt):prev));(gaps[aiN(x.t).trim()]=gaps[aiN(x.t).trim()]||{t:x.t,v:[]}).v.push(g);prev=dnum(x.doneAt)})});
  const stages=Object.values(gaps).map(o=>({t:o.t,n:o.v.length,a:avg(o.v)})),slowSt=stages.filter(x=>x.a>=2).sort((a,b)=>b.a-a.a).slice(0,3),fastSt=stages.filter(x=>x.a<=1).sort((a,b)=>a.a-b.a).slice(0,3);
  const overdue=open.filter(t=>t.end&&dnum(t.end)<td&&t.status!=ST[1]),stuck=open.filter(t=>t.status==ST[2]&&st0(t)!=null&&td-st0(t)>14&&prog(t)<50),risks=riskTasks(d),noDates=open.filter(t=>!t.end).length,noSubs=open.filter(t=>!t.subs.length).length;
  const wl={};open.forEach(t=>t.who.forEach(u=>wl[u]=(wl[u]||0)+1));const wa=Object.keys(wl).map(u=>[u,wl[u]]).sort((a,b)=>b[1]-a[1]),wavg=wa.length?avg(wa.map(x=>x[1])):0;
  const cnt=(a,b)=>done.filter(t=>dnum(t.doneAt)>=td-a&&dnum(t.doneAt)<=td-b).length,last=cnt(13,0),prev=cnt(27,14);
  const strong=[],weak=[],rec=[];
  if(otp!=null&&withEnd.length>=3){if(otp>=80)strong.push(`Дедлайни дотримуються: <b>${otp}%</b> задач завершено вчасно.`);else if(otp<60){weak.push(`Часто зриваються строки: вчасно закрито лише <b>${otp}%</b> задач.`);rec.push('Закладайте запас 15–20% до строків і розбивайте великі задачі на підзадачі з проміжними датами.')}}
  if(byCat.length>1){const f=byCat[byCat.length-1],s=byCat[0];strong.push(`Швидше за все виконуються задачі категорії «${esc(f.k)}»: у середньому <b>${r1(f.a)} дн.</b>`);if(s.a>=f.a*2&&s.a>=3){weak.push(`Найдовше тягнуться задачі категорії «${esc(s.k)}»: у середньому <b>${r1(s.a)} дн.</b>`);rec.push(`Подивіться, чому категорія «${esc(s.k)}» повільна: чи немає зовнішніх погоджень, які можна почати раніше.`)}}
  if(last>prev&&last>=2)strong.push(`Темп зростає: за 14 днів виконано <b>${last}</b> проти ${prev} за попередні 14.`);else if(prev>last&&prev>=3){weak.push(`Темп падає: за 14 днів виконано <b>${last}</b> проти ${prev} раніше.`)}
  if(wa.length>1&&wa[0][1]>=5&&wa[0][1]>wavg*1.4){weak.push(`Нерівномірне навантаження: у <b>${esc(un(wa[0][0]))}</b> ${wa[0][1]} невиконаних задач (середнє ${r1(wavg)}).`);rec.push(`Передайте частину задач від ${esc(un(wa[0][0]))} комусь із менш завантажених (запитайте мене: «кому призначити?»).`)}else if(wa.length>1)strong.push('Навантаження розподілено рівномірно.');
  if(overdue.length){weak.push(`Прострочено зараз: <b>${overdue.length}</b> задач${overdue.length>1?'':'а'}.`);rec.push('Перегляньте прострочені задачі: перенесіть дати, що нереальні, або закрийте неактуальні.')}else if(open.length)strong.push('Прострочених задач немає.');
  if(slowSt.length){weak.push('Вузькі місця (етапи, після яких довго немає руху): '+slowSt.map(x=>`«${esc(x.t)}» — ~${r1(x.a)} дн.`).join('; '));rec.push(`Розбийте етап «${esc(slowSt[0].t)}» на менші кроки й призначте окремого відповідального.`)}
  if(stuck.length){weak.push(`Застрягли в статусі «В процесі» понад 14 днів: <b>${stuck.length}</b> (${stuck.slice(0,3).map(t=>'«'+esc(t.title)+'»').join(', ')}).`);rec.push('Для задач, що застрягли, уточніть, що блокує, і запишіть це в підзадачу.')}
  if(open.length&&noDates/open.length>.3){weak.push(`Багато задач без дат: <b>${noDates}</b> із ${open.length}. Складно планувати та нагадувати.`);rec.push('Проставте дати кінця — тоді працюватимуть нагадування, календар і таймлайн.')}
  if(open.length&&noSubs/open.length>.5)rec.push('Більшість задач без підзадач: розпишіть кроки — тоді буде видно прогрес і вузькі місця (скажіть мені «розпиши план»).');
  const bar=(a,m)=>`<div class="hb"><span>${esc(a.k)}</span><div class="bar"><b style="width:${Math.max(4,100*a.a/m)}%;background:#5b7fb0"></b></div><b>${r1(a.a)} дн.</b></div>`,mx=Math.max(1,...byProj.map(x=>x.a),...byCat.map(x=>x.a),...who.map(x=>x.a));
  const enough=D1.length>=3;
  return `<b>Аналіз процесів відділу «${esc(d.name)}»</b><div class="mu">Виконано задач: ${done.length} · у роботі: ${open.length}${D1.length?' · середній цикл: '+r1(avg(D1.map(x=>x.k)))+' дн.':''}${otp!=null?' · вчасно: '+otp+'%':''}</div>`
   +(enough?'':'<div class="mu" style="margin-top:6px">Завершених задач з датами поки мало (потрібно 3+), тому висновки неповні. Ось що видно вже зараз.</div>')
   +(strong.length?`<h5>✅ Сильні сторони</h5><ul>${strong.map(x=>'<li>'+x+'</li>').join('')}</ul>`:'')
   +(weak.length?`<h5>⚠ Слабкі сторони</h5><ul>${weak.map(x=>'<li>'+x+'</li>').join('')}</ul>`:'')
   +(byProj.length?`<h5>⏱ Скільки займають проєкти</h5>${byProj.slice(0,5).map(a=>bar(a,mx)).join('')}`:'')+(byCat.length?`<h5>⏱ Скільки займають категорії</h5>${byCat.slice(0,5).map(a=>bar(a,mx)).join('')}`:'')+(who.length>1?`<h5>⏱ Середній цикл по виконавцях</h5>${who.slice(0,5).map(a=>bar(a,mx)).join('')}`:'')
   +(D1.length>=2?`<h5>🐢 Найдовші задачі</h5><ul>${D1.slice().sort((a,b)=>b.k-a.k).slice(0,3).map(x=>`<li>«${esc(x.t.title)}» — ${x.k} дн.</li>`).join('')}</ul><h5>⚡ Найшвидші задачі</h5><ul>${D1.slice().sort((a,b)=>a.k-b.k).slice(0,3).map(x=>`<li>«${esc(x.t.title)}» — ${x.k} дн.</li>`).join('')}</ul>`:'')
   +(fastSt.length?`<h5>⚡ Етапи, що йдуть швидко</h5><ul>${fastSt.map(x=>`<li>«${esc(x.t)}» — ~${r1(x.a)} дн.</li>`).join('')}</ul>`:'')
   +(risks.length?`<h5>🔮 Ризик зриву</h5><ul>${risks.slice(0,4).map(o=>`<li><a onclick="aiOpen('${o.t.id}')">${esc(o.t.title)}</a> <span class="mu">час ${Math.round(o.el*100)}% · готово ${Math.round(o.pr*100)}%</span></li>`).join('')}</ul>`:'')
   +(rec.length?`<h5>💡 Рекомендації</h5><ul>${rec.map(x=>'<li>'+x+'</li>').join('')}</ul>`:'')}

/* ---------- Головний розбір ---------- */
const AIHELP=`<b>Привіт! Я локальний помічник.</b> Працюю у вашому браузері, без інтернету.<ul><li>«Розпиши план для виставки до 20.11»</li><li>«Додай підзадачі до «Підготувати виставку»»</li><li>«Створи задачу Підготувати КП до п’ятниці для Олени»</li><li>«Термін доставки МК до 17.10.2026 по проєкту …»: створю термін, задачу й нагадування</li><li>«Аналіз процесів»: сильні й слабкі сторони, що довго, що швидко</li><li>«Що на сьогодні?», «Кому призначити?», «Чого не вистачає по проєкту …?»</li></ul>`;
function aiReply(q){const n=aiN(q),d=D();
  if(!d&&!/^(привит|привет|помощ|допом|help|\?)/.test(n))return 'Спершу оберіть відділ ліворуч.';
  if(/^(привит|привет|добрии|добрый|help|допом|помощ|що ти вмиеш|что ты умеешь|\?)/.test(n))return AIHELP;
  if(/анализ|аналитик|сильн|слабк|эффективн|ефективн|статистик|вузьк|узк|процес/.test(n))return aiAnalyze();
  if(/(що|что|шо).{0,10}(сьогодн|сегодн)|мии день|мои дела|на сьогодн|на сегодн|що робити|что делать|плани на день/.test(n))return aiToday();
  if(/кому (призначити|дати|доручити|назначить|поручить)|на кого (призначити|назначить)/.test(n))return aiWho();
  if(/чого не вистача|чего не хвата|що ще (треба|потрибно)|что еще|пропущен|що забули|что забыли|перевир.{0,6}повнот|перевер.{0,6}полнот/.test(n))return aiGaps(q);
  if(/(термин|строк|срок|дедлайн)/.test(n)&&!/(пидзадач|подзадач|розпиши|расписать|план)/.test(n)){const m=aiMs(q);if(m)return aiMsCard(m);return 'Вкажіть дату терміну, наприклад: «Термін доставки МК до 17.10.2026 по проєкту Об’єкт А».'}
  if(/(пидзадач|подзадач)/.test(n)){const t=aiFindTask(q);if(!t)return 'До якої задачі додати підзадачі? Вкажіть її назву в лапках: «…». Наприклад: додай підзадачі до «Підготувати виставку».';
    const lm=q.match(/[:：]\s*(.+)$/);const list=lm?lm[1].split(/\s*[;,\n]\s*/).map(aiClean).filter(x=>x.length>1):[];
    if(list.length>=2){const id=aiId();AI.pend[id]={subject:t.title,o:{taskId:t.id}};return `<div data-pend="${id}"><b>Додати підзадачі до «${esc(t.title)}»</b><div style="margin-top:6px">${aiStepRows(list.map(aiCap))}</div><div class="ai-b"><button class="b" onclick="aiApply('${id}','sub')">Додати</button></div></div>`}
    return aiPlanCard(t.title,{taskId:t.id})}
  if(/розпиши|розписа|распиши|расписать|склади план|составь план|скласти план|(^|\s)план(\s|$)|декомпоз|розбий|разбей/.test(n)){const dt=aiDate(q),sub=aiSubject(dt.rest);if(!sub||sub.length<3)return 'Для чого розписати план? Наприклад: «розпиши план для виставки до 20.11».';
    const ex=aiFindTask(sub);return aiPlanCard(sub,{end:dt.d,who:aiUsers(dt.rest).map(u=>u.id),project:(aiProj(dt.rest)||{}).id||'',cat:(aiCat(dt.rest)||{}).id||'',taskId:ex&&/(до задач|в задач|у задач|к задач)/.test(n)?ex.id:''})}
  if(/(створи|створити|додай|додати|добавь|создай|создать|нова задача|новая задача|нове завдання)/.test(n)){const c=aiCreate(q);if(!c.items.length)return 'Що саме створити? Наприклад: «створи задачу Підготувати КП до п’ятниці для Олени».';return aiCreateCard(c)}
  const sub=aiClean(q);if(sub.length>=4){const id=aiId();AI.pend[id]={q:sub};return `Не зовсім зрозумів запит. Що зробити з «${esc(sub)}»?<div class="ai-b"><button class="b2" onclick="aiAsk('розпиши план для '+AI.pend['${id}'].q)">Розписати план</button><button class="b2" onclick="aiAsk('створи задачу '+AI.pend['${id}'].q)">Створити задачу</button></div>`}
  return AIHELP}

/* ---------- Інтерфейс помічника ---------- */
function aiSay(h){AI.msgs.push({r:'a',h:h});aiRender()}
function aiRender(){const m=document.getElementById('aim');if(!m)return;m.innerHTML=AI.msgs.map(x=>`<div class="aim ${x.r}">${x.r=='u'?esc(x.h):x.h}</div>`).join('');m.scrollTop=m.scrollHeight}
function aiSubmit(){const t=document.getElementById('aii'),q=t.value.trim();if(!q)return;t.value='';AI.msgs.push({r:'u',h:q});aiRender();setTimeout(()=>{let h;try{h=aiReply(q)}catch(e){h='Щось пішло не так: '+esc(e.message||e)}aiSay(h)},180)}
const aiAsk=q=>{document.getElementById('aii').value=q;aiSubmit()};
function aiVis(){const p=document.getElementById('aip'),b=document.getElementById('aib');if(!p||!b)return;const on=!!(S&&S.me);b.style.display=on?'':'none';p.classList.toggle('open',on&&AI.open)}
function aiMount(){if(!S||!S.me||(typeof SH!='undefined'&&SH)){const b=document.getElementById('aib');if(b)b.style.display='none';const p=document.getElementById('aip');if(p)p.classList.remove('open');AI.msgs=[];AI.pend={};AI.open=false;return}
  if(!document.getElementById('aib')){const b=document.createElement('button');b.id='aib';b.className='aib';b.textContent='✦ Помічник';b.onclick=()=>{AI.open=!AI.open;aiVis();if(AI.open){const i=document.getElementById('aii');if(i)i.focus()}};document.body.appendChild(b);
    const p=document.createElement('div');p.id='aip';p.className='aip';p.innerHTML='<div class="aip-h"><b>✦ Помічник</b><span class="mu">локально · без інтернету</span><button class="x" onclick="AI.open=false;aiVis()">✕</button></div><div class="aip-m" id="aim"></div><div class="aip-c"><button onclick="aiAsk(\'Що на сьогодні?\')">Що на сьогодні?</button><button onclick="aiAsk(\'Аналіз процесів\')">Аналіз процесів</button><button onclick="document.getElementById(\'aii\').value=\'Розпиши план для \';document.getElementById(\'aii\').focus()">Розписати план</button><button onclick="aiAsk(\'Кому призначити?\')">Кому призначити?</button></div><div class="aip-i"><textarea id="aii" rows="2" placeholder="Напишіть запит… напр.: розпиши план для виставки до 20.11"></textarea><button class="b" onclick="aiSubmit()">➤</button></div>';document.body.appendChild(p);
    document.getElementById('aii').addEventListener('keydown',e=>{if(e.key=='Enter'&&!e.shiftKey){e.preventDefault();aiSubmit()}});
  }
  if(!AI.msgs.length){AI.msgs.push({r:'a',h:AIHELP});aiRender()}
  aiVis()}
aiMount();

/* =====================================================================
   ЦКС — РОЗШИРЕННЯ ПОМІЧНИКА (ai-plus.js)
   Підключається ПІСЛЯ ai.js (див. index.html). ai.js не змінюється.

   Що додає:
   1) РЕЖИМ «ШІ» — справжня нейромережа через вашу Edge-функцію (config.js → AI_ENDPOINT).
      ШІ бачить задачі відділу, відповідає вільною мовою й пропонує ДІЇ (картка з галочками).
      Нічого не змінюється, доки ви не натиснете «Виконати вибране».
      Якщо AI_ENDPOINT порожній — працює лише локальний режим, як раніше.
   2) НОВІ ЛОКАЛЬНІ КОМАНДИ (працюють і без ШІ):
      • «Познач «Виставка» виконаною» / «в процесі» / «не розпочатою»
      • «Перенеси «Виставка» на 3 дні» / «на тиждень» / «на 20.11»
      • «Признач «Виставка» Олені, Івану» (+ «замість» — замінити виконавців)
      • «Коментар до «Виставка» для Олени: надішли макет»
      • «Заархівуй «Виставка»» · «Постав «Виставка» важлива»
      • «Мій план на тиждень / на місяць» · «План відділу на тиждень»
      • «Що прострочено?» · «Стан проєкту Об’єкт А» · «Дайджест за тиждень»
      • «Знайди …» — пошук задач
   ===================================================================== */
(function(){
'use strict';
const EP=(window.CKS_CONFIG||{}).AI_ENDPOINT||'';
const MK='cks_ai_mode';
AI.hist=AI.hist||[];AI.busy=false;
AI.mode=(function(){let m='';try{m=localStorage.getItem(MK)||''}catch(e){}if(!EP)return 'local';return m==='local'?'local':'ai'})();

/* ---------- Допоміжні ---------- */
const noQ=q=>String(q).replace(/[«"“][^»"”]*[»"”]/g,' ');
const hasQ=q=>/[«"“][^»"”]{2,}[»"”]/.test(q);
const DT=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&!isNaN(Date.parse(v))?v:'';
const WDN=['нд','пн','вт','ср','чт','пт','сб'];
const fmtDW=e=>fmtD(dstr(e))+' ('+WDN[new Date(e*ONE).getUTCDay()]+')';
const tLink=t=>`<a onclick="aiOpen('${t.id}')">${esc(t.title)}</a>`;
const mem=u=>D().members.includes(u);

/* Знайти задачу: за лапками, за повною назвою всередині запиту, або за схожістю */
function aiTaskFor(q){const d=D();if(!d)return null;const act=d.tasks.filter(t=>!t.arch);
  if(hasQ(q))return aiFindTask(q);
  const n=aiN(q);let best=null,bl=0;
  act.forEach(t=>{const k=aiN(t.title).trim();if(k.length>=4&&n.includes(k)&&k.length>bl){best=t;bl=k.length}});
  if(best)return best;
  let bs=0;act.forEach(t=>{const s=aiSim(noQ(q),t.title);if(s>bs){bs=s;best=t}});
  return bs>=.5?best:null}

/* ---------- Контекст для ШІ ---------- */
function aiCtx(){const d=D(),td=today();
  const open=d.tasks.filter(t=>!t.arch&&t.status!=ST[3]).slice(0,120),done=d.tasks.filter(t=>!t.arch&&t.status==ST[3]).slice(-30);
  return {today:td,weekday:WDN[new Date().getDay()],me:{id:S.me,name:me().name,pos:me().pos},dept:d.name,memory:(window.aiMemForCloud?window.aiMemForCloud():{}),last_mentioned:(AI.last||{}),
    users:d.members.map(u=>({id:u,name:un(u)})),
    projects:d.projects.map(p=>({id:p.id,name:p.name,milestones:(p.ms||[]).map(x=>({name:x.name,date:x.date}))})),
    categories:(d.cats||[]).map(c=>({id:c.id,name:c.name})),statuses:ST,priorities:{high:'Важлива',mid:'Середня',low:'Неважлива'},
    tasks:open.concat(done).map(t=>({id:t.id,title:String(t.title).slice(0,120),status:t.status,start:t.start||'',end:t.end||'',who:t.who,project:t.project||'',cat:t.cat||'',pri:pri(t),progress:prog(t),subs:t.subs.slice(0,12).map(s=>({t:String(s.t).slice(0,80),done:!!s.done}))}))}}

/* ---------- Дії: перевірка, опис, виконання ---------- */
function aiNorm(a){const d=D();if(!a||typeof a!=='object'||!d)return null;
  const T=id=>d.tasks.find(t=>t.id==id&&!t.arch),U=l=>(Array.isArray(l)?l:[]).filter(u=>mem(u)),
        P=id=>d.projects.find(p=>p.id==id),str=(v,n)=>aiClean(String(v==null?'':v)).slice(0,n||200),
        subs=l=>(Array.isArray(l)?l:[]).map(x=>str(x,200)).filter(Boolean).slice(0,30);
  switch(a.type){
  case 'create_task':{const title=str(a.title);if(title.length<2)return null;
    return {type:'create_task',title:title,start:DT(a.start),end:DT(a.end),who:U(a.who),project:P(a.project)?a.project:'',cat:(d.cats||[]).some(c=>c.id==a.cat)?a.cat:'',pri:['high','mid','low'].includes(a.pri)?a.pri:'',subs:subs(a.subs)}}
  case 'add_subtasks':{const s=subs(a.subs);if(!T(a.task)||!s.length)return null;return {type:'add_subtasks',task:a.task,subs:s}}
  case 'set_status':if(!T(a.task)||!ST.includes(a.status))return null;return {type:'set_status',task:a.task,status:a.status};
  case 'set_dates':{if(!T(a.task))return null;const s=DT(a.start),e=DT(a.end);if(!s&&!e)return null;return {type:'set_dates',task:a.task,start:s,end:e}}
  case 'shift_dates':{const k=Math.round(+a.days);if(!T(a.task)||!k||Math.abs(k)>365)return null;return {type:'shift_dates',task:a.task,days:k}}
  case 'assign':{const w=U(a.who);if(!T(a.task)||!w.length)return null;return {type:'assign',task:a.task,who:w,replace:!!a.replace}}
  case 'comment':{const tx=str(a.text,4000);if(!T(a.task)||!tx)return null;return {type:'comment',task:a.task,text:tx,to:U(a.to)}}
  case 'archive':if(!T(a.task))return null;return {type:'archive',task:a.task};
  case 'set_priority':if(!T(a.task)||!['high','mid','low'].includes(a.pri))return null;return {type:'set_priority',task:a.task,pri:a.pri};
  case 'set_category':{if(!T(a.task))return null;const c=a.cat?(d.cats||[]).find(x=>x.id==a.cat):null;if(a.cat&&!c)return null;return {type:'set_category',task:a.task,cat:c?c.id:''}}
  case 'create_project':{const nm=str(a.name,120);if(nm.length<2)return null;return {type:'create_project',name:nm}}
  case 'create_category':{const nm=str(a.name,120);if(nm.length<2)return null;return {type:'create_category',name:nm}}
  case 'remember':{const tx=str(a.text,300);if(tx.length<3)return null;return {type:'remember',text:tx}}
  case 'create_milestone':{const nm=str(a.name,120),dt=DT(a.date);if(!P(a.project)||nm.length<2||!dt)return null;return {type:'create_milestone',project:a.project,name:nm,date:dt,task:str(a.task,200)}}
  }return null}

function aiMeta(a){const d=D(),r=[];if(a.end)r.push('до '+fmtD(a.end));const p=a.project&&d.projects.find(x=>x.id==a.project);if(p)r.push('проєкт: '+esc(p.name));if(a.who&&a.who.length)r.push(a.who.map(u=>esc(un(u))).join(', '));const c=a.cat&&(d.cats||[]).find(x=>x.id==a.cat);if(c)r.push('категорія: '+esc(c.name));if(a.pri)r.push(PRN[a.pri]);return r.length?' <span class="mu">· '+r.join(' · ')+'</span>':''}
function aiDesc(a){const d=D(),t=a.task&&d.tasks.find(x=>x.id==a.task),T=t?'«'+esc(t.title)+'»':'',w=l=>(l||[]).map(u=>esc(un(u))).join(', ');
  switch(a.type){
  case 'create_task':return 'Створити задачу <b>«'+esc(a.title)+'»</b>'+aiMeta(a)+(a.subs.length?' <span class="mu">· підзадач: '+a.subs.length+'</span>':'');
  case 'add_subtasks':return 'Додати до '+T+' підзадачі: '+a.subs.map(esc).join('; ');
  case 'set_status':return 'Статус '+T+' → <b>'+esc(a.status)+'</b>';
  case 'set_dates':return 'Дати '+T+': '+(a.start?fmtD(a.start):'без змін')+' — '+(a.end?fmtD(a.end):'без змін');
  case 'shift_dates':return 'Зсунути дати '+T+' на <b>'+(a.days>0?'+':'')+a.days+' дн.</b>';
  case 'assign':return (a.replace?'Призначити ':'Додати виконавців до ')+T+': '+w(a.who);
  case 'comment':return 'Коментар до '+T+(a.to.length?' для '+w(a.to):'')+': «'+esc(a.text)+'»';
  case 'archive':return 'Архівувати '+T;
  case 'set_priority':return 'Пріоритет '+T+' → <b>'+esc(PRN[a.pri])+'</b>';
  case 'set_category':{const c=a.cat&&(d.cats||[]).find(x=>x.id==a.cat);return 'Категорія '+T+' → <b>'+esc(c?c.name:'без категорії')+'</b>'}
  case 'create_project':return 'Створити проєкт <b>«'+esc(a.name)+'»</b>';
  case 'create_category':return 'Створити категорію <b>«'+esc(a.name)+'»</b>';
  case 'remember':return 'Запам’ятати: <b>«'+esc(a.text)+'»</b>';
  case 'create_milestone':{const p=d.projects.find(x=>x.id==a.project);return 'Термін <b>«'+esc(a.name)+'»</b> '+fmtD(a.date)+' у проєкті «'+esc(p?p.name:'?')+'» <span class="mu">· + автозадача й нагадування</span>'}
  }return ''}

function aiCmt(t,text,to){const c={id:uid(),dept:D().id,task:t.id,by:S.me,name:me().name,to:to,text:text,ts:Date.now(),priv:false};S.comments.push(c);
  if(CLOUD)DB.from('comments').insert({id:c.id,dept_id:c.dept,task_id:c.task,author:S.me,author_name:c.name,to_ids:to,to_names:to.map(un),body:text,is_private:false}).then(r=>{if(r.error){S.comments=S.comments.filter(x=>x.id!=c.id);S.err='Коментар не збережено: '+r.error.message;R()}});
  if(to.length)toast('Коментар надіслано: '+to.map(un).join(', '))}

function aiRun(a){const d=D(),t=a.task?d.tasks.find(x=>x.id==a.task&&!x.arch):null;
  switch(a.type){
  case 'create_task':{const o=aiMk({title:aiCap(a.title),start:a.start||(a.end?today():''),end:a.end,who:a.who,project:a.project,cat:a.cat,subs:a.subs});if(a.pri)o.pri=a.pri;return 'створено «'+o.title+'»'}
  case 'add_subtasks':a.subs.forEach(s=>t.subs.push({id:uid(),t:s,done:false,who:[]}));autoSt(t);return 'підзадачі додано до «'+t.title+'»';
  case 'set_status':t.status=a.status;t.auto=false;dn(t);return '«'+t.title+'» → '+a.status;
  case 'set_dates':{if(a.start)t.start=a.start;if(a.end)t.end=a.end;if(t.start&&t.end&&t.start>t.end)t.start=t.end;if(a.end&&typeof syncMs=='function')syncMs(t.id);return 'дати «'+t.title+'» оновлено'}
  case 'shift_dates':['start','end'].forEach(f=>{if(t[f])t[f]=dstr(dnum(t[f])+a.days)});if(typeof syncMs=='function')syncMs(t.id);return 'дати «'+t.title+'» зсунуто на '+a.days+' дн.';
  case 'assign':t.who=a.replace?a.who.slice():t.who.concat(a.who.filter(u=>!t.who.includes(u)));return 'виконавців «'+t.title+'» оновлено';
  case 'comment':aiCmt(t,a.text,a.to);return 'коментар до «'+t.title+'» додано';
  case 'archive':t.arch=true;t.archAt=today();if(S.open==t.id)S.open=null;return '«'+t.title+'» в архіві';
  case 'set_priority':t.pri=a.pri;return 'пріоритет «'+t.title+'» змінено';
  case 'set_category':t.cat=a.cat;return 'категорію «'+t.title+'» змінено';
  case 'create_project':if(!canPrj())throw new Error('немає прав створювати проєкти');d.projects.push({id:uid(),name:a.name,desc:'',qty:'',avatar:'',files:[],ts:Date.now()});return 'проєкт «'+a.name+'» створено';
  case 'create_category':d.cats=d.cats||[];d.cats.push({id:uid(),name:a.name});return 'категорію «'+a.name+'» створено';
  case 'remember':if(!window.aiRemember||!window.aiRemember(a.text))throw new Error('не вдалося запам’ятати');return 'запам’ятав: '+a.text;
  case 'create_milestone':{if(!canPrj())throw new Error('немає прав керувати термінами проєктів');const p=pj2(a.project);if(!p)throw new Error('проєкт не знайдено');p.ms=p.ms||[];const x={id:uid(),name:a.name,date:a.date,title:a.task||('Виконати: '+a.name),remind:3,task:''};p.ms.push(x);msMkTask(p,x);return 'термін «'+a.name+'» додано'}
  }throw new Error('невідома дія')}

function aiActCard(acts,title,note){const id=aiId();AI.pend[id]={acts:acts};
  return `<div data-pend="${id}"><b>${title||'Пропоную виконати'}</b>${note?`<div class="mu">${note}</div>`:''}<div style="margin-top:6px">${acts.map((a,i)=>`<label class="ai-st"><input type="checkbox" checked data-i="${i}"><span>${aiDesc(a)}</span></label>`).join('')}</div><div class="ai-b" id="ab_${id}"><button class="b" onclick="aiApplyActs('${id}')">Виконати вибране</button></div></div>`}
function aiMarkDone(id){AI.msgs.forEach(m=>{if(m.h&&m.h.indexOf('data-pend="'+id+'"')>=0)m.h=m.h.replace(new RegExp('<div class="ai-b" id="ab_'+id+'">[\\s\\S]*?</div>'),'<div class="mu" style="margin-top:6px">✅ Застосовано</div>')})}
window.aiApplyActs=function(id){const P=AI.pend[id],d=D();if(!P||!d||P.done)return;
  const r=document.querySelector('#aip [data-pend="'+id+'"]');if(!r)return;
  const idx=[...r.querySelectorAll('input[data-i]')].filter(x=>x.checked).map(x=>+x.dataset.i);if(!idx.length)return aiSay('Відмітьте хоча б одну дію.');
  P.done=true;const ok=[],bad=[];
  idx.forEach(i=>{const a=P.acts[i];try{ok.push(aiRun(a))}catch(e){bad.push((e&&e.message)||String(e))}});
  sv();aiMarkDone(id);
  if(AI.hist)AI.hist.push({role:'user',text:'(Система: користувач підтвердив, виконано дій: '+ok.length+(ok.length?' — '+ok.slice(0,8).join('; '):'')+(bad.length?'. Не вдалося: '+bad.join('; '):'')+')'});
  aiSay('✅ Виконано дій: <b>'+ok.length+'</b>'+(ok.length?'<ul>'+ok.slice(0,12).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'')+(bad.length?'<div class="mu">⚠ Не вдалося: '+bad.map(esc).join('; ')+'</div>':''))};

/* ---------- Хмарний ШІ ---------- */
async function aiCloud(q){const ctrl=new AbortController(),to=setTimeout(()=>ctrl.abort(),45000),h={'content-type':'application/json'};
  if(CLOUD){try{const s=(await DB.auth.getSession()).data.session;if(s)h.authorization='Bearer '+s.access_token;h.apikey=CFG.SUPABASE_ANON_KEY}catch(e){}}
  try{const r=await fetch(EP,{method:'POST',headers:h,body:JSON.stringify({message:q,history:AI.hist.slice(-16),context:aiCtx()}),signal:ctrl.signal});
    if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}
  finally{clearTimeout(to)}}
const aiFmt=s=>esc(s).replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');

/* ---------- Нові локальні команди ---------- */
const STW=[[/не почат|не начат|не розпоч/,0],[/постийн|постоянн/,1],[/(^|\s)(виконан|выполнен|завершен|закрит|закрыт|готов)/,3],[/(в|у)\s+(процес|робот|работ)|розпочат|начат[аоы]?(\s|$)/,2]];
function aiLocalPlus(q,n,d){
  /* ---- прострочені / що горить ---- */
  if(/простроч|горить|горят|що горить|что горит/.test(n)&&!/(план|розпиш)/.test(n))return aiOverdue();
  /* ---- дайджест ---- */
  if(/дайджест|пидсумки (тижня|недели|дня)|итоги (недели|дня)|звит (за|по) (тижд|недел)|звит за тиждень/.test(n))return aiDigest();
  /* ---- план на тиждень / місяць ---- */
  if(/(тижд|недел|мисяц|месяц)/.test(n)&&/(план|що|чт[оа]|розклад|задач|завдан|справ|дела)/.test(n)&&!/(розпиш|розписа|распиш|расписа|склад|состав|скласт)/.test(n)&&!hasQ(q)){
    const mo=/(мисяц|месяц)/.test(n),all=/(видд?ил|отдел|команд|(^|\s)(вси|уси|все)(\s|$))/.test(n);return aiPeriod(mo?31:7,all,mo?'місяць':'тиждень')}
  /* ---- стан проєкту ---- */
  if(/(стан|статус|звит|отчет|зведення|пидсумок|итог|як справи|как дела|прогрес|прогресс)/.test(n)&&/проект/.test(n)){const pj=aiProj(q);if(pj)return aiProjSum(pj);return 'Про який проєкт мова? Наприклад: «стан проєкту Об’єкт А».'}
  /* ---- пошук ---- */
  if(/^(знайди|найди|пошук|поиск|де задача|где задача|покажи задач)/.test(n))return aiFind(q);
  /* ---- дії над наявною задачею ---- */
  const t=aiTaskFor(q);if(!t)return null;const body=noQ(q),nb=aiN(body);
  const stKey=STW.find(x=>x[0].test(nb));
  if(stKey&&/(познач|отмет|видмит|постав|поставь|переведи|переведит|зроби|сделай|закрии|закрой|статус)/.test(n))
    return aiActCard([{type:'set_status',task:t.id,status:ST[stKey[1]]}],'Змінити статус');
  if(/(перенес|видклад|отлож|зсун|сдвин|подвин)/.test(n)){const s=aiShiftReq(q);
    if(!s)return 'На скільки перенести «'+esc(t.title)+'»? Наприклад: «перенеси «'+esc(t.title)+'» на 3 дні» або «…на 20.11».';
    return aiActCard([s.days?{type:'shift_dates',task:t.id,days:s.days}:{type:'set_dates',task:t.id,end:s.date}],'Перенести строки')}
  if(/(коментар|комментар)/.test(n)){const tx=String(q).split(/[:：]/).slice(1).join(':').trim();
    if(!tx)return 'Який текст коментаря? Напишіть так: «коментар до «'+esc(t.title)+'» для Олени: текст».';
    const head=noQ(String(q).split(/[:：]/)[0]);return aiActCard([{type:'comment',task:t.id,text:tx,to:aiUsers(head).map(u=>u.id).filter(mem)}],'Додати коментар')}
  if(/(признач|назнач|передаи|передат|доручи|поручи|виконавц|исполнител)/.test(n)){const us=aiUsers(body).map(u=>u.id).filter(mem);
    if(us.length)return aiActCard([{type:'assign',task:t.id,who:us,replace:/(замист|вместо|тильки|только)/.test(n)}],'Призначити виконавців')}
  if(/(архив|заархив)/.test(n))return aiActCard([{type:'archive',task:t.id}],'Архівувати задачу');
  if(/(приоритет|неважлив|важлив|средн|середн)/.test(n)&&/(постав|поставь|зроби|сделай|змин|измен|приоритет)/.test(n)){
    const p=/неважлив|низьк|низк/.test(nb)?'low':/важлив|высок|висок|важн/.test(nb)?'high':/середн|средн/.test(nb)?'mid':'';
    if(p)return aiActCard([{type:'set_priority',task:t.id,pri:p}],'Змінити пріоритет')}
  return null}

function aiShiftReq(q){const body=noQ(q),n=aiN(body);let m;
  if(m=n.match(/на\s+(-?\d+)\s*(дн|ден|тиж|нед|мис|мес)/)){const k=+m[1];return {days:/тиж|нед/.test(m[2])?k*7:/мис|мес/.test(m[2])?k*30:k}}
  if(/на\s+(тиждень|неделю)/.test(n))return {days:7};
  if(/на\s+(день|добу|сутки)(\s|$)/.test(n))return {days:1};
  const dt=aiDate(body);return dt.d?{date:dt.d}:null}

function aiPeriod(days,all,label){const d=D(),td=dnum(today()),L=[];
  d.tasks.forEach(t=>{if(t.arch||t.status==ST[3])return;if(!all&&!t.who.includes(S.me))return;const e=t.end?dnum(t.end):null;
    if(e!=null&&e<td&&t.status!=ST[1])L.push({t:t,e:e,g:'late'});else if(e!=null&&e<=td+days)L.push({t:t,e:e,g:'soon'});else if(t.status==ST[2])L.push({t:t,e:e,g:'work'})});
  const noD=d.tasks.filter(t=>!t.arch&&t.status!=ST[3]&&t.status!=ST[1]&&!t.end&&(all||t.who.includes(S.me))).length;
  if(!L.length)return 'На найближчий '+label+' '+(all?'у відділі':'для вас')+' нічого з датами не заплановано.'+(noD?' Задач без дат: '+noD+' — проставте строки, і я складу план.':'');
  const late=L.filter(x=>x.g=='late').sort((a,b)=>a.e-b.e),soon=L.filter(x=>x.g=='soon').sort((a,b)=>a.e-b.e),work=L.filter(x=>x.g=='work'),byDay={};
  soon.forEach(o=>{(byDay[o.e]=byDay[o.e]||[]).push(o)});
  const li=o=>`<li>${tLink(o.t)} <span class="mu">${o.t.end?fmtD(o.t.end):'без строку'}${all&&o.t.who.length?' · '+o.t.who.map(u=>esc(un(u))).join(', '):''}</span></li>`;
  const heavy=Object.keys(byDay).filter(k=>byDay[k].length>=4).map(k=>fmtDW(+k));
  return `<b>${all?'План відділу':'Ваш план'} на ${label}</b>`
   +(late.length?`<h5>🔥 Прострочено (${late.length})</h5><ul>${late.slice(0,10).map(li).join('')}</ul>`:'')
   +Object.keys(byDay).map(k=>`<h5>${fmtDW(+k)}${+k==td?' · сьогодні':''}</h5><ul>${byDay[k].map(li).join('')}</ul>`).join('')
   +(work.length?`<h5>▶ У роботі без близького строку (${work.length})</h5><ul>${work.slice(0,8).map(li).join('')}</ul>`:'')
   +(heavy.length?`<div class="mu" style="margin-top:6px">⚠ Багато задач в один день: ${heavy.join(', ')}. Розгляньте перенесення («перенеси «…» на 2 дні»).</div>`:'')
   +(noD?`<div class="mu" style="margin-top:4px">Ще ${noD} задач без дат — у плані їх немає.</div>`:'')}

function aiOverdue(){const d=D(),td=dnum(today());
  const late=d.tasks.filter(t=>!t.arch&&t.status!=ST[3]&&t.status!=ST[1]&&t.end&&dnum(t.end)<td).sort((a,b)=>dnum(a.end)-dnum(b.end));
  const risk=riskList(d).filter(o=>o.days>=0&&o.lv>=2).slice(0,6);
  if(!late.length&&!risk.length)return 'Прострочених задач немає, і нічого не горить 👍';
  return `<b>Що горить</b>`
   +(late.length?`<h5>🔥 Прострочено (${late.length})</h5><ul>${late.slice(0,15).map(t=>`<li>${tLink(t)} <span class="mu">на ${td-dnum(t.end)} дн. · ${t.who.length?t.who.map(u=>esc(un(u))).join(', '):'без виконавця'}</span></li>`).join('')}</ul>`:'')
   +(risk.length?`<h5>⚠ Під ризиком</h5><ul>${risk.map(o=>`<li>${tLink(o.t)} <span class="mu">${esc(o.r.join('; '))}</span></li>`).join('')}</ul>`:'')
   +`<div class="mu" style="margin-top:6px">Щоб перенести: «перенеси «назва» на 3 дні».</div>`}

function aiProjSum(pj){const d=D(),td=dnum(today()),T=d.tasks.filter(t=>t.project==pj.id&&!t.arch),done=T.filter(t=>t.status==ST[3]),open=T.filter(t=>t.status!=ST[3]),
    late=open.filter(t=>t.end&&dnum(t.end)<td&&t.status!=ST[1]),pg=T.length?Math.round(T.reduce((a,t)=>a+prog(t),0)/T.length):0,
    ms=(pj.ms||[]).filter(x=>x.date).sort((a,b)=>a.date<b.date?-1:1),
    msOpen=x=>!(x.task&&d.tasks.some(t=>t.id==x.task&&t.status==ST[3])),next=ms.filter(x=>dnum(x.date)>=td&&msOpen(x)).slice(0,3),msLate=ms.filter(x=>dnum(x.date)<td&&msOpen(x)),
    cnt={};open.forEach(t=>t.who.forEach(u=>cnt[u]=(cnt[u]||0)+1));const w=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]),risk=riskList(d).filter(o=>o.t.project==pj.id);
  return `<b>Проєкт «${esc(pj.name)}»</b><div class="mu">Задач: ${T.length} · виконано: ${done.length} · у роботі: ${open.length} · прострочено: ${late.length}</div>
   <div class="hb"><span>Прогрес</span><div class="bar"><b style="width:${Math.max(2,pg)}%"></b></div><b>${pg}%</b></div>`
   +(msLate.length?`<h5>🔥 Прострочені терміни</h5><ul>${msLate.map(x=>`<li>${esc(x.name)} — ${fmtD(x.date)}</li>`).join('')}</ul>`:'')
   +(next.length?`<h5>📅 Найближчі терміни</h5><ul>${next.map(x=>`<li>${esc(x.name)} — ${fmtD(x.date)} <span class="mu">(через ${dnum(x.date)-td} дн.)</span></li>`).join('')}</ul>`:'')
   +(late.length?`<h5>⚠ Прострочені задачі</h5><ul>${late.slice(0,6).map(t=>`<li>${tLink(t)} <span class="mu">${fmtD(t.end)}</span></li>`).join('')}</ul>`:'')
   +(risk.length?`<h5>🔮 Під ризиком</h5><ul>${risk.slice(0,5).map(o=>`<li>${tLink(o.t)} <span class="mu">${esc(o.r.join('; '))}</span></li>`).join('')}</ul>`:'')
   +(w.length?`<h5>👥 Навантаження в проєкті</h5>${w.slice(0,6).map(u=>`<div class="hb"><span>${esc(un(u))}</span><div class="bar"><b style="width:${100*cnt[u]/cnt[w[0]]}%"></b></div><b>${cnt[u]}</b></div>`).join('')}`:'')
   +(open.some(t=>!t.who.length)?`<div class="mu" style="margin-top:6px">Без виконавця: ${open.filter(t=>!t.who.length).length} задач.</div>`:'')}

function aiDigest(){const d=D(),td=dnum(today()),week=d.tasks.filter(t=>t.status==ST[3]&&t.doneAt&&dnum(t.doneAt)>=td-6&&dnum(t.doneAt)<=td),
    created=d.tasks.filter(t=>t.ts&&Math.floor(t.ts/ONE)>=td-6).length,late=d.tasks.filter(t=>!t.arch&&t.status!=ST[3]&&t.status!=ST[1]&&t.end&&dnum(t.end)<td),
    risk=riskList(d).filter(o=>o.days>=0&&o.lv>=2),cnt={};d.tasks.forEach(t=>{if(t.arch||t.status==ST[3])return;t.who.forEach(u=>cnt[u]=(cnt[u]||0)+1)});
  const top=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0],ms=[];if(canPrj())d.projects.forEach(p=>(p.ms||[]).forEach(x=>{if(x.date&&dnum(x.date)>=td&&dnum(x.date)<=td+7&&!(x.task&&d.tasks.some(t=>t.id==x.task&&t.status==ST[3])))ms.push({p:p,x:x})}));ms.sort((a,b)=>a.x.date<b.x.date?-1:1);
  return `<b>Дайджест за 7 днів · «${esc(d.name)}»</b><div class="mu">Виконано: ${week.length} · створено: ${created} · прострочено зараз: ${late.length} · під ризиком: ${risk.length}</div>`
   +(week.length?`<h5>✅ Виконано</h5><ul>${week.slice(0,10).map(t=>`<li>${tLink(t)} <span class="mu">${fmtD(t.doneAt)}${t.who.length?' · '+t.who.map(u=>esc(un(u))).join(', '):''}</span></li>`).join('')}</ul>`:'')
   +(late.length?`<h5>🔥 Прострочено</h5><ul>${late.slice(0,6).map(t=>`<li>${tLink(t)} <span class="mu">${fmtD(t.end)}</span></li>`).join('')}</ul>`:'')
   +(risk.length?`<h5>⚠ Ризики на найближчі дні</h5><ul>${risk.slice(0,5).map(o=>`<li>${tLink(o.t)} <span class="mu">${esc(o.r.join('; '))}</span></li>`).join('')}</ul>`:'')
   +(ms.length?`<h5>📅 Терміни проєктів на тиждень</h5><ul>${ms.slice(0,6).map(o=>`<li>${esc(o.x.name)} · ${esc(o.p.name)} — ${fmtD(o.x.date)}</li>`).join('')}</ul>`:'')
   +(top?`<div class="mu" style="margin-top:6px">Найбільше відкритих задач: ${esc(un(top))} (${cnt[top]}).</div>`:'')}

function aiFind(q){const d=D(),key=aiClean(q.replace(/^\s*(знайди|найди|пошук|поиск|покажи задач[іиу]?|де задача|где задача)\s*/i,'').replace(/^(по|про|з|із|с)\s+/i,'')),k=aiN(key);
  if(k.length<2)return 'Що шукати? Наприклад: «знайди виставка».';
  const L=d.tasks.filter(t=>!t.arch).map(t=>{const h=aiN(t.title+' '+t.subs.map(s=>s.t).join(' '));return {t:t,s:h.includes(k)?1:aiSim(key,t.title)}}).filter(x=>x.s>=.3).sort((a,b)=>b.s-a.s).slice(0,10);
  if(!L.length)return 'За запитом «'+esc(key)+'» нічого не знайшов.';
  return `<b>Знайдено: ${L.length}</b><ul>${L.map(o=>`<li>${tLink(o.t)} <span class="mu">${esc(o.t.status)}${o.t.end?' · до '+fmtD(o.t.end):''}${o.t.who.length?' · '+o.t.who.map(u=>esc(un(u))).join(', '):''}</span></li>`).join('')}</ul>`}

/* ---------- Головний розбір: нові команди → стара логіка ---------- */
const aiReplyOrig=window.aiReply;
window.aiReply=function(q){const d=D(),n=aiN(q);
  if(d&&!/^(привит|привет|допом|помощ|help|\?)/.test(n)){const r=aiLocalPlus(q,n,d);if(r)return r}
  return aiReplyOrig(q)};

/* Запити, на які локальна відповідь точніша за ШІ (рахуються за даними) */
const LOCALFIRST=/анализ|аналитик|сильн|слабк|эффективн|ефективн|вузьк|узк|процес|простроч|горить|дайджест|кому (призначити|дати|доручити|назначить|поручить)|(що|что|шо).{0,10}(сьогодн|сегодн)|на (сьогодн|сегодн)/;

/* ---------- Відправлення повідомлення ---------- */
window.aiSubmit=function(){const t=document.getElementById('aii');let q=t.value.trim();if(!q||AI.busy)return;t.value='';AI.msgs.push({r:'u',h:q});aiRender();
  if(window.aiMacro)q=window.aiMacro(q);
  const local=(note)=>{let h;try{h=aiReply(q)}catch(e){h='Щось пішло не так: '+esc(e.message||e)}aiSay((note||'')+h)},n=aiN(q),cloud=AI.mode==='ai'&&!!EP&&!!D();
  /* діалоговий шар (ai.js, блок «Діалог і пам’ять»): підтвердження «так/ні», пам’ять, дрібна розмова */
  let pre=null;try{pre=window.aiPre?window.aiPre(q,cloud):null}catch(e){console.error('aiPre',e)}
  if(pre!=null){if(pre)setTimeout(()=>aiSay(pre),150);return}
  if(!cloud||LOCALFIRST.test(n)||/^(привит|привет|допом|помощ|help|\?)/.test(n)){setTimeout(()=>local(),180);return}
  AI.busy=true;AI.msgs.push({r:'a',h:'<span class="mu">Думаю…</span>',tmp:1});aiRender();AI.hist.push({role:'user',text:q});
  aiCloud(q).then(j=>{
    const reply=String((j&&j.reply)||'').trim(),raw=Array.isArray(j&&j.actions)?j.actions:[],acts=raw.map(aiNorm).filter(Boolean).slice(0,30),
          fu=(Array.isArray(j&&j.followups)?j.followups:[]).map(x=>String(x).trim().slice(0,80)).filter(Boolean).slice(0,3);
    AI.hist.push({role:'assistant',text:reply});
    AI.msgs=AI.msgs.filter(m=>!m.tmp);
    let chips='';if(fu.length){const id=aiId();AI.pend[id]={f:fu};chips='<div class="ai-b">'+fu.map((x,i)=>'<button class="b2" onclick="aiAsk(AI.pend[\''+id+'\'].f['+i+'])">'+esc(x)+'</button>').join('')+'</div>'}
    aiSay((reply?`<div>${aiFmt(reply)}</div>`:'')+(acts.length?`<div style="margin-top:8px">${aiActCard(acts,'Пропоную виконати','Нічого не зміниться, доки ви не натиснете кнопку (або не напишете «так»).')}</div>`:'')
      +(raw.length>acts.length?`<div class="mu" style="margin-top:6px">⚠ Пропущено дій з некоректними даними: ${raw.length-acts.length}</div>`:'')+chips||'ШІ повернув порожню відповідь.')
  }).catch(e=>{AI.msgs=AI.msgs.filter(m=>!m.tmp);AI.hist.pop();local('<div class="mu">ШІ недоступний ('+esc(e&&e.name=='AbortError'?'таймаут':(e&&e.message)||e)+') — відповідаю локально.</div>')})
  .finally(()=>{AI.busy=false})};

/* ---------- Інтерфейс: перемикач режиму, нові кнопки, довідка ---------- */
window.aiToggleMode=function(){AI.mode=AI.mode=='ai'?'local':'ai';try{localStorage.setItem(MK,AI.mode)}catch(e){}aiPlusUI();aiSay('Режим: <b>'+(AI.mode=='ai'?'ШІ (нейромережа)':'локальний')+'</b>.'+(AI.mode=='ai'?' Дані відділу (задачі, проєкти, імена) надсилаються на ваш сервер ШІ.':' Дані нікуди не надсилаються.'))};
const PLUSHELP=`<ul><li>«Познач «Виставка» виконаною» · «Перенеси «Виставка» на 3 дні»</li><li>«Признач «Виставка» Олені» · «Коментар до «Виставка» для Олени: …»</li><li>«Мій план на тиждень» · «Що прострочено?» · «Дайджест за тиждень»</li><li>«Стан проєкту Об’єкт А» · «Знайди виставка»</li></ul>`+(EP?`<div class="mu">Режим «ШІ» увімкнено: пишіть вільною мовою — я запропоную дії, а ви підтвердите.</div>`:`<div class="mu">Щоб підключити нейромережу, вкажіть AI_ENDPOINT у config.js (див. README).</div>`);
function aiPlusUI(){const p=document.getElementById('aip');if(!p)return;
  const mu=p.querySelector('.aip-h .mu');if(mu)mu.textContent=EP&&AI.mode=='ai'?'ШІ · дані відділу йдуть на ваш сервер':'локально · без інтернету';
  if(EP&&!document.getElementById('aimode')){const b=document.createElement('button');b.id='aimode';b.className='x';b.style.cssText='font-size:11px;margin-right:4px;cursor:pointer';b.title='Перемкнути режим: ШІ / локальний';b.onclick=window.aiToggleMode;const x=p.querySelector('.aip-h .x');x.parentNode.insertBefore(b,x)}
  const mb=document.getElementById('aimode');if(mb)mb.textContent=AI.mode=='ai'?'ШІ ✓':'Лок.';
  const c=p.querySelector('.aip-c');if(c&&!c.dataset.plus){c.dataset.plus='1';[['План на тиждень','Мій план на тиждень'],['Прострочені','Що прострочено?'],['Дайджест','Дайджест за тиждень']].forEach(x=>{const b=document.createElement('button');b.textContent=x[0];b.onclick=()=>aiAsk(x[1]);c.appendChild(b)})}
  if(AI.msgs.length==1&&AI.msgs[0].r=='a'&&!AI.msgs[0].plus){AI.msgs[0].h+=PLUSHELP;AI.msgs[0].plus=1;aiRender()}}
const aiMount0=window.aiMount;
window.aiMount=function(){aiMount0();aiPlusUI()};
aiPlusUI();
})();

/* ---------- Захист від зникнення кнопки: власні стилі + автовідновлення ---------- */
(function(){
const CSS=".aib{position:fixed;right:18px;bottom:18px;z-index:50;background:var(--navy);color:var(--sbt);border:0;border-radius:22px;padding:10px 18px;font-weight:500;box-shadow:0 6px 20px rgba(23,55,94,.35);cursor:pointer;transition:transform .12s,filter .15s}\n.aib:hover{filter:brightness(1.15);transform:translateY(-1px)}\n.aip{position:fixed;right:18px;bottom:70px;z-index:50;width:min(440px,calc(100vw - 24px));height:min(72vh,660px);background:var(--bg);border:.5px solid var(--ln);border-radius:16px;box-shadow:0 14px 40px rgba(23,55,94,.3);display:none;flex-direction:column;overflow:hidden}\n.aip.open{display:flex;animation:pop .18s ease-out;transform-origin:bottom right}\n.aip-h{display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--navy);color:var(--sbt)}\n.aip-h .mu{color:#b7c3d6;flex:1;font-size:11px}\n.aip-h .x{color:var(--sbt)}\n.aip-m{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px}\n.aim{max-width:92%;padding:8px 12px;border-radius:14px;line-height:1.45;word-wrap:break-word}\n.aim.u{align-self:flex-end;background:var(--navy);color:var(--sbt);border-bottom-right-radius:4px}\n.aim.a{align-self:flex-start;background:#fff;border:.5px solid var(--ln);border-bottom-left-radius:4px;max-width:100%;width:100%}\n.aim h5{margin:8px 0 4px;color:var(--navy);text-transform:uppercase;font-size:11px;letter-spacing:.8px}\n.aim ul{margin:2px 0 6px;padding-left:18px}\n.aim a{color:var(--navy);text-decoration:underline;cursor:pointer}\n.ai-st{display:flex;gap:6px;align-items:center;margin:3px 0}\n.ai-st input[type=text]{flex:1;padding:3px 6px;font-size:12px}\n.ai-b{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}\n.aip-c{display:flex;gap:6px;flex-wrap:wrap;padding:6px 12px}\n.aip-c button{background:rgba(23,55,94,.08);color:var(--navy);border:0;border-radius:12px;padding:3px 10px;font-size:12px;cursor:pointer}\n.aip-c button:hover{background:rgba(23,55,94,.16)}";
try{if(!document.getElementById('ai-css')){const s=document.createElement('style');s.id='ai-css';s.textContent=CSS;(document.head||document.documentElement).appendChild(s)}}catch(e){}
const ensure=()=>{try{if(typeof S!='undefined'&&S&&S.me&&!(typeof SH!='undefined'&&SH)&&!document.getElementById('aib'))aiMount()}catch(e){console.error('Помічник:',e)}};
const m0=window.aiMount;window.aiMount=function(){try{m0()}catch(e){console.error('Помічник:',e)}};
document.addEventListener('DOMContentLoaded',ensure);setInterval(ensure,1500);
})();

/* =====================================================================
   ЦКС — ДІАЛОГ І ПАМ’ЯТЬ ПОМІЧНИКА
   Працює в обох режимах («Лок.» і «ШІ»). Пам’ять зберігається в браузері
   (localStorage, окремо для кожного користувача).

   1) ДІАЛОГ
      • Контекст: «познач її виконаною», «перенеси на 3 дні», «а коментар: …» — про
        останню згадану задачу.
      • Уточнення: якщо не вистачає даних, помічник питає й чекає відповідь
        («На скільки перенести?» → «на 3 дні»).
      • «Так» / «Ні» виконують чи скасовують останню картку з діями.
      • Дрібна розмова («дякую», «як справи?», «хто ти?») — без зайвих кроків.
      • «Нова розмова» (кнопка ⟲) скидає контекст, пам’ять лишається.
   2) РОЗВИТОК
      • «Запам’ятай: Олена відповідає за КП» — нотатки (їх бачить і ШІ).
      • «Запам’ятай команду «ранок» = «що на сьогодні?»» — власні скорочення.
      • Плани, які ви відредагували й застосували, запам’ятовуються й
        пропонуються першими для схожих задач.
      • 👍/👎 під відповіддю: на 👎 можна написати, що було очікувано, —
        це зберігається як виправлення.
      • Часті запити з’являються кнопками швидкого доступу.
      • «Що ти пам’ятаєш?» · «Забудь …» · «Очисти пам’ять».
   ===================================================================== */
(function(){
'use strict';
const N=s=>aiN(s),qq=s=>String(s==null?'':s).replace(/[«»"“”]/g,''),
      hasQuote=q=>/[«"“][^»"”]{2,}[»"”]/.test(q),noQuote=q=>String(q).replace(/[«"“][^»"”]*[»"”]/g,' '),
      pick=a=>a[Math.floor(Math.random()*a.length)],firstName=()=>{try{return me().name.split(/\s+/)[0]}catch(e){return ''}};
AI.last=AI.last||null;AI.wait=null;AI.lastPend=null;AI.lastPendIdx=null;

/* ---------- Пам’ять ---------- */
const MKP='cks_ai_mem_';let MEM=null,MKEY='';
const mkey=()=>MKP+((typeof S!=='undefined'&&S&&S.me)||'anon');
function mem(){const k=mkey();if(MEM&&MKEY===k)return MEM;MKEY=k;let o={};try{o=JSON.parse(localStorage.getItem(k)||'{}')||{}}catch(e){}
  MEM={notes:o.notes||[],macros:o.macros||{},plans:o.plans||[],freq:o.freq||{},fb:o.fb||[]};return MEM}
function msave(){try{localStorage.setItem(mkey(),JSON.stringify(MEM))}catch(e){}}
window.aiRemember=function(t){const m=mem();t=String(t||'').trim().slice(0,300);if(t.length<3)return false;
  if(!m.notes.some(x=>x.t==t))m.notes.push({t:t,ts:Date.now()});while(m.notes.length>40)m.notes.shift();msave();return true};
window.aiMemForCloud=function(){const m=mem();return {notes:m.notes.slice(-20).map(x=>x.t),
  macros:Object.keys(m.macros).slice(0,15).map(k=>k+' → '+m.macros[k]),
  learned_plans:m.plans.slice(-8).map(p=>({task:p.s,steps:p.steps.slice(0,10)})),
  corrections:m.fb.filter(x=>x.ok<0&&x.fix).slice(-8).map(x=>({asked:x.q,expected:x.fix}))}};
window.aiMacro=function(q){const m=mem().macros,k=N(q).trim().replace(/[?!.\s]+$/,'');return Object.prototype.hasOwnProperty.call(m,k)?m[k]:q};
function memText(){const m=mem(),L=[];
  if(m.notes.length)L.push('<h5>📝 Нотатки</h5><ul>'+m.notes.slice(-10).map(x=>'<li>'+esc(x.t)+'</li>').join('')+'</ul>');
  const mk=Object.keys(m.macros);if(mk.length)L.push('<h5>⚡ Мої команди</h5><ul>'+mk.map(k=>'<li>«'+esc(k)+'» → «'+esc(m.macros[k])+'»</li>').join('')+'</ul>');
  if(m.plans.length)L.push('<h5>📋 Плани, яких я навчився</h5><ul>'+m.plans.slice(-8).map(p=>'<li>'+esc(p.s)+' <span class="mu">· кроків: '+p.steps.length+(p.n>1?' · застосовано '+p.n+' р.':'')+'</span></li>').join('')+'</ul>');
  const fx=m.fb.filter(x=>x.fix);if(fx.length)L.push('<h5>🎯 Ваші виправлення</h5><ul>'+fx.slice(-5).map(x=>'<li>на «'+esc(x.q)+'» очікувалось «'+esc(x.fix)+'»</li>').join('')+'</ul>');
  if(!L.length)return 'Поки що пам’ять порожня. Навчіть мене: «запам’ятай: Олена відповідає за КП» або «запам’ятай команду «ранок» = «що на сьогодні?»». Плани, які ви редагуєте й застосовуєте, я запам’ятовую автоматично.';
  return '<b>Що я пам’ятаю</b>'+L.join('')+'<div class="mu" style="margin-top:6px">Щоб забути: «забудь …» або «очисти пам’ять».</div>'}

/* ---------- Навчання планів ---------- */
function learnPlan(subj,steps){const m=mem();subj=String(subj||'').trim();if(subj.length<3||steps.length<2)return;
  const p=m.plans.find(x=>aiSim(subj,x.s)>=.7);if(p){p.steps=steps.slice(0,30);p.n=(p.n||1)+1;p.ts=Date.now()}else m.plans.push({s:subj.slice(0,120),steps:steps.slice(0,30),n:1,ts:Date.now()});
  m.plans.sort((a,b)=>a.ts-b.ts);while(m.plans.length>40)m.plans.shift();msave()}
const steps0=window.aiSteps;
window.aiSteps=function(subject){const m=mem();let best=null,bs=0;m.plans.forEach(p=>{const v=aiSim(subject,p.s);if(v>bs){bs=v;best=p}});
  if(best&&bs>=.5)return {src:'Пам’ятаю ваш план «'+best.s+'» (застосовано '+(best.n||1)+' р.). Відредагуйте кроки — я оновлю його.',steps:best.steps.slice()};
  return steps0(subject)};
const apply0=window.aiApply;
window.aiApply=function(id,mode){let st=[],subj='',isPlan=false;
  try{const P=AI.pend[id],b=document.querySelector('#aip [data-pend="'+id+'"] > b');st=aiRead(id);subj=P?P.subject:'';isPlan=!!(P&&P.subject&&b&&/^План:/.test(b.textContent))}catch(e){}
  const r=apply0(id,mode);if(isPlan)try{learnPlan(subj,st)}catch(e){}return r};

/* ---------- Контекст діалогу ---------- */
function dlgTask(q){const d=D();if(!d)return null;if(hasQuote(q))return aiFindTask(q);
  const n=N(q);let best=null,bl=0;d.tasks.filter(t=>!t.arch).forEach(t=>{const k=N(t.title).trim();if(k.length>=4&&n.includes(k)&&k.length>bl){best=t;bl=k.length}});return best}
const ACT=/^(познач|отмет|видмит|перенес|видклад|отлож|зсун|сдвин|подвин|признач|назнач|доруч|поруч|передай|коментар|комментар|заархив|архив|постав|поставь|переведи|зроби|сделай|закрий|закрой)/,
      PRON=/(^|\s)(її|ії|його|ёго|цю задачу|цю|ту задачу|ту|цей|той|эту|ее|её)(?=\s|$|[,.!?])/gi,
      FRESH=/^(створи|створити|додай|додати|добавь|создай|розпиши|распиши|склади|познач|отмет|перенес|видклад|признач|назнач|коментар|комментар|заархив|постав|знайди|найди|пошук|поиск|анализ|аналитик|що|шо|что|мий|мои|план|стан|статус|звит|дайджест|кому|чого|чего|термин|строк|срок|дедлайн|привит|допом|помощ|help|запам|забудь|нова розмова)(\s|$|[?!.,:])/;
function fill(w,q){const d=D(),t=w.tid&&d.tasks.find(x=>x.id==w.tid&&!x.arch),T=t?qq(t.title):'';
  switch(w.kind){
  case 'shift':return t?'перенеси «'+T+'» '+q:null;
  case 'comment':return t?(q.indexOf(':')>=0?'коментар до «'+T+'» '+q:'коментар до «'+T+'»: '+q):null;
  case 'assign':return t?'признач «'+T+'» '+q:null;
  case 'subs':return 'додай підзадачі до «'+qq(q)+'»';
  case 'plan':return 'розпиши план для '+q;
  case 'create':return 'створи задачу '+q;
  case 'proj':return 'стан проєкту '+q;
  case 'ms':return w.q0+' '+q}
  return null}
const WAITS=[[/^На скільки перенести/,'shift'],[/^Який текст коментаря/,'comment'],[/^До якої задачі додати підзадачі/,'subs'],[/^Для чого розписати план/,'plan'],[/^Що саме створити/,'create'],[/^Про який проєкт мова/,'proj'],[/^Вкажіть дату терміну/,'ms']];
const base=window.aiReply;
window.aiReply=function(q){const d=D();let note='',tid=null;
  const w=AI.wait;AI.wait=null;
  if(w&&d&&String(q).length<=140&&!FRESH.test(N(q))){const f=fill(w,q);if(f){q=f;tid=w.tid||null}}
  const t0=d?dlgTask(q):null;if(t0)tid=t0.id;
  if(d&&!t0&&!tid&&AI.last&&AI.last.task&&!hasQuote(q)){
    const lt=d.tasks.find(x=>x.id==AI.last.task&&!x.arch),s1=String(q).replace(PRON,' ').replace(/^\s*(а|і|и|ще|тоді)\s+/i,'').trim();
    if(lt&&ACT.test(N(s1))){q=s1.replace(/^(\S+)/,m0=>m0+' «'+qq(lt.title)+'»');tid=lt.id;note='<div class="mu">Розумію, що йдеться про «'+esc(lt.title)+'».</div>'}}
  const n=N(q);
  if(d&&tid&&/(призн|назн|доруч|поруч|передай)/.test(n)&&!aiUsers(noQuote(q)).length){const t=d.tasks.find(x=>x.id==tid);
    if(t){AI.wait={kind:'assign',tid:tid};AI.last=Object.assign(AI.last||{},{task:tid});return note+'Кому призначити «'+esc(t.title)+'»? Напишіть імʼя (можна кількох).'}}
  const r=base(q);
  if(typeof r=='string'){const wk=WAITS.find(x=>x[0].test(r));if(wk)AI.wait={kind:wk[1],tid:tid,q0:q}}
  AI.last=AI.last||{};if(tid)AI.last.task=tid;try{const pj=d&&aiProj(q);if(pj)AI.last.project=pj.id}catch(e){}
  return typeof r=='string'?note+r:r};

/* ---------- Відстеження карток і згаданих задач ---------- */
const say0=window.aiSay;
window.aiSay=function(h){let card=false;
  try{const s=String(h);let m,re=/data-pend="(p\d+)"/g;while((m=re.exec(s))){AI.lastPend=m[1];card=true}
    const ids=[...new Set([...s.matchAll(/aiOpen\('([^']+)'\)/g)].map(x=>x[1]))];if(ids.length==1){AI.last=AI.last||{};AI.last.task=ids[0]}}catch(e){}
  say0(h);if(card)AI.lastPendIdx=AI.msgs.length-1};
function openCard(){const id=AI.lastPend;if(!id||AI.lastPendIdx==null||AI.msgs.length-1-AI.lastPendIdx>2)return null;
  return document.querySelector('#aip [data-pend="'+id+'"] .ai-b button')}

/* ---------- Діалогові команди (виконуються до локального/ШІ розбору) ---------- */
const YES=/^(так|да|ага|ок|окей|добре|давай|виконуй|виконай|роби|пидтверджую|пидтверди|згоден|згодна|погоджуюсь|yes|ok|go)[\s!.]*$/,
      NO=/^(ни|нет|не треба|не надо|скасуй|отмена|видмина|cancel|стоп|не роби)[\s!.]*$/;
function smallTalk(n){
  if(/^(дяк|спасиб|thank|thx)/.test(n))return pick(['Будь ласка! 🙂','Завжди радий допомогти'+(firstName()?', '+firstName():'')+'.','Нема за що! Якщо треба ще щось — пишіть.']);
  if(/(як|как)\s+(справи|ти|дела|ты)|як життя|як житя/.test(n))return 'Все добре, дякую! 🙂 Тримаю в голові ваш відділ: можу показати, що горить, скласти план чи розписати задачу. З чого почнемо?';
  if(/(хто|кто)\s+(ти|ты)|(що|что)\s+(ти|ты)\s+таке|ти\s+(нейро|бот)|ты\s+(нейро|бот)/.test(n))
    return 'Я помічник вашого відділу в «ЦКС — Робочий офіс». '+((window.CKS_CONFIG||{}).AI_ENDPOINT?'Можу працювати локально (правила й ваші дані в браузері) або в режимі «ШІ» (нейромережа через ваш сервер) — перемикач угорі панелі. ':'Зараз працюю локально, у вашому браузері. ')+'Я пам’ятаю контекст розмови (напр., «познач її виконаною»), вчуся на планах, які ви редагуєте, і запам’ятовую те, чого ви мене навчите («запам’ятай: …»).';
  if(/^(бувай|до побачення|до зустричи|па-па|пока)/.test(n))return 'До зустрічі! Гарного дня 🙂';
  if(/^(молодець|молодец|супер|клас|класно|чудово|видмин|отлично)/.test(n))return pick(['Дякую! 🙂','Радий, що вийшло. Що далі?']);
  return null}
window.aiPre=function(q,cloud){const n=N(q).trim(),m=mem();let mm;
  /* відповідь на «що було не так» після 👎 */
  if(AI.wait&&AI.wait.kind=='fb'){const w=AI.wait;AI.wait=null;
    if(/^(ни|не треба|скасуй|ничого)(\s|$|[!.])/.test(n))return 'Добре.';
    m.fb.push({q:String(w.q).slice(0,200),ok:-1,fix:String(q).slice(0,300),ts:Date.now()});while(m.fb.length>60)m.fb.shift();msave();
    return 'Дякую, запам’ятав: на «'+esc(String(w.q).slice(0,80))+'» очікувалось «'+esc(String(q).slice(0,120))+'». Врахую це наступного разу.'}
  /* навчання: команда-скорочення */
  mm=String(q).match(/^\s*(?:запам['’ʼ]?ятай|запомни)\s+(?:команду\s+)?[«"“]([^»"”]{2,40})[»"”]\s*(?:=>|=|→|—|-|це|как|як|:)\s*[«"“]([^»"”]{2,200})[»"”]/i);
  if(mm){const k=N(mm[1]).trim().replace(/[?!.\s]+$/,'');if(k.length<2||k.indexOf('__')==0)return 'Назва команди надто коротка.';
    m.macros[k]=mm[2].trim();msave();return '✅ Запам’ятав команду «'+esc(mm[1])+'» → «'+esc(mm[2])+'». Тепер достатньо написати «'+esc(mm[1])+'».'}
  /* навчання: нотатка */
  mm=String(q).match(/^\s*(?:запам['’ʼ]?ятай|запомни)[\s:,\-–—]+([\s\S]{3,300})$/i);
  if(mm){window.aiRemember(mm[1]);return '✅ Запам’ятав: «'+esc(mm[1].trim())+'». '+(cloud?'Режим «ШІ» враховуватиме це у відповідях.':'У режимі «ШІ» я враховуватиму це у відповідях.')}
  /* пам’ять: показати / забути / очистити */
  if(/^(очисти|очистить|сотри|видали)\s+(всю\s+)?(мою\s+)?пам'ять/.test(n)){MEM={notes:[],macros:{},plans:[],freq:{},fb:[]};msave();return 'Пам’ять очищено: нотатки, команди, плани й виправлення видалено.'}
  if(/^(нова розмова|нова бесида|скинь контекст|почнемо спочатку|давай спочатку|забудь\s+(все|усе|розмову|контекст))/.test(n)){AI.last=null;AI.wait=null;AI.hist=[];AI.lastPend=null;return 'Почнемо з чистого аркуша 🙂 Пам’ять (нотатки, команди, плани) лишилась.'}
  if(/що ти (пам'ята|запам'ята)|что ты (помнишь|запомнил)|покажи пам'ять|пам'ять помичника|твоя пам'ять/.test(n))return memText();
  if((mm=n.match(/^(?:забудь|забыть|видали з пам'яти|удали из памяти)\s+(.{2,})$/))){const k=mm[1].trim(),i=m.notes.findIndex(x=>N(x.t).includes(k));
    if(i>=0){const t=m.notes.splice(i,1)[0].t;msave();return 'Забув: «'+esc(t)+'».'}
    if(Object.prototype.hasOwnProperty.call(m.macros,k)){delete m.macros[k];msave();return 'Забув команду «'+esc(k)+'».'}
    const pi=m.plans.findIndex(p=>N(p.s).includes(k));if(pi>=0){const t=m.plans.splice(pi,1)[0].s;msave();return 'Забув план «'+esc(t)+'».'}
    return 'Не знайшов у пам’яті «'+esc(k)+'». Напишіть «що ти пам’ятаєш», щоб побачити список.'}
  /* «так» / «ні» до останньої картки */
  const card=openCard();
  if(card){if(YES.test(n)){AI.lastPend=null;card.click();return ''}
    if(NO.test(n)){AI.lastPend=null;return 'Добре, нічого не змінюю.'}}
  /* дрібна розмова — лише в локальному режимі (ШІ відповідає сам) */
  if(!cloud){const r=smallTalk(n);if(r)return r}
  else if(AI.wait)AI.wait=null;
  /* часті запити → кнопки швидкого доступу */
  if(n.length>=4&&n.length<=60&&!/^(запам|забудь|так|да|ни|дяк)/.test(n)){const f=m.freq[n]||(m.freq[n]={t:String(q).slice(0,80),c:0});f.c++;f.t=String(q).slice(0,80);
    const ks=Object.keys(m.freq);if(ks.length>60){ks.sort((a,b)=>m.freq[a].c-m.freq[b].c);delete m.freq[ks[0]]}msave();setTimeout(dlgUI,0)}
  return null};

/* ---------- Інтерфейс: ⟲ нова розмова, 🧠 пам’ять, 👍/👎, часті запити ---------- */
window.aiNew=function(){AI.msgs=[];AI.last=null;AI.wait=null;AI.hist=[];AI.lastPend=null;AI.lastPendIdx=null;AI.pend={};if(window.aiMount)window.aiMount()};
const DLGHELP='<div class="mu" style="margin-top:6px">Я пам’ятаю контекст: після «Знайди виставка» можна писати «познач її виконаною». Відповідайте «так» / «ні» на мої пропозиції. Навчіть мене: «запам’ятай: …» або «запам’ятай команду «ранок» = «що на сьогодні?»».</div>';
function onFb(e){const a=e.target.closest&&e.target.closest('[data-fb]');if(!a)return;const v=+a.dataset.fb;let li=-1;AI.msgs.forEach((x,i)=>{if(x.r=='a'&&!x.tmp)li=i});
  const x=AI.msgs[li];if(!x||x.fb)return;x.fb=v;let lq='';for(let i=li-1;i>=0;i--)if(AI.msgs[i].r=='u'){lq=AI.msgs[i].h;break}
  const m=mem();m.fb.push({q:String(lq).slice(0,200),ok:v,ts:Date.now()});while(m.fb.length>60)m.fb.shift();msave();
  if(v>0){aiRender();try{toast('Дякую за відгук 👍')}catch(_){}}
  else{AI.wait={kind:'fb',q:lq};aiSay('Дякую за відгук. Що мало бути замість цього? Напишіть одним повідомленням, і я запам’ятаю.')}}
function dlgUI(){const p=document.getElementById('aip');if(!p)return;
  if(!document.getElementById('ai-dlg-css')){const st=document.createElement('style');st.id='ai-dlg-css';
    st.textContent='.ai-fb{margin-top:4px;font-size:12px;opacity:.55}.ai-fb a{cursor:pointer;margin-right:10px}.ai-fb a:hover{opacity:1}.aip-c .fq{border-style:dashed}';(document.head||document.documentElement).appendChild(st)}
  const h=p.querySelector('.aip-h');
  if(h&&!document.getElementById('ainew')){const cl=h.lastElementChild;
    [['aimemb','🧠','Що я пам’ятаю',()=>aiAsk('Що ти пам’ятаєш?')],['ainew','⟲','Нова розмова (скинути контекст)',()=>window.aiNew()]].forEach(o=>{const b=document.createElement('button');b.id=o[0];b.className='x';b.style.cssText='font-size:13px;margin-right:4px;cursor:pointer';b.title=o[2];b.textContent=o[1];b.onclick=o[3];h.insertBefore(b,cl)})}
  const c=p.querySelector('.aip-c');
  if(c){c.querySelectorAll('.fq').forEach(x=>x.remove());const fr=mem().freq,top=Object.keys(fr).filter(k=>fr[k].c>=2).sort((a,b)=>fr[b].c-fr[a].c).slice(0,3);
    top.forEach(k=>{const b=document.createElement('button');b.className='fq';b.title='Ви часто це запитуєте';b.textContent=fr[k].t.length>28?fr[k].t.slice(0,27)+'…':fr[k].t;b.onclick=()=>aiAsk(fr[k].t);c.appendChild(b)})}
  const m=document.getElementById('aim');if(m&&!m.dataset.fbl){m.dataset.fbl='1';m.addEventListener('click',onFb)}
  if(AI.msgs.length&&AI.msgs[0].r=='a'&&!AI.msgs[0].dlg&&AI.msgs.length==1){AI.msgs[0].h+=DLGHELP;AI.msgs[0].dlg=1;aiRender()}}
const rd0=window.aiRender;
window.aiRender=function(){rd0();try{const m=document.getElementById('aim');if(!m)return;let li=-1;AI.msgs.forEach((x,i)=>{if(x.r=='a'&&!x.tmp&&i>0)li=i});
  const x=AI.msgs[li];if(li<0||x.fb||li!==AI.msgs.length-1||!m.children[li])return;
  const f=document.createElement('div');f.className='ai-fb';f.innerHTML='<a data-fb="1" title="Корисно">👍</a><a data-fb="-1" title="Не те, що я просив(ла)">👎</a>';m.children[li].appendChild(f)}catch(e){}};
const mnt0=window.aiMount;
window.aiMount=function(){mnt0();try{if(!S||!S.me){AI.last=null;AI.wait=null;AI.hist=[];AI.lastPend=null;AI.lastPendIdx=null}dlgUI()}catch(e){console.error('Помічник:',e)}};
try{dlgUI()}catch(e){}
})();
