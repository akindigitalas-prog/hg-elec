alter table public.customers
  add column if not exists postal_code text,
  add column if not exists city text;
