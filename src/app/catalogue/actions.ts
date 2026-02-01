'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

export type ProductFormState = { error?: string };

export async function createProduct(
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const supabase = createClient();

  const internalUnitRaw = String(formData.get('internal_unit_price') || '').trim();
  const payload = {
    name: String(formData.get('name') || '').trim(),
    category: String(formData.get('category') || '').trim(),
    subcategory: String(formData.get('subcategory') || '').trim() || null,
    brand: String(formData.get('brand') || '').trim() || null,
    sku: String(formData.get('sku') || '').trim() || null,
    unit: String(formData.get('unit') || 'piece'),
    vat_rate: Number(formData.get('vat_rate') || 20),
    internal_unit_price: internalUnitRaw === '' ? NaN : Number(internalUnitRaw),
    internal_cost: Number(formData.get('internal_cost') || 0) || null,
    type: String(formData.get('type') || 'fourniture'),
    active: true,
    description: String(formData.get('description') || '').trim() || null,
  };

  if (!payload.name || !payload.category) {
    return { error: 'Nom et categorie requis.' };
  }

  if (!Number.isFinite(payload.internal_unit_price)) {
    return { error: 'Prix de vente requis.' };
  }

  const { error } = await supabase.from('products').insert(payload);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/catalogue');
  return {};
}

export async function updateProductPrice(
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const supabase = createClient();

  const productId = String(formData.get('product_id') || '').trim();
  const internalUnitRaw = String(formData.get('internal_unit_price') || '').trim();
  const internalCostRaw = String(formData.get('internal_cost') || '').trim();

  if (!productId) {
    return { error: 'Produit introuvable.' };
  }

  const internal_unit_price = internalUnitRaw === '' ? NaN : Number(internalUnitRaw);
  if (!Number.isFinite(internal_unit_price)) {
    return { error: 'Prix de vente requis.' };
  }

  const internal_cost =
    internalCostRaw === '' ? null : Number.isFinite(Number(internalCostRaw)) ? Number(internalCostRaw) : null;

  const { error } = await supabase
    .from('products')
    .update({ internal_unit_price, internal_cost })
    .eq('id', productId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/catalogue');
  return {};
}

