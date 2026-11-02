-- ЦКС — Робочий офіс: ОНОВЛЕННЯ бази №4 — профіль користувача (фото, телефон, «про себе»)
-- Якщо базу вже створювали раніше — виконайте цей файл один раз:
-- Supabase → SQL Editor → New query → вставити → Run.
-- (Для нової бази він уже включений у schema.sql.)

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
