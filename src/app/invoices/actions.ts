'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

export type InvoiceFormState = { error?: string };

export async function createInvoice(
  _prevState: InvoiceFormState,
  formData: FormData
): Promise<InvoiceFormState> {
  const supabase = createClient();

  const { data: tenant } = await supabase.from('tenants').select('payment_terms_days').single();

  const issueDate = String(formData.get('issue_date') || '').trim();
  const dueRaw = String(formData.get('due_date') || '').trim();
  const terms =
    typeof tenant?.payment_terms_days === 'number' ? tenant.payment_terms_days : 30;
  const dueDate =
    dueRaw ||
    (issueDate
      ? (() => {
          const base = new Date(`${issueDate}T00:00:00`);
          base.setDate(base.getDate() + terms);
          return base.toISOString().slice(0, 10);
        })()
      : null);

  const payload = {
    customer_id: String(formData.get('customer_id') || '').trim(),
    issue_date: issueDate,
    due_date: dueDate,
    status: 'brouillon',
    job_type: String(formData.get('job_type') || 'maison'),
    locked: false,
    payment_terms_days: terms,
    show_prices: String(formData.get('show_prices') || 'false') === 'true',
  };

  if (!payload.customer_id || !payload.issue_date) {
    return { error: 'Client et date requis.' };
  }

  const { error } = await supabase.from('invoices').insert(payload);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/invoices');
  return {};
}

export async function updateInvoiceStatus(invoiceId: string, status: string) {
  const supabase = createClient();
  const { data: invoice } = await supabase
    .from('invoices')
    .select('status')
    .eq('id', invoiceId)
    .single();

  if (!invoice) {
    throw new Error('Facture introuvable.');
  }

  if (status === 'annulee' && invoice.status === 'payee') {
    throw new Error('Impossible d annuler une facture payee.');
  }

  const payload = status === 'annulee' ? { status, locked: true } : { status };
  const { error } = await supabase.from('invoices').update(payload).eq('id', invoiceId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath('/invoices');
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function emitInvoice(invoiceId: string) {
  const supabase = createClient();

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, issue_date, due_date, payment_terms_days, status')
    .eq('id', invoiceId)
    .single();

  if (!invoice) {
    return { error: 'Facture introuvable.' };
  }

  if (invoice.status !== 'brouillon') {
    return { error: 'Facture deja emise.' };
  }

  const { data: tenant } = await supabase.from('tenants').select('payment_terms_days').single();
  const terms =
    typeof invoice.payment_terms_days === 'number'
      ? invoice.payment_terms_days
      : typeof tenant?.payment_terms_days === 'number'
      ? tenant.payment_terms_days
      : 30;

  const issueDate = invoice.issue_date || new Date().toISOString().slice(0, 10);
  const dueDate =
    invoice.due_date ||
    (() => {
      const base = new Date(`${issueDate}T00:00:00`);
      base.setDate(base.getDate() + terms);
      return base.toISOString().slice(0, 10);
    })();

  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'emise',
      issue_date: issueDate,
      due_date: dueDate,
      payment_terms_days: terms,
      locked: true,
      emitted_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/invoices');
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}

export async function duplicateInvoice(invoiceId: string) {
  const supabase = createClient();

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (invoiceError) {
    throw new Error(invoiceError.message);
  }
  if (!invoice) {
    return;
  }

  const { data: sections, error: sectionsError } = await supabase
    .from('invoice_sections')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('sort_order', { ascending: true });

  if (sectionsError) {
    throw new Error(sectionsError.message);
  }

  const { data: items, error: itemsError } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('sort_order', { ascending: true });

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: newInvoice, error: newInvoiceError } = await supabase
    .from('invoices')
    .insert({
      customer_id: invoice.customer_id,
      quote_id: invoice.quote_id,
      status: 'brouillon',
      issue_date: today,
      due_date: invoice.due_date,
      totals: invoice.totals,
      show_prices: invoice.show_prices ?? false,
      job_type: invoice.job_type,
      job_zone: invoice.job_zone,
    })
    .select('id')
    .single();

  if (newInvoiceError) {
    throw new Error(newInvoiceError.message);
  }
  if (!newInvoice) {
    return;
  }

  const sectionIdMap = new Map<string, string>();
  if (sections && sections.length > 0) {
    const { data: newSections, error: newSectionsError } = await supabase
      .from('invoice_sections')
      .insert(
        sections.map((section) => ({
          invoice_id: newInvoice.id,
          name: section.name,
          sort_order: section.sort_order,
          zone: section.zone || invoice.job_zone || 'interieur',
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
    const { error: insertItemsError } = await supabase.from('invoice_items').insert(
      items.map((item) => ({
        invoice_id: newInvoice.id,
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

  revalidatePath('/invoices');
}

export async function deleteInvoice(invoiceId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath('/invoices');
}

