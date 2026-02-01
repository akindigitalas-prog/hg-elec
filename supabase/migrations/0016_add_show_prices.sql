-- Add show_prices flag for PDF display
alter table public.quotes
  add column if not exists show_prices boolean not null default false;

alter table public.invoices
  add column if not exists show_prices boolean not null default false;
