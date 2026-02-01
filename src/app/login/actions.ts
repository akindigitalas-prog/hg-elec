'use server';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export type AuthState = {
  error?: string;
};

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '').trim();

  if (!email || !password) {
    return { error: 'Email et mot de passe requis.' };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/');
}

