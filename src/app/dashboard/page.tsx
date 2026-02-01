import Link from 'next/link';

import { PageHeader, SectionCard, StatCard } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createClient } from '@/lib/supabase/server';

const currency = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
});

const quoteStatusVariant: Record<string, 'secondary' | 'success' | 'warning' | 'danger'> = {
  brouillon: 'secondary',
  envoye: 'warning',
  accepte: 'success',
  refuse: 'danger',
  expire: 'secondary',
};

const invoiceStatusVariant: Record<string, 'secondary' | 'success' | 'warning' | 'danger'> = {
  brouillon: 'secondary',
  emise: 'warning',
  partiellement_payee: 'warning',
  payee: 'success',
  annulee: 'danger',
  en_retard: 'danger',
};

const toDateString = (value: Date) => value.toISOString().slice(0, 10);
const getCustomerName = (customers: any) =>
  Array.isArray(customers) ? customers[0]?.name : customers?.name;

export default async function DashboardPage() {
  const supabase = createClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [
    { data: quotes },
    { data: invoices },
    { data: monthInvoices },
    { data: yearInvoices },
    { count: pendingQuoteCount },
    { count: unpaidInvoiceCount },
  ] = await Promise.all([
    supabase
      .from('quotes')
      .select('id, number, status, issue_date, totals, customers(name)')
      .in('status', ['brouillon', 'envoye'])
      .order('issue_date', { ascending: false })
      .limit(5),
    supabase
      .from('invoices')
      .select('id, number, status, issue_date, due_date, totals, customers(name), payments(amount)')
      .in('status', ['emise', 'partiellement_payee'])
      .order('issue_date', { ascending: false })
      .limit(5),
    supabase
      .from('invoices')
      .select('id, status, issue_date, totals')
      .gte('issue_date', toDateString(startOfMonth))
      .neq('status', 'annulee'),
    supabase
      .from('invoices')
      .select('id, status, issue_date, totals')
      .gte('issue_date', toDateString(startOfYear))
      .neq('status', 'annulee'),
    supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .in('status', ['brouillon', 'envoye']),
    supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .in('status', ['emise', 'partiellement_payee']),
  ]);

  const monthRevenue = (monthInvoices || []).reduce((acc, invoice) => {
    const value = Number(invoice.totals?.total_ttc ?? 0);
    return acc + (Number.isFinite(value) ? value : 0);
  }, 0);

  const yearRevenue = (yearInvoices || []).reduce((acc, invoice) => {
    const value = Number(invoice.totals?.total_ttc ?? 0);
    return acc + (Number.isFinite(value) ? value : 0);
  }, 0);

  const pendingQuotesCount = pendingQuoteCount ?? 0;
  const today = toDateString(now);
  const overdueInvoices =
    (invoices || []).filter((invoice) => {
      const paidTotal = (invoice.payments || []).reduce(
        (sum: number, payment: any) => sum + Number(payment.amount || 0),
        0
      );
      const remaining = Math.max((invoice.totals?.total_ttc || 0) - paidTotal, 0);
      return invoice.due_date && invoice.due_date < today && remaining > 0;
    }) || [];
  const unpaidInvoicesCount = overdueInvoices.length || unpaidInvoiceCount || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Vue d'ensemble sur votre activite."
        actions={
          <Button asChild>
            <Link href="/quotes">Nouveau devis</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="CA du mois" value={currency.format(monthRevenue)} trend="Factures emises ce mois" highlight />
        <StatCard label="CA annuel" value={currency.format(yearRevenue)} trend={`Annee ${now.getFullYear()}`} />
        <StatCard label="Devis en attente" value={String(pendingQuotesCount)} trend="Brouillon + envoye" />
        <StatCard label="Factures impayees" value={String(unpaidInvoicesCount)} trend="En retard" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          title="Devis en cours"
          action={
            <Button variant="ghost" asChild>
              <Link href="/quotes">Voir tout</Link>
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <Table className="table-sticky min-w-[520px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes?.length ? (
                  quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.number}</TableCell>
                      <TableCell>{getCustomerName((quote as any).customers) || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={quoteStatusVariant[quote.status] || 'secondary'}>
                          {quote.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {currency.format(Number(quote.totals?.total_ttc ?? 0))}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Aucun devis en attente.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </SectionCard>

        <SectionCard
          title="Factures a relancer"
          action={
            <Button variant="ghost" asChild>
              <Link href="/invoices">Voir tout</Link>
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <Table className="table-sticky min-w-[520px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueInvoices.length ? (
                  overdueInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.number}</TableCell>
                      <TableCell>{getCustomerName((invoice as any).customers) || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={invoiceStatusVariant['en_retard']}>
                          en_retard
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {currency.format(Number(invoice.totals?.total_ttc ?? 0))}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Aucune facture en retard.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
