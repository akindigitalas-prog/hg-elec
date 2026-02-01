'use client';

import { useTransition } from 'react';
import { Plus } from 'lucide-react';

import { addNumberedInvoiceSection } from './actions';

export function InvoiceSectionNavItem({
  invoiceId,
  sectionId,
  name,
  count,
  allowDuplicate,
  disabled,
}: {
  invoiceId: string;
  sectionId: string;
  name: string;
  count: number;
  allowDuplicate?: boolean;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <a
        href={`#section-${sectionId}`}
        className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm hover:bg-muted"
      >
        <span className="font-medium">{name}</span>
        <span className="rounded-full bg-muted px-2 text-xs">{count}</span>
      </a>
      {allowDuplicate ? (
        <button
          type="button"
          aria-label={`Dupliquer ${name}`}
          disabled={disabled || isPending}
          className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
          onClick={() =>
            startTransition(async () => {
              await addNumberedInvoiceSection(invoiceId, name);
            })
          }
        >
          <Plus className="h-3 w-3" />
          Dupliquer
        </button>
      ) : null}
    </div>
  );
}
