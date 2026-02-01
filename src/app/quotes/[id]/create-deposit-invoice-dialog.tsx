'use client';

import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';

import { createDepositInvoice, type ConvertState } from './actions';
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

const initialState: ConvertState = {};

export function CreateDepositInvoiceDialog({
  quoteId,
  defaultPercent,
  disabled,
}: {
  quoteId: string;
  defaultPercent?: number | null;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(
    createDepositInvoice.bind(null, quoteId),
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
        <Button type="button" variant="outline" disabled={disabled}>
          Creer facture d acompte
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Facture d acompte</DialogTitle>
          <DialogDescription>
            Renseignez un pourcentage ou un montant.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="percent">Pourcentage (%)</Label>
              <Input
                id="percent"
                name="percent"
                type="number"
                min="0"
                max="100"
                step="0.1"
                defaultValue={
                  typeof defaultPercent === 'number' ? String(defaultPercent) : ''
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Montant TTC</Label>
              <Input id="amount" name="amount" type="number" min="0" step="0.01" />
            </div>
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
