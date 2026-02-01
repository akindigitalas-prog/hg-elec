import { describe, expect, it } from 'vitest';

import { buildClientSummary, calculateTotals, formatDocumentNumber } from '@/lib/calc';

describe('calculateTotals', () => {
  it('computes totals by type and VAT', () => {
    const totals = calculateTotals([
      { qty: 2, internal_unit_price: 100, vat_rate: 20, item_type: 'fourniture' },
      { qty: 1, internal_unit_price: 80, vat_rate: 10, item_type: 'main_oeuvre' },
      { qty: 3, internal_unit_price: 30, vat_rate: 5.5, item_type: 'deplacement' },
    ]);

    expect(totals.total_supplies_ht).toBe(200);
    expect(totals.total_labor_ht).toBe(80);
    expect(totals.total_travel_ht).toBe(90);
    expect(totals.total_ht).toBe(370);
    expect(totals.total_tva).toBeCloseTo(20 * 2 + 8 + 4.95, 2);
    expect(totals.total_ttc).toBeCloseTo(370 + totals.total_tva, 2);
  });
});

describe('buildClientSummary', () => {
  it('returns grouped totals', () => {
    const summary = buildClientSummary(
      {
        total_ht: 300,
        total_tva: 0,
        total_ttc: 300,
        total_supplies_ht: 200,
        total_labor_ht: 100,
        total_travel_ht: 0,
      },
      'group_totals'
    );

    expect(summary).toEqual([
      { label: 'Fournitures', value: 200 },
      { label: 'Main d oeuvre', value: 100 },
    ]);
  });

  it('returns global total only', () => {
    const summary = buildClientSummary(
      {
        total_ht: 300,
        total_tva: 0,
        total_ttc: 300,
        total_supplies_ht: 200,
        total_labor_ht: 100,
        total_travel_ht: 0,
      },
      'total_only'
    );

    expect(summary).toEqual([{ label: 'Total global', value: 300 }]);
  });
});

describe('formatDocumentNumber', () => {
  it('pads counters to 4 digits', () => {
    expect(formatDocumentNumber('DEV', 2026, 3)).toBe('DEV-2026-0003');
  });
});

