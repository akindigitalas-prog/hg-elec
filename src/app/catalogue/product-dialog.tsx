'use client';

import { useFormState } from 'react-dom';

import { createProduct, type ProductFormState } from '@/app/catalogue/actions';
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
import { Textarea } from '@/components/ui/textarea';
import { PRODUCT_CATEGORIES, PRODUCT_TYPES, PRODUCT_UNITS, VAT_RATES } from '@/lib/constants';

const initialState: ProductFormState = {};

export function ProductDialog() {
  const [state, formAction] = useFormState(createProduct, initialState);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Nouveau produit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un article</DialogTitle>
          <DialogDescription>Vos prix de vente restent invisibles.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Libelle</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categorie</Label>
              <select
                id="category"
                name="category"
                className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Selectionner</option>
                {PRODUCT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subcategory">Sous-categorie</Label>
              <Input id="subcategory" name="subcategory" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Marque</Label>
              <Input id="brand" name="brand" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">Reference</Label>
              <Input id="sku" name="sku" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unite</Label>
              <select
                id="unit"
                name="unit"
                className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                defaultValue="piece"
              >
                {PRODUCT_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                name="type"
                className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                defaultValue="fourniture"
              >
                {PRODUCT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vat_rate">TVA</Label>
              <select
                id="vat_rate"
                name="vat_rate"
                className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                defaultValue="20"
              >
                {VAT_RATES.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}%
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="internal_unit_price">Prix de vente</Label>
              <Input
                id="internal_unit_price"
                name="internal_unit_price"
                type="number"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="internal_cost">Prix d&apos;achat</Label>
              <Input id="internal_cost" name="internal_cost" type="number" step="0.01" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" />
          </div>
          {state?.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

