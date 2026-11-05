-- ЦКС — Робочий офіс: ОНОВЛЕННЯ бази №5 — адміністратор, реєстрація за посиланням, закриті відділи, команди
-- Виконайте файл після migration_v4.sql: Supabase → SQL Editor → New query → вставити → Run.
-- Файл можна запускати повторно (у тому числі, якщо попередню версію migration_v5.sql уже виконували).
-- (Для нової бази він уже включений у schema.sql.)
--
-- Як це працює:
--   • Адміністратор — один акаунт з email, вказаним у функції admin_email() нижче. Лише він реєструється без посилання.
--   • Адміністратор дає одноразові посилання начальникам. Начальник після реєстрації створює свій відділ.
--   • Начальник дає одноразові посилання співробітникам (Помічник / ПМ / Помічник ПМ) — лише у свій відділ.
--   • Відділ бачать лише ті, кому начальник дав доступ («Перегляд» або «Редагування»), і адміністратор.
--   • Проєкти створюють ПМ (і начальник). Бачать їх начальник і ПМ відділу; помічники — лише ті, до яких їм надали доступ.
--   • Команди всередині відділу.

-- ---------- 0. Email адміністратора (на сайті вхід за логіном «Admin»; змініть тут, якщо потрібно) ----------
create or replace function public.admin_email() returns text
language sql immutable as $$ select 'admin@cks.local'::text $$;

-- ---------- 1. Доступ до відділу: рівень і «гість» ----------
alter table public.dept_members add column if not exists access text not null default 'edit';
alter table public.dept_members add column if not exists guest boolean not null default false;   -- true = доступ надав начальник (людина з іншого відділу)
alter table public.dept_members drop constraint if exists dept_members_access_chk;
alter table public.dept_members add constraint dept_members_access_chk check (access in ('edit','view'));

-- ---------- 2. Функції прав ----------
-- бачить відділ: адміністратор або учасник (будь-який рівень)
create or replace function public.is_member(d text) returns boolean
language sql security definer stable set search_path=public as $$
  select public.is_admin() or exists(select 1 from public.dept_members where dept_id=d and user_id=auth.uid()) $$;
-- може змінювати дані відділу: адміністратор, начальник відділу або учасник із рівнем «Редагування»
create or replace function public.can_write(d text) returns boolean
language sql security definer stable set search_path=public as $$
  select public.is_admin()
      or exists(select 1 from public.depts where id=d and boss=auth.uid())
      or exists(select 1 from public.dept_members where dept_id=d and user_id=auth.uid() and access='edit') $$;
-- голова відділу: адміністратор або начальник цього відділу
create or replace function public.is_head(d text) returns boolean
language sql security definer stable set search_path=public as $$
  select public.is_admin() or exists(select 1 from public.depts where id=d and boss=auth.uid()) $$;
-- керує відділом: голова або ПМ цього відділу (не гість, з редагуванням)
create or replace function public.is_boss(d text) returns boolean
language sql security definer stable set search_path=public as $$
  select public.is_head(d)
      or exists(select 1 from public.dept_members m join public.profiles pr on pr.id=m.user_id
                where m.dept_id=d and m.user_id=auth.uid() and pr.pos='pm' and not m.guest and m.access='edit') $$;
-- хто може видати запрошення: адміністратор — начальникам (без відділу) і в будь-який відділ; начальник — у свій відділ
create or replace function public.can_invite(d text, p text) returns boolean
language sql security definer stable set search_path=public as $$
  select (public.is_admin() and ((d is null and p='boss') or (d is not null and p in ('pm','apm','asst'))))
      or (d is not null and p in ('pm','apm','asst') and public.is_head(d)) $$;

-- ---------- 3. Дані відділу: читати — учасники, змінювати — лише з рівнем «Редагування» ----------
-- Проєкти: бачать начальник відділу та ПМ; помічники — лише проєкти, до яких ПМ надав доступ (поле acc у проєкті).
-- Задачі проєкту бачать ті, хто бачить проєкт, а також виконавці цієї задачі.
create or replace function public.proj_see(d text, pid text) returns boolean
language sql security definer stable set search_path=public as $$
  select coalesce(pid,'')='' or public.is_boss(d)
      or exists(select 1 from public.docs where id='project:'||pid and dept_id=d and coalesce(data->'acc','[]'::jsonb) ? auth.uid()::text) $$;
create or replace function public.doc_see(d text, k text, x jsonb) returns boolean
language sql security definer stable set search_path=public as $$
  select case
    when k='project' then public.is_boss(d) or coalesce(x->'acc','[]'::jsonb) ? auth.uid()::text
    when k='task' then public.proj_see(d, x->>'project')
         or coalesce(x->'who','[]'::jsonb) ? auth.uid()::text
         or exists(select 1 from jsonb_array_elements(coalesce(x->'subs','[]'::jsonb)) s where coalesce(s->'who','[]'::jsonb) ? auth.uid()::text)
    else true end $$;
create or replace function public.task_see(tid text) returns boolean
language sql security definer stable set search_path=public as $$
  select coalesce((select public.doc_see(dept_id,kind,data) from public.docs where id='task:'||tid), true) $$;

drop policy if exists docs_all on public.docs;
drop policy if exists docs_select on public.docs;
create policy docs_select on public.docs for select to authenticated
  using (public.is_member(dept_id) and public.doc_see(dept_id,kind,data));
drop policy if exists docs_insert on public.docs;
create policy docs_insert on public.docs for insert to authenticated
  with check (public.can_write(dept_id) and (kind<>'project' or public.is_boss(dept_id)) and public.doc_see(dept_id,kind,data));
drop policy if exists docs_update on public.docs;
create policy docs_update on public.docs for update to authenticated
  using (public.can_write(dept_id) and (kind<>'project' or public.is_boss(dept_id)) and public.doc_see(dept_id,kind,data))
  with check (public.can_write(dept_id) and (kind<>'project' or public.is_boss(dept_id)) and public.doc_see(dept_id,kind,data));
drop policy if exists docs_delete on public.docs;
create policy docs_delete on public.docs for delete to authenticated
  using (public.can_write(dept_id) and (kind<>'project' or public.is_boss(dept_id)) and public.doc_see(dept_id,kind,data));

-- Коментарі до задач прихованих проєктів теж приховані
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select to authenticated
  using (public.is_member(dept_id) and public.task_see(task_id)
         and (not is_private or author=auth.uid() or to_ids ? auth.uid()::text or public.is_admin()));

drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated
  with check (public.can_write(dept_id) and author=auth.uid());
drop policy if exists shares_insert on public.shares;
create policy shares_insert on public.shares for insert to authenticated with check (public.can_write(dept_id) and created_by=auth.uid());
drop policy if exists shares_update on public.shares;
create policy shares_update on public.shares for update to authenticated using (public.can_write(dept_id)) with check (public.can_write(dept_id));
drop policy if exists shares_delete on public.shares;
create policy shares_delete on public.shares for delete to authenticated using (public.can_write(dept_id));

-- Учасники відділу: доступ надає й забирає лише начальник відділу (або адміністратор)
drop policy if exists members_insert on public.dept_members;
create policy members_insert on public.dept_members for insert to authenticated with check (public.is_head(dept_id));
drop policy if exists members_update on public.dept_members;
create policy members_update on public.dept_members for update to authenticated
  using (public.is_head(dept_id) and user_id is distinct from (select boss from public.depts where id=dept_id))
  with check (public.is_head(dept_id));
drop policy if exists members_delete on public.dept_members;
create policy members_delete on public.dept_members for delete to authenticated using (
  user_id is distinct from (select boss from public.depts where id=dept_id)
  and (public.is_head(dept_id)
       or (guest and user_id=auth.uid())                                           -- гість може сам вийти
       or (public.is_boss(dept_id) and not guest
           and exists(select 1 from public.profiles where id=user_id and pos in ('apm','asst')))));

-- Список відділів більше не публічний
drop view if exists public.public_depts;

-- ---------- 4. Команди ----------
create table if not exists public.teams(
  id text primary key,
  dept_id text not null references public.depts(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  lead uuid references public.profiles(id) on delete set null,
  color text,
  created_at timestamptz not null default now()
);
create index if not exists teams_dept_idx on public.teams(dept_id);
create table if not exists public.team_members(
  team_id text references public.teams(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key(team_id,user_id)
);
create or replace function public.team_dept(t text) returns text
language sql security definer stable set search_path=public as $$ select dept_id from public.teams where id=t $$;
create or replace function public.can_team(t text) returns boolean
language sql security definer stable set search_path=public as $$
  select public.is_boss(public.team_dept(t)) or exists(select 1 from public.teams where id=t and lead=auth.uid()) $$;

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select to authenticated using (public.is_member(dept_id));
drop policy if exists teams_insert on public.teams;
create policy teams_insert on public.teams for insert to authenticated with check (public.is_boss(dept_id));
drop policy if exists teams_update on public.teams;
create policy teams_update on public.teams for update to authenticated using (public.is_boss(dept_id)) with check (public.is_boss(dept_id));
drop policy if exists teams_delete on public.teams;
create policy teams_delete on public.teams for delete to authenticated using (public.is_boss(dept_id));
drop policy if exists tm_select on public.team_members;
create policy tm_select on public.team_members for select to authenticated using (public.is_member(public.team_dept(team_id)));
drop policy if exists tm_insert on public.team_members;
create policy tm_insert on public.team_members for insert to authenticated
  with check (public.can_team(team_id)
              and exists(select 1 from public.dept_members m where m.dept_id=public.team_dept(team_id) and m.user_id=team_members.user_id));
drop policy if exists tm_delete on public.team_members;
create policy tm_delete on public.team_members for delete to authenticated using (public.can_team(team_id));

-- Хто вибув із відділу — вибуває і з його команд
create or replace function public.handle_member_removed() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  delete from public.team_members where user_id=old.user_id and team_id in (select id from public.teams where dept_id=old.dept_id);
  update public.teams set lead=null where dept_id=old.dept_id and lead=old.user_id;
  return old;
end $$;
drop trigger if exists on_member_removed on public.dept_members;
create trigger on_member_removed after delete on public.dept_members
for each row execute function public.handle_member_removed();

-- ---------- 5. Запрошення (одноразові посилання) ----------
create table if not exists public.invites(
  code text primary key check (code ~ '^[A-Z0-9]{8}$'),
  dept_id text references public.depts(id) on delete cascade,   -- null = начальник, який створить свій відділ
  pos text not null check (pos in ('boss','pm','apm','asst')),
  team_id text references public.teams(id) on delete set null,
  note text check (note is null or char_length(note)<=120),
  max_uses int check (max_uses is null or max_uses>0),
  uses int not null default 0,
  expires_at timestamptz,
  revoked boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists invites_dept_idx on public.invites(dept_id);
alter table public.invites enable row level security;
drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites for select to authenticated
  using (public.is_admin() or (dept_id is not null and public.is_head(dept_id)));
drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites for insert to authenticated
  with check (created_by=auth.uid() and uses=0 and max_uses=1 and public.can_invite(dept_id,pos));
drop policy if exists invites_update on public.invites;
create policy invites_update on public.invites for update to authenticated
  using (public.is_admin() or (dept_id is not null and public.is_head(dept_id)))
  with check (public.can_invite(dept_id,pos));
drop policy if exists invites_delete on public.invites;
create policy invites_delete on public.invites for delete to authenticated
  using (public.is_admin() or (dept_id is not null and public.is_head(dept_id)));

-- Перевірка коду на екрані реєстрації (без акаунта)
create or replace function public.invite_info(p_code text) returns jsonb
language plpgsql security definer stable set search_path=public as $$
declare c text; i public.invites; dn text; bn text; tn text;
begin
  c := upper(regexp_replace(coalesce(p_code,''),'[^A-Za-z0-9]','','g'));
  select * into i from public.invites where code=c;
  if not found then return jsonb_build_object('ok',false,'reason','not_found'); end if;
  if i.revoked then return jsonb_build_object('ok',false,'reason','revoked'); end if;
  if i.expires_at is not null and i.expires_at<now() then return jsonb_build_object('ok',false,'reason','expired'); end if;
  if i.max_uses is not null and i.uses>=i.max_uses then return jsonb_build_object('ok',false,'reason','used'); end if;
  select d.name, p.name into dn, bn from public.depts d left join public.profiles p on p.id=d.boss where d.id=i.dept_id;
  select name into tn from public.teams where id=i.team_id;
  return jsonb_build_object('ok',true,'pos',i.pos,'dept',dn,'boss',bn,'team',tn);
end $$;

-- Чи адміністратор ще не зареєструвався (тоді на сайті з’являється форма реєстрації адміністратора)
drop function if exists public.needs_setup();
create or replace function public.admin_pending() returns boolean
language sql security definer stable set search_path=public as $$ select not exists(select 1 from public.profiles where admin) $$;

grant execute on function public.invite_info(text) to anon, authenticated;
grant execute on function public.admin_pending() to anon, authenticated;

-- ---------- 6. Реєстрація ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare i public.invites; c text; nm text; ph text;
begin
  nm := left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),'Адміністратор'),80);
  ph := nullif(left(regexp_replace(coalesce(new.raw_user_meta_data->>'phone',''),'[^0-9+]','','g'),20),'');
  -- адміністратор: лише email з admin_email()
  if lower(coalesce(new.email,''))=public.admin_email() then
    insert into public.profiles(id,name,pos,admin,phone) values(new.id,nm,'boss',true,ph)
      on conflict (id) do update set admin=true;
    return new;
  end if;
  -- усі інші: лише з дійсним одноразовим запрошенням
  c := upper(regexp_replace(coalesce(new.raw_user_meta_data->>'invite',''),'[^A-Za-z0-9]','','g'));
  select * into i from public.invites where code=c for update;
  if not found or i.revoked or (i.expires_at is not null and i.expires_at<now())
     or (i.max_uses is not null and i.uses>=i.max_uses) then
    raise exception 'INVITE_INVALID';
  end if;
  update public.invites set uses=uses+1 where code=c;
  insert into public.profiles(id,name,pos,admin,phone) values(new.id,nm,i.pos,false,ph);
  if i.dept_id is not null then
    insert into public.dept_members(dept_id,user_id,access,guest) values(i.dept_id,new.id,'edit',false) on conflict do nothing;
    if i.team_id is not null and exists(select 1 from public.teams where id=i.team_id and dept_id=i.dept_id) then
      insert into public.team_members(team_id,user_id) values(i.team_id,new.id) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Вбудований (тимчасовий) акаунт адміністратора: логін Admin, пароль admin123.
-- На сайті достатньо ввести «Admin» замість email. ОБОВ’ЯЗКОВО змініть пароль перед реальною роботою (профіль → новий пароль).
do $$
declare uid uuid := gen_random_uuid();
begin
  perform set_config('search_path','public,extensions',true);
  if not exists(select 1 from auth.users where lower(email)=public.admin_email()) then
    insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,
      created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values('00000000-0000-0000-0000-000000000000',uid,'authenticated','authenticated',public.admin_email(),
      crypt('admin123',gen_salt('bf',10)),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{"name":"Адміністратор"}'::jsonb,
      now(),now(),'','','','');
    insert into auth.identities(id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values(gen_random_uuid(),uid,uid::text,jsonb_build_object('sub',uid::text,'email',public.admin_email(),'email_verified',true),'email',now(),now(),now());
  end if;
end $$;

-- Адміністратор — лише один: акаунт з admin_email() (якщо він уже є). У всіх інших ознаку admin знято.
update public.profiles p set admin = exists(select 1 from auth.users u where u.id=p.id and lower(u.email)=public.admin_email())
 where p.admin is distinct from exists(select 1 from auth.users u where u.id=p.id and lower(u.email)=public.admin_email());

-- Відділ створює лише начальник
drop policy if exists depts_insert on public.depts;
create policy depts_insert on public.depts for insert to authenticated
  with check (boss=auth.uid() and exists(select 1 from public.profiles where id=auth.uid() and (pos='boss' or admin)));

-- ---------- 7. Посади, передача відділу, видалення ----------
create or replace function public.set_member_pos(p_user uuid, p_pos text) returns void
language plpgsql security definer set search_path=public as $$
declare cur text;
begin
  if p_pos not in ('boss','pm','apm','asst') then raise exception 'Невідома посада'; end if;
  select pos into cur from public.profiles where id=p_user;
  if cur is null then raise exception 'Користувача не знайдено'; end if;
  if not public.is_admin() then
    if p_user=auth.uid() then raise exception 'Свою посаду змінити не можна'; end if;
    if p_pos='boss' or cur='boss' then raise exception 'Посаду «Начальник» змінює лише адміністратор'; end if;
    if not exists(select 1 from public.dept_members m where m.user_id=p_user and not m.guest and public.is_head(m.dept_id)) then
      raise exception 'Посаду змінює начальник відділу, у якому працює співробітник';
    end if;
  end if;
  update public.profiles set pos=p_pos where id=p_user;
end $$;
grant execute on function public.set_member_pos(uuid,text) to authenticated;

create or replace function public.transfer_dept(p_dept text, p_user uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_head(p_dept) then raise exception 'Передати відділ може лише його начальник або адміністратор'; end if;
  if not exists(select 1 from public.dept_members where dept_id=p_dept and user_id=p_user) then
    raise exception 'Новий начальник має бути учасником відділу';
  end if;
  update public.profiles set pos='boss' where id=p_user and pos<>'boss';
  update public.dept_members set access='edit', guest=false where dept_id=p_dept and user_id=p_user;
  update public.depts set boss=p_user where id=p_dept;
end $$;
grant execute on function public.transfer_dept(text,uuid) to authenticated;

create or replace function public.guard_dept_boss() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.boss is distinct from old.boss and auth.uid() is not null
     and not (public.is_admin() or old.boss=auth.uid()) then
    raise exception 'Змінити начальника відділу може лише поточний начальник або адміністратор';
  end if;
  if new.boss is not null and new.boss is distinct from old.boss then
    insert into public.dept_members(dept_id,user_id) values(new.id,new.boss) on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists on_dept_boss on public.depts;
create trigger on_dept_boss before update on public.depts
for each row execute function public.guard_dept_boss();

drop policy if exists depts_update on public.depts;
create policy depts_update on public.depts for update to authenticated using (public.is_boss(id)) with check (public.is_boss(id));
drop policy if exists depts_delete on public.depts;
create policy depts_delete on public.depts for delete to authenticated using (public.is_head(id));

-- ---------- 8. Оновлення в реальному часі ----------
do $$ begin
  begin alter publication supabase_realtime add table public.teams; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.team_members; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.invites; exception when duplicate_object then null; end;
end $$;
