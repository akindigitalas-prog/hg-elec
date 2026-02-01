'use client';

import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';

import { addPayment, type PaymentState } from './actions';
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

const initialState: PaymentState = {};

export function AddPaymentDialog({
  invoiceId,
  defaultAmount,
  disabled,
}: {
  invoiceId: string;
  defaultAmount: number;
  disabled?: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(
    addPayment.bind(null, invoiceId),
    initialState
  );

  useEffect(() => {
    if (state && !state.error) {
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" disabled={disabled}>
          Ajouter paiement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un paiement</DialogTitle>
          <DialogDescription>Enregistrez un paiement partiel ou total.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Montant</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min="0"
                step="0.01"
                defaultValue={defaultAmount.toFixed(2)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paid_at">Date</Label>
              <Input id="paid_at" name="paid_at" type="date" defaultValue={today} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="method">Methode</Label>
            <select
              id="method"
              name="method"
              className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
              defaultValue="virement"
            >
              <option value="virement">Virement</option>
              <option value="cb">Carte bancaire</option>
              <option value="especes">Especes</option>
              <option value="cheque">Cheque</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Input id="note" name="note" type="text" />
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
