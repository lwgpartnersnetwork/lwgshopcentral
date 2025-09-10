import { useAuthStore } from '@/lib/auth';
import { useLocation } from 'wouter';
import { useEffect } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: string;
  redirectTo?: string;
}

export function AuthGuard({ children, requiredRole, redirectTo = '/login' }: AuthGuardProps) {
  const { isAuthenticated, user } = useAuthStore();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation(redirectTo);
      return;
    }

    if (requiredRole && user?.role !== requiredRole) {
      setLocation('/');
      return;
    }
  }, [isAuthenticated, user, requiredRole, redirectTo, setLocation]);

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}
