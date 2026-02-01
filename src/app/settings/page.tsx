import { PageHeader, SectionCard } from '@/components/page-header';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AccountSettingsForm, SettingsForm, TeamSettingsForm } from '@/app/settings/settings-form';
import { createClient } from '@/lib/supabase/server';

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: tenant } = await supabase.from('tenants').select('*').single();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parametres entreprise"
        description="Infos legales, logo et mentions PDF."
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <SectionCard title="Identite entreprise">
          <SettingsForm
            initialValues={{
              name: tenant?.name,
              contact_first_name: tenant?.contact_first_name,
              contact_last_name: tenant?.contact_last_name,
              logo_url: tenant?.logo_url,
              address: tenant?.address,
              postal_code: tenant?.postal_code,
              city: tenant?.city,
              siret: tenant?.siret,
              phone: tenant?.phone,
              email: tenant?.email,
              vat_number: tenant?.vat_number,
              vat_exempt: tenant?.vat_exempt,
              vat_exempt_mention: tenant?.vat_exempt_mention,
              deposit_percent: tenant?.deposit_percent,
              insurance_name: tenant?.insurance_name,
              insurance_origin: tenant?.insurance_origin,
              insurance_contract: tenant?.insurance_contract,
            }}
          />
        </SectionCard>

        <SectionCard title="Affichage client">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Choisissez ce qui apparait sur les PDF clients.</p>
            <label className="flex items-start gap-2">
              <input type="radio" name="display_mode" defaultChecked />
              <span>Total global uniquement</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="radio" name="display_mode" />
              <span>Totaux par famille</span>
            </label>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Mentions PDF">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="terms">Conditions</Label>
            <Textarea id="terms" placeholder="Delai d'intervention, conditions de paiement..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="warranty">Garantie</Label>
            <Textarea id="warranty" placeholder="Garantie 1 an sur pieces et main d'oeuvre." />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Compte">
        <AccountSettingsForm initialEmail={user?.email ?? null} />
      </SectionCard>

      <SectionCard title="Equipe">
        <TeamSettingsForm members={members || []} />
      </SectionCard>
    </div>
  );
}

