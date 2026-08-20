-- Business RPCs: organization setup, inventory, checkout, payments, seed.

create or replace function public.write_audit(
  p_org uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_description text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (
    organization_id, user_id, action, entity_type, entity_id, description, metadata
  ) values (
    p_org, auth.uid(), p_action, p_entity_type, p_entity_id, p_description, p_metadata
  );
end;
$$;

create or replace function public.apply_stock_change(
  p_product_id uuid,
  p_delta numeric,
  p_type public.inventory_movement_type,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_after numeric(12,3);
  v_allow_negative boolean;
begin
  perform set_config('app.allow_stock_update', 'true', true);

  select * into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found.';
  end if;

  select allow_negative_stock into v_allow_negative
  from public.business_settings
  where organization_id = v_product.organization_id;

  v_after := v_product.current_stock + p_delta;

  if v_after < 0 and coalesce(v_allow_negative, false) is false then
    raise exception 'Insufficient stock.

Available: %
Requested: %',
      trim(to_char(v_product.current_stock, 'FM999999990.999')),
      trim(to_char(abs(p_delta), 'FM999999990.999'));
  end if;

  update public.products
  set current_stock = v_after
  where id = p_product_id;

  insert into public.inventory_movements (
    organization_id, product_id, type, quantity, quantity_before, quantity_after,
    reference_type, reference_id, notes, created_by
  ) values (
    v_product.organization_id, p_product_id, p_type, p_delta,
    v_product.current_stock, v_after, p_reference_type, p_reference_id, p_notes, auth.uid()
  );
end;
$$;

create or replace function public.create_organization(
  p_name text,
  p_slug text,
  p_email text default null,
  p_phone text default null,
  p_address text default null,
  p_seed boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_org uuid;
  v_slug text;
begin
  if v_user is null then
    raise exception 'You must be signed in to create a business.';
  end if;

  v_slug := lower(regexp_replace(trim(p_slug), '[^a-z0-9-]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);

  if v_slug is null or length(v_slug) < 2 then
    raise exception 'Please choose a valid store URL slug.';
  end if;

  if exists (select 1 from public.organizations where slug = v_slug) then
    raise exception 'That store URL is already taken.';
  end if;

  insert into public.organizations (name, slug, email, phone, address)
  values (trim(p_name), v_slug, p_email, p_phone, p_address)
  returning id into v_org;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_org, v_user, 'admin', 'active');

  insert into public.business_settings (organization_id) values (v_org);
  insert into public.order_counters (organization_id, last_number) values (v_org, 10000);

  insert into public.payment_methods (organization_id, name, sort_order)
  values
    (v_org, 'Cash', 1),
    (v_org, 'GCash', 2),
    (v_org, 'Bank Transfer', 3),
    (v_org, 'Other', 4);

  perform public.write_audit(v_org, 'organization.created', 'organization', v_org, 'Business created');

  if p_seed then
    perform public.seed_demo_catalog(v_org);
  end if;

  return v_org;
end;
$$;

create or replace function public.join_store_as_customer(p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_org public.organizations%rowtype;
  v_customer uuid;
  v_profile public.profiles%rowtype;
begin
  if v_user is null then
    raise exception 'You must be signed in.';
  end if;

  select * into v_org
  from public.organizations
  where slug = p_slug and deleted_at is null;

  if not found then
    raise exception 'Store not found.';
  end if;

  select * into v_profile from public.profiles where id = v_user;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_org.id, v_user, 'customer', 'active')
  on conflict (organization_id, user_id) do update
    set status = 'active'
  where public.organization_members.role = 'customer';

  insert into public.customers (organization_id, user_id, full_name, email, phone, status)
  values (
    v_org.id,
    v_user,
    coalesce(nullif(v_profile.full_name, ''), split_part(coalesce(v_profile.email, 'Customer'), '@', 1)),
    v_profile.email,
    v_profile.phone,
    'active'
  )
  on conflict do nothing;

  select id into v_customer
  from public.customers
  where organization_id = v_org.id and user_id = v_user and deleted_at is null;

  if v_customer is null then
    -- unique index is partial so ON CONFLICT DO NOTHING may not target it
    select id into v_customer
    from public.customers
    where organization_id = v_org.id and user_id = v_user
    limit 1;

    if v_customer is null then
      insert into public.customers (organization_id, user_id, full_name, email, phone, status)
      values (
        v_org.id,
        v_user,
        coalesce(nullif(v_profile.full_name, ''), 'Customer'),
        v_profile.email,
        v_profile.phone,
        'active'
      )
      returning id into v_customer;
    else
      update public.customers
      set deleted_at = null, status = 'active',
          full_name = coalesce(nullif(v_profile.full_name, ''), full_name),
          email = coalesce(v_profile.email, email)
      where id = v_customer;
    end if;
  end if;

  return v_org.id;
end;
$$;

create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_invite public.invites%rowtype;
  v_profile public.profiles%rowtype;
begin
  if v_user is null then
    raise exception 'You must be signed in.';
  end if;

  select * into v_invite
  from public.invites
  where token = p_token
    and accepted_at is null
    and expires_at > now();

  if not found then
    raise exception 'This invite is invalid or has expired.';
  end if;

  select * into v_profile from public.profiles where id = v_user;

  insert into public.organization_members (organization_id, user_id, role, status, permissions)
  values (
    v_invite.organization_id,
    v_user,
    v_invite.role,
    'active',
    case
      when v_invite.role = 'staff' then jsonb_build_object(
        'products.view', true,
        'products.create', true,
        'products.edit', true,
        'products.delete', false,
        'inventory.view', true,
        'inventory.adjust', true,
        'customers.view', true,
        'customers.manage', true,
        'orders.view', true,
        'orders.process', true,
        'payments.view', false,
        'payments.record', false,
        'reports.view', false,
        'finance.view', false,
        'settings.manage', false,
        'staff.manage', false
      )
      else '{}'::jsonb
    end
  )
  on conflict (organization_id, user_id) do update
    set role = excluded.role,
        status = 'active',
        permissions = excluded.permissions;

  if v_invite.role = 'customer' then
    perform public.join_store_as_customer(
      (select slug from public.organizations where id = v_invite.organization_id)
    );
  end if;

  update public.invites set accepted_at = now() where id = v_invite.id;
  return v_invite.organization_id;
end;
$$;

create or replace function public.adjust_inventory(
  p_product_id uuid,
  p_quantity numeric,
  p_type public.inventory_movement_type,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from public.products where id = p_product_id;
  if v_org is null then
    raise exception 'Product not found.';
  end if;

  if not public.has_permission(v_org, 'inventory.adjust') then
    raise exception 'You don''t have permission to access this page.';
  end if;

  if p_quantity = 0 then
    raise exception 'Quantity cannot be zero.';
  end if;

  perform public.apply_stock_change(p_product_id, p_quantity, p_type, 'manual', null, p_notes);
  perform public.write_audit(
    v_org, 'inventory.adjusted', 'product', p_product_id,
    'Inventory adjusted',
    jsonb_build_object('quantity', p_quantity, 'type', p_type, 'notes', p_notes)
  );
end;
$$;

create or replace function public.place_order(
  p_organization_id uuid,
  p_items jsonb,
  p_payment_type text,
  p_amount_paid numeric default 0,
  p_payment_method text default 'cash',
  p_due_date date default null,
  p_notes text default null,
  p_discount numeric default 0,
  p_customer_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_customer_id uuid;
  v_settings public.business_settings%rowtype;
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric(12,2) := 0;
  v_total numeric(12,2);
  v_paid numeric(12,2);
  v_balance numeric(12,2);
  v_payment_status public.payment_status;
  v_status public.order_status;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty numeric(12,3);
  v_next integer;
  v_due date;
  v_is_staff boolean;
begin
  if v_user is null then
    raise exception 'You must be signed in to place an order.';
  end if;

  if not public.is_member_of(p_organization_id) then
    raise exception 'You don''t have permission to access this page.';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty.';
  end if;

  if p_payment_type not in ('full', 'partial', 'pay_later') then
    raise exception 'Invalid payment type.';
  end if;

  select * into v_settings
  from public.business_settings
  where organization_id = p_organization_id;

  v_is_staff := public.has_org_role(p_organization_id, array['admin', 'staff']::public.app_role[]);

  if p_payment_type in ('pay_later', 'partial') and coalesce(v_settings.allow_pay_later, true) is false then
    raise exception 'This business does not allow pay later / credit purchases.';
  end if;

  if v_is_staff and p_customer_id is not null then
    if not public.has_permission(p_organization_id, 'orders.process') then
      raise exception 'You don''t have permission to access this page.';
    end if;
    v_customer_id := p_customer_id;
    if not exists (
      select 1 from public.customers
      where id = v_customer_id and organization_id = p_organization_id and deleted_at is null
    ) then
      raise exception 'Customer not found.';
    end if;
  else
    v_customer_id := public.customer_id_for(p_organization_id);
    if v_customer_id is null then
      perform public.join_store_as_customer(
        (select slug from public.organizations where id = p_organization_id)
      );
      v_customer_id := public.customer_id_for(p_organization_id);
    end if;
    if v_customer_id is null then
      raise exception 'Unable to create your customer profile.';
    end if;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := coalesce((v_item->>'quantity')::numeric, 0);
    if v_qty <= 0 then
      raise exception 'Quantity must be greater than zero.';
    end if;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and organization_id = p_organization_id
      and deleted_at is null
      and status = 'active'
    for update;

    if not found then
      raise exception 'A product in your cart is no longer available.';
    end if;

    if v_product.current_stock < v_qty and coalesce(v_settings.allow_negative_stock, false) is false then
      raise exception 'Insufficient stock.

Available: %
Requested: %',
        trim(to_char(v_product.current_stock, 'FM999999990.999')),
        trim(to_char(v_qty, 'FM999999990.999'));
    end if;

    v_subtotal := v_subtotal + round(v_product.selling_price * v_qty, 2);
  end loop;

  if coalesce(p_discount, 0) < 0 then
    raise exception 'Discount cannot be negative.';
  end if;

  v_total := round(v_subtotal - coalesce(p_discount, 0), 2);
  if v_total < 0 then
    raise exception 'Discount cannot exceed the subtotal.';
  end if;

  v_paid := coalesce(p_amount_paid, 0);
  if p_payment_type = 'full' then
    v_paid := v_total;
  elsif p_payment_type = 'pay_later' and v_paid = 0 then
    v_paid := 0;
  end if;

  if v_paid < 0 then
    raise exception 'Amount paid cannot be negative.';
  end if;

  if v_paid > v_total then
    raise exception 'Payment cannot exceed the outstanding balance.';
  end if;

  v_balance := v_total - v_paid;
  if v_balance = 0 then
    v_payment_status := 'paid';
  elsif v_paid > 0 then
    v_payment_status := 'partially_paid';
  else
    v_payment_status := 'unpaid';
  end if;

  v_status := coalesce(v_settings.default_order_status, 'pending');
  if v_status in ('cancelled', 'returned', 'draft') then
    v_status := 'pending';
  end if;

  v_due := p_due_date;
  if v_balance > 0 and v_due is null then
    v_due := (current_date + (coalesce(v_settings.payment_terms_days, 7) || ' days')::interval)::date;
  end if;

  update public.order_counters
  set last_number = last_number + 1
  where organization_id = p_organization_id
  returning last_number into v_next;

  if not found then
    insert into public.order_counters (organization_id, last_number)
    values (p_organization_id, 10001)
    returning last_number into v_next;
  end if;

  v_order_number := 'INV-' || v_next::text;

  insert into public.orders (
    organization_id, customer_id, order_number, status, payment_status,
    subtotal, discount, total, amount_paid, balance, due_date, notes,
    payment_type, inventory_applied, created_by
  ) values (
    p_organization_id, v_customer_id, v_order_number, v_status, v_payment_status,
    v_subtotal, coalesce(p_discount, 0), v_total, v_paid, v_balance, v_due, p_notes,
    p_payment_type, true, v_user
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::numeric;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
    for update;

    insert into public.order_items (
      organization_id, order_id, product_id, product_name, sku, quantity, unit,
      unit_cost_at_sale, unit_price_at_sale, subtotal, profit
    ) values (
      p_organization_id,
      v_order_id,
      v_product.id,
      v_product.name,
      v_product.sku,
      v_qty,
      v_product.unit,
      v_product.cost_price,
      v_product.selling_price,
      round(v_product.selling_price * v_qty, 2),
      round((v_product.selling_price - v_product.cost_price) * v_qty, 2)
    );

    perform public.apply_stock_change(
      v_product.id,
      -v_qty,
      'sale',
      'order',
      v_order_id,
      'Sale ' || v_order_number
    );
  end loop;

  if v_paid > 0 then
    insert into public.payments (
      organization_id, order_id, customer_id, amount, payment_method, recorded_by
    ) values (
      p_organization_id, v_order_id, v_customer_id, v_paid, coalesce(p_payment_method, 'cash'), v_user
    );
  end if;

  delete from public.cart_items
  where organization_id = p_organization_id and user_id = v_user;

  perform public.notify_org_staff(
    p_organization_id,
    'new_order',
    'New order',
    'Order ' || v_order_number || ' was placed.',
    jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number)
  );

  insert into public.notifications (organization_id, user_id, type, title, message, data)
  values (
    p_organization_id,
    v_user,
    'order_created',
    'Order created',
    'Your order ' || v_order_number || ' has been submitted.',
    jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number)
  );

  perform public.write_audit(
    p_organization_id, 'order.created', 'order', v_order_id,
    'Order ' || v_order_number || ' created'
  );

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number);
end;
$$;

create or replace function public.refresh_order_payment_status(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_status public.payment_status;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order.balance <= 0 then
    v_status := 'paid';
  elsif v_order.amount_paid > 0 then
    v_status := 'partially_paid';
  elsif v_order.due_date is not null and v_order.due_date < current_date then
    v_status := 'overdue';
  else
    v_status := 'unpaid';
  end if;

  update public.orders
  set payment_status = v_status,
      balance = greatest(total - amount_paid, 0)
  where id = p_order_id;
end;
$$;

create or replace function public.record_payment(
  p_customer_id uuid,
  p_amount numeric,
  p_payment_method text default 'cash',
  p_reference_number text default null,
  p_notes text default null,
  p_order_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customers%rowtype;
  v_payment_id uuid;
  v_remaining numeric(12,2);
  v_order public.orders%rowtype;
  v_apply numeric(12,2);
  v_user uuid := auth.uid();
begin
  select * into v_customer from public.customers where id = p_customer_id and deleted_at is null;
  if not found then
    raise exception 'Customer not found.';
  end if;

  if not public.has_permission(v_customer.organization_id, 'payments.record')
     and not public.has_org_role(v_customer.organization_id, array['admin']::public.app_role[]) then
    raise exception 'You don''t have permission to access this page.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero.';
  end if;

  v_remaining := p_amount;

  if p_order_id is not null then
    select * into v_order
    from public.orders
    where id = p_order_id
      and customer_id = p_customer_id
      and organization_id = v_customer.organization_id
    for update;

    if not found then
      raise exception 'Order not found.';
    end if;

    if p_amount > v_order.balance then
      raise exception 'Payment cannot exceed the outstanding balance.';
    end if;

    update public.orders
    set amount_paid = amount_paid + p_amount,
        balance = balance - p_amount
    where id = p_order_id;

    perform public.refresh_order_payment_status(p_order_id);
    v_remaining := 0;
  else
    for v_order in
      select *
      from public.orders
      where customer_id = p_customer_id
        and organization_id = v_customer.organization_id
        and balance > 0
        and status not in ('cancelled', 'draft')
      order by coalesce(due_date, created_at::date), created_at
      for update
    loop
      exit when v_remaining <= 0;
      v_apply := least(v_order.balance, v_remaining);
      update public.orders
      set amount_paid = amount_paid + v_apply,
          balance = balance - v_apply
      where id = v_order.id;
      perform public.refresh_order_payment_status(v_order.id);
      v_remaining := v_remaining - v_apply;
    end loop;

    if v_remaining > 0 then
      raise exception 'Payment cannot exceed the outstanding balance.';
    end if;
  end if;

  insert into public.payments (
    organization_id, order_id, customer_id, amount, payment_method,
    reference_number, notes, recorded_by
  ) values (
    v_customer.organization_id, p_order_id, p_customer_id, p_amount,
    coalesce(p_payment_method, 'cash'), p_reference_number, p_notes, v_user
  ) returning id into v_payment_id;

  perform public.notify_org_staff(
    v_customer.organization_id,
    'payment_received',
    'Payment received',
    v_customer.full_name || ' paid ' || to_char(p_amount, 'FM999,999,990.00') || '.',
    jsonb_build_object('payment_id', v_payment_id, 'customer_id', p_customer_id)
  );

  if v_customer.user_id is not null then
    insert into public.notifications (organization_id, user_id, type, title, message, data)
    values (
      v_customer.organization_id,
      v_customer.user_id,
      'payment_recorded',
      'Payment recorded',
      'A payment of ' || to_char(p_amount, 'FM999,999,990.00') || ' was recorded on your account.',
      jsonb_build_object('payment_id', v_payment_id)
    );
  end if;

  perform public.write_audit(
    v_customer.organization_id, 'payment.recorded', 'payment', v_payment_id,
    'Payment recorded for ' || v_customer.full_name,
    jsonb_build_object('amount', p_amount)
  );

  return v_payment_id;
end;
$$;

create or replace function public.update_order_status(
  p_order_id uuid,
  p_status public.order_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.';
  end if;

  if not public.has_permission(v_order.organization_id, 'orders.process') then
    raise exception 'You don''t have permission to access this page.';
  end if;

  if v_order.status = p_status then
    return;
  end if;

  if v_order.status = 'cancelled' and p_status <> 'cancelled' then
    raise exception 'Cancelled orders cannot be reopened.';
  end if;

  if p_status = 'cancelled' then
    if v_order.inventory_applied then
      for v_item in select * from public.order_items where order_id = p_order_id
      loop
        if v_item.product_id is not null then
          perform public.apply_stock_change(
            v_item.product_id, v_item.quantity, 'cancelled_restore', 'order', p_order_id,
            'Cancelled ' || v_order.order_number
          );
        end if;
      end loop;
    end if;

    update public.orders
    set status = 'cancelled',
        cancelled_at = now(),
        inventory_applied = false
    where id = p_order_id;
  else
    update public.orders
    set status = p_status,
        completed_at = case when p_status = 'completed' then now() else completed_at end
    where id = p_order_id;
  end if;

  if p_status in ('confirmed', 'ready') then
    insert into public.notifications (organization_id, user_id, type, title, message, data)
    select
      v_order.organization_id,
      c.user_id,
      case when p_status = 'ready' then 'order_ready' else 'order_confirmed' end,
      case when p_status = 'ready' then 'Order ready' else 'Order confirmed' end,
      'Order ' || v_order.order_number || ' is now ' || p_status || '.',
      jsonb_build_object('order_id', p_order_id)
    from public.customers c
    where c.id = v_order.customer_id and c.user_id is not null;
  end if;

  perform public.write_audit(
    v_order.organization_id, 'order.status_updated', 'order', p_order_id,
    'Order ' || v_order.order_number || ' set to ' || p_status
  );
end;
$$;

create or replace function public.confirm_items_received(
  p_order_id uuid,
  p_item_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_customer_id uuid;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'Order not found.';
  end if;

  v_customer_id := public.customer_id_for(v_order.organization_id);

  if v_customer_id is distinct from v_order.customer_id
     and not public.has_permission(v_order.organization_id, 'orders.process') then
    raise exception 'You don''t have permission to access this page.';
  end if;

  update public.order_items
  set received_at = now()
  where order_id = p_order_id
    and id = any (p_item_ids)
    and received_at is null;

  perform public.notify_org_staff(
    v_order.organization_id,
    'receipt_confirmed',
    'Items received',
    'Customer confirmed items for order ' || v_order.order_number || '.',
    jsonb_build_object('order_id', p_order_id)
  );

  perform public.write_audit(
    v_order.organization_id, 'order.items_received', 'order', p_order_id,
    'Items marked as received for ' || v_order.order_number
  );
end;
$$;

create or replace function public.process_return(
  p_order_id uuid,
  p_item_id uuid,
  p_quantity numeric,
  p_restock boolean default true,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.';
  end if;

  if not public.has_permission(v_order.organization_id, 'orders.process') then
    raise exception 'You don''t have permission to access this page.';
  end if;

  select * into v_item from public.order_items where id = p_item_id and order_id = p_order_id;
  if not found then
    raise exception 'Order item not found.';
  end if;

  if p_quantity <= 0 or p_quantity > v_item.quantity then
    raise exception 'Invalid return quantity.';
  end if;

  if p_restock and v_item.product_id is not null then
    perform public.apply_stock_change(
      v_item.product_id, p_quantity, 'return', 'order', p_order_id, coalesce(p_notes, 'Return')
    );
  end if;

  update public.orders set status = 'returned' where id = p_order_id;

  perform public.write_audit(
    v_order.organization_id, 'order.returned', 'order', p_order_id,
    'Return processed for ' || v_order.order_number
  );
end;
$$;

create or replace function public.seed_demo_catalog(p_org uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staples uuid;
  v_beverages uuid;
  v_canned uuid;
  v_personal uuid;
  v_snacks uuid;
  v_household uuid;
begin
  if auth.uid() is not null and not public.has_org_role(p_org, array['admin']::public.app_role[]) then
    raise exception 'You don''t have permission to access this page.';
  end if;

  insert into public.categories (organization_id, name, slug, sort_order)
  values
    (p_org, 'Rice & Staples', 'rice-staples', 1),
    (p_org, 'Beverages', 'beverages', 2),
    (p_org, 'Canned Goods', 'canned-goods', 3),
    (p_org, 'Personal Care', 'personal-care', 4),
    (p_org, 'Snacks & Instant', 'snacks-instant', 5),
    (p_org, 'Household', 'household', 6)
  on conflict (organization_id, slug) do nothing;

  select id into v_staples from public.categories where organization_id = p_org and slug = 'rice-staples';
  select id into v_beverages from public.categories where organization_id = p_org and slug = 'beverages';
  select id into v_canned from public.categories where organization_id = p_org and slug = 'canned-goods';
  select id into v_personal from public.categories where organization_id = p_org and slug = 'personal-care';
  select id into v_snacks from public.categories where organization_id = p_org and slug = 'snacks-instant';
  select id into v_household from public.categories where organization_id = p_org and slug = 'household';

  perform set_config('app.allow_stock_update', 'true', true);

  insert into public.products (
    organization_id, category_id, name, sku, barcode, description, unit,
    cost_price, selling_price, current_stock, min_stock, max_stock, status
  )
  values
    (p_org, v_staples, 'Rice 25kg', 'RICE-25', '480000100001', 'Premium well-milled rice, 25 kilogram sack.', 'sack', 1200, 1450, 18, 5, 80, 'active'),
    (p_org, v_staples, 'Rice 5kg', 'RICE-5', '480000100002', 'Family pack well-milled rice.', 'pack', 250, 320, 40, 10, 120, 'active'),
    (p_org, v_staples, 'Sugar 1kg', 'SUGAR-1', '480000100003', 'Refined white sugar.', 'pack', 70, 95, 55, 15, 200, 'active'),
    (p_org, v_staples, 'Coffee 250g', 'COFFEE-250', '480000100004', 'Granulated 3-in-1 coffee mix.', 'pack', 120, 165, 8, 12, 80, 'active'),
    (p_org, v_staples, 'Bread', 'BREAD-1', '480000100005', 'Sliced loaf bread.', 'loaf', 55, 75, 24, 8, 60, 'active'),
    (p_org, v_staples, 'Milk 1L', 'MILK-1L', '480000100006', 'Fresh milk, 1 liter.', 'bottle', 95, 125, 16, 8, 50, 'active'),
    (p_org, v_staples, 'Eggs (Tray of 30)', 'EGG-30', '480000100007', 'Fresh chicken eggs, tray of 30.', 'tray', 220, 280, 12, 6, 40, 'active'),
    (p_org, v_beverages, 'Coca-Cola 1.5L', 'COKE-15', '480000200001', 'Coca-Cola soft drink, 1.5 liters.', 'bottle', 55, 75, 20, 10, 100, 'active'),
    (p_org, v_beverages, 'Pepsi 1.5L', 'PEPSI-15', '480000200002', 'Pepsi soft drink, 1.5 liters.', 'bottle', 52, 72, 14, 10, 100, 'active'),
    (p_org, v_snacks, 'Lucky Me Pancit Canton', 'LM-PC', '480000300001', 'Instant pancit canton noodles.', 'pack', 14, 20, 120, 30, 400, 'active'),
    (p_org, v_canned, 'Century Tuna', 'CT-TUNA', '480000400001', 'Century tuna flakes in oil.', 'can', 32, 45, 60, 20, 200, 'active'),
    (p_org, v_canned, 'Argentina Corned Beef', 'ARG-CB', '480000400002', 'Argentina corned beef 150g.', 'can', 38, 52, 48, 16, 160, 'active'),
    (p_org, v_personal, 'Safeguard Soap', 'SG-SOAP', '480000500001', 'Safeguard antibacterial soap.', 'bar', 28, 42, 36, 12, 150, 'active'),
    (p_org, v_personal, 'Shampoo 180ml', 'SHAMP-180', '480000500002', 'Everyday shampoo, 180ml.', 'bottle', 65, 89, 22, 8, 80, 'active'),
    (p_org, v_household, 'Laundry Detergent 1kg', 'DET-1', '480000600001', 'Powder detergent, 1 kilogram.', 'pack', 85, 115, 4, 10, 60, 'active')
  on conflict do nothing;

  insert into public.inventory_movements (
    organization_id, product_id, type, quantity, quantity_before, quantity_after, notes, created_by
  )
  select organization_id, id, 'initial', current_stock, 0, current_stock, 'Seed stock', auth.uid()
  from public.products
  where organization_id = p_org
    and not exists (
      select 1 from public.inventory_movements m where m.product_id = products.id
    );

  perform public.write_audit(p_org, 'catalog.seeded', 'organization', p_org, 'Demo grocery catalog loaded');
end;
$$;

grant execute on function public.create_organization(text, text, text, text, text, boolean) to authenticated;
grant execute on function public.join_store_as_customer(text) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.adjust_inventory(uuid, numeric, public.inventory_movement_type, text) to authenticated;
grant execute on function public.place_order(uuid, jsonb, text, numeric, text, date, text, numeric, uuid) to authenticated;
grant execute on function public.record_payment(uuid, numeric, text, text, text, uuid) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status) to authenticated;
grant execute on function public.confirm_items_received(uuid, uuid[]) to authenticated;
grant execute on function public.process_return(uuid, uuid, numeric, boolean, text) to authenticated;
grant execute on function public.seed_demo_catalog(uuid) to authenticated;
