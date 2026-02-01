'use client';

import { useFormState } from 'react-dom';

import { Button } from '@/components/ui/button';
import { convertQuoteToInvoice, type ConvertState } from './actions';

const initialState: ConvertState = {};

export function ConvertInvoiceButton({
  quoteId,
  disabled,
}: {
  quoteId: string;
  disabled?: boolean;
}) {
  const [state, formAction] = useFormState(
    convertQuoteToInvoice.bind(null, quoteId),
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <Button type="submit" disabled={disabled}>
        Creer facture
      </Button>
      {state?.error ? (
        <span className="text-xs text-destructive">{state.error}</span>
      ) : null}
    </form>
  );
}
