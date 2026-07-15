import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getUserProfile, upsertUserProfile, updateUserProfile } from '../lib/supabase';
import { supabase, getOAuthRedirectUrl } from '../lib/supabaseClient';
import { getOAuthCallbackSnapshot, logAuthDebug } from '../lib/authDebug';
import { resolveRoleForEmail, isStaff, isSuperAdmin } from '../lib/roles';
import type { UserProfile, UserRole } from '../types';

export type LoginWithGoogleError = 'oauth_error';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  profileCompleted: boolean;
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole;
  isStaff: boolean;
  isSuperAdmin: boolean;
  loginWithGoogle: () => Promise<{ error: LoginWithGoogleError | null }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function buildProfileFromUser(u: User): UserProfile {
  const now = new Date().toISOString();
  return {
    id: u.id,
    email: u.email ?? null,
    first_name: u.user_metadata?.given_name ?? null,
    last_name: u.user_metadata?.family_name ?? null,
    full_name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? null,
    phone: null,
    avatar_url: u.user_metadata?.avatar_url ?? u.user_metadata?.picture ?? null,
    role: resolveRoleForEmail(u.email) ?? 'user',
    is_blocked: false,
    profile_completed: false,
    created_at: now,
    updated_at: now,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const loadProfile = async (u: User): Promise<void> => {
    try {
      let p = await getUserProfile(u.id);
      const email = u.email ?? null;

      if (!p) {
        const base = {
          id: u.id,
          full_name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? null,
          first_name: u.user_metadata?.given_name ?? null,
          last_name: u.user_metadata?.family_name ?? null,
          avatar_url: u.user_metadata?.avatar_url ?? u.user_metadata?.picture ?? null,
          phone: null,
          profile_completed: false,
        };

        try {
          p = await upsertUserProfile({
            ...base,
            email,
          });
        } catch (createErr) {
          console.warn('Full profile create failed, retrying minimal:', createErr);
          try {
            p = await upsertUserProfile(base);
          } catch (minimalErr) {
            console.warn('Profile create failed — using OAuth metadata fallback:', minimalErr);
            p = buildProfileFromUser(u);
          }
        }
      } else {
        const desiredRole = resolveRoleForEmail(email ?? undefined, p.role);
        if (email && p.email !== email) {
          try {
            const updated = await updateUserProfile(u.id, { email });
            p = updated ?? { ...p, email };
          } catch (metaErr) {
            console.warn('Could not update profile email:', metaErr);
            p = { ...p, email };
          }
        }

        if (desiredRole === 'super_admin' && p.role !== 'super_admin') {
          p = { ...p, role: 'super_admin' };
        }
      }

      if (!p) {
        p = buildProfileFromUser(u);
      }

      if (p.is_blocked === true) {
        await supabase.auth.signOut();
        setProfile(null);
        setIsAuthenticated(false);
        setUser(null);
        setSession(null);
        return;
      }

      setProfile(p);
    } catch (err) {
      console.error('Error loading profile:', err);
      setProfile(buildProfileFromUser(u));
    }
  };

  useEffect(() => {
    let mounted = true;

    const applySession = (s: Session | null) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      setIsAuthenticated(!!s);
      if (!s?.user) setProfile(null);
    };

    const callbackSnapshot = getOAuthCallbackSnapshot();
    logAuthDebug('AuthProvider mount — callback snapshot', callbackSnapshot);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      logAuthDebug('onAuthStateChange', {
        event,
        user: s?.user
          ? { id: s.user.id, email: s.user.email, provider: s.user.app_metadata?.provider }
          : null,
        hasSession: Boolean(s),
        accessTokenPreview: s?.access_token ? `${s.access_token.slice(0, 12)}…` : null,
      });
      applySession(s);

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
        if (!s?.user) setIsLoading(false);
      }
    });

    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        logAuthDebug('getSession() after init', {
          session: initialSession
            ? {
                userId: initialSession.user.id,
                email: initialSession.user.email,
                expiresAt: initialSession.expires_at,
              }
            : null,
          error: error?.message ?? null,
        });

        if (error) {
          console.error('Error restoring session:', error.message);
          logAuthDebug('getSession error', error);
        }

        if (callbackSnapshot.inBrowser && callbackSnapshot.oauthError) {
          logAuthDebug('OAuth callback error in URL', {
            error: callbackSnapshot.oauthError,
            description: callbackSnapshot.oauthErrorDescription,
          });
        }

        applySession(initialSession);

        let resolvedSession = initialSession;

        if (
          !resolvedSession &&
          callbackSnapshot.inBrowser &&
          callbackSnapshot.hasCode
        ) {
          logAuthDebug('PKCE code in URL but no session — retrying exchangeCodeForSession', {
            hasCodeVerifier: callbackSnapshot.hasCodeVerifier,
            pkceReady: callbackSnapshot.pkceReady,
          });

          const code = new URL(window.location.href).searchParams.get('code');
          if (code) {
            const { data: exchangeData, error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(code);

            logAuthDebug('exchangeCodeForSession result', {
              session: exchangeData.session
                ? {
                    userId: exchangeData.session.user.id,
                    email: exchangeData.session.user.email,
                  }
                : null,
              error: exchangeError
                ? {
                    message: exchangeError.message,
                    name: exchangeError.name,
                    status: 'status' in exchangeError ? exchangeError.status : undefined,
                  }
                : null,
            });

            if (exchangeError) {
              console.error('[Auth Debug] OAuth code exchange failed:', exchangeError.message);
            } else if (exchangeData.session) {
              resolvedSession = exchangeData.session;
              applySession(exchangeData.session);
            }
          }
        }

        if (!resolvedSession) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
        logAuthDebug('initAuth exception', err);
        if (mounted) setIsLoading(false);
      }
    };

    void initAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    void loadProfile(user).finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshProfile = async () => {
    if (user) await loadProfile(user);
  };

  const loginWithGoogle = async (): Promise<{ error: LoginWithGoogleError | null }> => {
    try {
      const redirectTo = getOAuthRedirectUrl();
      logAuthDebug('signInWithOAuth starting', { provider: 'google', redirectTo });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });

      logAuthDebug('signInWithOAuth response', {
        url: data.url,
        provider: data.provider,
        error: error?.message ?? null,
      });

      if (error) return { error: 'oauth_error' };
      return { error: null };
    } catch (err) {
      logAuthDebug('signInWithOAuth exception', err);
      return { error: 'oauth_error' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    setIsAuthenticated(false);
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const role = resolveRoleForEmail(user?.email, profile?.role) ?? profile?.role ?? 'user';
  const profileCompleted = !!profile?.profile_completed;

  return (
    <AuthContext.Provider value={{
      isAuthenticated, isLoading, profileCompleted,
      user, session, profile,
      role,
      isStaff: isStaff(role),
      isSuperAdmin: isSuperAdmin(role),
      loginWithGoogle, logout, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
