-- Demo admin + customer accounts, a sample store, and grocery catalog.
-- Run in the Supabase SQL editor:
--   select public.seed_demo_accounts();
--
-- Admin: admin@example.com / Password123!
-- User:  user@example.com / Password123!

create or replace function public.ensure_seed_auth_user(
  p_email text,
  p_password text,
  p_name text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_id uuid;
  v_identity jsonb;
begin
  select id into v_id from auth.users where email = lower(p_email);

  if v_id is not null then
    update auth.users
    set
      encrypted_password = crypt(p_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', p_name),
      updated_at = now()
    where id = v_id;

    insert into public.profiles (id, full_name, email)
    values (v_id, p_name, lower(p_email))
    on conflict (id) do update
      set full_name = excluded.full_name,
          email = excluded.email;

    return v_id;
  end if;

  v_id := gen_random_uuid();
  v_identity := jsonb_build_object('sub', v_id::text, 'email', lower(p_email), 'email_verified', true);

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_id,
    'authenticated',
    'authenticated',
    lower(p_email),
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'identities'
      and column_name = 'provider_id'
  ) then
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_id, v_identity, 'email', v_id::text, now(), now(), now()
    );
  else
    insert into auth.identities (
      id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      v_id::text, v_id, v_identity, 'email', now(), now(), now()
    );
  end if;

  return v_id;
end;
$$;

create or replace function public.seed_demo_accounts()
returns table(role text, email text, password text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_admin uuid;
  v_user uuid;
begin
  v_admin := public.ensure_seed_auth_user('admin@example.com', 'Password123!', 'Demo Admin');
  v_user := public.ensure_seed_auth_user('user@example.com', 'Password123!', 'Demo Customer');

  select id into v_org
  from public.organizations
  where slug = 'demo-store' and deleted_at is null;

  if v_org is null then
    insert into public.organizations (name, slug, email, phone, address)
    values ('Demo Store', 'demo-store', 'admin@example.com', '09171234567', 'Sample grocery, Metro Manila')
    returning id into v_org;

    insert into public.business_settings (organization_id) values (v_org);
    insert into public.order_counters (organization_id, last_number) values (v_org, 10000);
    insert into public.payment_methods (organization_id, name, sort_order)
    values
      (v_org, 'Cash', 1),
      (v_org, 'GCash', 2),
      (v_org, 'Bank Transfer', 3),
      (v_org, 'Other', 4);
  end if;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_org, v_admin, 'admin', 'active')
  on conflict (organization_id, user_id) do update
    set role = 'admin', status = 'active';

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_org, v_user, 'customer', 'active')
  on conflict (organization_id, user_id) do update
    set role = 'customer', status = 'active';

  insert into public.customers (organization_id, user_id, full_name, email, phone, status)
  values (v_org, v_user, 'Demo Customer', 'user@example.com', '09179876543', 'active')
  on conflict do nothing;

  if not exists (
    select 1 from public.customers
    where organization_id = v_org and user_id = v_user
  ) then
    insert into public.customers (organization_id, user_id, full_name, email, phone, status)
    values (v_org, v_user, 'Demo Customer', 'user@example.com', '09179876543', 'active');
  end if;

  perform public.seed_demo_catalog(v_org);

  return query
  select * from (values
    ('admin', 'admin@example.com', 'Password123!'),
    ('user', 'user@example.com', 'Password123!')
  ) as accounts(role, email, password);
end;
$$;

revoke all on function public.ensure_seed_auth_user(text, text, text) from public, anon, authenticated;
revoke all on function public.seed_demo_accounts() from public, anon, authenticated;
grant execute on function public.seed_demo_accounts() to service_role;
