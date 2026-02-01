'use client';

import { useFormState } from 'react-dom';

import { updateProductPrice, type ProductFormState } from '@/app/catalogue/actions';
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

const initialState: ProductFormState = {};

type ProductPriceDialogProps = {
  product: {
    id: string;
    name: string;
    internal_unit_price: number | null;
    internal_cost?: number | null;
  };
};

export function ProductPriceDialog({ product }: ProductPriceDialogProps) {
  const [state, formAction] = useFormState(updateProductPrice, initialState);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Modifier prix</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Prix catalogue</DialogTitle>
          <DialogDescription>{product.name}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="product_id" value={product.id} />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`price-${product.id}`}>Prix de vente</Label>
              <Input
                id={`price-${product.id}`}
                name="internal_unit_price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={product.internal_unit_price ?? 0}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`cost-${product.id}`}>Prix d&apos;achat</Label>
              <Input
                id={`cost-${product.id}`}
                name="internal_cost"
                type="number"
                step="0.01"
                min="0"
                defaultValue={product.internal_cost ?? ''}
              />
            </div>
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
