import type { DisplayMode, ProductType } from '@/lib/constants';

export type LineInput = {
  qty: number;
  internal_unit_price: number;
  vat_rate: number;
  item_type: ProductType;
};

export type QuoteTotals = {
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  total_supplies_ht: number;
  total_labor_ht: number;
  total_travel_ht: number;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export type TotalsOptions = {
  vatExempt?: boolean;
};

export function calculateTotals(lines: LineInput[], options?: TotalsOptions): QuoteTotals {
  const totals = lines.reduce(
    (acc, line) => {
      const lineHt = line.qty * line.internal_unit_price;
      const vatRate = options?.vatExempt ? 0 : line.vat_rate;
      const lineTva = lineHt * (vatRate / 100);
      const lineTtc = lineHt + lineTva;

      acc.total_ht += lineHt;
      acc.total_tva += lineTva;
      acc.total_ttc += lineTtc;

      if (line.item_type === 'main_oeuvre') {
        acc.total_labor_ht += lineHt;
      } else if (line.item_type === 'deplacement') {
        acc.total_travel_ht += lineHt;
      } else {
        acc.total_supplies_ht += lineHt;
      }

      return acc;
    },
    {
      total_ht: 0,
      total_tva: 0,
      total_ttc: 0,
      total_supplies_ht: 0,
      total_labor_ht: 0,
      total_travel_ht: 0,
    }
  );

  return {
    total_ht: round2(totals.total_ht),
    total_tva: round2(totals.total_tva),
    total_ttc: round2(totals.total_ttc),
    total_supplies_ht: round2(totals.total_supplies_ht),
    total_labor_ht: round2(totals.total_labor_ht),
    total_travel_ht: round2(totals.total_travel_ht),
  };
}

export function applyVatExemptTotals(
  totals: QuoteTotals,
  vatExempt?: boolean
): QuoteTotals {
  if (!vatExempt) return totals;
  return {
    ...totals,
    total_tva: 0,
    total_ttc: totals.total_ht,
  };
}

export function buildClientSummary(
  totals: QuoteTotals,
  displayMode: DisplayMode
): Array<{ label: string; value: number }> {
  if (displayMode === 'group_totals') {
    return [
      { label: 'Fournitures', value: totals.total_supplies_ht },
      { label: 'Main d oeuvre', value: totals.total_labor_ht },
      { label: 'Deplacement', value: totals.total_travel_ht },
    ].filter((item) => item.value > 0);
  }

  return [{ label: 'Total global', value: totals.total_ht }];
}

export function formatDocumentNumber(
  prefix: 'DEV' | 'FAC',
  year: number,
  counter: number
) {
  const padded = String(counter).padStart(4, '0');
  return `${prefix}-${year}-${padded}`;
}

