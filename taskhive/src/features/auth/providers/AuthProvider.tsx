'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@/core/domain/entities/User';
import { serviceProvider } from '@/core/ServiceProvider';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const savedAuth = localStorage.getItem('authContext');
    
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        
        if (authData.user && authData.token) {
          // Recreate User entity from stored data
          const userEntity = User.fromData(authData.user);
          setUser(userEntity);
          setToken(authData.token);
          // Set auth token in both service provider and legacy API
          try {
            serviceProvider.setAuthToken(authData.token);
          } catch (error) {
            console.warn('AuthProvider: Could not set token in service provider:', error);
          }
          // Also set in legacy API for backward compatibility
          import('@/lib/api').then(({ setAccessToken }) => {
            setAccessToken(authData.token);
          });
        }
      } catch (error) {
        console.error('AuthProvider: Error parsing saved auth data:', error);
        localStorage.removeItem('authContext');
      }
    }
    setIsLoading(false);
  }, []);

  // Listen for auth events from other parts of the app
  useEffect(() => {
    const handleLogin = (event: CustomEvent) => {
      const { user: userData, token: authToken } = event.detail;
      try {
        // Check if userData is already a User entity or plain data
        let userEntity;
        if (userData && typeof userData.id !== 'undefined') {
          // userData is already a User entity, use it directly
          userEntity = userData;
        } else if (userData && userData.user_id) {
          // userData is plain data, create User entity
          userEntity = User.fromData(userData);
        } else {
          throw new Error('Invalid user data in auth event');
        }
        
        setUser(userEntity);
        setToken(authToken);
        // Set auth token in both service provider and legacy API
        try {
          serviceProvider.setAuthToken(authToken);
        } catch (error) {
          console.warn('AuthProvider: Could not set token in service provider:', error);
        }
        // Also set in legacy API for backward compatibility
        import('@/lib/api').then(({ setAccessToken }) => {
          setAccessToken(authToken);
        });
      } catch (error) {
        console.error('AuthProvider: Error processing auth event:', error);
      }
    };

    const handleLogout = () => {
      setUser(null);
      setToken(null);
      // Clear auth tokens from both service provider and legacy API
      serviceProvider.setAuthToken(null);
      import('@/lib/api').then(({ setAccessToken }) => {
        setAccessToken(null);
      });
      setToken(null);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:login', handleLogin as EventListener);
      window.addEventListener('auth:logout', handleLogout as EventListener);

      return () => {
        window.removeEventListener('auth:login', handleLogin as EventListener);
        window.removeEventListener('auth:logout', handleLogout as EventListener);
      };
    }
  }, []);

  const login = (userData: User, userToken: string) => {
    setUser(userData);
    setToken(userToken);
    // Set auth token in both service provider and legacy API
    serviceProvider.setAuthToken(userToken);
    import('@/lib/api').then(({ setAccessToken }) => {
      setAccessToken(userToken);
    });
    
    const authData = { user: userData.toData(), token: userToken };
    localStorage.setItem('authContext', JSON.stringify(authData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    // Clear auth tokens from both service provider and legacy API
    serviceProvider.setAuthToken(null);
    import('@/lib/api').then(({ setAccessToken }) => {
      setAccessToken(null);
    });
    localStorage.removeItem('authContext');
    
    // Clear remembered credentials
    localStorage.removeItem('rememberedEmail');
    localStorage.removeItem('rememberedPassword');
    localStorage.removeItem('rememberMe');
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!user && !!token,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}