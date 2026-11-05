-- ЦКС — перевірка й виправлення входу тестових акаунтів (@cks.test)
-- Supabase → SQL Editor → New query → вставити → Run. Унизу з’явиться таблиця-діагностика.
-- Скрипт: скидає паролі на ті, що в seed_test.sql, підтверджує email, додає відсутні записи identities.
-- Якщо таблиця порожня — тестових акаунтів у базі немає: спершу виконайте seed_test.sql.

set search_path = public, extensions;   -- crypt()/gen_salt() бувають у схемі extensions або public

do $$
declare u record; n int := 0;
begin
  for u in select * from (values
    ('nachalnyk@cks.test','Cks-cqVGUG68'),('pm1@cks.test','Cks-43Zh3M84'),('pm2@cks.test','Cks-HKgE7a63'),
    ('apm1@cks.test','Cks-9Tf9vb13'),('apm2@cks.test','Cks-AdsxHM65'),('apm3@cks.test','Cks-XQynNH73'),('apm4@cks.test','Cks-cAMhgB17')
  ) as x(email,pw) loop
    update auth.users set
      encrypted_password = crypt(u.pw, gen_salt('bf',10)),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      aud = 'authenticated', role = 'authenticated',
      confirmation_token = coalesce(confirmation_token,''), recovery_token = coalesce(recovery_token,''),
      email_change = coalesce(email_change,''), email_change_token_new = coalesce(email_change_token_new,''),
      updated_at = now()
    where lower(email) = u.email;
    if found then n := n + 1; end if;
    insert into auth.identities(id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    select gen_random_uuid(), a.id, a.id::text, jsonb_build_object('sub',a.id::text,'email',a.email,'email_verified',true), 'email', now(), now(), now()
    from auth.users a where lower(a.email) = u.email
      and not exists(select 1 from auth.identities i where i.user_id = a.id and i.provider = 'email');
  end loop;
  raise notice 'Оновлено акаунтів: %', n;
end $$;

-- Діагностика: усі стовпці мають бути true, profile — заповнений
select u.email,
       u.email_confirmed_at is not null                              as email_confirmed,
       u.encrypted_password like '$2%'                               as bcrypt_hash,
       exists(select 1 from auth.identities i where i.user_id=u.id)  as has_identity,
       p.name as profile, p.pos,
       exists(select 1 from public.dept_members m where m.user_id=u.id) as in_dept
from auth.users u left join public.profiles p on p.id=u.id
where u.email like '%@cks.test'
order by u.email;
