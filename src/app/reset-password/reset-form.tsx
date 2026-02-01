'use client';

import { useFormState } from 'react-dom';
import Link from 'next/link';

import { resetPassword, type ResetState } from '@/app/reset-password/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const initialState: ResetState = {};

export function ResetPasswordForm() {
  const [state, formAction] = useFormState(resetPassword, initialState);

  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle>Mot de passe oublie</CardTitle>
        <CardDescription>Recevez un lien de reinitialisation.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          {state?.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
          {state?.success ? (
            <p className="text-sm text-emerald-600">{state.success}</p>
          ) : null}
          <Button type="submit" className="w-full">
            Envoyer le lien
          </Button>
        </form>
        <div className="mt-4 text-sm">
          <Link className="text-primary" href="/login">
            Retour connexion
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

