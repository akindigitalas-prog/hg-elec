import Link from 'next/link';

import { listCustomers } from '@/lib/data';
import { PageHeader, SectionCard } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CustomerDialog } from '@/app/clients/customer-dialog';
import { EditCustomerDialog } from '@/app/clients/edit-customer-dialog';
import { MenuActionItem } from '@/components/menu-action-item';
import { deleteCustomer } from '@/app/clients/actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

export default async function ClientsPage() {
  const customers = await listCustomers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Contacts, SIRET et notes internes."
        actions={<CustomerDialog />}
      />

      <SectionCard
        title="Liste clients"
        action={<Input placeholder="Rechercher" className="w-56" />}
      >
        {/* Mobile: cards */}
        <div className="space-y-3 lg:hidden">
          {customers.length === 0 ? (
            <div className="rounded-2xl border bg-white p-4 text-center text-muted-foreground">
              Aucun client pour le moment.
            </div>
          ) : (
            customers.map((c) => (
              <div key={c.id} className="rounded-2xl border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold">{c.name}</div>
                    <div className="truncate text-sm text-muted-foreground">
                      {c.email || '-'} - {c.phone || '-'}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {(c.address ? `${c.address} - ` : '')}
                      {c.postal_code || ''} {c.city || ''}
                    </div>
                  </div>

                  <Link
                    className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                    href={`/clients/${c.id}`}
                  >
                    Voir
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
        {/* Desktop: table */}
        <div className="hidden overflow-x-auto lg:block">
          <Table className="table-sticky min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telephone</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>CP</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Aucun client pour le moment.
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.email || '-'}</TableCell>
                    <TableCell>{customer.phone || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{customer.address || '-'}</TableCell>
                    <TableCell>{customer.postal_code || '-'}</TableCell>
                    <TableCell>{customer.city || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/clients/${customer.id}`}>Voir</Link>
                        </Button>
                        <EditCustomerDialog customer={customer} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <MenuActionItem
                              action={deleteCustomer}
                              args={[customer.id]}
                              className="text-destructive"
                              confirmMessage="Supprimer ce client ?"
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
        </div>
      </SectionCard>
    </div>
  );
}