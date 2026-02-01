import { notFound } from 'next/navigation';
import { Trash2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { applyVatExemptTotals, calculateTotals } from '@/lib/calc';
import { PageHeader, SectionCard } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QuotePreview } from '@/components/quote-preview';
import { JOB_TYPES, JOB_TYPE_LABELS } from '@/lib/constants';
import {
  deleteInvoiceItem,
  moveInvoiceSectionDown,
  moveInvoiceSectionUp,
  renameInvoiceSection,
  updateInvoiceItem,
  updateInvoiceItemSection,
  updateInvoiceMeta,
} from './actions';
import { AutoSectionSelect } from '@/components/auto-section-select';
import { Input } from '@/components/ui/input';
import { AddPaymentDialog } from './add-payment-dialog';
import { emitInvoice } from '@/app/invoices/actions';
import { getRemainingAmount, isInvoiceOverdue, sumPayments } from '@/lib/payments';
import { AddInvoiceSectionForm } from './add-section-form';
import { InvoiceSectionNavItem } from './section-nav-item';
import { DeleteInvoiceSectionButton } from './delete-section-button';
import { InvoiceItemsForm } from './invoice-items-form';

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, customers(*), payments(*), quotes(deposit_percent)')
    .eq('id', params.id)
    .single();

  const { data: invoiceItems } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', params.id)
    .order('sort_order', { ascending: true });

  const { data: invoiceSections } = await supabase
    .from('invoice_sections')
    .select('*')
    .eq('invoice_id', params.id)
    .order('sort_order', { ascending: true });

  const { data: products } = await supabase
    .from('products')
    .select('id, name, category, unit, vat_rate, internal_unit_price, type, active')
    .eq('active', true)
    .order('name');

  const { data: tenant } = await supabase
    .from('tenants')
    .select('vat_exempt, deposit_percent')
    .single();
  const vatExempt = Boolean(tenant?.vat_exempt);

  if (!invoice) {
    notFound();
  }

  const items = (invoiceItems || []).map((item: any) => ({
    ...item,
    item_type: item.item_type || 'fourniture',
  }));

  const sections = (invoiceSections || []).map((section: any) => ({
    ...section,
  }));

  const sortedItems = [...items].sort(
    (a, b) => Number(a.sort_order) - Number(b.sort_order)
  );
  const generalItems = sortedItems.filter((item) => !item.section_id);
  const sectionItems = sections.map((section) => ({
    ...section,
    items: sortedItems.filter((item) => item.section_id === section.id),
  }));
  const showGeneral = generalItems.length > 0 || sections.length === 0;
  const sectionOptions = [
    { id: '', name: 'General' },
    ...sections.map((section) => ({ id: section.id, name: section.name })),
  ];
  const sectionNav = [
    ...(showGeneral
      ? [
          {
            id: 'general',
            name: 'General',
            count: generalItems.length,
            allowDuplicate: false,
          },
        ]
      : []),
    ...sectionItems.map((section) => ({
      id: section.id,
      name: section.name,
      count: section.items.length,
      allowDuplicate: true,
    })),
  ];

  const rawTotals = invoice.totals?.total_ht
    ? invoice.totals
    : calculateTotals(
        items.map((item: any) => ({
          qty: item.qty,
          internal_unit_price: item.internal_unit_price,
          vat_rate: item.vat_rate,
          item_type: item.item_type,
        })),
        { vatExempt }
      );
  const totals = applyVatExemptTotals(rawTotals, vatExempt);
  const paidTotal = sumPayments(invoice.payments as any);
  const remaining = getRemainingAmount(totals.total_ttc, paidTotal);
  const quoteDeposit =
    typeof (invoice as any)?.quotes?.deposit_percent === 'number'
      ? (invoice as any).quotes.deposit_percent
      : typeof tenant?.deposit_percent === 'number'
      ? tenant.deposit_percent
      : null;
  const applyDeposit = invoice.kind !== 'deposit';
  const depositPercent =
    applyDeposit && typeof quoteDeposit === 'number' && quoteDeposit > 0
      ? quoteDeposit
      : null;
  const depositAmount =
    typeof depositPercent === 'number'
      ? Number(((totals.total_ttc * depositPercent) / 100).toFixed(2))
      : null;
  const remainingFromDeposit =
    typeof depositAmount === 'number'
      ? Number((totals.total_ttc - depositAmount).toFixed(2))
      : null;
  const showDepositBreakdown = paidTotal === 0 && depositAmount !== null;
  const remainingDue =
    showDepositBreakdown && remainingFromDeposit !== null ? remainingFromDeposit : remaining;
  const isOverdue = isInvoiceOverdue({
    status: invoice.status as any,
    due_date: invoice.due_date,
    remaining: remainingDue,
    today: new Date().toISOString().slice(0, 10),
  });
  const isEditable = invoice.status === 'brouillon' && !invoice.locked;
  const canAddPayment =
    (invoice.status === 'emise' || invoice.status === 'partiellement_payee' || isOverdue) &&
    remainingDue > 0;
  const emitInvoiceAction = async (_formData: FormData) => {
    'use server';
    await emitInvoice(invoice.id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Facture ${invoice.number}`}
        description="Suivi des paiements et apercu PDF."
        actions={
          <>
            <Button variant="outline" asChild>
              <a href={`/api/pdf?type=invoice&id=${invoice.id}`} target="_blank" rel="noreferrer">
                Apercu PDF
              </a>
            </Button>
            {invoice.status === 'brouillon' ? (
              <form action={emitInvoiceAction}>
                <Button type="submit">Emettre</Button>
              </form>
            ) : null}
            <AddPaymentDialog invoiceId={invoice.id} defaultAmount={remainingDue} disabled={!canAddPayment} />
          </>
        }
      />

      <SectionCard title="Chantier">
        <form action={updateInvoiceMeta.bind(null, invoice.id)} className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Type de chantier</span>
            <select
              name="job_type"
              defaultValue={invoice.job_type || 'maison'}
              className="h-10 rounded-2xl border border-input bg-background px-3 text-sm"
              disabled={!isEditable}
            >
              {JOB_TYPES.map((value) => (
                <option key={value} value={value}>
                  {JOB_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="show_prices"
              name="show_prices"
              type="checkbox"
              value="true"
              defaultChecked={Boolean(invoice.show_prices)}
              disabled={!isEditable}
            />
            <input type="hidden" name="show_prices" value="false" />
            <label htmlFor="show_prices" className="text-sm">
              Afficher les prix de vente dans le PDF
            </label>
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="outline" disabled={!isEditable}>
              Enregistrer
            </Button>
          </div>
        </form>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <SectionCard title="Pieces">
            <AddInvoiceSectionForm invoiceId={invoice.id} locked={!isEditable} />
            <p className="mt-2 text-xs text-muted-foreground">
              Les pieces creees apparaissent directement dans la liste ci-dessous.
            </p>
          </SectionCard>

          <SectionCard title="Navigation pieces">
            <div className="flex flex-wrap gap-2">
              {sectionNav.length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  Aucune piece pour le moment.
                </span>
              ) : (
                sectionNav.map((section) => (
                  <InvoiceSectionNavItem
                    key={section.id}
                    invoiceId={invoice.id}
                    sectionId={section.id}
                    name={section.name}
                    count={section.count}
                    allowDuplicate={section.allowDuplicate}
                    disabled={!isEditable}
                  />
                ))
              )}
            </div>
          </SectionCard>

          {showGeneral ? (
            <SectionCard id="section-general" title="General">
              <Table className="table-sticky">
                <TableHeader>
                  <TableRow>
                    <TableHead>Designation</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qte</TableHead>
                    <TableHead>Prix de vente</TableHead>
                    <TableHead>TVA</TableHead>
                    <TableHead>Piece</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generalItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Aucune ligne dans cette piece.
                      </TableCell>
                    </TableRow>
                  ) : (
                    generalItems.map((item: any) => (
                      <TableRow key={item.id}>
                        {(() => {
                          const formId = `invoice-update-${item.id}`;
                          return (
                            <>
                        <TableCell className="font-medium">{item.label}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{item.item_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            name="qty"
                            type="number"
                            step="0.01"
                            min="0.01"
                            defaultValue={item.qty}
                            className="h-8 w-20"
                            form={formId}
                            disabled={!isEditable}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            name="internal_unit_price"
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={item.internal_unit_price}
                            className="h-8 w-24"
                            form={formId}
                            disabled={!isEditable}
                          />
                        </TableCell>
                        <TableCell>{item.vat_rate}%</TableCell>
                        <TableCell>
                          <AutoSectionSelect
                            action={updateInvoiceItemSection}
                            options={sectionOptions}
                            defaultValue={item.section_id ?? ''}
                            disabled={!isEditable}
                            itemId={item.id}
                            parentId={invoice.id}
                            parentField="invoice_id"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <form id={formId} action={updateInvoiceItem.bind(null, invoice.id, item.id)}>
                              <Button variant="ghost" size="sm" disabled={!isEditable}>
                                Enregistrer
                              </Button>
                            </form>
                            <form action={deleteInvoiceItem.bind(null, invoice.id, item.id)}>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={!isEditable}
                                aria-label="Supprimer la ligne"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </form>
                          </div>
                        </TableCell>
                            </>
                          );
                        })()}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="mt-6">
                <p className="text-sm font-semibold">Ajouter une ligne</p>
                <div className="mt-3">
                  <InvoiceItemsForm
                    invoiceId={invoice.id}
                    products={(products || []) as any}
                    locked={!isEditable}
                    sectionId={null}
                  />
                </div>
              </div>
            </SectionCard>
          ) : null}

          {sectionItems.map((section, index) => (
            <SectionCard
              key={section.id}
              id={`section-${section.id}`}
              title={section.name}
              action={
                <div className="flex flex-wrap gap-2">
                  <form action={moveInvoiceSectionUp.bind(null, invoice.id, section.id)}>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      disabled={!isEditable || index === 0}
                    >
                      Monter
                    </Button>
                  </form>
                  <form action={moveInvoiceSectionDown.bind(null, invoice.id, section.id)}>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      disabled={!isEditable || index === sectionItems.length - 1}
                    >
                      Descendre
                    </Button>
                  </form>
                  <DeleteInvoiceSectionButton
                    invoiceId={invoice.id}
                    sectionId={section.id}
                    disabled={!isEditable}
                  />
                </div>
              }
            >
              <form
                action={renameInvoiceSection.bind(null, invoice.id, section.id)}
                className="mb-4 flex flex-wrap items-center gap-2"
              >
                <Input
                  name="name"
                  defaultValue={section.name}
                  disabled={!isEditable}
                />
                <Button type="submit" variant="outline" size="sm" disabled={!isEditable}>
                  Renommer
                </Button>
              </form>
              <Table className="table-sticky">
                <TableHeader>
                  <TableRow>
                    <TableHead>Designation</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qte</TableHead>
                      <TableHead>Prix de vente</TableHead>
                    <TableHead>TVA</TableHead>
                    <TableHead>Piece</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {section.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Aucune ligne dans cette piece.
                      </TableCell>
                    </TableRow>
                  ) : (
                    section.items.map((item: any) => (
                      <TableRow key={item.id}>
                        {(() => {
                          const formId = `invoice-update-${item.id}`;
                          return (
                            <>
                        <TableCell className="font-medium">{item.label}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{item.item_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            name="qty"
                            type="number"
                            step="0.01"
                            min="0.01"
                            defaultValue={item.qty}
                            className="h-8 w-20"
                            form={formId}
                            disabled={!isEditable}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            name="internal_unit_price"
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={item.internal_unit_price}
                            className="h-8 w-24"
                            form={formId}
                            disabled={!isEditable}
                          />
                        </TableCell>
                        <TableCell>{item.vat_rate}%</TableCell>
                        <TableCell>
                          <AutoSectionSelect
                            action={updateInvoiceItemSection}
                            options={sectionOptions}
                            defaultValue={item.section_id ?? ''}
                            disabled={!isEditable}
                            itemId={item.id}
                            parentId={invoice.id}
                            parentField="invoice_id"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <form id={formId} action={updateInvoiceItem.bind(null, invoice.id, item.id)}>
                              <Button variant="ghost" size="sm" disabled={!isEditable}>
                                Enregistrer
                              </Button>
                            </form>
                            <form action={deleteInvoiceItem.bind(null, invoice.id, item.id)}>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={!isEditable}
                                aria-label="Supprimer la ligne"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </form>
                          </div>
                        </TableCell>
                            </>
                          );
                        })()}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="mt-6">
                <p className="text-sm font-semibold">Ajouter une ligne</p>
                <div className="mt-3">
                  <InvoiceItemsForm
                    invoiceId={invoice.id}
                    products={(products || []) as any}
                    locked={!isEditable}
                    sectionId={section.id}
                  />
                </div>
              </div>
            </SectionCard>
          ))}
        </div>

        <div className="space-y-6">
          <QuotePreview
            sections={[
              ...(showGeneral
                ? [
                    {
                      id: null,
                      name: 'General',
                      items: generalItems,
                    },
                  ]
                : []),
              ...sectionItems.map((section) => ({
                id: section.id,
                name: section.name,
                items: section.items,
              })),
            ]}
            totals={totals}
            displayMode="total_only"
            showPrices={Boolean(invoice.show_prices)}
            depositPercent={showDepositBreakdown ? depositPercent : null}
            depositAmount={showDepositBreakdown ? depositAmount : null}
            remainingAmount={showDepositBreakdown ? remainingFromDeposit : null}
          />

          <SectionCard title="Totaux">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total HT</span>
                <span>{totals.total_ht.toFixed(2)} EUR</span>
              </div>
              <div className="flex justify-between">
                <span>Total TVA</span>
                <span>{totals.total_tva.toFixed(2)} EUR</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total TTC</span>
                <span>{totals.total_ttc.toFixed(2)} EUR</span>
              </div>
              {showDepositBreakdown ? (
                <>
                  <div className="flex justify-between">
                    <span>Acompte ({depositPercent}%)</span>
                    <span>{depositAmount!.toFixed(2)} EUR</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Reste a payer</span>
                    <span>{remainingFromDeposit!.toFixed(2)} EUR</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>Paye</span>
                    <span>{paidTotal.toFixed(2)} EUR</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Reste a payer</span>
                    <span>{remaining.toFixed(2)} EUR</span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold">Paiements</p>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {invoice.payments?.length ? (
                  invoice.payments.map((payment: any) => (
                    <li key={payment.id}>
                      {payment.paid_at} - {payment.amount} EUR ({payment.method})
                    </li>
                  ))
                ) : (
                  <li>Aucun paiement enregistre.</li>
                )}
              </ul>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
