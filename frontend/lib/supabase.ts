import { createClient, SupabaseClient } from '@supabase/supabase-js'

let clientInstance: SupabaseClient | null = null

function isPrivateIpHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true
  if (hostname.startsWith('10.')) return true
  if (hostname.startsWith('192.168.')) return true

  const match = hostname.match(/^172\.(\d{1,3})\./)
  if (!match) return false

  const secondOctet = Number.parseInt(match[1], 10)
  return secondOctet >= 16 && secondOctet <= 31
}

function resolveSupabaseUrl(rawUrl: string): string {
  if (typeof window === 'undefined') return rawUrl

  try {
    const parsed = new URL(rawUrl)
    const currentHost = window.location.hostname
    const envHost = parsed.hostname

    if ((currentHost === 'localhost' || currentHost === '127.0.0.1') && isPrivateIpHost(envHost)) {
      parsed.hostname = '127.0.0.1'
      return parsed.toString().replace(/\/$/, '')
    }

    if (isPrivateIpHost(currentHost) && isPrivateIpHost(envHost) && currentHost !== envHost) {
      parsed.hostname = currentHost
      return parsed.toString().replace(/\/$/, '')
    }

    return parsed.toString().replace(/\/$/, '')
  } catch {
    return rawUrl
  }
}

export function getSupabaseClient(): SupabaseClient {
  if (!clientInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }
    clientInstance = createClient(resolveSupabaseUrl(supabaseUrl), supabaseAnonKey)
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
    getSession: () => getSupabaseClient().auth.getSession(),
    onAuthStateChange: (...args: Parameters<SupabaseClient['auth']['onAuthStateChange']>) =>
      getSupabaseClient().auth.onAuthStateChange(...args),
  },
}
