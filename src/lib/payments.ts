import type { InvoiceStatus } from '@/lib/constants';
import type { Payment } from '@/lib/types';

export function sumPayments(payments: Payment[] | null | undefined) {
  return (payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}

export function getRemainingAmount(totalTtc: number, paidTotal: number) {
  return Math.max(totalTtc - paidTotal, 0);
}

export function getPaymentStatus(
  totalTtc: number,
  paidTotal: number,
  currentStatus: InvoiceStatus
) {
  if (totalTtc > 0 && paidTotal >= totalTtc) {
    return 'payee';
  }
  if (paidTotal > 0) {
    return 'partiellement_payee';
  }
  return currentStatus;
}

export function isInvoiceOverdue(params: {
  status: InvoiceStatus;
  due_date?: string | null;
  remaining: number;
  today: string;
}) {
  const { status, due_date, remaining, today } = params;
  if (!due_date) return false;
  if (remaining <= 0) return false;
  if (status !== 'emise' && status !== 'partiellement_payee') return false;
  return due_date < today;
}
