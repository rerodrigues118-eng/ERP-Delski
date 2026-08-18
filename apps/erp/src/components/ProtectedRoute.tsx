import React, { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/contexts/AuthContext';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const {
    isAuthenticated,
    isLoading,
    isGestor,
    isCliente,
    isFreelancer,
    onboardingCompleted,
    isPendingApproval,
    isRejected,
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate({ to: '/auth', replace: true });
      } else if (!isGestor && isPendingApproval) {
        navigate({ to: '/aguardando-aprovacao' as any, replace: true });
      } else if (!isGestor && isRejected) {
        navigate({ to: '/acesso-negado' as any, replace: true });
      } else if (isCliente) {
        if (!onboardingCompleted) {
          navigate({ to: '/onboarding' as any, replace: true });
        } else {
          navigate({ to: '/cliente' as any, replace: true });
        }
      } else if (isFreelancer) {
        if (!onboardingCompleted) {
          navigate({ to: '/onboarding' as any, replace: true });
        } else {
          navigate({ to: '/freelancer' as any, replace: true });
        }
      }
    }
  }, [
    isAuthenticated,
    isLoading,
    isGestor,
    isCliente,
    isFreelancer,
    onboardingCompleted,
    isPendingApproval,
    isRejected,
    navigate,
  ]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <p className="text-muted-foreground animate-pulse text-sm font-medium">Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated || (!isGestor && (isPendingApproval || isRejected)) || isCliente || isFreelancer) {
    return null;
  }

  return <>{children}</>;
};

