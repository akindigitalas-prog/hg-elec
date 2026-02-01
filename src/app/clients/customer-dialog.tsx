'use client';

import { useFormState } from 'react-dom';

import { createCustomer, type CustomerFormState } from '@/app/clients/actions';
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

const initialState: CustomerFormState = {};

export function CustomerDialog() {
  const [state, formAction] = useFormState(createCustomer, initialState);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Nouveau client</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un client</DialogTitle>
          <DialogDescription>Coordonnees et informations de facturation.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telephone</Label>
              <Input id="phone" name="phone" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Textarea id="address" name="address" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="postal_code">Code postal</Label>
              <Input id="postal_code" name="postal_code" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input id="city" name="city" />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="siret">SIRET</Label>
              <Input id="siret" name="siret" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" />
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

