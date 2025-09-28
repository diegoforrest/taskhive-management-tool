import { useState, useCallback } from 'react';
import { container } from '../../shared/di/Container';
import { User } from '../../core/domain/entities/User';
import { LoginUseCaseRequest } from '../../core/application/usecases/auth/LoginUseCase';
import { ChangePasswordRequest } from '../../core/application/usecases/auth/ChangePasswordUseCase';

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: false,
    error: null
  });

  const login = useCallback(async (credentials: LoginUseCaseRequest) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const loginUseCase = container.getLoginUseCase();
      const result = await loginUseCase.execute(credentials);

      if (result.success && result.user && result.token) {
        setAuthState({
          user: result.user,
          token: result.token,
          isLoading: false,
          error: null
        });
        
        // Store in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('authContext', JSON.stringify({
            user: result.user.toData(),
            token: result.token
          }));
        }

        // Dispatch auth event for other providers
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:login', {
            detail: { user: result.user.toData(), token: result.token }
          }));
        }
        
        return { success: true, user: result.user, token: result.token };
      } else {
        setAuthState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: result.message || 'Login failed' 
        }));
        return { success: false, message: result.message };
      }
    } catch (error: any) {
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Login failed' 
      }));
      return { success: false, message: error.message };
    }
  }, []);

  const changePassword = useCallback(async (request: ChangePasswordRequest) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const changePasswordUseCase = container.getChangePasswordUseCase();
      const result = await changePasswordUseCase.execute(request);

      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      if (result.success) {
        // Auto-logout after password change for security
        setTimeout(() => {
          logout();
        }, 2000);
      }
      
      return result;
    } catch (error: any) {
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message 
      }));
      return { success: false, message: error.message };
    }
  }, []);

  const logout = useCallback(() => {
    setAuthState({
      user: null,
      token: null,
      isLoading: false,
      error: null
    });

    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authContext');
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberedPassword');
      localStorage.removeItem('rememberMe');
    }

    // Dispatch logout event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  }, []);

  const loadFromStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem('authContext');
      if (saved) {
        const authData = JSON.parse(saved);
        const user = User.fromData(authData.user);
        setAuthState({
          user,
          token: authData.token,
          isLoading: false,
          error: null
        });
      }
    } catch (error) {
      console.error('Error loading auth from storage:', error);
      localStorage.removeItem('authContext');
    }
  }, []);

  return {
    ...authState,
    login,
    logout,
    changePassword,
    loadFromStorage,
    isAuthenticated: !!authState.user && !!authState.token
  };
}