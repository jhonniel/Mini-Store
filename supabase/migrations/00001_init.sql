-- StockFlow multi-tenant schema, RLS, and business functions.
-- Apply in the Supabase SQL editor or via the Supabase CLI.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.app_role as enum ('admin', 'staff', 'customer');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.member_status as enum ('active', 'invited', 'suspended');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.product_status as enum ('active', 'draft', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.order_status as enum (
    'draft', 'pending', 'confirmed', 'processing', 'ready', 'completed', 'cancelled', 'returned'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_status as enum ('unpaid', 'partially_paid', 'paid', 'overdue');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.inventory_movement_type as enum (
    'initial', 'added', 'sale', 'return', 'adjustment', 'damage', 'expired', 'manual', 'cancelled_restore'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_type as enum (
    'low_stock', 'out_of_stock', 'new_order', 'payment_received', 'receipt_confirmed',
    'overdue_balance', 'order_created', 'order_confirmed', 'order_ready',
    'payment_recorded', 'balance_updated'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.subscription_status as enum ('trial', 'active', 'past_due', 'cancelled');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  email text,
  phone text,
  address text,
  currency text not null default 'PHP',
  timezone text not null default 'Asia/Manila',
  subscription_status public.subscription_status not null default 'trial',
  subscription_plan text not null default 'starter',
  trial_ends_at timestamptz default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null default 'customer',
  permissions jsonb not null default '{}'::jsonb,
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.business_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  allow_pay_later boolean not null default true,
  allow_negative_stock boolean not null default false,
  default_min_stock numeric(12,3) not null default 5,
  require_customer_confirmation boolean not null default true,
  default_order_status public.order_status not null default 'pending',
  payment_terms_days integer not null default 7,
  allow_customer_self_checkout boolean not null default true,
  low_stock_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, slug)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  sku text,
  barcode text,
  description text,
  image_url text,
  unit text not null default 'piece',
  cost_price numeric(12,2) not null default 0 check (cost_price >= 0),
  selling_price numeric(12,2) not null default 0 check (selling_price >= 0),
  current_stock numeric(12,3) not null default 0,
  min_stock numeric(12,3) not null default 0 check (min_stock >= 0),
  max_stock numeric(12,3),
  status public.product_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists products_org_sku_uidx
  on public.products (organization_id, sku)
  where sku is not null and deleted_at is null;

create unique index if not exists products_org_barcode_uidx
  on public.products (organization_id, barcode)
  where barcode is not null and deleted_at is null;

create index if not exists products_org_name_idx
  on public.products (organization_id, name);

create index if not exists products_org_status_idx
  on public.products (organization_id, status)
  where deleted_at is null;

create table if not exists public.product_price_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  cost_price numeric(12,2) not null,
  selling_price numeric(12,2) not null,
  changed_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  type public.inventory_movement_type not null,
  quantity numeric(12,3) not null,
  quantity_before numeric(12,3) not null,
  quantity_after numeric(12,3) not null,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists inventory_movements_product_idx
  on public.inventory_movements (product_id, created_at desc);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  address text,
  status text not null default 'active' check (status in ('active', 'inactive', 'blocked')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists customers_org_email_uidx
  on public.customers (organization_id, email)
  where email is not null and deleted_at is null;

create unique index if not exists customers_org_user_uidx
  on public.customers (organization_id, user_id)
  where user_id is not null and deleted_at is null;

create table if not exists public.order_counters (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  last_number integer not null default 10000
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id),
  order_number text not null,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'unpaid',
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  balance numeric(12,2) not null default 0,
  due_date date,
  notes text,
  payment_type text not null default 'pay_later' check (payment_type in ('full', 'partial', 'pay_later')),
  inventory_applied boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  completed_at timestamptz,
  unique (organization_id, order_number)
);

create index if not exists orders_org_created_idx
  on public.orders (organization_id, created_at desc);

create index if not exists orders_customer_idx
  on public.orders (customer_id, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  sku text,
  quantity numeric(12,3) not null check (quantity > 0),
  unit text not null default 'piece',
  unit_cost_at_sale numeric(12,2) not null,
  unit_price_at_sale numeric(12,2) not null,
  subtotal numeric(12,2) not null,
  profit numeric(12,2) not null,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  customer_id uuid not null references public.customers (id),
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null default 'cash',
  reference_number text,
  notes text,
  recorded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists payments_org_created_idx
  on public.payments (organization_id, created_at desc);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity numeric(12,3) not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, organization_id, product_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  message text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_org_idx
  on public.audit_logs (organization_id, created_at desc);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text,
  role public.app_role not null,
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_organizations_updated on public.organizations;
create trigger trg_organizations_updated before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_members_updated on public.organization_members;
create trigger trg_members_updated before update on public.organization_members
for each row execute function public.set_updated_at();

drop trigger if exists trg_settings_updated on public.business_settings;
create trigger trg_settings_updated before update on public.business_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_categories_updated on public.categories;
create trigger trg_categories_updated before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_customers_updated on public.customers;
create trigger trg_customers_updated before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_order_items_updated on public.order_items;
create trigger trg_order_items_updated before update on public.order_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_cart_updated on public.cart_items;
create trigger trg_cart_updated before update on public.cart_items
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth profile
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_member_of(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.has_org_role(org_id uuid, roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and status = 'active'
      and role = any (roles)
  );
$$;

create or replace function public.has_permission(org_id uuid, permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and status = 'active'
      and (
        role = 'admin'
        or (
          role = 'staff'
          and coalesce((permissions ->> permission)::boolean, false)
        )
      )
  );
$$;

create or replace function public.customer_id_for(org_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.customers
  where organization_id = org_id
    and user_id = auth.uid()
    and deleted_at is null
  limit 1;
$$;

grant execute on function public.is_member_of(uuid) to anon, authenticated;
grant execute on function public.has_org_role(uuid, public.app_role[]) to authenticated;
grant execute on function public.has_permission(uuid, text) to authenticated;
grant execute on function public.customer_id_for(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Stock protection + price history + low stock alerts
-- ---------------------------------------------------------------------------

create or replace function public.protect_product_stock()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.current_stock is distinct from old.current_stock then
    if current_setting('app.allow_stock_update', true) is distinct from 'true' then
      raise exception 'Stock can only be changed through inventory movements.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_product_stock on public.products;
create trigger trg_protect_product_stock
  before update on public.products
  for each row execute function public.protect_product_stock();

create or replace function public.record_price_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     or new.cost_price is distinct from old.cost_price
     or new.selling_price is distinct from old.selling_price then
    insert into public.product_price_history (
      organization_id, product_id, cost_price, selling_price, changed_by
    ) values (
      new.organization_id, new.id, new.cost_price, new.selling_price, auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_product_price_history on public.products;
create trigger trg_product_price_history
  after insert or update of cost_price, selling_price on public.products
  for each row execute function public.record_price_history();

create or replace function public.notify_org_staff(
  p_org uuid,
  p_type public.notification_type,
  p_title text,
  p_message text,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (organization_id, user_id, type, title, message, data)
  select p_org, user_id, p_type, p_title, p_message, p_data
  from public.organization_members
  where organization_id = p_org
    and status = 'active'
    and role in ('admin', 'staff');
end;
$$;

create or replace function public.maybe_notify_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled boolean;
begin
  if tg_op = 'UPDATE' and new.current_stock is not distinct from old.current_stock then
    return new;
  end if;

  select low_stock_notifications into v_enabled
  from public.business_settings
  where organization_id = new.organization_id;

  if coalesce(v_enabled, true) is false then
    return new;
  end if;

  if new.current_stock <= 0 then
    perform public.notify_org_staff(
      new.organization_id,
      'out_of_stock',
      'Out of stock',
      new.name || ' is out of stock.',
      jsonb_build_object('product_id', new.id)
    );
  elsif new.current_stock <= new.min_stock then
    perform public.notify_org_staff(
      new.organization_id,
      'low_stock',
      'Low stock',
      new.name || ' is running low (' || trim(to_char(new.current_stock, 'FM999999990.999')) || ' left).',
      jsonb_build_object('product_id', new.id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_product_stock_notify on public.products;
create trigger trg_product_stock_notify
  after insert or update of current_stock on public.products
  for each row execute function public.maybe_notify_stock();
