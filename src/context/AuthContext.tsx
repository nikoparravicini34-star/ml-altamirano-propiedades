import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getUserProfile, upsertUserProfile, updateUserProfile, syncSuperAdminRole } from '../lib/supabase';
import { supabase, getOAuthRedirectUrl } from '../lib/supabaseClient';
import { getOAuthCallbackSnapshot, logAuthDebug } from '../lib/authDebug';
import { isStaff, isSuperAdmin } from '../lib/roles';
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
    role: 'user',
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
  const [authInitialized, setAuthInitialized] = useState(false);

  const profileLoadIdRef = useRef(0);
  const loadedProfileUserIdRef = useRef<string | null>(null);

  const applySession = useCallback((s: Session | null) => {
    setSession(s);
    setUser(s?.user ?? null);
    setIsAuthenticated(!!s?.user);
    if (!s?.user) setProfile(null);
  }, []);

  const loadProfile = useCallback(async (u: User): Promise<void> => {
    try {
      // Sync super-admin role server-side (uses auth.users.email as source of truth)
      await syncSuperAdminRole();

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
          p = await upsertUserProfile({ ...base, email });
        } catch (createErr) {
          console.warn('Full profile create failed, retrying minimal:', createErr);
          try {
            p = await upsertUserProfile(base);
          } catch (minimalErr) {
            console.warn('Profile create failed — using OAuth metadata fallback:', minimalErr);
            p = buildProfileFromUser(u);
          }
        }
      } else if (email && p.email !== email) {
        try {
          const updated = await updateUserProfile(u.id, { email });
          p = updated ?? { ...p, email };
        } catch (metaErr) {
          console.warn('Could not update profile email:', metaErr);
          p = { ...p, email };
        }
      }

      // Re-sync after profile row exists, then always re-fetch role from database
      await syncSuperAdminRole();
      p = await getUserProfile(u.id) ?? p;

      if (!p) {
        p = buildProfileFromUser(u);
      }

      if (p.is_blocked === true) {
        await supabase.auth.signOut({ scope: 'local' });
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
  }, []);

  useEffect(() => {
    let mounted = true;
    let sawInitialSession = false;
    let pendingOAuth = false;

    const callbackSnapshot = getOAuthCallbackSnapshot();
    logAuthDebug('AuthProvider mount — callback snapshot', callbackSnapshot);

    if (callbackSnapshot.inBrowser) {
      pendingOAuth = callbackSnapshot.hasCode && !callbackSnapshot.oauthError;
    }

    const finishLoadingWithoutUser = () => {
      if (mounted) setIsLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;

      logAuthDebug('onAuthStateChange', {
        event,
        user: s?.user
          ? { id: s.user.id, email: s.user.email, provider: s.user.app_metadata?.provider }
          : null,
        hasSession: Boolean(s),
      });

      // Never call async Supabase methods inside this callback — update state only.
      applySession(s);

      if (event === 'INITIAL_SESSION') {
        sawInitialSession = true;
        setAuthInitialized(true);
        pendingOAuth = false;
        if (!s?.user) finishLoadingWithoutUser();
      }

      if (event === 'SIGNED_IN' && s?.user) {
        setAuthInitialized(true);
        pendingOAuth = false;
      }

      if (event === 'SIGNED_OUT') {
        pendingOAuth = false;
        loadedProfileUserIdRef.current = null;
        finishLoadingWithoutUser();
      }
    });

    const fallbackTimer = window.setTimeout(async () => {
      if (!mounted || sawInitialSession) return;

      logAuthDebug('INITIAL_SESSION timeout — fallback getSession()');

      const { data: { session: fallbackSession }, error } = await supabase.auth.getSession();
      if (!mounted) return;

      sawInitialSession = true;
      setAuthInitialized(true);
      applySession(fallbackSession);

      if (error) {
        console.error('Error restoring session:', error.message);
        logAuthDebug('getSession fallback error', error);
      }

      if (!fallbackSession?.user) {
        finishLoadingWithoutUser();
      }
    }, pendingOAuth ? 8000 : 3000);

    const oauthTimeout = pendingOAuth
      ? window.setTimeout(() => {
          if (!mounted || !pendingOAuth) return;
          logAuthDebug('OAuth exchange timeout — stopping loader');
          pendingOAuth = false;
          finishLoadingWithoutUser();
        }, 12000)
      : undefined;

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
      if (oauthTimeout) clearTimeout(oauthTimeout);
      subscription.unsubscribe();
    };
  }, [applySession]);

  useEffect(() => {
    if (!authInitialized) return;

    if (!user?.id || !session) {
      if (!user) {
        loadedProfileUserIdRef.current = null;
        setIsLoading(false);
      }
      return;
    }

    const loadId = ++profileLoadIdRef.current;
    const isFirstProfileLoad = loadedProfileUserIdRef.current !== user.id;

    // Only block the UI on the initial profile load (or user change).
    // Token refresh on tab focus must not unmount forms or show a full-page loader.
    if (isFirstProfileLoad) {
      setIsLoading(true);
    }

    void loadProfile(user).finally(() => {
      if (profileLoadIdRef.current === loadId) {
        loadedProfileUserIdRef.current = user.id;
        setIsLoading(false);
      }
    });
  }, [authInitialized, user?.id, session?.access_token, loadProfile, user, session]);

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
    loadedProfileUserIdRef.current = null;
    setIsAuthenticated(false);
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  // Role comes exclusively from Supabase user_profiles — never from localStorage or client overrides
  const role: UserRole = profile?.role ?? 'user';
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
