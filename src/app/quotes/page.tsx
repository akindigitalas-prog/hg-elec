import Link from 'next/link';

import { listCustomers, listQuotes } from '@/lib/data';
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
import { QuoteDialog } from '@/app/quotes/quote-dialog';
import {
  JOB_TYPE_LABELS,
  JOB_TYPES,
  QUOTE_STATUSES,
} from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { deleteQuote, duplicateQuote, updateQuoteStatus } from '@/app/quotes/actions';
import { MenuActionItem } from '@/components/menu-action-item';

const statusVariant: Record<string, 'secondary' | 'success' | 'warning' | 'danger'> = {
  brouillon: 'secondary',
  envoye: 'warning',
  accepte: 'success',
  refuse: 'danger',
  expire: 'secondary',
};

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: { status?: string; job_type?: string; search?: string };
}) {
  const status = (searchParams.status || 'all') as string;
  const jobType = (searchParams.job_type || 'all') as string;
  const search = (searchParams.search || '') as string;

  const [quotes, customers] = await Promise.all([
    listQuotes({
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
        title="Devis"
        description="Creation, suivi et validation des devis."
        actions={<QuoteDialog customers={customers} />}
      />

      <SectionCard title="Liste devis">
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
            {QUOTE_STATUSES.map((value) => (
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
        <Table className="table-sticky">
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
            {quotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Aucun devis. Creez-en un.
                </TableCell>
              </TableRow>
            ) : (
              quotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">{quote.number}</TableCell>
                  <TableCell>
                    {quote.customers?.name ||
                      customerMap.get(quote.customer_id) ||
                      quote.customer_id}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[quote.status] || 'secondary'}>
                      {quote.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{JOB_TYPE_LABELS[quote.job_type]}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(quote.issue_date)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link className="text-primary" href={`/quotes/${quote.id}`}>
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
                              href={`/api/pdf?type=quote&id=${quote.id}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Apercu PDF
                            </a>
                          </DropdownMenuItem>
                          <MenuActionItem action={duplicateQuote} args={[quote.id]}>
                            Dupliquer
                          </MenuActionItem>
                          {quote.status === 'brouillon' ? (
                            <MenuActionItem
                              action={updateQuoteStatus}
                              args={[quote.id, 'envoye']}
                            >
                              Marquer envoye
                            </MenuActionItem>
                          ) : null}
                          {quote.status === 'envoye' ? (
                            <>
                              <MenuActionItem
                                action={updateQuoteStatus}
                                args={[quote.id, 'accepte']}
                              >
                                Marquer accepte
                              </MenuActionItem>
                              <MenuActionItem
                                action={updateQuoteStatus}
                                args={[quote.id, 'refuse']}
                              >
                                Marquer refuse
                              </MenuActionItem>
                            </>
                          ) : null}
                          <MenuActionItem
                            action={deleteQuote}
                            args={[quote.id]}
                            className="text-destructive"
                            confirmMessage="Supprimer ce devis ?"
                          >
                            Supprimer
                          </MenuActionItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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

