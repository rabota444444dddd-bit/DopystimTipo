/* ЦКС — Робочий офіс: реєстрація за запрошенням, відділи та команди.
   Підключається після app.js (див. index.html). Потрібен migration_v5.sql для режиму з базою. */

/* =====================================================================
   1. Загальне: посади, права, коди запрошень
   ===================================================================== */
const POSL=['boss','pm','apm','asst'];
const INV_A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';               /* без I, O, 0, 1 — щоб не плутати */
const TCOL=['#17375E','#00a443','#8300b7','#c0392b','#d38b00','#0f7c9c','#6b7280'];
const invCode=()=>{const a=new Uint32Array(8);crypto.getRandomValues(a);return Array.from(a,x=>INV_A[x%INV_A.length]).join('')};
const invNorm=c=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const invFmt=c=>c&&c.length==8?c.slice(0,4)+'-'+c.slice(4):c||'';
const invLink=c=>location.href.split('#')[0]+'#inv='+c;
const TMS=d=>d.teams||(d.teams=[]);
const uById=id=>S.users.find(u=>u.id==id);
S.invites=S.invites||[];

/* «Голова» відділу — адміністратор, начальник відділу або учасник із посадою «Начальник» */
const isHead=d=>!!d&&(isA()||d.boss==S.me||(me()&&me().pos=='boss'&&d.members.includes(S.me)));
const invPos=d=>isA()?(d?['pm','apm','asst','boss']:['boss']):isHead(d)?['pm','apm','asst']:canMng(d)?['apm','asst']:[];
const canPosEdit=(d,u)=>u.id!=S.me&&(isA()||(isHead(d)&&u.pos!='boss'));
const canRemove=(d,u)=>u.id!=S.me&&u.id!=d.boss&&(isA()||(canMng(d)&&(isHead(d)||!['boss','pm'].includes(u.pos))));
const canTeam=(d,t)=>canMng(d)||(t&&t.lead==S.me);
const invState=i=>i.rev?['Відкликано','x']:(i.exp&&i.exp<Date.now())?['Прострочено','x']:(i.max&&i.uses>=i.max)?['Вичерпано','x']:['Активне','ok'];

/* Хеш пароля для локального режиму (без бази паролі більше не зберігаються відкритим текстом) */
async function pwHash(p,salt){if(!(window.crypto&&crypto.subtle))return 'plain:'+p;
  const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+':'+p));return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('')}

async function copyTxt(t){try{await navigator.clipboard.writeText(t)}catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy')}catch(x){}a.remove()}toast('Скопійовано')}

/* =====================================================================
   2. Екран входу та реєстрації
   ===================================================================== */
let AU={setup:null,inv:null,chk:false,show:false,fe:{},busy:false};
function invFromHash(){const m=location.hash.match(/^#inv=([A-Za-z0-9-]{8,12})$/);if(!m)return false;reg=true;draft.inv=invFmt(invNorm(m[1]));AU.inv=null;return true}
invFromHash();
addEventListener('hashchange',()=>{if(!me()&&invFromHash()){R();if(!AU.setup)invCheck(draft.inv)}});

const fld=(id,lab,attrs,val,err)=>`<label class="fl2"><span>${lab}</span><input id="${id}" ${attrs} value="${esc(val||'')}" class="${err?'bad':''}" oninput="draft['${id}']=this.value;feClr('${id}')" onkeydown="if(event.key=='Enter')authGo()"><em class="fe" id="fe_${id}">${esc(err||'')}</em></label>`;
function pwFld(id,lab,val,err,meter){return `<label class="fl2"><span>${lab}</span><div class="pwf"><input id="${id}" type="${AU.show?'text':'password'}" value="${esc(val||'')}" class="${err?'bad':''}" autocomplete="${reg?'new-password':'current-password'}" oninput="draft['${id}']=this.value;feClr('${id}')${meter?';pwMeter()':''}" onkeydown="if(event.key=='Enter')authGo()"><button type="button" class="eye" title="${AU.show?'Сховати':'Показати'} пароль" onclick="AU.show=!AU.show;R()">${AU.show?'◡':'👁'}</button></div>${meter?`<div class="pws" id="pws">${pwBar(val)}</div>`:''}<em class="fe" id="fe_${id}">${esc(err||'')}</em></label>`}
function pwScore(p){p=p||'';let s=0;if(p.length>=8)s++;if(p.length>=12)s++;if(/[a-zа-яії]/.test(p)&&/[A-ZА-ЯІЇ]/.test(p))s++;if(/\d/.test(p))s++;if(/[^\wА-Яа-яІіЇїЄєҐґ]/.test(p))s++;return Math.min(4,s)}
function pwBar(p){if(!p)return '<i></i><i></i><i></i><i></i><small>Мінімум 8 символів, літери й цифри</small>';const s=pwScore(p),L=['Дуже слабкий','Слабкий','Нормальний','Добрий','Надійний'];return [0,1,2,3].map(i=>`<i class="${i<s?'on s'+s:''}"></i>`).join('')+`<small>${L[s]}</small>`}
const pwMeter=()=>{const e=document.getElementById('pws');if(e)e.innerHTML=pwBar(draft.fp)};
const feClr=id=>{if(AU.fe[id]){delete AU.fe[id];const e=document.getElementById('fe_'+id);if(e)e.textContent='';const i=document.getElementById(id);if(i)i.classList.remove('bad')}};

function invBox(){const i=AU.inv;if(AU.chk)return '<div class="invc mu">Перевіряємо код…</div>';if(!i)return '';
  if(!i.ok)return `<div class="invc bad">${esc({not_found:'Код не знайдено. Перевірте, чи правильно його введено.',expired:'Термін дії запрошення минув. Попросіть нове.',revoked:'Запрошення відкликано.',used:'Запрошення вже використано.',nodb:'Не вдалося перевірити код. Можливо, у базі не виконано migration_v5.sql.'}[i.reason]||'Код недійсний')}</div>`;
  return `<div class="invc ok"><b>✓ Запрошення дійсне</b>${i.dept?`<div>Відділ: <b>${esc(i.dept)}</b>${i.boss?` · нач. ${esc(i.boss)}`:''}</div>`:'<div>Ви створите власний відділ</div>'}<div>Посада: <b>${esc(POS[i.pos]||i.pos)}</b>${i.team?` · команда «${esc(i.team)}»`:''}</div></div>`}
const invBoxR=()=>{const e=document.getElementById('invb');if(e)e.innerHTML=invBox();const b=document.getElementById('regb');if(b)b.disabled=!regReady()};
const regReady=()=>AU.setup||(AU.inv&&AU.inv.ok);

let INVT=null;
function invInput(el){const c=invNorm(el.value).slice(0,8);const f=invFmt(c);if(el.value!=f&&c.length==8)el.value=f;draft.inv=el.value;feClr('inv');
  if(AU.inv&&AU.inv.code!=c){AU.inv=null;invBoxR()}clearTimeout(INVT);if(c.length==8)INVT=setTimeout(()=>invCheck(c),250)}
async function invCheck(c){c=invNorm(c);if(c.length!=8){AU.inv={ok:false,reason:'not_found',code:c};invBoxR();return}AU.chk=true;invBoxR();let r;
  if(CLOUD){try{const q=await DB.rpc('invite_info',{p_code:c});r=q.error?{ok:false,reason:'nodb'}:(q.data||{ok:false,reason:'not_found'})}catch(e){r={ok:false,reason:'nodb'}}}
  else{const i=S.invites.find(x=>x.code==c);if(!i)r={ok:false,reason:'not_found'};else{const st=invState(i);r=st[1]=='ok'?{ok:true,pos:i.pos,dept:(S.depts.find(d=>d.id==i.dept)||{}).name,boss:i.dept?un((S.depts.find(d=>d.id==i.dept)||{}).boss):'',team:((S.depts.find(d=>d.id==i.dept)||{teams:[]}).teams||[]).filter(t=>t.id==i.team).map(t=>t.name)[0]}:{ok:false,reason:i.rev?'revoked':(i.exp&&i.exp<Date.now())?'expired':'used'}}}
  r.code=c;AU.chk=false;AU.inv=r;invBoxR();return r}

function auth(){if(!CLOUD)AU.setup=!S.users.length;const d=draft,F=AU.fe,lg=`<div class="lgb"><span>Steel solution<br>for solid business</span><img src="${IMG.logo}"></div>`;
  if(!reg)return `<div class="au"><div class="card ac">${lg}<h3>Вхід</h3>${fld('fe','Email','type="email" autocomplete="username" inputmode="email"',d.fe,F.fe)}${pwFld('fp','Пароль',d.fp,F.fp)}<div class="err" id="er">${esc(S.err||'')}</div><button class="b" ${AU.busy?'disabled':''} onclick="authGo()">${AU.busy?'Зачекайте…':'Увійти'}</button><div class="row sp"><a onclick="authMode(true)">Реєстрація за запрошенням</a>${CLOUD?'<a onclick="resetPw()">Забули пароль?</a>':''}</div></div></div>`;
  const setup=AU.setup;
  return `<div class="au"><div class="card ac">${lg}<h3>Реєстрація</h3>${setup?'<div class="invc ok"><b>Перший запуск</b><div>Ви станете адміністратором компанії з повним доступом і створите перший відділ. Інших співробітників ви запросите кодом.</div></div>':`<label class="fl2"><span>Код запрошення</span><input id="inv" class="code ${F.inv?'bad':''}" placeholder="XXXX-XXXX" maxlength="9" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(d.inv||'')}" oninput="invInput(this)" onkeydown="if(event.key=='Enter')authGo()"><em class="fe" id="fe_inv">${esc(F.inv||'')}</em></label><div id="invb">${invBox()}</div><div class="mu">Немає коду? Попросіть його в начальника відділу або проєктного менеджера.</div>`}
  ${fld('fn','Прізвище та ім’я','autocomplete="name" placeholder="Іваненко Олена"',d.fn,F.fn)}${fld('fph','Телефон <i>(необов’язково)</i>','type="tel" autocomplete="tel" inputmode="tel" placeholder="+380 67 123 45 67"',d.fph,F.fph)}${fld('fe','Email','type="email" autocomplete="email" inputmode="email"',d.fe,F.fe)}${pwFld('fp','Пароль',d.fp,F.fp,true)}${pwFld('fp2','Повторіть пароль',d.fp2,F.fp2)}
  <div class="err" id="er">${esc(S.err||'')}</div><button class="b" id="regb" ${regReady()&&!AU.busy?'':'disabled'} onclick="authGo()">${AU.busy?'Створюємо акаунт…':'Створити акаунт'}</button><a onclick="authMode(false)">Вже є акаунт? Увійти</a></div></div>`}
function authMode(r){reg=r;AU.fe={};S.err='';R();if(r&&!AU.setup&&draft.inv&&invNorm(draft.inv).length==8&&!AU.inv)invCheck(draft.inv)}
const er=t=>{const e=document.getElementById('er');if(e)e.textContent=t};
const rp=()=>{};                                   /* сумісність зі старою розміткою */
function authGo(){if(AU.busy)return;['inv','fn','fph','fe','fp','fp2'].forEach(k=>{const e=document.getElementById(k);if(e)draft[k]=e.value});return reg?doReg():doLogin()}

/* Нормалізація телефону: 067… → +38067…; повертає null, якщо номер некоректний */
function phNorm(p){p=String(p||'').trim();if(!p)return '';let s=p.replace(/[^\d+]/g,'');if(/^0\d{9}$/.test(s))s='+38'+s;else if(/^380\d{9}$/.test(s))s='+'+s;return /^\+\d{10,15}$/.test(s)?s:null}
function regCheck(){const d=draft,F={},n=(d.fn||'').trim().replace(/\s+/g,' '),e=(d.fe||'').trim().toLowerCase(),p=d.fp||'',ph=phNorm(d.fph);
  if(!AU.setup&&!(AU.inv&&AU.inv.ok))F.inv=invNorm(d.inv).length==8?'Код недійсний':'Введіть код запрошення (8 символів)';
  if(n.length<3||!/\s/.test(n))F.fn='Вкажіть прізвище та ім’я';else if(n.length>80)F.fn='Задовге ім’я';
  if(ph===null)F.fph='Формат: +380 67 123 45 67';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e))F.fe='Некоректний email';else if(!CLOUD&&S.users.some(u=>u.email==e))F.fe='Такий email уже зареєстровано';
  if(p.length<8)F.fp='Мінімум 8 символів';else if(!/\d/.test(p)||!/[^\d\s]/.test(p))F.fp='Пароль має містити літери й цифри';
  if(!F.fp&&p!==d.fp2)F.fp2='Паролі не збігаються';
  return {F,n,e,p,ph}}
const regDone=()=>{draft={};AU.inv=null;AU.fe={};AU.show=false;reg=false;if(/^#inv=/.test(location.hash))history.replaceState(null,'',location.href.split('#')[0])};

async function doReg(){const c=regCheck();AU.fe=c.F;if(Object.keys(c.F).length){S.err='';R();const k=Object.keys(c.F)[0],el=document.getElementById(k);if(el)el.focus();return}
  AU.busy=true;S.err='';R();try{await (CLOUD?doRegC(c):doRegL(c))}finally{AU.busy=false;if(!me())R()}}

async function doRegC(c){const setup=AU.setup,inv=setup?null:await invCheck(draft.inv);
  if(!setup&&!(inv&&inv.ok)){AU.fe={inv:'Код недійсний'};S.err='';return}
  const r=await DB.auth.signUp({email:c.e,password:c.p,options:{data:{name:c.n,phone:c.ph||'',invite:setup?'':inv.code},emailRedirectTo:location.href.split('#')[0]}});
  if(r.error){S.err=emsg(r.error.message);return}
  const boss=setup||inv.pos=='boss'&&!inv.dept;regDone();
  if(r.data.user&&Array.isArray(r.data.user.identities)&&!r.data.user.identities.length){S.err='';return info('Такий email уже зареєстровано. Увійдіть або відновіть пароль.')}
  if(!r.data.session)return info('<h3>Майже готово</h3><p>Ми надіслали лист на <b>'+esc(c.e)+'</b>. Відкрийте його, підтвердіть email і увійдіть.</p>');
  await afterAuth(boss)}

async function doRegL(c){const first=!S.users.length;let inv=null;
  if(!first){inv=S.invites.find(x=>x.code==invNorm(draft.inv));if(!inv||invState(inv)[1]!='ok'){AU.fe={inv:'Код недійсний'};return}}
  const salt=invCode()+invCode(),u={id:uid(),name:c.n,email:c.e,salt:salt,ph:await pwHash(c.p,salt),phone:c.ph||'',pos:first?'boss':inv.pos,admin:first};
  S.users.push(u);S.me=u.id;S.dept=S.page=null;
  if(inv){inv.uses=(inv.uses||0)+1;const d=S.depts.find(x=>x.id==inv.dept);
    if(d){d.members.push(u.id);if(inv.pos=='boss'&&!d.boss)d.boss=u.id;const t=TMS(d).find(x=>x.id==inv.team);if(t)t.members.push(u.id);S.dept=d.id;S.page=d.pages[0]&&d.pages[0].id}}
  regDone();S.err='';sv();if(u.pos=='boss'&&!vis().length)newDept()}

async function doLoginL(){const d=draft,e=(d.fe||'').trim().toLowerCase(),p=d.fp||'';if(!e||!p)return er('Введіть email і пароль');
  const u=S.users.find(x=>x.email==e);let ok=false;
  if(u&&u.ph)ok=(await pwHash(p,u.salt))===u.ph;
  else if(u&&u.pass!=null&&u.pass===p){ok=true;u.salt=invCode()+invCode();u.ph=await pwHash(p,u.salt);delete u.pass}   /* старий акаунт — переводимо на хеш */
  if(!ok)return er('Невірний email або пароль');draft={};AU.show=false;S.me=u.id;S.open=null;const v=vis()[0];S.dept=v?v.id:null;S.page=v&&v.pages[0]?v.pages[0].id:null;sv()}

async function doLoginC(){const e=(draft.fe||'').trim().toLowerCase(),p=draft.fp||'';if(!e||!p)return er('Введіть email і пароль');
  AU.busy=true;R();const r=await DB.auth.signInWithPassword({email:e,password:p});AU.busy=false;
  if(r.error){S.err=emsg(r.error.message);R();return}draft={};AU.show=false;S.err='';await afterAuth(false)}
async function resetPw(){const e=(draft.fe||'').trim().toLowerCase();if(!e)return er('Введіть email у полі вище');const r=await DB.auth.resetPasswordForEmail(e,{redirectTo:location.href.split('#')[0].split('?')[0]});info(r.error?esc(emsg(r.error.message)):'Лист для відновлення пароля надіслано на '+esc(e))}

/* перед входом: чи це перший запуск */
async function loadPub(){if(!CLOUD){AU.setup=!S.users.length;return}
  try{const r=await DB.rpc('needs_setup');AU.setup=r.error?false:!!r.data}catch(e){AU.setup=false}
  if(reg&&!AU.setup&&draft.inv&&invNorm(draft.inv).length==8)invCheck(draft.inv)}
if(!CLOUD)loadPub();

/* =====================================================================
   3. Хмара: завантаження команд і запрошень, запис змін
   ===================================================================== */
async function loadTeams(){if(!CLOUD)return;const [t,tm,iv]=await Promise.all([fetchAll('teams').catch(()=>[]),fetchAll('team_members').catch(()=>[]),fetchAll('invites').catch(()=>[])]);
  S.depts.forEach(d=>d.teams=t.filter(x=>x.dept_id==d.id).map(x=>({id:x.id,name:x.name,lead:x.lead,color:x.color||TCOL[0],ts:Date.parse(x.created_at)||0,members:tm.filter(m=>m.team_id==x.id).map(m=>m.user_id)})).sort((a,b)=>a.ts-b.ts));
  S.invites=iv.map(r=>({code:r.code,dept:r.dept_id,pos:r.pos,team:r.team_id,note:r.note||'',max:r.max_uses||0,uses:r.uses||0,exp:r.expires_at?Date.parse(r.expires_at):0,rev:!!r.revoked,by:r.created_by,ts:Date.parse(r.created_at)||0}))}
/* виконати запит до бази; при помилці — повернути як було й показати причину */
async function dbDo(q,undo){if(!CLOUD){wr();return true}try{const r=await q();if(r&&r.error)throw r.error;return true}catch(e){if(undo)undo();toast('Не збережено: '+(e.message||e)+(/relation|function|does not exist/.test(e.message||'')?' (чи виконано migration_v5.sql?)':''));accRef();R();return false}}

/* =====================================================================
   4. Вікно «Відділ»: учасники, команди, запрошення, доступ, налаштування
   ===================================================================== */
let DT={tab:'mem',q:'',pg:null,last:null,del:''};
function deptOpen(tab){DT.tab=tab||DT.tab||'mem';DT.last=null;DT.del='';M=accHtml();R()}
const accOpen=()=>deptOpen();
function dtab(t){DT.tab=t;DT.last=null;accRef()}
function accHtml(){const d=D();if(!d)return '';const T=[['mem','Учасники ('+d.members.length+')'],['teams','Команди ('+TMS(d).length+')'],canMng(d)&&['inv','Запрошення'],canMng(d)&&['pages','Доступ до сторінок'],['set','Відділ']].filter(Boolean);
  if(!T.some(t=>t[0]==DT.tab))DT.tab='mem';
  return `<div class="ov" data-acc="1" onclick="if(event.target==this){M='';R()}"><div class="card dpm"><div class="row sp"><h3>${esc(d.name)}</h3><button class="x" onclick="M='';R()" title="Закрити">✕</button></div><div class="tabs">${T.map(t=>`<button class="${DT.tab==t[0]?'on':''}" onclick="dtab('${t[0]}')">${t[1]}</button>`).join('')}</div><div class="tbd">${({mem:tabMem,teams:tabTeams,inv:tabInv,pages:tabPages,set:tabSet})[DT.tab](d)}</div></div></div>`}

/* --- учасники --- */
function uAv(u,sz){return `<i class="pa" style="margin:0;width:${sz||30}px;height:${sz||30}px;${avSt(u.id)}">${esc(ini(u.name))}</i>`}
function tabMem(d){const q=DT.q.toLowerCase(),L=d.members.map(uById).filter(Boolean).filter(u=>!q||(u.name+' '+(u.phone||'')).toLowerCase().includes(q))
    .sort((a,b)=>(b.id==d.boss)-(a.id==d.boss)||POSL.indexOf(a.pos)-POSL.indexOf(b.pos)||a.name.localeCompare(b.name,'uk'));
  const oth=S.users.filter(u=>!d.members.includes(u.id)).sort((a,b)=>a.name.localeCompare(b.name,'uk')),po=isA()?POSL:['pm','apm','asst'];
  return `${d.members.length>6?`<input class="srch" placeholder="Пошук співробітника" value="${esc(DT.q)}" oninput="DT.q=this.value;clearTimeout(INVT);INVT=setTimeout(accRef,250)">`:''}
  <div class="mls">${L.map(u=>{const tm=TMS(d).filter(t=>t.members.includes(u.id));return `<div class="mrow">${uAv(u)}<div class="mi"><b>${esc(u.name)}${u.id==S.me?' <span class="mu">(ви)</span>':''}</b><div class="mu">${u.id==d.boss?'<span class="bdg">Начальник відділу</span> ':''}${u.admin?'<span class="bdg">Адмін</span> ':''}${tm.map(t=>`<span class="tch" style="--tc:${t.color}">${esc(t.name)}${t.lead==u.id?' ★':''}</span>`).join(' ')}${u.phone?` <a href="tel:${esc(u.phone)}">${esc(u.phone)}</a>`:''}</div></div>
    ${canPosEdit(d,u)?`<select class="psel" onchange="setPos('${u.id}',this.value)">${(po.includes(u.pos)?po:po.concat(u.pos)).map(p=>`<option value="${p}" ${u.pos==p?'selected':''}>${POS[p]}</option>`).join('')}</select>`:`<span class="mu psel">${esc(POS[u.pos]||'')}</span>`}
    ${canRemove(d,u)?`<button class="x" title="Прибрати з відділу" onclick="memRm('${u.id}')">✕</button>`:'<span class="xsp"></span>'}</div>`}).join('')||'<div class="mu">Нікого не знайдено.</div>'}</div>
  ${canMng(d)?`<div class="ph">Додати співробітника</div><div class="mu">Нових людей запрошуйте кодом на вкладці «Запрошення». Тут — ті, хто вже має акаунт.</div>${oth.length?`<div class="row"><select id="am_u" style="flex:1"><option value="">Оберіть співробітника…</option>${oth.map(u=>`<option value="${u.id}">${esc(u.name)} — ${esc(POS[u.pos]||'')}</option>`).join('')}</select><button class="b2" onclick="memAdd(document.getElementById('am_u').value)">+ Додати</button></div>`:'<div class="mu">Усі співробітники вже у відділі.</div>'}`:''}`}
async function setPos(id,p){const u=uById(id),old=u.pos;u.pos=p;accRef();
  if(await dbDo(()=>DB.rpc('set_member_pos',{p_user:id,p_pos:p}),()=>u.pos=old)){toast(esc(u.name)+': '+POS[p]);if(!CLOUD)sv()}}
function memAdd(id){const d=D();if(!id||d.members.includes(id))return;d.members.push(id);sv();accRef();toast('Додано до відділу')}
function memRm(id){const d=D(),u=uById(id);cfm('Прибрати «'+esc(u?u.name:'?')+'» з відділу?',()=>{d.members=d.members.filter(x=>x!=id);TMS(d).forEach(t=>{t.members=t.members.filter(x=>x!=id);if(t.lead==id)t.lead=null});
  d.pages.forEach(p=>{if(Array.isArray(p.acc))p.acc=p.acc.filter(x=>x!=id)});sv();M=accHtml();R()})}

/* --- команди --- */
function tabTeams(d){const L=TMS(d),mem=d.members.map(uById).filter(Boolean),open=t=>d.tasks.filter(x=>!x.arch&&x.status!=ST[3]&&x.who.some(w=>t.members.includes(w))).length;
  return `<div class="mu">Команда — група людей у відділі (наприклад, ПМ і його помічники). Задачі можна призначати всій команді одразу й фільтрувати за командою.</div>
  ${L.map(t=>{const ed=canMng(d),em=canTeam(d,t);return `<div class="tmc" style="--tc:${t.color}"><div class="row"><button class="tdot" title="${ed?'Змінити колір':''}" ${ed?`onclick="tmColor('${t.id}')"`:''}></button>${ed?`<input class="tnm" value="${esc(t.name)}" onchange="tmUpd('${t.id}',{name:this.value.trim()||'Команда'})">`:`<b class="tnm">${esc(t.name)}</b>`}<span class="mu">${t.members.length} ос. · ${open(t)} задач у роботі</span>${ed?`<button class="x" title="Видалити команду" onclick="tmDel('${t.id}')">✕</button>`:''}</div>
    <div class="row"><span class="mu">Керівник:</span>${ed?`<select onchange="tmUpd('${t.id}',{lead:this.value||null})"><option value="">— не призначено —</option>${mem.map(u=>`<option value="${u.id}" ${t.lead==u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select>`:`<b>${esc(t.lead?un(t.lead):'—')}</b>`}</div>
    <div class="ch">${t.members.map(m=>`<span class="c">${esc(un(m))}${em?`<i title="Прибрати" onclick="tmMem('${t.id}','${m}',false)">×</i>`:''}</span>`).join('')||'<span class="mu">Поки без учасників</span>'}${em&&mem.some(u=>!t.members.includes(u.id))?`<select onchange="tmMem('${t.id}',this.value,true)"><option value="">+ учасник</option>${mem.filter(u=>!t.members.includes(u.id)).map(u=>`<option value="${u.id}">${esc(u.name)}</option>`).join('')}</select>`:''}</div>
    <div class="row"><a onclick="M='';FL.team='${t.id}';FL.who='';const p=D().pages.find(x=>x.type=='tasks');if(p)S.page=p.id;sv()">Показати задачі команди →</a></div></div>`}).join('')||'<div class="mu" style="margin:8px 0">Команд ще немає.</div>'}
  ${canMng(d)?`<div class="row"><input id="tm_n" placeholder="Назва нової команди" style="flex:1" onkeydown="if(event.key=='Enter')tmAdd()"><button class="b" onclick="tmAdd()">+ Команда</button></div>`:''}`}
const tmGet=id=>TMS(D()).find(t=>t.id==id);
async function tmAdd(){const d=D(),n=(document.getElementById('tm_n').value||'').trim();if(!n)return;const t={id:uid(),name:n.slice(0,80),lead:null,color:TCOL[TMS(d).length%TCOL.length],members:[],ts:Date.now()};
  TMS(d).push(t);accRef();await dbDo(()=>DB.from('teams').insert({id:t.id,dept_id:d.id,name:t.name,color:t.color}),()=>d.teams=d.teams.filter(x=>x!=t))}
async function tmUpd(id,patch){const t=tmGet(id),old={...t};Object.assign(t,patch);accRef();await dbDo(()=>DB.from('teams').update(patch).eq('id',id),()=>Object.assign(t,old))}
const tmColor=id=>{const t=tmGet(id);tmUpd(id,{color:TCOL[(TCOL.indexOf(t.color)+1)%TCOL.length]})};
function tmDel(id){const t=tmGet(id);cfm('Видалити команду «'+esc(t.name)+'»? Задачі та люди залишаться.',async()=>{const d=D(),i=d.teams.indexOf(t);d.teams.splice(i,1);if(FL.team==id)FL.team='';M=accHtml();R();await dbDo(()=>DB.from('teams').delete().eq('id',id),()=>d.teams.splice(i,0,t))})}
async function tmMem(id,u,add){if(!u)return;const t=tmGet(id);if(add){if(t.members.includes(u))return;t.members.push(u)}else t.members=t.members.filter(x=>x!=u);accRef();
  await dbDo(()=>add?DB.from('team_members').insert({team_id:id,user_id:u}):DB.from('team_members').delete().eq('team_id',id).eq('user_id',u),()=>{t.members=add?t.members.filter(x=>x!=u):t.members.concat(u)})}

/* --- запрошення --- */
function invForm(d){const po=invPos(d),ts=d?TMS(d):[];return `<div class="invf"><label class="mu">Посада<select id="iv_p">${po.map(p=>`<option value="${p}" ${p=='asst'?'selected':''}>${POS[p]}</option>`).join('')}</select></label>
  ${ts.length?`<label class="mu">Команда<select id="iv_t"><option value="">— без команди —</option>${ts.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label>`:''}
  <label class="mu">Діє<select id="iv_e"><option value="1">1 день</option><option value="7" selected>7 днів</option><option value="30">30 днів</option><option value="0">без обмеження</option></select></label>
  <label class="mu">Скільки людей<select id="iv_m"><option value="1" selected>1 людина</option><option value="5">до 5</option><option value="20">до 20</option><option value="0">без обмеження</option></select></label>
  <label class="mu wide">Для кого (примітка)<input id="iv_n" maxlength="120" placeholder="Напр.: Олена, новий помічник"></label></div><button class="b" onclick="invNew(${d?`'${d.id}'`:'null'})">Створити запрошення</button>`}
function invCard(i){const st=invState(i),t=i.dept&&TMS(S.depts.find(d=>d.id==i.dept)||{}).find(x=>x.id==i.team),hot=DT.last==i.code;
  return `<div class="ivr ${st[1]} ${hot?'hot':''}"><div class="row"><b class="code">${invFmt(i.code)}</b><span class="bdg ${st[1]}">${st[0]}</span><span class="fl"></span>${st[1]=='ok'?`<button class="b2 sm" onclick="copyTxt(invLink('${i.code}'))">Копіювати посилання</button><button class="b2 sm" onclick="copyTxt('${invFmt(i.code)}')">Код</button><button class="x" title="Відкликати" onclick="invRev('${i.code}')">✕</button>`:''}</div>
  <div class="mu">${esc(POS[i.pos]||i.pos)}${t?' · команда «'+esc(t.name)+'»':''}${i.note?' · '+esc(i.note):''} · використано ${i.uses}${i.max?' з '+i.max:''} · ${i.exp?'до '+new Date(i.exp).toLocaleDateString('uk-UA'):'безстроково'}</div>
  ${hot?`<div class="mu">Надішліть людині посилання — код підставиться сам. Або продиктуйте код: <b>${invFmt(i.code)}</b></div>`:''}</div>`}
function invList(deptId){const L=S.invites.filter(i=>i.dept==deptId).sort((a,b)=>(invState(a)[1]=='ok'?0:1)-(invState(b)[1]=='ok'?0:1)||b.ts-a.ts);const on=L.filter(i=>invState(i)[1]=='ok'),off=L.filter(i=>invState(i)[1]!='ok');
  return `${on.map(invCard).join('')||'<div class="mu">Активних запрошень немає.</div>'}${off.length?`<details><summary class="mu">Неактивні (${off.length})</summary>${off.slice(0,30).map(invCard).join('')}</details>`:''}`}
function tabInv(d){return `<div class="mu">Зареєструватися можна лише за кодом. Посаду й відділ визначає запрошення — людина не може обрати їх сама.</div>${invForm(d)}<div class="ph">Запрошення відділу</div>${invList(d.id)}`}
async function invNew(deptId){const v=i=>(document.getElementById(i)||{}).value||'',e=+v('iv_e'),m=+v('iv_m');
  const i={code:invCode(),dept:deptId,pos:v('iv_p'),team:v('iv_t')||null,note:v('iv_n').trim().slice(0,120),max:m||0,uses:0,exp:e?Date.now()+e*864e5:0,rev:false,by:S.me,ts:Date.now()};
  if(!invPos(deptId&&D()).includes(i.pos))return toast('Немає прав запрошувати на цю посаду');
  S.invites.push(i);DT.last=i.code;accRef();
  const ok=await dbDo(()=>DB.from('invites').insert({code:i.code,dept_id:deptId,pos:i.pos,team_id:i.team,note:i.note||null,max_uses:i.max||null,expires_at:i.exp?new Date(i.exp).toISOString():null,created_by:S.me}),()=>S.invites=S.invites.filter(x=>x!=i));
  if(ok){copyTxt(invLink(i.code));accRef()}}
function invRev(code){cfm('Відкликати запрошення '+invFmt(code)+'? Ним більше не можна буде зареєструватися.',async()=>{const i=S.invites.find(x=>x.code==code);i.rev=true;M=accHtml();R();
  await dbDo(()=>DB.from('invites').update({revoked:true}).eq('code',code),()=>i.rev=false)})}

/* Адміністратор: запросити начальника нового відділу */
function invBossOpen(){DT.last=null;M=invBossHtml();R()}
function invBossHtml(){return `<div class="ov" data-acc="boss" onclick="if(event.target==this){M='';R()}"><div class="card dpm"><div class="row sp"><h3>Запросити начальника</h3><button class="x" onclick="M='';R()">✕</button></div><div class="mu">Начальник зареєструється за цим кодом і створить власний відділ.</div>${invForm(null)}<div class="ph">Запрошення начальників</div>${invList(null)}</div></div>`}

/* --- доступ до сторінок --- */
function tabPages(d){const p=d.pages.find(x=>x.id==DT.pg)||P()||d.pages[0];if(!p)return '<div class="mu">У відділі немає сторінок.</div>';DT.pg=p.id;
  const usr=d.members.filter(m=>{const u=uById(m);return u&&!u.admin&&m!=d.boss}),lim=Array.isArray(p.acc);
  return `<label class="mu">Сторінка<select onchange="DT.pg=this.value;accRef()">${d.pages.map(x=>`<option value="${x.id}" ${x.id==p.id?'selected':''}>${esc(x.name)}${Array.isArray(x.acc)?' 🔒':''}</option>`).join('')}</select></label>
  <label class="sbt"><input type="checkbox" ${lim?'':'checked'} onchange="pgAll2('${p.id}',this.checked)"><span style="flex:1">Усі учасники відділу</span></label>
  ${lim?`${TMS(d).length?`<div class="row">${TMS(d).map(t=>`<button class="b2 sm" onclick="pgTeam('${p.id}','${t.id}')">+ команда «${esc(t.name)}»</button>`).join('')}</div>`:''}${usr.map(m=>`<label class="sbt"><input type="checkbox" ${p.acc.includes(m)?'checked':''} onchange="pgTog2('${p.id}','${m}')"><span style="flex:1">${esc(un(m))}</span><span class="mu">${esc(POS[(uById(m)||{}).pos]||'')}</span></label>`).join('')}`:''}
  <div class="mu">Начальник відділу та проєктні менеджери бачать усі сторінки. Обмеження діє в інтерфейсі.</div>`}
const pgF=id=>D().pages.find(x=>x.id==id);
function pgAll2(id,on){const p=pgF(id),d=D();if(on)delete p.acc;else p.acc=d.members.filter(m=>{const u=uById(m);return u&&!u.admin});sv();accRef()}
function pgTog2(id,u){const p=pgF(id);p.acc=p.acc.includes(u)?p.acc.filter(x=>x!=u):p.acc.concat(u);sv();accRef()}
function pgTeam(id,tid){const p=pgF(id),t=tmGet(tid);p.acc=[...new Set(p.acc.concat(t.members))];sv();accRef()}

/* --- налаштування відділу --- */
function tabSet(d){const own=isA()||d.boss==S.me,mem=d.members.map(uById).filter(u=>u&&u.id!=d.boss),T=d.tasks.filter(t=>!t.arch);
  return `<div class="kv2"><span>Начальник</span><b>${esc(d.boss?un(d.boss):'—')}</b><span>Учасників</span><b>${d.members.length}</b><span>Команд</span><b>${TMS(d).length}</b><span>Задач</span><b>${T.length} (виконано ${T.filter(t=>t.status==ST[3]).length})</b><span>Проєктів</span><b>${d.projects.length}</b></div>
  ${canMng(d)?`<label class="mu">Назва відділу<input style="width:100%" value="${esc(d.name)}" onchange="const v=this.value.trim();if(v){D().name=v;sv();accRef()}"></label>`:''}
  ${own&&mem.length?`<div class="ph">Передати відділ</div><div class="row"><select id="tr_u" style="flex:1"><option value="">Новий начальник…</option>${mem.map(u=>`<option value="${u.id}">${esc(u.name)} — ${esc(POS[u.pos]||'')}</option>`).join('')}</select><button class="b2" onclick="deptTransfer(document.getElementById('tr_u').value)">Передати</button></div><div class="mu">Новий начальник отримає посаду «Начальник». Ви залишитеся учасником відділу.</div>`:''}
  ${own?`<div class="ph dz">Небезпечна зона</div><div class="mu">Видалення відділу безповоротно знищить усі його задачі, проєкти, коментарі та запрошення. Для підтвердження введіть назву відділу.</div><div class="row"><input id="dl_n" style="flex:1" placeholder="${esc(d.name)}" value="${esc(DT.del)}" oninput="DT.del=this.value;document.getElementById('dl_b').disabled=this.value.trim()!==D().name"><button class="b dng" id="dl_b" ${DT.del.trim()===d.name?'':'disabled'} onclick="deptDel()">Видалити відділ</button></div>`:''}`}
function deptTransfer(id){const d=D(),u=uById(id);if(!u)return;cfm('Передати відділ «'+esc(d.name)+'» співробітнику '+esc(u.name)+'?',async()=>{const ob=d.boss,op=u.pos;d.boss=id;u.pos='boss';M=accHtml();R();
  if(await dbDo(()=>DB.rpc('transfer_dept',{p_dept:d.id,p_user:id}),()=>{d.boss=ob;u.pos=op})){if(!CLOUD)sv();toast('Відділ передано')}})}
async function deptDel(){const d=D();if(!d||DT.del.trim()!==d.name)return;
  if(CLOUD){const r=await DB.from('depts').delete().eq('id',d.id);if(r.error){toast('Не вдалося видалити: '+r.error.message);return}
    delete SYNC.depts[d.id];['meta:'+d.id].concat(d.tasks.map(t=>'task:'+t.id),d.projects.map(p=>'project:'+p.id)).forEach(k=>delete SYNC.docs[k])}
  S.depts=S.depts.filter(x=>x!=d);S.invites=S.invites.filter(i=>i.dept!=d.id);const v=vis()[0];S.dept=v?v.id:null;S.page=v&&v.pages[0]?v.pages[0].id:null;S.open=null;M='';DT.del='';sv();toast('Відділ видалено')}

/* =====================================================================
   5. Команди в задачах: призначення та фільтр
   ===================================================================== */
const assignable=(d,cur)=>{const ids=new Set(d.members.concat(cur||[]));return S.users.filter(u=>ids.has(u.id)).sort((a,b)=>a.name.localeCompare(b.name,'uk'))};
const teamHit=(tid,t)=>{const tm=TMS(D()).find(x=>x.id==tid);return !!tm&&t.who.some(w=>tm.members.includes(w))};
function teamToggle(tid,taskId){const t=tg(taskId),tm=tmGet(tid);if(!t||!tm||!tm.members.length)return;const all=tm.members.every(m=>t.who.includes(m));
  if(all)t.who=t.who.filter(w=>!tm.members.includes(w));else tm.members.forEach(m=>{if(!t.who.includes(m)){t.who.push(m);assignNotify(taskId,m)}})}

/* =====================================================================
   6. Запуск програми
   ===================================================================== */
if(SH)shBoot();else if(CLOUD)boot();else R();
