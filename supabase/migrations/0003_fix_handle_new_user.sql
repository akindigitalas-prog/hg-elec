-- Ensure auth trigger can insert tenant/profile without RLS recursion/denial
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
set row_security = off
as $$
declare
  v_tenant_id uuid;
  v_company_name text;
begin
  v_company_name := coalesce(new.raw_user_meta_data ->> 'company_name', 'Nouvelle entreprise');

  insert into public.tenants (name)
  values (v_company_name)
  returning id into v_tenant_id;

  insert into public.profiles (id, tenant_id, role, full_name, email)
  values (
    new.id,
    v_tenant_id,
    'admin',
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  );

  return new;
end;
$$;
