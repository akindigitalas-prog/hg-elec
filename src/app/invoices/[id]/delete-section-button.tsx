'use client';

import { useFormState } from 'react-dom';

import { Button } from '@/components/ui/button';
import { deleteInvoiceSection, type InvoiceItemState } from './actions';

const initialState: InvoiceItemState = {};

export function DeleteInvoiceSectionButton({
  invoiceId,
  sectionId,
  disabled,
}: {
  invoiceId: string;
  sectionId: string;
  disabled?: boolean;
}) {
  const [state, formAction] = useFormState(
    deleteInvoiceSection.bind(null, invoiceId, sectionId),
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
