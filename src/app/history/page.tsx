import { PageHeader, SectionCard } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createClient } from '@/lib/supabase/server';

const statusVariant: Record<string, 'secondary' | 'success' | 'warning' | 'danger'> = {
  brouillon: 'secondary',
  envoye: 'warning',
  accepte: 'success',
  refuse: 'danger',
  expire: 'secondary',
  emise: 'warning',
  partiellement_payee: 'warning',
  payee: 'success',
  annulee: 'danger',
  en_retard: 'danger',
};

export default async function HistoryPage() {
  const supabase = createClient();
  const [{ data: quotes }, { data: invoices }] = await Promise.all([
    supabase
      .from('quotes')
      .select('id, number, status, issue_date, customers(name)')
      .order('issue_date', { ascending: false })
      .limit(15),
    supabase
      .from('invoices')
      .select('id, number, status, issue_date, customers(name)')
      .order('issue_date', { ascending: false })
      .limit(15),
  ]);

  const rows = [
    ...(quotes || []).map((quote) => {
      const customers = (quote as { customers?: { name?: string } | { name?: string }[] })
        .customers;
      const client = Array.isArray(customers) ? customers[0]?.name : customers?.name;
      return {
        id: quote.id,
        type: 'Devis',
        number: quote.number,
        client: client || '-',
        status: quote.status,
        date: quote.issue_date,
      };
    }),
    ...(invoices || []).map((invoice) => {
      const customers = (invoice as {
        customers?: { name?: string } | { name?: string }[];
      }).customers;
      const client = Array.isArray(customers) ? customers[0]?.name : customers?.name;
      return {
        id: invoice.id,
        type: 'Facture',
        number: invoice.number,
        client: client || '-',
        status: invoice.status,
        date: invoice.issue_date,
      };
    }),
  ]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 20);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historique"
        description="Filtrer les devis et factures par periode."
      />

      <SectionCard
        title="Recherche"
        action={<Input placeholder="Filtrer par client" className="w-56" />}
      >
        <Table className="table-sticky">
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Numero</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.type}</TableCell>
                  <TableCell className="font-medium">{row.number}</TableCell>
                  <TableCell>{row.client}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[row.status] || 'secondary'}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.date}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Aucun historique pour le moment.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}

