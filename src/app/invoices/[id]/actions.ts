'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { calculateTotals } from '@/lib/calc';
import { getPaymentStatus, sumPayments } from '@/lib/payments';
import type { ProductType } from '@/lib/constants';

async function ensureEditableInvoice(
  supabase: ReturnType<typeof createClient>,
  invoiceId: string
) {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, status, locked, job_zone')
    .eq('id', invoiceId)
    .single();

  if (!invoice) {
    return { error: 'Facture introuvable.' };
  }

  if (invoice.locked || invoice.status !== 'brouillon') {
    return { error: 'Facture verrouillee. Impossible de modifier.' };
  }

  return { invoice };
}

async function recalcInvoiceTotals(
  supabase: ReturnType<typeof createClient>,
  invoiceId: string
) {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('tenant_id')
    .eq('id', invoiceId)
    .single();
  const { data: tenant } = invoice?.tenant_id
    ? await supabase.from('tenants').select('vat_exempt').eq('id', invoice.tenant_id).single()
    : { data: null };
  const vatExempt = Boolean(tenant?.vat_exempt);

  const { data: items } = await supabase
    .from('invoice_items')
    .select('qty, internal_unit_price, vat_rate, item_type')
    .eq('invoice_id', invoiceId);

  const totals = calculateTotals(
    (items || []).map((item) => ({
      qty: Number(item.qty),
      internal_unit_price: Number(item.internal_unit_price),
      vat_rate: Number(item.vat_rate),
      item_type: (item.item_type || 'fourniture') as ProductType,
    })),
    { vatExempt }
  );

  await supabase.from('invoices').update({ totals }).eq('id', invoiceId);
}

async function getNextInvoiceSectionSortOrder(
  supabase: ReturnType<typeof createClient>,
  invoiceId: string
) {
  const { data } = await supabase
    .from('invoice_sections')
    .select('sort_order')
    .eq('invoice_id', invoiceId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const current = data?.[0]?.sort_order ?? 0;
  return Number(current) + 1;
}

async function getNextInvoiceItemSortOrder(
  supabase: ReturnType<typeof createClient>,
  invoiceId: string,
  sectionId?: string | null
) {
  let query = supabase
    .from('invoice_items')
    .select('sort_order')
    .eq('invoice_id', invoiceId)
    .order('sort_order', { ascending: false })
    .limit(1);

  if (sectionId) {
    query = query.eq('section_id', sectionId);
  } else {
    query = query.is('section_id', null);
  }

  const { data } = await query;
  const current = data?.[0]?.sort_order ?? 0;
  return Number(current) + 1;
}

export type InvoiceItemState = { error?: string; ok?: boolean };

export async function addInvoiceSection(
  invoiceId: string,
  _prevState: InvoiceItemState,
  formData: FormData
): Promise<InvoiceItemState> {
  const supabase = createClient();

  const guard = await ensureEditableInvoice(supabase, invoiceId);
  if ('error' in guard) return { error: guard.error };

  const name = String(formData.get('name') || '').trim();
  if (!name) return { error: 'Nom de piece requis.' };

  const sortOrder = await getNextInvoiceSectionSortOrder(supabase, invoiceId);
  const { error } = await supabase.from('invoice_sections').insert({
    invoice_id: invoiceId,
    name,
    zone: guard.invoice.job_zone || 'interieur',
    sort_order: sortOrder,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}

export async function addNumberedInvoiceSection(
  invoiceId: string,
  baseName: string
): Promise<InvoiceItemState> {
  const supabase = createClient();

  const guard = await ensureEditableInvoice(supabase, invoiceId);
  if ('error' in guard) return { error: guard.error };

  const normalized = String(baseName || '').trim();
  if (!normalized) return { error: 'Nom de piece invalide.' };

  const match = normalized.match(/^(.*?)(?:\s+(\d+))?$/);
  const base = (match?.[1] || normalized).trim();
  if (!base) return { error: 'Nom de piece invalide.' };

  const { data: sections, error } = await supabase
    .from('invoice_sections')
    .select('id, name')
    .eq('invoice_id', invoiceId);

  if (error) {
    return { error: error.message };
  }

  const escapedBase = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escapedBase}(?:\\s+(\\d+))?$`, 'i');
  const baseOnePattern = new RegExp(`^${escapedBase}\\s+1$`, 'i');
  const exactBasePattern = new RegExp(`^${escapedBase}$`, 'i');

  let updatedSections = sections || [];
  const exactBase = updatedSections.find((section) =>
    exactBasePattern.test(String(section.name || '').trim())
  );
  const hasBaseOne = updatedSections.some((section) =>
    baseOnePattern.test(String(section.name || '').trim())
  );

  if (exactBase && !hasBaseOne) {
    const { error: renameError } = await supabase
      .from('invoice_sections')
      .update({ name: `${base} 1` })
      .eq('id', exactBase.id)
      .eq('invoice_id', invoiceId);

    if (renameError) {
      return { error: renameError.message };
    }

    updatedSections = updatedSections.map((section) =>
      section.id === exactBase.id
        ? { ...section, name: `${base} 1` }
        : section
    );
  }

  let maxNumber = 0;
  updatedSections.forEach((section) => {
    const name = String(section.name || '').trim();
    const matchName = name.match(pattern);
    if (!matchName) return;
    if (!matchName[1]) {
      maxNumber = Math.max(maxNumber, 1);
      return;
    }
    const value = Number(matchName[1]);
    if (Number.isFinite(value)) {
      maxNumber = Math.max(maxNumber, value);
    }
  });

  const nextNumber = maxNumber + 1;
  const newName = `${base} ${nextNumber}`;
  const sortOrder = await getNextInvoiceSectionSortOrder(supabase, invoiceId);
  const { error: insertError } = await supabase.from('invoice_sections').insert({
    invoice_id: invoiceId,
    name: newName,
    zone: guard.invoice.job_zone || 'interieur',
    sort_order: sortOrder,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}

export async function renameInvoiceSection(
  invoiceId: string,
  sectionId: string,
  formData: FormData
) {
  const supabase = createClient();

  const guard = await ensureEditableInvoice(supabase, invoiceId);
  if ('error' in guard) return;

  const name = String(formData.get('name') || '').trim();
  if (!name) return;

  await supabase
    .from('invoice_sections')
    .update({ name })
    .eq('id', sectionId)
    .eq('invoice_id', invoiceId);

  revalidatePath(`/invoices/${invoiceId}`);
}

async function moveInvoiceSection(
  invoiceId: string,
  sectionId: string,
  direction: 'up' | 'down'
) {
  const supabase = createClient();

  const guard = await ensureEditableInvoice(supabase, invoiceId);
  if ('error' in guard) return;

  const { data: current } = await supabase
    .from('invoice_sections')
    .select('id, sort_order')
    .eq('id', sectionId)
    .eq('invoice_id', invoiceId)
    .single();

  if (!current) return;

  const operator = direction === 'up' ? 'lt' : 'gt';
  const ascending = direction === 'down';
  const { data: neighbor } = await supabase
    .from('invoice_sections')
    .select('id, sort_order')
    .eq('invoice_id', invoiceId)
    .filter('sort_order', operator, current.sort_order)
    .order('sort_order', { ascending })
    .limit(1)
    .maybeSingle();

  if (!neighbor) return;

  await supabase.from('invoice_sections').update({ sort_order: neighbor.sort_order }).eq('id', current.id);
  await supabase.from('invoice_sections').update({ sort_order: current.sort_order }).eq('id', neighbor.id);

  revalidatePath(`/invoices/${invoiceId}`);
}

export async function moveInvoiceSectionUp(invoiceId: string, sectionId: string) {
  await moveInvoiceSection(invoiceId, sectionId, 'up');
}

export async function moveInvoiceSectionDown(invoiceId: string, sectionId: string) {
  await moveInvoiceSection(invoiceId, sectionId, 'down');
}

export async function deleteInvoiceSection(
  invoiceId: string,
  sectionId: string
): Promise<InvoiceItemState> {
  const supabase = createClient();

  const guard = await ensureEditableInvoice(supabase, invoiceId);
  if ('error' in guard) return { error: guard.error };

  const { error } = await supabase
    .from('invoice_sections')
    .delete()
    .eq('id', sectionId)
    .eq('invoice_id', invoiceId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}

export async function addInvoiceItemFromProduct(
  invoiceId: string,
  _prevState: InvoiceItemState,
  formData: FormData
): Promise<InvoiceItemState> {
  const supabase = createClient();

  const guard = await ensureEditableInvoice(supabase, invoiceId);
  if ('error' in guard) return { error: guard.error };

  const productId = String(formData.get('product_id') || '').trim();
  const qty = Number(formData.get('qty') || 1);
  const sectionIdRaw = String(formData.get('section_id') || '').trim();
  const sectionId = sectionIdRaw ? sectionIdRaw : null;

  if (!productId || !Number.isFinite(qty) || qty <= 0) {
    return { error: 'Produit et quantite valides requis.' };
  }

  const { data: product } = await supabase
    .from('products')
    .select('id, name, unit, vat_rate, internal_unit_price, type')
    .eq('id', productId)
    .single();

  if (!product) {
    return { error: 'Produit introuvable.' };
  }

  const sortOrder = await getNextInvoiceItemSortOrder(supabase, invoiceId, sectionId);
  const { error } = await supabase.from('invoice_items').insert({
    invoice_id: invoiceId,
    product_id: product.id,
    section_id: sectionId,
    label: product.name,
    qty,
    unit: product.unit,
    vat_rate: product.vat_rate,
    internal_unit_price: product.internal_unit_price,
    item_type: product.type,
    sort_order: sortOrder,
  });

  if (error) {
    return { error: error.message };
  }

  await recalcInvoiceTotals(supabase, invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}

export async function addInvoiceFreeLine(
  invoiceId: string,
  _prevState: InvoiceItemState,
  formData: FormData
): Promise<InvoiceItemState> {
  const supabase = createClient();

  const guard = await ensureEditableInvoice(supabase, invoiceId);
  if ('error' in guard) return { error: guard.error };

  const label = String(formData.get('label') || '').trim();
  const qty = Number(formData.get('qty') || 1);
  const unit = String(formData.get('unit') || 'piece');
  const vatRate = Number(formData.get('vat_rate') || 20);
  const unitPrice = Number(formData.get('internal_unit_price') || 0);
  const itemType = String(formData.get('item_type') || 'fourniture');
  const sectionIdRaw = String(formData.get('section_id') || '').trim();
  const sectionId = sectionIdRaw ? sectionIdRaw : null;

  if (!label || !Number.isFinite(qty) || qty <= 0) {
    return { error: 'Designation et quantite valides requises.' };
  }

  if (!Number.isFinite(unitPrice)) {
    return { error: 'Prix de vente invalide.' };
  }

  const sortOrder = await getNextInvoiceItemSortOrder(supabase, invoiceId, sectionId);
  const { error } = await supabase.from('invoice_items').insert({
    invoice_id: invoiceId,
    section_id: sectionId,
    label,
    qty,
    unit,
    vat_rate: vatRate,
    internal_unit_price: unitPrice,
    item_type: itemType,
    sort_order: sortOrder,
  });

  if (error) {
    return { error: error.message };
  }

  await recalcInvoiceTotals(supabase, invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}

export async function deleteInvoiceItem(invoiceId: string, itemId: string) {
  const supabase = createClient();

  const guard = await ensureEditableInvoice(supabase, invoiceId);
  if ('error' in guard) return;

  await supabase.from('invoice_items').delete().eq('id', itemId).eq('invoice_id', invoiceId);
  await recalcInvoiceTotals(supabase, invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function updateInvoiceMeta(invoiceId: string, formData: FormData) {
  const supabase = createClient();

  const guard = await ensureEditableInvoice(supabase, invoiceId);
  if ('error' in guard) return;

  const jobType = String(formData.get('job_type') || 'maison');
  const showPrices = String(formData.get('show_prices') || 'false') === 'true';

  await supabase
    .from('invoices')
    .update({ job_type: jobType, show_prices: showPrices })
    .eq('id', invoiceId);

  revalidatePath(`/invoices/${invoiceId}`);
}

export async function updateInvoiceItem(
  invoiceId: string,
  itemId: string,
  formData: FormData
) {
  const supabase = createClient();

  const guard = await ensureEditableInvoice(supabase, invoiceId);
  if ('error' in guard) return;

  const qty = Number(formData.get('qty') || 1);
  const unitPrice = Number(formData.get('internal_unit_price') || 0);

  if (!Number.isFinite(qty) || qty <= 0) {
    return;
  }

  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    return;
  }

  await supabase
    .from('invoice_items')
    .update({ qty, internal_unit_price: unitPrice })
    .eq('id', itemId)
    .eq('invoice_id', invoiceId);

  await recalcInvoiceTotals(supabase, invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function updateInvoiceItemSection(formData: FormData) {
  const invoiceId = String(formData.get('invoice_id') || '').trim();
  const itemId = String(formData.get('item_id') || '').trim();
  if (!invoiceId || !itemId) {
    return;
  }
  const supabase = createClient();

  const guard = await ensureEditableInvoice(supabase, invoiceId);
  if ('error' in guard) return;

  const sectionIdRaw = String(formData.get('section_id') || '').trim();
  const sectionId = sectionIdRaw ? sectionIdRaw : null;
  const sortOrder = await getNextInvoiceItemSortOrder(supabase, invoiceId, sectionId);

  await supabase
    .from('invoice_items')
    .update({ section_id: sectionId, sort_order: sortOrder })
    .eq('id', itemId)
    .eq('invoice_id', invoiceId);

  await recalcInvoiceTotals(supabase, invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
}

export type PaymentState = { error?: string; ok?: boolean };

export async function addPayment(
  invoiceId: string,
  _prevState: PaymentState,
  formData: FormData
): Promise<PaymentState> {
  const supabase = createClient();

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, status, totals')
    .eq('id', invoiceId)
    .single();

  if (!invoice) {
    return { error: 'Facture introuvable.' };
  }

  if (invoice.status !== 'emise' && invoice.status !== 'partiellement_payee') {
    return { error: 'La facture doit etre emise.' };
  }

  const amount = Number(formData.get('amount') || 0);
  const method = String(formData.get('method') || '').trim() || 'virement';
  const paidAt = String(formData.get('paid_at') || '').trim();
  const note = String(formData.get('note') || '').trim() || null;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Montant invalide.' };
  }
  if (!paidAt) {
    return { error: 'Date de paiement requise.' };
  }

  const { error: insertError } = await supabase.from('payments').insert({
    invoice_id: invoiceId,
    amount,
    method,
    paid_at: paidAt,
    note,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('invoice_id', invoiceId);

  const totalPaid = sumPayments(payments as any);
  const totalTtc = Number(invoice.totals?.total_ttc || 0);
  const nextStatus = getPaymentStatus(totalTtc, totalPaid, invoice.status as any);

  if (nextStatus !== invoice.status) {
    await supabase
      .from('invoices')
      .update({ status: nextStatus })
      .eq('id', invoiceId);
  }

  revalidatePath('/invoices');
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}
