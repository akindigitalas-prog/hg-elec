'use client';

import { useFormState } from 'react-dom';
import Link from 'next/link';

import { register, type RegisterState } from '@/app/register/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const initialState: RegisterState = {};

export function RegisterForm() {
  const [state, formAction] = useFormState(register, initialState);

  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle>Creation de compte</CardTitle>
        <CardDescription>Votre entreprise est creee automatiquement.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">Entreprise</Label>
            <Input id="company_name" name="company_name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">Nom complet</Label>
            <Input id="full_name" name="full_name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          {state?.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
          <Button type="submit" className="w-full">
            Creer le compte
          </Button>
        </form>
        <div className="mt-4 text-sm">
          <Link className="text-primary" href="/login">
            Deja un compte ? Se connecter
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

