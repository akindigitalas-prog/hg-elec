-- Fix stack depth issue caused by recursive RLS on profiles/current_tenant_id

create or replace function public.current_tenant_id()
returns uuid
language sql
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select tenant_id from public.profiles where id = auth.uid();
$$;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select using (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update using (id = auth.uid())
with check (id = auth.uid());
