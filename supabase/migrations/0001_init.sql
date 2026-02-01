-- Extensions
create extension if not exists "pgcrypto";

-- Enums
create type public.product_category as enum (
  'appareillage',
  'protection_tableau',
  'cables_conducteurs',
  'eclairage',
  'courant_faible',
  'chauffage_ventilation',
  'securite',
  'main_oeuvre',
  'consommables_fixations'
);

create type public.product_type as enum ('fourniture', 'main_oeuvre', 'deplacement');

create type public.product_unit as enum ('piece', 'm', 'lot');

create type public.quote_status as enum ('brouillon', 'envoye', 'accepte', 'refuse', 'expire');

create type public.invoice_status as enum ('brouillon', 'emise', 'payee', 'annulee', 'en_retard');

create type public.display_mode as enum ('total_only', 'group_totals');

create type public.payment_method as enum ('cb', 'virement', 'especes', 'cheque');

-- Core tables
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text,
  postal_code text,
  country text default 'France',
  siret text,
  vat_number text,
  phone text,
  email text,
  logo_url text,
  rib text,
  pdf_terms text,
  pdf_warranty text,
  client_display_mode public.display_mode not null default 'total_only',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  tenant_id uuid not null references public.tenants on delete cascade,
  role text not null check (role in ('admin', 'user')),
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

-- Helper functions for multi-tenant access
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
as $$
  select tenant_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  notes text,
  siret text,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants on delete cascade,
  category public.product_category not null,
  subcategory text,
  name text not null,
  brand text,
  sku text,
  description text,
  unit public.product_unit not null default 'piece',
  vat_rate numeric(5,2) not null default 20.0,
  internal_unit_price numeric(12,2) not null default 0,
  internal_cost numeric(12,2),
  type public.product_type not null default 'fourniture',
  active boolean not null default true,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, sku)
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants on delete cascade,
  number text not null,
  customer_id uuid not null references public.customers on delete restrict,
  status public.quote_status not null default 'brouillon',
  issue_date date not null,
  valid_until date,
  notes text,
  locked boolean not null default false,
  totals jsonb not null default '{}'::jsonb,
  display_mode public.display_mode,
  created_at timestamptz not null default now(),
  unique (tenant_id, number)
);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants on delete cascade,
  quote_id uuid not null references public.quotes on delete cascade,
  product_id uuid references public.products on delete set null,
  label text not null,
  qty numeric(12,2) not null default 1,
  unit public.product_unit not null default 'piece',
  vat_rate numeric(5,2) not null default 20.0,
  internal_unit_price numeric(12,2) not null default 0,
  item_type public.product_type not null default 'fourniture',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants on delete cascade,
  number text not null,
  customer_id uuid not null references public.customers on delete restrict,
  quote_id uuid references public.quotes on delete set null,
  status public.invoice_status not null default 'brouillon',
  issue_date date not null,
  due_date date,
  totals jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, number)
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants on delete cascade,
  invoice_id uuid not null references public.invoices on delete cascade,
  product_id uuid references public.products on delete set null,
  label text not null,
  qty numeric(12,2) not null default 1,
  unit public.product_unit not null default 'piece',
  vat_rate numeric(5,2) not null default 20.0,
  internal_unit_price numeric(12,2) not null default 0,
  item_type public.product_type not null default 'fourniture',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants on delete cascade,
  invoice_id uuid not null references public.invoices on delete cascade,
  paid_at date not null,
  amount numeric(12,2) not null,
  method public.payment_method not null,
  note text,
  created_at timestamptz not null default now()
);

-- Document numbering
create table public.document_counters (
  tenant_id uuid not null references public.tenants on delete cascade,
  doc_type text not null check (doc_type in ('DEV', 'FAC')),
  doc_year integer not null,
  counter integer not null default 0,
  primary key (tenant_id, doc_type, doc_year)
);

create or replace function public.next_document_number(
  p_tenant uuid,
  p_doc_type text,
  p_doc_year integer
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_counter integer;
begin
  insert into public.document_counters (tenant_id, doc_type, doc_year, counter)
  values (p_tenant, p_doc_type, p_doc_year, 1)
  on conflict (tenant_id, doc_type, doc_year)
  do update set counter = public.document_counters.counter + 1
  returning counter into v_counter;

  return p_doc_type || '-' || p_doc_year || '-' || lpad(v_counter::text, 4, '0');
end;
$$;

create or replace function public.set_quote_number()
returns trigger
language plpgsql
as $$
declare
  doc_year integer;
begin
  if new.number is null or new.number = '' then
    doc_year := extract(year from coalesce(new.issue_date, now()))::integer;
    new.number := public.next_document_number(new.tenant_id, 'DEV', doc_year);
  end if;
  return new;
end;
$$;

create trigger quote_number_before_insert
before insert on public.quotes
for each row execute function public.set_quote_number();

create or replace function public.set_invoice_number()
returns trigger
language plpgsql
as $$
declare
  doc_year integer;
begin
  if new.number is null or new.number = '' then
    doc_year := extract(year from coalesce(new.issue_date, now()))::integer;
    new.number := public.next_document_number(new.tenant_id, 'FAC', doc_year);
  end if;
  return new;
end;
$$;

create trigger invoice_number_before_insert
before insert on public.invoices
for each row execute function public.set_invoice_number();

-- Auth trigger: create tenant + profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant_id uuid;
  v_company_name text;
begin
  v_company_name := coalesce(new.raw_user_meta_data ->> 'company_name', 'Nouvelle entreprise');

  insert into public.tenants (name)
  values (v_company_name)
  returning id into v_tenant_id;

  insert into public.profiles (id, tenant_id, role, full_name, email)
  values (
    new.id,
    v_tenant_id,
    'admin',
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Indexes
create index if not exists idx_customers_tenant on public.customers (tenant_id);
create index if not exists idx_products_tenant on public.products (tenant_id);
create index if not exists idx_quotes_tenant on public.quotes (tenant_id, number);
create index if not exists idx_quotes_customer on public.quotes (tenant_id, customer_id);
create index if not exists idx_quotes_status on public.quotes (tenant_id, status);
create index if not exists idx_invoices_tenant on public.invoices (tenant_id, number);
create index if not exists idx_invoices_customer on public.invoices (tenant_id, customer_id);
create index if not exists idx_invoices_status on public.invoices (tenant_id, status);

-- RLS
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.document_counters enable row level security;

create policy tenants_select on public.tenants
for select using (id = public.current_tenant_id());

create policy tenants_update on public.tenants
for update using (id = public.current_tenant_id() and public.is_admin())
with check (id = public.current_tenant_id() and public.is_admin());

create policy profiles_select on public.profiles
for select using (tenant_id = public.current_tenant_id());

create policy profiles_update on public.profiles
for update using (id = auth.uid() or public.is_admin())
with check (tenant_id = public.current_tenant_id());

create policy customers_tenant on public.customers
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy products_tenant on public.products
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy quotes_tenant on public.quotes
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy quote_items_tenant on public.quote_items
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy invoices_tenant on public.invoices
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy invoice_items_tenant on public.invoice_items
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy payments_tenant on public.payments
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy counters_tenant on public.document_counters
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

