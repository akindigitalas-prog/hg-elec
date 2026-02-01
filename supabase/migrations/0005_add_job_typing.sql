-- Job typing on quotes and invoices
alter table public.quotes
  add column if not exists job_type text not null default 'maison',
  add column if not exists job_zone text not null default 'interieur';

alter table public.invoices
  add column if not exists job_type text not null default 'maison',
  add column if not exists job_zone text not null default 'interieur';

-- Zone on sections
alter table public.quote_sections
  add column if not exists zone text not null default 'interieur';

alter table public.invoice_sections
  add column if not exists zone text not null default 'interieur';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'quotes_job_type_check') then
    alter table public.quotes
      add constraint quotes_job_type_check
      check (job_type in ('appartement','maison','commerce','entrepot'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'quotes_job_zone_check') then
    alter table public.quotes
      add constraint quotes_job_zone_check
      check (job_zone in ('interieur','exterieur','communs'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'invoices_job_type_check') then
    alter table public.invoices
      add constraint invoices_job_type_check
      check (job_type in ('appartement','maison','commerce','entrepot'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'invoices_job_zone_check') then
    alter table public.invoices
      add constraint invoices_job_zone_check
      check (job_zone in ('interieur','exterieur','communs'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'quote_sections_zone_check') then
    alter table public.quote_sections
      add constraint quote_sections_zone_check
      check (zone in ('interieur','exterieur','communs'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'invoice_sections_zone_check') then
    alter table public.invoice_sections
      add constraint invoice_sections_zone_check
      check (zone in ('interieur','exterieur','communs'));
  end if;
end $$;

create index if not exists idx_quotes_job_type on public.quotes (tenant_id, job_type);
create index if not exists idx_quotes_job_zone on public.quotes (tenant_id, job_zone);
create index if not exists idx_invoices_job_type on public.invoices (tenant_id, job_type);
create index if not exists idx_invoices_job_zone on public.invoices (tenant_id, job_zone);
create index if not exists idx_quote_sections_zone on public.quote_sections (tenant_id, zone);
create index if not exists idx_invoice_sections_zone on public.invoice_sections (tenant_id, zone);
