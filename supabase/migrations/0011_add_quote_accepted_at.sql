alter table public.quotes
  add column if not exists accepted_at date;
