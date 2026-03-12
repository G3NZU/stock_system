import { createClient, SupabaseClient } from '@supabase/supabase-js'

let clientInstance: SupabaseClient | null = null

/**
 * Returns true for any hostname that is in a private (LAN / loopback) IP range:
 *   - 127.x.x.x / localhost  (loopback)
 *   - 10.x.x.x               (Class A private)
 *   - 192.168.x.x            (Class C private)
 *   - 172.16.x.x – 172.31.x.x (Class B private)
 */
function isPrivateIpHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true
  if (hostname.startsWith('10.')) return true
  if (hostname.startsWith('192.168.')) return true

  // Match 172.<second-octet>.x.x and validate the second octet is 16-31.
  const match = hostname.match(/^172\.(\d{1,3})\./)
  if (!match) return false

  const secondOctet = Number.parseInt(match[1], 10)
  // Guard against non-numeric or out-of-range octets (e.g. "172.999.0.0").
  if (Number.isNaN(secondOctet) || secondOctet > 255) return false
  return secondOctet >= 16 && secondOctet <= 31
}

/**
 * Resolves the Supabase URL so that local development works regardless of whether
 * the app is accessed via `localhost` or a LAN IP.
 *
 * When both the browser and the configured Supabase URL are on private/loopback
 * addresses but different hostnames (e.g. browser is on 192.168.1.5 while the
 * `.env` says `127.0.0.1`), this replaces the URL's host with the browser's
 * current host so Supabase is reachable.
 */
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

/**
 * Returns the singleton Supabase browser client, creating it on first call.
 * Throws if the required environment variables are not set.
 */
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

/**
 * Thin proxy around the Supabase client.
 *
 * Components import this object instead of calling `getSupabaseClient()` directly.
 * The proxy ensures the client is only instantiated once and makes it easy to
 * add cross-cutting concerns (logging, error wrapping) in a single place later.
 */
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
