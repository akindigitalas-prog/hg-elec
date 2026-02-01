'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { applyVatExemptTotals, calculateTotals } from '@/lib/calc';
import { createClient } from '@/lib/supabase/server';
import type { ProductType } from '@/lib/constants';

export type QuoteItemState = { error?: string; ok?: boolean };

async function getNextItemSortOrder(
  supabase: ReturnType<typeof createClient>,
  quoteId: string,
  sectionId?: string | null
) {
  let query = supabase
    .from('quote_items')
    .select('sort_order')
    .eq('quote_id', quoteId)
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

async function getNextSectionSortOrder(
  supabase: ReturnType<typeof createClient>,
  quoteId: string
) {
  const { data } = await supabase
    .from('quote_sections')
    .select('sort_order')
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const current = data?.[0]?.sort_order ?? 0;
  return Number(current) + 1;
}

async function recalcQuoteTotals(supabase: ReturnType<typeof createClient>, quoteId: string) {
  const { data: quote } = await supabase
    .from('quotes')
    .select('tenant_id')
    .eq('id', quoteId)
    .single();
  const { data: tenant } = quote?.tenant_id
    ? await supabase.from('tenants').select('vat_exempt').eq('id', quote.tenant_id).single()
    : { data: null };
  const vatExempt = Boolean(tenant?.vat_exempt);

  const { data: items } = await supabase
    .from('quote_items')
    .select('qty, internal_unit_price, vat_rate, item_type')
    .eq('quote_id', quoteId);

  const totals = calculateTotals(
    (items || []).map((item) => ({
      qty: Number(item.qty),
      internal_unit_price: Number(item.internal_unit_price),
      vat_rate: Number(item.vat_rate),
      item_type: (item.item_type || 'fourniture') as ProductType,
    })),
    { vatExempt }
  );

  await supabase.from('quotes').update({ totals }).eq('id', quoteId);
}

async function ensureEditableQuote(supabase: ReturnType<typeof createClient>, quoteId: string) {
  const { data: quote } = await supabase
    .from('quotes')
    .select('id, locked, status, job_zone, job_type')
    .eq('id', quoteId)
    .single();

  if (!quote) {
    return { error: 'Devis introuvable.' };
  }

  if (quote.locked || quote.status !== 'brouillon') {
    return { error: 'Devis verrouille. Impossible de modifier.' };
  }

  return { quote };
}

export async function updateQuoteMeta(quoteId: string, formData: FormData) {
  const supabase = createClient();

  const guard = await ensureEditableQuote(supabase, quoteId);
  if ('error' in guard) return;

  const jobType = String(formData.get('job_type') || 'maison');
  const depositRaw = String(formData.get('deposit_percent') || '').trim();
  const depositValue = depositRaw === '' ? null : Number(depositRaw);
  const validUntilRaw = String(formData.get('valid_until') || '').trim();
  const validUntil = validUntilRaw ? validUntilRaw : null;
  const showPrices = String(formData.get('show_prices') || 'false') === 'true';
  if (depositValue !== null && (!Number.isFinite(depositValue) || depositValue < 0 || depositValue > 100)) {
    return;
  }

  await supabase
    .from('quotes')
    .update({
      job_type: jobType,
      deposit_percent: depositValue,
      valid_until: validUntil,
      show_prices: showPrices,
    })
    .eq('id', quoteId);

  revalidatePath(`/quotes/${quoteId}`);
}

export async function addQuoteSection(
  quoteId: string,
  _prevState: QuoteItemState,
  formData: FormData
): Promise<QuoteItemState> {
  const supabase = createClient();

  const guard = await ensureEditableQuote(supabase, quoteId);
  if ('error' in guard) return { error: guard.error };

  const name = String(formData.get('name') || '').trim();
  if (!name) return { error: 'Nom de piece requis.' };

  const sortOrder = await getNextSectionSortOrder(supabase, quoteId);
  const { error } = await supabase.from('quote_sections').insert({
    quote_id: quoteId,
    name,
    zone: guard.quote.job_zone || 'interieur',
    sort_order: sortOrder,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/quotes/${quoteId}`);
  return { ok: true };
}

export async function addNumberedSection(
  quoteId: string,
  baseName: string
): Promise<QuoteItemState> {
  const supabase = createClient();

  const guard = await ensureEditableQuote(supabase, quoteId);
  if ('error' in guard) return { error: guard.error };

  const normalized = String(baseName || '').trim();
  if (!normalized) return { error: 'Nom de piece invalide.' };

  const match = normalized.match(/^(.*?)(?:\s+(\d+))?$/);
  const base = (match?.[1] || normalized).trim();
  if (!base) return { error: 'Nom de piece invalide.' };

  const { data: sections, error } = await supabase
    .from('quote_sections')
    .select('id, name')
    .eq('quote_id', quoteId);

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
      .from('quote_sections')
      .update({ name: `${base} 1` })
      .eq('id', exactBase.id)
      .eq('quote_id', quoteId);

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
  const sortOrder = await getNextSectionSortOrder(supabase, quoteId);
  const { error: insertError } = await supabase.from('quote_sections').insert({
    quote_id: quoteId,
    name: newName,
    zone: guard.quote.job_zone || 'interieur',
    sort_order: sortOrder,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath(`/quotes/${quoteId}`);
  return { ok: true };
}

export async function renameQuoteSection(
  quoteId: string,
  sectionId: string,
  formData: FormData
) {
  const supabase = createClient();

  const guard = await ensureEditableQuote(supabase, quoteId);
  if ('error' in guard) return;

  const name = String(formData.get('name') || '').trim();
  if (!name) return;

  await supabase
    .from('quote_sections')
    .update({ name })
    .eq('id', sectionId)
    .eq('quote_id', quoteId);

  revalidatePath(`/quotes/${quoteId}`);
}

async function moveQuoteSection(
  quoteId: string,
  sectionId: string,
  direction: 'up' | 'down'
) {
  const supabase = createClient();

  const guard = await ensureEditableQuote(supabase, quoteId);
  if ('error' in guard) return;

  const { data: current } = await supabase
    .from('quote_sections')
    .select('id, sort_order')
    .eq('id', sectionId)
    .eq('quote_id', quoteId)
    .single();

  if (!current) return;

  const operator = direction === 'up' ? 'lt' : 'gt';
  const ascending = direction === 'down';
  const { data: neighbor } = await supabase
    .from('quote_sections')
    .select('id, sort_order')
    .eq('quote_id', quoteId)
    .filter('sort_order', operator, current.sort_order)
    .order('sort_order', { ascending })
    .limit(1)
    .maybeSingle();

  if (!neighbor) return;

  await supabase.from('quote_sections').update({ sort_order: neighbor.sort_order }).eq('id', current.id);
  await supabase.from('quote_sections').update({ sort_order: current.sort_order }).eq('id', neighbor.id);

  revalidatePath(`/quotes/${quoteId}`);
}

export async function moveQuoteSectionUp(quoteId: string, sectionId: string) {
  await moveQuoteSection(quoteId, sectionId, 'up');
}

export async function moveQuoteSectionDown(quoteId: string, sectionId: string) {
  await moveQuoteSection(quoteId, sectionId, 'down');
}

export async function deleteQuoteSection(
  quoteId: string,
  sectionId: string
): Promise<QuoteItemState> {
  const supabase = createClient();

  const guard = await ensureEditableQuote(supabase, quoteId);
  if ('error' in guard) return { error: guard.error };

  const { error } = await supabase
    .from('quote_sections')
    .delete()
    .eq('id', sectionId)
    .eq('quote_id', quoteId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/quotes/${quoteId}`);
  return { ok: true };
}

export async function addQuoteItemFromProduct(
  quoteId: string,
  _prevState: QuoteItemState,
  formData: FormData
): Promise<QuoteItemState> {
  const supabase = createClient();

  const guard = await ensureEditableQuote(supabase, quoteId);
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

  const sortOrder = await getNextItemSortOrder(supabase, quoteId, sectionId);
  const { error } = await supabase.from('quote_items').insert({
    quote_id: quoteId,
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

  await recalcQuoteTotals(supabase, quoteId);
  revalidatePath(`/quotes/${quoteId}`);
  return { ok: true };
}

export async function addQuoteFreeLine(
  quoteId: string,
  _prevState: QuoteItemState,
  formData: FormData
): Promise<QuoteItemState> {
  const supabase = createClient();

  const guard = await ensureEditableQuote(supabase, quoteId);
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

  const sortOrder = await getNextItemSortOrder(supabase, quoteId, sectionId);
  const { error } = await supabase.from('quote_items').insert({
    quote_id: quoteId,
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

  await recalcQuoteTotals(supabase, quoteId);
  revalidatePath(`/quotes/${quoteId}`);
  return { ok: true };
}

export async function deleteQuoteItem(quoteId: string, itemId: string) {
  const supabase = createClient();

  const guard = await ensureEditableQuote(supabase, quoteId);
  if ('error' in guard) return;

  await supabase.from('quote_items').delete().eq('id', itemId).eq('quote_id', quoteId);
  await recalcQuoteTotals(supabase, quoteId);
  revalidatePath(`/quotes/${quoteId}`);
}

export async function updateQuoteItemSection(formData: FormData) {
  const quoteId = String(formData.get('quote_id') || '').trim();
  const itemId = String(formData.get('item_id') || '').trim();
  if (!quoteId || !itemId) {
    return;
  }
  const supabase = createClient();

  const guard = await ensureEditableQuote(supabase, quoteId);
  if ('error' in guard) return;

  const sectionIdRaw = String(formData.get('section_id') || '').trim();
  const sectionId = sectionIdRaw ? sectionIdRaw : null;
  const sortOrder = await getNextItemSortOrder(supabase, quoteId, sectionId);

  await supabase
    .from('quote_items')
    .update({ section_id: sectionId, sort_order: sortOrder })
    .eq('id', itemId)
    .eq('quote_id', quoteId);

  await recalcQuoteTotals(supabase, quoteId);
  revalidatePath(`/quotes/${quoteId}`);
}

export async function updateQuoteItem(
  quoteId: string,
  itemId: string,
  formData: FormData
): Promise<void> {
  const supabase = createClient();

  const guard = await ensureEditableQuote(supabase, quoteId);
  if ('error' in guard) return;

  const qty = Number(formData.get('qty') || 1);
  const unitPrice = Number(formData.get('internal_unit_price') || 0);

  if (!Number.isFinite(qty) || qty <= 0) {
    return;
  }

  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    return;
  }

  const { error } = await supabase
    .from('quote_items')
    .update({ qty, internal_unit_price: unitPrice })
    .eq('id', itemId)
    .eq('quote_id', quoteId);

  if (error) {
    return;
  }

  await recalcQuoteTotals(supabase, quoteId);
  revalidatePath(`/quotes/${quoteId}`);
}

export async function updateQuoteItemPrice(
  quoteId: string,
  itemId: string,
  _prevState: QuoteItemState,
  formData: FormData
): Promise<QuoteItemState> {
  const supabase = createClient();

  const guard = await ensureEditableQuote(supabase, quoteId);
  if ('error' in guard) return { error: guard.error };

  const unitPrice = Number(formData.get('internal_unit_price') || 0);

  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    return { error: 'Prix de vente invalide.' };
  }

  const { error } = await supabase
    .from('quote_items')
    .update({ internal_unit_price: unitPrice })
    .eq('id', itemId)
    .eq('quote_id', quoteId);

  if (error) {
    return { error: error.message };
  }

  await recalcQuoteTotals(supabase, quoteId);
  revalidatePath(`/quotes/${quoteId}`);
  return { ok: true };
}

export type ConvertState = { error?: string };

export async function validateQuote(
  quoteId: string,
  _prevState?: QuoteItemState
): Promise<QuoteItemState> {
  const supabase = createClient();

  const { data: quote } = await supabase
    .from('quotes')
    .select('id, locked, status')
    .eq('id', quoteId)
    .single();

  if (!quote) {
    return { error: 'Devis introuvable.' };
  }

  if (quote.locked || quote.status !== 'brouillon') {
    return { error: 'Devis deja verrouille.' };
  }

  const { error } = await supabase
    .from('quotes')
    .update({ locked: true, status: 'envoye', sent_at: new Date().toISOString() })
    .eq('id', quoteId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath('/quotes');
  redirect('/quotes');
}

export async function markQuoteAccepted(quoteId: string): Promise<QuoteItemState> {
  const supabase = createClient();

  const { data: quote } = await supabase
    .from('quotes')
    .select('id, status')
    .eq('id', quoteId)
    .single();

  if (!quote) {
    return { error: 'Devis introuvable.' };
  }
  if (quote.status !== 'envoye') {
    return { error: 'Le devis doit etre envoye.' };
  }

  const { error } = await supabase
    .from('quotes')
    .update({ status: 'accepte', locked: true, accepted_at: new Date().toISOString().slice(0, 10) })
    .eq('id', quoteId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath('/quotes');
  return { ok: true };
}

export async function markQuoteRefused(quoteId: string): Promise<QuoteItemState> {
  const supabase = createClient();

  const { data: quote } = await supabase
    .from('quotes')
    .select('id, status')
    .eq('id', quoteId)
    .single();

  if (!quote) {
    return { error: 'Devis introuvable.' };
  }
  if (quote.status !== 'envoye') {
    return { error: 'Le devis doit etre envoye.' };
  }

  const { error } = await supabase
    .from('quotes')
    .update({ status: 'refuse', locked: true })
    .eq('id', quoteId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath('/quotes');
  return { ok: true };
}

export async function convertQuoteToInvoice(
  quoteId: string,
  _prevState?: ConvertState
): Promise<ConvertState> {
  const supabase = createClient();

  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .single();

  if (!quote) {
    return { error: 'Devis introuvable.' };
  }

  const today = new Date().toISOString().slice(0, 10);
  if (quote.valid_until && quote.valid_until < today) {
    return { error: 'Devis expire.' };
  }

  if (quote.status !== 'accepte') {
    return { error: 'Le devis doit etre accepte avant conversion.' };
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('vat_exempt, payment_terms_days')
    .eq('id', quote.tenant_id)
    .single();
  const vatExempt = Boolean(tenant?.vat_exempt);
  const totals = applyVatExemptTotals(quote.totals, vatExempt);

  const { data: existing } = await supabase
    .from('invoices')
    .select('id')
    .eq('quote_id', quoteId)
    .eq('kind', 'final')
    .maybeSingle();

  if (existing?.id) {
    return { error: 'Une facture finale existe deja pour ce devis.' };
  }

  const { data: sections } = await supabase
    .from('quote_sections')
    .select('*')
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });

  const { data: items } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });

  const paymentTerms =
    typeof tenant?.payment_terms_days === 'number' ? tenant.payment_terms_days : null;

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      customer_id: quote.customer_id,
      quote_id: quote.id,
      status: 'brouillon',
      issue_date: today,
      due_date: null,
      payment_terms_days: paymentTerms,
      locked: false,
      kind: 'final',
      totals,
      show_prices: quote.show_prices ?? false,
      job_type: quote.job_type,
      job_zone: quote.job_zone,
    })
    .select('id')
    .single();

  if (invoiceError) {
    return { error: invoiceError.message };
  }
  if (!invoice) {
    return { error: 'Creation facture impossible.' };
  }

  const sectionIdMap = new Map<string, string>();
  if (sections && sections.length > 0) {
    const { data: newSections } = await supabase
      .from('invoice_sections')
      .insert(
        sections.map((section) => ({
          invoice_id: invoice.id,
          name: section.name,
          sort_order: section.sort_order,
          zone: section.zone || quote.job_zone || 'interieur',
        }))
      )
      .select('id');

    if (newSections) {
      sections.forEach((section, index) => {
        const newId = newSections[index]?.id;
        if (newId) {
          sectionIdMap.set(section.id, newId);
        }
      });
    }
  }

  if (items && items.length > 0) {
    const { error: itemsError } = await supabase.from('invoice_items').insert(
      items.map((item) => ({
        invoice_id: invoice.id,
        product_id: item.product_id,
        section_id: item.section_id ? sectionIdMap.get(item.section_id) ?? null : null,
        label: item.label,
        qty: item.qty,
        unit: item.unit,
        vat_rate: item.vat_rate,
        internal_unit_price: item.internal_unit_price,
        item_type: item.item_type,
          sort_order: item.sort_order,
        }))
      );
    if (itemsError) {
      return { error: itemsError.message };
    }
  }

  revalidatePath('/invoices');
  redirect('/invoices');
}

export async function duplicateQuoteAndRedirect(formData: FormData): Promise<void> {
  const quoteId = String(formData.get('quote_id') || '').trim();
  if (!quoteId) {
    throw new Error('Devis introuvable.');
  }
  const supabase = createClient();

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .single();

  if (quoteError || !quote) {
    throw new Error(quoteError?.message || 'Devis introuvable.');
  }

  const { data: sections } = await supabase
    .from('quote_sections')
    .select('*')
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });

  const { data: items } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });

  const today = new Date().toISOString().slice(0, 10);
  const validUntil = (() => {
    const base = new Date(`${today}T00:00:00`);
    base.setDate(base.getDate() + 30);
    return base.toISOString().slice(0, 10);
  })();

  const { data: newQuote } = await supabase
    .from('quotes')
    .insert({
      customer_id: quote.customer_id,
      status: 'brouillon',
      issue_date: today,
      valid_until: validUntil,
      notes: quote.notes,
      locked: false,
      totals: quote.totals,
      display_mode: quote.display_mode,
      show_prices: quote.show_prices ?? false,
      job_type: quote.job_type,
      job_zone: quote.job_zone,
      deposit_percent: quote.deposit_percent,
    })
    .select('id')
    .single();

  if (!newQuote?.id) {
    throw new Error('Duplication impossible.');
  }

  const sectionIdMap = new Map<string, string>();
  if (sections && sections.length > 0) {
    const { data: newSections } = await supabase
      .from('quote_sections')
      .insert(
        sections.map((section) => ({
          quote_id: newQuote.id,
          name: section.name,
          sort_order: section.sort_order,
          zone: section.zone || quote.job_zone || 'interieur',
        }))
      )
      .select('id');

    if (newSections) {
      sections.forEach((section, index) => {
        const newId = newSections[index]?.id;
        if (newId) sectionIdMap.set(section.id, newId);
      });
    }
  }

  if (items && items.length > 0) {
    await supabase.from('quote_items').insert(
      items.map((item) => ({
        quote_id: newQuote.id,
        product_id: item.product_id,
        section_id: item.section_id ? sectionIdMap.get(item.section_id) ?? null : null,
        label: item.label,
        qty: item.qty,
        unit: item.unit,
        vat_rate: item.vat_rate,
        internal_unit_price: item.internal_unit_price,
        item_type: item.item_type,
        sort_order: item.sort_order,
      }))
    );
  }

  revalidatePath('/quotes');
  redirect(`/quotes/${newQuote.id}`);
}
export async function createDepositInvoice(
  quoteId: string,
  _prevState: ConvertState,
  formData: FormData
): Promise<ConvertState> {
  const supabase = createClient();

  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .single();

  if (!quote) {
    return { error: 'Devis introuvable.' };
  }

  const today = new Date().toISOString().slice(0, 10);
  if (quote.valid_until && quote.valid_until < today) {
    return { error: 'Devis expire.' };
  }

  if (quote.status !== 'accepte' && quote.status !== 'envoye') {
    return { error: 'Le devis doit etre accepte ou envoye.' };
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('vat_exempt, payment_terms_days')
    .eq('id', quote.tenant_id)
    .single();

  const vatExempt = Boolean(tenant?.vat_exempt);
  const totals = applyVatExemptTotals(quote.totals, vatExempt);

  const amountRaw = String(formData.get('amount') || '').trim();
  const percentRaw = String(formData.get('percent') || '').trim();
  const amountValue = amountRaw ? Number(amountRaw) : null;
  const percentValue = percentRaw ? Number(percentRaw) : null;

  let percent = percentValue;
  if (!percent && typeof quote.deposit_percent === 'number') {
    percent = quote.deposit_percent;
  }

  let amount = amountValue;
  if ((!amount || amount <= 0) && percent && percent > 0) {
    amount = Number(((totals.total_ttc * percent) / 100).toFixed(2));
  }

  if (!amount || !Number.isFinite(amount) || amount <= 0) {
    return { error: 'Montant d acompte invalide.' };
  }

  const vatRate = vatExempt ? 0 : 20;
  const ht = vatRate > 0 ? Number((amount / (1 + vatRate / 100)).toFixed(2)) : amount;
  const tva = Number((amount - ht).toFixed(2));
  const depositTotals = {
    total_ht: ht,
    total_tva: tva,
    total_ttc: amount,
    total_supplies_ht: ht,
    total_labor_ht: 0,
    total_travel_ht: 0,
  };

  const paymentTerms =
    typeof tenant?.payment_terms_days === 'number' ? tenant.payment_terms_days : null;

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      customer_id: quote.customer_id,
      quote_id: quote.id,
      status: 'brouillon',
      issue_date: today,
      due_date: null,
      payment_terms_days: paymentTerms,
      locked: false,
      kind: 'deposit',
      totals: depositTotals,
      show_prices: quote.show_prices ?? false,
      job_type: quote.job_type,
      job_zone: quote.job_zone,
    })
    .select('id')
    .single();

  if (invoiceError) {
    return { error: invoiceError.message };
  }
  if (!invoice) {
    return { error: 'Creation facture acompte impossible.' };
  }

  const label = percent ? `Acompte ${percent}%` : 'Acompte';

  const { error: depositItemError } = await supabase.from('invoice_items').insert({
    invoice_id: invoice.id,
    product_id: null,
    section_id: null,
    label,
    qty: 1,
    unit: 'piece',
    vat_rate: vatRate,
    internal_unit_price: ht,
    item_type: 'fourniture',
    sort_order: 1,
  });
  if (depositItemError) {
    return { error: depositItemError.message };
  }

  revalidatePath('/invoices');
  redirect(`/invoices/${invoice.id}`);
}
