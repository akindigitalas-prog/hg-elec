alter table public.tenants
  add column if not exists contact_first_name text,
  add column if not exists contact_last_name text;
