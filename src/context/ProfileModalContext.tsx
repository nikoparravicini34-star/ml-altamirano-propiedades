import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ProfileModalContextType {
  isOpen: boolean;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  requireProfile: () => boolean;
}

const ProfileModalContext = createContext<ProfileModalContextType | undefined>(undefined);

export function ProfileModalProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, profileCompleted } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // First Google login (or any session without completed profile): open modal automatically
  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && !profileCompleted) {
      setIsOpen(true);
      return;
    }
    if (profileCompleted) {
      setIsOpen(false);
    }
  }, [isAuthenticated, isLoading, profileCompleted]);

  const openProfileModal = useCallback(() => {
    if (isAuthenticated && !profileCompleted) {
      setIsOpen(true);
    }
  }, [isAuthenticated, profileCompleted]);

  const closeProfileModal = useCallback(() => {
    setIsOpen(false);
    navigate('/', { replace: true });
  }, [navigate]);

  const requireProfile = useCallback((): boolean => {
    if (!isAuthenticated) return false;
    if (profileCompleted) return true;
    setIsOpen(true);
    return false;
  }, [isAuthenticated, profileCompleted]);

  return (
    <ProfileModalContext.Provider value={{ isOpen, openProfileModal, closeProfileModal, requireProfile }}>
      {children}
    </ProfileModalContext.Provider>
  );
}

export function useProfileModal() {
  const ctx = useContext(ProfileModalContext);
  if (!ctx) throw new Error('useProfileModal must be used within ProfileModalProvider');
  return ctx;
}
