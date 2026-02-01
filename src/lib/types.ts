import type {
  DisplayMode,
  InvoiceStatus,
  JobType,
  JobZone,
  ProductCategory,
  ProductType,
  ProductUnit,
  QuoteStatus,
} from '@/lib/constants';

export type Tenant = {
  id: string;
  name: string;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  siret?: string | null;
  vat_number?: string | null;
  phone?: string | null;
  email?: string | null;
  vat_exempt?: boolean | null;
  vat_exempt_mention?: string | null;
  deposit_percent?: number | null;
  insurance_name?: string | null;
  insurance_origin?: string | null;
  insurance_contract?: string | null;
  logo_url?: string | null;
  rib?: string | null;
  client_display_mode?: DisplayMode;
  payment_terms_days?: number | null;
};

export type Profile = {
  id: string;
  tenant_id: string;
  role: 'admin' | 'user';
  full_name?: string | null;
  email?: string | null;
};

export type Customer = {
  id: string;
  tenant_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  notes?: string | null;
  siret?: string | null;
};

export type Product = {
  id: string;
  tenant_id: string;
  category: ProductCategory;
  subcategory?: string | null;
  brand?: string | null;
  sku?: string | null;
  name: string;
  description?: string | null;
  unit: ProductUnit;
  vat_rate: number;
  internal_unit_price: number;
  internal_cost?: number | null;
  type: ProductType;
  active: boolean;
  tags: string[];
};

export type QuoteTotals = {
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  total_supplies_ht: number;
  total_labor_ht: number;
  total_travel_ht: number;
};

export type Quote = {
  id: string;
  tenant_id: string;
  number: string;
  customer_id: string;
  status: QuoteStatus;
  issue_date: string;
  sent_at?: string | null;
  accepted_at?: string | null;
  valid_until?: string | null;
  notes?: string | null;
  locked: boolean;
  show_prices?: boolean | null;
  totals: QuoteTotals;
  display_mode?: DisplayMode | null;
  deposit_percent?: number | null;
  job_type: JobType;
  job_zone: JobZone;
  customers?: { name?: string | null };
};

export type QuoteItem = {
  id: string;
  tenant_id: string;
  quote_id: string;
  product_id?: string | null;
  section_id?: string | null;
  label: string;
  qty: number;
  unit: ProductUnit;
  vat_rate: number;
  internal_unit_price: number;
  item_type: ProductType;
  sort_order: number;
};

export type QuoteSection = {
  id: string;
  tenant_id: string;
  quote_id: string;
  name: string;
  sort_order: number;
  zone: JobZone;
};

export type InvoiceTotals = QuoteTotals;

export type Invoice = {
  id: string;
  tenant_id: string;
  number: string;
  customer_id: string;
  quote_id?: string | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date?: string | null;
  locked?: boolean;
  show_prices?: boolean | null;
  emitted_at?: string | null;
  payment_terms_days?: number | null;
  kind?: 'final' | 'deposit';
  totals: InvoiceTotals;
  job_type: JobType;
  job_zone: JobZone;
  customers?: { name?: string | null };
  payments?: { amount: number }[];
};

export type InvoiceItem = {
  id: string;
  tenant_id: string;
  invoice_id: string;
  product_id?: string | null;
  section_id?: string | null;
  label: string;
  qty: number;
  unit: ProductUnit;
  vat_rate: number;
  internal_unit_price: number;
  item_type: ProductType;
  sort_order: number;
};

export type InvoiceSection = {
  id: string;
  tenant_id: string;
  invoice_id: string;
  name: string;
  sort_order: number;
  zone: JobZone;
};

export type Payment = {
  id: string;
  tenant_id: string;
  invoice_id: string;
  paid_at: string;
  amount: number;
  method: 'cb' | 'virement' | 'especes' | 'cheque' | 'autre';
  note?: string | null;
};

