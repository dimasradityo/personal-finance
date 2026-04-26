import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Uses service role key to bypass RLS — this app has no auth, all server actions run as admin
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, opts) => fetch(url, { ...opts, cache: 'no-store' }) } }
  )
}
