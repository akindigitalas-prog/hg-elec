'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useFormState } from 'react-dom';

import { addInvoiceSection, type InvoiceItemState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ROOM_SUGGESTIONS } from '@/lib/constants';

const initialState: InvoiceItemState = {};

export function AddInvoiceSectionForm({
  invoiceId,
  locked,
}: {
  invoiceId: string;
  locked: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const formId = useId();

  const [state, formAction] = useFormState(
    addInvoiceSection.bind(null, invoiceId),
    initialState
  );

  useEffect(() => {
    if (state?.ok) {
      setQuery('');
      setSelected(null);
      setOpen(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [state]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return ROOM_SUGGESTIONS;
    return ROOM_SUGGESTIONS.filter((room) => room.toLowerCase().includes(term));
  }, [query]);

  return (
    <form action={formAction} className="flex flex-wrap gap-2">
      <input type="hidden" name="name" value={selected ?? query} />
      <div className="relative">
        <Input
          id={formId}
          ref={inputRef}
          value={selected ?? query}
          onChange={(event) => {
            setSelected(null);
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder="Nom de la piece"
          disabled={locked}
          autoComplete="off"
          className="w-56"
        />
        {open ? (
          <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl border bg-background shadow-soft">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Aucun resultat.
              </div>
            ) : (
              filtered.map((room) => (
                <button
                  key={room}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setSelected(room);
                    setQuery(room);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">{room}</span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
      <Button type="submit" disabled={locked}>
        Ajouter une piece
      </Button>
      {state?.error ? <span className="text-xs text-destructive">{state.error}</span> : null}
    </form>
  );
}
