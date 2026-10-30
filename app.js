/* ЦКС — Робочий офіс. Уся логіка програми.
   Дані зберігаються в браузері (localStorage). */
/* ===== Шлях і назви зображень =====
   Папка з картинками лежить поруч з index.html і називається "Img".
   Назви файлів — рівно такі, як ви надіслали. Щоб замінити картинку — змініть назву тут.
   Якщо файл не знайдено, програма сама пробує варіанти назви:
   «_» замість пробілу та «__2_» замість « (2)» (так Windows називає копії файлів). */
const IMG_DIR='Img/';
const IMG={logo:'Логотіпчик.svg',sidebar_btn:'Бокова_панелька.svg',edit:'Редагування.svg',delete:'Смітничок.svg',export:'Експортік.svg',search:'Пошук_значочік.svg',dots_big:'Крапочки.svg',dots_small:'Крапочки.svg',triangle:'Трикутничек.svg',msg:'Повідомленько.svg',cmt:'Коментар.svg',access:'Доступ.svg',archive:'Архівчік.svg'};
const OPTIONS_BG='окно_выбора_опций.png'; /* фон меню; також прописаний у style.css */
const ALT=n=>[...new Set([n,n.replace(/__(\d+)_/,' ($1)').replace(/_/g,' '),n.replace(/_/g,' ')])];
const GROUPS=Object.values(IMG).concat([OPTIONS_BG]).map(ALT);
Object.keys(IMG).forEach(k=>IMG[k]=IMG_DIR+IMG[k]);
document.addEventListener('error',e=>{const i=e.target;if(!i||i.tagName!='IMG')return;let cur;try{cur=decodeURIComponent(i.src.split('/').pop())}catch(x){return}
  const gr=GROUPS.find(a=>a.includes(cur));if(!gr)return;const nx=gr[gr.indexOf(cur)+1];if(!nx)return;
  Object.keys(IMG).forEach(k=>{if(IMG[k]==IMG_DIR+cur)IMG[k]=IMG_DIR+nx});i.src=IMG_DIR+nx},true);
(function(){const gr=GROUPS[GROUPS.length-1];let k=0;const t=()=>{if(k>=gr.length)return;const im=new Image();im.onload=()=>document.documentElement.style.setProperty('--ow','url("'+IMG_DIR+gr[k]+'")');im.onerror=()=>{k++;t()};im.src=IMG_DIR+gr[k]};t()})();

const K='cks_office_v1',K2='cks_ui_v1';
const CFG=window.CKS_CONFIG||{};
const CLOUD=!!(CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY&&window.supabase);
const DB=CLOUD?window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY):null;
const ST=['Не почато','Постійна задача','В процесі','Виконано'],SC=['s0','s1','s2','s3'];
const TN={calendar:'Календар',timeline:'Таймлайн',dash:'Центр управління',tasks:'Таблиця «Робочі задачі»',projects:'Проєкти',kanban:'Статус задач (Kanban)',table:'Власна таблиця',chart:'Графік',canvas:'Вільне полотно'};
const BN={title:'Назва задачі',status:'Статус',stage:'Етап виконання',start:'Дата початку',end:'Дата кінця',who:'Відповідальний',project:'Проєкт',prog:'Прогрес',cat:'Категорія',pri:'Пріоритет',done:'Дата виконання'};
const ALLB=['title','status','pri','stage','start','end','who','project','prog','cat','done'];
const CT=[['text','Текст'],['number','Число'],['percent','Відсоток'],['date','Дата'],['func','Функція (сума числових зліва)']];
const OLD={'Не выполнено':'Не почато','Постоянная задача':'Постійна задача','В процессе':'В процесі','Выполнено':'Виконано'};
const PNM={'Рабочие задачи':'Робочі задачі','Канбан':'Статус задач','Проекты':'Проєкти'};

let S;try{S=JSON.parse(localStorage.getItem(CLOUD?K2:K))}catch(e){}
S=S||{users:[],depts:[],me:null,dept:null,page:null,open:null};
if(CLOUD){S.users=[];S.depts=[];S.me=null;S.open=null;S.loading=true}
S.deptOrder=S.deptOrder||[];
S.comments=S.comments||[];S.shares=S.shares||[];
const MOB=()=>matchMedia('(max-width:760px)').matches;
let M='',mcb=null,from=null,reg=false,draft={pos:'boss'},PF='',SB=true,MN=null;
let FL={q:'',st:'',who:'',cat:'',sub:'',sw:'',pri:'',arch:false,sort:'',only:false,pick:false,find:false},SEL={};
function defCols(){return ALLB.slice(0,7).concat('done').map(k=>({id:k,key:k,name:BN[k],type:'b'}))}
S.depts.forEach(d=>{d.projects=d.projects||[];d.cats=d.cats||[];d.cols=d.cols||defCols();
  if(!d.v3){d.v3=1;d.cols=d.cols.filter(c=>c.key!='project'&&c.key!='prog');d.cols.forEach(c=>{if(c.type=='b')c.name=BN[c.key]});d.pages.forEach(p=>p.name=PNM[p.name]||p.name)}
  d.tasks.forEach(t=>{t.status=OLD[t.status]||t.status})});

const $=document.getElementById('app'),uid=()=>Math.random().toString(36).slice(2,9);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const me=()=>S.users.find(u=>u.id==S.me),isA=()=>me()&&me().admin,vis=()=>{const o=S.deptOrder||[];return S.depts.filter(d=>isA()||d.members.includes(S.me)).sort((a,b)=>{const i=o.indexOf(a.id),j=o.indexOf(b.id);return (i<0?999:i)-(j<0?999:j)})};
const D=()=>vis().find(d=>d.id==S.dept),P=()=>D()&&D().pages.find(p=>p.id==S.page),un=u=>(S.users.find(x=>x.id==u)||{name:'?'}).name,tg=t=>D().tasks.find(x=>x.id==t);
const wr=()=>{try{if(CLOUD){localStorage.setItem(K2,JSON.stringify({dept:S.dept,page:S.page,deptOrder:S.deptOrder}));schedPush();return 1}localStorage.setItem(K,JSON.stringify(S));return 1}catch(e){return 0}},sv=()=>{wr();R()},g=i=>document.getElementById(i).value.trim();
const canMng=d=>isA()||d.boss==S.me||(me()&&['boss','pm'].includes(me().pos)&&d.members.includes(S.me)),isBoss=()=>isA()||(me()&&me().pos=='boss');
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const dn=t=>{if(t.status==ST[3]&&!t.doneAt)celebrate(t);t.doneAt=t.status==ST[3]?today():''},pn=t=>{const p=D().projects.find(x=>x.id==t.project);return p?p.name:''};
const stage=t=>{const s=t.subs.find(x=>!x.done);return s?s.t:(t.subs.length?'Усі етапи виконано':'—')},prog=t=>t.subs.length?Math.round(100*t.subs.filter(x=>x.done).length/t.subs.length):0,bar=v=>`<div class="bar" title="${v}%"><b style="width:${v}%"></b></div>`;

function R(){const pr={};document.querySelectorAll('.cd[data-i]').forEach(e=>{pr[e.dataset.i]=e.getBoundingClientRect()});
  $.innerHTML=SH?shView():S.loading?'<div class="au"><div class="card">Завантаження…</div></div>':(me()?app():auth());
  if(!REDUCED)document.querySelectorAll('.cd[data-i]').forEach(e=>{const o=pr[e.dataset.i];if(!o||!e.animate)return;const n=e.getBoundingClientRect(),dx=o.left-n.left,dy=o.top-n.top;if(Math.abs(dx)+Math.abs(dy)>3)e.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'none'}],{duration:380,easing:'cubic-bezier(.2,.8,.2,1)'})});
  const m=document.getElementById('mi');if(m)m.focus();if(typeof HVT!='undefined'&&HVT&&hvEl().style.display=='block')hvFill();postR()}

/* ---------- вхід / реєстрація ---------- */
/* екран входу/реєстрації, doReg/doLogin — у depts.js */
const outL=()=>{document.querySelectorAll('.toast').forEach(e=>e.remove());S.me=S.dept=S.page=S.open=null;REM=false;sv()};

/* ---------- модальні вікна й меню ---------- */
function ask(t,cb,x,val,btn){M=`<div class="ov"><div class="card"><h3>${t}</h3><input id="mi" placeholder="Назва" value="${esc(val||'')}" onkeydown="if(event.key=='Enter')mok()">${x||''}<div class="row"><button class="b" onclick="mok()">${btn||'Створити'}</button><button class="b2" onclick="M='';R()">Скасувати</button></div></div></div>`;mcb=cb;R()}
function mok(){const v=g('mi'),s=document.getElementById('ms');if(!v)return;const f=mcb;M='';f(v,s&&s.value)}
const info=m=>{M=`<div class="ov" onclick="M='';R()"><div class="card">${m}</div></div>`;R()};
const cfm=(t,f)=>{mcb=f;M=`<div class="ov"><div class="card"><h3>${t}</h3><div class="row"><button class="b" onclick="M='';mcb();">Так</button><button class="b2" onclick="M='';R()">Скасувати</button></div></div></div>`;R()};
/* menu(подія, ()=>[{i:'edit',t:'Текст',c:'s2',f:()=>{},keep:1}]) — випадаюче вікно опцій */
const menu=(ev,build)=>{const fresh=!MN;MN={x:ev.clientX,y:ev.clientY,build:build};if(fresh){MA=true;setTimeout(()=>{MA=false},300)}R()};
function mnh(){const it=MN.build(),x=Math.min(MN.x,innerWidth-170),y=Math.min(MN.y+8,innerHeight-130);return `<div class="mv" onclick="MN=null;R()"></div><div class="mn ${MA?'pop':''}" style="left:${x}px;top:${y}px">${it.map((o,i)=>`<div onclick="mnr(${i})">${o.i?`<img src="${IMG[o.i]}">`:''}${o.c?`<span class="pill ${o.c}">${esc(o.t)}</span>`:esc(o.t)}</div>`).join('')}</div>`}
const mnr=i=>{const o=MN.build()[i];if(!o.keep)MN=null;o.f();if(o.keep)R()};

/* ---------- каркас ---------- */
function app(){const d=D(),p=P(),u=me();return `<div class="lay">${SB?side(d,u):''}<main><div id="pres" class="pres">${presHtml()}</div>${S.err&&me()?`<div class="warn">${esc(S.err)}</div>`:''}${SB?'':`<button class="ib" onclick="SB=true;R()"><img src="${IMG.sidebar_btn}"></button>`}${d?head(d)+(p?(pgOk(d,p)?body(d,p):'<p class="mu">У вас немає доступу до цієї сторінки.</p>'):'<p class="mu">Оберіть сторінку ліворуч</p>'):'<h1>Ласкаво просимо</h1><p class="mu">Оберіть відділ ліворуч або створіть новий.</p>'}</main>${S.open&&d&&tg(S.open)?panel(d):''}${MN?mnh():''}${BELL?bellPanel():''}${M}</div>`}
function side(d,u){return `<aside><div class="tag"><span>Steel solution for solid business</span><img class="sbtn" src="${IMG.sidebar_btn}" onclick="SB=false;R()"></div><img class="lg" src="${IMG.logo}"><div class="usr" onclick="profOpen()" title="Мій акаунт"><i class="pa usa" style="${avSt(u.id)}">${esc(ini(u.name))}</i><span>${esc(u.name)}</span><small>${isA()?'Повний доступ':(POS[u.pos]||'Начальник')}</small></div><nav>${vis().map(x=>`<div ondragover="dov(event)" ondrop="drS(event,'d','${x.id}')"><div class="dn" draggable="true" ondragstart="dgS(event,'d','${x.id}')" onclick="selD('${x.id}')">${esc(x.name)}</div>${x.id==S.dept?x.pages.filter(q=>(q.type!='calendar'||canCal())&&pgOk(x,q)).map(q=>`<div class="pg ${q.id==S.page?'on':''}" draggable="true" ondragstart="dgS(event,'p','${q.id}')" ondragover="dov(event)" ondrop="drS(event,'p','${q.id}')" onclick="selP('${q.id}')"><span>• ${esc(q.name)}</span><img src="${IMG.dots_small}" onclick="event.stopPropagation();pgMenu(event,'${q.id}')"></div>`).join('')+'<div class="pg add" onclick="newPage()">+ Сторінка</div>':''}</div>`).join('')}</nav>${isBoss()?'<button class="cb" onclick="newDept()">+ Створити відділ</button>':''}${isA()?'<a class="lo" onclick="invBossOpen()">+ Запросити начальника</a>':''}<a class="lo" onclick="out()">Вийти</a></aside>`}
function head(d){return `<div class="hd"><h1>${canMng(d)?`<input class="ti h1" value="${esc(d.name)}" onchange="D().name=this.value.trim()||D().name;sv()">`:esc(d.name)}</h1><div class="hr"><span id="bellw">${bellBtn()}</span>${canMng(d)?'<button class="bn icb" title="Доступ" onclick="deptOpen()"><img src="'+IMG.access+'" alt="Доступ"></button>':'<button class="bn" onclick="deptOpen(\'mem\')">Учасники</button>'}</div></div>`}
const canPrj=()=>isA()||(me()&&['boss','pm'].includes(me().pos)),pgOk=(d,q)=>(q.type!='projects'||canPrj())&&(!Array.isArray(q.acc)||isA()||canMng(d)||q.acc.includes(S.me)),
pgAll=on=>{const p=P(),d=D();if(on)delete p.acc;else p.acc=d.members.filter(m=>{const u=S.users.find(x=>x.id==m);return u&&!u.admin});sv();accRef()},
pgTog=id=>{const p=P();p.acc=p.acc.includes(id)?p.acc.filter(x=>x!=id):p.acc.concat(id);sv();accRef()};
const accRef=()=>{if(M&&M.includes('data-acc="boss"')){M=invBossHtml();R()}else if(M&&M.includes('data-acc')){M=accHtml();R()}};
const am=u=>{if(u){D().members.push(u);sv();accRef()}},rm=u=>{const d=D();d.members=d.members.filter(x=>x!=u);sv();accRef()};
function body(d,p){const t=p.type=='tasks';return `<div class="pt"><input class="ti h2" value="${esc(p.name)}" onchange="P().name=this.value.trim()||P().name;sv()"><span class="ic">${t?`<button class="bn" onclick="FL.arch=!FL.arch;R()">${FL.arch?'← До задач':'Архів ('+d.tasks.filter(x=>x.arch).length+')'}</button><button class="bn" onclick="colMenu(event)">+ Додати стовпець</button><img src="${IMG.search}" onclick="FL.find=!FL.find;R()"><img src="${IMG.export}" onclick="expMenu(event)">`:''}<img class="dg" src="${IMG.dots_big}" onclick="pgMenu(event,'${p.id}')"></span></div>`+({calendar:calG,timeline:tml,dash:dash,projects:prj,tasks:tbl,kanban:kan,chart:cht,table:ctab,canvas:cnv}[p.type])(d,p)}
const selD=i=>{S.dept=i;S.page=D().pages[0]&&D().pages[0].id;S.open=null;sv()},selP=i=>{S.page=i;S.open=null;if(MOB())SB=false;sv()};
const newDept=()=>ask('Створіть свій відділ',v=>{const d={id:uid(),name:v,boss:S.me,members:[S.me],tasks:[],projects:[],cats:[],cols:defCols(),v3:1,pages:[{id:uid(),name:'Робочі задачі',type:'tasks'},{id:uid(),name:'Статус задач',type:'kanban'},{id:uid(),name:'Проєкти',type:'projects'},{id:uid(),name:'Таймлайн',type:'timeline'},{id:uid(),name:'Календар',type:'calendar'},{id:uid(),name:'Центр управління',type:'dash'}],v4:1,v5:1,v6:1,dash:defDash(),tpl:defTpl()};S.depts.push(d);S.dept=d.id;S.page=d.pages[0].id;sv()});
const newPage=()=>ask('Нова сторінка',(v,t)=>{const p={id:uid(),name:v,type:t,data:t=='table'?{cols:[{id:uid(),name:'Назва',type:'text'}],rows:[]}:t=='canvas'?{nodes:[],links:[]}:{}};D().pages.push(p);S.page=p.id;sv()},`<select id="ms">${Object.keys(TN).map(k=>`<option value="${k}">${TN[k]}</option>`).join('')}</select>`);
const pgMenu=(ev,id)=>menu(ev,()=>[{i:'edit',t:'Перейменувати',f:()=>ask('Назва сторінки',v=>{D().pages.find(p=>p.id==id).name=v;sv()},'',D().pages.find(p=>p.id==id).name,'Зберегти')},{i:'delete',t:'Видалити сторінку',f:()=>cfm('Видалити сторінку?',()=>{const d=D();d.pages=d.pages.filter(x=>x.id!=id);if(S.page==id)S.page=d.pages[0]&&d.pages[0].id;sv()})}]);

/* ---------- сторінка «Робочі задачі» ---------- */
function vrows(d){let L=d.tasks.filter(t=>(!PF||t.project==PF)&&(!FL.st||t.status==FL.st)&&(!FL.cat||t.cat==FL.cat)&&(!FL.pri||pri(t)==FL.pri)&&(!FL.end||t.end==FL.end)&&(FL.arch?t.arch:!t.arch)&&(!FL.sub||(FL.sub=='has'?t.subs.length>0:FL.sub=='none'?!t.subs.length:FL.sub=='open'?t.subs.some(s=>!s.done):t.subs.length>0&&t.subs.every(s=>s.done)))&&(!FL.sw||t.subs.some(s=>s.who.includes(FL.sw)))&&(!FL.who||t.who.includes(FL.who))&&(!FL.team||teamHit(FL.team,t))&&(!FL.q||(t.title+' '+stage(t)+' '+t.subs.map(s=>s.t).join(' ')).toLowerCase().includes(FL.q.toLowerCase()))&&(!FL.only||SEL[t.id]));
  /* порядок: 1 В процесі · 2 Постійна · 3 Не почато · 4 Прострочено · 5 Виконано; усередині — за пріоритетом і датою кінця */
  const rk=t=>t.status==ST[3]?5:t.status==ST[1]?2:isLate(t)?4:t.status==ST[2]?1:3;L=L.slice();
  if(FL.sort){const f={title:t=>t.title,start:t=>t.start||'9',end:t=>t.end||'9',status:t=>ST.indexOf(t.status),pri:t=>PRK.indexOf(pri(t)),who:t=>t.who.map(un).join()}[FL.sort];L.sort((a,b)=>((a.status==ST[3])-(b.status==ST[3]))||(f(a)>f(b)?1:f(a)<f(b)?-1:0))}
  else L.sort((a,b)=>rk(a)-rk(b)||PRK.indexOf(pri(a))-PRK.indexOf(pri(b))||(a.end||'9').localeCompare(b.end||'9'));
  return L}
function tbl(d){d.cols=d.cols||defCols();const A=vrows(d),CS=d.cats||[],none=A.filter(t=>!CS.some(c=>c.id==t.cat)),
  gs=CS.filter(c=>!FL.cat||c.id==FL.cat).map(c=>grp(d,c,A.filter(t=>t.cat==c.id))).join('')+((!FL.cat&&(none.length||!CS.length))?grp(d,null,none):'');
  const FK={status:'st',pri:'pri',end:'end',who:'who'},sk=(k,t)=>`<span class="sk ${FL[FK[k]]?'on':''}" onclick="skMenu(event,'${k}')">${t}<img src="${IMG.dots_small}"></span>`;
  return `${FL.arch?'<div class="warn" style="background:rgba(23,55,94,.08);color:var(--navy);border-color:var(--ln)">Архів задач. Виконані задачі потрапляють сюди автоматично через місяць. Кнопка зі стрілкою в рядку повертає задачу назад.</div>':''}${FL.find?`<div class="fb"><input placeholder="Пошук за назвою задачі чи підзадачі" value="${esc(FL.q)}" onchange="FL.q=this.value;R()"><select onchange="FL.st=this.value;R()"><option value="">Усі статуси</option>${ST.map(s=>`<option ${FL.st==s?'selected':''}>${s}</option>`).join('')}</select><select onchange="FL.pri=this.value;R()"><option value="">Усі пріоритети</option>${PRK.map(k=>`<option value="${k}" ${FL.pri==k?'selected':''}>${PRN[k]}</option>`).join('')}</select><select onchange="FL.who=this.value;R()"><option value="">Усі виконавці</option>${S.users.map(u=>`<option value="${u.id}" ${FL.who==u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select><select onchange="FL.sub=this.value;R()">${[['','Підзадачі: усі'],['has','Є підзадачі'],['none','Без підзадач'],['open','Є невиконані підзадачі'],['done','Усі підзадачі виконані']].map(o=>`<option value="${o[0]}" ${FL.sub==o[0]?'selected':''}>${o[1]}</option>`).join('')}</select><select onchange="FL.sw=this.value;R()"><option value="">Підзадачі: усі виконавці</option>${S.users.map(u=>`<option value="${u.id}" ${FL.sw==u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select></div>`:''}<div class="sr">${sk('status','Статус')}${sk('pri','Пріоритет')}${sk('end','Дата кінця')}${sk('who','Відповідальний')}<img class="dg" src="${IMG.dots_big}" onclick="sortMenu(event)"></div>${catRow(d)}${gs}${FL.arch?'':'<div class="cats"><span class="cp add" onclick="newCat()">+ Додати категорію</span></div>'}`}
function grp(d,cg,L){const key=cg?cg.id:'_',cl=cg?cg.closed:d.closedNone,filt=FL.q||FL.st||FL.who||FL.team||FL.pri||FL.end||FL.sub||FL.sw||FL.only||FL.arch;if(!L.length&&filt)return '';
  return `<div><div class="gh"><img class="tri ${cl?'cl':''}" src="${IMG.triangle}" onclick="tglG('${key}')"><span class="gp">${cg?`<input class="gi" value="${esc(cg.name)}" size="${Math.max(6,cg.name.length)}" onchange="renC('${cg.id}',this.value)">`:'Без категорії'}</span><span class="mu">${L.length}</span><img class="dg" src="${IMG.dots_big}" onclick="grpMenu(event,'${key}')"></div>${cl?'':`<table class="t ${d.cols.some(c=>c.w)?'fx':''}"><colgroup><col style="width:30px">${d.cols.map(c=>hideC(c)?'':`<col ${c.w?`style="width:${c.w}px"`:''}>`).join('')}<col style="width:76px"></colgroup><thead><tr><th class="pk"></th>${d.cols.map((c,i)=>hideC(c)?'':`<th data-ci="${i}" ${c.w?`style="width:${c.w}px"`:''}><input class="hi" value="${esc(c.name)}" onchange="cr(${i},this.value)"><span class="hc"><i onclick="cm(${i},-1)">◀</i><i onclick="cm(${i},1)">▶</i>${c.key=='title'?'':`<i onclick="cdel(${i})">✕</i>`}${c.type!='b'?`<select onchange="D().cols[${i}].type=this.value;sv()">${CT.map(o=>`<option value="${o[0]}" ${c.type==o[0]?'selected':''}>${o[1]}</option>`).join('')}</select>`:''}</span><span class="rz" onpointerdown="rzDown(event,${i})"></span></th>`).join('')}<th class="ac"></th></tr></thead><tbody>${L.map(t=>`<tr class="${SEL[t.id]?'sl':''} ${PULSE==t.id?'pulse':''} ${isLate(t)?'lt':''} ${t.status==ST[3]?'dd':''}"><td class="pk"><input type="checkbox" ${SEL[t.id]?'checked':''} onchange="SEL['${t.id}']=this.checked;R()"></td>${d.cols.map(c=>hideC(c)?'':`<td class="c-${c.key}">${cell(t,c)}</td>`).join('')}<td class="ac"><img src="${IMG.edit}" title="Відкрити" onclick="op('${t.id}')">${t.arch?`<span title="Повернути з архіву" onclick="arch('${t.id}',false)">${UN_SVG}</span>`:`<span title="В архів" onclick="arch('${t.id}',true)">${AR_SVG}</span>`}<img src="${IMG.delete}" title="Видалити" onclick="delT('${t.id}')"></td></tr>`).join('')}</tbody></table>${FL.arch?'':`<div class="ad" onclick="addT('','','${cg?cg.id:''}')">+ Нова задача</div>`}`}</div>`}
function cell(t,c){if(c.type=='b'){const k=c.key;
    return k=='title'?`<a class="tt" data-hv="${t.id}" onclick="op('${t.id}')">${esc(t.title)||'Без назви'}</a><span class="cmb ${cmCount(t)?'':'z'}" data-cm="${t.id}" title="Коментарі"><img src="${IMG.cmt}" alt="">${cmCount(t)||''}</span>`:k=='status'?`<button class="pill ${SC[ST.indexOf(t.status)]}" onclick="stMenu(event,'${t.id}')">${esc(t.status)}</button>`:k=='pri'?`<button class="pill ${PRC[pri(t)]}" onclick="priMenu(event,'${t.id}')">${PRN[pri(t)]}</button>`:k=='stage'?esc(stage(t)):(k=='start'||k=='end')?`<input type="date" value="${t[k]||''}" onchange="up('${t.id}','${k}',this.value)">`:k=='who'?`<span class="wh" onclick="whoMenu(event,'${t.id}')">${t.who.map(un).map(esc).join(', ')||'—'}</span>`:k=='done'?(t.status==ST[3]?`<input type="date" value="${t.doneAt||''}" onchange="up('${t.id}','doneAt',this.value||today())">`:'—'):k=='project'?psel(t):k=='cat'?`<button class="pill s0" onclick="catPick(event,'${t.id}')">${esc(catN(t))||'—'}</button>`:bar(prog(t))}
  if(c.type=='func')return `<b>${fsum(t,c)}</b>`;const v=(t.c||{})[c.id];return `<input type="${c.type=='text'?'text':c.type=='percent'?'number':c.type}" value="${esc(v)}" onchange="tc('${t.id}','${c.id}',this.value)">${c.type=='percent'?bar(Math.min(100,+v||0)):''}`}
const fsum=(t,c)=>{const cs=D().cols,i=cs.findIndex(x=>x.id==c.id);return cs.slice(0,i).filter(x=>x.type=='number'||x.type=='percent').reduce((a,x)=>a+(+((t.c||{})[x.id])||0),0)};
const stMenu=(ev,t)=>menu(ev,()=>ST.map((s,i)=>({t:s,c:SC[i],f:()=>up(t,'status',s)})));
const whoMenu=(ev,t)=>menu(ev,()=>{const d=D(),o=tg(t);return TMS(d).filter(x=>x.members.length).map(x=>({t:(x.members.every(m=>o.who.includes(m))?'✓ ':'')+'👥 '+x.name,keep:1,f:()=>{teamToggle(x.id,t);wr()}})).concat(assignable(d,o.who).map(u=>({t:(o.who.includes(u.id)?'✓ ':'')+u.name,keep:1,f:()=>{const had=o.who.includes(u.id);o.who=had?o.who.filter(x=>x!=u.id):o.who.concat(u.id);if(!had)assignNotify(t,u.id);wr()}})))});
const expMenu=ev=>menu(ev,()=>[{i:'export',t:'Задачі: Excel',f:()=>exportT('xlsx')},{i:'export',t:'Задачі: PDF (друк)',f:()=>exportT('pdf')},{i:'export',t:'Задачі: Word',f:()=>exportT('doc')},{i:'export',t:'Підзадачі: Excel',f:()=>exportS('xlsx')},{i:'export',t:'Підзадачі: PDF (друк)',f:()=>exportS('pdf')},{i:'export',t:'Підзадачі: Word',f:()=>exportS('doc')},{i:'export',t:'Excel: зроблено сьогодні',f:()=>exportX()}]);
const skMenu=(ev,k)=>menu(ev,()=>{const set=(f,v)=>()=>{FL[f]=FL[f]==v?'':v;R()},all=f=>({t:'Усі',f:()=>{FL[f]='';R()}}),h=t=>({t:t,keep:1,f:()=>{}});
  if(k=='status')return [h('Статус:'),all('st')].concat(ST.map((x,i)=>({t:(FL.st==x?'✓ ':'')+x,c:SC[i],f:set('st',x)})));
  if(k=='pri')return [h('Пріоритет:'),all('pri')].concat(PRK.map(x=>({t:(FL.pri==x?'✓ ':'')+PRN[x],c:PRC[x],f:set('pri',x)})));
  if(k=='end'){const ds=[...new Set(D().tasks.filter(t=>t.end&&(FL.arch?t.arch:!t.arch)).map(t=>t.end))].sort();return [h('Дата кінця:'),all('end')].concat(ds.map(x=>({t:(FL.end==x?'✓ ':'')+fmtD(x),f:set('end',x)})))}
  const tms=TMS(D());return [h('Відповідальний:'),{t:'Усі',f:()=>{FL.who='';FL.team='';R()}}].concat(tms.length?[h('Команди:')]:[],tms.map(x=>({t:(FL.team==x.id?'✓ ':'')+'👥 '+x.name,f:()=>{FL.team=FL.team==x.id?'':x.id;FL.who='';R()}})),tms.length?[h('Співробітники:')]:[],assignable(D()).map(u=>({t:(FL.who==u.id?'✓ ':'')+u.name,f:()=>{FL.who=FL.who==u.id?'':u.id;FL.team='';R()}}))) });
const sortMenu=ev=>menu(ev,()=>[{t:FL.only?'Показати всі рядки':'Лише відмічені',f:()=>{FL.only=!FL.only;if(FL.only)FL.pick=true;R()}},{t:'Архівувати відмічені',f:archSel},{t:'Архівувати всі виконані',f:archDone},{t:'Скинути фільтри',f:()=>{FL={q:'',st:'',who:'',team:'',cat:'',sub:'',sw:'',pri:'',end:'',arch:false,sort:'',only:false,pick:false,find:false};SEL={};PF='';R()}}]);
const tglG=k=>{const d=D();if(k=='_')d.closedNone=!d.closedNone;else{const p=(d.cats||[]).find(x=>x.id==k);if(p)p.closed=!p.closed}sv()},renP=(i,v)=>{D().projects.find(p=>p.id==i).name=v.trim()||'Проєкт';sv()};
const psel=t=>`<select onchange="up('${t.id}','project',this.value)"><option value="">Без проєкту</option>${D().projects.map(p=>`<option value="${p.id}" ${p.id==t.project?'selected':''}>${esc(p.name)}</option>`).join('')}</select>`;
const up=(t,f,v)=>{tg(t)[f]=v;if(f=='status'){tg(t).auto=false;dn(tg(t))}if(f=='end')syncMs(t);sv()},tc=(t,c,v)=>{const o=tg(t);o.c=o.c||{};o.c[c]=v;sv()},cr=(i,v)=>{D().cols[i].name=v;sv()},cdel=i=>{const d=D();d.hid=d.hid||[];d.hid.push(d.cols.splice(i,1)[0]);sv()};
const hideC=c=>c.key=='project'&&!canPrj();
function rzDown(ev,i){ev.preventDefault();ev.stopPropagation();const th=ev.target.closest('th'),cols=D().cols;[...th.parentNode.children].forEach(h=>{if(h.dataset.ci!=null)cols[+h.dataset.ci].w=Math.round(h.getBoundingClientRect().width)});
  const x0=ev.clientX,w0=cols[i].w,mv=e=>{cols[i].w=Math.max(60,Math.round(w0+e.clientX-x0));document.querySelectorAll('table.t').forEach(tb=>{tb.classList.add('fx');const cg=tb.querySelectorAll('col');cols.forEach((c,k)=>{if(hideC(c))return;const idx=cols.slice(0,k).filter(z=>!hideC(z)).length+1;if(cg[idx])cg[idx].style.width=c.w+'px'})})},up2=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up2);sv()};addEventListener('pointermove',mv);addEventListener('pointerup',up2)}
const cm=(i,x)=>{const c=D().cols,j=i+x;if(j<0||j>=c.length)return;[c[i],c[j]]=[c[j],c[i]];sv()};
function addT(pj,day,cat){const t={id:uid(),title:'Нова задача',status:ST[0],start:day||'',end:day||'',who:[],subs:[],project:pj===undefined?PF:pj,cat:cat||'',pri:'mid',ts:Date.now(),doneAt:''};D().tasks.push(t);PA=true;setTimeout(()=>{PA=false},500);S.open=t.id;sv()}
const delT=t=>cfm('Видалити задачу?',()=>{const d=D();d.tasks=d.tasks.filter(x=>x.id!=t);if(S.open==t)S.open=null;sv()}),op=t=>{if(S.open!=t){PA=true;setTimeout(()=>{PA=false},500)}S.open=t;R()};
const addP=i=>{const v=g(i);if(!v)return;D().projects.push({id:uid(),name:v,desc:'',qty:'',avatar:'',files:[],ts:Date.now()});sv()},delPj=i=>{const d=D();d.projects=d.projects.filter(p=>p.id!=i);d.tasks.forEach(t=>{if(t.project==i)t.project=''});sv()};

/* ---------- вигрузка ---------- */
function tv(t,c){if(c.type=='b'){return {title:t.title,status:t.status,stage:stage(t),start:t.start,end:t.end,who:t.who.map(un).join(', '),project:pn(t),prog:prog(t)+'%',cat:catN(t),pri:PRN[pri(t)]}[c.key]}if(c.type=='func')return fsum(t,c);const v=(t.c||{})[c.id];return v==null||v===''?'':c.type=='percent'?v+'%':c.type=='number'?+v:v}
function exportT(f){const d=D(),L=vrows(d);if(!L.length)return info('Немає рядків для вигрузки');outTable(f,d.cols.map(c=>c.name),L.map(t=>d.cols.map(c=>tv(t,c))),'Задачі_'+d.name+'_'+today(),'Задачі','ЦКС · '+d.name+' · Задачі · '+today())}
/* Підзадачі: враховуються ті самі фільтри, що й для задач (та фільтри підзадач), і відмічені рядки */
const subOk=s=>(!FL.sw||s.who.includes(FL.sw))&&(FL.sub!='open'||!s.done)&&(FL.sub!='done'||s.done);
function exportS(f){const d=D(),rows=[];vrows(d).forEach(t=>t.subs.forEach(s=>{if(subOk(s))rows.push([t.title,pn(t),catN(t),s.t,s.done?'Виконано':'Не виконано',(s.who.length?s.who:t.who).map(un).join(', '),s.doneAt||''])}));
  if(!rows.length)return info('Немає підзадач для вигрузки');outTable(f,['Задача','Проєкт','Категорія','Підзадача','Статус','Відповідальні','Дата виконання'],rows,'Підзадачі_'+d.name+'_'+today(),'Підзадачі','ЦКС · '+d.name+' · Підзадачі · '+today())}
/* ---------- оформлення вигрузки ---------- */
const XCL={navy:'17375E',cream:'F1E5CD',ln:'C9D1DD',zebra:'F7F3EA',st:{'Не почато':'E6E6E6','Постійна задача':'E6CCF1','В процесі':'CCF2DB','Виконано':'8CE2AD','Не виконано':'E6E6E6'}};
/* Excel з оформленням: шапка з назвою, кольорові статуси, зебра, рамки, фільтр, підсумок.
   Потрібна бібліотека xlsx-js-style (підключена в index.html). noStat — не рахувати «Виконано» */
function xlsxSave(H,B,nm,sheet,title,noStat){
  const n=H.length,hr=3,bd={style:'thin',color:{rgb:XCL.ln}},box={top:bd,bottom:bd,left:bd,right:bd},fr=hr+1+B.length;
  let done=0,stc=-1;B.forEach(r=>r.forEach((v,c)=>{if(XCL.st[v]!==undefined&&v!='Не виконано'){stc=c;if(v=='Виконано')done++}}));
  const foot='Усього рядків: '+B.length+(stc>=0&&!noStat&&B.length?' · Виконано: '+done+' ('+Math.round(100*done/B.length)+'%)':'');
  const ws=XLSX.utils.aoa_to_sheet([[title],['Сформовано: '+today()+' · Рядків: '+B.length],[],H].concat(B,[[foot]]));
  const f=o=>Object.assign({name:'Calibri',sz:11,color:{rgb:'1C1C1C'}},o),put=(r,c,st)=>{const a=XLSX.utils.encode_cell({r,c});ws[a]=ws[a]||{t:'s',v:''};ws[a].s=st};
  for(let c=0;c<n;c++){
    put(0,c,{font:f({sz:16,bold:true,color:{rgb:XCL.cream}}),fill:{patternType:'solid',fgColor:{rgb:XCL.navy}},alignment:{vertical:'center',horizontal:'left',indent:1}});
    put(1,c,{font:f({sz:10,italic:true,color:{rgb:XCL.navy}}),fill:{patternType:'solid',fgColor:{rgb:XCL.cream}},alignment:{vertical:'center',horizontal:'left',indent:1}});
    put(hr,c,{font:f({bold:true,color:{rgb:XCL.cream}}),fill:{patternType:'solid',fgColor:{rgb:XCL.navy}},border:box,alignment:{vertical:'center',horizontal:'center',wrapText:true}});
    put(fr,c,{font:f({bold:true,color:{rgb:XCL.navy}}),fill:{patternType:'solid',fgColor:{rgb:XCL.cream}},border:box,alignment:{vertical:'center',horizontal:'left',indent:1}});
  }
  B.forEach((row,i)=>{for(let c=0;c<n;c++){const v=row[c],sc=XCL.st[v],t=String(v==null?'':v);
    put(hr+1+i,c,{font:f(sc?{bold:true,color:{rgb:XCL.navy}}:{}),fill:{patternType:'solid',fgColor:{rgb:sc||(i%2?XCL.zebra:'FFFFFF')}},border:box,alignment:{vertical:'center',horizontal:sc||t.length<=16?'center':'left',wrapText:true}})}});
  ws['!cols']=H.map((h,c)=>({wch:Math.max(12,Math.min(48,Math.max(String(h).length,...B.map(r=>String(r[c]==null?'':r[c]).length))+3))}));
  ws['!rows']=[{hpt:32},{hpt:20},{hpt:8},{hpt:26}];
  ws['!merges']=[0,1,fr].map(r=>({s:{r,c:0},e:{r,c:n-1}}));
  ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:hr,c:0},e:{r:hr+B.length,c:n-1}})};
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,String(sheet).replace(/[\[\]:*?\/\\]/g,' ').slice(0,31));XLSX.writeFile(wb,nm+'.xlsx')}
/* Те саме для PDF (друк) і Word: кольорові статуси, зебра, підсумок */
function htmlTable(H,B,title){
  const hex=v=>XCL.st[v]?' style="background:#'+XCL.st[v]+';text-align:center;font-weight:bold"':'';
  return '<html><head><meta charset="utf-8"><style>@page{size:landscape;margin:12mm}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Arial;color:#17375E}h2{margin:0 0 3px}.sub{color:#6b7280;font-size:11px;margin-bottom:10px}table{border-collapse:collapse;width:100%}th{background:#17375E;color:#F1E5CD;text-align:left}td,th{border:1px solid #C9D1DD;padding:5px 7px;font-size:12px}tr:nth-child(even) td{background:#F7F3EA}tr{page-break-inside:avoid}thead{display:table-header-group}</style></head><body><h2>'+esc(title)+'</h2><div class="sub">Сформовано: '+today()+' · Рядків: '+B.length+'</div><table><thead><tr>'+H.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+B.map(r=>'<tr>'+r.map(c=>'<td'+hex(c)+'>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></body></html>'}
function outTable(f,H,B,nm,sheet,title){
  if(f=='xlsx'){if(!window.XLSX)return info('Бібліотека Excel не завантажилась (потрібен інтернет). Виберіть Word або PDF.');xlsxSave(H,B,nm,sheet,title);return}
  const h=htmlTable(H,B,title);
  if(f=='doc'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+h],{type:'application/msword'}));a.download=nm+'.doc';a.click();return}
  const fr=document.createElement('iframe');fr.style.cssText='position:fixed;width:0;height:0;border:0';document.body.appendChild(fr);fr.contentDocument.write(h);fr.contentDocument.close();setTimeout(()=>{fr.contentWindow.focus();fr.contentWindow.print();setTimeout(()=>fr.remove(),3000)},300)}
function exportX(){const d=D(),t0=today(),rows=[['Тип','Задача','Проєкт','Статус','Відповідальні','Відділ','Дата']];d.tasks.forEach(t=>{if(t.doneAt==t0)rows.push(['Задача',t.title,pn(t),t.status,t.who.map(un).join(', '),d.name,t0]);t.subs.forEach(s=>{if(s.doneAt==t0)rows.push(['Підзадача',s.t+' ('+t.title+')',pn(t),ST[3],(s.who.length?s.who:t.who).map(un).join(', '),d.name,t0])})});
  if(rows.length<2)return info('Сьогодні виконаних задач поки немає.');const fn='Зроблено_'+t0+'_'+d.name+'.xlsx';
  if(window.XLSX){xlsxSave(rows[0],rows.slice(1),fn.replace('.xlsx',''),'Зроблено сьогодні','ЦКС · '+d.name+' · Зроблено сьогодні · '+t0,true)}
  else{const h='<meta charset="utf-8"><table>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</table>',a=document.createElement('a');a.href=URL.createObjectURL(new Blob([h],{type:'application/vnd.ms-excel'}));a.download=fn.replace('.xlsx','.xls');a.click()}}

/* ---------- бокове вікно задачі ---------- */
const stSel=t=>`<select onchange="up('${t.id}','status',this.value)">${ST.map(s=>`<option ${s==t.status?'selected':''}>${s}</option>`).join('')}</select>`;
function chips(arr,t,s){return `<div class="ch">${arr.map(u=>`<span class="c">${esc(un(u))}<i onclick="rw('${t}','${s}','${u}')">×</i></span>`).join('')}<select onchange="aw('${t}','${s}',this.value)"><option value="">+</option>${assignable(D()).filter(u=>!arr.includes(u.id)).map(u=>`<option value="${u.id}">${esc(u.name)}</option>`).join('')}</select></div>`}
const tgt=(t,s)=>s?tg(t).subs.find(x=>x.id==s):tg(t),aw=(t,s,u)=>{if(u){tgt(t,s).who.push(u);assignNotify(t,u);sv()}},rw=(t,s,u)=>{const o=tgt(t,s);o.who=o.who.filter(x=>x!=u);sv()};
var PROPS=false,ATTO=false,EDS=null;
function tgP(){PROPS=!PROPS;R()}
function tgA(){ATTO=!ATTO;R()}
function tgE(id){EDS=EDS==id?null:id;R()}
function panel(d){const t=tg(S.open),done=t.subs.filter(s=>s.done),cr={};done.forEach(s=>{const w=s.who.length?s.who:t.who;w.forEach(u=>cr[u]=(cr[u]||0)+1/w.length)});const tot=Object.values(cr).reduce((a,b)=>a+b,0);
const ICL='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3.6-3.6a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3.6 3.6a4 4 0 0 0 5.7 5.7l1-1"/></svg>';
const ICX='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>';
let prev=null;
const subs=t.subs.map(s=>{const w=s.who||[],k=w.join(','),head=k!==prev?`<div class="sgh">${w.length?esc(w.map(u=>un(u)).join(', ')):'Без виконавця'}</div>`:'';prev=k;
return head+`<div class="sbt sbr"><input type="checkbox" ${s.done?'checked':''} onchange="tog('${t.id}','${s.id}')"><input class="f ${s.done?'dn2':''}" value="${esc(s.t)}" onchange="tgt('${t.id}','${s.id}').t=this.value;sv()">${s.done?`<input type="date" class="sd" title="Дата виконання" value="${s.doneAt||''}" onchange="tgt('${t.id}','${s.id}').doneAt=this.value||today();sv()">`:''}<span class="ibn" title="Виконавці підзадачі" onclick="tgE('${s.id}')"><img src="${IMG.edit}" alt=""></span><span class="ibn" title="Видалити" onclick="ds('${t.id}','${s.id}')">${ICX}</span></div>${EDS==s.id?`<div class="sbe">${chips(w,t.id,s.id)}</div>`:''}`}).join('');
const props=PROPS?`<div class="prp">${stSel(t)}${prSel(t)}${psel(t)}${csel(t)}<div class="row"><input type="date" value="${t.start}" onchange="up('${t.id}','start',this.value)"><input type="date" value="${t.end}" onchange="up('${t.id}','end',this.value)"></div>${chips(t.who,t.id,'')}<div class="mu">Етап виконання: <b>${esc(stage(t))}</b></div></div>`:'';
const contrib=tot?Object.keys(cr).map(u=>{const pc=Math.round(100*cr[u]/tot);return `<div class="cn2"><div class="cnr"><span>${esc(un(u))}</span><b>${pc}%</b></div>${bar(pc)}</div>`}).join(''):'<div class="mu">З’явиться після виконання підзадач</div>';
return `<div class="pn ${PA?'in':''}"><div class="pnh"><span class="cmb big" data-cm="${t.id}" title="Коментарі"><img src="${IMG.cmt}" alt="">${cmCount(t)||''}</span><span class="fl"></span><span class="pni" title="Поділитися" onclick="shareOpen('${t.id}')">${ICL}</span><span class="pni" title="${t.arch?'Повернути з архіву':'В архів'}" onclick="arch('${t.id}',${!t.arch})"><img src="${IMG.archive}" alt=""></span><span class="pni" title="Закрити" onclick="S.open=null;R()">${ICX.replace('width="16" height="16"','width="22" height="22"')}</span></div><input class="tl" value="${esc(t.title)}" onchange="up('${t.id}','title',this.value)"><div class="pgr"><span>Виконано: <b>${done.length} з ${t.subs.length}</b></span><span>Загальний прогрес: <b>${prog(t)}%</b></span></div>${bar(prog(t))}${t.status==ST[3]?`<div class="dnr">Дата виконання задачі: <input type="date" value="${t.doneAt||''}" onchange="up('${t.id}','doneAt',this.value||today())"></div>`:''}<div class="sech"><h4>Підзадачі</h4><img class="dg" title="Властивості задачі" src="${IMG.dots_small}" onclick="tgP()"></div>${props}<div class="sbl">${subs}</div><input id="ns" class="addln" placeholder="+ Додати підзадачу" onkeydown="if(event.key=='Enter')as('${t.id}')"><div class="addf" onclick="tgA()">+ Додати файл/посилання</div>${ATTO||(t.att&&t.att.length)?atts(t):''}<h4 class="cth">Внесок виконавців</h4>${contrib}</div>`}
/* Усі підзадачі виконано → задача автоматично «Виконано» (крім «Постійна задача») */
const autoSt=t=>{if(!t.subs.length||t.status==ST[1])return;const all=t.subs.every(s=>s.done);if(all&&t.status!=ST[3]){t.status=ST[3];t.auto=true;dn(t)}else if(!all&&t.status==ST[3]&&t.auto){t.status=ST[2];t.auto=false;dn(t)}};
const tog=(t,s)=>{const o=tgt(t,s);o.done=!o.done;o.doneAt=o.done?today():'';autoSt(tg(t));sv()},ds=(t,s)=>{const o=tg(t);o.subs=o.subs.filter(x=>x.id!=s);autoSt(o);sv()},as=t=>{const v=g('ns');if(!v)return;const o=tg(t);o.subs.push({id:uid(),t:v,done:false,who:[]});autoSt(o);sv()};
function atts(t){t.att=t.att||[];return `<div>${t.att.map(a=>`<div class="sbt">${a.k=='link'?`<a href="${esc(a.u)}" target="_blank" rel="noopener">🔗 ${esc(a.n)}</a>`:a.img?`<a href="${a.u}" download="${esc(a.n)}"><img src="${a.u}" style="max-height:80px;max-width:140px;border-radius:4px"></a>`:`<a href="${a.u}" download="${esc(a.n)}">📎 ${esc(a.n)}</a>`}<button class="x" onclick="da('${t.id}','${a.id}')">✕</button></div>`).join('')||'<div class="mu">Вкладень немає</div>'}<div class="row" style="margin-top:6px"><input id="lk1" placeholder="https://посилання" style="flex:1"><button class="b2" onclick="addL('${t.id}')">+ Посилання</button></div><input type="file" multiple onchange="addF('${t.id}',this.files)"><div class="mu">${CLOUD?'Файли зберігаються в хмарі (до 10 МБ на файл).':'Файли й картинки зберігаються в браузері (до ~1 МБ на файл).'}</div></div>`}
const da=(t,a)=>{const o=tg(t);o.att=o.att.filter(x=>x.id!=a);sv()},addL=t=>{let u=g('lk1');if(!u)return;if(!/^https?:\/\//i.test(u))u='https://'+u;const o=tg(t);o.att=o.att||[];o.att.push({id:uid(),k:'link',n:u.replace(/^https?:\/\//i,'').slice(0,50),u:u});sv()};
async function addF(tid,fs){const t=tg(tid);t.att=t.att||[];for(const f of [...fs]){try{const a=await fileToAtt(f,D().id);t.att.push(a);if(!wr()){t.att.pop();info('Пам’ять браузера заповнена, файл не додано');return}}catch(e){info(esc(e.message||'Не вдалося додати файл'));return}}R()}

/* ---------- Kanban («Статус задач») ---------- */
function kan(d){return `<div class="kb">${ST.map((s,i)=>`<div class="kc" ondragover="event.preventDefault()" ondrop="drp(event,'${i}')"><h4>${s} · ${d.tasks.filter(t=>!t.arch&&t.status==s).length}</h4>${d.tasks.filter(t=>!t.arch&&t.status==s).map(t=>`<div class="cd" draggable="true" ondragstart="event.dataTransfer.setData('text',this.dataset.i)" data-i="${t.id}" data-hv="${t.id}" onclick="op('${t.id}')"><b>${esc(t.title)}</b>${t.cat?`<span class="pill s0" style="align-self:flex-start">${esc(catN(t))}</span>`:''}<span class="pill ${PRC[pri(t)]}" style="align-self:flex-start">${PRN[pri(t)]}</span><span class="mu">${esc(pn(t))}</span><span class="mu">${esc(stage(t))}</span><span class="mu">${t.who.map(un).map(esc).join(', ')}</span>${bar(prog(t))}</div>`).join('')}</div>`).join('')}</div>`}
const drp=(e,i)=>{e.preventDefault();const t=tg(e.dataTransfer.getData('text'));if(t){t.status=ST[+i];t.auto=false;dn(t);sv()}};

/* ---------- Проєкти ---------- */
function prj(d){return `<div class="row"><input id="pnm" placeholder="Назва проєкту (об’єкта)"><button class="b" onclick="addP('pnm')">+ Проєкт</button><button class="b2" onclick="exportX()">Excel: зроблено сьогодні</button></div>${d.projects.map(p=>{const TA=d.tasks.filter(t=>t.project==p.id),T=TA.filter(t=>!t.arch),v=TA.length?Math.round(100*TA.filter(t=>t.status==ST[3]).length/TA.length):0;p.files=p.files||[];return `<div class="pjc"><div class="pjh"><div class="av" title="Змінити фото об’єкта" onclick="document.getElementById('av_${p.id}').click()">${p.avatar?`<img src="${p.avatar}">`:'<span>+ фото</span>'}</div><input type="file" accept="image/*" id="av_${p.id}" style="display:none" onchange="setAv('${p.id}',this.files[0])"><div class="pjm"><div class="row"><input class="ti" style="flex:1;font-size:15px" value="${esc(p.name)}" onchange="renP('${p.id}',this.value)"><button class="x" title="Видалити проєкт" onclick="cfm('Видалити проєкт?',()=>delPj('${p.id}'))">✕</button></div><textarea class="pd" placeholder="Опис об’єкта" onchange="setPj('${p.id}','desc',this.value)">${esc(p.desc)}</textarea><div class="row"><label class="mu">Кількість <input type="number" style="width:90px" value="${esc(p.qty)}" onchange="setPj('${p.id}','qty',this.value)"></label><span class="mu">${T.length} задач · виконано ${v}%</span></div>${bar(v)}</div></div><h4 class="ph">Графік термінів</h4>${msHtml(p)}<h4 class="ph">Файли</h4>${p.files.map(a=>`<div class="sbt">${a.img?`<a href="${a.u}" target="_blank" rel="noopener"><img src="${a.u}" style="max-height:60px;border-radius:4px"></a>`:`<a href="${a.u}" target="_blank" rel="noopener" download="${esc(a.n)}">📎 ${esc(a.n)}</a>`}<span class="mu">${esc(a.n)}</span><button class="x" onclick="delPF('${p.id}','${a.id}')">✕</button></div>`).join('')||'<div class="mu">Файлів немає</div>'}<input type="file" multiple onchange="addPF('${p.id}',this.files)"><h4 class="ph">Задачі</h4>${T.map(t=>`<div class="sbt"><a class="tt" data-hv="${t.id}" onclick="op('${t.id}')">${esc(t.title)}</a><span class="pill ${SC[ST.indexOf(t.status)]}">${esc(t.status)}</span><span class="mu">${esc(stage(t))}</span></div>`).join('')}<button class="b2" style="margin-top:8px" onclick="addT('${p.id}')">+ Задача в проєкт</button></div>`}).join('')||'<p class="mu">Проєктів поки немає — створіть перший.</p>'}`}

/* ---------- Графік ---------- */
function cht(d){const n=ST.map(s=>d.tasks.filter(t=>!t.arch&&t.status==s).length),m=Math.max(1,...n);return `<h4>Задачі за статусами</h4>${ST.map((s,i)=>`<div class="hb"><span>${s}</span><div class="bar"><b style="width:${100*n[i]/m}%"></b></div><b>${n[i]}</b></div>`).join('')}<h4>Прогрес задач</h4>${d.tasks.filter(t=>!t.arch).map(t=>`<div class="hb"><span>${esc(t.title)}</span>${bar(prog(t))}<b>${prog(t)}%</b></div>`).join('')||'<p class="mu">Немає задач</p>'}`}

/* ---------- Власна таблиця ---------- */
function ctab(d,p){const c=p.data.cols,fn=(r,i)=>c.slice(0,i).filter(x=>x.type=='number'||x.type=='percent').reduce((a,x)=>a+(+r.c[x.id]||0),0);
return `<table class="t"><thead><tr>${c.map((x,i)=>`<th><input class="hi" value="${esc(x.name)}" onchange="P().data.cols[${i}].name=this.value;sv()"><span class="hc"><i onclick="mc(${i},-1)">◀</i><i onclick="mc(${i},1)">▶</i><i onclick="P().data.cols.splice(${i},1);sv()">✕</i><select onchange="P().data.cols[${i}].type=this.value;sv()">${[['text','Текст'],['number','Число'],['percent','Відсоток'],['func','Функція (сума зліва)']].map(o=>`<option value="${o[0]}" ${x.type==o[0]?'selected':''}>${o[1]}</option>`).join('')}</select></span></th>`).join('')}<th class="ac"></th></tr></thead><tbody>${p.data.rows.map((r,ri)=>`<tr>${c.map((x,i)=>`<td>${x.type=='func'?`<b>${fn(r,i)}</b>`:`<input type="${x.type=='text'?'text':'number'}" value="${esc(r.c[x.id])}" onchange="P().data.rows[${ri}].c['${x.id}']=this.value;sv()">${x.type=='percent'?bar(Math.min(100,+r.c[x.id]||0)):''}`}</td>`).join('')}<td class="ac"><img src="${IMG.delete}" onclick="P().data.rows.splice(${ri},1);sv()"></td></tr>`).join('')}</tbody></table><div class="bt"><button class="b" onclick="P().data.rows.push({c:{}});sv()">+ Рядок</button><input id="cn" placeholder="Назва нового стовпця"><select id="ct"><option value="text">Текст</option><option value="number">Число</option><option value="percent">Відсоток</option><option value="func">Функція</option></select><button class="bn" onclick="addC()">+ Стовпець</button></div>`}
const mc=(i,d)=>{const c=P().data.cols,j=i+d;if(j<0||j>=c.length)return;[c[i],c[j]]=[c[j],c[i]];sv()},addC=()=>{P().data.cols.push({id:uid(),name:g('cn')||'Стовпець',type:document.getElementById('ct').value});sv()};

/* ---------- Вільне полотно ---------- */
function cnv(d,p){const n=p.data.nodes,ct=x=>[x.x+80,x.y+35];return `<div class="row"><button class="b" onclick="P().data.nodes.push({id:uid(),x:20+P().data.nodes.length*20,y:20+P().data.nodes.length*20,t:''});sv()">+ Блок</button><span class="mu">Зв’язок: натисніть ⇢ на одному блоці, потім на іншому.</span></div><div class="cv"><svg>${p.data.links.map(l=>{const a=n.find(x=>x.id==l[0]),b=n.find(x=>x.id==l[1]);if(!a||!b)return'';const[p1,p2]=[ct(a),ct(b)];return `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="#17375E" stroke-opacity=".6" stroke-width="2"/>`}).join('')}</svg>${n.map((x,i)=>`<div class="nd" style="left:${x.x}px;top:${x.y}px"><div onpointerdown="nd(event,${i})"><span onclick="lk('${x.id}')" style="cursor:pointer">${from==x.id?'●':'⇢'}</span><span onclick="P().data.nodes.splice(${i},1);P().data.links=P().data.links.filter(l=>l[0]!='${x.id}'&&l[1]!='${x.id}');sv()" style="cursor:pointer">✕</span></div><textarea onchange="P().data.nodes[${i}].t=this.value;wr()">${esc(x.t)}</textarea></div>`).join('')}</div><div class="row mu">${p.data.links.map((l,i)=>`<a onclick="P().data.links.splice(${i},1);sv()">✕ ${esc((n.find(x=>x.id==l[0])||{}).t||'блок')} → ${esc((n.find(x=>x.id==l[1])||{}).t||'блок')}</a>`).join('')}</div>`}
const lk=i=>{if(!from)from=i;else{if(from!=i)P().data.links.push([from,i]);from=null}sv()};
function nd(ev,i){const n=P().data.nodes[i],sx=ev.clientX-n.x,sy=ev.clientY-n.y,el=ev.currentTarget.parentNode;if(ev.target.tagName=='SPAN')return;const mv=e=>{n.x=Math.max(0,e.clientX-sx);n.y=Math.max(0,e.clientY-sy);el.style.left=n.x+'px';el.style.top=n.y+'px'},u=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',u);sv()};addEventListener('pointermove',mv);addEventListener('pointerup',u)}

/* =====================================================================
   НОВІ МОЖЛИВОСТІ
   ===================================================================== */

/* ---------- Перетягування в боковій панелі (сторінки та відділи) ---------- */
const dov=e=>e.preventDefault();
const dgS=(e,k,id)=>{e.dataTransfer.setData('text',k+':'+id);e.dataTransfer.effectAllowed='move'};
function drS(e,k,id){const a=(e.dataTransfer.getData('text')||'').split(':');if(a[0]!=k)return;e.preventDefault();e.stopPropagation();const sid=a[1];if(sid==id)return;
  if(k=='p'){const L=D().pages,i=L.findIndex(p=>p.id==sid),j=L.findIndex(p=>p.id==id);if(i<0||j<0)return;L.splice(j,0,L.splice(i,1)[0])}
  else{const o=vis().map(x=>x.id),i=o.indexOf(sid),j=o.indexOf(id);if(i<0||j<0)return;o.splice(j,0,o.splice(i,1)[0]);S.deptOrder=o}
  sv()}

/* ---------- Файли та картинки (локально — у браузері, в хмарі — Supabase Storage) ---------- */
function loadImg(f){return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>ok(im);im.onerror=()=>no(new Error('Не вдалося прочитати зображення'));im.src=r.result};r.onerror=()=>no(new Error('Не вдалося прочитати файл'));r.readAsDataURL(f)})}
async function fileToAtt(f,dept,o){o=o||{};const isI=f.type.indexOf('image/')==0;if(o.imgOnly&&!isI)throw new Error('Потрібне зображення (png, jpg)');
  let blob=f,url=null;
  if(isI){const im=await loadImg(f),sc=Math.min(1,(o.max||1000)/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*sc));c.height=Math.max(1,Math.round(im.height*sc));c.getContext('2d').drawImage(im,0,0,c.width,c.height);
    if(CLOUD)blob=await new Promise(r=>c.toBlob(r,'image/jpeg',0.82));else url=c.toDataURL('image/jpeg',0.8)}
  else if(!CLOUD&&f.size>1e6)throw new Error('Файл «'+f.name+'» більший за 1 МБ');
  else if(CLOUD&&f.size>1e7)throw new Error('Файл «'+f.name+'» більший за 10 МБ');
  if(!CLOUD&&!url)url=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsDataURL(f)});
  if(CLOUD){const ext=isI?'jpg':((f.name.split('.').pop()||'bin').replace(/[^a-z0-9]/gi,'').slice(0,8)||'bin'),path=dept+'/'+uid()+uid()+'.'+ext,r=await DB.storage.from('files').upload(path,blob,{contentType:isI?'image/jpeg':(f.type||'application/octet-stream')});if(r.error)throw r.error;url=DB.storage.from('files').getPublicUrl(path).data.publicUrl}
  return {id:uid(),k:'file',n:f.name,u:url,img:isI}}

/* ---------- Проєкти: опис, кількість, фото-аватар, файли ---------- */
const pj1=i=>D().projects.find(p=>p.id==i);
const setPj=(i,f,v)=>{pj1(i)[f]=v;sv()};
async function setAv(i,f){if(!f)return;try{const a=await fileToAtt(f,D().id,{imgOnly:true,max:400});pj1(i).avatar=a.u;if(!wr()){info('Пам’ять браузера заповнена');return}R()}catch(e){info(esc(e.message||'Помилка'))}}
async function addPF(i,fs){const p=pj1(i);p.files=p.files||[];for(const f of [...fs]){try{const a=await fileToAtt(f,D().id);p.files.push(a);if(!wr()){p.files.pop();info('Пам’ять браузера заповнена, файл не додано');return}}catch(e){info(esc(e.message||'Помилка'));return}}R()}
const delPF=(i,a)=>{const p=pj1(i);p.files=p.files.filter(x=>x.id!=a);sv()};

/* ---------- Категорії задач ---------- */
const catN=t=>{const c=(D().cats||[]).find(x=>x.id==t.cat);return c?c.name:''};
const csel=t=>`<select onchange="if(this.value=='__new'){newCat('${t.id}')}else up('${t.id}','cat',this.value)"><option value="">Без категорії</option>${(D().cats||[]).map(c=>`<option value="${c.id}" ${c.id==t.cat?'selected':''}>${esc(c.name)}</option>`).join('')}<option value="__new">+ Нова категорія…</option></select>`;
const catRow=d=>`<div class="cats"><span class="mu">Категорії:</span><span class="cp ${!FL.cat?'on':''}" onclick="FL.cat='';R()">Усі</span>${(d.cats||[]).map(c=>`<span class="cp ${FL.cat==c.id?'on':''}" onclick="FL.cat=FL.cat=='${c.id}'?'':'${c.id}';R()">${esc(c.name)}<img src="${IMG.dots_small}" onclick="event.stopPropagation();catMenu(event,'${c.id}')"></span>`).join('')}</div>`;
const newCat=tid=>ask('Нова категорія',v=>{const c={id:uid(),name:v};D().cats=D().cats||[];D().cats.push(c);if(tid)tg(tid).cat=c.id;sv()});
const catPick=(ev,t)=>menu(ev,()=>[{t:'Без категорії',f:()=>up(t,'cat','')}].concat((D().cats||[]).map(c=>({t:c.name,f:()=>up(t,'cat',c.id)}))).concat([{t:'+ Нова категорія',f:()=>newCat(t)}]));
const catMenu=(ev,id)=>menu(ev,()=>[{i:'edit',t:'Перейменувати',f:()=>ask('Назва категорії',v=>{D().cats.find(c=>c.id==id).name=v;sv()},'',D().cats.find(c=>c.id==id).name,'Зберегти')},{i:'delete',t:'Видалити категорію',f:()=>cfm('Видалити категорію? Задачі залишаться без категорії.',()=>{const d=D();d.cats=d.cats.filter(c=>c.id!=id);d.tasks.forEach(t=>{if(t.cat==id)t.cat=''});if(FL.cat==id)FL.cat='';sv()})}]);

/* ---------- Коротка інформація про задачу при наведенні ---------- */
let HVT=null,HVC=null,HVS=null;
const hvEl=()=>{let e=document.getElementById('hv');if(!e){e=document.createElement('div');e.id='hv';e.className='hv';document.body.appendChild(e);e.addEventListener('mouseenter',()=>clearTimeout(HVC));e.addEventListener('mouseleave',hvHide)}return e};
const hvClose=()=>{HVT=null;hvEl().style.display='none'},hvHide=()=>{clearTimeout(HVC);HVC=setTimeout(hvClose,300)};
function hvFill(){const e=hvEl(),d=D(),t=d&&d.tasks.find(x=>x.id==HVT);if(!t){hvClose();return}const done=t.subs.filter(s=>s.done).length;
  e.innerHTML=`<div class="row"><b style="flex:1;color:var(--navy)">${esc(t.title)}</b><span class="pill ${SC[ST.indexOf(t.status)]}">${esc(t.status)}</span></div>${bar(prog(t))}<div class="mu" style="margin:4px 0 6px">Підзадачі: ${done} з ${t.subs.length}${catN(t)?' · '+esc(catN(t)):''}</div>${t.subs.length?t.subs.map(s=>`<label class="hs"><input type="checkbox" ${s.done?'checked':''} onchange="hvTog('${t.id}','${s.id}')"><span class="${s.done?'dn2':''}">${esc(s.t)}</span><small class="mu">${s.done&&s.doneAt?fmtD(s.doneAt)+' · ':''}${s.who.map(un).map(esc).join(', ')}</small></label>`).join(''):'<div class="mu">Підзадач немає</div>'}<a class="hl" onclick="op('${t.id}');hvClose()">Відкрити задачу →</a>`}
function hvOpen(a){HVT=a.dataset.hv;const e=hvEl();hvFill();if(!HVT)return;e.style.display='block';const r=a.getBoundingClientRect();e.style.left=Math.max(8,Math.min(r.left,innerWidth-e.offsetWidth-8))+'px';let y=r.bottom+4;if(y+e.offsetHeight>innerHeight-8)y=Math.max(8,r.top-e.offsetHeight-4);e.style.top=y+'px'}
const hvTog=(t,s)=>{tog(t,s);hvFill()};
document.addEventListener('mouseover',e=>{const a=e.target.closest&&e.target.closest('[data-hv]');if(!a)return;clearTimeout(HVC);clearTimeout(HVS);if(HVT==a.dataset.hv&&hvEl().style.display=='block')return;HVS=setTimeout(()=>hvOpen(a),200)});
document.addEventListener('mouseout',e=>{const a=e.target.closest&&e.target.closest('[data-hv]');if(a){clearTimeout(HVS);hvHide()}});


/* ---------- Архів задач ---------- */
const AR_SVG='<img class="ai" src="'+IMG.archive+'" alt="">',UN_SVG='<svg class="ai" viewBox="0 0 24 24" fill="none" stroke="#17375E" stroke-width="2"><path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3"/></svg>';
const arch=(t,v)=>{const o=tg(t);o.arch=v;o.archAt=v?today():'';if(!v&&o.status==ST[3])o.doneAt=today();if(v&&S.open==t)S.open=null;sv()};
const archSel=()=>{const d=D();let n=0;d.tasks.forEach(t=>{if(SEL[t.id]&&!t.arch){t.arch=true;t.archAt=today();n++}});SEL={};if(!n)info('Спершу відмітьте рядки галочкою ліворуч (вона з’являється при наведенні на задачу).');else sv()};
const archDone=()=>{const L=D().tasks.filter(t=>t.status==ST[3]&&!t.arch);if(!L.length)return info('Немає виконаних задач для архівації.');cfm('Архівувати виконані задачі ('+L.length+')?',()=>{L.forEach(t=>{t.arch=true;t.archAt=today()});sv()})};

/* Автоархів: виконана задача через місяць після виконання сама йде в архів.
   Задачі «Виконано» без дати виконання отримують сьогоднішню дату (відлік починається зараз). */
function autoArchive(){const lim=new Date();lim.setMonth(lim.getMonth()-1);const L=lim.getFullYear()+'-'+String(lim.getMonth()+1).padStart(2,'0')+'-'+String(lim.getDate()).padStart(2,'0');let n=0;
  S.depts.forEach(d=>d.tasks.forEach(t=>{if(t.status==ST[3]&&!t.arch){if(!t.doneAt){t.doneAt=today();n++;return}if(t.doneAt<=L){t.arch=true;t.archAt=today();t.autoArch=true;n++}}}));return n}
function runAuto(){if(!me())return;remindRun();cmRemind();if(autoArchive()){if(CLOUD)schedPush();else wr();R()}}
setInterval(runAuto,3600000);

/* ---------- Кнопка «+ Додати стовпець» (праворуч угорі) ---------- */
const colMenu=ev=>menu(ev,()=>{const d=D();d.hid=d.hid||[];const hb=ALLB.filter(k=>!d.cols.some(c=>c.key==k)&&!d.hid.some(c=>c.key==k&&c.type=='b')).map(k=>({id:k,key:k,name:BN[k],type:'b'}));
  return d.hid.concat(hb).map(c=>({t:c.name+(c.type=='b'?'':' ('+((CT.find(x=>x[0]==c.type)||['',''])[1])+')'),f:()=>{d.hid=d.hid.filter(x=>x.id!=c.id);d.cols.push(c);sv()}})).concat([{t:'+ Створити новий стовпець',f:newCol}])});
const newCol=()=>ask('Новий стовпець',(v,t)=>{D().cols.push({id:uid(),key:'c',name:v,type:t||'text'});sv()},`<select id="ms">${CT.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join('')}</select>`);

/* =====================================================================
   ТАЙМЛАЙН, ЦЕНТР УПРАВЛІННЯ, АНІМАЦІЇ, ЖИВА ПРИСУТНІСТЬ
   ===================================================================== */
let TL={ppd:16,pf:'',sx:0,sy:0,first:true,tx:0,mn:0},PA=false,MA=false,PULSE=null,LMP={x:innerWidth/2,y:innerHeight/2},LK='',CNT=false,ANT=null,PCH=null;
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
addEventListener('mousemove',e=>{LMP={x:e.clientX,y:e.clientY}});
const ONE=864e5,dnum=s=>s?Math.floor(Date.parse(s+'T00:00:00Z')/ONE):null,dstr=n=>new Date(n*ONE).toISOString().slice(0,10);

/* ---------- Нові сторінки у відділі ---------- */
function ensureV4(d){if(d.v4)return false;d.v4=1;d.pages=d.pages||[];if(!d.pages.some(p=>p.type=='timeline'))d.pages.push({id:uid(),name:'Таймлайн',type:'timeline'});if(!d.pages.some(p=>p.type=='dash'))d.pages.push({id:uid(),name:'Центр управління',type:'dash'});return true}

/* ---------- Анімації ---------- */
function enter(){const b=document.body;b.classList.add('ani');clearTimeout(ANT);ANT=setTimeout(()=>b.classList.remove('ani'),1400)}
function cntUp(el){const to=+el.dataset.cnt,t0=performance.now();(function f(t){const k=Math.min(1,(t-t0)/800),e=1-Math.pow(1-k,3);el.textContent=Math.round(to*e);if(k<1)requestAnimationFrame(f)})(t0)}
function confetti(){if(REDUCED)return;const c=document.createElement('canvas');c.width=innerWidth;c.height=innerHeight;c.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:60';document.body.appendChild(c);
  const x=c.getContext('2d'),cols=['#17375E','#F1E5CD','#00be49','#8300b7','#5b7fb0'],P=[];for(let i=0;i<80;i++){const a=Math.random()*Math.PI*2,v=3+Math.random()*7;P.push({x:LMP.x,y:LMP.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-4,s:4+Math.random()*6,c:cols[i%cols.length],r:Math.random()*6,vr:(Math.random()-.5)*.4})}
  const t0=performance.now();(function f(t){const e=t-t0;x.clearRect(0,0,c.width,c.height);P.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.25;p.vx*=.99;p.r+=p.vr;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.globalAlpha=Math.max(0,1-e/1500);x.fillStyle=p.c;x.fillRect(-p.s/2,-p.s/3,p.s,p.s*.6);x.restore()});if(e<1500)requestAnimationFrame(f);else c.remove()})(t0)}
function toast(m){let c=document.getElementById('toasts');if(!c){c=document.createElement('div');c.id='toasts';c.className='toasts';document.body.appendChild(c)}const e=document.createElement('div');e.className='toast';e.textContent=m;c.appendChild(e);setTimeout(()=>{e.classList.add('out');setTimeout(()=>e.remove(),300)},4200)}
function celebrate(t){PULSE=t.id;setTimeout(()=>{PULSE=null},1200);confetti();toast('Задачу «'+t.title+'» виконано 🎉');bc('done',{title:t.title})}

/* ---------- Жива присутність (потрібна база даних) ---------- */
const ini=n=>(n||'?').split(/\s+/).map(w=>w[0]||'').slice(0,2).join('').toUpperCase();
function presHtml(){const m=me();if(!m)return '';return D()?'':bellBtn()}
const drawPres=()=>{const e=document.getElementById('pres');if(e)e.innerHTML=presHtml();const b=document.getElementById('bellw');if(b)b.innerHTML=bellBtn()};
const trackPres=()=>{if(PCH&&me())try{PCH.track({id:S.me,name:me().name,dept:D()?D().name:'',page:P()?P().name:''})}catch(e){}};
function bc(ev,p){if(!CLOUD||!PCH||!me())return;try{PCH.send({type:'broadcast',event:ev,payload:Object.assign({by:me().name,uid:S.me,dept:S.dept},p)})}catch(e){}}
function assignNotify(tid,u){if(u==S.me)return;const t=tg(tid);if(t)bc('assign',{title:t.title,to:[u]})}
function subPres(){if(!CLOUD||PCH)return;PCH=DB.channel('cks-presence',{config:{presence:{key:S.me}}});
  PCH.on('presence',{event:'sync'},()=>{const st=PCH.presenceState();S.online=Object.keys(st).map(k=>st[k][0]).filter(Boolean);drawPres()})
   .on('broadcast',{event:'done'},m=>{const p=m.payload||{};if(vis().some(x=>x.id==p.dept))toast(p.by+' виконав(ла) задачу «'+p.title+'»')})
   .on('broadcast',{event:'assign'},m=>{const p=m.payload||{};if((p.to||[]).includes(S.me))toast(p.by+' призначив(ла) вам задачу «'+p.title+'»')})
   .subscribe(st=>{if(st==='SUBSCRIBED')trackPres()})}

/* ---------- Після кожного малювання: вхід на сторінку, лічильники, прокрутка таймлайну ---------- */
function postR(){document.body.classList.toggle('hasp',!!(S.open&&S.me&&!SH));document.body.classList.toggle('sbo',!!(SB&&MOB()&&S.me&&!SH));if(typeof aiMount=='function')aiMount();cmRefresh();if(!S.me)return;if(!S.loading&&!REM){REM=true;setTimeout(()=>{remindRun();cmRemind()},1200)}const k=S.dept+':'+S.page;if(k!=LK){LK=k;enter();TL.first=true;CNT=true;trackPres()}
  if(CNT&&document.body.classList.contains('ani'))document.querySelectorAll('[data-cnt]').forEach(cntUp);CNT=false;
  const sc=document.getElementById('gtsc');if(sc){if(TL.first){sc.scrollLeft=Math.max(0,TL.tx-320);TL.sx=sc.scrollLeft;TL.first=false}else{sc.scrollLeft=TL.sx;sc.scrollTop=TL.sy||0}sc.addEventListener('scroll',()=>{TL.sx=sc.scrollLeft;TL.sy=sc.scrollTop})}}

/* ---------- Таймлайн (діаграма Ганта) ---------- */
function tml(d){const T=d.tasks.filter(t=>!t.arch&&(!TL.pf||t.project==TL.pf)),td=dnum(today()),ppd=TL.ppd,LW=220;
  let mn=td-7,mx=td+45;T.forEach(t=>{if(t.start||t.end){mn=Math.min(mn,dnum(t.start||t.end)-3);mx=Math.max(mx,dnum(t.end||t.start)+10)}});
  d.projects.forEach(p=>(p.ms||[]).forEach(x=>{if(x.date){mn=Math.min(mn,dnum(x.date)-3);mx=Math.max(mx,dnum(x.date)+10)}}));const N=mx-mn+1,W=N*ppd;TL.mn=mn;TL.tx=LW+(td-mn)*ppd;
  const MS=['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
  let mo='',dy='',i=0;
  while(i<N){const dt=new Date((mn+i)*ONE),y=dt.getUTCFullYear(),m=dt.getUTCMonth(),len=Math.min(N-i,new Date(Date.UTC(y,m+1,0)).getUTCDate()-dt.getUTCDate()+1);mo+=`<div style="width:${len*ppd}px">${ppd>=5?MS[m]+' '+y:''}</div>`;i+=len}
  for(let k=0;k<N;k++){const n=mn+k,dt=new Date(n*ONE);dy+=`<div style="width:${ppd}px;${(n+3)%7>=5&&ppd>=14?'background:rgba(23,55,94,.05)':''}">${ppd>=14?dt.getUTCDate():''}</div>`}
  const gs=ppd>=14?`background-image:linear-gradient(to right,rgba(23,55,94,.08) 1px,transparent 1px);background-size:${ppd}px 100%`:`background-image:linear-gradient(to right,rgba(23,55,94,.1) 1px,transparent 1px);background-size:${7*ppd}px 100%;background-position:${((7-((mn+3)%7))%7)*ppd}px 0`;
  const gb=t=>{const a=t.start||t.end,b=t.end||t.start;if(!a)return `<span class="gt-nd" style="left:${(td-mn)*ppd}px" onclick="tlDefault('${t.id}')">+ задати дати</span>`;
    const x=(dnum(a)-mn)*ppd,w=(dnum(b)-dnum(a)+1)*ppd,late=t.status!=ST[3]&&dnum(b)<td;
    return `<div class="gt-bar s${ST.indexOf(t.status)}b ${late?'late':''}" data-hv="${t.id}" style="left:${x}px;width:${w}px" onpointerdown="tlDown(event,'${t.id}')"><u class="hl"></u><i style="width:${prog(t)}%"></i><span>${w>70?esc(t.title):''}</span><u class="hr"></u></div>`};
  const G=d.projects.map(p=>({p:p,L:T.filter(t=>t.project==p.id)})).concat([{p:null,L:T.filter(t=>!d.projects.some(p=>p.id==t.project))}]).filter(g=>g.L.length);
  const rows=G.map(g=>{const ds=g.L.filter(t=>t.start||t.end);let sp='';if(ds.length){const a=Math.min(...ds.map(t=>dnum(t.start||t.end))),b=Math.max(...ds.map(t=>dnum(t.end||t.start)));sp=`<div class="gt-sp" style="left:${(a-mn)*ppd}px;width:${(b-a+1)*ppd}px"></div>`}
    return `<div class="gt-r gh2"><div class="gt-l">${g.p&&g.p.avatar?`<img class="pav" src="${g.p.avatar}">`:''}${esc(g.p?g.p.name:'Без проєкту')}</div><div class="gt-t" style="width:${W}px">${sp}${msMarks(g.p,mn,ppd)}</div></div>`+g.L.map(t=>`<div class="gt-r"><div class="gt-l" title="${esc(t.title)}"><span class="dot s${ST.indexOf(t.status)}b"></span><a class="tt" data-hv="${t.id}" onclick="op('${t.id}')">${esc(t.title)}</a></div><div class="gt-t" style="width:${W}px;${gs}">${gb(t)}</div></div>`).join('')}).join('');
  return `<div class="gtb"><select onchange="TL.ppd=+this.value;TL.first=true;R()">${[[34,'Дні'],[16,'Тижні'],[5,'Місяці']].map(o=>`<option value="${o[0]}" ${TL.ppd==o[0]?'selected':''}>Масштаб: ${o[1]}</option>`).join('')}</select><select onchange="TL.pf=this.value;R()"><option value="">Усі проєкти</option>${d.projects.map(p=>`<option value="${p.id}" ${p.id==TL.pf?'selected':''}>${esc(p.name)}</option>`).join('')}</select><button class="bn" onclick="tlToday()">Сьогодні</button><span class="mu">Тягніть смугу, щоб змінити строки; краї смуги змінюють початок і кінець. Клік відкриває задачу.</span></div><div class="gt-sc" id="gtsc"><div class="gt-in" style="width:${LW+W}px"><div class="gt-hd"><div class="gt-r" style="height:auto"><div class="gt-l"></div><div class="gt-mo">${mo}</div></div><div class="gt-r" style="height:auto"><div class="gt-l"></div><div class="gt-dy">${dy}</div></div></div>${rows||'<p class="mu" style="padding:16px">Немає задач</p>'}<div class="gt-today" style="left:${TL.tx+ppd/2}px"></div></div></div>`}
const tlToday=()=>{const sc=document.getElementById('gtsc');if(sc){sc.scrollLeft=Math.max(0,TL.tx-320);TL.sx=sc.scrollLeft}};
const tlDefault=id=>{const t=tg(id);t.start=today();t.end=dstr(dnum(today())+7);sv()};
function tlDown(ev,id){if(ev.button)return;hvClose();const t=tg(id),el=ev.currentTarget,mode=ev.target.classList.contains('hl')?'l':ev.target.classList.contains('hr')?'r':'m',x0=ev.clientX,ppd=TL.ppd,L0=parseFloat(el.style.left),W0=parseFloat(el.style.width);let dd=0,moved=false;
  const mv=e=>{const dx=e.clientX-x0;if(Math.abs(dx)>3)moved=true;dd=Math.round(dx/ppd);if(mode=='m')el.style.left=(L0+dd*ppd)+'px';else if(mode=='l'){const w=Math.max(ppd,W0-dd*ppd);el.style.left=(L0+(W0-w))+'px';el.style.width=w+'px'}else el.style.width=Math.max(ppd,W0+dd*ppd)+'px'};
  const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);if(!moved){op(id);return}const a=dnum(t.start||t.end),b=dnum(t.end||t.start);let na=a,nb=b;if(mode=='m'){na=a+dd;nb=b+dd}else if(mode=='l')na=Math.min(a+dd,b);else nb=Math.max(b+dd,a);t.start=dstr(na);t.end=dstr(nb);syncMs(id);sv()};
  addEventListener('pointermove',mv);addEventListener('pointerup',up);ev.preventDefault()}

/* ---------- Центр управління (дашборд відділу) ---------- */
function dash(d){d.dash=d.dash&&d.dash.length?d.dash:defDash();
  const T=d.tasks.filter(t=>!t.arch),td=today(),open=T.filter(t=>t.status!=ST[3]),late=T.filter(isLate).sort((a,b)=>a.end<b.end?-1:1),cnt=ST.map(s=>T.filter(t=>t.status==s).length),C=2*Math.PI*34,ed=DE&&canMng(d);
  const tt=w=>esc(w.t||DW[w.k].n),kp=(l,v,c)=>`<div class="ds-c ds-k"><div class="mu">${l}</div><b class="kv" ${c?`style="color:${c}"`:''} data-cnt="${v}">${v}</b></div>`,card=(w,x)=>`<div class="ds-c"><h4>${tt(w)}</h4>${x}</div>`;
  const ring=v=>`<svg viewBox="0 0 80 80" width="76" height="76"><circle cx="40" cy="40" r="34" fill="none" stroke="rgba(23,55,94,.12)" stroke-width="8"/><circle class="rg" cx="40" cy="40" r="34" fill="none" stroke="#00be49" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-v/100)}" style="--c:${C}" transform="rotate(-90 40 40)"/><text x="40" y="45" text-anchor="middle" font-size="16" font-weight="700" fill="#17375E">${v}%</text></svg>`;
  const pring=v=>{const RR=108,Cc=2*Math.PI*RR;return `<svg class="pr" viewBox="0 0 240 240" width="92" height="92"><circle cx="120" cy="120" r="${RR}" fill="none" stroke="#B3B3B3" stroke-opacity=".5" stroke-width="22"/><circle class="rg" cx="120" cy="120" r="${RR}" fill="none" stroke="#8ed19c" stroke-width="22" stroke-dasharray="${Cc}" stroke-dashoffset="${Cc*(1-v/100)}" style="--c:${Cc}" transform="rotate(-90 120 120)"/><text x="120" y="133" text-anchor="middle" font-size="52" font-weight="700" fill="#17375E">${v}%</text></svg>`};

  const hbars=(rows,col)=>{const mx=Math.max(1,...rows.map(r=>r[1]));return rows.map(r=>`<div class="hb"><span>${esc(r[0])}</span><div class="bar"><b style="width:${100*r[1]/mx}%;${col?'background:'+col:''}"></b></div><b>${r[1]}</b></div>`).join('')};
  const W={
    k_act:w=>kp(tt(w),T.length),k_proc:w=>kp(tt(w),cnt[2]),k_done:w=>kp(tt(w),cnt[3],'#00803a'),k_late:w=>kp(tt(w),late.length,late.length?'#c0392b':''),
    k_risk:w=>{const n=riskTasks(d).length+riskMs(d).filter(o=>o.lv>=2).length;return kp(tt(w),n,n?'#c0392b':'')},
    k_high:w=>kp(tt(w),open.filter(t=>pri(t)=='high').length,'#c0392b'),
    kcount:w=>{const f=w.f||{};return kp(tt(w)+((f.st||f.pri||f.cat)?' <small class="mu">('+[f.st,f.pri&&PRN[f.pri],f.cat&&(d.cats.find(c=>c.id==f.cat)||{}).name].filter(Boolean).map(esc).join(', ')+')</small>':''),T.filter(t=>(!f.st||t.status==f.st)&&(!f.pri||pri(t)==f.pri)&&(!f.cat||t.cat==f.cat)).length)},
    projects:w=>card(w,`<div class="ds-pw">${d.projects.map(p=>{const TA=d.tasks.filter(t=>t.project==p.id),v=TA.length?Math.round(100*TA.filter(t=>t.status==ST[3]).length/TA.length):0;return `<div class="ds-p">${pring(v)}<div><b>${esc(p.name)}</b><div class="pn2">${TA.length} задач${p.qty?' · К-сть '+esc(p.qty):''}</div></div></div>`}).join('')||'<div class="mu">Проєктів поки немає</div>'}</div>`),

    status:w=>{const cols=['#cfcfcf','#8300b7','#00be49','#00803a'],tot=T.length||1;let off=0;const arcs=cnt.map((n,i)=>{const l=C*n/tot,a=`<circle cx="40" cy="40" r="34" fill="none" stroke="${cols[i]}" stroke-width="12" stroke-dasharray="${l} ${C-l}" stroke-dashoffset="${-off}" transform="rotate(-90 40 40)"/>`;off+=l;return a}).join('');
      return card(w,`<div class="row"><svg class="ds-dn" viewBox="0 0 80 80" width="110" height="110">${arcs}<text x="40" y="45" text-anchor="middle" font-size="15" font-weight="700" fill="#17375E">${T.length}</text></svg><div class="ds-leg">${ST.map((s,i)=>`<span><i style="background:${cols[i]}"></i>${s}: <b>${cnt[i]}</b></span>`).join('')}</div></div>`)},
    done14:w=>{const days=[];for(let i=13;i>=0;i--){const ds=dstr(dnum(td)-i);days.push([ds,d.tasks.filter(t=>t.doneAt==ds).length])}const mx=Math.max(1,...days.map(x=>x[1]));return card(w,`<div class="ds-ch">${days.map(x=>`<div class="ds-b" title="${x[0]}: ${x[1]}"><em>${x[1]||''}</em><div class="ds-bw"><i style="height:${100*x[1]/mx}%"></i></div><span>${x[0].slice(8)}</span></div>`).join('')}</div>`)},
    load:w=>{const wl={};open.forEach(t=>t.who.forEach(u=>wl[u]=(wl[u]||0)+1));const arr=Object.keys(wl).map(u=>[u,wl[u]]).sort((a,b)=>b[1]-a[1]),avg=arr.length?arr.reduce((a,x)=>a+x[1],0)/arr.length:0,wm=Math.max(1,...arr.map(x=>x[1]));
      return card(w,arr.map(a=>{const over=a[1]>=5&&a[1]>avg*1.4;return `<div class="hb"><span>${esc(un(a[0]))}</span><div class="bar"><b style="width:${100*a[1]/wm}%;background:${over?'#c0392b':'var(--ok)'}"></b></div><b>${a[1]}</b>${over?'<small class="over">перевантажений</small>':''}</div>`}).join('')||'<div class="mu">Невиконаних задач з виконавцями немає</div>')},
    ms:w=>card(w,upMs(d)),risk:w=>card(w,riskHtml(d)),
    late:w=>card(w,late.map(t=>`<div class="sbt"><a class="tt" data-hv="${t.id}" onclick="op('${t.id}')">${esc(t.title)}</a><span class="mu" style="flex:1">${t.who.map(un).map(esc).join(', ')}</span><span class="late-b">${dnum(td)-dnum(t.end)} дн.</span></div>`).join('')||'<div class="mu">Прострочених задач немає 👍</div>'),
    prio:w=>card(w,hbars(PRK.map(k=>[PRN[k],open.filter(t=>pri(t)==k).length]),'#17375E')),
    cats:w=>{const rows=(d.cats||[]).map(c=>[c.name,open.filter(t=>t.cat==c.id).length]).concat([['Без категорії',open.filter(t=>!(d.cats||[]).some(c=>c.id==t.cat)).length]]).filter(r=>r[1]);return card(w,rows.length?hbars(rows,'#5b7fb0'):'<div class="mu">Немає задач</div>')},
    note:(w,i)=>card(w,`<textarea class="pd" style="min-height:90px" placeholder="Ваша нотатка…" ${ed||canMng(d)?'':'disabled'} onchange="dwTxt(${i},this.value)">${esc(w.txt||'')}</textarea>`)
  };
  const tb=canMng(d)?`<div class="row dtb"><button class="${ed?'b':'bn'}" onclick="DE=!DE;R()">${ed?'✓ Готово':'✎ Налаштувати центр'}</button>${ed?`<select onchange="dwAdd(this.value)"><option value="">+ Додати блок…</option>${Object.keys(DW).map(k=>`<option value="${k}">${DW[k].n}</option>`).join('')}</select><button class="b2" onclick="dwReset()">Стандартний набір</button><span class="mu">Тягніть блоки, щоб змінити порядок; ↔ — ширина; ✎ — назва; ✕ — прибрати.</span>`:''}</div>`:'';
  return `<div class="ds">${tb}<div class="dsg ${ed?'ed':''}">${d.dash.map((w,i)=>{if(!W[w.k]||(['projects','ms'].includes(w.k)&&!canPrj()))return '';return `<div class="dw w${w.w||DW[w.k].w}" ${ed?`draggable="true" ondragstart="dwDrag(event,${i})" ondragover="event.preventDefault()" ondrop="dwDrop(event,${i})"`:''}>${ed?`<div class="dwt"><button title="Лівіше" onclick="dwMove(${i},-1)">◀</button><button title="Правіше" onclick="dwMove(${i},1)">▶</button><button title="Ширина" onclick="dwSize(${i})">↔ ${w.w||DW[w.k].w}/4</button><button title="Назва" onclick="dwRen(${i})">✎</button>${w.k=='kcount'?`<button title="Фільтр" onclick="dwCfg(${i})">⚙</button>`:''}<button title="Прибрати" onclick="dwDel(${i})">✕</button></div>`:''}${W[w.k](w,i)}</div>`}).join('')||'<div class="mu">Блоків немає. Натисніть «Налаштувати центр» і додайте потрібні.</div>'}</div></div>`}

/* =====================================================================
   КАЛЕНДАР, ГРАФІК ТЕРМІНІВ ПРОЄКТУ (з автозадачами), НАГАДУВАННЯ, ПОСАДИ
   ===================================================================== */
const POS={boss:'Начальник',asst:'Помічник',pm:'Проєктний менеджер',apm:'Помічник проєктного менеджера'};
const fmtD=s=>s?s.slice(8)+'.'+s.slice(5,7)+'.'+s.slice(0,4):'';
let CAL={y:new Date().getFullYear(),m:new Date().getMonth(),pf:''},BELL=false,REM=false;
const K3='cks_rem_v1';

/* ---------- Шаблони термінів: «термін → автозадача» ---------- */
function defTpl(){return [['Термін доставки МК','Відвантажити останню машину по МК'],['Термін виготовлення МК','Завершити виготовлення МК'],['Початок монтажу','Підготувати бригаду і техніку до початку монтажу'],['Здача об’єкта','Підписати акти та здати об’єкт замовнику'],['Оплата від замовника','Звірити документи та нагадати замовнику про оплату']].map(a=>({id:uid(),m:a[0],t:a[1]}))}
function ensureV5(d){if(d.v5)return false;d.v5=1;d.tpl=d.tpl&&d.tpl.length?d.tpl:defTpl();d.pages=d.pages||[];if(!d.pages.some(p=>p.type=='calendar')){const i=d.pages.findIndex(p=>p.type=='dash'),pg={id:uid(),name:'Календар',type:'calendar'};if(i<0)d.pages.push(pg);else d.pages.splice(i,0,pg)}return true}

/* ---------- Календар (місяць): задачі смугами, терміни проєктів прапорцями ---------- */
function cal(d){const y=CAL.y,m=CAL.m,f=dnum(y+'-'+String(m+1).padStart(2,'0')+'-01'),off=(f+3)%7,dim=new Date(Date.UTC(y,m+1,0)).getUTCDate(),weeks=Math.ceil((off+dim)/7),s0=f-off,td=dnum(today());
  const PAL=['rgba(23,55,94,.2)','rgba(0,190,73,.28)','rgba(131,0,183,.22)','rgba(245,184,0,.4)','rgba(192,57,43,.22)','rgba(91,127,176,.35)'];
  const PJ=d.projects.map((p,i)=>({p:p,c:PAL[i%PAL.length]})).filter(o=>!CAL.pf||o.p.id==CAL.pf).map(o=>{const ds=[];(o.p.ms||[]).forEach(x=>{if(x.date)ds.push(x.date)});d.tasks.forEach(t=>{if(!t.arch&&t.project==o.p.id){if(t.start)ds.push(t.start);if(t.end)ds.push(t.end)}});ds.sort();return ds.length?{p:o.p,c:o.c,a:dnum(ds[0]),b:dnum(ds[ds.length-1])}:null}).filter(Boolean);
  const MSS=[];d.projects.forEach(p=>(p.ms||[]).forEach(x=>{if(x.date&&(!CAL.pf||p.id==CAL.pf))MSS.push({p:p,x:x})}));
  const MN=['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
  let h=`<div class="gtb"><button class="bn" onclick="calGo(-1)">‹</button><b class="cal-t">${MN[m]} ${y}</b><button class="bn" onclick="calGo(1)">›</button><button class="bn" onclick="calGo(0)">Сьогодні</button><select onchange="CAL.pf=this.value;R()"><option value="">Усі проєкти</option>${d.projects.map(p=>`<option value="${p.id}" ${p.id==CAL.pf?'selected':''}>${esc(p.name)}</option>`).join('')}</select><button class="bn" onclick="icsExport()">⬇ У календар (.ics) з нагадуваннями</button><span class="mu">Календар проєктів: смуга — тривалість проєкту, ⚑ — його терміни. Подвійний клік по дню додає термін проєкту.</span></div><div class="cal"><div class="cal-h">${['Пн','Вт','Ср','Чт','Пт','Сб','Нд'].map(x=>`<div>${x}</div>`).join('')}</div>`;
  for(let w=0;w<weeks;w++){const w0=s0+w*7,w6=w0+6,seg=PJ.filter(o=>o.b>=w0&&o.a<=w6).sort((p,q)=>p.a-q.a||(q.b-q.a)-(p.b-p.a)),lanes=[];
    seg.forEach(o=>{const from=Math.max(o.a,w0),to=Math.min(o.b,w6);let L=0;while(lanes[L]!=null&&lanes[L]>=from)L++;lanes[L]=to;o.L=L;o.from=from;o.to=to});
    const H=48+lanes.length*22+8,cells=Array.from({length:7},(_,i)=>{const n=w0+i,dt=new Date(n*ONE),ds=dstr(n),ms=MSS.filter(z=>z.x.date==ds);return `<div class="cc ${dt.getUTCMonth()==m?'':'oth'} ${(n+3)%7>=5?'we':''} ${n==td?'tdy':''}" data-day="${ds}" ondblclick="calAdd('${ds}')"><span class="cn">${dt.getUTCDate()}</span><div class="cmz">${ms.slice(0,2).map(z=>`<span class="cms" title="${esc(z.p.name)}: ${esc(z.x.name)}" onclick="goPj('${z.p.id}')">⚑ ${esc(z.x.name)}</span>`).join('')}${ms.length>2?`<span class="cms">+${ms.length-2}</span>`:''}</div></div>`}).join('');
    h+=`<div class="cal-w" style="height:${H}px">${cells}${seg.map(o=>`<div class="cbar pj ${o.a<w0?'cl':''} ${o.b>w6?'cr':''}" title="${esc(o.p.name)}" style="background:${o.c};left:calc(${o.from-w0}*100%/7 + 2px);width:calc(${o.to-o.from+1}*100%/7 - 4px);top:${46+o.L*22}px" onclick="goPj('${o.p.id}')">${o.a>=w0||w==0?esc(o.p.name):''}</div>`).join('')}</div>`}
  return h+'</div>'}
const calGo=k=>{if(!k){CAL.y=new Date().getFullYear();CAL.m=new Date().getMonth()}else{CAL.m+=k;if(CAL.m<0){CAL.m=11;CAL.y--}if(CAL.m>11){CAL.m=0;CAL.y++}}R()};


/* ---------- Графік термінів проєкту + автозадача ---------- */
const pj2=i=>D().projects.find(p=>p.id==i);
function syncMs(tid){const t=tg(tid);if(!t||!t.ms||!t.end)return;D().projects.forEach(p=>(p.ms||[]).forEach(x=>{if(x.id==t.ms&&x.date!=t.end){const old=x.date;x.date=t.end;t.title=t.title.replace(fmtD(old),fmtD(t.end))}}))}
function msMkTask(p,x){const t={id:uid(),title:x.title+' '+fmtD(x.date),status:ST[0],start:x.date,end:x.date,who:[],subs:[],project:p.id,cat:'',ts:Date.now(),doneAt:'',ms:x.id};D().tasks.push(t);x.task=t.id;toast('Створено задачу «'+t.title+'»')}
function msHtml(p){const d=D(),td=dnum(today()),L=(p.ms||[]).slice().sort((a,b)=>a.date<b.date?-1:1);
  return `<div class="msl">${L.map(x=>{const k=dnum(x.date)-td,t=x.task&&d.tasks.find(y=>y.id==x.task);return `<div class="sbt"><span class="msf">⚑</span><input class="f" value="${esc(x.name)}" onchange="msSet('${p.id}','${x.id}','name',this.value)"><input type="date" value="${x.date}" onchange="msDate('${p.id}','${x.id}',this.value)"><span class="${k<0?'late-b':'mu'}">${k<0?'прострочено '+(-k)+' дн.':k==0?'сьогодні':'через '+k+' дн.'}</span><label class="mu">нагадати за <input type="number" min="0" max="60" style="width:52px" value="${x.remind==null?3:x.remind}" onchange="msSet('${p.id}','${x.id}','remind',+this.value)"> дн.</label>${t?`<a class="tt" onclick="op('${t.id}')" title="${esc(t.title)}">↪ задача</a>`:''}<button class="x" onclick="msDel('${p.id}','${x.id}')">✕</button></div>`}).join('')||'<div class="mu">Термінів поки немає. Додайте перший, наприклад «Термін доставки МК».</div>'}<div class="row" style="margin-top:6px"><select id="mt_${p.id}" onchange="msTpl('${p.id}')"><option value="">Шаблон терміну…</option>${(d.tpl||[]).map(x=>`<option value="${x.id}">${esc(x.m)}</option>`).join('')}</select><input id="mn_${p.id}" placeholder="Назва терміну"><input type="date" id="md_${p.id}"><input id="mx_${p.id}" placeholder="Задача, яку створити" style="min-width:230px"><label class="mu"><input type="checkbox" id="ma_${p.id}" checked> створити задачу</label><button class="b2" onclick="msAdd('${p.id}')">+ Термін</button></div><div class="mu">Автозадача отримує дату терміну, а нагадування приходить за вказану кількість днів. <a onclick="tplMenu(event)">Шаблони термінів</a></div></div>`}
const msTpl=pid=>{const x=(D().tpl||[]).find(t=>t.id==document.getElementById('mt_'+pid).value);if(x){document.getElementById('mn_'+pid).value=x.m;document.getElementById('mx_'+pid).value=x.t}};
function msAdd(pid){const p=pj2(pid),name=g('mn_'+pid),date=document.getElementById('md_'+pid).value,tx=g('mx_'+pid),auto=document.getElementById('ma_'+pid).checked;if(!name||!date)return info('Вкажіть назву та дату терміну.');p.ms=p.ms||[];const x={id:uid(),name:name,date:date,title:tx||('Виконати: '+name),remind:3,task:''};p.ms.push(x);if(auto)msMkTask(p,x);sv()}
function msSet(pid,mid,f,v){const x=pj2(pid).ms.find(y=>y.id==mid);x[f]=v;sv()}
function msDate(pid,mid,v){const x=pj2(pid).ms.find(y=>y.id==mid),old=x.date;x.date=v;const t=x.task&&D().tasks.find(y=>y.id==x.task);if(t){t.start=v;t.end=v;t.title=t.title.replace(fmtD(old),fmtD(v))}sv()}
function msDel(pid,mid){const p=pj2(pid),x=p.ms.find(y=>y.id==mid),d=D(),t=x.task&&d.tasks.find(y=>y.id==x.task);p.ms=p.ms.filter(y=>y.id!=mid);if(t){if(t.status==ST[0]&&!t.subs.length)d.tasks=d.tasks.filter(y=>y.id!=t.id);else t.ms=''}sv()}
const tplMenu=ev=>menu(ev,()=>(D().tpl||[]).map(x=>({i:'delete',t:x.m+' → '+x.t,f:()=>cfm('Видалити шаблон «'+x.m+'»?',()=>{D().tpl=D().tpl.filter(y=>y.id!=x.id);sv()})})).concat([{t:'+ Новий шаблон',f:()=>ask('Новий шаблон терміну',v=>{D().tpl=D().tpl||[];D().tpl.push({id:uid(),m:v,t:g('ms2')||('Виконати: '+v)});sv()},'<input id="ms2" placeholder="Задача, яку створювати (напр. Відвантажити останню машину)">')}]));
function msMarks(p,mn,ppd){return (p&&p.ms||[]).map(x=>`<div class="gt-ms" title="${esc(x.name)} · ${fmtD(x.date)}" style="left:${(dnum(x.date)-mn)*ppd+ppd/2-6}px"></div>`).join('')}
function upMs(d){const td=dnum(today()),L=[];d.projects.forEach(p=>(p.ms||[]).forEach(x=>{const k=dnum(x.date)-td;if(k<=30)L.push({p:p,x:x,k:k})}));L.sort((a,b)=>a.k-b.k);
  return L.map(o=>`<div class="sbt"><span class="msf">⚑</span><b style="flex:1">${esc(o.x.name)}</b><span class="mu">${esc(o.p.name)}</span><span class="mu">${fmtD(o.x.date)}</span><span class="${o.k<0?'late-b':'mu'}">${o.k<0?'−'+(-o.k)+' дн.':o.k==0?'сьогодні':'через '+o.k+' дн.'}</span></div>`).join('')||'<div class="mu">Найближчих термінів немає</div>'}
/* Ризик зриву строків: рівень 3 «горить», 2 «високий», 1 «увага». Враховує залишок днів, прогрес, статус, виконавця й відставання від графіка */
function riskList(d){const td=dnum(today()),L=[];d.tasks.forEach(t=>{if(t.arch||t.status==ST[3]||t.status==ST[1]||!t.end)return;const days=dnum(t.end)-td,pg=prog(t),r=[];let lv=0;const add=(l,x)=>{lv=Math.max(lv,l);r.push(x)};
  if(days<0)add(3,'прострочено на '+(-days)+' дн.');else if(days<=1)add(3,days?'завтра кінець':'кінець сьогодні');
  if(days>=2&&days<=3&&pg<50)add(2,'залишилось '+days+' дн., готово '+pg+'%');
  if(days>=0&&days<=7&&t.status==ST[0])add(days<=3?2:1,'ще не розпочата');
  if(days>=0&&days<=7&&!t.who.length)add(2,'немає виконавця');
  if(t.start&&days>=2){const tot=dnum(t.end)-dnum(t.start),el=td-dnum(t.start);if(tot>0&&el>0){const ex=Math.min(100,Math.round(100*el/tot));if(ex-pg>=35)add(2,'відставання: за графіком ~'+ex+'%, готово '+pg+'%')}}
  if(days>=0&&days<=3&&t.subs.some(x=>!x.done)&&lv<2)add(1,'є невиконані підзадачі');
  if(lv)L.push({t:t,lv:lv,days:days,r:r})});return L.sort((a,b)=>b.lv-a.lv||a.days-b.days)}
const riskTasks=d=>riskList(d).filter(o=>o.lv>=2);
const riskMs=d=>{if(!canPrj())return[];const td=dnum(today()),L=[];d.projects.forEach(p=>(p.ms||[]).forEach(x=>{if(!x.date||(x.task&&d.tasks.some(t=>t.id==x.task)))return;const days=dnum(x.date)-td;if(days<=3)L.push({p:p,x:x,days:days,lv:days<=1?3:2})}));return L.sort((a,b)=>a.days-b.days)};
const RLB={3:['Горить','#c0392b'],2:['Високий','#d98200'],1:['Увага','#b59b00']};
const rbadge=lv=>`<span class="late-b" style="background:${RLB[lv][1]};color:#fff">${RLB[lv][0]}</span>`;
const riskHtml=d=>{const A=riskList(d),M=riskMs(d),n=[3,2,1].map(l=>A.filter(o=>o.lv==l).length+M.filter(o=>o.lv==l).length);
  const sum=(A.length+M.length)?`<div class="mu" style="margin-bottom:6px">Горить: <b>${n[0]}</b> · Високий: <b>${n[1]}</b> · Увага: <b>${n[2]}</b></div>`:'';
  return sum+A.map(o=>`<div class="sbt">${rbadge(o.lv)}<a class="tt" data-hv="${o.t.id}" onclick="op('${o.t.id}')">${esc(o.t.title)}</a><span class="mu" style="flex:1">${o.t.who.map(un).map(esc).join(', ')||'без виконавця'} · до ${fmtD(o.t.end)} — ${esc(o.r.join('; '))}</span></div>`).join('')+M.map(o=>`<div class="sbt">${rbadge(o.lv)}<span class="msf">⚑</span><b style="flex:1">${esc(o.x.name)}</b><span class="mu">${esc(o.p.name)} · ${fmtD(o.x.date)}${o.days<0?' · прострочено':''}</span></div>`).join('')||'<div class="mu">Загроз зриву строків немає 👍</div>'};


/* ---------- Нагадування: дзвіночок, сповіщення, .ics ---------- */
function remItems(){const td=dnum(today()),out=[];vis().forEach(d=>{const lead={};d.projects.forEach(p=>(p.ms||[]).forEach(x=>lead[x.id]=x.remind==null?3:x.remind));d.tasks.forEach(t=>{if(t.arch||t.status==ST[3]||!t.end)return;const L=t.ms&&lead[t.ms]!=null?lead[t.ms]:(t.who.includes(S.me)?2:-1);if(L<0)return;const k=dnum(t.end)-td;if(k<=L)out.push({t:t,d:d,k:k,ms:!!t.ms})})});return out.sort((a,b)=>a.k-b.k)}
const remText=i=>'«'+i.t.title+'» — '+(i.k<0?'прострочено на '+(-i.k)+' дн.':i.k==0?'термін сьогодні':'термін через '+i.k+' дн.');
function remindRun(){if(!me())return;let seen={};try{seen=JSON.parse(localStorage.getItem(K3)||'{}')}catch(e){}const td=today();Object.keys(seen).forEach(k=>{if(seen[k]!=td)delete seen[k]});const L=remItems().filter(i=>!seen[i.t.id]);if(!L.length)return;
  L.slice(0,3).forEach(i=>{toast('🔔 '+remText(i));if(window.Notification&&Notification.permission=='granted')try{new Notification('ЦКС · нагадування',{body:remText(i)})}catch(e){}});if(L.length>3)toast('🔔 …та ще '+(L.length-3)+' нагадувань (дзвіночок угорі)');
  L.forEach(i=>seen[i.t.id]=td);try{localStorage.setItem(K3,JSON.stringify(seen))}catch(e){}}
function bellBtn(){const L=remItems(),U=cmUnseen();return `<button class="bell ${L.some(i=>i.k<0)?'red':''}" title="Нагадування" onclick="BELL=!BELL;R()"><img class="bi-ic" src="${IMG.msg}" alt="">${L.length+U.length?`<b>${L.length+U.length}</b>`:''}</button>`}
function bellPanel(){const L=remItems(),grp=(t,f)=>{const a=L.filter(f);return a.length?`<h4>${t}</h4>`+a.map(i=>`<div class="bi" onclick="bellOpen('${i.d.id}','${i.t.id}')"><b>${esc(i.t.title)}</b><span class="mu">${esc(i.d.name)} · ${fmtD(i.t.end)}${i.ms?' · термін проєкту':''}</span></div>`).join(''):''};
  return `<div class="mv" onclick="BELL=false;R()"></div><div class="bellp"><b>Нагадування</b>${cmBell()}${grp('Прострочено',i=>i.k<0)}${grp('Сьогодні',i=>i.k==0)}${grp('Найближчі',i=>i.k>0)}${L.length||cmUnseen().length?'':'<div class="mu" style="margin:8px 0">Усе під контролем: термінів, що горять, немає 👍</div>'}<div class="mu" style="margin-top:8px">Нагадування діють для термінів проєктів і для ваших задач (за 2 дні до кінця).</div>${window.Notification&&Notification.permission=='default'?'<button class="b2" style="margin-top:8px" onclick="Notification.requestPermission().then(()=>R())">Увімкнути сповіщення браузера</button>':''}<button class="b2" style="margin-top:8px" onclick="icsExport()">⬇ Календар (.ics) з будильниками</button></div>`}
function bellOpen(did,tid){BELL=false;S.dept=did;const d=D(),pg=d.pages.find(p=>p.type=='tasks');if(pg)S.page=pg.id;op(tid)}
function icsExport(){const d=D();if(!d)return;const E=s=>String(s==null?'':s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n'),ymd=s=>s.replace(/-/g,''),nx=s=>ymd(dstr(dnum(s)+1)),stamp=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z',ev=[];
  const al=(n,tx)=>'BEGIN:VALARM\r\nTRIGGER:'+(n<=0?'PT9H':'-P'+(n>1?(n-1)+'D':'')+'T15H')+'\r\nACTION:DISPLAY\r\nDESCRIPTION:'+E(tx)+'\r\nEND:VALARM\r\n';
  const add=(uidv,sum,desc,a,b,alarms)=>ev.push('BEGIN:VEVENT\r\nUID:'+uidv+'@cks-office\r\nDTSTAMP:'+stamp+'\r\nDTSTART;VALUE=DATE:'+ymd(a)+'\r\nDTEND;VALUE=DATE:'+nx(b)+'\r\nSUMMARY:'+E(sum)+'\r\nDESCRIPTION:'+E(desc)+'\r\n'+alarms+'END:VEVENT\r\n');
  const lead={};d.projects.forEach(p=>(p.ms||[]).forEach(x=>lead[x.id]=x.remind==null?3:x.remind));
  d.tasks.forEach(t=>{if(t.arch||t.status==ST[3])return;const s=t.start||t.end,e=t.end||t.start;if(!s)return;const pj=pn(t);if(s<e)add('r'+t.id,t.title,'Виконання: '+t.status+(pj?' · '+pj:''),s,e,'');
    const n=t.ms&&lead[t.ms]!=null?lead[t.ms]:1;add('d'+t.id,'⏰ Термін: '+t.title,'Відділ: '+d.name+(pj?' · Проєкт: '+pj:''),e,e,al(n,'Термін: '+t.title)+(n>0?al(0,'Сьогодні термін: '+t.title):''))});
  d.projects.forEach(p=>(p.ms||[]).forEach(x=>{if(x.task&&d.tasks.some(t=>t.id==x.task))return;add('m'+x.id,'⚑ '+x.name,'Проєкт: '+p.name,x.date,x.date,al(x.remind==null?3:x.remind,x.name))}));
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//CKS//Office//UK\r\nCALSCALE:GREGORIAN\r\n'+ev.join('')+'END:VCALENDAR\r\n'],{type:'text/calendar'}));a.download='ЦКС_'+d.name+'_'+today()+'.ics';a.click()}

/* =====================================================================
   КОМЕНТАРІ ДО ЗАДАЧ (в т.ч. для конкретного співробітника) ТА ДОСТУП ЗА ПОСИЛАННЯМ
   ===================================================================== */
const SH=(location.hash.match(/^#s=([A-Za-z0-9_-]{16,64})/)||[])[1]||'';
let SHD=null,SHL=true,CMD={};
const K4='cks_cm_seen_v1',pad2=n=>String(n).padStart(2,'0');
const cmTime=ts=>{const d=new Date(ts);return pad2(d.getDate())+'.'+pad2(d.getMonth()+1)+' '+pad2(d.getHours())+':'+pad2(d.getMinutes())};

/* ---------- Коментарі ---------- */
const cmFromRow=r=>({id:r.id,dept:r.dept_id,task:r.task_id,by:r.author||'',name:r.author_name,to:r.to_ids||[],text:r.body,ts:Date.parse(r.created_at)||Date.now(),priv:!!r.is_private,guest:!!r.guest});
const cmSeen=()=>{try{return JSON.parse(localStorage.getItem(K4)||'{}')}catch(e){return {}}};
const cmVisible=c=>!c.priv||c.by==S.me||(c.to||[]).includes(S.me)||isA();
const cmFor=tid=>(S.comments||[]).filter(c=>c.task==tid&&cmVisible(c)).sort((a,b)=>a.ts-b.ts);
function cmUnseen(){if(!S.me)return [];const seen=cmSeen(),ids=new Set(vis().map(d=>d.id));return (S.comments||[]).filter(c=>ids.has(c.dept)&&(c.to||[]).includes(S.me)&&c.by!=S.me&&!seen[c.id])}
function cmMarkSeen(tid){const seen=cmSeen();let ch=false;(S.comments||[]).forEach(c=>{if(c.task==tid&&(c.to||[]).includes(S.me)&&!seen[c.id]){seen[c.id]=1;ch=true}});if(ch)try{localStorage.setItem(K4,JSON.stringify(seen))}catch(e){}return ch}
const cmCount=t=>(S.comments||[]).filter(c=>c.task==t.id&&cmVisible(c)).length;
function cmPanel(t){const d=D(),L=cmFor(t.id),mem=S.users.filter(u=>u.id!=S.me&&(d.members.includes(u.id)||u.admin)),dr=CMD[t.id]||{text:'',to:'',pv:false};
  return `<div class="cm-l">${L.map(c=>`<div class="cm ${(c.to||[]).includes(S.me)?'me':''}"><div class="cm-h"><i class="pa" style="margin:0;${avSt(c.by)}">${esc(ini(c.name))}</i><b>${esc(c.name)}</b>${c.guest?'<span class="mu">(гість)</span>':''}${(c.to||[]).length?`<span class="c">→ ${c.to.map(u=>esc(un(u))).join(', ')}</span>`:''}${c.priv?'<span class="mu">🔒 приватно</span>':''}<span class="mu" style="margin-left:auto">${cmTime(c.ts)}</span>${c.by==S.me||canMng(d)?`<button class="x" title="Видалити" onclick="cmDel('${c.id}')">✕</button>`:''}</div><div class="cm-t">${esc(c.text).replace(/\n/g,'<br>')}</div></div>`).join('')||'<div class="mu">Коментарів поки немає.</div>'}</div>
<div class="cm-f"><select onchange="cmDraft('${t.id}','to',this.value)"><option value="">Для всіх у задачі</option>${t.who.filter(u=>u!=S.me).length?`<option value="__w" ${dr.to=='__w'?'selected':''}>Для всіх виконавців задачі</option>`:''}${mem.map(u=>`<option value="${u.id}" ${dr.to==u.id?'selected':''}>Для: ${esc(u.name)}</option>`).join('')}</select><textarea id="cmt" rows="2" placeholder="Написати коментар… (Ctrl+Enter — надіслати)" oninput="cmDraft('${t.id}','text',this.value)" onkeydown="if(event.key=='Enter'&&(event.ctrlKey||event.metaKey))cmSend('${t.id}')">${esc(dr.text)}</textarea><label class="mu"><input type="checkbox" ${dr.pv?'checked':''} onchange="cmDraft('${t.id}','pv',this.checked)"> лише адресату (приватно)</label><button class="b" onclick="cmSend('${t.id}')">Надіслати</button></div>`}
const cmDraft=(tid,f,v)=>{CMD[tid]=CMD[tid]||{text:'',to:'',pv:false};CMD[tid][f]=v};
function cmSend(tid){const dr=CMD[tid]||{},text=(dr.text||'').trim();if(!text)return;const t=tg(tid),to=!dr.to?[]:dr.to=='__w'?t.who.filter(u=>u!=S.me):[dr.to],c={id:uid(),dept:D().id,task:tid,by:S.me,name:me().name,to:to,text:text,ts:Date.now(),priv:!!(dr.pv&&to.length)};
  S.comments.push(c);delete CMD[tid];
  if(CLOUD)DB.from('comments').insert({id:c.id,dept_id:c.dept,task_id:c.task,author:S.me,author_name:c.name,to_ids:to,to_names:to.map(un),body:text,is_private:c.priv}).then(r=>{if(r.error){S.comments=S.comments.filter(x=>x.id!=c.id);S.err='Коментар не збережено: '+r.error.message+' (чи виконано migration_v3.sql?)';R()}});
  if(to.length)toast('Коментар надіслано: '+to.map(un).join(', '));sv();cmFill()}
function cmDel(id){const c=S.comments.find(x=>x.id==id);if(!c)return;S.comments=S.comments.filter(x=>x.id!=id);if(CLOUD)DB.from('comments').delete().eq('id',id).then(r=>{if(r.error)toast('Не вдалося видалити: '+r.error.message)});sv()}
function cmRT(p){try{if(p.eventType=='DELETE'){S.comments=S.comments.filter(c=>c.id!=p.old.id)}else{const c=cmFromRow(p.new);if(!S.comments.some(x=>x.id==c.id)){S.comments.push(c);if(c.to.includes(S.me)&&c.by!=S.me)toast('💬 '+c.name+' → вам: '+c.text.slice(0,80))}}softR()}catch(e){}}
function cmBell(){const U=cmUnseen();if(!U.length)return '';return '<h4>Коментарі для вас</h4>'+U.slice(0,12).map(c=>{const dd=S.depts.find(x=>x.id==c.dept),t=dd&&dd.tasks.find(x=>x.id==c.task);return `<div class="bi" onclick="bellOpen('${c.dept}','${c.task}')"><b>${esc(c.name)}: ${esc(c.text.slice(0,70))}</b><span class="mu">${t?esc(t.title):''} · ${cmTime(c.ts)}</span></div>`}).join('')}
function cmRemind(){const U=cmUnseen();if(!U.length)return;let seen={};try{seen=JSON.parse(localStorage.getItem(K3)||'{}')}catch(e){}const td=today(),N=U.filter(c=>!seen['c'+c.id]);if(!N.length)return;N.slice(0,3).forEach(c=>toast('💬 '+c.name+': '+c.text.slice(0,80)));if(N.length>3)toast('💬 …та ще '+(N.length-3)+' коментарів (дзвіночок угорі)');N.forEach(c=>seen['c'+c.id]=td);try{localStorage.setItem(K3,JSON.stringify(seen))}catch(e){}}

/* ---------- Доступ за посиланням (як у Google Диску): перегляд / коментування / редагування ---------- */
const SHRL={view:'Перегляд',comment:'Коментування',edit:'Редагування'};
const shUrl=tok=>location.href.split('#')[0]+'#s='+tok;
function rndTok(){const a=new Uint8Array(18);crypto.getRandomValues(a);return btoa(String.fromCharCode.apply(null,a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')}
function shareHtml(tid){const d=D(),t=tg(tid),L=(S.shares||[]).filter(x=>x.task==tid&&x.dept==d.id&&!x.rev&&(!x.exp||x.exp>Date.now()));
  return `<div class="ov"><div class="card" style="width:min(580px,100%)"><h3>Доступ за посиланням</h3><div class="mu">Задача: «${esc(t.title)}»</div>${L.map(x=>`<div class="sbt"><span class="c">${SHRL[x.role]}</span><input class="f" readonly value="${esc(shUrl(x.token))}" onfocus="this.select()"><span class="mu">${x.exp?'до '+fmtD(dstr(Math.floor(x.exp/ONE))):'без обмеження'}</span><button class="b2" onclick="shCopy('${x.token}')">Копіювати</button><button class="x" title="Вимкнути посилання" onclick="shRevoke('${x.token}','${tid}')">✕</button></div>`).join('')||'<div class="mu" style="margin:6px 0">Активних посилань немає.</div>'}<div class="row"><select id="shr"><option value="view">Перегляд</option><option value="comment">Коментування</option><option value="edit">Редагування</option></select><select id="she"><option value="0">Без обмеження за часом</option><option value="7">7 днів</option><option value="30">30 днів</option></select><button class="b" onclick="shCreate('${tid}')">Створити посилання</button></div><div class="mu">Хто має посилання, бачить лише цю задачу (не весь відділ). «Перегляд» — тільки читати; «Коментування» — ще й писати коментарі; «Редагування» — змінювати назву, статус, дати й підзадачі. Посилання можна вимкнути хрестиком.${CLOUD?'':' <b>Без бази даних посилання працює лише в цьому браузері.</b>'}</div><div class="row"><button class="b2" onclick="M='';R()">Закрити</button></div></div></div>`}
const shareOpen=tid=>{M=shareHtml(tid);R()};
async function shCreate(tid){const d=D(),role=g('shr'),days=+g('she'),x={token:rndTok(),dept:d.id,task:tid,role:role,exp:days?Date.now()+days*864e5:0,rev:false,by:S.me,ts:Date.now()};
  if(CLOUD){const r=await DB.from('shares').insert({token:x.token,dept_id:x.dept,task_id:x.task,role:role,created_by:S.me,expires_at:x.exp?new Date(x.exp).toISOString():null});if(r.error)return toast('Не вдалося створити посилання: '+r.error.message+' (чи виконано migration_v3.sql?)')}
  S.shares.push(x);if(!CLOUD)wr();M=shareHtml(tid);R()}
function shCopy(tok){const u=shUrl(tok);if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(u).then(()=>toast('Посилання скопійовано'),()=>toast('Виділіть посилання в полі й натисніть Ctrl+C'));else toast('Виділіть посилання в полі й натисніть Ctrl+C')}
async function shRevoke(tok,tid){const x=S.shares.find(z=>z.token==tok);if(!x)return;if(CLOUD){const r=await DB.from('shares').update({revoked:true}).eq('token',tok);if(r.error)return toast('Не вдалося вимкнути: '+r.error.message)}x.rev=true;if(!CLOUD)wr();M=shareHtml(tid);R()}

/* ---------- Сторінка для того, хто відкрив посилання ---------- */
function shLocal(){const x=(S.shares||[]).find(z=>z.token==SH&&!z.rev&&(!z.exp||z.exp>Date.now()));if(!x)return null;const d=S.depts.find(y=>y.id==x.dept),t=d&&d.tasks.find(y=>y.id==x.task);if(!t)return null;const pj=d.projects.find(p=>p.id==t.project),ct=(d.cats||[]).find(c=>c.id==t.cat),us={};[t.who||[]].concat((t.subs||[]).map(s=>s.who||[])).forEach(a=>a.forEach(u=>us[u]=un(u)));
  return {role:x.role,dept:d.name,task:JSON.parse(JSON.stringify(t)),project:pj?pj.name:'',cat:ct?ct.name:'',users:us,comments:(S.comments||[]).filter(c=>c.task==t.id&&c.dept==d.id&&!(c.to&&c.to.length)&&!c.priv).sort((a,b)=>a.ts-b.ts).map(c=>({id:c.id,by:c.name,to:[],text:c.text,guest:!!c.guest,ts:c.ts}))}}
async function shLoad(){try{if(CLOUD){const r=await DB.rpc('shared_get',{p_token:SH});SHD=r.error?null:r.data}else SHD=shLocal()}catch(e){SHD=null}SHL=false;R()}
function shBoot(){SHL=true;R();shLoad();setInterval(()=>{const a=document.activeElement;if(!(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)))shLoad()},20000)}
async function shSave(){const t=SHD.task,patch={title:t.title,status:t.status,start:t.start||'',end:t.end||'',subs:t.subs,doneAt:t.doneAt||'',auto:!!t.auto};
  if(CLOUD){const r=await DB.rpc('shared_update',{p_token:SH,p_patch:patch});if(r.error||!r.data)toast('Не вдалося зберегти: немає прав або посилання вимкнено')}
  else{const x=(S.shares||[]).find(z=>z.token==SH),d=x&&S.depts.find(y=>y.id==x.dept),tt=d&&d.tasks.find(y=>y.id==x.task);if(tt)Object.assign(tt,patch);wr()}
  R()}
function shPatch(f,v){const t=SHD.task;t[f]=v;if(f=='status'){t.auto=false;t.doneAt=v==ST[3]?(t.doneAt||today()):''}shSave()}
function shTog(sid){const t=SHD.task,s=t.subs.find(x=>x.id==sid);if(!s)return;s.done=!s.done;s.doneAt=s.done?today():'';autoSt(t);shSave()}
function shAddSub(){const i=document.getElementById('shs'),v=i.value.trim();if(!v)return;SHD.task.subs.push({id:uid(),t:v,done:false,who:[]});autoSt(SHD.task);shSave()}
function shDelSub(sid){SHD.task.subs=SHD.task.subs.filter(x=>x.id!=sid);autoSt(SHD.task);shSave()}
async function shComment(){const n=document.getElementById('shn'),tx=document.getElementById('sht'),text=tx.value.trim();if(!text)return;const name=(n&&n.value.trim())||(me()?me().name:'Гість');try{localStorage.setItem('cks_guest_name',name)}catch(e){}
  if(CLOUD){const r=await DB.rpc('shared_comment',{p_token:SH,p_name:name,p_text:text});if(r.error||!r.data)return toast('Коментар не надіслано: немає прав або посилання вимкнено')}
  else{const x=(S.shares||[]).find(z=>z.token==SH);if(!x)return;S.comments.push({id:uid(),dept:x.dept,task:x.task,by:'',name:name,to:[],text:text,ts:Date.now(),guest:true});wr()}
  tx.value='';await shLoad()}
function shView(){const top='<div class="shb"><img src="'+IMG.logo+'"><span>Спільний доступ</span></div>';
  if(SHL)return top+'<div class="shw"><div class="card" style="margin:40px auto">Завантаження…</div></div>';
  if(!SHD)return top+'<div class="shw"><div class="card" style="margin:40px auto"><h3>Посилання недійсне</h3><div class="mu">Термін дії посилання завершився, доступ вимкнено або задачу видалено. Попросіть у власника нове посилання.</div></div></div>';
  const t=SHD.task,role=SHD.role,ed=role=='edit',cc=role!='view',us=SHD.users||{},nm=u=>esc(us[u]||'—'),dis=ed?'':'disabled';let gn='';try{gn=localStorage.getItem('cks_guest_name')||''}catch(e){}
  return top+`<div class="shw"><div class="row" style="margin-bottom:10px"><span class="c">${SHRL[role]}</span><span class="mu">Відділ: ${esc(SHD.dept)}${SHD.project?' · Проєкт: '+esc(SHD.project):''}${SHD.cat?' · Категорія: '+esc(SHD.cat):''}</span><button class="b2" style="margin-left:auto" onclick="shLoad()">Оновити</button></div>
<div class="ds-c">${ed?`<input class="ti" style="font-size:20px;text-transform:none" value="${esc(t.title)}" onchange="shPatch('title',this.value)">`:`<h1 style="text-transform:none;font-size:22px">${esc(t.title)}</h1>`}
<div class="row" style="margin:10px 0">${ed?`<select onchange="shPatch('status',this.value)">${ST.map(s=>`<option ${s==t.status?'selected':''}>${s}</option>`).join('')}</select>`:`<span class="pill ${SC[ST.indexOf(t.status)]}">${esc(t.status)}</span>`}<label class="mu">Початок <input type="date" value="${t.start||''}" ${dis} onchange="shPatch('start',this.value)"></label><label class="mu">Кінець <input type="date" value="${t.end||''}" ${dis} onchange="shPatch('end',this.value)"></label></div>
<div class="mu">Відповідальні: <b>${(t.who||[]).map(nm).join(', ')||'—'}</b></div><div style="margin:8px 0">Прогрес: <b>${prog(t)}%</b>${bar(prog(t))}</div>
<h4 class="ph">Підзадачі</h4>${(t.subs||[]).map(s=>`<div class="sbt"><input type="checkbox" ${s.done?'checked':''} ${dis} onchange="shTog('${s.id}')"><span class="${s.done?'dn2':''}" style="flex:1">${esc(s.t)}</span><span class="mu">${s.done&&s.doneAt?fmtD(s.doneAt)+' · ':''}${(s.who||[]).map(nm).join(', ')}</span>${ed?`<button class="x" onclick="shDelSub('${s.id}')">✕</button>`:''}</div>`).join('')||'<div class="mu">Підзадач немає</div>'}${ed?'<div class="row" style="margin-top:6px"><input id="shs" placeholder="Нова підзадача" style="flex:1" onkeydown="if(event.key==\'Enter\')shAddSub()"><button class="b2" onclick="shAddSub()">+</button></div>':''}
${(t.att||[]).length?'<h4 class="ph">Вкладення</h4>'+t.att.map(a=>`<div class="sbt">${a.k=='link'?`<a href="${esc(a.u)}" target="_blank" rel="noopener">🔗 ${esc(a.n)}</a>`:a.img?`<a href="${esc(a.u)}" target="_blank" rel="noopener"><img src="${esc(a.u)}" style="max-height:80px;border-radius:4px"></a>`:`<a href="${esc(a.u)}" target="_blank" rel="noopener" download="${esc(a.n)}">📎 ${esc(a.n)}</a>`}</div>`).join(''):''}
<h4 class="ph">Коментарі</h4><div class="cm-l">${(SHD.comments||[]).map(c=>`<div class="cm"><div class="cm-h"><i class="pa" style="margin:0">${esc(ini(c.by))}</i><b>${esc(c.by)}</b>${c.guest?'<span class="mu">(гість)</span>':''}<span class="mu" style="margin-left:auto">${cmTime(c.ts)}</span></div><div class="cm-t">${esc(c.text).replace(/\n/g,'<br>')}</div></div>`).join('')||'<div class="mu">Коментарів поки немає.</div>'}</div>
${cc?`<div class="cm-f">${me()?'':`<input id="shn" placeholder="Ваше ім’я" value="${esc(gn)}">`}<textarea id="sht" rows="2" placeholder="Написати коментар…"></textarea><button class="b" onclick="shComment()">Надіслати коментар</button></div>`:'<div class="mu" style="margin-top:10px">У вас доступ лише для перегляду.</div>'}</div></div>`}

/* =====================================================================
   ПРІОРИТЕТИ, ДОСТУП ДО КАЛЕНДАРЯ, КОНСТРУКТОР ЦЕНТРУ УПРАВЛІННЯ, КОМЕНТАРІ-ПІДКАЗКА, АКАУНТ
   ===================================================================== */
const PRN={high:'Важлива',mid:'Середня',low:'Неважлива'},PRK=['high','mid','low'],PRC={high:'p0',mid:'p1',low:'p2'},pri=t=>PRK.includes(t.pri)?t.pri:'mid';
const isLate=t=>t.status!=ST[3]&&t.status!=ST[1]&&!!t.end&&t.end<today();
const priMenu=(ev,t)=>menu(ev,()=>PRK.map(k=>({t:PRN[k],c:PRC[k],f:()=>up(t,'pri',k)})));
const prSel=t=>`<select onchange="up('${t.id}','pri',this.value)">${PRK.map(k=>`<option value="${k}" ${pri(t)==k?'selected':''}>Пріоритет: ${PRN[k]}</option>`).join('')}</select>`;
const canCal=()=>isA()||(me()&&['boss','pm','apm'].includes(me().pos));
const calG=(d,p)=>canCal()?cal(d,p):'<p class="mu">Календар проєктів доступний лише проєктним менеджерам, їхнім помічникам і начальнику.</p>';
const goPj=id=>{const pg=D().pages.find(p=>p.type=='projects');if(pg){S.page=pg.id;S.open=null;sv()}};
const calAdd=ds=>{const d=D();if(!d.projects.length)return info('Спершу створіть проєкт на сторінці «Проєкти».');
  ask('Новий термін проєкту',(v,pid)=>{const p=pj2(pid);if(!p)return;p.ms=p.ms||[];const x={id:uid(),name:v,date:ds,title:'Виконати: '+v,remind:3,task:''};p.ms.push(x);msMkTask(p,x);sv()},
  '<select id="ms">'+d.projects.map(p=>`<option value="${p.id}" ${p.id==CAL.pf?'selected':''}>${esc(p.name)}</option>`).join('')+'</select><div class="mu">Дата: '+fmtD(ds)+'. Буде створено задачу та нагадування.</div>')};
const renC=(i,v)=>{const c=(D().cats||[]).find(x=>x.id==i);if(c){c.name=v.trim()||c.name;sv()}};
const delCat=id=>cfm('Видалити категорію? Задачі залишаться без категорії.',()=>{const d=D();d.cats=d.cats.filter(c=>c.id!=id);d.tasks.forEach(t=>{if(t.cat==id)t.cat=''});if(FL.cat==id)FL.cat='';sv()});
const grpMenu=(ev,k)=>menu(ev,()=>[{t:'Додати задачу',f:()=>addT('','',k=='_'?'':k)}].concat(k=='_'?[]:[{i:'edit',t:'Перейменувати',f:()=>ask('Назва категорії',v=>renC(k,v),'',D().cats.find(c=>c.id==k).name,'Зберегти')},{i:'delete',t:'Видалити категорію',f:()=>delCat(k)}]));

/* ---------- Конструктор «Центру управління» ---------- */
const DW={k_act:{n:'Активні задачі',w:1},k_proc:{n:'В процесі',w:1},k_done:{n:'Виконано',w:1},k_late:{n:'Прострочено',w:1},k_risk:{n:'Ризик зриву строків',w:1},k_high:{n:'Важливі задачі в роботі',w:1},kcount:{n:'Лічильник за фільтром',w:1},
  projects:{n:'Проєкти',w:2},status:{n:'Статуси',w:2},done14:{n:'Виконано за 14 днів',w:2},load:{n:'Навантаження',w:2},ms:{n:'Найближчі терміни проєктів',w:2},risk:{n:'Ризик зриву строків',w:2},prio:{n:'Пріоритети',w:2},cats:{n:'Категорії',w:2},note:{n:'Нотатка',w:2},late:{n:'Прострочені задачі',w:4}};
let DE=false;
const defDash=()=>['k_act','k_proc','k_done','k_late','projects','status','done14','load','ms','risk','late'].map(k=>({id:uid(),k:k,w:DW[k].w}));
const dwMove=(i,x)=>{const a=D().dash,j=i+x;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];sv()},dwSize=i=>{const w=D().dash[i];w.w=((w.w||DW[w.k].w)%4)+1;sv()},dwDel=i=>{D().dash.splice(i,1);sv()},dwTxt=(i,v)=>{D().dash[i].txt=v;sv()};
const dwAdd=k=>{if(!k)return;const a=D().dash;a.push({id:uid(),k:k,w:DW[k].w,f:{}});if(k=='kcount')dwCfg(a.length-1);else sv()};
const dwRen=i=>{const w=D().dash[i];ask('Назва блоку',v=>{w.t=v;sv()},'',w.t||DW[w.k].n,'Зберегти')};
const dwReset=()=>cfm('Повернути стандартний набір блоків?',()=>{D().dash=defDash();sv()});
const dwDrag=(e,i)=>e.dataTransfer.setData('text','dw:'+i),dwDrop=(e,i)=>{const a=(e.dataTransfer.getData('text')||'').split(':');if(a[0]!='dw')return;e.preventDefault();const f=+a[1],A=D().dash;if(f==i)return;A.splice(i,0,A.splice(f,1)[0]);sv()};
const dwCfg=i=>{const d=D(),w=d.dash[i];w.f=w.f||{};M=`<div class="ov"><div class="card"><h3>Лічильник за фільтром</h3><label class="mu">Статус<select id="dc_s"><option value="">Будь-який</option>${ST.map(s=>`<option ${w.f.st==s?'selected':''}>${s}</option>`).join('')}</select></label><label class="mu">Пріоритет<select id="dc_p"><option value="">Будь-який</option>${PRK.map(k=>`<option value="${k}" ${w.f.pri==k?'selected':''}>${PRN[k]}</option>`).join('')}</select></label><label class="mu">Категорія<select id="dc_c"><option value="">Будь-яка</option>${(d.cats||[]).map(c=>`<option value="${c.id}" ${w.f.cat==c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><div class="row"><button class="b" onclick="dwCfgOk(${i})">Зберегти</button><button class="b2" onclick="M='';R()">Скасувати</button></div></div></div>`;R()};
const dwCfgOk=i=>{const w=D().dash[i];w.f={st:document.getElementById('dc_s').value,pri:document.getElementById('dc_p').value,cat:document.getElementById('dc_c').value};M='';sv()};
function ensureV6(d){if(d.v6)return false;d.v6=1;d.dash=d.dash&&d.dash.length?d.dash:defDash();d.cols=d.cols||defCols();d.hid=d.hid||[];
  if(!d.cols.some(c=>c.key=='pri')&&!d.hid.some(c=>c.key=='pri')){const i=d.cols.findIndex(c=>c.key=='status');d.cols.splice(i<0?d.cols.length:i+1,0,{id:'pri',key:'pri',name:BN.pri,type:'b'})}return true}

/* ---------- Коментарі: відкриваються лише кліком по значку коментарів ---------- */
let CMT=null,CMC=null,CMS=null,CMP=false;
const cmEl=()=>{let e=document.getElementById('cmp');if(!e){e=document.createElement('div');e.id='cmp';e.className='hv cmpop';document.body.appendChild(e);e.addEventListener('mouseenter',()=>clearTimeout(CMC));e.addEventListener('mouseleave',()=>cmHide())}return e};
const cmClose=()=>{CMT=null;CMP=false;cmEl().style.display='none'};
const cmHide=()=>{clearTimeout(CMC);CMC=setTimeout(()=>{const a=document.activeElement;if(CMP||(a&&cmEl().contains(a)))return;cmClose()},350)};
function cmFill(){const e=cmEl(),d=D(),t=d&&CMT&&d.tasks.find(x=>x.id==CMT);if(!t){cmClose();return}e.innerHTML=`<div class="row"><b style="flex:1;color:var(--navy)">Коментарі · ${esc(t.title)}</b><button class="x" title="Закрити" onclick="cmClose()">✕</button></div>`+cmPanel(t)}
function cmOpen(a,pin){clearTimeout(CMC);if(typeof hvClose=='function')hvClose();CMT=a.dataset.cm;if(pin)CMP=true;cmFill();const e=cmEl();if(!CMT)return;e.style.display='block';const r=a.getBoundingClientRect();e.style.left=Math.max(8,Math.min(r.left,innerWidth-e.offsetWidth-8))+'px';let y=r.bottom+4;if(y+e.offsetHeight>innerHeight-8)y=Math.max(8,r.top-e.offsetHeight-4);e.style.top=y+'px';if(cmMarkSeen(CMT))drawPres()}
const cmRefresh=()=>{const e=document.getElementById('cmp');if(CMT&&e&&e.style.display=='block'&&!e.contains(document.activeElement))cmFill()};
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('[data-cm]');if(a){if(CMT==a.dataset.cm&&cmEl().style.display=='block'){cmClose();return}cmOpen(a,true);return}if(CMT&&!(e.target.closest&&e.target.closest('#cmp')))cmClose()},true);

/* ---------- Акаунт: фото, ім’я, телефон, пароль ---------- */
let PROF=null;
const avSt=id=>{const u=S.users.find(x=>x.id==id);return u&&u.avatar?`background-image:url('${esc(u.avatar)}');background-size:cover;background-position:center;color:transparent`:''};
function profHtml(){const u=me();return `<div class="ov"><div class="card" style="width:min(440px,100%)"><h3>Мій акаунт</h3><div class="row"><div class="av" style="border-radius:50%;width:96px;height:96px" title="Змінити фото" onclick="document.getElementById('pf_f').click()">${PROF.av?`<img src="${esc(PROF.av)}">`:`<span style="font-size:26px">${esc(ini(PROF.n||u.name))}</span>`}</div><div class="pjm"><button class="b2" onclick="document.getElementById('pf_f').click()">Завантажити фото</button>${PROF.av?'<button class="x" style="text-align:left" onclick="profAv(null)">Прибрати фото</button>':''}<div class="mu">${isA()?'Повний доступ':esc(POS[u.pos]||'')}${CLOUD?'':' · '+esc(u.email||'')}</div></div></div><input type="file" id="pf_f" accept="image/*" style="display:none" onchange="profAv(this.files[0])">
<label class="mu">Прізвище та ім’я<input id="pf_n" style="width:100%" value="${esc(PROF.n)}"></label><label class="mu">Телефон<input id="pf_p" style="width:100%" value="${esc(PROF.p)}"></label><label class="mu">Про себе<textarea id="pf_a" rows="2" style="width:100%">${esc(PROF.a)}</textarea></label><label class="mu">Новий пароль (порожньо — не змінювати)<input id="pf_w" type="password" style="width:100%"></label><div class="err" id="pfe"></div><div class="row"><button class="b" onclick="profSave()">Зберегти</button><button class="b2" onclick="M='';PROF=null;R()">Закрити</button></div></div></div>`}
const profRd=()=>{const v=i=>(document.getElementById(i)||{}).value;if(document.getElementById('pf_n')){PROF.n=v('pf_n');PROF.p=v('pf_p');PROF.a=v('pf_a')}};
const profOpen=()=>{const u=me();PROF={av:u.avatar||'',n:u.name,p:u.phone||'',a:u.about||''};M=profHtml();R()};
async function profAv(f){profRd();if(!f)PROF.av='';else{try{PROF.av=(await fileToAtt(f,'avatars',{imgOnly:true,max:256})).u}catch(e){M=profHtml();R();document.getElementById('pfe').textContent=e.message||'Не вдалося завантажити фото';return}}M=profHtml();R()}
async function profSave(){profRd();const n=(PROF.n||'').trim(),pw=document.getElementById('pf_w').value,er2=document.getElementById('pfe');if(!n){er2.textContent='Вкажіть ім’я';return}if(pw&&pw.length<(CLOUD?6:4)){er2.textContent='Пароль закороткий';return}
  const u=me(),patch={name:n,avatar:PROF.av||'',phone:(PROF.p||'').trim(),about:(PROF.a||'').trim()};
  if(CLOUD){const r=await DB.from('profiles').update(patch).eq('id',S.me);if(r.error){er2.textContent='Не вдалося зберегти: '+r.error.message+' (чи виконано migration_v4.sql?)';return}if(pw){const r2=await DB.auth.updateUser({password:pw});if(r2.error){er2.textContent=emsg(r2.error.message);return}}}
  else if(pw)u.pass=pw;
  Object.assign(u,patch);M='';PROF=null;wr();toast('Профіль збережено');trackPres();R()}
/* =====================================================================
   ХМАРНА БАЗА ДАНИХ (Supabase) — працює, якщо заповнено config.js.
   Без config.js програма працює як раніше: дані в браузері.
   ===================================================================== */
let SYNC={docs:{},depts:{}},pt=null,pushing=false,dirty=false,RT=null,rlT=null,softT=null;
const emsg=m=>({'User already registered':'Такий email уже зареєстровано','Invalid login credentials':'Невірний email або пароль','Email not confirmed':'Підтвердіть email (лист у пошті)','Database error saving new user':'Код запрошення недійсний або вже використаний','User already registered.':'Такий email уже зареєстровано','Signup requires a valid password':'Введіть пароль','Unable to validate email address: invalid format':'Некоректний email','Email rate limit exceeded':'Забагато листів. Спробуйте пізніше','email rate limit exceeded':'Забагато листів. Спробуйте пізніше','Signups not allowed for this instance':'Реєстрацію вимкнено в налаштуваннях Supabase'}[m]||(/at least \d+ characters/.test(m)?'Пароль закороткий':/rate limit|security purposes/i.test(m)?'Забагато спроб. Зачекайте хвилину й спробуйте знову':m));
function normDept(d){d.projects=d.projects||[];d.cats=d.cats||[];d.hid=d.hid||[];d.cols=d.cols&&d.cols.length?d.cols:defCols();if(!d.v7){d.v7=1;if(!d.cols.some(c=>c.key=='done')&&!d.hid.some(c=>c.key=='done'))d.cols.push({id:'done',key:'done',name:BN.done,type:'b'})}d.pages=d.pages||[];d.members=d.members||[];d.tasks=d.tasks||[];d.tasks.forEach(t=>{t.who=t.who||[];t.subs=t.subs||[]});d.tasks.sort((a,b)=>(a.ts||0)-(b.ts||0));d.projects.sort((a,b)=>(a.ts||0)-(b.ts||0))}
function docsOf(){const m={};S.depts.forEach(d=>{m['meta:'+d.id]={dept:d.id,kind:'meta',data:{pages:d.pages,cols:d.cols,cats:d.cats,closedNone:!!d.closedNone,hid:d.hid||[],v4:d.v4?1:0,tpl:d.tpl||[],v5:d.v5?1:0,dash:d.dash||[],v6:d.v6?1:0}};d.tasks.forEach(t=>m['task:'+t.id]={dept:d.id,kind:'task',data:t});d.projects.forEach(p=>m['project:'+p.id]={dept:d.id,kind:'project',data:p})});return m}
function applyDoc(r){const d=S.depts.find(x=>x.id==r.dept_id);if(!d)return;const x=r.data;if(r.kind=='meta'){d.pages=x.pages||[];d.cols=x.cols;d.cats=x.cats||[];d.hid=x.hid||[];d.v4=x.v4;d.tpl=x.tpl;d.v5=x.v5;d.dash=x.dash||[];d.v6=x.v6;d.closedNone=!!x.closedNone}else{const L=r.kind=='task'?d.tasks:d.projects,i=L.findIndex(y=>y.id==x.id);if(i<0)L.push(x);else L[i]=x}}
function removeDoc(id){const k=id.split(':')[0],oid=id.slice(k.length+1);S.depts.forEach(d=>{if(k=='task')d.tasks=d.tasks.filter(t=>t.id!=oid);if(k=='project')d.projects=d.projects.filter(p=>p.id!=oid)})}
async function fetchAll(tb){let out=[],from0=0;for(;;){const r=await DB.from(tb).select('*').range(from0,from0+999);if(r.error)throw r.error;out=out.concat(r.data||[]);if(!r.data||r.data.length<1000)break;from0+=1000}return out}
async function loadAll(){const [pr,dp,mb,dc,cmr,shr]=await Promise.all([fetchAll('profiles'),fetchAll('depts'),fetchAll('dept_members'),fetchAll('docs'),fetchAll('comments').catch(()=>[]),fetchAll('shares').catch(()=>[])]);
  S.comments=cmr.map(cmFromRow);S.shares=shr.map(r=>({token:r.token,dept:r.dept_id,task:r.task_id,role:r.role,exp:r.expires_at?Date.parse(r.expires_at):0,rev:!!r.revoked,by:r.created_by,ts:Date.parse(r.created_at)||0}));
  S.users=pr.map(u=>({id:u.id,name:u.name,pos:u.pos,admin:u.admin,avatar:u.avatar||'',phone:u.phone||'',about:u.about||''}));
  S.depts=dp.map(d=>({id:d.id,name:d.name,boss:d.boss,members:mb.filter(m=>m.dept_id==d.id).map(m=>m.user_id),tasks:[],projects:[],cols:null,cats:[],pages:[],v3:1}));
  dc.forEach(applyDoc);S.depts.forEach(normDept);
  SYNC={docs:{},depts:{}};const cur=docsOf();for(const id in cur)SYNC.docs[id]=JSON.stringify(cur[id].data);S.depts.forEach(d=>SYNC.depts[d.id]={name:d.name,members:d.members.slice()});
  await loadTeams();
  let mg=false;S.depts.forEach(d=>{const a1=ensureV4(d),a2=ensureV5(d),a3=ensureV6(d);if(a1||a2||a3)mg=true});if(autoArchive()||mg)schedPush();
  if(!S.dept||!D()){const v=vis()[0];S.dept=v?v.id:null;S.page=v&&v.pages[0]?v.pages[0].id:null}}
function schedPush(){if(!CLOUD||!S.me)return;clearTimeout(pt);pt=setTimeout(push,500)}
async function push(){if(!CLOUD||!S.me)return;if(pushing){dirty=true;return}pushing=true;dirty=false;
  try{
    for(const d of S.depts){const sd=SYNC.depts[d.id];
      if(!sd){const r=await DB.from('depts').insert({id:d.id,name:d.name,boss:d.boss});if(r.error)throw r.error;SYNC.depts[d.id]={name:d.name,members:d.members.slice()}}
      else{if(sd.name!=d.name){const r=await DB.from('depts').update({name:d.name}).eq('id',d.id);if(r.error)throw r.error;sd.name=d.name}
        const add=d.members.filter(m=>!sd.members.includes(m)),rem=sd.members.filter(m=>!d.members.includes(m));
        if(add.length){const r=await DB.from('dept_members').upsert(add.map(u=>({dept_id:d.id,user_id:u})),{onConflict:'dept_id,user_id',ignoreDuplicates:true});if(r.error)throw r.error}
        if(rem.length){const r=await DB.from('dept_members').delete().eq('dept_id',d.id).in('user_id',rem);if(r.error)throw r.error}
        sd.members=d.members.slice()}}
    const cur=docsOf(),up=[],del=[];
    for(const id in cur){const j=JSON.stringify(cur[id].data);if(SYNC.docs[id]!==j)up.push({id:id,dept_id:cur[id].dept,kind:cur[id].kind,data:cur[id].data,j:j})}
    for(const id in SYNC.docs)if(!cur[id])del.push(id);
    for(let i=0;i<up.length;i+=100){const ch=up.slice(i,i+100),r=await DB.from('docs').upsert(ch.map(u=>({id:u.id,dept_id:u.dept_id,kind:u.kind,data:u.data,updated_at:new Date().toISOString()})));if(r.error)throw r.error;ch.forEach(u=>SYNC.docs[u.id]=u.j)}
    if(del.length){const r=await DB.from('docs').delete().in('id',del);if(r.error)throw r.error;del.forEach(id=>delete SYNC.docs[id])}
    if(S.err){S.err='';R()}
  }catch(e){S.err='Не вдалося зберегти зміни в базі: '+(e.message||e)+'. Спробуємо ще раз…';R();clearTimeout(pt);pt=setTimeout(push,5000)}
  pushing=false;if(dirty)push()}
const softR=()=>{const a=document.activeElement;if(a&&(a.tagName=='INPUT'||a.tagName=='TEXTAREA'||a.tagName=='SELECT')&&$.contains(a)){clearTimeout(softT);softT=setTimeout(softR,1500)}else R()};
const reloadSoon=()=>{clearTimeout(rlT);rlT=setTimeout(async()=>{try{await push();await loadAll();softR()}catch(e){}},800)};
function subRT(){if(RT)return;RT=DB.channel('cks-sync')
  .on('postgres_changes',{event:'*',schema:'public',table:'docs'},p=>{try{if(p.eventType=='DELETE'){removeDoc(p.old.id);delete SYNC.docs[p.old.id]}else{const r=p.new,cur=docsOf()[r.id],j=JSON.stringify(r.data);if(cur&&JSON.stringify(cur.data)==j){SYNC.docs[r.id]=j;return}applyDoc(r);S.depts.forEach(normDept);SYNC.docs[r.id]=j}softR()}catch(e){}})
  .on('postgres_changes',{event:'*',schema:'public',table:'dept_members'},reloadSoon)
  .on('postgres_changes',{event:'*',schema:'public',table:'depts'},reloadSoon)
  .on('postgres_changes',{event:'*',schema:'public',table:'profiles'},reloadSoon)
  .on('postgres_changes',{event:'*',schema:'public',table:'teams'},reloadSoon)
  .on('postgres_changes',{event:'*',schema:'public',table:'team_members'},reloadSoon)
  .on('postgres_changes',{event:'*',schema:'public',table:'invites'},reloadSoon)
  .on('postgres_changes',{event:'*',schema:'public',table:'comments'},cmRT).subscribe()}
async function afterAuth(newBoss){const s=(await DB.auth.getSession()).data.session;if(!s)return;S.me=s.user.id;S.err='';reg=false;S.loading=true;R();
  try{await loadAll();subRT();subPres();if(!me())S.err='Профіль не знайдено. Перевірте, що SQL-схему (schema.sql) виконано.'}catch(e){S.err='Помилка завантаження: '+(e.message||e)}
  S.loading=false;R();if(newBoss&&me()&&!vis().length)newDept()}
async function outC(){try{if(RT){DB.removeChannel(RT);RT=null}if(PCH){DB.removeChannel(PCH);PCH=null}S.online=[];await DB.auth.signOut()}catch(e){}document.querySelectorAll('.toast').forEach(e=>e.remove());S.me=null;REM=false;S.comments=[];S.shares=[];S.invites=[];S.users=[];S.depts=[];S.dept=S.page=S.open=null;SYNC={docs:{},depts:{}};await loadPub();R()}
async function setNp(){const el=document.getElementById('np'),p=el.value,er2=document.getElementById('npe');if(p.length<6){er2.textContent='Мінімум 6 символів';return}const r=await DB.auth.updateUser({password:p});if(r.error){er2.textContent=emsg(r.error.message);return}M='';await afterAuth(false)}
function doLogin(){return CLOUD?doLoginC():doLoginL()}
function out(){return CLOUD?outC():outL()}
async function boot(){DB.auth.onAuthStateChange(ev=>{if(ev=='PASSWORD_RECOVERY'){M='<div class="ov"><div class="card"><h3>Новий пароль</h3><input id="np" type="password" placeholder="Новий пароль (від 6 символів)"><div class="err" id="npe"></div><button class="b" onclick="setNp()">Зберегти</button></div></div>';R()}});
  S.loading=true;R();
  try{const s=(await DB.auth.getSession()).data.session;if(s){S.me=s.user.id;await loadAll();subRT();subPres();if(!me())S.err='Профіль не знайдено. Перевірте, що SQL-схему (schema.sql) виконано.'}else await loadPub()}catch(e){S.err='Не вдалося підключитися до бази: '+(e.message||e)}
  S.loading=false;R()}


if(!CLOUD){let ch=false;S.depts.forEach(d=>{const a1=ensureV4(d),a2=ensureV5(d),a3=ensureV6(d);if(a1||a2||a3)ch=true});if(autoArchive()||ch)wr()}
/* запуск — у кінці depts.js (після того, як завантажено всі модулі) */
