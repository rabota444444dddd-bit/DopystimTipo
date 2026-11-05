/* ЦКС — Робочий офіс: галерея проєктів (картки), швидка задача, гарячі клавіші.
   Підключається після depts.js (див. index.html). У кінці файлу — запуск програми. */

/* =====================================================================
   1. Проєкти — галерея карток
   ===================================================================== */
let PJ={open:null};
/* Види робіт у проєкті (можна обрати кілька одночасно) */
const PKINDS=[['mk','Виготовлення МК'],['mkm','Виготовлення МК + монтаж МК'],['ok','Монтаж ОК + постачання ОК'],['dok','Демонтаж ОК']];
const pkLab=k=>(PKINDS.find(x=>x[0]==k)||[0,k])[1];
function pkHtml(d,p){const ks=p.kinds||[],mg=projMgr(d);
  if(!mg)return ks.length?`<div class="pkw"><span class="mu">Вид робіт:</span>${ks.map(k=>`<span class="pkc on">${esc(pkLab(k))}</span>`).join('')}</div>`:'';
  return `<div class="pkw"><span class="mu">Вид робіт:</span>${PKINDS.map(([k,l])=>`<button class="pkc ${ks.includes(k)?'on':''}" onclick="pkTog('${p.id}','${k}')">${ks.includes(k)?'✓ ':''}${esc(l)}</button>`).join('')}<span class="mu">можна обрати кілька</span></div>`}
function pkTog(pid,k){const d=D(),p=d.projects.find(x=>x.id==pid);if(!p||!projMgr(d))return;const ks=p.kinds||[];p.kinds=ks.includes(k)?ks.filter(x=>x!=k):PKINDS.map(x=>x[0]).filter(x=>x==k||ks.includes(x));sv()}
const cssUrl=u=>String(u||'').replace(/["\\\n\r]/g,'');
const pjStat=(d,p)=>{const TA=d.tasks.filter(t=>t.project==p.id),T=TA.filter(t=>!t.arch),v=TA.length?Math.round(100*TA.filter(t=>t.status==ST[3]).length/TA.length):0;return {n:T.length,v:v,late:T.filter(isLate).length}};

function prj(d){const L=d.projects.filter(p=>projSee(d,p)),mg=projMgr(d);
  if(PJ.open&&L.some(p=>p.id==PJ.open))return `<div class="row pjb"><button class="bn" onclick="PJ.open=null;R()">← Усі проєкти</button></div>${pkHtml(d,L.find(x=>x.id==PJ.open))}${prjList(d,PJ.open)}`;
  PJ.open=null;
  return `<div class="row pjtb">${mg?`<input id="pnm" placeholder="Назва нового проєкту" onkeydown="if(event.key=='Enter')addP('pnm')"><button class="b" onclick="addP('pnm')">+ Проєкт</button>`:''}<button class="b2" onclick="exportX()">Excel: зроблено сьогодні</button></div>
  ${L.length?'':`<p class="mu">${mg?'Проєктів ще немає. Створіть перший — назва вгорі й «+ Проєкт».':'Вам поки не надали доступ до жодного проєкту. Попросіть проєктного менеджера.'}</p>`}
  <div class="pjg">${L.map(p=>{const s=pjStat(d,p);return `<div class="pjk" tabindex="0" onclick="PJ.open='${p.id}';R()" onkeydown="if(event.key=='Enter'){PJ.open='${p.id}';R()}"><div class="pjk-i ${p.avatar?'':'nop'}" ${p.avatar?`style="background-image:url('${cssUrl(p.avatar)}')"`:''}>${p.avatar?'':'<span>🏗</span>'}</div><div class="pjk-g"></div>
    ${(p.kinds||[]).length?`<div class="pjk-k">${p.kinds.map(k=>`<span>${esc(pkLab(k))}</span>`).join('')}</div>`:''}<span class="pjk-p ${s.late?'late':''}" title="${s.late?'Прострочено задач: '+s.late:'Виконано'}">${s.late?'⚠ '+s.late:s.v+'%'}</span>
    <div class="pjk-b"><b>${esc(p.name)}</b><small>${s.n} задач${p.owner?' · ПМ '+esc(un(p.owner).split(' ')[0]):''}</small><div class="pjk-bar"><i style="width:${s.v}%"></i></div></div><img class="pjk-l" src="${IMG.logo}" alt=""></div>`}).join('')}</div>`}
/* =====================================================================
   2. Швидка задача з будь-якого місця (клавіша Q або кнопка «＋ Задача»)
   ===================================================================== */
const WDS=[[/^(неділ|воскрес)/,0],[/^(понеділ|понедел)/,1],[/^(вівтор|вторн)/,2],[/^(серед|сред)/,3],[/^(четвер)/,4],[/^(п.?ятниц|пятниц)/,5],[/^(субот)/,6]];
const isoD=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
const addDays=n=>{const x=new Date();x.setHours(12,0,0,0);x.setDate(x.getDate()+n);return isoD(x)};
const nrm=s=>String(s||'').toLowerCase().replace(/[’'ʼ`]/g,'');
function nameHit(tok,u){const t=nrm(tok).replace(/[^a-zа-яіїєґ]/g,'');if(t.length<3)return false;return nrm(u.name).split(/\s+/).some(w=>w.length>=3&&(t.length<4?w.startsWith(t):w.slice(0,4)==t.slice(0,4)))}
function qtParse(src,d){let s=' '+src+' ';const out={who:[],project:'',end:'',pri:'mid',dlab:''};
  const cut=re=>{const m=s.match(re);if(m){s=s.slice(0,m.index)+' '+s.slice(m.index+m[0].length)}return m};
  /* дата */
  let m;
  if((m=cut(/\s(?:до|на|к|в|у|о|по)?\s*(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?=[\s,.!?])/i))){const y=m[3]?(m[3].length==2?'20'+m[3]:m[3]):new Date().getFullYear(),dt=new Date(+y,+m[2]-1,+m[1],12);if(!isNaN(dt)){if(!m[3]&&dt<new Date(new Date().toDateString()))dt.setFullYear(dt.getFullYear()+1);out.end=isoD(dt)}}
  else if((m=cut(/\s(?:до|на)?\s*(післязавтра|послезавтра)(?=[\s,.!?])/i)))out.end=addDays(2);
  else if((m=cut(/\s(?:до|на)?\s*(завтра)(?=[\s,.!?])/i)))out.end=addDays(1);
  else if((m=cut(/\s(?:до|на)?\s*(сьогодні|сегодня)(?=[\s,.!?])/i)))out.end=addDays(0);
  else if((m=cut(/\sчерез\s+(\d+)\s*(дн\S*|день|доб\S*)/i)))out.end=addDays(+m[1]);
  else if((m=cut(/\sчерез\s+(?:(\d+)\s*)?(тиж\S*|нед\S*)/i)))out.end=addDays(7*(+m[1]||1));
  else if((m=cut(/\s(?:до\s+)?(?:кінця|конца)\s+(?:тижня|недели)(?=[\s,.!?])/i))){const g=new Date().getDay();out.end=addDays(g<=5?5-g:6)}
  else if((m=cut(/\s(?:до|в|во|у|на|к|по)?\s*((?:понеділ|понедел|вівтор|вторн|серед|сред|четвер|п['’ʼ]?ятниц|пятниц|субот|неділ|воскрес)[а-яіїєґ]*)(?=[\s,.!?])/i))){const w=nrm(m[1]),f=WDS.find(x=>x[0].test(w));if(f){const g=new Date().getDay();out.end=addDays(((f[1]-g+7)%7)||7)}}
  /* пріоритет */
  if(cut(/\s!(неважлив\S*|неважн\S*|low|низ\S*)(?=\s)/i))out.pri='low';
  else if(cut(/\s!(середн\S*|средн\S*|mid)(?=\s)/i))out.pri='mid';
  else if(cut(/\s!(важлив\S*|важн\S*|терміново|срочно|high|!)?(?=\s)/i))out.pri='high';
  /* проєкт */
  if((m=cut(/\s#(\S+)/))){const t=nrm(m[1]).replace(/[^a-zа-яіїєґ0-9]/g,'');const p=t.length>=2&&d.projects.filter(x=>projSee(d,x)).find(x=>nrm(x.name).replace(/[^a-zа-яіїєґ0-9]/g,'').includes(t));if(p)out.project=p.id;else out.badPj=m[1]}
  /* люди: @ім’я або слово з великої літери, схоже на прізвище/ім’я учасника відділу */
  const mem=assignable(d);
  s=s.replace(/@(\S+)/g,(all,tok)=>{const u=mem.find(x=>nameHit(tok,x));if(u&&!out.who.includes(u.id))out.who.push(u.id);return tok});
  s.trim().split(/\s+/).slice(1).forEach(w=>{if(/^[A-ZА-ЯІЇЄҐ]/.test(w)&&w.length>=4){const u=mem.find(x=>nameHit(w,x));if(u&&!out.who.includes(u.id))out.who.push(u.id)}});
  let title=s.replace(/\s+/g,' ').trim().replace(/\s+(до|на|в|у|к|по|з|с)$/i,'').trim();
  out.title=title.charAt(0).toUpperCase()+title.slice(1);return out}
function qtOpen(){const d=D();if(!d)return info('Спершу оберіть відділ.');if(!canEdit(d))return toast('У цьому відділі у вас лише перегляд');MN=null;
  M=`<div class="ov" data-qt="1" onclick="if(event.target==this){M='';R()}"><div class="card qtc"><div class="row sp"><h3>Швидка задача</h3><button class="x" onclick="M='';R()">✕</button></div>
  <input id="qt_i" autocomplete="off" placeholder="Погодити КМД з @Мельник до п’ятниці #Сонячний !важливо" oninput="qtPrev()" onkeydown="if(event.key=='Enter'){event.preventDefault();qtGo(event.shiftKey)}">
  <div id="qt_p" class="qtp"></div>
  <div class="mu qth"><b>@</b>людина · <b>#</b>проєкт · дата: <b>завтра</b>, <b>у п’ятницю</b>, <b>15.11</b>, <b>через 3 дні</b> · <b>!важливо</b> / <b>!неважливо</b><br>Enter — створити · Shift+Enter — створити й відкрити · Esc — закрити</div>
  <div class="row"><button class="b" onclick="qtGo(false)">Створити</button><button class="b2" onclick="qtGo(true)">Створити й відкрити</button></div></div></div>`;R();setTimeout(()=>{const e=document.getElementById('qt_i');if(e)e.focus();qtPrev()},0)}
function qtPrev(){const e=document.getElementById('qt_i'),b=document.getElementById('qt_p');if(!e||!b)return;const d=D(),r=qtParse(e.value,d);
  b.innerHTML=e.value.trim()?`<div class="qtt">${esc(r.title)||'<span class="mu">Без назви</span>'}</div><div class="ch">${r.who.map(u=>`<span class="c">👤 ${esc(un(u))}</span>`).join('')}${r.project?`<span class="c">🏗 ${esc((d.projects.find(p=>p.id==r.project)||{}).name)}</span>`:''}${r.badPj?`<span class="c bad">🏗 «${esc(r.badPj)}» не знайдено</span>`:''}${r.end?`<span class="c">📅 до ${fmtD(r.end)}</span>`:''}<span class="pill ${PRC[r.pri]}">${PRN[r.pri]}</span></div>`:''}
function qtGo(open){const e=document.getElementById('qt_i');if(!e)return;const d=D(),r=qtParse(e.value,d);if(!r.title){e.focus();return}
  const t={id:uid(),title:r.title.slice(0,200),status:ST[0],start:r.end?today():'',end:r.end||'',who:r.who,subs:[],project:r.project,cat:'',pri:r.pri,ts:Date.now(),doneAt:''};
  d.tasks.push(t);r.who.forEach(u=>assignNotify(t.id,u));M='';if(open){const pg=d.pages.find(p=>p.type=='tasks');if(pg)S.page=pg.id;S.open=t.id}sv();toast('Задачу створено: '+t.title)}

/* =====================================================================
   3. Гарячі клавіші
   ===================================================================== */
const HK=[['Ctrl + C','Копіювати виділені задачі (галочки в таблиці) або відкриту задачу. У тексті — звичайне копіювання'],['Ctrl + V','Вставити скопійовані задачі в поточний відділ'],['Ctrl + X','Вирізати задачі — після вставки вони переїдуть у нове місце'],['Ctrl + Z','Скасувати останню дію'],['Ctrl + Y','Повторити скасовану дію (також Ctrl + Shift + Z)'],['Ctrl + A','Виділити всі задачі на сторінці «Робочі задачі»'],['Ctrl + F','Пошук по задачах, підзадачах, проєктах, файлах, коментарях і сторінках'],['Ctrl + K','Перемикач сторінок, як Alt + Tab: тримайте Ctrl і тисніть K, відпустіть — перехід'],['Q','Швидка задача з будь-якого місця'],['Esc','Закрити вікно, меню чи бокову панель'],['?','Цей список гарячих клавіш']];
function hkOpen(){MN=null;M=`<div class="ov" onclick="if(event.target==this){M='';R()}"><div class="card hkc"><div class="row sp"><h3>Гарячі клавіші</h3><button class="x" onclick="M='';R()">✕</button></div><div class="hkl">${HK.map(h=>`<div class="hkr"><span>${h[0].split(' + ').map(k=>`<kbd>${esc(k)}</kbd>`).join(' + ')}</span><span>${esc(h[1])}</span></div>`).join('')}</div><div class="mu">На Mac замість Ctrl — ⌘ Cmd. У полях введення Ctrl + C / V / X / Z / A працюють як звичайно.</div></div></div>`;R()}

/* --- скасування / повтор (у межах поточного відділу) --- */
const UF=['tasks','projects','cats','cols','hid','pages','dash','tpl','closedNone','ptypes'];
let UND={dept:null,st:[],rd:[],last:'',busy:false};
const undSnap=d=>JSON.stringify(UF.map(k=>d[k]===undefined?null:d[k]));
function undoReset(){UND={dept:null,st:[],rd:[],last:'',busy:false}}
function undoBase(){const d=me()&&D();if(!d)return;if(UND.dept!=d.id){undoReset();UND.dept=d.id}if(!UND.last)UND.last=undSnap(d)}
function undoHook(){if(UND.busy)return;const d=me()&&D();if(!d)return;if(UND.dept!=d.id){undoReset();UND.dept=d.id;return}const s=undSnap(d);if(!UND.last){UND.last=s;return}if(s===UND.last)return;UND.st.push(UND.last);if(UND.st.length>50)UND.st.shift();UND.last=s;UND.rd=[]}
function undRestore(s){const d=D(),v=JSON.parse(s);UF.forEach((k,i)=>{if(v[i]===null)delete d[k];else d[k]=v[i]});UND.last=s;UND.busy=true;try{if(S.open&&!d.tasks.some(t=>t.id==S.open))S.open=null;sv()}finally{UND.busy=false}}
function undo(){undoBase();if(!UND.st.length)return toast('Немає що скасовувати');if(!canEdit(D()))return toast('Лише перегляд');UND.rd.push(UND.last);undRestore(UND.st.pop());toast('Скасовано')}
function redo(){if(!UND.rd.length)return toast('Немає що повторювати');UND.st.push(UND.last);undRestore(UND.rd.pop());toast('Повторено')}

/* --- копіювання задач --- */
let CLIP=null;
function selTasks(){const d=D();if(!d)return[];let L=d.tasks.filter(t=>SEL[t.id]);if(!L.length&&S.open){const t=tg(S.open);if(t)L=[t]}return L}
function clipCopy(cut){const L=selTasks();if(!L.length)return false;if(cut&&!canEdit(D())){toast('Лише перегляд');return true}
  CLIP={dept:D().id,cut:!!cut,tasks:JSON.parse(JSON.stringify(L))};try{navigator.clipboard.writeText(L.map(t=>t.title).join('\n')).catch(()=>{})}catch(e){}
  toast((cut?'Вирізано':'Скопійовано')+' задач: '+L.length+(cut?' — вставте їх Ctrl + V':''));return true}
function clipPaste(){if(!CLIP)return false;const d=D();if(!d)return false;if(!canEdit(d)){toast('Лише перегляд');return true}
  const same=CLIP.dept==d.id,ids=[];
  CLIP.tasks.forEach(t0=>{const t=JSON.parse(JSON.stringify(t0));if(!CLIP.cut||!same){t.id=uid()}t.ts=Date.now();t.subs=(t.subs||[]).map(s=>({...s,id:uid()}));
    if(!CLIP.cut&&same)t.title=t.title+' (копія)';if(t.project&&!d.projects.some(p=>p.id==t.project))t.project='';if(!same)t.who=(t.who||[]).filter(u=>d.members.includes(u));delete t.ms;t.arch=false;
    if(CLIP.cut){const src=S.depts.find(x=>x.id==CLIP.dept);if(src)src.tasks=src.tasks.filter(x=>x.id!=t0.id)}
    d.tasks.push(t);ids.push(t.id)});
  if(CLIP.cut)CLIP=null;SEL={};ids.forEach(i=>SEL[i]=true);sv();toast('Вставлено задач: '+ids.length);return true}
function selAll(){const d=D(),p=P();if(!d||!p||p.type!='tasks')return false;const L=vrows(d);const all=L.length&&L.every(t=>SEL[t.id]);SEL={};if(!all)L.forEach(t=>SEL[t.id]=true);R();toast(all?'Виділення знято':'Виділено задач: '+L.length);return true}

/* --- Ctrl + K: перемикач сторінок --- */
let SW=null;
const PGI={tasks:'☰',kanban:'▦',projects:'🏗',timeline:'▭',calendar:'📅',dash:'◎',chart:'📈',table:'⊞',canvas:'✎'};
const swList=()=>{const d=D();return d?d.pages.filter(q=>(q.type!='calendar'||canCal())&&pgOk(d,q)):[]};
function swStep(dir,held){const L=swList();if(!L.length)return;if(!SW){const i=L.findIndex(p=>p.id==S.page);SW={i:((i<0?0:i)+(dir||1)+L.length)%L.length,held:!!held};MN=null;
    M=`<div class="ov sw" data-sw="1" onclick="if(event.target==this)swClose()"><div class="swc"><div class="swh">Сторінки відділу «${esc(D().name)}»</div>${L.map((p,i)=>`<div class="swi" data-i="${i}" onmousemove="swHi(${i})" onclick="SW.i=${i};swGo()"><span class="swx">${PGI[p.type]||'•'}</span><span class="swn">${esc(p.name)}</span>${p.id==S.page?'<small>зараз</small>':''}</div>`).join('')}<div class="mu swf">Тримайте Ctrl і тисніть K — далі · ↑ ↓ · Enter — перейти · Esc — скасувати</div></div></div>`;R()}
  else SW.i=(SW.i+(dir||1)+L.length)%L.length;swHi(SW.i)}
function swHi(i){if(!SW)return;SW.i=i;document.querySelectorAll('.swi').forEach(e=>e.classList.toggle('on',+e.dataset.i==i))}
function swClose(){SW=null;M='';R()}
function swGo(){const p=swList()[SW?SW.i:-1];SW=null;M='';if(p)selP(p.id);else R()}

/* --- Ctrl + F: пошук --- */
let SR=null;
function srOpen(){MN=null;SR={q:'',res:[],i:0};M=`<div class="ov sr" data-sr="1" onclick="if(event.target==this)srClose()"><div class="card src"><input id="sr_i" autocomplete="off" placeholder="Пошук: задачі, підзадачі, проєкти, файли, коментарі, сторінки" oninput="srRun(this.value)" onkeydown="srKey(event)"><div id="sr_r" class="srr"><div class="mu">Почніть вводити — шукаємо в усіх ваших відділах.</div></div></div></div>`;R();setTimeout(()=>{const e=document.getElementById('sr_i');if(e)e.focus()},0)}
function srClose(){SR=null;M='';R()}
const hl=(s,q)=>{s=String(s||'');const i=s.toLowerCase().indexOf(q);if(i<0)return esc(s.length>90?s.slice(0,90)+'…':s);const a=Math.max(0,i-30);return (a?'…':'')+esc(s.slice(a,i))+'<mark>'+esc(s.slice(i,i+q.length))+'</mark>'+esc(s.slice(i+q.length,i+q.length+60))+(i+q.length+60<s.length?'…':'')};
function srRun(v){if(!SR)return;const q=v.trim().toLowerCase(),R0=[];SR.q=q;SR.i=0;
  if(q.length>=2)vis().forEach(d=>{const pv=p=>projSee(d,p),tv=t=>!t.project||projMgr(d)||(d.projects.find(p=>p.id==t.project)&&pv(d.projects.find(p=>p.id==t.project)))||t.who.includes(S.me);
    d.pages.filter(p=>p.name.toLowerCase().includes(q)&&pgOk(d,p)).forEach(p=>R0.push({ic:PGI[p.type]||'•',k:'Сторінка',t:hl(p.name,q),s:d.name,go:()=>{S.dept=d.id;selP(p.id)}}));
    d.projects.filter(pv).forEach(p=>{if((p.name+' '+(p.desc||'')).toLowerCase().includes(q))R0.push({ic:'🏗',k:'Проєкт',t:hl(p.name,q),s:d.name+(p.desc&&p.desc.toLowerCase().includes(q)?' · '+hl(p.desc,q):''),go:()=>srProj(d,p.id)});
      (p.files||[]).filter(f=>(f.n||'').toLowerCase().includes(q)).forEach(f=>R0.push({ic:'📎',k:'Файл проєкту',t:hl(f.n,q),s:p.name,go:()=>srProj(d,p.id)}))});
    d.tasks.filter(tv).forEach(t=>{if(t.title.toLowerCase().includes(q))R0.push({ic:t.arch?'🗄':'☐',k:'Задача',t:hl(t.title,q),s:d.name+' · '+t.status+(t.end?' · до '+fmtD(t.end):''),go:()=>srTask(d,t)});
      (t.subs||[]).filter(s=>(s.t||'').toLowerCase().includes(q)).forEach(s=>R0.push({ic:'↳',k:'Підзадача',t:hl(s.t,q),s:t.title,go:()=>srTask(d,t)}));
      (t.att||[]).filter(a=>(a.n||a.u||'').toLowerCase().includes(q)).forEach(a=>R0.push({ic:'📎',k:'Файл задачі',t:hl(a.n||a.u,q),s:t.title,go:()=>srTask(d,t)}))});
    (S.comments||[]).filter(c=>c.dept==d.id&&(c.text||'').toLowerCase().includes(q)).forEach(c=>{const t=d.tasks.find(x=>x.id==c.task);if(t&&tv(t))R0.push({ic:'💬',k:'Коментар',t:hl(c.text,q),s:c.name+' · '+t.title,go:()=>srTask(d,t)})})});
  SR.res=R0.slice(0,60);const box=document.getElementById('sr_r');if(!box)return;
  box.innerHTML=q.length<2?'<div class="mu">Введіть щонайменше 2 символи.</div>':SR.res.length?SR.res.map((r,i)=>`<div class="sri ${i==0?'on':''}" data-i="${i}" onmousemove="srHi(${i})" onclick="srPick(${i})"><span class="swx">${r.ic}</span><div><div>${r.t}</div><small>${esc(r.k)} · ${r.s}</small></div></div>`).join('')+(R0.length>60?`<div class="mu">Показано 60 з ${R0.length}. Уточніть запит.</div>`:''):'<div class="mu">Нічого не знайдено.</div>'}
function srHi(i){if(!SR)return;SR.i=i;document.querySelectorAll('.sri').forEach(e=>e.classList.toggle('on',+e.dataset.i==i))}
function srKey(e){if(!SR)return;const n=SR.res.length;if(e.key=='ArrowDown'&&n){e.preventDefault();srHi((SR.i+1)%n);const el=document.querySelector('.sri.on');if(el)el.scrollIntoView({block:'nearest'})}
  else if(e.key=='ArrowUp'&&n){e.preventDefault();srHi((SR.i-1+n)%n);const el=document.querySelector('.sri.on');if(el)el.scrollIntoView({block:'nearest'})}
  else if(e.key=='Enter'&&n){e.preventDefault();srPick(SR.i)}}
function srPick(i){const r=SR&&SR.res[i];SR=null;M='';if(r)r.go();else R()}
function srTask(d,t){S.dept=d.id;const pg=d.pages.find(p=>p.type=='tasks');if(pg)S.page=pg.id;FL.arch=!!t.arch;S.open=t.id;sv()}
function srProj(d,pid){S.dept=d.id;const pg=d.pages.find(p=>p.type=='projects');if(pg)S.page=pg.id;S.open=null;PJ.open=pid;sv()}

/* --- обробник клавіш --- */
document.addEventListener('keydown',e=>{if(SH||!me())return;
  const tg2=e.target,typing=tg2&&(/^(INPUT|TEXTAREA|SELECT)$/.test(tg2.tagName)||tg2.isContentEditable),c=e.ctrlKey||e.metaKey,code=e.code;
  if(SW&&!c&&(e.key=='ArrowDown'||e.key=='ArrowUp'||e.key=='Tab')){e.preventDefault();swStep(e.key=='ArrowUp'||(e.key=='Tab'&&e.shiftKey)?-1:1);return}
  if(SW&&e.key=='Enter'){e.preventDefault();swGo();return}
  if(c&&!e.altKey&&code=='KeyK'){e.preventDefault();if(SR)SR=null;swStep(e.shiftKey?-1:1,true);return}
  if(c&&!e.altKey&&code=='KeyF'){e.preventDefault();SW=null;srOpen();return}
  if(e.key=='Escape'){if(SW){swClose();return}if(SR){srClose();return}if(M){M='';R();return}if(MN){MN=null;R();return}if(S.open&&!typing){S.open=null;R();return}return}
  if(typing||M)return;
  if(c&&!e.altKey){
    if(code=='KeyZ'&&!e.shiftKey){e.preventDefault();undo();return}
    if(code=='KeyY'||(code=='KeyZ'&&e.shiftKey)){e.preventDefault();redo();return}
    const txt=(window.getSelection&&String(window.getSelection()))||'';
    if(code=='KeyC'&&!txt&&clipCopy(false)){e.preventDefault();return}
    if(code=='KeyX'&&!txt&&clipCopy(true)){e.preventDefault();return}
    if(code=='KeyV'&&clipPaste()){e.preventDefault();return}
    if(code=='KeyA'&&selAll()){e.preventDefault();return}
    return}
  if(e.altKey||MN)return;
  if(code=='KeyQ'&&!e.shiftKey){e.preventDefault();qtOpen();return}
  if(e.key=='?'||(code=='Slash'&&e.shiftKey)){e.preventDefault();hkOpen()}});
document.addEventListener('keyup',e=>{if(SW&&SW.held&&(e.key=='Control'||e.key=='Meta'))swGo()});
addEventListener('blur',()=>{if(SW&&SW.held)SW.held=false});

/* після кожного рендера — база для скасування */
(function(){const _p=window.postR;window.postR=function(){if(_p)_p.apply(this,arguments);try{undoBase()}catch(e){}}})();

/* =====================================================================
   4. Запуск програми
   ===================================================================== */
if(SH)shBoot();else if(CLOUD)boot();else R();
