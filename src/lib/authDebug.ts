/** OAuth diagnostics — only logs in development builds. */
const PREFIX = '[Auth Debug]';

export function logAuthDebug(label: string, payload?: unknown) {
  if (!import.meta.env.DEV) return;
  if (payload === undefined) {
    console.log(`${PREFIX} ${label}`);
    return;
  }
  console.log(`${PREFIX} ${label}`, payload);
}

export function getOAuthCallbackSnapshot() {
  if (typeof window === 'undefined') {
    return { inBrowser: false as const };
  }

  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
  const searchParams = url.searchParams;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  const storageKey = projectRef ? `sb-${projectRef}-auth-token` : null;
  const codeVerifierKey = storageKey ? `${storageKey}-code-verifier` : null;

  let hasCodeVerifier = false;
  let codeVerifierLength = 0;
  if (codeVerifierKey) {
    try {
      const verifier = localStorage.getItem(codeVerifierKey);
      hasCodeVerifier = Boolean(verifier);
      codeVerifierLength = verifier?.length ?? 0;
    } catch {
      /* private mode / blocked storage */
    }
  }

  const code = searchParams.get('code');
  const error = searchParams.get('error') ?? hashParams.get('error');
  const errorDescription =
    searchParams.get('error_description') ?? hashParams.get('error_description');

  return {
    inBrowser: true as const,
    href: url.href,
    pathname: url.pathname,
    hasCode: Boolean(code),
    codePreview: code ? `${code.slice(0, 8)}…` : null,
    hasAccessTokenInHash: hashParams.has('access_token'),
    oauthError: error,
    oauthErrorDescription: errorDescription,
    storageKey,
    hasCodeVerifier,
    codeVerifierLength,
    pkceReady: Boolean(code && hasCodeVerifier),
    detectSessionInUrl: true,
    flowType: 'pkce' as const,
    supabaseUrl: supabaseUrl ?? '(missing VITE_SUPABASE_URL)',
    redirectTo: `${window.location.origin}/`,
  };
}
