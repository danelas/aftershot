import {createClient} from '@supabase/supabase-js';

// Browser/anon client (RLS-scoped). Server routes that need to bypass RLS use
// the service-role client below — never import that into a client component.
// Lazy so importing this module doesn't throw at build time when env is unset.
let _anon: ReturnType<typeof createClient> | null = null;
export function anonClient() {
  _anon ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return _anon;
}

export function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {auth: {persistSession: false}},
  );
}
