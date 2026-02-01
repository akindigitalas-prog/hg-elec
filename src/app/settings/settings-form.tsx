'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { useFormState } from 'react-dom';

import {
  updateTenantSettings,
  updateAuthEmail,
  updateAuthPassword,
  inviteTenantUser,
  type SettingsState,
  type AccountState,
  type InviteState,
} from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type SettingsFormProps = {
  initialValues: {
    name?: string | null;
    contact_first_name?: string | null;
    contact_last_name?: string | null;
    logo_url?: string | null;
    address?: string | null;
    postal_code?: string | null;
    city?: string | null;
    siret?: string | null;
    phone?: string | null;
    email?: string | null;
    vat_number?: string | null;
    vat_exempt?: boolean | null;
    vat_exempt_mention?: string | null;
    deposit_percent?: number | null;
    insurance_name?: string | null;
    insurance_origin?: string | null;
    insurance_contract?: string | null;
  };
};

const initialState: SettingsState = {};
const initialAccountState: AccountState = {};
const initialInviteState: InviteState = {};

export function SettingsForm({ initialValues }: SettingsFormProps) {
  const [state, formAction] = useFormState(updateTenantSettings, initialState);

  useEffect(() => {
    if (state?.ok) {
      // no-op, could show toast later
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4" encType="multipart/form-data">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Designation sociale</Label>
          <Input id="name" name="name" defaultValue={initialValues.name || ''} required />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="logo">Logo</Label>
          {initialValues.logo_url ? (
            <div className="flex items-center gap-4">
              <Image
                src={initialValues.logo_url}
                alt="Logo actuel"
                width={128}
                height={48}
                className="h-12 w-32 rounded border object-contain"
              />
              <p className="text-xs text-muted-foreground">
                Logo actuel. Uploadez un fichier pour le remplacer.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Aucun logo pour le moment. Vous pouvez en importer un.
            </p>
          )}
          <Input id="logo" name="logo" type="file" accept="image/*" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_last_name">Nom</Label>
          <Input
            id="contact_last_name"
            name="contact_last_name"
            defaultValue={initialValues.contact_last_name || ''}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_first_name">Prenom</Label>
          <Input
            id="contact_first_name"
            name="contact_first_name"
            defaultValue={initialValues.contact_first_name || ''}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Adresse</Label>
          <Input id="address" name="address" defaultValue={initialValues.address || ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postal_code">Code postal</Label>
          <Input
            id="postal_code"
            name="postal_code"
            defaultValue={initialValues.postal_code || ''}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Ville</Label>
          <Input id="city" name="city" defaultValue={initialValues.city || ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="siret">SIRET</Label>
          <Input id="siret" name="siret" defaultValue={initialValues.siret || ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telephone</Label>
          <Input id="phone" name="phone" defaultValue={initialValues.phone || ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" defaultValue={initialValues.email || ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vat_number">TVA intracom</Label>
          <Input
            id="vat_number"
            name="vat_number"
            defaultValue={initialValues.vat_number || ''}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="vat_exempt"
              defaultChecked={Boolean(initialValues.vat_exempt)}
            />
            <span>TVA non applicable (franchise)</span>
          </label>
          <p className="text-xs text-muted-foreground">
            Si coche, une mention legale sera ajoutee automatiquement dans les devis et factures.
          </p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="vat_exempt_mention">Mention legale TVA</Label>
          <Textarea
            id="vat_exempt_mention"
            name="vat_exempt_mention"
            placeholder="TVA non applicable, article 293 B du CGI."
            defaultValue={initialValues.vat_exempt_mention || ''}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deposit_percent">Acompte (%)</Label>
          <Input
            id="deposit_percent"
            name="deposit_percent"
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="Ex: 30"
            defaultValue={
              typeof initialValues.deposit_percent === 'number'
                ? String(initialValues.deposit_percent)
                : ''
            }
          />
          <p className="text-xs text-muted-foreground">
            Pourcentage du TTC exige a la commande (affiche sur le devis).
          </p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="insurance_name">Assurance decennale</Label>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              id="insurance_name"
              name="insurance_name"
              placeholder="Nom de l'assurance"
              defaultValue={initialValues.insurance_name || ''}
            />
            <Input
              id="insurance_origin"
              name="insurance_origin"
              placeholder="Origine / precision"
              defaultValue={initialValues.insurance_origin || ''}
            />
          </div>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="insurance_contract">Numero de contrat</Label>
          <Input
            id="insurance_contract"
            name="insurance_contract"
            placeholder="Ex: RC-DEC-123456"
            defaultValue={initialValues.insurance_contract || ''}
          />
        </div>
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <div className="flex justify-end">
        <Button type="submit">Enregistrer</Button>
      </div>
    </form>
  );
}

type AccountSettingsFormProps = {
  initialEmail?: string | null;
};

export function AccountSettingsForm({ initialEmail }: AccountSettingsFormProps) {
  const [emailState, emailAction] = useFormState(updateAuthEmail, initialAccountState);
  const [passwordState, passwordAction] = useFormState(
    updateAuthPassword,
    initialAccountState
  );

  return (
    <div className="space-y-6">
      <form action={emailAction} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="auth_email">Email de connexion</Label>
          <Input
            id="auth_email"
            name="auth_email"
            type="email"
            defaultValue={initialEmail || ''}
            required
          />
          <p className="text-xs text-muted-foreground">
            Cet email sert a vous connecter. Un email de confirmation peut etre envoye.
          </p>
        </div>
        {emailState?.error ? (
          <p className="text-sm text-destructive">{emailState.error}</p>
        ) : null}
        {emailState?.ok && emailState.message ? (
          <p className="text-sm text-emerald-600">{emailState.message}</p>
        ) : null}
        <div className="flex justify-end">
          <Button type="submit">Mettre a jour l&apos;email</Button>
        </div>
      </form>

      <form action={passwordAction} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="new_password">Nouveau mot de passe</Label>
          <Input id="new_password" name="new_password" type="password" required minLength={8} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirmer le mot de passe</Label>
          <Input
            id="confirm_password"
            name="confirm_password"
            type="password"
            required
            minLength={8}
          />
        </div>
        {passwordState?.error ? (
          <p className="text-sm text-destructive">{passwordState.error}</p>
        ) : null}
        {passwordState?.ok && passwordState.message ? (
          <p className="text-sm text-emerald-600">{passwordState.message}</p>
        ) : null}
        <div className="flex justify-end">
          <Button type="submit">Mettre a jour le mot de passe</Button>
        </div>
      </form>
    </div>
  );
}

type TeamMember = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role: 'admin' | 'user';
  created_at?: string | null;
};

type TeamSettingsFormProps = {
  members: TeamMember[];
};

export function TeamSettingsForm({ members }: TeamSettingsFormProps) {
  const [inviteState, inviteAction] = useFormState(inviteTenantUser, initialInviteState);

  return (
    <div className="space-y-5">
      <form action={inviteAction} className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
        <div className="space-y-2">
          <Label htmlFor="invite_email">Email a inviter</Label>
          <Input id="invite_email" name="invite_email" type="email" required />
          <p className="text-xs text-muted-foreground">
            Une invitation sera envoyee. La personne n&apos;aura pas besoin de creer un compte
            manuellement.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite_role">Role</Label>
          <select
            id="invite_role"
            name="invite_role"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue="user"
          >
            <option value="user">Utilisateur</option>
            <option value="admin">Administrateur</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit">Inviter</Button>
        </div>
      </form>
      {inviteState?.error ? (
        <p className="text-sm text-destructive">{inviteState.error}</p>
      ) : null}
      {inviteState?.ok && inviteState.message ? (
        <p className="text-sm text-emerald-600">{inviteState.message}</p>
      ) : null}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Membres</h3>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun membre pour le moment.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.full_name || 'Sans nom'}</TableCell>
                  <TableCell>{member.email || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={member.role === 'admin' ? 'warning' : 'secondary'}>
                      {member.role === 'admin' ? 'Admin' : 'Utilisateur'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
