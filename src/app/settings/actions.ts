'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type SettingsState = { error?: string; ok?: boolean };
export type AccountState = { error?: string; ok?: boolean; message?: string };
export type InviteState = { error?: string; ok?: boolean; message?: string };

export async function updateTenantSettings(
  _prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const supabase = createClient();

  const { data: tenant } = await supabase.from('tenants').select('id').single();

  if (!tenant?.id) {
    return { error: 'Entreprise introuvable.' };
  }

  const logoFile = formData.get('logo');
  let logoUrl: string | null = null;
  if (logoFile instanceof File && logoFile.size > 0) {
    if (!logoFile.type.startsWith('image/')) {
      return { error: 'Le logo doit etre une image.' };
    }
    if (logoFile.size > 2 * 1024 * 1024) {
      return { error: 'Logo trop lourd (max 2 Mo).' };
    }

    const extFromName = logoFile.name.split('.').pop()?.toLowerCase();
    const safeExt = extFromName && extFromName.length <= 5 ? extFromName : 'png';
    const filePath = `${tenant.id}/logo-${Date.now()}.${safeExt}`;

    const admin = createAdminClient();
    const buffer = Buffer.from(await logoFile.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from('logos')
      .upload(filePath, buffer, {
        contentType: logoFile.type || 'image/png',
        upsert: true,
      });

    if (uploadError) {
      return { error: `Upload logo impossible: ${uploadError.message}` };
    }

    const { data: publicData } = admin.storage.from('logos').getPublicUrl(filePath);
    logoUrl = publicData?.publicUrl ?? null;
  }

  const depositRaw = String(formData.get('deposit_percent') || '').trim();
  const depositValue = depositRaw === '' ? null : Number(depositRaw);
  if (depositValue !== null && (!Number.isFinite(depositValue) || depositValue < 0 || depositValue > 100)) {
    return { error: 'Acompte invalide (0 a 100%).' };
  }

  const payload = {
    name: String(formData.get('name') || '').trim(),
    contact_first_name: String(formData.get('contact_first_name') || '').trim() || null,
    contact_last_name: String(formData.get('contact_last_name') || '').trim() || null,
    address: String(formData.get('address') || '').trim() || null,
    postal_code: String(formData.get('postal_code') || '').trim() || null,
    city: String(formData.get('city') || '').trim() || null,
    siret: String(formData.get('siret') || '').trim() || null,
    phone: String(formData.get('phone') || '').trim() || null,
    email: String(formData.get('email') || '').trim() || null,
    vat_number: String(formData.get('vat_number') || '').trim() || null,
    vat_exempt: formData.get('vat_exempt') === 'on',
    vat_exempt_mention: String(formData.get('vat_exempt_mention') || '').trim() || null,
    deposit_percent: depositValue,
    insurance_name: String(formData.get('insurance_name') || '').trim() || null,
    insurance_origin: String(formData.get('insurance_origin') || '').trim() || null,
    insurance_contract: String(formData.get('insurance_contract') || '').trim() || null,
    ...(logoUrl ? { logo_url: logoUrl } : {}),
  };

  if (!payload.name) {
    return { error: 'La designation sociale est obligatoire.' };
  }
  if (payload.vat_exempt && !payload.vat_exempt_mention) {
    return { error: 'La mention legale TVA est obligatoire si TVA non applicable.' };
  }

  const { error } = await supabase.from('tenants').update(payload).eq('id', tenant.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/settings');
  revalidatePath('/quotes');
  revalidatePath('/invoices');
  return { ok: true };
}

export async function updateAuthEmail(
  _prevState: AccountState,
  formData: FormData
): Promise<AccountState> {
  const supabase = createClient();
  const email = String(formData.get('auth_email') || '').trim().toLowerCase();

  if (!email) {
    return { error: 'Email obligatoire.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Email invalide.' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Utilisateur non connecte.' };
  }

  const { error } = await supabase.auth.updateUser({ email });
  if (error) {
    return { error: error.message };
  }

  revalidatePath('/settings');
  return {
    ok: true,
    message: 'Email mis a jour. Verifiez votre boite mail si confirmation requise.',
  };
}

export async function updateAuthPassword(
  _prevState: AccountState,
  formData: FormData
): Promise<AccountState> {
  const supabase = createClient();
  const password = String(formData.get('new_password') || '');
  const confirmPassword = String(formData.get('confirm_password') || '');

  if (!password || password.length < 8) {
    return { error: 'Le mot de passe doit contenir au moins 8 caracteres.' };
  }
  if (password !== confirmPassword) {
    return { error: 'Les mots de passe ne correspondent pas.' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Utilisateur non connecte.' };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  revalidatePath('/settings');
  return { ok: true, message: 'Mot de passe mis a jour.' };
}

export async function inviteTenantUser(
  _prevState: InviteState,
  formData: FormData
): Promise<InviteState> {
  const supabase = createClient();
  const admin = createAdminClient();

  const email = String(formData.get('invite_email') || '').trim().toLowerCase();
  const roleRaw = String(formData.get('invite_role') || 'user').trim().toLowerCase();
  const role = roleRaw === 'admin' ? 'admin' : 'user';

  if (!email) {
    return { error: 'Email obligatoire.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Email invalide.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, tenant_id, role')
    .single();

  if (!profile?.tenant_id) {
    return { error: 'Entreprise introuvable.' };
  }
  if (profile.role !== 'admin') {
    return { error: 'Action reservee a un administrateur.' };
  }

  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id, tenant_id')
    .eq('email', email)
    .maybeSingle();

  if (existingProfile) {
    return { error: 'Un compte existe deja avec cet email.' };
  }

  const { error: inviteInsertError } = await supabase.from('tenant_invites').insert({
    tenant_id: profile.tenant_id,
    email,
    role,
    invited_by: profile.id,
  });

  if (inviteInsertError) {
    if (inviteInsertError.code === '23505') {
      return { error: 'Invitation deja envoyee.' };
    }
    return { error: inviteInsertError.message };
  }

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);
  if (inviteError) {
    await admin
      .from('tenant_invites')
      .delete()
      .eq('tenant_id', profile.tenant_id)
      .eq('email', email);
    return { error: inviteError.message };
  }

  revalidatePath('/settings');
  return { ok: true, message: 'Invitation envoyee par email.' };
}
