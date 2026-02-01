-- Quote sections (pieces/zones)
create table public.quote_sections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants on delete cascade,
  quote_id uuid not null references public.quotes on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, quote_id)
);

create table public.invoice_sections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants on delete cascade,
  invoice_id uuid not null references public.invoices on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, invoice_id)
);

alter table public.quote_items
  add column if not exists section_id uuid;

alter table public.invoice_items
  add column if not exists section_id uuid;

alter table public.quote_items
  add constraint quote_items_section_fk
  foreign key (section_id, quote_id)
  references public.quote_sections (id, quote_id)
  on delete set null;

alter table public.invoice_items
  add constraint invoice_items_section_fk
  foreign key (section_id, invoice_id)
  references public.invoice_sections (id, invoice_id)
  on delete set null;

create index if not exists idx_quote_sections_tenant on public.quote_sections (tenant_id, quote_id);
create index if not exists idx_invoice_sections_tenant on public.invoice_sections (tenant_id, invoice_id);

alter table public.quote_sections enable row level security;
alter table public.invoice_sections enable row level security;

create policy quote_sections_tenant on public.quote_sections
  for all using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy invoice_sections_tenant on public.invoice_sections
  for all using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());
