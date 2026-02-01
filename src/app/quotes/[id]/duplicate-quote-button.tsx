'use client';

import { Button } from '@/components/ui/button';

import { duplicateQuoteAndRedirect } from './actions';

export function DuplicateQuoteButton({
  quoteId,
  disabled,
}: {
  quoteId: string;
  disabled?: boolean;
}) {
  return (
    <form action={duplicateQuoteAndRedirect}>
      <input type="hidden" name="quote_id" value={quoteId} />
      <Button type="submit" variant="outline" disabled={disabled}>
        Dupliquer
      </Button>
    </form>
  );
}
