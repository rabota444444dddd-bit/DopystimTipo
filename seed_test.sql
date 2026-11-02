-- ЦКС — Робочий офіс: ТЕСТОВІ АКАУНТИ та тестовий відділ із проєктами
-- Виконайте ПІСЛЯ migration_v5.sql: Supabase → SQL Editor → New query → вставити → Run.
-- Створює 7 підтверджених акаунтів (вхід одразу, без листів), «Тестовий відділ», 2 команди, 2 проєкти й кілька задач.
-- Повторний запуск нічого не дублює. Видалити все тестове — блок у самому кінці файлу.
--
--  Роль                      | Ім’я               | Email               | Пароль
--  Начальник відділу         | Бондаренко Андрій  | nachalnyk@cks.test  | Cks-cqVGUG68
--  Проєктний менеджер        | Мельник Ольга      | pm1@cks.test        | Cks-43Zh3M84
--  Проєктний менеджер        | Ткаченко Дмитро    | pm2@cks.test        | Cks-HKgE7a63
--  Помічник ПМ               | Шевчук Ірина       | apm1@cks.test       | Cks-9Tf9vb13
--  Помічник ПМ               | Кравченко Максим   | apm2@cks.test       | Cks-AdsxHM65
--  Помічник ПМ               | Лисенко Марія      | apm3@cks.test       | Cks-XQynNH73
--  Помічник ПМ               | Савчук Тарас       | apm4@cks.test       | Cks-cAMhgB17
--
-- Що перевірити:
--  • Проєкт «ЖК Сонячний» (ПМ Мельник): доступ мають Шевчук і Кравченко.
--  • Проєкт «ТЦ Північний» (ПМ Ткаченко): доступ має Лисенко.
--  • Савчук не має доступу до жодного проєкту — бачить лише свої задачі (зокрема одну задачу «ТЦ Північний», де він виконавець).
--  • Начальник і обидва ПМ бачать обидва проєкти.

set search_path = public, extensions;   -- crypt()/gen_salt() бувають у схемі extensions або public

do $$
declare
  dept constant text := 'test_dept';
  u record; ids jsonb := '{}'::jsonb; uidv uuid; code text;
  people jsonb := '[
    {"k":"boss","email":"nachalnyk@cks.test","pw":"Cks-cqVGUG68","name":"Бондаренко Андрій","pos":"boss","phone":"+380671110001"},
    {"k":"pm1", "email":"pm1@cks.test",      "pw":"Cks-43Zh3M84","name":"Мельник Ольга",    "pos":"pm",  "phone":"+380671110002"},
    {"k":"pm2", "email":"pm2@cks.test",      "pw":"Cks-HKgE7a63","name":"Ткаченко Дмитро",  "pos":"pm",  "phone":"+380671110003"},
    {"k":"apm1","email":"apm1@cks.test",     "pw":"Cks-9Tf9vb13","name":"Шевчук Ірина",     "pos":"apm", "phone":"+380671110004"},
    {"k":"apm2","email":"apm2@cks.test",     "pw":"Cks-AdsxHM65","name":"Кравченко Максим", "pos":"apm", "phone":"+380671110005"},
    {"k":"apm3","email":"apm3@cks.test",     "pw":"Cks-XQynNH73","name":"Лисенко Марія",    "pos":"apm", "phone":"+380671110006"},
    {"k":"apm4","email":"apm4@cks.test",     "pw":"Cks-cAMhgB17","name":"Савчук Тарас",     "pos":"apm", "phone":"+380671110007"}
  ]'::jsonb;
  td date := current_date;
  ts bigint := (extract(epoch from now())*1000)::bigint;
begin
  if exists(select 1 from auth.users where email like '%@cks.test') then
    raise notice 'Тестові акаунти вже існують — нічого не змінено.'; return;
  end if;

  -- 1. Акаунти (кожен — через одноразове запрошення, як справжня реєстрація)
  for u in select * from jsonb_to_recordset(people) as x(k text,email text,pw text,name text,pos text,phone text) loop
    code := upper(substr(md5(random()::text||clock_timestamp()::text),1,8));
    if u.pos='boss' then insert into public.invites(code,pos,max_uses,note) values(code,'boss',1,'тестовий акаунт');
    else insert into public.invites(code,dept_id,pos,max_uses,note) values(code,dept,u.pos,1,'тестовий акаунт'); end if;
    uidv := gen_random_uuid();
    insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,
                           created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values('00000000-0000-0000-0000-000000000000',uidv,'authenticated','authenticated',u.email,
           crypt(u.pw,gen_salt('bf',10)),now(),'{"provider":"email","providers":["email"]}'::jsonb,
           jsonb_build_object('name',u.name,'phone',u.phone,'invite',code),now(),now(),'','','','');
    insert into auth.identities(id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values(gen_random_uuid(),uidv,uidv::text,jsonb_build_object('sub',uidv::text,'email',u.email,'email_verified',true),'email',now(),now(),now());
    ids := ids || jsonb_build_object(u.k,uidv::text);
    if u.pos='boss' then insert into public.depts(id,name,boss) values(dept,'Тестовий відділ',uidv); end if;
  end loop;

  -- 2. Сторінки відділу
  insert into public.docs(id,dept_id,kind,data) values('meta:'||dept,dept,'meta',jsonb_build_object('pages',jsonb_build_array(
    jsonb_build_object('id','tp_tasks','name','Робочі задачі','type','tasks'),
    jsonb_build_object('id','tp_kan','name','Статус задач','type','kanban'),
    jsonb_build_object('id','tp_prj','name','Проєкти','type','projects'),
    jsonb_build_object('id','tp_tl','name','Таймлайн','type','timeline'),
    jsonb_build_object('id','tp_cal','name','Календар','type','calendar'),
    jsonb_build_object('id','tp_dash','name','Центр управління','type','dash')),'cats','[]'::jsonb));

  -- 3. Команди
  insert into public.teams(id,dept_id,name,lead,color) values
    ('tt_mel',dept,'Команда Мельник',(ids->>'pm1')::uuid,'#00a443'),
    ('tt_tka',dept,'Команда Ткаченко',(ids->>'pm2')::uuid,'#8300b7');
  insert into public.team_members(team_id,user_id) values
    ('tt_mel',(ids->>'pm1')::uuid),('tt_mel',(ids->>'apm1')::uuid),('tt_mel',(ids->>'apm2')::uuid),
    ('tt_tka',(ids->>'pm2')::uuid),('tt_tka',(ids->>'apm3')::uuid),('tt_tka',(ids->>'apm4')::uuid);

  -- 4. Проєкти (acc — помічники з доступом)
  insert into public.docs(id,dept_id,kind,data) values
    ('project:tpj_sun',dept,'project',jsonb_build_object('id','tpj_sun','name','ЖК «Сонячний»','desc','Металоконструкції каркаса, 3 секції','qty','420',
      'avatar','','files','[]'::jsonb,'owner',ids->>'pm1','acc',jsonb_build_array(ids->>'apm1',ids->>'apm2'),'ts',ts)),
    ('project:tpj_nor',dept,'project',jsonb_build_object('id','tpj_nor','name','ТЦ «Північний»','desc','Покрівельні ферми та прогони','qty','180',
      'avatar','','files','[]'::jsonb,'owner',ids->>'pm2','acc',jsonb_build_array(ids->>'apm3'),'ts',ts+1));

  -- 5. Задачі
  insert into public.docs(id,dept_id,kind,data)
  select 'task:'||x.id,dept,'task',jsonb_build_object('id',x.id,'title',x.title,'status',x.st,'start',(td+x.s)::text,'end',(td+x.e)::text,
         'who',x.who,'subs','[]'::jsonb,'project',x.pj,'cat','','pri',x.pri,'ts',ts+x.n,'doneAt','')
  from (values
    ('tt1','Погодити КМД секції 1','В процесі',-3,2,jsonb_build_array(ids->>'pm1',ids->>'apm1'),'tpj_sun','high',1),
    ('tt2','Замовити метал на секцію 2','Не почато',1,6,jsonb_build_array(ids->>'apm2'),'tpj_sun','mid',2),
    ('tt3','Графік відвантаження МК','Не почато',3,10,jsonb_build_array(ids->>'apm1'),'tpj_sun','low',3),
    ('tt4','Розрахунок ферм Ф-1…Ф-6','В процесі',-2,4,jsonb_build_array(ids->>'pm2',ids->>'apm3'),'tpj_nor','high',4),
    ('tt5','Узгодити вузли кріплення прогонів','Не почато',2,8,jsonb_build_array(ids->>'apm4'),'tpj_nor','mid',5),
    ('tt6','Підготувати звіт відділу за тиждень','Не почато',0,3,jsonb_build_array(ids->>'apm4'),'','mid',6),
    ('tt7','Оновити шаблони КП','Постійна задача',-10,20,jsonb_build_array(ids->>'boss'),'','low',7)
  ) as x(id,title,st,s,e,who,pj,pri,n);

  raise notice 'Готово: створено 7 тестових акаунтів і «Тестовий відділ».';
end $$;

-- ===== Видалити всі тестові дані (виділіть рядки нижче й виконайте окремо) =====
-- delete from public.depts where id='test_dept';
-- delete from auth.users where email like '%@cks.test';
-- delete from public.invites where note='тестовий акаунт';
