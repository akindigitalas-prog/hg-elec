import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="card-glow w-full max-w-md">
        <CardHeader>
          <CardTitle>Inscription desactivee</CardTitle>
          <CardDescription>
            Les comptes sont crees par l&apos;administrateur de l&apos;entreprise.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-end">
          <Button asChild>
            <Link href="/login">Retour a la connexion</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

