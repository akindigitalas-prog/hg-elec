alter table public.tenants
  add column if not exists vat_exempt boolean not null default false,
  add column if not exists vat_exempt_mention text;

create index if not exists idx_tenants_vat_exempt on public.tenants (vat_exempt);
