'use client';

import { useFormState } from 'react-dom';

import { Button } from '@/components/ui/button';
import { validateQuote, type QuoteItemState } from './actions';

const initialState: QuoteItemState = {};

export function ValidateQuoteButton({
  quoteId,
  disabled,
}: {
  quoteId: string;
  disabled?: boolean;
}) {
  const [state, formAction] = useFormState(
    validateQuote.bind(null, quoteId),
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <Button type="submit" disabled={disabled}>
        Envoyer / Verrouiller
      </Button>
      {state?.error ? <span className="text-xs text-destructive">{state.error}</span> : null}
    </form>
  );
}
