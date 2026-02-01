import { createClient } from '@/lib/supabase/server';
import type { Customer, Invoice, Product, Quote } from '@/lib/types';
import type { InvoiceStatus, JobType, JobZone, QuoteStatus } from '@/lib/constants';

export async function listProducts(): Promise<Product[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('products')
    .select('*')
    .order('name');
  return (data as Product[]) || [];
}

export async function listCustomers(): Promise<Customer[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('customers')
    .select('*')
    .order('name');
  return (data as Customer[]) || [];
}

export async function listQuotes(filters?: {
  status?: QuoteStatus | 'all';
  job_type?: JobType | 'all';
  job_zone?: JobZone | 'all';
  search?: string;
}): Promise<Quote[]> {
  const supabase = createClient();
  let query = supabase.from('quotes').select('*, customers(name)');

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.job_type && filters.job_type !== 'all') {
    query = query.eq('job_type', filters.job_type);
  }
  if (filters?.job_zone && filters.job_zone !== 'all') {
    query = query.eq('job_zone', filters.job_zone);
  }
  if (filters?.search) {
    const term = filters.search.trim();
    if (term) {
      query = query.or(`number.ilike.%${term}%,customers.name.ilike.%${term}%`);
    }
  }

  const { data } = await query.order('issue_date', { ascending: false });
  const quotes = (data as Quote[]) || [];

  const today = new Date().toISOString().slice(0, 10);
  const expirableStatuses: QuoteStatus[] = ['brouillon', 'envoye'];
  const expired = quotes.filter(
    (quote) =>
      quote.valid_until &&
      quote.valid_until < today &&
      expirableStatuses.includes(quote.status)
  );

  if (expired.length > 0) {
    const ids = expired.map((quote) => quote.id);
    await supabase
      .from('quotes')
      .update({ status: 'expire', locked: true })
      .in('id', ids);
    expired.forEach((quote) => {
      quote.status = 'expire';
      quote.locked = true;
    });
  }

  return quotes;
}

export async function listInvoices(filters?: {
  status?: InvoiceStatus | 'all';
  job_type?: JobType | 'all';
  job_zone?: JobZone | 'all';
  search?: string;
}): Promise<Invoice[]> {
  const supabase = createClient();
  let query = supabase.from('invoices').select('*, customers(name), payments(amount)');

  const statusFilter = filters?.status && filters.status !== 'all' ? filters.status : null;
  if (statusFilter && statusFilter !== 'en_retard') {
    query = query.eq('status', statusFilter);
  }
  if (statusFilter === 'en_retard') {
    query = query.in('status', ['emise', 'partiellement_payee']);
  }
  if (filters?.job_type && filters.job_type !== 'all') {
    query = query.eq('job_type', filters.job_type);
  }
  if (filters?.job_zone && filters.job_zone !== 'all') {
    query = query.eq('job_zone', filters.job_zone);
  }
  if (filters?.search) {
    const term = filters.search.trim();
    if (term) {
      query = query.or(`number.ilike.%${term}%,customers.name.ilike.%${term}%`);
    }
  }

  const { data } = await query.order('issue_date', { ascending: false });
  const invoices = (data as Invoice[]) || [];

  if (statusFilter === 'en_retard') {
    const today = new Date().toISOString().slice(0, 10);
    return invoices.filter((invoice) => {
      const paidTotal = (invoice.payments || []).reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      );
      const remaining = Math.max((invoice.totals?.total_ttc || 0) - paidTotal, 0);
      return invoice.due_date && invoice.due_date < today && remaining > 0;
    });
  }

  return invoices;
}

