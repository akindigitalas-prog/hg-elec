import Link from 'next/link';

import { listCustomers, listInvoices } from '@/lib/data';
import { PageHeader, SectionCard } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InvoiceDialog } from '@/app/invoices/invoice-dialog';
import {
  INVOICE_STATUSES,
  JOB_TYPE_LABELS,
  JOB_TYPES,
} from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { deleteInvoice, duplicateInvoice, updateInvoiceStatus, emitInvoice } from '@/app/invoices/actions';
import { MenuActionItem } from '@/components/menu-action-item';
import { getRemainingAmount, isInvoiceOverdue, sumPayments } from '@/lib/payments';

const statusVariant: Record<string, 'secondary' | 'success' | 'warning' | 'danger'> = {
  brouillon: 'secondary',
  emise: 'warning',
  partiellement_payee: 'warning',
  payee: 'success',
  annulee: 'danger',
  en_retard: 'danger',
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { status?: string; job_type?: string; search?: string };
}) {
  const status = (searchParams.status || 'all') as string;
  const jobType = (searchParams.job_type || 'all') as string;
  const search = (searchParams.search || '') as string;

  const [invoices, customers] = await Promise.all([
    listInvoices({
      status: status === 'all' ? 'all' : (status as any),
      job_type: jobType === 'all' ? 'all' : (jobType as any),
      search,
    }),
    listCustomers(),
  ]);
  const customerMap = new Map(customers.map((customer) => [customer.id, customer.name]));
  const formatter = new Intl.DateTimeFormat('fr-FR');
  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    return formatter.format(new Date(`${value}T00:00:00`));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Factures"
        description="Emission, paiements et suivi des relances."
        actions={<InvoiceDialog customers={customers} />}
      />

      <SectionCard title="Liste factures">
        <form method="get" className="mb-4 flex flex-wrap gap-3">
          <Input
            name="search"
            placeholder="Rechercher (numero ou client)"
            className="w-56"
            defaultValue={search}
          />
          <select
            name="status"
            defaultValue={status}
            className="h-10 rounded-2xl border border-input bg-background px-3 text-sm"
          >
            <option value="all">Tous statuts</option>
            {INVOICE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            name="job_type"
            defaultValue={jobType}
            className="h-10 rounded-2xl border border-input bg-background px-3 text-sm"
          >
            <option value="all">Tous types</option>
            {JOB_TYPES.map((value) => (
              <option key={value} value={value}>
                {JOB_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-10 rounded-2xl bg-primary px-4 text-sm text-primary-foreground"
          >
            Filtrer
          </button>
        </form>
        {/* Mobile: cards */}
        <div className="space-y-3 lg:hidden">
          {invoices.length === 0 ? (
            <div className="rounded-2xl border bg-white p-4 text-center text-muted-foreground">
              Aucune facture.
            </div>
          ) : (
            invoices.map((invoice) => {
              const paidTotal = sumPayments(invoice.payments as any);
              const remaining = getRemainingAmount(invoice.totals?.total_ttc || 0, paidTotal);
              const isOverdue = isInvoiceOverdue({
                status: invoice.status as any,
                due_date: invoice.due_date,
                remaining,
                today: new Date().toISOString().slice(0, 10),
              });
              const displayStatus = isOverdue ? 'en_retard' : invoice.status;

              return (
                <div key={invoice.id} className="rounded-2xl border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-muted-foreground">Facture</div>
                      <div className="truncate text-base font-semibold">{invoice.number}</div>
                      <div className="truncate text-sm text-muted-foreground">
                        {invoice.customers?.name ||
                          customerMap.get(invoice.customer_id) ||
                          invoice.customer_id}
                      </div>
                    </div>

                    <Badge
                      variant={statusVariant[displayStatus] || 'secondary'}
                      className="shrink-0"
                    >
                      {displayStatus}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="truncate text-xs text-muted-foreground">
                      {JOB_TYPE_LABELS[invoice.job_type]} - {formatDate(invoice.issue_date)}
                    </div>

                    <Link
                      className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                      href={`/invoices/${invoice.id}`}
                    >
                      Ouvrir
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {/* Desktop: table */}
        <div className="hidden overflow-x-auto lg:block">
          <Table className="table-sticky min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Aucune facture.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => {
                  const paidTotal = sumPayments(invoice.payments as any);
                  const remaining = getRemainingAmount(invoice.totals?.total_ttc || 0, paidTotal);
                  const isOverdue = isInvoiceOverdue({
                    status: invoice.status as any,
                    due_date: invoice.due_date,
                    remaining,
                    today: new Date().toISOString().slice(0, 10),
                  });
                  const displayStatus = isOverdue ? 'en_retard' : invoice.status;
                  const canEmit = invoice.status === 'brouillon';
                  const canAddPayment =
                    (invoice.status === 'emise' || invoice.status === 'partiellement_payee' || isOverdue) &&
                    remaining > 0;
                  const canCancel = invoice.status !== 'payee' && invoice.status !== 'annulee';

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.number}</TableCell>
                      <TableCell>
                        {invoice.customers?.name ||
                          customerMap.get(invoice.customer_id) ||
                          invoice.customer_id}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[displayStatus] || 'secondary'}>
                          {displayStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{JOB_TYPE_LABELS[invoice.job_type]}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(invoice.issue_date)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link className="text-primary" href={`/invoices/${invoice.id}`}>
                            Ouvrir
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <a
                                  href={`/api/pdf?type=invoice&id=${invoice.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Apercu PDF
                                </a>
                              </DropdownMenuItem>
                              <MenuActionItem action={duplicateInvoice} args={[invoice.id]}>
                                Dupliquer
                              </MenuActionItem>
                              {canEmit ? (
                                <MenuActionItem action={emitInvoice} args={[invoice.id]}>
                                  Emettre
                                </MenuActionItem>
                              ) : null}
                              {canAddPayment ? (
                                <DropdownMenuItem asChild>
                                  <Link href={`/invoices/${invoice.id}`}>Ajouter paiement</Link>
                                </DropdownMenuItem>
                              ) : null}
                              {canCancel ? (
                                <MenuActionItem
                                  action={updateInvoiceStatus}
                                  args={[invoice.id, 'annulee']}
                                >
                                  Annuler
                                </MenuActionItem>
                              ) : null}
                              <MenuActionItem
                                action={deleteInvoice}
                                args={[invoice.id]}
                                className="text-destructive"
                                confirmMessage="Supprimer cette facture ?"
                              >
                                Supprimer
                              </MenuActionItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}