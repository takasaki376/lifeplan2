type SupabaseClientStub = {
  readonly __brand: "SupabaseClientStub";
};

export const createSupabaseClient = (): SupabaseClientStub => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase env vars are missing");
  }

  throw new Error("Supabase client not implemented yet");
};
