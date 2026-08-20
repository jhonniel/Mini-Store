-- Payment method details (GCash account + QR) and cash tendered/change on payments.

alter table public.payment_methods
  add column if not exists kind text not null default 'other',
  add column if not exists account_number text,
  add column if not exists qr_code_url text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payment_methods_kind_check'
  ) then
    alter table public.payment_methods
      add constraint payment_methods_kind_check
      check (kind in ('cash', 'gcash', 'other'));
  end if;
end $$;

update public.payment_methods
set kind = 'cash'
where lower(name) = 'cash' and kind = 'other';

update public.payment_methods
set kind = 'gcash'
where lower(name) like '%gcash%' and kind = 'other';

alter table public.payments
  add column if not exists amount_tendered numeric(12,2),
  add column if not exists change_due numeric(12,2);
