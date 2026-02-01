'use client';

import { useFormState } from 'react-dom';

import { Button } from '@/components/ui/button';
import { deleteQuoteSection, type QuoteItemState } from './actions';

const initialState: QuoteItemState = {};

export function DeleteSectionButton({
  quoteId,
  sectionId,
  disabled,
}: {
  quoteId: string;
  sectionId: string;
  disabled?: boolean;
}) {
  const [state, formAction] = useFormState(
    deleteQuoteSection.bind(null, quoteId, sectionId),
    initialState
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <Button type="submit" variant="ghost" size="sm" disabled={disabled}>
          Supprimer
        </Button>
      </form>
      {state?.error ? <span className="text-xs text-destructive">{state.error}</span> : null}
    </div>
  );
}
