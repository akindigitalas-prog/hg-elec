alter table public.quotes
  add column if not exists deposit_percent numeric(5,2);

create index if not exists idx_quotes_deposit_percent on public.quotes (tenant_id, deposit_percent);
