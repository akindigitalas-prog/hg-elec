'use server';

export type RegisterState = {
  error?: string;
  success?: string;
};

export async function register(
  _prevState: RegisterState,
  _formData: FormData
): Promise<RegisterState> {
  return {
    error:
      "Inscription desactivee. Demandez une invitation a l'administrateur.",
  };
}

