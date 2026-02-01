-- Allow inviting users to an existing tenant
create table if not exists public.tenant_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'user')),
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index if not exists tenant_invites_unique_email
  on public.tenant_invites (tenant_id, lower(email));

alter table public.tenant_invites enable row level security;

create policy tenant_invites_select on public.tenant_invites
  for select using (tenant_id = public.current_tenant_id());

create policy tenant_invites_insert on public.tenant_invites
  for insert with check (tenant_id = public.current_tenant_id() and public.is_admin());

create policy tenant_invites_delete on public.tenant_invites
  for delete using (tenant_id = public.current_tenant_id() and public.is_admin());

-- Update auth trigger to attach invited users to an existing tenant
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
  v_invite public.tenant_invites%rowtype;
  v_role text;
  v_full_name text;
begin
  select *
    into v_invite
    from public.tenant_invites
   where lower(email) = lower(new.email)
     and accepted_at is null
   limit 1;

  v_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');

  if v_invite.id is not null then
    v_tenant_id := v_invite.tenant_id;
    v_role := coalesce(v_invite.role, 'user');
    update public.tenant_invites
       set accepted_at = now()
     where id = v_invite.id;
  else
    v_company_name := coalesce(new.raw_user_meta_data ->> 'company_name', 'Nouvelle entreprise');

    insert into public.tenants (name)
    values (v_company_name)
    returning id into v_tenant_id;

    v_role := 'admin';
  end if;

  insert into public.profiles (id, tenant_id, role, full_name, email)
  values (
    new.id,
    v_tenant_id,
    v_role,
    v_full_name,
    new.email
  );

  if v_invite.id is null then
    perform public.seed_catalog(v_tenant_id);
  end if;

  return new;
end;
$$;
