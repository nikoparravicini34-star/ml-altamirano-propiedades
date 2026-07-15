import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { useProfileModal } from './ProfileModalContext';
import { useAuthGate } from './AuthGateContext';
import {
  addFavorite,
  removeFavorite,
  getUserFavoritePropertyIds,
} from '../lib/supabase';

interface FavoritesContextType {
  favoriteIds: Set<string>;
  isLoading: boolean;
  isFavorited: (propertyId: string) => boolean;
  toggleFavorite: (propertyId: string) => Promise<boolean>;
  removeFromFavorites: (propertyId: string) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, profileCompleted } = useAuth();
  const { openProfileModal } = useProfileModal();
  const { openAuthGate } = useAuthGate();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user || !profileCompleted) {
      setFavoriteIds(new Set());
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    getUserFavoritePropertyIds(user.id)
      .then((ids) => {
        if (!cancelled) setFavoriteIds(new Set(ids));
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, profileCompleted]);

  const isFavorited = useCallback(
    (propertyId: string) => favoriteIds.has(propertyId),
    [favoriteIds]
  );

  const toggleFavorite = useCallback(
    async (propertyId: string): Promise<boolean> => {
      if (!isAuthenticated) {
        openAuthGate({
          title: 'Iniciá sesión para guardar favoritos',
          description:
            'Creá una cuenta o iniciá sesión con Google para guardar propiedades en tus favoritos.',
        });
        return false;
      }
      if (!profileCompleted) {
        openProfileModal();
        return false;
      }
      if (!user) return false;

      const wasFavorited = favoriteIds.has(propertyId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorited) next.delete(propertyId);
        else next.add(propertyId);
        return next;
      });

      try {
        if (wasFavorited) {
          await removeFavorite(user.id, propertyId);
        } else {
          await addFavorite(user.id, propertyId);
        }
        return !wasFavorited;
      } catch (err) {
        console.error(err);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasFavorited) next.add(propertyId);
          else next.delete(propertyId);
          return next;
        });
        return wasFavorited;
      }
    },
    [
      isAuthenticated,
      profileCompleted,
      user,
      favoriteIds,
      openAuthGate,
      openProfileModal,
    ]
  );

  const removeFromFavorites = useCallback(
    async (propertyId: string) => {
      if (!user) return;
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(propertyId);
        return next;
      });
      try {
        await removeFavorite(user.id, propertyId);
      } catch (err) {
        console.error(err);
        setFavoriteIds((prev) => new Set(prev).add(propertyId));
        throw err;
      }
    },
    [user]
  );

  const value = useMemo(
    () => ({
      favoriteIds,
      isLoading,
      isFavorited,
      toggleFavorite,
      removeFromFavorites,
    }),
    [favoriteIds, isLoading, isFavorited, toggleFavorite, removeFromFavorites]
  );

  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return context;
}
