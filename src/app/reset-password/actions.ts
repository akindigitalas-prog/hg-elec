'use server';

import { createClient } from '@/lib/supabase/server';

export type ResetState = {
  error?: string;
  success?: string;
};

export async function resetPassword(
  _prevState: ResetState,
  formData: FormData
): Promise<ResetState> {
  const email = String(formData.get('email') || '').trim();

  if (!email) {
    return { error: 'Email requis.' };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || ''}/login`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: 'Email de reinitialisation envoye.' };
}

