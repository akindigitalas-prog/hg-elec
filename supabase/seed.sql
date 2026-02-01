-- Seed default catalogue for all tenants
-- Usage: select public.seed_catalog('<TENANT_ID>');

select public.seed_catalog(id) from public.tenants;
