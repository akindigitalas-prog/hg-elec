import { describe, expect, it } from 'vitest';

import { getPaymentStatus, getRemainingAmount, isInvoiceOverdue } from './payments';

describe('payments helpers', () => {
  it('computes remaining amount', () => {
    expect(getRemainingAmount(100, 40)).toBe(60);
    expect(getRemainingAmount(100, 140)).toBe(0);
  });

  it('flags overdue invoices', () => {
    expect(
      isInvoiceOverdue({
        status: 'emise',
        due_date: '2026-01-01',
        remaining: 50,
        today: '2026-01-30',
      })
    ).toBe(true);
    expect(
      isInvoiceOverdue({
        status: 'payee',
        due_date: '2026-01-01',
        remaining: 0,
        today: '2026-01-30',
      })
    ).toBe(false);
  });

  it('marks invoice as paid when payments cover total', () => {
    expect(getPaymentStatus(100, 100, 'emise')).toBe('payee');
    expect(getPaymentStatus(100, 20, 'emise')).toBe('partiellement_payee');
  });
});
