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

// Email is how someone gets back to an account they've lost the link to, so the
// lookup has to survive them capitalising it differently the second time.
// `in` rather than `ilike` on purpose: emails legitimately contain `_`, which
// ilike would treat as a wildcard and match the wrong account.
export async function findCustomerByEmail(email: string) {
  const e = email.trim();
  if (!e) return null;
  const {data} = await serviceClient()
    .from('customers')
    .select('id, business_name, email, upload_token, status')
    .in('email', Array.from(new Set([e, e.toLowerCase()])))
    .order('created_at', {ascending: true});
  if (!data?.length) return null;
  // An email can own several rows (e.g. a canceled trial plus a live account);
  // signing in must land on one that can actually upload.
  const row = data.find(c => c.status === 'active') ?? data[0];
  return row as {id: string; business_name: string; email: string; upload_token: string} | null;
}
