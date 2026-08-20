-- Row Level Security. Tenant isolation is enforced here — never skip this file.

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.business_settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_price_history enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.customers enable row level security;
alter table public.order_counters enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.payment_methods enable row level security;
alter table public.cart_items enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.invites enable row level security;

-- Profiles
drop policy if exists "profiles_select_own_or_member" on public.profiles;
create policy "profiles_select_own_or_member"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.organization_members mine
      join public.organization_members theirs
        on mine.organization_id = theirs.organization_id
      where mine.user_id = auth.uid()
        and mine.status = 'active'
        and theirs.user_id = profiles.id
        and theirs.status = 'active'
        and mine.role in ('admin', 'staff')
    )
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

-- Organizations
drop policy if exists "orgs_public_storefront" on public.organizations;
create policy "orgs_public_storefront"
  on public.organizations for select
  to anon, authenticated
  using (deleted_at is null);

drop policy if exists "orgs_update_admin" on public.organizations;
create policy "orgs_update_admin"
  on public.organizations for update
  to authenticated
  using (public.has_permission(id, 'settings.manage') or public.has_org_role(id, array['admin']::public.app_role[]))
  with check (public.has_permission(id, 'settings.manage') or public.has_org_role(id, array['admin']::public.app_role[]));

-- Members
drop policy if exists "members_select" on public.organization_members;
create policy "members_select"
  on public.organization_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.has_org_role(organization_id, array['admin', 'staff']::public.app_role[])
  );

drop policy if exists "members_insert_admin" on public.organization_members;
create policy "members_insert_admin"
  on public.organization_members for insert
  to authenticated
  with check (public.has_permission(organization_id, 'staff.manage') or public.has_org_role(organization_id, array['admin']::public.app_role[]));

drop policy if exists "members_update_admin" on public.organization_members;
create policy "members_update_admin"
  on public.organization_members for update
  to authenticated
  using (public.has_permission(organization_id, 'staff.manage') or public.has_org_role(organization_id, array['admin']::public.app_role[]))
  with check (public.has_permission(organization_id, 'staff.manage') or public.has_org_role(organization_id, array['admin']::public.app_role[]));

-- Settings
drop policy if exists "settings_select_member" on public.business_settings;
create policy "settings_select_member"
  on public.business_settings for select
  to authenticated
  using (public.is_member_of(organization_id));

drop policy if exists "settings_select_public_flags" on public.business_settings;
create policy "settings_select_public_flags"
  on public.business_settings for select
  to anon, authenticated
  using (true);

-- The public policy above would leak settings. Replace with a narrower approach:
drop policy if exists "settings_select_public_flags" on public.business_settings;

drop policy if exists "settings_update_admin" on public.business_settings;
create policy "settings_update_admin"
  on public.business_settings for update
  to authenticated
  using (public.has_org_role(organization_id, array['admin']::public.app_role[]))
  with check (public.has_org_role(organization_id, array['admin']::public.app_role[]));

-- Categories: public storefront + members
drop policy if exists "categories_select" on public.categories;
create policy "categories_select"
  on public.categories for select
  to anon, authenticated
  using (deleted_at is null and is_active = true);

drop policy if exists "categories_select_staff" on public.categories;
create policy "categories_select_staff"
  on public.categories for select
  to authenticated
  using (public.has_org_role(organization_id, array['admin', 'staff']::public.app_role[]));

drop policy if exists "categories_write" on public.categories;
create policy "categories_write"
  on public.categories for all
  to authenticated
  using (public.has_permission(organization_id, 'products.edit') or public.has_org_role(organization_id, array['admin']::public.app_role[]))
  with check (public.has_permission(organization_id, 'products.edit') or public.has_org_role(organization_id, array['admin']::public.app_role[]));

-- Products
drop policy if exists "products_select_storefront" on public.products;
create policy "products_select_storefront"
  on public.products for select
  to anon, authenticated
  using (deleted_at is null and status = 'active');

drop policy if exists "products_select_staff" on public.products;
create policy "products_select_staff"
  on public.products for select
  to authenticated
  using (public.has_org_role(organization_id, array['admin', 'staff']::public.app_role[]));

drop policy if exists "products_insert" on public.products;
create policy "products_insert"
  on public.products for insert
  to authenticated
  with check (public.has_permission(organization_id, 'products.create') or public.has_org_role(organization_id, array['admin']::public.app_role[]));

drop policy if exists "products_update" on public.products;
create policy "products_update"
  on public.products for update
  to authenticated
  using (public.has_permission(organization_id, 'products.edit') or public.has_org_role(organization_id, array['admin']::public.app_role[]))
  with check (public.has_permission(organization_id, 'products.edit') or public.has_org_role(organization_id, array['admin']::public.app_role[]));

-- Price history
drop policy if exists "price_history_select" on public.product_price_history;
create policy "price_history_select"
  on public.product_price_history for select
  to authenticated
  using (public.has_permission(organization_id, 'products.view') or public.has_org_role(organization_id, array['admin', 'staff']::public.app_role[]));

-- Inventory
drop policy if exists "movements_select" on public.inventory_movements;
create policy "movements_select"
  on public.inventory_movements for select
  to authenticated
  using (public.has_permission(organization_id, 'inventory.view') or public.has_org_role(organization_id, array['admin', 'staff']::public.app_role[]));

-- Customers
drop policy if exists "customers_select" on public.customers;
create policy "customers_select"
  on public.customers for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.has_permission(organization_id, 'customers.view')
    or public.has_org_role(organization_id, array['admin', 'staff']::public.app_role[])
  );

drop policy if exists "customers_write" on public.customers;
create policy "customers_write"
  on public.customers for all
  to authenticated
  using (
    public.has_permission(organization_id, 'customers.manage')
    or public.has_org_role(organization_id, array['admin']::public.app_role[])
  )
  with check (
    public.has_permission(organization_id, 'customers.manage')
    or public.has_org_role(organization_id, array['admin']::public.app_role[])
  );

-- Orders
drop policy if exists "orders_select" on public.orders;
create policy "orders_select"
  on public.orders for select
  to authenticated
  using (
    customer_id = public.customer_id_for(organization_id)
    or public.has_permission(organization_id, 'orders.view')
    or public.has_org_role(organization_id, array['admin', 'staff']::public.app_role[])
  );

drop policy if exists "order_items_select" on public.order_items;
create policy "order_items_select"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (
          o.customer_id = public.customer_id_for(o.organization_id)
          or public.has_permission(o.organization_id, 'orders.view')
          or public.has_org_role(o.organization_id, array['admin', 'staff']::public.app_role[])
        )
    )
  );

-- Payments
drop policy if exists "payments_select" on public.payments;
create policy "payments_select"
  on public.payments for select
  to authenticated
  using (
    customer_id = public.customer_id_for(organization_id)
    or public.has_permission(organization_id, 'payments.view')
    or public.has_org_role(organization_id, array['admin']::public.app_role[])
    or (
      public.has_org_role(organization_id, array['staff']::public.app_role[])
      and public.has_permission(organization_id, 'payments.view')
    )
  );

-- Payment methods
drop policy if exists "payment_methods_select" on public.payment_methods;
create policy "payment_methods_select"
  on public.payment_methods for select
  to authenticated
  using (public.is_member_of(organization_id));

drop policy if exists "payment_methods_write" on public.payment_methods;
create policy "payment_methods_write"
  on public.payment_methods for all
  to authenticated
  using (public.has_org_role(organization_id, array['admin']::public.app_role[]))
  with check (public.has_org_role(organization_id, array['admin']::public.app_role[]));

-- Cart
drop policy if exists "cart_own" on public.cart_items;
create policy "cart_own"
  on public.cart_items for all
  to authenticated
  using (user_id = auth.uid() and public.is_member_of(organization_id))
  with check (user_id = auth.uid() and public.is_member_of(organization_id));

-- Notifications
drop policy if exists "notifications_own" on public.notifications;
create policy "notifications_own"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Audit logs
drop policy if exists "audit_select_admin" on public.audit_logs;
create policy "audit_select_admin"
  on public.audit_logs for select
  to authenticated
  using (public.has_org_role(organization_id, array['admin']::public.app_role[]));

-- Invites
drop policy if exists "invites_admin" on public.invites;
create policy "invites_admin"
  on public.invites for all
  to authenticated
  using (public.has_org_role(organization_id, array['admin']::public.app_role[]))
  with check (public.has_org_role(organization_id, array['admin']::public.app_role[]));

-- Order counters are only touched by SECURITY DEFINER functions
drop policy if exists "order_counters_admin_read" on public.order_counters;
create policy "order_counters_admin_read"
  on public.order_counters for select
  to authenticated
  using (public.has_org_role(organization_id, array['admin']::public.app_role[]));

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('organization-assets', 'organization-assets', true)
on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
  on storage.objects for select
  to public
  using (bucket_id in ('product-images', 'organization-assets'));

drop policy if exists "product_images_staff_write" on storage.objects;
create policy "product_images_staff_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('product-images', 'organization-assets')
    and public.has_org_role((storage.foldername(name))[1]::uuid, array['admin', 'staff']::public.app_role[])
  );

drop policy if exists "product_images_staff_update" on storage.objects;
create policy "product_images_staff_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('product-images', 'organization-assets')
    and public.has_org_role((storage.foldername(name))[1]::uuid, array['admin', 'staff']::public.app_role[])
  );

drop policy if exists "product_images_staff_delete" on storage.objects;
create policy "product_images_staff_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('product-images', 'organization-assets')
    and public.has_org_role((storage.foldername(name))[1]::uuid, array['admin', 'staff']::public.app_role[])
  );
