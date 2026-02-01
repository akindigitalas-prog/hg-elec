'use client';

import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';

import { updateQuoteItemPrice, type QuoteItemState } from './actions';
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

const initialState: QuoteItemState = {};

export function PriceOverrideDialog({
  quoteId,
  itemId,
  currentPrice,
  basePrice,
  disabled,
}: {
  quoteId: string;
  itemId: string;
  currentPrice: number;
  basePrice?: number | null;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(
    updateQuoteItemPrice.bind(null, quoteId, itemId),
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
        <Button type="button" variant="ghost" size="sm" disabled={disabled}>
          Modifier prix
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Prix de la ligne</DialogTitle>
          <DialogDescription>
            Prix du catalogue et prix specifique pour ce devis.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Prix catalogue: {basePrice != null ? `${basePrice.toFixed(2)} EUR` : 'N/A'}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`price-${itemId}`}>Prix devis</Label>
            <Input
              id={`price-${itemId}`}
              name="internal_unit_price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={currentPrice}
              required
            />
          </div>
          {state?.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
