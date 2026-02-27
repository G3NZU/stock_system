import { createClient, SupabaseClient } from '@supabase/supabase-js'

let clientInstance: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (!clientInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }
    clientInstance = createClient(supabaseUrl, supabaseAnonKey)
  }
  return clientInstance
}

export const supabase = {
  from: (...args: Parameters<SupabaseClient['from']>) => getSupabaseClient().from(...args),
  rpc: (...args: Parameters<SupabaseClient['rpc']>) => getSupabaseClient().rpc(...args),
  auth: {
    signInWithPassword: (...args: Parameters<SupabaseClient['auth']['signInWithPassword']>) =>
      getSupabaseClient().auth.signInWithPassword(...args),
    signOut: (...args: Parameters<SupabaseClient['auth']['signOut']>) =>
      getSupabaseClient().auth.signOut(...args),
  },
}
