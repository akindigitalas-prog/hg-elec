import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const envPath = path.resolve('.env.local');
loadEnv(envPath);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const email = process.argv[2] || process.env.BOOTSTRAP_EMAIL || 'admin@hgelec.local';
const password = process.argv[3] || process.env.BOOTSTRAP_PASSWORD || 'ChangeMe123!';
const companyName = process.argv[4] || process.env.BOOTSTRAP_COMPANY || 'HG ELEC';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function ensureUser() {
  const { data: userList, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) {
    console.warn('Could not list users:', listError.message);
  }
  const existingUser = userList?.users?.find((user) => user.email === email);
  if (existingUser) return existingUser;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: 'Admin',
      company_name: companyName,
    },
  });

  if (error) throw error;
  if (!data?.user) throw new Error('User not created');
  return data.user;
}

async function waitForProfile(userId) {
  for (let i = 0; i < 10; i += 1) {
    const { data } = await supabase
      .from('profiles')
      .select('id, tenant_id, role')
      .eq('id', userId)
      .single();
    if (data?.tenant_id) return data;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Profile not found for user.');
}

async function seedCatalog(tenantId) {
  const { error } = await supabase.rpc('seed_catalog', { p_tenant: tenantId });
  if (error) throw error;

  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);
  return count ?? 0;
}

async function main() {
  const user = await ensureUser();
  const profile = await waitForProfile(user.id);

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('id', profile.tenant_id)
    .single();

  const count = await seedCatalog(profile.tenant_id);

  console.log('Bootstrap OK');
  console.log(`User: ${user.email}`);
  console.log(`Tenant: ${tenant?.name || companyName} (${profile.tenant_id})`);
  console.log(`Products seeded: ${count}`);
}

main().catch((err) => {
  console.error('Bootstrap failed:', err.message);
  process.exit(1);
});
