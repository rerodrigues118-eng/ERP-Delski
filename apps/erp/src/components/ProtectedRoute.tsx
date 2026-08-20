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
        navigate({ to: '/cliente' as any, replace: true });
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
      <div className="flex h-screen w-full flex-col items-center justify-center gap-3.5 bg-background text-foreground transition-colors duration-200">
        <div className="relative flex items-center justify-center">
          <div className="h-9 w-9 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
        <p className="text-muted-foreground animate-pulse text-xs font-semibold tracking-wide">
          Carregando DELSKI CLOUD...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || (!isGestor && (isPendingApproval || isRejected)) || isCliente || isFreelancer) {
    return null;
  }

  return <>{children}</>;
};

