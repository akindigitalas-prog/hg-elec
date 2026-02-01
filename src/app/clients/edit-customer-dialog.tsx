'use client';

import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';

import type { Customer } from '@/lib/types';
import { updateCustomer, type CustomerUpdateState } from '@/app/clients/actions';
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
import { Textarea } from '@/components/ui/textarea';

const initialState: CustomerUpdateState = {};

export function EditCustomerDialog({ customer }: { customer: Customer }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(
    updateCustomer.bind(null, customer.id),
    initialState
  );

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le client</DialogTitle>
          <DialogDescription>Mettre a jour les informations.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" name="name" defaultValue={customer.name} required />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={customer.email || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telephone</Label>
              <Input id="phone" name="phone" defaultValue={customer.phone || ''} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Textarea id="address" name="address" defaultValue={customer.address || ''} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="postal_code">Code postal</Label>
              <Input id="postal_code" name="postal_code" defaultValue={customer.postal_code || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input id="city" name="city" defaultValue={customer.city || ''} />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="siret">SIRET</Label>
              <Input id="siret" name="siret" defaultValue={customer.siret || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={customer.notes || ''} />
            </div>
          </div>
          {state?.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
