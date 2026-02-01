import { buildClientSummary } from '@/lib/calc';
import type { DisplayMode } from '@/lib/constants';
import type { QuoteItem } from '@/lib/types';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type QuotePreviewSection = {
  id?: string | null;
  name: string;
  items: QuoteItem[];
};

export function QuotePreview({
  sections,
  totals,
  displayMode,
  showPrices,
  depositPercent,
  depositAmount,
  remainingAmount,
  mentions,
}: {
  sections: QuotePreviewSection[];
  totals: {
    total_ht: number;
    total_tva: number;
    total_ttc: number;
    total_supplies_ht: number;
    total_labor_ht: number;
    total_travel_ht: number;
  };
  displayMode: DisplayMode;
  showPrices?: boolean;
  depositPercent?: number | null;
  depositAmount?: number | null;
  remainingAmount?: number | null;
  mentions?: string[];
}) {
  const summary = buildClientSummary(totals, displayMode);
  const nonEmptySections = sections.filter((section) => section.items.length > 0);
  const visibleSections = nonEmptySections.length > 0 ? nonEmptySections : sections;
  const orderedSections = [...visibleSections];
  const showDeposit =
    typeof depositPercent === 'number' &&
    depositPercent > 0 &&
    typeof depositAmount === 'number' &&
    typeof remainingAmount === 'number';

  return (
    <div className="space-y-4 rounded-3xl border bg-white p-6">
      <div>
        <p className="text-sm text-muted-foreground">Apercu client</p>
        <p className="text-lg font-semibold">Lignes visibles</p>
      </div>
      <div className="space-y-4">
        {orderedSections.map((section) => (
          <div key={section.id ?? section.name} className="space-y-2">
            <p className="text-sm font-semibold">{section.name}</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Designation</TableHead>
                  <TableHead className="text-right">Quantite</TableHead>
                  {showPrices ? (
                    <>
                      <TableHead className="text-right">PU</TableHead>
                      <TableHead className="text-right">Prix total</TableHead>
                    </>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {section.items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={showPrices ? 4 : 2}
                      className="text-center text-muted-foreground"
                    >
                      Aucune ligne dans cette piece.
                    </TableCell>
                  </TableRow>
                ) : (
                  section.items.map((item) => {
                    const unitPrice = Number(item.internal_unit_price || 0);
                    const lineTotal = Number(item.qty || 0) * unitPrice;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>{item.label}</TableCell>
                        <TableCell className="text-right">{item.qty}</TableCell>
                        {showPrices ? (
                          <>
                            <TableCell className="text-right">
                              {unitPrice.toFixed(2)} EUR
                            </TableCell>
                            <TableCell className="text-right">
                              {lineTotal.toFixed(2)} EUR
                            </TableCell>
                          </>
                        ) : null}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded-2xl bg-muted/40 p-4">
        {summary.map((line) => (
          <div key={line.label} className="flex items-center justify-between text-sm">
            <span>{line.label}</span>
            <span>{line.value.toFixed(2)} EUR</span>
          </div>
        ))}
        <div className="flex items-center justify-between text-sm">
          <span>Total HT</span>
          <span>{totals.total_ht.toFixed(2)} EUR</span>
        </div>
        <div className="flex items-center justify-between text-base font-semibold">
          <span>Total TTC</span>
          <span>{totals.total_ttc.toFixed(2)} EUR</span>
        </div>
        {showDeposit ? (
          <>
            <div className="flex items-center justify-between text-sm">
              <span>Acompte ({depositPercent}%)</span>
              <span>{depositAmount!.toFixed(2)} EUR</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Reste à payer</span>
              <span>{remainingAmount!.toFixed(2)} EUR</span>
            </div>
          </>
        ) : null}
      </div>

      {mentions && mentions.length > 0 ? (
        <div className="rounded-2xl border bg-muted/10 p-4 text-xs text-muted-foreground whitespace-pre-line">
          {mentions.map((line, index) => (
            <p key={`${line}-${index}`} className="mb-2 last:mb-0">
              {line}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

