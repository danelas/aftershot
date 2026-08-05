// Server side of the OAuth session. Reads (and, in route handlers, writes) the
// same cookies the browser client above uses.
import {cookies} from 'next/headers';
import {createServerClient} from '@supabase/ssr';

export async function authServerClient() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({name, value, options}) => store.set(name, value, options));
          } catch {
            // Server components can't set cookies. Only the callback route
            // actually needs to write, and it can.
          }
        },
      },
    },
  );
}

// The signed-in user, or null. Never trust an id the browser sent us — this
// verifies the token with Supabase.
export async function authUser() {
  const {data} = await (await authServerClient()).auth.getUser();
  return data.user ?? null;
}
