'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

export type QuoteFormState = { error?: string; id?: string };

export async function createQuote(
  _prevState: QuoteFormState,
  formData: FormData
): Promise<QuoteFormState> {
  const supabase = createClient();

  const { data: tenant } = await supabase.from('tenants').select('deposit_percent').single();
  const depositRaw = String(formData.get('deposit_percent') || '').trim();
  const depositValue = depositRaw === '' ? null : Number(depositRaw);
  if (depositValue !== null && (!Number.isFinite(depositValue) || depositValue < 0 || depositValue > 100)) {
    return { error: "Acompte invalide (0 a 100%)." };
  }

  const customerIdRaw = String(formData.get('customer_id') || '').trim();
  const newCustomerName = String(formData.get('new_customer_name') || '').trim();
  const newCustomerEmail = String(formData.get('new_customer_email') || '').trim() || null;
  const newCustomerPhone = String(formData.get('new_customer_phone') || '').trim() || null;
  const newCustomerAddress = String(formData.get('new_customer_address') || '').trim() || null;
  const newCustomerPostal = String(formData.get('new_customer_postal_code') || '').trim() || null;
  const newCustomerCity = String(formData.get('new_customer_city') || '').trim() || null;

  let resolvedCustomerId = customerIdRaw;
  if (!resolvedCustomerId && newCustomerName) {
    const { data: newCustomer, error: newCustomerError } = await supabase
      .from('customers')
      .insert({
        name: newCustomerName,
        email: newCustomerEmail,
        phone: newCustomerPhone,
        address: newCustomerAddress,
        postal_code: newCustomerPostal,
        city: newCustomerCity,
      })
      .select('id')
      .single();

    if (newCustomerError) {
      return { error: newCustomerError.message };
    }

    resolvedCustomerId = newCustomer?.id || '';
  }

  const issueDate = String(formData.get('issue_date') || '').trim();
  const validUntilDefault = (() => {
    if (!issueDate) return null;
    const base = new Date(`${issueDate}T00:00:00`);
    if (Number.isNaN(base.getTime())) return null;
    base.setDate(base.getDate() + 30);
    return base.toISOString().slice(0, 10);
  })();

  const payload = {
    customer_id: resolvedCustomerId,
    issue_date: issueDate,
    valid_until: validUntilDefault,
    status: 'brouillon',
    locked: false,
    display_mode: String(formData.get('display_mode') || 'total_only'),
    show_prices: String(formData.get('show_prices') || 'false') === 'true',
    job_type: String(formData.get('job_type') || 'maison'),
    deposit_percent:
      depositValue !== null
        ? depositValue
        : typeof tenant?.deposit_percent === 'number'
        ? tenant.deposit_percent
        : null,
  };

  if (!payload.customer_id || !payload.issue_date) {
    return { error: 'Client et date requis.' };
  }

  const { data, error } = await supabase
    .from('quotes')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/quotes');
  return { id: data?.id };
}

export async function updateQuoteStatus(quoteId: string, status: string) {
  const supabase = createClient();
  const { data: quote } = await supabase
    .from('quotes')
    .select('status')
    .eq('id', quoteId)
    .single();

  if (!quote) {
    throw new Error('Devis introuvable.');
  }

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  let payload: Record<string, unknown> = { status };

  if (status === 'envoye') {
    if (quote.status !== 'brouillon') {
      throw new Error('Le devis doit etre en brouillon.');
    }
    payload = { status, locked: true, sent_at: now };
  } else if (status === 'accepte') {
    if (quote.status !== 'envoye') {
      throw new Error('Le devis doit etre envoye.');
    }
    payload = { status, locked: true, accepted_at: today };
  } else if (status === 'refuse' || status === 'expire') {
    payload = { status, locked: true };
  }

  const { error } = await supabase.from('quotes').update(payload).eq('id', quoteId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath('/quotes');
  revalidatePath(`/quotes/${quoteId}`);
}

export async function duplicateQuote(quoteId: string) {
  const supabase = createClient();

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .single();

  if (quoteError) {
    throw new Error(quoteError.message);
  }
  if (!quote) {
    return;
  }

  const { data: sections, error: sectionsError } = await supabase
    .from('quote_sections')
    .select('*')
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });

  if (sectionsError) {
    throw new Error(sectionsError.message);
  }

  const { data: items, error: itemsError } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const today = new Date().toISOString().slice(0, 10);
  const validUntil = (() => {
    const base = new Date(`${today}T00:00:00`);
    base.setDate(base.getDate() + 30);
    return base.toISOString().slice(0, 10);
  })();

  const { data: newQuote, error: newQuoteError } = await supabase
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
      job_type: quote.job_type,
      job_zone: quote.job_zone,
      deposit_percent: quote.deposit_percent,
    })
    .select('id')
    .single();

  if (newQuoteError) {
    throw new Error(newQuoteError.message);
  }
  if (!newQuote) {
    return;
  }

  const sectionIdMap = new Map<string, string>();
  if (sections && sections.length > 0) {
    const { data: newSections, error: newSectionsError } = await supabase
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

    if (newSectionsError) {
      throw new Error(newSectionsError.message);
    }

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
    const { error: insertItemsError } = await supabase.from('quote_items').insert(
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
    if (insertItemsError) {
      throw new Error(insertItemsError.message);
    }
  }

  revalidatePath('/quotes');
}

export async function deleteQuote(quoteId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('quotes').delete().eq('id', quoteId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath('/quotes');
}

