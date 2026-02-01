'use client';

import { useFormState } from 'react-dom';

import { createInvoice, type InvoiceFormState } from '@/app/invoices/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Customer } from '@/lib/types';
import { JOB_TYPES, JOB_TYPE_LABELS } from '@/lib/constants';

const initialState: InvoiceFormState = {};

export function InvoiceDialog({ customers }: { customers: Customer[] }) {
  const [state, formAction] = useFormState(createInvoice, initialState);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Nouvelle facture</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Creer une facture</DialogTitle>
          <DialogDescription>Conversion depuis devis accepte possible.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="customer_id">Client</Label>
            <select
              id="customer_id"
              name="customer_id"
              className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Selectionner</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="issue_date">Date</Label>
              <Input id="issue_date" name="issue_date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Echeance</Label>
              <Input id="due_date" name="due_date" type="date" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="job_type">Type de chantier</Label>
            <select
              id="job_type"
              name="job_type"
              className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
              defaultValue="maison"
            >
              {JOB_TYPES.map((value) => (
                <option key={value} value={value}>
                  {JOB_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input id="show_prices" name="show_prices" type="checkbox" value="true" />
            <input type="hidden" name="show_prices" value="false" />
            <Label htmlFor="show_prices">Afficher les prix de vente dans le PDF</Label>
          </div>
          {state?.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="submit">Creer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

