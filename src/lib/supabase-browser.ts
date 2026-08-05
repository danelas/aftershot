'use client';

// Cookie-backed anon client, used only by the OAuth sign-in flow.
//
// Distinct from anonClient() in ./supabase on purpose: that one keeps its
// session in localStorage, which the server can't read. OAuth is a full-page
// round-trip through Supabase and back into a route handler, so the session has
// to live in cookies both sides can see.
import {createBrowserClient} from '@supabase/ssr';
import type {SupabaseClient} from '@supabase/supabase-js';

// Annotated rather than inferred: createBrowserClient is generic over the DB
// schema, so ReturnType<typeof …> collapses to `any` and silently un-types
// every caller.
let _c: SupabaseClient | null = null;

export function authClient(): SupabaseClient {
  _c ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return _c;
}
