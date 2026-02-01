do $$
begin
  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    raise notice 'invoice_status enum missing';
  end if;
exception when others then
  null;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_enum
    join pg_type on pg_type.oid = pg_enum.enumtypid
    where pg_type.typname = 'invoice_status'
      and pg_enum.enumlabel = 'partiellement_payee'
  ) then
    alter type public.invoice_status add value 'partiellement_payee';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_enum
    join pg_type on pg_type.oid = pg_enum.enumtypid
    where pg_type.typname = 'payment_method'
      and pg_enum.enumlabel = 'autre'
  ) then
    alter type public.payment_method add value 'autre';
  end if;
end $$;

alter table public.quotes
  add column if not exists sent_at timestamptz;

alter table public.tenants
  add column if not exists payment_terms_days integer;

alter table public.invoices
  add column if not exists locked boolean not null default false,
  add column if not exists emitted_at timestamptz,
  add column if not exists payment_terms_days integer,
  add column if not exists kind text not null default 'final';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoices_kind_check'
  ) then
    alter table public.invoices
      add constraint invoices_kind_check check (kind in ('final', 'deposit'));
  end if;
end $$;
