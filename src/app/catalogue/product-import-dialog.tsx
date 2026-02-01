'use client';

import { useState } from 'react';

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

export function ProductImportDialog() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setStatus('error');
      setMessage('Veuillez choisir un fichier CSV.');
      return;
    }

    setStatus('loading');
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/products/import', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setStatus('error');
        setMessage(payload?.error || 'Erreur lors de import.');
        return;
      }

      setStatus('success');
      setMessage(payload?.message || 'Import termine.');
    } catch {
      setStatus('error');
      setMessage('Erreur reseau.');
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Importer CSV</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importer le catalogue</DialogTitle>
          <DialogDescription>
            Format attendu: category, subcategory, name, brand, sku, unit, vat_rate, internal_unit_price,
            internal_cost, type, active, tags
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv">Fichier CSV</Label>
            <Input
              id="csv"
              type="file"
              accept=".csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
          {message ? (
            <p
              className={
                status === 'error'
                  ? 'text-sm text-destructive'
                  : 'text-sm text-emerald-600'
              }
            >
              {message}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Import...' : 'Lancer import'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
