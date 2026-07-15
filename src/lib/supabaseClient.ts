import { createClient } from '@supabase/supabase-js';
import { getOAuthCallbackSnapshot, logAuthDebug } from './authDebug';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (import.meta.env.DEV) {
  logAuthDebug('Supabase client config', {
    supabaseUrl,
    anonKeyPrefix: supabaseAnonKey?.slice(0, 12) ?? '(missing)',
    detectSessionInUrl: true,
    flowType: 'pkce',
    expectedUrl: 'https://amudzhpdjuyttagpfiau.supabase.co',
    urlMatchesExpected: supabaseUrl === 'https://amudzhpdjuyttagpfiau.supabase.co',
  });
  logAuthDebug('OAuth callback snapshot (on module load)', getOAuthCallbackSnapshot());
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: import.meta.env.DEV,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

/** Fixed post-login URL — must match Supabase Redirect URLs (e.g. http://localhost:5173/**). */
export function getOAuthRedirectUrl(): string {
  return `${window.location.origin}/`;
}
