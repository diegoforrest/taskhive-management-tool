"use client"

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User } from '../../core/domain/entities/User';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: { user_id: string; password: string }) => Promise<any>;
  logout: () => void;
  changePassword: (request: { userId: number; currentPassword: string; newPassword: string }) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authHook = useAuth();

  // Load auth state from storage on mount
  useEffect(() => {
    authHook.loadFromStorage();
  }, [authHook.loadFromStorage]);

  // Listen for auth events from other parts of the app
  useEffect(() => {
    const handleAuthLogin = (event: CustomEvent) => {
      console.log('AuthProvider: Received auth:login event', event.detail);
      // The event detail should contain user and token
      if (event.detail?.user && event.detail?.token) {
        // Update the auth hook state
        authHook.loadFromStorage(); // Reload from storage which should have the new data
      }
    };

    const handleAuthLogout = () => {
      console.log('AuthProvider: Received auth:logout event');
      authHook.logout();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:login', handleAuthLogin as EventListener);
      window.addEventListener('auth:logout', handleAuthLogout as EventListener);

      return () => {
        window.removeEventListener('auth:login', handleAuthLogin as EventListener);
        window.removeEventListener('auth:logout', handleAuthLogout as EventListener);
      };
    }
  }, [authHook]);

  const value: AuthContextType = {
    user: authHook.user,
    token: authHook.token,
    isAuthenticated: authHook.isAuthenticated,
    isLoading: authHook.isLoading,
    error: authHook.error,
    login: authHook.login,
    logout: authHook.logout,
    changePassword: authHook.changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
