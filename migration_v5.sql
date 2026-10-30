-- ЦКС — Робочий офіс: ОНОВЛЕННЯ бази №5 — реєстрація за запрошенням, відділи, команди
-- Якщо базу вже створювали раніше — виконайте цей файл один раз (після migration_v4.sql):
-- Supabase → SQL Editor → New query → вставити → Run.
-- (Для нової бази він уже включений у schema.sql.)
--
-- Що змінюється:
--   • Зареєструватися можна лише з кодом запрошення (крім найпершого користувача — він стає адміністратором).
--     Посаду й відділ визначає запрошення, а не сам користувач.
--   • Список відділів більше не видно анонімним відвідувачам.
--   • Команди всередині відділу (назва, керівник, учасники).
--   • Посади змінюють лише начальник відділу / адміністратор; відділ видаляє лише його начальник.

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
