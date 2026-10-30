-- ЦКС — Робочий офіс: схема бази даних для Supabase
-- Виконайте весь файл один раз: Supabase → SQL Editor → New query → вставити → Run.

-- 1. Таблиці
create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  pos text not null check (pos in ('boss','asst','pm','apm')),
  admin boolean not null default false,
  created_at timestamptz default now()
);
create table if not exists public.depts(
  id text primary key,
  name text not null,
  boss uuid references public.profiles(id),
  created_at timestamptz default now()
);
create table if not exists public.dept_members(
  dept_id text references public.depts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key(dept_id,user_id)
);
-- усі дані відділу: kind = 'meta' (сторінки, стовпці, категорії), 'task' (задача), 'project' (проєкт)
create table if not exists public.docs(
  id text primary key,
  dept_id text not null references public.depts(id) on delete cascade,
  kind text not null,
  data jsonb not null,
  updated_at timestamptz default now()
);
create index if not exists docs_dept_idx on public.docs(dept_id);

-- 2. Допоміжні функції прав
create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path=public as $$
  select coalesce((select admin from public.profiles where id=auth.uid()),false) $$;
create or replace function public.is_member(d text) returns boolean
language sql security definer stable set search_path=public as $$
  select public.is_admin() or exists(select 1 from public.dept_members where dept_id=d and user_id=auth.uid()) $$;
create or replace function public.is_boss(d text) returns boolean
language sql security definer stable set search_path=public as $$
  select public.is_admin()
      or exists(select 1 from public.depts where id=d and boss=auth.uid())
      or exists(select 1 from public.dept_members m join public.profiles pr on pr.id=m.user_id
                where m.dept_id=d and m.user_id=auth.uid() and pr.pos='pm') $$;

-- 3. Автоматичне створення профілю при реєстрації
--    Перший зареєстрований користувач отримує повний доступ (admin).
--    Помічник, який обрав відділ при реєстрації, одразу додається до нього.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare first_user boolean; d text; p text;
begin
  select not exists(select 1 from public.profiles) into first_user;
  p := case when new.raw_user_meta_data->>'pos' in ('asst','pm','apm') then new.raw_user_meta_data->>'pos' else 'boss' end;
  insert into public.profiles(id,name,pos,admin)
  values(new.id, coalesce(nullif(new.raw_user_meta_data->>'name',''),'Без імені'), p, first_user);
  d := new.raw_user_meta_data->>'dept';
  if p<>'boss' and d is not null and d<>'' and exists(select 1 from public.depts where id=d) then
    insert into public.dept_members(dept_id,user_id) values(d,new.id);
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Автор відділу автоматично стає його учасником
create or replace function public.handle_new_dept() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.boss is not null then
    insert into public.dept_members(dept_id,user_id) values(new.id,new.boss) on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists on_dept_created on public.depts;
create trigger on_dept_created after insert on public.depts
for each row execute function public.handle_new_dept();

-- 4. Права доступу (Row Level Security)
alter table public.profiles enable row level security;
alter table public.depts enable row level security;
alter table public.dept_members enable row level security;
alter table public.docs enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);

drop policy if exists depts_select on public.depts;
create policy depts_select on public.depts for select to authenticated using (public.is_member(id));
drop policy if exists depts_insert on public.depts;
create policy depts_insert on public.depts for insert to authenticated
  with check (boss=auth.uid() and exists(select 1 from public.profiles where id=auth.uid() and (pos='boss' or admin)));
drop policy if exists depts_update on public.depts;
create policy depts_update on public.depts for update to authenticated using (public.is_boss(id)) with check (public.is_boss(id));
drop policy if exists depts_delete on public.depts;
create policy depts_delete on public.depts for delete to authenticated using (public.is_boss(id));

drop policy if exists members_select on public.dept_members;
create policy members_select on public.dept_members for select to authenticated using (public.is_member(dept_id));
drop policy if exists members_insert on public.dept_members;
create policy members_insert on public.dept_members for insert to authenticated with check (public.is_boss(dept_id));
drop policy if exists members_delete on public.dept_members;
create policy members_delete on public.dept_members for delete to authenticated using (public.is_boss(dept_id));

drop policy if exists docs_all on public.docs;
create policy docs_all on public.docs for all to authenticated
  using (public.is_member(dept_id)) with check (public.is_member(dept_id));

-- 5. Список відділів для екрана реєстрації (бачать усі, тільки назва відділу й ім'я начальника)
create or replace view public.public_depts as
  select d.id, d.name, p.name as boss_name from public.depts d left join public.profiles p on p.id=d.boss;
grant select on public.public_depts to anon, authenticated;

-- 6. Сховище файлів (фото об'єктів, вкладення)
insert into storage.buckets(id,name,public) values('files','files',true) on conflict (id) do nothing;
drop policy if exists files_upload on storage.objects;
create policy files_upload on storage.objects for insert to authenticated with check (bucket_id='files');

-- 7. Оновлення в реальному часі (змінює відразу в усіх, хто відкрив сайт)
do $$ begin
  begin alter publication supabase_realtime add table public.docs; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.dept_members; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.depts; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.profiles; exception when duplicate_object then null; end;
end $$;

-- ========== 8. Коментарі та доступ за посиланням (те саме, що migration_v3.sql) ==========

-- 1. Коментарі (можуть бути адресовані конкретному співробітнику; можна зробити приватними)
create table if not exists public.comments(
  id text primary key,
  dept_id text not null references public.depts(id) on delete cascade,
  task_id text not null,
  author uuid references public.profiles(id) on delete set null,
  author_name text not null,
  to_ids jsonb not null default '[]'::jsonb,
  to_names jsonb not null default '[]'::jsonb,
  body text not null check (char_length(body) between 1 and 4000),
  is_private boolean not null default false,
  guest boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists comments_task_idx on public.comments(task_id);
alter table public.comments enable row level security;
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select to authenticated
  using (public.is_member(dept_id) and (not is_private or author=auth.uid() or to_ids ? auth.uid()::text or public.is_admin()));
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated
  with check (public.is_member(dept_id) and author=auth.uid());
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete to authenticated
  using (author=auth.uid() or public.is_boss(dept_id));

-- 2. Посилання доступу до задачі (перегляд / коментування / редагування)
create table if not exists public.shares(
  token text primary key,
  dept_id text not null references public.depts(id) on delete cascade,
  task_id text not null,
  role text not null check (role in ('view','comment','edit')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked boolean not null default false
);
create index if not exists shares_task_idx on public.shares(task_id);
alter table public.shares enable row level security;
drop policy if exists shares_select on public.shares;
create policy shares_select on public.shares for select to authenticated using (public.is_member(dept_id));
drop policy if exists shares_insert on public.shares;
create policy shares_insert on public.shares for insert to authenticated with check (public.is_member(dept_id) and created_by=auth.uid());
drop policy if exists shares_update on public.shares;
create policy shares_update on public.shares for update to authenticated using (public.is_member(dept_id)) with check (public.is_member(dept_id));
drop policy if exists shares_delete on public.shares;
create policy shares_delete on public.shares for delete to authenticated using (public.is_member(dept_id));

-- 3. Функції для тих, хто відкриває посилання БЕЗ акаунта (бачать лише одну задачу за токеном)
create or replace function public.shared_get(p_token text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare s public.shares; t jsonb; meta jsonb; proj jsonb; users jsonb; cm jsonb; dname text; catn text;
begin
  select * into s from public.shares where token=p_token and not revoked and (expires_at is null or expires_at>now());
  if not found then return null; end if;
  select data into t from public.docs where id='task:'||s.task_id and dept_id=s.dept_id;
  if t is null then return null; end if;
  select data into meta from public.docs where id='meta:'||s.dept_id;
  select data into proj from public.docs where id='project:'||coalesce(t->>'project','');
  select name into dname from public.depts where id=s.dept_id;
  select c->>'name' into catn from jsonb_array_elements(coalesce(meta->'cats','[]'::jsonb)) c where c->>'id'=t->>'cat' limit 1;
  select coalesce(jsonb_object_agg(p.id::text,p.name),'{}'::jsonb) into users from public.profiles p where p.id::text in (
    select jsonb_array_elements_text(coalesce(t->'who','[]'::jsonb))
    union
    select jsonb_array_elements_text(coalesce(sb->'who','[]'::jsonb)) from jsonb_array_elements(coalesce(t->'subs','[]'::jsonb)) sb);
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'by',c.author_name,'to','[]'::jsonb,'text',c.body,'guest',c.guest,
         'ts',(extract(epoch from c.created_at)*1000)::bigint) order by c.created_at),'[]'::jsonb) into cm
    from public.comments c where c.task_id=s.task_id and c.dept_id=s.dept_id and jsonb_array_length(c.to_ids)=0 and not c.is_private;
  return jsonb_build_object('role',s.role,'dept',dname,'task',t,'project',proj->>'name','cat',catn,'users',users,'comments',cm);
end $$;

create or replace function public.shared_comment(p_token text,p_name text,p_text text) returns boolean
language plpgsql security definer set search_path=public as $$
declare s public.shares;
begin
  select * into s from public.shares where token=p_token and not revoked and (expires_at is null or expires_at>now());
  if not found or s.role not in ('comment','edit') then return false; end if;
  if p_text is null or char_length(trim(p_text))=0 then return false; end if;
  insert into public.comments(id,dept_id,task_id,author,author_name,body,guest)
  values(replace(gen_random_uuid()::text,'-',''), s.dept_id, s.task_id, null,
         coalesce(nullif(left(trim(p_name),60),''),'Гість'), left(trim(p_text),4000), true);
  return true;
end $$;

create or replace function public.shared_update(p_token text,p_patch jsonb) returns boolean
language plpgsql security definer set search_path=public as $$
declare s public.shares; clean jsonb;
begin
  select * into s from public.shares where token=p_token and not revoked and (expires_at is null or expires_at>now());
  if not found or s.role<>'edit' then return false; end if;
  select coalesce(jsonb_object_agg(e.k,e.v),'{}'::jsonb) into clean from jsonb_each(p_patch) as e(k,v)
    where e.k in ('title','status','start','end','subs','doneAt','auto');
  update public.docs set data=data||clean, updated_at=now() where id='task:'||s.task_id and dept_id=s.dept_id;
  return true;
end $$;

grant execute on function public.shared_get(text) to anon, authenticated;
grant execute on function public.shared_comment(text,text,text) to anon, authenticated;
grant execute on function public.shared_update(text,jsonb) to anon, authenticated;

-- 4. Коментарі приходять колегам миттєво
do $$ begin
  begin alter publication supabase_realtime add table public.comments; exception when duplicate_object then null; end;
end $$;

-- ========== 9. Профіль користувача (те саме, що migration_v4.sql) ==========

alter table public.profiles add column if not exists avatar text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists about text;

-- Кожен може змінювати лише власний профіль і лише ці поля
-- (посаду та ознаку admin змінити через сайт не можна).
revoke update on public.profiles from authenticated;
grant update(name, avatar, phone, about) on public.profiles to authenticated;
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ========== 10. Реєстрація за запрошенням, відділи, команди (те саме, що migration_v5.sql) ==========
-- ---------- 1. Допоміжні функції ----------
-- «Голова» відділу: адміністратор, начальник відділу або учасник із посадою «Начальник»
create or replace function public.is_head(d text) returns boolean
language sql security definer stable set search_path=public as $$
  select public.is_admin()
      or exists(select 1 from public.depts where id=d and boss=auth.uid())
      or exists(select 1 from public.dept_members m join public.profiles pr on pr.id=m.user_id
                where m.dept_id=d and m.user_id=auth.uid() and pr.pos='boss') $$;

-- Чи може поточний користувач видати запрошення на посаду p у відділ d
create or replace function public.can_invite(d text, p text) returns boolean
language sql security definer stable set search_path=public as $$
  select public.is_admin()
      or (d is not null and p in ('pm','apm','asst') and public.is_head(d))
      or (d is not null and p in ('apm','asst') and public.is_boss(d)) $$;

-- ---------- 2. Команди ----------
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

-- ---------- 3. Запрошення ----------
create table if not exists public.invites(
  code text primary key check (code ~ '^[A-Z0-9]{8}$'),
  dept_id text references public.depts(id) on delete cascade,   -- null = начальник нового відділу (видає лише адміністратор)
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
  using (public.is_admin() or (dept_id is not null and public.is_boss(dept_id)));
drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites for insert to authenticated
  with check (created_by=auth.uid() and uses=0 and public.can_invite(dept_id,pos));
drop policy if exists invites_update on public.invites;
create policy invites_update on public.invites for update to authenticated
  using (public.is_admin() or (dept_id is not null and public.is_boss(dept_id)))
  with check (public.can_invite(dept_id,pos));
drop policy if exists invites_delete on public.invites;
create policy invites_delete on public.invites for delete to authenticated
  using (public.is_admin() or (dept_id is not null and public.is_boss(dept_id)));

-- Перевірка коду на екрані реєстрації (без акаунта). Повертає лише назву відділу, посаду, команду.
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
  return jsonb_build_object('ok',true,'pos',i.pos,'dept',dn,'boss',bn,'team',tn,'note',i.note);
end $$;

-- Чи це перший запуск (у базі ще немає жодного користувача)
create or replace function public.needs_setup() returns boolean
language sql security definer stable set search_path=public as $$ select not exists(select 1 from public.profiles) $$;

grant execute on function public.invite_info(text) to anon, authenticated;
grant execute on function public.needs_setup() to anon, authenticated;

-- ---------- 4. Реєстрація: лише за запрошенням ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare first_user boolean; i public.invites; c text; nm text; ph text;
begin
  perform pg_advisory_xact_lock(724501);                       -- двоє не стануть «першим» одночасно
  select not exists(select 1 from public.profiles) into first_user;
  nm := left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),'Без імені'),80);
  ph := nullif(left(regexp_replace(coalesce(new.raw_user_meta_data->>'phone',''),'[^0-9+]','','g'),20),'');
  if first_user then
    insert into public.profiles(id,name,pos,admin,phone) values(new.id,nm,'boss',true,ph);
    return new;
  end if;
  c := upper(regexp_replace(coalesce(new.raw_user_meta_data->>'invite',''),'[^A-Za-z0-9]','','g'));
  select * into i from public.invites where code=c for update;
  if not found or i.revoked or (i.expires_at is not null and i.expires_at<now())
     or (i.max_uses is not null and i.uses>=i.max_uses) then
    raise exception 'INVITE_INVALID';
  end if;
  update public.invites set uses=uses+1 where code=c;
  insert into public.profiles(id,name,pos,admin,phone) values(new.id,nm,i.pos,false,ph);
  if i.dept_id is not null then
    insert into public.dept_members(dept_id,user_id) values(i.dept_id,new.id) on conflict do nothing;
    if i.pos='boss' then update public.depts set boss=new.id where id=i.dept_id and boss is null; end if;
    if i.team_id is not null and exists(select 1 from public.teams where id=i.team_id and dept_id=i.dept_id) then
      insert into public.team_members(team_id,user_id) values(i.team_id,new.id) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Список відділів більше не публічний (раніше його бачив будь-хто на екрані реєстрації)
revoke select on public.public_depts from anon;

-- ---------- 5. Відділи: посади, начальник, видалення ----------
-- Змінити посаду співробітника: адміністратор — будь-яку; начальник відділу — лише ПМ / помічників свого відділу
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
    if not exists(select 1 from public.dept_members m where m.user_id=p_user and public.is_head(m.dept_id)) then
      raise exception 'Немає прав змінювати посаду цього співробітника';
    end if;
  end if;
  update public.profiles set pos=p_pos where id=p_user;
end $$;
grant execute on function public.set_member_pos(uuid,text) to authenticated;

-- Передати відділ іншому начальнику (поточний начальник або адміністратор)
create or replace function public.transfer_dept(p_dept text, p_user uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not (public.is_admin() or exists(select 1 from public.depts where id=p_dept and boss=auth.uid())) then
    raise exception 'Передати відділ може лише його начальник або адміністратор';
  end if;
  if not exists(select 1 from public.dept_members where dept_id=p_dept and user_id=p_user) then
    raise exception 'Новий начальник має бути учасником відділу';
  end if;
  update public.profiles set pos='boss' where id=p_user and pos<>'boss';
  update public.depts set boss=p_user where id=p_dept;
end $$;
grant execute on function public.transfer_dept(text,uuid) to authenticated;

-- Начальника відділу через звичайне оновлення змінити не можна (лише transfer_dept)
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

-- Видаляє відділ лише його начальник або адміністратор (раніше — і проєктний менеджер)
drop policy if exists depts_delete on public.depts;
create policy depts_delete on public.depts for delete to authenticated using (public.is_admin() or boss=auth.uid());

-- Прибрати з відділу: не можна прибрати начальника відділу; ПМ прибирає лише помічників
drop policy if exists members_delete on public.dept_members;
create policy members_delete on public.dept_members for delete to authenticated using (
  public.is_admin()
  or (public.is_boss(dept_id)
      and user_id is distinct from (select boss from public.depts where id=dept_id)
      and (public.is_head(dept_id) or not exists(select 1 from public.profiles where id=user_id and pos in ('boss','pm')))));

-- ---------- 6. Оновлення в реальному часі ----------
do $$ begin
  begin alter publication supabase_realtime add table public.teams; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.team_members; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.invites; exception when duplicate_object then null; end;
end $$;
