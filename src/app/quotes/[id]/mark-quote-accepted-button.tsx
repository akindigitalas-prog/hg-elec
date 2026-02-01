'use client';

import { useFormState } from 'react-dom';

import { Button } from '@/components/ui/button';
import { markQuoteAccepted, type QuoteItemState } from './actions';

const initialState: QuoteItemState = {};

export function MarkQuoteAcceptedButton({
  quoteId,
  disabled,
}: {
  quoteId: string;
  disabled?: boolean;
}) {
  const [state, formAction] = useFormState(
    markQuoteAccepted.bind(null, quoteId),
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <Button type="submit" variant="outline" disabled={disabled}>
        Marquer accepte
      </Button>
      {state?.error ? <span className="text-xs text-destructive">{state.error}</span> : null}
    </form>
  );
}
