'use client';

import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';
import { useRouter } from 'next/navigation';

import { createQuote, type QuoteFormState } from '@/app/quotes/actions';
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

const initialState: QuoteFormState = {};

export function QuoteDialog({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [useNewCustomer, setUseNewCustomer] = useState(false);
  const [state, formAction] = useFormState(createQuote, initialState);

  useEffect(() => {
    if (state?.id) {
      setOpen(false);
      router.push(`/quotes/${state.id}`);
    }
  }, [state?.id, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nouveau devis</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Creer un devis</DialogTitle>
          <DialogDescription>Les prix unitaires restent internes.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="customer_id">Client</Label>
            <select
              id="customer_id"
              name="customer_id"
              className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
              required={!useNewCustomer}
              disabled={useNewCustomer}
            >
              <option value="">Selectionner</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Client absent ? Creez-le directement ici.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUseNewCustomer((value) => !value)}
              >
                {useNewCustomer ? 'Choisir existant' : 'Nouveau client'}
              </Button>
            </div>
          </div>
          {useNewCustomer ? (
            <div className="space-y-3 rounded-2xl border border-dashed border-muted-foreground/30 p-4">
              <p className="text-sm font-semibold">Nouveau client</p>
              <div className="space-y-2">
                <Label htmlFor="new_customer_name">Nom</Label>
                <Input id="new_customer_name" name="new_customer_name" required />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new_customer_email">Email</Label>
                  <Input id="new_customer_email" name="new_customer_email" type="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_customer_phone">Telephone</Label>
                  <Input id="new_customer_phone" name="new_customer_phone" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_customer_address">Adresse</Label>
                <Input id="new_customer_address" name="new_customer_address" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new_customer_postal_code">Code postal</Label>
                  <Input id="new_customer_postal_code" name="new_customer_postal_code" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_customer_city">Ville</Label>
                  <Input id="new_customer_city" name="new_customer_city" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Le client sera ajoute automatiquement a votre liste clients.
              </p>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="issue_date">Date</Label>
            <Input id="issue_date" name="issue_date" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="display_mode">Affichage client</Label>
            <select
              id="display_mode"
              name="display_mode"
              className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="total_only">Total global uniquement</option>
              <option value="group_totals">Totaux par famille</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input id="show_prices" name="show_prices" type="checkbox" value="true" />
            <input type="hidden" name="show_prices" value="false" />
            <Label htmlFor="show_prices">Afficher les prix de vente dans le PDF</Label>
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

