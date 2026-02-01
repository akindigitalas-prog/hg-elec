import { notFound } from 'next/navigation';
import { Trash2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { applyVatExemptTotals, calculateTotals } from '@/lib/calc';
import { PageHeader, SectionCard } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QuotePreview } from '@/components/quote-preview';
import { QuoteItemsForm } from './quote-items-form';
import { ConvertInvoiceButton } from './convert-invoice-button';
import { ValidateQuoteButton } from './validate-quote-button';
import { AddSectionForm } from './add-section-form';
import { SectionNavItem } from './section-nav-item';
import { PriceOverrideDialog } from './price-override-dialog';
import { MarkQuoteAcceptedButton } from './mark-quote-accepted-button';
import { MarkQuoteRefusedButton } from './mark-quote-refused-button';
import { DuplicateQuoteButton } from './duplicate-quote-button';
import { CreateDepositInvoiceDialog } from './create-deposit-invoice-dialog';
import {
  deleteQuoteItem,
  moveQuoteSectionDown,
  moveQuoteSectionUp,
  renameQuoteSection,
  updateQuoteMeta,
  updateQuoteItemSection,
  updateQuoteItem,
} from './actions';
import { AutoSectionSelect } from '@/components/auto-section-select';
import { DeleteSectionButton } from './delete-section-button';
import { JOB_TYPES, JOB_TYPE_LABELS } from '@/lib/constants';

export default async function QuoteDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: quote } = await supabase
    .from('quotes')
    .select('*, customers(*)')
    .eq('id', params.id)
    .single();

  const { data: quoteItems } = await supabase
    .from('quote_items')
    .select('*, products(internal_unit_price)')
    .eq('quote_id', params.id)
    .order('sort_order', { ascending: true });

  const { data: quoteSections } = await supabase
    .from('quote_sections')
    .select('*')
    .eq('quote_id', params.id)
    .order('sort_order', { ascending: true });

  const { data: products } = await supabase
    .from('products')
    .select('id, name, category, unit, vat_rate, internal_unit_price, type, active')
    .eq('active', true)
    .order('name');

  const { data: tenant } = await supabase
    .from('tenants')
    .select('vat_exempt, vat_exempt_mention, deposit_percent, insurance_name, insurance_origin, insurance_contract, pdf_terms')
    .single();
  const vatExempt = Boolean(tenant?.vat_exempt);

  if (!quote) {
    notFound();
  }
  const today = new Date().toISOString().slice(0, 10);
  if (
    quote.valid_until &&
    quote.valid_until < today &&
    (quote.status === 'brouillon' || quote.status === 'envoye')
  ) {
    await supabase
      .from('quotes')
      .update({ status: 'expire', locked: true })
      .eq('id', quote.id);
    quote.status = 'expire';
    quote.locked = true;
  }
  const isLocked = quote.locked || quote.status !== 'brouillon';
  const isExpired = quote.status === 'expire';

  const items = (quoteItems || []).map((item: any) => ({
    ...item,
    item_type: item.item_type || 'fourniture',
  }));

  const sections = (quoteSections || []).map((section: any) => ({
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
  const showGeneral = generalItems.length > 0;
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

  const rawTotals = quote.totals?.total_ht
    ? quote.totals
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
  const depositPercent =
    typeof quote.deposit_percent === 'number'
      ? quote.deposit_percent
      : typeof tenant?.deposit_percent === 'number'
      ? tenant.deposit_percent
      : null;
  const depositAmount =
    typeof depositPercent === 'number' && depositPercent > 0
      ? Number(((totals.total_ttc * depositPercent) / 100).toFixed(2))
      : null;
  const remainingAmount =
    typeof depositAmount === 'number'
      ? Number((totals.total_ttc - depositAmount).toFixed(2))
      : null;

  const mentions: string[] = [];
  const addMention = (text: string, match?: RegExp | string) => {
    const haystack = mentions.join('\n').toLowerCase();
    if (match) {
      if (typeof match === 'string') {
        if (haystack.includes(match.toLowerCase())) return;
      } else if (match.test(haystack)) {
        return;
      }
    } else if (haystack.includes(text.toLowerCase())) {
      return;
    }
    mentions.push(text);
  };

  if (tenant?.pdf_terms) {
    mentions.push(tenant.pdf_terms);
  }
  if (vatExempt) {
    addMention(
      tenant?.vat_exempt_mention || 'TVA non applicable - article 293 B du CGI.',
      /tva non applicable|293 b/i
    );
  }

  addMention(
    `Devis valable 30 jours à compter de sa date d’émission.`,
    /devis valable\s*30\s*jours/i
  );

  const paymentPercent =
    typeof depositPercent === 'number' && depositPercent > 0 ? depositPercent : 30;
  const paymentPct = Number.isInteger(paymentPercent)
    ? paymentPercent
    : Number(paymentPercent.toFixed(1));
  addMention(
    `Modalités de paiement :\nAcompte de ${paymentPct}% à la commande.\nSolde payable à la fin des travaux, à réception de la facture.`,
    /modalit[eé]s de paiement|acompte de/i
  );

  addMention(
    `Les travaux débuteront après acceptation du devis et réception de l’acompte.`,
    /travaux débuteront|acceptation du devis/i
  );

  addMention(
    `Toute prestation non prévue dans le présent devis fera l’objet d’un devis complémentaire.`,
    /prestation non prévue|devis complémentaire/i
  );

  if (tenant?.insurance_name || tenant?.insurance_origin || tenant?.insurance_contract) {
    const insuranceLine = [tenant?.insurance_name, tenant?.insurance_origin]
      .filter(Boolean)
      .join(' - ');
    const contractLine = tenant?.insurance_contract
      ? `Contrat n° ${tenant.insurance_contract}`
      : '';
    mentions.push(
      `Assurance décennale :\n${insuranceLine || 'Non renseignée'}${contractLine ? `\n${contractLine}` : ''}`
    );
  }
  mentions.push('Bon pour accord :\nDate ________  Signature du client');

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Devis ${quote.number}`}
        description="Edition et apercu client."
        actions={
          <>
            <Button variant="outline" asChild>
              <a href={`/api/pdf?type=quote&id=${quote.id}`} target="_blank" rel="noreferrer">
                Apercu PDF
              </a>
            </Button>
            <ConvertInvoiceButton quoteId={quote.id} disabled={quote.status !== 'accepte' || isExpired} />
            <CreateDepositInvoiceDialog
              quoteId={quote.id}
              defaultPercent={depositPercent}
              disabled={!(quote.status === 'accepte' || quote.status === 'envoye') || isExpired}
            />
            <DuplicateQuoteButton quoteId={quote.id} />
            <ValidateQuoteButton quoteId={quote.id} disabled={quote.status !== 'brouillon'} />
            <MarkQuoteAcceptedButton quoteId={quote.id} disabled={quote.status !== 'envoye'} />
            <MarkQuoteRefusedButton quoteId={quote.id} disabled={quote.status !== 'envoye'} />
          </>
        }
      />

      <SectionCard title="Chantier">
        <form action={updateQuoteMeta.bind(null, quote.id)} className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Type de chantier</span>
            <select
              name="job_type"
              defaultValue={quote.job_type || 'maison'}
              className="h-10 rounded-2xl border border-input bg-background px-3 text-sm"
              disabled={isLocked}
            >
              {JOB_TYPES.map((value) => (
                <option key={value} value={value}>
                  {JOB_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Acompte (%)</span>
            <Input
              name="deposit_percent"
              type="number"
              min="0"
              max="100"
              step="0.1"
              defaultValue={
                typeof depositPercent === 'number' ? String(depositPercent) : ''
              }
              className="h-10 w-32"
              disabled={isLocked}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Valable jusqu&apos;au</span>
            <Input
              name="valid_until"
              type="date"
              defaultValue={quote.valid_until || ''}
              className="h-10 w-40"
              disabled={isLocked}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="show_prices"
              name="show_prices"
              type="checkbox"
              value="true"
              defaultChecked={Boolean(quote.show_prices)}
              disabled={isLocked}
            />
            <input type="hidden" name="show_prices" value="false" />
            <label htmlFor="show_prices" className="text-sm">
              Afficher les prix de vente dans le PDF
            </label>
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="outline" disabled={isLocked}>
              Enregistrer
            </Button>
          </div>
        </form>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <SectionCard title="Pieces">
            <AddSectionForm quoteId={quote.id} locked={isLocked} />
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
                  <SectionNavItem
                    key={section.id}
                    quoteId={quote.id}
                    sectionId={section.id}
                    name={section.name}
                    count={section.count}
                    allowDuplicate={section.allowDuplicate}
                    disabled={isLocked}
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
                        Ajoutez des lignes dans une piece.
                      </TableCell>
                    </TableRow>
                  ) : (
                    generalItems.map((item: any) => (
                      <TableRow key={item.id}>
                        {(() => {
                          const formId = `update-${item.id}`;
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
                            disabled={isLocked}
                            form={formId}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {Number(item.internal_unit_price).toFixed(2)} EUR
                            </span>
                            <PriceOverrideDialog
                              quoteId={quote.id}
                              itemId={item.id}
                              currentPrice={Number(item.internal_unit_price)}
                              basePrice={item.products?.internal_unit_price ?? null}
                              disabled={isLocked}
                            />
                          </div>
                        </TableCell>
                        <TableCell>{item.vat_rate}%</TableCell>
                        <TableCell>
                          <AutoSectionSelect
                            action={updateQuoteItemSection}
                            options={sectionOptions}
                            defaultValue={item.section_id ?? ''}
                            disabled={isLocked}
                            itemId={item.id}
                            parentId={quote.id}
                            parentField="quote_id"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <form id={formId} action={updateQuoteItem.bind(null, quote.id, item.id)}>
                              <input
                                type="hidden"
                                name="internal_unit_price"
                                value={String(item.internal_unit_price ?? 0)}
                              />
                              <Button variant="ghost" size="sm" disabled={isLocked}>
                                Enregistrer
                              </Button>
                            </form>
                            <form action={deleteQuoteItem.bind(null, quote.id, item.id)}>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={isLocked}
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
                  <QuoteItemsForm
                    quoteId={quote.id}
                    products={(products || []) as any}
                    locked={isLocked}
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
                  <form action={moveQuoteSectionUp.bind(null, quote.id, section.id)}>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      disabled={isLocked || index === 0}
                    >
                      Monter
                    </Button>
                  </form>
                  <form action={moveQuoteSectionDown.bind(null, quote.id, section.id)}>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      disabled={isLocked || index === sectionItems.length - 1}
                    >
                      Descendre
                    </Button>
                  </form>
                  <DeleteSectionButton
                    quoteId={quote.id}
                    sectionId={section.id}
                    disabled={isLocked}
                  />
                </div>
              }
            >
              <form
                action={renameQuoteSection.bind(null, quote.id, section.id)}
                className="mb-4 flex flex-wrap items-center gap-2"
              >
                <Input
                  name="name"
                  defaultValue={section.name}
                  disabled={isLocked}
                />
                <Button type="submit" variant="outline" size="sm" disabled={isLocked}>
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
                        Ajoutez des lignes dans cette piece.
                      </TableCell>
                    </TableRow>
                  ) : (
                    section.items.map((item: any) => (
                      <TableRow key={item.id}>
                        {(() => {
                          const formId = `update-${item.id}`;
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
                            disabled={isLocked}
                            form={formId}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {Number(item.internal_unit_price).toFixed(2)} EUR
                            </span>
                            <PriceOverrideDialog
                              quoteId={quote.id}
                              itemId={item.id}
                              currentPrice={Number(item.internal_unit_price)}
                              basePrice={item.products?.internal_unit_price ?? null}
                              disabled={isLocked}
                            />
                          </div>
                        </TableCell>
                        <TableCell>{item.vat_rate}%</TableCell>
                        <TableCell>
                          <AutoSectionSelect
                            action={updateQuoteItemSection}
                            options={sectionOptions}
                            defaultValue={item.section_id ?? ''}
                            disabled={isLocked}
                            itemId={item.id}
                            parentId={quote.id}
                            parentField="quote_id"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <form id={formId} action={updateQuoteItem.bind(null, quote.id, item.id)}>
                              <input
                                type="hidden"
                                name="internal_unit_price"
                                value={String(item.internal_unit_price ?? 0)}
                              />
                              <Button variant="ghost" size="sm" disabled={isLocked}>
                                Enregistrer
                              </Button>
                            </form>
                            <form action={deleteQuoteItem.bind(null, quote.id, item.id)}>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={isLocked}
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
                  <QuoteItemsForm
                    quoteId={quote.id}
                    products={(products || []) as any}
                    locked={isLocked}
                    sectionId={section.id}
                  />
                </div>
              </div>
            </SectionCard>
          ))}
        </div>

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
          displayMode={quote.display_mode || 'total_only'}
          showPrices={Boolean(quote.show_prices)}
          depositPercent={depositPercent}
          depositAmount={depositAmount}
          remainingAmount={remainingAmount}
          mentions={mentions}
        />
      </div>
    </div>
  );
}
