import { type ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAuthGate } from '../../context/AuthGateContext';

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { openAuthGate } = useAuthGate();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Go back to the home page first so the modal overlays real content.
      // This also means closing the modal leaves the user on the home page
      // rather than a blank protected route.
      navigate('/', { replace: true });
      openAuthGate();
    }
  // openAuthGate is stable (wrapped in useCallback) so this is safe.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated]);

  if (isLoading || !isAuthenticated) return null;

  return <>{children}</>;
}
