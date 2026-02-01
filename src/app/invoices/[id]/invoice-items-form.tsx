'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useFormState } from 'react-dom';

import { addInvoiceFreeLine, addInvoiceItemFromProduct, type InvoiceItemState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_TYPES,
  PRODUCT_UNITS,
  VAT_RATES,
} from '@/lib/constants';
import type { Product } from '@/lib/types';

const initialState: InvoiceItemState = {};

export function InvoiceItemsForm({
  invoiceId,
  products,
  locked,
  sectionId,
}: {
  invoiceId: string;
  products: Product[];
  locked: boolean;
  sectionId?: string | null;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const productInputRef = useRef<HTMLInputElement | null>(null);
  const freeFormRef = useRef<HTMLFormElement | null>(null);
  const [freeOpen, setFreeOpen] = useState(false);

  const baseId = useId();
  const productId = `${baseId}-product`;
  const qtyId = `${baseId}-qty`;
  const labelId = `${baseId}-label`;
  const typeId = `${baseId}-type`;
  const unitId = `${baseId}-unit`;
  const vatId = `${baseId}-vat`;
  const priceId = `${baseId}-price`;
  const [productState, productAction] = useFormState(
    addInvoiceItemFromProduct.bind(null, invoiceId),
    initialState
  );
  const [freeState, freeAction] = useFormState(
    addInvoiceFreeLine.bind(null, invoiceId),
    initialState
  );

  useEffect(() => {
    if (productState?.ok) {
      setSelected(null);
      setQuery('');
      setOpen(false);
      if (productInputRef.current) {
        productInputRef.current.focus();
      }
    }
  }, [productState]);

  useEffect(() => {
    if (freeState?.ok) {
      setFreeOpen(false);
      if (freeFormRef.current) {
        freeFormRef.current.reset();
      }
    }
  }, [freeState]);

  const [category, setCategory] = useState<'all' | (typeof PRODUCT_CATEGORIES)[number]>('all');

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    let list = products;
    if (category !== 'all') {
      list = list.filter((product) => product.category === category);
    }
    if (!term) {
      return list.slice(0, 30);
    }
    return list
      .filter((product) => product.name.toLowerCase().includes(term))
      .slice(0, 30);
  }, [products, query, category]);

  return (
    <div className="space-y-6">
      <form action={productAction} className="space-y-3">
        <input type="hidden" name="section_id" value={sectionId ?? ''} />
        <input type="hidden" name="product_id" value={selected?.id ?? ''} />
        <div className="grid gap-3 md:grid-cols-[1.2fr_2fr_1fr]">
          <div className="space-y-2">
            <Label htmlFor={`${baseId}-category`}>Categorie</Label>
            <select
              id={`${baseId}-category`}
              value={category}
              onChange={(event) => {
                const next = event.target.value as typeof category;
                setCategory(next);
                setSelected(null);
                setQuery('');
                setOpen(true);
              }}
              className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
              disabled={locked}
            >
              <option value="all">Toutes</option>
              {PRODUCT_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {PRODUCT_CATEGORY_LABELS[value] || value}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={productId}>Produit catalogue</Label>
            <div className="relative">
              <Input
                id={productId}
                ref={productInputRef}
                value={selected ? selected.name : query}
                onChange={(event) => {
                  setSelected(null);
                  setQuery(event.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setOpen(false), 150);
                }}
                placeholder="Rechercher un produit"
                disabled={locked}
                autoComplete="off"
                required
              />
              {open ? (
                <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl border bg-background shadow-soft">
                  {filteredProducts.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Aucun resultat.
                    </div>
                  ) : (
                    filteredProducts.map((product) => (
                      <button
                        type="button"
                        key={product.id}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setSelected(product);
                          setQuery(product.name);
                          setOpen(false);
                        }}
                      >
                        <span className="font-medium">{product.name}</span>
                        <span className="text-xs text-muted-foreground">{product.unit}</span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={qtyId}>Quantite</Label>
            <Input
              id={qtyId}
              name="qty"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue="1"
              disabled={locked}
              required
            />
          </div>
        </div>
        {productState?.error ? (
          <p className="text-sm text-destructive">{productState.error}</p>
        ) : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={locked}>
            Ajouter
          </Button>
        </div>
      </form>

      <Dialog open={freeOpen} onOpenChange={setFreeOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" disabled={locked}>
            Ajouter une ligne libre
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une ligne libre</DialogTitle>
            <DialogDescription>Creation d&apos;une ligne hors catalogue.</DialogDescription>
          </DialogHeader>
          <form ref={freeFormRef} action={freeAction} className="space-y-3">
            <input type="hidden" name="section_id" value={sectionId ?? ''} />
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={labelId}>Designation</Label>
                <Input id={labelId} name="label" disabled={locked} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor={typeId}>Type</Label>
                <select
                  id={typeId}
                  name="item_type"
                  className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                  defaultValue="fourniture"
                  disabled={locked}
                >
                  {PRODUCT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={unitId}>Unite</Label>
                <select
                  id={unitId}
                  name="unit"
                  className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                  defaultValue="piece"
                  disabled={locked}
                >
                  {PRODUCT_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={vatId}>TVA</Label>
                <select
                  id={vatId}
                  name="vat_rate"
                  className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                  defaultValue="20"
                  disabled={locked}
                >
                  {VAT_RATES.map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}%
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={priceId}>Prix de vente</Label>
                <Input
                  id={priceId}
                  name="internal_unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={locked}
                  required
                />
              </div>
            </div>
            {freeState?.error ? (
              <p className="text-sm text-destructive">{freeState.error}</p>
            ) : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={locked}>
                Ajouter
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
