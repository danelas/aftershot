import {createClient} from '@supabase/supabase-js';

// Browser/anon client (RLS-scoped). Server routes that need to bypass RLS use
// the service-role client below — never import that into a client component.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {auth: {persistSession: false}},
  );
}
