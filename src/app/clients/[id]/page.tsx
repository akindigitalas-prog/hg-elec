import { notFound } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { PageHeader, SectionCard } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

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

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!customer) {
    notFound();
  }

  const [{ data: quotes }, { data: invoices }] = await Promise.all([
    supabase
      .from('quotes')
      .select('id, number, status, issue_date')
      .eq('customer_id', customer.id)
      .order('issue_date', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, number, status, issue_date, totals, payments(amount)')
      .eq('customer_id', customer.id)
      .order('issue_date', { ascending: false }),
  ]);

  const invoiceRows = invoices || [];
  const totalInvoiced = invoiceRows.reduce((sum, invoice: any) => {
    if (invoice.status === 'brouillon' || invoice.status === 'annulee') return sum;
    return sum + Number(invoice.totals?.total_ttc || 0);
  }, 0);
  const totalPaid = invoiceRows.reduce((sum, invoice: any) => {
    const paid = (invoice.payments || []).reduce(
      (inner: number, payment: any) => inner + Number(payment.amount || 0),
      0
    );
    return sum + paid;
  }, 0);
  const totalRemaining = Math.max(totalInvoiced - totalPaid, 0);

  const formatter = new Intl.DateTimeFormat('fr-FR');
  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    return formatter.format(new Date(`${value}T00:00:00`));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        description="Fiche client avec historique des devis et factures."
        actions={
          <Button variant="outline" asChild>
            <Link href="/clients">Retour liste</Link>
          </Button>
        }
      />

      <SectionCard title="Informations client">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-sm font-medium">{customer.email || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Telephone</p>
            <p className="text-sm font-medium">{customer.phone || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Adresse</p>
            <p className="text-sm font-medium">{customer.address || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Code postal / Ville</p>
            <p className="text-sm font-medium">
              {[customer.postal_code, customer.city].filter(Boolean).join(' ') || '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">SIRET</p>
            <p className="text-sm font-medium">{customer.siret || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Notes</p>
            <p className="text-sm font-medium whitespace-pre-line">{customer.notes || '-'}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Synthese facturation">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Total facture</p>
            <p className="text-lg font-semibold">{totalInvoiced.toFixed(2)} EUR</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total paye</p>
            <p className="text-lg font-semibold">{totalPaid.toFixed(2)} EUR</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Reste a payer</p>
            <p className="text-lg font-semibold">{totalRemaining.toFixed(2)} EUR</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Devis">
        <Table className="table-sticky">
          <TableHeader>
            <TableRow>
              <TableHead>Numero</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(quotes || []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Aucun devis pour ce client.
                </TableCell>
              </TableRow>
            ) : (
              (quotes || []).map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">{quote.number}</TableCell>
                  <TableCell>
                    <Badge variant={quoteStatusVariant[quote.status] || 'secondary'}>
                      {quote.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(quote.issue_date)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/quotes/${quote.id}`}>Ouvrir</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </SectionCard>

      <SectionCard title="Factures">
        <Table className="table-sticky">
          <TableHeader>
            <TableRow>
              <TableHead>Numero</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(invoices || []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Aucune facture pour ce client.
                </TableCell>
              </TableRow>
            ) : (
              (invoices || []).map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.number}</TableCell>
                  <TableCell>
                    <Badge variant={invoiceStatusVariant[invoice.status] || 'secondary'}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(invoice.issue_date)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/invoices/${invoice.id}`}>Ouvrir</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
