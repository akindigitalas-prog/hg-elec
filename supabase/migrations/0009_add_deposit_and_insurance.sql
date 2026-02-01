alter table public.tenants
  add column if not exists deposit_percent numeric(5,2),
  add column if not exists insurance_name text,
  add column if not exists insurance_origin text,
  add column if not exists insurance_contract text;

create index if not exists idx_tenants_deposit_percent on public.tenants (deposit_percent);
