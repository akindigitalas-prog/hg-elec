'use client';

import { useFormState } from 'react-dom';
import Link from 'next/link';

import { login, type AuthState } from '@/app/login/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const initialState: AuthState = {};

export function LoginForm() {
  const [state, formAction] = useFormState(login, initialState);

  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle>Connexion</CardTitle>
        <CardDescription>Acces aux devis, factures et catalogue.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
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
            Se connecter
          </Button>
        </form>
        <div className="mt-4 flex items-center justify-between text-sm">
          <Link className="text-primary" href="/reset-password">
            Mot de passe oublie
          </Link>
          <span className="text-muted-foreground">
            Compte cree par l&apos;admin
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

