import { createClient } from '@supabase/supabase-js';
import { getOAuthCallbackSnapshot, logAuthDebug } from './authDebug';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. ' +
    'Configuralas en Vercel → Settings → Environment Variables.'
  );
}

const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const storageKey = projectRef ? `sb-${projectRef}-auth-token` : undefined;

if (import.meta.env.DEV) {
  logAuthDebug('Supabase client config', {
    supabaseUrl,
    anonKeyPrefix: supabaseAnonKey.slice(0, 12),
    storageKey,
    detectSessionInUrl: true,
    flowType: 'pkce',
  });
  logAuthDebug('OAuth callback snapshot (on module load)', getOAuthCallbackSnapshot());
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey,
    debug: import.meta.env.DEV,
  },
});

/** Post-login URL — must match Supabase Auth → URL Configuration → Redirect URLs. */
export function getOAuthRedirectUrl(): string {
  if (typeof window === 'undefined') return '/';
  return `${window.location.origin}/`;
}
