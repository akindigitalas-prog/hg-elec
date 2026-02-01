'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

export type CustomerFormState = { error?: string };
export type CustomerUpdateState = { error?: string; ok?: boolean };

export async function createCustomer(
  _prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const supabase = createClient();

  const payload = {
    name: String(formData.get('name') || '').trim(),
    email: String(formData.get('email') || '').trim() || null,
    phone: String(formData.get('phone') || '').trim() || null,
    address: String(formData.get('address') || '').trim() || null,
    postal_code: String(formData.get('postal_code') || '').trim() || null,
    city: String(formData.get('city') || '').trim() || null,
    notes: String(formData.get('notes') || '').trim() || null,
    siret: String(formData.get('siret') || '').trim() || null,
  };

  if (!payload.name) {
    return { error: 'Nom requis.' };
  }

  const { error } = await supabase.from('customers').insert(payload);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/clients');
  return {};
}

export async function updateCustomer(
  customerId: string,
  _prevState: CustomerUpdateState,
  formData: FormData
): Promise<CustomerUpdateState> {
  const supabase = createClient();

  const payload = {
    name: String(formData.get('name') || '').trim(),
    email: String(formData.get('email') || '').trim() || null,
    phone: String(formData.get('phone') || '').trim() || null,
    address: String(formData.get('address') || '').trim() || null,
    postal_code: String(formData.get('postal_code') || '').trim() || null,
    city: String(formData.get('city') || '').trim() || null,
    notes: String(formData.get('notes') || '').trim() || null,
    siret: String(formData.get('siret') || '').trim() || null,
  };

  if (!payload.name) {
    return { error: 'Nom requis.' };
  }

  const { error } = await supabase.from('customers').update(payload).eq('id', customerId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath('/clients');
  return { ok: true };
}

export async function deleteCustomer(customerId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('customers').delete().eq('id', customerId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath('/clients');
}

