import { useAuth } from '../context/AuthContext';
import { useProfileModal } from '../context/ProfileModalContext';

/**
 * Returns true if the user has a completed profile and the action can proceed.
 * If authenticated but profile incomplete, opens the profile modal automatically.
 */
export function useRequireProfile() {
  const { isAuthenticated, profileCompleted } = useAuth();
  const { openProfileModal, requireProfile } = useProfileModal();

  const checkProfile = (): boolean => {
    if (!isAuthenticated) return false;
    return requireProfile();
  };

  return { checkProfile, openProfileModal, isAuthenticated, profileCompleted };
}
